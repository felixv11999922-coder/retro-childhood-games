'use strict';
(function(){
  const gameEl=document.getElementById('game');
  const stageEl=gameEl?.querySelector('.stage');
  const hudEl=gameEl?.querySelector('.hud');
  const canvasEl=document.getElementById('c');
  const padWrap=gameEl?.querySelector('.touchpadWrap');
  const fireBtn=gameEl?.querySelector('.fire');
  if(!gameEl||!stageEl||!hudEl||!canvasEl)return;

  const touchMode=(navigator.maxTouchPoints||0)>0||matchMedia('(pointer:coarse)').matches;
  let layoutRAF=0,layoutTimer=0,lastSignature='';

  function n(v){v=parseFloat(v);return Number.isFinite(v)?v:0}
  function size(el){if(!el)return {w:0,h:0};const r=el.getBoundingClientRect();return {w:Math.ceil(r.width||0),h:Math.ceil(r.height||0)}}

  function stableFit(){
    if(gameEl.classList.contains('hidden')||!document.body.classList.contains('playing'))return;

    // Единственный источник геометрии страницы — CSS fixed/inset:0.
    // Не используем visualViewport offsets: Safari на iPad иногда отдаёт их скачками.
    for(const p of ['left','top','right','bottom','width','height'])gameEl.style.removeProperty(p);

    stageEl.style.removeProperty('height');
    stageEl.style.width='100%';
    stageEl.style.minWidth='0';

    const sr=stageEl.getBoundingClientRect();
    if(sr.width<220||sr.height<160)return;

    // На touch-устройствах игровая карта должна жить между органами управления,
    // а не под ними. Резервируем реальные размеры джойстика и кнопки.
    let leftReserve=8,rightReserve=8,bottomReserve=8;
    if(touchMode){
      const ps=size(padWrap),fs=size(fireBtn);
      leftReserve=Math.max(118,ps.w+22);
      rightReserve=Math.max(100,fs.w+26);
      bottomReserve=10;
    }

    // На небольшом экране не позволяем резервам съесть карту целиком.
    const maxReserve=Math.max(0,sr.width-300);
    if(leftReserve+rightReserve>maxReserve&&maxReserve>0){
      const k=maxReserve/(leftReserve+rightReserve);
      leftReserve=Math.floor(leftReserve*k);
      rightReserve=Math.floor(rightReserve*k);
    }

    const innerW=Math.max(220,sr.width-leftReserve-rightReserve-12);
    const innerH=Math.max(160,sr.height-bottomReserve-12);
    const W=canvasEl.width||900,H=canvasEl.height||600;
    const scale=Math.min(innerW/W,innerH/H);
    const cw=Math.max(1,Math.floor(W*scale));
    const ch=Math.max(1,Math.floor(H*scale));

    // Центр не всего stage, а свободной зоны между джойстиком и ОГОНЬ.
    const centerX=leftReserve+innerW/2+6;
    const centerY=(sr.height-bottomReserve)/2;

    const sig=[Math.round(sr.width),Math.round(sr.height),leftReserve,rightReserve,cw,ch].join(':');
    if(sig===lastSignature)return;
    lastSignature=sig;

    canvasEl.style.position='absolute';
    canvasEl.style.left=centerX+'px';
    canvasEl.style.top=centerY+'px';
    canvasEl.style.right='auto';
    canvasEl.style.bottom='auto';
    canvasEl.style.transform='translate(-50%,-50%)';
    canvasEl.style.width=cw+'px';
    canvasEl.style.height=ch+'px';
    canvasEl.style.margin='0';
  }

  function stableFitBurst(){
    lastSignature='';
    cancelAnimationFrame(layoutRAF);clearTimeout(layoutTimer);
    stableFit();
    layoutRAF=requestAnimationFrame(()=>{lastSignature='';stableFit();requestAnimationFrame(()=>{lastSignature='';stableFit()})});
    setTimeout(()=>{lastSignature='';stableFit()},70);
    setTimeout(()=>{lastSignature='';stableFit()},190);
    layoutTimer=setTimeout(()=>{lastSignature='';stableFit()},480);
  }

  // Все последующие вызовы игрового кода переводим на один layout engine.
  window.fitGame=stableFit;window.fitGameBurst=stableFitBurst;
  try{fitGame=stableFit;fitGameBurst=stableFitBurst}catch{}

  if('ResizeObserver'in window){
    const ro=new ResizeObserver(()=>stableFitBurst());
    ro.observe(gameEl);ro.observe(stageEl);ro.observe(hudEl);
  }

  for(const ev of ['resize','pageshow','focus'])window.addEventListener(ev,stableFitBurst,{passive:true});
  window.addEventListener('orientationchange',()=>{setTimeout(stableFitBurst,80);setTimeout(stableFitBurst,240);setTimeout(stableFitBurst,520)},{passive:true});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')stableFitBurst()});
  if(window.visualViewport){
    visualViewport.addEventListener('resize',stableFitBurst,{passive:true});
    visualViewport.addEventListener('scroll',stableFitBurst,{passive:true});
  }

  setInterval(()=>{if(document.body.classList.contains('playing'))stableFit()},900);

  const label=document.querySelector('.hud>div:first-child span');
  if(label)label.textContent='ОЧКИ · v14.2';
  stableFitBurst();
  console.info('Tank Base v14.2: iPad safe-zone layout active');
})();
