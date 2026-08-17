'use strict';
(function(){
  const gameEl=document.getElementById('game');
  const stageEl=gameEl?.querySelector('.stage');
  const hudEl=gameEl?.querySelector('.hud');
  const canvasEl=document.getElementById('c');
  if(!gameEl||!stageEl||!hudEl||!canvasEl)return;

  let layoutRAF=0;
  let layoutTimer=0;

  function stableFit(){
    if(gameEl.classList.contains('hidden')||!document.body.classList.contains('playing'))return;

    // Не двигаем сам #game. CSS position:fixed + inset:0 является единственным источником геометрии.
    gameEl.style.removeProperty('left');
    gameEl.style.removeProperty('top');
    gameEl.style.removeProperty('right');
    gameEl.style.removeProperty('bottom');
    gameEl.style.removeProperty('width');
    gameEl.style.removeProperty('height');

    // Сначала даём flex-layout браузеру вычислить реальный stage.
    stageEl.style.removeProperty('height');
    stageEl.style.width='100%';

    const rect=stageEl.getBoundingClientRect();
    if(rect.width<80||rect.height<80)return;

    const pad=8;
    const availableW=Math.max(160,rect.width-pad*2);
    const availableH=Math.max(120,rect.height-pad*2);
    const scale=Math.min(availableW/W,availableH/H);
    const cw=Math.max(1,Math.floor(W*scale));
    const ch=Math.max(1,Math.floor(H*scale));

    canvasEl.style.position='absolute';
    canvasEl.style.left='50%';
    canvasEl.style.top='50%';
    canvasEl.style.transform='translate(-50%,-50%)';
    canvasEl.style.width=cw+'px';
    canvasEl.style.height=ch+'px';
  }

  function stableFitBurst(){
    cancelAnimationFrame(layoutRAF);
    clearTimeout(layoutTimer);
    stableFit();
    layoutRAF=requestAnimationFrame(()=>{
      stableFit();
      requestAnimationFrame(stableFit);
    });
    setTimeout(stableFit,80);
    setTimeout(stableFit,220);
    layoutTimer=setTimeout(stableFit,520);
  }

  // Перехватываем старые функции: теперь все существующие вызовы используют стабильную версию.
  window.fitGame=stableFit;
  window.fitGameBurst=stableFitBurst;
  try{fitGame=stableFit;fitGameBurst=stableFitBurst}catch{}

  const ro=new ResizeObserver(()=>stableFitBurst());
  ro.observe(gameEl);
  ro.observe(stageEl);
  ro.observe(hudEl);

  for(const ev of ['resize','orientationchange','pageshow','focus']){
    window.addEventListener(ev,stableFitBurst,{passive:true});
  }
  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='visible')stableFitBurst();
  });
  if(window.visualViewport){
    visualViewport.addEventListener('resize',stableFitBurst,{passive:true});
    visualViewport.addEventListener('scroll',stableFitBurst,{passive:true});
  }

  // Периодическая страховка от редкого бага Safari после скрытия/показа toolbar.
  setInterval(()=>{
    if(document.body.classList.contains('playing'))stableFit();
  },1000);

  const label=document.querySelector('.hud>div:first-child span');
  if(label)label.textContent='ОЧКИ · v14.1';

  stableFitBurst();
  console.info('Tank Base v14.1: stable iPad layout layer active');
})();
