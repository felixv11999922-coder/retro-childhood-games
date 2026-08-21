'use strict';
(function(){
const W=960,H=540,GROUND=465,PLAYER_W=34,PLAYER_H=48;
const LEVELS=window.SteelAssaultLevels||[];
const $=id=>document.getElementById(id);
const canvas=$('gameCanvas'),ctx=canvas.getContext('2d');
ctx.imageSmoothingEnabled=false;

const UI={menu:$('menu'),game:$('game'),score:$('score'),level:$('level'),lives:$('lives'),weapon:$('weapon'),bossHud:$('bossHud'),bossHp:$('bossHp'),toast:$('toast'),modal:$('modal'),modalBadge:$('modalBadge'),modalTitle:$('modalTitle'),modalText:$('modalText'),modalPrimary:$('modalPrimary'),pauseModal:$('pauseModal'),levelGrid:$('levelGrid'),progressText:$('progressText'),bestScore:$('bestScore')};

const COLORS={
 jungle:['#071c18','#0d3a2e','#1c5a3c','#69b35a'],port:['#101724','#27334c','#6f5161','#e08b65'],waterfall:['#082033','#0b4760','#2b7182','#8acbd0'],energy:['#180d1d','#3b173f','#7c2d54','#ff8c54'],bunker:['#080d15','#14202f','#31516c','#65d7e9'],snow:['#152331','#395366','#8ca7b4','#dcecf2'],factory:['#171410','#3a3027','#785443','#f0a557'],sky:['#10243a','#24517e','#62a8d4','#c8e7ef'],tower:['#0b1624','#1c3954','#426f92','#93c7d8'],reactor:['#101118','#2f2444','#645093','#b777ff'],bio:['#170d18','#3e1538','#792c5d','#df6f9f'],final:['#080a13','#151a30','#4d2559','#ff4d77']
};

const WEAPONS={
 P:{name:'PULSE',rate:5.3,speed:620,damage:1,count:1,spread:0,color:'#f8f6c5',size:4},
 V:{name:'VULCAN',rate:10.5,speed:690,damage:1,count:1,spread:0,color:'#8fe9ff',size:3},
 F:{name:'FAN',rate:3.6,speed:600,damage:1,count:5,spread:.24,color:'#ffd069',size:4},
 L:{name:'LANCE',rate:3.1,speed:820,damage:3,count:1,spread:0,color:'#77fff0',size:6}
};

let currentLevelIndex=Math.max(0,Math.min(LEVELS.length-1,Number(localStorage.getItem('sa_selected_level')||0)));
let unlocked=Math.max(1,Number(localStorage.getItem('sa_unlocked')||1));
let bestScore=Number(localStorage.getItem('sa_best_score')||0);
let state='menu',world=null,lastTime=0,raf=0,modalAction=null;
let score=0,lives=4,weapon='P',barrierUntil=0,nextShotAt=0,respawnUntil=0,deathLock=false;
let cameraX=0,cameraY=0,shake=0;
const input={left:false,right:false,up:false,down:false,fire:false,firing:false,jumpQueued:false,padX:0,padY:0};
const keys=new Set();
let audioCtx=null;

function track(name,extra={}){try{window.saTrack?.(name,{level:(LEVELS[currentLevelIndex]?.id||null),...extra})}catch{}}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function rand(a,b){return a+Math.random()*(b-a)}
function rects(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y}
function seeded(seed){let x=(seed*9301+49297)%233280;return()=>{x=(x*9301+49297)%233280;return x/233280}}
function notify(text){UI.toast.textContent=text;UI.toast.classList.add('show');clearTimeout(notify.t);notify.t=setTimeout(()=>UI.toast.classList.remove('show'),1700)}
function sound(type){try{audioCtx||=new (window.AudioContext||window.webkitAudioContext)();if(audioCtx.state==='suspended')audioCtx.resume().catch(()=>{});const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.connect(g);g.connect(audioCtx.destination);const now=audioCtx.currentTime;let f=type==='shoot'?260:type==='hit'?120:type==='pickup'?720:type==='jump'?410:type==='boss'?82:160;o.type=type==='boss'?'sawtooth':'square';o.frequency.setValueAtTime(f,now);if(type==='shoot')o.frequency.exponentialRampToValueAtTime(f*1.5,now+.04);g.gain.setValueAtTime(type==='shoot'?.025:.05,now);g.gain.exponentialRampToValueAtTime(.001,now+(type==='boss'?.3:.08));o.start(now);o.stop(now+(type==='boss'?.31:.09))}catch{}}

const player={x:120,y:GROUND-PLAYER_H,w:PLAYER_W,h:PLAYER_H,vx:0,vy:0,onGround:false,facing:1,aimX:1,aimY:0,crouch:false,invulnerable:false};
const bullets=[];
function bullet(x,y,vx,vy,owner,damage=1,color='#fff',size=4,ttl=2.4){let b=bullets.find(v=>!v.active);if(!b){b={};bullets.push(b)}Object.assign(b,{active:true,x,y,vx,vy,owner,damage,color,size,w:size*2,h:size*2,ttl,age:0});return b}
const explosions=[];
function boom(x,y,color='#ffb04e',count=12){for(let i=0;i<count;i++)explosions.push({x,y,vx:rand(-130,130),vy:rand(-150,80),age:0,life:rand(.25,.55),color,size:rand(2,5)});shake=Math.max(shake,5);sound('hit')}

function resetPlayerPosition(){const lvl=LEVELS[currentLevelIndex];player.vx=player.vy=0;player.crouch=false;player.aimX=1;player.aimY=0;if(lvl.mode==='vertical'){player.x=110;player.y=lvl.height-120}else if(lvl.mode==='bunker'){player.x=480;player.y=470}else{player.x=Math.max(120,world?.checkpointX||120);player.y=GROUND-PLAYER_H}player.onGround=false;barrierUntil=Math.max(barrierUntil,performance.now()+1400);deathLock=false}

function initWorld(level){cameraX=0;cameraY=level.mode==='vertical'?level.height-H:0;bullets.forEach(b=>b.active=false);explosions.length=0;world={level,mode:level.mode,enemies:[],platforms:[],pits:[],hazards:[],triggers:[],capsules:[],boss:null,bossSpawned:false,checkpointX:120,rocks:[],rockTimer:0,bunker:null,complete:false};
 if(level.mode==='horizontal'||level.mode==='arena')buildHorizontal(level);
 if(level.mode==='vertical')buildVertical(level);
 if(level.mode==='bunker')buildBunker(level);
}

function buildHorizontal(level){const r=seeded(level.id*91);const length=level.length;world.platforms.push({x:0,y:GROUND,w:length,h:H-GROUND,type:'ground'});
 if(level.hazards==='pits'||level.hazards==='mixed'){const count=level.mode==='arena'?0:Math.min(6,1+Math.floor(level.id/2));for(let i=0;i<count;i++){const x=900+i*((length-1900)/Math.max(1,count))+r()*180;world.pits.push({x,w:90+r()*70})}}
 const segments=Math.floor(length/520);for(let i=1;i<segments;i++){const sx=i*520+60;if(r()>.34){const py=GROUND-(70+Math.floor(r()*2)*22);world.platforms.push({x:sx+80,y:py,w:130+r()*100,h:18,type:'ledge'})}const comp=[];const n=2+Math.floor(level.difficulty*2.2+r()*2);for(let j=0;j<n;j++){const q=r();comp.push(q<.38?'runner':q<.62?'rifle':q<.78?'turret':q<.92?'drone':'heavy')}world.triggers.push({at:sx,done:false,comp,pickup:(i%3===1?level.pickups[(i+level.id)%level.pickups.length]:null)})}
 if(level.hazards==='flame'||level.hazards==='mixed'){for(let x=1050;x<length-1100;x+=780)world.hazards.push({type:'flame',x:x+r()*130,y:GROUND-96,w:34,h:96,phase:r()*2.6})}
 if(level.hazards==='press'||level.hazards==='mixed'){for(let x=1200;x<length-1200;x+=850)world.hazards.push({type:'press',x:x+r()*100,w:72,phase:r()*3.1})}
 if(level.mode==='arena')world.triggers=[{at:260,done:false,comp:['runner','rifle','drone','turret'],pickup:'F'}];
}

function buildVertical(level){const r=seeded(level.id*121),hh=level.height;world.platforms.push({x:0,y:hh-48,w:960,h:48,type:'ground'});let y=hh-125,side=0;while(y>420){const w=150+r()*100;let x=side%3===0?80+r()*100:side%3===1?360+r()*120:690-r()*80;world.platforms.push({x,y,w,h:18,type:'ledge'});if(side%2===0)world.triggers.push({atY:y,done:false,comp:[r()>.5?'rifle':'runner',r()>.55?'drone':'turret'],pickup:(side%6===0?level.pickups[(side/2)%level.pickups.length]:null)});y-=80+r()*18;side++}world.platforms.push({x:250,y:230,w:460,h:22,type:'bossFloor'});}

function buildBunker(level){world.bunker={room:1,rooms:level.rooms,coreHp:0,coreMax:0,enemies:[],shots:[],bonus:null,advanceAt:0,boss:false,timer:0};setupBunkerRoom()}
function setupBunkerRoom(){const b=world.bunker,lvl=world.level;b.enemies.length=0;b.shots.length=0;b.advanceAt=0;b.boss=b.room===b.rooms;b.coreMax=b.boss?Math.round(35+lvl.id*4):Math.round(8+b.room*3*lvl.difficulty);b.coreHp=b.coreMax;player.x=480;player.y=470;barrierUntil=performance.now()+1200;const n=b.boss?3:2+b.room;for(let i=0;i<n;i++)b.enemies.push({x:170+(i%(n))*((620)/Math.max(1,n-1)),y:220+(i%2)*55,hp:b.boss?3:1+Math.floor(b.room/3),cool:rand(.4,1.4),phase:rand(0,6.28)});if(!b.boss&&b.room>1){const p=world.level.pickups[(b.room+world.level.id)%world.level.pickups.length];b.bonus={x:rand(200,760),y:160,code:p,dir:Math.random()>.5?1:-1,hp:1}}track('bunker_room_start',{metadata:{room:b.room}})}

function makeEnemy(type,x,y){const d=world.level.difficulty;const e={type,x,y,w:32,h:42,vx:0,vy:0,hp:1,maxHp:1,cool:rand(.3,1.2),age:0,phase:rand(0,6.28),groundY:GROUND};if(type==='runner'){e.vx=-(90+35*d)}if(type==='rifle'){e.hp=1;e.vx=-18*d}if(type==='turret'){e.w=36;e.h=34;e.hp=e.maxHp=3;e.vx=0}if(type==='drone'){e.w=36;e.h=25;e.hp=1;e.vx=-(75+25*d)}if(type==='heavy'){e.w=48;e.h=54;e.hp=e.maxHp=5;e.vx=-28*d}world.enemies.push(e);return e}
function activateTrigger(t){t.done=true;if(world.mode==='vertical'){for(let i=0;i<t.comp.length;i++){const type=t.comp[i],x=120+i*280+(i%2)*70,y=t.atY-60;makeEnemy(type,x,y)}if(t.pickup)world.capsules.push({x:850,y:t.atY-90,vx:-100,vy:0,code:t.pickup,w:34,h:26,hp:1})}else{for(let i=0;i<t.comp.length;i++){const type=t.comp[i],x=t.at+420+i*85,y=(type==='drone'?220:GROUND-(type==='heavy'?54:type==='turret'?34:42));makeEnemy(type,x,y)}if(t.pickup)world.capsules.push({x:t.at+500,y:150+Math.random()*100,vx:-110,vy:Math.sin(t.at)*8,code:t.pickup,w:34,h:26,hp:1})}}

function spawnBoss(){if(world.bossSpawned||world.mode==='bunker')return;world.bossSpawned=true;const l=world.level;let x,y;if(world.mode==='vertical'){cameraY=0;x=620;y=80}else{x=l.mode==='arena'?1230:l.length-230;y=170;cameraX=Math.max(0,(l.length||W)-W)}const hp=Math.round(28+l.id*5.5);world.boss={x,y,w:l.bossType==='fortress'?150:110,h:l.bossType==='fortress'?190:120,hp,maxHp:hp,type:l.bossType,name:l.boss,age:0,cool:1.1,phase:0,flash:0,warning:0,spawnCool:3.5};UI.bossHud.classList.remove('hidden');UI.bossHp.style.width='100%';track('boss_start',{metadata:{boss:l.boss}});notify('⚠ БОСС: '+l.boss);sound('boss')}

function startLevel(index){currentLevelIndex=clamp(index,0,LEVELS.length-1);localStorage.setItem('sa_selected_level',String(currentLevelIndex));score=0;lives=4;weapon='P';barrierUntil=0;nextShotAt=0;respawnUntil=0;deathLock=false;initWorld(LEVELS[currentLevelIndex]);resetPlayerPosition();state='playing';UI.menu.classList.add('hidden');UI.game.classList.remove('hidden');UI.modal.classList.add('hidden');UI.pauseModal.classList.add('hidden');UI.bossHud.classList.add('hidden');updateHud();track('game_start');track('level_start');track('level_attempt');lastTime=performance.now();cancelAnimationFrame(raf);raf=requestAnimationFrame(loop);}
function updateHud(){UI.score.textContent=Math.floor(score).toLocaleString('ru-RU');UI.level.textContent=(currentLevelIndex+1)+'/'+LEVELS.length;UI.lives.textContent=lives;UI.weapon.textContent=WEAPONS[weapon]?.name||weapon;if(world?.boss){UI.bossHp.style.width=(100*world.boss.hp/world.boss.maxHp)+'%'}}
function saveProgress(){bestScore=Math.max(bestScore,Math.floor(score));localStorage.setItem('sa_best_score',String(bestScore));UI.bestScore.textContent=bestScore.toLocaleString('ru-RU');unlocked=Math.max(unlocked,Math.min(LEVELS.length,currentLevelIndex+2));localStorage.setItem('sa_unlocked',String(unlocked));buildMenu()}

function killPlayer(reason='hit'){
 if(deathLock||state!=='playing'||performance.now()<barrierUntil)return;deathLock=true;lives--;weapon='P';updateHud();track('defeat',{metadata:{reason}});boom(player.x+player.w/2,player.y+player.h/2,'#7affd1',18);if(lives>0){respawnUntil=performance.now()+850;notify('Жизнь потеряна · осталось '+lives);setTimeout(()=>{if(state==='playing'){clearEnemyBullets();resetPlayerPosition();track('level_attempt')}},850)}else{setTimeout(()=>{if(state==='playing')gameOver()},650)}}
function clearEnemyBullets(){for(const b of bullets)if(b.active&&b.owner==='enemy')b.active=false;if(world?.bunker)world.bunker.shots.length=0}
function gameOver(){state='modal';saveProgress();showModal('GAME OVER','Миссия провалена','Попробуй ещё раз. Быстрый рестарт возвращает прямо в эту миссию.','Повторить',()=>startLevel(currentLevelIndex));track('game_over')}
function finishLevel(){if(world.complete)return;world.complete=true;state='modal';score+=2000+currentLevelIndex*400;updateHud();saveProgress();track('level_complete');track('boss_complete',{metadata:{boss:world.level.boss}});const last=currentLevelIndex===LEVELS.length-1;showModal(last?'КАМПАНИЯ ЗАВЕРШЕНА':'МИССИЯ ВЫПОЛНЕНА',last?'Последний протокол уничтожен':'Прорыв завершён',last?'Все 12 миссий пройдены. Теперь можно улучшать результат и оружейные маршруты.':'Открыта следующая миссия.','Продолжить',()=>last?returnToMenu():startLevel(currentLevelIndex+1))}
function showModal(badge,title,text,button,action){UI.modalBadge.textContent=badge;UI.modalTitle.textContent=title;UI.modalText.textContent=text;UI.modalPrimary.textContent=button;modalAction=action;UI.modal.classList.remove('hidden')}
function returnToMenu(){state='menu';cancelAnimationFrame(raf);UI.game.classList.add('hidden');UI.modal.classList.add('hidden');UI.pauseModal.classList.add('hidden');UI.menu.classList.remove('hidden');buildMenu()}

function updateInput(){input.left=keys.has('ArrowLeft')||keys.has('KeyA')||input.padX<-.22;input.right=keys.has('ArrowRight')||keys.has('KeyD')||input.padX>.22;input.up=keys.has('ArrowUp')||keys.has('KeyW')||input.padY<-.30;input.down=keys.has('ArrowDown')||keys.has('KeyS')||input.padY>.30;input.firing=keys.has('KeyX')||keys.has('KeyK')||input.fire;
 const px=(input.right?1:0)-(input.left?1:0),py=(input.down?1:0)-(input.up?1:0);if(px!==0)player.facing=px;
 if(py<0){player.aimY=-1;player.aimX=px!==0?px:0}else if(py>0&&(!player.onGround||world.mode==='bunker')){player.aimY=1;player.aimX=px!==0?px:0}else{player.aimY=0;player.aimX=px!==0?px:player.facing}
 let len=Math.hypot(player.aimX,player.aimY)||1;player.aimX/=len;player.aimY/=len;
 if(world.mode!=='bunker'){const speed=230;player.vx=px*speed;player.crouch=py>0&&player.onGround;if(player.crouch)player.vx*=.45;if(input.jumpQueued&&player.onGround){player.vy=-525;player.onGround=false;player.crouch=false;sound('jump')}input.jumpQueued=false;if(input.firing)tryShoot()}
}

function tryShoot(){const now=performance.now();const w=WEAPONS[weapon]||WEAPONS.P;if(now<nextShotAt||respawnUntil>now)return;nextShotAt=now+1000/w.rate;let ax=player.aimX,ay=player.aimY;if(!ax&&!ay){ax=player.facing;ay=0}const base=Math.atan2(ay,ax);for(let i=0;i<w.count;i++){const off=w.count===1?0:(i-(w.count-1)/2)*w.spread;const a=base+off;bullet(player.x+player.w/2+Math.cos(a)*20,player.y+(player.crouch?player.h*.72:player.h*.42),Math.cos(a)*w.speed,Math.sin(a)*w.speed,'player',w.damage,w.color,w.size,1.8)}sound('shoot')}
function grantPickup(code){if(code==='B'){barrierUntil=performance.now()+11000;notify('🛡 Щит · 11 секунд');track('powerup',{metadata:{pickup:'barrier'}});sound('pickup');return}if(code==='X'){for(const e of world.enemies){e.hp=0}for(const b of bullets)if(b.active&&b.owner==='enemy')b.active=false;notify('⚡ Импульс: экран очищен');track('powerup',{metadata:{pickup:'nova'}});sound('pickup');return}if(WEAPONS[code]){weapon=code;notify('Оружие: '+WEAPONS[code].name);updateHud();track('powerup',{metadata:{pickup:WEAPONS[code].name}});sound('pickup')}}

function updateWorld(dt,now){updateInput();if(respawnUntil>now){updateParticles(dt);return}if(world.mode==='bunker'){updateBunker(dt,now);updateParticles(dt);return}
 const prevY=player.y;player.vy+=1450*dt;player.x+=player.vx*dt;player.y+=player.vy*dt;player.onGround=false;
 if(world.mode==='vertical')updateVerticalPhysics(prevY);else updateHorizontalPhysics(prevY);
 if(player.y>world.level.height+120||player.y>H+240&&world.mode!=='vertical')killPlayer('fall');
 updateTriggers();updateCapsules(dt);updateEnemies(dt);updateBullets(dt);updateHazards(dt,now);updateBoss(dt);updateParticles(dt);updateCamera();
 if(world.mode==='horizontal'&&!world.bossSpawned&&player.x>(world.level.length-850))spawnBoss();if(world.mode==='arena'&&!world.bossSpawned&&player.x>600)spawnBoss();if(world.mode==='vertical'&&!world.bossSpawned&&player.y<520)spawnBoss();
}

function updateHorizontalPhysics(prevY){const len=world.level.length||1600;player.x=clamp(player.x,0,len-player.w);const prevBottom=prevY+player.h,newBottom=player.y+player.h;for(const p of world.platforms){if(p.type==='ground')continue;if(player.vy>=0&&player.x+player.w>p.x&&player.x<p.x+p.w&&prevBottom<=p.y+4&&newBottom>=p.y){player.y=p.y-player.h;player.vy=0;player.onGround=true;break}}
 const inPit=world.pits.some(p=>player.x+player.w*.75>p.x&&player.x+player.w*.25<p.x+p.w);if(!inPit&&player.vy>=0&&newBottom>=GROUND&&prevBottom<=GROUND+18){player.y=GROUND-player.h;player.vy=0;player.onGround=true}
 if(world.bossSpawned){const left=Math.max(0,len-W);player.x=clamp(player.x,left+16,len-player.w-10)}}
function updateVerticalPhysics(prevY){const hh=world.level.height;player.x=clamp(player.x,10,W-player.w-10);const prevBottom=prevY+player.h,newBottom=player.y+player.h;for(const p of world.platforms){if(player.vy>=0&&player.x+player.w>p.x&&player.x<p.x+p.w&&prevBottom<=p.y+5&&newBottom>=p.y){player.y=p.y-player.h;player.vy=0;player.onGround=true;break}}if(player.y<20){player.y=20;player.vy=Math.max(0,player.vy)}if(player.y>hh+100)killPlayer('fall')}

function updateTriggers(){for(const t of world.triggers){if(t.done)continue;if(world.mode==='vertical'){if(player.y<t.atY+500)activateTrigger(t)}else if(player.x+650>t.at)activateTrigger(t)}}
function updateCapsules(dt){for(const c of world.capsules){c.x+=c.vx*dt;c.y+=c.vy*dt;c.y+=Math.sin(performance.now()/250+c.x*.01)*8*dt}world.capsules=world.capsules.filter(c=>c.hp>0&&c.x>(cameraX-160)&&c.y>(cameraY-160))}
function updateEnemies(dt){const d=world.level.difficulty;for(const e of world.enemies){if(e.hp<=0)continue;e.age+=dt;e.cool-=dt;if(e.type==='drone'){e.x+=e.vx*dt;e.y+=Math.sin(e.age*3+e.phase)*50*dt}else if(e.type==='runner'){e.x+=e.vx*dt}else if(e.type==='rifle'){if(Math.abs(e.x-player.x)>240)e.x+=e.vx*dt}else if(e.type==='heavy'){if(Math.abs(e.x-player.x)>290)e.x+=e.vx*dt}
  if((e.type==='rifle'||e.type==='turret'||e.type==='drone'||e.type==='heavy')&&e.cool<=0&&isNearScreen(e.x,e.y,250)){enemyShoot(e,d);e.cool=(e.type==='heavy'?.65:e.type==='turret'?.95:1.25)/d+Math.random()*.35}
  if(rects(player,{x:e.x,y:e.y,w:e.w,h:e.h}))killPlayer('enemy_contact')}
 world.enemies=world.enemies.filter(e=>{if(e.hp>0)return e.x>cameraX-700&&e.y>cameraY-500&&e.y<cameraY+H+600;score+=e.maxHp*100;boom(e.x+e.w/2,e.y+e.h/2,e.type==='drone'?'#8ee9ff':'#ff806e',8);return false})}
function isNearScreen(x,y,pad=100){return x>cameraX-pad&&x<cameraX+W+pad&&y>cameraY-pad&&y<cameraY+H+pad}
function enemyShoot(e,d){const sx=e.x+e.w/2,sy=e.y+e.h*.45,tx=player.x+player.w/2,ty=player.y+player.h/2;let a=Math.atan2(ty-sy,tx-sx);const count=e.type==='heavy'?2:1;for(let i=0;i<count;i++){const aa=a+(i-(count-1)/2)*.12;const sp=220+70*d;bullet(sx,sy,Math.cos(aa)*sp,Math.sin(aa)*sp,'enemy',1,'#ff6d6d',4,4)}}

function updateBullets(dt){for(const b of bullets){if(!b.active)continue;b.age+=dt;b.ttl-=dt;b.x+=b.vx*dt;b.y+=b.vy*dt;if(b.ttl<=0||b.x<cameraX-500||b.x>cameraX+W+700||b.y<cameraY-500||b.y>cameraY+H+700){b.active=false;continue}if(b.owner==='enemy'){if(rects({x:b.x-b.size,y:b.y-b.size,w:b.size*2,h:b.size*2},player)){b.active=false;killPlayer('projectile')}continue}
  let hit=false;for(const c of world.capsules){if(c.hp>0&&rects({x:b.x-b.size,y:b.y-b.size,w:b.size*2,h:b.size*2},c)){c.hp=0;b.active=false;grantPickup(c.code);score+=250;hit=true;break}}if(hit)continue;
  for(const e of world.enemies){if(e.hp>0&&rects({x:b.x-b.size,y:b.y-b.size,w:b.size*2,h:b.size*2},e)){e.hp-=b.damage;b.active=false;e.flash=.08;hit=true;break}}if(hit)continue;
  if(world.boss&&world.boss.hp>0&&bossHitRect(world.boss,b)){world.boss.hp-=b.damage;world.boss.flash=.08;b.active=false;score+=20;UI.bossHp.style.width=Math.max(0,100*world.boss.hp/world.boss.maxHp)+'%';if(world.boss.hp<=0){boom(world.boss.x+world.boss.w/2,world.boss.y+world.boss.h/2,'#ffd34f',34);setTimeout(()=>finishLevel(),700)}}
 }}
function bossHitRect(boss,b){const r={x:boss.x+boss.w*.28,y:boss.y+boss.h*.24,w:boss.w*.44,h:boss.h*.48};return rects({x:b.x-b.size,y:b.y-b.size,w:b.size*2,h:b.size*2},r)}

function updateHazards(dt,now){const t=now/1000;for(const h of world.hazards){if(h.type==='flame'){const q=(t+h.phase)%3.6;h.warning=q>.55&&q<.95;h.active=q>=.95&&q<2.05;if(h.active&&rects(player,h))killPlayer('flame')}else if(h.type==='press'){const q=(t+h.phase)%4.2;h.warning=q>.65&&q<1.05;h.active=q>=1.05&&q<2.05;h.extent=h.active?GROUND-45:Math.max(70,(1-Math.max(0,Math.min(1,(q-.65)/.4)))*(GROUND-115));if(h.active&&rects(player,{x:h.x,y:0,w:h.w,h:GROUND-70}))killPlayer('press')}}
 if(world.mode==='vertical'&&world.level.hazards==='rocks'){world.rockTimer-=dt;if(world.rockTimer<=0){world.rockTimer=1.6/world.level.difficulty;world.rocks.push({x:clamp(player.x+rand(-180,180),20,W-40),y:cameraY-30,vy:140+80*world.level.difficulty,w:24,h:24})}for(const r of world.rocks){r.y+=r.vy*dt;if(rects(player,r))killPlayer('rock')}world.rocks=world.rocks.filter(r=>r.y<cameraY+H+80)}}

function updateBoss(dt){const b=world.boss;if(!b||b.hp<=0)return;b.age+=dt;b.cool-=dt;b.spawnCool-=dt;b.flash=Math.max(0,b.flash-dt);b.warning=Math.max(0,b.warning-dt);const d=world.level.difficulty*(b.hp<b.maxHp*.5?1.18:1);if(world.mode==='vertical'){b.x=480+Math.sin(b.age*.7)*250;b.y=80+Math.sin(b.age*1.1)*35}else if(b.type!=='fortress'){b.y=150+Math.sin(b.age*.9)*85}
 if(b.cool<=0){const phase=Math.floor(b.age/3)%3;b.warning=.22;if(phase===0)bossAimedBurst(b,d);else if(phase===1)bossFan(b,d);else bossRadial(b,d);b.cool=(b.hp<b.maxHp*.5?1.25:1.7)/d}
 if(b.spawnCool<=0&&(b.type==='carrier'||b.type==='final')){const n=b.type==='final'?2:1;for(let i=0;i<n;i++)makeEnemy(i%2?'runner':'drone',b.x-80-i*50,b.y+80);b.spawnCool=3.4/d}
 if(rects(player,b))killPlayer('boss_contact')}
function bossAimedBurst(b,d){const sx=b.x+b.w*.35,sy=b.y+b.h*.55,a=Math.atan2(player.y-sy,player.x-sx);for(let i=-1;i<=1;i++){const aa=a+i*.11,sp=255+55*d;bullet(sx,sy,Math.cos(aa)*sp,Math.sin(aa)*sp,'enemy',1,'#ff5d77',5,4)}}
function bossFan(b,d){const sx=b.x+b.w*.35,sy=b.y+b.h*.65;for(let i=-2;i<=2;i++){const a=Math.PI+i*.18,sp=230+45*d;bullet(sx,sy,Math.cos(a)*sp,Math.sin(a)*sp,'enemy',1,'#ffb24f',5,4)}}
function bossRadial(b,d){const sx=b.x+b.w/2,sy=b.y+b.h/2;for(let i=0;i<10;i++){const a=i*Math.PI*2/10+b.age*.2,sp=170+45*d;bullet(sx,sy,Math.cos(a)*sp,Math.sin(a)*sp,'enemy',1,'#d56fff',4,4)}}

function updateCamera(){if(world.mode==='horizontal'||world.mode==='arena'){if(!world.bossSpawned)cameraX=clamp(player.x-W*.34,0,Math.max(0,(world.level.length||W)-W));else cameraX=Math.max(0,(world.level.length||W)-W);cameraY=0}else if(world.mode==='vertical'){if(!world.bossSpawned)cameraY=clamp(player.y-H*.58,0,world.level.height-H);else cameraY=0;cameraX=0}}
function updateParticles(dt){for(const p of explosions){p.age+=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=260*dt}for(let i=explosions.length-1;i>=0;i--)if(explosions[i].age>=explosions[i].life)explosions.splice(i,1)}

function updateBunker(dt,now){updateInput();const b=world.bunker;player.x=clamp(player.x+((input.right?1:0)-(input.left?1:0))*280*dt,115,W-115-player.w);player.aimX=0;player.aimY=-1;if(input.jumpQueued){input.jumpQueued=false;player.x=clamp(player.x+(Math.random()>.5?80:-80),115,W-115-player.w);barrierUntil=Math.max(barrierUntil,now+380);sound('jump')}if(input.firing)tryShootBunker();
 b.timer+=dt;if(b.advanceAt&&now>b.advanceAt){b.room++;if(b.room>b.rooms){finishLevel();return}setupBunkerRoom();return}
 for(const e of b.enemies){e.phase+=dt;e.cool-=dt;e.x+=Math.sin(e.phase*1.2)*28*dt;if(e.cool<=0){e.cool=(1.4+Math.random()*.9)/world.level.difficulty;const a=Math.atan2(player.y-e.y,player.x-e.x),sp=170+45*world.level.difficulty;b.shots.push({x:e.x,y:e.y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,r:5})}}
 for(const s of b.shots){s.x+=s.vx*dt;s.y+=s.vy*dt;if(s.owner!=='player'&&Math.hypot(s.x-(player.x+17),s.y-(player.y+24))<18){s.dead=true;killPlayer('bunker_projectile')}}b.shots=b.shots.filter(s=>!s.dead&&s.y<H+50&&s.x>-50&&s.x<W+50);
 if(b.bonus){b.bonus.x+=b.bonus.dir*85*dt;if(b.bonus.x<150||b.bonus.x>810)b.bonus.dir*=-1}}
function tryShootBunker(){const now=performance.now(),w=WEAPONS[weapon]||WEAPONS.P;if(now<nextShotAt||respawnUntil>now)return;nextShotAt=now+1000/w.rate;const b=world.bunker;for(let i=0;i<w.count;i++){const off=w.count===1?0:(i-(w.count-1)/2)*w.spread;b.shots.push({x:player.x+17,y:player.y,vx:Math.sin(off)*w.speed*.55,vy:-Math.cos(off)*w.speed*.55,r:w.size,owner:'player',damage:w.damage,color:w.color})}sound('shoot')}
function bunkerHitTest(){const b=world.bunker;for(const s of b.shots){if(s.owner!=='player')continue;let hit=false;if(b.bonus&&Math.hypot(s.x-b.bonus.x,s.y-b.bonus.y)<24){grantPickup(b.bonus.code);b.bonus=null;s.dead=true;hit=true;score+=250}if(hit)continue;for(const e of b.enemies){if(e.hp>0&&Math.hypot(s.x-e.x,s.y-e.y)<24){e.hp-=s.damage;s.dead=true;hit=true;if(e.hp<=0){score+=120;boom(e.x,e.y,'#ff806e',7)}break}}if(hit)continue;const coreY=b.boss?105:115;if(Math.hypot(s.x-480,s.y-coreY)<(b.boss?75:52)){b.coreHp-=s.damage;s.dead=true;score+=20;if(b.coreHp<=0&&!b.advanceAt){boom(480,coreY,'#ffd34f',30);b.enemies.forEach(e=>e.hp=0);b.advanceAt=performance.now()+900;if(!b.boss)track('bunker_core_complete',{metadata:{room:b.room}})}}}b.shots=b.shots.filter(s=>!s.dead)}

function loop(now){if(state!=='playing')return;const dt=Math.min(.034,Math.max(.001,(now-lastTime)/1000));lastTime=now;updateWorld(dt,now);if(world?.mode==='bunker')bunkerHitTest();draw(now);updateHud();raf=requestAnimationFrame(loop)}

function draw(now){const sx=shake?rand(-shake,shake):0,sy=shake?rand(-shake,shake):0;shake*=.84;ctx.save();ctx.translate(sx,sy);if(world.mode==='bunker')drawBunker(now);else drawStage(now);ctx.restore()}
function theme(){return COLORS[world.level.theme]||COLORS.jungle}
function drawBackground(){const c=theme();ctx.fillStyle=c[0];ctx.fillRect(0,0,W,H);const par=world.mode==='vertical'?cameraY:cameraX;ctx.fillStyle=c[1];for(let i=-1;i<8;i++){const x=((i*190-(world.mode==='vertical'?0:par*.18))%(W+240))-80;const h=100+(i%3)*42;ctx.fillRect(x,H-h,150,h)}ctx.fillStyle=c[2];for(let i=-1;i<10;i++){const x=((i*130-(world.mode==='vertical'?0:par*.32))%(W+170))-50;ctx.fillRect(x,H-80-(i%4)*18,80,100)}if(world.level.theme==='sky'||world.level.theme==='waterfall'){ctx.fillStyle=c[3];ctx.globalAlpha=.22;for(let i=0;i<7;i++)ctx.fillRect(40+i*150,80+(i%3)*55,100,6);ctx.globalAlpha=1}}
function drawStage(now){drawBackground();ctx.save();ctx.translate(-cameraX,-cameraY);drawPlatforms();drawHazards();drawCapsules();drawEnemies();drawBoss();drawBullets();drawRocks();drawPlayer(now);drawExplosions();ctx.restore()}
function drawPlatforms(){const c=theme();for(const p of world.platforms){if(p.type==='ground'){ctx.fillStyle=c[2];ctx.fillRect(p.x,p.y,p.w,p.h);ctx.fillStyle=c[3];ctx.fillRect(p.x,p.y,p.w,7)}else{ctx.fillStyle='#263847';ctx.fillRect(p.x,p.y,p.w,p.h);ctx.fillStyle=c[3];ctx.fillRect(p.x,p.y,p.w,5)}}for(const pit of world.pits){ctx.fillStyle='#020407';ctx.fillRect(pit.x,GROUND,pit.w,H-GROUND+120);ctx.fillStyle='#ff5d77';ctx.globalAlpha=.2;ctx.fillRect(pit.x,GROUND+35,pit.w,5);ctx.globalAlpha=1}}
function drawHazards(){for(const h of world.hazards){if(h.type==='flame'){ctx.fillStyle='#29313b';ctx.fillRect(h.x,GROUND-28,h.w,28);if(h.warning){ctx.fillStyle='#ffd34f';ctx.fillRect(h.x+8,GROUND-38,h.w-16,5)}if(h.active){ctx.fillStyle='#ff6b47';for(let y=GROUND-36;y>GROUND-h.h;y-=16){ctx.beginPath();ctx.moveTo(h.x+h.w/2,y-16);ctx.lineTo(h.x+3,y);ctx.lineTo(h.x+h.w-3,y);ctx.fill()}}}else if(h.type==='press'){ctx.fillStyle='#657384';ctx.fillRect(h.x,0,h.w,h.active?GROUND-65:85);ctx.fillStyle=h.warning?'#ffd34f':'#ff6678';ctx.fillRect(h.x+8,(h.active?GROUND-79:71),h.w-16,8)}}}
function drawCapsules(){for(const c of world.capsules){ctx.fillStyle='#cfe2f1';ctx.fillRect(c.x,c.y,c.w,c.h);ctx.fillStyle='#152334';ctx.fillRect(c.x+5,c.y+5,c.w-10,c.h-10);ctx.fillStyle='#ffd34f';ctx.font='bold 14px monospace';ctx.fillText(c.code,c.x+13,c.y+18)}}
function drawEnemies(){for(const e of world.enemies){const x=e.x,y=e.y;if(e.type==='drone'){ctx.fillStyle='#e86d72';ctx.fillRect(x+5,y+5,26,15);ctx.fillStyle='#ffd34f';ctx.fillRect(x+14,y+9,7,5);ctx.fillStyle='#7f3440';ctx.fillRect(x,y+9,7,5);ctx.fillRect(x+29,y+9,7,5)}else{ctx.fillStyle=e.type==='heavy'?'#a64f59':e.type==='turret'?'#895764':'#d95b63';ctx.fillRect(x+6,y+8,e.w-12,e.h-8);ctx.fillStyle='#f6b65e';ctx.fillRect(x+10,y,e.w-20,14);ctx.fillStyle='#222a35';ctx.fillRect(x+e.w-2,y+15,16,5);if(e.type==='runner'||e.type==='rifle'){ctx.fillRect(x+5,y+e.h-7,8,8);ctx.fillRect(x+e.w-13,y+e.h-7,8,8)}}if(e.maxHp>1){ctx.fillStyle='#111820';ctx.fillRect(x,y-8,e.w,4);ctx.fillStyle='#ff6678';ctx.fillRect(x,y-8,e.w*clamp(e.hp/e.maxHp,0,1),4)}}}
function drawBoss(){const b=world.boss;if(!b)return;ctx.save();if(b.flash>0)ctx.globalAlpha=.5;const x=b.x,y=b.y,w=b.w,h=b.h;ctx.fillStyle='#552a53';ctx.fillRect(x,y,w,h);ctx.fillStyle='#8e496e';ctx.fillRect(x+10,y+12,w-20,h-24);ctx.fillStyle='#20283a';ctx.fillRect(x+22,y+22,w-44,h-44);ctx.fillStyle=b.warning>0?'#fff37b':'#ff5d77';ctx.beginPath();ctx.arc(x+w/2,y+h/2,Math.min(w,h)*.16,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#ffd34f';ctx.lineWidth=4;ctx.strokeRect(x+3,y+3,w-6,h-6);if(b.type==='carrier'){ctx.fillStyle='#6e6aa1';ctx.fillRect(x-45,y+35,45,35);ctx.fillRect(x+w,y+35,45,35)}if(b.type==='walker'||b.type==='titan'||b.type==='final'){ctx.fillStyle='#5a6574';ctx.fillRect(x+10,y+h,22,45);ctx.fillRect(x+w-32,y+h,22,45)}ctx.restore()}
function drawBullets(){for(const b of bullets){if(!b.active)continue;ctx.fillStyle=b.color;ctx.beginPath();ctx.arc(b.x,b.y,b.size,0,Math.PI*2);ctx.fill();if(b.owner==='player'&&b.size>=6){ctx.globalAlpha=.35;ctx.fillRect(b.x-14,b.y-2,28,4);ctx.globalAlpha=1}}}
function drawRocks(){for(const r of world.rocks){ctx.fillStyle='#85909b';ctx.beginPath();ctx.arc(r.x+12,r.y+12,12,0,Math.PI*2);ctx.fill();ctx.fillStyle='#545b65';ctx.fillRect(r.x+5,r.y+6,7,5)}}
function drawPlayer(now){if(respawnUntil>now)return;const inv=performance.now()<barrierUntil;if(inv&&Math.floor(now/80)%2===0)ctx.globalAlpha=.45;const x=player.x,y=player.y+(player.crouch?16:0),h=player.crouch?32:player.h;ctx.fillStyle='#4ce2ac';ctx.fillRect(x+9,y+9,18,h-9);ctx.fillStyle='#bdf6dc';ctx.fillRect(x+10,y,16,14);ctx.fillStyle='#ffb24f';ctx.fillRect(x+14,y+4,10,5);ctx.fillStyle='#1a2630';ctx.fillRect(x+4,y+h-9,9,9);ctx.fillRect(x+22,y+h-9,9,9);ctx.strokeStyle='#d9fff2';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(x+17,y+18);ctx.lineTo(x+17+player.aimX*25,y+18+player.aimY*25);ctx.stroke();if(inv){ctx.strokeStyle='rgba(115,247,192,.75)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x+17,y+h/2,27,0,Math.PI*2);ctx.stroke()}ctx.globalAlpha=1}
function drawExplosions(){for(const p of explosions){ctx.globalAlpha=1-p.age/p.life;ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,p.size,p.size)}ctx.globalAlpha=1}

function drawBunker(now){const c=theme();ctx.fillStyle=c[0];ctx.fillRect(0,0,W,H);ctx.fillStyle=c[1];ctx.fillRect(100,40,760,460);ctx.strokeStyle=c[3];ctx.lineWidth=3;for(let i=0;i<6;i++){ctx.beginPath();ctx.moveTo(100+i*152,500);ctx.lineTo(360+i*48,75);ctx.stroke()}for(let y=110;y<500;y+=70){ctx.globalAlpha=.25;ctx.beginPath();ctx.moveTo(100,y);ctx.lineTo(860,y);ctx.stroke()}ctx.globalAlpha=1;const b=world.bunker;ctx.fillStyle='#111924';ctx.fillRect(370,65,220,110);ctx.strokeStyle='#7e91a7';ctx.strokeRect(370,65,220,110);ctx.fillStyle=b.boss?'#ff5d77':'#ffd34f';ctx.beginPath();ctx.arc(480,b.boss?105:115,b.boss?55:36,0,Math.PI*2);ctx.fill();ctx.fillStyle='#151a23';ctx.beginPath();ctx.arc(480,b.boss?105:115,b.boss?26:16,0,Math.PI*2);ctx.fill();ctx.fillStyle='#0c1219';ctx.fillRect(360,185,240,7);ctx.fillStyle='#73f7c0';ctx.fillRect(360,185,240*clamp(b.coreHp/b.coreMax,0,1),7);for(const e of b.enemies){if(e.hp<=0)continue;ctx.fillStyle='#d75d68';ctx.fillRect(e.x-18,e.y-12,36,24);ctx.fillStyle='#ffcc66';ctx.fillRect(e.x-5,e.y-5,10,8)}if(b.bonus){ctx.fillStyle='#cfe2f1';ctx.fillRect(b.bonus.x-20,b.bonus.y-13,40,26);ctx.fillStyle='#ffd34f';ctx.font='bold 16px monospace';ctx.fillText(b.bonus.code,b.bonus.x-5,b.bonus.y+6)}for(const s of b.shots){ctx.fillStyle=s.owner==='player'?(s.color||'#fff'):'#ff6d78';ctx.beginPath();ctx.arc(s.x,s.y,s.r||5,0,Math.PI*2);ctx.fill()}drawPlayer(now);drawExplosions();ctx.fillStyle='#d7e5f2';ctx.font='bold 16px system-ui';ctx.fillText('КОМНАТА '+b.room+'/'+b.rooms,24,30);if(b.advanceAt){ctx.fillStyle='#73f7c0';ctx.font='bold 24px system-ui';ctx.fillText('ПРОХОД ОТКРЫТ',370,235)}}

function buildMenu(){UI.bestScore.textContent=bestScore.toLocaleString('ru-RU');UI.progressText.textContent='Открыто '+unlocked+' из '+LEVELS.length;UI.levelGrid.innerHTML='';LEVELS.forEach((l,i)=>{const btn=document.createElement('button');btn.className='levelCard '+(i+1>unlocked?'locked ':'')+(i===currentLevelIndex?'current':'');btn.innerHTML='<strong>'+String(l.id).padStart(2,'0')+'</strong><h3>'+l.name+'</h3><span>'+modeLabel(l.mode)+' · '+l.boss+'</span>';if(i+1<=unlocked)btn.onclick=()=>{currentLevelIndex=i;localStorage.setItem('sa_selected_level',String(i));startLevel(i)};UI.levelGrid.appendChild(btn)})}
function modeLabel(m){return m==='horizontal'?'горизонтальный штурм':m==='vertical'?'вертикальный подъём':m==='bunker'?'псевдо-3D бункер':'босс-арена'}

function navCatalog(){const q=location.search||'';location.href='v16-8.html'+q}
$('backCatalog').onclick=navCatalog;$('gameBack').onclick=returnToMenu;$('play').onclick=()=>startLevel(Math.min(currentLevelIndex,unlocked-1));$('modalPrimary').onclick=()=>{UI.modal.classList.add('hidden');modalAction?.()};$('modalMenu').onclick=returnToMenu;$('pauseMenu').onclick=returnToMenu;$('pause').onclick=()=>{if(state!=='playing')return;state='paused';cancelAnimationFrame(raf);UI.pauseModal.classList.remove('hidden');track('pause')};$('resume').onclick=()=>{if(state!=='paused')return;state='playing';UI.pauseModal.classList.add('hidden');lastTime=performance.now();raf=requestAnimationFrame(loop)};
$('share').onclick=()=>{const gameUrl='https://t.me/RetroGamesPlayBot/retrogames?startapp=steel_share';const shareUrl='https://t.me/share/url?url='+encodeURIComponent(gameUrl)+'&text='+encodeURIComponent('Я нашёл ретро-аркаду «Стальной десант» прямо в Telegram 🎮');track('share_click',{level:null});try{window.Telegram?.WebApp?.openTelegramLink(shareUrl)}catch{location.href=shareUrl}};

window.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space','KeyZ','KeyX','KeyK','KeyA','KeyD','KeyW','KeyS'].includes(e.code))e.preventDefault();if((e.code==='Space'||e.code==='KeyZ')&&!keys.has(e.code))input.jumpQueued=true;keys.add(e.code)});
window.addEventListener('keyup',e=>keys.delete(e.code));

const pad=$('pad'),stick=$('stick');let padPointer=null;
function setPad(e){const r=pad.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,dx=e.clientX-cx,dy=e.clientY-cy,max=r.width*.34,len=Math.hypot(dx,dy)||1;if(len>max){dx=dx/len*max;dy=dy/len*max}input.padX=dx/max;input.padY=dy/max;stick.style.transform='translate('+dx+'px,'+dy+'px)'}
pad.addEventListener('pointerdown',e=>{padPointer=e.pointerId;pad.setPointerCapture(e.pointerId);setPad(e)});pad.addEventListener('pointermove',e=>{if(e.pointerId===padPointer)setPad(e)});function releasePad(e){if(e.pointerId!==padPointer)return;padPointer=null;input.padX=input.padY=0;stick.style.transform='translate(0,0)'}pad.addEventListener('pointerup',releasePad);pad.addEventListener('pointercancel',releasePad);
const fire=$('fire'),jump=$('jump');let firePointers=new Set();fire.addEventListener('pointerdown',e=>{e.preventDefault();fire.setPointerCapture(e.pointerId);firePointers.add(e.pointerId);input.fire=true});function fireUp(e){firePointers.delete(e.pointerId);input.fire=firePointers.size>0}fire.addEventListener('pointerup',fireUp);fire.addEventListener('pointercancel',fireUp);jump.addEventListener('pointerdown',e=>{e.preventDefault();input.jumpQueued=true});

try{const tg=window.Telegram?.WebApp;tg?.ready();tg?.expand();tg?.disableVerticalSwipes?.();tg?.setHeaderColor?.('#071019');tg?.setBackgroundColor?.('#071019')}catch{}
buildMenu();drawSplash();
function drawSplash(){ctx.fillStyle='#071019';ctx.fillRect(0,0,W,H);ctx.fillStyle='#73f7c0';ctx.font='900 38px system-ui';ctx.fillText('СТАЛЬНОЙ ДЕСАНТ',285,245);ctx.fillStyle='#8fa2b8';ctx.font='700 16px system-ui';ctx.fillText('RETRO GAMES PLAY · GAME 02',355,280)}
})();
