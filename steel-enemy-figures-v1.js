'use strict';
/* Steel Assault enemy figures 1.0
 * Four independent silhouettes. Unlike the legacy enemy collage, this module
 * uses no photographic hero art and no image backgrounds. Figures are drawn
 * in local coordinates, with articulated limbs and a shared weapon-muzzle
 * transform. Physical enemy hitboxes/behaviour stay in the game engine.
 */
(function initEnemyFigures() {
  const PI = Math.PI;
  const TAU = PI * 2;
  const fit = (v, a, b) => Math.max(a, Math.min(b, v));
  const STYLES = {
    rifle: {
      cloth: '#3a4743', shadow: '#182829', armor: '#64776b',
      bright: '#a3ad90', trim: '#cb6c48', visor: '#e6a766',
      sole: '#202625', skin: '#635c4b', slim: 0.95, gunY: -47, muzzleX: 47
    },
    runner: {
      cloth: '#244a52', shadow: '#17252e', armor: '#488a89',
      bright: '#a2c7ac', trim: '#f1a45d', visor: '#f0c26b',
      sole: '#1a3034', skin: '#665b55', slim: 0.72, gunY: -46, muzzleX: 42
    },
    heavy: {
      cloth: '#32373b', shadow: '#11181f', armor: '#586771',
      bright: '#a6b0a7', trim: '#e07d50', visor: '#e95243',
      sole: '#22272b', skin: '#3f4a50', slim: 1.37, gunY: -47, muzzleX: 48
    },
    boss: {
      cloth: '#392f38', shadow: '#171b29', armor: '#773e45',
      bright: '#cf7976', trim: '#ffab62', visor: '#ff4339',
      sole: '#291a23', skin: '#51373b', slim: 1.52, gunY: -49, muzzleX: 50
    }
  };
  const TYPES = Object.keys(STYLES);
  const MUZZLE = Object.fromEntries(TYPES.map(type => [type, {
    x: STYLES[type].muzzleX, y: STYLES[type].gunY
  }]));

  function polygon(ctx, points, color, outline = '#131c21', width = 2.1) {
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    if (width > 0) {
      ctx.lineWidth = width;
      ctx.strokeStyle = outline;
      ctx.stroke();
    }
  }

  function ellipse(ctx, x, y, rx, ry, color, angle = 0) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, angle, 0, TAU);
    ctx.fillStyle = color;
    ctx.fill();
  }

  function segment(ctx, a, b, thickness, material, edge) {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.lineWidth = thickness + 3;
    ctx.strokeStyle = edge;
    ctx.stroke();
    ctx.lineWidth = thickness;
    ctx.strokeStyle = material;
    ctx.stroke();
  }

  function drawLegs(ctx, entity, style, gait, crouch) {
    const heavy = entity.type === 'heavy' || entity.type === 'boss';
    const runner = entity.type === 'runner';
    const kneeBase = heavy ? -24 : -27;
    const thick = heavy ? (entity.type === 'boss' ? 15 : 13) : runner ? 6.5 : 9;
    const airborne = entity.onGround === false;
    for (let i = 0; i < 2; i++) {
      const phase = entity.walkPhase || 0;
      const step = Math.sin(phase + i * PI) * gait;
      const lift = airborne ? (i === 0 ? 12 : 9) : Math.max(0, step) * (runner ? 7 : 4);
      const hip = (i === 0 ? -12 : 12) * style.slim * 0.77;
      const kneeX = hip + step * (runner ? 15 : heavy ? 7 : 11);
      const kneeY = kneeBase - lift * 0.6 - crouch * 3;
      const ankleX = kneeX + step * (runner ? 12 : heavy ? 4 : 8) +
        (airborne ? (i === 0 ? 8 : -5) : 0);
      const ankleY = airborne ? -11 - lift : -6 - lift;
      segment(ctx, [hip, -45], [kneeX, kneeY], thick, style.cloth, style.shadow);
      ellipse(ctx, kneeX, kneeY, thick * 0.62, thick * 0.62, style.armor);
      segment(ctx, [kneeX, kneeY], [ankleX, ankleY], thick * 0.82, style.armor, style.shadow);
      polygon(ctx, [
        [ankleX - thick * 0.47, ankleY - 3],
        [ankleX + thick * 0.67, ankleY - 5],
        [ankleX + thick * 0.93 + (runner ? 4 : 0), ankleY + 2],
        [ankleX - thick * 0.52, ankleY + 3]
      ], style.sole, style.shadow, 1.5);
      if (heavy) {
        polygon(ctx, [[kneeX - 6, kneeY - 6],[kneeX + 7, kneeY - 5],
          [kneeX + 9, kneeY + 6],[kneeX - 7, kneeY + 5]], style.bright, style.shadow, 1.5);
      }
    }
  }

  function drawBackEquipment(ctx, type, s, time) {
    if (type === 'rifle') {
      polygon(ctx,[[-23,-69],[-33,-69],[-36,-51],[-24,-48]],'#35493d',s.shadow,2);
      polygon(ctx,[[-33,-64],[-27,-63],[-28,-54],[-35,-55]],'#6e806f',s.shadow,1);
      segment(ctx,[-31,-67],[-32,-91],1.8,'#a8afa2',s.shadow);
    } else if (type === 'runner') {
      polygon(ctx,[[-16,-62],[-27,-67],[-32,-59],[-24,-46]],'#203e47',s.shadow,2);
      polygon(ctx,[[-29,-55],[-42,-57],[-36,-50],[-26,-48]],s.trim,s.shadow,1);
    } else if (type === 'heavy') {
      polygon(ctx,[[-28,-79],[-46,-75],[-46,-43],[-31,-39]],'#3a454c',s.shadow,3);
      for (let y = -73; y < -47; y += 10) ctx.fillStyle = s.bright, ctx.fillRect(-43,y,8,3);
      ellipse(ctx,-38,-55,5,7,'#ab673e');
    } else if (type === 'boss') {
      polygon(ctx,[[-29,-79],[-49,-81],[-50,-42],[-27,-38]],'#4b2d37',s.shadow,3);
      polygon(ctx,[[-45,-82],[-55,-93],[-39,-85]],s.bright,s.shadow,2);
      polygon(ctx,[[-45,-48],[-55,-40],[-38,-41]],s.armor,s.shadow,2);
      ellipse(ctx,-40,-60,6,10,s.visor);
    }
  }

  function drawTorso(ctx, type, s) {
    const heavy = type === 'heavy' || type === 'boss';
    const shoulder = heavy ? (type === 'boss' ? 34 : 30) : type === 'runner' ? 17 : 23;
    const lower = heavy ? 21 : type === 'runner' ? 13 : 18;
    const yTop = type === 'runner' ? -69 : -72;
    const plate = ctx.createLinearGradient(0,-73,0,-43);
    plate.addColorStop(0,s.bright);
    plate.addColorStop(0.28,s.armor);
    plate.addColorStop(1,s.cloth);
    polygon(ctx,[[-shoulder,yTop],[-shoulder+3,-51],[-lower,-42],
      [lower,-42],[shoulder-2,-54],[shoulder,yTop]],plate,s.shadow,3);
    polygon(ctx,[[-lower,-47],[-lower+4,-40],[lower-3,-40],[lower,-47]],s.shadow,s.shadow,1.5);
    if (type === 'rifle') {
      polygon(ctx,[[-18,-66],[3,-68],[6,-52],[-13,-50]],'#849080',s.shadow,2);
      polygon(ctx,[[7,-67],[19,-65],[17,-49],[6,-51]],'#465956',s.shadow,1);
      segment(ctx,[-11,-69],[7,-44],4,s.shadow,'#1a2b2b');
      for (let i=0;i<3;i++)ctx.fillStyle=s.trim,ctx.fillRect(-11+i*9,-49,5,5);
    } else if (type === 'runner') {
      polygon(ctx,[[-13,-64],[9,-64],[13,-49],[-10,-48]],'#356f72',s.shadow,1.7);
      polygon(ctx,[[12,-70],[24,-67],[14,-60],[4,-59]],s.trim,s.shadow,1.5);
      segment(ctx,[-8,-61],[4,-48],3.4,s.trim,s.shadow);
    } else if (type === 'heavy') {
      polygon(ctx,[[-24,-69],[23,-70],[26,-49],[-22,-48]],'#566877',s.shadow,3);
      polygon(ctx,[[-18,-63],[0,-66],[0,-55],[-18,-55]],s.bright,s.shadow,1.2);
      polygon(ctx,[[3,-65],[20,-63],[18,-55],[2,-55]],'#3a454c',s.shadow,1.2);
      for (let i=0;i<4;i++)ctx.fillStyle=s.trim,ctx.fillRect(-19+i*11,-51,7,3);
    } else {
      polygon(ctx,[[-25,-71],[24,-73],[29,-48],[-27,-47]],'#743a43',s.shadow,3);
      polygon(ctx,[[-19,-66],[-4,-69],[1,-52],[-16,-51]],'#b05a5c',s.shadow,1.8);
      polygon(ctx,[[5,-69],[22,-66],[23,-53],[4,-53]],'#8a4147',s.shadow,1.8);
      ellipse(ctx,0,-60,6.5,7,s.visor);
      ellipse(ctx,0,-60,3,4,'#ffe0aa');
    }
  }

  function drawShoulders(ctx,type,s) {
    if (type === 'runner') {
      polygon(ctx,[[-21,-72],[-12,-77],[-5,-72],[-13,-66]],s.armor,s.shadow,1.8);
      polygon(ctx,[[12,-76],[20,-73],[24,-65],[14,-67]],s.trim,s.shadow,1.8);
    } else if (type === 'rifle') {
      polygon(ctx,[[-26,-72],[-13,-77],[-8,-68],[-23,-63]],s.armor,s.shadow,2);
      polygon(ctx,[[12,-75],[29,-71],[28,-62],[12,-65]],'#71867a',s.shadow,2);
      ctx.fillStyle=s.trim;ctx.fillRect(17,-71,10,3);
    } else if (type === 'heavy') {
      polygon(ctx,[[-37,-81],[-15,-82],[-8,-65],[-34,-62],[-41,-68]],s.armor,s.shadow,3);
      polygon(ctx,[[12,-82],[38,-78],[41,-66],[33,-62],[11,-65]],'#84939a',s.shadow,3);
      segment(ctx,[-31,-71],[-15,-70],2.5,s.bright,s.shadow);
      segment(ctx,[16,-72],[36,-68],2.5,s.bright,s.shadow);
    } else {
      polygon(ctx,[[-43,-85],[-20,-88],[-10,-68],[-39,-60]],'#864952',s.shadow,3.5);
      polygon(ctx,[[18,-88],[43,-84],[46,-64],[13,-62]],'#9d4d57',s.shadow,3.5);
      polygon(ctx,[[-38,-86],[-31,-104],[-23,-88]],s.bright,s.shadow,2);
      polygon(ctx,[[25,-91],[34,-105],[41,-85]],s.bright,s.shadow,2);
      segment(ctx,[-39,-68],[-15,-70],3,s.trim,s.shadow);
      segment(ctx,[17,-71],[43,-68],3,s.trim,s.shadow);
    }
  }

  function drawHead(ctx,type,s) {
    if (type === 'rifle') {
      polygon(ctx,[[-13,-90],[1,-97],[14,-89],[17,-76],[-15,-77]],'#68796c',s.shadow,2.5);
      polygon(ctx,[[-13,-86],[12,-88],[13,-82],[-13,-80]],'#263737',s.shadow,1.6);
      polygon(ctx,[[5,-86],[17,-84],[15,-81],[4,-81]],s.visor,s.shadow,1);
      polygon(ctx,[[-10,-79],[13,-79],[10,-73],[-8,-72]],'#31393a',s.shadow,1.5);
      ctx.fillStyle=s.trim;ctx.fillRect(-7,-91,12,2.5);
    } else if (type === 'runner') {
      polygon(ctx,[[-16,-89],[-6,-99],[7,-97],[18,-85],[13,-77],[-18,-77]],'#2c555c',s.shadow,2.2);
      polygon(ctx,[[-6,-95],[8,-90],[22,-82],[15,-78],[-9,-82]],'#2b6f77',s.shadow,1.5);
      polygon(ctx,[[1,-84],[20,-84],[17,-80],[0,-79]],'#1c2930',s.shadow,1);
      ctx.fillStyle=s.visor;ctx.fillRect(7,-83,10,2.8);
      polygon(ctx,[[-10,-78],[13,-78],[9,-70],[-6,-72]],s.trim,s.shadow,1.3);
    } else if (type === 'heavy') {
      polygon(ctx,[[-19,-92],[17,-94],[22,-85],[22,-72],[-20,-72]],'#485b66',s.shadow,3);
      polygon(ctx,[[-18,-91],[-10,-99],[10,-100],[20,-91]],'#8d9ca1',s.shadow,2);
      polygon(ctx,[[-17,-83],[18,-85],[17,-78],[-16,-77]],'#161e27',s.shadow,1.5);
      ctx.fillStyle=s.visor;ctx.fillRect(-10,-83,25,3);
      polygon(ctx,[[-12,-77],[13,-78],[7,-69],[-8,-69]],'#334049',s.shadow,1.5);
      ctx.strokeStyle=s.bright;ctx.lineWidth=1.8;ctx.beginPath();ctx.moveTo(0,-75);ctx.lineTo(0,-71);ctx.stroke();
    } else {
      polygon(ctx,[[-20,-90],[-11,-103],[11,-103],[23,-91],[18,-72],[-17,-71]],'#793b48',s.shadow,3.5);
      polygon(ctx,[[-16,-94],[-25,-112],[-7,-101]],s.armor,s.shadow,2);
      polygon(ctx,[[13,-101],[29,-112],[24,-90]],s.armor,s.shadow,2);
      polygon(ctx,[[-17,-88],[19,-88],[18,-80],[-16,-80]],'#230d16',s.shadow,1.8);
      ctx.fillStyle=s.visor;ctx.fillRect(-13,-86,29,4.2);
      polygon(ctx,[[-12,-78],[14,-78],[10,-69],[-8,-69]],'#361f29',s.shadow,1.7);
      ctx.strokeStyle=s.trim;ctx.lineWidth=2;
      ctx.beginPath();ctx.moveTo(-9,-73);ctx.lineTo(9,-73);ctx.stroke();
    }
  }

  function drawWeapon(ctx,type,s,recoil) {
    const y=s.gunY, offset=-fit(recoil,0,1)*3;
    ctx.save();
    ctx.translate(offset,0);
    const metal=ctx.createLinearGradient(0,y-9,0,y+8);
    metal.addColorStop(0,'#a9ada6');
    metal.addColorStop(0.37,'#46525a');
    metal.addColorStop(1,'#161f26');
    if (type === 'runner') {
      // Runner carries a short compact machine pistol, unlike hero rifle.
      polygon(ctx,[[16,y-8],[32,y-9],[42,y-4],[42,y+3],[19,y+4]],metal,s.shadow,2);
      polygon(ctx,[[20,y+3],[29,y+3],[29,y+15],[24,y+14]],s.shadow,s.shadow,1);
      ctx.fillStyle=s.trim;ctx.fillRect(32,y-6,5,2);
    } else if (type === 'rifle') {
      polygon(ctx,[[0,y-7],[28,y-8],[31,y-4],[47,y-4],[47,y+1],[29,y+1],[27,y+6],[1,y+6]],metal,s.shadow,2.2);
      polygon(ctx,[[8,y+4],[17,y+4],[15,y+17],[9,y+16]],s.shadow,s.shadow,1);
      polygon(ctx,[[22,y+5],[26,y+4],[27,y+11],[23,y+12]],'#1e2d2f',s.shadow,1);
      ctx.fillStyle=s.bright;ctx.fillRect(19,y-10,13,2);
      ctx.fillStyle=s.trim;ctx.fillRect(43,y-4,4,5);
    } else if (type === 'heavy') {
      polygon(ctx,[[2,y-10],[26,y-13],[40,y-9],[48,y-7],[48,y+8],[26,y+11],[2,y+8]],metal,s.shadow,3);
      for (let i=0;i<3;i++){
        ctx.fillStyle='#151b20';ctx.fillRect(30,y-7+i*5,17,3.2);
        ctx.fillStyle=s.bright;ctx.fillRect(33,y-6+i*5,12,1.3);
      }
      ellipse(ctx,11,y-1,11,12,'#34444b');
      ellipse(ctx,11,y-1,5,6,s.trim);
      polygon(ctx,[[6,y+8],[20,y+8],[18,y+24],[10,y+24]],s.shadow,s.shadow,1);
    } else {
      polygon(ctx,[[1,y-15],[22,y-18],[40,y-13],[50,y-7],[50,y+8],[35,y+12],[3,y+10]],metal,s.shadow,3.5);
      polygon(ctx,[[10,y-17],[21,y-23],[36,y-19],[38,y-13]],'#88454a',s.shadow,2);
      for(let i=0;i<3;i++)ctx.fillStyle=s.bright,ctx.fillRect(30,y-6+i*5,18,1.8);
      ellipse(ctx,20,y,7,8,s.visor);
      ctx.fillStyle=s.trim;ctx.fillRect(47,y-7,3,15);
    }
    ctx.restore();
  }

  function drawArms(ctx,type,s,recoil) {
    const thick=type==='boss'?16:type==='heavy'?14:type==='runner'?6:9;
    const y=s.gunY;
    // Rear arm and forward hand rotate under recoil; separate from torso.
    segment(ctx,[-19,-68],[-27,-55],thick,s.armor,s.shadow);
    segment(ctx,[-27,-55],[-2,y+2],thick*0.82,s.cloth,s.shadow);
    ellipse(ctx,-2,y+2,thick*0.54,thick*0.48,s.skin);
    drawWeapon(ctx,type,s,recoil);
    segment(ctx,[17,-68],[23,y+8],thick,s.armor,s.shadow);
    ellipse(ctx,23,y+8,thick*0.5,thick*0.48,s.skin);
    if(type==='heavy'||type==='boss'){
      polygon(ctx,[[18,-66],[32,-65],[37,-55],[24,-52]],s.bright,s.shadow,2);
    } else if(type==='runner'){
      ctx.fillStyle=s.trim;ctx.fillRect(19,y+8,9,3);
    }
  }

  function draw(ctx,entity,sprite,cameraX,time,pose){
    if (!STYLES[entity.type]) return false;
    const style=STYLES[entity.type];
    const facing=entity.direction < 0 ? -1 : 1;
    const crouch=fit(pose.crouchBlend || (entity.crouching ? 1 : 0),0,1);
    const gait=fit(pose.walkMix || 0,0,1);
    const x=sprite.x + sprite.w*0.5-cameraX + (pose.recoilX || 0);
    const y=sprite.y + sprite.h + (pose.bob || 0) + (pose.recoilY || 0);
    ctx.save();
    ctx.translate(x,y);
    ctx.rotate(pose.rotation || 0);
    ctx.scale(facing*(1+crouch*0.08)*sprite.w/100,
      (1-crouch*0.32)*sprite.h/100);
    ctx.lineCap='round';
    ctx.lineJoin='round';
    if(entity.hitFlash>0)ctx.filter='brightness(1.9) saturate(.55)';
    // Runner leans forward; heavy soldier and boss keep an imposing upright form.
    if(entity.type==='runner')ctx.transform(1,0,-0.11,1,0,0);
    if(entity.type==='boss')ctx.transform(1,0,-0.015,1,0,0);
    drawLegs(ctx,entity,style,gait,crouch);
    drawBackEquipment(ctx,entity.type,style,time);
    drawTorso(ctx,entity.type,style);
    drawShoulders(ctx,entity.type,style);
    drawHead(ctx,entity.type,style);
    drawArms(ctx,entity.type,style,entity.recoil || 0);
    ctx.restore();
    return true;
  }

  function muzzle(entity,sprite,pose,shotAngle){
    const meta=MUZZLE[entity.type];
    if(!meta)return null;
    const crouch=fit(pose.crouchBlend || (entity.crouching ? 1 : 0),0,1);
    const facing=entity.direction < 0 ? -1 : 1;
    const shift=entity.type==='runner'?-0.11:entity.type==='boss'?-0.015:0;
    // Runner torso shear also moves the gun tip at its local negative Y.
    const localX=(meta.x+shift*meta.y)*(1+crouch*0.08)*sprite.w/100*facing
      -fit(entity.recoil||0,0,1)*3*sprite.w/100*facing;
    const localY=meta.y*(1-crouch*0.32)*sprite.h/100;
    const cos=Math.cos(pose.rotation||0),sin=Math.sin(pose.rotation||0);
    return {
      x:sprite.x + sprite.w*0.5 + (pose.recoilX||0) + localX*cos-localY*sin,
      y:sprite.y + sprite.h + (pose.bob||0)+(pose.recoilY||0)
        +localX*sin+localY*cos,
      angle:Number.isFinite(shotAngle)?shotAngle:(facing===1?0:PI)
    };
  }

  window.SteelAssaultEnemyFigures=Object.freeze({
    version:'1.0.0',types:TYPES,draw,muzzle,
    silhouettes:Object.freeze({
      rifle:'masked patrolman',
      runner:'hooded scout',
      heavy:'armored gunner',
      boss:'red exosuit commander'
    })
  });
})();
