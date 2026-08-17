'use strict';
(function(){
  const tg=window.Telegram&&window.Telegram.WebApp;
  const root=document.documentElement;
  const game=document.getElementById('game');
  const canvas=document.getElementById('c');
  const hud=game?.querySelector('.hud');
  const touchpad=game?.querySelector('.touchpadWrap');
  const fire=game?.querySelector('.fire');
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
  function viewport(){
    const de=document.documentElement;
    return {w:Math.max(1,de.clientWidth||window.innerWidth||0),h:Math.max(1,window.innerHeight||de.clientHeight||0)};
  }

  function setBaseTabletLayout(){
    if(!game||!canvas||game.classList.contains('hidden')||!document.body.classList.contains('playing'))return false;
    const {w,h}=viewport();
    const tablet=w>=430&&h>=560;
    root.classList.toggle('telegram-tablet',tablet);
    if(!tablet){
      for(const v of ['--tg-board-px','--tg-board-y','--tg-controls-top'])root.style.removeProperty(v);
      return false;
    }

    const s=safeInsets();
    const hr=hud?.getBoundingClientRect();
    const hudBottom=Math.max(s.top+50,hr?.bottom||0);

    // Dedicated bottom lane. Make it deliberately taller than both controls.
    const boardY=Math.ceil(hudBottom+6);
    const controlLaneHeight=150;
    const controlsTop=Math.max(boardY+190,Math.floor(h-s.bottom-controlLaneHeight));
    const gap=30;
    const maxBoardBottom=controlsTop-gap;
    const availableH=Math.max(170,maxBoardBottom-boardY);
    const availableW=Math.max(170,w-s.left-s.right-24);
    const size=Math.floor(Math.min(600,availableW,availableH));

    cssPx('--tg-board-px',size);
    cssPx('--tg-board-y',boardY);
    cssPx('--tg-controls-top',controlsTop);
    return true;
  }

  function enforceNoOverlap(){
    if(!root.classList.contains('telegram-tablet')||!canvas)return;
    const cr=canvas.getBoundingClientRect();
    const tr=touchpad?.getBoundingClientRect();
    const fr=fire?.getBoundingClientRect();
    const hr=hud?.getBoundingClientRect();
    const controlTops=[tr?.top,fr?.top].filter(v=>Number.isFinite(v));
    if(!controlTops.length)return;

    const safeGap=28;
    const controlsTop=Math.min(...controlTops);
    const allowedBottom=controlsTop-safeGap;
    let overlap=cr.bottom-allowedBottom;
    if(overlap<=0)return;

    // First move the board upward by the exact rendered overlap.
    const currentY=parseFloat(getComputedStyle(root).getPropertyValue('--tg-board-y'))||0;
    const minY=(hr?.bottom||0)+4;
    const movable=Math.max(0,currentY-minY);
    const shift=Math.min(movable,overlap+2);
    if(shift>0){
      cssPx('--tg-board-y',currentY-shift);
      overlap-=shift;
    }

    // If there still is overlap, shrink the board. This is the hard guarantee:
    // rendered canvas.bottom must stay above the rendered controls.top.
    if(overlap>0){
      const currentSize=parseFloat(getComputedStyle(root).getPropertyValue('--tg-board-px'))||cr.width;
      const newSize=Math.max(170,currentSize-overlap-4);
      cssPx('--tg-board-px',newSize);
    }
  }

  let timer=0;
  function pass(){syncTelegramVars();if(setBaseTabletLayout())requestAnimationFrame(enforceNoOverlap)}
  function burst(){
    clearTimeout(timer);pass();
    requestAnimationFrame(()=>{pass();requestAnimationFrame(enforceNoOverlap)});
    setTimeout(()=>{pass();enforceNoOverlap()},90);
    setTimeout(()=>{pass();enforceNoOverlap()},240);
    timer=setTimeout(()=>{pass();enforceNoOverlap()},560);
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
  if(scoreLabel)scoreLabel.textContent='ОЧКИ · v16.7';
  burst();
  console.info('Tank Base v16.7: rendered overlap guard active');
})();