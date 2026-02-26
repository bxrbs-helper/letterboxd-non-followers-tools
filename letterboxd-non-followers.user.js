// ==UserScript==
// @name         Letterboxd Non-Followers (Community Tool)
// @namespace    community.letterboxd.tools
// @version      0.2.0
// @description  Shows who you follow on Letterboxd but who don't follow you back. Includes per-user and batch "open profile" actions. No login, no password. Uses public pages + your session cookies for fetch.
// @author       Community
// @match        *://letterboxd.com/*
// @match        *://www.letterboxd.com/*
// @grant        GM_addStyle
// @grant        GM_setClipboard
// ==/UserScript==

(function () {
'use strict';

// ---------- Styles (SOLO CAMBIO ESTÉTICO) ----------
GM_addStyle(`
  .lbtool-panel{
    position:fixed; top:18px; right:18px; width:380px; height:420px; overflow:hidden;
    background:#111; color:#fff; z-index:999999; border-radius:14px; padding:14px;
    font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;
    box-shadow:0 10px 30px rgba(0,0,0,.45); border:1px solid rgba(255,255,255,.10);
    display:flex; flex-direction:column;
  }
  .lbtool-title{display:flex; align-items:center; justify-content:space-between; gap:10px;}
  .lbtool-title h3{margin:0; font-size:16px; font-weight:800;}
  .lbtool-x{
    appearance:none; border:0; background:#2a2a2a; color:#fff; border-radius:10px;
    padding:6px 10px; cursor:pointer; font-weight:700;
  }

  /* NUEVO: PROGRESO VISUAL */
  .lbtool-progress-box{
    margin-top:10px;
    padding:12px;
    background:#0a0a0a;
    border-radius:12px;
    border:1px solid rgba(255,255,255,.08);
  }
  .lbtool-progress-header{
    display:flex;
    align-items:center;
    gap:8px;
    font-size:13px;
    font-weight:600;
  }
  .lbtool-spinner{
    width:16px;
    height:16px;
    border:3px solid rgba(255,255,255,0.2);
    border-top:3px solid #00c2a8;
    border-radius:50%;
    animation:lbspin 1s linear infinite;
  }
  @keyframes lbspin {
    0%{transform:rotate(0deg);}
    100%{transform:rotate(360deg);}
  }
  .lbtool-progress-bar{
    width:100%;
    height:6px;
    background:#1a1a1a;
    border-radius:999px;
    margin-top:10px;
    overflow:hidden;
  }
  .lbtool-progress-fill{
    height:100%;
    width:0%;
    background:linear-gradient(90deg,#00c2a8,#00e0c2);
    transition:width 0.3s ease;
  }

  .lbtool-kv{
    display:grid; grid-template-columns:1fr auto; gap:6px;
    font-size:13px; opacity:.95; margin-top:10px;
    border-top:1px solid rgba(255,255,255,.08); padding-top:10px;
  }
  .lbtool-row{display:flex; gap:8px; flex-wrap:wrap; margin:12px 0 10px 0;}
  .lbtool-btn{
    appearance:none; border:0; border-radius:10px; padding:8px 10px; cursor:pointer;
    background:#00c2a8; color:#001; font-weight:800; font-size:13px;
  }
  .lbtool-btn.secondary{background:#2a2a2a; color:#fff; font-weight:700;}
  .lbtool-btn.danger{background:#ff4d4f; color:#fff;}
  .lbtool-btn:disabled{opacity:.55; cursor:not-allowed}

  /* OCULTAMOS EL LOG PARA QUE NO CREZCA HACIA ABAJO */
  .lbtool-log{
    display:none !important;
  }

  .lbtool-list{
    margin-top:10px;
    background:#0a0a0a; border-radius:10px; padding:10px;
    border:1px solid rgba(255,255,255,.08);
    max-height:240px; overflow:auto;
    flex:1;
  }
  .lbtool-item{
    display:flex; align-items:center; justify-content:space-between; gap:10px;
    padding:8px; background:#111; border-radius:10px; margin-bottom:8px;
  }
  .lbtool-item:last-child{margin-bottom:0;}
  .lbtool-user{
    display:flex; flex-direction:column; gap:2px; min-width:0;
  }
  .lbtool-user a{
    color:#00c2a8; text-decoration:none; font-weight:800; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
  }
  .lbtool-user small{opacity:.75;}
  .lbtool-actions{display:flex; gap:8px; flex-shrink:0;}
  .lbtool-fab{
    position:fixed; bottom:18px; right:18px; z-index:999999;
    background:#111; color:#fff; border:1px solid rgba(255,255,255,.15);
    border-radius:999px; padding:10px 12px; cursor:pointer; box-shadow:0 10px 30px rgba(0,0,0,.35);
    font-weight:900; font-size:13px;
  }
  .lbtool-muted{opacity:.75}
  .lbtool-footer{
    margin-top:10px; font-size:12px; opacity:.75;
    border-top:1px solid rgba(255,255,255,.08); padding-top:10px;
  }
`);

// ---------- Floating button ----------
const fab = document.createElement('button');
fab.className = 'lbtool-fab';
fab.textContent = '🎬 Non-Followers';
document.body.appendChild(fab);

// ---------- State ----------
let panel = null;
let lastNoFollowers = [];
let lastUser = null;

// ---------- Helpers (SIN CAMBIOS) ----------
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

  if (added === 0) emptyStreak++;
  else emptyStreak = 0;

  if (emptyStreak >= 2) break;
  await sleep(250);
}

return [...users].sort();
}

