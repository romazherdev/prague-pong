import type Database from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import type { Locale } from '#lib/i18n/locales.js';
import { formatClockTime, formatMatchDay, translator } from '#lib/i18n/messages.js';
import type { MatchMessageKind } from '#lib/message-kinds.js';
import { accessRules, InvalidInputError, NotFoundError, type Actor } from './access';
import type { calendarModule } from './calendar';
import type { Clock } from './ports';
import type { settingsModule } from './settings';
import { localDate, wallClockToUtc } from './time';

/** How far ahead sessions are generated from the rules. */
export const TRAINING_HORIZON_DAYS = 56;

export type TrainingAnswer = 'in' | 'out';

export type TrainingRuleInput = {
	/** ISO weekdays: 1 = Monday … 7 = Sunday. */
	weekdays: number[];
	/** "HH:mm", club time. */
	startTime: string;
	endTime: string;
	venueId: string;
};

export type TrainingRule = TrainingRuleInput & {
	id: string;
	venue: { name: string; address: string };
	startsOn: string;
	endsOn: string | null;
};

export type TrainingSession = {
	id: string;
	/** The club-local date: the session's evening. */
	date: string;
	startsAt: string;
	endsAt: string;
	venue: { name: string; address: string };
	cancelled: boolean;
	/** Active members who said they're coming. */
	coming: number;
	/** Tables left after home matches that overlap the session (never below 0). */
	freeTables: number;
	/** Home matches overlapping the session, which take its tables. */
	homeMatchIds: string[];
	/** Fewer free tables than the club's minimum for viable training (never for a cancelled session). */
	tooFewTables: boolean;
};

/** A home match without an end time is assumed to take this long. */
export const DEFAULT_MATCH_HOURS = 3;

type RuleRow = {
	id: string;
	weekdays: string;
	start_time: string;
	end_time: string;
	venue_id: string;
	starts_on: string;
	ends_on: string | null;
};

