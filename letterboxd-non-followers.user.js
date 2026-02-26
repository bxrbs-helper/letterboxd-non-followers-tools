// ==UserScript==
// @name         Letterboxd Non-Followers (Community Tool)
// @namespace    community.letterboxd.tools
// @version      0.2.1
// @description  Shows who you follow on Letterboxd but who don't follow you back. UI mejorada sin cambiar lógica.
// @author       Community
// @match        *://letterboxd.com/*
// @match        *://www.letterboxd.com/*
// @grant        GM_addStyle
// @grant        GM_setClipboard
// ==/UserScript==

(function () {
'use strict';

// ---------- Styles (SOLO ESTÉTICA) ----------
GM_addStyle(`
.lbtool-panel{
  position:fixed; top:18px; right:18px; width:380px; max-height:82vh; overflow:hidden;
  background:linear-gradient(180deg,#0f1115,#0a0c10);
  color:#fff; z-index:999999; border-radius:16px; padding:16px;
  font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;
  box-shadow:0 20px 60px rgba(0,0,0,.55);
  border:1px solid rgba(255,255,255,.08);
}

.lbtool-title{
  display:flex; align-items:center; justify-content:space-between;
}

.lbtool-title h3{
  margin:0; font-size:16px; font-weight:900;
}

.lbtool-x{
  border:0; background:#1f232b; color:#fff; border-radius:10px;
  padding:6px 12px; cursor:pointer; font-weight:800;
}

.lbtool-status{
  display:flex; align-items:center; gap:10px;
  margin:12px 0 6px 0; font-weight:700;
}

.lbtool-spinner{
  width:16px; height:16px; border-radius:50%;
  border:3px solid rgba(0,255,200,.2);
  border-top:3px solid #00c2a8;
  animation:spin 1s linear infinite;
}

.lbtool-spinner.done{
  animation:none;
  border-top:3px solid #00ff88;
}

@keyframes spin{
  from{transform:rotate(0deg);}
  to{transform:rotate(360deg);}
}

.lbtool-progress{
  width:100%; height:8px; border-radius:999px;
  background:#111; overflow:hidden; margin-bottom:12px;
  border:1px solid rgba(255,255,255,.08);
}

.lbtool-bar{
  height:100%; width:0%;
  background:linear-gradient(90deg,#00c2a8,#00ffcc);
  transition:width .25s ease;
}

.lbtool-kv{
  display:grid; grid-template-columns:1fr auto; gap:6px;
  font-size:13px; opacity:.95; margin-top:10px;
}

.lbtool-btn{
  width:100%; border:0; border-radius:12px;
  padding:12px; cursor:pointer;
  background:linear-gradient(90deg,#00c2a8,#00e0b8);
  color:#001; font-weight:900; font-size:14px;
  margin-top:10px;
}

.lbtool-log{
  display:none !important; /* ocultamos el log visual, NO la lógica */
}
`);

// ---------- Floating button (AHORA TOGGLE) ----------
const fab = document.createElement('button');
fab.className = 'lbtool-fab';
fab.textContent = '🎬 Non-Followers';
document.body.appendChild(fab);

// ---------- State ----------
let panel = null;
let lastNoFollowers = [];
let lastUser = null;
let scanning = false;

// ---------- Helpers (NO TOCADOS) ----------
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const domp = new DOMParser();

const reserved = new Set([
'films','film','lists','list','diary','watchlist','likes','news','about','journal','apps','legal',
'pro','upgrade','members','people','activity','settings','create','reviews','search','tags','crew',
'actor','director','network','stats'
]);

function detectUser() {
  const parts = location.pathname.split('/').filter(Boolean);
  return parts.length ? parts[0] : null;
}

function parsePeople(doc) {
  const out = new Set();
  const nodes = doc.querySelectorAll('li.person-summary a[href^="/"]');
  const use = nodes.length ? nodes : doc.querySelectorAll('a[href^="/"]');

  use.forEach(a => {
    const href = a.getAttribute('href') || '';
    const mm = href.match(/^\/([A-Za-z0-9._-]+)\/$/);
    if (!mm) return;
    const u = mm[1].toLowerCase().trim();
    if (!reserved.has(u)) out.add(u);
  });

  return out;
}

async function scrapeAll(user, type, logFn) {
  const base = `${location.origin}/${user}/${type}/`;
  const users = new Set();
  let emptyStreak = 0;

  for (let p = 1; p <= 800; p++) {
    const url = p === 1 ? base : `${base}page/${p}/`;
    const res = await fetch(url, { credentials: 'include' });
    if (!res.ok) break;

    const html = await res.text();
    const doc = domp.parseFromString(html, 'text/html');

    const before = users.size;
    parsePeople(doc).forEach(u => users.add(u));
    const added = users.size - before;

    logFn(`${type} page ${p}: +${added} (total ${users.size})`);

    // progreso visual (ESTÉTICO)
    updateProgress(type, p);

    if (added === 0) emptyStreak++;
    else emptyStreak = 0;

    if (emptyStreak >= 2) break;
    await sleep(250);
  }

  return [...users].sort();
}

// ---------- UI ----------
function openPanel() {
  if (panel) {
    panel.remove();
    panel = null;
    return; // TOGGLE: si existe, cierra
  }

  panel = document.createElement('div');
  panel.className = 'lbtool-panel';
  panel.innerHTML = `
    <div class="lbtool-title">
      <h3>🎬 Letterboxd Non-Followers</h3>
      <button class="lbtool-x" id="lbtool-close">Cerrar</button>
    </div>

    <div class="lbtool-status">
      <div class="lbtool-spinner" id="lbtool-spinner"></div>
      <div id="lbtool-status-text">Listo para analizar</div>
    </div>

    <div class="lbtool-progress">
      <div class="lbtool-bar" id="lbtool-bar"></div>
    </div>

    <div class="lbtool-kv">
      <div>👤 Usuario</div><div id="lbtool-user">—</div>
      <div>🚫 No me siguen</div><div id="lbtool-nf">—</div>
    </div>

    <button class="lbtool-btn" id="lbtool-run">🚀 Analizar Non-Followers</button>

    <div class="lbtool-log" id="lbtool-log"></div>
  `;

  document.body.appendChild(panel);

  panel.querySelector('#lbtool-close').onclick = () => {
    panel.remove();
    panel = null;
  };

  panel.querySelector('#lbtool-run').onclick = run;
  panel.querySelector('#lbtool-user').textContent = detectUser() || '—';
}

fab.onclick = openPanel;

// ---------- VISUAL PROGRESS (NO TOCA LÓGICA) ----------
function updateProgress(type, page){
  const bar = panel?.querySelector('#lbtool-bar');
  const text = panel?.querySelector('#lbtool-status-text');
  if(!bar || !text) return;

  bar.style.width = Math.min(95, page * 2) + '%';
  text.textContent = `🔎 Analizando ${type} — página ${page}...`;
}

function finishProgress(n){
  const bar = panel?.querySelector('#lbtool-bar');
  const text = panel?.querySelector('#lbtool-status-text');
  const spinner = panel?.querySelector('#lbtool-spinner');

  if(bar) bar.style.width = '100%';
  if(text) text.textContent = `✨ Listo. No te siguen: ${n}`;
  if(spinner) spinner.classList.add('done'); // DETIENE el círculo
}

// ---------- RUN (MISMA LÓGICA) ----------
async function run() {
  if(scanning) return;
  scanning = true;

  lastUser = detectUser();
  panel.querySelector('#lbtool-user').textContent = lastUser || '—';

  const logEl = panel.querySelector('#lbtool-log');
  logEl.textContent = '';

  if (!lastUser) {
    scanning = false;
    return;
  }

  const following = await scrapeAll(lastUser, 'following', (m) => logEl.textContent += m + '\n');
  const followers = await scrapeAll(lastUser, 'followers', (m) => logEl.textContent += m + '\n');

  const fset = new Set(followers);
  const noFollowBack = following.filter(u => !fset.has(u));
  lastNoFollowers = noFollowBack;

  panel.querySelector('#lbtool-nf').textContent = noFollowBack.length;

  finishProgress(noFollowBack.length);
  scanning = false;
}

})();
