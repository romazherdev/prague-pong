import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { migrate } from './schema';

/** Where the app's database lives: DATABASE_PATH, or data/prague-pong.db for local development. */
export const databasePath = () => process.env.DATABASE_PATH ?? 'data/prague-pong.db';

/** Opens (or creates) the database at `path` and brings the schema up to date. Use ':memory:' in tests. */
export function openDatabase(path: string): Database.Database {
	if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
	const db = new Database(path);
	db.pragma('foreign_keys = ON');
	if (path !== ':memory:') db.pragma('journal_mode = WAL');
	migrate(db);
	return db;
}
