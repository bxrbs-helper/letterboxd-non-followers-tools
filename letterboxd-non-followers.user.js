// ==UserScript==
// @name         Letterboxd Connect PRO
// @namespace    community.letterboxd.tools
// @version      2.1.0
// @description  Non-followers + Historial + Descubrir (afinidad real) + ES/EN — versión estable
// @match        *://letterboxd.com/*
// @match        *://www.letterboxd.com/*
// @grant        GM_addStyle
// @grant        GM_setClipboard
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

(function () {
'use strict';

/* ================= STYLES ================= */
GM_addStyle(`
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Inter:wght@400;500;600;700&display=swap');

.lbtool-panel{
  position:fixed; top:18px; right:18px; width:390px; max-height:88vh;
  background:#0f1115; color:#fff; z-index:999999;
  border-radius:16px; padding:14px;
  font-family:'Inter',-apple-system,BlinkMacSystemFont,"Helvetica Neue",Helvetica,Arial,sans-serif;
  font-size:12.5px;
  box-shadow:0 15px 40px rgba(0,0,0,.55);
  border:1px solid rgba(255,255,255,.08);
  overflow-y:auto;
}
.lbtool-title{display:flex; justify-content:space-between; align-items:center;}
.lbtool-title h3{margin:0; font-family:'Playfair Display',serif; font-size:19px; font-weight:700; letter-spacing:.3px;}
.lbtool-title-actions{display:flex; gap:6px; align-items:center;}
.lb-lang{border:1px solid rgba(255,255,255,.18);background:#181818;color:#fff;border-radius:10px;padding:4px 9px;cursor:pointer;font-size:11px;font-weight:700;}
.lbtool-x{border:0;background:#222;color:#fff;border-radius:10px;padding:4px 10px;cursor:pointer;font-size:12px;}

.lb-tabs{display:flex; gap:5px; margin:12px 0 10px; flex-wrap:wrap;}
.lb-tab{flex:1 1 auto; text-align:center; padding:7px 6px; border-radius:10px; cursor:pointer; background:#1a1a1a; font-weight:700; font-size:10.5px; white-space:nowrap;}
.lb-tab.active{background:#00c2a8; color:#001;}

.lb-view{display:none;}
.lb-view.active{display:block;}

.lb-row{display:flex; gap:8px; margin:10px 0; flex-wrap:wrap;}
.lb-btn{border:0;border-radius:10px;padding:7px 11px;cursor:pointer;font-weight:700;font-size:12px;background:#00c2a8;color:#001;font-family:inherit;}
.lb-btn.sec{background:#2a2a2a;color:#fff;}
.lb-btn.danger{background:#ff5a5f;color:#fff;}
.lb-btn:disabled{opacity:.5;cursor:not-allowed;}

.progress-wrap{display:flex;align-items:center;gap:8px;margin-top:8px;}
.spinner{width:9px;height:9px;border:2px solid rgba(255,255,255,.2);border-top:2px solid #00e5c4;border-radius:50%;animation:spin .8s linear infinite;}
@keyframes spin{to{transform:rotate(360deg);}}
.progress{flex:1;height:6px;background:#1a1a1a;border-radius:999px;overflow:hidden;}
.bar{height:100%;width:0%;background:linear-gradient(90deg,#00c2a8,#00ffc3);transition:width .25s ease;}
.status{font-size:11.5px;opacity:.85;margin-top:6px;line-height:1.4;min-height:16px;}

.lb-global-status{display:none;align-items:center;gap:7px;font-size:11px;opacity:.9;background:#161a1d;border:1px solid rgba(0,229,196,.25);border-radius:9px;padding:6px 9px;margin-bottom:8px;}
.lb-global-status.show{display:flex;}
.lb-global-status .dot{width:7px;height:7px;flex:0 0 auto;border-radius:50%;background:#00e5c4;animation:pulse 1s infinite;}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.25}}

details.box{margin-top:10px;background:#0a0c10;border-radius:12px;border:1px solid rgba(255,255,255,.06);}
summary{cursor:pointer;padding:9px 10px;font-weight:800;font-size:12.5px;display:flex;justify-content:space-between;}
.list{max-height:200px;overflow:auto;padding:8px;}
.item{display:flex;justify-content:space-between;align-items:center;background:#111;border-radius:8px;padding:6px 8px;margin-bottom:6px;}
.item.gain{border-left:3px solid #00e5c4;}
.item.loss{border-left:3px solid #ff5a5f;}
.user{font-weight:700;font-size:12px;overflow:hidden;text-overflow:ellipsis;}
.meta{font-size:10.5px;opacity:.6;}

.lb-card{background:#111;border-radius:14px;padding:16px;text-align:center;border:1px solid rgba(255,255,255,.08);}
.lb-card img.avatar-img{width:72px;height:72px;border-radius:50%;object-fit:cover;margin-bottom:8px;background:#222;}
.lb-card .name{font-family:'Playfair Display',serif; font-weight:700;font-size:16px;}
.lb-card .stats-row{display:flex; justify-content:center; gap:14px; margin-top:6px; font-size:11px; opacity:.75;}
.lb-card .stats-row b{color:#fff; font-weight:700;}
.lb-card .favs-row{display:flex; justify-content:center; gap:5px; margin-top:10px;}
.lb-card .favs-row img{width:52px;height:34px;object-fit:cover;border-radius:4px;background:#222;}
.lb-card .aff{margin-top:10px; font-size:12px; opacity:.9;}
.lb-card .affbar{height:6px;background:#222;border-radius:999px;overflow:hidden;margin-top:6px;}
.lb-card .affbar span{display:block;height:100%;background:linear-gradient(90deg,#ff5a5f,#00e5c4);}
.swipe-row{display:flex; gap:10px; margin-top:14px;}
.swipe-row .lb-btn{flex:1; font-size:16px; padding:10px;}

.lb-help{line-height:1.5;}
.lb-help h4{font-family:'Playfair Display',serif; margin:14px 0 4px; font-size:13.5px;}
.lb-help h4:first-child{margin-top:0;}
.lb-help p{margin:0 0 6px; opacity:.85; font-size:12px;}

.fab{position:fixed;bottom:18px;right:18px;background:#111;color:#fff;border:1px solid rgba(255,255,255,.15);border-radius:999px;padding:9px 13px;cursor:pointer;font-weight:800;font-size:12px;font-family:'Playfair Display',serif;z-index:999999;}
`);

/* ================= I18N ================= */
const STR = {
 es:{
  title:'Connect PRO', langBtn:'EN',
  tabResumen:'⚡ Resumen', tabHistorial:'📖 Historial', tabDescubrir:'🎞️ Descubrir', tabAyuda:'❓ Cómo funciona',
  btnAnalyze:'🔍 Analizar', btnCopy:'📋 Copiar',
  statusReady:'Listo para analizar…', openProfileFirst:'Abrí tu perfil primero.',
  scanningFollowing:u=>`👤 Escaneando siguiendo… (${u})`, scanningFollowers:'👥 Escaneando seguidores…',
  pageFollowing:p=>`👤 following página ${p}`, pageFollowers:p=>`👥 followers página ${p}`,
  done:(a,b)=>`✨ Listo | 🚫 ${a} | 🥲 ${b}`,
  boxNoFollowBack:'🚫 No te siguen de vuelta', boxTheyFollowMe:'🥲 Te siguen, no los seguís',
  btnUnfollow:'Dejar de seguir', btnFollow:'Seguir', copied:'Copiado ✅',
  btnOpenNF:'🚫 Abrir no-follow-back', btnOpenMF:'🥲 Abrir "te siguen"',
  btnOpen10:'⚡ Abrir primeros 10', btnOpenAll:'🚀 Abrir TODOS',
  histIntro:'Corré "Analizar" en Resumen al menos dos veces (en momentos distintos) para ver cambios.',
  histCompared:d=>`Comparado contra el chequeo del ${d}.`,
  histFirst:'Primer chequeo guardado. La próxima vez que analices vas a ver los cambios acá.',
  boxGained:'📈 Nuevos seguidores', boxLost:'📉 Te dejaron de seguir', tagNew:'👋 nuevo', tagLeft:'💔 se fue',
  discIntro:'Buscá candidatos con gustos parecidos a los tuyos: gente que le puso "fan" a películas que vos también amás.',
  btnFindCandidates:'🔎 Buscar candidatos',
  needAnalyzeFirst:'Corré "Analizar" en Resumen primero (necesito tu lista de siguiendo/seguidores).',
  needTopRated:'No encontré suficientes datos de gustos (ni 4-5★, ni favoritas, ni diario reciente). Calificá o marcá favoritas en Letterboxd y volvé a intentar.',
  lookingFans:s=>`🔎 Buscando fans de "${s}"…`,
  fallbackNetwork:'Pocos candidatos por afinidad, sumando también gente de tu red cercana…',
  candidatesFound:n=>`${n} candidatos encontrados.`,
  noCandidates:'No encontré candidatos nuevos por ahora (probá de nuevo más tarde).',
  candidatesLeft:n=>`${n} candidatos restantes en esta tanda.`,
  loading:u=>`Cargando @${u}…`,
  commonFilms:n=>`${n} película${n===1?'':'s'} en común`, affinity:s=>`afinidad ${s}%`,
  btnPass:'✕ Pasar', btnFollowCard:'💚 Seguir',
  noMoreCandidates:'No hay más candidatos por ahora. Buscá de nuevo más tarde.',
  followers:'seguidores', following:'siguiendo',
  followFailed:u=>`No pude seguir a @${u} (revisá la consola). Pasando al siguiente.`,
  csrfMissing:'No encontré el CSRF token. Recargá la página de Letterboxd e intentá de nuevo.',
  helpH1:'⚡ Resumen', helpP1:'Escanea tu lista de "siguiendo" y "seguidores" y te muestra dos grupos: gente que seguís pero no te sigue de vuelta, y gente que te sigue pero vos no seguís. Podés actuar directo desde ahí (seguir / dejar de seguir), sin salir del panel.',
  helpH2:'📖 Historial', helpP2:'Cada vez que corrés "Analizar" en Resumen, se guarda una foto de tus seguidores. La próxima vez que analices, comparamos contra esa foto y te mostramos quién te empezó a seguir y quién te dejó de seguir en el medio.',
  helpH3:'🎞️ Descubrir', helpP3:'Busca gente con gustos parecidos usando, en orden: tus películas con 4-5★, si no hay suficientes tus 4 favoritas del perfil, y si todavía falta tus últimas 2 entradas del diario. Para cada una busca sus "fans" en Letterboxd — gente que probablemente no conocés. Te las muestra en tarjetas con seguidores/seguidos, favoritos y % de afinidad real. Deslizá: Pasar o Seguir.',
  helpH4:'🌐 Idioma', helpP4:'El botón ES/EN arriba a la derecha cambia el idioma de toda la interfaz en el momento.',
  helpNote:'Nota: este script lee datos públicos de Letterboxd desde tu navegador, con tu sesión ya logueada. No envía nada a servidores externos.'
 },
 en:{
  title:'Connect PRO', langBtn:'ES',
  tabResumen:'⚡ Overview', tabHistorial:'📖 History', tabDescubrir:'🎞️ Discover', tabAyuda:'❓ How it works',
  btnAnalyze:'🔍 Analyze', btnCopy:'📋 Copy',
  statusReady:'Ready to analyze…', openProfileFirst:'Open your profile first.',
  scanningFollowing:u=>`👤 Scanning following… (${u})`, scanningFollowers:'👥 Scanning followers…',
  pageFollowing:p=>`👤 following page ${p}`, pageFollowers:p=>`👥 followers page ${p}`,
  done:(a,b)=>`✨ Done | 🚫 ${a} | 🥲 ${b}`,
  boxNoFollowBack:'🚫 Not following back', boxTheyFollowMe:"🥲 They follow you, you don't",
  btnUnfollow:'Unfollow', btnFollow:'Follow', copied:'Copied ✅',
  btnOpenNF:'🚫 Open non-followers', btnOpenMF:'🥲 Open "they follow me"',
  btnOpen10:'⚡ Open first 10', btnOpenAll:'🚀 Open ALL',
  histIntro:'Run "Analyze" in Overview at least twice (at different times) to see changes.',
  histCompared:d=>`Compared against your check on ${d}.`,
  histFirst:"First check saved. Next time you analyze you'll see the changes here.",
  boxGained:'📈 New followers', boxLost:'📉 Unfollowed you', tagNew:'👋 new', tagLeft:'💔 left',
  discIntro:'Find people with tastes similar to yours: fans of films you also love.',
  btnFindCandidates:'🔎 Find candidates',
  needAnalyzeFirst:'Run "Analyze" in Overview first (I need your following/followers lists).',
  needTopRated:"Couldn't find enough taste data (no 4-5★, no favorites, no recent diary). Rate or favorite some films on Letterboxd and try again.",
  lookingFans:s=>`🔎 Looking for fans of "${s}"…`,
  fallbackNetwork:'Few affinity-based candidates, adding people from your close network too…',
  candidatesFound:n=>`${n} candidates found.`,
  noCandidates:'No new candidates for now (try again later).',
  candidatesLeft:n=>`${n} candidates left in this batch.`,
  loading:u=>`Loading @${u}…`,
  commonFilms:n=>`${n} film${n===1?'':'s'} in common`, affinity:s=>`${s}% affinity`,
  btnPass:'✕ Pass', btnFollowCard:'💚 Follow',
  noMoreCandidates:'No more candidates for now. Search again later.',
  followers:'followers', following:'following',
  followFailed:u=>`Couldn't follow @${u} (check console). Moving to the next one.`,
  csrfMissing:'CSRF token not found. Reload the Letterboxd page and try again.',
  helpH1:'⚡ Overview', helpP1:"Scans your 'following' and 'followers' lists and shows two groups: people you follow who don't follow back, and people who follow you that you don't follow. You can act right there (follow / unfollow) without leaving the panel.",
  helpH2:'📖 History', helpP2:'Every time you run "Analyze" in Overview, a snapshot of your followers is saved. Next time you analyze, we compare against that snapshot and show who started following you and who unfollowed you in between.',
  helpH3:'🎞️ Discover', helpP3:"Finds people with similar taste using, in order: your 4-5★ films, if not enough your 4 profile favorites, and if still not enough your last 2 diary entries. For each, it looks up its 'fans' on Letterboxd — people you probably don't know. Shown as cards with followers/following, favorites, and a real affinity %. Swipe: Pass or Follow.",
  helpH4:'🌐 Language', helpP4:'The ES/EN button top-right switches the whole interface instantly.',
  helpNote:"Note: this script reads public Letterboxd data from your browser, using your logged-in session. Nothing is sent to external servers."
 }
};
function lang(){ return GM_getValue('lbtool_lang','es'); }
function t(key){ return STR[lang()][key]; }

/* ================= FAB ================= */
const fab = document.createElement('button');
fab.className = 'fab';
fab.textContent = '🎬 Connect PRO';
document.body.appendChild(fab);
new MutationObserver(()=>{ if(!document.body.contains(fab)) document.body.appendChild(fab); }).observe(document.body,{childList:true,subtree:true});

/* ================= STATE ================= */
let panel=null;
let isRunning=false;
let lastFollowing=[], lastFollowers=[];
let lastNoFollowBack=[], lastTheyFollowMe=[];
let lastGained=[], lastLost=[];
let discoveryQueue=[];
let isFinding=false;
let currentUser=null;
let myRatingsCache=null;
let activeTab='resumen';
let globalStatusText='';
let globalStatusVisible=false;
let filmNameCache={};   // slug -> "Título (Año)"
let filmMetaCache={};   // slug -> {image, title}

const sleep = ms=>new Promise(r=>setTimeout(r,ms));
const domp = new DOMParser();

// Trae imagen + título reales de una película desde su propia página (og:image / og:title),
// que sí son estáticos (a diferencia de los posters, que se hidratan con React).
async function fetchFilmMeta(slug){
 if(filmMetaCache[slug]) return filmMetaCache[slug];
 const fallback = { image:null, title: niceTitleFromSlug(slug) };
 try{
  const res = await fetch(`${location.origin}/film/${slug}/`,{credentials:'include'});
  const html = await res.text();
  const imgMatch = html.match(/<meta property="og:image" content="([^"]+)"/i);
  const titleMatch = html.match(/<meta property="og:title" content="([^"]+)"/i);
  const decode = s => s.replace(/&#0?39;/g,"'").replace(/&quot;/g,'"').replace(/&amp;/g,'&');
  const meta = {
   image: imgMatch ? imgMatch[1] : null,
   title: titleMatch ? decode(titleMatch[1]) : fallback.title
  };
  filmMetaCache[slug] = meta;
  return meta;
 }catch(e){
  filmMetaCache[slug] = fallback;
  return fallback;
 }
}

function niceTitleFromSlug(slug){
 return slug.replace(/-\d{4}(-\d+)?$/,'').split('-').map(w=>w?w[0].toUpperCase()+w.slice(1):w).join(' ');
}

// Tolerancia proporcional al tamaño de la cuenta (0.5%, piso de 3).
function scanTolerance(count){
 if(count==null) return 5;
 return Math.max(3, Math.round(count * 0.005));
}

// Escanea una lista y, si el resultado queda por debajo de la tolerancia esperada,
// hace UNA pasada extra completa y une los resultados (dos escaneos independientes
// de una lista que se reordena en vivo suelen capturar gente distinta en los bordes).
async function scanWithVerification(type, minPages, declaredCount, progressCb){
 let result = await scrapeAll(currentUser, type, progressCb, 800, minPages);
 if(declaredCount!=null && Math.abs(declaredCount - result.length) > scanTolerance(declaredCount)){
  console.warn(`[LB SCAN] ${type}: diferencia mayor a la tolerancia (${result.length} vs ${declaredCount} declarados). Reintentando una pasada extra...`);
  const second = await scrapeAll(currentUser, type, progressCb, 800, minPages);
  const merged = [...new Set([...result, ...second])].sort();
  console.log(`[LB SCAN] ${type}: pasada extra sumó ${merged.length - result.length} cuentas nuevas. Total tras unir: ${merged.length}`);
  result = merged;
 }
 return result;
}

function cacheFilmName(el){
 const slug = el.getAttribute('data-item-slug');
 const name = el.getAttribute('data-item-name');
 if(slug && name && !filmNameCache[slug]) filmNameCache[slug] = name;
}

// Frases genéricas con onda cinéfila para mostrar mientras busca — no revelan qué película usamos de base.
const FUN_PHRASES = {
 es:[
  'Buscando un bueno, un malo, un feo…',
  'Alineando los planetas del buen cine…',
  'Haciendo casting de nuevos contactos…',
  'Rebobinando la cinta…',
  'Preguntando quién más lloró con esa escena…',
  'Escaneando cinéfilos de culto…',
  'Filtrando por buen gusto…',
  'Buscando a alguien que también vio esa rareza…',
  'Consultando al oráculo del séptimo arte…',
  'Misión: Cinéfilo (im)posible…',
  'Reclutando a la mesa de los cool kids del cine…',
  'Siguiendo pistas en los créditos finales…',
  'Ajustando el proyector…',
  'Repartiendo pochoclo digital…',
  'Buscando al Robin de tu Batman cinéfilo…',
  'Cruzando los dedos, como en el final de esa peli…',
  'Girando el rollo de película…',
  'Anotando en la libreta de crítico amateur…',
  'Espiando estanterías de DVDs ajenas…',
  'Uniendo universos cinéfilos paralelos…'
 ],
 en:[
  'Looking for the good, the bad, and the fan…',
  'Aligning the planets of good cinema…',
  'Casting new contacts…',
  'Rewinding the tape…',
  'Asking who else cried at that scene…',
  'Scanning cult film nerds…',
  'Filtering by good taste…',
  'Finding someone who saw that weird one too…',
  'Consulting the cinema oracle…',
  '(Im)Possible cinephile mission…',
  'Recruiting the cool kids table of film club…',
  'Following clues through the end credits…',
  'Adjusting the projector…',
  'Handing out digital popcorn…',
  'Looking for your cinephile sidekick…',
  'Crossing fingers, like in that one ending…',
  'Spinning the film reel…',
  'Jotting notes like an amateur critic…',
  'Peeking at other people\'s DVD shelves…',
  'Merging parallel cinephile universes…'
 ]
};
function randomFunPhrase(){
 const arr = FUN_PHRASES[lang()];
 return arr[Math.floor(Math.random()*arr.length)];
}

/* ---- helpers que consultan el panel EN EL MOMENTO (sobreviven a re-renders por cambio de idioma/pestaña) ---- */
function setLocalStatus(id, text){ const el = panel && panel.querySelector(id); if(el) el.textContent = text; }
function setSpin(show){ const el = panel && panel.querySelector('#spin'); if(el) el.style.display = show?'block':'none'; }
function setBar(pct){ const el = panel && panel.querySelector('#bar'); if(el) el.style.width = pct+'%'; }
function setGlobalStatus(text, visible=true){
 globalStatusText = text; globalStatusVisible = visible;
 const el = panel && panel.querySelector('#globalStatus');
 if(el){ el.textContent = text; el.classList.toggle('show', visible); }
}

const reserved=new Set(['films','film','lists','list','diary','watchlist','likes','news','about','journal',
'apps','legal','pro','upgrade','members','people','activity','settings','create','reviews','search','tags','crew','actor','director','network','stats']);

function detectUser(){
 const parts=location.pathname.split('/').filter(Boolean);
 return parts.length?parts[0]:null;
}

function parsePeople(doc){
 const out=new Set();
 // Contenedor real confirmado: div.person-summary (dentro de td.col-member.table-person).
 // Ya NO usamos un fallback genérico a[href^="/"] en todo el documento: eso agarraba
 // links de nav/settings/activity y contaminaba el conteo.
 let nodes=doc.querySelectorAll('div.person-summary a[href^="/"]');
 if(!nodes.length){
  // fallback mínimo por si alguna variante de página todavía usa <li>
  nodes=doc.querySelectorAll('li.person-summary a[href^="/"]');
 }
 nodes.forEach(a=>{
  const href=a.getAttribute('href')||'';
  const mm=href.match(/^\/([A-Za-z0-9._-]+)\/$/);
  if(!mm)return;
  const u=mm[1].toLowerCase().trim();
  if(!reserved.has(u)) out.add(u);
 });
 return out;
}

async function scrapeAll(user,type,cb,maxPages=800,minPages=0){
 // Orden alfabético fijo (/by/name/) en vez del orden por defecto "When Followed",
 // que se reordena constantemente con la actividad y hacía que el escaneo se saltara gente.
 const base = `${location.origin}/${user}/${type}/by/name/`;
 const users=new Set();
 let empty=0;
 let lastPage=0;
 for(let p=1;p<=maxPages;p++){
  cb && cb(type,p);
  lastPage=p;
  const url = p === 1 ? base : `${base}page/${p}/`;
  let res = await fetch(url,{credentials:'include'});
  if(!res.ok){
   console.warn(`[LB SCAN] ${type} p${p} → HTTP ${res.status}, reintentando en 700ms...`);
   await sleep(700);
   res = await fetch(url,{credentials:'include'});
   if(!res.ok){
    console.warn(`[LB SCAN] ${type} p${p} → HTTP ${res.status} otra vez tras reintentar. CORTANDO acá. Total únicos hasta ahora: ${users.size}`);
    break;
   }
  }
  const html=await res.text();
  const doc=domp.parseFromString(html,'text/html');
  const rawCount = doc.querySelectorAll('div.person-summary').length;
  const before=users.size;
  parsePeople(doc).forEach(u=>users.add(u));
  const added = users.size-before;
  if(added===0) empty++; else empty=0;
  if(rawCount>0 && added===0){
   console.warn(`[LB SCAN] ${type} p${p}: la página trae ${rawCount} person-summary pero 0 nuevos (todos ya vistos o no matchean el patrón de username).`);
  }
  if(rawCount===0){
   console.warn(`[LB SCAN] ${type} p${p}: la página no trae NINGÚN div.person-summary (¿página vacía real, o cambió el markup de nuevo?).`);
  }
  // Solo cortamos por "páginas vacías" una vez que ya cubrimos el mínimo esperado.
  if(p>=minPages && empty>=3){
   console.warn(`[LB SCAN] ${type} CORTADO por heurística en p${p} (3 vacías seguidas, ya se había cubierto el mínimo de ${minPages}). Total únicos: ${users.size}`);
   break;
  }
  await sleep(220);
 }
 console.log(`[LB SCAN] ${type} terminó: última página intentada=${lastPage}, total únicos=${users.size}`);
 return [...users].sort();
}

/* ================= FOLLOW / UNFOLLOW (real) ================= */
function getCsrfToken(){
 // 1) input hidden en algún formulario de la página (lo más confiable)
 const input = document.querySelector('input[name="__csrf"]');
 if(input && input.value) return input.value;

 // 2) meta tag tipo <meta name="csrf-token" content="...">
 const meta = document.querySelector('meta[name="csrf-token"], meta[name="csrf"]');
 if(meta && meta.content) return meta.content;

 // 3) cookie (funciona solo si NO es HttpOnly)
 const m = document.cookie.match(/(?:^|;\s*)com\.xk72\.webparts\.csrf=([^;]+)/);
 if(m) return decodeURIComponent(m[1]);

 return null;
}

// Si no encontramos el token en la página actual, probamos pidiendo el perfil propio
// (server-rendered, siempre trae al menos un formulario con __csrf embebido).
async function ensureCsrfToken(){
 let token = getCsrfToken();
 if(token) return token;
 try{
  const me = detectUser() || currentUser;
  if(!me) return null;
  const res = await fetch(`${location.origin}/${me}/`, {credentials:'include'});
  const html = await res.text();
  const doc = domp.parseFromString(html,'text/html');
  const input = doc.querySelector('input[name="__csrf"]');
  if(input && input.value) return input.value;
 }catch(e){ console.error('ensureCsrfToken error', e); }
 return null;
}

async function toggleFollow(username, follow){
 const token = await ensureCsrfToken();
 if(!token){
  alert(t('csrfMissing'));
  return false;
 }
 const action = follow ? 'follow' : 'unfollow';
 try{
  const res = await fetch(`${location.origin}/${username}/${action}/`, {
   method:'POST',
   credentials:'include',
   headers:{'Content-Type':'application/x-www-form-urlencoded'},
   body: `__csrf=${encodeURIComponent(token)}`
  });
  return res.ok;
 }catch(e){
  console.error('toggleFollow error', e);
  return false;
 }
}

/* ================= HISTORIAL (persistencia) ================= */
function snapKey(user,type){ return `lbtool_snapshot_${user}_${type}`; }
function seenKey(user){ return `lbtool_seen_${user}`; }

function loadSnapshot(user,type){ return GM_getValue(snapKey(user,type), null); }
function saveSnapshot(user,type,list){ GM_setValue(snapKey(user,type), {list, ts: Date.now()}); }

function fmtDate(ts){
 if(!ts) return '—';
 const d = new Date(ts);
 return d.toLocaleDateString() + ' ' + d.toLocaleTimeString().slice(0,5);
}

/* ================= PROFILE INFO (avatar, counts, favoritos) ================= */
function extractCount(doc, username, type){
 const a = doc.querySelector(`a[href="/${username}/${type}/"]`);
 if(!a) return null;
 const txt = a.textContent.replace(/[^\d.,kKmM]/g,'').trim();
 return txt || null;
}

function parseCountStr(s){
 if(!s) return null;
 const clean = s.replace(/,/g,'').trim();
 if(/k$/i.test(clean)) return Math.round(parseFloat(clean)*1000);
 if(/m$/i.test(clean)) return Math.round(parseFloat(clean)*1000000);
 const n = parseInt(clean,10);
 return isNaN(n) ? null : n;
}

// Trae los conteos "oficiales" de seguidores/seguidos que muestra el perfil,
// para poder detectar si el escaneo quedó incompleto (bloqueo temporal, timeout, etc).
async function fetchDeclaredCounts(username){
 try{
  const res = await fetch(`${location.origin}/${username}/`,{credentials:'include'});
  const html = await res.text();
  const doc = domp.parseFromString(html,'text/html');
  return {
   followers: parseCountStr(extractCount(doc, username, 'followers')),
   following: parseCountStr(extractCount(doc, username, 'following'))
  };
 }catch(e){ return {followers:null, following:null}; }
}

async function fetchProfileInfo(username){
 const info = { avatarUrl:'', followers:null, following:null, favorites:[] };
 try{
  const res = await fetch(`https://letterboxd.com/${username}/`,{credentials:'include'});
  const html = await res.text();
  const doc = domp.parseFromString(html,'text/html');

  const img = doc.querySelector('.avatar img, .profile-avatar img');
  if(img) info.avatarUrl = img.getAttribute('src') || '';

  info.followers = extractCount(doc, username, 'followers');
  info.following = extractCount(doc, username, 'following');

  // Los posters son componentes React sin <img> en el HTML crudo; en cambio,
  // cada película sí tiene og:image estático en su propia página — lo usamos como imagen.
  const favEls = [...doc.querySelectorAll('#favourites [data-item-slug]')].slice(0,4);
  favEls.forEach(cacheFilmName);
  info.favorites = await Promise.all(favEls.map(async el=>{
   const slug = el.getAttribute('data-item-slug');
   const meta = await fetchFilmMeta(slug);
   return { src: meta.image, alt: meta.title || filmNameCache[slug] || slug };
  }));
  info.favorites = info.favorites.filter(f=>f.src);
 }catch(e){ console.error('fetchProfileInfo error', e); }
 return info;
}

/* ================= OPEN HELPERS (abrir varios perfiles) ================= */
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
 if(!all.length) return;
 if(!confirm(lang()==='es' ? `¿Abrir ${all.length} perfiles?` : `Open ${all.length} profiles?`)) return;
 openLimited(all, all.length);
}

