# Akademi Sihir Qithmir 🪄

RPG text-based AI game bertema akademi sihir dengan mekanisme mantra **bahasa Arab (Lughotul Arobiyyah)**.

Dibangun dengan **FastAPI** backend, **OpenRouter API** sebagai AI game master, dan **HTML/CSS/JS** frontend bertema magis.

## Fitur

- 🎮 RPG text-based dengan narasi AI adaptif
- 🔮 4 jenis sihir: Elemental, Summoning, Manipulation, Blessing
- 📜 Mantra menggunakan bahasa Arab dengan evaluasi Nahwu, Shorof, Balaghoh
- 🧙‍♂️ 5 ras: Human, Elf, Vampire, Beastkin, Dwarf
- 💾 Save & Load system
- 🏰 Dunia dengan lore, NPC, dan event dinamis

## Cara Menjalankan

### Via run.sh (langsung)

```bash
git clone https://github.com/zevara/akademi-sihir.git
cd akademi-sihir
chmod +x run.sh
export OPENROUTER_API_KEY="your-key-here"
./run.sh
```

### Via systemd (production)

```bash
sudo cp akademi-sihir.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now akademi-sihir
```

### Via Docker

```bash
export OPENROUTER_API_KEY="your-key-here"
docker compose up -d
```

Akses di **http://localhost:8000**

## Struktur

```
akademi-sihir/
├── backend/
│   ├── main.py          # FastAPI server
│   ├── game_prompt.py   # System prompt untuk AI game master
│   └── requirements.txt
├── frontend/
│   ├── index.html       # Halaman utama
│   ├── style.css        # Tema magis
│   └── script.js        # Client-side logic
├── run.sh               # Run script
├── Dockerfile
├── docker-compose.yml
└── akademi-sihir.service  # systemd unit
```

## Tech Stack

- **Backend:** FastAPI + Uvicorn
- **AI:** OpenRouter API (Claude Sonnet 4)
- **Frontend:** Vanilla HTML/CSS/JS
- **Deploy:** systemd / Docker
