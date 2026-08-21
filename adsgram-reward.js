'use strict';
(function(){
  const REWARD_BLOCK_ID='43557';
  const usedLevels=new Set();
  let controller=null;
  let rewardBtn=null;
  let busy=false;

  function notify(msg){
    const toast=document.getElementById('toast');
    if(toast){
      toast.textContent=msg;
      toast.classList.add('show');
      clearTimeout(notify.t);
      notify.t=setTimeout(()=>toast.classList.remove('show'),2200);
    }
  }

  function levelNumber(){
    const text=document.getElementById('level')?.textContent||'';
    const n=parseInt(text,10);
    return Number.isFinite(n)?n:null;
  }

  function track(name,metadata={}){
    window.rgpTrack?.(name,{level:levelNumber(),metadata:{ad_type:'reward',block_id:REWARD_BLOCK_ID,...metadata}});
  }

  function errorText(e){
    try{return String(e?.description||e?.message||e?.error||e||'unknown').slice(0,240)}catch{return 'unknown'}
  }

  function initController(){
    try{
      if(window.Adsgram) controller=window.Adsgram.init({blockId:REWARD_BLOCK_ID});
      else console.warn('AdsGram Reward: SDK is not loaded');
    }catch(e){
      console.warn('AdsGram Reward init failed',e);
    }
  }

  function currentLevelKey(){
    try{return String(levelIndex)}catch{return 'unknown'}
  }

  function isDefeatScreen(){
    const over=document.getElementById('over');
    const badge=(document.getElementById('resultBadge')?.textContent||'').trim().toLowerCase();
    return !!over && !over.classList.contains('hidden') && badge.includes('поражение');
  }

  function refreshButton(){
    if(!rewardBtn)return;
    const show=isDefeatScreen() && !usedLevels.has(currentLevelKey());
    rewardBtn.style.display=show?'':'none';
    rewardBtn.disabled=busy;
    rewardBtn.textContent=busy?'Реклама…':'📺 Смотреть рекламу → +1 попытка';
  }

  function grantExtraTry(){
    const key=currentLevelKey();
    try{
      usedLevels.add(key);
      retriesRemaining=Math.max(0,retriesRemaining)+1;
      primaryMode='retry';
      const primary=document.getElementById('primaryAction');
      const mini=document.getElementById('resultMini');
      const title=document.getElementById('resultTitle');
      if(primary) primary.textContent='Повторить уровень';
      if(title) title.textContent='Бонусная попытка получена';
      if(mini) mini.textContent=`Дополнительная попытка за рекламу начислена. Продолжений: ${retriesRemaining}.`;
      notify('✅ +1 попытка начислена');
      track('reward_granted',{retries_remaining:Number(retriesRemaining)||0});
      return true;
    }catch(e){
      console.error('Reward grant failed',e);
      track('reward_error',{stage:'grant',error:errorText(e)});
      notify('Не удалось начислить попытку');
      return false;
    }finally{
      refreshButton();
    }
  }

  async function showReward(){
    if(busy)return;
    busy=true;
    track('reward_click');
    refreshButton();
    if(!controller) initController();
    if(!controller){
      track('reward_error',{stage:'init',error:'controller_unavailable'});
      notify('Реклама сейчас недоступна');
      busy=false;
      refreshButton();
      return;
    }

    let opened=false;
    try{
      track('reward_request');
      const showPromise=controller.show();
      opened=true;
      track('reward_open',{stage:'show_called'});
      const result=await showPromise;
      if(result && result.done===false) throw result;
      track('reward_complete');
      grantExtraTry();
      console.info('AdsGram reward completed',result);
    }catch(e){
      console.info('AdsGram reward skipped/unavailable',e);
      track('reward_error',{stage:opened?'show':'request',error:errorText(e)});
      notify('Награда не начислена: досмотрите рекламу до конца');
    }finally{
      if(opened)track('reward_close');
      busy=false;
      refreshButton();
    }
  }

  function mount(){
    const actions=document.querySelector('#over .actions');
    const toMenu=document.getElementById('toMenu');
    if(!actions||rewardBtn)return;
    rewardBtn=document.createElement('button');
    rewardBtn.id='rewardTry';
    rewardBtn.className='btn';
    rewardBtn.type='button';
    rewardBtn.style.display='none';
    rewardBtn.textContent='📺 Смотреть рекламу → +1 попытка';
    rewardBtn.addEventListener('click',function(ev){
      ev.preventDefault();
      ev.stopPropagation();
      showReward();
    });
    actions.insertBefore(rewardBtn,toMenu||null);

    const over=document.getElementById('over');
    if(over)new MutationObserver(()=>setTimeout(refreshButton,0)).observe(over,{attributes:true,subtree:true,childList:true,characterData:true});

    document.getElementById('play')?.addEventListener('click',()=>usedLevels.clear(),true);
    document.getElementById('primaryAction')?.addEventListener('click',()=>{
      try{if(primaryMode==='restart') usedLevels.clear()}catch{}
    },true);
    refreshButton();
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',()=>{initController();mount()},{once:true});
  }else{
    initController();
    mount();
  }
  console.info('AdsGram reward active:',REWARD_BLOCK_ID);
})();
