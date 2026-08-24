'use strict';
(function(){
  const A=window.SAV8;if(!A)return;
  const {ctx}=A;
  const base=A.render;
  if(typeof base!=='function')return;

  function line(x1,y1,x2,y2,w,c){ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.lineWidth=w;ctx.strokeStyle=c;ctx.stroke()}
  function worldX(wx,par=1){return wx-A.S.cam*par}
  function seed(n){const x=Math.sin(n*91.731)*43758.5453;return x-Math.floor(x)}

  function coast(){
    const g=A.ground(A.S.cam+A.VW*.5);
    for(let i=0;i<12;i++){
      const wx=Math.floor(A.S.cam/260)*260+i*260+80;
      const x=worldX(wx,.9);if(x<-80||x>A.VW+80)continue;
      ctx.fillStyle='rgba(29,73,49,.76)';
      for(let j=0;j<5;j++)line(x+j*7,g-4,x-16+j*8,g-42-seed(i*7+j)*30,4,'rgba(35,92,58,.8)');
    }
    ctx.fillStyle='rgba(224,197,139,.18)';ctx.fillRect(0,g-7,A.VW,7);
    const sunX=A.VW*.18,sunY=A.VH*.24;
    const rg=ctx.createRadialGradient(sunX,sunY,10,sunX,sunY,190);rg.addColorStop(0,'rgba(255,219,125,.22)');rg.addColorStop(1,'rgba(255,219,125,0)');ctx.fillStyle=rg;ctx.fillRect(0,0,A.VW,A.VH*.55);
  }
  function rain(){
    ctx.save();ctx.globalAlpha=.18;for(let i=0;i<70;i++){const x=(i*137+A.S.t*420)%A.VW,y=(i*83+A.S.t*760)%A.VH;line(x,y,x-10,y+38,2,'#d9e9ff')}ctx.restore();
  }
  function snow(){
    ctx.save();for(let i=0;i<56;i++){const x=(i*149+A.S.t*(22+i%5))%A.VW,y=(i*91+A.S.t*(55+i%7))%A.VH;ctx.globalAlpha=.28+(i%4)*.08;ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(x,y,1.4+(i%3),0,Math.PI*2);ctx.fill()}ctx.restore();
  }
  function swamp(){
    const g=A.ground(A.S.cam+A.VW*.5);ctx.save();for(let i=0;i<9;i++){const x=(i*173-A.S.cam*.24)%(A.VW+220)-80,y=g-100-(i%3)*45;const r=50+(i%4)*14;const q=ctx.createRadialGradient(x,y,0,x,y,r);q.addColorStop(0,'rgba(79,255,140,.11)');q.addColorStop(1,'rgba(79,255,140,0)');ctx.fillStyle=q;ctx.fillRect(x-r,y-r,r*2,r*2)}ctx.restore();
  }
  function factory(){
    const g=A.ground(A.S.cam+A.VW*.5);ctx.save();ctx.globalAlpha=.34;for(let i=0;i<8;i++){const wx=Math.floor(A.S.cam/410)*410+i*410+170,x=worldX(wx,.92);line(x,g-220,x,g-16,7,'#151a20');line(x,g-220,x+80,g-220,7,'#151a20');line(x+80,g-220,x+80,g-110,7,'#151a20');ctx.fillStyle='rgba(239,113,65,.15)';ctx.fillRect(x+10,g-205,58,24)}ctx.restore();
  }
  function foreground(){
    const t=A.meta().theme,g=A.ground(A.S.cam+A.VW*.5);
    // Near silhouettes give the level a stronger depth cue while leaving the
    // player and collision layer untouched.
    ctx.save();
    ctx.fillStyle=t==='snow'?'rgba(20,34,46,.22)':t==='swamp'?'rgba(4,28,15,.24)':'rgba(3,8,13,.22)';
    for(let i=0;i<7;i++){
      const wx=Math.floor(A.S.cam/360)*360+i*360+60;
      const x=worldX(wx,1.08);if(x<-160||x>A.VW+160)continue;
      const h=28+seed(i+Math.floor(A.S.cam/360))*58,w=90+seed(i*3+2)*90;
      ctx.beginPath();ctx.moveTo(x-w*.5,A.VH);ctx.lineTo(x-w*.3,g+25);ctx.lineTo(x,g-h);ctx.lineTo(x+w*.3,g+20);ctx.lineTo(x+w*.5,A.VH);ctx.closePath();ctx.fill();
    }
    ctx.restore();
  }
  function vignette(){
    const q=ctx.createRadialGradient(A.VW*.5,A.VH*.5,A.VH*.25,A.VW*.5,A.VH*.5,Math.max(A.VW,A.VH)*.72);q.addColorStop(.58,'rgba(0,0,0,0)');q.addColorStop(1,'rgba(0,0,0,.25)');ctx.fillStyle=q;ctx.fillRect(0,0,A.VW,A.VH);
  }

  A.render=function(){
    base();
    if(A.S.mode==='menu')return;
    const t=A.meta().theme;
    if(t==='coast'||t==='river'||t==='waterfall')coast();
    if(t==='factory'||t==='reactor')factory();
    if(t==='factory'||t==='city'||t==='reactor')rain();
    if(t==='snow')snow();
    if(t==='swamp')swamp();
    foreground();
    vignette();
  };
})();
