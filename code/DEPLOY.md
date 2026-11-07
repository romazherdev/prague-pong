# Deploying Prague Pong

The app is one Node process (SvelteKit + adapter-node) with one SQLite file. Run **exactly one instance**: SQLite lives on a single disk.

## Environment

| Variable | Default | Meaning |
| --- | --- | --- |
| `DATABASE_PATH` | `data/prague-pong.db` | SQLite file; created and migrated on start |
| `DEFAULT_CLUB_SLUG` | `mladi-veterani` | Club shown at `/` |
| `PORT` | `3000` | HTTP port |

The app must sit behind HTTPS. adapter-node assumes `https` when working out the request origin, which SvelteKit uses for its cross-site form check. Plain-HTTP access in production makes form posts (e.g. the language switch) fail with 403.

## Option A: Fly.io

1. `fly launch --no-deploy` (keep the existing `fly.toml` and Dockerfile; pick the app name)
2. `fly volumes create prague_pong_data --size 1 --region fra`
3. `fly deploy`
4. Real fixtures come from the STIS import (ticket 02). For a demo, seed locally and upload the file: `fly sftp shell`, then `put data/prague-pong.db /data/prague-pong.db`, then `fly machine restart`.

Keep `min_machines_running = 0` while usage is tiny; the first request after idle takes a second or two.

## Option B: a small VPS (e.g. Hetzner)

1. Install Node 22, clone the repo, `npm ci && npm run build && npm prune --omit=dev`
2. Run `node build` under systemd with `DATABASE_PATH=/var/lib/prague-pong/prague-pong.db`
3. Put Caddy in front for automatic HTTPS: `prague-pong.example { reverse_proxy localhost:3000 }`

## Backups

The database is in WAL mode, so don't copy the file while the app is running. Use the included online-backup script (it uses SQLite's backup API through better-sqlite3, so no `sqlite3` CLI is needed):

```sh
node scripts/backup.mjs                 # writes backup-YYYY-MM-DD.db next to the database
node scripts/backup.mjs /tmp/pp.db      # or to a path of your choice
```

The backup must leave the server, or it dies with the disk:

- **Fly.io:** `fly ssh console -C "node scripts/backup.mjs /data/backup.db"`, then `fly sftp get /data/backup.db ./backups/prague-pong-$(date +%F).db` from your laptop. Run it weekly, or before every deploy.
- **VPS:** a nightly cron job running the script, then `rclone`/`scp` the file to another machine or storage bucket.

To restore, stop the app, replace the database file with the backup, and start it again.

## Local development

```sh
npm install
npm run seed      # demo club, 4 teams, 5 matches around today
npm run dev
npm test          # club core tests (in-memory SQLite, fixed clock, fake notifier)
npm run check     # typecheck
```
