'use strict';
(function(){
  const BLOCK_ID='int-43324';
  const COOLDOWN_MS=90000;
  const LAST_KEY='retro_adsgram_last_interstitial';
  let controller=null;
  let bypass=false;

  function init(){
    try{
      if(window.Adsgram) controller=window.Adsgram.init({blockId:BLOCK_ID});
    }catch(e){
      console.warn('AdsGram init failed',e);
    }
  }

  function levelNumber(){
    const txt=document.getElementById('level')?.textContent||'';
    const n=parseInt(txt,10);
    return Number.isFinite(n)?n:0;
  }

  function eligible(){
    const over=document.getElementById('over');
    const primary=document.getElementById('primaryAction');
    if(!over||!primary||over.classList.contains('hidden')) return false;
    const label=(primary.textContent||'').toLowerCase();
    if(!label.includes('продолж')) return false;
    const lvl=levelNumber();
    if(lvl>0 && lvl%2===0) return false; // ads after levels 1,3,5... only
    const last=Number(localStorage.getItem(LAST_KEY)||0);
    return Date.now()-last>=COOLDOWN_MS;
  }

  async function showInterstitial(){
    if(!controller) init();
    if(!controller) return;
    try{
      await controller.show();
      localStorage.setItem(LAST_KEY,String(Date.now()));
    }catch(e){
      console.info('AdsGram interstitial unavailable',e);
    }
  }

  document.addEventListener('click',async function(ev){
    const btn=ev.target?.closest?.('#primaryAction');
    if(!btn||bypass||!eligible()) return;

    ev.preventDefault();
    ev.stopPropagation();
    ev.stopImmediatePropagation();

    const oldText=btn.textContent;
    btn.disabled=true;
    btn.textContent='Реклама…';
    await showInterstitial();
    btn.disabled=false;
    btn.textContent=oldText;

    bypass=true;
    btn.click();
    bypass=false;
  },true);

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
  console.info('AdsGram interstitial active:',BLOCK_ID);
})();