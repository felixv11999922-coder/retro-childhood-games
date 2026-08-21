'use strict';
(function(){
  const play=document.getElementById('play');
  if(!play)return;

  let lastStart=0;
  function currentPlayableCard(){
    return document.querySelector('.levelCard.current:not(.locked)')||document.querySelector('.levelCard:not(.locked)');
  }
  function forceStart(e){
    const now=Date.now();
    if(now-lastStart<700)return;
    const card=currentPlayableCard();
    if(!card)return;
    lastStart=now;
    try{e?.preventDefault?.();e?.stopImmediatePropagation?.();e?.stopPropagation?.()}catch{}
    card.click();
  }

  // Telegram iOS may suppress the synthetic click after a touch gesture inside an iframe.
  // Start on pointer/touch release and keep click as a desktop fallback.
  if(window.PointerEvent){
    play.addEventListener('pointerup',forceStart,{capture:true,passive:false});
  }else{
    play.addEventListener('touchend',forceStart,{capture:true,passive:false});
  }
  play.addEventListener('click',function(e){
    // Native onclick from steel-assault.js normally handles desktop clicks.
    // If it has not switched to game mode, force the selected level on the next frame.
    requestAnimationFrame(function(){
      const game=document.getElementById('game');
      if(game&&game.classList.contains('hidden'))forceStart(e);
    });
  },true);
})();
