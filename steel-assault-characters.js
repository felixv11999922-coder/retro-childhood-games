'use strict';
(function(){
  const gameCanvas=document.getElementById('gameCanvas');
  const wrap=document.querySelector('.canvasWrap');
  if(!gameCanvas||!wrap)return;

  const W=gameCanvas.width||960,H=gameCanvas.height||540;
  const layer=document.createElement('canvas');
  layer.id='steelCharacterArt';
  layer.width=W; layer.height=H;
  layer.setAttribute('aria-hidden','true');
  const toast=document.getElementById('toast');
  wrap.insertBefore(layer,toast||null);
  Object.assign(layer.style,{position:'absolute',pointerEvents:'none',zIndex:'2.45'});
  if(toast)toast.style.zIndex='3';
  const g=layer.getContext('2d');
  g.imageSmoothingEnabled=true;

  function sync(){
    layer.style.left=gameCanvas.offsetLeft+'px';
    layer.style.top=gameCanvas.offsetTop+'px';
    layer.style.width=gameCanvas.offsetWidth+'px';
    layer.style.height=gameCanvas.offsetHeight+'px';
  }
  try{new ResizeObserver(sync).observe(gameCanvas)}catch{}
  addEventListener('resize',sync,{passive:true});
  sync();

  let capture={hero:null,enemies:[],boss:null,frame:0};
  let lastAim={x:1,y:0};
  let facing=1;
  let lastHeroX=null;
  let heroSpeed=0;
  let gunPathStart=null;

  const proto=CanvasRenderingContext2D.prototype;
  const prevFillRect=proto.fillRect;
  const prevMoveTo=proto.moveTo;
  const prevLineTo=proto.lineTo;

  function color(v){return String(v||'').replace(/\s+/g,'').toLowerCase()}
  function isColor(v,hex,rgb){const c=color(v);return c===hex||c===rgb}
  function point(ctx,x,y){
    try{const m=ctx.getTransform();return{x:m.a*x+m.c*y+m.e,y:m.b*x+m.d*y+m.f}}catch{return{x,y}}
  }

  proto.fillRect=function(x,y,w,h){
    if(this.canvas===gameCanvas){
      const fs=this.fillStyle;
      if(x===0&&y===0&&w===W&&h===H){capture={hero:null,enemies:[],boss:null,frame:capture.frame+1}}
      if(isColor(fs,'#4ce2ac','rgb(76,226,172)')&&Math.abs(w-18)<.1&&h>20&&h<45){
        const p=point(this,x,y),visualH=h+9,crouch=visualH<40;
        const hx=p.x-9,hy=p.y-9;
        if(lastHeroX!==null){heroSpeed=heroSpeed*.65+(hx-lastHeroX)*.35;if(Math.abs(heroSpeed)>.2)facing=heroSpeed>0?1:-1}
        lastHeroX=hx;
        capture.hero={x:hx,y:hy,w:34,h:visualH,crouch,frame:capture.frame};
      }else if(isColor(fs,'#e86d72','rgb(232,109,114)')&&Math.abs(w-26)<.1&&Math.abs(h-15)<.1){
        const p=point(this,x,y);capture.enemies.push({type:'drone',x:p.x-5,y:p.y-5,w:36,h:25});
      }else if(isColor(fs,'#d95b63','rgb(217,91,99)')&&w>=18&&h>=28){
        const p=point(this,x,y);capture.enemies.push({type:'soldier',x:p.x-6,y:p.y-8,w:w+12,h:h+8});
      }else if(isColor(fs,'#a64f59','rgb(166,79,89)')&&w>=30&&h>=38){
        const p=point(this,x,y);capture.enemies.push({type:'heavy',x:p.x-6,y:p.y-8,w:w+12,h:h+8});
      }else if(isColor(fs,'#895764','rgb(137,87,100)')&&w>=20&&h>=20){
        const p=point(this,x,y);capture.enemies.push({type:'turret',x:p.x-6,y:p.y-8,w:w+12,h:h+8});
      }else if(isColor(fs,'#d75d68','rgb(215,93,104)')&&Math.abs(w-36)<.1&&Math.abs(h-24)<.1){
        const p=point(this,x,y);capture.enemies.push({type:'bunker',cx:p.x+18,cy:p.y+12,w:36,h:24});
      }else if(isColor(fs,'#552a53','rgb(85,42,83)')&&w>=90&&h>=90){
        const p=point(this,x,y);capture.boss={x:p.x,y:p.y,w,h};
      }
    }
    return prevFillRect.call(this,x,y,w,h);
  };

  proto.moveTo=function(x,y){
    if(this.canvas===gameCanvas&&isColor(this.strokeStyle,'#d9fff2','rgb(217,255,242)')&&Number(this.lineWidth)===5){gunPathStart={x,y}}
    return prevMoveTo.call(this,x,y);
  };
  proto.lineTo=function(x,y){
    if(this.canvas===gameCanvas&&gunPathStart&&isColor(this.strokeStyle,'#d9fff2','rgb(217,255,242)')&&Number(this.lineWidth)===5){
      const dx=x-gunPathStart.x,dy=y-gunPathStart.y,len=Math.hypot(dx,dy)||1;
      lastAim={x:dx/len,y:dy/len}; if(Math.abs(lastAim.x)>.18)facing=lastAim.x>0?1:-1;
      gunPathStart=null;
    }
    return prevLineTo.call(this,x,y);
  };

  function levelNumber(){return Math.max(1,parseInt(document.getElementById('level')?.textContent||'1',10)||1)}
  function palette(){
    const n=levelNumber();
    if(n===6)return{enemy:'#6f8590',enemy2:'#344650',accent:'#bfeeff',hero:'#50663c'};
    if(n===7||n===10)return{enemy:'#5b584f',enemy2:'#2a2b29',accent:'#ff9a4d',hero:'#5a6339'};
    if(n===11||n===12)return{enemy:'#66506d',enemy2:'#30283c',accent:'#71ffc6',hero:'#58653a'};
    if(n===4||n===9)return{enemy:'#6b5a45',enemy2:'#352c25',accent:'#ffd064',hero:'#5a6339'};
    return{enemy:'#52623b',enemy2:'#26301f',accent:'#ffcc54',hero:'#59663b'};
  }
  function roundRect(ctx,x,y,w,h,r){ctx.beginPath();ctx.roundRect?ctx.roundRect(x,y,w,h,r):(ctx.rect(x,y,w,h));}
  function ellipse(x,y,rx,ry,fill,stroke='#13171b',lw=2){g.beginPath();g.ellipse(x,y,rx,ry,0,0,Math.PI*2);g.fillStyle=fill;g.fill();if(stroke){g.strokeStyle=stroke;g.lineWidth=lw;g.stroke()}}
  function line(x1,y1,x2,y2,stroke,lw=2){g.beginPath();g.moveTo(x1,y1);g.lineTo(x2,y2);g.strokeStyle=stroke;g.lineWidth=lw;g.lineCap='round';g.stroke()}
  function glow(x,y,r,color){const q=g.createRadialGradient(x,y,0,x,y,r);q.addColorStop(0,color);q.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=q;g.fillRect(x-r,y-r,r*2,r*2)}

  function drawHero(h,t){
    if(!h)return;
    const aim=lastAim||{x:facing,y:0};
    const dir=Math.abs(aim.x)>.12?(aim.x>0?1:-1):facing;
    const feetY=h.y+h.h+4;
    const cx=h.x+h.w/2;
    const moving=Math.min(1,Math.abs(heroSpeed)/4);
    const run=Math.sin(t*.014)*moving;
    const crouch=h.crouch;
    const s=crouch?.82:1;
    const sc=1.22*s;
    const localAimX=dir<0?-aim.x:aim.x;
    const gunAngle=Math.atan2(aim.y,Math.max(.05,localAimX));
    const pal=palette();

    g.save();g.translate(cx,feetY);g.scale(dir*sc,sc);
    g.save();g.scale(dir,1);ellipse(0,0,22,5,'rgba(0,0,0,.42)',null,0);g.restore();

    const legShift=run*3;
    g.fillStyle='#171b17';g.strokeStyle='#090b0a';g.lineWidth=2.2;
    roundRect(g,-12+legShift,-13,10,13,3);g.fill();g.stroke();roundRect(g,3-legShift,-13,10,13,3);g.fill();g.stroke();
    g.fillStyle='#3f4c2d';
    g.beginPath();g.moveTo(-12,-31);g.lineTo(-2,-31);g.lineTo(0,-13);g.lineTo(-11,-13);g.closePath();g.fill();g.stroke();
    g.beginPath();g.moveTo(1,-31);g.lineTo(11,-30);g.lineTo(12,-13);g.lineTo(2,-13);g.closePath();g.fill();g.stroke();
    roundRect(g,-12,-24,9,6,2);g.fillStyle='#2a3422';g.fill();roundRect(g,4,-24,9,6,2);g.fill();

    const vest=g.createLinearGradient(0,-55,0,-29);vest.addColorStop(0,pal.hero);vest.addColorStop(1,'#26351f');
    g.fillStyle=vest;g.strokeStyle='#11150f';g.lineWidth=2.2;g.beginPath();g.moveTo(-15,-50);g.quadraticCurveTo(0,-59,15,-50);g.lineTo(12,-29);g.lineTo(-12,-29);g.closePath();g.fill();g.stroke();
    g.fillStyle='#1c281a';g.fillRect(-4,-51,8,22);g.fillStyle='#95a553';g.fillRect(-11,-43,5,7);g.fillRect(6,-43,5,7);
    g.fillStyle='#191a16';g.fillRect(-13,-31,26,5);g.fillStyle='#c18b36';g.fillRect(-3,-31,6,5);

    ellipse(-13,-45,6.5,8.5,'#c77943','#2a1710',2);ellipse(-15,-38,5.5,7,'#d58a50','#2a1710',2);
    g.fillStyle='#b96838';g.fillRect(-5,-59,10,8);
    ellipse(1,-66,9.5,10.5,'#d7874d','#26130d',2.2);
    ellipse(9,-65,2.5,3,'#bd6d3c','#26130d',1);g.fillStyle='#2b1710';g.fillRect(3,-68,5,2);g.fillRect(5,-63,5,1.5);
    g.fillStyle='#9e2d1f';g.beginPath();g.moveTo(-9,-70);g.lineTo(-4,-78);g.lineTo(2,-74);g.lineTo(7,-80);g.lineTo(11,-71);g.lineTo(7,-68);g.lineTo(-8,-66);g.closePath();g.fill();g.strokeStyle='#34100c';g.lineWidth=1.8;g.stroke();
    g.fillStyle='#d13b28';g.fillRect(-9,-70,20,3);line(-8,-69,-18,-65,'#d13b28',2.5);

    g.save();g.translate(2,-45);g.rotate(gunAngle);
    ellipse(8,0,8,5.7,'#d8874d','#25130d',2);ellipse(17,0,8,5.2,'#c97642','#25130d',2);
    roundRect(g,20,-4,8,8,2);g.fillStyle='#20251f';g.fill();g.strokeStyle='#0b0d0b';g.stroke();
    const gun=g.createLinearGradient(24,-5,24,5);gun.addColorStop(0,'#5e6c6e');gun.addColorStop(.45,'#242b2e');gun.addColorStop(1,'#0d1012');
    roundRect(g,23,-6,31,12,2);g.fillStyle=gun;g.fill();g.strokeStyle='#07090a';g.lineWidth=2;g.stroke();
    g.fillStyle='#8b5e2c';g.fillRect(31,5,7,8);g.fillStyle='#111518';g.fillRect(51,-3,17,5);g.fillRect(66,-2,8,3);g.fillRect(26,-9,10,3);
    g.fillStyle='#bdc8c4';g.fillRect(28,-4,11,1);g.fillRect(54,-2,9,1);g.fillStyle=pal.accent;g.fillRect(42,-3,3,3);
    g.restore();

    line(-9,-52,-5,-33,'#9a7041',2);line(10,-52,6,-34,'#9a7041',2);ellipse(-6,-50,2,2,'#d7aa5e',null,0);
    g.restore();
  }

  function drawSoldier(e,t,kind){
    const pal=palette();
    const heavy=kind==='heavy';
    const bunker=kind==='bunker';
    const sc=heavy?1.28:bunker?.9:1;
    const cx=bunker?e.cx:e.x+e.w/2;
    const feet=bunker?e.cy+15:e.y+e.h+3;
    const bob=Math.sin((t*.009)+(cx*.03))*1.1;
    g.save();g.translate(cx,feet+bob);g.scale(-sc,sc);
    g.save();g.scale(-1,1);ellipse(0,1,heavy?18:14,4,'rgba(0,0,0,.36)',null,0);g.restore();
    g.fillStyle='#111613';g.strokeStyle='#080a08';g.lineWidth=1.8;roundRect(g,-11,-10,9,11,2);g.fill();g.stroke();roundRect(g,3,-10,9,11,2);g.fill();g.stroke();
    g.fillStyle=pal.enemy2;g.beginPath();g.moveTo(-11,-27);g.lineTo(-1,-27);g.lineTo(0,-9);g.lineTo(-10,-9);g.closePath();g.fill();g.stroke();g.beginPath();g.moveTo(1,-27);g.lineTo(11,-27);g.lineTo(11,-9);g.lineTo(2,-9);g.closePath();g.fill();g.stroke();
    const gr=g.createLinearGradient(0,-50,0,-26);gr.addColorStop(0,pal.enemy);gr.addColorStop(1,pal.enemy2);g.fillStyle=gr;g.beginPath();g.moveTo(-14,-47);g.quadraticCurveTo(0,-54,14,-47);g.lineTo(12,-27);g.lineTo(-12,-27);g.closePath();g.fill();g.stroke();
    g.fillStyle='#1a211b';g.fillRect(-5,-46,10,18);g.fillStyle=pal.accent;g.globalAlpha=.7;g.fillRect(-2,-43,4,4);g.globalAlpha=1;
    roundRect(g,-19,-45,7,15,2);g.fillStyle='#202a21';g.fill();g.stroke();
    ellipse(0,-57,7.2,7.5,'#b98057','#241811',1.8);g.fillStyle=pal.enemy2;g.beginPath();g.arc(0,-60,8,Math.PI,0);g.lineTo(7,-58);g.lineTo(-7,-58);g.closePath();g.fill();g.strokeStyle='#10140f';g.stroke();g.fillStyle=pal.enemy;g.fillRect(-8,-60,16,2.5);g.fillStyle='#151a16';g.fillRect(2,-57,6,2);
    g.save();g.translate(2,-40);g.rotate(-.05);ellipse(8,1,6,4,'#aa714d','#241811',1.6);ellipse(16,0,6,3.8,'#b47a50','#241811',1.6);roundRect(g,16,-4,28,8,2);g.fillStyle='#252d2c';g.fill();g.strokeStyle='#090b0b';g.stroke();g.fillStyle='#0e1213';g.fillRect(40,-2,14,4);g.fillStyle='#909b8f';g.fillRect(22,-2,9,1);g.restore();
    if(heavy){ellipse(-13,-45,5,5,'#5b4938','#14110e',1.5);ellipse(13,-45,5,5,'#5b4938','#14110e',1.5)}
    g.restore();
  }

  function drawTurret(e){
    const pal=palette(),cx=e.x+e.w/2,base=e.y+e.h+2;
    g.save();g.translate(cx,base);ellipse(0,0,20,5,'rgba(0,0,0,.38)',null,0);
    roundRect(g,-17,-18,34,18,4);g.fillStyle='#303943';g.fill();g.strokeStyle='#0b0e11';g.lineWidth=2;g.stroke();
    roundRect(g,-10,-28,20,13,5);g.fillStyle=pal.enemy;g.fill();g.stroke();
    g.save();g.translate(-4,-22);g.rotate(Math.PI);g.fillStyle='#13191d';g.fillRect(0,-3,34,6);g.fillStyle='#7b888a';g.fillRect(3,-2,22,1);g.restore();
    ellipse(0,-22,3.5,3.5,pal.accent,'#121518',1);g.restore();
  }

  function drawDrone(e,t){
    const cx=e.x+e.w/2,cy=e.y+e.h/2;
    g.save();g.translate(cx,cy);const bob=Math.sin(t*.012+cx*.02)*2;g.translate(0,bob);
    glow(0,2,24,'rgba(255,72,62,.18)');
    line(-26,-8,26,-8,'#20292c',3);line(-18,-8,-26,-13,'#637072',2);line(18,-8,26,-13,'#637072',2);
    ellipse(-26,-13,13,2.2,'#30393b','#111416',1);ellipse(26,-13,13,2.2,'#30393b','#111416',1);
    roundRect(g,-18,-10,36,24,7);const body=g.createLinearGradient(0,-10,0,14);body.addColorStop(0,'#4d5659');body.addColorStop(1,'#151b1d');g.fillStyle=body;g.fill();g.strokeStyle='#07090a';g.lineWidth=2;g.stroke();
    ellipse(7,1,5.5,5.5,'#ff463c','#4d0b09',1.5);g.fillStyle='#8e9a9b';g.fillRect(-10,-6,8,4);g.fillStyle='#161b1c';g.fillRect(-5,13,5,8);g.fillRect(6,13,5,8);g.restore();
  }

  function drawBoss(b,t){
    if(!b)return;
    const pal=palette(),cx=b.x+b.w/2,cy=b.y+b.h/2;
    g.save();g.translate(cx,cy);const sc=Math.max(.8,Math.min(1.5,b.w/110));g.scale(sc,sc);
    glow(0,0,70,'rgba(255,72,98,.13)');
    g.fillStyle='#242b32';g.strokeStyle='#090c0f';g.lineWidth=4;
    roundRect(g,-43,34,18,48,5);g.fill();g.stroke();roundRect(g,25,34,18,48,5);g.fill();g.stroke();
    const armor=g.createLinearGradient(0,-55,0,50);armor.addColorStop(0,'#676f7a');armor.addColorStop(.45,'#343b45');armor.addColorStop(1,'#171d24');
    roundRect(g,-58,-54,116,105,14);g.fillStyle=armor;g.fill();g.stroke();
    g.fillStyle='#252d36';roundRect(g,-42,-38,84,72,9);g.fill();g.strokeStyle='#7a8790';g.lineWidth=2;g.stroke();
    line(-50,-18,50,-18,'#909aa0',1.2);line(0,-48,0,43,'#171b20',2);
    const pulse=.75+.25*Math.sin(t*.012);glow(0,0,28,`rgba(255,72,93,${.3*pulse})`);ellipse(0,0,13,13,'#ff4258','#6f101c',3);ellipse(0,0,5,5,'#fff09a',null,0);
    g.fillStyle='#151b20';g.fillRect(-86,-24,31,12);g.fillRect(55,-24,31,12);g.fillStyle='#7f8a8f';g.fillRect(-85,-21,23,3);g.fillRect(62,-21,23,3);
    ellipse(-35,-38,4,4,pal.accent,'#14181b',1);ellipse(35,-38,4,4,pal.accent,'#14181b',1);
    g.restore();
  }

  function render(t){
    g.clearRect(0,0,W,H);
    const game=document.getElementById('game');
    if(game&&!game.classList.contains('hidden')){
      if(capture.boss)drawBoss(capture.boss,t);
      for(const e of capture.enemies)if(e.type==='drone')drawDrone(e,t);else if(e.type==='turret')drawTurret(e,t);
      for(const e of capture.enemies)if(e.type==='soldier'||e.type==='heavy'||e.type==='bunker')drawSoldier(e,t,e.type);
      if(capture.hero)drawHero(capture.hero,t);
    }
    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
})();
