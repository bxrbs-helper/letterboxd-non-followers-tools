// ==UserScript==
// @name         Letterboxd Non-Followers (Stable UI + Real Parser)
// @namespace    community.letterboxd.tools
// @version      0.3.0
// @description  Stable version that ACTUALLY reads followers/following + nice UI
// @match        *://letterboxd.com/*
// @match        *://www.letterboxd.com/*
// @grant        GM_addStyle
// @grant        GM_setClipboard
// ==/UserScript==

(function () {
'use strict';

/* ================== STYLES (solo estética) ================== */
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
.lb-spinner{
 width:16px;height:16px;border:3px solid rgba(255,255,255,.2);
 border-top:3px solid #00c2a8;border-radius:50%;
 animation:spin 1s linear infinite; display:inline-block; margin-right:6px;
}
@keyframes spin{to{transform:rotate(360deg)}}
.lb-progress{height:6px;background:#222;border-radius:999px;margin:10px 0;overflow:hidden;}
.lb-bar{height:100%;width:0%;background:#00c2a8;transition:width .25s ease;}
.lbtool-log{max-height:140px;overflow:auto;font-size:11px;background:#0a0a0a;padding:8px;border-radius:8px;margin-top:8px;}
`);

/* ================== FLOAT BUTTON ================== */
const fab = document.createElement('button');
fab.className = 'lbtool-fab';
fab.textContent = '🎬 Non-Followers';
document.body.appendChild(fab);

/* ================== STATE ================== */
let panel = null;
let scanning = false;
let lastNoFollowers = [];
const domp = new DOMParser();
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ================== USER DETECTION ================== */
function detectUser() {
 const parts = location.pathname.split('/').filter(Boolean);
 return parts.length ? parts[0] : null;
}

/* ================== REAL PARSER (CLAVE) ================== */
function parsePeople(doc) {
 const out = new Set();

 // Layout clásico
 const classic = doc.querySelectorAll('li.person-summary a[href^="/"]');

 // Layout nuevo (cards/grid)
 const cards = doc.querySelectorAll('.person-summary a[href^="/"], .person a[href^="/"]');

 // Fallback universal (por si Letterboxd cambia DOM)
 const generic = doc.querySelectorAll('a[href^="/"]');

 const all = [...classic, ...cards, ...generic];

 all.forEach(a => {
   const href = a.getAttribute('href') || '';
   const match = href.match(/^\/([A-Za-z0-9._-]+)\/$/);
   if (!match) return;

   const username = match[1].toLowerCase();

   // Filtrar rutas que NO son usuarios reales
   const blacklist = [
     'films','lists','diary','watchlist','likes','members','people','activity',
     'settings','search','tags','crew','about','journal','news','apps','legal'
   ];

   if (blacklist.includes(username)) return;

   out.add(username);
 });

 return out;
}

/* ================== SCRAPER (MISMA LÓGICA) ================== */
async function scrapeAll(user, type, logEl, barEl, statusEl) {
 const base = `${location.origin}/${user}/${type}/`;
 const users = new Set();
 let emptyStreak = 0;

 for (let p = 1; p <= 800; p++) {
   statusEl.innerHTML = `<span class="lb-spinner"></span> Analizando ${type} página ${p}...`;
   barEl.style.width = Math.min(p * 2, 95) + "%";

   const url = p === 1 ? base : `${base}page/${p}/`;
   const res = await fetch(url, { credentials: 'include' });
   if (!res.ok) break;

   const html = await res.text();
   const doc = domp.parseFromString(html, 'text/html');

   const before = users.size;
   parsePeople(doc).forEach(u => users.add(u));
   const added = users.size - before;

   logEl.textContent += `${type} page ${p}: +${added}\n`;

   if (added === 0) emptyStreak++;
   else emptyStreak = 0;

   if (emptyStreak >= 2) break;
   await sleep(250);
 }

 return [...users];
}

/* ================== PANEL ================== */
function togglePanel() {
 if (panel) {
   panel.remove();
   panel = null;
   return;
 }

 panel = document.createElement('div');
 panel.className = 'lbtool-panel';
 panel.innerHTML = `
   <h3>🎬 Non-Followers Analyzer</h3>
   <div id="status">Listo para analizar</div>
   <div class="lb-progress"><div class="lb-bar" id="bar"></div></div>
   <div>👤 Usuario: <span id="user">—</span></div>
   <div>🚫 No te siguen: <span id="nf">—</span></div>
   <br>
   <button class="lbtool-btn" id="run">🚀 Analizar</button>
   <button class="lbtool-btn" id="copy" disabled>📋 Copiar</button>
   <div class="lbtool-log" id="log"></div>
 `;
 document.body.appendChild(panel);

 panel.querySelector('#run').onclick = run;
 panel.querySelector('#copy').onclick = () => {
   GM_setClipboard(lastNoFollowers.join('\n'));
   alert('Lista copiada');
 };
}

fab.onclick = togglePanel;

/* ================== RUN ================== */
async function run() {
 if (scanning) return;
 scanning = true;

 const user = detectUser();
 const statusEl = panel.querySelector('#status');
 const barEl = panel.querySelector('#bar');
 const logEl = panel.querySelector('#log');

 panel.querySelector('#user').textContent = user || '—';
 logEl.textContent = '';

 if (!user) {
   statusEl.textContent = 'Abrí tu perfil primero (letterboxd.com/TUUSUARIO)';
   scanning = false;
   return;
 }

 const following = await scrapeAll(user, 'following', logEl, barEl, statusEl);
 const followers = await scrapeAll(user, 'followers', logEl, barEl, statusEl);

 const fset = new Set(followers);
 lastNoFollowers = following.filter(u => !fset.has(u));

 panel.querySelector('#nf').textContent = lastNoFollowers.length;
 panel.querySelector('#copy').disabled = false;

 barEl.style.width = '100%';
 statusEl.textContent = `✨ Listo. No te siguen: ${lastNoFollowers.length}`;
 scanning = false;
}

})();
