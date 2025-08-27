// js/dishes.js — Dishes with Backendless sync + offline fallback

const BL_APP_ID   = '948A3DAD-06F1-4F45-BECA-A039688312DD';
const BL_REST_KEY = '8C69AAC6-204C-48CE-A60B-137706E8E183';
const BL_API_URL  = 'https://api.backendless.com';
const BL_TABLE    = 'Dishes';
const PAGE_SIZE   = 200;

const LS_KEY  = 'dishes';
const POLL_MS = 6000;

const JSON_HEADERS_GET  = { Accept: 'application/json' };
const JSON_HEADERS_JSON = { 'Content-Type': 'application/json', Accept: 'application/json' };

// --- Backendless API
async function blListDishes() {
  const url = `${BL_API_URL}/${BL_APP_ID}/${BL_REST_KEY}/data/${BL_TABLE}?pageSize=${PAGE_SIZE}&sortBy=created%20desc`;
  const r = await fetch(url, { headers: JSON_HEADERS_GET });
  if (!r.ok) throw new Error('BL list');
  return r.json();
}
async function blCreateDish(payload) {
  const url = `${BL_API_URL}/${BL_APP_ID}/${BL_REST_KEY}/data/${BL_TABLE}`;
  const r = await fetch(url, { method: 'POST', headers: JSON_HEADERS_JSON, body: JSON.stringify(payload) });
  if (!r.ok) throw new Error('BL create');
  return r.json();
}
async function blDeleteDish(objectId) {
  const url = `${BL_API_URL}/${BL_APP_ID}/${BL_REST_KEY}/data/${BL_TABLE}/${encodeURIComponent(objectId)}`;
  const r = await fetch(url, { method: 'DELETE', headers: JSON_HEADERS_GET });
  if (!r.ok) throw new Error('BL delete');
  return true;
}

// --- Local helpers
function loadLocal(){ try{ return JSON.parse(localStorage.getItem(LS_KEY)||'[]'); }catch{ return []; } }
function saveLocal(a){ try{ localStorage.setItem(LS_KEY, JSON.stringify(a)); }catch{} }
function uid(){ return 'loc_'+Date.now()+'_'+Math.random().toString(36).slice(2,8); }
function escapeHtml(s){ const d=document.createElement('div'); d.textContent=s; return d.innerHTML; }

// --- UI
function renderOne(ul, dish, onDelete){
  const li=document.createElement('li');
  li.className='list-group-item d-flex justify-content-between align-items-center';
  li.dataset.localId=dish.localId;
  if (dish.objectId) li.dataset.objectId=dish.objectId;
  li.innerHTML=`<span>${escapeHtml(dish.text)}</span>
    <button class="btn btn-sm btn-outline-danger" title="Supprimer">❌</button>`;
  li.querySelector('button').onclick=()=>onDelete(dish,li);
  ul.appendChild(li);
}

function initDishes(){
  const form=document.getElementById('dish-form');
  const input=document.getElementById('dish-input');
  const list=document.getElementById('dish-list');
  const btnExp=document.getElementById('export-dishes');
  if(!form||!input||!list||!btnExp) return;

  let dishes=loadLocal();
  list.innerHTML=''; dishes.forEach(d=>renderOne(list,d,handleDelete));

  form.addEventListener('submit', async e=>{
    e.preventDefault();
    const txt=input.value.trim(); if(!txt) return;
    const dish={ localId: uid(), text: txt };
    dishes.unshift(dish); saveLocal(dishes); renderTop(dish); input.value='';

    if(navigator.onLine){
      try{
        const created=await blCreateDish({ text:dish.text, localId:dish.localId });
        const idx=dishes.findIndex(x=>x.localId===dish.localId);
        if(idx!==-1){ dishes[idx].objectId=created.objectId; saveLocal(dishes);
          const li=list.querySelector(`li[data-local-id="${dish.localId}"]`);
          if(li) li.dataset.objectId=created.objectId;
        }
      }catch(err){ console.warn('Création BL échouée:',err); }
    }
  });

  function renderTop(d){
    const tmp=document.createElement('ul'); renderOne(tmp,d,handleDelete);
    const li=tmp.firstElementChild;
    if(list.firstChild) list.insertBefore(li,list.firstChild); else list.appendChild(li);
  }

  async function handleDelete(dish, li){
    if(!confirm(`Supprimer "${dish.text}" ?`)) return;
    dishes=dishes.filter(x=>x.localId!==dish.localId); saveLocal(dishes); li.remove();
    if(dish.objectId && navigator.onLine) {
      try{ await blDeleteDish(dish.objectId); }catch(err){ console.warn('Suppression BL échouée:',err); }
    }
  }

  btnExp.addEventListener('click', ()=>{
    if(!dishes.length) return alert('Aucun plat à exporter !');
    const header='id,text';
    const rows=dishes.map(d=>`${(d.objectId||d.localId)},"${(d.text||'').replace(/"/g,'""')}"`);
    const csv=[header,...rows].join('\n');
    const a=document.createElement('a'); a.href='data:text/csv;charset=utf-8,'+encodeURIComponent(csv);
    a.download='dishes.csv'; document.body.appendChild(a); a.click(); document.body.removeChild(a);
  });

  async function initialSync(){
    if(!navigator.onLine) return;
    try{
      const remote=await blListDishes();
      const byKey=new Map(dishes.map(d=>[d.objectId||d.localId,d]));
      remote.forEach(r=>{
        const key=r.objectId||r.localId;
        if(!byKey.has(key)){
          const item={ localId:r.localId||uid(), objectId:r.objectId, text:r.text||'' };
          dishes.push(item); renderTop(item);
        }
      });
      saveLocal(dishes);
    }catch(e){ console.warn('Initial BL sync KO:',e); }
  }
  initialSync();

  let pollTimer=null;
  function startPolling(){
    stopPolling();
    pollTimer=setInterval(async ()=>{
      if(!navigator.onLine) return;
      try{
        const remote=await blListDishes();
        const next=remote.map(r=>({ localId:r.localId||uid(), objectId:r.objectId, text:r.text||'' }));
        const localSig=JSON.stringify(dishes.map(d=>[d.objectId||d.localId,d.text]));
        const remoteSig=JSON.stringify(next.map(d=>[d.objectId||d.localId,d.text]));
        if(localSig!==remoteSig){
          dishes=next; saveLocal(dishes);
          list.innerHTML=''; dishes.forEach(d=>renderOne(list,d,handleDelete));
        }
      }catch{}
    }, POLL_MS);
  }
  function stopPolling(){ if(pollTimer){ clearInterval(pollTimer); pollTimer=null; } }

  startPolling();
  window.addEventListener('online', ()=>{ initialSync(); startPolling(); });
  window.addEventListener('offline', ()=>{ stopPolling(); });
}

window.initDishes = initDishes;
