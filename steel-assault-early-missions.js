'use strict';
(function(){
  const wrap=document.querySelector('.canvasWrap');
  const gameCanvas=document.getElementById('gameCanvas');
  const levelEl=document.getElementById('level');
  const levelGrid=document.getElementById('levelGrid');
  if(!wrap||!gameCanvas||!levelEl)return;

  const W=480,H=270;
  const canvas=document.createElement('canvas');
  canvas.id='steelEarlyMissionArt';
  canvas.width=W;
  canvas.height=H;
  canvas.setAttribute('aria-hidden','true');
  wrap.insertBefore(canvas,gameCanvas);
  const ctx=canvas.getContext('2d');
  ctx.imageSmoothingEnabled=false;

  const tag=document.createElement('div');
  tag.id='steelMissionSceneTag';
  tag.setAttribute('aria-hidden','true');
  wrap.appendChild(tag);

  const levels=window.SteelAssaultLevels||[];
  const clouds=[
    {x:24,y:34,w:48,s:.8},{x:160,y:49,w:34,s:.55},{x:310,y:27,w:54,s:.7},{x:420,y:61,w:28,s:.45}
  ];
  const mist=Array.from({length:24},(_,i)=>({x:(i*71)%W,y:132+(i*37)%115,r:5+(i%5)*3,s:3+(i%7)}));
  const spray=Array.from({length:44},(_,i)=>({x:224+(i*17)%86,y:(i*29)%H,r:1+(i%3),s:14+(i%6)*5}));

  function currentLevel(){
    const n=Math.max(1,parseInt(levelEl.textContent||'1',10)||1);
    return levels[n-1]||null;
  }
  function sync(){
    const l=gameCanvas.offsetLeft,t=gameCanvas.offsetTop,w=gameCanvas.offsetWidth,h=gameCanvas.offsetHeight;
    canvas.style.left=l+'px';
    canvas.style.top=t+'px';
    canvas.style.width=w+'px';
    canvas.style.height=h+'px';
  }
  if(window.ResizeObserver)new ResizeObserver(sync).observe(gameCanvas);
  addEventListener('resize',sync,{passive:true});
  sync();

  function fillGrad(top,bottom){
    const g=ctx.createLinearGradient(0,0,0,H);
    g.addColorStop(0,top);g.addColorStop(1,bottom);
    ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  }
  function poly(fill,pts){
    ctx.fillStyle=fill;ctx.beginPath();ctx.moveTo(pts[0][0],pts[0][1]);
    for(let i=1;i<pts.length;i++)ctx.lineTo(pts[i][0],pts[i][1]);
    ctx.closePath();ctx.fill();
  }
  function line(stroke,width,pts){
    ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(pts[0][0],pts[0][1]);
    for(let i=1;i<pts.length;i++)ctx.lineTo(pts[i][0],pts[i][1]);
    ctx.stroke();
  }
  function glow(x,y,r,color,alpha=.28){
    ctx.save();ctx.globalAlpha=alpha;ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();ctx.restore();
  }
  function pine(x,y,s){
    ctx.fillStyle='#273728';ctx.fillRect(x-2,y-s*.08,4,s*.36);
    poly('#254631',[[x,y-s],[x-s*.20,y-s*.42],[x+s*.20,y-s*.42]]);
    poly('#31603c',[[x,y-s*.78],[x-s*.26,y-s*.20],[x+s*.26,y-s*.20]]);
  }
  function tower(x,y,h){
    ctx.fillStyle='#1b2428';ctx.fillRect(x,y,28,h);
    ctx.fillStyle='#39494b';ctx.fillRect(x+4,y+5,20,h-8);
    ctx.fillStyle='#0b1012';
    for(let yy=y+12;yy<y+h-8;yy+=15){ctx.fillRect(x+8,yy,5,6);ctx.fillRect(x+17,yy,5,6)}
  }
  function fence(y){
    ctx.strokeStyle='#66746f';ctx.lineWidth=1;
    for(let x=0;x<W;x+=16){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y+24);ctx.stroke()}
    line('#66746f',1,[[0,y+6],[W,y+6]]);line('#66746f',1,[[0,y+18],[W,y+18]]);
  }
  function sandbags(x,y,count){
    for(let i=0;i<count;i++){
      ctx.fillStyle=i%2?'#75664b':'#8c7959';
      ctx.fillRect(x+i*12,y-(i%2)*2,14,7);
      ctx.fillStyle='#3f392d';ctx.fillRect(x+i*12+2,y+1-(i%2)*2,10,1);
    }
  }

  function outpost(t){
    fillGrad('#10273a','#d69052');
    ctx.fillStyle='rgba(255,193,105,.45)';ctx.beginPath();ctx.arc(76,56,30,0,Math.PI*2);ctx.fill();
    poly('#364b52',[[0,160],[62,112],[104,146],[160,92],[216,151],[278,107],[332,150],[404,96],[480,145],[480,270],[0,270]]);
    poly('#243b35',[[0,182],[52,153],[114,176],[170,132],[238,178],[302,145],[356,176],[425,139],[480,169],[480,270],[0,270]]);
    for(let i=0;i<16;i++)pine(18+i*31,180-(i%4)*6,34+(i%5)*5);
    ctx.fillStyle='#353c38';ctx.fillRect(255,126,174,81);ctx.fillStyle='#58605a';ctx.fillRect(263,134,158,68);
    ctx.fillStyle='#13191a';for(let x=273;x<408;x+=27){ctx.fillRect(x,148,14,12);ctx.fillRect(x,176,14,12)}
    tower(178,118,88);tower(434,136,70);
    ctx.fillStyle='#202a2b';ctx.fillRect(186,106,12,18);line('#778b84',2,[[192,106],[192,69]]);
    line('#778b84',1,[[192,76],[171,91]]);line('#778b84',1,[[192,76],[213,91]]);
    ctx.fillStyle='#594736';ctx.fillRect(0,215,W,55);ctx.fillStyle='#806348';ctx.fillRect(0,215,W,5);
    fence(197);sandbags(72,209,8);sandbags(325,209,7);
    ctx.fillStyle='#a8b6ad';ctx.fillRect(230,192,46,20);ctx.fillStyle='#1b2322';ctx.fillRect(238,198,30,14);
    glow(446,148,7,'#ff4f43');glow(192,111,8,'#ffd65b');
    ctx.fillStyle='rgba(232,241,236,.13)';
    for(const c of clouds){const x=(c.x+t*c.s*.012)%(W+80)-40;ctx.fillRect(x,c.y,c.w,5);ctx.fillRect(x+8,c.y-4,c.w*.55,4)}
    ctx.save();ctx.globalAlpha=.07;
    poly('#fff7b1',[[188,112],[128,218],[228,218]]);poly('#fff7b1',[[448,146],[398,220],[475,220]]);
    ctx.restore();
  }

  function riverPass(t){
    fillGrad('#17334c','#9e7a5d');
    poly('#3f5260',[[0,144],[52,98],[98,142],[158,80],[218,146],[280,99],[337,144],[405,86],[480,139],[480,270],[0,270]]);
    poly('#46564d',[[0,168],[67,135],[132,166],[198,126],[255,169],[318,131],[390,165],[450,137],[480,153],[480,270],[0,270]]);
    for(let i=0;i<11;i++)pine(28+i*44,176-(i%3)*8,25+(i%4)*5);
    ctx.fillStyle='#163f56';ctx.fillRect(0,195,W,75);
    ctx.fillStyle='#2b6b84';ctx.fillRect(0,199,W,6);
    ctx.strokeStyle='rgba(131,211,235,.38)';ctx.lineWidth=1;
    for(let y=209;y<267;y+=11){
      ctx.beginPath();
      for(let x=-20;x<W+20;x+=34){const yy=y+Math.sin((x+t*.05+y)*.05)*2;ctx.moveTo(x,yy);ctx.lineTo(x+20,yy)}
      ctx.stroke();
    }
    ctx.fillStyle='#252d31';ctx.fillRect(0,177,160,15);ctx.fillRect(318,177,162,15);
    ctx.fillStyle='#4f5e63';for(let x=0;x<154;x+=25)ctx.fillRect(x,174,18,4);for(let x=324;x<480;x+=25)ctx.fillRect(x,174,18,4);
    line('#66757b',3,[[18,177],[74,133],[133,177]]);line('#66757b',3,[[346,177],[404,129],[464,177]]);
    line('#66757b',1,[[74,133],[74,177]]);line('#66757b',1,[[404,129],[404,177]]);
    ctx.fillStyle='#353d3d';ctx.fillRect(207,191,62,13);ctx.fillStyle='#606d68';ctx.fillRect(216,182,44,10);
    ctx.fillStyle='#181e20';ctx.fillRect(233,170,5,16);ctx.fillRect(229,168,14,3);
    sandbags(16,169,6);sandbags(394,169,6);
    tower(332,110,62);glow(346,121,7,'#ff594c');
    for(const m of mist){
      const x=(m.x+t*m.s*.006)%W;
      ctx.globalAlpha=.055;ctx.fillStyle='#d8eef2';ctx.beginPath();ctx.arc(x,m.y,m.r,0,Math.PI*2);ctx.fill();
    }
    ctx.globalAlpha=1;
  }

  function waterfallCitadel(t){
    fillGrad('#071d2e','#316273');
    poly('#183c48',[[0,0],[0,270],[118,270],[132,206],[108,164],[140,121],[118,78],[150,0]]);
    poly('#224c55',[[480,0],[480,270],[352,270],[340,214],[365,168],[338,124],[366,78],[338,0]]);
    ctx.fillStyle='#1b2b31';ctx.fillRect(54,78,86,128);ctx.fillRect(344,70,82,138);
    ctx.fillStyle='#41555a';ctx.fillRect(62,88,70,112);ctx.fillRect(352,80,66,122);
    ctx.fillStyle='#0b1418';for(let y=98;y<190;y+=25){ctx.fillRect(73,y,16,12);ctx.fillRect(104,y,16,12);ctx.fillRect(362,y,15,12);ctx.fillRect(393,y,15,12)}
    ctx.fillStyle='#bfeaf2';ctx.globalAlpha=.72;ctx.fillRect(158,0,49,270);ctx.fillRect(282,0,42,270);
    ctx.fillStyle='#6cc3dc';ctx.globalAlpha=.62;ctx.fillRect(165,0,11,270);ctx.fillRect(190,0,7,270);ctx.fillRect(291,0,8,270);ctx.fillRect(311,0,6,270);
    ctx.globalAlpha=1;
    ctx.fillStyle='#202d35';ctx.fillRect(205,98,78,128);ctx.fillStyle='#465762';ctx.fillRect(213,106,62,112);
    ctx.fillStyle='#11191f';ctx.fillRect(225,130,38,54);ctx.fillStyle='#6ed5e7';ctx.fillRect(232,137,24,5);
    ctx.fillStyle='#26343c';ctx.fillRect(188,206,112,20);ctx.fillStyle='#5c6f78';ctx.fillRect(188,204,112,4);
    line('#81959c',2,[[244,98],[244,53]]);line('#81959c',1,[[244,62],[224,79]]);line('#81959c',1,[[244,62],[264,79]]);
    glow(244,53,8,'#ff4d5d');glow(88,91,6,'#ffbd4f');glow(384,83,6,'#ffbd4f');
    ctx.fillStyle='#6d7d84';
    [[26,226,106],[84,186,90],[305,218,111],[328,160,91],[34,134,83],[352,115,78]].forEach(p=>{ctx.fillRect(p[0],p[1],p[2],5);ctx.fillStyle='#252f34';ctx.fillRect(p[0]+6,p[1]+5,p[2]-12,3);ctx.fillStyle='#6d7d84'});
    ctx.fillStyle='#14252b';ctx.fillRect(0,244,W,26);
    ctx.strokeStyle='rgba(228,250,255,.38)';ctx.lineWidth=1;
    for(let i=0;i<18;i++){
      const x=i%2?164+(i*13)%38:286+(i*17)%34;
      const y=(i*41+t*.06)%H;
      ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y+17);ctx.stroke();
    }
    ctx.fillStyle='rgba(232,252,255,.46)';
    for(const p of spray){
      const y=(p.y+t*p.s*.002)%(H+20)-10;
      ctx.beginPath();ctx.arc(p.x,y,p.r,0,Math.PI*2);ctx.fill();
    }
  }

  function vignette(){
    const g=ctx.createRadialGradient(W/2,H/2,75,W/2,H/2,300);
    g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(0,0,0,.36)');
    ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  }

  function draw(now){
    const lvl=currentLevel();
    const id=lvl?.id||0;
    if(id>=1&&id<=3){
      canvas.style.display='block';
      if(id===1)outpost(now);
      else if(id===2)riverPass(now);
      else waterfallCitadel(now);
      vignette();
      const names=['','ШТУРМ АВАНПОСТА','РЕЧНОЙ ПЕРЕВАЛ','ЦИТАДЕЛЬ ВОДОПАДА'];
      tag.textContent='МИССИЯ '+String(id).padStart(2,'0')+' · '+names[id];
      tag.classList.add('show');
    }else{
      ctx.clearRect(0,0,W,H);
      canvas.style.display='none';
      tag.classList.remove('show');
    }
    requestAnimationFrame(draw);
  }

  function enhanceMenu(){
    if(!levelGrid)return;
    const cards=levelGrid.querySelectorAll('.levelCard');
    cards.forEach((card,i)=>{
      const lvl=levels[i];
      if(!lvl?.description||card.querySelector('.missionDesc'))return;
      const p=document.createElement('p');
      p.className='missionDesc';
      p.textContent=lvl.description;
      card.appendChild(p);
    });
  }
  enhanceMenu();
  if(levelGrid&&window.MutationObserver){
    let queued=false;
    new MutationObserver(()=>{
      if(queued)return;
      queued=true;
      requestAnimationFrame(()=>{queued=false;enhanceMenu()});
    }).observe(levelGrid,{childList:true});
  }

  requestAnimationFrame(draw);
})();
