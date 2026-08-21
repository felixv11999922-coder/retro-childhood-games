'use strict';
(function(){
  const menu=document.getElementById('menu');
  const game=document.getElementById('game');
  if(!menu||!game)return;

  const root=document.documentElement;
  const body=document.body;

  function setMenuScroll(enabled){
    if(enabled){
      root.style.height='auto';
      root.style.minHeight='100%';
      root.style.overflowX='hidden';
      root.style.overflowY='auto';
      body.style.height='auto';
      body.style.minHeight='100%';
      body.style.overflowX='hidden';
      body.style.overflowY='auto';
      body.style.touchAction='pan-y';
      menu.style.overflow='visible';
      /* Keep vertical gestures inside the page instead of letting Telegram consume them. */
      try{window.Telegram?.WebApp?.disableVerticalSwipes?.()}catch{}
    }else{
      root.style.height='100%';
      root.style.overflow='hidden';
      body.style.height='100%';
      body.style.overflow='hidden';
      body.style.touchAction='none';
      try{window.Telegram?.WebApp?.disableVerticalSwipes?.()}catch{}
      window.scrollTo(0,0);
    }
  }

  function syncMode(){
    const inMenu=!menu.classList.contains('hidden');
    setMenuScroll(inMenu);
  }

  new MutationObserver(syncMode).observe(menu,{attributes:true,attributeFilter:['class']});
  new MutationObserver(syncMode).observe(game,{attributes:true,attributeFilter:['class']});

  window.addEventListener('pageshow',syncMode);
  window.addEventListener('focus',syncMode);
  setTimeout(syncMode,0);
})();