/* ================= UI SHELL ================= */
function panelHTML(){
 return `
  <div class="lbtool-title">
    <h3>🎬 ${t('title')}</h3>
    <div class="lbtool-title-actions">
      <button class="lb-lang" id="langBtn">${t('langBtn')}</button>
      <button class="lbtool-x" id="close">✖</button>
    </div>
  </div>

  <div class="lb-tabs">
    <div class="lb-tab" data-tab="resumen">${t('tabResumen')}</div>
    <div class="lb-tab" data-tab="historial">${t('tabHistorial')}</div>
    <div class="lb-tab" data-tab="descubrir">${t('tabDescubrir')}</div>
    <div class="lb-tab" data-tab="ayuda">${t('tabAyuda')}</div>
  </div>

  <div class="lb-global-status" id="globalStatus"></div>

  <div class="lb-view" id="view-resumen">
    <div class="lb-row">
      <button class="lb-btn" id="run">${t('btnAnalyze')}</button>
      <button class="lb-btn sec" id="copy" disabled>${t('btnCopy')}</button>
    </div>
    <div class="progress-wrap"><div class="spinner" id="spin" style="display:none"></div><div class="progress"><div class="bar" id="bar"></div></div></div>
    <div class="status" id="status">${t('statusReady')}</div>
    <div class="status" id="statusWarning" style="color:#ff8a80;font-weight:600;"></div>

    <details class="box" open>
      <summary>${t('boxNoFollowBack')} <span id="c1">0</span></summary>
      <div class="list" id="list1"></div>
    </details>
    <details class="box">
      <summary>${t('boxTheyFollowMe')} <span id="c2">0</span></summary>
      <div class="list" id="list2"></div>
    </details>

    <div class="lb-row">
     <button class="lb-btn danger" id="openNF" disabled>${t('btnOpenNF')}</button>
     <button class="lb-btn sec" id="openMF" disabled>${t('btnOpenMF')}</button>
    </div>
    <div class="lb-row">
     <button class="lb-btn" id="open10" disabled>${t('btnOpen10')}</button>
     <button class="lb-btn" id="openAll" disabled>${t('btnOpenAll')}</button>
    </div>
  </div>

  <div class="lb-view" id="view-historial">
    <div class="status" id="hist-status">${t('histIntro')}</div>
    <details class="box" open>
      <summary>${t('boxGained')} <span id="cg">0</span></summary>
      <div class="list" id="listGain"></div>
    </details>
    <details class="box" open>
      <summary>${t('boxLost')} <span id="cl">0</span></summary>
      <div class="list" id="listLost"></div>
    </details>
  </div>

  <div class="lb-view" id="view-descubrir">
    <div class="status" id="disc-status">${t('discIntro')}</div>
    <div class="lb-row"><button class="lb-btn" id="findCandidates">${t('btnFindCandidates')}</button></div>
    <div id="cardWrap"></div>
  </div>

  <div class="lb-view" id="view-ayuda">
    <div class="lb-help">
      <h4>${t('helpH1')}</h4><p>${t('helpP1')}</p>
      <h4>${t('helpH2')}</h4><p>${t('helpP2')}</p>
      <h4>${t('helpH3')}</h4><p>${t('helpP3')}</p>
      <h4>${t('helpH4')}</h4><p>${t('helpP4')}</p>
      <p style="margin-top:14px;opacity:.55;font-style:italic;">${t('helpNote')}</p>
      <p style="margin-top:14px;text-align:center;">
       <a href="https://www.instagram.com/bxrbs___/" target="_blank" rel="noopener noreferrer" style="color:#00e5c4;text-decoration:none;font-weight:700;font-family:'Playfair Display',serif;">
        📸 @bxrbs___
       </a>
      </p>
    </div>
  </div>
 `;
}

