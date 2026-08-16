'use strict';

// v12: стабильный iPad layout + красивый разрушаемый штаб + сенсорный джойстик + 2 повтора миссии.
const v12Pad=document.getElementById('touchpad');
const v12Stick=document.getElementById('stick');
let v12Touch={active:false,id:null,x:0,y:0,max:42};
let v12Retries=2;
let v12MissionStartScore=0;
let v12RefitTimer=0;

function v12ResetStick(){
  v12Touch.active=false;v12Touch.id=null;v12Touch.x=0;v12Touch.y=0;
  if(v12Stick)v12Stick.style.transform='translate(0px,0px)';
}
function v12UpdateStick(clientX,clientY){
  if(!v12Pad||!v12Stick)return;
  const r=v12Pad.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;
  let dx=clientX-cx,dy=clientY-cy,len=Math.hypot(dx,dy),max=v12Touch.max;
  if(len>max){dx=dx/len*max;dy=dy/len*max}
  v12Stick.style.transform=`translate(${dx}px,${dy}px)`;
  v12Touch.x=dx/max;v12Touch.y=dy/max;
}
function v12ApplyDirection(){
  if(!v12Touch.active)return;
  keys.up=keys.down=keys.left=keys.right=0;
  const x=v12Touch.x,y=v12Touch.y;
  if(Math.abs(x)<.18&&Math.abs(y)<.18)return;
  if(Math.abs(x)>Math.abs(y))keys[x>0?'right':'left']=1;
  else keys[y>0?'down':'up']=1;
}
if(v12Pad){
  v12Pad.addEventListener('pointerdown',e=>{e.preventDefault();audio();v12Touch.active=true;v12Touch.id=e.pointerId;try{v12Pad.setPointerCapture(e.pointerId)}catch{}v12UpdateStick(e.clientX,e.clientY)},{passive:false});
  v12Pad.addEventListener('pointermove',e=>{if(v12Touch.active&&e.pointerId===v12Touch.id){e.preventDefault();v12UpdateStick(e.clientX,e.clientY)}},{passive:false});
  for(const ev of ['pointerup','pointercancel','lostpointercapture'])v12Pad.addEventListener(ev,e=>{if(e.pointerId===v12Touch.id){e.preventDefault();keys.up=keys.down=keys.left=keys.right=0;v12ResetStick()}},{passive:false});
}

// Не доверяем visualViewport.width: на iPad Safari он иногда кратковременно становится узким,
// из-за чего всё поле уезжало влево и оставалась одна кнопка ОГОНЬ.
function v12Refit(){
  const game=$('game');
  if(!game||game.classList.contains('hidden')||!document.body.classList.contains('playing'))return;
  const doc=document.documentElement;
  const vw=Math.max(window.innerWidth||0,doc.clientWidth||0,900);
  const vh=Math.max(window.innerHeight||0,doc.clientHeight||0,420);
  game.style.left='0px';game.style.top='0px';game.style.right='auto';game.style.bottom='auto';
  game.style.width=vw+'px';game.style.height=vh+'px';
  const hud=game.querySelector('.hud'),stage=game.querySelector('.stage');
  if(!hud||!stage)return;
  const cs=getComputedStyle(game),py=parseFloat(cs.paddingTop||0)+parseFloat(cs.paddingBottom||0);
  const availableH=Math.max(150,vh-hud.getBoundingClientRect().height-py-7);
  const availableW=Math.max(240,vw-16);
  stage.style.width=availableW+'px';stage.style.maxWidth='100%';stage.style.height=availableH+'px';stage.style.minWidth='0';
  const scale=Math.min(availableW/W,availableH/H);
  c.style.position='absolute';c.style.left='50%';c.style.top='50%';c.style.transform='translate(-50%,-50%)';
  c.style.width=Math.floor(W*scale)+'px';c.style.height=Math.floor(H*scale)+'px';
}
function v12RefitBurst(){
  clearTimeout(v12RefitTimer);v12Refit();requestAnimationFrame(v12Refit);
  setTimeout(v12Refit,60);setTimeout(v12Refit,160);v12RefitTimer=setTimeout(v12Refit,360);
}

const v12CoreUpdate=update;
update=function(dt){v12ApplyDirection();return v12CoreUpdate(dt)};

// На всех трёх миссиях защита штаба разрушаемая. Никакой стали по бокам на 3-й миссии.
addHQFortification=function(){
  addWall(380,500,3,0);addWall(422,500,3,0);addWall(464,500,3,0);
  addWall(380,542,3,0);addWall(482,542,3,0);
};

const v12CoreReset=resetCampaign;
resetCampaign=function(){v12Retries=2;v12MissionStartScore=0;const out=v12CoreReset();v12RefitBurst();return out};

const v12CoreFinish=finish;
finish=function(win,reason){
  if(win)return v12CoreFinish(win,reason);
  if(!running)return;
  if(v12Retries>0){
    sfx('lose');
    showResult({badge:'ПОРАЖЕНИЕ',title:'Оборона прорвана',text:`${reason}. Можно повторить миссию ${levelIndex+1}/${LEVELS.length}.`,button:'Повторить миссию',mode:'v12retry',mini:`Доступно продолжений: ${v12Retries}. Миссия начнётся заново с 3 жизнями.`});
    return;
  }
  return v12CoreFinish(false,reason);
};

