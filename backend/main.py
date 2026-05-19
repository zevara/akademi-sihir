"""
Akademi Sihir Qithmir — Backend API
Game master AI powered by OpenRouter LLM API.
"""

import os
import json
import uuid
import hashlib
from datetime import datetime
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import httpx

from game_prompt import GAME_SYSTEM_PROMPT

# ─── Config ───────────────────────────────────────────────────────────────────

# Try DeepSeek API first, fall back to OpenRouter
LLM_API_KEY = os.environ.get("DEEPSEEK_API_KEY") or os.environ.get("OPENROUTER_API_KEY", "")
LLM_MODEL = os.environ.get("LLM_MODEL", "deepseek-chat")
LLM_BASE_URL = os.environ.get("LLM_BASE_URL", "https://api.deepseek.com/v1")
LLM_ENDPOINT = f"{LLM_BASE_URL.rstrip('/')}/chat/completions"
APP_HOST = os.environ.get("HOST", "0.0.0.0")
APP_PORT = int(os.environ.get("PORT", "8000"))
DATA_DIR = Path(os.environ.get("DATA_DIR", "./data"))
FRONTEND_DIR = Path(__file__).parent / "frontend" if (Path(__file__).parent / "frontend").exists() else Path(__file__).parent.parent / "frontend"
DATA_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="Akademi Sihir Qithmir")

# Serve frontend static files — registered as a catch-all
FRONTEND_DIR.mkdir(parents=True, exist_ok=True)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Models ───────────────────────────────────────────────────────────────────

class StartRequest(BaseModel):
    player_input: str  # name or save data

class ActionRequest(BaseModel):
    session_id: str
    player_action: str

class SessionState(BaseModel):
    session_id: str
    player_name: str = ""
    player_race: str = ""
    response_count: int = 0
    game_time: str = "07:00/01/01/1057"  # Jam/Tanggal/Bulan/Tahun
    game_location: str = "Luar Gerbang Akademi Qithmir"
    messages: list = []
    save_data: str = ""
    game_started: bool = False
    last_summary: str = ""

# ─── Session Storage ──────────────────────────────────────────────────────────

def _session_path(session_id: str) -> Path:
    return DATA_DIR / f"{session_id}.json"

def load_session(session_id: str) -> SessionState | None:
    path = _session_path(session_id)
    if path.exists():
        data = json.loads(path.read_text())
        return SessionState(**data)
    return None

def save_session(state: SessionState):
    path = _session_path(state.session_id)
    path.write_text(state.model_dump_json(indent=2))

def delete_session(session_id: str):
    path = _session_path(session_id)
    if path.exists():
        path.unlink()

# ─── LLM Call ─────────────────────────────────────────────────────────────────

async def call_llm(messages: list, max_tokens: int = 2048) -> str:
    """Call LLM API (DeepSeek or OpenRouter)."""
    if not LLM_API_KEY:
        raise HTTPException(status_code=500, detail="LLM API key not configured")

    headers = {
        "Authorization": f"Bearer {LLM_API_KEY}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": LLM_MODEL,
        "messages": messages,
        "max_tokens": max_tokens,
        "temperature": 0.9,
    }

    async with httpx.AsyncClient(timeout=120.0) as client:
        resp = await client.post(LLM_ENDPOINT, headers=headers, json=payload)
        resp.raise_for_status()
        data = resp.json()

    try:
        content = data["choices"][0]["message"]["content"]
        return content
    except (KeyError, IndexError) as e:
        raise HTTPException(status_code=502, detail=f"LLM response error: {e}")

# ─── API Endpoints ────────────────────────────────────────────────────────────

@app.get("/api/health")
async def health():
    return {"status": "ok", "model": LLM_MODEL}

@app.post("/api/start")
async def start_game(req: StartRequest):
    """Start a new game or load from save data."""
    session_id = str(uuid.uuid4())
    state = SessionState(session_id=session_id)

    player_input = req.player_input.strip()

    # Check if input looks like save data
    if player_input.startswith("Save Data") or player_input.startswith("Nama Player"):
        # Load from save data
        state.save_data = player_input
        state.game_started = True
        state.messages = [
            {"role": "system", "content": GAME_SYSTEM_PROMPT},
            {
                "role": "user",
                "content": (
                    f"Aku load save data ini:\n\n{player_input}\n\n"
                    f"Lanjutkan permainan dari save data di atas. "
                    f"Ini adalah respon nomor 1 setelah load. "
                    f"Jangan ulangi sapaan pembuka, langsung lanjutkan cerita."
                )
            },
        ]
        reply = await call_llm(state.messages)
        narrative, choices = _parse_choices(reply)
        state.messages.append({"role": "assistant", "content": reply})
        state.response_count = 1
    else:
        # New game — player enters name
        state.player_name = player_input
        # Ask 5 questions to determine race
        state.messages = [
            {"role": "system", "content": GAME_SYSTEM_PROMPT},
            {
                "role": "user",
                "content": (
                    f"Nama ku adalah {player_input}. "
                    f"Ini adalah game pertamaku, aku belum punya save data. "
                    f"Sambut aku sesuai pedoman Sistem Saat Memulai (tahap 1). "
                    f"Kemudian ajukan 5 pertanyaan untuk menentukan ras ku. "
                    f"Jangan mulai cerita dulu."
                )
            },
        ]
        reply = await call_llm(state.messages, max_tokens=1024)
        narrative, choices = _parse_choices(reply)
        state.messages.append({"role": "assistant", "content": reply})
        state.response_count = 0

    save_session(state)
    return {
        "session_id": session_id,
        "response": narrative,
        "choices": choices,
        "response_count": state.response_count,
        "game_started": state.game_started,
    }

