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

  // Preflight only. Do not prevent/stop the click: app-core owns the actual
  // game start, while Telegram layout and analytics also need the same click.
  function preflight(){
    removeBootError();
    if(typeof play.onclick!=='function'){
      showBootError(new Error('Игровой модуль не загрузился. Полностью закройте Mini App и откройте снова.'));
    }
  }
  play.addEventListener('click',preflight,true);

  window.addEventListener('error',e=>{
    const err=e.error||new Error(e.message||'JavaScript error');
    if(isBenignPlatformRejection(err)){
      console.info('Ignored benign Telegram/iOS media restriction:',err);
      removeBootError();
      return;
    }
    if(document.body.classList.contains('playing'))showBootError(err);
    else console.error('Runtime error:',err);
  });

  window.addEventListener('unhandledrejection',e=>{
    const reason=e.reason||new Error('Unhandled promise rejection');
    if(isBenignPlatformRejection(reason)){
      e.preventDefault();
      console.info('Ignored benign Telegram/iOS promise rejection:',reason);
      removeBootError();
      return;
    }
    console.warn('Unhandled promise rejection while game is open:',reason);
  });

  console.info('Tank Base: Telegram-safe boot preflight active');
})();
