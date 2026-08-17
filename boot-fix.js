'use strict';
(function(){
  const play=document.getElementById('play');
  if(!play)return;

  function showBootError(err){
    console.error('Tank Base boot error:',err);
    let box=document.getElementById('bootError');
    if(!box){
      box=document.createElement('div');
      box.id='bootError';
      box.style.cssText='position:fixed;left:16px;right:16px;bottom:16px;z-index:999999;background:#5b1d22;color:#fff;border:1px solid #ff8c92;border-radius:14px;padding:14px;font:600 14px/1.35 -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;white-space:pre-wrap;box-shadow:0 12px 40px #0008';
      document.body.appendChild(box);
    }
    box.textContent='Ошибка запуска игры: '+(err&&err.message?err.message:String(err));
  }

  function robustStart(ev){
    if(ev){ev.preventDefault();ev.stopImmediatePropagation();}
    try{
      document.documentElement.style.overflow='hidden';
      document.body.classList.add('playing');
      const game=document.getElementById('game');
      const over=document.getElementById('over');
      const pauseModal=document.getElementById('pauseModal');
      if(!game)throw new Error('Не найден #game');
      game.classList.remove('hidden');
      if(over)over.classList.add('hidden');
      if(pauseModal)pauseModal.classList.add('hidden');
      window.scrollTo(0,0);

      if(typeof audio==='function')audio();
      if(typeof resetCampaign!=='function')throw new Error('resetCampaign не загружен');
      resetCampaign();

      if(typeof fitGameBurst==='function')setTimeout(()=>fitGameBurst(),0);
    }catch(err){
      document.body.classList.remove('playing');
      const game=document.getElementById('game');
      if(game)game.classList.add('hidden');
      document.documentElement.style.overflow='';
      showBootError(err);
    }
  }

  // Capture-phase handler wins over any stale onclick registered by previous builds.
  play.addEventListener('click',robustStart,true);
  play.addEventListener('pointerup',e=>{
    if(e.pointerType==='touch'||e.pointerType==='pen')robustStart(e);
  },true);

  window.addEventListener('error',e=>{
    if(document.body.classList.contains('playing'))showBootError(e.error||new Error(e.message||'JavaScript error'));
  });
  window.addEventListener('unhandledrejection',e=>{
    if(document.body.classList.contains('playing'))showBootError(e.reason||new Error('Unhandled promise rejection'));
  });

  const label=document.querySelector('.hud>div:first-child span');
  if(label)label.textContent='ОЧКИ · v14.6';
  console.info('Tank Base v14.6: robust boot controller active');
})();
