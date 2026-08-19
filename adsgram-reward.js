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
    rewardBtn.disabled=false;
    rewardBtn.textContent='📺 Смотреть рекламу → +1 попытка';
  }

  function grantExtraTry(){
    const key=currentLevelKey();
    usedLevels.add(key);
    try{
      retriesRemaining=Math.max(0,retriesRemaining)+1;
      primaryMode='retry';
      const primary=document.getElementById('primaryAction');
      const mini=document.getElementById('resultMini');
      const title=document.getElementById('resultTitle');
      if(primary) primary.textContent='Повторить уровень';
      if(title) title.textContent='Бонусная попытка получена';
      if(mini) mini.textContent=`Дополнительная попытка за рекламу начислена. Продолжений: ${retriesRemaining}.`;
      notify('✅ +1 попытка начислена');
      // Do not auto-resume WebAudio here. On iOS Telegram the ad overlay may
      // return without a fresh media user gesture and AudioContext.resume()
      // can reject with NotAllowedError even though the reward succeeded.
    }catch(e){
      console.error('Reward grant failed',e);
      notify('Не удалось начислить попытку');
    }
    refreshButton();
  }

  async function showReward(){
    if(busy)return;
    busy=true;
    rewardBtn.disabled=true;
    rewardBtn.textContent='Реклама…';
    if(!controller) initController();
    if(!controller){
      notify('Реклама сейчас недоступна');
      busy=false;
      refreshButton();
      return;
    }
    try{
      const result=await controller.show();
      if(result && result.done===false) throw result;
      grantExtraTry();
      console.info('AdsGram reward completed',result);
    }catch(e){
      console.info('AdsGram reward skipped/unavailable',e);
      notify('Награда не начислена: досмотрите рекламу до конца');
    }finally{
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
    if(over){
      new MutationObserver(()=>setTimeout(refreshButton,0)).observe(over,{attributes:true,subtree:true,childList:true,characterData:true});
    }

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
