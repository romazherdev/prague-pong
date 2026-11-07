// Online backup of the live SQLite database (safe while the app runs; WAL-aware).
// Usage: node scripts/backup.mjs [target]   — default target: <DATABASE_PATH dir>/backup-YYYY-MM-DD.db
import Database from 'better-sqlite3';
import { dirname, join } from 'node:path';

const source = process.env.DATABASE_PATH ?? 'data/prague-pong.db';
const target = process.argv[2] ?? join(dirname(source), `backup-${new Date().toISOString().slice(0, 10)}.db`);
await new Database(source, { readonly: true }).backup(target);
console.log(`Backed up ${source} -> ${target}`);
