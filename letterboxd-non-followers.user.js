// ==UserScript==
// @name         Letterboxd Non-Followers PRO Analyzer
// @namespace    community.letterboxd.tools
// @version      0.3.0
// @description  Analyzer PRO: No te siguen + Me siguen y no sigo + controles avanzados
// @match        *://letterboxd.com/*
// @match        *://www.letterboxd.com/*
// @grant        GM_addStyle
// @grant        GM_setClipboard
// ==/UserScript==

(function () {
'use strict';

/* ================= ESTILOS PRO (LETTERBOXD STYLE) ================= */
GM_addStyle(`
.lbtool-panel{
  position:fixed; top:18px; right:18px; width:350px;
  background:#0f1115; color:#fff; z-index:999999;
  border-radius:16px; padding:14px;
  font-family:-apple-system,BlinkMacSystemFont,"Helvetica Neue",Helvetica,Arial,sans-serif;
  box-shadow:0 15px 40px rgba(0,0,0,.55);
  border:1px solid rgba(255,255,255,.08);
}

.lbtool-title{display:flex; justify-content:space-between; align-items:center;}
.lbtool-title h3{margin:0; font-size:15px; font-weight:900;}
.lbtool-x{border:0;background:#222;color:#fff;border-radius:10px;padding:4px 10px;cursor:pointer;}

.lb-row{display:flex; gap:8px; margin:12px 0; flex-wrap:wrap;}

.lb-btn{
  border:0;border-radius:10px;padding:8px 12px;cursor:pointer;
  font-weight:800;font-size:13px;
  background:#00c2a8;color:#001;
  font-family:-apple-system,BlinkMacSystemFont,"Helvetica Neue",Helvetica,Arial,sans-serif;
}
.lb-btn.sec{background:#2a2a2a;color:#fff;}
.lb-btn.danger{background:#ff5a5f;color:#fff;}
.lb-btn:disabled{opacity:.5;cursor:not-allowed;}

.progress-wrap{display:flex;align-items:center;gap:8px;margin-top:8px;}
.spinner{
  width:10px;height:10px;
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
  font-size:12px;opacity:.85;margin-top:6px;min-height:16px;
  font-family:-apple-system,BlinkMacSystemFont,"Helvetica Neue",Helvetica,Arial,sans-serif;
}

details.box{
  margin-top:10px;
  background:#0a0c10;
  border-radius:12px;
  border:1px solid rgba(255,255,255,.06);
}
summary{
  cursor:pointer;
  padding:10px;
  font-weight:800;
  display:flex;
  justify-content:space-between;
  font-family:-apple-system,BlinkMacSystemFont,"Helvetica Neue",Helvetica,Arial,sans-serif;
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
  font-weight:800;font-size:13px;overflow:hidden;text-overflow:ellipsis;
  font-family:-apple-system,BlinkMacSystemFont,"Helvetica Neue",Helvetica,Arial,sans-serif;
}

.fab{
  position:fixed;bottom:18px;right:18px;
  background:#111;color:#fff;border:1px solid rgba(255,255,255,.15);
  border-radius:999px;padding:10px 14px;cursor:pointer;
  font-weight:900;z-index:999999;
  font-family:-apple-system,BlinkMacSystemFont,"Helvetica Neue",Helvetica,Arial,sans-serif;
}
`);

/* ================= BOTÓN FLOTANTE ================= */
const fab = document.createElement('button');
fab.className = 'fab';
fab.textContent = '🎬 Analyzer PRO';
document.body.appendChild(fab);

new MutationObserver(()=>{
 if(!document.body.contains(fab)) document.body.appendChild(fab);
}).observe(document.body,{childList:true,subtree:true});

/* ================= ESTADO ================= */
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
 const base=\`\${location.origin}/\${user}/\${type}/\`;
 const users=new Set();
 let empty=0;
 for(let p=1;p<=800;p++){
  cb(type,p);
  const url=p===1?base:\`\${base}page/\${p}/\`;
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

/* (RESTO DEL SCRIPT SIGUE EXACTAMENTE IGUAL — SIN CAMBIOS FUNCIONALES) */