function renderPanel(){
 panel.innerHTML = panelHTML();

 panel.querySelector('#close').onclick=()=>{panel.remove();panel=null;};
 panel.querySelector('#langBtn').onclick=()=>{
  GM_setValue('lbtool_lang', lang()==='es'?'en':'es');
  renderPanel();
 };
 panel.querySelectorAll('.lb-tab').forEach(el=>{
  if(el.dataset.tab===activeTab) el.classList.add('active');
  el.onclick=()=>{
   activeTab = el.dataset.tab;
   panel.querySelectorAll('.lb-tab').forEach(x=>x.classList.remove('active'));
   panel.querySelectorAll('.lb-view').forEach(x=>x.classList.remove('active'));
   el.classList.add('active');
   panel.querySelector(`#view-${activeTab}`).classList.add('active');
  };
 });
 panel.querySelector(`#view-${activeTab}`).classList.add('active');

 panel.querySelector('#run').onclick=run;
 panel.querySelector('#copy').onclick=()=>{
  GM_setClipboard([...lastNoFollowBack,...lastTheyFollowMe].join('\n'));
  alert(t('copied'));
 };
 panel.querySelector('#findCandidates').onclick=findCandidates;
 panel.querySelector('#openNF').onclick=()=>openLimited(lastNoFollowBack, lastNoFollowBack.length);
 panel.querySelector('#openMF').onclick=()=>openLimited(lastTheyFollowMe, lastTheyFollowMe.length);
 panel.querySelector('#open10').onclick=()=>openLimited([...lastNoFollowBack,...lastTheyFollowMe], 10);
 panel.querySelector('#openAll').onclick=openAllCombined;

 if(globalStatusVisible){
  const gs = panel.querySelector('#globalStatus');
  gs.textContent = globalStatusText;
  gs.classList.add('show');
 }

 // repintar listas si ya había datos (por ej. después de cambiar idioma)
 if(lastNoFollowBack.length || lastTheyFollowMe.length){
  panel.querySelector('#c1').textContent=lastNoFollowBack.length;
  panel.querySelector('#c2').textContent=lastTheyFollowMe.length;
  render('#list1',lastNoFollowBack,'unfollow');
  render('#list2',lastTheyFollowMe,'follow');
  panel.querySelector('#copy').disabled=false;
  panel.querySelector('#openNF').disabled=!lastNoFollowBack.length;
  panel.querySelector('#openMF').disabled=!lastTheyFollowMe.length;
  panel.querySelector('#open10').disabled=!(lastNoFollowBack.length+lastTheyFollowMe.length);
  panel.querySelector('#openAll').disabled=!(lastNoFollowBack.length+lastTheyFollowMe.length);
 }
 if(lastGained.length || lastLost.length){
  panel.querySelector('#cg').textContent=lastGained.length;
  panel.querySelector('#cl').textContent=lastLost.length;
  renderHistorial('#listGain',lastGained,'gain');
  renderHistorial('#listLost',lastLost,'loss');
 }
}

