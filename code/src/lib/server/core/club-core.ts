import type Database from 'better-sqlite3';
import { accessModule } from './access';
import { calendarModule } from './calendar';
import { resolveLocale } from './locale';
import { membersModule } from './members';
import { rostersModule } from './rosters';
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
	return {
		resolveLocale,
		...calendar,
		...accessModule(deps),
		...membersModule({ ...deps, calendar }),
		...rostersModule(deps)
	};
}
