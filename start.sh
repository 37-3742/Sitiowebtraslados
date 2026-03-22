#!/usr/bin/env bash
set -e
ROOT_DIR=$(cd "$(dirname "$0")" && pwd)
cd "$ROOT_DIR"

echo "Starting project: Eventos_traslados"

# Backend
if [ ! -d "backend/node_modules" ]; then
  echo "Installing backend dependencies..."
  (cd backend && npm install)
fi

# Frontend
if [ ! -d "frontend/node_modules" ]; then
  echo "Installing frontend dependencies..."
  (cd frontend && npm install)
fi

# Start backend
echo "Starting backend... (logs: backend/backend.log)"
cd "$ROOT_DIR/backend"
nohup npm run dev > backend.log 2>&1 &
BACKEND_PID=$!

# Start frontend
echo "Starting frontend... (logs: frontend/frontend.log)"
cd "$ROOT_DIR/frontend"
nohup npm start > frontend.log 2>&1 &
FRONTEND_PID=$!

echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"

echo "Use 'tail -f backend/backend.log' and 'tail -f frontend/frontend.log' to view logs."