const isTime = (t: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
const addDays = (date: string, days: number) => new Date(Date.parse(`${date}T12:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
const isoWeekday = (date: string) => new Date(`${date}T12:00:00Z`).getUTCDay() || 7;

export function trainingModule(deps: {
	db: Database.Database;
	clock: Clock;
	calendar: ReturnType<typeof calendarModule>;
	settings: ReturnType<typeof settingsModule>;
}) {
	const { db, clock, calendar, settings } = deps;
	const rules = accessRules(db);

	const clubOf = (clubId: string) => {
		const club = calendar.findClubById(clubId);
		if (!club) throw new NotFoundError('No such club');
		return club;
	};
	const today = (clubId: string) => localDate(clock.now(), clubOf(clubId).timeZone);

	function validRule(input: TrainingRuleInput): TrainingRuleInput {
		const weekdays = [...new Set(input.weekdays)].sort();
		if (!weekdays.length || weekdays.some((d) => !Number.isInteger(d) || d < 1 || d > 7)) throw new InvalidInputError('trainingRuleInvalid');
		if (!isTime(input.startTime) || !isTime(input.endTime) || input.endTime <= input.startTime) throw new InvalidInputError('trainingRuleInvalid');
		if (!db.prepare('SELECT 1 FROM venues WHERE id = ?').get(input.venueId)) throw new InvalidInputError('trainingRuleInvalid');
		return { ...input, weekdays };
	}

	function ruleOf(clubId: string, ruleId: string) {
		const row = db.prepare('SELECT * FROM training_rules WHERE id = ? AND club_id = ?').get(ruleId, clubId) as RuleRow | undefined;
		if (!row) throw new NotFoundError('No such training rule');
		return row;
	}

	/** Creates the sessions the club's rules call for, from today to the horizon. Safe to run any time. */
	function generateSessions(clubId: string): void {
		const { timeZone } = clubOf(clubId);
		const from = today(clubId);
		const until = addDays(from, TRAINING_HORIZON_DAYS);
		const active = db
			.prepare('SELECT * FROM training_rules WHERE club_id = ? AND (ends_on IS NULL OR ends_on >= ?)')
			.all(clubId, from) as RuleRow[];
		const insert = db.prepare(
			`INSERT OR IGNORE INTO training_sessions (id, club_id, rule_id, date, starts_at, ends_at, venue_id)
			 VALUES (?, ?, ?, ?, ?, ?, ?)`
		);
		db.transaction(() => {
			for (const rule of active) {
				const weekdays = rule.weekdays.split(',').map(Number);
				for (let date = from > rule.starts_on ? from : rule.starts_on; date < until; date = addDays(date, 1)) {
					if (rule.ends_on && date > rule.ends_on) break;
					if (!weekdays.includes(isoWeekday(date))) continue;
					insert.run(
						randomUUID(),
						clubId,
						rule.id,
						date,
						wallClockToUtc(`${date}T${rule.start_time}`, timeZone),
						wallClockToUtc(`${date}T${rule.end_time}`, timeZone),
						rule.venue_id
					);
				}
			}
		})();
	}

	type SessionRow = {
		id: string;
		date: string;
		starts_at: string;
		ends_at: string;
		venue_name: string;
		venue_address: string;
		cancelled: number;
		coming: number;
	};
	const SESSION_SELECT = `SELECT s.id, s.date, s.starts_at, s.ends_at, v.name AS venue_name, v.address AS venue_address, s.cancelled,
		(SELECT count(*) FROM training_responses r JOIN members m ON m.id = r.member_id
		 WHERE r.session_id = s.id AND r.answer = 'in' AND m.active = 1) AS coming
		FROM training_sessions s JOIN venues v ON v.id = s.venue_id`;
	/**
	 * Adds the table maths to sessions: free tables = total − (overlapping home matches × tables per match),
	 * never below 0, compared with the club's minimum for viable training.
	 */
	function withTables(clubId: string, rows: SessionRow[]): TrainingSession[] {
		if (!rows.length) return [];
		const { totalTables, tablesPerHomeMatch, minTrainingTables } = settings.clubSettings(clubId);
		const homeMatches = (
			db.prepare('SELECT id, starts_at, ends_at FROM matches WHERE club_id = ? AND is_home = 1 ORDER BY starts_at').all(clubId) as {
				id: string;
				starts_at: string;
				ends_at: string | null;
			}[]
		).map((m) => ({
			id: m.id,
			start: Date.parse(m.starts_at),
			end: m.ends_at ? Date.parse(m.ends_at) : Date.parse(m.starts_at) + DEFAULT_MATCH_HOURS * 3_600_000
		}));
		return rows.map((r) => {
			const start = Date.parse(r.starts_at);
			const end = Date.parse(r.ends_at);
			const homeMatchIds = homeMatches.filter((m) => m.start < end && m.end > start).map((m) => m.id);
			const freeTables = Math.max(0, totalTables - homeMatchIds.length * tablesPerHomeMatch);
			const cancelled = r.cancelled === 1;
			return {
				id: r.id,
				date: r.date,
				startsAt: r.starts_at,
				endsAt: r.ends_at,
				venue: { name: r.venue_name, address: r.venue_address },
				cancelled,
				coming: r.coming,
				freeTables,
				homeMatchIds,
				tooFewTables: !cancelled && freeTables < minTrainingTables
			};
		});
	}

	function findSession(clubId: string, sessionId: string): TrainingSession | undefined {
		const row = db.prepare(`${SESSION_SELECT} WHERE s.id = ? AND s.club_id = ?`).get(sessionId, clubId) as SessionRow | undefined;
		return row && withTables(clubId, [row])[0];
	}

	function sessionOf(clubId: string, sessionId: string): TrainingSession {
		const session = findSession(clubId, sessionId);
		if (!session) throw new NotFoundError('No such training session');
		return session;
	}

	function listTrainingSessions(clubId: string, opts: { includePast?: boolean } = {}): TrainingSession[] {
		generateSessions(clubId);
		const rows = db
			.prepare(`${SESSION_SELECT} WHERE s.club_id = ? AND (? OR s.date >= ?) ORDER BY s.starts_at`)
			.all(clubId, opts.includePast ? 1 : 0, today(clubId)) as SessionRow[];
		return withTables(clubId, rows);
	}

	const answersOf = (memberId: string) =>
		new Map(
			(db.prepare('SELECT session_id, answer FROM training_responses WHERE member_id = ?').all(memberId) as { session_id: string; answer: TrainingAnswer }[]).map(
				(r) => [r.session_id, r.answer]
			)
		);

	function headline(session: TrainingSession, locale: Locale, timeZone: string) {
		const t = translator(locale);
		const when = `${formatMatchDay(session.startsAt, locale, timeZone)}, ${formatClockTime(session.startsAt, locale, timeZone)}–${formatClockTime(session.endsAt, locale, timeZone)}`;
		return `🏓 ${t('training.title')} – ${when}`;
	}

	return {
		listTrainingSessions,

		/** One of the club's sessions as anyone sees it (the page is public, like a match); undefined if none. */
		getTrainingSession(clubId: string, sessionId: string): (TrainingSession & { isPast: boolean }) | undefined {
			const session = findSession(clubId, sessionId);
			return session && { ...session, isPast: session.date < today(clubId) };
		},

		/** Venues the club plays or trains at, home venues first (by home matches), for picking one. Admins only. */
		clubVenues(actor: Actor | undefined, clubId: string): { id: string; name: string; address: string }[] {
			rules.requireAdmin(actor, clubId);
			return db
				.prepare(
					`SELECT v.id, v.name, v.address,
					   (SELECT count(*) FROM matches m WHERE m.venue_id = v.id AND m.club_id = @clubId AND m.is_home = 1) AS home,
					   (SELECT count(*) FROM training_rules r WHERE r.venue_id = v.id AND r.club_id = @clubId) AS training
					 FROM venues v
					 WHERE EXISTS (SELECT 1 FROM matches m WHERE m.venue_id = v.id AND m.club_id = @clubId)
					    OR EXISTS (SELECT 1 FROM training_rules r WHERE r.venue_id = v.id AND r.club_id = @clubId)
					 ORDER BY training + home DESC, v.name`
				)
				.all({ clubId })
				.map((v) => {
					const { id, name, address } = v as { id: string; name: string; address: string };
					return { id, name, address };
				});
		},

		/** The club's training rules, current and ended. Admins only. */
		listTrainingRules(actor: Actor | undefined, clubId: string): TrainingRule[] {
			rules.requireAdmin(actor, clubId);
			const rows = db
				.prepare(
					`SELECT r.*, v.name AS venue_name, v.address AS venue_address FROM training_rules r JOIN venues v ON v.id = r.venue_id
					 WHERE r.club_id = ? ORDER BY (r.ends_on IS NOT NULL), r.starts_on`
				)
				.all(clubId) as (RuleRow & { venue_name: string; venue_address: string })[];
			return rows.map((r) => ({
				id: r.id,
				weekdays: r.weekdays.split(',').map(Number),
				startTime: r.start_time,
				endTime: r.end_time,
				venueId: r.venue_id,
				venue: { name: r.venue_name, address: r.venue_address },
				startsOn: r.starts_on,
				endsOn: r.ends_on
			}));
		},

		/** A weekly training (e.g. Tue and Thu 18:00–20:00) from today on. Admins only. */
		createTrainingRule(actor: Actor | undefined, clubId: string, input: TrainingRuleInput): { id: string } {
			rules.requireAdmin(actor, clubId);
			const rule = validRule(input);
			const id = randomUUID();
			db.prepare(
				'INSERT INTO training_rules (id, club_id, weekdays, start_time, end_time, venue_id, starts_on) VALUES (?, ?, ?, ?, ?, ?, ?)'
			).run(id, clubId, rule.weekdays.join(','), rule.startTime, rule.endTime, rule.venueId, today(clubId));
			generateSessions(clubId);
			return { id };
		},

		/**
		 * Changes a rule for sessions that haven't started yet: those on days it no longer covers are removed
		 * (with their answers); the others get the new times and venue and keep answers and cancellations.
		 * Not for ended rules.
		 */
		updateTrainingRule(actor: Actor | undefined, clubId: string, ruleId: string, input: TrainingRuleInput): void {
			rules.requireAdmin(actor, clubId);
			if (ruleOf(clubId, ruleId).ends_on) throw new InvalidInputError('trainingRuleEnded');
			const rule = validRule(input);
			const { timeZone } = clubOf(clubId);
			const now = clock.now().toISOString();
			db.transaction(() => {
				db.prepare('UPDATE training_rules SET weekdays = ?, start_time = ?, end_time = ?, venue_id = ? WHERE id = ?').run(
					rule.weekdays.join(','),
					rule.startTime,
					rule.endTime,
					rule.venueId,
					ruleId
				);
				// Only sessions that haven't started: tonight's session, once under way, stays as it was.
				const upcoming = db.prepare('SELECT id, date FROM training_sessions WHERE rule_id = ? AND starts_at > ?').all(ruleId, now) as {
					id: string;
					date: string;
				}[];
				for (const s of upcoming) {
					if (!rule.weekdays.includes(isoWeekday(s.date))) {
						db.prepare('DELETE FROM training_responses WHERE session_id = ?').run(s.id);
						db.prepare('DELETE FROM training_sessions WHERE id = ?').run(s.id);
					} else {
						db.prepare('UPDATE training_sessions SET starts_at = ?, ends_at = ?, venue_id = ? WHERE id = ?').run(
							wallClockToUtc(`${s.date}T${rule.startTime}`, timeZone),
							wallClockToUtc(`${s.date}T${rule.endTime}`, timeZone),
							rule.venueId,
							s.id
						);
					}
				}
			})();
			generateSessions(clubId);
		},

		/**
		 * Stops a rule after `lastDate` (club date, yesterday at the earliest): its later sessions that haven't
		 * happened yet are removed with their answers. Past sessions are history and stay. Admins only.
		 */
		endTrainingRule(actor: Actor | undefined, clubId: string, ruleId: string, lastDate: string): void {
			rules.requireAdmin(actor, clubId);
			ruleOf(clubId, ruleId);
			const isRealDate = /^\d{4}-\d{2}-\d{2}$/.test(lastDate) && !Number.isNaN(Date.parse(`${lastDate}T12:00:00Z`)) && addDays(lastDate, 0) === lastDate;
			if (!isRealDate || lastDate < addDays(today(clubId), -1)) throw new InvalidInputError('dateInvalid');
			const gone = `SELECT id FROM training_sessions WHERE rule_id = @ruleId AND date > @lastDate AND date >= @today`;
			const params = { ruleId, lastDate, today: today(clubId) };
			db.transaction(() => {
				db.prepare('UPDATE training_rules SET ends_on = ? WHERE id = ?').run(lastDate, ruleId);
				db.prepare(`DELETE FROM training_responses WHERE session_id IN (${gone})`).run(params);
				db.prepare(`DELETE FROM training_sessions WHERE id IN (${gone})`).run(params);
			})();
		},

		/** Cancels one session (holiday, venue closed); answers are kept in case it's restored. Admins only. */
		cancelTrainingSession(actor: Actor | undefined, clubId: string, sessionId: string): void {
			rules.requireAdmin(actor, clubId);
			sessionOf(clubId, sessionId);
			db.prepare('UPDATE training_sessions SET cancelled = 1 WHERE id = ?').run(sessionId);
		},

		restoreTrainingSession(actor: Actor | undefined, clubId: string, sessionId: string): void {
			rules.requireAdmin(actor, clubId);
			sessionOf(clubId, sessionId);
			db.prepare('UPDATE training_sessions SET cancelled = 0 WHERE id = ?').run(sessionId);
		},

		/** A member taps in or out; the latest answer wins. Not for cancelled or past sessions. */
		recordTrainingResponse(actor: Actor | undefined, clubId: string, sessionId: string, answer: TrainingAnswer): void {
			const me = rules.requireMember(actor, clubId);
			const session = sessionOf(clubId, sessionId);
			if (session.cancelled || session.date < today(clubId)) throw new InvalidInputError('trainingClosed');
			db.prepare(
				`INSERT INTO training_responses (session_id, member_id, answer, answered_at) VALUES (?, ?, ?, ?)
				 ON CONFLICT (session_id, member_id) DO UPDATE SET answer = excluded.answer, answered_at = excluded.answered_at`
			).run(sessionId, me.id, answer, clock.now().toISOString());
		},

		/** One session as a member sees it: who's coming and their own answer. */
		trainingSession(
			actor: Actor | undefined,
			clubId: string,
			sessionId: string
		): TrainingSession & { comingNames: string[]; myAnswer: TrainingAnswer | null; isPast: boolean } {
			const me = rules.requireMember(actor, clubId);
			const session = sessionOf(clubId, sessionId);
			const names = (
				db
					.prepare(
						`SELECT m.name FROM training_responses r JOIN members m ON m.id = r.member_id
						 WHERE r.session_id = ? AND r.answer = 'in' AND m.active = 1`
					)
					.all(sessionId) as { name: string }[]
			)
				.map((r) => r.name)
				.sort((a, b) => a.localeCompare(b, 'cs'));
			return { ...session, comingNames: names, myAnswer: answersOf(me.id).get(sessionId) ?? null, isPast: session.date < today(clubId) };
		},

		/** The member's upcoming sessions with their answers (for "my events"). */
		myTrainingSessions(actor: Actor | undefined, clubId: string): (TrainingSession & { myAnswer: TrainingAnswer | null })[] {
			const me = rules.requireMember(actor, clubId);
			const answers = answersOf(me.id);
			return listTrainingSessions(clubId).map((s) => ({ ...s, myAnswer: answers.get(s.id) ?? null }));
		},

		/** A WhatsApp message about a session for the club group. Admins only; never a personal link. */
		trainingMessage(
			actor: Actor | undefined,
			clubId: string,
			sessionId: string,
			kind: MatchMessageKind,
			opts: { origin: string; locale: Locale }
		): string {
			rules.requireAdmin(actor, clubId);
			const session = sessionOf(clubId, sessionId);
			const club = clubOf(clubId);
			const t = translator(opts.locale);
			const link = `${opts.origin}/${club.slug}/trainings/${session.id}`;
			const lines = [headline(session, opts.locale, club.timeZone)];
			if (kind === 'share') lines.push(`📍 ${session.venue.name}, ${session.venue.address}`);
			else lines.push('', t('message.training.coming', { count: String(session.coming) }));
			lines.push('', t('message.training.answer', { link }));
			return lines.join('\n');
		}
	};
}
