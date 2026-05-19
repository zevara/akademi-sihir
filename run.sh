#!/bin/bash
# Run script for Akademi Sihir Qithmir
# Usage: ./run.sh [port]

PORT=${1:-8000}
APP_DIR="$(cd "$(dirname "$0")" && pwd)"
VENV_PYTHON="/home/zevara/.hermes/hermes-agent/venv/bin/python3"

# Extract DeepSeek API key from Hermes config
DEEPSEEK_KEY=$(grep -A4 "deepseek" /home/zevara/.hermes/config.yaml | grep api_key | head -1 | cut -d: -f2- | tr -d ' "')
export DEEPSEEK_API_KEY="$DEEPSEEK_KEY"
export LLM_MODEL="${LLM_MODEL:-deepseek-chat}"
export DATA_DIR="${APP_DIR}/data"

mkdir -p "$DATA_DIR"

echo "🚀 Akademi Sihir Qithmir — Starting on port $PORT"
echo "📦 Model: $LLM_MODEL"
echo "📁 Data: $DATA_DIR"
echo "✅ API key: configured"

cd "$APP_DIR/backend" && exec "$VENV_PYTHON" -m uvicorn main:app \
  --host 0.0.0.0 \
  --port "$PORT" \
  --workers 1 \
  --log-level info
