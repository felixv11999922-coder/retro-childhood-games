'use strict';
const $=id=>document.getElementById(id),W=900,H=600,c=$('c'),ctx=c.getContext('2d');
if((navigator.maxTouchPoints||0)>0||matchMedia('(pointer:coarse)').matches)document.body.classList.add('touch');

const LEVELS=[
{name:'Первая линия',mix:['scout','basic','basic','scout','basic','basic','basic','scout'],walls:[[180,140,4],[560,140,4],[330,260,6],[120,390,4],[610,390,4]],steels:[[20,260,38,110],[842,260,38,110]]},
{name:'Каменный коридор',mix:['scout','basic','gunner','basic','scout','gunner','basic','basic','gunner','scout'],walls:[[90,120,5],[600,120,5],[280,225,2],[500,225,2],[190,325,4],[550,325,4],[340,430,3]],steels:[[40,255,38,105],[822,255,38,105],[430,170,38,78]]},
{name:'Последний рубеж',mix:['gunner','heavy','scout','basic','gunner','heavy','basic','gunner','scout','heavy','gunner','basic'],walls:[[120,120,4],[610,120,4],[300,200,2],[500,200,2],[150,300,3],[630,300,3],[300,380,2],[500,380,2]],steels:[[35,230,38,145],[827,230,38,145],[430,245,38,110]]}
];
const TYPES={
 scout:{speed:145,hp:1,fire:[1.1,1.65],score:120,color:'#f39a5b'},
 basic:{speed:105,hp:1,fire:[.85,1.35],score:100,color:'#ed6a62'},
 gunner:{speed:92,hp:2,fire:[.48,.85],score:180,color:'#d76ee8'},
 heavy:{speed:70,hp:3,fire:[.75,1.15],score:300,color:'#6fb2ff'}
};
const START_X=345,START_Y=500,HQ_MAX_HP=3;
let raf=0,last=0,lastFrameWall=performance.now(),running=false,paused=false,score=0,lives=3,levelIndex=0,spawnQueue=[],spawnTimer=0,fireCd=0,rapidUntil=0,shieldUntil=0,hqInvulnUntil=0,player,enemies=[],bullets=[],walls=[],base,keys={},particles=[],pickups=[],kills=0,soundOn=true,audioCtx=null,primaryMode='restart';
const hit=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
const dv=d=>d==='up'?[0,-1]:d==='down'?[0,1]:d==='left'?[-1,0]:[1,0];
const rand=(a,b)=>a+Math.random()*(b-a);

function audio(){if(!soundOn)return null;try{audioCtx ||= new (window.AudioContext||window.webkitAudioContext)();if(audioCtx.state==='suspended')audioCtx.resume();return audioCtx}catch{return null}}
function tone(freq=220,dur=.05,type='square',gain=.035,slide=0){const ac=audio();if(!ac)return;const o=ac.createOscillator(),g=ac.createGain();o.type=type;o.frequency.setValueAtTime(freq,ac.currentTime);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(25,freq+slide),ac.currentTime+dur);g.gain.setValueAtTime(gain,ac.currentTime);g.gain.exponentialRampToValueAtTime(.0001,ac.currentTime+dur);o.connect(g).connect(ac.destination);o.start();o.stop(ac.currentTime+dur)}
function sfx(name){if(name==='shot')tone(220,.045,'square',.025,80);else if(name==='boom'){tone(90,.13,'sawtooth',.045,-55);setTimeout(()=>tone(55,.09,'square',.025,-20),25)}else if(name==='hurt')tone(120,.12,'square',.045,-65);else if(name==='hq')tone(150,.16,'sawtooth',.055,-80);else if(name==='power'){tone(420,.08,'square',.035,260);setTimeout(()=>tone(650,.09,'square',.03,180),70)}else if(name==='win'){tone(520,.11,'square',.035,160);setTimeout(()=>tone(720,.13,'square',.035,180),120)}else if(name==='lose')tone(170,.28,'sawtooth',.04,-110)}
function toast(msg){const el=$('toast');el.textContent=msg;el.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.remove('show'),1300)}

