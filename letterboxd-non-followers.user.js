// ==UserScript==
// @name         Letterboxd Non-Followers (Community Tool)
// @namespace    community.letterboxd.tools
// @version      0.2.1
// @description  Shows who you follow on Letterboxd but who don't follow you back.
// @author       Community
// @match        *://letterboxd.com/*
// @match        *://www.letterboxd.com/*
// @grant        GM_addStyle
// @grant        GM_setClipboard
// ==/UserScript==

(function () {
'use strict';

// ---------- Styles (MISMO ESTILO + spinner, sin tocar lógica) ----------
GM_addStyle(`
.lbtool-panel{
 position:fixed; top:18px; right:18px; width:380px; max-height:82vh; overflow:hidden;
 background:#111; color:#fff; z-index:999999; border-radius:14px; padding:14px;
 font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;
 box-shadow:0 10px 30px rgba(0,0,0,.45); border:1px solid rgba(255,255,255,.10);
}
.lbtool-title{display:flex; align-items:center; justify-content:space-between;}
.lbtool-btn{border:0; border-radius:10px; padding:8px 10px; cursor:pointer;
 background:#00c2a8; color:#001; font-weight:800; font-size:13px;}
.lbtool-btn.secondary{background:#2a2a2a; color:#fff;}
.lbtool-btn.danger{background:#ff4d4f; color:#fff;}
.lbtool-log{
 white-space:pre-wrap;
 font-family:ui-monospace, monospace;
 background:#0a0a0a; border-radius:10px; padding:10px;
 border:1px solid rgba(255,255,255,.08);
 font-size:12px; max-height:160px; overflow:auto;
}
.lbtool-fab{
 position:fixed; bottom:18px; right:18px; z-index:999999;
 background:#111; color:#fff; border:1px solid rgba(255,255,255,.15);
 border-radius:999px; padding:10px 14px; cursor:pointer;
 font-weight:900; font-size:13px;
}
.lb-spinner{
 width:18px;height:18px;border:3px solid rgba(255,255,255,.2);
 border-top:3px solid #00c2a8;border-radius:50%;
 animation:lbspin 1s linear infinite; display:inline-block;
 margin-right:8px; vertical-align:middle;
}
@keyframes lbspin{to{transform:rotate(360deg)}}
.lb-progress{
 height:6px;background:#222;border-radius:999px;margin:10px 0;
 overflow:hidden;
}
.lb-bar{
 height:100%;width:0%;background:#00c2a8;transition:width .3s ease;
}
`);

// ---------- Floating button (TOGGLE REAL) ----------
const fab = document.createElement('button');
fab.className = 'lbtool-fab';
fab.textContent = '🎬 Non-Followers';
document.body.appendChild(fab);

// ---------- State ----------
let panel = null;
let lastNoFollowers = [];
let lastUser = null;
let scanning = false;

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

nodes.forEach(a => {
 const href = a.getAttribute('href') || '';
 const mm = href.match(/^\/([A-Za-z0-9._-]+)\/$/);
 if (!mm) return;
 const u = mm[1].toLowerCase().trim();
 if (!reserved.has(u)) out.add(u);
});

return out;
}

async function scrapeAll(user, type, progressLabel) {
const base = `${location.origin}/${user}/${type}/`;
const users = new Set();
let emptyStreak = 0;

for (let p = 1; p <= 800; p++) {
 const url = p === 1 ? base : `${base}page/${p}/`;
 updateProgress(type, p);

 const res = await fetch(url, { credentials: 'include' });
 if (!res.ok) break;

 const html = await res.text();
 const doc = domp.parseFromString(html, 'text/html');

 const before = users.size;
 parsePeople(doc).forEach(u => users.add(u));
 const added = users.size - before;

 if (added === 0) emptyStreak++;
 else emptyStreak = 0;

 if (emptyStreak >= 2) break;
 await sleep(200);
}

return [...users].sort();
}

// ---------- UI ----------
function togglePanel() {
 if (panel) {
  panel.remove();
  panel = null;
  return;
 }
 openPanel();
}

fab.onclick = togglePanel;

function openPanel() {
panel = document.createElement('div');
panel.className = 'lbtool-panel';
panel.innerHTML = `
<div class="lbtool-title">
 <h3>🎬 Letterboxd Non-Followers</h3>
 <button id="lbtool-close">Cerrar</button>
</div>

<div id="lb-status">Listo. Tocá RUN.</div>
<div class="lb-progress"><div class="lb-bar" id="lb-bar"></div></div>

<div style="margin:10px 0">
 <b>Usuario:</b> <span id="lb-user">—</span><br>
 <b>No me siguen:</b> <span id="lb-nf">—</span>
</div>

<div>
 <button class="lbtool-btn" id="lbtool-run">RUN</button>
 <button class="lbtool-btn secondary" id="lbtool-copy" disabled>Copiar lista</button>
 <button class="lbtool-btn danger" id="lbtool-openall" disabled>Abrir todos</button>
</div>

<div class="lbtool-log" id="lbtool-log"></div>
`;

document.body.appendChild(panel);

panel.querySelector('#lbtool-close').onclick = togglePanel;
panel.querySelector('#lbtool-run').onclick = run;
panel.querySelector('#lbtool-copy').onclick = () => {
 GM_setClipboard(lastNoFollowers.join('\n'));
 alert('Lista copiada ✅');
};
panel.querySelector('#lbtool-openall').onclick = () => {
 lastNoFollowers.forEach(u =>
  window.open(`https://letterboxd.com/${u}/`, '_blank')
 );
};
}

function setStatus(text, spinning = false) {
const el = panel.querySelector('#lb-status');
el.innerHTML = spinning
 ? `<span class="lb-spinner"></span>${text}`
 : text;
}

function updateProgress(type, page) {
const bar = panel.querySelector('#lb-bar');
const percent = Math.min(page * 2, 100);
bar.style.width = percent + '%';
setStatus(`Analizando ${type}… página ${page}`, true);
}

// ---------- RUN (MISMA LÓGICA ORIGINAL) ----------
async function run() {
if (scanning) return;
scanning = true;

lastUser = detectUser();
panel.querySelector('#lb-user').textContent = lastUser || '—';

if (!lastUser) {
 setStatus('Abrí tu perfil primero (letterboxd.com/TUUSUARIO)', false);
 scanning = false;
 return;
}

setStatus('Recolectando following…', true);

const following = await scrapeAll(lastUser, 'following');

setStatus('Recolectando followers…', true);

const followers = await scrapeAll(lastUser, 'followers');

const fset = new Set(followers);
const noFollowBack = following.filter(u => !fset.has(u));
lastNoFollowers = noFollowBack;

panel.querySelector('#lb-nf').textContent = noFollowBack.length;
panel.querySelector('#lbtool-copy').disabled = false;
panel.querySelector('#lbtool-openall').disabled = noFollowBack.length === 0;

setStatus(`✨ Listo. No te siguen: ${noFollowBack.length}`, false);
panel.querySelector('#lb-bar').style.width = '100%';

scanning = false;
}

})();