function togglePanel(){
 if(panel){panel.remove();panel=null;return;}
 panel=document.createElement('div');
 panel.className='lbtool-panel';
 document.body.appendChild(panel);
 renderPanel();
}
fab.onclick=togglePanel;

/* ================= RUN: análisis + historial ================= */
async function run(){
 if(isRunning)return;
 isRunning=true;

 currentUser=detectUser();
 if(!currentUser){
  setLocalStatus('#status', t('openProfileFirst'));
  isRunning=false;return;
 }

 setSpin(true);
 setBar(5);
 setLocalStatus('#status', t('scanningFollowing')(currentUser));
 setLocalStatus('#statusWarning', '');
 setGlobalStatus('🔎 ' + t('scanningFollowing')(currentUser));

 // Traemos los conteos "oficiales" ANTES de escanear, para saber cuántas páginas esperar
 // y no cortar el escaneo antes de tiempo por la heurística de "páginas vacías"
 // (que puede fallar si la lista se reordena en vivo mientras escaneamos).
 const declared = await fetchDeclaredCounts(currentUser);
 const PER_PAGE = 25;
 const minFollowingPages = declared.following ? Math.ceil(declared.following/PER_PAGE)+1 : 0;
 const minFollowersPages = declared.followers ? Math.ceil(declared.followers/PER_PAGE)+1 : 0;

 const following=await scanWithVerification('following', minFollowingPages, declared.following, (t_,p)=>{
  const msg=t('pageFollowing')(p);
  setLocalStatus('#status', msg);
  setGlobalStatus('🔎 ' + msg);
  setBar(Math.min(40+p*2,60));
 });

 setLocalStatus('#status', t('scanningFollowers'));
 setGlobalStatus('🔎 ' + t('scanningFollowers'));
 setBar(65);

 const followers=await scanWithVerification('followers', minFollowersPages, declared.followers, (t_,p)=>{
  const msg=t('pageFollowers')(p);
  setLocalStatus('#status', msg);
  setGlobalStatus('🔎 ' + msg);
  setBar(Math.min(70+p*2,95));
 });

 lastFollowing=following; lastFollowers=followers;
 const fset=new Set(followers), fwingSet=new Set(following);

 lastNoFollowBack=following.filter(u=>!fset.has(u));
 lastTheyFollowMe=followers.filter(u=>!fwingSet.has(u));

 // Verificar que el escaneo esté completo comparando contra los conteos reales del perfil
 // (los mismos que ya trajimos antes de escanear).
 let warnings = [];
 if(declared.following!=null && Math.abs(declared.following - following.length) > scanTolerance(declared.following)){
  warnings.push(lang()==='es'
   ? `⚠️ Seguís a ${declared.following} según Letterboxd, pero solo pude leer ${following.length} (escaneo incompleto, probá de nuevo).`
   : `⚠️ You follow ${declared.following} per Letterboxd, but I could only read ${following.length} (incomplete scan, try again).`);
 }
 if(declared.followers!=null && Math.abs(declared.followers - followers.length) > scanTolerance(declared.followers)){
  warnings.push(lang()==='es'
   ? `⚠️ Tenés ${declared.followers} seguidores según Letterboxd, pero solo pude leer ${followers.length} (escaneo incompleto, probá de nuevo).`
   : `⚠️ You have ${declared.followers} followers per Letterboxd, but I could only read ${followers.length} (incomplete scan, try again).`);
 }
 setLocalStatus('#statusWarning', warnings.join(' '));

 /* ---- historial: comparar contra snapshot anterior de followers ---- */
 const prev = loadSnapshot(currentUser,'followers');
 if(prev && Array.isArray(prev.list)){
  const prevSet = new Set(prev.list);
  const newSet = new Set(followers);
  lastGained = followers.filter(u=>!prevSet.has(u));
  lastLost   = prev.list.filter(u=>!newSet.has(u));
  setLocalStatus('#hist-status', t('histCompared')(fmtDate(prev.ts)));
 } else {
  lastGained=[]; lastLost=[];
  setLocalStatus('#hist-status', t('histFirst'));
 }
 saveSnapshot(currentUser,'followers',followers);
 saveSnapshot(currentUser,'following',following);

 setSpin(false);
 setBar(100);
 setLocalStatus('#status', t('done')(lastNoFollowBack.length, lastTheyFollowMe.length));
 setGlobalStatus('', false);

 setLocalStatus('#c1', String(lastNoFollowBack.length));
 setLocalStatus('#c2', String(lastTheyFollowMe.length));
 setLocalStatus('#cg', String(lastGained.length));
 setLocalStatus('#cl', String(lastLost.length));

 render('#list1',lastNoFollowBack,'unfollow');
 render('#list2',lastTheyFollowMe,'follow');
 renderHistorial('#listGain',lastGained,'gain');
 renderHistorial('#listLost',lastLost,'loss');

 const copyBtn = panel && panel.querySelector('#copy');
 if(copyBtn) copyBtn.disabled=false;
 const openNFBtn = panel && panel.querySelector('#openNF');
 const openMFBtn = panel && panel.querySelector('#openMF');
 const open10Btn = panel && panel.querySelector('#open10');
 const openAllBtn = panel && panel.querySelector('#openAll');
 if(openNFBtn) openNFBtn.disabled=!lastNoFollowBack.length;
 if(openMFBtn) openMFBtn.disabled=!lastTheyFollowMe.length;
 if(open10Btn) open10Btn.disabled=!(lastNoFollowBack.length+lastTheyFollowMe.length);
 if(openAllBtn) openAllBtn.disabled=!(lastNoFollowBack.length+lastTheyFollowMe.length);
 isRunning=false;
}

