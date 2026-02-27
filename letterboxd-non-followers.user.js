// ==UserScript==
// @name         Letterboxd Non-Followers (Community Tool)
// @namespace    community.letterboxd.tools
// @version      0.2.2
// @description  Non followers + UI compacta (solo estética)
// @match        *://letterboxd.com/*
// @match        *://www.letterboxd.com/*
// @grant        GM_addStyle
// @grant        GM_setClipboard
// ==/UserScript==

(function () {
'use strict';

/* ================== ESTILOS (SOLO VISUAL) ================== */
GM_addStyle(`
.lbtool-panel{
  position:fixed; top:18px; right:18px; width:360px;
  background:#111; color:#fff; z-index:999999;
  border-radius:14px; padding:14px;
  font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;
  box-shadow:0 10px 30px rgba(0,0,0,.45);
  border:1px solid rgba(255,255,255,.10);
}
.lbtool-title{display:flex; justify-content:space-between; align-items:center;}
.lbtool-x{border:0; background:#2a2a2a; color:#fff; border-radius:10px; padding:4px 10px; cursor:pointer;}

.lbtool-row{display:flex; gap:8px; margin:12px 0;}
.lbtool-btn{
  border:0; border-radius:10px; padding:8px 12px; cursor:pointer;
  background:#00c2a8; color:#001; font-weight:800; font-size:13px;
}
.lbtool-btn.secondary{background:#2a2a2a; color:#fff;}
.lbtool-btn.danger{background:#ff5a5f; color:#fff;}

.progress-wrap{
  display:flex;
  align-items:center;
  gap:10px;
  margin-top:8px;
}

.lb-spinner{
  width:16px;
  height:16px;
  border:2px solid rgba(255,255,255,.2);
  border-top:2px solid #00c2a8;
  border-radius:50%;
  animation:spin 0.9s linear infinite;
  flex-shrink:0;
}
@keyframes spin{to{transform:rotate(360deg);}}

.lb-progress{
  flex:1;
  height:6px;
  background:#1a1a1a;
  border-radius:999px;
  overflow:hidden;
}
.lb-progress-bar{
  height:100%;
  width:0%;
  background:linear-gradient(90deg,#00c2a8,#00e5c4);
  transition:width .25s ease;
}

.lb-status{
  font-size:12px;
  opacity:.85;
  margin-top:6px;
  min-height:16px;
}

.lbtool-list{
  margin-top:10px;
  max-height:200px;
  overflow:auto;
  background:#0a0a0a;
  border-radius:10px;
  padding:8px;
  border:1px solid rgba(255,255,255,.08);
}

.lbtool-item{
  display:flex; justify-content:space-between; align-items:center;
  padding:6px 8px; margin-bottom:6px;
  background:#111; border-radius:8px;
}

.lbtool-fab{
  position:fixed; bottom:18px; right:18px; z-index:999999;
  background:#111; color:#fff;
  border:1px solid rgba(255,255,255,.15);
  border-radius:999px; padding:10px 12px;
  cursor:pointer; font-weight:900;
}
`);

/* ================== BOTÓN FLOTANTE (SIN CAMBIOS LÓGICOS) ================== */
const fab = document.createElement('button');
fab.className = 'lbtool-fab';
fab.textContent = '🎬 Non-Followers';
document.body.appendChild(fab);

/* Anti desaparición del botón (Letterboxd es SPA) */
new MutationObserver(()=>{
  if(!document.body.contains(fab)){
    document.body.appendChild(fab);
  }
}).observe(document.body,{childList:true,subtree:true});

/* ================== ESTADO (IGUAL) ================== */
let panel=null;
let lastNoFollowers=[];
let lastUser=null;
let isRunning=false;

/* ================== HELPERS ORIGINALES (NO TOCADOS) ================== */
const sleep = (ms)=>new Promise(r=>setTimeout(r,ms));
const domp = new DOMParser();

const reserved=new Set([
'films','film','lists','list','diary','watchlist','likes','news','about','journal','apps','legal',
'pro','upgrade','members','people','activity','settings','create','reviews','search','tags','crew',
'actor','director','network','stats'
]);

function detectUser(){
  const parts=location.pathname.split('/').filter(Boolean);
  return parts.length?parts[0]:null;
}

function parsePeople(doc){
  const out=new Set();
  const nodes=doc.querySelectorAll('li.person-summary a[href^="/"]');
  const use=nodes.length?nodes:doc.querySelectorAll('a[href^="/"]');
  use.forEach(a=>{
    const href=a.getAttribute('href')||'';
    const mm=href.match(/^\/([A-Za-z0-9._-]+)\/$/);
    if(!mm)return;
    const u=mm[1].toLowerCase().trim();
    if(!reserved.has(u))out.add(u);
  });
  return out;
}

/* ================== SCRAPER (INTOCABLE) ================== */
async function scrapeAll(user,type,progressFn){
  const base=`${location.origin}/${user}/${type}/`;
  const users=new Set();
  let emptyStreak=0;

  for(let p=1;p<=800;p++){
    progressFn(type,p);

    const url=p===1?base:`${base}page/${p}/`;
    const res=await fetch(url,{credentials:'include'});
    if(!res.ok)break;

    const html=await res.text();
    const doc=domp.parseFromString(html,'text/html');

    const before=users.size;
    parsePeople(doc).forEach(u=>users.add(u));
    const added=users.size-before;

    if(added===0)emptyStreak++;
    else emptyStreak=0;

    if(emptyStreak>=2)break;
    await sleep(250);
  }
  return [...users].sort();
}

/* ================== UI ================== */
function openPanel(){
  if(panel){ panel.remove(); panel=null; return; }

  panel=document.createElement('div');
  panel.className='lbtool-panel';
  panel.innerHTML=`
    <div class="lbtool-title">
      <h3>🎬 Non-Followers Scanner</h3>
      <button class="lbtool-x" id="close">✖</button>
    </div>

    <div class="lbtool-row">
      <button class="lbtool-btn" id="run">🔍 Analizar</button>
      <button class="lbtool-btn secondary" id="copy" disabled>📋 Copiar</button>
      <button class="lbtool-btn danger" id="openall" disabled>🚀 Abrir todos</button>
    </div>

    <div class="progress-wrap">
      <div class="lb-spinner" id="spinner" style="display:none;"></div>
      <div class="lb-progress">
        <div class="lb-progress-bar" id="bar"></div>
      </div>
    </div>

    <div class="lb-status" id="status">Listo para analizar…</div>
    <div class="lbtool-list" id="list"></div>
  `;
  document.body.appendChild(panel);

  panel.querySelector('#close').onclick=()=>{panel.remove();panel=null;};
  panel.querySelector('#run').onclick=run;
  panel.querySelector('#copy').onclick=()=>GM_setClipboard(lastNoFollowers.join('\n'));
  panel.querySelector('#openall').onclick=()=>{
    lastNoFollowers.forEach((u,i)=>{
      setTimeout(()=>window.open(`https://letterboxd.com/${u}/`,'_blank'),i*250);
    });
  };
}

fab.onclick=openPanel;

/* ================== RUN (MISMA LÓGICA + UI COMPACTA) ================== */
async function run(){
  if(isRunning)return;
  isRunning=true;

  const status=panel.querySelector('#status');
  const listEl=panel.querySelector('#list');
  const spinner=panel.querySelector('#spinner');
  const bar=panel.querySelector('#bar');

  lastUser=detectUser();
  if(!lastUser){
    status.textContent='Abrí tu perfil antes de analizar.';
    isRunning=false;
    return;
  }

  spinner.style.display='block';
  bar.style.width='5%';
  status.textContent='🔎 Analizando following...';
  listEl.innerHTML='';

  const following=await scrapeAll(lastUser,'following',(t,p)=>{
    status.textContent=`👤 following page ${p}`;
    bar.style.width=Math.min(40+p*2,60)+'%';
  });

  status.textContent='👥 Analizando followers...';
  bar.style.width='65%';

  const followers=await scrapeAll(lastUser,'followers',(t,p)=>{
    status.textContent=`👥 followers page ${p}`;
    bar.style.width=Math.min(70+p*2,95)+'%';
  });

  const fset=new Set(followers);
  lastNoFollowers=following.filter(u=>!fset.has(u));

  bar.style.width='100%';
  spinner.style.display='none';
  status.textContent=`✨ Listo. No te siguen: ${lastNoFollowers.length}`;

  renderList();
  panel.querySelector('#copy').disabled=false;
  panel.querySelector('#openall').disabled=lastNoFollowers.length===0;

  isRunning=false;
}

/* ================== LISTA ================== */
function renderList(){
  const listEl=panel.querySelector('#list');
  listEl.innerHTML='';
  lastNoFollowers.forEach(u=>{
    const row=document.createElement('div');
    row.className='lbtool-item';
    row.innerHTML=`
      <span>@${u}</span>
      <button class="lbtool-btn danger">Unfollow</button>
    `;
    row.querySelector('button').onclick=()=>{
      window.open(`https://letterboxd.com/${u}/`,'_blank');
    };
    listEl.appendChild(row);
  });
}
})();
