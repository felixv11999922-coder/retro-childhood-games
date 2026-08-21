'use strict';
(function(){
  const GAME_W=960,GAME_H=540,ART_W=480,ART_H=270;
  const gameCanvas=document.getElementById('gameCanvas');
  const wrap=document.querySelector('.canvasWrap');
  if(!gameCanvas||!wrap)return;

  const art=document.createElement('canvas');
  art.id='steelSceneArt';
  art.width=ART_W;art.height=ART_H;
  art.setAttribute('aria-hidden','true');
  const fx=document.createElement('canvas');
  fx.id='steelSceneFx';
  fx.width=GAME_W;fx.height=GAME_H;
  fx.setAttribute('aria-hidden','true');
  const toast=document.getElementById('toast');
  wrap.insertBefore(art,gameCanvas);
  wrap.insertBefore(fx,toast||null);

  Object.assign(art.style,{position:'absolute',pointerEvents:'none',zIndex:'0',imageRendering:'pixelated'});
  Object.assign(fx.style,{position:'absolute',pointerEvents:'none',zIndex:'2'});
  Object.assign(gameCanvas.style,{position:'relative',zIndex:'1',background:'transparent'});
  if(toast)toast.style.zIndex='3';

  const a=art.getContext('2d');
  const f=fx.getContext('2d');
  a.imageSmoothingEnabled=false;

  function sync(){
    const l=gameCanvas.offsetLeft,t=gameCanvas.offsetTop,w=gameCanvas.offsetWidth,h=gameCanvas.offsetHeight;
    for(const c of [art,fx]){c.style.left=l+'px';c.style.top=t+'px';c.style.width=w+'px';c.style.height=h+'px'}
  }
  new ResizeObserver(sync).observe(gameCanvas);
  addEventListener('resize',sync,{passive:true});
  sync();

  // The game normally paints a solid 960×540 rectangle every frame. We suppress only
  // that base coat so the richer location layer remains visible behind gameplay sprites.
  const nativeFillRect=CanvasRenderingContext2D.prototype.fillRect;
  CanvasRenderingContext2D.prototype.fillRect=function(x,y,w,h){
    if(this.canvas===gameCanvas&&x===0&&y===0&&w===GAME_W&&h===GAME_H){return;}
    return nativeFillRect.call(this,x,y,w,h);
  };

  const seedDots=Array.from({length:110},(_,i)=>({x:(i*83)%ART_W,y:(i*47)%ART_H,s:1+(i%3),p:(i*29)%100/100}));
  const rain=Array.from({length:85},(_,i)=>({x:(i*137)%GAME_W,y:(i*71)%GAME_H,l:10+(i%5)*4,s:230+(i%7)*32}));
  const snow=Array.from({length:95},(_,i)=>({x:(i*89)%GAME_W,y:(i*53)%GAME_H,r:1+(i%3),s:18+(i%6)*7,d:(i%2?1:-1)*(3+i%4)}));

  function levelInfo(){
    const text=(document.getElementById('level')?.textContent||'1/12');
    const n=Math.max(1,parseInt(text,10)||1);
    return (window.SteelAssaultLevels||[])[n-1]||{id:n,scene:'jungle_outpost'};
  }
  function grad(top,bottom){const g=a.createLinearGradient(0,0,0,ART_H);g.addColorStop(0,top);g.addColorStop(1,bottom);a.fillStyle=g;a.fillRect(0,0,ART_W,ART_H)}
  function poly(fill,pts){a.fillStyle=fill;a.beginPath();a.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++)a.lineTo(pts[i][0],pts[i][1]);a.closePath();a.fill()}
  function line(stroke,w,pts){a.strokeStyle=stroke;a.lineWidth=w;a.beginPath();a.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++)a.lineTo(pts[i][0],pts[i][1]);a.stroke()}
  function glow(x,y,r,color){a.save();a.globalAlpha=.28;a.fillStyle=color;a.beginPath();a.arc(x,y,r,0,Math.PI*2);a.fill();a.globalAlpha=1;a.fillStyle=color;a.fillRect(x-1,y-1,3,3);a.restore()}
  function mountains(base,far,near){
    poly(far,[[0,base],[45,base-48],[86,base-10],[132,base-70],[185,base-18],[240,base-84],[292,base-20],[355,base-68],[420,base-12],[480,base],[480,270],[0,270]]);
    poly(near,[[0,base+22],[60,base-18],[120,base+14],[170,base-34],[240,base+6],[310,base-24],[375,base+14],[438,base-30],[480,base+5],[480,270],[0,270]]);
  }
  function tower(x,y,w,h,lit){
    a.fillStyle='#18212a';a.fillRect(x,y,w,h);a.fillStyle='#293642';a.fillRect(x+4,y+5,w-8,h-8);
    a.fillStyle='#0a0f14';for(let yy=y+10;yy<y+h-8;yy+=12)for(let xx=x+7;xx<x+w-5;xx+=11)a.fillRect(xx,yy,5,6);
    if(lit)for(let yy=y+13;yy<y+h-8;yy+=24){a.fillStyle=lit;a.fillRect(x+w-8,yy,3,3)}
  }
  function radar(x,y,s){
    a.strokeStyle='#657989';a.lineWidth=2;a.beginPath();a.arc(x,y,s,Math.PI*.1,Math.PI*1.1);a.stroke();
    line('#8ba0ae',2,[[x-s*.8,y-s*.25],[x+s*.4,y+s*.55]]);line('#687887',2,[[x,y+s*.2],[x,y+s*1.5]]);
  }
  function pipe(x,y,w){a.fillStyle='#26313b';a.fillRect(x,y,w,7);a.fillStyle='#4b5964';a.fillRect(x,y,w,2);a.fillStyle='#121920';for(let i=x+10;i<x+w;i+=26)a.fillRect(i,y-2,4,11)}
  function palm(x,y,s){a.fillStyle='#3e3624';a.fillRect(x,y,4,s);for(let k=0;k<5;k++){const ang=-2.6+k*.55;line('#425f32',3,[[x+2,y],[x+2+Math.cos(ang)*18,y+Math.sin(ang)*11]])}}

  function canyon(t){
    grad('#3f78ad','#d18a49');
    mountains(155,'#6f7781','#8b6750');
    poly('#4c382d',[[0,122],[55,115],[82,144],[96,270],[0,270]]);poly('#4c382d',[[480,108],[434,118],[416,155],[408,270],[480,270]]);
    a.fillStyle='#76523a';for(let y=132;y<250;y+=11){a.fillRect(5+(y%17),y,60,5);a.fillRect(430-(y%13),y,45,5)}
    tower(333,104,42,118,'#e64a3d');radar(242,106,24);tower(110,137,34,70,'#e64a3d');radar(127,128,16);
    pipe(150,197,170);a.fillStyle='#263239';a.fillRect(185,184,4,18);a.fillRect(279,184,4,18);
    palm(90,195,28);palm(389,196,26);
    a.fillStyle='#b99460';a.fillRect(0,224,480,46);a.fillStyle='#917047';for(const d of seedDots.slice(0,35)){a.fillRect(d.x,(230+d.y%35),d.s,1)}
    glow(353,117,7,'#ff4c3f');
  }

  function snowBase(t){
    grad('#07172b','#2f5573');mountains(158,'#253c55','#546f80');
    poly('#d9edf4',[[0,161],[54,122],[86,156],[138,107],[190,160],[246,112],[302,158],[358,118],[410,156],[480,128],[480,189],[0,189]]);
    poly('#4b6272',[[0,172],[73,150],[121,174],[192,142],[248,174],[318,148],[386,172],[445,151],[480,169],[480,205],[0,205]]);
    tower(330,92,96,118,'#ed455c');radar(348,78,29);radar(408,99,18);tower(210,131,64,68,'#e34b5c');
    a.fillStyle='#bacdd7';a.fillRect(206,130,72,4);a.fillRect(322,91,110,5);a.fillStyle='#eef8fb';a.fillRect(322,88,110,3);
    pipe(45,207,315);pipe(122,224,255);a.fillStyle='#1a2a36';a.fillRect(0,232,480,38);a.fillStyle='#ecf7fb';a.fillRect(0,229,480,5);
    glow(370,105,7,'#66bfff');
  }

  function rainyIndustrial(t){
    grad('#050914','#10223b');
    for(let i=0;i<12;i++){const x=i*43+(i%3)*8,h=45+(i*23)%105;tower(x,205-h,28+(i%2)*7,h,i%2?'#ff4d42':'#43b9ff')}
    a.fillStyle='#14202a';a.fillRect(0,214,480,56);a.fillStyle='#27333b';for(let x=0;x<480;x+=52)a.fillRect(x,210,34,5);
    pipe(0,188,166);pipe(292,176,188);pipe(96,225,310);
    a.fillStyle='#341f1a';a.fillRect(350,188,22,38);a.fillStyle='#ff713d';a.fillRect(355,180,12,12);a.fillStyle='#ffb04b';a.fillRect(358,176,6,8);
    a.font='bold 11px monospace';a.fillStyle='#4ec7ff';a.fillText('STEEL // SECTOR',175,160);a.fillStyle='#ff6350';a.fillText('DANGER',273,193);
    a.fillStyle='#111b25';a.fillRect(0,245,480,25);a.fillStyle='rgba(81,142,178,.28)';for(let x=10;x<480;x+=38)a.fillRect(x,252,22,2);
    glow(285,191,8,'#ff493f');
  }

  function swampLab(t){
    grad('#082827','#183d39');
    a.fillStyle='#173225';for(let i=0;i<20;i++){const x=(i*29)%480,h=44+(i*17)%95;a.fillRect(x,188-h,5,h);a.fillStyle='#254a31';a.beginPath();a.arc(x+2,185-h,14+(i%4)*4,0,Math.PI*2);a.fill();a.fillStyle='#173225'}
    a.fillStyle='#1c2b2b';a.fillRect(315,94,124,120);a.fillStyle='#2c4140';a.fillRect(323,102,108,106);a.fillStyle='#0b1718';for(let y=110;y<200;y+=23){a.fillRect(330,y,28,13);a.fillRect(393,y,30,13)}
    a.fillStyle='#32dca6';a.globalAlpha=.28;a.fillRect(365,113,22,61);a.globalAlpha=1;a.strokeStyle='#6af5c8';a.strokeRect(365,113,22,61);glow(376,144,12,'#59efbd');
    pipe(252,198,202);a.fillStyle='#24382e';a.fillRect(0,208,480,62);a.fillStyle='#183c3c';a.fillRect(0,224,480,46);
    for(let i=0;i<14;i++){a.fillStyle=i%2?'#285844':'#376c4b';a.fillRect((i*37)%480,198+(i%4)*6,16+(i%3)*8,4)}
    // distant helicopter silhouette
    a.fillStyle='#1d302e';a.fillRect(72,84,35,10);a.fillRect(105,87,20,4);a.fillRect(82,78,13,7);line('#253e39',2,[[62,75],[118,75]]);
  }

  function bunker(){
    grad('#07101a','#111d2a');
    a.strokeStyle='#23384b';a.lineWidth=1;for(let x=18;x<480;x+=42)a.strokeRect(x,25,28,220);for(let y=40;y<245;y+=32)line('#243647',1,[[15,y],[465,y]]);
    a.fillStyle='#0d151d';a.fillRect(130,54,220,156);a.strokeStyle='#576a7c';a.strokeRect(130,54,220,156);glow(240,95,17,'#ffd34f');pipe(80,220,320);
  }
  function sky(){grad('#4f9ed0','#d9edf5');mountains(215,'#94aeba','#667c8a');for(let i=0;i<7;i++){a.fillStyle='rgba(255,255,255,.72)';a.fillRect(28+i*72,45+(i%3)*16,42,6);a.fillRect(36+i*72,40+(i%3)*16,24,5)}tower(332,84,44,151,'#e44e54');pipe(110,190,240)}
  function bioFinal(){grad('#15091a','#32152e');for(let i=0;i<18;i++){const x=(i*31)%480;a.fillStyle=i%2?'#5d2851':'#32182e';a.beginPath();a.arc(x,130+(i%5)*24,18+(i%4)*5,0,Math.PI*2);a.fill()}for(let i=0;i<8;i++)glow(45+i*57,95+(i%3)*38,12,'#ff5b9d');a.fillStyle='#160e19';a.fillRect(0,225,480,45)}

  function drawScene(lvl,t){
    a.clearRect(0,0,ART_W,ART_H);
    const s=lvl.scene||lvl.theme||'jungle_outpost';
    if(s.includes('canyon')||s.includes('desert'))canyon(t);
    else if(s.includes('snow')||s.includes('ice'))snowBase(t);
    else if(s.includes('rain')||s.includes('factory')||s.includes('reactor'))rainyIndustrial(t);
    else if(s.includes('swamp')||s.includes('jungle')||s.includes('bio'))swampLab(t);
    else if(s.includes('bunker'))bunker(t);
    else if(s.includes('sky')||s.includes('tower'))sky(t);
    else if(s.includes('final'))bioFinal(t);
    else rainyIndustrial(t);
    // Subtle dark vignette so bullets and enemies remain readable.
    const g=a.createRadialGradient(ART_W/2,ART_H/2,70,ART_W/2,ART_H/2,290);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(0,0,0,.42)');a.fillStyle=g;a.fillRect(0,0,ART_W,ART_H);
  }

  function drawFx(lvl,dt,t){
    f.clearRect(0,0,GAME_W,GAME_H);
    const s=lvl.scene||'';
    if(s.includes('rain')||s.includes('factory')||s.includes('reactor')){
      f.strokeStyle='rgba(130,190,235,.22)';f.lineWidth=1;
      for(const r of rain){r.y+=r.s*dt;r.x-=55*dt;if(r.y>GAME_H+30){r.y=-20;r.x=(r.x+173)%GAME_W}f.beginPath();f.moveTo(r.x,r.y);f.lineTo(r.x-5,r.y+r.l);f.stroke()}
      f.fillStyle='rgba(60,110,150,.055)';f.fillRect(0,0,GAME_W,GAME_H);
    }
    if(s.includes('snow')||s.includes('ice')){
      f.fillStyle='rgba(230,247,255,.72)';for(const q of snow){q.y+=q.s*dt;q.x+=q.d*dt;if(q.y>GAME_H+6){q.y=-5;q.x=(q.x+211)%GAME_W}if(q.x<0)q.x+=GAME_W;if(q.x>GAME_W)q.x-=GAME_W;f.fillRect(q.x,q.y,q.r,q.r)}
    }
    if(s.includes('swamp')||s.includes('jungle')){
      f.fillStyle='rgba(72,255,184,.10)';for(let i=0;i<12;i++){const x=(i*151+t*.015)%GAME_W,y=350+Math.sin(t*.001+i)*55;f.fillRect(x,y,2,2)}
    }
    if(s.includes('canyon')||s.includes('desert')){
      f.fillStyle='rgba(255,196,112,.08)';for(let i=0;i<18;i++){const x=(i*97+t*.022)%GAME_W,y=390+(i*31)%120;f.fillRect(x,y,3,1)}
    }
  }

  let prev=performance.now(),lastScene='';
  function frame(t){
    const dt=Math.min(.04,(t-prev)/1000);prev=t;sync();
    const lvl=levelInfo(),key=(lvl.id||0)+':'+(lvl.scene||'');
    if(key!==lastScene||Math.floor(t/180)%2===0){drawScene(lvl,t);lastScene=key}
    drawFx(lvl,dt,t);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
