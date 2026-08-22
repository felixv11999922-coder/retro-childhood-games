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

  const norm=v=>String(v||'').replace(/\s+/g,'').toLowerCase();
  const isHeroFill=v=>{const n=norm(v);return n==='#4ce2ac'||n==='rgb(76,226,172)'||n==='rgba(76,226,172,1)'};
  function point(ctx,x,y){try{const m=ctx.getTransform();return{x:m.a*x+m.c*y+m.e,y:m.b*x+m.d*y+m.f}}catch{return{x,y}}}

  const proto=CanvasRenderingContext2D.prototype;
  const prevFillRect=proto.fillRect;
  proto.fillRect=function(x,y,w,h){
    if(this.canvas===src&&isHeroFill(this.fillStyle)&&Math.abs(w-18)<1&&h>20&&h<50){
      const p=point(this,x,y);hero.x=p.x+9;hero.y=p.y+h;hero.seen=true;
    }
    return prevFillRect.call(this,x,y,w,h);
  };

  let out=document.getElementById('saPortraitWorld');
  if(!out){out=document.createElement('canvas');out.id='saPortraitWorld';out.setAttribute('aria-hidden','true');wrap.appendChild(out)}
  const ctx=out.getContext('2d');ctx.imageSmoothingEnabled=true;

  const objectives={1:'ЗАЧИСТИТЬ АВАНПОСТ',2:'УДЕРЖАТЬ ПЕРЕПРАВУ',3:'ВЗЯТЬ ЦИТАДЕЛЬ',4:'ПРОРВАТЬ КАНЬОН B-17',5:'ЗАЧИСТИТЬ БУНКЕР-7',6:'ПРОЙТИ ЛЕДЯНОЙ ФРОНТ',7:'ОСТАНОВИТЬ ПРЕССЫ',8:'ПЕРЕЙТИ НЕБЕСНЫЙ МОСТ',9:'ЗАХВАТИТЬ БАШНЮ СВЯЗИ',10:'ОТКЛЮЧИТЬ РЕАКТОР',11:'УНИЧТОЖИТЬ МАТРИЦУ',12:'ПОСЛЕДНИЙ ПРОТОКОЛ'};
  let objective=document.getElementById('steelObjectiveV46');
  if(!objective){objective=document.createElement('div');objective.id='steelObjectiveV46';game.appendChild(objective)}
  const levelNo=()=>Math.max(1,Math.min(12,parseInt(levelEl.textContent||'1',10)||1));
  function updateObjective(){const n=levelNo();objective.innerHTML='<b>МИССИЯ '+String(n).padStart(2,'0')+'</b><span>'+objectives[n]+'</span>'}
  updateObjective();
  try{new MutationObserver(updateObjective).observe(levelEl,{childList:true,characterData:true,subtree:true})}catch{}

  function fit(){
    const r=out.getBoundingClientRect(),dpr=Math.min(2,window.devicePixelRatio||1);
    const w=Math.max(2,Math.round(r.width*dpr)),h=Math.max(2,Math.round(r.height*dpr));
    if(out.width!==w||out.height!==h){out.width=w;out.height=h;ctx.imageSmoothingEnabled=true}
    return{w,h};
  }
  const layer=id=>document.getElementById(id);
  function drawLayer(el,sx,sy,sw,sh,dw,dh,alpha=1,mode='source-over'){
    if(!el)return false;ctx.save();ctx.globalAlpha=alpha;ctx.globalCompositeOperation=mode;
    try{ctx.drawImage(el,sx,sy,sw,sh,0,0,dw,dh);ctx.restore();return true}catch{ctx.restore();return false}
  }

  function mission1Backdrop(dw,dh,cam,cropY,cropW,cropH){
    const sx=dw/cropW,sy=dh/cropH;
    const X=x=>(x-cam)*sx,Y=y=>(y-cropY)*sy;
    const S=v=>v*sx;
    const grad=ctx.createLinearGradient(0,0,0,dh);
    grad.addColorStop(0,'#6e8aa2');grad.addColorStop(.34,'#d3a06d');grad.addColorStop(.58,'#557a72');grad.addColorStop(1,'#11262a');
    ctx.fillStyle=grad;ctx.fillRect(0,0,dw,dh);

    const sunX=X(120),sunY=Y(115),sunR=Math.max(22,S(28));
    const sun=ctx.createRadialGradient(sunX,sunY,0,sunX,sunY,sunR*2.4);sun.addColorStop(0,'rgba(255,235,166,.98)');sun.addColorStop(.35,'rgba(255,187,86,.84)');sun.addColorStop(1,'rgba(255,150,45,0)');
    ctx.fillStyle=sun;ctx.beginPath();ctx.arc(sunX,sunY,sunR*2.4,0,Math.PI*2);ctx.fill();ctx.fillStyle='#f7c96c';ctx.beginPath();ctx.arc(sunX,sunY,sunR,0,Math.PI*2);ctx.fill();

    function mountain(points,fill){ctx.fillStyle=fill;ctx.beginPath();ctx.moveTo(X(points[0][0]),Y(points[0][1]));for(let i=1;i<points.length;i++)ctx.lineTo(X(points[i][0]),Y(points[i][1]));ctx.closePath();ctx.fill()}
    mountain([[-80,330],[40,210],[120,305],[210,180],[300,300],[420,205],[560,325],[760,220],[1040,340],[-80,340]],'#294b4d');
    mountain([[-80,350],[90,285],[170,330],[270,245],[360,330],[500,270],[660,340],[820,280],[1040,360],[-80,360]],'#1f3b3d');

    const horizon=Y(330),bottom=Y(510);
    const sea=ctx.createLinearGradient(0,horizon,0,bottom);sea.addColorStop(0,'#2f7882');sea.addColorStop(.55,'#1b5965');sea.addColorStop(1,'#103944');ctx.fillStyle=sea;ctx.fillRect(0,horizon,dw,bottom-horizon);
    ctx.globalAlpha=.32;ctx.strokeStyle='#b7e6df';ctx.lineWidth=Math.max(1,S(1));for(let i=0;i<9;i++){const yy=Y(345+i*17);ctx.beginPath();ctx.moveTo(0,yy);ctx.bezierCurveTo(dw*.22,yy-4,dw*.48,yy+5,dw*.72,yy-2);ctx.bezierCurveTo(dw*.85,yy-5,dw*.94,yy+4,dw,yy);ctx.stroke()}ctx.globalAlpha=1;

    function rock(x,y,w,h,c1,c2){const g=ctx.createLinearGradient(X(x),Y(y),X(x+w),Y(y+h));g.addColorStop(0,c1);g.addColorStop(1,c2);ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(X(x),Y(y+h));ctx.lineTo(X(x+w*.12),Y(y+h*.25));ctx.lineTo(X(x+w*.48),Y(y));ctx.lineTo(X(x+w*.82),Y(y+h*.22));ctx.lineTo(X(x+w),Y(y+h));ctx.closePath();ctx.fill()}
    rock(-50,325,155,155,'#735b42','#2b2b28');rock(700,300,190,190,'#654e38','#252523');

    function palm(x,y,s){ctx.save();ctx.translate(X(x),Y(y));ctx.scale(sx*s,sy*s);ctx.strokeStyle='#3d2b20';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(0,0);ctx.quadraticCurveTo(-8,-65,5,-125);ctx.stroke();ctx.translate(5,-125);ctx.fillStyle='#214f39';for(let i=0;i<7;i++){ctx.save();ctx.rotate(-1.3+i*.42);ctx.beginPath();ctx.moveTo(0,0);ctx.quadraticCurveTo(25,-10,58,5);ctx.quadraticCurveTo(26,1,0,0);ctx.fill();ctx.restore()}ctx.restore()}
    palm(165,368,.65);palm(245,365,.52);palm(520,365,.62);

    function bunker(x,y,w,h){
      const px=X(x),py=Y(y),pw=S(w),ph=S(h);const g=ctx.createLinearGradient(px,py,px,py+ph);g.addColorStop(0,'#697261');g.addColorStop(.55,'#414b40');g.addColorStop(1,'#202a25');ctx.fillStyle=g;ctx.fillRect(px,py,pw,ph);
      ctx.fillStyle='#222b27';ctx.fillRect(px-S(8),py+S(18),pw+S(16),S(16));ctx.fillStyle='#0b1110';ctx.fillRect(px+S(26),py+S(44),S(68),S(34));ctx.fillRect(px+pw-S(52),py+S(20),S(24),S(46));
      ctx.strokeStyle='rgba(13,18,16,.55)';ctx.lineWidth=Math.max(1,S(2));for(let i=0;i<5;i++){ctx.beginPath();ctx.moveTo(px+S(i*32),py);ctx.lineTo(px+S(i*32+20),py+ph);ctx.stroke()}
      ctx.fillStyle='rgba(240,220,145,.8)';ctx.fillRect(px+pw-S(27),py+S(16),S(10),S(12));
    }
    bunker(275,255,170,205);
    bunker(450,310,120,150);

    ctx.strokeStyle='#273c3c';ctx.lineWidth=Math.max(2,S(3));ctx.beginPath();ctx.moveTo(X(365),Y(250));ctx.lineTo(X(365),Y(120));ctx.stroke();
    ctx.lineWidth=Math.max(1,S(2));for(let y=145;y<245;y+=23){ctx.beginPath();ctx.moveTo(X(350),Y(y));ctx.lineTo(X(380),Y(y));ctx.stroke()}ctx.fillStyle='#ff4f45';ctx.beginPath();ctx.arc(X(365),Y(118),Math.max(2,S(4)),0,Math.PI*2);ctx.fill();

    function crate(x,y,w=34,h=30){const px=X(x),py=Y(y),pw=S(w),ph=S(h);ctx.fillStyle='#5f442c';ctx.fillRect(px,py,pw,ph);ctx.strokeStyle='#b68b53';ctx.lineWidth=Math.max(1,S(2));ctx.strokeRect(px,py,pw,ph);ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(px+pw,py+ph);ctx.moveTo(px+pw,py);ctx.lineTo(px,py+ph);ctx.stroke()}
    crate(210,420);crate(245,420);crate(488,405,38,34);
    ctx.fillStyle='#584737';for(let i=0;i<7;i++){ctx.beginPath();ctx.ellipse(X(185+i*17),Y(442-(i%2)*5),S(14),S(8),0,0,Math.PI*2);ctx.fill()}

    const fog=ctx.createLinearGradient(0,Y(315),0,Y(470));fog.addColorStop(0,'rgba(255,211,155,.12)');fog.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=fog;ctx.fillRect(0,Y(315),dw,Y(470)-Y(315));
  }

  function foreground(n,dw,dh){
    if(n!==1)return;
    const g=ctx.createLinearGradient(0,dh*.82,0,dh);g.addColorStop(0,'rgba(9,18,18,0)');g.addColorStop(1,'rgba(5,10,10,.35)');ctx.fillStyle=g;ctx.fillRect(0,dh*.78,dw,dh*.22);
    ctx.fillStyle='rgba(11,24,20,.72)';for(let i=0;i<9;i++){const x=(i*97)%dw,y=dh-8-(i%3)*3;ctx.beginPath();ctx.ellipse(x,y,28+(i%4)*7,9+(i%2)*4,0,0,Math.PI*2);ctx.fill()}
  }

  function frame(){
    const {w:dw,h:dh}=fit();ctx.clearRect(0,0,dw,dh);
    const destAspect=dw/dh;
    let cropH=500,cropW=cropH*destAspect;
    if(cropW<330){cropW=330;cropH=cropW/destAspect}
    if(cropW>W){cropW=W;cropH=W/destAspect}
    cropH=Math.min(H,cropH);
    const lookAhead=cropW*.29,target=Math.max(0,Math.min(W-cropW,(hero.seen?hero.x:95)-lookAhead));
    camX+=(target-camX)*.12;if(Math.abs(target-camX)<.12)camX=target;
    const cropY=Math.max(0,Math.min(H-cropH,18));
    const n=levelNo();

    if(n===1){
      mission1Backdrop(dw,dh,camX,cropY,cropW,cropH);
      drawLayer(layer('saPhotoBg'),camX,cropY,cropW,cropH,dw,dh,.16,'soft-light');
    }else{
      const hasPhoto=!!(window.SteelAssaultSceneImages&&window.SteelAssaultSceneImages[n]);
      let painted=false;if(hasPhoto)painted=drawLayer(layer('saPhotoBg'),camX,cropY,cropW,cropH,dw,dh,1);else painted=drawLayer(layer('steelSceneRemaster'),camX,cropY,cropW,cropH,dw,dh,1);
      if(!painted){const g=ctx.createLinearGradient(0,0,0,dh);g.addColorStop(0,'#24445d');g.addColorStop(1,'#0c1a23');ctx.fillStyle=g;ctx.fillRect(0,0,dw,dh)}
    }

    drawLayer(layer('saPhotoTerrain'),camX,cropY,cropW,cropH,dw,dh,1);
    drawLayer(src,camX,cropY,cropW,cropH,dw,dh,.055,'screen');
    drawLayer(layer('steelSceneRemasterFx'),camX,cropY,cropW,cropH,dw,dh,.28,'screen');
    drawLayer(layer('saPhotoActors'),camX,cropY,cropW,cropH,dw,dh,1);
    foreground(n,dw,dh);

    const grade=ctx.createLinearGradient(0,0,0,dh);grade.addColorStop(0,'rgba(2,7,10,.04)');grade.addColorStop(.62,'rgba(0,0,0,0)');grade.addColorStop(1,'rgba(1,6,8,.20)');ctx.fillStyle=grade;ctx.fillRect(0,0,dw,dh);
    const vig=ctx.createRadialGradient(dw*.5,dh*.48,dh*.12,dw*.5,dh*.48,dh*.78);vig.addColorStop(0,'rgba(0,0,0,0)');vig.addColorStop(1,'rgba(0,0,0,.26)');ctx.fillStyle=vig;ctx.fillRect(0,0,dw,dh);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  window.addEventListener('resize',()=>{camX=Math.max(0,camX)});
  document.documentElement.dataset.steelVisual='portrait-v46';
})();