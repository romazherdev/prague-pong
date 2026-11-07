import type Database from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import { accessRules, NotFoundError, type Actor } from './access';
import { firstNameFirst, nameKey } from './names';
import { newSecret } from './secrets';

/** One team's roster as parsed from STIS (e.g. by the STIS adapter), ready to import. */
export type RosterImport = {
	/** The club's team, e.g. "A". Must exist already (the fixture import creates the teams). */
	teamName: string;
	/** Names as STIS shows them, surname first. */
	players: { name: string; stisPlayerId?: string }[];
};

export type RosterReviewEntry = {
	id: string;
	teamName: string;
	playerName: string;
	stisPlayerId: string | null;
	/** Who the player is, once the admin has confirmed it. */
	confirmedMember: { id: string; name: string } | null;
	/** The one active member whose name matches, if exactly one does and nothing is confirmed yet. */
	suggestedMember: { id: string; name: string } | null;
};

export function rostersModule(deps: { db: Database.Database }) {
	const { db } = deps;
	const rules = accessRules(db);

	return {
		/**
		 * Stores the players on the club's STIS rosters for the admin to confirm. Players are recognised by STIS
		 * player id (or team + name without one), so importing again adds nothing and keeps confirmed links;
		 * a player who moved team is moved, and so is their confirmed member. All or nothing. Admins only.
		 */
		importRosters(actor: Actor | undefined, clubId: string, rosters: RosterImport[]): { added: number; unchanged: number } {
			rules.requireAdmin(actor, clubId);
			const teamId = (name: string) =>
				(db.prepare('SELECT id FROM teams WHERE club_id = ? AND name = ?').get(clubId, name) as { id: string } | undefined)?.id;
			const find = db.prepare('SELECT id, team_id, member_id FROM roster_entries WHERE club_id = ? AND entry_key = ?');
			const insert = db.prepare(
				`INSERT INTO roster_entries (id, club_id, entry_key, team_id, player_name, stis_player_id)
				 VALUES (?, ?, ?, ?, ?, ?)`
			);
			const move = db.prepare('UPDATE roster_entries SET team_id = ?, player_name = ? WHERE id = ?');
			const moveMember = db.prepare('UPDATE members SET team_id = ? WHERE id = ?');

			return db.transaction(() => {
				const result = { added: 0, unchanged: 0 };
				for (const roster of rosters) {
					const team = teamId(roster.teamName);
					if (!team) throw new NotFoundError(`The club has no team ${roster.teamName}`);
					for (const player of roster.players) {
						const name = player.name.trim().replace(/\s+/g, ' ');
						const key = player.stisPlayerId ? `stis:${player.stisPlayerId}` : `name:${team}:${nameKey(name)}`;
						const existing = find.get(clubId, key) as { id: string; team_id: string; member_id: string | null } | undefined;
						if (!existing) {
							insert.run(randomUUID(), clubId, key, team, name, player.stisPlayerId ?? null);
							result.added++;
						} else {
							if (existing.team_id !== team) {
								move.run(team, name, existing.id);
								if (existing.member_id) moveMember.run(team, existing.member_id);
							}
							result.unchanged++;
						}
					}
				}
				return result;
			})();
		},

		/** Every imported roster player, by team and name, with who they are (confirmed) or might be (suggested). */
		listRosterReview(actor: Actor | undefined, clubId: string): RosterReviewEntry[] {
			rules.requireAdmin(actor, clubId);
			const rows = db
				.prepare(
					`SELECT r.id, t.name AS team_name, r.player_name, r.stis_player_id, m.id AS member_id, m.name AS member_name
					 FROM roster_entries r JOIN teams t ON t.id = r.team_id LEFT JOIN members m ON m.id = r.member_id
					 WHERE r.club_id = ?`
				)
				.all(clubId) as {
				id: string;
				team_name: string;
				player_name: string;
				stis_player_id: string | null;
				member_id: string | null;
				member_name: string | null;
			}[];
			const active = db.prepare('SELECT id, name FROM members WHERE club_id = ? AND active = 1').all(clubId) as {
				id: string;
				name: string;
			}[];
			const byKey = Map.groupBy(active, (m) => nameKey(m.name));

			return rows
				.map((r) => {
					const candidates = byKey.get(nameKey(r.player_name)) ?? [];
					return {
						id: r.id,
						teamName: r.team_name,
						playerName: r.player_name,
						stisPlayerId: r.stis_player_id,
						confirmedMember: r.member_id ? { id: r.member_id, name: r.member_name! } : null,
						suggestedMember: !r.member_id && candidates.length === 1 ? candidates[0] : null
					};
				})
				.sort((a, b) => a.teamName.localeCompare(b.teamName, 'cs') || a.playerName.localeCompare(b.playerName, 'cs'));
		},

		/**
		 * Confirms who a roster player is: an existing member, or a new member named after the player. Links the
		 * member to the STIS player and puts them on the roster's team. Admins only.
		 */
		confirmRosterEntry(
			actor: Actor | undefined,
			clubId: string,
			entryId: string,
			who: { memberId: string } | { newMember: true }
		): { memberId: string } {
			rules.requireAdmin(actor, clubId);
			const entry = db
				.prepare('SELECT team_id, player_name, stis_player_id FROM roster_entries WHERE id = ? AND club_id = ?')
				.get(entryId, clubId) as { team_id: string; player_name: string; stis_player_id: string | null } | undefined;
			if (!entry) throw new NotFoundError('No such roster entry');

			return db.transaction(() => {
				let memberId: string;
				if ('memberId' in who) {
					if (!rules.isActiveMemberOf(who.memberId, clubId)) throw new NotFoundError('No such active member in this club');
					memberId = who.memberId;
				} else {
					memberId = randomUUID();
					db.prepare('INSERT INTO members (id, club_id, name, link_token) VALUES (?, ?, ?, ?)').run(
						memberId,
						clubId,
						firstNameFirst(entry.player_name),
						newSecret()
					);
				}
				// A member is one STIS player: confirming them here undoes any earlier confirmation elsewhere.
				db.prepare('UPDATE roster_entries SET member_id = NULL WHERE member_id = ? AND id != ?').run(memberId, entryId);
				db.prepare('UPDATE roster_entries SET member_id = ? WHERE id = ?').run(memberId, entryId);
				db.prepare('UPDATE members SET team_id = ?, stis_player_id = ? WHERE id = ?').run(entry.team_id, entry.stis_player_id, memberId);
				return { memberId };
			})();
		},

		/** Puts a member on one of the club's teams, or on none (`null`: e.g. training only). Admins only. */
		setMemberTeam(actor: Actor | undefined, clubId: string, memberId: string, teamId: string | null): void {
			rules.requireAdmin(actor, clubId);
			const m = rules.member(memberId);
			if (!m || m.club_id !== clubId) throw new NotFoundError('No such member in this club');
			if (teamId && !db.prepare('SELECT 1 FROM teams WHERE id = ? AND club_id = ?').get(teamId, clubId)) {
				throw new NotFoundError('No such team in this club');
			}
			db.prepare('UPDATE members SET team_id = ? WHERE id = ?').run(teamId, memberId);
		}
	};
}
