#!/bin/bash
# Run script for Akademi Sihir Qithmir
# Usage: ./run.sh [port]

PORT=${1:-8000}
APP_DIR="$(cd "$(dirname "$0")" && pwd)"
VENV_PYTHON="/home/zevara/.hermes/hermes-agent/venv/bin/python3"

# Load OpenRouter API key from Hermes env
export OPENROUTER_API_KEY="$(grep OPENROUTER_API_KEY /home/zevara/.hermes/.env | cut -d= -f2-)"
export OPENROUTER_MODEL="${OPENROUTER_MODEL:-anthropic/claude-sonnet-4}"
export DATA_DIR="${APP_DIR}/data"

mkdir -p "$DATA_DIR"

echo "🚀 Akademi Sihir Qithmir — Starting on port $PORT"
echo "📦 Model: $OPENROUTER_MODEL"
echo "📁 Data: $DATA_DIR"

cd "$APP_DIR/backend" && exec "$VENV_PYTHON" -m uvicorn main:app \
  --host 0.0.0.0 \
  --port "$PORT" \
  --workers 1 \
  --log-level info
