// ==UserScript==
// @name         Letterboxd Non-Followers (Community Tool)
// @namespace    community.letterboxd.tools
// @version      0.3.1
// @description  Shows who you follow on Letterboxd but who don't follow you back + who follows you but you don't follow. Includes per-user and batch open actions. No login, no password. Uses public pages + your session cookies for fetch.
// @author       Community
// @match        *://letterboxd.com/*
// @match        *://www.letterboxd.com/*
// @run-at       document-idle
// @grant        GM_addStyle
// @grant        GM_setClipboard
// ==/UserScript==

(function () {
  'use strict';

  // ---------- Styles ----------
  GM_addStyle(`
    :root{
      --lb-bg:#111;
      --lb-bg2:#0a0a0a;
      --lb-border:rgba(255,255,255,.10);
      --lb-border2:rgba(255,255,255,.08);
      --lb-text:#fff;
      --lb-muted:rgba(255,255,255,.72);
      --lb-green:#00c2a8;
      --lb-red:#ff4d4f;
      --lb-gray:#2a2a2a;
      --lb-shadow:0 10px 30px rgba(0,0,0,.35);
      --lb-radius:14px;
    }

    .lbtool-panel{
      position:fixed; top:18px; right:18px; width:390px; max-height:82vh; overflow:hidden;
      background:rgba(17,17,17,.92);
      color:var(--lb-text); z-index:999999; border-radius:var(--lb-radius); padding:14px;
      font-family:inherit, system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;
      box-shadow:var(--lb-shadow);
      border:1px solid var(--lb-border2);
      backdrop-filter: blur(6px);
    }

    .lbtool-title{display:flex; align-items:center; justify-content:space-between; gap:10px;}
    .lbtool-title h3{margin:0; font-size:16px; font-weight:900; letter-spacing:.2px;}
    .lbtool-x{
      appearance:none; border:0; background:var(--lb-gray); color:#fff; border-radius:10px;
      padding:6px 10px; cursor:pointer; font-weight:800;
    }

    .lbtool-row{display:flex; gap:8px; flex-wrap:wrap; margin:12px 0 10px 0;}
    .lbtool-btn{
      appearance:none; border:0; border-radius:12px; padding:10px 12px; cursor:pointer;
      background:var(--lb-green); color:#001; font-weight:900; font-size:13px;
      box-shadow:0 6px 16px rgba(0,0,0,.20);
    }
    .lbtool-btn.secondary{background:var(--lb-gray); color:#fff; font-weight:800;}
    .lbtool-btn.danger{background:var(--lb-red); color:#fff; font-weight:900;}
    .lbtool-btn.success{background:var(--lb-green); color:#001; font-weight:900;}
    .lbtool-btn:disabled{opacity:.55; cursor:not-allowed}

    .lbtool-progressWrap{
      display:flex; align-items:center; gap:10px;
      margin:6px 0 10px 0;
    }
    .lbtool-spinner{
      width:14px; height:14px;
      border-radius:999px;
      border:2px solid rgba(255,255,255,.20);
      border-top-color: var(--lb-green);
      animation: lbspin .8s linear infinite;
      flex:0 0 auto;
      opacity:0;
    }
    .lbtool-spinner.on{opacity:1;}
    @keyframes lbspin{to{transform:rotate(360deg)}}

    .lbtool-bar{
      position:relative;
      height:10px; border-radius:999px;
      background:rgba(255,255,255,.10);
      border:1px solid rgba(255,255,255,.10);
      overflow:hidden;
      flex:1 1 auto;
    }
    .lbtool-bar > div{
      height:100%;
      width:0%;
      background:var(--lb-green);
      border-radius:999px;
      transition: width .18s ease;
    }

    .lbtool-status{
      margin-top:6px;
      font-size:12px;
      color:var(--lb-muted);
      display:flex; align-items:center; gap:8px;
      min-height:16px;
      white-space:nowrap;
      overflow:hidden;
      text-overflow:ellipsis;
    }

    .lbtool-kv{
      display:grid; grid-template-columns:1fr auto; gap:6px;
      font-size:13px; opacity:.95; margin-top:10px;
      border-top:1px solid rgba(255,255,255,.08); padding-top:10px;
    }

    .lbtool-sections{
      margin-top:10px;
      display:flex;
      flex-direction:column;
      gap:10px;
    }

    details.lbtool-details{
      background:var(--lb-bg2);
      border:1px solid rgba(255,255,255,.08);
      border-radius:12px;
      overflow:hidden;
    }
    details.lbtool-details > summary{
      list-style:none;
      cursor:pointer;
      padding:10px 10px;
      font-weight:900;
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:10px;
      user-select:none;
    }
    details.lbtool-details > summary::-webkit-details-marker{display:none;}
    .lbtool-countPill{
      background:rgba(255,255,255,.10);
      border:1px solid rgba(255,255,255,.10);
      padding:4px 8px;
      border-radius:999px;
      font-size:12px;
      color:#fff;
      flex:0 0 auto;
    }

    .lbtool-list{
      padding:10px;
      max-height:240px;
      overflow:auto;
    }
    .lbtool-item{
      display:flex; align-items:center; justify-content:space-between; gap:10px;
      padding:8px; background:rgba(17,17,17,.85); border-radius:12px; margin-bottom:8px;
      border:1px solid rgba(255,255,255,.06);
    }
    .lbtool-item:last-child{margin-bottom:0;}
    .lbtool-user{
      display:flex; flex-direction:column; gap:2px; min-width:0;
    }
    .lbtool-user a{
      color:var(--lb-green); text-decoration:none; font-weight:900; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
    }
    .lbtool-user small{opacity:.75;}
    .lbtool-actions{display:flex; gap:8px; flex-shrink:0;}
    .lbtool-actions .lbtool-btn{
      padding:8px 10px;
      font-size:12px;
      border-radius:10px;
      box-shadow:none;
    }

    .lbtool-fab{
      position:fixed; bottom:18px; right:18px; z-index:999999;
      background:rgba(17,17,17,.92); color:#fff; border:1px solid rgba(255,255,255,.15);
      border-radius:999px; padding:10px 12px; cursor:pointer; box-shadow:0 10px 30px rgba(0,0,0,.35);
      font-weight:1000; font-size:13px;
      backdrop-filter: blur(6px);
    }
    .lbtool-muted{opacity:.75}

    .lbtool-footer{
      margin-top:10px; font-size:12px; opacity:.75;
      border-top:1px solid rgba(255,255,255,.08); padding-top:10px;
    }
  `);

  // ---------- Mount helpers (FIX BOTÓN) ----------
  const FAB_ID = 'lbtool-fab';
  const PANEL_ID = 'lbtool-panel';

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  async function waitForBody() {
    for (let i = 0; i < 200; i++) { // ~10s max (200*50ms)
      if (document.body) return true;
      await sleep(50);
    }
    return false;
  }

  function ensureFab() {
    if (!document.body) return null;

    // si ya existe, no duplicar
    let fab = document.getElementById(FAB_ID);
    if (fab) return fab;

    fab = document.createElement('button');
    fab.id = FAB_ID;
    fab.className = 'lbtool-fab';
    fab.textContent = '🎬 Non-Followers';
    document.body.appendChild(fab);

    fab.onclick = openPanel;
    return fab;
  }

  function ensureObserver() {
    // Re-inyecta el botón si la web lo borra
    const mo = new MutationObserver(() => {
      // si no hay fab, reponer
      if (!document.getElementById(FAB_ID)) ensureFab();
    });
    mo.observe(document.documentElement, { childList: true, subtree: true });
    return mo;
  }

  // ---------- State ----------
  let panel = null;
  let lastUser = null;

  let lastFollowing = [];
  let lastFollowers = [];
  let lastNoFollowBack = [];
  let lastFollowersNotFollowing = [];

  // ---------- Helpers ----------
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

  function getMaxPage(doc) {
    const nums = [];
    doc.querySelectorAll('a[href*="/page/"]').forEach(a => {
      const href = a.getAttribute('href') || '';
      const m = href.match(/\/page\/(\d+)\//);
      if (m) nums.push(parseInt(m[1], 10));
    });
    doc.querySelectorAll('.paginate-pages a, .pagination a').forEach(a => {
      const t = (a.textContent || '').trim();
      if (/^\d+$/.test(t)) nums.push(parseInt(t, 10));
    });
    if (!nums.length) return null;
    return Math.max(...nums);
  }

  function setText(sel, v) {
    const el = panel?.querySelector(sel);
    if (el) el.textContent = v;
  }

  function setStatus(text) {
    const el = panel?.querySelector('#lbtool-status');
    if (el) el.textContent = text;
  }

  function setProgress(pct) {
    const bar = panel?.querySelector('#lbtool-barfill');
    if (bar) bar.style.width = `${Math.max(0, Math.min(100, pct))}%`;
  }

  function spinner(on) {
    const sp = panel?.querySelector('#lbtool-spinner');
    if (!sp) return;
    if (on) sp.classList.add('on');
    else sp.classList.remove('on');
  }

  async function scrapeAll(user, type, progressCb) {
    const base = `${location.origin}/${user}/${type}/`;
    const users = new Set();

    const res1 = await fetch(base, { credentials: 'include' });
    if (!res1.ok) return [];
    const html1 = await res1.text();
    const doc1 = domp.parseFromString(html1, 'text/html');

    parsePeople(doc1).forEach(u => users.add(u));

    let maxPage = getMaxPage(doc1);
    if (!maxPage) maxPage = null;

    progressCb?.({ type, page: 1, totalPages: maxPage });

    if (maxPage) {
      for (let p = 2; p <= maxPage; p++) {
        const url = `${base}page/${p}/`;
        const res = await fetch(url, { credentials: 'include' });
        if (!res.ok) break;
        const html = await res.text();
        const doc = domp.parseFromString(html, 'text/html');
        parsePeople(doc).forEach(u => users.add(u));
        progressCb?.({ type, page: p, totalPages: maxPage });
        await sleep(180);
      }
    } else {
      let emptyStreak = 0;
      for (let p = 2; p <= 800; p++) {
        const url = `${base}page/${p}/`;
        const res = await fetch(url, { credentials: 'include' });
        if (!res.ok) break;

        const html = await res.text();
        const doc = domp.parseFromString(html, 'text/html');

        const before = users.size;
        parsePeople(doc).forEach(u => users.add(u));
        const added = users.size - before;

        progressCb?.({ type, page: p, totalPages: null });

        if (added === 0) emptyStreak++;
        else emptyStreak = 0;

        if (emptyStreak >= 2) break;
        await sleep(180);
      }
    }

    return [...users].sort();
  }

  function mkCSV(owner, rows) {
    const ts = new Date().toISOString();
    const header = "username,profile_url,kind,owner,timestamp";
    const lines = rows.map(r => `${r.username},https://letterboxd.com/${r.username}/,${r.kind},${owner},${ts}`);
    return [header, ...lines].join("\n");
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

  function renderList(containerSel, users, mode) {
    const box = panel?.querySelector(containerSel);
    if (!box) return;

    box.innerHTML = '';

    if (!users.length) {
      const div = document.createElement('div');
      div.className = 'lbtool-muted';
      div.textContent = mode === 'unfollow'
        ? '✨ Nadie para cortar. Todos te siguen de vuelta.'
        : '✨ Nadie acá. No tenés “fans” sin follow back.';
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

      const btn = document.createElement('button');

      if (mode === 'follow') {
        btn.className = 'lbtool-btn success';
        btn.textContent = 'Seguir';
        btn.title = 'Abrir perfil para seguir (confirmás en Letterboxd).';
      } else {
        btn.className = 'lbtool-btn danger';
        btn.textContent = 'Unfollow';
        btn.title = 'Abrir perfil para dejar de seguir (confirmás en Letterboxd).';
      }

      btn.onclick = () => window.open(`https://letterboxd.com/${u}/`, '_blank', 'noopener,noreferrer');

      actions.appendChild(btn);

      row.appendChild(userCol);
      row.appendChild(actions);
      box.appendChild(row);
    });
  }

  function openMany(users, limit = null) {
    (async () => {
      const arr = limit ? users.slice(0, limit) : users;
      for (let i = 0; i < arr.length; i++) {
        window.open(`https://letterboxd.com/${arr[i]}/`, '_blank', 'noopener,noreferrer');
        await sleep(220);
      }
    })();
  }

  function copyResults() {
    const lines = [];
    lines.push(`No te siguen (${lastNoFollowBack.length}):`);
    lines.push(...lastNoFollowBack.map(u => `@${u}`));
    lines.push('');
    lines.push(`Me siguen y no sigo (${lastFollowersNotFollowing.length}):`);
    lines.push(...lastFollowersNotFollowing.map(u => `@${u}`));
    GM_setClipboard(lines.join('\n'));
    alert('Copiado ✅');
  }

  // ---------- UI ----------
  function openPanel() {
    if (panel) {
      panel.remove();
      panel = null;
      return;
    }

    panel = document.createElement('div');
    panel.id = PANEL_ID;
    panel.className = 'lbtool-panel';
    panel.innerHTML = `
      <div class="lbtool-title">
        <h3>🍿 Non-Followers Scanner</h3>
        <button class="lbtool-x" id="lbtool-close">✖</button>
      </div>

      <div class="lbtool-row">
        <button class="lbtool-btn" id="lbtool-run">🔎 Analizar</button>
        <button class="lbtool-btn secondary" id="lbtool-copy" disabled>📋 Copiar</button>
        <button class="lbtool-btn secondary" id="lbtool-export" disabled>⬇️ Exportar CSV</button>
        <button class="lbtool-btn secondary" id="lbtool-open10" disabled>⚡ Abrir primeros 10</button>
        <button class="lbtool-btn danger" id="lbtool-openall" disabled>🚀 Abrir TODOS</button>
      </div>

      <div class="lbtool-progressWrap">
        <div class="lbtool-spinner" id="lbtool-spinner"></div>
        <div class="lbtool-bar"><div id="lbtool-barfill"></div></div>
      </div>

      <div class="lbtool-status" id="lbtool-status">Listo. Tocá “Analizar”.</div>

      <div class="lbtool-kv">
        <div>👤 Usuario</div><div id="lbtool-user">—</div>
        <div>➡️ Following</div><div id="lbtool-following">—</div>
        <div>⬅️ Followers</div><div id="lbtool-followers">—</div>
        <div>🚫 No te siguen</div><div id="lbtool-nf">—</div>
        <div>👀 Me siguen y no sigo</div><div id="lbtool-fns">—</div>
      </div>

      <div class="lbtool-sections">
        <details class="lbtool-details" id="lbtool-det-nf" open>
          <summary>
            <span>🚫 No te siguen</span>
            <span class="lbtool-countPill" id="lbtool-nf-pill">0</span>
          </summary>
          <div class="lbtool-list" id="lbtool-list-nf"></div>
        </details>

        <details class="lbtool-details" id="lbtool-det-fns">
          <summary>
            <span>👀 Me siguen y no sigo</span>
            <span class="lbtool-countPill" id="lbtool-fns-pill">0</span>
          </summary>
          <div class="lbtool-list" id="lbtool-list-fns"></div>
        </details>
      </div>

      <div class="lbtool-footer">
        Acciones “asistidas”: abre el perfil para que confirmes Follow/Unfollow en Letterboxd.
      </div>
    `;

    document.body.appendChild(panel);

    panel.querySelector('#lbtool-close').onclick = () => { panel.remove(); panel = null; };

    panel.querySelector('#lbtool-run').onclick = run;
    panel.querySelector('#lbtool-copy').onclick = copyResults;

    panel.querySelector('#lbtool-export').onclick = () => {
      if (!lastUser) return;
      const rows = [
        ...lastNoFollowBack.map(u => ({ username: u, kind: 'no-te-siguen' })),
        ...lastFollowersNotFollowing.map(u => ({ username: u, kind: 'me-siguen-y-no-sigo' })),
      ];
      const csv = mkCSV(lastUser, rows);
      const ok = downloadText(`letterboxd-relaciones-@${lastUser}.csv`, csv);
      if (!ok) {
        alert('No pude descargar el CSV. Lo dejé en window.__LB_CSV__.');
        window.__LB_CSV__ = csv;
      }
    };

    panel.querySelector('#lbtool-open10').onclick = () => {
      if (!lastNoFollowBack.length) return;
      openMany(lastNoFollowBack, 10);
    };

    panel.querySelector('#lbtool-openall').onclick = () => {
      const all = [...lastNoFollowBack, ...lastFollowersNotFollowing];
      if (!all.length) return;
      if (!confirm(`Esto va a abrir ${all.length} pestañas. ¿Seguimos?`)) return;
      openMany(all, null);
    };

    setText('#lbtool-user', detectUser() || '—');
  }

  // ---------- RUN ----------
  async function run() {
    lastUser = detectUser();
    setText('#lbtool-user', lastUser || '—');

    if (!lastUser) {
      setStatus('⚠️ No pude detectar el usuario. Abrí tu perfil (https://letterboxd.com/TUUSUARIO/) y reintentá.');
      return;
    }

    const runBtn = panel.querySelector('#lbtool-run');
    const copyBtn = panel.querySelector('#lbtool-copy');
    const exportBtn = panel.querySelector('#lbtool-export');
    const open10Btn = panel.querySelector('#lbtool-open10');
    const openAllBtn = panel.querySelector('#lbtool-openall');

    runBtn.disabled = true;
    copyBtn.disabled = true;
    exportBtn.disabled = true;
    open10Btn.disabled = true;
    openAllBtn.disabled = true;

    spinner(true);
    setProgress(0);
    setStatus('🔍 Preparando escaneo…');

    lastFollowing = [];
    lastFollowers = [];
    lastNoFollowBack = [];
    lastFollowersNotFollowing = [];

    setText('#lbtool-following', '—');
    setText('#lbtool-followers', '—');
    setText('#lbtool-nf', '—');
    setText('#lbtool-fns', '—');
    setText('#lbtool-nf-pill', '0');
    setText('#lbtool-fns-pill', '0');

    renderList('#lbtool-list-nf', [], 'unfollow');
    renderList('#lbtool-list-fns', [], 'follow');

    let phase = 0;
    const progressCb = ({ type, page, totalPages }) => {
      const phaseBase = phase === 0 ? 0 : 50;
      const phasePct = totalPages ? Math.round((page / totalPages) * 50) : Math.min(50, 5 + page);
      const overall = Math.min(100, phaseBase + phasePct);
      setProgress(overall);

      if (totalPages) setStatus(`👤 ${type} page ${page}/${totalPages}`);
      else setStatus(`👤 ${type} page ${page}`);
    };

    try {
      phase = 0;
      lastFollowing = await scrapeAll(lastUser, 'following', progressCb);

      phase = 1;
      lastFollowers = await scrapeAll(lastUser, 'followers', progressCb);

      const followingSet = new Set(lastFollowing);
      const followersSet = new Set(lastFollowers);

      lastNoFollowBack = lastFollowing.filter(u => !followersSet.has(u));
      lastFollowersNotFollowing = lastFollowers.filter(u => !followingSet.has(u));

      setText('#lbtool-following', String(lastFollowing.length));
      setText('#lbtool-followers', String(lastFollowers.length));
      setText('#lbtool-nf', String(lastNoFollowBack.length));
      setText('#lbtool-fns', String(lastFollowersNotFollowing.length));

      setText('#lbtool-nf-pill', String(lastNoFollowBack.length));
      setText('#lbtool-fns-pill', String(lastFollowersNotFollowing.length));

      renderList('#lbtool-list-nf', lastNoFollowBack, 'unfollow');
      renderList('#lbtool-list-fns', lastFollowersNotFollowing, 'follow');

      setProgress(100);
      spinner(false);
      setStatus(`✨ Listo | 🚫 ${lastNoFollowBack.length} | 👀 ${lastFollowersNotFollowing.length}`);

      copyBtn.disabled = false;
      exportBtn.disabled = false;
      open10Btn.disabled = lastNoFollowBack.length === 0;
      openAllBtn.disabled = (lastNoFollowBack.length + lastFollowersNotFollowing.length) === 0;
    } catch (e) {
      spinner(false);
      setProgress(0);
      setStatus(`💥 Fallé yo (sí, yo). Error: ${String(e && e.message ? e.message : e)}`);
    } finally {
      runBtn.disabled = false;
    }
  }

  // ---------- Boot ----------
  (async () => {
    const ok = await waitForBody();
    if (!ok) return;
    ensureFab();
    ensureObserver();
  })();

})();
