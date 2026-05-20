// ================================================
// AKADEMI QITHMIR — RPG Text-Based + Auto Save
// ================================================

const API_BASE = window.location.origin;
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);
const LS_KEY = 'akademi_session';

const titleScreen = $('#title-screen');
const nameScreen = $('#name-screen');
const gameScreen = $('#game-screen');
const nameInput = $('#name-input');
const btnPlay = $('#btn-play');
const btnStart = $('#btn-start');
const pageContent = $('#page-content');
const loadingIndicator = $('#loading-indicator');
const customInput = $('#custom-input');
const btnCustomSend = $('#btn-custom-send');
const spellInput = $('#spell-input');
const btnSpellCast = $('#btn-spell-cast');
const chatHistory = $('#chat-history');

// HUD
const hudPlayerName = $('#hud-player-name');
const hudRace = $('#hud-race');
const hudLevel = $('#hud-level');
const hudStatus = $('#hud-status');
const hudCoins = $('#hud-coins');
const hpFill = $('#hp-fill');
const hpText = $('#hp-text');
const expFill = $('#exp-fill');
const expText = $('#exp-text');
const itemList = $('#item-list');
const panelParty = $('#panel-party');
const panelEnemy = $('#panel-enemy');

let sessionId = null;
let isLoading = false;

// --- Screen ---
function showScreen(screen) {
  $$('.screen').forEach(s => s.classList.remove('active'));
  screen.classList.add('active');
  if (screen === nameScreen) nameInput.focus();
}

// --- HUD ---
function updateHUD(data) {
  if (!data) return;
  if (data.player_name) hudPlayerName.textContent = data.player_name;
  if (data.race) { hudRace.textContent = `[${data.race}]`; hudRace.style.display = ''; }
  else { hudRace.style.display = 'none'; }
  const lv = data.level || 1;
  hudLevel.textContent = `LV.${lv}`;
  const hp = data.hp || 20;
  const maxHp = data.max_hp || 20;
  const hpPct = Math.max(0, Math.min(100, (hp / maxHp) * 100));
  hpFill.style.width = hpPct + '%';
  hpText.textContent = `${hp}/${maxHp}`;
  if (hpPct <= 25) hpFill.style.background = 'linear-gradient(90deg, #e74c3c, #c0392b)';
  else if (hpPct <= 60) hpFill.style.background = 'linear-gradient(90deg, #f1c40f, #f39c12)';
  else hpFill.style.background = 'linear-gradient(90deg, #2ecc71, #27ae60)';
  const exp = data.exp || 0;
  const expToNext = data.exp_to_next || 50;
  expFill.style.width = Math.max(0, Math.min(100, (exp / expToNext) * 100)) + '%';
  expText.textContent = `${exp}/${expToNext}`;
  const status = data.status || 'Normal';
  hudStatus.textContent = `Status: ${status}`;
  hudStatus.style.color = (status === 'Normal' || status === 'Sehat') ? '#2ecc71' : status.includes('Luka') ? '#e74c3c' : '#f1c40f';
  hudCoins.textContent = data.coins || 0;
  const inv = data.inventory || [];
  itemList.innerHTML = inv.length === 0 ? '🎒 (kosong)' : inv.map(i => `<div class="inv-item">• ${i}</div>`).join('');
  panelParty.innerHTML = (data.party_members || []).length === 0 ? '(Kosong)' : data.party_members.map(m => `<div class="party-member">👤 ${m}</div>`).join('');
  panelEnemy.innerHTML = (data.enemies || []).length === 0 ? '(Kosong)' : data.enemies.map(e => `<div class="enemy-unit">👹 ${e}</div>`).join('');
}

// --- Chat log ---
function addChat(text, type = 'narrative') {
  const div = document.createElement('div');
  div.className = `chat-msg chat-${type}`;
  let html = text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br>');
  div.innerHTML = html;
  chatHistory.appendChild(div);
  requestAnimationFrame(() => { chatHistory.scrollTop = chatHistory.scrollHeight; });
  scrollToBottomBtn.classList.remove('visible');
}