function render(id,arr,mode){
 const box=panel.querySelector(id);
 box.innerHTML='';
 arr.forEach(u=>{
  const div=document.createElement('div');
  div.className='item';
  const btnText = mode === 'follow' ? t('btnFollow') : t('btnUnfollow');
  const btnClass = mode === 'follow' ? 'lb-btn' : 'lb-btn danger';
  div.innerHTML=`<span class="user">@${u}</span><button class="${btnClass}">${btnText}</button>`;
  const btn = div.querySelector('button');
  btn.onclick=async ()=>{
   btn.disabled=true; btn.textContent='…';
   const ok = await toggleFollow(u, mode==='follow');
   if(ok){
    div.style.opacity='0.4';
    btn.textContent='✅';
   } else {
    btn.disabled=false;
    btn.textContent='❌';
   }
  };
  box.appendChild(div);
 });
}

function renderHistorial(id,arr,type){
 const box=panel.querySelector(id);
 box.innerHTML='';
 arr.forEach(u=>{
  const div=document.createElement('div');
  div.className=`item ${type}`;
  div.innerHTML=`<span class="user">@${u}</span><span class="meta">${type==='gain'?t('tagNew'):t('tagLeft')}</span>`;
  div.onclick=()=>window.open(`https://letterboxd.com/${u}/`,'_blank','noopener,noreferrer');
  box.appendChild(div);
 });
}

