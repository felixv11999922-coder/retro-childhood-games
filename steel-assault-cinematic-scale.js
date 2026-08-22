'use strict';
(function(){
  /*
   * The cinematic renderer deliberately draws detailed characters larger than
   * the old collision rectangles. In a narrow Telegram viewport that became
   * too large. Scale only actor-local transforms, keeping their feet/anchors
   * on the original gameplay coordinates so hitboxes remain unchanged.
   */
  const proto=CanvasRenderingContext2D.prototype;
  if(proto.__steelCinematicScalePatched)return;
  const nativeScale=proto.scale;
  const ACTOR_FACTOR=0.68;
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
  document.documentElement.dataset.steelActorScale='balanced-v41';
})();
