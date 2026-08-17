'use strict';
(function(){
  const tg=window.Telegram&&window.Telegram.WebApp;
  const root=document.documentElement;
  const game=document.getElementById('game');
  const canvas=document.getElementById('c');
  const hud=game?.querySelector('.hud');
  const touchpadWrap=game?.querySelector('.touchpadWrap');
  const fire=game?.querySelector('.fire');
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
    const top=Math.ceil(hudBottom+14);

    // v16.3: measure the real controls, then end the board ABOVE them.
    // This works even when Telegram changes the iPad WebView height or button sizes.
    const tr=touchpadWrap?.getBoundingClientRect();
    const fr=fire?.getBoundingClientRect();
    const tops=[];
    if(tr&&Number.isFinite(tr.top)&&tr.top>top)tops.push(tr.top);
    if(fr&&Number.isFinite(fr.top)&&fr.top>top)tops.push(fr.top);
    const measuredControlsTop=tops.length?Math.min(...tops):h-(146+s.bottom);
    const boardBottom=Math.floor(Math.min(h-s.bottom-12,measuredControlsTop-16));

    const availableH=Math.max(180,boardBottom-top);
    const availableW=Math.max(180,w-s.left-s.right-24);
    const size=Math.floor(Math.min(600,availableW,availableH));
    const boardTop=Math.round(top+size/2);

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

  const scoreLabel=document.querySelector('.hud>div:first-child span');
  if(scoreLabel)scoreLabel.textContent='ОЧКИ · v16.3';

  burst();
  console.info('Tank Base v16.3: measured control lane + tablet board separation active');
})();