/* ================= DESCUBRIR: candidatos por afinidad real (fans de tus películas top) ================= */
async function getMyRatings(){
 if(myRatingsCache) return myRatingsCache;
 myRatingsCache = await scrapeRatings(currentUser);
 return myRatingsCache;
}

// Best-effort: lee /usuario/films/ratings/ y saca pares {slug, rating}
// OJO: si Letterboxd cambia el markup, esto puede devolver vacío — avisame y lo ajustamos.
async function scrapeRatings(user, maxPages=4){
 const out={};
 for(let p=1;p<=maxPages;p++){
  const url = p===1
   ? `${location.origin}/${user}/films/ratings/`
   : `${location.origin}/${user}/films/ratings/page/${p}/`;
  const res=await fetch(url,{credentials:'include'});
  if(!res.ok) break;
  const html=await res.text();
  const doc=domp.parseFromString(html,'text/html');
  const items=doc.querySelectorAll('[data-item-slug]');
  if(!items.length) break;
  items.forEach(el=>{
   const slug=el.getAttribute('data-item-slug');
   if(!slug) return;
   cacheFilmName(el);
   // el rating puede estar en el mismo elemento, o en un hermano dentro del <li> contenedor
   const container = el.closest('li') || el.parentElement;
   let rating=null;
   const ratedEl = (container && container.querySelector('[class*="rated-"]')) || (el.matches('[class*="rated-"]') ? el : null);
   if(ratedEl){
    const cls=[...ratedEl.classList].find(c=>/^rated-\d+$/.test(c));
    if(cls) rating=parseInt(cls.replace('rated-',''),10)/2; // rated-10 = 5 estrellas
   }
   if(!(slug in out) || rating!=null) out[slug]=rating;
  });
  await sleep(150);
 }
 return out;
}

