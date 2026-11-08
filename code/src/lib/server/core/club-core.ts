import type Database from 'better-sqlite3';
import { accessModule, type Actor } from './access';
import { clashesModule } from './clashes';
import { dropoutsModule } from './dropouts';
import { calendarModule } from './calendar';
import { resolveLocale } from './locale';
import { lineupsModule } from './lineups';
import { membersModule } from './members';
import { messagesModule } from './messages';
import { myEventsModule } from './my-events';
import { pushModule } from './push';
import { reschedulesModule } from './reschedules';
import { responsesModule } from './responses';
import { rostersModule } from './rosters';
import { settingsModule } from './settings';
import type { Clock, Mailer, Notifier } from './ports';

export * from './calendar';

export type CoreDeps = { db: Database.Database; clock: Clock; notifier: Notifier; mailer: Mailer };

export type ClubCore = ReturnType<typeof createClubCore>;

/**
 * The club core: the single in-process API holding all domain behaviour. Routes and scripts only call this.
 * Each module owns one area; modules that build on another get it passed in.
 */
export function createClubCore(deps: CoreDeps) {
	const calendar = calendarModule(deps);
	const lineups = lineupsModule({ ...deps, calendar });
	const dropouts = dropoutsModule({ ...deps, calendar, lineups });
	// Responses report each answer change; drop-outs decide whom to notify.
	const responses = responsesModule({ ...deps, calendar, onAnswerChanged: dropouts.onAnswerChanged });
	const settings = settingsModule(deps);
	const clashes = clashesModule({ ...deps, calendar, lineups, settings });
	return {
		resolveLocale,
		...calendar,
		...accessModule(deps),
		...membersModule(deps),
		...rostersModule(deps),
		...responses,
		...lineups,
		...settings,
		...reschedulesModule({ ...deps, calendar }),
		...pushModule({ ...deps, calendar }),
		...messagesModule({ ...deps, calendar, responses }),
		...clashes,
		/** The captain's line-up view, with the clashes on that match's evening. */
		lineupView: (actor: Actor | undefined, clubId: string, matchId: string) => ({
			...lineups.lineupView(actor, clubId, matchId),
			clashes: clashes.clashesForMatch(clubId, matchId)
		}),
		...myEventsModule({ ...deps, calendar, responses, lineups })
	};
}
