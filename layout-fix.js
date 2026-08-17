'use strict';
(function(){
  const gameEl=document.getElementById('game');
  const stageEl=gameEl?.querySelector('.stageV143');
  const hudEl=gameEl?.querySelector('.hud');
  const playfield=document.getElementById('playfield');
  const canvasEl=document.getElementById('c');
  if(!gameEl||!stageEl||!hudEl||!playfield||!canvasEl)return;

  let rafId=0,timerId=0,last='';

  function viewportBox(){
    const vv=window.visualViewport;
    if(vv){
      return {
        x:(window.scrollX||0)+(vv.offsetLeft||0),
        y:(window.scrollY||0)+(vv.offsetTop||0),
        w:Math.max(320,Math.floor(vv.width)),
        h:Math.max(260,Math.floor(vv.height))
      };
    }
    return {x:window.scrollX||0,y:window.scrollY||0,w:Math.max(320,window.innerWidth||320),h:Math.max(260,window.innerHeight||260)};
  }

  function applyViewportShell(){
    const v=viewportBox();
    // Absolute positioning against the document + visualViewport offsets means the game follows
    // the actually visible Safari window even if the visual viewport is panned/zoomed.
    gameEl.style.setProperty('position','absolute','important');
    gameEl.style.setProperty('inset','auto','important');
    gameEl.style.setProperty('left',v.x+'px','important');
    gameEl.style.setProperty('top',v.y+'px','important');
    gameEl.style.setProperty('right','auto','important');
    gameEl.style.setProperty('bottom','auto','important');
    gameEl.style.setProperty('width',v.w+'px','important');
    gameEl.style.setProperty('height',v.h+'px','important');
    return v;
  }

  function fitV144(){
    if(gameEl.classList.contains('hidden')||!document.body.classList.contains('playing'))return;
    const v=applyViewportShell();

    // Make rail widths deterministic from the visible viewport, not from page/layout width.
    const touch=(navigator.maxTouchPoints||0)>0||matchMedia('(pointer:coarse)').matches;
    let leftRail=0,rightRail=0;
    if(touch){
      leftRail=Math.max(104,Math.min(138,Math.round(v.w*.095)));
      rightRail=Math.max(88,Math.min(108,Math.round(v.w*.073)));
    }
    stageEl.style.setProperty('--left-rail',leftRail+'px');
    stageEl.style.setProperty('--right-rail',rightRail+'px');

    const r=playfield.getBoundingClientRect();
    if(r.width<120||r.height<120)return;

    const W=canvasEl.width||900,H=canvasEl.height||600;
    const pad=8;
    const aw=Math.max(100,r.width-pad*2);
    const ah=Math.max(100,r.height-pad*2);
    const scale=Math.min(aw/W,ah/H);
    const cw=Math.max(1,Math.floor(W*scale));
    const ch=Math.max(1,Math.floor(H*scale));
    const sig=[Math.round(v.x),Math.round(v.y),v.w,v.h,Math.round(r.width),Math.round(r.height),leftRail,rightRail,cw,ch].join(':');
    if(sig===last)return;
    last=sig;

    canvasEl.style.setProperty('position','relative','important');
    canvasEl.style.setProperty('left','auto','important');
    canvasEl.style.setProperty('top','auto','important');
    canvasEl.style.setProperty('right','auto','important');
    canvasEl.style.setProperty('bottom','auto','important');
    canvasEl.style.setProperty('transform','none','important');
    canvasEl.style.setProperty('margin','0','important');
    canvasEl.style.setProperty('width',cw+'px','important');
    canvasEl.style.setProperty('height',ch+'px','important');
  }

  function burst(){
    last='';
    cancelAnimationFrame(rafId);clearTimeout(timerId);
    fitV144();
    rafId=requestAnimationFrame(()=>{last='';fitV144();requestAnimationFrame(()=>{last='';fitV144()})});
    setTimeout(()=>{last='';fitV144()},60);
    setTimeout(()=>{last='';fitV144()},180);
    timerId=setTimeout(()=>{last='';fitV144()},480);
  }

  // This is now the only layout engine. Old anonymous callbacks call these bindings dynamically.
  window.fitGame=fitV144;
  window.fitGameBurst=burst;
  try{fitGame=fitV144;fitGameBurst=burst}catch{}

  if('ResizeObserver' in window){
    const ro=new ResizeObserver(()=>burst());
    ro.observe(playfield);ro.observe(hudEl);
  }

  for(const ev of ['resize','pageshow','focus','scroll'])window.addEventListener(ev,burst,{passive:true});
  window.addEventListener('orientationchange',()=>{setTimeout(burst,60);setTimeout(burst,180);setTimeout(burst,480)},{passive:true});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')burst()});
  if(window.visualViewport){
    visualViewport.addEventListener('resize',burst,{passive:true});
    visualViewport.addEventListener('scroll',burst,{passive:true});
  }

  setInterval(()=>{if(document.body.classList.contains('playing'))fitV144()},900);

  const label=document.querySelector('.hud>div:first-child span');
  if(label)label.textContent='ОЧКИ · v14.4';
  burst();
  console.info('Tank Base v14.4: single visual-viewport layout engine active');
})();