// Fans de una película: gente que la marcó como "fan" en Letterboxd.
// OJO: si /film/<slug>/fans/ no devuelve nada, avisame y probamos con /likes/ como alternativa.
async function scrapeFans(slug, maxPages=2){
 const users = new Set();
 for(let p=1;p<=maxPages;p++){
  const url = p===1
   ? `${location.origin}/film/${slug}/fans/`
   : `${location.origin}/film/${slug}/fans/page/${p}/`;
  const res=await fetch(url,{credentials:'include'});
  if(!res.ok) break;
  const html=await res.text();
  const doc=domp.parseFromString(html,'text/html');
  const before=users.size;
  parsePeople(doc).forEach(u=>users.add(u));
  if(users.size-before===0) break;
  await sleep(150);
 }
 return [...users];
}

function computeAffinity(mine, theirs){
 const mySlugs=Object.keys(mine);
 const shared=mySlugs.filter(s=>s in theirs);
 if(!shared.length) return {common:0, score:0};
 let diffSum=0, counted=0;
 shared.forEach(s=>{
  if(mine[s]!=null && theirs[s]!=null){ diffSum+=Math.abs(mine[s]-theirs[s]); counted++; }
 });
 const avgDiff = counted ? diffSum/counted : 2.5;
 const score = Math.max(0, Math.round((1 - avgDiff/5) * 100)); // 0-100
 return {common: shared.length, score};
}