@app.post("/api/action")
async def take_action(req: ActionRequest):
    """Process player action and return game response."""
    state = load_session(req.session_id)
    if not state:
        raise HTTPException(status_code=404, detail="Session not found")

    # Check response limit
    if state.response_count >= 150:
        return {
            "response": "Permainan telah mencapai batas 150 respon. Game selesai! Silakan mulai game baru.",
            "game_over": True,
            "response_count": 150,
        }

    state.response_count += 1

    # If game hasn't started (still in race determination phase)
    if not state.game_started:
        state.messages.append({"role": "user", "content": req.player_action})
        reply = await call_llm(state.messages, max_tokens=1536)
        narrative, choices = _parse_choices(reply)
        state.messages.append({"role": "assistant", "content": reply})

        # Check if race has been determined by looking for player_race mention
        if "ras" in reply.lower() and ("kamu adalah" in reply.lower() or "lulus" in reply.lower() or "sekarang" in reply.lower() or "tahap" in reply.lower() or "mulai" in reply.lower()):
            # Try to extract race from reply
            pass  # LLM will handle race determination

        # Check if game should start (race determined)
        if "januari 1057" in reply.lower() or "pendaftaran" in reply.lower() or "gerbang akademi" in reply.lower():
            state.game_started = True

        save_session(state)
        return {
            "response": narrative,
            "choices": choices,
            "response_count": state.response_count,
            "game_started": state.game_started,
        }

    # Normal game flow
    state.messages.append({"role": "user", "content": req.player_action})

    reply = await call_llm(state.messages, max_tokens=2048)
    narrative, choices = _parse_choices(reply)
    state.messages.append({"role": "assistant", "content": reply})

    # Manage context window — keep messages manageable
    # Keep system + last 20 exchanges
    _trim_messages(state)

    save_session(state)

    return {
        "response": narrative,
        "choices": choices,
        "response_count": state.response_count,
        "game_started": True,
    }

@app.post("/api/reset")
async def reset_session(session_id: str):
    """Delete a game session."""
    delete_session(session_id)
    return {"status": "deleted"}

# ─── Helpers ──────────────────────────────────────────────────────────────────

def _trim_messages(state: SessionState):
    """Trim conversation history to keep context manageable."""
    max_pairs = 15  # Keep last 15 exchanges (30 messages)
    if len(state.messages) > (max_pairs * 2 + 1):
        system = state.messages[0]
        recent = state.messages[-(max_pairs * 2):]
        # Create a summary of trimmed history
        trimmed = state.messages[1:-(max_pairs * 2)]
        summary_text = "Ringkasan percakapan sebelumnya:\n"
        for m in trimmed:
            role = "Player" if m["role"] == "user" else "Narator"
            summary_text += f"[{role}]: {m['content'][:200]}...\n"
        
        state.messages = [system, 
                         {"role": "system", "content": f"{GAME_SYSTEM_PROMPT}\n\n{summary_text}"},
                         *recent]

# ─── Frontend Serving ──────────────────────────────────────────────────────────

from fastapi.responses import FileResponse, HTMLResponse
from fastapi import Request

@app.get("/")
async def serve_index():
    return FileResponse(str(FRONTEND_DIR / "index.html"))

@app.get("/{path:path}")
async def serve_frontend(path: str):
    """Serve frontend static files, falling back to index.html for SPA routes."""
    file_path = FRONTEND_DIR / path
    if file_path.exists() and file_path.is_file():
        return FileResponse(str(file_path))
    return FileResponse(str(FRONTEND_DIR / "index.html"))

# ─── Choice Parsing ─────────────────────────────────────────────────────────────

def _parse_choices(text: str) -> tuple[str, list[dict]]:
    """Extract [PILIHAN] section from LLM response.

    Returns (narrative_text, list_of_choices).
    Each choice: {"label": "A", "text": "Masuk ke gerbang akademi"}
    """
    import re
    # Look for [PILIHAN] or [Pilihan] section
    match = re.split(r'\n\[?PILIHAN\]?\s*\n', text, flags=re.IGNORECASE)
    if len(match) < 2:
        return text, []

    narrative = match[0].strip()
    choices_section = match[1].strip()

    choices = []
    # Parse lines like: A. Teks pilihan or A. Teks pilihan
    for line in choices_section.split('\n'):
        line = line.strip()
        m = re.match(r'^([A-Ea-e])[\.\)]\s*(.+)$', line)
        if m:
            label = m.group(1).upper()
            choice_text = m.group(2).strip()
            choices.append({"label": label, "text": choice_text})

    return narrative, choices


# ─── Main ─────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=APP_HOST, port=APP_PORT)
