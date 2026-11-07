import type Database from 'better-sqlite3';
import { accessRules, InvalidInputError, type Actor } from './access';

export type ClubSettings = {
	/** Tables at the club's home venue. */
	totalTables: number;
	/** Tables one home match takes (2 to play on + 1 for space). */
	tablesPerHomeMatch: number;
	/** Fewest free tables for a training session to still be worth it. */
	minTrainingTables: number;
};

export const DEFAULT_SETTINGS: ClubSettings = { totalTables: 8, tablesPerHomeMatch: 3, minTrainingTables: 2 };

const isCount = (n: number, min: number) => Number.isInteger(n) && n >= min && n <= 100;

export function settingsModule(deps: { db: Database.Database }) {
	const { db } = deps;
	const rules = accessRules(db);

	function clubSettings(clubId: string): ClubSettings {
		const row = db
			.prepare('SELECT total_tables, tables_per_home_match, min_training_tables FROM club_settings WHERE club_id = ?')
			.get(clubId) as { total_tables: number; tables_per_home_match: number; min_training_tables: number } | undefined;
		return row
			? { totalTables: row.total_tables, tablesPerHomeMatch: row.tables_per_home_match, minTrainingTables: row.min_training_tables }
			: { ...DEFAULT_SETTINGS };
	}

	return {
		/** The club's table settings (the defaults until an admin changes them). */
		clubSettings,

		/** The settings for the admin's settings page. Admins only. */
		clubSettingsForAdmin(actor: Actor | undefined, clubId: string): ClubSettings {
			rules.requireAdmin(actor, clubId);
			return clubSettings(clubId);
		},

		/**
		 * Admins only. Whole numbers up to 100: at least 1 table, 1 to all of them per match, and a training
		 * minimum from 0.
		 */
		updateClubSettings(actor: Actor | undefined, clubId: string, settings: ClubSettings): void {
			rules.requireAdmin(actor, clubId);
			if (
				!isCount(settings.totalTables, 1) ||
				!isCount(settings.tablesPerHomeMatch, 1) ||
				!isCount(settings.minTrainingTables, 0) ||
				settings.tablesPerHomeMatch > settings.totalTables
			) {
				throw new InvalidInputError('settingsInvalid');
			}
			db.prepare(
				`INSERT INTO club_settings (club_id, total_tables, tables_per_home_match, min_training_tables) VALUES (?, ?, ?, ?)
				 ON CONFLICT (club_id) DO UPDATE SET total_tables = excluded.total_tables,
				   tables_per_home_match = excluded.tables_per_home_match, min_training_tables = excluded.min_training_tables`
			).run(clubId, settings.totalTables, settings.tablesPerHomeMatch, settings.minTrainingTables);
		}
	};
}
