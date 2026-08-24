'use strict';
(function(){
  if (window.__STEEL_ASSAULT_V8__) return;
  window.__STEEL_ASSAULT_V8__ = true;

  const $ = id => document.getElementById(id);
  const canvas = $('gameCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d', { alpha:false });

  const UI = {
    menu:$('menu'), game:$('game'), score:$('score'), level:$('level'), lives:$('lives'), weapon:$('weapon'),
    bossHud:$('bossHud'), bossHp:$('bossHp'), toast:$('toast'), modal:$('modal'), modalTitle:$('modalTitle'),
    modalText:$('modalText'), modalPrimary:$('modalPrimary'), pauseModal:$('pauseModal'), grid:$('levelGrid'),
    progress:$('progressText'), best:$('bestScore'), pad:$('pad'), stick:$('stick')
  };

  let objective = document.getElementById('missionObjectiveV8');
  if (!objective) {
    objective = document.createElement('div');
    objective.id = 'missionObjectiveV8';
    objective.className = 'missionObjective';
    document.querySelector('.canvasWrap')?.appendChild(objective);
  }

  const LEVELS = [
    ['Штурм аванпоста','ЗАЧИСТИТЬ АВАНПОСТ','coast',3200],
    ['Речной перевал','УДЕРЖАТЬ ПЕРЕПРАВУ','river',3420],
    ['Цитадель водопада','ВЗЯТЬ ЦИТАДЕЛЬ','waterfall',3650],
    ['Каньон B-17','ПРОРВАТЬ КАНЬОН B-17','canyon',3880],
    ['Бункер-7','ЗАЧИСТИТЬ БУНКЕР-7','ruins',4100],
    ['Ледяной фронт','ПРОЙТИ ЛЕДЯНОЙ ФРОНТ','snow',4300],
    ['Завод прессов','ОСТАНОВИТЬ ПРЕССЫ','factory',4480],
    ['Небесный мост','ПЕРЕЙТИ НЕБЕСНЫЙ МОСТ','city',4620],
    ['Башня связи','ЗАХВАТИТЬ БАШНЮ СВЯЗИ','radio',4760],
    ['Реакторный коридор','ОТКЛЮЧИТЬ РЕАКТОР','reactor',4920],
    ['Живая матрица','УНИЧТОЖИТЬ МАТРИЦУ','swamp',5100],
    ['Последний протокол','ПОСЛЕДНИЙ ПРОТОКОЛ','final',5400]
  ].map((v,i)=>({id:i+1,name:v[0],objective:v[1],theme:v[2],length:v[3]}));

  const THEMES = {
    coast:['#efb36e','#789dad','#0f5364','#081722'], river:['#a9c7b5','#4e8176','#18534f','#081b1b'],
    waterfall:['#b6d5dc','#5b8e9b','#235464','#0b1c28'], canyon:['#dcad79','#a56249','#66382f','#1b1217'],
    ruins:['#a58a7c','#625156','#373039','#12141a'], snow:['#d1e2ed','#7ea2b9','#425f77','#101a26'],
    factory:['#866a70','#3a3741','#202630','#080d13'], city:['#6d4b93','#293e68','#152a49','#070b13'],
    radio:['#dda36e','#7c4c42','#493337','#131318'], reactor:['#718c80','#314a43','#173329','#07110f'],
    swamp:['#87a878','#386244','#183c26','#06140d'], final:['#a35f58','#4a2d37','#271825','#09090e']
  };

  const actorSrc = {
    hero: window.SteelAssaultHeroV6 || window.SteelAssaultPhotoActors?.hero,
    enemy: window.SteelAssaultPhotoActors?.enemy,
    heavy: window.SteelAssaultPhotoActors?.heavy || window.SteelAssaultPhotoActors?.enemy,
    drone: window.SteelAssaultPhotoActors?.drone,
    turret: window.SteelAssaultPhotoActors?.turret
  };
  const IMG = {};
  Object.entries(actorSrc).forEach(([k,src])=>{
    if (!src) return;
    const im = new Image(); im.decoding='async'; im.src=src; IMG[k]=im;
  });

  const save = {
    get unlocked(){ return Math.max(1, +localStorage.getItem('sa_unlocked') || 1); },
    set unlocked(v){ localStorage.setItem('sa_unlocked', String(Math.max(1,Math.min(12,v)))); },
    get best(){ return +localStorage.getItem('sa_best_score') || 0; },
    set best(v){ localStorage.setItem('sa_best_score', String(Math.max(0,Math.floor(v)))); }
  };

  const V = { w:900, h:900, dpr:1 };
  const input = { moveX:0, aimX:1, aimY:0, fire:false, keys:new Set() };
  const S = {
    mode:'menu', paused:false, i:0, score:0, lives:4, cam:0, t:0, toast:0, last:0,
    p:null, enemies:[], bullets:[], shots:[], particles:[], platforms:[], props:[], boss:null,
    bossSpawned:false, objectiveComplete:false, finishX:0, levelDeaths:0
  };

  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const lerp=(a,b,t)=>a+(b-a)*t;
  const rnd=(a,b)=>a+Math.random()*(b-a);
  const track=(name,metadata={})=>{ try{ window.saTrack?.(name,{level:S.i+1,metadata}); }catch(_){} };
  const meta=()=>LEVELS[S.i];
  const groundBase=()=>V.h*0.77;

  function resize(){
    const r = canvas.getBoundingClientRect();
    if (!r.width || !r.height) return;
    V.w = Math.max(320, r.width); V.h = Math.max(320, r.height); V.dpr = Math.min(2, window.devicePixelRatio || 1);
    const pw = Math.round(V.w*V.dpr), ph = Math.round(V.h*V.dpr);
    if (canvas.width!==pw || canvas.height!==ph){ canvas.width=pw; canvas.height=ph; }
    ctx.setTransform(V.dpr,0,0,V.dpr,0,0);
    ctx.imageSmoothingEnabled = true;
    if (S.p) rescaleActors();
  }

  function actorSize(type){
    const h = clamp(V.h*(type==='hero'?0.19:type==='heavy'?0.20:type==='enemy'?0.17:type==='drone'?0.075:0.085),
      type==='hero'?108:type==='heavy'?116:type==='enemy'?96:type==='drone'?52:56,
      type==='hero'?176:type==='heavy'?190:type==='enemy'?158:type==='drone'?86:92);
    const ratio = type==='drone'?1.42:type==='turret'?1.38:type==='hero'?0.70:type==='heavy'?0.76:0.68;
    return {h,w:h*ratio};
  }

  function rescaleActors(){
    if (S.p){ const oldFoot=S.p.y+S.p.h; Object.assign(S.p,actorSize('hero')); S.p.y=oldFoot-S.p.h; }
    for (const e of S.enemies){ const foot=e.y+e.h; Object.assign(e,actorSize(e.type)); if(e.type!=='drone')e.y=foot-e.h; }
    if (S.boss){ const foot=S.boss.y+S.boss.h; S.boss.h=clamp(V.h*.28,170,260);S.boss.w=S.boss.h*.78;S.boss.y=foot-S.boss.h; }
  }

  function groundY(x){
    let y=groundBase();
    const t=meta().theme;
    if(t==='canyon') y += Math.sin(x*.006)*10;
    if(t==='snow') y += Math.sin(x*.004)*7;
    if(t==='swamp') y += Math.sin(x*.009)*6;
    return y;
  }

  function player(){
    const z=actorSize('hero');
    return {type:'hero',x:110,y:groundY(110)-z.h,w:z.w,h:z.h,vx:0,vy:0,dir:1,onGround:true,fireCd:0,inv:0,runT:0,checkpoint:110};
  }

  function enemy(type,x){
    const z=actorSize(type);
    const hp = type==='heavy'?5:type==='drone'?3:type==='turret'?4:2;
    const e={type,x,y:0,w:z.w,h:z.h,hp,maxHp:hp,dir:-1,fireCd:rnd(.7,1.8),phase:rnd(0,6.28),anchor:x,patrol:rnd(45,105),dead:false};
    e.y = type==='drone' ? rnd(V.h*.28,V.h*.48) : groundY(x)-e.h;
    return e;
  }

  function boss(){
    const h=clamp(V.h*.28,170,260);
    return {type:'boss',x:meta().length-470,y:groundY(meta().length-470)-h,w:h*.78,h,hp:18+S.i*2,maxHp:18+S.i*2,fireCd:.8,phase:0,dir:-1,dead:false};
  }

  function buildPlatforms(){
    const p=[]; let n=0;
    for(let x=700;x<meta().length-650;x+=560,n++){
      const high=n%3===1;
      p.push({x:x+80,y:groundY(x)-(high?V.h*.18:V.h*.115),w:clamp(V.w*.20,150,240),h:18});
      if([2,5,6,8,9,10].includes(S.i) && n%2===0) p.push({x:x+330,y:groundY(x)-V.h*.26,w:clamp(V.w*.14,110,180),h:16});
    }
    return p;
  }

  function buildProps(){
    const out=[];
    for(let x=440,n=0;x<meta().length;x+=520,n++){
      out.push({type:n%3===0?'crate':n%3===1?'barrier':'lamp',x:x+rnd(-45,45),seed:rnd(0,99)});
    }
    return out;
  }

  function buildEnemies(){
    const list=[];
    const difficulty=S.i;
    const spacing=Math.max(340,520-difficulty*11);
    let n=0;
    for(let x=620;x<meta().length-780;x+=spacing,n++){
      let type='enemy';
      if(difficulty>=2 && n%5===3) type='drone';
      else if(difficulty>=4 && n%6===4) type='heavy';
      else if(difficulty>=3 && n%7===5) type='turret';
      list.push(enemy(type,x+rnd(-60,65)));
      if(difficulty>=7 && n%4===2) list.push(enemy('enemy',x+rnd(90,180)));
    }
    return list;
  }

  function initWorld(){
    resize();
    S.cam=0;S.p=player();S.bullets=[];S.shots=[];S.particles=[];S.platforms=buildPlatforms();S.props=buildProps();S.enemies=buildEnemies();S.boss=null;S.bossSpawned=false;S.objectiveComplete=false;S.finishX=meta().length-120;S.levelDeaths=0;
    updateHud(); updateObjective();
  }

  function updateObjective(){
    objective.innerHTML=`<b>МИССИЯ ${String(S.i+1).padStart(2,'0')}</b>${meta().objective}`;
  }

  function buildMenu(){
    UI.grid.innerHTML='';
    LEVELS.forEach((m,i)=>{
      const c=document.createElement('div');c.className='levelCard';
      const ok=i<save.unlocked;
      c.innerHTML=`<strong>Миссия ${String(i+1).padStart(2,'0')}</strong><span>${m.name}</span><button ${ok?'':'disabled'}>${ok?'Играть':'Закрыто'}</button>`;
      if(ok)c.querySelector('button').onclick=()=>start(i);
      UI.grid.appendChild(c);
    });
    UI.progress.textContent=`Открыто: ${save.unlocked}/12`;
    UI.best.textContent=save.best.toLocaleString('ru-RU');
  }

  function updateHud(){
    UI.score.textContent=S.score.toLocaleString('ru-RU');
    UI.level.textContent=`${S.i+1}/12`;UI.lives.textContent=S.lives;UI.weapon.textContent='PULSE';
    if(S.boss){UI.bossHud.classList.remove('hidden');UI.bossHp.style.width=`${Math.max(0,S.boss.hp/S.boss.maxHp*100)}%`;}
    else UI.bossHud.classList.add('hidden');
  }

  function showToast(text,time=1.6){UI.toast.textContent=text;UI.toast.classList.add('show');S.toast=time;}
  function hideToast(){UI.toast.classList.remove('show');}

  function start(i){
    S.i=clamp(i,0,11);S.score=0;S.lives=4;S.mode='play';S.paused=false;
    UI.menu.classList.add('hidden');UI.game.classList.remove('hidden');
    requestAnimationFrame(()=>{resize();initWorld();track('game_start',{mission:S.i+1});track('mission_start',{mission:S.i+1});});
  }

  function backMenu(){
    S.mode='menu';S.paused=false;UI.game.classList.add('hidden');UI.menu.classList.remove('hidden');UI.modal.classList.add('hidden');UI.pauseModal.classList.add('hidden');
    buildMenu();
    try{ if(new URLSearchParams(location.search).get('embedded')==='1') parent.postMessage({type:'rgp-close-steel'},location.origin); }catch(_){}
  }

  function showModal(title,text,primary,onPrimary){
    UI.modalTitle.textContent=title;UI.modalText.textContent=text;UI.modalPrimary.textContent=primary;UI.modal.classList.remove('hidden');
    UI.modalPrimary.onclick=()=>{UI.modal.classList.add('hidden');onPrimary?.();};
  }

  function loseLife(){
    if(!S.p || S.p.inv>0 || S.mode!=='play')return;
    S.lives--;S.levelDeaths++;S.p.inv=1.35;track('player_death',{mission:S.i+1,x:Math.round(S.p.x)});updateHud();showToast(`Жизнь потеряна · осталось ${Math.max(0,S.lives)}`);
    if(S.lives<=0){
      S.mode='ended';save.best=Math.max(save.best,S.score);
      showModal('Миссия провалена',`Ты дошёл до ${Math.round(S.p.x/meta().length*100)}% миссии. Попробуй ещё раз.`,'Переиграть',()=>{S.lives=4;S.score=0;S.mode='play';initWorld();});
    } else {
      S.p.x=Math.max(90,S.p.checkpoint);S.p.y=groundY(S.p.x)-S.p.h;S.p.vy=0;S.cam=Math.max(0,S.p.x-V.w*.3);
    }
  }

  function complete(){
    if(S.mode!=='play')return;
    S.mode='ended';S.score+=800+S.i*120;save.best=Math.max(save.best,S.score);save.unlocked=Math.max(save.unlocked,Math.min(12,S.i+2));
    track('mission_complete',{mission:S.i+1,score:S.score,deaths:S.levelDeaths});updateHud();
    const next=S.i<11;
    showModal(`Миссия ${String(S.i+1).padStart(2,'0')} пройдена`,`«${meta().name}» завершена. Счёт: ${S.score.toLocaleString('ru-RU')}.`,next?'Следующая миссия':'В меню',()=>{
      if(next){S.i++;S.lives=4;S.mode='play';initWorld();track('mission_start',{mission:S.i+1});}else backMenu();
    });
  }

  function jump(){if(S.mode==='play'&&!S.paused&&S.p?.onGround){S.p.vy=-clamp(V.h*1.05,620,900);S.p.onGround=false;}}
  function fire(){
    const p=S.p;if(!p||p.fireCd>0||S.mode!=='play'||S.paused)return;
    p.fireCd=.14;
    let ax=input.aimX,ay=input.aimY;if(Math.hypot(ax,ay)<.25){ax=p.dir;ay=0;}const l=Math.hypot(ax,ay)||1;ax/=l;ay/=l;
    const speed=clamp(V.w*1.45,760,1200);
    S.bullets.push({x:p.x+p.w*.60+(p.dir>0?p.w*.26:-p.w*.26),y:p.y+p.h*.46,vx:ax*speed,vy:ay*speed,r:4,life:1.35});
    for(let k=0;k<3;k++)S.particles.push({x:p.x+p.w*.62,y:p.y+p.h*.46,vx:ax*rnd(35,110),vy:ay*rnd(35,110)+rnd(-35,35),life:.16,c:'#ffd66d'});
  }

  function rectActor(a,shrink=.18){return{x:a.x+a.w*shrink,y:a.y+a.h*.12,w:a.w*(1-shrink*2),h:a.h*.80};}
  function overlaps(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;}
  function bulletHit(b,a){const r=rectActor(a,a.type==='drone'?.12:.20);return b.x>r.x&&b.x<r.x+r.w&&b.y>r.y&&b.y<r.y+r.h;}

  function enemyFire(e){
    const p=S.p;if(!p)return;const sx=e.x+e.w*.5,sy=e.y+e.h*.45,tx=p.x+p.w*.5,ty=p.y+p.h*.45;let dx=tx-sx,dy=ty-sy;const l=Math.hypot(dx,dy)||1;dx/=l;dy/=l;
    const speed=clamp(V.w*.48,260,430)+(S.i*8);
    S.shots.push({x:sx,y:sy,vx:dx*speed,vy:dy*speed,r:e.type==='heavy'?6:4,life:3});
  }

  function update(dt){
    if(S.mode!=='play'||S.paused||!S.p)return;
    S.t+=dt;if(S.toast>0){S.toast-=dt;if(S.toast<=0)hideToast();}
    const p=S.p;p.fireCd=Math.max(0,p.fireCd-dt);p.inv=Math.max(0,p.inv-dt);

    const runSpeed=clamp(V.w*.34,230,360);
    p.vx=lerp(p.vx,input.moveX*runSpeed,Math.min(1,dt*12));
    p.x+=p.vx*dt;if(Math.abs(input.moveX)>.1){p.dir=Math.sign(input.moveX);p.runT+=dt;}
    p.vy+=clamp(V.h*2.25,1400,2200)*dt;p.y+=p.vy*dt;

    const gy=groundY(p.x)-p.h;p.onGround=false;
    if(p.y>=gy){p.y=gy;p.vy=0;p.onGround=true;}
    if(p.vy>=0){
      const prevBottom=p.y+p.h-p.vy*dt, nowBottom=p.y+p.h;
      for(const pl of S.platforms){if(p.x+p.w*.72<pl.x||p.x+p.w*.28>pl.x+pl.w)continue;if(prevBottom<=pl.y+5&&nowBottom>=pl.y){p.y=pl.y-p.h;p.vy=0;p.onGround=true;break;}}
    }
    p.x=clamp(p.x,30,meta().length-55);
    if(p.x>p.checkpoint+620)p.checkpoint=p.x-120;
    if(input.fire)fire();

    const desired=clamp(p.x-V.w*.30,0,Math.max(0,meta().length-V.w));S.cam=lerp(S.cam,desired,Math.min(1,dt*5.2));

    for(const b of S.bullets){b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;}
    for(const b of S.shots){b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;}
    for(const q of S.particles){q.x+=q.vx*dt;q.y+=q.vy*dt;q.vy+=180*dt;q.life-=dt;}

    for(const e of S.enemies){
      if(e.dead)continue;e.fireCd-=dt;
      if(e.type==='drone'){
        e.x=e.anchor+Math.sin(S.t*.7+e.phase)*80;e.y=V.h*.34+Math.sin(S.t*1.6+e.phase)*V.h*.06;
      } else if(e.type==='turret') e.y=groundY(e.x)-e.h;
      else {e.x=e.anchor+Math.sin(S.t*.55+e.phase)*e.patrol;e.y=groundY(e.x)-e.h;}
      e.dir=p.x<e.x?-1:1;
      const range=e.type==='drone'?V.w*.85:e.type==='turret'?V.w*.75:V.w*.62;
      if(Math.abs(p.x-e.x)<range&&e.fireCd<=0){enemyFire(e);e.fireCd=Math.max(.7,(e.type==='heavy'?1.75:e.type==='drone'?1.35:e.type==='turret'?1.55:2.05)-S.i*.025);}
    }

    if(!S.bossSpawned&&p.x>meta().length-V.w*.95){S.boss=boss();S.bossSpawned=true;showToast('⚠ БОСС');track('boss_spawn',{mission:S.i+1});updateHud();}
    if(S.boss&&!S.boss.dead){const b=S.boss;b.phase+=dt;b.fireCd-=dt;b.x=meta().length-430+Math.sin(b.phase*.55)*65;b.y=groundY(b.x)-b.h;b.dir=p.x<b.x?-1:1;if(Math.abs(p.x-b.x)<V.w*.95&&b.fireCd<=0){enemyFire(b);b.fireCd=Math.max(.5,1.0-S.i*.02);} }

    for(const b of S.bullets){
      if(b.life<=0)continue;
      for(const e of S.enemies){if(!e.dead&&bulletHit(b,e)){e.hp--;b.life=-1;if(e.hp<=0){e.dead=true;S.score+=e.type==='heavy'?250:e.type==='drone'?180:e.type==='turret'?210:120;for(let k=0;k<12;k++)S.particles.push({x:e.x+e.w*.5,y:e.y+e.h*.45,vx:rnd(-140,140),vy:rnd(-180,30),life:rnd(.25,.6),c:k%2?'#ff8a62':'#ffd15b'});updateHud();}break;}}
      if(S.boss&&!S.boss.dead&&bulletHit(b,S.boss)){S.boss.hp--;b.life=-1;S.score+=20;if(S.boss.hp<=0){S.boss.dead=true;S.objectiveComplete=true;S.score+=900;showToast('Босс уничтожен');track('boss_defeat',{mission:S.i+1});}updateHud();}
    }

    const pr=rectActor(p,.24);
    for(const b of S.shots){if(b.life>0&&b.x>pr.x&&b.x<pr.x+pr.w&&b.y>pr.y&&b.y<pr.y+pr.h){b.life=-1;loseLife();break;}}
    if(p.inv<=0){for(const e of S.enemies){if(!e.dead&&e.type!=='drone'&&overlaps(pr,rectActor(e,.24))){loseLife();break;}}if(S.boss&&!S.boss.dead&&overlaps(pr,rectActor(S.boss,.18)))loseLife();}

    S.enemies=S.enemies.filter(e=>!e.dead||e.x>S.cam-V.w*.5);
    S.bullets=S.bullets.filter(b=>b.life>0&&b.x>S.cam-100&&b.x<S.cam+V.w+220&&b.y>-100&&b.y<V.h+100);
    S.shots=S.shots.filter(b=>b.life>0&&b.x>S.cam-220&&b.x<S.cam+V.w+220&&b.y>-100&&b.y<V.h+100);
    S.particles=S.particles.filter(q=>q.life>0);

    if(S.bossSpawned&&S.boss?.dead&&p.x>meta().length-170)complete();
  }

  function line(x1,y1,x2,y2,w,c){ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.lineWidth=w;ctx.strokeStyle=c;ctx.stroke();}
  function mountain(x,y,w,h,c){ctx.fillStyle=c;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+w*.5,y-h);ctx.lineTo(x+w,y);ctx.closePath();ctx.fill();}
  function palm(x,b,s=1){line(x,b,x-2,b-90*s,5*s,'rgba(67,49,35,.78)');for(let a=-1.1;a<=1.1;a+=.44)line(x,b-90*s,x+Math.sin(a)*46*s,b-90*s-Math.cos(a)*20*s,5*s,'rgba(37,92,60,.78)');}
  function tower(wx,b,s=1){const x=wx-S.cam*.78;if(x<-100||x>V.w+100)return;line(x,b,x,b-150*s,3*s,'rgba(28,35,40,.82)');for(let y=b-24*s;y>b-145*s;y-=22*s)line(x-12*s,y,x+12*s,y,2,'rgba(28,35,40,.82)');ctx.fillStyle='#f34d4d';ctx.beginPath();ctx.arc(x,b-156*s,4*s,0,7);ctx.fill();}
  function bunker(wx,b,w=210,h=170){const x=wx-S.cam;if(x<-w||x>V.w+w)return;ctx.fillStyle='rgba(48,58,57,.90)';ctx.fillRect(x,b-h,w,h);ctx.fillStyle='rgba(16,23,25,.94)';ctx.fillRect(x+28,b-h+45,w*.44,48);ctx.fillRect(x+w*.70,b-h+28,w*.14,65);for(let xx=x+35;xx<x+w;xx+=44)line(xx,b-h,xx,b,1,'rgba(140,150,130,.13)');ctx.fillStyle='#c79a45';ctx.fillRect(x+w*.84,b-h+30,10,13);}
  function crate(wx,y,s=1){const x=wx-S.cam;if(x<-80||x>V.w+80)return;const w=46*s,h=40*s;ctx.fillStyle='#75563b';ctx.fillRect(x,y,w,h);ctx.strokeStyle='#c99a5b';ctx.lineWidth=2;ctx.strokeRect(x,y,w,h);line(x,y,x+w,y+h,1.5,'#c99a5b');line(x+w,y,x,y+h,1.5,'#c99a5b');}
  function platformDraw(pl){const x=pl.x-S.cam;if(x<-pl.w||x>V.w+pl.w)return;ctx.fillStyle='rgba(66,74,75,.95)';ctx.fillRect(x,pl.y,pl.w,pl.h);ctx.fillStyle='rgba(196,164,86,.65)';ctx.fillRect(x,pl.y,pl.w,2);}

  function drawBackdrop(){
    const p=THEMES[meta().theme];const g=ctx.createLinearGradient(0,0,0,V.h);g.addColorStop(0,p[0]);g.addColorStop(.44,p[1]);g.addColorStop(1,p[3]);ctx.fillStyle=g;ctx.fillRect(0,0,V.w,V.h);
    const par=(S.cam*.11)%(V.w*.40);const gy=groundBase();
    for(let k=-2;k<7;k++)mountain(k*V.w*.25-par,gy*.70,V.w*.34,V.h*(.16+(k&1)*.04),p[2]);

    const t=meta().theme;
    if(['coast','river','waterfall'].includes(t)){ctx.fillStyle=t==='river'?'rgba(20,92,80,.70)':'rgba(15,88,109,.72)';ctx.fillRect(0,gy*.59,V.w,gy*.41);for(let y=gy*.64;y<gy;y+=30)line(0,y,V.w,y,1,'rgba(180,235,235,.12)');}
    if(t==='coast'){for(let k=0;k<10;k++)palm(((k*330-S.cam*.28)%(V.w+500))-100,gy,0.82);for(let k=0;k<8;k++){const bx=k*620+700;bunker(bx,gy,220,180);tower(bx+170,gy-180,.65);}}
    if(t==='river'){for(let k=0;k<12;k++)palm(((k*260-S.cam*.26)%(V.w+450))-80,gy,.95);for(let k=0;k<7;k++){const bx=k*680+720;bunker(bx,gy,210,165);}}
    if(t==='waterfall'){for(let k=0;k<6;k++){const x=k*V.w*.34-(S.cam*.16%(V.w*.34));ctx.fillStyle='rgba(220,246,249,.25)';ctx.fillRect(x,gy*.42,V.w*.035,gy*.55);}for(let k=0;k<7;k++)bunker(k*700+720,gy,240,210);}
    if(t==='canyon'||t==='radio'){for(let k=-1;k<8;k++){ctx.fillStyle='rgba(93,48,38,.58)';ctx.fillRect(k*V.w*.22-(S.cam*.17%(V.w*.22)),gy*.55,V.w*.12,gy*.45);}for(let k=0;k<8;k++){const bx=k*700+660;tower(bx,gy,.82);if(k%2===0)bunker(bx+120,gy,210,165);}}
    if(t==='ruins'||t==='city'){for(let k=-1;k<9;k++){const x=k*V.w*.13-(S.cam*.15%(V.w*.13));ctx.fillStyle=k&1?'rgba(31,38,49,.78)':'rgba(49,41,50,.80)';ctx.fillRect(x,gy*.36+(k%3)*30,V.w*.11,gy*.64);for(let y=gy*.43;y<gy*.91;y+=58){ctx.fillStyle=t==='city'?'rgba(135,81,190,.25)':'rgba(215,155,104,.12)';ctx.fillRect(x+18,y,14,21);}}}
    if(t==='snow'){ctx.fillStyle='rgba(231,243,249,.60)';ctx.fillRect(0,gy*.86,V.w,gy*.14);for(let k=0;k<7;k++)bunker(k*690+680,gy,230,175);ctx.fillStyle='rgba(255,255,255,.72)';for(let k=0;k<55;k++)ctx.fillRect((k*137+S.t*38)%V.w,(k*91+S.t*64)%gy,2,4);}
    if(t==='factory'||t==='reactor'){ctx.fillStyle='rgba(8,14,21,.60)';ctx.fillRect(0,gy*.32,V.w,gy*.68);for(let k=-1;k<9;k++){const x=k*V.w*.14-(S.cam*.13%(V.w*.14));ctx.fillStyle='rgba(38,42,49,.90)';ctx.fillRect(x,gy*.32+(k&1)*40,V.w*.11,gy*.68);ctx.fillStyle=t==='reactor'?'rgba(76,235,151,.20)':'rgba(234,128,74,.18)';for(let y=gy*.48;y<gy*.90;y+=70)ctx.fillRect(x+18,y,V.w*.055,20);}}
    if(t==='swamp'){ctx.fillStyle='rgba(18,70,41,.62)';ctx.fillRect(0,gy*.62,V.w,gy*.38);for(let k=0;k<15;k++){const x=(k*180-S.cam*.17)%(V.w+400);ctx.fillStyle='rgba(40,102,53,.70)';ctx.beginPath();ctx.arc(x,gy*.70+(k%3)*35,45+(k%4)*9,0,7);ctx.fill();}for(let k=0;k<6;k++)bunker(k*720+690,gy,225,175);}
    if(t==='final'){ctx.fillStyle='rgba(16,9,17,.68)';ctx.fillRect(0,gy*.48,V.w,gy*.52);for(let k=0;k<7;k++){const bx=k*690+650;bunker(bx,gy,250,190);tower(bx+170,gy-185,.70);}}

    const fog=ctx.createLinearGradient(0,0,0,V.h);fog.addColorStop(0,'rgba(2,6,11,.03)');fog.addColorStop(.70,'rgba(2,6,11,.01)');fog.addColorStop(1,'rgba(2,6,11,.42)');ctx.fillStyle=fog;ctx.fillRect(0,0,V.w,V.h);
  }

  function drawWorld(){
    const gy=groundBase();
    ctx.fillStyle='rgba(15,19,22,.80)';ctx.fillRect(0,gy,V.w,V.h-gy);ctx.fillStyle='rgba(225,202,132,.72)';ctx.fillRect(0,gy-2,V.w,2);
    for(const pl of S.platforms)platformDraw(pl);
    for(const pr of S.props){const x=pr.x-S.cam;if(x<-100||x>V.w+100)continue;if(pr.type==='crate')crate(pr.x,groundY(pr.x)-42,.92);else if(pr.type==='barrier'){ctx.fillStyle='rgba(88,71,50,.8)';ctx.fillRect(x,groundY(pr.x)-24,70,24);line(x,groundY(pr.x)-24,x+70,groundY(pr.x),2,'#b48754');}else{line(x,groundY(pr.x),x,groundY(pr.x)-62,3,'rgba(50,57,56,.75)');ctx.fillStyle='rgba(245,184,74,.7)';ctx.beginPath();ctx.arc(x,groundY(pr.x)-66,5,0,7);ctx.fill();}}
  }

  function drawActor(img,a,flip=false,alpha=1){
    const x=a.x-S.cam;if(x<-a.w*2||x>V.w+a.w*2)return;
    ctx.save();ctx.globalAlpha=alpha;
    if(img&&img.complete&&img.naturalWidth){if(flip){ctx.translate(x+a.w,0);ctx.scale(-1,1);ctx.drawImage(img,0,a.y,a.w,a.h);}else ctx.drawImage(img,x,a.y,a.w,a.h);}else{ctx.fillStyle=a.type==='hero'?'#e9a75f':'#9b554c';ctx.fillRect(x,a.y,a.w,a.h);}
    ctx.restore();
  }

  function shadow(a){const x=a.x-S.cam;ctx.fillStyle='rgba(0,0,0,.26)';ctx.beginPath();ctx.ellipse(x+a.w*.5,a.y+a.h-3,a.w*.30,Math.max(5,a.h*.035),0,0,7);ctx.fill();}
  function hpBar(e){if(e.hp>=e.maxHp)return;const x=e.x-S.cam,w=Math.min(48,e.w*.62),y=e.y-7;ctx.fillStyle='rgba(0,0,0,.45)';ctx.fillRect(x+e.w*.5-w*.5,y,w,4);ctx.fillStyle='#75e3a1';ctx.fillRect(x+e.w*.5-w*.5,y,w*e.hp/e.maxHp,4);}

  function drawActors(){
    for(const e of S.enemies){if(e.dead)continue;shadow(e);drawActor(IMG[e.type]||IMG.enemy,e,e.dir>0);hpBar(e);}
    if(S.boss&&!S.boss.dead){shadow(S.boss);drawActor(IMG.heavy||IMG.enemy,S.boss,S.boss.dir>0);hpBar(S.boss);}
    if(S.p){shadow(S.p);const blink=S.p.inv>0&&Math.floor(S.t*12)%2===0;drawActor(IMG.hero,S.p,S.p.dir<0,blink?.38:1);}
  }

  function drawProjectiles(){
    for(const b of S.bullets){const x=b.x-S.cam;ctx.fillStyle='#ffd361';ctx.beginPath();ctx.arc(x,b.y,b.r,0,7);ctx.fill();line(x-b.vx*.018,b.y-b.vy*.018,x,b.y,2,'rgba(255,211,97,.58)');}
    for(const b of S.shots){const x=b.x-S.cam;ctx.fillStyle='#ff7474';ctx.beginPath();ctx.arc(x,b.y,b.r,0,7);ctx.fill();line(x-b.vx*.025,b.y-b.vy*.025,x,b.y,2,'rgba(255,110,110,.56)');}
    for(const q of S.particles){const x=q.x-S.cam;ctx.globalAlpha=clamp(q.life*2,0,1);ctx.fillStyle=q.c;ctx.fillRect(x,q.y,3,3);ctx.globalAlpha=1;}
  }

  function drawExit(){
    const x=meta().length-90-S.cam;if(x<-100||x>V.w+100)return;const y=groundY(meta().length-90);ctx.fillStyle=S.boss?.dead?'rgba(92,232,150,.9)':'rgba(246,202,78,.65)';ctx.fillRect(x,y-95,6,95);ctx.beginPath();ctx.moveTo(x+6,y-95);ctx.lineTo(x+54,y-78);ctx.lineTo(x+6,y-61);ctx.closePath();ctx.fill();
  }

  function render(){
    resize();ctx.setTransform(V.dpr,0,0,V.dpr,0,0);ctx.clearRect(0,0,V.w,V.h);
    if(S.mode==='menu'&&!S.p)return;
    drawBackdrop();drawWorld();drawExit();drawActors();drawProjectiles();
    const vg=ctx.createRadialGradient(V.w*.5,V.h*.45,V.w*.20,V.w*.5,V.h*.45,Math.max(V.w,V.h)*.82);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,.26)');ctx.fillStyle=vg;ctx.fillRect(0,0,V.w,V.h);
  }

  function loop(now){
    const dt=Math.min(.033,(now-(S.last||now))/1000);S.last=now;update(dt);render();requestAnimationFrame(loop);
  }

  let padPointer=null;
  function padMove(e){
    const r=UI.pad.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;let dx=e.clientX-cx,dy=e.clientY-cy;const max=r.width*.28,l=Math.hypot(dx,dy)||1;if(l>max){dx=dx/l*max;dy=dy/l*max;}
    UI.stick.style.transform=`translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px))`;
    input.moveX=Math.abs(dx)<7?0:dx/max;input.aimX=Math.abs(dx)<7?(S.p?.dir||1):dx/max;input.aimY=Math.abs(dy)<7?0:dy/max;
  }
  UI.pad?.addEventListener('pointerdown',e=>{padPointer=e.pointerId;UI.pad.setPointerCapture(e.pointerId);padMove(e);});
  UI.pad?.addEventListener('pointermove',e=>{if(e.pointerId===padPointer)padMove(e);});
  function padEnd(){padPointer=null;input.moveX=0;input.aimX=S.p?.dir||1;input.aimY=0;if(UI.stick)UI.stick.style.transform='translate(-50%,-50%)';}
  UI.pad?.addEventListener('pointerup',padEnd);UI.pad?.addEventListener('pointercancel',padEnd);

  $('jump')?.addEventListener('pointerdown',e=>{e.preventDefault();jump();});
  $('fire')?.addEventListener('pointerdown',e=>{e.preventDefault();input.fire=true;fire();});
  ['pointerup','pointercancel','lostpointercapture'].forEach(n=>$('fire')?.addEventListener(n,()=>input.fire=false));

  addEventListener('keydown',e=>{
    input.keys.add(e.key.toLowerCase());
    if(['arrowleft','a'].includes(e.key.toLowerCase())){input.moveX=-1;input.aimX=-1;input.aimY=0;}
    if(['arrowright','d'].includes(e.key.toLowerCase())){input.moveX=1;input.aimX=1;input.aimY=0;}
    if(['arrowup','w'].includes(e.key.toLowerCase())){input.aimY=-1;}
    if(['arrowdown','s'].includes(e.key.toLowerCase())){input.aimY=1;}
    if(e.key===' '){e.preventDefault();jump();}
    if(['x','j','k'].includes(e.key.toLowerCase())){input.fire=true;fire();}
  });
  addEventListener('keyup',e=>{
    input.keys.delete(e.key.toLowerCase());
    if(['arrowleft','a','arrowright','d'].includes(e.key.toLowerCase())){const l=input.keys.has('arrowleft')||input.keys.has('a'),r=input.keys.has('arrowright')||input.keys.has('d');input.moveX=l?-1:r?1:0;input.aimX=input.moveX||S.p?.dir||1;}
    if(['arrowup','w','arrowdown','s'].includes(e.key.toLowerCase()))input.aimY=(input.keys.has('arrowup')||input.keys.has('w'))?-1:(input.keys.has('arrowdown')||input.keys.has('s'))?1:0;
    if(['x','j','k'].includes(e.key.toLowerCase()))input.fire=false;
  });

  $('play')?.addEventListener('click',()=>start(0));
  $('gameBack')?.addEventListener('click',()=>{S.paused=true;UI.pauseModal.classList.remove('hidden');});
  $('pause')?.addEventListener('click',()=>{S.paused=true;UI.pauseModal.classList.remove('hidden');});
  $('resume')?.addEventListener('click',()=>{S.paused=false;UI.pauseModal.classList.add('hidden');S.last=performance.now();});
  $('pauseMenu')?.addEventListener('click',backMenu);$('modalMenu')?.addEventListener('click',backMenu);
  $('backCatalog')?.addEventListener('click',backMenu);
  $('share')?.addEventListener('click',()=>{
    const base='https://t.me/RetroGamesPlayBot/retrogames?startapp=game_share_steel';
    track('share_click',{mission:S.i+1});
    try{window.Telegram?.WebApp?.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(base)}&text=${encodeURIComponent('Стальной десант — ретро run-and-gun прямо в Telegram')}`);}catch(_){navigator.clipboard?.writeText(base);showToast('Ссылка скопирована');}
  });
  addEventListener('resize',()=>requestAnimationFrame(resize),{passive:true});
  addEventListener('orientationchange',()=>setTimeout(resize,120),{passive:true});

  buildMenu();resize();requestAnimationFrame(loop);
})();