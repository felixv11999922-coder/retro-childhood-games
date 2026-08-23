'use strict';
(function(){
  const game=document.getElementById('game');
  const wrap=document.querySelector('#game .canvasWrap');
  const src=document.getElementById('gameCanvas');
  const levelEl=document.getElementById('level');
  if(!game||!wrap||!src||!levelEl)return;

  const W=src.width||960,H=src.height||540;
  let hero={x:95,y:430,seen:false};
  let localCropX=0;
  let coreCameraX=0;

  const norm=v=>String(v||'').replace(/\s+/g,'').toLowerCase();
  const isHeroFill=v=>{const n=norm(v);return n==='#4ce2ac'||n==='rgb(76,226,172)'||n==='rgba(76,226,172,1)'};

  const proto=CanvasRenderingContext2D.prototype;
  const prevFillRect=proto.fillRect;
  proto.fillRect=function(x,y,w,h){
    if(this.canvas===src&&isHeroFill(this.fillStyle)&&Math.abs(w-18)<1&&h>20&&h<50){
      try{
        const m=this.getTransform();
        hero.x=m.a*(x+9)+m.c*(y+h)+m.e;
        hero.y=m.b*(x+9)+m.d*(y+h)+m.f;
        hero.seen=true;
        const observed=Math.max(0,-m.e);
        if(Math.abs(observed-coreCameraX)>80)coreCameraX=observed;
        else coreCameraX+=(observed-coreCameraX)*.58;
      }catch{
        hero.x=x+9;hero.y=y+h;hero.seen=true;
      }
    }
    return prevFillRect.call(this,x,y,w,h);
  };

  let out=document.getElementById('saPortraitWorld');
  if(!out){out=document.createElement('canvas');out.id='saPortraitWorld';out.setAttribute('aria-hidden','true');wrap.appendChild(out)}
  const ctx=out.getContext('2d');ctx.imageSmoothingEnabled=true;

  const objectives={1:'ЗАЧИСТИТЬ АВАНПОСТ',2:'УДЕРЖАТЬ ПЕРЕПРАВУ',3:'ВЗЯТЬ ЦИТАДЕЛЬ',4:'ПРОРВАТЬ КАНЬОН B-17',5:'ЗАЧИСТИТЬ БУНКЕР-7',6:'ПРОЙТИ ЛЕДЯНОЙ ФРОНТ',7:'ОСТАНОВИТЬ ПРЕССЫ',8:'ПЕРЕЙТИ НЕБЕСНЫЙ МОСТ',9:'ЗАХВАТИТЬ БАШНЮ СВЯЗИ',10:'ОТКЛЮЧИТЬ РЕАКТОР',11:'УНИЧТОЖИТЬ МАТРИЦУ',12:'ПОСЛЕДНИЙ ПРОТОКОЛ'};
  let objective=document.getElementById('steelObjectiveV46')||document.getElementById('steelObjectiveV48');
  if(!objective){objective=document.createElement('div');game.appendChild(objective)}
  objective.id='steelObjectiveV46';
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

  function mission1Backdrop(dw,dh,sceneX,cropY,cropW,cropH){
    const sx=dw/cropW,sy=dh/cropH;
    const X=x=>(x-sceneX)*sx,Y=y=>(y-cropY)*sy,S=v=>v*sx;

    const sky=ctx.createLinearGradient(0,0,0,dh);
    sky.addColorStop(0,'#6d899f');sky.addColorStop(.30,'#d6a66f');sky.addColorStop(.56,'#66847a');sky.addColorStop(1,'#13272b');
    ctx.fillStyle=sky;ctx.fillRect(0,0,dw,dh);

    const sunX=dw*.17-((coreCameraX*.025)%Math.max(1,dw*.2)),sunY=dh*.18;
    const sunR=Math.max(24,dh*.045);
    const sun=ctx.createRadialGradient(sunX,sunY,0,sunX,sunY,sunR*2.5);
    sun.addColorStop(0,'rgba(255,238,175,.98)');sun.addColorStop(.35,'rgba(255,190,92,.83)');sun.addColorStop(1,'rgba(255,146,50,0)');
    ctx.fillStyle=sun;ctx.beginPath();ctx.arc(sunX,sunY,sunR*2.5,0,Math.PI*2);ctx.fill();ctx.fillStyle='#f6c96c';ctx.beginPath();ctx.arc(sunX,sunY,sunR,0,Math.PI*2);ctx.fill();

    function mountainBand(baseY,amp,spacing,fill,par){
      const off=-((coreCameraX*par)%(spacing*sx));
      ctx.fillStyle=fill;ctx.beginPath();ctx.moveTo(-spacing*sx,dh);
      for(let i=-2;i<9;i++){
        const bx=off+i*spacing*sx;
        ctx.lineTo(bx,baseY);ctx.lineTo(bx+spacing*sx*.48,baseY-amp);ctx.lineTo(bx+spacing*sx,baseY);
      }
      ctx.lineTo(dw+spacing*sx,dh);ctx.closePath();ctx.fill();
    }
    mountainBand(dh*.48,dh*.18,250,'#315253',.07);
    mountainBand(dh*.55,dh*.12,205,'#203d3f',.13);

    const horizon=dh*.54;
    const sea=ctx.createLinearGradient(0,horizon,0,dh*.87);sea.addColorStop(0,'#327d86');sea.addColorStop(.55,'#1b5965');sea.addColorStop(1,'#103944');
    ctx.fillStyle=sea;ctx.fillRect(0,horizon,dw,dh*.34);
    ctx.globalAlpha=.28;ctx.strokeStyle='#bde7df';ctx.lineWidth=Math.max(1,S(1));
    for(let i=0;i<8;i++){const yy=horizon+18+i*18*sy;ctx.beginPath();ctx.moveTo(0,yy);ctx.bezierCurveTo(dw*.22,yy-4,dw*.48,yy+5,dw*.72,yy-2);ctx.bezierCurveTo(dw*.86,yy-5,dw*.94,yy+4,dw,yy);ctx.stroke()}
    ctx.globalAlpha=1;

    function rock(x,y,w,h,c1='#715a42',c2='#2b2b28'){
      const px=X(x),py=Y(y),pw=S(w),ph=h*sy;if(px>dw+pw||px+pw<0)return;
      const g=ctx.createLinearGradient(px,py,px+pw,py+ph);g.addColorStop(0,c1);g.addColorStop(1,c2);ctx.fillStyle=g;
      ctx.beginPath();ctx.moveTo(px,py+ph);ctx.lineTo(px+pw*.12,py+ph*.28);ctx.lineTo(px+pw*.48,py);ctx.lineTo(px+pw*.82,py+ph*.22);ctx.lineTo(px+pw,py+ph);ctx.closePath();ctx.fill();
    }
    function palm(x,y,s=.6){
      const px=X(x),py=Y(y);if(px<-100||px>dw+100)return;
      ctx.save();ctx.translate(px,py);ctx.scale(sx*s,sy*s);ctx.strokeStyle='#3b2c22';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(0,0);ctx.quadraticCurveTo(-8,-65,5,-125);ctx.stroke();ctx.translate(5,-125);ctx.fillStyle='#214f39';
      for(let i=0;i<7;i++){ctx.save();ctx.rotate(-1.3+i*.42);ctx.beginPath();ctx.moveTo(0,0);ctx.quadraticCurveTo(25,-10,58,5);ctx.quadraticCurveTo(26,1,0,0);ctx.fill();ctx.restore()}ctx.restore();
    }
    function bunker(x,y,w,h){
      const px=X(x),py=Y(y),pw=S(w),ph=h*sy;if(px>dw+pw||px+pw<0)return;
      const g=ctx.createLinearGradient(px,py,px,py+ph);g.addColorStop(0,'#697261');g.addColorStop(.55,'#414b40');g.addColorStop(1,'#202a25');ctx.fillStyle=g;ctx.fillRect(px,py,pw,ph);
      ctx.fillStyle='#222b27';ctx.fillRect(px-S(8),py+16*sy,pw+S(16),16*sy);ctx.fillStyle='#0b1110';ctx.fillRect(px+S(26),py+44*sy,S(68),34*sy);ctx.fillRect(px+pw-S(52),py+20*sy,S(24),46*sy);
      ctx.strokeStyle='rgba(13,18,16,.55)';ctx.lineWidth=Math.max(1,S(2));for(let i=0;i<5;i++){ctx.beginPath();ctx.moveTo(px+S(i*32),py);ctx.lineTo(px+S(i*32+20),py+ph);ctx.stroke()}
      ctx.fillStyle='rgba(240,220,145,.8)';ctx.fillRect(px+pw-S(27),py+16*sy,S(10),12*sy);
    }
    function tower(x,y,h=190){
      const px=X(x),py=Y(y),th=h*sy;if(px<-70||px>dw+70)return;
      ctx.strokeStyle='#293d3d';ctx.lineWidth=Math.max(2,S(3));ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(px,py-th);ctx.stroke();ctx.lineWidth=Math.max(1,S(2));
      for(let yy=24;yy<h-8;yy+=24){ctx.beginPath();ctx.moveTo(px-S(16),py-yy*sy);ctx.lineTo(px+S(16),py-yy*sy);ctx.stroke()}
      ctx.fillStyle='#ff4f45';ctx.beginPath();ctx.arc(px,py-th,Math.max(2,S(4)),0,Math.PI*2);ctx.fill();
    }
    function crate(x,y,w=34,h=30){const px=X(x),py=Y(y),pw=S(w),ph=h*sy;if(px>dw+pw||px+pw<0)return;ctx.fillStyle='#5f442c';ctx.fillRect(px,py,pw,ph);ctx.strokeStyle='#b68b53';ctx.lineWidth=Math.max(1,S(2));ctx.strokeRect(px,py,pw,ph);ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(px+pw,py+ph);ctx.moveTo(px+pw,py);ctx.lineTo(px,py+ph);ctx.stroke()}

    const rocks=[[30,350,170,135],[610,330,160,150],[1070,342,150,132],[1570,315,190,170],[2140,345,160,140],[2760,320,190,165],[3370,338,160,145],[3820,315,170,170]];
    rocks.forEach(r=>rock(...r));
    const palms=[[165,375,.65],[245,370,.52],[520,370,.62],[980,370,.56],[1320,372,.68],[1760,370,.55],[2240,373,.66],[2600,371,.54],[3150,372,.64],[3650,370,.58]];
    palms.forEach(p=>palm(...p));
    const posts=[
      [275,255,170,205,365],[1120,280,150,180,1200],[1900,245,190,215,2015],[2760,275,165,185,2840],[3440,235,210,225,3570]
    ];
    posts.forEach((p,i)=>{bunker(p[0],p[1],p[2],p[3]);tower(p[4],450,i===4?230:185);bunker(p[0]+p[2]-5,p[1]+55,105,p[3]-55)});
    const crates=[[210,420],[245,420],[488,405],[1040,421],[1280,405],[1830,420],[2120,401],[2680,420],[2950,405],[3370,420],[3680,401]];
    crates.forEach(c=>crate(...c));

    const fog=ctx.createLinearGradient(0,dh*.48,0,dh*.84);fog.addColorStop(0,'rgba(255,214,160,.10)');fog.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=fog;ctx.fillRect(0,dh*.46,dw,dh*.40);
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

    const lookAhead=cropW*.29;
    const target=Math.max(0,Math.min(W-cropW,(hero.seen?hero.x:95)-lookAhead));
    localCropX+=(target-localCropX)*.16;if(Math.abs(target-localCropX)<.1)localCropX=target;
    const cropY=Math.max(0,Math.min(H-cropH,18));
    const n=levelNo();
    const sceneX=Math.max(0,coreCameraX+localCropX);

    if(n===1){
      mission1Backdrop(dw,dh,sceneX,cropY,cropW,cropH);
      drawLayer(layer('saPhotoBg'),localCropX,cropY,cropW,cropH,dw,dh,.10,'soft-light');
    }else{
      const hasPhoto=!!(window.SteelAssaultSceneImages&&window.SteelAssaultSceneImages[n]);
      let painted=false;
      if(hasPhoto)painted=drawLayer(layer('saPhotoBg'),localCropX,cropY,cropW,cropH,dw,dh,1);
      else painted=drawLayer(layer('steelSceneRemaster'),localCropX,cropY,cropW,cropH,dw,dh,1);
      if(!painted){const g=ctx.createLinearGradient(0,0,0,dh);g.addColorStop(0,'#24445d');g.addColorStop(1,'#0c1a23');ctx.fillStyle=g;ctx.fillRect(0,0,dw,dh)}
    }

    drawLayer(layer('saPhotoTerrain'),localCropX,cropY,cropW,cropH,dw,dh,1);
    drawLayer(src,localCropX,cropY,cropW,cropH,dw,dh,.055,'screen');
    drawLayer(layer('steelSceneRemasterFx'),localCropX,cropY,cropW,cropH,dw,dh,.28,'screen');
    drawLayer(layer('saPhotoActors'),localCropX,cropY,cropW,cropH,dw,dh,1);
    foreground(n,dw,dh);

    const grade=ctx.createLinearGradient(0,0,0,dh);grade.addColorStop(0,'rgba(2,7,10,.04)');grade.addColorStop(.62,'rgba(0,0,0,0)');grade.addColorStop(1,'rgba(1,6,8,.20)');ctx.fillStyle=grade;ctx.fillRect(0,0,dw,dh);
    const vig=ctx.createRadialGradient(dw*.5,dh*.48,dh*.12,dw*.5,dh*.48,dh*.78);vig.addColorStop(0,'rgba(0,0,0,0)');vig.addColorStop(1,'rgba(0,0,0,.25)');ctx.fillStyle=vig;ctx.fillRect(0,0,dw,dh);
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
  window.addEventListener('resize',()=>{localCropX=Math.max(0,localCropX)});
  document.documentElement.dataset.steelVisual='portrait-v48';
})();