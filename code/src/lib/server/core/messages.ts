import type Database from 'better-sqlite3';
import type { Locale } from '#lib/i18n/locales.js';
import { formatClockTime, formatMatchDay, translator } from '#lib/i18n/messages.js';
import { accessRules, NotFoundError, type Actor } from './access';
import type { calendarModule, MatchDetail } from './calendar';
import type { responsesModule } from './responses';

/** "reminder" names who still has to answer; "share" announces the match. */
export type MatchMessageKind = 'reminder' | 'share';

/**
 * Ready-to-paste WhatsApp messages for the club's group chat. They link to the public match page only,
 * never to anyone's personal link.
 */
export function messagesModule(deps: {
	db: Database.Database;
	calendar: ReturnType<typeof calendarModule>;
	responses: ReturnType<typeof responsesModule>;
}) {
	const { calendar, responses } = deps;
	const rules = accessRules(deps.db);

	function headline(match: MatchDetail, locale: Locale, timeZone: string) {
		const t = translator(locale);
		const when = `${formatMatchDay(match.startsAt, locale, timeZone)}, ${formatClockTime(match.startsAt, locale, timeZone)}`;
		const where = match.isHome ? t('message.home') : t('message.away');
		return `🏓 ${t('match.team', { team: match.team.name })} ${t('match.versus', { opponent: match.opponent })} – ${when} (${where})`;
	}

	return {
		/** A WhatsApp message about a match, in Czech or English. The match team's captain or an admin. */
		matchMessage(
			actor: Actor | undefined,
			clubId: string,
			matchId: string,
			kind: MatchMessageKind,
			opts: { origin: string; locale: Locale }
		): string {
			const match = calendar.getMatch(clubId, matchId);
			if (!match) {
				rules.requireMember(actor, clubId);
				throw new NotFoundError('No such match in this club');
			}
			rules.requireCaptainOf(actor, clubId, match.team.id);
			const club = calendar.findClubById(clubId)!;
			const t = translator(opts.locale);
			const link = `${opts.origin}/${club.slug}/matches/${match.id}`;
			const lines = [headline(match, opts.locale, club.timeZone)];

			if (kind === 'share') {
				lines.push(`📍 ${match.venue.name}, ${match.venue.address}`, '', t('message.share.answer', { link }));
				return lines.join('\n');
			}

			const r = responses.matchResponses(actor, clubId, matchId);
			const names = (list: { name: string }[]) => list.map((m) => m.name).join(', ');
			lines.push('');
			if (r.unanswered.length) lines.push(t('message.reminder.unanswered', { names: names(r.unanswered) }));
			if (r.reconfirm.length) lines.push(t('message.reminder.reconfirm', { names: names(r.reconfirm) }));
			if (!r.unanswered.length && !r.reconfirm.length) lines.push(t('message.reminder.allAnswered'));
			lines.push('', t('message.reminder.answer'), link);
			return lines.join('\n');
		}
	};
}
