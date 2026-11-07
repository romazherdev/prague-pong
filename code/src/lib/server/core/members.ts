import type Database from 'better-sqlite3';
import { accessRules, type Actor } from './access';

export type MemberSummary = { id: string; name: string; email: string | null; isAdmin: boolean };

export function membersModule(deps: { db: Database.Database }) {
	const { db } = deps;
	const rules = accessRules(db);

	return {
		/** The club's active members, by name (Czech collation). Admins only. */
		listMembers(actor: Actor | undefined, clubId: string): MemberSummary[] {
			rules.requireAdmin(actor, clubId);
			const rows = db
				.prepare('SELECT id, name, email, is_admin FROM members WHERE club_id = ? AND active = 1')
				.all(clubId) as { id: string; name: string; email: string | null; is_admin: number }[];
			return rows
				.map((r) => ({ id: r.id, name: r.name, email: r.email, isAdmin: r.is_admin === 1 }))
				.sort((a, b) => a.name.localeCompare(b.name, 'cs'));
		}
	};
}
