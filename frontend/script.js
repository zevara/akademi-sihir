/**
 * Akademi Sihir Qithmir — Frontend Client
 * Handles all game interaction with the backend API.
 */

const API_BASE = (() => {
  // Auto-detect: same host as the page, or configurable
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:8000';
  }
  return window.location.origin;
})();

let sessionId = null;
let responseCount = 0;
let gameStarted = false;
let isLoading = false;

// ─── DOM Elements ────────────────────────────────────────────────────────────

const titleScreen = document.getElementById('title-screen');
const gameScreen = document.getElementById('game-screen');
const btnPlay = document.getElementById('btn-play');
const chatMessages = document.getElementById('chat-messages');
const playerInput = document.getElementById('player-input');
const btnSend = document.getElementById('btn-send');
const loadingIndicator = document.getElementById('loading-indicator');
const sessionIdDisplay = document.getElementById('session-id-display');
const responseCounter = document.getElementById('response-counter');

// ─── API Calls ───────────────────────────────────────────────────────────────

async function apiPost(endpoint, body) {
  const resp = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`HTTP ${resp.status}: ${err}`);
  }
  return resp.json();
}

async function apiGet(endpoint) {
  const resp = await fetch(`${API_BASE}${endpoint}`);
  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`HTTP ${resp.status}: ${err}`);
  }
  return resp.json();
}

// ─── UI Helpers ──────────────────────────────────────────────────────────────

function addNaratorMessage(text) {
  const div = document.createElement('div');
  div.className = 'msg-narator';

  // Format: try to parse header / scenes / status
  const lines = text.split('\n');
  let header = '';
  let status = '';
  let sceneLines = [];
  let inStatus = false;
  let headerDone = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect status block
    if (line.startsWith('- Status') || line.startsWith('- Status Tim') || line.startsWith('- Status Musuh')) {
      inStatus = true;
    }

    // Detect header (line with [...])
    if (!headerDone && line.match(/^\[/)) {
      header = line;
      headerDone = true;
      continue;
    }

    // Separator
    if (line.trim() === '—----' || line.trim() === '—') {
      sceneLines.push('<div class="scene-divider"></div>');
      continue;
    }

    if (inStatus) {
      status += line + '\n';
    } else if (line.trim()) {
      // Process Arabic text (standalone Arabic lines or lines with Arabic)
      const processedLine = processArabicText(line);
      sceneLines.push(`<div>${processedLine}</div>`);
    }
  }

  let html = '';
  if (header) {
    html += `<div class="header-line">${escapeHtml(header)}</div>`;
  }
  if (sceneLines.length) {
    html += `<div class="scene-text">${sceneLines.join('')}</div>`;
  }
  if (status) {
    html += `<div class="status-block">${formatStatus(status)}</div>`;
  }

  div.innerHTML = html;
  chatMessages.appendChild(div);
  scrollToBottom();
}

function processArabicText(line) {
  // Detect Arabic text (Unicode Arabic range)
  const arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]+/g;
  return line.replace(arabicRegex, (match) => {
    return `<span class="arabic">${match}</span>`;
  });
}

