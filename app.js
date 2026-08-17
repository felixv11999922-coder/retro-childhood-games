'use strict';
// v14.4 compatibility layer: only game geometry/art overrides. Layout belongs exclusively to layout-fix.js.
(function(){
  // app-core registered direct resize callbacks before this file loaded. Remove those stale direct callbacks now;
  // anonymous callbacks in app-core resolve the current fitGameBurst binding later and are safe.
  try{
    const staleBurst=fitGameBurst;
    window.removeEventListener('resize',staleBurst);
    if(window.visualViewport){
      visualViewport.removeEventListener('resize',staleBurst);
      visualViewport.removeEventListener('scroll',staleBurst);
    }
  }catch{}

  function microRect(c,r,wc=2,hc=2,inset=2){return {x:px(c)+inset,y:py(r)+inset,w:TILE_SIZE*wc-inset*2,h:TILE_SIZE*hc-inset*2}}
  addHQFortification=function(){
    const cells=[];
    for(let r=22;r<=23;r++)for(let c=10;c<=15;c++)cells.push([c,r]);
    for(let r=24;r<=25;r++){cells.push([10,r],[11,r],[14,r],[15,r])}
    for(const [c0,r0] of cells)obstacles.push(createObstacle({c:c0,r:r0,type:'BRICK'}));
  };
  makeBase=function(){const q=microRect(HQ_COL,HQ_ROW,2,2,2);return {...q,alive:1,hp:3,maxHp:3}};
  spawnPlayer=function(){
    const candidates=[[PLAYER_SPAWN.c,PLAYER_SPAWN.r],[8,22],[6,24],[16,24],[6,22]];
    player={...microRect(candidates[0][0],candidates[0][1],2,2,3),dir:'up',speed:158,alive:1,vx:0,vy:0};
    for(const [cc,rr] of candidates){const q=microRect(cc,rr,2,2,3);Object.assign(player,q);if(!collidesEnvironment(player)&&!hit(player,base))break}
  };
  getSpawnRect=function(sp){return microRect(sp.c,sp.r,2,2,3)};
  drawIce=function(cc,rr){const x=px(cc),y=py(rr),s=TILE_SIZE;ctx.fillStyle='#8edcf2';ctx.fillRect(x,y,s,s);ctx.fillStyle='#d8f8ff';ctx.fillRect(x+s*.12,y+s*.18,s*.48,Math.max(1,s*.09));ctx.strokeStyle='#eefcff';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x+s*.7,y+s*.12);ctx.lineTo(x+s*.48,y+s*.48);ctx.lineTo(x+s*.72,y+s*.78);ctx.stroke()};
  drawWater=function(o){const x=o.x,y=o.y,s=o.w,t=Math.floor(performance.now()/260);ctx.fillStyle='#235a9a';ctx.fillRect(x,y,o.w,o.h);ctx.fillStyle='#55a0dd';for(let k=0;k<2;k++){const yy=y+s*(.28+k*.38),off=(t+k*5)%Math.max(4,Math.floor(s*.35));ctx.fillRect(x+2+off,yy,Math.max(5,s*.45),Math.max(1,s*.08))}};
  drawSteel=function(o){const x=o.x,y=o.y,s=o.w;ctx.fillStyle='#737f90';ctx.fillRect(x,y,s,o.h);ctx.fillStyle='#aeb8c5';ctx.fillRect(x+s*.12,y+s*.12,s*.76,Math.max(2,s*.12));ctx.strokeStyle='#cbd2db';ctx.lineWidth=1;ctx.strokeRect(x+1.5,y+1.5,s-3,o.h-3);ctx.fillStyle='#3e4855';const d=Math.max(2,s*.1);for(const [dx,dy] of [[.18,.2],[.72,.2],[.18,.72],[.72,.72]])ctx.fillRect(x+s*dx,y+s*dy,d,d)};
  drawBrickSegment=function(x,y,w,h,damaged=0){ctx.fillStyle=damaged?'#7d4435':'#9b523d';ctx.fillRect(x,y,w,h);ctx.fillStyle='#cf8061';ctx.fillRect(x+1,y+1,Math.max(1,w-2),Math.max(1,h*.16));ctx.fillStyle='#583026';ctx.fillRect(x,y+h*.48,w,Math.max(1,h*.11));ctx.fillRect(x+w*.48,y,Math.max(1,w*.1),h*.48);ctx.strokeStyle='#d89270';ctx.lineWidth=.7;ctx.strokeRect(x+.4,y+.4,Math.max(0,w-.8),Math.max(0,h-.8))};
  drawBush=function(cc,rr){const x=px(cc),y=py(rr),s=TILE_SIZE;ctx.save();ctx.globalAlpha=.93;const colors=['#22562e','#2e7139','#478f4d'];for(let i=0;i<8;i++){ctx.fillStyle=colors[i%3];const d=Math.max(4,s*.34),dx=((i*7)%Math.max(1,s-d)),dy=((i*11)%Math.max(1,s-d));ctx.fillRect(x+dx,y+dy,d,d)}ctx.restore()};
  drawBase=function(){const ratio=base.hp/base.maxHp,x=base.x,y=base.y,w=base.w,h=base.h;ctx.save();ctx.fillStyle='#0008';ctx.fillRect(x+4,y+5,w,h);ctx.fillStyle='#69737f';ctx.fillRect(x-3,y-4,w+6,7);ctx.fillStyle=ratio>.66?'#d0ad4c':ratio>.33?'#bc7e43':'#a35342';ctx.fillRect(x,y,w,h);ctx.strokeStyle='#f1d993';ctx.lineWidth=1.5;ctx.strokeRect(x+1,y+1,w-2,h-2);ctx.fillStyle='#242018';ctx.fillRect(x+w*.34,y+h*.38,w*.32,h*.62);ctx.fillStyle='#111820';ctx.fillRect(x+w*.12,y+h*.34,w*.16,h*.12);ctx.fillRect(x+w*.72,y+h*.34,w*.16,h*.12);ctx.strokeStyle='#cbd4dc';ctx.beginPath();ctx.moveTo(x+w*.76,y);ctx.lineTo(x+w*.76,y-h*.28);ctx.stroke();ctx.fillStyle='#ed6a62';ctx.fillRect(x+w*.76,y-h*.28,w*.22,Math.max(3,h*.12));ctx.fillStyle='#0b0d12';ctx.fillRect(x,y-8,w,4);ctx.fillStyle=ratio>.66?'#74e0a1':ratio>.33?'#f2ca4b':'#ed6a62';ctx.fillRect(x,y-8,w*ratio,4);ctx.restore()};
  tank=function(t,col){const w=t.w,h=t.h,cx=t.x+w/2,cy=t.y+h/2;ctx.save();ctx.translate(cx,cy);ctx.rotate(t.dir==='up'?0:t.dir==='right'?Math.PI/2:t.dir==='down'?Math.PI:-Math.PI/2);const tw=Math.min(w,h),track=Math.max(4,tw*.16),bodyW=tw*.54,bodyH=tw*.66;ctx.fillStyle=col;ctx.fillRect(-tw*.42,-tw*.42,track,tw*.84);ctx.fillRect(tw*.42-track,-tw*.42,track,tw*.84);ctx.fillRect(-bodyW/2,-bodyH/2,bodyW,bodyH);ctx.fillStyle='#e7edf7';ctx.fillRect(-tw*.09,-tw*.22,tw*.18,tw*.37);ctx.fillRect(-tw*.045,-tw*.58,tw*.09,tw*.42);if(t.maxHp>1){ctx.fillStyle='#111';ctx.fillRect(-tw*.24,tw*.31,tw*.48,Math.max(2,tw*.07));ctx.fillStyle=t.hp/t.maxHp>.5?'#74e0a1':'#f2ca4b';ctx.fillRect(-tw*.24,tw*.31,tw*.48*(t.hp/t.maxHp),Math.max(2,tw*.07))}ctx.restore()};

  console.info('Tank Base v14.4: compatibility layer active; layout ownership removed');
})();