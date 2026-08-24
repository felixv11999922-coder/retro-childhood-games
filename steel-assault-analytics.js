'use strict';
(function(){
 if(window.__SA_ANALYTICS_INIT__)return;window.__SA_ANALYTICS_INIT__=true;
 const SUPABASE_URL='https://kexfusnwcxqbshpwlshx.supabase.co';
 const API_KEY='sb_publishable_dvhExwtVNoB6V6z9QBM2qg_EPOO9sSB';
 const ENDPOINT=SUPABASE_URL+'/rest/v1/analytics_events';
 const SESSION_ID=crypto.randomUUID?crypto.randomUUID():String(Date.now())+'-'+Math.random().toString(36).slice(2);
 let userKeyPromise=null;
 function clean(v){const s=String(v||'').trim().replace(/[^a-zA-Z0-9_.-]/g,'_').slice(0,120);return s||null}
 function startParam(){try{const tg=window.Telegram?.WebApp,qs=new URLSearchParams(location.search);return clean(tg?.initDataUnsafe?.start_param||qs.get('tgWebAppStartParam')||qs.get('startapp')||qs.get('start_param')||'')}catch{return null}}
 const incoming=startParam();let first=incoming||'telegram_direct',last=incoming||'telegram_direct';try{first=clean(localStorage.getItem('rgp_first_touch'))||incoming||'telegram_direct';if(!localStorage.getItem('rgp_first_touch'))localStorage.setItem('rgp_first_touch',first);last=incoming||clean(localStorage.getItem('rgp_last_touch'))||first;if(incoming)localStorage.setItem('rgp_last_touch',incoming)}catch{}
 async function sha256(v){if(!crypto?.subtle)return v;const d=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(v));return Array.from(new Uint8Array(d)).map(b=>b.toString(16).padStart(2,'0')).join('')}
 function seed(){try{const id=window.Telegram?.WebApp?.initDataUnsafe?.user?.id;if(id)return 'tg:'+id+':retro-games-play'}catch{}let id=localStorage.getItem('rgp_visitor_id');if(!id){id=crypto.randomUUID?crypto.randomUUID():Date.now()+'-'+Math.random().toString(36).slice(2);localStorage.setItem('rgp_visitor_id',id)}return 'web:'+id+':retro-games-play'}
 function userKey(){userKeyPromise||=sha256(seed());return userKeyPromise}
 async function track(eventName,extra={}){try{const payload={event_name:String(eventName).slice(0,64),user_key:await userKey(),game_id:'steel_assault',level:Object.prototype.hasOwnProperty.call(extra,'level')?extra.level:null,source:first,session_id:SESSION_ID,metadata:{telegram:!!window.Telegram?.WebApp?.initData,platform:window.Telegram?.WebApp?.platform||'web',tgWebAppStartParam:incoming,first_touch:first,last_touch:last,game_version:'6.0.0',...extra.metadata}};fetch(ENDPOINT,{method:'POST',headers:{apikey:API_KEY,Authorization:'Bearer '+API_KEY,'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify(payload),keepalive:true}).catch(()=>{})}catch(e){console.debug('steel analytics skipped',e)}}
 window.saTrack=track;window.saAttribution={startParam:incoming,firstTouch:first,lastTouch:last};track('miniapp_open',{level:null});
})();