function formatStatus(text) {
  // Highlight HP, EXP, LV, Koin, etc.
  let formatted = escapeHtml(text);
  formatted = formatted.replace(/(HP|HP:)\s*\(?(\d+)\/(\d+)\)?/g, '<span class="hp">HP($2/$3)</span>');
  formatted = formatted.replace(/EXP\((\d+)\/(\d+)\)/g, '<span class="exp">EXP($1/$2)</span>');
  formatted = formatted.replace(/LV\((\d+)\)/g, '<span class="lv">LV($1)</span>');
  formatted = formatted.replace(/Koin:\s*\(?(\d+)\)?/g, '<span class="koin">Koin: $1</span>');
  formatted = formatted.replace(/Item:\s*(.+?)(?=\||$)/g, '<span class="item">Item: $1</span>');
  formatted = formatted.replace(/\b(Normal)\b/g, '<span class="status-effect-normal">$1</span>');
  formatted = formatted.replace(/\b(terbakar|racun|lumpuh|beku|pingsan)\b/gi, '<span class="status-effect-bad">$1</span>');
  return formatted;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function addPlayerMessage(text) {
  const div = document.createElement('div');
  div.className = 'msg-player';
  div.textContent = `❖ ${text}`;
  chatMessages.appendChild(div);
  scrollToBottom();
}

function addSystemMessage(text) {
  const div = document.createElement('div');
  div.className = 'msg-system';
  div.textContent = text;
  chatMessages.appendChild(div);
  scrollToBottom();
}

function addErrorMessage(text) {
  const div = document.createElement('div');
  div.className = 'msg-error';
  div.textContent = `⚠ ${text}`;
  chatMessages.appendChild(div);
  scrollToBottom();
}

function scrollToBottom() {
  const container = document.getElementById('chat-container');
  container.scrollTop = container.scrollHeight;
}

function setLoading(loading) {
  isLoading = loading;
  loadingIndicator.classList.toggle('hidden', !loading);
  playerInput.disabled = loading;
  btnSend.disabled = loading;
  if (!loading) playerInput.focus();
}

function updateStatus() {
  if (sessionId) {
    sessionIdDisplay.textContent = `Sesi: ${sessionId.slice(0, 8)}...`;
  }
  responseCounter.textContent = `Respon: ${responseCount}/150`;
}

// ─── Game Actions ────────────────────────────────────────────────────────────

function startGamePrompt() {
  // Ask for name or save data
  const result = prompt(
    'Masukkan namamu untuk memulai petualangan baru,\n' +
    'atau paste save data untuk melanjutkan permainan:'
  );
  if (result === null) return;
  if (!result.trim()) {
    addErrorMessage('Nama tidak boleh kosong!');
    return;
  }
  beginGame(result.trim());
}

async function beginGame(playerInput) {
  setLoading(true);
  try {
    const data = await apiPost('/api/start', { player_input: playerInput });
    sessionId = data.session_id;
    responseCount = data.response_count;
    gameStarted = data.game_started;
    updateStatus();

    if (data.response) {
      addNaratorMessage(data.response);
    }

    playerInput.focus();
  } catch (err) {
    addErrorMessage(`Gagal memulai game: ${err.message}`);
    console.error(err);
  } finally {
    setLoading(false);
  }
}

async function sendAction() {
  const text = playerInput.value.trim();
  if (!text || isLoading) return;

  if (!sessionId) {
    addErrorMessage('Belum ada sesi game! Klik "Mulai Permainan" dulu.');
    return;
  }

  playerInput.value = '';
  addPlayerMessage(text);

  setLoading(true);
  try {
    const data = await apiPost('/api/action', {
      session_id: sessionId,
      player_action: text,
    });

    responseCount = data.response_count;
    updateStatus();

    if (data.game_over) {
      addSystemMessage(data.response);
      addSystemMessage('🏆 Permainan selesai! Klik "Mulai Permainan" untuk bermain lagi.');
      sessionId = null;
      playerInput.disabled = true;
      btnSend.disabled = true;
      return;
    }

    if (data.response) {
      addNaratorMessage(data.response);
    }

    gameStarted = data.game_started;
  } catch (err) {
    addErrorMessage(`Gagal: ${err.message}`);
    console.error(err);
  } finally {
    setLoading(false);
  }
}

// ─── Event Listeners ─────────────────────────────────────────────────────────

btnPlay.addEventListener('click', () => {
  titleScreen.classList.add('hidden');
  gameScreen.classList.remove('hidden');
  startGamePrompt();
});

btnSend.addEventListener('click', sendAction);

playerInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendAction();
  }
});

// Allow paste of save data
playerInput.addEventListener('paste', (e) => {
  // Allow paste, no special handling needed
});

// ─── Health Check ────────────────────────────────────────────────────────────

(async function healthCheck() {
  try {
    const data = await apiGet('/api/health');
    console.log('✅ Backend connected:', data);
  } catch (err) {
    addErrorMessage(`⚠ Backend tidak terhubung (${err.message}). Coba refresh atau periksa server.`);
    console.error('Health check failed:', err);
  }
})();
