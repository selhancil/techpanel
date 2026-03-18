#!/bin/bash

export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

PROJECT_DIR="/Users/selhancil/vscode"
PID_FILE="$PROJECT_DIR/.server.pids"

# Zaten çalışıyorsa tekrar başlatma
if lsof -ti :8001 &>/dev/null && lsof -ti :5174 &>/dev/null; then
  open http://localhost:5174
  exit 0
fi

# Eski processleri temizle
lsof -ti :8001 2>/dev/null | xargs kill -9 2>/dev/null
lsof -ti :5174 2>/dev/null | xargs kill -9 2>/dev/null
sleep 1

# Backend - nohup ile bağımsız başlat
cd "$PROJECT_DIR"
nohup "$PROJECT_DIR/.venv/bin/python3" -m uvicorn api:app --reload --port 8001 \
  > "$PROJECT_DIR/logs/backend.log" 2>&1 &
echo $! > "$PID_FILE"

# Frontend - nohup ile bağımsız başlat
cd "$PROJECT_DIR/frontend"
nohup npm run dev \
  > "$PROJECT_DIR/logs/frontend.log" 2>&1 &
echo $! >> "$PID_FILE"

sleep 3
open http://localhost:5174
