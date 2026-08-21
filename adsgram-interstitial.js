'use strict';
(function(){
  const BLOCK_ID='int-43420';
  const COOLDOWN_MS=90000;
  const LAST_KEY='retro_adsgram_last_interstitial';
  let controller=null;
  let bypass=false;
  let busy=false;

  function notify(msg){
    const el=document.getElementById('toast');
    if(!el)return;
    el.textContent=msg;
    el.classList.add('show');
    clearTimeout(notify.t);
    notify.t=setTimeout(()=>el.classList.remove('show'),1800);
  }

  function levelNumber(){
    const txt=document.getElementById('level')?.textContent||'';
    const n=parseInt(txt,10);
    return Number.isFinite(n)?n:0;
  }

  function track(name,metadata={}){
    window.rgpTrack?.(name,{level:levelNumber()||null,metadata:{ad_type:'interstitial',block_id:BLOCK_ID,...metadata}});
  }

  function errorText(e){
    try{return String(e?.description||e?.message||e?.error||e||'unknown').slice(0,240)}catch{return 'unknown'}
  }

  function init(){
    try{
      if(window.Adsgram) controller=window.Adsgram.init({blockId:BLOCK_ID});
      else console.warn('AdsGram SDK is not loaded');
    }catch(e){
      console.warn('AdsGram init failed',e);
    }
  }

  function isLevelTransition(){
    const over=document.getElementById('over');
    const primary=document.getElementById('primaryAction');
    const badge=(document.getElementById('resultBadge')?.textContent||'').trim().toLowerCase();
    const label=(primary?.textContent||'').trim().toLowerCase();
    if(!over||!primary||over.classList.contains('hidden')) return false;
    return badge.includes('уровень пройден') || label.includes('следующий уровень');
  }

  function eligible(){
    if(busy||!isLevelTransition()) return false;
    const lvl=levelNumber();
    if(lvl>0 && lvl%2===0) return false;
    const last=Number(localStorage.getItem(LAST_KEY)||0);
    return Date.now()-last>=COOLDOWN_MS;
  }

  async function showInterstitial(){
    if(!controller) init();
    if(!controller){
      track('interstitial_error',{stage:'init',error:'controller_unavailable'});
      notify('Реклама сейчас недоступна — продолжаем');
      return false;
    }
    let opened=false;
    try{
      track('interstitial_request');
      const showPromise=controller.show();
      opened=true;
      track('interstitial_open',{stage:'show_called'});
      const result=await showPromise;
      localStorage.setItem(LAST_KEY,String(Date.now()));
      track('interstitial_complete');
      console.info('AdsGram interstitial shown',result);
      return true;
    }catch(e){
      console.info('AdsGram interstitial unavailable',e);
      track('interstitial_error',{stage:opened?'show':'request',error:errorText(e)});
      notify('Реклама сейчас недоступна — продолжаем');
      return false;
    }finally{
      if(opened)track('interstitial_close');
    }
  }

  document.addEventListener('click',async function(ev){
    const btn=ev.target?.closest?.('#primaryAction');
    if(!btn||bypass||!eligible()) return;

    ev.preventDefault();
    ev.stopPropagation();
    ev.stopImmediatePropagation();

    busy=true;
    const oldText=btn.textContent;
    btn.disabled=true;
    btn.textContent='Реклама…';
    await showInterstitial();
    btn.disabled=false;
    btn.textContent=oldText;
    busy=false;

    bypass=true;
    btn.click();
    bypass=false;
  },true);

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
  console.info('AdsGram interstitial active:',BLOCK_ID);
})();
