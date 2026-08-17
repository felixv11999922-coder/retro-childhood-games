'use strict';
(function(){
  const gameEl=document.getElementById('game');
  const stageEl=document.getElementById('stageStable');
  const playfield=document.getElementById('playfieldStable');
  const hudEl=gameEl?.querySelector('.hud');
  const canvasEl=document.getElementById('c');
  if(!gameEl||!stageEl||!playfield||!hudEl||!canvasEl)return;

  let rafId=0,timerId=0,last='';

  function clearLegacyGeometry(){
    for(const el of [gameEl,stageEl,canvasEl]){
      for(const p of ['position','inset','left','top','right','bottom','width','height','max-width','max-height','transform','margin'])el.style.removeProperty(p);
    }
  }

  function forceOrigin(){
    try{
      const se=document.scrollingElement||document.documentElement;
      if(se){se.scrollLeft=0;se.scrollTop=0;}
      if(window.scrollX!==0||window.scrollY!==0)window.scrollTo(0,0);
    }catch{}
  }

  function fitV147(){
    if(gameEl.classList.contains('hidden')||!document.body.classList.contains('playing'))return;
    clearLegacyGeometry();
    forceOrigin();

    const r=playfield.getBoundingClientRect();
    if(r.width<100||r.height<100)return;

    const W=canvasEl.width||900,H=canvasEl.height||600;
    const aw=Math.max(80,r.width-8),ah=Math.max(80,r.height-8);
    const scale=Math.min(aw/W,ah/H);
    const cw=Math.max(1,Math.floor(W*scale));
    const ch=Math.max(1,Math.floor(H*scale));
    const vv=window.visualViewport;
    const sig=[Math.round(r.left),Math.round(r.top),Math.round(r.width),Math.round(r.height),cw,ch,Math.round(vv?.width||window.innerWidth),Math.round(vv?.height||window.innerHeight)].join(':');
    if(sig===last)return;
    last=sig;

    playfield.style.setProperty('--canvas-w',cw+'px');
    playfield.style.setProperty('--canvas-h',ch+'px');
  }

  function burst(){
    last='';
    cancelAnimationFrame(rafId);clearTimeout(timerId);
    forceOrigin();fitV147();
    rafId=requestAnimationFrame(()=>{last='';fitV147();requestAnimationFrame(()=>{last='';fitV147()})});
    setTimeout(()=>{last='';fitV147()},60);
    setTimeout(()=>{last='';fitV147()},180);
    timerId=setTimeout(()=>{last='';fitV147()},480);
  }

  window.fitGame=fitV147;
  window.fitGameBurst=burst;
  try{fitGame=fitV147;fitGameBurst=burst}catch{}

  if('ResizeObserver' in window){
    const ro=new ResizeObserver(()=>burst());
    ro.observe(gameEl);ro.observe(stageEl);ro.observe(playfield);ro.observe(hudEl);
  }
  for(const ev of ['resize','pageshow','focus'])window.addEventListener(ev,burst,{passive:true});
  window.addEventListener('orientationchange',()=>{setTimeout(burst,60);setTimeout(burst,180);setTimeout(burst,520)},{passive:true});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')burst()});
  if(window.visualViewport){visualViewport.addEventListener('resize',burst,{passive:true});visualViewport.addEventListener('scroll',burst,{passive:true});}
  const mo=new MutationObserver(()=>{if(document.body.classList.contains('playing'))burst()});
  mo.observe(document.body,{attributes:true,attributeFilter:['class']});

  const label=document.querySelector('.hud>div:first-child span');
  if(label)label.textContent='ОЧКИ · v14.7';
  burst();
  console.info('Tank Base v14.7: cache-clean centered layout active');
})();
