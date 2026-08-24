'use strict';
(function(){
  const A=window.SAV8;if(!A)return;
  // Keep one world scale across portrait and landscape. The previous 1200px
  // virtual height made actors tiny on wide iPad/desktop Telegram windows.
  A.VH=900;
  A.ground=function(x){
    let y=A.VH*.765;
    const t=A.meta().theme;
    if(t==='canyon')y+=Math.sin(x*.004)*15;
    if(t==='swamp')y+=Math.sin(x*.006)*10;
    if(t==='snow')y+=Math.sin(x*.0032)*7;
    return y;
  };
  // Pits stay mission-specific, but use the same world X logic.
  A.pit=function(x){
    if(!['river','snow','city','reactor'].includes(A.meta().theme))return false;
    const q=(x-1180)%1280;
    return x>1180&&q>850&&q<970;
  };
  A.resize();
})();