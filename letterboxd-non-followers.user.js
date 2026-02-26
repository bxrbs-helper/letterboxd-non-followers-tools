// ==UserScript==
// @name         Letterboxd Non-Followers (Community Tool)
// @namespace    community.letterboxd.tools
// @version      0.2.2
// @description  Shows who you follow on Letterboxd but who don't follow you back.
// @author       Community
// @match        *://letterboxd.com/*
// @match        *://www.letterboxd.com/*
// @grant        GM_addStyle
// @grant        GM_setClipboard
// ==/UserScript==

(function () {
'use strict';

/* ===== ESTÉTICA (SIN TOCAR LÓGICA) ===== */
GM_addStyle(`
.lbtool-panel{
 position:fixed; top:18px; right:18px; width:380px;
 background:#111; color:#fff; z-index:999999;
 border-radius:14px; padding:14px;
 font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;
 box-shadow:0 10px 30px rgba(0,0,0,.45);
 border:1px solid rgba(255,255,255,.10);
}
.lbtool-fab{
 position:fixed; bottom:18px; right:18px; z-index:999999;
 background:#111; color:#fff; border:1px solid rgba(255,255,255,.15);
 border-radius:999px; padding:10px 14px; cursor:pointer;
 font-weight:900; font-size:13px;
}
.lbtool-btn{
 border:0; border-radius:10px; padding:8px 10px; cursor:pointer;
 background:#00c2a8; color:#001; font-weight:800; font-size:13px;
}
.lb-progress{height:6px;background:#222;border-radius:999px;margin:10px 0;overflow:hidden;}
.lb-bar{height:100%;width:0%;background:#00c2a8;transition:width .2s ease;}
.lb-spinner{
 width:16px;height:16px;border:3px solid rgba(255,255,255,.2);
 border-top:3px solid #00c2a8;border-radius:50%;
 animation:spin 1s linear infinite; display:inline-block; margin-right:6px;
}
@keyframes spin{to{transform:rotate(360deg)}}
.lbtool-log{
 white-space:pre-wrap;
 font-family:ui-monospace, monospace;
 background:#0a0a0a; border-radius:10px; padding:10px;
 border:1px solid rgba(255,255,255,.08);
 font-size:12px; max-height:160px; overflow:auto;
}
`);

const fab = document.createElement('button');
fab.className = 'lbtool-fab';
fab.textContent = '🎬 Non-Followers';
document.body.appendChild(fab);

let panel = null;
let lastNoFollowers = [];
let lastUser = null;
let scanning = false;

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

/* CLAVE: ESTE ES TU PARSER ORIGINAL (EL QUE SÍ FUNCIONA) */
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

function setStatus(text, spin = false) {
 const el = panel.querySelector('#lb-status');
 el.innerHTML = spin
   ? `<span class="lb-spinner"></span>${text}`
   : text;
}

function setProgress(p) {
 panel.querySelector('#lb-bar').style.width = p + '%';
}

async function scrapeAll(user, type) {
 const base = `${location.origin}/${user}/${type}/`;
 const users = new Set();
 let emptyStreak = 0;

 for (let p = 1; p <= 800; p++) {
   setStatus(`Analizando ${type} página ${p}…`, true);
   setProgress(Math.min(p * 2, 95));

   const url = p === 1 ? base : `${base}page/${p}/`;
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

function togglePanel() {
 if (panel) {
   panel.remove();
   panel = null;
   return;
 }

 panel = document.createElement('div');
 panel.className = 'lbtool-panel';
 panel.innerHTML = `
   <h3>🎬 Letterboxd Non-Followers</h3>
   <div id="lb-status">Listo. Tocá RUN.</div>
   <div class="lb-progress"><div class="lb-bar" id="lb-bar"></div></div>
   <div><b>Usuario:</b> <span id="lb-user">—</span></div>
   <div><b>No me siguen:</b> <span id="lb-nf">—</span></div>
   <br>
   <button class="lbtool-btn" id="run">RUN</button>
   <button class="lbtool-btn" id="copy" disabled>Copiar lista</button>
   <div class="lbtool-log" id="log"></div>
 `;
 document.body.appendChild(panel);

 panel.querySelector('#run').onclick = run;
 panel.querySelector('#copy').onclick = () => {
   GM_setClipboard(lastNoFollowers.join('\n'));
   alert('Lista copiada ✅');
 };
}

fab.onclick = togglePanel;

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
 panel.querySelector('#copy').disabled = false;

 setProgress(100);
 setStatus(`✨ Listo. No te siguen: ${noFollowBack.length}`, false);
 scanning = false;
}

})();
