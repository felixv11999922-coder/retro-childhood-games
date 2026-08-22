'use strict';
(function(){
  const gameCanvas=document.getElementById('gameCanvas');
  const wrap=document.querySelector('.canvasWrap');
  if(!gameCanvas||!wrap)return;

  const W=gameCanvas.width||960,H=gameCanvas.height||540;
  const layer=document.createElement('canvas');
  layer.id='steelCharacterArt';
  layer.width=W;layer.height=H;
  layer.setAttribute('aria-hidden','true');
  const toast=document.getElementById('toast');
  wrap.insertBefore(layer,toast||null);
  Object.assign(layer.style,{position:'absolute',pointerEvents:'none',zIndex:'9'});
  if(toast)toast.style.zIndex='10';
  const g=layer.getContext('2d');
  g.imageSmoothingEnabled=true;

  function sync(){
    layer.style.left=gameCanvas.offsetLeft+'px';
    layer.style.top=gameCanvas.offsetTop+'px';
    layer.style.width=gameCanvas.offsetWidth+'px';
    layer.style.height=gameCanvas.offsetHeight+'px';
  }
  try{new ResizeObserver(sync).observe(gameCanvas)}catch{}
  addEventListener('resize',sync,{passive:true});sync();

  let capture={hero:null,enemies:[],boss:null,frame:0};
  let lastAim={x:1,y:0},facing=1,lastHeroX=null,heroSpeed=0,gunStart=null;
  const proto=CanvasRenderingContext2D.prototype;
  const nativeFillRect=proto.fillRect,nativeMoveTo=proto.moveTo,nativeLineTo=proto.lineTo;

  const norm=v=>String(v||'').replace(/\s+/g,'').toLowerCase();
  const eq=(v,hex,rgb)=>{const c=norm(v);return c===hex||c===rgb};
  function pt(ctx,x,y){try{const m=ctx.getTransform();return{x:m.a*x+m.c*y+m.e,y:m.b*x+m.d*y+m.f}}catch{return{x,y}}}

  proto.fillRect=function(x,y,w,h){
    if(this.canvas===gameCanvas){
      const fs=this.fillStyle;
      if(x===0&&y===0&&w===W&&h===H)capture={hero:null,enemies:[],boss:null,frame:capture.frame+1};
      if(eq(fs,'#4ce2ac','rgb(76,226,172)')&&Math.abs(w-18)<1&&h>20&&h<46){
        const p=pt(this,x,y),vh=h+9,hx=p.x-9,hy=p.y-9;
        if(lastHeroX!==null){heroSpeed=heroSpeed*.72+(hx-lastHeroX)*.28;if(Math.abs(heroSpeed)>.15)facing=heroSpeed>0?1:-1}
        lastHeroX=hx;capture.hero={x:hx,y:hy,w:34,h:vh,crouch:vh<40};
      }else if(eq(fs,'#e86d72','rgb(232,109,114)')&&Math.abs(w-26)<1&&Math.abs(h-15)<1){const p=pt(this,x,y);capture.enemies.push({type:'drone',x:p.x-5,y:p.y-5,w:36,h:25});
      }else if(eq(fs,'#d95b63','rgb(217,91,99)')&&w>=18&&h>=28){const p=pt(this,x,y);capture.enemies.push({type:'soldier',x:p.x-6,y:p.y-8,w:w+12,h:h+8});
      }else if(eq(fs,'#a64f59','rgb(166,79,89)')&&w>=28&&h>=35){const p=pt(this,x,y);capture.enemies.push({type:'heavy',x:p.x-6,y:p.y-8,w:w+12,h:h+8});
      }else if(eq(fs,'#895764','rgb(137,87,100)')&&w>=18&&h>=18){const p=pt(this,x,y);capture.enemies.push({type:'turret',x:p.x-6,y:p.y-8,w:w+12,h:h+8});
      }else if(eq(fs,'#d75d68','rgb(215,93,104)')&&Math.abs(w-36)<1&&Math.abs(h-24)<1){const p=pt(this,x,y);capture.enemies.push({type:'bunker',cx:p.x+18,cy:p.y+12,w:36,h:24});
      }else if(eq(fs,'#552a53','rgb(85,42,83)')&&w>=90&&h>=90){const p=pt(this,x,y);capture.boss={x:p.x,y:p.y,w,h};}
    }
    return nativeFillRect.call(this,x,y,w,h);
  };
  proto.moveTo=function(x,y){if(this.canvas===gameCanvas&&eq(this.strokeStyle,'#d9fff2','rgb(217,255,242)')&&Number(this.lineWidth)===5)gunStart={x,y};return nativeMoveTo.call(this,x,y)};
  proto.lineTo=function(x,y){if(this.canvas===gameCanvas&&gunStart&&eq(this.strokeStyle,'#d9fff2','rgb(217,255,242)')&&Number(this.lineWidth)===5){const dx=x-gunStart.x,dy=y-gunStart.y,l=Math.hypot(dx,dy)||1;lastAim={x:dx/l,y:dy/l};if(Math.abs(lastAim.x)>.18)facing=lastAim.x>0?1:-1;gunStart=null}return nativeLineTo.call(this,x,y)};

  const lvl=()=>Math.max(1,parseInt(document.getElementById('level')?.textContent||'1',10)||1);
  function pal(){const n=lvl();if(n===6)return{cloth:'#718b82',dark:'#293a38',light:'#d8eef1',accent:'#a7eaff'};if(n===7||n===10)return{cloth:'#685b4a',dark:'#2b2722',light:'#d6b07a',accent:'#ff9d4d'};if(n===11||n===12)return{cloth:'#62506f',dark:'#30283d',light:'#d4a9d9',accent:'#70ffbf'};if(n===4||n===9)return{cloth:'#756044',dark:'#32291f',light:'#d9b477',accent:'#ffd15c'};return{cloth:'#526b3c',dark:'#25311f',light:'#b6c87b',accent:'#ffcf4e'}}
  function rr(x,y,w,h,r,fill,stroke='#080b0d',lw=2){g.beginPath();g.roundRect?g.roundRect(x,y,w,h,r):g.rect(x,y,w,h);g.fillStyle=fill;g.fill();if(stroke){g.strokeStyle=stroke;g.lineWidth=lw;g.stroke()}}
  function el(x,y,rx,ry,fill,stroke='#101214',lw=2){g.beginPath();g.ellipse(x,y,rx,ry,0,0,Math.PI*2);g.fillStyle=fill;g.fill();if(stroke){g.strokeStyle=stroke;g.lineWidth=lw;g.stroke()}}
  function ln(x1,y1,x2,y2,color,lw=3){g.beginPath();g.moveTo(x1,y1);g.lineTo(x2,y2);g.strokeStyle=color;g.lineWidth=lw;g.lineCap='round';g.stroke()}
  function grad(a,b,y1,y2){const q=g.createLinearGradient(0,y1,0,y2);q.addColorStop(0,a);q.addColorStop(1,b);return q}
  function shadow(x,y,rx){el(x,y,rx,7,'rgba(0,0,0,.52)',null,0)}
  function glow(x,y,r,c){const q=g.createRadialGradient(x,y,0,x,y,r);q.addColorStop(0,c);q.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=q;g.fillRect(x-r,y-r,r*2,r*2)}

  function hero(h,t){if(!h)return;const a=lastAim||{x:facing,y:0};const dir=Math.abs(a.x)>.1?(a.x>0?1:-1):facing;const cx=h.x+h.w/2,feet=h.y+h.h+5;const moving=Math.min(1,Math.abs(heroSpeed)/3);const run=Math.sin(t*.016)*moving;const scale=h.crouch?1.78:2.12;const localX=dir<0?-a.x:a.x,gunAng=Math.atan2(a.y,Math.max(.06,localX));
    g.save();g.translate(cx,feet);g.scale(dir*scale,scale);shadow(0,1,19);
    // boots and animated legs
    rr(-13+run*3,-10,12,10,3,'#181715');rr(2-run*3,-10,12,10,3,'#181715');
    g.fillStyle='#4a5631';g.strokeStyle='#171d11';g.lineWidth=2;g.beginPath();g.moveTo(-13,-32);g.lineTo(-2,-33);g.lineTo(0,-9);g.lineTo(-12,-9);g.closePath();g.fill();g.stroke();g.beginPath();g.moveTo(2,-33);g.lineTo(13,-31);g.lineTo(12,-9);g.lineTo(1,-9);g.closePath();g.fill();g.stroke();
    rr(-15,-28,8,7,2,'#26301d',null);rr(7,-28,8,7,2,'#26301d',null);
    // muscular torso / vest
    el(-14,-47,8,11,'#c67742','#2e160c',2);el(14,-47,8,11,'#c67742','#2e160c',2);
    g.fillStyle=grad('#60743e','#28361e',-58,-29);g.strokeStyle='#10150d';g.lineWidth=2.3;g.beginPath();g.moveTo(-17,-53);g.quadraticCurveTo(0,-62,17,-53);g.lineTo(13,-29);g.lineTo(-13,-29);g.closePath();g.fill();g.stroke();
    rr(-5,-54,10,24,2,'#1d2819',null);rr(-13,-45,6,9,2,'#829257',null);rr(7,-45,6,9,2,'#829257',null);rr(-14,-32,28,6,2,'#161a13',null);rr(-3,-32,7,6,1,'#bc8434',null);
    // neck and face
    rr(-5,-64,10,10,3,'#bd6b39','#2b140c',1.8);el(2,-72,11,12,'#d18449','#29140c',2.2);el(12,-71,3,3.5,'#b96636','#29140c',1.3);g.fillStyle='#31180e';g.fillRect(4,-74,7,2);g.fillRect(6,-68,7,1.5);g.fillStyle='#f4d2a8';g.fillRect(6,-76,2,2);
    // iconic red hair / bandana
    g.fillStyle='#b22f1f';g.beginPath();g.moveTo(-10,-77);g.lineTo(-5,-87);g.lineTo(1,-82);g.lineTo(7,-89);g.lineTo(13,-78);g.lineTo(8,-73);g.lineTo(-9,-72);g.closePath();g.fill();g.strokeStyle='#401008';g.lineWidth=2;g.stroke();rr(-10,-78,23,4,1,'#d33a26',null);ln(-8,-76,-22,-70,'#d33a26',3);
    // rear arm
    el(-10,-45,7,9,'#c87843','#2b160d',2);el(-7,-37,6,8,'#d1854c','#2b160d',2);
    // gun and front arm
    g.save();g.translate(2,-46);g.rotate(gunAng);el(8,1,7.5,6,'#d4864d','#2a150d',2);el(18,1,7.5,5.5,'#c57341','#2a150d',2);rr(18,-5,10,10,2,'#202722','#07090a',1.5);rr(25,-7,34,14,3,grad('#697476','#181d20',-7,7),'#07090a',2);rr(34,6,8,10,1,'#825426','#16100b',1.5);g.fillStyle='#101416';g.fillRect(56,-4,20,6);g.fillRect(74,-3,9,4);g.fillRect(29,-11,12,4);g.fillStyle='#aeb9b5';g.fillRect(31,-4,12,1.5);g.fillRect(59,-2,10,1.5);g.fillStyle='#ffcc47';g.fillRect(45,-3,4,4);g.restore();
    if(performance.now()%250<65){const mx=2+Math.cos(gunAng)*83,my=-46+Math.sin(gunAng)*83;g.fillStyle='rgba(255,190,58,.9)';g.beginPath();g.moveTo(mx,my);g.lineTo(mx+dir*12,my-5);g.lineTo(mx+dir*22,my);g.lineTo(mx+dir*12,my+5);g.closePath();g.fill()}
    g.restore();
  }

  function soldier(e,t,kind='soldier'){
    const P=pal(),heavy=kind==='heavy',bunker=kind==='bunker';const sc=heavy?2.05:bunker?1.45:1.72;const cx=bunker?e.cx:e.x+e.w/2,feet=bunker?e.cy+15:e.y+e.h+4;const bob=Math.sin(t*.01+cx*.03)*1.2;
    g.save();g.translate(cx,feet+bob);g.scale(-sc,sc);shadow(0,1,16);
    rr(-11,-10,10,10,3,'#161814');rr(2,-10,10,10,3,'#161814');g.fillStyle=P.dark;g.strokeStyle='#11150f';g.lineWidth=1.8;g.beginPath();g.moveTo(-12,-28);g.lineTo(-2,-28);g.lineTo(0,-9);g.lineTo(-11,-9);g.closePath();g.fill();g.stroke();g.beginPath();g.moveTo(2,-28);g.lineTo(12,-28);g.lineTo(11,-9);g.lineTo(1,-9);g.closePath();g.fill();g.stroke();
    el(-13,-44,6,8,'#9c6a49','#251710',1.7);el(13,-44,6,8,'#9c6a49','#251710',1.7);g.fillStyle=grad(P.cloth,P.dark,-53,-27);g.beginPath();g.moveTo(-15,-49);g.quadraticCurveTo(0,-56,15,-49);g.lineTo(12,-27);g.lineTo(-12,-27);g.closePath();g.fill();g.stroke();rr(-5,-47,10,19,2,'#182019',null);rr(-19,-46,7,16,2,'#222a22','#10130f',1.5);
    el(0,-61,8,8,'#b27b55','#281910',1.8);g.fillStyle=P.dark;g.beginPath();g.arc(0,-64,9,Math.PI,0);g.lineTo(8,-61);g.lineTo(-8,-61);g.closePath();g.fill();g.strokeStyle='#0d110d';g.stroke();rr(-9,-64,18,3,1,P.cloth,null);g.fillStyle='#181b17';g.fillRect(3,-61,6,2);
    g.save();g.translate(1,-42);g.rotate(-.04);el(8,1,6,4.5,'#a87250','#251710',1.5);el(17,1,6,4,'#ae7751','#251710',1.5);rr(17,-4,30,9,2,'#252d2c','#080a0b',1.6);g.fillStyle='#0f1314';g.fillRect(43,-2,17,5);g.fillStyle='#96a49a';g.fillRect(23,-2,10,1);g.restore();
    if(heavy){rr(-19,-51,8,12,3,'#635849','#17130f',1.5);rr(11,-51,8,12,3,'#635849','#17130f',1.5);rr(-16,-37,32,7,2,'#3b3028',null)}
    g.restore();
  }

  function turret(e){const P=pal(),cx=e.x+e.w/2,base=e.y+e.h+3;g.save();g.translate(cx,base);g.scale(1.7,1.7);shadow(0,1,19);rr(-19,-18,38,18,5,'#343d43','#0a0d0f',2);rr(-11,-29,22,14,6,P.cloth,'#0a0d0f',2);g.save();g.translate(-4,-23);g.rotate(Math.PI);g.fillStyle='#13181b';g.fillRect(0,-4,38,8);g.fillStyle='#8d999c';g.fillRect(4,-2,27,2);g.restore();el(0,-23,4,4,P.accent,'#17191b',1);g.restore()}
  function drone(e,t){const cx=e.x+e.w/2,cy=e.y+e.h/2;g.save();g.translate(cx,cy+Math.sin(t*.013+cx*.02)*3);g.scale(1.8,1.8);glow(0,3,35,'rgba(255,64,52,.25)');ln(-28,-10,28,-10,'#222a2c',3);el(-29,-15,15,2.5,'#394246','#0d1112',1);el(29,-15,15,2.5,'#394246','#0d1112',1);rr(-20,-12,40,27,8,grad('#626c70','#161c1f',-12,15),'#080a0b',2.2);el(8,1,6.5,6.5,'#ff4136','#5b0c08',1.5);g.fillStyle='#a7b0ae';g.fillRect(-12,-7,10,4);g.fillStyle='#101516';g.fillRect(-7,14,6,9);g.fillRect(7,14,6,9);g.fillStyle='#ff873b';g.beginPath();g.moveTo(-4,23);g.lineTo(0,35);g.lineTo(4,23);g.closePath();g.fill();g.restore()}
  function boss(b,t){if(!b)return;const P=pal(),cx=b.x+b.w/2,cy=b.y+b.h/2,sc=Math.max(1.2,Math.min(2,b.w/90));g.save();g.translate(cx,cy);g.scale(sc,sc);glow(0,0,80,'rgba(255,58,83,.2)');rr(-18,38,16,54,5,'#232a31','#080b0e',3);rr(2,38,16,54,5,'#232a31','#080b0e',3);rr(-66,-60,132,112,15,grad('#76818b','#171d24',-60,52),'#070a0c',4);rr(-48,-44,96,80,10,'#28313a','#74808a',2);ln(-55,-17,55,-17,'#99a4aa',1.5);ln(0,-50,0,42,'#13181e',2.5);const pulse=.72+.28*Math.sin(t*.012);glow(0,0,34,`rgba(255,67,88,${.42*pulse})`);el(0,0,16,16,'#ff4358','#71101d',3);el(0,0,6,6,'#fff0a1',null,0);rr(-104,-27,38,14,3,'#151b20','#07090b',2);rr(66,-27,38,14,3,'#151b20','#07090b',2);g.fillStyle='#8d999f';g.fillRect(-102,-23,29,4);g.fillRect(73,-23,29,4);el(-38,-43,5,5,P.accent,'#141719',1);el(38,-43,5,5,P.accent,'#141719',1);g.restore()}

  function render(t){g.clearRect(0,0,W,H);const game=document.getElementById('game');if(game&&!game.classList.contains('hidden')){if(capture.boss)boss(capture.boss,t);for(const e of capture.enemies){if(e.type==='drone')drone(e,t);else if(e.type==='turret')turret(e);else soldier(e,t,e.type)}if(capture.hero)hero(capture.hero,t)}requestAnimationFrame(render)}
  requestAnimationFrame(render);
})();