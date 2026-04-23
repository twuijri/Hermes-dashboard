#!/usr/bin/env bash
set -euo pipefail

HERMES_PORT="${HERMES_BACKEND_PORT:-9119}"
APP_DIR="${APP_DIR:-/app}"

echo "[entrypoint] launching Hermes dashboard on 127.0.0.1:${HERMES_PORT} (loopback only)"
hermes dashboard --host 127.0.0.1 --port "$HERMES_PORT" --no-open --insecure &
HERMES_PID=$!

echo "[entrypoint] waiting for Hermes dashboard to accept connections..."
for i in {1..60}; do
  if (echo > "/dev/tcp/127.0.0.1/${HERMES_PORT}") 2>/dev/null; then
    echo "[entrypoint] Hermes ready after ${i}s"
    break
  fi
  if ! kill -0 "$HERMES_PID" 2>/dev/null; then
    echo "[entrypoint] Hermes exited during startup" >&2
    exit 1
  fi
  sleep 1
done

cd "$APP_DIR"
echo "[entrypoint] launching Next.js UI on 0.0.0.0:${PORT:-3000}"
node server.js &
NEXT_PID=$!

shutdown() {
  echo "[entrypoint] shutting down..."
  kill -TERM "$HERMES_PID" "$NEXT_PID" 2>/dev/null || true
}
trap shutdown TERM INT

set +e
wait -n "$HERMES_PID" "$NEXT_PID"
EXIT=$?
echo "[entrypoint] child exited with status $EXIT — stopping siblings"
shutdown
wait
exit "$EXIT"
