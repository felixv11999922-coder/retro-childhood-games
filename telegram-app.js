'use strict';
(function(){
  const tg=window.Telegram&&window.Telegram.WebApp;
  const root=document.documentElement;
  if(!tg){root.classList.add('browser-mode');return;}
  root.classList.add('telegram-mode');
  try{tg.ready();tg.expand();}catch(e){}
  try{if(tg.disableVerticalSwipes)tg.disableVerticalSwipes();}catch(e){}

  function cssPx(name,v){if(Number.isFinite(v)&&v>0)root.style.setProperty(name,v+'px')}
  function sync(){
    cssPx('--tg-vh',tg.viewportHeight);
    cssPx('--tg-stable-vh',tg.viewportStableHeight||tg.viewportHeight);
    const sa=tg.safeAreaInset||{};
    const ca=tg.contentSafeAreaInset||{};
    root.style.setProperty('--tg-safe-top',Math.max(sa.top||0,ca.top||0)+'px');
    root.style.setProperty('--tg-safe-right',Math.max(sa.right||0,ca.right||0)+'px');
    root.style.setProperty('--tg-safe-bottom',Math.max(sa.bottom||0,ca.bottom||0)+'px');
    root.style.setProperty('--tg-safe-left',Math.max(sa.left||0,ca.left||0)+'px');
  }
  sync();
  try{tg.onEvent('viewportChanged',sync);tg.onEvent('safeAreaChanged',sync);tg.onEvent('contentSafeAreaChanged',sync);}catch(e){}

  async function enterGameMode(){
    try{tg.expand();}catch(e){}
    try{if(tg.requestFullscreen&&!tg.isFullscreen)tg.requestFullscreen();}catch(e){}
    try{if(tg.lockOrientation)tg.lockOrientation();}catch(e){}
    sync();
  }
  function leaveGameMode(){try{if(tg.unlockOrientation)tg.unlockOrientation();}catch(e){}}
  document.getElementById('play')?.addEventListener('click',enterGameMode,true);
  document.getElementById('toMenu')?.addEventListener('click',leaveGameMode,true);
  document.getElementById('pauseMenu')?.addEventListener('click',leaveGameMode,true);
  console.info('Tank Base v16.0: Telegram Mini App integration active');
})();