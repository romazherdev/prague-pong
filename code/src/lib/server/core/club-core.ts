import type Database from 'better-sqlite3';
import { accessModule } from './access';
import { clashesModule } from './clashes';
import { calendarModule } from './calendar';
import { resolveLocale } from './locale';
import { lineupsModule } from './lineups';
import { membersModule } from './members';
import { myEventsModule } from './my-events';
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
	const responses = responsesModule({ ...deps, calendar });
	const lineups = lineupsModule({ ...deps, calendar });
	const settings = settingsModule(deps);
	const clashes = clashesModule({ calendar, lineups, settings });
	return {
		resolveLocale,
		...calendar,
		...accessModule(deps),
		...membersModule(deps),
		...rostersModule(deps),
		...responses,
		...lineups,
		...settings,
		...clashes,
		/** The captain's line-up view, with the clashes on that match's evening. */
		lineupView: (...args: Parameters<typeof lineups.lineupView>) => ({
			...lineups.lineupView(...args),
			clashes: clashes.clashesForMatch(args[1], args[2])
		}),
		...myEventsModule({ ...deps, calendar, responses, lineups })
	};
}
