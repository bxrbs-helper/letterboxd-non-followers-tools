// ==UserScript==
// @name         Letterboxd Non-Followers (Community Tool + Progress UI)
// @namespace    community.letterboxd.tools
// @version      0.3.0
// @description  Shows who you follow on Letterboxd but who don't follow you back with clean progress UI.
// @author       Community
// @match        *://letterboxd.com/*
// @match        *://www.letterboxd.com/*
// @grant        GM_addStyle
// @grant        GM_setClipboard
// ==/UserScript==

(function () {
  'use strict';

  // ---------- Styles (MEJORADOS CON PROGRESO Y SPINNER) ----------
  GM_addStyle(`
    .lbtool-panel{
      position:fixed; top:18px; right:18px; width:380px; max-height:82vh; overflow:hidden;
      background:#111; color:#fff; z-index:999999; border-radius:14px; padding:14px;
      font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;
      box-shadow:0 10px 30px rgba(0,0,0,.45); border:1px solid rgba(255,255,255,.10);
    }

    .lbtool-title{display:flex; align-items:center; justify-content:space-between; gap:10px;}
    .lbtool-title h3{margin:0; font-size:16px; font-weight:800;}

    .lbtool-progress-wrap{
      margin-top:12px;
      background:#0a0a0a;
      border-radius:12px;
      padding:12px;
      border:1px solid rgba(255,255,255,.08);
    }

    .lbtool-status{
      display:flex;
      align-items:center;
      font-size:13px;
      font-weight:600;
      gap:8px;
    }

    .lbtool-spinner{
      width:18px;
      height:18px;
      border:3px solid rgba(255,255,255,0.15);
      border-top:3px solid #00c2a8;
      border-radius:50%;
      animation:lbspin 1s linear infinite;
      display:none;
    }

    @keyframes lbspin{
      0%{transform:rotate(0deg);}
      100%{transform:rotate(360deg);}
    }

    .lbtool-progress-bar{
      width:100%;
      height:8px;
      background:#222;
      border-radius:999px;
      overflow:hidden;
      margin-top:8px;
    }

    .lbtool-progress-fill{
      height:100%;
      width:0%;
      background:#00c2a8;
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

    .lbtool-btn.secondary{background:#2a2a2a; color:#fff;}
    .lbtool-btn.danger{background:#ff4d4f; color:#fff;}

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

    .lbtool-fab{
      position:fixed; bottom:18px; right:18px; z-index:999999;
      background:#111; color:#fff; border:1px solid rgba(255,255,255,.15);
      border-radius:999px; padding:10px 12px; cursor:pointer;
      font-weight:900; font-size:13px;
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

  // ---------- NUEVO: UI helpers ----------
  function setStatus(text) {
    const el = panel?.querySelector('#lbtool-status-text');
    if (el) el.textContent = text;
  }

  function setProgress(percent) {
    const bar = panel?.querySelector('#lbtool-progress-fill');
    if (bar) bar.style.width = percent + '%';
  }

  function showSpinner(show) {
    const sp = panel?.querySelector('#lbtool-spinner');
    if (sp) sp.style.display = show ? 'block' : 'none';
  }

  async function scrapeAll(user, type) {
    const base = `${location.origin}/${user}/${type}/`;
    const users = new Set();
    let emptyStreak = 0;

    showSpinner(true);

    for (let p = 1; p <= 800; p++) {
      const url = p === 1 ? base : `${base}page/${p}/`;

      setStatus(`${type === 'following' ? 'Following' : 'Followers'} — Página ${p}`);
      setProgress(Math.min(p * 4, 95));

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
      row.className = 'lbtool-item';
      row.innerHTML = `
        <span>@${u}</span>
        <button class="lbtool-btn danger"
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
      <div class="lbtool-title">
        <h3>🎬 Letterboxd Non-Followers</h3>
      </div>

      <div class="lbtool-progress-wrap">
        <div class="lbtool-status">
          <div class="lbtool-spinner" id="lbtool-spinner"></div>
          <span id="lbtool-status-text">Listo para analizar.</span>
        </div>
        <div class="lbtool-progress-bar">
          <div class="lbtool-progress-fill" id="lbtool-progress-fill"></div>
        </div>
      </div>

      <div class="lbtool-kv">
        <div>Usuario</div><div id="lbtool-user">—</div>
        <div>No me siguen</div><div id="lbtool-nf">—</div>
      </div>

      <div class="lbtool-row">
        <button class="lbtool-btn" id="lbtool-run">RUN</button>
      </div>

      <div class="lbtool-list" id="lbtool-list"></div>
    `;

    document.body.appendChild(panel);
    panel.querySelector('#lbtool-run').onclick = run;
    panel.querySelector('#lbtool-user').textContent = detectUser() || '—';
  }

  fab.onclick = openPanel;

  async function run() {
    lastUser = detectUser();
    if (!lastUser) {
      setStatus('Abre tu perfil primero.');
      return;
    }

    setStatus('Iniciando análisis...');
    setProgress(5);

    const following = await scrapeAll(lastUser, 'following');
    setProgress(50);

    const followers = await scrapeAll(lastUser, 'followers');
    setProgress(100);
    showSpinner(false);

    const fset = new Set(followers);
    const noFollowBack = following.filter(u => !fset.has(u));
    lastNoFollowers = noFollowBack;

    panel.querySelector('#lbtool-nf').textContent = noFollowBack.length;
    setStatus(`Listo. No te siguen: ${noFollowBack.length}`);

    renderList(noFollowBack);
  }

})();
