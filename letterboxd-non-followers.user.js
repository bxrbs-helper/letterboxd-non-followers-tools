// ==UserScript==
// @name         Letterboxd Non-Followers (REAL DOM VERSION - WORKING)
// @namespace    lb.real.scraper
// @version      1.0.0
// @description  Lee followers y following reales usando el DOM visible (sin fetch bloqueado)
// @match        https://letterboxd.com/*
// @run-at       document-idle
// @grant        GM_addStyle
// ==/UserScript==

(function () {
  'use strict';

  if (window.__LB_REAL_TOOL__) return;
  window.__LB_REAL_TOOL__ = true;

  GM_addStyle(`
    .lbpanel {
      position: fixed;
      top: 20px;
      right: 20px;
      width: 380px;
      max-height: 80vh;
      overflow: auto;
      background: #111;
      color: #fff;
      z-index: 9999999;
      border-radius: 14px;
      padding: 14px;
      font-family: system-ui;
      box-shadow: 0 10px 40px rgba(0,0,0,.5);
    }
    .lbfab {
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #00c2a8;
      border: none;
      padding: 12px 16px;
      border-radius: 999px;
      font-weight: bold;
      cursor: pointer;
      z-index: 9999999;
    }
    .lbbtn {
      background: #00c2a8;
      border: none;
      padding: 8px 10px;
      border-radius: 8px;
      font-weight: bold;
      cursor: pointer;
      margin: 4px 4px 4px 0;
    }
    .lbunfollow {
      background: #ff4d4f;
      color: white;
    }
    .lblog {
      font-size: 12px;
      background: #0a0a0a;
      padding: 8px;
      border-radius: 8px;
      max-height: 180px;
      overflow: auto;
      margin-top: 8px;
      white-space: pre-wrap;
    }
    .lbuser {
      margin-bottom: 6px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
  `);

  const sleep = ms => new Promise(r => setTimeout(r, ms));

  function detectUser() {
    const parts = location.pathname.split('/').filter(Boolean);
    return parts[0] || null;
  }

  function getUsersFromDOM() {
    const users = new Set();
    const items = document.querySelectorAll('li.person-summary, .person-list li');

    items.forEach(li => {
      const link = li.querySelector('a[href^="/"]');
      if (!link) return;
      const match = link.getAttribute('href').match(/^\/([a-zA-Z0-9._-]+)\//);
      if (match) users.add(match[1].toLowerCase());
    });

    return [...users];
  }

  async function scrapeSection(user, type, log) {
    let page = 1;
    const collected = new Set();

    while (true) {
      const url = `https://letterboxd.com/${user}/${type}/page/${page}/`;
      log(`➡️ Navegando a ${type} página ${page}`);
      window.location.href = url;
      await waitForLoad();

      await sleep(800); // deja que renderice bien
      const users = getUsersFromDOM();

      if (users.length === 0) {
        log(`⛔ Fin detectado en página ${page}`);
        break;
      }

      users.forEach(u => collected.add(u));
      log(`✔ Página ${page}: +${users.length} (total ${collected.size})`);

      page++;
      await sleep(500);
    }

    return [...collected];
  }

  function waitForLoad() {
    return new Promise(resolve => {
      const check = () => {
        if (document.querySelector('li.person-summary, .person-list li')) {
          resolve();
        } else {
          setTimeout(check, 300);
        }
      };
      check();
    });
  }

  function createPanel() {
    const panel = document.createElement('div');
    panel.className = 'lbpanel';
    panel.innerHTML = `
      <h3>🎬 Non-Followers REAL</h3>
      <button class="lbbtn" id="run">ANALIZAR REAL</button>
      <div class="lblog" id="log">Listo.</div>
      <div id="results"></div>
    `;
    document.documentElement.appendChild(panel);

    const logBox = panel.querySelector('#log');
    const results = panel.querySelector('#results');

    const log = (msg) => {
      logBox.textContent += "\\n" + msg;
      logBox.scrollTop = logBox.scrollHeight;
    };

    panel.querySelector('#run').onclick = async () => {
      const user = detectUser();
      if (!user) {
        log("❌ Abrí tu perfil primero.");
        return;
      }

      log(`👤 Usuario: ${user}`);
      log("📥 Leyendo FOLLOWING reales...");

      const following = await scrapeSection(user, 'following', log);

      log("📥 Leyendo FOLLOWERS reales...");
      const followers = await scrapeSection(user, 'followers', log);

      const followerSet = new Set(followers);
      const noFollowBack = following.filter(u => !followerSet.has(u));

      log(`\\n🎯 Following: ${following.length}`);
      log(`🎯 Followers: ${followers.length}`);
      log(`🔥 No te siguen: ${noFollowBack.length}`);

      results.innerHTML = "<h4>Personas que no te siguen:</h4>";
      noFollowBack.forEach(u => {
        const div = document.createElement('div');
        div.className = 'lbuser';
        div.innerHTML = `
          <span>@${u}</span>
          <button class="lbbtn lbunfollow" onclick="window.open('https://letterboxd.com/${u}/','_blank')">
            Unfollow
          </button>
        `;
        results.appendChild(div);
      });
    };
  }

  const fab = document.createElement('button');
  fab.className = 'lbfab';
  fab.textContent = '🎬 REAL Analyzer';
  fab.onclick = createPanel;
  document.documentElement.appendChild(fab);
})();
