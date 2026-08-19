'use strict';
(function(){
  const play=document.getElementById('play');
  if(!play)return;

  function showBootError(err){
    console.error('Tank Base boot error:',err);
    let box=document.getElementById('bootError');
    if(!box){
      box=document.createElement('div');box.id='bootError';
      box.style.cssText='position:fixed;left:16px;right:16px;bottom:16px;z-index:999999;background:#5b1d22;color:#fff;border:1px solid #ff8c92;border-radius:14px;padding:14px;font:600 14px/1.35 -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;white-space:pre-wrap;box-shadow:0 12px 40px #0008';
      document.body.appendChild(box);
    }
    box.textContent='Ошибка запуска игры: '+(err&&err.message?err.message:String(err));
  }

  function removeBootError(){
    const box=document.getElementById('bootError');
    if(box)box.remove();
  }

  function isBenignPlatformRejection(reason){
    const name=String(reason&&reason.name||'');
    const msg=String(reason&&reason.message||reason||'').toLowerCase();
    return name==='NotAllowedError'||
      msg.includes('request is not allowed by the user agent')||
      msg.includes('user denied permission')||
      msg.includes('play() failed because the user')||
      msg.includes('audio context was not allowed');
  }

  function robustStart(ev){
    if(ev){ev.preventDefault();ev.stopImmediatePropagation();}
    removeBootError();
    try{
      const se=document.scrollingElement||document.documentElement;
      if(se){se.scrollLeft=0;se.scrollTop=0;}
      window.scrollTo(0,0);
      document.documentElement.style.overflow='hidden';
      document.body.classList.add('playing');
      const game=document.getElementById('game');
      const over=document.getElementById('over');
      const pauseModal=document.getElementById('pauseModal');
      if(!game)throw new Error('Не найден #game');
      game.classList.remove('hidden');
      if(over)over.classList.add('hidden');
      if(pauseModal)pauseModal.classList.add('hidden');
      if(typeof audio==='function')audio();
      if(typeof resetCampaign!=='function')throw new Error('resetCampaign не загружен');
      resetCampaign();
    }catch(err){
      document.body.classList.remove('playing');
      const game=document.getElementById('game');if(game)game.classList.add('hidden');
      document.documentElement.style.overflow='';showBootError(err);
    }
  }

  play.addEventListener('click',robustStart,true);

  window.addEventListener('error',e=>{
    if(!document.body.classList.contains('playing'))return;
    const err=e.error||new Error(e.message||'JavaScript error');
    if(isBenignPlatformRejection(err)){
      console.info('Ignored benign Telegram/iOS media restriction:',err);
      removeBootError();
      return;
    }
    console.error('Runtime error while game is open:',err);
  });

  window.addEventListener('unhandledrejection',e=>{
    const reason=e.reason||new Error('Unhandled promise rejection');
    if(isBenignPlatformRejection(reason)){
      e.preventDefault();
      console.info('Ignored benign Telegram/iOS promise rejection:',reason);
      removeBootError();
      return;
    }
    // Third-party SDKs (including ad/video SDKs) may reject promises after their
    // overlay closes. Do not mislabel these as a game-launch failure.
    console.warn('Unhandled promise rejection while game is open:',reason);
  });

  const label=document.querySelector('.hud>div:first-child span');
  if(label)label.textContent='ОЧКИ · v16.8';
  console.info('Tank Base v16.8: Telegram-safe boot active');
})();
