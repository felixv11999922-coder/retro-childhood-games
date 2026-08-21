'use strict';
(function(){
  if(window.__RGP_ANALYTICS_INIT__)return;
  window.__RGP_ANALYTICS_INIT__=true;

  const SUPABASE_URL='https://kexfusnwcxqbshpwlshx.supabase.co';
  const API_KEY='sb_publishable_dvhExwtVNoB6V6z9QBM2qg_EPOO9sSB';
  const ENDPOINT=SUPABASE_URL+'/rest/v1/analytics_events';
  const SESSION_ID=(crypto.randomUUID?crypto.randomUUID():String(Date.now())+'-'+Math.random().toString(36).slice(2));
  const BALANCE_VERSION='rebalance_2';
  let userKeyPromise=null;
  let wasPlaying=false;
  let lastAttemptKey='';
  let lastAttemptAt=0;
  let resultTrackedForVisibleCycle=false;
  let resultTimer=0;
  const startedLevels=new Set();

  function levelNumber(){
    const text=document.getElementById('level')?.textContent||'';
    const n=parseInt(text,10);
    return Number.isFinite(n)?n:null;
  }

  function cleanSource(value){
    const s=String(value||'').trim().replace(/[^a-zA-Z0-9_.-]/g,'_').slice(0,120);
    return s||null;
  }

  function tgWebAppStartParam(){
    try{
      const tg=window.Telegram?.WebApp;
      const qs=new URLSearchParams(location.search);
      return cleanSource(
        tg?.initDataUnsafe?.start_param ||
        qs.get('tgWebAppStartParam') ||
        qs.get('startapp') ||
        qs.get('start_param') ||
        ''
      );
    }catch{return null}
  }

  function initAttribution(){
    const incoming=tgWebAppStartParam();
    let first=null,last=null;
    try{
      first=cleanSource(localStorage.getItem('rgp_first_touch'));
      last=cleanSource(localStorage.getItem('rgp_last_touch'));
      if(!first){
        first=incoming||'telegram_direct';
        localStorage.setItem('rgp_first_touch',first);
      }
      if(incoming){
        last=incoming;
        localStorage.setItem('rgp_last_touch',last);
      }else if(!last){
        last=first;
        localStorage.setItem('rgp_last_touch',last);
      }
    }catch{
      first=first||incoming||'telegram_direct';
      last=incoming||last||first;
    }
    return {incoming,firstTouch:first||'telegram_direct',lastTouch:last||first||'telegram_direct'};
  }

  const ATTRIBUTION=initAttribution();
  window.rgpAttribution={
    startParam:ATTRIBUTION.incoming,
    firstTouch:ATTRIBUTION.firstTouch,
    lastTouch:ATTRIBUTION.lastTouch
  };

  function sourceName(){return ATTRIBUTION.firstTouch||'telegram_direct'}

  async function sha256(value){
    if(!crypto?.subtle)return value;
    const data=new TextEncoder().encode(value);
    const digest=await crypto.subtle.digest('SHA-256',data);
    return Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,'0')).join('');
  }

  function visitorSeed(){
    try{
      const tgId=window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
      if(tgId)return 'tg:'+String(tgId)+':retro-games-play';
    }catch{}
    let id=localStorage.getItem('rgp_visitor_id');
    if(!id){id=crypto.randomUUID?crypto.randomUUID():String(Date.now())+'-'+Math.random().toString(36).slice(2);localStorage.setItem('rgp_visitor_id',id)}
    return 'web:'+id+':retro-games-play';
  }

  function userKey(){
    userKeyPromise ||= sha256(visitorSeed());
    return userKeyPromise;
  }

  async function track(eventName,extra={}){
    try{
      const hasLevel=Object.prototype.hasOwnProperty.call(extra,'level');
      const payload={
        event_name:String(eventName).slice(0,64),
        user_key:await userKey(),
        game_id:'tanks',
        level:hasLevel?extra.level:levelNumber(),
        source:sourceName(),
        session_id:SESSION_ID,
        metadata:{
          telegram:!!window.Telegram?.WebApp?.initData,
          platform:window.Telegram?.WebApp?.platform||'web',
          tgWebAppStartParam:ATTRIBUTION.incoming,
          first_touch:ATTRIBUTION.firstTouch,
          last_touch:ATTRIBUTION.lastTouch,
          balance_version:BALANCE_VERSION,
          analytics_version:'1.2.0',
          ...extra.metadata
        }
      };
      fetch(ENDPOINT,{
        method:'POST',
        headers:{'apikey':API_KEY,'Authorization':'Bearer '+API_KEY,'Content-Type':'application/json','Prefer':'return=minimal'},
        body:JSON.stringify(payload),
        keepalive:true
      }).catch(()=>{});
    }catch(e){console.debug('analytics skipped',e)}
  }
  window.rgpTrack=track;

  function inspectResult(){
    const over=document.getElementById('over');
    if(!over)return;
    if(over.classList.contains('hidden')){
      resultTrackedForVisibleCycle=false;
      return;
    }
    if(resultTrackedForVisibleCycle)return;
    const badge=(document.getElementById('resultBadge')?.textContent||'').trim().toLowerCase();
    const title=(document.getElementById('resultTitle')?.textContent||'').trim();
    const lvl=levelNumber();
    if(!badge)return;
    if(badge.includes('уровень пройден')){
      resultTrackedForVisibleCycle=true;
      track('level_complete',{level:lvl});
    }else if(badge.includes('поражение')){
      resultTrackedForVisibleCycle=true;
      track('defeat',{level:lvl,metadata:{title}});
    }
  }

  function scheduleResultInspection(){
    const over=document.getElementById('over');
    if(over?.classList.contains('hidden')){
      resultTrackedForVisibleCycle=false;
      clearTimeout(resultTimer);
      return;
    }
    clearTimeout(resultTimer);
    resultTimer=setTimeout(inspectResult,35);
  }

  function isPlaying(){
    return document.body.classList.contains('playing') && !document.getElementById('game')?.classList.contains('hidden');
  }

  function trackAttempt(){
    if(!isPlaying())return;
    const over=document.getElementById('over');
    if(over&&!over.classList.contains('hidden'))return;
    const lvl=levelNumber();
    if(!lvl)return;
    const now=Date.now();
    const key=SESSION_ID+':'+lvl;
    if(key===lastAttemptKey && now-lastAttemptAt<1000)return;
    lastAttemptKey=key;
    lastAttemptAt=now;
    track('level_attempt',{level:lvl});
  }

  function inspectLevelStart(){
    if(!isPlaying())return;
    const lvl=levelNumber();
    if(!lvl||startedLevels.has(lvl))return;
    startedLevels.add(lvl);
    track('level_start',{level:lvl});
  }

  function inspectPlaying(){
    const playing=isPlaying();
    if(playing&&!wasPlaying){
      const lvl=levelNumber()||1;
      track('game_start',{level:lvl});
      trackAttempt();
      inspectLevelStart();
    }
    wasPlaying=playing;
  }

  function init(){
    track('miniapp_open',{level:null});
    document.getElementById('share')?.addEventListener('click',()=>track('share_click',{level:null}),true);
    document.addEventListener('click',ev=>{
      // Reward-события пишет adsgram-reward.js: так мы не считаем быстрые
      // повторные тапы как отдельные рекламные намерения.
      if(ev.target?.closest?.('#primaryAction')) setTimeout(trackAttempt,160);
    },true);

    const over=document.getElementById('over');
    if(over)new MutationObserver(scheduleResultInspection).observe(over,{attributes:true,subtree:true,childList:true,characterData:true});

    wasPlaying=false;
    const bodyObserver=new MutationObserver(()=>setTimeout(()=>{inspectPlaying();inspectLevelStart()},0));
    bodyObserver.observe(document.body,{attributes:true,attributeFilter:['class']});
    const game=document.getElementById('game');
    if(game)new MutationObserver(()=>setTimeout(()=>{inspectPlaying();inspectLevelStart()},0)).observe(game,{attributes:true,attributeFilter:['class']});
    const level=document.getElementById('level');
    if(level)new MutationObserver(()=>setTimeout(inspectLevelStart,0)).observe(level,{subtree:true,childList:true,characterData:true});
    inspectPlaying();
    inspectLevelStart();
  }

  init();
})();
