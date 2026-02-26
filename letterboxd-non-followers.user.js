// ==UserScript==
// @name         Letterboxd Non-Followers (Community Tool)
// @namespace    community.letterboxd.tools
// @version      0.2.0
// @description  Shows who you follow on Letterboxd but who don't follow you back. Includes per-user and batch "open profile" actions. No login, no password. Uses public pages + your session cookies for fetch.
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
      font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
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
    .lbtool-item:last-child{margin-bottom:0;}
    .lbtool-user{
      display:flex; flex-direction:column; gap:2px; min-width:0;
    }
    .lbtool-user a{
      color:#00c2a8; text-decoration:none; font-weight:800; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
    }
    .lbtool-user small{opacity:.75;}
    .lbtool-actions{display:flex; gap:8px; flex-shrink:0;}
    .lbtool-fab{
      position:fixed; bottom:18px; right:18px; z-index:999999;
      background:#111; color:#fff; border:1px solid rgba(255,255,255,.15);
      border-radius:999px; padding:10px 12px; cursor:pointer; box-shadow:0 10px 30px rgba(0,0,0,.35);
      font-weight:900; font-size:13px;
    }
    .lbtool-muted{opacity:.75}
    .lbtool-footer{
      margin-top:10px; font-size:12px; opacity:.75;
      border-top:1px solid rgba(255,255,255,.08); padding-top:10px;
    }
  `);

  // ---------- Floating button (FIX SPA + body loading) ----------
function injectFAB() {
  if (document.querySelector('.lbtool-fab')) return;

  if (!document.body) {
    setTimeout(injectFAB, 300);
    return;
  }

  const fab = document.createElement('button');
  fab.className = 'lbtool-fab';
  fab.textContent = '🎬 Non-Followers';
  document.body.appendChild(fab);

}

// Esperar a que Letterboxd cargue completamente
window.addEventListener('load', injectFAB);

// También por si Letterboxd navega sin recargar (SPA)
const observer = new MutationObserver(() => {
  if (!document.querySelector('.lbtool-fab')) {
    injectFAB();
  }
});

observer.observe(document.documentElement, {
  childList: true,
  subtree: true
});

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

  function mkCSV(owner, kind, arr) {
    const ts = new Date().toISOString();
    const header = "username,profile_url,kind,owner,timestamp";
    const lines = arr.map(u => `${u},https://letterboxd.com/${u}/,${kind},${owner},${ts}`);
    return [header, ...lines].join("\n");
  }

  function setText(sel, v) {
    const el = panel?.querySelector(sel);
    if (el) el.textContent = v;
  }

  function log(msg) {
    const el = panel?.querySelector('#lbtool-log');
    if (el) el.textContent = msg;
  }

  function logAppend(msg) {
    const el = panel?.querySelector('#lbtool-log');
    if (el) el.textContent += `\n${msg}`;
  }

  function clearList() {
    const box = panel?.querySelector('#lbtool-list');
    if (box) box.innerHTML = '';
  }

  function renderList(owner, users) {
    const box = panel?.querySelector('#lbtool-list');
    if (!box) return;

    box.innerHTML = '';

    if (!users.length) {
      const div = document.createElement('div');
      div.className = 'lbtool-muted';
      div.textContent = '🎉 Todos te siguen de vuelta. Ego cinematográfico intacto.';
      box.appendChild(div);
      return;
    }

    users.forEach(u => {
      const row = document.createElement('div');
      row.className = 'lbtool-item';

      const userCol = document.createElement('div');
      userCol.className = 'lbtool-user';

      const a = document.createElement('a');
      a.href = `https://letterboxd.com/${u}/`;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.textContent = `@${u}`;

      const small = document.createElement('small');
      small.textContent = `https://letterboxd.com/${u}/`;

      userCol.appendChild(a);
      userCol.appendChild(small);

      const actions = document.createElement('div');
      actions.className = 'lbtool-actions';

      const btnOpen = document.createElement('button');
      btnOpen.className = 'lbtool-btn danger';
      btnOpen.textContent = 'Unfollow';
      btnOpen.title = 'Abre el perfil en una pestaña nueva (ahí hacés unfollow con 1 click).';
      btnOpen.onclick = () => window.open(`https://letterboxd.com/${u}/`, '_blank', 'noopener,noreferrer');

      actions.appendChild(btnOpen);

      row.appendChild(userCol);
      row.appendChild(actions);
      box.appendChild(row);
    });
  }

  function openAllProfiles(users) {
    // Nota: los navegadores limitan popups; por eso lo hacemos con un pequeño delay.
    (async () => {
      for (let i = 0; i < users.length; i++) {
        window.open(`https://letterboxd.com/${users[i]}/`, '_blank', 'noopener,noreferrer');
        await sleep(250);
      }
    })();
  }

  function downloadText(filename, content) {
    try {
      const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      return true;
    } catch {
      return false;
    }
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
        <div>Following</div><div id="lbtool-following">—</div>
        <div>Followers</div><div id="lbtool-followers">—</div>
        <div>No me siguen</div><div id="lbtool-nf">—</div>
        <div>Mutuos</div><div id="lbtool-mutuals">—</div>
      </div>

      <div class="lbtool-row">
        <button class="lbtool-btn" id="lbtool-run">RUN</button>
        <button class="lbtool-btn secondary" id="lbtool-copy" disabled>Copiar lista</button>
        <button class="lbtool-btn secondary" id="lbtool-export" disabled>Exportar CSV</button>
        <button class="lbtool-btn danger" id="lbtool-openall" disabled>Abrir todos</button>
      </div>

      <div class="lbtool-log" id="lbtool-log">Listo. Tocá RUN.</div>

      <div class="lbtool-list" id="lbtool-list"></div>

      <div class="lbtool-footer">
        Unfollow es “asistido”: abre el perfil en pestaña nueva para que confirmes el botón del sitio.
      </div>
    `;

    document.body.appendChild(panel);

    panel.querySelector('#lbtool-close').onclick = () => { panel.remove(); panel = null; };
    panel.querySelector('#lbtool-run').onclick = run;
    panel.querySelector('#lbtool-copy').onclick = () => {
      GM_setClipboard(lastNoFollowers.join('\n'));
      alert('Lista copiada ✅');
    };
    panel.querySelector('#lbtool-export').onclick = () => {
      if (!lastUser) return;
      const csv = mkCSV(lastUser, 'no-me-siguen', lastNoFollowers);
      const ok = downloadText(`letterboxd-no-me-siguen-@${lastUser}.csv`, csv);
      if (!ok) {
        alert('No pude descargar el CSV. Igual lo dejé en window.__LB_CSV__ para copiar desde consola.');
        window.__LB_CSV__ = csv;
      }
    };
    panel.querySelector('#lbtool-openall').onclick = () => {
      if (!lastNoFollowers.length) return;
      if (!confirm(`Esto va a abrir ${lastNoFollowers.length} pestañas. ¿Seguimos?`)) return;
      openAllProfiles(lastNoFollowers);
    };

    // Set user display
    setText('#lbtool-user', detectUser() || '—');
  }

  fab.onclick = openPanel;

  // ---------- RUN ----------
  async function run() {
    lastUser = detectUser();
    setText('#lbtool-user', lastUser || '—');

    if (!lastUser) {
      log('No pude detectar el usuario. Abrí tu perfil (https://letterboxd.com/TUUSUARIO/) y reintentá.');
      return;
    }

    const runBtn = panel.querySelector('#lbtool-run');
    const copyBtn = panel.querySelector('#lbtool-copy');
    const exportBtn = panel.querySelector('#lbtool-export');
    const openAllBtn = panel.querySelector('#lbtool-openall');

    runBtn.disabled = true;
    copyBtn.disabled = true;
    exportBtn.disabled = true;
    openAllBtn.disabled = true;

    lastNoFollowers = [];
    clearList();
    log('Recolectando followers y following… (puede tardar un poco)\n');

    // following first (so we can compute mutuals quickly)
    const following = await scrapeAll(lastUser, 'following', (m) => logAppend(m));
    const followers = await scrapeAll(lastUser, 'followers', (m) => logAppend(m));

    const fset = new Set(followers);
    const noFollowBack = following.filter(u => !fset.has(u));
    const mutuals = following.filter(u => fset.has(u));

    lastNoFollowers = noFollowBack;

    setText('#lbtool-following', String(following.length));
    setText('#lbtool-followers', String(followers.length));
    setText('#lbtool-nf', String(noFollowBack.length));
    setText('#lbtool-mutuals', String(mutuals.length));

    logAppend(`\n✅ Listo. No me siguen: ${noFollowBack.length}`);

    renderList(lastUser, noFollowBack);

    copyBtn.disabled = false;
    exportBtn.disabled = false;
    openAllBtn.disabled = noFollowBack.length === 0;
    runBtn.disabled = false;
  }

})();

  
