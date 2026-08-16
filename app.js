'use strict';

// v11: сенсорный джойстик + визуальный апгрейд штаба + 2 повтора текущей миссии.
const v10Pad = document.getElementById('touchpad');
const v10Stick = document.getElementById('stick');
let v10Touch = {active:false,id:null,x:0,y:0,max:42};
let v11RetriesRemaining = 2;
let v11MissionStartScore = 0;

function v10ResetStick(){
  v10Touch.active=false; v10Touch.id=null; v10Touch.x=0; v10Touch.y=0;
  if(v10Stick) v10Stick.style.transform='translate(0px,0px)';
}
function v10UpdateStick(clientX,clientY){
  if(!v10Pad||!v10Stick)return;
  const r=v10Pad.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;
  let dx=clientX-cx,dy=clientY-cy,len=Math.hypot(dx,dy),max=v10Touch.max;
  if(len>max){dx=dx/len*max;dy=dy/len*max}
  v10Stick.style.transform=`translate(${dx}px,${dy}px)`;
  v10Touch.x=dx/max; v10Touch.y=dy/max;
}
function v10ApplyDirection(){
  if(!v10Touch.active)return;
  keys.up=keys.down=keys.left=keys.right=0;
  const x=v10Touch.x,y=v10Touch.y;
  if(Math.abs(x)<.18&&Math.abs(y)<.18)return;
  if(Math.abs(x)>Math.abs(y)) keys[x>0?'right':'left']=1;
  else keys[y>0?'down':'up']=1;
}

if(v10Pad){
  v10Pad.addEventListener('pointerdown',e=>{
    e.preventDefault(); audio(); v10Touch.active=true; v10Touch.id=e.pointerId;
    try{v10Pad.setPointerCapture(e.pointerId)}catch{}
    v10UpdateStick(e.clientX,e.clientY);
  },{passive:false});
  v10Pad.addEventListener('pointermove',e=>{
    if(v10Touch.active&&e.pointerId===v10Touch.id){e.preventDefault();v10UpdateStick(e.clientX,e.clientY)}
  },{passive:false});
  for(const ev of ['pointerup','pointercancel','lostpointercapture']) v10Pad.addEventListener(ev,e=>{
    if(e.pointerId===v10Touch.id){e.preventDefault();keys.up=keys.down=keys.left=keys.right=0;v10ResetStick()}
  },{passive:false});
}

const v9Update=update;
update=function(dt){v10ApplyDirection();return v9Update(dt)};

const v9PauseGame=pauseGame;
pauseGame=function(){v10ResetStick();keys.up=keys.down=keys.left=keys.right=0;return v9PauseGame()};
const v9ShowMenu=showMenu;
showMenu=function(){v10ResetStick();return v9ShowMenu()};
const v9ShowResult=showResult;
showResult=function(opts){v10ResetStick();return v9ShowResult(opts)};

// При полном старте кампании даём по 2 продолжения на текущую миссию.
const v9ResetCampaign=resetCampaign;
resetCampaign=function(){
  v11RetriesRemaining=2;
  v11MissionStartScore=0;
  return v9ResetCampaign();
};

// Перехватываем поражение: первые два раза разрешаем повторить именно текущую миссию.
const v9Finish=finish;
finish=function(win,reason){
  if(win) return v9Finish(win,reason);
  if(!running) return;
  if(v11RetriesRemaining>0){
    sfx('lose');
    showResult({
      badge:'ПОРАЖЕНИЕ',
      title:'Оборона прорвана',
      text:`${reason}. Можно повторить миссию ${levelIndex+1}/${LEVELS.length}.`,
      button:'Повторить миссию',
      mode:'v11retry',
      mini:`Доступно продолжений: ${v11RetriesRemaining}. Миссия начнётся заново с 3 жизнями.`
    });
    return;
  }
  return v9Finish(false,reason);
};

