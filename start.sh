#!/bin/bash
# Start TMA development environment
# Kills any processes on required ports, then starts docker compose

set -e

PORTS=(3009 8055 5432)

echo "🔍 Checking ports..."
for PORT in "${PORTS[@]}"; do
  PID=$(lsof -ti :"$PORT" 2>/dev/null || true)
  if [ -n "$PID" ]; then
    echo "⚠️  Port $PORT is busy (PID: $PID) — killing..."
    kill -9 $PID 2>/dev/null || true
    sleep 1
  fi
done

echo "🐳 Stopping old containers..."
docker compose down 2>/dev/null || true

echo "🚀 Starting all services..."
docker compose up --build "$@"
