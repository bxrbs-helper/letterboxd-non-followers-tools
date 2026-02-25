// ==UserScript==
// @name         Letterboxd Non-Followers (Community Tool)
// @namespace    community.letterboxd.tools
// @version      0.1.0
// @description  Finds who you follow on Letterboxd but who don't follow you back. No login, no password. Uses public pages.
// @author       Community
// @match        https://letterboxd.com/*
// @grant        GM_addStyle
// @grant        GM_setClipboard
// ==/UserScript==

(function () {
  'use strict';

  // ---------- UI ----------
  GM_addStyle(`
    .lbtool-panel{
      position:fixed; top:18px; right:18px; width:360px; max-height:80vh; overflow:auto;
      background:#111; color:#fff; z-index:999999; border-radius:14px; padding:14px;
      font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;
      box-shadow:0 10px 30px rgba(0,0,0,.45); border:1px solid rgba(255,255,255,.10);
    }
    .lbtool-panel h3{margin:0 0 8px 0; font-size:16px}
    .lbtool-row{display:flex; gap:8px; margin:10px 0}
    .lbtool-btn{
      appearance:none; border:0; border-radius:10px; padding:8px 10px; cursor:pointer;
      background:#00c2a8; color:#001; font-weight:700;
    }
    .lbtool-btn.secondary{background:#2a2a2a; color:#fff; font-weight:600}
    .lbtool-btn:disabled{opacity:.55; cursor:not-allowed}
    .lbtool-kv{display:grid; grid-template-columns:1fr auto; gap:6px; font-size:13px; opacity:.95}
    .lbtool-log{white-space:pre-wrap; font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      background:#0a0a0a; border-radius:10px; padding:10px; border:1px solid rgba(255,255,255,.08);
      font-size:12px; line-height:1.35;
    }
    .lbtool-fab{
      position:fixed; bottom:18px; right:18px; z-index:999999;
      background:#111; color:#fff; border:1px solid rgba(255,255,255,.15);
      border-radius:999px; padding:10px 12px; cursor:pointer; box-shadow:0 10px 30px rgba(0,0,0,.35);
      font-weight:700;
    }
  `);

  const fab = document.createElement('button');
  fab.className = 'lbtool-fab';
  fab.textContent = '🎬 Non-Followers';
  document.body.appendChild(fab);

  let panel = null;
  const openPanel = () => {
    if (panel) return;
    panel = document.createElement('div');
    panel.className = 'lbtool-panel';
    panel.innerHTML = `
      <h3>🎬 Letterboxd Non-Followers</h3>
      <div class="lbtool-kv">
        <div>Usuario detectado</div><div id="lbtool-user">—</div>
        <div>Following</div><div id="lbtool-following">—</div>
        <div>Followers</div><div id="lbtool-followers">—</div>
        <div>No me siguen</div><div id="lbtool-nf">—</div>
        <div>Mutuos</div><div id="lbtool-mutuals">—</div>
      </div>

      <div class="lbtool-row">
        <button class="lbtool-btn" id="lbtool-run">RUN</button>
        <button class="lbtool-btn secondary" id="lbtool-copy" disabled>Copiar lista</button>
        <button class="lbtool-btn secondary" id="lbtool-close">Cerrar</button>
      </div>

      <div class="lbtool-log" id="lbtool-log">Listo. Tocá RUN.</div>
    `;
    document.body.appendChild(panel);

    panel.querySelector('#lbtool-close').onclick = () => { panel.remove(); panel = null; };
  };

  fab.onclick = openPanel;

  // ---------- Scraper ----------
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const domp = new DOMParser();

  const reserved = new Set([
    'films','film','lists','list','diary','watchlist','likes','news','about','journal','apps','legal',
    'pro','upgrade','members','people','activity','settings','create','reviews','search','tags','crew',
    'actor','director','network','stats'
  ]);

  function detectUser() {
    // Best guess: /username/...
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

  // ---------- RUN ----------
  function setText(id, v) { const el = panel?.querySelector(id); if (el) el.textContent = v; }
  function log(msg) {
    const el = panel?.querySelector('#lbtool-log');
    if (el) el.textContent = msg;
  }
  function logAppend(msg) {
    const el = panel?.querySelector('#lbtool-log');
    if (el) el.textContent += `\n${msg}`;
  }

  let lastNoFollowers = [];

  async function run() {
    const user = detectUser();
    setText('#lbtool-user', user || '—');

    if (!user) { log('No pude detectar el usuario. Abrí tu perfil (https://letterboxd.com/TUUSUARIO/) y reintentá.'); return; }

    const runBtn = panel.querySelector('#lbtool-run');
    const copyBtn = panel.querySelector('#lbtool-copy');
    runBtn.disabled = true;
    copyBtn.disabled = true;
    lastNoFollowers = [];

    log('Recolectando followers y following… (puede tardar un poco)');

    const following = await scrapeAll(user, 'following', (m)=>logAppend(m));
    const followers = await scrapeAll(user, 'followers', (m)=>logAppend(m));

    const fset = new Set(followers);
    const gset = new Set(following);

    const noFollowBack = following.filter(u => !fset.has(u));
    const mutuals = following.filter(u => fset.has(u));

    lastNoFollowers = noFollowBack;

    setText('#lbtool-following', String(following.length));
    setText('#lbtool-followers', String(followers.length));
    setText('#lbtool-nf', String(noFollowBack.length));
    setText('#lbtool-mutuals', String(mutuals.length));

    logAppend(`\n✅ Listo. No me siguen: ${noFollowBack.length}`);

    copyBtn.disabled = false;
    runBtn.disabled = false;
  }

  // Wire buttons when panel opens
  const attachHandlers = () => {
    if (!panel) return;
    panel.querySelector('#lbtool-run').onclick = run;
    panel.querySelector('#lbtool-copy').onclick = () => {
      GM_setClipboard(lastNoFollowers.join('\n'));
      alert('Lista copiada al portapapeles ✅');
    };
  };

  // Monkeypatch openPanel to also attach handlers
  const origOpen = openPanel;
  fab.onclick = () => { origOpen(); attachHandlers(); setText('#lbtool-user', detectUser() || '—'); };
})();
