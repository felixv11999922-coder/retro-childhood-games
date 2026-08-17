'use strict';
(function(){
  const COLS=26,ROWS=26,TILE_SIZE=23,FIELD_W=900,FIELD_H=600;
  const OFFSET_X=(FIELD_W-COLS*TILE_SIZE)/2,OFFSET_Y=(FIELD_H-ROWS*TILE_SIZE)/2;
  const HQ_COL=12,HQ_ROW=24,PLAYER_SPAWN={c:8,r:24};
  const SPAWN_POINTS={TOP_LEFT:{c:0,r:0,dir:'down'},TOP_CENTER:{c:12,r:0,dir:'down'},TOP_RIGHT:{c:24,r:0,dir:'down'}};
  const ENEMY_TYPES={
    NORMAL:{hp:1,speed:92,fireInterval:[1.0,1.42],bulletSpeed:300,score:100,color:'#ed6a62'},
    FAST:{hp:1,speed:132,fireInterval:[.95,1.32],bulletSpeed:315,score:200,color:'#f39a5b'},
    ARMORED:{hp:4,speed:72,fireInterval:[1.0,1.38],bulletSpeed:310,score:400,color:'#6fb2ff'},
    ASSAULT:{hp:1,speed:94,fireInterval:[.58,.88],bulletSpeed:372,score:300,color:'#d76ee8'},
    ELITE:{hp:3,speed:108,fireInterval:[.48,.75],bulletSpeed:390,score:650,color:'#f2ca4b'}
  };
  const key=(c,r)=>`${c},${r}`,inBounds=(c,r)=>c>=0&&c<COLS&&r>=0&&r<ROWS;
  const createMap=()=>({obstacles:new Map(),ice:new Set(),bush:new Set()});
  function put(map,c,r,type='BRICK',damage=0){if(inBounds(c,r))map.obstacles.set(key(c,r),{c,r,type,damage})}
  function clear(map,c,r){map.obstacles.delete(key(c,r));map.ice.delete(key(c,r));map.bush.delete(key(c,r))}
  function block(map,C,R,type='BRICK'){for(let dy=0;dy<2;dy++)for(let dx=0;dx<2;dx++)put(map,C*2+dx,R*2+dy,type)}
  function hLarge(map,R,C1,C2,type='BRICK',gaps=[]){for(let C=C1;C<=C2;C++)if(!gaps.includes(C))block(map,C,R,type)}
  function vLarge(map,C,R1,R2,type='BRICK',gaps=[]){for(let R=R1;R<=R2;R++)if(!gaps.includes(R))block(map,C,R,type)}
  function boxLarge(map,C1,R1,C2,R2,type='BRICK',gates=[]){for(let C=C1;C<=C2;C++){if(!gates.some(([c,r])=>c===C&&r===R1))block(map,C,R1,type);if(!gates.some(([c,r])=>c===C&&r===R2))block(map,C,R2,type)}for(let R=R1+1;R<R2;R++){if(!gates.some(([c,r])=>c===C1&&r===R))block(map,C1,R,type);if(!gates.some(([c,r])=>c===C2&&r===R))block(map,C2,R,type)}}
  function patch(map,C,R,w,h,type){for(let y=0;y<h;y++)for(let x=0;x<w;x++)block(map,C+x,R+y,type)}
  const PRESETS={
    A(m,v){hLarge(m,2,1,4,'BRICK',[3]);hLarge(m,2,8,11,'BRICK',[9]);hLarge(m,6,2,10,'BRICK',[5,6]);hLarge(m,9,1,4,'BRICK',[2]);hLarge(m,9,8,11,'BRICK',[10]);if(v>2){block(m,4,4,'STEEL');block(m,8,8,'STEEL')}},
    B(m,v){for(const C of [2,6,10])vLarge(m,C,1,9,'BRICK',[3+(C%3),7]);if(v>1)hLarge(m,5,1,11,'BRICK',[2,6,10]);if(v>3){block(m,2,4,'STEEL');block(m,10,6,'STEEL')}},
    C(m,v){hLarge(m,6,1,11,'BRICK',[5,6,7]);vLarge(m,6,1,10,'BRICK',[5,6,7]);if(v>1){hLarge(m,3,3,9,'BRICK',[6]);hLarge(m,9,3,9,'BRICK',[6])}if(v>2){block(m,2,6,'STEEL');block(m,10,6,'STEEL')}},
    D(m,v){boxLarge(m,3,2,9,8,'BRICK',[[6,2],[6,8],[3,5],[9,5]]);if(v>1){for(const p of [[3,2],[9,2],[3,8],[9,8]])block(m,p[0],p[1],'STEEL')}},
    E(m,v){for(const [i,p] of [[0,[1,2]],[1,[5,2]],[2,[9,2]],[3,[3,5]],[4,[7,5]],[5,[1,8]],[6,[5,8]],[7,[9,8]]]){const [C,R]=p;patch(m,C,R,(i+v)%3===0?2:1,(i+v)%4===0?2:1,'BRICK')}},
    F(m,v){for(const [R,C1,C2,g] of [[2,1,9,[3,7]],[4,3,11,[5,9]],[6,1,9,[4,8]],[8,3,11,[6,10]]])hLarge(m,R,C1,C2,'BRICK',g);if(v>2){block(m,6,3,'STEEL');block(m,6,7,'STEEL')}},
    G(m,v){patch(m,1,2,2,1,'BRICK');patch(m,9,2,2,1,'BRICK');patch(m,1,8,2,1,'BRICK');patch(m,9,8,2,1,'BRICK');if(v>1){block(m,4,5,'BRICK');block(m,8,5,'BRICK')}},
    H(m,v){boxLarge(m,3,2,9,8,'BRICK',v===1?[[6,2],[6,8],[3,5],[9,5]]:[[5,2],[7,2],[5,8],[7,8],[3,5],[9,5]]);if(v>1){block(m,3,2,'STEEL');block(m,9,8,'STEEL')}},
    I(m,v){for(let R=1;R<=9;R++){const k=Math.min(4,Math.floor((R-1)/2)),L=1+k,RR=11-k;if(L<5)block(m,L,R,'BRICK');if(RR>7)block(m,RR,R,'BRICK');if(v>1&&R%2===0){if(L+1<6)block(m,L+1,R,'BRICK');if(RR-1>6)block(m,RR-1,R,'BRICK')}}},
    J(m,v){for(let R=1;R<=9;R+=2)for(let C=1+(R%4?1:0);C<=11;C+=3)block(m,C,R,(v>2&&(C+R)%4===0)?'STEEL':'BRICK')},
    K(m,v){hLarge(m,1,1,11,'BRICK',[3,6,9]);hLarge(m,3,0,9,'BRICK',[2,5,8]);hLarge(m,5,2,12,'BRICK',[4,7,10]);hLarge(m,7,0,9,'BRICK',[2,6,8]);hLarge(m,9,1,11,'BRICK',[3,6,9]);if(v>1){vLarge(m,3,2,8,'BRICK',[4,7]);vLarge(m,9,2,8,'BRICK',[3,6])}},
    L(m,v){for(let R=1;R<=9;R++){const L=1+R,RR=12-R;if(L<6)block(m,L,R,'BRICK');if(RR>6)block(m,RR,R,'BRICK');if(v>1&&R%2===0){if(L+1<6)block(m,L+1,R,'BRICK');if(RR-1>6)block(m,RR-1,R,'BRICK')}}},
    M(m,v){vLarge(m,6,1,10,'BRICK',[3,6,8]);hLarge(m,5,1,11,'BRICK',[3,6,9]);if(v>1){vLarge(m,3,2,8,'BRICK',[4,7]);vLarge(m,9,2,8,'BRICK',[3,6])}if(v>2){for(const p of [[6,1],[6,10],[1,5],[11,5]])block(m,p[0],p[1],'STEEL')}},
    N(m,v){boxLarge(m,1,2,5,7,'BRICK',[[3,2],[5,4],[3,7]]);boxLarge(m,7,2,11,7,'BRICK',[[9,2],[7,4],[9,7]]);if(v>1)hLarge(m,8,3,8,'BRICK',[5,6]);if(v>2){block(m,5,3,'STEEL');block(m,7,6,'STEEL')}},
    O(m,v){hLarge(m,3,1,11,'BRICK',[3,6,9]);hLarge(m,6,2,10,'BRICK',[4,6,8]);hLarge(m,8,3,9,'BRICK',[4,6,8]);if(v>1){block(m,2,6,'STEEL');block(m,10,6,'STEEL')}if(v>3)hLarge(m,1,2,10,'BRICK',[4,6,8])}
  };
  const HQ_RESERVED=new Set();
  for(let r=22;r<=25;r++)for(let c=10;c<=15;c++)HQ_RESERVED.add(key(c,r));
  for(let r=23;r<=25;r++)for(let c=7;c<=9;c++)HQ_RESERVED.add(key(c,r));
  function sanitize(map){for(const k of HQ_RESERVED){const [c,r]=k.split(',').map(Number);clear(map,c,r)}for(const sp of Object.values(SPAWN_POINTS)){for(let dr=0;dr<=2;dr++)for(let dc=-1;dc<=2;dc++){const c=sp.c+dc,r=sp.r+dr;if(inBounds(c,r))clear(map,c,r)}}}
  const terrainProfiles=[['BRICK','BUSH'],['BRICK','STEEL'],['BRICK','WATER'],['BRICK','STEEL','BUSH'],['BRICK','WATER','BUSH'],['BRICK','STEEL','ICE'],['BRICK','WATER','ICE'],['BRICK','STEEL','WATER','BUSH'],['BRICK','STEEL','BUSH','ICE'],['BRICK','WATER','BUSH','ICE'],['BRICK','STEEL','WATER','ICE'],['BRICK','STEEL','WATER','BUSH','ICE']];
  function terrainFor(id){if(id<=3)return terrainProfiles[id-1];if(id<=7)return terrainProfiles[3+(id-4)%3];if(id<=15)return terrainProfiles[6+(id-8)%4];if(id<=30)return terrainProfiles[7+(id-16)%4];return terrainProfiles[11]}
  function addBush(map,id){const groups=[[[3,7],[4,7],[3,8],[4,8],[20,7],[21,7],[20,8],[21,8]],[[8,5],[9,5],[16,5],[17,5],[6,15],[7,15],[18,15],[19,15]],[[2,12],[3,12],[4,12],[21,12],[22,12],[23,12],[11,17],[12,17],[13,17],[14,17]]];for(const [c,r] of groups[id%groups.length])if(!map.obstacles.has(key(c,r))&&!HQ_RESERVED.has(key(c,r)))map.bush.add(key(c,r))}
  function addIce(map,id){const R=id%2?16:18;for(let r=R;r<R+3;r++)for(let c=5;c<=20;c++)if(!map.obstacles.has(key(c,r))&&!HQ_RESERVED.has(key(c,r)))map.ice.add(key(c,r))}
  function addWater(map,id){if(id%2){const R=8+(id%3)*2;for(let r=R;r<R+2;r++)for(let c=1;c<25;c++)if(![5,6,12,13,20,21].includes(c)&&!HQ_RESERVED.has(key(c,r)))put(map,c,r,'WATER')}else{const C=8+(id%3)*4;for(let c=C;c<C+2;c++)for(let r=3;r<22;r++)if(![6,7,13,14,19,20].includes(r)&&!HQ_RESERVED.has(key(c,r)))put(map,c,r,'WATER')}}
  function addSteel(map,id){const bricks=[...map.obstacles.values()].filter(o=>o.type==='BRICK'&&o.r<21).sort((a,b)=>(a.r-b.r)||(a.c-b.c));const target=Math.min(18,4+Math.floor(id/5)*2);for(let i=0,used=0;i<bricks.length&&used<target;i+=Math.max(1,Math.floor(bricks.length/target))){bricks[i].type='STEEL';used++}}
  function decorate(map,id,profile){if(profile.includes('STEEL'))addSteel(map,id);if(profile.includes('WATER'))addWater(map,id);if(profile.includes('ICE'))addIce(map,id);if(profile.includes('BUSH'))addBush(map,id);sanitize(map)}
  const LEVEL_NAMES=['Первый бой','Кирпичные острова','Три дороги','Перекрёсток','Фланги','Первая крепость','Засада','Острова','Зигзаг','Бронебой','Шахматный бой','Два берега','Архипелаг','Мосты','Водный фронт','Лесные коридоры','Две крепости','Скрытый перекрёсток','Воронка','Осада','Ледяной лабиринт','Дальний прострел','Карманы','Кольцо','Блиц','Разрушенные баррикады','Стальные ворота','Диагональ','Клещи','Тройная атака','Лабиринт II','Архипелаг II','Центральный проход','Полукольцо','Огневой штурм','Разлом','Крестовый огонь','Змея','Последняя стена','Большая осада','Открытая база','Крепость наизнанку','Четыре сектора','Туннели','Элитный отряд','Прорыв обороны','Ложный путь','Тройная осада','Последний рубеж','Финальная крепость'];
  const TEMPLATE_SEQ=['A1','E1','B1','C1','A2','D1','G1','E2','F1','D2','J1','B2','E3','H1','M1','G2','N1','J2','I1','O1','K1','B3','E4','H2','G3','A3','A4','L1','N2','M2','K2','E3','N3','H2','C2','M2','C3','F3','O2','O3','O4','D3','M3','B4','J3','O4','I2','K3','M4','O5'];
  function enemySequence(id){let n=14,f=6,g=0,a=0,e=0;if(id>5){n=10;f=7;g=3}if(id>15){n=6;f=7;g=6;a=1}if(id>25){n=4;f=6;g=7;a=3}if(id>35){n=2;f=6;g=7;a=4;e=1}if(id>45){n=0;f=5;g=7;a=6;e=2}const pool=[];for(const [t,count] of [['NORMAL',n],['FAST',f],['ASSAULT',g],['ARMORED',a],['ELITE',e]])for(let i=0;i<count;i++)pool.push(t);const out=[];while(pool.length){const idx=(id*3+out.length*5)%pool.length;out.push(pool.splice(idx,1)[0])}return out.slice(0,20)}
  function levelConfig(id){const seq=enemySequence(id),profile=terrainFor(id);return {id,name:LEVEL_NAMES[id-1],template:TEMPLATE_SEQ[id-1],terrain:profile,waves:[seq.slice(0,7),seq.slice(7,14),seq.slice(14,20)],spawnPoints:['TOP_LEFT','TOP_CENTER','TOP_RIGHT'],maxActive:4,enemyTotal:20}}
  const CAMPAIGN_LEVELS=Array.from({length:50},(_,i)=>levelConfig(i+1));
  function buildLevelMap(level){const map=createMap(),m=/^([A-O])(\d+)?$/.exec(level.template),letter=m?.[1]||'A',variant=Number(m?.[2]||1);(PRESETS[letter]||PRESETS.A)(map,variant);decorate(map,level.id,level.terrain||terrainFor(level.id));return {map,features:level.terrain||terrainFor(level.id)}}
  function walkable(map,c,r){return inBounds(c,r)&&!map.obstacles.has(key(c,r))}
  function hasRoute(map,start,targets){const q=[start],seen=new Set([key(start.c,start.r)]);while(q.length){const p=q.shift();if(targets.some(t=>Math.abs(t.c-p.c)<=1&&Math.abs(t.r-p.r)<=1))return true;for(const [dc,dr] of [[1,0],[-1,0],[0,1],[0,-1]]){const c=p.c+dc,r=p.r+dr,k=key(c,r);if(!seen.has(k)&&walkable(map,c,r)){seen.add(k);q.push({c,r})}}}return false}
  function validateLevel(level){const e=[];if(!level||level.id<1)e.push('invalid id');if((level.waves||[]).flat().length!==20)e.push('enemy total must be 20');if(!Array.isArray(level.waves)||level.waves.length!==3)e.push('expected 3 compatibility phases');if(!/^([A-O])\d*$/.test(level.template))e.push('unknown template');return e}
  function validateBuiltMap(level,built){const e=[...validateLevel(level)],map=built.map;for(const o of map.obstacles.values())if(!inBounds(o.c,o.r))e.push(`out:${o.c},${o.r}`);for(let r=HQ_ROW;r<HQ_ROW+2;r++)for(let c=HQ_COL;c<HQ_COL+2;c++)if(map.obstacles.has(key(c,r)))e.push('HQ blocked');for(const sp of Object.values(SPAWN_POINTS))if(map.obstacles.has(key(sp.c,sp.r)))e.push('spawn blocked');if(map.obstacles.has(key(PLAYER_SPAWN.c,PLAYER_SPAWN.r)))e.push('player blocked');const hqTarget={c:HQ_COL,r:HQ_ROW};for(const sp of Object.values(SPAWN_POINTS))if(!hasRoute(map,{c:sp.c+1,r:sp.r+2},[hqTarget]))e.push('no enemy route');return [...new Set(e)]}
  function generateEndlessLevel(levelNumber){const id=Math.max(51,levelNumber),base=levelConfig(((id-1)%50)+1);return {...base,id,name:`Бесконечный рубеж ${id}`,template:TEMPLATE_SEQ[(id*7)%TEMPLATE_SEQ.length],terrain:terrainProfiles[7+(id%5)],endless:true}}
  const validation=CAMPAIGN_LEVELS.map(l=>({id:l.id,errors:validateBuiltMap(l,buildLevelMap(l))})).filter(x=>x.errors.length);if(validation.length)console.warn('v14 validator warnings',validation);
  window.GameData={COLS,ROWS,TILE_SIZE,FIELD_W,FIELD_H,OFFSET_X,OFFSET_Y,HQ_COL,HQ_ROW,PLAYER_SPAWN,SPAWN_POINTS,ENEMY_TYPES,CAMPAIGN_LEVELS,TEMPLATES:PRESETS,buildLevelMap,validateLevel,validateBuiltMap,generateEndlessLevel,key};
})();