'use strict';
(function(){
  const actors=document.getElementById('saPhotoActors');
  const canvas=document.getElementById('gameCanvas');
  if(!actors||!canvas)return;

  /*
   * v4.4 maps the whole 960x540 gameplay coordinate space to the portrait
   * Telegram viewport. That is intentional: the player must see the whole
   * level width while the battlefield also reaches the bottom controls.
   * Compensate actor sprite width so characters keep human proportions even
   * though the world/background is vertically expanded.
   */
  const proto=CanvasRenderingContext2D.prototype;
  if(!proto.__steelPhoto44DrawImage){
    const nativeDrawImage=proto.drawImage;
    proto.drawImage=function(){
      if(this.canvas===actors&&arguments.length===5){
        const a=Array.from(arguments);
        const cw=Math.max(1,actors.clientWidth||canvas.clientWidth||960);
        const ch=Math.max(1,actors.clientHeight||canvas.clientHeight||540);
        const sx=cw/960,sy=ch/540;
        const compensate=Math.max(.75,Math.min(2.65,sy/sx));
        const w=Number(a[3])||0;
        if(w>24&&w<420)a[3]=w*compensate;
        return nativeDrawImage.apply(this,a);
      }
      return nativeDrawImage.apply(this,arguments);
    };
    proto.__steelPhoto44DrawImage=true;
  }

  function sync(){
    for(const id of ['gameCanvas','saPhotoBg','saPhotoTerrain','saPhotoActors','steelSceneRemaster','steelSceneRemasterFx']){
      const el=document.getElementById(id);if(!el)continue;
      el.style.setProperty('left','0','important');
      el.style.setProperty('top','0','important');
      el.style.setProperty('right','0','important');
      el.style.setProperty('bottom','0','important');
      el.style.setProperty('width','100%','important');
      el.style.setProperty('height','100%','important');
      el.style.setProperty('transform','none','important');
      el.style.setProperty('aspect-ratio','auto','important');
    }
    const obj=document.getElementById('steelMissionObjective');
    if(obj){
      obj.style.setProperty('left','50%','important');
      obj.style.setProperty('right','auto','important');
      obj.style.setProperty('transform','translateX(-50%)','important');
    }
    document.documentElement.dataset.steelVisual='photo-v44-fullscreen';
  }
  sync();
  addEventListener('resize',sync,{passive:true});
  try{new ResizeObserver(sync).observe(document.querySelector('.canvasWrap'))}catch{}
  let i=0;const timer=setInterval(()=>{sync();if(++i>16)clearInterval(timer)},120);
})();
