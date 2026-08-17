'use strict';
(function(){
  const gameEl=document.getElementById('game');
  const stageEl=document.getElementById('stageStable');
  const playfield=document.getElementById('playfieldStable');
  const hudEl=gameEl?.querySelector('.hud');
  const canvasEl=document.getElementById('c');
  if(!gameEl||!stageEl||!playfield||!hudEl||!canvasEl)return;

  let rafId=0,timerId=0,last='';

  function sanitizeLegacyInlineStyles(){
    // Old versions can still try to write geometry. CSS !important owns shell/canvas now;
    // clearing inline values also keeps DevTools/state deterministic.
    for(const p of ['position','inset','left','top','right','bottom','width','height','max-width','max-height','transform','margin']){
      gameEl.style.removeProperty(p);
    }
    for(const p of ['position','inset','left','top','right','bottom','width','height','transform','margin','padding']){
      stageEl.style.removeProperty(p);
    }
    for(const p of ['position','left','top','right','bottom','width','height','transform','margin','max-width','max-height']){
      canvasEl.style.removeProperty(p);
    }
  }

  function fitV145(){
    if(gameEl.classList.contains('hidden')||!document.body.classList.contains('playing'))return;
    sanitizeLegacyInlineStyles();

    const r=playfield.getBoundingClientRect();
    if(r.width<120||r.height<120)return;

    const W=canvasEl.width||900,H=canvasEl.height||600;
    const pad=12;
    const aw=Math.max(100,r.width-pad);
    const ah=Math.max(100,r.height-pad);
    const scale=Math.min(aw/W,ah/H);
    const cw=Math.max(1,Math.floor(W*scale));
    const ch=Math.max(1,Math.floor(H*scale));
    const sig=[Math.round(r.left),Math.round(r.top),Math.round(r.width),Math.round(r.height),cw,ch].join(':');
    if(sig===last)return;
    last=sig;

    // CSS !important reads these variables. No old inline canvas geometry can override them.
    playfield.style.setProperty('--canvas-w',cw+'px');
    playfield.style.setProperty('--canvas-h',ch+'px');
  }

  function burst(){
    last='';
    cancelAnimationFrame(rafId);clearTimeout(timerId);
    fitV145();
    rafId=requestAnimationFrame(()=>{
      last='';fitV145();
      requestAnimationFrame(()=>{last='';fitV145()});
    });
    setTimeout(()=>{last='';fitV145()},70);
    setTimeout(()=>{last='';fitV145()},200);
    timerId=setTimeout(()=>{last='';fitV145()},520);
  }

  // One public layout owner for all legacy callbacks.
  window.fitGame=fitV145;
  window.fitGameBurst=burst;
  try{fitGame=fitV145;fitGameBurst=burst}catch{}

  if('ResizeObserver' in window){
    const ro=new ResizeObserver(()=>burst());
    ro.observe(gameEl);ro.observe(stageEl);ro.observe(playfield);ro.observe(hudEl);
  }

  for(const ev of ['resize','pageshow','focus'])window.addEventListener(ev,burst,{passive:true});
  window.addEventListener('orientationchange',()=>{
    setTimeout(burst,80);setTimeout(burst,240);setTimeout(burst,600);
  },{passive:true});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')burst()});
  if(window.visualViewport){
    visualViewport.addEventListener('resize',burst,{passive:true});
    // Listening is fine; geometry is NEVER derived from visualViewport offsets.
    visualViewport.addEventListener('scroll',burst,{passive:true});
  }

  const mo=new MutationObserver(()=>{
    if(document.body.classList.contains('playing'))burst();
  });
  mo.observe(document.body,{attributes:true,attributeFilter:['class']});

  setInterval(()=>{
    if(document.body.classList.contains('playing'))fitV145();
  },900);

  const label=document.querySelector('.hud>div:first-child span');
  if(label)label.textContent='ОЧКИ · v14.5';
  burst();
  console.info('Tank Base v14.5: fixed-shell CSS-variable layout active');
})();