// Scroll to bottom
const scrollToBottomBtn = document.createElement('button');
scrollToBottomBtn.className = 'scroll-bottom-btn';
scrollToBottomBtn.textContent = '↓';
scrollToBottomBtn.addEventListener('click', () => {
  chatHistory.scrollTop = chatHistory.scrollHeight;
  scrollToBottomBtn.classList.remove('visible');
});
chatHistory.parentNode.appendChild(scrollToBottomBtn);
chatHistory.addEventListener('scroll', () => {
  const threshold = 200;
  scrollToBottomBtn.classList.toggle('visible',
    chatHistory.scrollHeight - chatHistory.scrollTop - chatHistory.clientHeight > threshold);
});

// --- Send action ---
async function sendAction(text) {
  if (!text || isLoading || !sessionId) return;
  customInput.value = '';
  addChat(text, 'player');
  showLoading(true);
  try {
    const resp = await fetch(`${API_BASE}/api/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId, player_action: text })
    });
    const data = await resp.json();
    processResponse(data);
  } catch (err) {
    addChat(`❌ Error: ${err.message}`, 'error');
    showLoading(false);
  }
}

// --- Process response ---
function processResponse(data) {
  showLoading(false);
  updateHUD(data);
  if (data.game_started) {
    const statsRow = $('#hud-stats-row');
    if (statsRow) statsRow.style.display = 'flex';
  }
  if (data.response) addChat(data.response, 'narrative');
  if (data.game_over) {
    addChat('🏆 Permainan selesai!', 'system');
    localStorage.removeItem(LS_KEY);
  }
  customInput.focus();
}

// --- Loading ---
function showLoading(show) {
  isLoading = show;
  loadingIndicator.style.display = show ? 'flex' : 'none';
  customInput.disabled = show;
  btnCustomSend.disabled = show;
}

// --- Restore session from localStorage ---
async function restoreSession() {
  const saved = localStorage.getItem(LS_KEY);
  if (!saved) return false;
  try {
    const { session_id, player_name } = JSON.parse(saved);
    if (!session_id) return false;
    // Check if session still valid on backend
    const resp = await fetch(`${API_BASE}/api/session/${session_id}`);
    if (!resp.ok) {
      localStorage.removeItem(LS_KEY);
      return false;
    }
    const data = await resp.json();
    sessionId = session_id;
    showScreen(gameScreen);
    processResponse(data);
    return true;
  } catch (e) {
    localStorage.removeItem(LS_KEY);
    return false;
  }
}

// ================================================
// EVENT LISTENERS
// ================================================

btnPlay.addEventListener('click', () => showScreen(nameScreen));
nameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') btnStart.click(); });

btnStart.addEventListener('click', async () => {
  const name = nameInput.value.trim();
  if (!name) return;
  showScreen(gameScreen);
  showLoading(true);
  try {
    const resp = await fetch(`${API_BASE}/api/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ player_input: name })
    });
    const data = await resp.json();
    if (data.session_id) {
      sessionId = data.session_id;
      // Save to localStorage
      localStorage.setItem(LS_KEY, JSON.stringify({
        session_id: data.session_id,
        player_name: name
      }));
    }
    processResponse(data);
  } catch (err) {
    addChat(`❌ Gagal memulai: ${err.message}`, 'error');
    showLoading(false);
  }
});

customInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendAction(customInput.value.trim()); });
btnCustomSend.addEventListener('click', () => sendAction(customInput.value.trim()));
spellInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { sendAction(spellInput.value.trim()); spellInput.value = ''; } });
btnSpellCast.addEventListener('click', () => { sendAction(spellInput.value.trim()); spellInput.value = ''; });

// ================================================
// AUTO-RESTORE on page load
// ================================================
restoreSession();