function addWall(x,y,hp=2,steel=0){walls.push({x,y,w:38,h:38,hp:steel?99:hp,steel})}
function addHQFortification(){
  addWall(380,500,3);addWall(422,500,3);addWall(464,500,3);
  addWall(380,542,3);addWall(482,542,3);
  if(levelIndex===2){const l=walls.find(w=>w.x===380&&w.y===542),r=walls.find(w=>w.x===482&&w.y===542);if(l){l.steel=1;l.hp=99}if(r){r.steel=1;r.hp=99}}
}
function mkWalls(){walls=[];const L=LEVELS[levelIndex];for(const [x,y,n] of L.walls)for(let i=0;i<n;i++)addWall(x+i*42,y,2,0);for(const [x,y,w,h] of L.steels)walls.push({x,y,w,h,hp:99,steel:1});addHQFortification()}
function safePlayerSpawn(){player.x=START_X;player.y=START_Y;player.dir='up';for(let tries=0;tries<18;tries++){if(!walls.some(w=>hit(player,w))&&!hit(player,base)&&!enemies.some(e=>e.alive&&hit(player,e)))return;player.x=275+tries*22;player.y=490-(tries%3)*45}}
function resetCampaign(){score=0;lives=3;kills=0;rapidUntil=0;shieldUntil=0;levelIndex=0;startLevel()}
function startLevel(){const L=LEVELS[levelIndex];spawnQueue=[...L.mix];spawnTimer=.12;fireCd=0;enemies=[];bullets=[];particles=[];pickups=[];keys={};hqInvulnUntil=0;base={x:422,y:542,w:56,h:45,alive:1,hp:HQ_MAX_HP,maxHp:HQ_MAX_HP};mkWalls();player={x:START_X,y:START_Y,w:34,h:40,dir:'up',speed:180,alive:1};safePlayerSpawn();stats();last=performance.now();lastFrameWall=last;running=true;paused=false;$('over').classList.add('hidden');$('pauseModal').classList.add('hidden');cancelAnimationFrame(raf);raf=requestAnimationFrame(loop);toast(`Миссия ${levelIndex+1}: ${L.name} · штаб ${base.hp}/${base.maxHp}`)}
function stats(){$('score').textContent=score;$('lives').textContent=lives;$('level').textContent=`${levelIndex+1}/${LEVELS.length}`;$('enemies').textContent=enemies.length+spawnQueue.length;const full='❤'.repeat(Math.max(0,base?.hp||0)),empty='♡'.repeat(Math.max(0,(base?.maxHp||HQ_MAX_HP)-(base?.hp||0)));$('hq').textContent=full+empty}

