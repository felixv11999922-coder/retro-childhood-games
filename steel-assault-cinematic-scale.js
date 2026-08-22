'use strict';
(function(){
  /*
   * Cinematic actors are rendered from the old gameplay hitboxes, but their
   * artwork is intentionally much more detailed. Keep their feet anchored to
   * the original physics coordinates while reducing only local actor scale.
   * This preserves collision/gameplay and stops the hero/enemies from filling
   * the whole Telegram viewport.
   */
  const proto=CanvasRenderingContext2D.prototype;
  if(proto.__steelCinematicScalePatched)return;
  const nativeScale=proto.scale;
  const ACTOR_FACTOR=0.52;
  proto.scale=function(x,y){
    try{
      if(this.canvas&&this.canvas.id==='steelCinematicActors'){
        const ax=Math.abs(Number(x)||0),ay=Math.abs(Number(y)||0);
        if(ax>=1.35&&ax<=3.25&&ay>=1.35&&ay<=3.25){
          return nativeScale.call(this,x*ACTOR_FACTOR,y*ACTOR_FACTOR);
        }
      }
    }catch{}
    return nativeScale.call(this,x,y);
  };
  proto.__steelCinematicScalePatched=true;
  document.documentElement.dataset.steelActorScale='balanced-v42';
})();
