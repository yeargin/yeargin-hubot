#!/usr/bin/env bash
set -euo pipefail

PIDFILE="${FLOX_SERVICE_PIDFILE:-/tmp/ollama.pid}"

case "${1:-}" in
  start)
    echo "[ollama-service] Starting Ollama…"
    # Start Ollama in the background
    ollama serve &
    echo $! > "$PIDFILE"
    echo "[ollama-service] Started with PID $(cat "$PIDFILE")"
    ;;

  stop)
    echo "[ollama-service] Stopping Ollama…"
    if [[ -f "$PIDFILE" ]]; then
      PID=$(cat "$PIDFILE")
      if kill "$PID" 2>/dev/null; then
        echo "[ollama-service] Sent SIGTERM to PID $PID"
      else
        echo "[ollama-service] Process already stopped or not found."
      fi
      rm -f "$PIDFILE"
    else
      echo "[ollama-service] No PID file found; nothing to stop."
    fi
    ;;

  *)
    echo "Usage: $0 {start|stop}"
    exit 1
    ;;
esac
