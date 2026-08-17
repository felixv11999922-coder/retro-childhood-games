'use strict';
(function(){
  const game=document.getElementById('game');
  const canvas=document.getElementById('c');
  if(!game||!canvas)return;

  const root=document.documentElement;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const ZMIN=.62,ZMAX=1.65;

  // v15.3: viewport state is intentionally NOT persisted. A previous pinch must
  // never make the next game open tiny, enlarged or shifted off-centre.
  for(const k of ['retroBoardZoom','retroBoardPanX','retroBoardPanY']){
    try{localStorage.removeItem(k)}catch{}
  }

  let zoom=1,panX=0,panY=0;
  const points=new Map();
  let gesture=null,lastTwoFingerTap=0,hideTimer=0;

  const indicator=document.createElement('div');
  indicator.id='zoomIndicator';
  indicator.setAttribute('aria-live','polite');
  game.appendChild(indicator);

  function boardCssSize(){
    const s=parseFloat(getComputedStyle(canvas).width);
    return Number.isFinite(s)&&s>0?s:600;
  }
  function panLimits(z=zoom){
    if(z<=1.02)return {x:0,y:0};
    const size=boardCssSize()*z;
    // Allow useful inspection movement, but keep a large part of the board visible.
    const soft=Math.min(210,Math.max(45,size*.18));
    const vw=window.innerWidth||1024,vh=window.innerHeight||768;
    return {x:Math.min(soft,vw*.20),y:Math.min(soft,vh*.22)};
  }
  function normalizePan(){
    const lim=panLimits();
    panX=clamp(panX,-lim.x,lim.x);
    panY=clamp(panY,-lim.y,lim.y);
    if(zoom<=1.02){panX=0;panY=0}
  }
  function apply(show=false){
    normalizePan();
    root.style.setProperty('--board-zoom',String(zoom));
    root.style.setProperty('--board-pan-x',panX+'px');
    root.style.setProperty('--board-pan-y',panY+'px');
    if(show)showIndicator();
  }
  function showIndicator(text){
    indicator.textContent=text||`Масштаб ${Math.round(zoom*100)}%`;
    indicator.classList.add('show');
    clearTimeout(hideTimer);
    hideTimer=setTimeout(()=>indicator.classList.remove('show'),900);
  }
  function resetView(show=true){
    zoom=1;panX=0;panY=0;gesture=null;points.clear();apply(show);
    if(show)showIndicator('100% · по центру');
  }
  function pair(){return Array.from(points.values()).slice(0,2)}
  function distance(a,b){return Math.hypot(b.x-a.x,b.y-a.y)}
  function midpoint(a,b){return {x:(a.x+b.x)/2,y:(a.y+b.y)/2}}

  function beginGesture(){
    const p=pair();if(p.length<2)return;
    const mid=midpoint(p[0],p[1]);
    gesture={startDist:Math.max(12,distance(p[0],p[1])),startZoom:zoom,startPanX:panX,startPanY:panY,startMid:mid,startTime:performance.now(),maxMove:0,maxScaleDelta:0};
    showIndicator();
  }
  function updateGesture(){
    if(!gesture||points.size<2)return;
    const p=pair(),dist=Math.max(12,distance(p[0],p[1])),mid=midpoint(p[0],p[1]);
    const ratio=dist/gesture.startDist;
    zoom=clamp(gesture.startZoom*ratio,ZMIN,ZMAX);
    const dx=mid.x-gesture.startMid.x,dy=mid.y-gesture.startMid.y;

    // Pan becomes active only after a deliberate movement. Tiny iPad pointer jitter
    // during pinch no longer drags the whole board away from centre.
    const movement=Math.hypot(dx,dy);
    if(movement>12){
      panX=gesture.startPanX+dx;
      panY=gesture.startPanY+dy;
    }
    gesture.maxMove=Math.max(gesture.maxMove,movement);
    gesture.maxScaleDelta=Math.max(gesture.maxScaleDelta,Math.abs(zoom-gesture.startZoom));
    apply(true);
  }
  function finishGesture(cancelled=false){
    if(!gesture)return;
    const g=gesture;gesture=null;
    normalizePan();apply(false);
    if(cancelled)return;
    const duration=performance.now()-g.startTime;
    const isTap=duration<300&&g.maxMove<18&&g.maxScaleDelta<.035;
    if(isTap){
      const now=performance.now();
      if(now-lastTwoFingerTap<430){lastTwoFingerTap=0;resetView(true)}
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

  canvas.addEventListener('wheel',e=>{
    if(!(e.ctrlKey||e.metaKey))return;
    e.preventDefault();
    zoom=clamp(zoom*(e.deltaY>0?.94:1.06),ZMIN,ZMAX);
    apply(true);
  },{passive:false});

  // Every new campaign starts from one deterministic camera state.
  const play=document.getElementById('play');
  if(play)play.addEventListener('click',()=>setTimeout(()=>resetView(false),0),true);
  window.addEventListener('pageshow',()=>{if(!document.body.classList.contains('playing'))resetView(false)},{passive:true});
  window.addEventListener('resize',()=>{normalizePan();apply(false)},{passive:true});
  window.addEventListener('orientationchange',()=>setTimeout(()=>{normalizePan();apply(false)},180),{passive:true});

  window.resetBoardView=resetView;
  resetView(false);
  console.info('Tank Base v15.3: stable transient pinch zoom + bounded two-finger pan active');
})();
