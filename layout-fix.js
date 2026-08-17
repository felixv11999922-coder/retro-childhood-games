'use strict';
(function(){
  const gameEl=document.getElementById('game');
  const stageEl=gameEl?.querySelector('.stageV143');
  const hudEl=gameEl?.querySelector('.hud');
  const playfield=document.getElementById('playfield');
  const canvasEl=document.getElementById('c');
  if(!gameEl||!stageEl||!hudEl||!playfield||!canvasEl)return;

  let rafId=0,timerId=0,last='';

  function fitV143(){
    if(gameEl.classList.contains('hidden')||!document.body.classList.contains('playing'))return;

    // Старые движки могли записать inline-координаты. Полностью очищаем их.
    for(const p of ['left','top','right','bottom','width','height','transform'])gameEl.style.removeProperty(p);
    stageEl.style.removeProperty('height');
    stageEl.style.removeProperty('width');

    const r=playfield.getBoundingClientRect();
    if(r.width<120||r.height<120)return;

    const W=canvasEl.width||900,H=canvasEl.height||600;
    const gap=8;
    const aw=Math.max(100,r.width-gap*2);
    const ah=Math.max(100,r.height-gap*2);
    const scale=Math.min(aw/W,ah/H);
    const cw=Math.max(1,Math.floor(W*scale));
    const ch=Math.max(1,Math.floor(H*scale));
    const sig=[Math.round(r.width),Math.round(r.height),cw,ch].join(':');
    if(sig===last)return;
    last=sig;

    // Никаких absolute/translate: canvas — обычный flex-элемент внутри playfield.
    canvasEl.style.position='relative';
    canvasEl.style.left='auto';
    canvasEl.style.top='auto';
    canvasEl.style.right='auto';
    canvasEl.style.bottom='auto';
    canvasEl.style.transform='none';
    canvasEl.style.margin='0';
    canvasEl.style.width=cw+'px';
    canvasEl.style.height=ch+'px';
  }

  function burst(){
    last='';
    cancelAnimationFrame(rafId);clearTimeout(timerId);
    fitV143();
    rafId=requestAnimationFrame(()=>{last='';fitV143();requestAnimationFrame(()=>{last='';fitV143()})});
    setTimeout(()=>{last='';fitV143()},70);
    setTimeout(()=>{last='';fitV143()},200);
    timerId=setTimeout(()=>{last='';fitV143()},560);
  }

  window.fitGame=fitV143;
  window.fitGameBurst=burst;
  try{fitGame=fitV143;fitGameBurst=burst}catch{}

  if('ResizeObserver' in window){
    const ro=new ResizeObserver(()=>burst());
    ro.observe(gameEl);ro.observe(stageEl);ro.observe(playfield);ro.observe(hudEl);
  }

  for(const ev of ['resize','pageshow','focus'])window.addEventListener(ev,burst,{passive:true});
  window.addEventListener('orientationchange',()=>{setTimeout(burst,80);setTimeout(burst,240);setTimeout(burst,600)},{passive:true});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')burst()});
  if(window.visualViewport){
    visualViewport.addEventListener('resize',burst,{passive:true});
    visualViewport.addEventListener('scroll',burst,{passive:true});
  }

  setInterval(()=>{if(document.body.classList.contains('playing'))fitV143()},700);

  const label=document.querySelector('.hud>div:first-child span');
  if(label)label.textContent='ОЧКИ · v14.3';
  burst();
  console.info('Tank Base v14.3: fixed 3-column iPad layout active');
})();
