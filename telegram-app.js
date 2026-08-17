'use strict';
(function(){
  const tg=window.Telegram&&window.Telegram.WebApp;
  const root=document.documentElement;
  const game=document.getElementById('game');
  const canvas=document.getElementById('c');
  const hud=game?.querySelector('.hud');
  if(!tg){root.classList.add('browser-mode');return;}

  root.classList.add('telegram-mode');
  try{tg.ready();tg.expand();}catch(e){}
  try{if(tg.disableVerticalSwipes)tg.disableVerticalSwipes();}catch(e){}

  function cssPx(name,v){if(Number.isFinite(v)&&v>=0)root.style.setProperty(name,Math.round(v)+'px')}
  function safeInsets(){
    const sa=tg.safeAreaInset||{},ca=tg.contentSafeAreaInset||{};
    return {
      top:Math.max(sa.top||0,ca.top||0),
      right:Math.max(sa.right||0,ca.right||0),
      bottom:Math.max(sa.bottom||0,ca.bottom||0),
      left:Math.max(sa.left||0,ca.left||0)
    };
  }

  function syncTelegramVars(){
    cssPx('--tg-vh',tg.viewportHeight||window.innerHeight);
    cssPx('--tg-stable-vh',tg.viewportStableHeight||tg.viewportHeight||window.innerHeight);
    const s=safeInsets();
    cssPx('--tg-safe-top',s.top);cssPx('--tg-safe-right',s.right);cssPx('--tg-safe-bottom',s.bottom);cssPx('--tg-safe-left',s.left);
  }

  function actualViewport(){
    const de=document.documentElement;
    const w=Math.max(1,de.clientWidth||window.innerWidth||0);
    const h=Math.max(1,window.innerHeight||de.clientHeight||0);
    return {w,h};
  }

  function fitTabletBoard(){
    if(!game||!canvas||game.classList.contains('hidden')||!document.body.classList.contains('playing'))return;
    const {w,h}=actualViewport();
    const tablet=w>=430&&h>=560;
    root.classList.toggle('telegram-tablet',tablet);
    if(!tablet){
      root.style.removeProperty('--tg-board-px');
      root.style.removeProperty('--tg-board-top');
      return;
    }

    const s=safeInsets();
    const hr=hud?.getBoundingClientRect();
    const hudBottom=Math.max(s.top+50,hr?.bottom||0);
    const top=Math.ceil(hudBottom+12);

    // Leave the bottom controls their own lane. The board itself is calculated from
    // the REAL WebView dimensions, not Telegram viewportStableHeight.
    const controlLane=132+s.bottom;
    const bottom=Math.max(top+180,h-controlLane);
    const availableH=Math.max(180,bottom-top);
    const availableW=Math.max(180,w-s.left-s.right-28);
    const size=Math.floor(Math.min(600,availableW,availableH));
    const boardTop=Math.round(top+availableH/2);

    cssPx('--tg-board-px',size);
    cssPx('--tg-board-top',boardTop);
  }

  let timer=0;
  function burst(){
    syncTelegramVars();
    clearTimeout(timer);
    fitTabletBoard();
    requestAnimationFrame(()=>{syncTelegramVars();fitTabletBoard()});
    setTimeout(()=>{syncTelegramVars();fitTabletBoard()},80);
    setTimeout(()=>{syncTelegramVars();fitTabletBoard()},220);
    timer=setTimeout(()=>{syncTelegramVars();fitTabletBoard()},520);
  }

  async function enterGameMode(){
    try{tg.expand();}catch(e){}
    try{if(tg.requestFullscreen&&!tg.isFullscreen)tg.requestFullscreen();}catch(e){}
    try{if(tg.lockOrientation)tg.lockOrientation();}catch(e){}
    setTimeout(burst,0);
  }
  function leaveGameMode(){
    try{if(tg.unlockOrientation)tg.unlockOrientation();}catch(e){}
    root.classList.remove('telegram-tablet');
  }

  document.getElementById('play')?.addEventListener('click',enterGameMode,true);
  document.getElementById('toMenu')?.addEventListener('click',leaveGameMode,true);
  document.getElementById('pauseMenu')?.addEventListener('click',leaveGameMode,true);

  try{
    tg.onEvent('viewportChanged',burst);
    tg.onEvent('safeAreaChanged',burst);
    tg.onEvent('contentSafeAreaChanged',burst);
    tg.onEvent('fullscreenChanged',burst);
  }catch(e){}
  window.addEventListener('resize',burst,{passive:true});
  window.addEventListener('orientationchange',()=>setTimeout(burst,180),{passive:true});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')burst()});

  // Remove stale version text left by older compatibility scripts.
  const scoreLabel=document.querySelector('.hud>div:first-child span');
  if(scoreLabel)scoreLabel.textContent='ОЧКИ · v16.2';

  burst();
  console.info('Tank Base v16.2: actual WebView tablet sizing active');
})();