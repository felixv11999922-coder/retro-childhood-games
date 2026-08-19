'use strict';
(function(){
  const SUPABASE_URL='https://kexfusnwcxqbshpwlshx.supabase.co';
  const API_KEY='sb_publishable_dvhExwtVNoB6V6z9QBM2qg_EPOO9sSB';
  const ENDPOINT=SUPABASE_URL+'/rest/v1/analytics_events';
  const SESSION_ID=(crypto.randomUUID?crypto.randomUUID():String(Date.now())+'-'+Math.random().toString(36).slice(2));
  let userKeyPromise=null;
  let lastResultKey='';

  function levelNumber(){
    const text=document.getElementById('level')?.textContent||'';
    const n=parseInt(text,10);
    return Number.isFinite(n)?n:null;
  }

  function sourceName(){
    try{
      const tg=window.Telegram?.WebApp;
      return tg?.initDataUnsafe?.start_param || new URLSearchParams(location.search).get('startapp') || 'telegram';
    }catch{return 'telegram'}
  }

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
      const payload={
        event_name:String(eventName).slice(0,64),
        user_key:await userKey(),
        game_id:'tanks',
        level:extra.level??levelNumber(),
        source:sourceName(),
        session_id:SESSION_ID,
        metadata:{
          telegram:!!window.Telegram?.WebApp?.initData,
          platform:window.Telegram?.WebApp?.platform||'web',
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
    if(!over||over.classList.contains('hidden'))return;
    const badge=(document.getElementById('resultBadge')?.textContent||'').trim().toLowerCase();
    const title=(document.getElementById('resultTitle')?.textContent||'').trim();
    const lvl=levelNumber();
    const key=[badge,title,lvl].join('|');
    if(!badge||key===lastResultKey)return;
    lastResultKey=key;
    if(badge.includes('уровень пройден')) track('level_complete',{level:lvl});
    else if(badge.includes('поражение')) track('defeat',{level:lvl,metadata:{title}});
  }

  function init(){
    track('miniapp_open',{level:null});
    document.getElementById('play')?.addEventListener('click',()=>track('game_start',{level:1}),true);
    document.getElementById('share')?.addEventListener('click',()=>track('share_click',{level:null}),true);
    document.addEventListener('click',ev=>{
      if(ev.target?.closest?.('#rewardTry')) track('reward_click',{level:levelNumber()});
    },true);
    const over=document.getElementById('over');
    if(over)new MutationObserver(()=>setTimeout(inspectResult,0)).observe(over,{attributes:true,subtree:true,childList:true,characterData:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
