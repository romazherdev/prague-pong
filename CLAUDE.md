# Prague Pong

## Agent skills

### Issue tracker

Issues and specs live as local markdown files under `.scratch/<feature>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` plus `docs/adr/` at the repo root. See `docs/agents/domain.md`.

## How we work

One ticket per chat. When asked to "implement the next ticket" (or `/implement` with no ticket given):

1. **Pick the ticket**: run `.scratch/next-ticket.sh`. It prints the lowest-numbered ticket that is `ready-for-agent` with all its blockers `resolved`. Don't ask the user which ticket.
2. **Pick the base branch**: list open PRs (`gh api repos/romazherdev/prague-pong/pulls?state=open`). If none, branch from `main`. If earlier tickets' PRs are still open, branch from the newest of those branches and target the new PR at it, saying so in the PR body.
3. **Claim it**: set the ticket's `**Status:**` to `claimed` on the new branch `feature/NN-<slug>`.
4. **Build** with `/tdd` at the agreed seams (club core through `createTestCore`; STIS adapter on the real files in `code/src/lib/server/stis/test-fixtures/`). The app is in `code/`: run `npm test` and `npm run check` there.
5. **Review** with `/code-review`, fix what's worth fixing.
6. **Close it out**: tick the acceptance criteria that are really done, set `**Status:** resolved`, add a dated note under `## Comments` (what was built, deviations, anything the next tickets should know). Record new terms in `CONTEXT.md` and real decisions in `docs/adr/`.
7. **Push and open a PR**, then tell the user what the next ticket will be (`.scratch/next-ticket.sh` after resolving).

Criteria that need the owner (e.g. "deployed") stay unticked with a comment; they don't block resolving the ticket.