$('primaryAction').onclick=()=>{
  if(primaryMode==='next'){
    levelIndex++;v12Retries=2;v12MissionStartScore=score;startLevel();
  }else if(primaryMode==='v12retry'){
    v12Retries=Math.max(0,v12Retries-1);score=v12MissionStartScore;lives=3;rapidUntil=0;shieldUntil=0;startLevel();
  }else resetCampaign();
  v12RefitBurst();
};

// Сам штаб — компактный бетонный бункер без надписи HQ.
drawBase=function(){
  const ratio=Math.max(0,base.hp/base.maxHp),x=base.x,y=base.y;
  const body=ratio>.66?'#c8aa55':ratio>.33?'#b77b43':'#985143';
  ctx.save();
  ctx.fillStyle='#0008';ctx.fillRect(x+5,y+6,base.w,base.h);
  ctx.fillStyle='#5f6976';ctx.fillRect(x-5,y-7,base.w+10,10);
  ctx.fillStyle='#9ba6b2';ctx.fillRect(x-2,y-5,base.w+4,3);
  ctx.fillStyle=body;ctx.fillRect(x,y,base.w,base.h);
  ctx.strokeStyle='#ead58e';ctx.lineWidth=2;ctx.strokeRect(x+1,y+1,base.w-2,base.h-2);
  ctx.fillStyle='#252117';ctx.fillRect(x+19,y+14,18,27);
  ctx.fillStyle='#504936';ctx.fillRect(x+22,y+17,12,21);
  ctx.fillStyle='#15191d';ctx.fillRect(x+7,y+17,9,5);ctx.fillRect(x+40,y+17,9,5);
  ctx.fillStyle='#f6c956';ctx.fillRect(x+9,y+18,5,2);ctx.fillRect(x+42,y+18,5,2);
  ctx.strokeStyle='#c6d1dc';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x+46,y);ctx.lineTo(x+46,y-19);ctx.stroke();
  ctx.fillStyle='#ed6a62';ctx.fillRect(x+46,y-19,12,7);
  ctx.fillStyle='#0b0d12';ctx.fillRect(x-2,y-14,base.w+4,6);
  ctx.fillStyle=ratio>.66?'#74e0a1':ratio>.33?'#f2ca4b':'#ed6a62';ctx.fillRect(x,y-13,base.w*ratio,4);
  ctx.restore();
};

// Декор фортификаций: кирпично-бетонные секции с видимым износом, но они остаются обычными стенами.
function v12FortDecor(){
  if(!base||!base.alive)return;
  const cells=[[380,500],[422,500],[464,500],[380,542],[482,542]];
  ctx.save();
  for(const [x,y] of cells){
    const w=walls.find(q=>Math.abs(q.x-x)<2&&Math.abs(q.y-y)<2);
    if(!w)continue;
    const fill=w.hp>=3?'#ad8a60':w.hp===2?'#936f50':'#6e4f3d';
    ctx.fillStyle=fill;ctx.fillRect(x+2,y+2,34,34);
    ctx.strokeStyle='#d8bd8c';ctx.lineWidth=2;ctx.strokeRect(x+3,y+3,32,32);
    ctx.strokeStyle='#4b382c';ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(x+3,y+18);ctx.lineTo(x+35,y+18);ctx.stroke();
    ctx.beginPath();ctx.moveTo(x+19,y+3);ctx.lineTo(x+19,y+18);ctx.stroke();
    ctx.beginPath();ctx.moveTo(x+11,y+18);ctx.lineTo(x+11,y+35);ctx.stroke();
    ctx.beginPath();ctx.moveTo(x+27,y+18);ctx.lineTo(x+27,y+35);ctx.stroke();
    ctx.fillStyle='#f1d6a255';ctx.fillRect(x+6,y+6,10,3);
    if(w.hp===1){ctx.strokeStyle='#2c1f1a';ctx.beginPath();ctx.moveTo(x+7,y+8);ctx.lineTo(x+18,y+20);ctx.lineTo(x+13,y+31);ctx.stroke()}
  }
  ctx.fillStyle='#626e7a';ctx.fillRect(base.x-9,base.y-52,base.w+18,5);
  ctx.fillStyle='#a3adb7';ctx.fillRect(base.x-5,base.y-51,base.w+10,2);
  ctx.restore();
}
const v12CoreDraw=draw;
draw=function(){v12CoreDraw();v12FortDecor()};

const hudLabel=document.querySelector('.hud div:first-child span');if(hudLabel)hudLabel.textContent='ОЧКИ · v12';
const movementLabel=document.querySelector('.touchpadLabel');if(movementLabel)movementLabel.remove();
const touchHint=document.querySelector('.touchHint');if(touchHint)touchHint.remove();

for(const id of ['play','pause','resume','primaryAction']){const el=$(id);if(el)el.addEventListener('click',()=>setTimeout(v12RefitBurst,0))}
addEventListener('blur',()=>{v12ResetStick();v12RefitBurst()});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState!=='visible')v12ResetStick();else v12RefitBurst()});
addEventListener('focus',v12RefitBurst);addEventListener('pageshow',v12RefitBurst);addEventListener('resize',v12RefitBurst);addEventListener('orientationchange',()=>setTimeout(v12RefitBurst,100));
if(window.visualViewport){visualViewport.addEventListener('resize',v12RefitBurst);visualViewport.addEventListener('scroll',v12RefitBurst)}
setInterval(()=>{if(document.body.classList.contains('playing'))v12Refit()},700);
requestAnimationFrame(v12RefitBurst);
