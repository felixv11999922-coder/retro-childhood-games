'use strict';
(function(){
  const canvas=document.getElementById('gameCanvas');
  const wrap=document.querySelector('.canvasWrap');
  if(!canvas||!wrap)return;
  const W=canvas.width||960,H=canvas.height||540;

  for(const id of ['steelSceneArt','steelSceneFx','steelSceneRemaster','steelSceneRemasterFx','steelCharacterArt','steelCharacterRemaster']){
    const n=document.getElementById(id); if(n)n.style.display='none';
  }

  function mk(id,z){
    let c=document.getElementById(id);
    if(!c){c=document.createElement('canvas');c.id=id;c.width=W;c.height=H;c.setAttribute('aria-hidden','true');wrap.appendChild(c)}
    Object.assign(c.style,{position:'absolute',inset:'0',width:'100%',height:'100%',pointerEvents:'none',zIndex:String(z)});
    return c;
  }
  const scene=mk('saV2Scene',0),terrain=mk('saV2Terrain',1),actors=mk('saV2Actors',4);
  const bg=scene.getContext('2d'),fg=terrain.getContext('2d'),ag=actors.getContext('2d');
  bg.imageSmoothingEnabled=true;fg.imageSmoothingEnabled=true;ag.imageSmoothingEnabled=true;
  canvas.style.position='absolute';canvas.style.inset='0';canvas.style.width='100%';canvas.style.height='100%';canvas.style.zIndex='2';canvas.style.background='transparent';

  let objective=document.getElementById('saMissionObjective');
  if(!objective){
    objective=document.createElement('div');objective.id='saMissionObjective';
    objective.innerHTML='<b>ЦЕЛЬ МИССИИ</b><span></span>';wrap.appendChild(objective);
  }

  const LEVELS=window.SteelAssaultLevels||[];
  const levelNo=()=>Math.max(1,parseInt(document.getElementById('level')?.textContent||'1',10)||1);
  const level=()=>LEVELS[levelNo()-1]||LEVELS[0]||{id:1,name:'Штурм аванпоста',scene:'frontier_outpost'};
  function objectiveText(l){
    const map={
      1:'Зачистить аванпост',2:'Удержать речной перевал',3:'Подняться к командному узлу',
      4:'Вывести из строя радар B-17',5:'Прорваться через Бункер-7',6:'Захватить ледяную базу',
      7:'Остановить линию прессов',8:'Пересечь небесный мост',9:'Отключить башню связи',
      10:'Погасить реакторный коридор',11:'Уничтожить живую матрицу',12:'Ликвидировать Командный нуль'
    };
    return map[l.id]||l.name||'Выполнить задачу';
  }

  const cap={hero:null,enemies:[],platforms:[],boss:null,frame:0};
  let aim={x:1,y:0},facing=1,gunStart=null,lastHeroX=null,heroSpeed=0;

  const proto=CanvasRenderingContext2D.prototype;
  const prevFillRect=proto.fillRect,prevMoveTo=proto.moveTo,prevLineTo=proto.lineTo,prevStroke=proto.stroke,prevFillText=proto.fillText;
  const norm=v=>String(v||'').replace(/\s+/g,'').toLowerCase();
  const eq=(v,a,b)=>{const n=norm(v);return n===a||n===b};
  function pt(ctx,x,y){try{const m=ctx.getTransform();return{x:m.a*x+m.c*y+m.e,y:m.b*x+m.d*y+m.f}}catch{return{x,y}}}
  function rectT(ctx,x,y,w,h){const a=pt(ctx,x,y),b=pt(ctx,x+w,y+h);return{x:a.x,y:a.y,w:b.x-a.x,h:b.y-a.y}}
  function resetCap(){cap.hero=null;cap.enemies=[];cap.platforms=[];cap.boss=null;cap.frame++}

  proto.fillRect=function(x,y,w,h){
    if(this.canvas===canvas){
      const fs=this.fillStyle;
      if(x===0&&y===0&&Math.abs(w-W)<1&&Math.abs(h-H)<1){
        resetCap(); this.clearRect(0,0,W,H); return;
      }
      if(eq(fs,'#4ce2ac','rgb(76,226,172)')&&Math.abs(w-18)<1&&h>20&&h<50){
        const p=pt(this,x,y),hh=h+9,hx=p.x-9,hy=p.y-9;
        if(lastHeroX!==null){heroSpeed=heroSpeed*.72+(hx-lastHeroX)*.28;if(Math.abs(heroSpeed)>.08)facing=heroSpeed>0?1:-1}
        lastHeroX=hx;cap.hero={x:hx,y:hy,w:34,h:hh,crouch:hh<40};return;
      }
      if(eq(fs,'#e86d72','rgb(232,109,114)')&&Math.abs(w-26)<1&&Math.abs(h-15)<1){
        const p=pt(this,x,y);cap.enemies.push({type:'drone',x:p.x-5,y:p.y-5,w:36,h:25});return;
      }
      if(eq(fs,'#d95b63','rgb(217,91,99)')&&w>=18&&h>=28){
        const p=pt(this,x,y);cap.enemies.push({type:'soldier',x:p.x-6,y:p.y-8,w:w+12,h:h+8});return;
      }
      if(eq(fs,'#a64f59','rgb(166,79,89)')&&w>=28&&h>=35){
        const p=pt(this,x,y);cap.enemies.push({type:'heavy',x:p.x-6,y:p.y-8,w:w+12,h:h+8});return;
      }
      if(eq(fs,'#895764','rgb(137,87,100)')&&w>=18&&h>=18){
        const p=pt(this,x,y);cap.enemies.push({type:'turret',x:p.x-6,y:p.y-8,w:w+12,h:h+8});return;
      }
      if(eq(fs,'#d75d68','rgb(215,93,104)')&&Math.abs(w-36)<1&&Math.abs(h-24)<1){
        const p=pt(this,x,y);cap.enemies.push({type:'bunker',x:p.x-18,y:p.y-12,w:36,h:24});return;
      }
      if(eq(fs,'#552a53','rgb(85,42,83)')&&w>=90&&h>=90){
        const p=pt(this,x,y);cap.boss={x:p.x,y:p.y,w,h};return;
      }
      if(eq(fs,'#263847','rgb(38,56,71)')&&Math.abs(h-18)<1){
        cap.platforms.push({...rectT(this,x,y,w,h),type:'ledge'});return;
      }
      if(y>=440&&h>=65&&h<=120&&w>500){
        cap.platforms.push({...rectT(this,x,y,w,h),type:'ground'});return;
      }
      if(eq(fs,'#bdf6dc','rgb(189,246,220)')&&Math.abs(w-16)<1&&Math.abs(h-14)<1)return;
      if(eq(fs,'#ffb24f','rgb(255,178,79)')&&Math.abs(w-10)<1&&Math.abs(h-5)<1)return;
      if(eq(fs,'#1a2630','rgb(26,38,48)')&&Math.abs(w-9)<1&&Math.abs(h-9)<1)return;
      if(eq(fs,'#f6b65e','rgb(246,182,94)')&&Math.abs(h-14)<1)return;
      if(eq(fs,'#222a35','rgb(34,42,53)')&&((Math.abs(w-16)<1&&Math.abs(h-5)<1)||(Math.abs(w-8)<1&&Math.abs(h-8)<1)))return;
      if(eq(fs,'#7f3440','rgb(127,52,64)')&&Math.abs(w-7)<1&&Math.abs(h-5)<1)return;
      if(eq(fs,'#ffd34f','rgb(255,211,79)')&&Math.abs(w-7)<1&&Math.abs(h-5)<1)return;
    }
    return prevFillRect.call(this,x,y,w,h);
  };
  proto.moveTo=function(x,y){
    if(this.canvas===canvas&&eq(this.strokeStyle,'#d9fff2','rgb(217,255,242)')&&Number(this.lineWidth)===5)gunStart=pt(this,x,y);
    return prevMoveTo.call(this,x,y);
  };
  proto.lineTo=function(x,y){
    if(this.canvas===canvas&&gunStart&&eq(this.strokeStyle,'#d9fff2','rgb(217,255,242)')&&Number(this.lineWidth)===5){
      const p=pt(this,x,y),dx=p.x-gunStart.x,dy=p.y-gunStart.y,l=Math.hypot(dx,dy)||1;aim={x:dx/l,y:dy/l};if(Math.abs(aim.x)>.12)facing=aim.x>0?1:-1;gunStart=null;
    }
    return prevLineTo.call(this,x,y);
  };
  proto.stroke=function(){
    if(this.canvas===canvas&&eq(this.strokeStyle,'#d9fff2','rgb(217,255,242)')&&Number(this.lineWidth)===5)return;
    return prevStroke.call(this);
  };
  proto.fillText=function(text,x,y,max){
    if(this.canvas===canvas){
      const s=String(text||'').toUpperCase();
      if(s.includes('СТАЛЬНОЙ ДЕСАНТ')||s.includes('RETRO GAMES PLAY'))return;
    }
    return prevFillText.call(this,text,x,y,max);
  };

  function rr(c,x,y,w,h,r,fill,stroke=null,lw=1){c.beginPath();if(c.roundRect)c.roundRect(x,y,w,h,r);else c.rect(x,y,w,h);c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=lw;c.stroke()}}
  function el(c,x,y,rx,ry,fill,stroke=null,lw=1){c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=lw;c.stroke()}}
  function ln(c,x1,y1,x2,y2,col,lw=2,a=1){c.save();c.globalAlpha=a;c.strokeStyle=col;c.lineWidth=lw;c.lineCap='round';c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke();c.restore()}
  function poly(c,p,fill,stroke=null,lw=1){c.beginPath();c.moveTo(p[0][0],p[0][1]);for(let i=1;i<p.length;i++)c.lineTo(p[i][0],p[i][1]);c.closePath();c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=lw;c.stroke()}}
  function grad(c,x1,y1,x2,y2,a,b,mid=null){const q=c.createLinearGradient(x1,y1,x2,y2);q.addColorStop(0,a);if(mid)q.addColorStop(.55,mid);q.addColorStop(1,b);return q}
  function glow(c,x,y,r,color,a=.4){const q=c.createRadialGradient(x,y,0,x,y,r);q.addColorStop(0,color);q.addColorStop(1,'rgba(0,0,0,0)');c.save();c.globalAlpha=a;c.fillStyle=q;c.fillRect(x-r,y-r,r*2,r*2);c.restore()}
  function ridge(c,y,color,amp,step,seed=0){const p=[[0,H]];for(let x=0;x<=W+step;x+=step){const yy=y-Math.sin((x+seed)*.014)*amp*.28-((x/step+seed)%3)*amp*.18;p.push([x,yy])}p.push([W,H]);poly(c,p,color)}
  function cloud(c,x,y,s,a=.25){c.save();c.globalAlpha=a;el(c,x,y,55*s,16*s,'#fff');el(c,x+35*s,y-8*s,42*s,18*s,'#fff');el(c,x-36*s,y+3*s,36*s,13*s,'#fff');c.restore()}
  function rockMass(c,x,y,w,h,color='#665441'){for(let i=0;i<Math.max(5,w/34);i++){const xx=x+(i*47)%w,yy=y-(i*31)%Math.max(25,h);el(c,xx,yy,34+(i%3)*9,21+(i%2)*8,color);el(c,xx-8,yy-6,15,6,'rgba(255,255,255,.08)')}}
  function palm(c,x,y,s=1){ln(c,x,y,x+5*s,y-78*s,'#513829',6*s);for(let i=0;i<7;i++){const a=-2.8+i*.53;ln(c,x+5*s,y-78*s,x+5*s+Math.cos(a)*52*s,y-78*s+Math.sin(a)*25*s,i%2?'#2d6a40':'#43804d',5*s)}}
  function pine(c,x,y,s=1,col='#1f4736'){ln(c,x,y,x,y-42*s,'#423326',5*s);for(let k=0;k<4;k++)poly(c,[[x,y-(90-k*18)*s],[x-34*s+k*5*s,y-(28+k*5)*s],[x+34*s-k*5*s,y-(28+k*5)*s]],col)}
  function antenna(c,x,y,h=170){ln(c,x,y,x,y-h,'#53636c',4);ln(c,x-18,y-h+34,x+18,y-h+34,'#82939b',2);ln(c,x,y-h,x-28,y-h+50,'#5f7078',2);ln(c,x,y-h,x+28,y-h+50,'#5f7078',2);for(let yy=y-h+30;yy<y;yy+=28)ln(c,x-12,yy,x+12,yy+14,'#43515a',1);glow(c,x,y-h,10,'#ff584b',.7);el(c,x,y-h,3,3,'#ff584b')}
  function sandbags(c,x,y,count=6,s=1){for(let r=0;r<2;r++)for(let i=0;i<count-r;i++){const xx=x+i*20*s+r*10*s,yy=y-r*10*s;el(c,xx,yy,12*s,7*s,r?'#79694d':'#8f7854','#4a4030',1)}}
  function watch(c,x,y,s=1){rr(c,x,y-80*s,78*s,44*s,3,'#5c4d38','#2e281f',2);rr(c,x+6*s,y-74*s,66*s,32*s,2,'#7a6547','#3b3023',1);rr(c,x-7*s,y-86*s,92*s,9*s,2,'#2a2723');for(let i=0;i<4;i++)ln(c,x+8*s+i*20*s,y-36*s,x+13*s+i*18*s,y,'#332e28',5*s);ln(c,x+8*s,y-33*s,x+68*s,y,'#574a38',3);ln(c,x+68*s,y-33*s,x+8*s,y,'#574a38',3)}
  function bunker(c,x,y,w,h,label='A-01',tone='#525749'){rr(c,x,y-h,w,h,4,tone,'#272c27',3);rr(c,x+8,y-h+10,w-16,h-18,3,'rgba(255,255,255,.05)');rr(c,x+18,y-h+40,w*.42,32,2,'#111817','#6d7566',2);rr(c,x+w-55,y-h+20,36,h-28,2,'#272c27','#141815',2);rr(c,x+w-49,y-h+30,24,8,1,'#d2a14b');c.save();c.fillStyle='rgba(235,240,220,.45)';c.font='800 22px monospace';c.fillText(label,x+w-82,y-h+82);c.restore()}
  function flag(c,x,y,color='#812f28'){ln(c,x,y,x,y-80,'#746d5f',4);poly(c,[[x+2,y-77],[x+66,y-66],[x+54,y-36],[x+2,y-45]],color);c.save();c.globalAlpha=.45;c.fillStyle='#f0dfbf';c.font='bold 20px serif';c.fillText('✦',x+24,y-52);c.restore()}
  function radar(c,x,y,s=28){c.save();c.strokeStyle='#91a4ab';c.lineWidth=4;c.beginPath();c.arc(x,y,s,Math.PI*.15,Math.PI*1.08);c.stroke();ln(c,x-s*.8,y-s*.2,x+s*.3,y+s*.5,'#b2c0c2',3);ln(c,x,y+s*.3,x,y+s*1.5,'#65767c',3);c.restore()}
  function crate(c,x,y,s=1,col='#6c5033'){rr(c,x,y,38*s,32*s,2,col,'#2a2017',2);ln(c,x+4*s,y+4*s,x+34*s,y+28*s,'#a18156',2);ln(c,x+34*s,y+4*s,x+4*s,y+28*s,'#a18156',2)}
  function pipe(c,x,y,w,col='#4d5558'){rr(c,x,y,w,12,3,col,'#252b2e',2);for(let xx=x+20;xx<x+w;xx+=55)rr(c,xx,y-3,8,18,2,'#2a3033')}

  function skyBase(top,bottom,t){
    bg.fillStyle=grad(bg,0,0,0,H,top,bottom);bg.fillRect(0,0,W,H);
    const sunX=150,sunY=120;glow(bg,sunX,sunY,105,'#ffd37b',.28);el(bg,sunX,sunY,36,36,'#f2c16d');
    cloud(bg,350,72,1,.14);cloud(bg,700,110,.8,.10);
  }
  function scene1(t){skyBase('#557a9c','#f1a25b',t);ridge(bg,315,'#43566b',75,120,9);ridge(bg,355,'#31493e',90,108,18);ridge(bg,398,'#22392f',70,94,32);bg.fillStyle=grad(bg,0,340,0,H,'#4f92a3','#174852');bg.fillRect(0,340,W,200);for(let i=0;i<12;i++)ln(bg,20,370+i*13,520+(i%3)*80,370+i*13,'#d5ece1',2,.18);rockMass(bg,440,430,200,120);for(let i=0;i<6;i++)palm(bg,20+i*78,435+(i%2)*20,.8);bunker(bg,560,466,320,214,'A-01');antenna(bg,685,270,175);watch(bg,835,365,.88);sandbags(bg,485,454,6,1.05);sandbags(bg,730,447,5,1);flag(bg,240,432);crate(bg,512,420,1.2);crate(bg,820,430,.9)}
  function scene2(t){skyBase('#6f91a2','#d8b27d',t);ridge(bg,270,'#5a6d70',110,122,3);ridge(bg,332,'#39534b',96,100,20);bg.fillStyle=grad(bg,0,330,0,H,'#5794a0','#1b4b54');bg.fillRect(0,330,W,210);for(let i=0;i<14;i++)ln(bg,40+(i%3)*22,350+i*12,860-(i%5)*28,350+i*12,'#d7eee4',2,.20);rockMass(bg,0,440,250,130,'#564f43');rockMass(bg,760,445,200,130,'#5a5348');for(let x=120;x<850;x+=160){rr(bg,x,306,27,105,2,'#424b49');rr(bg,x-10,302,47,10,2,'#6b756f')}ln(bg,100,305,390,305,'#5c6663',12);ln(bg,515,305,865,305,'#5c6663',12);watch(bg,750,395,.72);sandbags(bg,170,432,5,.95);antenna(bg,820,315,122)}
  function scene3(t){skyBase('#355f78','#a9d9d8',t);ridge(bg,250,'#395d62',150,125,13);ridge(bg,335,'#244c47',135,103,7);bg.fillStyle='#9bd9dd';bg.fillRect(160,140,120,400);bg.fillRect(690,120,135,420);for(let i=0;i<22;i++){ln(bg,170+i%5*20,150,185+i%5*20,535,'#efffff',3,.28);ln(bg,705+i%5*22,130,720+i%5*22,535,'#efffff',3,.24)}rockMass(bg,0,470,330,180,'#384c48');rockMass(bg,650,470,310,200,'#334745');bunker(bg,380,390,230,160,'H-03','#425951');antenna(bg,500,230,135);watch(bg,70,405,.7)}
  function scene4(t){bg.fillStyle=grad(bg,0,0,0,H,'#3a1d28','#d7834c');bg.fillRect(0,0,W,H);glow(bg,145,120,100,'#ffb15b',.34);el(bg,145,120,36,36,'#df9455');ridge(bg,330,'#603726',145,120,4);ridge(bg,385,'#44291f',120,95,21);rockMass(bg,40,470,260,160,'#6a4937');rockMass(bg,690,465,260,160,'#714b37');antenna(bg,690,390,205);radar(bg,665,245,35);radar(bg,735,285,27);watch(bg,805,392,.78);sandbags(bg,610,450,6,1);for(let i=0;i<7;i++)crate(bg,330+i*55,430-(i%2)*20,.8,'#684935')}
  function scene5(t){bg.fillStyle=grad(bg,0,0,0,H,'#0a111c','#17283a');bg.fillRect(0,0,W,H);for(let x=0;x<W;x+=80){rr(bg,x,0,4,H,0,'rgba(86,116,145,.15)');for(let y=70;y<H;y+=90)rr(bg,x+12,y,58,3,0,'rgba(121,151,180,.14)')}pipe(bg,80,125,800,'#39454d');pipe(bg,40,405,870,'#344047');for(let i=0;i<7;i++){rr(bg,90+i*120,180+(i%2)*40,84,120,4,'#151e26','#3e4c58',2);rr(bg,105+i*120,195+(i%2)*40,54,28,2,'#090d12');glow(bg,132+i*120,209+(i%2)*40,12,'#65d7e9',.35)}}
  function scene6(t){bg.fillStyle=grad(bg,0,0,0,H,'#7996aa','#e4eef1');bg.fillRect(0,0,W,H);ridge(bg,280,'#90a4ae',130,125,5);ridge(bg,345,'#5d7682',115,100,18);ridge(bg,400,'#405660',80,85,22);bunker(bg,565,468,300,190,'ICE-6','#687d84');antenna(bg,680,292,160);watch(bg,830,395,.78);for(let i=0;i<7;i++)pine(bg,45+i*95,450+(i%2)*16,.85,'#31544b');bg.fillStyle='rgba(255,255,255,.82)';for(let i=0;i<80;i++){const x=(i*127+t*18)%W,y=(i*83+t*38)%H;bg.fillRect(x,y,2+(i%2),2+(i%3))}}
  function scene7(t){bg.fillStyle=grad(bg,0,0,0,H,'#24282e','#4f4035');bg.fillRect(0,0,W,H);for(let i=0;i<6;i++){rr(bg,60+i*165,190+(i%2)*35,120,230,3,'#343a3d','#171b1d',3);rr(bg,75+i*165,205+(i%2)*35,90,42,2,'#121719');glow(bg,120+i*165,225+(i%2)*35,28,i%2?'#ff6d42':'#ffb04c',.28)}pipe(bg,0,120,W,'#555c5e');pipe(bg,90,365,760,'#3f484c');for(let i=0;i<20;i++)ln(bg,(i*71+t*130)%W,0,(i*71+t*130)%W-65,H,'#b8d5e6',1,.18)}
  function scene8(t){bg.fillStyle=grad(bg,0,0,0,H,'#4d80b1','#d7eff7');bg.fillRect(0,0,W,H);cloud(bg,160,100,1.3,.30);cloud(bg,520,145,1.1,.24);cloud(bg,800,90,.95,.22);ridge(bg,400,'#6a8795',90,120,12);for(let x=120;x<880;x+=210){rr(bg,x,315,28,130,2,'#5b6b75');ln(bg,x-60,320,x+120,320,'#7d909c',12);ln(bg,x-60,305,x+120,305,'#344650',4)}watch(bg,760,390,.70);antenna(bg,180,360,145)}
  function scene9(t){bg.fillStyle=grad(bg,0,0,0,H,'#17324d','#9ac2d5');bg.fillRect(0,0,W,H);ridge(bg,285,'#4f6d7c',140,120,8);ridge(bg,360,'#2f4b58',120,98,19);antenna(bg,485,455,330);radar(bg,435,210,45);radar(bg,545,255,34);for(let i=0;i<5;i++)watch(bg,40+i*205,445,.62);rockMass(bg,0,500,W,120,'#40505a')}
  function scene10(t){bg.fillStyle=grad(bg,0,0,0,H,'#100e18','#342a47');bg.fillRect(0,0,W,H);for(let x=0;x<W;x+=120){rr(bg,x+10,80,90,360,4,'#262536','#11121a',3);rr(bg,x+28,115,54,90,3,'#101219');glow(bg,x+55,160,25,x%240?'#8d67ff':'#ff6c55',.30)}pipe(bg,0,65,W,'#4d465d');pipe(bg,0,430,W,'#3d374b');for(let i=0;i<8;i++){glow(bg,90+i*120,385,25,'#b777ff',.28);el(bg,90+i*120,385,7,7,'#c996ff')}}
  function scene11(t){bg.fillStyle=grad(bg,0,0,0,H,'#13281f','#365f45');bg.fillRect(0,0,W,H);ridge(bg,330,'#203d30',95,110,12);bg.fillStyle='#254b3a';bg.fillRect(0,380,W,160);for(let i=0;i<12;i++){const x=i*86+(i%3)*15;el(bg,x,430+(i%2)*20,55,18,'#183b30');glow(bg,x+20,420,35,'#66ff9a',.12)}for(let i=0;i<7;i++){rr(bg,90+i*125,210+(i%2)*35,80,150,8,'#233b33','#4f765e',2);rr(bg,108+i*125,230+(i%2)*35,44,70,18,'#10201c');glow(bg,130+i*125,265+(i%2)*35,26,'#70ff9b',.18)}for(let i=0;i<6;i++)palm(bg,35+i*175,460,.7)}
  function scene12(t){bg.fillStyle=grad(bg,0,0,0,H,'#090a13','#2d1a36');bg.fillRect(0,0,W,H);glow(bg,480,245,230,'#ff4d77',.18);for(let i=0;i<8;i++){const a=i*Math.PI/4+t*.00012;const x=480+Math.cos(a)*240,y=250+Math.sin(a)*120;ln(bg,480,250,x,y,'#6e3f84',3,.28);el(bg,x,y,24,24,'#271b32','#85509a',2)}rr(bg,300,140,360,230,12,'#171624','#4b365c',4);el(bg,480,255,98,98,'#25162b','#6b3e7d',5);glow(bg,480,255,80,'#ff5d8b',.42);el(bg,480,255,34,34,'#ff607f','#ffd36d',3)}
  const scenes=[null,scene1,scene2,scene3,scene4,scene5,scene6,scene7,scene8,scene9,scene10,scene11,scene12];

  function groundPalette(n){if(n===1)return['#30271f','#6e5639','#c49254'];if(n===2||n===3)return['#243a36','#435b4d','#93b18a'];if(n===4||n===9)return['#4a3022','#80583b','#d09b61'];if(n===6)return['#344955','#617987','#e7f1f4'];if(n===7||n===10)return['#202529','#41494e','#bd7448'];if(n===11)return['#173327','#3f6248','#7bb66b'];if(n===12)return['#211727','#513457','#d95f7f'];return['#273139','#48555e','#8b9da5']}
  function drawTerrain(n){
    fg.clearRect(0,0,W,H);const p=groundPalette(n);
    for(const r of cap.platforms){
      if(r.w<=0||r.h<=0)continue;
      const y=r.y, h=Math.max(10,r.h);
      const q=grad(fg,0,y,0,y+h,p[2],p[0]);rr(fg,r.x,y,r.w,h,2,q,'rgba(10,15,18,.7)',2);
      fg.fillStyle='rgba(255,255,255,.15)';fg.fillRect(r.x,y,r.w,4);
      fg.fillStyle='rgba(0,0,0,.28)';for(let x=r.x+14;x<r.x+r.w-8;x+=31)fg.fillRect(x,y+9+(x%17),13,3);
      if(r.type==='ledge'&&r.w>95){
        const k=Math.floor((r.x+r.y)/70)%3;
        if(k===0){sandbags(fg,r.x+r.w*.58,y-4,4,.65)}
        else if(k===1){crate(fg,r.x+r.w*.70,y-28,.65)}
      }
    }
  }

  function shadow(c,x,y,rx,a=.38){el(c,x,y,rx,6,'rgba(0,0,0,'+a+')')}
  function drawHero(h,t){
    if(!h)return;const dir=Math.abs(aim.x)>.12?(aim.x>0?1:-1):facing;const cx=h.x+h.w/2,feet=h.y+h.h+8;const run=Math.sin(t*.018)*Math.min(1,Math.abs(heroSpeed)/3);const s=h.crouch?1.3:1.55;const ax=dir<0?-aim.x:aim.x,ang=Math.atan2(aim.y,Math.max(.08,ax));
    ag.save();ag.translate(cx,feet);ag.scale(dir*s,s);shadow(ag,0,3,27,.50);
    rr(ag,-20+run*3,-10,17,10,3,'#15191a','#050607',2);rr(ag,4-run*3,-10,17,10,3,'#15191a','#050607',2);
    poly(ag,[[-19,-41],[-3,-42],[1,-10],[-16,-10]],grad(ag,0,-42,0,-10,'#74814f','#2d3821'),'#172013',2);
    poly(ag,[[3,-42],[19,-40],[16,-10],[0,-10]],grad(ag,0,-42,0,-10,'#74814f','#2d3821'),'#172013',2);
    rr(ag,-20,-40,10,8,2,'#25321f');rr(ag,10,-40,10,8,2,'#25321f');
    el(ag,-21,-66,11,14,'#d38a54','#2b160d',2);el(ag,-17,-51,8,11,'#e09a62','#2b160d',2);
    el(ag,21,-64,11,14,'#cf8450','#2b160d',2);ln(ag,-26,-69,-21,-60,'#ffc08a',2,.45);
    poly(ag,[[-21,-69],[-9,-77],[9,-77],[22,-67],[17,-40],[-17,-40]],grad(ag,0,-77,0,-39,'#778952','#2c3a25'),'#12170f',2.5);
    rr(ag,-6,-71,12,30,2,'#1c271a');rr(ag,-16,-60,8,12,2,'#899a5a');rr(ag,8,-60,8,12,2,'#899a5a');rr(ag,-18,-43,36,8,2,'#141b13');rr(ag,-3,-43,8,8,1,'#b78439','#4d3418',1);
    rr(ag,-6,-84,12,11,3,'#bd7041','#32180e',2);el(ag,1,-94,14,15,'#dd9157','#32180e',2.4);
    poly(ag,[[8,-94],[17,-89],[12,-82],[5,-82]],'#bd6c40');ag.fillStyle='#342016';ag.fillRect(6,-98,8,2);ag.fillRect(7,-89,7,2);ag.fillStyle='#f5d6ad';ag.fillRect(8,-97,2,2);
    poly(ag,[[-13,-98],[-8,-108],[-1,-103],[5,-110],[10,-102],[16,-99],[13,-91],[-12,-91]],'#4b2114','#211009',2);rr(ag,-13,-100,28,5,1,'#d43c2b','#5c160f',1);poly(ag,[[-10,-97],[-28,-90],[-18,-82],[-6,-91]],'#d83f2d','#5c160f',1);
    ag.save();ag.translate(0,-62);ag.rotate(ang);el(ag,10,3,9,7,'#d58b54','#28140c',2);el(ag,23,2,8,6,'#cb7a49','#28140c',2);rr(ag,22,-8,13,13,2,'#222827','#090b0c',2);
    rr(ag,32,-10,50,20,3,grad(ag,32,-10,82,10,'#7c8582','#171c1d'),'#07090a',2);rr(ag,44,8,11,14,2,'#79502b','#15100c',1.5);rr(ag,42,-16,18,6,2,'#252d2d','#080a0b',1.3);ag.fillStyle='#111516';ag.fillRect(78,-6,32,10);ag.fillStyle='#a4b0ad';ag.fillRect(35,-4,26,3);ag.fillRect(82,-2,20,3);ag.fillStyle='#d5a84b';ag.fillRect(61,-4,6,6);ag.restore();
    ag.restore();
  }
  function soldierPalette(n){if(n===6)return['#8b9b9d','#c2ced0','#2a3336'];if(n===4||n===9)return['#7d694b','#a88a5d','#2d251b'];if(n===7||n===10)return['#665c54','#8a7665','#292725'];if(n>=11)return['#544b60','#7a6983','#27212e'];return['#596a3f','#7e8e56','#222a1b']}
  function drawSoldier(e,t,heavy=false,bunkerMan=false){
    const n=levelNo(),pal=soldierPalette(n),cx=e.x+e.w/2,feet=e.y+e.h+7,s=heavy?1.25:1.05,dir=(cap.hero&&cap.hero.x<e.x)?-1:1,run=Math.sin(t*.015+e.x*.04)*.9;
    ag.save();ag.translate(cx,feet);ag.scale(dir*s,s);shadow(ag,0,3,20,.42);
    rr(ag,-14+run*2,-8,12,8,3,'#14191a','#060708',1.5);rr(ag,3-run*2,-8,12,8,3,'#14191a','#060708',1.5);
    poly(ag,[[-13,-34],[-2,-35],[1,-8],[-11,-8]],pal[0],'#141a13',1.7);poly(ag,[[2,-35],[13,-34],[11,-8],[0,-8]],pal[0],'#141a13',1.7);
    poly(ag,[[-15,-57],[-7,-64],[8,-64],[16,-57],[13,-33],[-12,-33]],grad(ag,0,-64,0,-33,pal[1],pal[0]),'#121710',2);
    rr(ag,-5,-59,10,24,2,pal[2]);rr(ag,-13,-50,7,10,2,'#2e3a27');rr(ag,6,-50,7,10,2,'#2e3a27');
    el(ag,0,-72,11,12,'#bd8657','#2a1b12',2);poly(ag,[[-12,-75],[-8,-84],[9,-84],[13,-75],[8,-70],[-9,-70]],'#36462d','#151b12',2);rr(ag,-9,-78,18,5,2,'#465a39');
    ag.save();ag.translate(1,-53);const ang=cap.hero?Math.atan2((cap.hero.y-e.y)*.5,(cap.hero.x-e.x)*dir):0;ag.rotate(ang);el(ag,8,3,7,5,'#ba7e51','#26170f',1.5);rr(ag,15,-6,11,10,2,'#1e2422');rr(ag,23,-7,40,14,2,grad(ag,23,-7,63,7,'#59635f','#171c1d'),'#080a0b',1.7);ag.fillStyle='#111516';ag.fillRect(60,-4,24,8);ag.fillStyle='#9ca9a5';ag.fillRect(29,-2,20,2);ag.restore();
    if(heavy){rr(ag,-20,-60,8,20,2,'#4f5e42');rr(ag,12,-60,8,20,2,'#4f5e42')}
    ag.restore();
  }
  function drawDrone(e,t){const cx=e.x+e.w/2,cy=e.y+e.h/2;ag.save();ag.translate(cx,cy);shadow(ag,0,18,22,.24);glow(ag,0,1,27,'#ff3c38',.18);rr(ag,-22,-10,44,24,8,grad(ag,-22,-10,22,14,'#596168','#151a1e'),'#080b0d',2);el(ag,4,0,8,8,'#e63d38','#2e0808',2);rr(ag,-6,12,12,14,3,'#30383d','#111417',1.5);ln(ag,-35,-15,35,-15,'#41484d',4);for(let i=0;i<2;i++){const x=i?27:-27;ag.save();ag.translate(x,-15);ag.rotate(t*.02*(i?1:-1));ln(ag,-18,0,18,0,'#879197',3);ag.restore()}ag.restore()}
  function drawTurret(e){const cx=e.x+e.w/2,feet=e.y+e.h+5;ag.save();ag.translate(cx,feet);shadow(ag,0,3,20,.4);rr(ag,-21,-18,42,18,4,'#343e3d','#121716',2);rr(ag,-14,-32,28,16,6,'#5b665c','#171c18',2);el(ag,0,-25,6,6,'#d54b42','#4c1511',1.5);rr(ag,12,-29,34,8,3,'#171c1d','#080a0b',1.5);ag.restore()}
  function drawBoss(b,t){if(!b)return;const cx=b.x+b.w/2,cy=b.y+b.h/2;ag.save();ag.translate(cx,cy);glow(ag,0,0,85,'#ff4f78',.18);rr(ag,-58,-58,116,116,18,grad(ag,-58,-58,58,58,'#74647f','#211a2a'),'#120d17',4);rr(ag,-44,-44,88,88,14,'#2a2634','#9781a3',3);el(ag,0,0,22,22,'#ff5277','#ffd05d',4);for(let i=0;i<4;i++){const a=t*.001+i*Math.PI/2;const x=Math.cos(a)*68,y=Math.sin(a)*52;rr(ag,x-12,y-12,24,24,7,'#4f445a','#17121c',2);ln(ag,x,y,x+Math.cos(a)*26,y+Math.sin(a)*26,'#7b6a88',5)}ag.restore()}
  function drawActors(t){
    ag.clearRect(0,0,W,H);
    drawHero(cap.hero,t);
    const seen=new Set();
    for(const e of cap.enemies){
      const key=e.type+':'+Math.round(e.x/3)+':'+Math.round(e.y/3);
      if(seen.has(key))continue;seen.add(key);
      if(e.type==='drone')drawDrone(e,t);else if(e.type==='turret')drawTurret(e);else drawSoldier(e,t,e.type==='heavy',e.type==='bunker');
    }
    drawBoss(cap.boss,t);
  }
  function drawScene(t){
    bg.clearRect(0,0,W,H);const n=levelNo();(scenes[n]||scene1)(t);
    bg.save();const q=bg.createRadialGradient(W*.5,H*.45,80,W*.5,H*.5,W*.66);q.addColorStop(0,'rgba(0,0,0,0)');q.addColorStop(.75,'rgba(0,0,0,.06)');q.addColorStop(1,'rgba(0,0,0,.45)');bg.fillStyle=q;bg.fillRect(0,0,W,H);bg.restore();
    objective.querySelector('span').textContent=objectiveText(level());
  }
  function loop(t){drawScene(t);drawTerrain(levelNo());drawActors(t);requestAnimationFrame(loop)}
  requestAnimationFrame(loop);

  document.documentElement.dataset.steelVisual='1.6.0';
})();
