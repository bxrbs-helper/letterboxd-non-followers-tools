// ==UserScript==
// @name         Letterboxd Non-Followers (Community Tool)
// @namespace    community.letterboxd.tools
// @version      0.2.1
// @description  Shows who you follow on Letterboxd but who don't follow you back. (UI mejorada, misma lógica)
// @author       Community
// @match        *://letterboxd.com/*
// @match        *://www.letterboxd.com/*
// @grant        GM_addStyle
// @grant        GM_setClipboard
// ==/UserScript==

(function () {
'use strict';

// ---------- Styles (SOLO estética, no lógica) ----------
GM_addStyle(`
.lbtool-panel{
  position:fixed; top:18px; right:18px; width:380px; max-height:82vh; overflow:hidden;
  background:#111; color:#fff; z-index:999999; border-radius:16px; padding:16px;
  font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;
  box-shadow:0 15px 40px rgba(0,0,0,.55); border:1px solid rgba(255,255,255,.08);
}
.lbtool-title{display:flex; align-items:center; justify-content:space-between;}
.lbtool-title h3{margin:0; font-size:17px; font-weight:900;}
.lbtool-x{border:0; background:#2a2a2a; color:#fff; border-radius:10px; padding:6px 10px; cursor:pointer;}
.lbtool-progress-wrap{margin:14px 0;}
.lbtool-spinner{
  width:18px;height:18px;border-radius:50%;
  border:3px solid rgba(255,255,255,.15);
  border-top:3px solid #00c2a8;
  animation:lbspin 1s linear infinite;
}
.lbtool-spinner.stop{animation:none; border-top:3px solid #00c2a8;}
@keyframes lbspin{to{transform:rotate(360deg);}}
.lbtool-progress{
  height:8px;border-radius:999px;background:#1b1b1b;margin-top:8px;overflow:hidden;
}
.lbtool-bar{
  height:100%;width:0%;background:linear-gradient(90deg,#00c2a8,#6fffd2);
  transition:width .25s ease;
}
.lbtool-status{font-size:13px; opacity:.85; margin-top:6px;}
.lbtool-btn{
  border:0;border-radius:12px;padding:10px 14px;font-weight:800;
  background:#00c2a8;color:#002;cursor:pointer;margin-top:8px;
}
.lbtool-btn.secondary{background:#2a2a2a;color:#fff;}
.lbtool-list{
  margin-top:14px;max-height:260px;overflow:auto;
  border-top:1px solid rgba(255,255,255,.08);padding-top:10px;
}
.lbtool-item{
  display:flex;justify-content:space-between;align-items:center;
  background:#151515;border-radius:12px;padding:8px 10px;margin-bottom:8px;
}
.lbtool-item a{color:#6fffd2;text-decoration:none;font-weight:700;}
.lbtool-fab{
  position:fixed; bottom:18px; right:18px; z-index:999999;
  background:#111; color:#fff; border:1px solid rgba(255,255,255,.15);
  border-radius:999px; padding:10px 14px; cursor:pointer; font-weight:900;
}
`);

// ---------- FAB Toggle ----------
let panel = null;
const fab = document.createElement('button');
fab.className = 'lbtool-fab';
fab.textContent = '🎬 Non-Followers';
document.body.appendChild(fab);

// ---------- State ----------
let lastNoFollowers = [];
let lastUser = null;

const sleep = (ms)=>new Promise(r=>setTimeout(r,ms));
const domp = new DOMParser();

const reserved = new Set([
'films','film','lists','list','diary','watchlist','likes','news','about','journal',
'apps','legal','pro','upgrade','members','people','activity','settings','create',
'reviews','search','tags','crew','actor','director','network','stats'
]);

function detectUser(){
  const parts = location.pathname.split('/').filter(Boolean);
  return parts.length ? parts[0] : null;
}

function parsePeople(doc){
  const out=new Set();
  const nodes=doc.querySelectorAll('li.person-summary a[href^="/"]');
  const use=nodes.length?nodes:doc.querySelectorAll('a[href^="/"]');
  use.forEach(a=>{
    const href=a.getAttribute('href')||'';
    const mm=href.match(/^\\/([A-Za-z0-9._-]+)\\/$/);
    if(!mm)return;
    const u=mm[1].toLowerCase().trim();
    if(!reserved.has(u)) out.add(u);
  });
  return out;
}

// ---------- UI helpers ----------
function setStatus(txt){
  panel.querySelector('#lbtool-status').textContent = txt;
}
function setBar(pct){
  panel.querySelector('#lbtool-bar').style.width = pct + '%';
}
function stopSpinner(){
  panel.querySelector('#lbtool-spinner').classList.add('stop');
}
function renderList(users){
  const box=panel.querySelector('#lbtool-list');
  box.innerHTML='';
  if(!users.length){
    box.innerHTML='🎉 Todos te siguen de vuelta.';
    return;
  }
  users.forEach(u=>{
    const row=document.createElement('div');
    row.className='lbtool-item';
    row.innerHTML=`
      <a href="https://letterboxd.com/${u}/" target="_blank">@${u}</a>
      <button class="lbtool-btn secondary">Unfollow</button>
    `;
    row.querySelector('button').onclick=()=>{
      window.open(`https://letterboxd.com/${u}/`,'_blank');
    };
    box.appendChild(row);
  });
}

// ---------- Scraper (MISMA lógica base) ----------
async function scrapeAll(user,type){
  const base=`${location.origin}/${user}/${type}/`;
  const users=new Set();
  let emptyStreak=0;

  for(let p=1;p<=800;p++){
    setStatus(`🔎 Analizando ${type} — página ${p}`);
    setBar(Math.min(95,(p*2)));

    const url=p===1?base:`${base}page/${p}/`;
    const res=await fetch(url,{credentials:'include'});
    if(!res.ok) break;

    const html=await res.text();
    const doc=domp.parseFromString(html,'text/html');

    const before=users.size;
    parsePeople(doc).forEach(u=>users.add(u));
    const added=users.size-before;

    if(added===0) emptyStreak++; else emptyStreak=0;
    if(emptyStreak>=2) break;

    await sleep(250);
  }
  return [...users].sort();
}

// ---------- RUN ----------
async function run(){
  lastUser=detectUser();
  if(!lastUser){
    setStatus('⚠️ Abrí tu perfil de Letterboxd primero');
    return;
  }

  panel.querySelector('#lbtool-list').innerHTML='';
  panel.querySelector('#lbtool-spinner').classList.remove('stop');
  setBar(5);
  setStatus('Recolectando Following...');

  const following=await scrapeAll(lastUser,'following');
  setStatus('Recolectando Followers...');
  setBar(60);

  const followers=await scrapeAll(lastUser,'followers');

  const fset=new Set(followers);
  lastNoFollowers=following.filter(u=>!fset.has(u));

  setBar(100);
  stopSpinner();
  setStatus(`✨ Listo. No te siguen: ${lastNoFollowers.length}`);

  renderList(lastNoFollowers);
}

// ---------- Panel Toggle ----------
function togglePanel(){
  if(panel){ panel.remove(); panel=null; return; }

  panel=document.createElement('div');
  panel.className='lbtool-panel';
  panel.innerHTML=`
    <div class="lbtool-title">
      <h3>🍿 Non-Followers Analyzer</h3>
      <button class="lbtool-x">Cerrar</button>
    </div>

    <div class="lbtool-progress-wrap">
      <div style="display:flex;align-items:center;gap:8px;">
        <div id="lbtool-spinner" class="lbtool-spinner"></div>
        <div id="lbtool-status">Listo para analizar</div>
      </div>
      <div class="lbtool-progress">
        <div id="lbtool-bar" class="lbtool-bar"></div>
      </div>
    </div>

    <button class="lbtool-btn" id="runbtn">🚀 Analizar</button>
    <button class="lbtool-btn secondary" id="openall">🌐 Abrir todos</button>

    <div id="lbtool-list" class="lbtool-list"></div>
  `;

  document.body.appendChild(panel);

  panel.querySelector('.lbtool-x').onclick=togglePanel;
  panel.querySelector('#runbtn').onclick=run;
  panel.querySelector('#openall').onclick=()=>{
    lastNoFollowers.forEach((u,i)=>{
      setTimeout(()=>window.open(`https://letterboxd.com/${u}/`,'_blank'),i*250);
    });
  };
}

fab.onclick=togglePanel;

})();
