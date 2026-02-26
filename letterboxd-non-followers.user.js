// ==UserScript==
// @name         Letterboxd Non-Followers (Community Tool) - STABLE
// @namespace    community.letterboxd.tools
// @version      0.3.0
// @description  Shows who you follow on Letterboxd but who don't follow you back (Stable SPA Fix)
// @author       Community
// @match        https://letterboxd.com/*
// @match        https://www.letterboxd.com/*
// @grant        GM_addStyle
// @grant        GM_setClipboard
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  /**********************
   * STABLE FAB INJECTION (FIX PRINCIPAL)
   **********************/
  function injectFAB() {
    if (document.querySelector('.lbtool-fab')) return;

    if (!document.body) {
      setTimeout(injectFAB, 500);
      return;
    }

    const fab = document.createElement('button');
    fab.className = 'lbtool-fab';
    fab.textContent = '🎬 Non-Followers';

    // Blindaje contra SPA + overlays del sitio
    fab.style.position = 'fixed';
    fab.style.bottom = '18px';
    fab.style.right = '18px';
    fab.style.zIndex = '999999999';
    fab.style.pointerEvents = 'auto';

    document.documentElement.appendChild(fab);

    // Click en modo CAPTURE (evita que Letterboxd lo bloquee)
    fab.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      openPanel();
    }, true);
  }

  // Soporte para navegación dinámica de Letterboxd (SPA)
  function initFABSystem() {
    injectFAB();

    const observer = new MutationObserver(() => {
      if (!document.querySelector('.lbtool-fab')) {
        injectFAB();
      }
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  /**********************
   * ESTILOS (LOS TUYOS)
   **********************/
  GM_addStyle(`
    .lbtool-panel{
      position:fixed; top:18px; right:18px; width:380px; max-height:82vh; overflow:hidden;
      background:#111; color:#fff; z-index:999999999; border-radius:14px; padding:14px;
      font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;
      box-shadow:0 10px 30px rgba(0,0,0,.45); border:1px solid rgba(255,255,255,.10);
    }
    .lbtool-title{display:flex; align-items:center; justify-content:space-between;}
    .lbtool-title h3{margin:0; font-size:16px; font-weight:800;}
    .lbtool-x{
      border:0; background:#2a2a2a; color:#fff; border-radius:10px;
      padding:6px 10px; cursor:pointer; font-weight:700;
    }
    .lbtool-row{display:flex; gap:8px; flex-wrap:wrap; margin:12px 0;}
    .lbtool-btn{
      border:0; border-radius:10px; padding:8px 10px; cursor:pointer;
      background:#00c2a8; color:#001; font-weight:800; font-size:13px;
    }
    .lbtool-log{
      white-space:pre-wrap;
      background:#0a0a0a; border-radius:10px; padding:10px;
      border:1px solid rgba(255,255,255,.08);
      font-size:12px; max-height:200px; overflow:auto;
    }
    .lbtool-list{
      margin-top:10px;
      background:#0a0a0a; border-radius:10px; padding:10px;
      border:1px solid rgba(255,255,255,.08);
      max-height:240px; overflow:auto;
    }
    .lbtool-item{
      display:flex; justify-content:space-between;
      padding:8px; background:#111; border-radius:10px; margin-bottom:8px;
    }
    .lbtool-fab{
      background:#111; color:#fff; border:1px solid rgba(255,255,255,.15);
      border-radius:999px; padding:10px 12px; cursor:pointer;
      font-weight:900; font-size:13px;
      box-shadow:0 10px 30px rgba(0,0,0,.35);
    }
  `);

  /**********************
   * ESTADO
   **********************/
  let panel = null;
  let lastNoFollowers = [];
  let lastUser = null;

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const domp = new DOMParser();

  function detectUser() {
    const parts = location.pathname.split('/').filter(Boolean);
    return parts.length ? parts[0] : null;
  }

  function parsePeople(doc) {
    const out = new Set();
    const links = doc.querySelectorAll('a[href^="/"]');
    links.forEach(a => {
      const href = a.getAttribute('href') || '';
      const mm = href.match(/^\/([A-Za-z0-9._-]+)\/$/);
      if (mm) out.add(mm[1].toLowerCase());
    });
    return out;
  }

  async function scrapeAll(user, type, logFn) {
    const base = `${location.origin}/${user}/${type}/`;
    const users = new Set();

    for (let p = 1; p <= 200; p++) {
      const url = p === 1 ? base : `${base}page/${p}/`;
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) break;

      const html = await res.text();
      const doc = domp.parseFromString(html, 'text/html');
      const before = users.size;
      parsePeople(doc).forEach(u => users.add(u));
      const added = users.size - before;

      logFn(`${type} page ${p}: +${added} (total ${users.size})`);

      if (added === 0 && p > 2) break;
      await sleep(250);
    }

    return [...users].sort();
  }

  /**********************
   * PANEL (TU LÓGICA)
   **********************/
  function openPanel() {
    if (panel) return;

    panel = document.createElement('div');
    panel.className = 'lbtool-panel';
    panel.innerHTML = `
      <div class="lbtool-title">
        <h3>🎬 Letterboxd Non-Followers</h3>
        <button class="lbtool-x" id="lbtool-close">Cerrar</button>
      </div>

      <div class="lbtool-row">
        <button class="lbtool-btn" id="lbtool-run">RUN</button>
      </div>

      <div class="lbtool-log" id="lbtool-log">Listo. Tocá RUN.</div>
      <div class="lbtool-list" id="lbtool-list"></div>
    `;

    document.documentElement.appendChild(panel);

    panel.querySelector('#lbtool-close').onclick = () => {
      panel.remove();
      panel = null;
    };

    panel.querySelector('#lbtool-run').onclick = run;
  }

  async function run() {
    lastUser = detectUser();
    const logEl = panel.querySelector('#lbtool-log');
    const listEl = panel.querySelector('#lbtool-list');

    if (!lastUser) {
      logEl.textContent = 'Abrí tu perfil (letterboxd.com/usuario/) y reintentá.';
      return;
    }

    logEl.textContent = 'Recolectando following y followers...\n';
    listEl.innerHTML = '';

    const following = await scrapeAll(lastUser, 'following', m => logEl.textContent += m + '\n');
    const followers = await scrapeAll(lastUser, 'followers', m => logEl.textContent += m + '\n');

    const fset = new Set(followers);
    lastNoFollowers = following.filter(u => !fset.has(u));

    logEl.textContent += `\nNo te siguen: ${lastNoFollowers.length}\n`;

    lastNoFollowers.forEach(u => {
      const row = document.createElement('div');
      row.className = 'lbtool-item';
      row.innerHTML = `<span>@${u}</span>
        <button class="lbtool-btn" onclick="window.open('https://letterboxd.com/${u}/','_blank')">
          Abrir
        </button>`;
      listEl.appendChild(row);
    });
  }

  // INICIAR SISTEMA ESTABLE
  initFABSystem();

})();