// Кнопка результата: новая миссия сбрасывает лимит попыток, повтор возвращает к началу той же миссии.
$('primaryAction').onclick=()=>{
  if(primaryMode==='next'){
    levelIndex++;
    v11RetriesRemaining=2;
    v11MissionStartScore=score;
    startLevel();
  }else if(primaryMode==='v11retry'){
    v11RetriesRemaining=Math.max(0,v11RetriesRemaining-1);
    score=v11MissionStartScore;
    lives=3;
    rapidUntil=0;
    shieldUntil=0;
    startLevel();
  }else{
    resetCampaign();
  }
};

// Более выразительный штаб: бетонный бункер, амбразуры, антенна и прочность.
drawBase=function(){
  const ratio=Math.max(0,base.hp/base.maxHp),x=base.x,y=base.y;
  const body=ratio>.66?'#c7a84f':ratio>.33?'#b77b43':'#9b5040';
  ctx.save();
  ctx.fillStyle='#0007';ctx.fillRect(x+5,y+6,base.w,base.h);
  ctx.fillStyle='#636d79';ctx.fillRect(x-5,y-7,base.w+10,10);
  ctx.fillStyle='#929ca9';ctx.fillRect(x-2,y-5,base.w+4,3);
  ctx.fillStyle=body;ctx.fillRect(x,y,base.w,base.h);
  ctx.strokeStyle='#e8d48a';ctx.lineWidth=2;ctx.strokeRect(x+1,y+1,base.w-2,base.h-2);
  ctx.fillStyle='#242116';ctx.fillRect(x+19,y+14,18,27);
  ctx.fillStyle='#504b36';ctx.fillRect(x+22,y+17,12,21);
  ctx.fillStyle='#171a1d';ctx.fillRect(x+7,y+17,9,5);ctx.fillRect(x+40,y+17,9,5);
  ctx.fillStyle='#f6c956';ctx.fillRect(x+9,y+18,5,2);ctx.fillRect(x+42,y+18,5,2);
  ctx.strokeStyle='#c6d1dc';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x+46,y);ctx.lineTo(x+46,y-19);ctx.stroke();
  ctx.fillStyle='#ed6a62';ctx.fillRect(x+46,y-19,12,7);
  ctx.fillStyle='#0b0d12';ctx.fillRect(x-2,y-14,base.w+4,6);
  ctx.fillStyle=ratio>.66?'#74e0a1':ratio>.33?'#f2ca4b':'#ed6a62';ctx.fillRect(x,y-13,base.w*ratio,4);
  ctx.restore();
};

function v10FortDecor(){
  if(!base||!base.alive)return;
  const cells=[[380,500],[422,500],[464,500],[380,542],[482,542]];
  ctx.save();
  for(const [x,y] of cells){
    const w=walls.find(q=>Math.abs(q.x-x)<2&&Math.abs(q.y-y)<2);
    if(!w)continue;
    ctx.strokeStyle=w.steel?'#d7e2ec':'#d2b17e';ctx.lineWidth=2;ctx.strokeRect(x+3,y+3,32,32);
    ctx.strokeStyle='#0005';ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(x+3,y+19);ctx.lineTo(x+35,y+19);ctx.stroke();
    ctx.beginPath();ctx.moveTo(x+19,y+3);ctx.lineTo(x+19,y+19);ctx.stroke();
    ctx.fillStyle=w.steel?'#dbe3ea55':'#e0c28b55';ctx.fillRect(x+6,y+6,10,3);
  }
  ctx.fillStyle='#6b7785';ctx.fillRect(base.x-9,base.y-52,base.w+18,5);
  ctx.fillStyle='#9aa5b1';ctx.fillRect(base.x-5,base.y-51,base.w+10,2);
  ctx.restore();
}
const v9Draw=draw;
draw=function(){v9Draw();v10FortDecor()};

const hudLabel=document.querySelector('.hud div:first-child span');
if(hudLabel)hudLabel.textContent='ОЧКИ · v11';

addEventListener('blur',v10ResetStick);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState!=='visible')v10ResetStick()});
