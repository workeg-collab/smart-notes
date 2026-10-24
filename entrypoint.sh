#!/bin/sh
set -e

echo "[SmartNotes] Starting Node API server on port 3000..."
node /app/server.js &
NODE_PID=$!

echo "[SmartNotes] Starting Nginx web server on port 80..."
nginx -g "daemon off;" &
NGINX_PID=$!

# Handle shutdown signals gracefully
trap "kill -TERM $NODE_PID $NGINX_PID 2>/dev/null; wait" SIGTERM SIGINT

# Wait for either process to exit
wait -n $NODE_PID $NGINX_PID
EXIT_CODE=$?

echo "[SmartNotes] A core process exited with code $EXIT_CODE. Shutting down..."
kill -TERM $NODE_PID $NGINX_PID 2>/dev/null || true
exit $EXIT_CODE
