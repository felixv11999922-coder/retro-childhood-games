'use strict';
(function(){
  const canvas=document.getElementById('gameCanvas');
  const wrap=document.querySelector('.canvasWrap');
  const levelEl=document.getElementById('level');
  if(!canvas||!wrap||!levelEl)return;
  const W=canvas.width||960,H=canvas.height||540;
  const BGS=window.SteelAssaultSceneImages||{};
  const SPR=window.SteelAssaultPhotoActors||{};

  function layer(id,z){
    let c=document.getElementById(id);
    if(!c){c=document.createElement('canvas');c.id=id;c.width=W;c.height=H;c.setAttribute('aria-hidden','true');wrap.appendChild(c)}
    Object.assign(c.style,{position:'absolute',inset:'0',width:'100%',height:'100%',pointerEvents:'none',zIndex:String(z)});
    return c;
  }
  const bgCanvas=layer('saPhotoBg',0);
  const terrainCanvas=layer('saPhotoTerrain',12);
  const actorCanvas=layer('saPhotoActors',28);
  const bg=bgCanvas.getContext('2d'),tg=terrainCanvas.getContext('2d'),ag=actorCanvas.getContext('2d');
  bg.imageSmoothingEnabled=true;tg.imageSmoothingEnabled=true;ag.imageSmoothingEnabled=true;

  const imgs={};
  function load(key,src){
    if(!src)return null;
    if(imgs[key])return imgs[key];
    const im=new Image();im.decoding='async';im.src=src;imgs[key]=im;return im;
  }
  for(let i=1;i<=12;i++)load('bg'+i,BGS[i]);
  for(const k of ['hero','enemy','heavy','drone','turret'])load(k,SPR[k]);

  const levelNo=()=>Math.max(1,Math.min(12,parseInt(levelEl.textContent||'1',10)||1));
  const levels=window.SteelAssaultLevels||[];
  const cap={hero:null,enemies:[],platforms:[],boss:null,frame:0};
  let aim={x:1,y:0},facing=1,lastHeroX=null,heroVel=0,gunStart=null,currentBg=0,lastFrame=-1;
  const norm=v=>String(v||'').replace(/\s+/g,'').toLowerCase();
  const eq=(v,hex,rgb)=>{const n=norm(v);return n===hex||n===rgb};
  function pt(ctx,x,y){try{const m=ctx.getTransform();return{x:m.a*x+m.c*y+m.e,y:m.b*x+m.d*y+m.f}}catch{return{x,y}}}
  function rectT(ctx,x,y,w,h){const a=pt(ctx,x,y),b=pt(ctx,x+w,y+h);return{x:a.x,y:a.y,w:b.x-a.x,h:b.y-a.y}}
  function reset(){cap.hero=null;cap.enemies=[];cap.platforms=[];cap.boss=null;cap.frame++}

  const proto=CanvasRenderingContext2D.prototype;
  const prevFillRect=proto.fillRect,prevMoveTo=proto.moveTo,prevLineTo=proto.lineTo,prevFillText=proto.fillText;
  proto.fillRect=function(x,y,w,h){
    if(this.canvas===canvas){
      const fs=this.fillStyle;
      if(x===0&&y===0&&Math.abs(w-W)<1&&Math.abs(h-H)<1)reset();
      if(eq(fs,'#4ce2ac','rgb(76,226,172)')&&Math.abs(w-18)<1&&h>20&&h<50){
        const p=pt(this,x,y),hh=h+9,hx=p.x-9,hy=p.y-9;
        if(lastHeroX!==null){heroVel=heroVel*.68+(hx-lastHeroX)*.32;if(Math.abs(heroVel)>.08)facing=heroVel>0?1:-1}
        lastHeroX=hx;cap.hero={x:hx,y:hy,w:34,h:hh,crouch:hh<40};
      }else if(eq(fs,'#e86d72','rgb(232,109,114)')&&Math.abs(w-26)<1&&Math.abs(h-15)<1){
        const p=pt(this,x,y);cap.enemies.push({type:'drone',x:p.x-5,y:p.y-5,w:36,h:25});
      }else if(eq(fs,'#d95b63','rgb(217,91,99)')&&w>=18&&h>=25){
        const p=pt(this,x,y);cap.enemies.push({type:'soldier',x:p.x-6,y:p.y-8,w:w+12,h:h+8});
      }else if(eq(fs,'#a64f59','rgb(166,79,89)')&&w>=28&&h>=30){
        const p=pt(this,x,y);cap.enemies.push({type:'heavy',x:p.x-6,y:p.y-8,w:w+12,h:h+8});
      }else if(eq(fs,'#895764','rgb(137,87,100)')&&w>=18&&h>=16){
        const p=pt(this,x,y);cap.enemies.push({type:'turret',x:p.x-6,y:p.y-8,w:w+12,h:h+8});
      }else if(eq(fs,'#d75d68','rgb(215,93,104)')&&Math.abs(w-36)<1&&Math.abs(h-24)<1){
        const p=pt(this,x,y);cap.enemies.push({type:'soldier',x:p.x-18,y:p.y-12,w:36,h:24});
      }else if(eq(fs,'#552a53','rgb(85,42,83)')&&w>=90&&h>=90){
        const p=pt(this,x,y);cap.boss={x:p.x,y:p.y,w,h};
      }else if(eq(fs,'#263847','rgb(38,56,71)')&&Math.abs(h-18)<1){
        cap.platforms.push({...rectT(this,x,y,w,h),type:'ledge'});
      }else if(y>=440&&h>=65&&h<=120&&w>500){
        cap.platforms.push({...rectT(this,x,y,w,h),type:'ground'});
      }
    }
    return prevFillRect.call(this,x,y,w,h);
  };
  proto.moveTo=function(x,y){
    if(this.canvas===canvas&&eq(this.strokeStyle,'#d9fff2','rgb(217,255,242)')&&Number(this.lineWidth)===5)gunStart=pt(this,x,y);
    return prevMoveTo.call(this,x,y);
  };
  proto.lineTo=function(x,y){
    if(this.canvas===canvas&&gunStart&&eq(this.strokeStyle,'#d9fff2','rgb(217,255,242)')&&Number(this.lineWidth)===5){
      const p=pt(this,x,y),dx=p.x-gunStart.x,dy=p.y-gunStart.y,l=Math.hypot(dx,dy)||1;
      aim={x:dx/l,y:dy/l};if(Math.abs(aim.x)>.12)facing=aim.x>0?1:-1;gunStart=null;
    }
    return prevLineTo.call(this,x,y);
  };
  proto.fillText=function(text,x,y,max){
    if(this.canvas===canvas){
      const s=String(text||'').toUpperCase();
      if(s.includes('СТАЛЬНОЙ ДЕСАНТ')||s.includes('RETRO GAMES PLAY'))return;
    }
    return prevFillText.call(this,text,x,y,max);
  };

  function cover(c,im){
    if(!im||!im.complete||!im.naturalWidth)return false;
    const sw=im.naturalWidth,sh=im.naturalHeight,src=sw/sh,dst=W/H;
    let sx=0,sy=0,sww=sw,shh=sh;
    if(src>dst){sww=sh*dst;sx=(sw-sww)/2}else if(src<dst){shh=sw/dst;sy=(sh-shh)/2}
    c.drawImage(im,sx,sy,sww,shh,0,0,W,H);return true;
  }
  function drawBg(n){
    if(n===currentBg&&imgs['bg'+n]?.complete)return;
    currentBg=n;bg.clearRect(0,0,W,H);
    const im=imgs['bg'+n];
    if(!cover(bg,im)){
      const q=bg.createLinearGradient(0,0,0,H);q.addColorStop(0,'#24445d');q.addColorStop(1,'#0e1a23');bg.fillStyle=q;bg.fillRect(0,0,W,H);
    }
    let g=bg.createLinearGradient(0,0,0,H);g.addColorStop(0,'rgba(3,10,18,.20)');g.addColorStop(.54,'rgba(0,0,0,.04)');g.addColorStop(1,'rgba(2,7,11,.38)');bg.fillStyle=g;bg.fillRect(0,0,W,H);
    const v=bg.createRadialGradient(W*.48,H*.44,H*.10,W*.48,H*.48,W*.66);v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,'rgba(0,0,0,.24)');bg.fillStyle=v;bg.fillRect(0,0,W,H);
  }
  for(let i=1;i<=12;i++){const im=imgs['bg'+i];if(im)im.addEventListener('load',()=>{if(levelNo()===i){currentBg=0;drawBg(i)}},{once:true})}

  function rr(c,x,y,w,h,r,fill,stroke=null,lw=1){c.beginPath();if(c.roundRect)c.roundRect(x,y,w,h,r);else c.rect(x,y,w,h);c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=lw;c.stroke()}}
  function shadow(c,x,y,w,a=.34){c.save();c.fillStyle='rgba(0,0,0,'+a+')';c.beginPath();c.ellipse(x,y,w,6,0,0,Math.PI*2);c.fill();c.restore()}
  function drawImageActor(im,x,y,w,h,flip=false,rot=0,alpha=1){
    if(!im||!im.complete||!im.naturalWidth)return false;
    ag.save();ag.globalAlpha=alpha;ag.translate(x,y);if(rot)ag.rotate(rot);ag.scale(flip?-1:1,1);ag.drawImage(im,-w/2,-h,w,h);ag.restore();return true;
  }
  function drawHero(t){
    const h=cap.hero;if(!h)return;
    const cx=h.x+h.w/2,feet=h.y+h.h+10,dir=Math.abs(aim.x)>.12?(aim.x>0?1:-1):facing;
    const moving=Math.min(1,Math.abs(heroVel)/2.8),bob=Math.sin(t*.018)*2*moving;
    const height=h.crouch?86:112,width=height*1.02;
    shadow(ag,cx,feet+2,34,.48);
    const angle=Math.max(-.18,Math.min(.18,Math.atan2(aim.y,Math.max(.25,Math.abs(aim.x)))*.18));
    if(!drawImageActor(imgs.hero,cx,feet+bob,width,height,dir<0,dir<0?-angle:angle)){
      rr(ag,cx-18,feet-76,36,68,8,'#74633c','#1a1812',3);
    }
    if((performance.now()/90|0)%2===0){
      const mx=cx+aim.x*64,my=feet-64+aim.y*56;
      const q=ag.createRadialGradient(mx,my,0,mx,my,18);q.addColorStop(0,'rgba(255,250,205,.95)');q.addColorStop(.25,'rgba(255,192,70,.75)');q.addColorStop(1,'rgba(255,80,20,0)');ag.fillStyle=q;ag.fillRect(mx-20,my-20,40,40);
    }
  }
  function enemyDir(e){return cap.hero&&cap.hero.x<e.x?-1:1}
  function drawEnemy(e,t){
    const cx=e.x+e.w/2,feet=e.y+e.h+8,dir=enemyDir(e);
    let im=imgs.enemy,w=66,h=82;
    if(e.type==='heavy'){im=imgs.heavy;w=96;h=98}
    else if(e.type==='drone'){im=imgs.drone;w=78;h=60}
    else if(e.type==='turret'){im=imgs.turret;w=84;h=55}
    if(e.type==='drone'){
      const bob=Math.sin(t*.007+e.x*.03)*4;drawImageActor(im,cx,feet-5+bob,w,h,dir<0,0,.98);return;
    }
    shadow(ag,cx,feet+1,e.type==='heavy'?31:22,.40);
    drawImageActor(im,cx,feet,w,h,dir<0,0,.98);
  }
  function drawBoss(b,t){
    if(!b)return;const cx=b.x+b.w/2,cy=b.y+b.h/2;
    ag.save();const pulse=.96+Math.sin(t*.004)*.04;ag.translate(cx,cy);ag.scale(pulse,pulse);
    const q=ag.createRadialGradient(0,0,10,0,0,100);q.addColorStop(0,'rgba(255,77,119,.55)');q.addColorStop(1,'rgba(255,77,119,0)');ag.fillStyle=q;ag.fillRect(-110,-110,220,220);
    rr(ag,-62,-62,124,124,18,'rgba(36,29,44,.96)','#8a718e',4);rr(ag,-45,-45,90,90,14,'#211a29','#4f4257',3);ag.fillStyle='#ff5577';ag.beginPath();ag.arc(0,0,24,0,Math.PI*2);ag.fill();ag.restore();
  }
  function drawTerrain(){
    tg.clearRect(0,0,W,H);
    const n=levelNo();
    const seen=new Set();
    for(const r of cap.platforms){
      if(!r||r.w<20||r.h<2)continue;
      const key=Math.round(r.x/4)+':'+Math.round(r.y/4)+':'+Math.round(r.w/4);if(seen.has(key))continue;seen.add(key);
      if(r.type==='ground'){
        const g=tg.createLinearGradient(0,r.y,0,r.y+34);g.addColorStop(0,'rgba(216,186,128,.70)');g.addColorStop(.12,'rgba(70,63,48,.78)');g.addColorStop(1,'rgba(17,22,21,.50)');tg.fillStyle=g;tg.fillRect(r.x,r.y,r.w,Math.min(34,r.h));
        tg.fillStyle='rgba(255,225,164,.58)';tg.fillRect(r.x,r.y,r.w,3);
      }else{
        const col=n===6?'rgba(197,224,235,.72)':(n===7||n===10?'rgba(105,110,112,.76)':'rgba(101,93,70,.76)');
        rr(tg,r.x,r.y,r.w,Math.max(12,Math.min(20,r.h)),3,col,'rgba(10,12,12,.72)',2);tg.fillStyle='rgba(255,255,255,.23)';tg.fillRect(r.x+2,r.y+2,Math.max(0,r.w-4),2);
      }
    }
  }
  function drawActors(t){
    ag.clearRect(0,0,W,H);drawHero(t);
    const seen=new Set();
    for(const e of cap.enemies){
      const k=e.type+':'+Math.round(e.x/3)+':'+Math.round(e.y/3);if(seen.has(k))continue;seen.add(k);drawEnemy(e,t);
    }
    drawBoss(cap.boss,t);
  }
  function frame(t){
    const n=levelNo();drawBg(n);
    if(cap.frame!==lastFrame){lastFrame=cap.frame;drawTerrain()}
    drawActors(t);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  ['saV2Scene','saV2Terrain','saV2Actors','steelCinematicActors','steelSceneArt','steelSceneRemaster','steelEarlyMissionArt','steelCharacterArt','steelCharacterRemaster'].forEach(id=>{
    const el=document.getElementById(id);if(el){el.style.setProperty('display','none','important');el.style.setProperty('visibility','hidden','important')}
  });

  function cleanObjective(){
    const old=document.getElementById('steelMissionObjective');if(!old)return;
    const n=levelNo(),lvl=levels[n-1];
    const map={1:'ЗАЧИСТИТЬ АВАНПОСТ',2:'УДЕРЖАТЬ РЕЧНОЙ ПЕРЕВАЛ',3:'ДОСТИЧЬ КОМАНДНОГО УЗЛА',4:'ОТКЛЮЧИТЬ РАДАР B-17',5:'ПРОРВАТЬСЯ ЧЕРЕЗ БУНКЕР-7',6:'ЗАХВАТИТЬ ЛЕДЯНУЮ БАЗУ',7:'ОСТАНОВИТЬ ЛИНИЮ ПРЕССОВ',8:'ПЕРЕСЕЧЬ НЕБЕСНЫЙ МОСТ',9:'ОТКЛЮЧИТЬ БАШНЮ СВЯЗИ',10:'ПОГАСИТЬ РЕАКТОР',11:'УНИЧТОЖИТЬ ЖИВУЮ МАТРИЦУ',12:'ЛИКВИДИРОВАТЬ КОМАНДНЫЙ НУЛЬ'};
    old.innerHTML='<b>МИССИЯ '+String(n).padStart(2,'0')+'</b> '+(map[n]||String(lvl?.name||'').toUpperCase());
  }
  cleanObjective();try{new MutationObserver(cleanObjective).observe(levelEl,{subtree:true,childList:true,characterData:true})}catch{}
})();
