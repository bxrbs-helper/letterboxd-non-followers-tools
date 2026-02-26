// ==UserScript==
// @name         Letterboxd Non-Followers (Accurate + UI Pro)
// @namespace    community.letterboxd.tools
// @version      0.4.0
// @description  Accurate non-followers detector with progress bar + spinner (stable for paginated 25-per-page)
// @match        *://letterboxd.com/*
// @match        *://www.letterboxd.com/*
// @run-at       document-idle
// @grant        GM_addStyle
// @grant        GM_setClipboard
// ==/UserScript==

(function () {
  'use strict';
  if (window.__LB_TOOL__) return;
  window.__LB_TOOL__ = true;

  GM_addStyle(`
  .lbtool-panel{
    position:fixed;top:20px;right:20px;width:380px;max-height:85vh;
    background:#111;color:#fff;z-index:9999999;border-radius:16px;
    padding:16px;font-family:system-ui;box-shadow:0 15px 40px rgba(0,0,0,.5);
  }
  .lbtool-btn{background:#00c2a8;border:0;padding:8px 12px;border-radius:10px;font-weight:800;cursor:pointer}
  .lbtool-log{background:#0a0a0a;padding:10px;border-radius:10px;margin-top:10px;font-size:12px;max-height:180px;overflow:auto}
  .lbtool-fab{
    position:fixed;bottom:20px;right:20px;background:#111;color:#fff;
    border-radius:999px;padding:10px 14px;font-weight:900;z-index:9999999;
    border:1px solid rgba(255,255,255,.2);cursor:pointer
  }
  .lbtool-spinner{
    width:18px;height:18px;border:3px solid #333;border-top:3px solid #00c2a8;
    border-radius:50%;animation:spin 1s linear infinite;display:inline-block;margin-left:8px
  }
  @keyframes spin{to{transform:rotate(360deg)}}
  .lbtool-progress{
    width:100%;height:8px;background:#222;border-radius:999px;margin-top:8px;overflow:hidden
  }
  .lbtool-bar{
    height:100%;width:0%;background:#00c2a8;transition:width .3s ease
  }
  `);

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const parser = new DOMParser();
  let panel, bar, logBox, spinner;

  function detectUser(){
    const p = location.pathname.split('/').filter(Boolean);
    return p[0] || null;
  }

  function extractUsers(doc){
    const set = new Set();
    // SELECTOR REAL de personas en Letterboxd (preciso)
    const people = doc.querySelectorAll('li.person-summary, .person-list li, .avatar-list li');
    people.forEach(li=>{
      const a = li.querySelector('a[href^="/"]');
      if(!a) return;
      const match = a.getAttribute('href').match(/^\/([a-zA-Z0-9._-]+)\//);
      if(match){
        set.add(match[1].toLowerCase());
      }
    });
    return set;
  }

  async function scrape(user, type){
    const collected = new Set();
    let page = 1;
    let emptyPages = 0;

    log(`Analizando ${type}...`);
    spinner.style.display = 'inline-block';

    while(true){
      const url = `https://letterboxd.com/${user}/${type}/page/${page}/`;
      const res = await fetch(url, {credentials:'include'});
      if(!res.ok) break;

      const html = await res.text();
      const doc = parser.parseFromString(html, 'text/html');
      const users = extractUsers(doc);

      if(users.size === 0){
        emptyPages++;
      } else {
        emptyPages = 0;
        users.forEach(u=>collected.add(u));
      }

      log(`${type} página ${page}: +${users.size} (total ${collected.size})`);
      bar.style.width = `${Math.min(page*3, 100)}%`;

      if(emptyPages >= 2) break;
      page++;
      await sleep(300);
    }

    spinner.style.display = 'none';
    bar.style.width = '100%';
    return [...collected];
  }

  function log(t){
    logBox.textContent += "\n" + t;
    logBox.scrollTop = logBox.scrollHeight;
  }

  function createPanel(){
    panel = document.createElement('div');
    panel.className = 'lbtool-panel';
    panel.innerHTML = `
      <b>🎬 Letterboxd Non-Followers</b>
      <div style="margin-top:10px">
        <button class="lbtool-btn" id="run">RUN</button>
        <span class="lbtool-spinner" id="spin" style="display:none"></span>
      </div>
      <div class="lbtool-progress"><div class="lbtool-bar" id="bar"></div></div>
      <div class="lbtool-log" id="log">Listo para analizar...</div>
    `;
    document.documentElement.appendChild(panel);
    bar = panel.querySelector('#bar');
    logBox = panel.querySelector('#log');
    spinner = panel.querySelector('#spin');

    panel.querySelector('#run').onclick = async ()=>{
      logBox.textContent = "Detectando usuario...";
      bar.style.width = "0%";

      const user = detectUser();
      if(!user){
        log("❌ Abrí tu perfil antes de correr el análisis.");
        return;
      }

      log(`Usuario: ${user}`);

      const following = await scrape(user, 'following');
      const followers = await scrape(user, 'followers');

      const followerSet = new Set(followers);
      const noBack = following.filter(u=>!followerSet.has(u));

      log(`\nFollowing reales: ${following.length}`);
      log(`Followers reales: ${followers.length}`);
      log(`No te siguen: ${noBack.length} 🔥`);

      const list = document.createElement('div');
      list.style.marginTop = '10px';
      list.style.maxHeight = '200px';
      list.style.overflow = 'auto';

      noBack.forEach(u=>{
        const row = document.createElement('div');
        row.style.marginBottom = '6px';
        row.innerHTML = `<b>@${u}</b> <button class="lbtool-btn" style="background:#ff4d4f;margin-left:6px"
          onclick="window.open('https://letterboxd.com/${u}/','_blank')">Unfollow</button>`;
        list.appendChild(row);
      });

      panel.appendChild(list);
    };
  }

  const fab = document.createElement('button');
  fab.className = 'lbtool-fab';
  fab.textContent = '🎬 Non-Followers';
  fab.onclick = ()=>{
    if(panel){panel.remove(); panel=null;}
    else createPanel();
  };

  document.documentElement.appendChild(fab);
})();
