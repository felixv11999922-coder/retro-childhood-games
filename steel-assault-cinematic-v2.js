'use strict';
(function(){
  const canvas=document.getElementById('gameCanvas');
  const wrap=document.querySelector('.canvasWrap');
  const levelEl=document.getElementById('level');
  if(!canvas||!wrap||!levelEl)return;
  const W=canvas.width||960,H=canvas.height||540;
  const levels=window.SteelAssaultLevels||[];

  function hideLegacyCharacters(){
    ['steelCharacterArt','steelCharacterRemaster'].forEach(id=>{
      const el=document.getElementById(id);
      if(el){el.style.opacity='0';el.style.visibility='hidden';el.style.pointerEvents='none'}
    });
    document.querySelectorAll('body *').forEach(el=>{
      if(el.children.length===0 && /^\s*СТАЛЬНОЙ\s+ДЕСАНТ\s*$/i.test(el.textContent||''))el.style.display='none';
    });
  }
  hideLegacyCharacters();
  try{new MutationObserver(hideLegacyCharacters).observe(wrap,{childList:true,subtree:true})}catch{}

  const actor=document.createElement('canvas');
  actor.id='steelCinematicActors';
  actor.width=W;actor.height=H;actor.setAttribute('aria-hidden','true');
  wrap.appendChild(actor);
  const g=actor.getContext('2d');g.imageSmoothingEnabled=true;

  const objective=document.createElement('div');
  objective.id='steelMissionObjective';
  objective.setAttribute('aria-hidden','true');
  wrap.appendChild(objective);

  let activeLevel=0;
  function levelNo(){return Math.max(1,parseInt(levelEl.textContent||'1',10)||1)}
  function syncObjective(){
    const n=levelNo();activeLevel=n;
    const lvl=levels[n-1]||{name:'Миссия '+n};
    objective.innerHTML='<b>МИССИЯ '+String(n).padStart(2,'0')+'</b>'+lvl.name;
  }
  syncObjective();
  try{new MutationObserver(syncObjective).observe(levelEl,{childList:true,characterData:true,subtree:true})}catch{}
  setInterval(syncObjective,700);

  const proto=CanvasRenderingContext2D.prototype;
  const prevFillRect=proto.fillRect,prevMoveTo=proto.moveTo,prevLineTo=proto.lineTo,prevStroke=proto.stroke;
  const norm=v=>String(v||'').replace(/\s+/g,'').toLowerCase();
  const eq=(v,hex,rgb)=>{const c=norm(v);return c===hex||c===rgb};
  const pt=(ctx,x,y)=>{try{const m=ctx.getTransform();return{x:m.a*x+m.c*y+m.e,y:m.b*x+m.d*y+m.f}}catch{return{x,y}}};
  let cap={hero:null,enemies:[],boss:null,frame:0};
  let aim={x:1,y:0},facing=1,lastHeroX=null,gunStart=null;

  proto.fillRect=function(x,y,w,h){
    if(this.canvas===canvas){
      const fs=this.fillStyle;
      if(x===0&&y===0&&w===W&&h===H)cap={hero:null,enemies:[],boss:null,frame:cap.frame+1};
      if(eq(fs,'#4ce2ac','rgb(76,226,172)')&&Math.abs(w-18)<1&&h>20&&h<50){
        const p=pt(this,x,y),hh=h+9,hx=p.x-9,hy=p.y-9;
        if(lastHeroX!==null&&Math.abs(hx-lastHeroX)>.05)facing=hx>lastHeroX?1:-1;
        lastHeroX=hx;cap.hero={x:hx,y:hy,w:34,h:hh,crouch:hh<40};
      }else if(eq(fs,'#e86d72','rgb(232,109,114)')&&Math.abs(w-26)<1&&Math.abs(h-15)<1){
        const p=pt(this,x,y);cap.enemies.push({type:'drone',x:p.x-5,y:p.y-5,w:36,h:25});
      }else if(eq(fs,'#d95b63','rgb(217,91,99)')&&w>=18&&h>=25){
        const p=pt(this,x,y);cap.enemies.push({type:'soldier',x:p.x-6,y:p.y-8,w:w+12,h:h+8});
      }else if(eq(fs,'#a64f59','rgb(166,79,89)')&&w>=28&&h>=30){
        const p=pt(this,x,y);cap.enemies.push({type:'heavy',x:p.x-6,y:p.y-8,w:w+12,h:h+8});
      }else if(eq(fs,'#895764','rgb(137,87,100)')&&w>=18&&h>=16){
        const p=pt(this,x,y);cap.enemies.push({type:'turret',x:p.x-6,y:p.y-8,w:w+12,h:h+8});
      }else if(eq(fs,'#d75d68','rgb(215,93,104)')&&Math.abs(w-36)<1&&Math.abs(h-24)<1){
        const p=pt(this,x,y);cap.enemies.push({type:'soldier',x:p.x-18,y:p.y-12,w:36,h:24});
      }else if(eq(fs,'#552a53','rgb(85,42,83)')&&w>=90&&h>=90){
        const p=pt(this,x,y);cap.boss={x:p.x,y:p.y,w,h};
      }
    }
    return prevFillRect.call(this,x,y,w,h)
  };
  proto.moveTo=function(x,y){
    if(this.canvas===canvas&&eq(this.strokeStyle,'#d9fff2','rgb(217,255,242)')&&Number(this.lineWidth)===5)gunStart=pt(this,x,y);
    return prevMoveTo.call(this,x,y)
  };
  proto.lineTo=function(x,y){
    if(this.canvas===canvas&&gunStart&&eq(this.strokeStyle,'#d9fff2','rgb(217,255,242)')&&Number(this.lineWidth)===5){
      const p=pt(this,x,y),dx=p.x-gunStart.x,dy=p.y-gunStart.y,l=Math.hypot(dx,dy)||1;
      aim={x:dx/l,y:dy/l};if(Math.abs(aim.x)>.12)facing=aim.x>0?1:-1;gunStart=null
    }
    return prevLineTo.call(this,x,y)
  };
  proto.stroke=function(){return prevStroke.call(this)};

  function rr(x,y,w,h,r,fill,stroke=null,lw=1){
    g.beginPath();if(g.roundRect)g.roundRect(x,y,w,h,r);else g.rect(x,y,w,h);
    g.fillStyle=fill;g.fill();if(stroke){g.strokeStyle=stroke;g.lineWidth=lw;g.stroke()}
  }
  function el(x,y,rx,ry,fill,stroke=null,lw=1){
    g.beginPath();g.ellipse(x,y,rx,ry,0,0,Math.PI*2);g.fillStyle=fill;g.fill();
    if(stroke){g.strokeStyle=stroke;g.lineWidth=lw;g.stroke()}
  }
  function line(x1,y1,x2,y2,c,lw=2,a=1){
    g.save();g.globalAlpha=a;g.beginPath();g.moveTo(x1,y1);g.lineTo(x2,y2);g.strokeStyle=c;g.lineWidth=lw;g.lineCap='round';g.stroke();g.restore()
  }
  function poly(pts,fill,stroke=null,lw=1){
    g.beginPath();g.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++)g.lineTo(pts[i][0],pts[i][1]);g.closePath();
    g.fillStyle=fill;g.fill();if(stroke){g.strokeStyle=stroke;g.lineWidth=lw;g.stroke()}
  }
  function grad(a,b,x1,y1,x2,y2){const q=g.createLinearGradient(x1,y1,x2,y2);q.addColorStop(0,a);q.addColorStop(1,b);return q}
  function glow(x,y,r,c,a=.5){const q=g.createRadialGradient(x,y,0,x,y,r);q.addColorStop(0,c);q.addColorStop(1,'rgba(0,0,0,0)');g.save();g.globalAlpha=a;g.fillStyle=q;g.fillRect(x-r,y-r,r*2,r*2);g.restore()}
  function scratch(x,y,w,h){
    g.save();g.globalAlpha=.22;g.strokeStyle='#fff';g.lineWidth=.8;
    for(let i=0;i<4;i++){g.beginPath();g.moveTo(x+(i*13)%w,y+(i*9)%h);g.lineTo(x+7+(i*17)%w,y+2+(i*11)%h);g.stroke()}
    g.restore()
  }

  function heroPalette(){
    const n=activeLevel;
    if(n===6)return{pants:'#667b67',vest:'#516a42',rim:'#dff8ff'};
    if(n===4||n===9)return{pants:'#716139',vest:'#66562f',rim:'#ffd77d'};
    if(n===10||n===12)return{pants:'#4e5740',vest:'#4a4f34',rim:'#cf7cff'};
    return{pants:'#61733c',vest:'#586b36',rim:'#d4e989'};
  }
  function drawHero(h,t){
    if(!h)return;
    const p=heroPalette(),dir=Math.abs(aim.x)>.12?(aim.x>0?1:-1):facing,cx=h.x+h.w/2,feet=h.y+h.h+8;
    const crouch=h.crouch,scale=crouch?2.4:2.85,bob=Math.sin(t*.016)*1.1;
    const ax=dir<0?-aim.x:aim.x,ang=Math.atan2(aim.y,Math.max(.08,ax));
    g.save();g.translate(cx,feet+bob);g.scale(dir*scale,scale);
    el(0,2,18,4,'rgba(0,0,0,.55)');

    rr(-15,-8,15,8,3,'#151817','#050606',1.2);rr(2,-8,15,8,3,'#151817','#050606',1.2);
    rr(-13,-7,10,2,1,'#555d58');rr(5,-7,10,2,1,'#555d58');
    poly([[-15,-35],[-2,-35],[1,-8],[-14,-8]],grad('#768654','#354326',0,-35,0,-8),'#11170e',1.2);
    poly([[2,-35],[15,-34],[14,-8],[1,-8]],grad('#768654','#354326',0,-35,0,-8),'#11170e',1.2);
    rr(-14,-31,8,7,2,'#26331d');rr(7,-31,8,7,2,'#26331d');

    el(-19,-55,10,13,grad('#e3a067','#a8552e',-20,-66,-12,-44),'#32180e',1.5);
    el(-15,-43,8,11,grad('#d98b54','#9e4729',-18,-52,-12,-34),'#32180e',1.3);
    line(-24,-58,-18,-50,'#ffd0a0',1.2,.48);
    el(19,-54,10,13,grad('#df985f','#a54f2e',12,-65,24,-43),'#32180e',1.5);

    poly([[-18,-60],[-8,-66],[8,-66],[19,-57],[14,-31],[-14,-31]],grad('#819352','#334426',0,-66,0,-31),'#11170e',1.7);
    rr(-5,-61,10,28,2,'#1b2818');rr(-14,-50,7,10,2,'#9cac63');rr(7,-50,7,10,2,'#9cac63');
    rr(-15,-35,30,7,2,'#161d14');rr(-3,-35,7,7,1,'#b78135','#4b3017',1);
    poly([[-18,-58],[-9,-64],[-5,-57],[-14,-51]],'#3a4c2b','#10150d',1);
    poly([[18,-57],[9,-64],[5,-57],[14,-50]],'#3a4c2b','#10150d',1);
    line(-13,-58,-7,-64,p.rim,1,.42);

    rr(-5,-71,10,11,3,'#c57947','#32180e',1);
    el(1,-81,12,14,grad('#e4a064','#b95e35',-10,-92,12,-68),'#32180e',1.5);
    poly([[8,-81],[15,-76],[10,-69],[3,-69]],'#bd6539');
    g.fillStyle='#35180e';g.fillRect(5,-84,7,2);g.fillRect(6,-75,7,1.4);
    g.fillStyle='#f4d2a9';g.fillRect(7,-86,2,2);
    line(-5,-75,4,-73,'#a75031',1,.55);

    poly([[-11,-85],[-8,-93],[-2,-90],[4,-96],[9,-89],[15,-86],[11,-79],[-10,-79]],'#4b2114','#211009',1.2);
    rr(-12,-86,25,4,1,'#cf3526','#5b160f',.8);
    poly([[-10,-84],[-27,-77],[-19,-70],[-6,-77]],'#d33b2a','#64170f',.8);

    g.save();g.translate(0,-52);g.rotate(ang);
    el(7,3,8,6,'#d38950','#2b150d',1.2);el(19,2,7,5,'#c87644','#2b150d',1.2);
    rr(18,-6,13,11,2,'#222725','#070909',1.1);
    rr(27,-8,44,16,3,grad('#7f8987','#1a2021',27,-8,70,8),'#07090a',1.4);
    rr(37,7,10,12,1,'#78502b','#16100c',1);
    rr(35,-13,16,5,1,'#283031','#080a0b',1);
    g.fillStyle='#0e1213';g.fillRect(68,-5,26,8);
    g.fillStyle='#a5b0ad';g.fillRect(31,-4,20,2);g.fillRect(70,-2,16,2);
    g.fillStyle='#d7ab4c';g.fillRect(52,-3,5,5);scratch(29,-7,37,13);
    if((t/90|0)%4===0){glow(96,-1,15,'#ffad3f',.65);poly([[91,-1],[105,-7],[120,-1],[105,7]],'#ffd45c')}
    g.restore();

    g.restore()
  }

  function enemyPalette(){
    const n=activeLevel;
    if(n===6)return{cloth:'#71858a',cloth2:'#9babad',dark:'#263136',skin:'#c68d62',metal:'#59686e',accent:'#d6f1f4'};
    if(n===4||n===9)return{cloth:'#705a3a',cloth2:'#99784d',dark:'#2b2317',skin:'#c58a59',metal:'#6a5844',accent:'#edc46d'};
    if(n===7||n===10)return{cloth:'#59524c',cloth2:'#7b6d61',dark:'#272421',skin:'#bd815a',metal:'#5b6468',accent:'#f18a5f'};
    if(n===11||n===12)return{cloth:'#46583d',cloth2:'#70875f',dark:'#1d281d',skin:'#b97d56',metal:'#52685d',accent:'#70efaf'};
    return{cloth:'#4d6136',cloth2:'#748550',dark:'#202a1b',skin:'#c58b5e',metal:'#4d5852',accent:'#ddcf78'}
  }
  function drawSoldier(e,t,heavy=false){
    const p=enemyPalette(),cx=e.x+e.w/2,feet=e.y+e.h+7,s=heavy?1.85:1.52;
    g.save();g.translate(cx,feet);g.scale(s,s);
    el(0,2,19,4,'rgba(0,0,0,.5)');
    rr(-14,-8,12,8,3,'#151918');rr(3,-8,12,8,3,'#151918');
    poly([[-14,-34],[-2,-35],[0,-8],[-13,-8]],p.cloth,'#11170f',1);
    poly([[2,-35],[14,-34],[13,-8],[0,-8]],p.cloth,'#11170f',1);
    el(-17,-54,8,11,p.skin,'#2a160e',1);el(16,-53,8,11,p.skin,'#2a160e',1);
    poly([[-17,-59],[-8,-65],[9,-64],[18,-57],[14,-32],[-14,-32]],grad(p.cloth2,p.cloth,0,-64,0,-31),'#10150d',1.4);
    rr(-13,-48,7,10,2,p.dark);rr(6,-48,7,10,2,p.dark);rr(-15,-35,30,6,2,'#171d16');
    rr(-5,-70,10,11,3,p.skin);el(1,-79,11,12,p.skin,'#28160e',1.2);
    poly([[-12,-82],[-8,-91],[7,-91],[14,-84],[13,-78],[-11,-78]],'#34422b','#151b12',1.2);
    line(-10,-82,12,-82,p.accent,.9,.5);
    rr(7,-59,49,12,3,grad('#717b7b','#171c1d',8,-59,56,-47),'#080a0a',1.2);
    rr(52,-56,26,6,2,'#171c1d');rr(21,-64,13,4,1,'#252c2e');
    scratch(12,-58,40,10);
    if((t/125|0)%5===0){glow(80,-53,10,'#ffac45',.68);poly([[76,-53],[88,-58],[98,-53],[88,-48]],'#ffd260')}
    if(heavy){rr(-20,-45,7,18,2,'#30382e');rr(13,-45,7,18,2,'#30382e')}
    g.restore()
  }

  function drawDrone(e,t){
    const cx=e.x+e.w/2,cy=e.y+e.h/2+Math.sin(t*.008+e.x)*4;
    g.save();g.translate(cx,cy);g.scale(1.8,1.8);
    glow(0,1,20,'#e83d45',.18);
    rr(-21,-11,42,23,8,grad('#58636b','#1e272d',-20,-12,20,12),'#090c0e',1.4);
    rr(-10,-17,20,9,4,'#242d32','#080a0c',1);
    el(7,0,8,8,'#d82f38','#ff6b60',1.2);el(7,0,3,3,'#ffb35c');
    line(-37,-17,37,-17,'#829097',2.3,.86);line(-30,-21,-7,-21,'#414b51',2);line(7,-21,30,-21,'#414b51',2);
    rr(-6,11,12,8,3,'#242c30');poly([[-4,18],[4,18],[0,29]],'#e8653f');
    g.restore()
  }

  function drawTurret(e,t){
    const p=enemyPalette(),cx=e.x+e.w/2,base=e.y+e.h+8;
    g.save();g.translate(cx,base);g.scale(1.6,1.6);
    el(0,2,27,5,'rgba(0,0,0,.5)');
    rr(-24,-18,48,18,5,grad('#4d5a56','#202928',-24,-18,24,0),'#090c0c',1.5);
    rr(-16,-31,32,16,5,p.metal,'#090c0c',1.4);
    el(0,-24,7,7,p.accent,'#1d1710',1.2);
    rr(11,-29,43,8,3,'#1a2021','#07090a',1.2);
    line(-18,-2,-26,10,'#45514f',4);line(18,-2,26,10,'#45514f',4);
    if((t/160|0)%6===0)glow(56,-25,10,'#ff9b43',.7);
    g.restore()
  }

  function drawBoss(b,t){
    if(!b)return;const cx=b.x+b.w/2,cy=b.y+b.h/2,pulse=.9+.1*Math.sin(t*.006);
    g.save();g.translate(cx,cy);
    glow(0,0,Math.max(b.w,b.h)*.8,'#ff345f',.16);
    rr(-b.w*.44,-b.h*.39,b.w*.88,b.h*.78,16,grad('#596173','#202631',0,-b.h*.4,0,b.h*.4),'#090b10',4);
    rr(-b.w*.31,-b.h*.27,b.w*.62,b.h*.54,12,'#353d4b','#11141c',3);
    el(0,0,Math.min(b.w,b.h)*.18*pulse,Math.min(b.w,b.h)*.18*pulse,'#ff3d60','#ffd16a',4);
    el(0,0,Math.min(b.w,b.h)*.08,Math.min(b.w,b.h)*.08,'#fff6bd');
    for(let i=-1;i<=1;i+=2){
      rr(i*b.w*.43-13,-b.h*.20,26,b.h*.40,7,'#283039','#0b0d11',2);
      line(i*b.w*.52,-b.h*.10,i*b.w*.72,-b.h*.23,'#6d7781',9);
      rr(i*b.w*.70-(i>0?0:28),-b.h*.27,28,10,3,'#20262d','#0a0c10',2)
    }
    line(-b.w*.18,b.h*.40,-b.w*.30,b.h*.69,'#5c6770',12);line(b.w*.18,b.h*.40,b.w*.30,b.h*.69,'#5c6770',12);
    g.restore()
  }

  function drawForegroundAtmosphere(t){
    const n=activeLevel;
    g.save();
    if(n===6){
      g.fillStyle='rgba(235,248,255,.75)';
      for(let i=0;i<24;i++){const x=(i*83+t*.018*(1+i%3))%W,y=(i*47+t*.026*(1+i%4))%H;el(x,y,1+(i%3),1+(i%3),'rgba(235,248,255,.65)')}
    }else if(n===7||n===10){
      g.strokeStyle='rgba(158,207,241,.25)';g.lineWidth=1;
      for(let i=0;i<30;i++){const x=(i*71-t*.07)%W,y=(i*43+t*.18)%H;g.beginPath();g.moveTo(x,y);g.lineTo(x-7,y+22);g.stroke()}
    }else if(n===11||n===12){
      for(let i=0;i<10;i++){const x=(i*97+t*.012)%W,y=110+(i*53)%300;glow(x,y,7,'#65efad',.18)}
    }
    const vign=g.createRadialGradient(W*.5,H*.46,H*.15,W*.5,H*.5,W*.68);vign.addColorStop(0,'rgba(0,0,0,0)');vign.addColorStop(1,'rgba(0,0,0,.24)');g.fillStyle=vign;g.fillRect(0,0,W,H);
    g.restore()
  }

  function render(t){
    g.clearRect(0,0,W,H);
    if(cap.hero)drawHero(cap.hero,t);
    for(const e of cap.enemies){
      if(e.type==='drone')drawDrone(e,t);
      else if(e.type==='heavy')drawSoldier(e,t,true);
      else if(e.type==='turret')drawTurret(e,t);
      else drawSoldier(e,t,false)
    }
    if(cap.boss)drawBoss(cap.boss,t);
    drawForegroundAtmosphere(t);
    requestAnimationFrame(render)
  }
  requestAnimationFrame(render);

  ['pad','jump','fire','pause','gameBack'].forEach(id=>{
    const el=document.getElementById(id);if(el){el.style.touchAction='none';el.style.pointerEvents='auto'}
  });
  document.documentElement.dataset.steelVisual='cinematic-v2';
})();
