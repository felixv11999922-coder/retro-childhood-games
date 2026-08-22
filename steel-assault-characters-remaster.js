'use strict';
(function(){
  const canvas=document.getElementById('gameCanvas'),wrap=document.querySelector('.canvasWrap');
  if(!canvas||!wrap)return;
  const old=document.getElementById('steelCharacterArt');if(old)old.style.opacity='0';
  const W=canvas.width||960,H=canvas.height||540;
  const layer=document.createElement('canvas');layer.id='steelCharacterRemaster';layer.width=W;layer.height=H;layer.setAttribute('aria-hidden','true');
  const toast=document.getElementById('toast');wrap.insertBefore(layer,toast||null);Object.assign(layer.style,{position:'absolute',pointerEvents:'none',zIndex:'11'});if(toast)toast.style.zIndex='12';
  const g=layer.getContext('2d');g.imageSmoothingEnabled=true;
  function sync(){layer.style.left=canvas.offsetLeft+'px';layer.style.top=canvas.offsetTop+'px';layer.style.width=canvas.offsetWidth+'px';layer.style.height=canvas.offsetHeight+'px'}
  try{new ResizeObserver(sync).observe(canvas)}catch{}addEventListener('resize',sync,{passive:true});sync();

  const proto=CanvasRenderingContext2D.prototype;
  const nativeFillRect=proto.fillRect,nativeMoveTo=proto.moveTo,nativeLineTo=proto.lineTo,nativeStroke=proto.stroke;
  const norm=v=>String(v||'').replace(/\s+/g,'').toLowerCase();
  const eq=(v,hex,rgb)=>{const c=norm(v);return c===hex||c===rgb};
  const pt=(ctx,x,y)=>{try{const m=ctx.getTransform();return{x:m.a*x+m.c*y+m.e,y:m.b*x+m.d*y+m.f}}catch{return{x,y}}};
  let cap={hero:null,enemies:[],boss:null,frame:0};
  let aim={x:1,y:0},facing=1,lastHeroX=null,speed=0,gunStart=null;

  function hidePrimitive(fs,x,y,w,h){
    if(eq(fs,'#4ce2ac','rgb(76,226,172)')&&Math.abs(w-18)<1)return true;
    if(eq(fs,'#bdf6dc','rgb(189,246,220)')&&Math.abs(w-16)<1&&Math.abs(h-14)<1)return true;
    if(eq(fs,'#ffb24f','rgb(255,178,79)')&&Math.abs(w-10)<1&&Math.abs(h-5)<1)return true;
    if(eq(fs,'#1a2630','rgb(26,38,48)')&&Math.abs(w-9)<1&&Math.abs(h-9)<1)return true;
    if(eq(fs,'#d95b63','rgb(217,91,99)')||eq(fs,'#a64f59','rgb(166,79,89)')||eq(fs,'#895764','rgb(137,87,100)'))return true;
    if(eq(fs,'#f6b65e','rgb(246,182,94)')&&Math.abs(h-14)<1)return true;
    if(eq(fs,'#222a35','rgb(34,42,53)')&&((Math.abs(w-16)<1&&Math.abs(h-5)<1)||(Math.abs(w-8)<1&&Math.abs(h-8)<1)))return true;
    if(eq(fs,'#e86d72','rgb(232,109,114)')&&Math.abs(w-26)<1&&Math.abs(h-15)<1)return true;
    if(eq(fs,'#7f3440','rgb(127,52,64)')&&Math.abs(w-7)<1&&Math.abs(h-5)<1)return true;
    if(eq(fs,'#ffd34f','rgb(255,211,79)')&&Math.abs(w-7)<1&&Math.abs(h-5)<1)return true;
    if(eq(fs,'#d75d68','rgb(215,93,104)')&&Math.abs(w-36)<1&&Math.abs(h-24)<1)return true;
    return false;
  }
  proto.fillRect=function(x,y,w,h){
    if(this.canvas===canvas){const fs=this.fillStyle;
      if(x===0&&y===0&&w===W&&h===H)cap={hero:null,enemies:[],boss:null,frame:cap.frame+1};
      if(eq(fs,'#4ce2ac','rgb(76,226,172)')&&Math.abs(w-18)<1&&h>20&&h<50){const p=pt(this,x,y),hh=h+9,hx=p.x-9,hy=p.y-9;if(lastHeroX!==null){speed=speed*.72+(hx-lastHeroX)*.28;if(Math.abs(speed)>.1)facing=speed>0?1:-1}lastHeroX=hx;cap.hero={x:hx,y:hy,w:34,h:hh,crouch:hh<40}}
      else if(eq(fs,'#e86d72','rgb(232,109,114)')&&Math.abs(w-26)<1&&Math.abs(h-15)<1){const p=pt(this,x,y);cap.enemies.push({type:'drone',x:p.x-5,y:p.y-5,w:36,h:25})}
      else if(eq(fs,'#d95b63','rgb(217,91,99)')&&w>=18&&h>=28){const p=pt(this,x,y);cap.enemies.push({type:'soldier',x:p.x-6,y:p.y-8,w:w+12,h:h+8})}
      else if(eq(fs,'#a64f59','rgb(166,79,89)')&&w>=28&&h>=35){const p=pt(this,x,y);cap.enemies.push({type:'heavy',x:p.x-6,y:p.y-8,w:w+12,h:h+8})}
      else if(eq(fs,'#895764','rgb(137,87,100)')&&w>=18&&h>=18){const p=pt(this,x,y);cap.enemies.push({type:'turret',x:p.x-6,y:p.y-8,w:w+12,h:h+8})}
      else if(eq(fs,'#d75d68','rgb(215,93,104)')&&Math.abs(w-36)<1&&Math.abs(h-24)<1){const p=pt(this,x,y);cap.enemies.push({type:'bunker',x:p.x-18,y:p.y-12,w:36,h:24})}
      else if(eq(fs,'#552a53','rgb(85,42,83)')&&w>=90&&h>=90){const p=pt(this,x,y);cap.boss={x:p.x,y:p.y,w,h}}
      if(hidePrimitive(fs,x,y,w,h))return;
    }
    return nativeFillRect.call(this,x,y,w,h);
  };
  proto.moveTo=function(x,y){if(this.canvas===canvas&&eq(this.strokeStyle,'#d9fff2','rgb(217,255,242)')&&Number(this.lineWidth)===5)gunStart=pt(this,x,y);return nativeMoveTo.call(this,x,y)};
  proto.lineTo=function(x,y){if(this.canvas===canvas&&gunStart&&eq(this.strokeStyle,'#d9fff2','rgb(217,255,242)')&&Number(this.lineWidth)===5){const p=pt(this,x,y),dx=p.x-gunStart.x,dy=p.y-gunStart.y,l=Math.hypot(dx,dy)||1;aim={x:dx/l,y:dy/l};if(Math.abs(aim.x)>.12)facing=aim.x>0?1:-1;gunStart=null}return nativeLineTo.call(this,x,y)};
  proto.stroke=function(){if(this.canvas===canvas&&eq(this.strokeStyle,'#d9fff2','rgb(217,255,242)')&&Number(this.lineWidth)===5)return;return nativeStroke.call(this)};

  const level=()=>Math.max(1,parseInt(document.getElementById('level')?.textContent||'1',10)||1);
  function enemyPalette(){const n=level();if(n===6)return{cloth:'#74858a',cloth2:'#9aa8a8',dark:'#283238',metal:'#59666b',accent:'#caeef4'};if(n===4||n===9)return{cloth:'#6e5b40',cloth2:'#947650',dark:'#2b241a',metal:'#665544',accent:'#e7bf69'};if(n===7||n===10)return{cloth:'#5e554d',cloth2:'#7b6a5c',dark:'#262523',metal:'#555d61',accent:'#ef7e53'};if(n===11||n===12)return{cloth:'#4d4659',cloth2:'#71627c',dark:'#25202d',metal:'#5d5267',accent:'#75efb8'};return{cloth:'#4f6038',cloth2:'#74834f',dark:'#222a1b',metal:'#4c5550',accent:'#d2ca75'}}
  function rr(x,y,w,h,r,fill,stroke='#11110f',lw=2){g.beginPath();if(g.roundRect)g.roundRect(x,y,w,h,r);else g.rect(x,y,w,h);g.fillStyle=fill;g.fill();if(stroke){g.strokeStyle=stroke;g.lineWidth=lw;g.stroke()}}
  function el(x,y,rx,ry,fill,stroke='#171310',lw=2){g.beginPath();g.ellipse(x,y,rx,ry,0,0,Math.PI*2);g.fillStyle=fill;g.fill();if(stroke){g.strokeStyle=stroke;g.lineWidth=lw;g.stroke()}}
  function ln(x1,y1,x2,y2,c,lw=3,a=1){g.save();g.globalAlpha=a;g.beginPath();g.moveTo(x1,y1);g.lineTo(x2,y2);g.strokeStyle=c;g.lineWidth=lw;g.lineCap='round';g.stroke();g.restore()}
  function poly(p,fill,stroke='#15110d',lw=2){g.beginPath();g.moveTo(p[0][0],p[0][1]);for(let i=1;i<p.length;i++)g.lineTo(p[i][0],p[i][1]);g.closePath();g.fillStyle=fill;g.fill();if(stroke){g.strokeStyle=stroke;g.lineWidth=lw;g.stroke()}}
  function grd(a,b,x1,y1,x2,y2){const q=g.createLinearGradient(x1,y1,x2,y2);q.addColorStop(0,a);q.addColorStop(1,b);return q}
  function glow(x,y,r,c){const q=g.createRadialGradient(x,y,0,x,y,r);q.addColorStop(0,c);q.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=q;g.fillRect(x-r,y-r,r*2,r*2)}
  function shadow(x,y,rx,a=.48){el(x,y,rx,6,'rgba(0,0,0,'+a+')',null,0)}
  function scratch(x,y,w,h,c='rgba(255,255,255,.16)'){g.save();g.strokeStyle=c;g.lineWidth=1;for(let i=0;i<4;i++){g.beginPath();g.moveTo(x+(i*17)%w,y+(i*11)%h);g.lineTo(x+8+(i*19)%w,y+3+(i*13)%h);g.stroke()}g.restore()}

  function drawHero(h,t){
    if(!h)return;const dir=Math.abs(aim.x)>.12?(aim.x>0?1:-1):facing;const cx=h.x+h.w/2,feet=h.y+h.h+8;const moving=Math.min(1,Math.abs(speed)/3),run=Math.sin(t*.019)*moving;const scale=h.crouch?1.85:2.35;const ax=dir<0?-aim.x:aim.x,ang=Math.atan2(aim.y,Math.max(.08,ax));
    g.save();g.translate(cx,feet);g.scale(dir*scale,scale);shadow(0,2,22,.6);
    // boots
    rr(-15+run*3,-9,14,9,3,'#16191a','#050607',1.7);rr(2-run*3,-9,14,9,3,'#16191a','#050607',1.7);rr(-13+run*3,-7,11,3,1,'#494f4e',null);rr(4-run*3,-7,11,3,1,'#494f4e',null);
    // trousers
    poly([[-14,-34],[-2,-35],[1,-9],[-13,-9]],grd('#69734a','#30391f',0,-34,0,-8));poly([[2,-35],[14,-33],[13,-9],[1,-9]],grd('#69734a','#30391f',0,-34,0,-8));
    rr(-15,-31,9,7,2,'#28351f',null);rr(7,-31,9,7,2,'#28351f',null);
    // exposed muscular arms behind rifle
    el(-17,-54,9,12,'#c77a48','#2c160e',2);el(-14,-43,7,10,'#d58a52','#2c160e',2);ln(-21,-57,-17,-50,'#efae72',2,.55);ln(-18,-46,-14,-40,'#efae72',2,.45);
    el(17,-53,9,12,'#c77847','#2c160e',2);
    // torso and vest
    poly([[-17,-58],[-8,-64],[8,-64],[18,-56],[14,-31],[-13,-31]],grd('#70814a','#2b3a24',0,-62,0,-30),'#11170f',2.4);
    rr(-5,-59,10,27,2,'#1b2619',null);rr(-14,-49,7,10,2,'#8a9b5a',null);rr(7,-49,7,10,2,'#8a9b5a',null);rr(-15,-35,30,7,2,'#161d14',null);rr(-3,-35,7,7,1,'#b78439','#4d3418',1);
    // shoulder pads / straps
    poly([[-18,-57],[-8,-62],[-5,-56],[-13,-51]],'#344527','#10150d',1.5);poly([[18,-56],[8,-62],[5,-56],[13,-50]],'#344527','#10150d',1.5);
    // neck, face, jaw
    rr(-5,-70,10,11,3,'#bd6d3c','#32180e',1.5);el(1,-79,12,13,'#d78b52','#32180e',2.2);poly([[7,-78],[15,-74],[10,-68],[4,-68]],'#bd6b3f',null);g.fillStyle='#3a1b10';g.fillRect(5,-81,7,2);g.fillRect(6,-74,7,1.5);g.fillStyle='#f2d0a7';g.fillRect(7,-83,2,2);ln(-5,-73,4,-72,'#ae5d35',1.2,.55);
    // hair + red bandana
    poly([[-11,-83],[-7,-92],[-1,-88],[4,-94],[8,-87],[14,-85],[11,-78],[-10,-78]],'#4a2115','#211009',1.6);rr(-11,-84,24,4,1,'#c93627','#5d160f',1);poly([[-9,-82],[-23,-76],[-15,-70],[-5,-76]],'#d33c2b','#5d160f',1.2);
    // front arm + rifle
    g.save();g.translate(0,-51);g.rotate(ang);el(8,3,7.5,6,'#d18750','#2a150d',1.7);el(18,2,7,5.2,'#c67645','#2a150d',1.7);rr(18,-6,12,11,2,'#202622','#07090a',1.5);
    const gun=grd('#6e7777','#171c1e',25,-8,25,8);rr(26,-8,42,16,3,gun,'#07090a',2);rr(36,7,9,12,1,'#77502b','#16100c',1.4);rr(34,-13,15,5,1,'#252c2d','#080a0b',1.2);g.fillStyle='#111516';g.fillRect(65,-5,24,8);g.fillStyle='#8f9b98';g.fillRect(30,-4,20,2);g.fillRect(67,-2,15,2);g.fillStyle='#d4a84b';g.fillRect(50,-3,5,5);scratch(28,-7,35,13);
    if(performance.now()%210<72){const mx=90,my=-1;g.fillStyle='#fff0a4';poly([[mx,my],[mx+17,my-7],[mx+33,my],[mx+17,my+7]],'#ffd052',null);glow(mx+14,my,18,'rgba(255,175,58,.45)')}
    g.restore();
    // rim light and tiny details
    ln(-12,-59,-6,-64,'#d7e582',1.5,.5);ln(-12,-33,-8,-12,'#a7b978',1.2,.35);g.restore();
  }

  function drawSoldier(e,t,heavy=false,bunker=false){
    const P=enemyPalette(),sc=heavy?2.05:bunker?1.8:1.72;const cx=bunker?e.x+e.w/2:e.x+e.w/2,feet=bunker?e.y+e.h/2+14:e.y+e.h+5,bob=Math.sin(t*.011+cx*.025)*1.1;
    g.save();g.translate(cx,feet+bob);g.scale(-sc,sc);shadow(0,1,17,.5);
    rr(-12,-9,11,9,3,'#171918','#050606',1.4);rr(2,-9,11,9,3,'#171918','#050606',1.4);
    poly([[-12,-30],[-2,-30],[0,-9],[-11,-9]],grd(P.cloth2,P.dark,0,-30,0,-8));poly([[2,-30],[12,-30],[11,-9],[1,-9]],grd(P.cloth2,P.dark,0,-30,0,-8));
    // body armour
    el(-13,-47,7,9,'#9e704e','#26180f',1.7);el(13,-47,7,9,'#9e704e','#26180f',1.7);poly([[-15,-52],[-7,-57],[8,-57],[16,-51],[12,-29],[-12,-29]],grd(P.cloth2,P.cloth,0,-56,0,-28),'#10140f',2);rr(-5,-52,10,22,2,P.dark,null);rr(-14,-43,7,10,2,P.metal,null);rr(7,-43,7,10,2,P.metal,null);rr(-13,-33,26,6,2,'#1e221e',null);
    // head / helmet / goggles
    el(0,-66,9,9,'#ae7954','#26180f',1.7);g.fillStyle=P.dark;g.beginPath();g.arc(0,-69,10,Math.PI,0);g.lineTo(9,-65);g.lineTo(-9,-65);g.closePath();g.fill();g.strokeStyle='#0b0d0b';g.lineWidth=1.4;g.stroke();rr(-10,-68,20,3,1,P.cloth2,null);rr(-5,-66,5,2,1,'#1a2220',null);rr(2,-66,5,2,1,'#1a2220',null);
    // weapon
    g.save();g.translate(0,-45);g.rotate(-.035);el(8,2,6,4.5,'#a87752','#251710',1.4);el(17,2,6,4,'#aa7852','#251710',1.4);rr(17,-5,33,10,2,grd('#505b58','#181d1d',17,-5,17,5),'#080a0a',1.6);g.fillStyle='#0e1212';g.fillRect(47,-3,20,6);g.fillStyle='#909d95';g.fillRect(24,-2,12,1.5);rr(28,5,8,9,1,'#655039','#18120e',1);g.restore();
    if(heavy){rr(-19,-54,9,14,3,'#665c4d','#17130f',1.5);rr(10,-54,9,14,3,'#665c4d','#17130f',1.5);rr(-16,-37,32,8,2,'#3a322b',null);rr(-6,-51,12,9,2,'#7c765f',null)}
    ln(-10,-55,-6,-58,P.accent,1.2,.35);g.restore();
  }

  function drawDrone(e,t){const cx=e.x+e.w/2,cy=e.y+e.h/2;g.save();g.translate(cx,cy);g.scale(1.75,1.75);shadow(0,16,17,.32);const tilt=Math.sin(t*.009+cx*.02)*.08;g.rotate(tilt);rr(-16,-9,32,18,6,grd('#59636a','#20272d',0,-9,0,9),'#090c0f',2);rr(-8,-13,16,8,3,'#30383e','#0a0d0f',1.5);el(0,0,5,5,'#e84e48','#30100f',1.3);glow(0,0,13,'rgba(255,73,67,.35)');ln(-14,-7,-30,-15,'#363f43',3);ln(14,-7,30,-15,'#363f43',3);ln(-35,-15,-24,-15,'#8d999c',2);ln(24,-15,35,-15,'#8d999c',2);for(let x of[-30,30]){g.strokeStyle='rgba(170,190,196,.72)';g.lineWidth=2;g.beginPath();g.ellipse(x,-15,12,2,0,0,Math.PI*2);g.stroke()}rr(-4,9,8,6,2,'#121719',null);g.restore()}
  function drawTurret(e){const P=enemyPalette(),cx=e.x+e.w/2,base=e.y+e.h+4;g.save();g.translate(cx,base);g.scale(1.75,1.75);shadow(0,1,21,.58);rr(-21,-18,42,18,5,grd('#565f60','#23292d',0,-18,0,0),'#080b0d',2);rr(-12,-31,24,15,7,P.cloth,'#0a0d0f',2);g.save();g.translate(-3,-24);g.rotate(Math.PI);g.fillStyle='#15191b';g.fillRect(0,-4,42,8);g.fillStyle='#899495';g.fillRect(5,-2,31,2);g.restore();el(0,-24,4,4,P.accent,'#151719',1);rr(-16,-7,32,4,1,'#15191c',null);g.restore()}
  function drawBoss(b,t){if(!b)return;const cx=b.x+b.w/2,cy=b.y+b.h/2,n=level(),P=enemyPalette(),s=Math.max(1.05,Math.min(1.55,b.w/110));g.save();g.translate(cx,cy);g.scale(s,s);shadow(0,b.h*.48,70,.6);glow(0,0,80,n===12?'rgba(255,67,112,.34)':'rgba(255,185,75,.25)');
    // legs / external armour
    if(b.h>130||n===1||n===4||n===6){poly([[-50,48],[-25,44],[-18,88],[-48,92]],'#3a4244','#0b0d0e',3);poly([[50,48],[25,44],[18,88],[48,92]],'#3a4244','#0b0d0e',3);rr(-55,82,37,14,5,'#202527','#080a0b',2);rr(18,82,37,14,5,'#202527','#080a0b',2)}
    // chassis
    poly([[-72,-44],[-45,-66],[45,-66],[72,-42],[66,44],[42,62],[-42,62],[-66,43]],grd(P.metal,'#20262a',0,-65,0,60),'#090b0d',4);rr(-52,-38,104,78,13,grd(P.cloth2,P.dark,0,-38,0,40),'#0d1011',3);rr(-36,-23,72,48,8,'#20262b','#0b0d0e',2);scratch(-50,-36,100,70,'rgba(255,255,255,.12)');
    // shoulder guns
    for(const side of[-1,1]){g.save();g.scale(side,1);rr(45,-32,35,23,5,'#414a4d','#090b0c',2);g.fillStyle='#111617';g.fillRect(72,-27,40,9);g.fillStyle='#8a9694';g.fillRect(77,-24,29,2);g.restore()}
    // core
    const core=n===12?'#ff4f7b':P.accent;glow(0,0,36,core);el(0,0,20,20,core,'#171518',3);el(0,0,8,8,'#fff3b2','#342c24',1.5);g.rotate(Math.sin(t*.002)*.03);for(let i=0;i<6;i++){const a=i*Math.PI/3;ln(Math.cos(a)*27,Math.sin(a)*27,Math.cos(a)*42,Math.sin(a)*42,core,3,.55)}g.restore()}

  let last=performance.now();
  function render(now){g.clearRect(0,0,W,H);if(cap.hero)drawHero(cap.hero,now);for(const e of cap.enemies){if(e.type==='drone')drawDrone(e,now);else if(e.type==='turret')drawTurret(e);else drawSoldier(e,now,e.type==='heavy',e.type==='bunker')}if(cap.boss)drawBoss(cap.boss,now);last=now;requestAnimationFrame(render)}
  requestAnimationFrame(render);
})();
