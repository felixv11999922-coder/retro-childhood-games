'use strict';
(function(){
  const game=document.getElementById('game');
  const stage=document.getElementById('stageStable');
  const canvas=document.getElementById('c');
  const hud=game?.querySelector('.hud');
  if(!game||!stage||!canvas||!hud)return;
  let raf=0,timer=0,last='';

  function viewport(){
    const vv=window.visualViewport;
    return {
      w:Math.max(320,Math.round(vv?.width||window.innerWidth||320)),
      h:Math.max(320,Math.round(vv?.height||window.innerHeight||320))
    };
  }

  function clearLegacy(){
    for(const el of [game,stage,canvas])for(const p of ['left','top','right','bottom','inset','width','height','max-width','max-height','transform','margin','position'])el.style.removeProperty(p);
  }

  function fit(){
    if(game.classList.contains('hidden')||!document.body.classList.contains('playing'))return;
    clearLegacy();
    const v=viewport();
    document.documentElement.style.setProperty('--game-w',v.w+'px');
    document.documentElement.style.setProperty('--game-h',v.h+'px');

    const hr=hud.getBoundingClientRect();
    const top=Math.max(58,Math.ceil(hr.bottom+6));
    stage.style.setProperty('top',top+'px','important');

    const availableH=Math.max(180,v.h-top-10);
    const sideReserve=(navigator.maxTouchPoints||0)>0?250:20;
    const availableW=Math.max(180,v.w-sideReserve);
    const size=Math.max(160,Math.floor(Math.min(availableH,availableW)));
    const sig=[v.w,v.h,top,size].join(':');
    if(sig===last)return;
    last=sig;
    document.documentElement.style.setProperty('--canvas-size',size+'px');
  }

  function burst(){
    last='';clearTimeout(timer);cancelAnimationFrame(raf);fit();
    raf=requestAnimationFrame(()=>{last='';fit();requestAnimationFrame(()=>{last='';fit()})});
    setTimeout(()=>{last='';fit()},80);
    setTimeout(()=>{last='';fit()},220);
    timer=setTimeout(()=>{last='';fit()},520);
  }

  window.fitGame=fit;window.fitGameBurst=burst;
  try{fitGame=fit;fitGameBurst=burst}catch{}

  if('ResizeObserver' in window){const ro=new ResizeObserver(burst);ro.observe(game);ro.observe(stage);ro.observe(hud)}
  for(const ev of ['resize','pageshow','focus'])window.addEventListener(ev,burst,{passive:true});
  window.addEventListener('orientationchange',()=>{setTimeout(burst,80);setTimeout(burst,240);setTimeout(burst,600)},{passive:true});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')burst()});
  if(window.visualViewport){visualViewport.addEventListener('resize',burst,{passive:true});visualViewport.addEventListener('scroll',burst,{passive:true})}
  const mo=new MutationObserver(()=>{if(document.body.classList.contains('playing'))burst()});
  mo.observe(document.body,{attributes:true,attributeFilter:['class']});
  const label=document.querySelector('.hud>div:first-child span');if(label)label.textContent='ОЧКИ · v14.8';
  burst();
  console.info('Tank Base v14.8: square 600x600 viewport layout active');
})();
