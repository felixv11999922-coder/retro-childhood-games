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
    return {top:Math.max(sa.top||0,ca.top||0),right:Math.max(sa.right||0,ca.right||0),bottom:Math.max(sa.bottom||0,ca.bottom||0),left:Math.max(sa.left||0,ca.left||0)};
  }
  function syncTelegramVars(){
    cssPx('--tg-vh',tg.viewportHeight||window.innerHeight);
    cssPx('--tg-stable-vh',tg.viewportStableHeight||tg.viewportHeight||window.innerHeight);
    const s=safeInsets();
    cssPx('--tg-safe-top',s.top);cssPx('--tg-safe-right',s.right);cssPx('--tg-safe-bottom',s.bottom);cssPx('--tg-safe-left',s.left);
  }
  function actualViewport(){
    const de=document.documentElement;
    return {w:Math.max(1,de.clientWidth||window.innerWidth||0),h:Math.max(1,window.innerHeight||de.clientHeight||0)};
  }
  function fitTabletBoard(){
    if(!game||!canvas||game.classList.contains('hidden')||!document.body.classList.contains('playing'))return;
    const {w,h}=actualViewport();
    const tablet=w>=430&&h>=560;
    root.classList.toggle('telegram-tablet',tablet);
    if(!tablet){
      for(const v of ['--tg-board-px','--tg-board-top','--tg-controls-top'])root.style.removeProperty(v);
      return;
    }

    const s=safeInsets();
    const hr=hud?.getBoundingClientRect();
    const hudBottom=Math.max(s.top+50,hr?.bottom||0);

    // v16.5: pull the whole battlefield upward on iPad while keeping controls
    // in their own bottom lane. We intentionally use only a tiny gap below HUD.
    const boardStart=Math.ceil(Math.max(s.top+54,hudBottom+4));
    const laneHeight=126;
    const laneBottom=Math.floor(h-s.bottom-10);
    const controlsTop=Math.max(boardStart+190,laneBottom-laneHeight);
    const boardEnd=Math.max(boardStart+180,controlsTop-18);

    const availableH=Math.max(180,boardEnd-boardStart);
    const availableW=Math.max(180,w-s.left-s.right-24);
    const size=Math.floor(Math.min(600,availableW,availableH));

    // Additional tablet lift: move the square up, but never above the HUD safe line.
    const desiredLift=34;
    const naturalTop=boardStart+size/2;
    const minTop=hudBottom+4+size/2;
    const boardTop=Math.max(minTop,naturalTop-desiredLift);

    cssPx('--tg-board-px',size);
    cssPx('--tg-board-top',boardTop);
    cssPx('--tg-controls-top',controlsTop);
  }

  let timer=0;
  function burst(){
    syncTelegramVars();clearTimeout(timer);fitTabletBoard();
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
    tg.onEvent('viewportChanged',burst);tg.onEvent('safeAreaChanged',burst);tg.onEvent('contentSafeAreaChanged',burst);tg.onEvent('fullscreenChanged',burst);
  }catch(e){}
  window.addEventListener('resize',burst,{passive:true});
  window.addEventListener('orientationchange',()=>setTimeout(burst,180),{passive:true});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')burst()});

  const scoreLabel=document.querySelector('.hud>div:first-child span');
  if(scoreLabel)scoreLabel.textContent='ОЧКИ · v16.5';
  burst();
  console.info('Tank Base v16.5: iPad battlefield shifted upward');
})();