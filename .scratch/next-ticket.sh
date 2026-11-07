#!/usr/bin/env bash
# Prints the next ticket to implement: the lowest-numbered ticket whose Status is
# ready-for-agent and whose "Blocked by" tickets are all resolved.
# Usage: .scratch/next-ticket.sh [feature-dir]   (default: the only feature folder in .scratch/)
set -euo pipefail
cd "$(dirname "$0")"
feature="${1:-$(ls -d */ | head -1)}"
issues="${feature%/}/issues"

status_of() { grep -m1 -oE '^\*\*Status:\*\* *[a-z-]+' "$1" | sed -E 's/.*\*\* *//'; }

for f in "$issues"/[0-9][0-9]-*.md; do
  [ "$(status_of "$f")" = "ready-for-agent" ] || continue
  blockers=$(grep -m1 -E '^\*\*Blocked by:\*\*' "$f" | grep -oE '\b[0-9]{2}\b' || true)
  ok=1
  for b in $blockers; do
    bf=$(ls "$issues"/"$b"-*.md 2>/dev/null | head -1)
    [ -n "$bf" ] && [ "$(status_of "$bf")" = "resolved" ] || { ok=0; break; }
  done
  if [ "$ok" = 1 ]; then echo ".scratch/$f"; exit 0; fi
done
echo "No ticket is ready: everything is resolved, claimed or blocked." >&2
exit 1
