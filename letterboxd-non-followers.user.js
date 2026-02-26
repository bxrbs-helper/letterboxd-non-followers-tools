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

/* === SOLO CAMBIO ESTÉTICO (NO TOCA LÓGICA) === */
GM_addStyle(`
  .lbtool-panel{
    position:fixed; top:18px; right:18px; width:380px; height:420px;
    overflow:hidden;
    background:#111; color:#fff; z-index:999999; border-radius:14px; padding:14px;
    font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;
    box-shadow:0 10px 30px rgba(0,0,0,.45);
    border:1px solid rgba(255,255,255,.10);
    display:flex; flex-direction:column;
  }

  .lbtool-progress{
    margin-top:10px;
    padding:12px;
    background:#0a0a0a;
    border-radius:12px;
    border:1px solid rgba(255,255,255,.08);
  }

  .lbtool-spinner{
    width:16px;
    height:16px;
    border:3px solid rgba(255,255,255,0.2);
    border-top:3px solid #00c2a8;
    border-radius:50%;
    animation:spin 1s linear infinite;
    display:inline-block;
    margin-right:8px;
  }

  @keyframes spin{
    0%{transform:rotate(0deg);}
    100%{transform:rotate(360deg);}
  }

  .lbtool-bar{
    width:100%;
    height:6px;
    background:#1a1a1a;
    border-radius:999px;
    margin-top:10px;
    overflow:hidden;
  }

  .lbtool-bar-fill{
    height:100%;
    width:0%;
    background:linear-gradient(90deg,#00c2a8,#00e0c2);
    transition:width .25s ease;
  }

  /* Oculta el log que estira el panel */
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

  .lbtool-fab{
    position:fixed; bottom:18px; right:18px; z-index:999999;
    background:#111; color:#fff; border:1px solid rgba(255,255,255,.15);
    border-radius:999px; padding:10px 12px; cursor:pointer;
    box-shadow:0 10px 30px rgba(0,0,0,.35);
    font-weight:900; font-size:13px;
  }
`);

/* === TODO LO DE ABAJO ES TU LÓGICA ORIGINAL SIN CAMBIOS === */

const fab = document.createElement('button');
fab.className = 'lbtool-fab';
fab.textContent = '🎬 Non-Followers';
document.body.appendChild(fab);

let panel = null;
let lastNoFollowers = [];
let lastUser = null;

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

users.forEach(u => {
  const row = document.createElement('div');
  row.textContent = '@' + u;
  box.appendChild(row);
});
}

function openPanel() {
if (panel) return;

panel = document.createElement('div');
panel.className = 'lbtool-panel';
panel.innerHTML = `
  <h3>🎬 Letterboxd Non-Followers</h3>

  <div class="lbtool-progress">
    <div><span class="lbtool-spinner"></span><span id="lbtool-status">Listo. Tocá RUN.</span></div>
    <div class="lbtool-bar"><div class="lbtool-bar-fill" id="lbtool-bar"></div></div>
  </div>

  <button id="lbtool-run">RUN</button>
  <div class="lbtool-list" id="lbtool-list"></div>
  <div class="lbtool-log" id="lbtool-log"></div>
`;

document.body.appendChild(panel);
panel.querySelector('#lbtool-run').onclick = run;
}

fab.onclick = openPanel;

async function run() {
lastUser = detectUser();

if (!lastUser) {
  log('Abrí tu perfil y reintentá.');
  return;
}

clearList();
log('Recolectando followers y following…');

const following = await scrapeAll(lastUser, 'following', (m) => logAppend(m));
const followers = await scrapeAll(lastUser, 'followers', (m) => logAppend(m));

const fset = new Set(followers);
const noFollowBack = following.filter(u => !fset.has(u));
lastNoFollowers = noFollowBack;

log(`Listo. No te siguen: ${noFollowBack.length}`);
renderList(lastUser, noFollowBack);
}

})();
