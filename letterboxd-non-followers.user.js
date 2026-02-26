// ==UserScript==
// @name         Letterboxd Non-Followers (Community Tool)
// @namespace    community.letterboxd.tools
// @version      0.2.1
// @description  Same working script + visual progress (NO logic changes)
// @match        *://letterboxd.com/*
// @match        *://www.letterboxd.com/*
// @grant        GM_addStyle
// @grant        GM_setClipboard
// ==/UserScript==

(function () {
  'use strict';

  // ---------- Styles (SOLO VISUAL, SIN TOCAR LÓGICA) ----------
  GM_addStyle(`
    .lbtool-panel{
      position:fixed; top:18px; right:18px; width:380px; max-height:82vh; overflow:hidden;
      background:#111; color:#fff; z-index:999999; border-radius:14px; padding:14px;
      font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;
      box-shadow:0 10px 30px rgba(0,0,0,.45); border:1px solid rgba(255,255,255,.10);
    }

    .lbtool-progress{
      margin-top:10px;
      padding:10px;
      background:#0a0a0a;
      border-radius:10px;
      border:1px solid rgba(255,255,255,.08);
    }

    .lbtool-status{
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
      display:none;
    }

    @keyframes lbspin {
      0%{transform:rotate(0deg);}
      100%{transform:rotate(360deg);}
    }

    .lbtool-bar{
      width:100%;
      height:6px;
      background:#222;
      border-radius:999px;
      margin-top:8px;
      overflow:hidden;
    }

    .lbtool-bar-fill{
      height:100%;
      width:0%;
      background:#00c2a8;
      transition:width 0.25s ease;
    }

    .lbtool-log{
      display:none !important; /* ocultamos logs feos, la lógica sigue igual */
    }

    .lbtool-fab{
      position:fixed; bottom:18px; right:18px; z-index:999999;
      background:#111; color:#fff; border:1px solid rgba(255,255,255,.15);
      border-radius:999px; padding:10px 12px; cursor:pointer;
      font-weight:900; font-size:13px;
    }
  `);

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

  function setStatus(text) {
    const el = panel?.querySelector('#lbtool-status-text');
    if (el) el.textContent = text;
  }

  function setProgress(percent) {
    const bar = panel?.querySelector('#lbtool-bar-fill');
    if (bar) bar.style.width = percent + '%';
  }

  function showSpinner(show) {
    const sp = panel?.querySelector('#lbtool-spinner');
    if (sp) sp.style.display = show ? 'block' : 'none';
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

  async function scrapeAll(user, type) {
    const base = `${location.origin}/${user}/${type}/`;
    const users = new Set();
    let emptyStreak = 0;

    showSpinner(true);

    for (let p = 1; p <= 800; p++) {
      setStatus(`${type === 'following' ? 'Following' : 'Followers'} — Página ${p}`);
      setProgress(Math.min(p * 3, 90));

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
      await sleep(250);
    }

    return [...users].sort();
  }

  function renderList(users) {
    const box = panel?.querySelector('#lbtool-list');
    if (!box) return;
    box.innerHTML = '';

    users.forEach(u => {
      const row = document.createElement('div');
      row.style.marginBottom = '6px';
      row.innerHTML = `
        <span>@${u}</span>
        <button style="margin-left:8px;background:#ff4d4f;color:white;border:0;padding:4px 8px;border-radius:6px;cursor:pointer"
          onclick="window.open('https://letterboxd.com/${u}/','_blank')">
          Unfollow
        </button>
      `;
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
        <div class="lbtool-status">
          <div class="lbtool-spinner" id="lbtool-spinner"></div>
          <span id="lbtool-status-text">Listo para analizar.</span>
        </div>
        <div class="lbtool-bar">
          <div class="lbtool-bar-fill" id="lbtool-bar-fill"></div>
        </div>
      </div>

      <button id="lbtool-run" style="margin-top:10px;">RUN</button>
      <div id="lbtool-list" style="margin-top:10px;max-height:240px;overflow:auto;"></div>
    `;

    document.body.appendChild(panel);
    panel.querySelector('#lbtool-run').onclick = run;
  }

  fab.onclick = openPanel;

  async function run() {
    lastUser = detectUser();
    if (!lastUser) {
      setStatus('Abrí tu perfil primero.');
      return;
    }

    setStatus('Recolectando Following...');
    setProgress(5);

    const following = await scrapeAll(lastUser, 'following');

    setStatus('Recolectando Followers...');
    setProgress(50);

    const followers = await scrapeAll(lastUser, 'followers');

    const fset = new Set(followers);
    const noFollowBack = following.filter(u => !fset.has(u));
    lastNoFollowers = noFollowBack;

    showSpinner(false);
    setProgress(100);
    setStatus(`Listo. No te siguen: ${noFollowBack.length}`);

    renderList(noFollowBack);
  }

})();
