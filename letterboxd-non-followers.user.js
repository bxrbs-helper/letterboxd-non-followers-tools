// ==UserScript==
// @name         Letterboxd Non-Followers (Community Tool)
// @namespace    community.letterboxd.tools
// @version      0.3.0
// @description  Shows who you follow on Letterboxd but who don't follow you back. Stable panel fix for SPA.
// @author       Community
// @match        *://letterboxd.com/*
// @match        *://www.letterboxd.com/*
// @run-at       document-idle
// @grant        GM_addStyle
// @grant        GM_setClipboard
// ==/UserScript==

(function () {
  'use strict';

  if (window.__LB_TOOL_LOADED__) return;
  window.__LB_TOOL_LOADED__ = true;

  GM_addStyle(`
    .lbtool-panel{
      position:fixed; top:18px; right:18px; width:380px; max-height:82vh; overflow:hidden;
      background:#111; color:#fff; z-index:9999999; border-radius:14px; padding:14px;
      font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;
      box-shadow:0 10px 30px rgba(0,0,0,.45); border:1px solid rgba(255,255,255,.10);
    }
    .lbtool-title{display:flex; align-items:center; justify-content:space-between;}
    .lbtool-title h3{margin:0; font-size:16px; font-weight:800;}
    .lbtool-x{border:0;background:#2a2a2a;color:#fff;border-radius:10px;padding:6px 10px;cursor:pointer;font-weight:700;}
    .lbtool-row{display:flex; gap:8px; flex-wrap:wrap; margin:12px 0;}
    .lbtool-btn{border:0;border-radius:10px;padding:8px 10px;cursor:pointer;background:#00c2a8;color:#001;font-weight:800;font-size:13px;}
    .lbtool-btn.secondary{background:#2a2a2a;color:#fff;}
    .lbtool-btn.danger{background:#ff4d4f;color:#fff;}
    .lbtool-log{
      white-space:pre-wrap;
      font-family:ui-monospace,monospace;
      background:#0a0a0a;border-radius:10px;padding:10px;
      border:1px solid rgba(255,255,255,.08);
      font-size:12px;max-height:200px;overflow:auto;
    }
    .lbtool-list{
      margin-top:10px;background:#0a0a0a;border-radius:10px;padding:10px;
      border:1px solid rgba(255,255,255,.08);
      max-height:240px;overflow:auto;
    }
    .lbtool-item{
      display:flex;align-items:center;justify-content:space-between;
      padding:8px;background:#111;border-radius:10px;margin-bottom:8px;
    }
    .lbtool-fab{
      position:fixed; bottom:18px; right:18px; z-index:9999999;
      background:#111; color:#fff; border:1px solid rgba(255,255,255,.15);
      border-radius:999px; padding:10px 14px; cursor:pointer;
      box-shadow:0 10px 30px rgba(0,0,0,.35);
      font-weight:900; font-size:13px;
    }
  `);

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
    const nodes = doc.querySelectorAll('li.person-summary a[href^="/"]');
    nodes.forEach(a => {
      const href = a.getAttribute('href') || '';
      const mm = href.match(/^\/([A-Za-z0-9._-]+)\/$/);
      if (mm) out.add(mm[1].toLowerCase());
    });
    return out;
  }

  async function scrapeAll(user, type, logFn) {
    const base = `${location.origin}/${user}/${type}/`;
    const users = new Set();
    let empty = 0;

    for (let p = 1; p <= 500; p++) {
      const url = p === 1 ? base : `${base}page/${p}/`;
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) break;

      const html = await res.text();
      const doc = domp.parseFromString(html, 'text/html');

      const before = users.size;
      parsePeople(doc).forEach(u => users.add(u));
      const added = users.size - before;

      logFn(`${type} page ${p}: +${added} (total ${users.size})`);

      if (added === 0) empty++;
      else empty = 0;

      if (empty >= 2) break;
      await sleep(300);
    }

    return [...users];
  }

  function log(msg) {
    const el = panel?.querySelector('#lbtool-log');
    if (el) el.textContent += `\n${msg}`;
  }

  function renderList(users) {
    const box = panel.querySelector('#lbtool-list');
    box.innerHTML = '';

    users.forEach(u => {
      const row = document.createElement('div');
      row.className = 'lbtool-item';

      const name = document.createElement('span');
      name.textContent = `@${u}`;

      const btn = document.createElement('button');
      btn.className = 'lbtool-btn danger';
      btn.textContent = 'Unfollow';
      btn.onclick = () => window.open(`https://letterboxd.com/${u}/`, '_blank');

      row.appendChild(name);
      row.appendChild(btn);
      box.appendChild(row);
    });
  }

  function openPanel() {
    if (panel) {
      panel.style.display = 'block';
      return;
    }

    panel = document.createElement('div');
    panel.className = 'lbtool-panel';
    panel.innerHTML = `
      <div class="lbtool-title">
        <h3>🎬 Letterboxd Non-Followers</h3>
        <button class="lbtool-x" id="lbtool-close">Cerrar</button>
      </div>

      <div class="lbtool-row">
        <button class="lbtool-btn" id="lbtool-run">RUN</button>
        <button class="lbtool-btn secondary" id="lbtool-openall" disabled>Abrir todos</button>
      </div>

      <div class="lbtool-log" id="lbtool-log">Listo. Tocá RUN.</div>
      <div class="lbtool-list" id="lbtool-list"></div>
    `;

    document.documentElement.appendChild(panel);

    panel.querySelector('#lbtool-close').onclick = () => {
      panel.style.display = 'none';
    };

    panel.querySelector('#lbtool-run').onclick = async () => {
      lastUser = detectUser();
      if (!lastUser) {
        log("Abrí tu perfil primero.");
        return;
      }

      log(`Analizando usuario: ${lastUser}`);

      const following = await scrapeAll(lastUser, 'following', log);
      const followers = await scrapeAll(lastUser, 'followers', log);

      const fset = new Set(followers);
      lastNoFollowers = following.filter(u => !fset.has(u));

      log(`\n✅ No te siguen: ${lastNoFollowers.length}`);
      renderList(lastNoFollowers);

      panel.querySelector('#lbtool-openall').disabled = lastNoFollowers.length === 0;
    };

    panel.querySelector('#lbtool-openall').onclick = () => {
      lastNoFollowers.forEach((u, i) => {
        setTimeout(() => {
          window.open(`https://letterboxd.com/${u}/`, '_blank');
        }, i * 300);
      });
    };
  }

  function injectButton() {
    if (document.querySelector('.lbtool-fab')) return;

    const fab = document.createElement('button');
    fab.className = 'lbtool-fab';
    fab.textContent = '🎬 Non-Followers';
    fab.onclick = openPanel;

    document.documentElement.appendChild(fab);
  }

  // FIX CRÍTICO: Letterboxd es SPA → reinyección automática
  const observer = new MutationObserver(() => {
    injectButton();
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  injectButton();

})();