function setText(sel, v) {
const el = panel?.querySelector(sel);
if (el) el.textContent = v;
}

function log(msg) {
const el = panel?.querySelector('#lbtool-status');
if (el) el.textContent = msg;
}

function logAppend(msg) {
const status = panel?.querySelector('#lbtool-status');
const bar = panel?.querySelector('#lbtool-bar');

if (status) {
  if (msg.includes('following')) status.textContent = 'Analizando Following...';
  else if (msg.includes('followers')) status.textContent = 'Analizando Followers...';
  else status.textContent = 'Escaneando perfiles...';
}

if (bar) {
  const current = parseFloat(bar.style.width) || 5;
  bar.style.width = Math.min(current + 2, 95) + '%';
}
}

function clearList() {
const box = panel?.querySelector('#lbtool-list');
if (box) box.innerHTML = '';
}

function renderList(owner, users) {
const box = panel?.querySelector('#lbtool-list');
if (!box) return;

box.innerHTML = '';

if (!users.length) {
  const div = document.createElement('div');
  div.className = 'lbtool-muted';
  div.textContent = '🎉 Todos te siguen de vuelta.';
  box.appendChild(div);
  return;
}

users.forEach(u => {
  const row = document.createElement('div');
  row.className = 'lbtool-item';

  const userCol = document.createElement('div');
  userCol.className = 'lbtool-user';

  const a = document.createElement('a');
  a.href = `https://letterboxd.com/${u}/`;
  a.target = '_blank';
  a.textContent = `@${u}`;

  userCol.appendChild(a);

  const actions = document.createElement('div');
  actions.className = 'lbtool-actions';

  const btnOpen = document.createElement('button');
  btnOpen.className = 'lbtool-btn danger';
  btnOpen.textContent = 'Unfollow';
  btnOpen.onclick = () => window.open(`https://letterboxd.com/${u}/`, '_blank');

  actions.appendChild(btnOpen);
  row.appendChild(userCol);
  row.appendChild(actions);
  box.appendChild(row);
});
}

// ---------- UI ----------
function openPanel() {
if (panel) return;

panel = document.createElement('div');
panel.className = 'lbtool-panel';
panel.innerHTML = `
  <div class="lbtool-title">
    <h3>🎬 Letterboxd Non-Followers</h3>
    <button class="lbtool-x" id="lbtool-close">Cerrar</button>
  </div>

  <div class="lbtool-progress-box">
    <div class="lbtool-progress-header">
      <div class="lbtool-spinner"></div>
      <div id="lbtool-status">Listo. Tocá RUN.</div>
    </div>
    <div class="lbtool-progress-bar">
      <div class="lbtool-progress-fill" id="lbtool-bar"></div>
    </div>
  </div>

  <div class="lbtool-kv">
    <div>Usuario detectado</div><div id="lbtool-user">—</div>
    <div>Following</div><div id="lbtool-following">—</div>
    <div>Followers</div><div id="lbtool-followers">—</div>
    <div>No me siguen</div><div id="lbtool-nf">—</div>
    <div>Mutuos</div><div id="lbtool-mutuals">—</div>
  </div>

  <div class="lbtool-row">
    <button class="lbtool-btn" id="lbtool-run">RUN</button>
  </div>

  <div class="lbtool-list" id="lbtool-list"></div>
`;

document.body.appendChild(panel);

panel.querySelector('#lbtool-close').onclick = () => { panel.remove(); panel = null; };
panel.querySelector('#lbtool-run').onclick = run;

setText('#lbtool-user', detectUser() || '—');
}

fab.onclick = openPanel;

// ---------- RUN (SIN CAMBIOS DE LÓGICA) ----------
async function run() {
lastUser = detectUser();
setText('#lbtool-user', lastUser || '—');

if (!lastUser) {
  log('No pude detectar el usuario. Abrí tu perfil y reintentá.');
  return;
}

const runBtn = panel.querySelector('#lbtool-run');
runBtn.disabled = true;

lastNoFollowers = [];
clearList();
log('Recolectando followers y following…');

const following = await scrapeAll(lastUser, 'following', (m) => logAppend(m));
const followers = await scrapeAll(lastUser, 'followers', (m) => logAppend(m));

const fset = new Set(followers);
const noFollowBack = following.filter(u => !fset.has(u));
const mutuals = following.filter(u => fset.has(u));

lastNoFollowers = noFollowBack;

setText('#lbtool-following', String(following.length));
setText('#lbtool-followers', String(followers.length));
setText('#lbtool-nf', String(noFollowBack.length));
setText('#lbtool-mutuals', String(mutuals.length));

log(`✅ Listo. No me siguen: ${noFollowBack.length}`);
renderList(lastUser, noFollowBack);

runBtn.disabled = false;
}

})();