function move(t,dx,dy){const ox=t.x,oy=t.y;t.x=Math.max(3,Math.min(W-t.w-3,t.x+dx));t.y=Math.max(3,Math.min(H-t.h-3,t.y+dy));const tanks=t===player?enemies:[player,...enemies.filter(e=>e!==t)];if(walls.some(w=>hit(t,w))||hit(t,base)||tanks.some(q=>q.alive&&hit(t,q))){t.x=ox;t.y=oy}}
function shoot(t,owner){const [dx,dy]=dv(t.dir),s=7,rapid=owner==='p'&&performance.now()<rapidUntil,speed=owner==='p'?520:315;bullets.push({x:t.x+t.w/2-s/2+dx*(t.w/2+5),y:t.y+t.h/2-s/2+dy*(t.h/2+5),w:s,h:s,dx,dy,speed,owner,power:rapid?2:1});if(owner==='p')sfx('shot')}
function spawn(){if(!spawnQueue.length)return;const type=spawnQueue.shift(),cfg=TYPES[type],slots=[70,210,420,650,790];let ex=slots[Math.floor(Math.random()*slots.length)],tries=0,e;do{e={x:ex,y:15,w:34,h:40,dir:'down',speed:cfg.speed,turn:rand(.45,1.35),fire:rand(...cfg.fire),alive:1,type,hp:cfg.hp,maxHp:cfg.hp,color:cfg.color,score:cfg.score};ex=slots[Math.floor(Math.random()*slots.length)];tries++}while(tries<8&&(walls.some(w=>hit(e,w))||enemies.some(q=>hit(e,q))));enemies.push(e)}
function explosion(x,y,col='#f6b44b',count=14){for(let i=0;i<count;i++)particles.push({x,y,vx:rand(-150,150),vy:rand(-150,150),life:rand(.2,.55),max:.55,size:rand(3,8),col})}
function maybeDrop(x,y){if(kills%3!==0)return;const types=['rapid','shield','life','repair'],kind=types[Math.floor(Math.random()*types.length)];pickups.push({x:x-12,y:y-12,w:24,h:24,kind,life:11})}
function applyPickup(p){if(p.kind==='rapid'){rapidUntil=performance.now()+9000;toast('⚡ Скорострельность: 9 сек.')}else if(p.kind==='shield'){shieldUntil=performance.now()+9000;toast('🛡 Щит: 9 сек.')}else if(p.kind==='repair'){if(base.hp<base.maxHp){base.hp++;toast(`🔧 Штаб отремонтирован: ${base.hp}/${base.maxHp}`)}else{score+=150;toast('🔧 Штаб цел — +150 очков')}}else{lives=Math.min(5,lives+1);toast('❤ +1 жизнь')}sfx('power');p.dead=1;stats()}
function damagePlayer(){if(performance.now()<shieldUntil){sfx('power');toast('Щит поглотил попадание');return}lives--;explosion(player.x+17,player.y+20,'#74e0a1',18);sfx('hurt');if(lives<=0){player.alive=0;finish(false,'Танк уничтожен')}else{safePlayerSpawn();shieldUntil=performance.now()+1800;toast(`Осталось жизней: ${lives}`)}stats()}
function damageBase(power=1){const now=performance.now();if(now<hqInvulnUntil||!base.alive)return;hqInvulnUntil=now+420;base.hp=Math.max(0,base.hp-Math.max(1,Math.min(power,1)));explosion(base.x+28,base.y+22,base.hp>0?'#f2ca4b':'#ff6b5f',base.hp>0?14:32);sfx(base.hp>0?'hq':'lose');stats();if(base.hp<=0){base.alive=0;finish(false,'Штаб уничтожен')}else{toast(`⚠ Штаб повреждён: ${base.hp}/${base.maxHp}`)}}

function update(dt){if(!player?.alive||!base?.alive||paused)return;const now=performance.now();
  if(keys.up){player.dir='up';move(player,0,-player.speed*dt)}else if(keys.down){player.dir='down';move(player,0,player.speed*dt)}else if(keys.left){player.dir='left';move(player,-player.speed*dt,0)}else if(keys.right){player.dir='right';move(player,player.speed*dt,0)}
  fireCd-=dt;const fireRate=now<rapidUntil?.14:.3;if(keys.fire&&fireCd<=0){shoot(player,'p');fireCd=fireRate}
  spawnTimer-=dt;if(spawnQueue.length&&spawnTimer<=0&&enemies.length<5){spawn();spawnTimer=.78+levelIndex*.08}
  for(const e of enemies){e.turn-=dt;e.fire-=dt;if(e.turn<=0){const dirs=['up','down','left','right'];e.dir=dirs[Math.floor(Math.random()*dirs.length)];if(Math.random()<.42&&e.y<500)e.dir='down';e.turn=rand(.38,1.05)}const [dx,dy]=dv(e.dir);move(e,dx*e.speed*dt,dy*e.speed*dt);if(e.fire<=0){shoot(e,'e');const f=TYPES[e.type].fire;e.fire=rand(f[0],f[1])}}
  for(const b of bullets){b.x+=b.dx*b.speed*dt;b.y+=b.dy*b.speed*dt;
    for(const w of walls)if(!b.dead&&hit(b,w)){b.dead=1;if(!w.steel){w.hp-=b.power;explosion(b.x,b.y,'#b86a4e',5)}}
    if(!b.dead&&hit(b,base)){b.dead=1;damageBase(b.power)}
    if(b.owner==='p'){for(const e of enemies)if(!b.dead&&e.alive&&hit(b,e)){b.dead=1;e.hp-=b.power;explosion(b.x,b.y,e.color,7);if(e.hp<=0){e.alive=0;score+=e.score;kills++;explosion(e.x+17,e.y+20,e.color,20);sfx('boom');maybeDrop(e.x+17,e.y+20)}}}
    else if(!b.dead&&player.alive&&hit(b,player)){b.dead=1;damagePlayer()}
    if(b.x<-10||b.y<-10||b.x>W+10||b.y>H+10)b.dead=1
  }
  for(const p of pickups){p.life-=dt;if(hit(player,p))applyPickup(p);if(p.life<=0)p.dead=1}
  for(const p of particles){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.96;p.vy*=.96}
  walls=walls.filter(w=>w.hp>0);enemies=enemies.filter(e=>e.alive);bullets=bullets.filter(b=>!b.dead);pickups=pickups.filter(p=>!p.dead);particles=particles.filter(p=>p.life>0);
  if(spawnQueue.length===0&&enemies.length===0){score+=500*(levelIndex+1)+base.hp*100;stats();levelClear();return}stats()
}

