#!/bin/sh
# Runs a command under the machine-wide lock for heavy work (installs, checks,
# builds, screenshot runs), so parallel agents queue up instead of piling on.
#
#   scripts/heavy.sh <command...>          or: bun run heavy -- <command...>
#
# HEAVY_WAIT     seconds to wait for the lock (default 1800)
# HEAVY_TIMEOUT  seconds the command may run (default 1500)
# Either limit ends the run with exit 1 and one line saying which one.
# HEAVY_LOCK     lock file, for trying this script without queueing.

LOCK="${HEAVY_LOCK:-/tmp/blog-cms-heavy.lock}"
HOLDER="$LOCK.holder"
WAIT="${HEAVY_WAIT:-1800}"
LIMIT="${HEAVY_TIMEOUT:-1500}"

if [ "$#" -eq 0 ]; then
  echo "usage: scripts/heavy.sh <command...>" >&2
  exit 2
fi

# Who holds the lock: the note a heavy.sh run leaves, else any flock on the file.
holder() {
  if [ -s "$HOLDER" ]; then
    cat "$HOLDER"
  else
    pgrep -af "[f]lock.*$LOCK" | head -n 1
  fi
}

exec 9>>"$LOCK"
if ! flock -w "$WAIT" 9; then
  echo "heavy: waited ${WAIT}s (HEAVY_WAIT) for $LOCK, held by: $(holder)" >&2
  exit 1
fi

printf '%s (pid %s, since %s, in %s)\n' "$*" "$$" "$(date +%H:%M:%S)" "$PWD" >"$HOLDER"
trap 'rm -f "$HOLDER"' EXIT
trap 'exit 130' INT TERM

# The command runs without the lock's file descriptor, so a process it leaves
# behind cannot keep the lock.
timeout -k 10 "$LIMIT" "$@" 9>&-
status=$?
if [ "$status" -eq 124 ] || [ "$status" -eq 137 ]; then
  echo "heavy: '$*' ran longer than ${LIMIT}s (HEAVY_TIMEOUT) and was stopped" >&2
  exit 1
fi
exit "$status"
