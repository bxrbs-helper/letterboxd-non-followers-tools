// ==UserScript==
// @name         Letterboxd Non-Followers PRO Analyzer
// @namespace    community.letterboxd.tools
// @version      0.3.2
// @description  Analyzer PRO: Non-followers + They follow me (I don’t follow back) + advanced controls
// @match        *://letterboxd.com/*
// @match        *://www.letterboxd.com/*
// @grant        GM_addStyle
// @grant        GM_setClipboard
// ==/UserScript==

(function () {
'use strict';

/* ================= STYLES (LETTERBOXD-LIKE + SMALLER FONT) ================= */
GM_addStyle(`
.lbtool-panel{
  position:fixed; top:18px; right:18px; width:350px;
  background:#0f1115; color:#fff; z-index:999999;
  border-radius:16px; padding:14px;
  font-family:-apple-system,BlinkMacSystemFont,"Helvetica Neue",Helvetica,Arial,sans-serif;
  font-size:12.5px;
  box-shadow:0 15px 40px rgba(0,0,0,.55);
  border:1px solid rgba(255,255,255,.08);
}

.lbtool-title{display:flex; justify-content:space-between; align-items:center;}
.lbtool-title h3{
  margin:0;
  font-size:14px;
  font-weight:800;
}
.lbtool-x{
  border:0;background:#222;color:#fff;border-radius:10px;
  padding:4px 10px;cursor:pointer;
  font-size:12px;
}

.lb-row{
  display:flex; gap:8px; margin:12px 0; flex-wrap:wrap;
}

.lb-btn{
  border:0;border-radius:10px;padding:7px 11px;cursor:pointer;
  font-weight:700;
  font-size:12px;
  background:#00c2a8;color:#001;
  font-family:-apple-system,BlinkMacSystemFont,"Helvetica Neue",Helvetica,Arial,sans-serif;
}
.lb-btn.sec{background:#2a2a2a;color:#fff;}
.lb-btn.danger{background:#ff5a5f;color:#fff;}
.lb-btn:disabled{opacity:.5;cursor:not-allowed;}

.progress-wrap{display:flex;align-items:center;gap:8px;margin-top:8px;}
.spinner{
  width:9px;height:9px;
  border:2px solid rgba(255,255,255,.2);
  border-top:2px solid #00e5c4;
  border-radius:50%;
  animation:spin 0.8s linear infinite;
}
@keyframes spin{to{transform:rotate(360deg);}}

.progress{
  flex:1;height:6px;background:#1a1a1a;border-radius:999px;overflow:hidden;
}
.bar{
  height:100%;width:0%;
  background:linear-gradient(90deg,#00c2a8,#00ffc3);
  transition:width .25s ease;
}

.status{
  font-size:11.5px;
  opacity:.85;margin-top:6px;min-height:16px;
}

details.box{
  margin-top:10px;
  background:#0a0c10;
  border-radius:12px;
  border:1px solid rgba(255,255,255,.06);
}
summary{
  cursor:pointer;
  padding:9px 10px;
  font-weight:800;
  font-size:12.5px;
  display:flex;
  justify-content:space-between;
}
.list{
  max-height:200px;
  overflow:auto;
  padding:8px;
}
.item{
  display:flex;justify-content:space-between;align-items:center;
  background:#111;border-radius:8px;padding:6px 8px;margin-bottom:6px;
}
.user{
  font-weight:700;
  font-size:12px;
  overflow:hidden;text-overflow:ellipsis;
}

.fab{
  position:fixed;bottom:18px;right:18px;
  background:#111;color:#fff;border:1px solid rgba(255,255,255,.15);
  border-radius:999px;padding:9px 13px;cursor:pointer;
  font-weight:800;font-size:12px;
  z-index:999999;
}
`);

/* ================= FLOATING BUTTON ================= */
const fab = document.createElement('button');
fab.className = 'fab';
fab.textContent = '🎬 Analyzer PRO';
document.body.appendChild(fab);

new MutationObserver(()=>{
 if(!document.body.contains(fab)) document.body.appendChild(fab);
}).observe(document.body,{childList:true,subtree:true});

/* ================= STATE ================= */
let panel=null;
let isRunning=false;
let lastNoFollowBack=[];
let lastTheyFollowMe=[];
let lastUser=null;

const sleep = ms=>new Promise(r=>setTimeout(r,ms));
const domp = new DOMParser();

const reserved=new Set([
'films','film','lists','list','diary','watchlist','likes','news','about','journal',
'apps','legal','pro','upgrade','members','people','activity','settings','create',
'reviews','search','tags','crew','actor','director','network','stats'
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
  if(!reserved.has(u)) out.add(u);
 });
 return out;
}

async function scrapeAll(user,type,cb){
 const base = `${location.origin}/${user}/${type}/`;
 const users=new Set();
 let empty=0;

 for(let p=1;p<=800;p++){
  cb(type,p);
  const url = p === 1 ? base : `${base}page/${p}/`;
  const res=await fetch(url,{credentials:'include'});
  if(!res.ok)break;

  const html=await res.text();
  const doc=domp.parseFromString(html,'text/html');

  const before=users.size;
  parsePeople(doc).forEach(u=>users.add(u));

  if(users.size-before===0) empty++; else empty=0;
  if(empty>=2) break;

  await sleep(250);
 }
 return [...users].sort();
}

/* ================= OPEN HELPERS ================= */
function openLimited(users,limit){
 const slice=users.slice(0,limit);
 (async()=>{
  for(const u of slice){
   window.open(`https://letterboxd.com/${u}/`,'_blank','noopener,noreferrer');
   await sleep(220);
  }
 })();
}

function openAllCombined(){
 const all=[...new Set([...lastNoFollowBack,...lastTheyFollowMe])];
 if(!all.length)return;
 if(!confirm(`Open ${all.length} profiles?`))return;
 openLimited(all,all.length);
}

/* ================= UI ================= */
function togglePanel(){
 if(panel){panel.remove();panel=null;return;}

 panel=document.createElement('div');
 panel.className='lbtool-panel';
 panel.innerHTML=`
  <div class="lbtool-title">
    <h3>🧠 Analyzer PRO</h3>
    <button class="lbtool-x" id="close">✖</button>
  </div>

  <div class="lb-row">
    <button class="lb-btn" id="run">🔍 Analyze</button>
    <button class="lb-btn sec" id="copy" disabled>📋 Copy</button>
  </div>

  <div class="lb-row">
    <button class="lb-btn danger" id="openNF" disabled>🚫 Open Non-Followers</button>
    <button class="lb-btn sec" id="openMF" disabled>🥲 Open They Follow Me</button>
    <button class="lb-btn" id="open10" disabled>⚡ Open first 10</button>
    <button class="lb-btn" id="openAll" disabled>🚀 Open ALL</button>
  </div>

  <div class="progress-wrap">
    <div class="spinner" id="spin" style="display:none"></div>
    <div class="progress"><div class="bar" id="bar"></div></div>
  </div>
  <div class="status" id="status">Ready to analyze…</div>

  <details class="box" open>
    <summary>🚫 Non-Followers <span id="c1">0</span></summary>
    <div class="list" id="list1"></div>
  </details>

  <details class="box">
    <summary>🥲 They Follow Me (I Don’t Follow Back) <span id="c2">0</span></summary>
    <div class="list" id="list2"></div>
  </details>
 `;

 document.body.appendChild(panel);

 panel.querySelector('#close').onclick=()=>{panel.remove();panel=null;};
 panel.querySelector('#run').onclick=run;
 panel.querySelector('#copy').onclick=()=>{
  GM_setClipboard([...lastNoFollowBack,...lastTheyFollowMe].join('\n'));
  alert('Copied to clipboard ✅');
 };

 panel.querySelector('#openNF').onclick=()=>openLimited(lastNoFollowBack,lastNoFollowBack.length);
 panel.querySelector('#openMF').onclick=()=>openLimited(lastTheyFollowMe,lastTheyFollowMe.length);
 panel.querySelector('#open10').onclick=()=>openLimited([...lastNoFollowBack,...lastTheyFollowMe],10);
 panel.querySelector('#openAll').onclick=openAllCombined;
}

fab.onclick=togglePanel;

/* ================= RUN ================= */
async function run(){
 if(isRunning)return;
 isRunning=true;

 const spin=panel.querySelector('#spin');
 const bar=panel.querySelector('#bar');
 const status=panel.querySelector('#status');

 lastUser=detectUser();
 if(!lastUser){
  status.textContent='Open your profile first.';
  isRunning=false;return;
 }

 spin.style.display='block';
 bar.style.width='5%';
 status.textContent=`👤 Scanning following… (${lastUser})`;

 const following=await scrapeAll(lastUser,'following',(t,p)=>{
  status.textContent=`👤 following page ${p}`;
  bar.style.width=Math.min(40+p*2,60)+'%';
 });

 status.textContent='👥 Scanning followers…';
 bar.style.width='65%';

 const followers=await scrapeAll(lastUser,'followers',(t,p)=>{
  status.textContent=`👥 followers page ${p}`;
  bar.style.width=Math.min(70+p*2,95)+'%';
 });

 const fset=new Set(followers);
 const fwingSet=new Set(following);

 lastNoFollowBack=following.filter(u=>!fset.has(u));
 lastTheyFollowMe=followers.filter(u=>!fwingSet.has(u));

 spin.style.display='none';
 bar.style.width='100%';
 status.textContent=`✨ Done | 🚫 ${lastNoFollowBack.length} | 🥲 ${lastTheyFollowMe.length}`;

 panel.querySelector('#c1').textContent=lastNoFollowBack.length;
 panel.querySelector('#c2').textContent=lastTheyFollowMe.length;

 render('#list1',lastNoFollowBack,'unfollow');
 render('#list2',lastTheyFollowMe,'follow');

 panel.querySelector('#openNF').disabled=!lastNoFollowBack.length;
 panel.querySelector('#openMF').disabled=!lastTheyFollowMe.length;
 panel.querySelector('#open10').disabled=!(lastNoFollowBack.length+lastTheyFollowMe.length);
 panel.querySelector('#openAll').disabled=!(lastNoFollowBack.length+lastTheyFollowMe.length);
 panel.querySelector('#copy').disabled=false;

 isRunning=false;
}

function render(id,arr,mode){
 const box=panel.querySelector(id);
 box.innerHTML='';
 arr.forEach(u=>{
  const div=document.createElement('div');
  div.className='item';

  const btnText = mode === 'follow' ? 'Follow' : 'Unfollow';
  const btnClass = mode === 'follow' ? 'lb-btn' : 'lb-btn danger';

  div.innerHTML=`
   <span class="user">@${u}</span>
   <button class="${btnClass}">${btnText}</button>
  `;

  div.querySelector('button').onclick=()=>{
   window.open(`https://letterboxd.com/${u}/`,'_blank','noopener,noreferrer');
  };

  box.appendChild(div);
 });
}

})();