function tank(t,col){ctx.save();ctx.translate(t.x+t.w/2,t.y+t.h/2);ctx.rotate(t.dir==='up'?0:t.dir==='right'?Math.PI/2:t.dir==='down'?Math.PI:-Math.PI/2);ctx.fillStyle=col;ctx.fillRect(-17,-20,7,40);ctx.fillRect(10,-20,7,40);ctx.fillRect(-10,-14,20,28);ctx.fillStyle='#e7edf7';ctx.fillRect(-4,-10,8,16);ctx.fillRect(-2,-27,4,21);if(t.maxHp>1){ctx.fillStyle='#111';ctx.fillRect(-9,13,18,3);ctx.fillStyle=t.hp/t.maxHp>.5?'#74e0a1':'#f2ca4b';ctx.fillRect(-9,13,18*(t.hp/t.maxHp),3)}ctx.restore()}
function drawBase(){const ratio=base.hp/base.maxHp;ctx.fillStyle=!base.alive?'#50382a':ratio>.66?'#f2ca4b':ratio>.33?'#e89a45':'#df625b';ctx.fillRect(base.x,base.y,base.w,base.h);ctx.fillStyle='#181408';ctx.fillRect(base.x+18,base.y+10,20,25);ctx.strokeStyle='#ffffff55';ctx.lineWidth=2;ctx.strokeRect(base.x+1,base.y+1,base.w-2,base.h-2);ctx.fillStyle='#0d1119';ctx.fillRect(base.x,base.y-8,base.w,5);ctx.fillStyle=ratio>.66?'#74e0a1':ratio>.33?'#f2ca4b':'#ed6a62';ctx.fillRect(base.x,base.y-8,base.w*ratio,5)}
function draw(){ctx.fillStyle='#0a0d12';ctx.fillRect(0,0,W,H);ctx.strokeStyle='#ffffff0b';for(let i=0;i<W;i+=50){ctx.beginPath();ctx.moveTo(i,0);ctx.lineTo(i,H);ctx.stroke()}for(let i=0;i<H;i+=50){ctx.beginPath();ctx.moveTo(0,i);ctx.lineTo(W,i);ctx.stroke()}
  for(const w of walls){ctx.fillStyle=w.steel?'#738092':w.hp>=3?'#a85c44':w.hp===2?'#92513d':'#67382e';ctx.fillRect(w.x,w.y,w.w,w.h);if(!w.steel){ctx.strokeStyle='#c17b60';ctx.strokeRect(w.x+3,w.y+3,w.w-6,w.h-6)}}
  drawBase();
  if(player.alive){if(performance.now()<shieldUntil){ctx.strokeStyle='#79c8ff';ctx.lineWidth=3;ctx.beginPath();ctx.arc(player.x+17,player.y+20,29,0,Math.PI*2);ctx.stroke()}tank(player,'#74e0a1')}
  for(const e of enemies)tank(e,e.color);for(const b of bullets){ctx.fillStyle=b.owner==='p'?'#f2ca4b':'#ff8c7e';ctx.fillRect(b.x,b.y,b.w,b.h)}
  for(const p of pickups){ctx.fillStyle=p.kind==='rapid'?'#f2ca4b':p.kind==='shield'?'#6fb2ff':p.kind==='repair'?'#e89a45':'#74e0a1';ctx.fillRect(p.x,p.y,p.w,p.h);ctx.fillStyle='#111';ctx.font='bold 15px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(p.kind==='rapid'?'⚡':p.kind==='shield'?'◆':p.kind==='repair'?'R':'+',p.x+12,p.y+12)}
  for(const p of particles){ctx.globalAlpha=Math.max(0,p.life/p.max);ctx.fillStyle=p.col;ctx.fillRect(p.x,p.y,p.size,p.size)}ctx.globalAlpha=1
}

function loop(t){if(!running)return;lastFrameWall=performance.now();try{const dt=Math.min(.033,Math.max(0,(t-last)/1000));last=t;update(dt);draw()}catch(err){console.error('game-frame-error',err);last=performance.now()}if(running)raf=requestAnimationFrame(loop)}
function kickLoop(){if(!running||paused)return;cancelAnimationFrame(raf);last=performance.now();lastFrameWall=last;raf=requestAnimationFrame(loop)}
function save(){const a=JSON.parse(localStorage.getItem('retroScores')||'[]');a.push({score,at:new Date().toLocaleString('ru-RU')});a.sort((a,b)=>b.score-a.score);localStorage.setItem('retroScores',JSON.stringify(a.slice(0,10)));renderScores()}
function renderScores(){const a=JSON.parse(localStorage.getItem('retroScores')||'[]');$('scores').innerHTML=a.length?a.map(v=>`<li><strong>${v.score}</strong> очков · ${v.at}</li>`).join(''):'<li>Пока пусто — пройдите первую миссию.</li>'}
function showResult({badge,title,text,button,mode,mini=''}){running=false;paused=false;cancelAnimationFrame(raf);keys={};primaryMode=mode;$('resultBadge').textContent=badge;$('resultTitle').textContent=title;$('resultText').textContent=text;$('primaryAction').textContent=button;$('resultMini').textContent=mini;$('over').classList.remove('hidden')}
function levelClear(){sfx('win');if(levelIndex<LEVELS.length-1){showResult({badge:'МИССИЯ ПРОЙДЕНА',title:LEVELS[levelIndex].name+' — готово!',text:`Счёт: ${score}. Штаб сохранил ${base.hp}/${base.maxHp} прочности. Впереди миссия ${levelIndex+2}: «${LEVELS[levelIndex+1].name}».`,button:'Следующая миссия',mode:'next',mini:'Жизни и очки сохраняются; штаб на следующей миссии ремонтируется полностью.'})}else{save();showResult({badge:'ПОБЕДА',title:'Все рубежи удержаны!',text:`Кампания пройдена. Итоговый результат: ${score} очков.`,button:'Пройти заново',mode:'restart',mini:'Результат сохранён в локальной таблице рекордов.'})}}
function finish(win,reason){if(!running)return;sfx(win?'win':'lose');save();showResult({badge:win?'ПОБЕДА':'ПОРАЖЕНИЕ',title:win?'База удержана!':'Оборона прорвана',text:`${reason}. Результат: ${score} очков.`,button:'Начать заново',mode:'restart',mini:`Дойдена миссия ${levelIndex+1} из ${LEVELS.length}.`})}
function fitGame(){const vv=window.visualViewport;const vw=Math.floor(vv?vv.width:window.innerWidth),vh=Math.floor(vv?vv.height:window.innerHeight),game=$('game'),hud=game.querySelector('.hud'),stage=game.querySelector('.stage');game.style.width=vw+'px';game.style.height=vh+'px';game.style.left=(vv?vv.offsetLeft:0)+'px';game.style.top=(vv?vv.offsetTop:0)+'px';const cs=getComputedStyle(game),py=parseFloat(cs.paddingTop)+parseFloat(cs.paddingBottom),availableH=Math.max(120,vh-hud.getBoundingClientRect().height-py-6);stage.style.height=availableH+'px';const sw=Math.max(120,stage.clientWidth-2),sh=Math.max(120,availableH-2),scale=Math.min(sw/W,sh/H);c.style.width=Math.floor(W*scale)+'px';c.style.height=Math.floor(H*scale)+'px'}
function showGame(){document.documentElement.style.overflow='hidden';document.body.classList.add('playing');$('game').classList.remove('hidden');$('over').classList.add('hidden');$('pauseModal').classList.add('hidden');window.scrollTo(0,0);fitGame();requestAnimationFrame(fitGame);setTimeout(fitGame,120);audio();resetCampaign()}
function showMenu(){running=false;paused=false;cancelAnimationFrame(raf);keys={};document.body.classList.remove('playing');document.documentElement.style.overflow='';$('game').classList.add('hidden');$('over').classList.add('hidden');$('pauseModal').classList.add('hidden');renderScores()}
function pauseGame(){if(!running||paused)return;paused=true;keys={};cancelAnimationFrame(raf);$('pauseModal').classList.remove('hidden')}
function resumeGame(){if(!paused)return;paused=false;$('pauseModal').classList.add('hidden');running=true;kickLoop()}

$('play').onclick=showGame;$('pause').onclick=pauseGame;$('resume').onclick=resumeGame;$('pauseMenu').onclick=showMenu;$('toMenu').onclick=showMenu;$('primaryAction').onclick=()=>{if(primaryMode==='next'){levelIndex++;startLevel()}else{resetCampaign()}};
$('sound').onclick=()=>{soundOn=!soundOn;$('sound').textContent=soundOn?'🔊':'🔇';if(soundOn)sfx('power')};
$('share').onclick=async()=>{const d={title:'Игры нашего детства',text:'Попробуй «Танковую базу» — штаб теперь выдерживает несколько попаданий',url:location.href};try{if(navigator.share)await navigator.share(d);else await navigator.clipboard.writeText(location.href)}catch{}};
const km={ArrowUp:'up',w:'up',W:'up',ArrowDown:'down',s:'down',S:'down',ArrowLeft:'left',a:'left',A:'left',ArrowRight:'right',d:'right',D:'right',' ':'fire'};
addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();paused?resumeGame():pauseGame();return}if(km[e.key]){e.preventDefault();keys[km[e.key]]=1}},{passive:false});
addEventListener('keyup',e=>{if(km[e.key]){e.preventDefault();keys[km[e.key]]=0}},{passive:false});
for(const b of document.querySelectorAll('[data-k]')){const k=b.dataset.k,down=e=>{e.preventDefault();audio();keys[k]=1;b.dataset.pressed='1';try{if(e.pointerId!=null)b.setPointerCapture(e.pointerId)}catch{}},up=e=>{e.preventDefault();keys[k]=0;delete b.dataset.pressed;try{if(e.pointerId!=null&&b.hasPointerCapture(e.pointerId))b.releasePointerCapture(e.pointerId)}catch{}};b.addEventListener('pointerdown',down,{passive:false});b.addEventListener('pointerup',up,{passive:false});b.addEventListener('pointercancel',up,{passive:false});b.addEventListener('lostpointercapture',up,{passive:false});b.addEventListener('contextmenu',e=>e.preventDefault())}
addEventListener('blur',()=>keys={});document.addEventListener('visibilitychange',()=>{keys={};if(document.visibilityState==='visible'&&running&&!paused)kickLoop()});addEventListener('pageshow',()=>{if(running&&!paused)kickLoop()});addEventListener('focus',()=>{if(running&&!paused)kickLoop()});setInterval(()=>{if(running&&!paused&&document.visibilityState==='visible'&&performance.now()-lastFrameWall>1200)kickLoop()},700);addEventListener('resize',()=>{if(document.body.classList.contains('playing'))fitGame()});addEventListener('orientationchange',()=>setTimeout(()=>{if(document.body.classList.contains('playing'))fitGame()},180));if(window.visualViewport){visualViewport.addEventListener('resize',()=>{if(document.body.classList.contains('playing'))fitGame()});visualViewport.addEventListener('scroll',()=>{if(document.body.classList.contains('playing'))fitGame()})}
renderScores();