// Favoritas declaradas en el perfil (las 4 que ofrece Letterboxd por defecto)
async function scrapeFavoriteSlugs(user){
 try{
  const res = await fetch(`${location.origin}/${user}/`,{credentials:'include'});
  const html = await res.text();
  const doc = domp.parseFromString(html,'text/html');
  const nodes = [...doc.querySelectorAll('#favourites [data-item-slug]')];
  nodes.forEach(cacheFilmName);
  return [...new Set(nodes.map(n=>n.getAttribute('data-item-slug')).filter(Boolean))].slice(0,4);
 }catch(e){ console.error('scrapeFavoriteSlugs error', e); return []; }
}

// Últimas N entradas del diario (fallback cuando no hay ratings ni favoritas suficientes)
// Búsqueda amplia (sin li.griditem) porque el diario puede usar otro contenedor.
async function scrapeDiarySlugs(user, limit=2){
 try{
  const res = await fetch(`${location.origin}/${user}/films/diary/`,{credentials:'include'});
  const html = await res.text();
  const doc = domp.parseFromString(html,'text/html');
  const nodes = [...doc.querySelectorAll('[data-item-slug]')];
  nodes.forEach(cacheFilmName);
  return [...new Set(nodes.map(n=>n.getAttribute('data-item-slug')).filter(Boolean))].slice(0,limit);
 }catch(e){ console.error('scrapeDiarySlugs error', e); return []; }
}

// Combina las 3 fuentes en orden de prioridad: ratings 4-5★ -> favoritas del perfil -> últimas 2 del diario
async function fetchOwnSignalSlugs(){
 const mine = await getMyRatings();
 let slugs = Object.entries(mine)
  .filter(([,r])=>r!=null && r>=4)
  .sort((a,b)=>b[1]-a[1])
  .map(([s])=>s);

 if(slugs.length < 3){
  const favs = await scrapeFavoriteSlugs(currentUser);
  favs.forEach(s=>{ if(!slugs.includes(s)) slugs.push(s); });
 }
 if(slugs.length < 3){
  const diary = await scrapeDiarySlugs(currentUser, 2);
  diary.forEach(s=>{ if(!slugs.includes(s)) slugs.push(s); });
 }
 return slugs.slice(0,8);
}

async function findCandidates(){
 if(isFinding)return;
 isFinding=true;

 currentUser = currentUser || detectUser();
 if(!currentUser){ setLocalStatus('#disc-status', t('openProfileFirst')); isFinding=false; return; }
 if(!lastFollowers.length || !lastFollowing.length){
  setLocalStatus('#disc-status', t('needAnalyzeFirst'));
  isFinding=false; return;
 }

 const wrap = panel && panel.querySelector('#cardWrap');
 if(wrap) wrap.innerHTML='';
 setGlobalStatus('🎞️ ' + t('discIntro'));

 const seen = new Set(GM_getValue(seenKey(currentUser), []));
 const followingSet = new Set(lastFollowing);
 const pool = new Set();

 const topSlugs = await fetchOwnSignalSlugs();

 if(!topSlugs.length){
  setLocalStatus('#disc-status', t('needTopRated'));
  setGlobalStatus('', false);
  isFinding=false; return;
 }

 setLocalStatus('#disc-status', t('discIntro'));

 for(const slug of topSlugs){
  setGlobalStatus('🎞️ ' + randomFunPhrase());
  const fans = await scrapeFans(slug,2);
  fans.forEach(u=>{
   if(u!==currentUser && !followingSet.has(u) && !seen.has(u)) pool.add(u);
  });
  await sleep(120);
 }

 if(pool.size < 5){
  const sample = lastFollowers.slice(0, 10);
  for(const u of sample){
   setGlobalStatus('🎞️ ' + randomFunPhrase());
   const theirFollowing = await scrapeAll(u,'following',null,2);
   theirFollowing.forEach(cand=>{
    if(cand!==currentUser && !followingSet.has(cand) && !seen.has(cand)) pool.add(cand);
   });
   await sleep(120);
  }
 }

 discoveryQueue = [...pool].sort(()=>Math.random()-0.5);
 setLocalStatus('#disc-status', discoveryQueue.length ? t('candidatesFound')(discoveryQueue.length) : t('noCandidates'));
 setGlobalStatus('', false);

 isFinding=false;
 showNextCard();
}

async function showNextCard(){
 let wrap=panel && panel.querySelector('#cardWrap');
 if(!discoveryQueue.length){
  if(wrap) wrap.innerHTML=`<div class="status">${t('noMoreCandidates')}</div>`;
  return;
 }
 const candidate = discoveryQueue.shift();
 if(wrap) wrap.innerHTML = `<div class="lb-card"><div class="status">${t('loading')(candidate)}</div></div>`;

 const [mine, theirs, info] = await Promise.all([
  getMyRatings(),
  scrapeRatings(candidate),
  fetchProfileInfo(candidate)
 ]);
 const aff = computeAffinity(mine, theirs);

 const favsHTML = info.favorites.length
  ? `<div class="favs-row">${info.favorites.map(f=>`<img src="${f.src}" title="${f.alt}">`).join('')}</div>`
  : '';

 wrap = panel && panel.querySelector('#cardWrap'); // re-consultar por si hubo re-render (ej. cambio de idioma) durante el await
 if(!wrap) return;
 wrap.innerHTML=`
  <div class="lb-card">
   ${info.avatarUrl?`<img class="avatar-img" src="${info.avatarUrl}">`:''}
   <div class="name">@${candidate}</div>
   <div class="stats-row">
    <span><b>${info.following ?? '—'}</b> ${t('following')}</span>
    <span><b>${info.followers ?? '—'}</b> ${t('followers')}</span>
   </div>
   ${favsHTML}
   <div class="aff">${t('commonFilms')(aff.common)} · ${t('affinity')(aff.score)}</div>
   <div class="affbar"><span style="width:${aff.score}%"></span></div>
   <div class="swipe-row">
    <button class="lb-btn danger" id="skip">${t('btnPass')}</button>
    <button class="lb-btn" id="likeFollow">${t('btnFollowCard')}</button>
   </div>
  </div>
 `;

 wrap.querySelector('#skip').onclick=()=>{ markSeen(candidate); showNextCard(); };
 wrap.querySelector('#likeFollow').onclick=async (e)=>{
  const btn=e.currentTarget;
  btn.disabled=true; btn.textContent='…';
  const ok = await toggleFollow(candidate, true);
  markSeen(candidate);
  if(!ok){ alert(t('followFailed')(candidate)); }
  showNextCard();
 };

 setLocalStatus('#disc-status', t('candidatesLeft')(discoveryQueue.length));
}

function markSeen(username){
 const key=seenKey(currentUser);
 const seen=new Set(GM_getValue(key, []));
 seen.add(username);
 GM_setValue(key, [...seen]);
}

})();
