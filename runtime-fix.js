'use strict';

/* v15.2 stability patch.
   Fixes mixed large-grid/micro-grid coordinates around HQ, partially off-field
   enemy spawns, half-pixel brick seams and terrain drawing that overflowed 23px tiles. */
(function(){
  if(!window.GameData) throw new Error('GameData not loaded');

  // Split an odd 23px micro-tile without 0.5px geometry.
  brickSegmentRects=function(o){
    const a=Math.floor(TILE_SIZE/2), b=TILE_SIZE-a, arr=[];
    for(let bit=0;bit<4;bit++) if(o.segments&(1<<bit)){
      const right=bit%2===1, bottom=bit>1;
      arr.push({
        x:o.x+(right?a:0),
        y:o.y+(bottom?a:0),
        w:right?b:a,
        h:bottom?b:a,
        bit
      });
    }
    return arr;
  };

  // HQ_COL/HQ_ROW are the TOP-LEFT cell of a 2x2 HQ, not its centre.
  makeBase=function(){
    return {
      x:px(HQ_COL), y:py(HQ_ROW),
      w:TILE_SIZE*2, h:TILE_SIZE*2,
      alive:1, hp:3, maxHp:3
    };
  };

  // Symmetric Battle-City-style U-shaped fortification around the 2x2 HQ.
  addHQFortification=function(level){
    const cells=[];
    const add=(cc,rr)=>cells.push([cc,rr]);

    if(level.id===41){
      // “Открытая база”: deliberately lighter, but still perfectly centred.
      add(HQ_COL, HQ_ROW-1); add(HQ_COL+1, HQ_ROW-1);
    }else{
      for(let cc=HQ_COL-1;cc<=HQ_COL+2;cc++) add(cc,HQ_ROW-1);
      add(HQ_COL-1,HQ_ROW); add(HQ_COL-1,HQ_ROW+1);
      add(HQ_COL+2,HQ_ROW); add(HQ_COL+2,HQ_ROW+1);
    }

    if(level.id===50){
      // Final level gets one extra symmetric outer crown.
      for(let cc=HQ_COL-2;cc<=HQ_COL+3;cc++) add(cc,HQ_ROW-2);
      add(HQ_COL-2,HQ_ROW-1); add(HQ_COL+3,HQ_ROW-1);
    }

    const seen=new Set(obstacles.map(o=>key(o.c,o.r)));
    for(const [cc,rr] of cells){
      const k=key(cc,rr);
      if(cc<0||cc>=COLS||rr<0||rr>=ROWS||seen.has(k)) continue;
      obstacles.push(createObstacle({c:cc,r:rr,type:'BRICK'}));
      seen.add(k);
    }
  };

  // Never create an enemy partly outside the 598x598 playable micro-grid.
  getSpawnRect=function(sp){
    const p=cellCenter(sp.c,sp.r),w=32,h=36;
    return {
      x:clamp(p.x-w/2,OFFSET_X+1,OFFSET_X+COLS*TILE_SIZE-w-1),
      y:clamp(p.y-h/2,OFFSET_Y+1,OFFSET_Y+ROWS*TILE_SIZE-h-1),
      w,h
    };
  };

  // Keep player recovery positions in micro-grid coordinates near the real spawn.
  spawnPlayer=function(){
    const spots=[
      [PLAYER_SPAWN.c,PLAYER_SPAWN.r],
      [PLAYER_SPAWN.c-1,PLAYER_SPAWN.r],
      [PLAYER_SPAWN.c+1,PLAYER_SPAWN.r],
      [PLAYER_SPAWN.c,PLAYER_SPAWN.r-2],
      [PLAYER_SPAWN.c-1,PLAYER_SPAWN.r-2],
      [PLAYER_SPAWN.c+1,PLAYER_SPAWN.r-2]
    ];
    player={x:0,y:0,w:32,h:36,dir:'up',speed:180,alive:1,vx:0,vy:0};
    for(const [cc,rr] of spots){
      if(cc<0||cc>=COLS||rr<0||rr>=ROWS) continue;
      const p=cellCenter(cc,rr);
      player.x=clamp(p.x-player.w/2,OFFSET_X+1,OFFSET_X+COLS*TILE_SIZE-player.w-1);
      player.y=clamp(p.y-player.h/2,OFFSET_Y+1,OFFSET_Y+ROWS*TILE_SIZE-player.h-1);
      if(!collidesEnvironment(player)&&!(base&&base.alive&&hit(player,base))) return;
    }
  };

  // Projectiles are directional instead of looking like stray red square pixels.
  shoot=function(t,owner){
    const [dx,dy]=dv(t.dir), vertical=dy!==0;
    const bw=vertical?4:9, bh=vertical?9:4;
    const rapid=owner==='p'&&performance.now()<rapidUntil;
    const speed=owner==='p'?520:(t.bulletSpeed||315);
    bullets.push({
      x:t.x+t.w/2-bw/2+dx*(t.w/2+5),
      y:t.y+t.h/2-bh/2+dy*(t.h/2+5),
      w:bw,h:bh,dx,dy,speed,owner,power:rapid?2:1
    });
    if(owner==='p')sfx('shot');
  };

  // Terrain art must stay inside one 23px micro-tile.
  drawIce=function(cc,rr){
    const x=px(cc),y=py(rr),s=TILE_SIZE;
    ctx.fillStyle='#8edcf2';ctx.fillRect(x,y,s,s);
    ctx.fillStyle='#c9f4ff';ctx.fillRect(x+3,y+4,s-9,2);ctx.fillRect(x+s-9,y+s-6,6,2);
    ctx.strokeStyle='#e9fbff';ctx.beginPath();ctx.moveTo(x+s-7,y+7);ctx.lineTo(x+8,y+s-7);ctx.lineTo(x+s-6,y+s-3);ctx.stroke();
  };

  drawWater=function(o){
    const x=o.x,y=o.y,s=o.w,t=Math.floor(performance.now()/240)%5;
    ctx.fillStyle='#235a9a';ctx.fillRect(x,y,o.w,o.h);
    ctx.fillStyle='#4b91d4';
    ctx.fillRect(x+2+t,y+6,Math.max(5,s-10),2);
    ctx.fillRect(x+6-t/2,y+14,Math.max(5,s-12),2);
  };

  drawSteel=function(o){
    const x=o.x,y=o.y,s=o.w;
    ctx.fillStyle='#737f90';ctx.fillRect(x,y,s,o.h);
    ctx.fillStyle='#9ca7b5';ctx.fillRect(x+3,y+3,Math.max(1,s-6),3);
    ctx.strokeStyle='#bfc8d2';ctx.strokeRect(x+1.5,y+1.5,Math.max(1,s-3),Math.max(1,o.h-3));
    ctx.fillStyle='#3e4855';
    for(const [dx,dy] of [[4,5],[s-6,5],[4,o.h-7],[s-6,o.h-7]])ctx.fillRect(x+dx,y+dy,2,2);
  };

  drawBush=function(cc,rr){
    const x=px(cc),y=py(rr),s=TILE_SIZE;
    ctx.save();ctx.globalAlpha=.92;
    const colors=['#23582f','#2e7139','#3d8847'];
    const dots=[[2,3],[8,2],[14,4],[4,9],[11,9],[16,11],[2,15],[8,16],[14,17]];
    dots.forEach((p,i)=>{ctx.fillStyle=colors[i%3];ctx.fillRect(x+p[0],y+p[1],Math.min(7,s-p[0]-1),Math.min(6,s-p[1]-1));});
    ctx.restore();
  };

  console.info('Tank Base v15.2 runtime stability patch active');
})();
