'use strict';
(function(){
  const game=document.getElementById('game');
  const wrap=document.querySelector('#game .canvasWrap');
  const src=document.getElementById('gameCanvas');
  const levelEl=document.getElementById('level');
  if(!game||!wrap||!src||!levelEl)return;

  const W=src.width||960,H=src.height||540;
  let hero={x:95,y:430,seen:false};
  let camX=0;

  function norm(v){return String(v||'').replace(/\s+/g,'').toLowerCase()}
  function isHeroFill(v){const n=norm(v);return n==='#4ce2ac'||n==='rgb(76,226,172)'||n==='rgba(76,226,172,1)'}
  function point(ctx,x,y){
    try{const m=ctx.getTransform();return{x:m.a*x+m.c*y+m.e,y:m.b*x+m.d*y+m.f}}
    catch{return{x,y}}
  }

  /* Capture the same invisible physics marker that the photo renderer uses. */
  const proto=CanvasRenderingContext2D.prototype;
  const prevFillRect=proto.fillRect;
  proto.fillRect=function(x,y,w,h){
    if(this.canvas===src&&isHeroFill(this.fillStyle)&&Math.abs(w-18)<1&&h>20&&h<50){
      const p=point(this,x,y);
      hero.x=p.x+9;hero.y=p.y+h;hero.seen=true;
    }
    return prevFillRect.call(this,x,y,w,h);
  };

  let out=document.getElementById('saPortraitWorld');
  if(!out){out=document.createElement('canvas');out.id='saPortraitWorld';out.setAttribute('aria-hidden','true');wrap.appendChild(out)}
  const ctx=out.getContext('2d');ctx.imageSmoothingEnabled=true;

  const objectives={
    1:'ЗАЧИСТИТЬ АВАНПОСТ',2:'УДЕРЖАТЬ ПЕРЕПРАВУ',3:'ВЗЯТЬ ЦИТАДЕЛЬ',4:'ПРОРВАТЬ КАНЬОН B-17',
    5:'ЗАЧИСТИТЬ БУНКЕР-7',6:'ПРОЙТИ ЛЕДЯНОЙ ФРОНТ',7:'ОСТАНОВИТЬ ПРЕССЫ',8:'ПЕРЕЙТИ НЕБЕСНЫЙ МОСТ',
    9:'ЗАХВАТИТЬ БАШНЮ СВЯЗИ',10:'ОТКЛЮЧИТЬ РЕАКТОР',11:'УНИЧТОЖИТЬ МАТРИЦУ',12:'ПОСЛЕДНИЙ ПРОТОКОЛ'
  };
  let objective=document.getElementById('steelObjectiveV45');
  if(!objective){objective=document.createElement('div');objective.id='steelObjectiveV45';game.appendChild(objective)}
  function levelNo(){return Math.max(1,Math.min(12,parseInt(levelEl.textContent||'1',10)||1))}
  function updateObjective(){const n=levelNo();objective.innerHTML='<b>МИССИЯ '+String(n).padStart(2,'0')+'</b>'+objectives[n]}
  updateObjective();
  try{new MutationObserver(updateObjective).observe(levelEl,{childList:true,characterData:true,subtree:true})}catch{}

  function fit(){
    const r=out.getBoundingClientRect();
    const dpr=Math.min(2,window.devicePixelRatio||1);
    const w=Math.max(2,Math.round(r.width*dpr)),h=Math.max(2,Math.round(r.height*dpr));
    if(out.width!==w||out.height!==h){out.width=w;out.height=h;ctx.imageSmoothingEnabled=true}
    return{w,h,dpr,cssW:r.width,cssH:r.height};
  }

  function layer(id){return document.getElementById(id)}
  function drawLayer(el,sx,sy,sw,sh,dw,dh,alpha=1,mode='source-over'){
    if(!el)return;
    ctx.save();ctx.globalAlpha=alpha;ctx.globalCompositeOperation=mode;
    try{ctx.drawImage(el,sx,sy,sw,sh,0,0,dw,dh)}catch{}
    ctx.restore();
  }

  function frame(){
    const f=fit(),dw=f.w,dh=f.h;
    ctx.clearRect(0,0,dw,dh);

    /* Portrait crop: preserve geometry, crop horizontally, and follow the hero. */
    const destAspect=dw/dh;
    let cropH=H;
    let cropW=Math.max(360,Math.min(W,cropH*destAspect));
    if(cropW>W){cropW=W;cropH=W/destAspect}

    const lookAhead=cropW*.30;
    const target=Math.max(0,Math.min(W-cropW,(hero.seen?hero.x:95)-lookAhead));
    camX+=(target-camX)*.13;
    if(Math.abs(target-camX)<.15)camX=target;

    /* Lift the source a little so the ground sits just above the controls. */
    const cropY=Math.max(0,Math.min(H-cropH,8));

    const bg=layer('saPhotoBg');
    const terrain=layer('saPhotoTerrain');
    const actors=layer('saPhotoActors');
    const fx=layer('steelSceneRemasterFx');

    drawLayer(bg,camX,cropY,cropW,cropH,dw,dh,1);
    if(!bg){
      const g=ctx.createLinearGradient(0,0,0,dh);g.addColorStop(0,'#24445d');g.addColorStop(1,'#0c1a23');ctx.fillStyle=g;ctx.fillRect(0,0,dw,dh);
    }
    drawLayer(terrain,camX,cropY,cropW,cropH,dw,dh,1);
    drawLayer(src,camX,cropY,cropW,cropH,dw,dh,.20,'screen');
    drawLayer(fx,camX,cropY,cropW,cropH,dw,dh,.35,'screen');
    drawLayer(actors,camX,cropY,cropW,cropH,dw,dh,1);

    /* Cinematic grading and foreground depth. */
    let grad=ctx.createLinearGradient(0,0,0,dh);
    grad.addColorStop(0,'rgba(3,9,16,.08)');grad.addColorStop(.62,'rgba(3,9,16,0)');grad.addColorStop(1,'rgba(2,8,13,.25)');
    ctx.fillStyle=grad;ctx.fillRect(0,0,dw,dh);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  window.addEventListener('resize',()=>{camX=Math.max(0,camX)});
  document.documentElement.dataset.steelVisual='portrait-v45';
})();
