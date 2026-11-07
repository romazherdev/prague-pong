# Deploying Prague Pong

The app is one Node process (SvelteKit + adapter-node) with one SQLite file. Run **exactly one instance**: SQLite lives on a single disk.

## Environment

| Variable | Default | Meaning |
| --- | --- | --- |
| `DATABASE_PATH` | `data/prague-pong.db` | SQLite file; created and migrated on start |
| `DEFAULT_CLUB_SLUG` | `mladi-veterani` | Club shown at `/` |
| `PORT` | `3000` | HTTP port |
| `ORIGIN` | — (**required in production**) | Public URL, e.g. `https://pong.example`. Sign-in links are built from it, never from the request, so a forged Host header can't redirect them. Set in `fly.toml`; on a VPS set it in the systemd unit |
| `RESEND_API_KEY` | — | Sends sign-in emails through [Resend](https://resend.com). Without it, emails are printed to the server log |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | — | Keys for push notifications. Generate once with `npx web-push generate-vapid-keys` and keep them: new keys invalidate every device's subscription. Without them the app works, push is just off |
| `VAPID_SUBJECT` | — | Contact for push services, e.g. `mailto:admin@pong.example` |
| `MAIL_FROM` | — | Sender for sign-in emails, e.g. `Prague Pong <noreply@pong.example>` (domain verified in Resend) |

The app must sit behind HTTPS. adapter-node assumes `https` when working out the request origin, which SvelteKit uses for its cross-site form check. Plain-HTTP access in production makes form posts (e.g. the language switch) fail with 403.

## Option A: Fly.io

1. `fly launch --no-deploy` (keep the existing `fly.toml` and Dockerfile; pick the app name)
2. `fly volumes create prague_pong_data --size 1 --region fra`
3. `fly deploy`
4. Import the season (below).

Keep `min_machines_running = 0` while usage is tiny; the first request after idle takes a second or two.

## Option B: a small VPS (e.g. Hetzner)

1. Install Node 22, clone the repo, `npm ci && npm run build && npm prune --omit=dev`
2. Run `node build` under systemd with `DATABASE_PATH=/var/lib/prague-pong/prague-pong.db`
3. Put Caddy in front for automatic HTTPS: `prague-pong.example { reverse_proxy localhost:3000 }`

## Importing the season from STIS

On each team's STIS page, download the calendar export ("CSV export kalendáře utkání") — one CSV per team. Then:

```sh
npm run import:fixtures -- --club mladi-veterani --club-name "Mladí Veteráni" \
  --team-prefix "TJ Mladí Veteráni - VSK ČVUT" team-A.csv team-B.csv team-C.csv team-D.csv
```

- `--team-prefix` is the club's STIS team name without the letter; the letter (A–D) becomes the team.
- `--club-name` is only needed the first time (it creates the club).
- Running it again is safe: unchanged fixtures are skipped. Fixtures that changed in STIS (e.g. moved to another date) are listed but **not** applied, because a moved match should be rescheduled so members reconfirm. Add `--apply-changes` to update them anyway, which is fine as long as nobody has answered for those matches yet.
- A file that can't be parsed stops the import before anything is written.
- The command prints which database file it wrote to; check it's the one the app uses.

On Fly.io, copy the CSVs up and run it in the machine:

```sh
fly sftp shell        # put team-A.csv /data/team-A.csv  (and B, C, D)
fly ssh console -C "sh -c 'cd /app && DATABASE_PATH=/data/prague-pong.db ./node_modules/.bin/tsx scripts/import-fixtures.ts --club mladi-veterani --club-name \"Mladí Veteráni\" --team-prefix \"TJ Mladí Veteráni - VSK ČVUT\" /data/team-A.csv /data/team-B.csv /data/team-C.csv /data/team-D.csv'"
```

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

## First admin

After the first import (which creates the club), make yourself admin:

```sh
npm run setup:admin -- --club mladi-veterani --name "Jana Nováková" --email jana@example.cz
```

Then open `/mladi-veterani/sign-in`, enter that email and follow the link. Until `RESEND_API_KEY` is set the link appears in the server log (`fly logs` or `journalctl -u prague-pong`). Sign-in links work once, for 15 minutes; sessions last 60 days. On the admin page you can make members captains of their teams; captains sign in the same way with the email on their member record.

## Push notifications

1. `npx web-push generate-vapid-keys` (once).
2. Fly: `fly secrets set VAPID_PUBLIC_KEY=… VAPID_PRIVATE_KEY=… VAPID_SUBJECT=mailto:you@example.cz`. VPS: put them in the systemd unit's environment.
3. Members turn notifications on at the bottom of "Moje akce" (captains also on "Moje zápasy"). On iPhone this works only after "Přidat na plochu" (iOS 16.4+); the app explains it. The installed app opens at the member's own link, so it knows who they are.
4. Push needs HTTPS (it does not work over plain HTTP, except on localhost).
