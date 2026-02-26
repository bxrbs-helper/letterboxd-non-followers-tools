// ==UserScript==
// @name         Letterboxd Non-Followers (Community Tool)
// @namespace    community.letterboxd.tools
// @version      0.2.0
// @description  Shows who you follow on Letterboxd but who don't follow you back.
// @author       Community
// @match        *://letterboxd.com/*
// @match        *://www.letterboxd.com/*
// @grant        GM_addStyle
// @grant        GM_setClipboard
// ==/UserScript==

(function () {
'use strict';

// ---------- Styles ----------
GM_addStyle(`
.lbtool-panel{
  position:fixed; top:18px; right:18px; width:380px; max-height:82vh; overflow:hidden;
  background:#111; color:#fff; z-index:999999; border-radius:14px; padding:14px;
  font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;
  box-shadow:0 10px 30px rgba(0,0,0,.45); border:1px solid rgba(255,255,255,.10);
}
.lbtool-title{display:flex; align-items:center; justify-content:space-between; gap:10px;}
.lbtool-title h3{margin:0; font-size:16px; font-weight:800;}
.lbtool-x{
  appearance:none; border:0; background:#2a2a2a; color:#fff; border-radius:10px;
  padding:6px 10px; cursor:pointer; font-weight:700;
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
.lbtool-log{
  white-space:pre-wrap;
  font-family:ui-monospace, Menlo, Consolas, monospace;
  background:#0a0a0a; border-radius:10px; padding:10px;
  border:1px solid rgba(255,255,255,.08);
  font-size:12px; line-height:1.35;
  max-height:200px; overflow:auto;
}
.lbtool-list{
  margin-top:10px;
  background:#0a0a0a; border-radius:10px; padding:10px;
  border:1px solid rgba(255,255,255,.08);
  max-height:240px; overflow:auto;
}
.lbtool-item{
  display:flex; align-items:center; justify-content:space-between; gap:10px;
  padding:8px; background:#111; border-radius:10px; margin-bottom:8px;
}
.lbtool-user a{
  color:#00c2a8; text-decoration:none; font-weight:800;
}
.lbtool-actions{display:flex; gap:8px; flex-shrink:0;}
.lbtool-fab{
  position:fixed; bottom:18px; right:18px; z-index:999999;
  background:#111; color:#fff; border:1px solid rgba(255,255,255,.15);
  border-radius:999px; padding:10px 12px; cursor:pointer;
  box-shadow:0 10px 30px rgba(0,0,0,.35);
  font-weight:900; font-size:13px;
}
.lbtool-muted{opacity:.75}
`);

// ---------- Floating button ----------
const fab = document.createElement('button');
fab.className = 'lbtool-fab';
fab.textContent = '🎬 Non-Followers';
document.body.appendChild(fab);

// 🔧 ÚNICO CAMBIO: evitar que desaparezca en la SPA de Letterboxd
const observer = new MutationObserver(() => {
  if (!document.body.contains(fab)) {
    document.body.appendChild(fab);
  }
});
observer.observe(document.body, { childList: true, subtree: true });

// ---------- State ----------
let panel = null;
let lastNoFollowers = [];
let lastUser = null;

// ---------- Helpers ----------
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

    <div class="lbtool-kv">
      <div>Usuario detectado</div><div id="lbtool-user">—</div>
      <div>No me siguen</div><div id="lbtool-nf">—</div>
    </div>

    <div class="lbtool-row">
      <button class="lbtool-btn" id="lbtool-run">Analizar</button>
      <button class="lbtool-btn secondary" id="lbtool-copy" disabled>Copiar</button>
    </div>

    <div class="lbtool-log" id="lbtool-log">Listo. Tocá Analizar.</div>
    <div class="lbtool-list" id="lbtool-list"></div>
  `;

  document.body.appendChild(panel);

  panel.querySelector('#lbtool-close').onclick = () => {
    panel.remove();
    panel = null;
  };

  panel.querySelector('#lbtool-run').onclick = run;
  panel.querySelector('#lbtool-copy').onclick = () => {
    GM_setClipboard(lastNoFollowers.join('\n'));
    alert('Lista copiada ✅');
  };

  panel.querySelector('#lbtool-user').textContent = detectUser() || '—';
}

fab.onclick = openPanel;

// ---------- RUN ----------
async function run() {
  lastUser = detectUser();
  if (!lastUser) return;

  const logEl = panel.querySelector('#lbtool-log');
  const nfEl = panel.querySelector('#lbtool-nf');
  const listEl = panel.querySelector('#lbtool-list');

  logEl.textContent = 'Recolectando followers y following…';
  listEl.innerHTML = '';

  const following = await scrapeAll(lastUser, 'following', m => logEl.textContent = m);
  const followers = await scrapeAll(lastUser, 'followers', m => logEl.textContent = m);

  const fset = new Set(followers);
  const noFollowBack = following.filter(u => !fset.has(u));

  lastNoFollowers = noFollowBack;
  nfEl.textContent = noFollowBack.length;

  logEl.textContent = `✨ Listo. No te siguen: ${noFollowBack.length}`;

  noFollowBack.forEach(u => {
    const row = document.createElement('div');
    row.className = 'lbtool-item';
    row.innerHTML = `
      <div class="lbtool-user">
        <a href="https://letterboxd.com/${u}/" target="_blank">@${u}</a>
      </div>
      <div class="lbtool-actions">
        <button class="lbtool-btn danger">Unfollow</button>
      </div>
    `;
    row.querySelector('button').onclick = () => {
      window.open(`https://letterboxd.com/${u}/`, '_blank');
    };
    listEl.appendChild(row);
  });

  panel.querySelector('#lbtool-copy').disabled = false;
}

})();
