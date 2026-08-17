'use strict';
(function(){
  const game=document.getElementById('game');
  const canvas=document.getElementById('c');
  if(!game||!canvas)return;

  const root=document.documentElement;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const ZMIN=.45,ZMAX=1.70,PAN_LIMIT=520;
  const storage={zoom:'retroBoardZoom',x:'retroBoardPanX',y:'retroBoardPanY'};
  const read=(k,fallback)=>{const n=parseFloat(localStorage.getItem(k));return Number.isFinite(n)?n:fallback};

  let zoom=clamp(read(storage.zoom,1),ZMIN,ZMAX);
  let panX=clamp(read(storage.x,0),-PAN_LIMIT,PAN_LIMIT);
  let panY=clamp(read(storage.y,0),-PAN_LIMIT,PAN_LIMIT);
  const points=new Map();
  let gesture=null,lastTwoFingerTap=0,hideTimer=0;

  const indicator=document.createElement('div');
  indicator.id='zoomIndicator';
  indicator.setAttribute('aria-live','polite');
  game.appendChild(indicator);

  function apply(show=false){
    root.style.setProperty('--board-zoom',String(zoom));
    root.style.setProperty('--board-pan-x',panX+'px');
    root.style.setProperty('--board-pan-y',panY+'px');
    localStorage.setItem(storage.zoom,String(zoom));
    localStorage.setItem(storage.x,String(panX));
    localStorage.setItem(storage.y,String(panY));
    if(show)showIndicator();
  }
  function showIndicator(text){
    indicator.textContent=text||`Масштаб ${Math.round(zoom*100)}%`;
    indicator.classList.add('show');
    clearTimeout(hideTimer);
    hideTimer=setTimeout(()=>indicator.classList.remove('show'),900);
  }
  function resetView(){
    zoom=1;panX=0;panY=0;apply(true);showIndicator('100% · по центру');
  }
  function pair(){return Array.from(points.values()).slice(0,2)}
  function distance(a,b){return Math.hypot(b.x-a.x,b.y-a.y)}
  function midpoint(a,b){return {x:(a.x+b.x)/2,y:(a.y+b.y)/2}}

  function beginGesture(){
    const p=pair();if(p.length<2)return;
    const mid=midpoint(p[0],p[1]);
    gesture={
      startDist:Math.max(8,distance(p[0],p[1])),
      startZoom:zoom,startPanX:panX,startPanY:panY,startMid:mid,
      startTime:performance.now(),maxMove:0,maxScaleDelta:0
    };
    showIndicator();
  }
  function updateGesture(){
    if(!gesture||points.size<2)return;
    const p=pair(),dist=Math.max(8,distance(p[0],p[1])),mid=midpoint(p[0],p[1]);
    const ratio=dist/gesture.startDist;
    zoom=clamp(gesture.startZoom*ratio,ZMIN,ZMAX);
    const dx=mid.x-gesture.startMid.x,dy=mid.y-gesture.startMid.y;
    panX=clamp(gesture.startPanX+dx,-PAN_LIMIT,PAN_LIMIT);
    panY=clamp(gesture.startPanY+dy,-PAN_LIMIT,PAN_LIMIT);
    gesture.maxMove=Math.max(gesture.maxMove,Math.hypot(dx,dy));
    gesture.maxScaleDelta=Math.max(gesture.maxScaleDelta,Math.abs(zoom-gesture.startZoom));
    apply(true);
  }
  function finishGesture(cancelled=false){
    if(!gesture)return;
    const g=gesture;gesture=null;
    if(cancelled)return;
    const duration=performance.now()-g.startTime;
    const isTap=duration<300&&g.maxMove<18&&g.maxScaleDelta<.035;
    if(isTap){
      const now=performance.now();
      if(now-lastTwoFingerTap<430){lastTwoFingerTap=0;resetView()}
      else lastTwoFingerTap=now;
    }
  }

  canvas.addEventListener('pointerdown',e=>{
    if(e.pointerType==='mouse')return;
    e.preventDefault();
    points.set(e.pointerId,{x:e.clientX,y:e.clientY});
    try{canvas.setPointerCapture(e.pointerId)}catch{}
    if(points.size===2)beginGesture();
  },{passive:false});

  canvas.addEventListener('pointermove',e=>{
    if(!points.has(e.pointerId))return;
    e.preventDefault();
    points.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(points.size>=2)updateGesture();
  },{passive:false});

  function endPointer(e,cancelled=false){
    if(!points.has(e.pointerId))return;
    e.preventDefault();
    const wasTwo=points.size===2;
    points.delete(e.pointerId);
    if(wasTwo)finishGesture(cancelled);
    try{if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId)}catch{}
  }
  canvas.addEventListener('pointerup',e=>endPointer(e,false),{passive:false});
  canvas.addEventListener('pointercancel',e=>endPointer(e,true),{passive:false});
  canvas.addEventListener('lostpointercapture',e=>{if(points.has(e.pointerId)){const wasTwo=points.size===2;points.delete(e.pointerId);if(wasTwo)finishGesture(true)}});
  canvas.addEventListener('contextmenu',e=>e.preventDefault());

  // Desktop/testing fallback: Ctrl/Cmd + wheel changes the same manual scale.
  canvas.addEventListener('wheel',e=>{
    if(!(e.ctrlKey||e.metaKey))return;
    e.preventDefault();
    zoom=clamp(zoom*(e.deltaY>0?.94:1.06),ZMIN,ZMAX);
    apply(true);
  },{passive:false});

  window.resetBoardView=resetView;
  apply(false);
  console.info('Tank Base v15.1: pinch zoom + two-finger pan active');
})();
