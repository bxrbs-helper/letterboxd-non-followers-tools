// ==UserScript==
// @name         Letterboxd Non-Followers (Community Tool)
// @namespace    community.letterboxd.tools
// @version      0.3.1-stable-ui
// @description  Shows who you follow but who don't follow you back. Stable scraping + elegant progress UI.
// @match        *://letterboxd.com/*
// @match        *://www.letterboxd.com/*
// @grant        GM_addStyle
// @grant        GM_setClipboard
// ==/UserScript==

(function () {
  'use strict';

  GM_addStyle(`
    .lbtool-panel{
      position:fixed; top:18px; right:18px; width:380px; max-height:82vh;
      background:#111; color:#fff; z-index:999999; border-radius:14px; padding:14px;
      font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;
      box-shadow:0 10px 30px rgba(0,0,0,.45); border:1px solid rgba(255,255,255,.10);
    }
    .lbtool-title{display:flex; justify-content:space-between; align-items:center;}
    .lbtool-btn{border:0;border-radius:10px;padding:8px 12px;font-weight:800;cursor:pointer}
    .run{background:#00c2a8;color:#001}
    .secondary{background:#2a2a2a;color:#fff}
    .danger{background:#ff4d4f;color:#fff}
    .lbtool-progress{
      width:100%; height:8px; border-radius:999px; background:#1a1a1a;
      overflow:hidden; margin:10px 0 6px 0;
    }
    .lbtool-bar{
      height:100%; width:0%;
      background:linear-gradient(90deg,#00c2a8,#00e0c2);
      transition:width .3s ease;
    }
    .lbtool-status{
      font-size:13px; opacity:.85; margin-bottom:8px;
    }
    .lbtool-list{max-height:260px; overflow:auto; margin-top:10px;}
    .lbtool-item{
      display:flex; justify-content:space-between; align-items:center;
      padding:8px; background:#0f0f0f; border-radius:10px; margin-bottom:6px;
    }
    .lbtool-fab{
      position:fixed; bottom:18px; right:18px; z-index:999999;
      background:#111; color:#fff; border:1px solid rgba(255,255,255,.2);
      border-radius:999px; padding:10px 14px; cursor:pointer; font-weight:900;
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

  function updateProgress(percent, text) {
    const bar = panel.querySelector('.lbtool-bar');
    const status = panel.querySelector('.lbtool-status');
    if (bar) bar.style.width = percent + '%';
    if (status) status.textContent = text;
  }

  async function scrapeAll(user, type) {
    const base = `${location.origin}/${user}/${type}/`;
    const users = new Set();
    let emptyStreak = 0;

    for (let p = 1; p <= 800; p++) {
      const url = p === 1 ? base : `${base}page/${p}/`;

      updateProgress(
        Math.min(95, p),
        `${type === 'following' ? 'Following' : 'Followers'}: página ${p}…`
      );

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
      await sleep(220);
    }

    return [...users].sort();
  }

  function renderList(users) {
    const box = panel.querySelector('.lbtool-list');
    box.innerHTML = '';

    if (!users.length) {
      box.innerHTML = '🎉 Todos te siguen de vuelta.';
      return;
    }

    users.forEach(u => {
      const row = document.createElement('div');
      row.className = 'lbtool-item';

      const name = document.createElement('span');
      name.textContent = '@' + u;

      const btn = document.createElement('button');
      btn.className = 'lbtool-btn danger';
      btn.textContent = 'Unfollow';
      btn.onclick = () => window.open(`https://letterboxd.com/${u}/`, '_blank');

      row.appendChild(name);
      row.appendChild(btn);
      box.appendChild(row);
    });
  }

  async function run() {
    lastUser = detectUser();
    if (!lastUser) {
      updateProgress(0, 'Abrí tu perfil de Letterboxd primero.');
      return;
    }

    updateProgress(5, `Usuario: ${lastUser}`);

    const following = await scrapeAll(lastUser, 'following');
    updateProgress(50, `Following analizados: ${following.length}`);

    const followers = await scrapeAll(lastUser, 'followers');
    updateProgress(90, `Followers analizados: ${followers.length}`);

    const fset = new Set(followers);
    const noFollowBack = following.filter(u => !fset.has(u));
    lastNoFollowers = noFollowBack;

    updateProgress(100, `Listo. No te siguen: ${noFollowBack.length}`);

    renderList(noFollowBack);
  }

  function openPanel() {
    if (panel) return;

    panel = document.createElement('div');
    panel.className = 'lbtool-panel';
    panel.innerHTML = `
      <div class="lbtool-title">
        <strong>🎬 Letterboxd Non-Followers</strong>
        <button class="lbtool-btn secondary" id="close">Cerrar</button>
      </div>

      <button class="lbtool-btn run" id="run">RUN</button>

      <div class="lbtool-progress">
        <div class="lbtool-bar"></div>
      </div>

      <div class="lbtool-status">Listo para analizar.</div>

      <div class="lbtool-list"></div>
    `;

    document.body.appendChild(panel);

    panel.querySelector('#run').onclick = run;
    panel.querySelector('#close').onclick = () => {
      panel.remove();
      panel = null;
    };
  }

  fab.onclick = openPanel;

})();
