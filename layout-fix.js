'use strict';
(function(){
  const game=document.getElementById('game');
  const stage=document.getElementById('stageStable');
  const canvas=document.getElementById('c');
  const hud=game?.querySelector('.hud');
  if(!game||!stage||!canvas||!hud)return;

  let raf=0,timer=0,last='';

  function clearLegacy(){
    // Old game code may still write inline geometry. The v14.9 CSS owns shell/stage/canvas.
    for(const el of [game,stage,canvas]){
      for(const p of ['left','top','right','bottom','inset','width','height','max-width','max-height','transform','margin','position']){
        el.style.removeProperty(p);
      }
    }
  }

  function forceOrigin(){
    try{
      const se=document.scrollingElement||document.documentElement;
      if(se){se.scrollLeft=0;se.scrollTop=0;}
      window.scrollTo(0,0);
    }catch{}
  }

  function fit(){
    if(game.classList.contains('hidden')||!document.body.classList.contains('playing'))return;
    clearLegacy();
    forceOrigin();

    // IMPORTANT: never size the shell from visualViewport.width/height.
    // iPad Safari can report those values in a zoomed coordinate space.
    const gr=game.getBoundingClientRect();
    const hr=hud.getBoundingClientRect();
    const hudHeight=Math.max(52,Math.ceil(hr.bottom-gr.top+6));
    document.documentElement.style.setProperty('--hud-h',hudHeight+'px');

    const sr=stage.getBoundingClientRect();
    if(sr.width<160||sr.height<160)return;

    const touch=(navigator.maxTouchPoints||0)>0||matchMedia('(pointer:coarse)').matches;
    const sideSafety=touch?150:12;
    const availableW=Math.max(160,sr.width-sideSafety*2);
    const availableH=Math.max(160,sr.height-8);
    const size=Math.max(160,Math.floor(Math.min(availableW,availableH,600)));

    const sig=[Math.round(gr.width),Math.round(gr.height),Math.round(sr.width),Math.round(sr.height),hudHeight,size].join(':');
    if(sig===last)return;
    last=sig;
    document.documentElement.style.setProperty('--canvas-size',size+'px');
  }

  function burst(){
    last='';clearTimeout(timer);cancelAnimationFrame(raf);
    fit();
    raf=requestAnimationFrame(()=>{last='';fit();requestAnimationFrame(()=>{last='';fit()})});
    setTimeout(()=>{last='';fit()},70);
    setTimeout(()=>{last='';fit()},200);
    timer=setTimeout(()=>{last='';fit()},520);
  }

  window.fitGame=fit;
  window.fitGameBurst=burst;
  try{fitGame=fit;fitGameBurst=burst}catch{}

  if('ResizeObserver' in window){
    const ro=new ResizeObserver(()=>burst());
    ro.observe(game);ro.observe(stage);ro.observe(hud);
  }
  for(const ev of ['resize','pageshow','focus'])window.addEventListener(ev,burst,{passive:true});
  window.addEventListener('orientationchange',()=>{setTimeout(burst,80);setTimeout(burst,240);setTimeout(burst,600)},{passive:true});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')burst()});
  if(window.visualViewport){
    // Events are useful, but its width/offsets are deliberately ignored.
    visualViewport.addEventListener('resize',burst,{passive:true});
    visualViewport.addEventListener('scroll',burst,{passive:true});
  }
  const mo=new MutationObserver(()=>{if(document.body.classList.contains('playing'))burst()});
  mo.observe(document.body,{attributes:true,attributeFilter:['class']});

  const label=document.querySelector('.hud>div:first-child span');
  if(label)label.textContent='ОЧКИ · v14.9';
  burst();
  console.info('Tank Base v14.9: fixed 100vw shell, visualViewport sizing disabled');
})();
