'use strict';
(function(){
  const levelEl=document.getElementById('level');
  if(!levelEl)return;
  function setImp(el,key,val){if(el)el.style.setProperty(key,val,'important')}
  function sync(){
    const n=Math.max(1,Math.min(12,parseInt(levelEl.textContent||'1',10)||1));
    const hasPhoto=!!(window.SteelAssaultSceneImages&&window.SteelAssaultSceneImages[n]);
    const photo=document.getElementById('saPhotoBg');
    const remaster=document.getElementById('steelSceneRemaster');
    const remasterFx=document.getElementById('steelSceneRemasterFx');
    if(hasPhoto){
      setImp(photo,'display','block');setImp(photo,'visibility','visible');setImp(photo,'opacity','1');
      setImp(remaster,'display','none');setImp(remaster,'visibility','hidden');setImp(remaster,'opacity','0');
    }else{
      setImp(photo,'display','none');setImp(photo,'visibility','hidden');setImp(photo,'opacity','0');
      setImp(remaster,'display','block');setImp(remaster,'visibility','visible');setImp(remaster,'opacity','1');
    }
    setImp(remasterFx,'display','block');setImp(remasterFx,'visibility','visible');
    ['steelCinematicActors','steelCharacterArt','steelCharacterRemaster','saV2Actors'].forEach(id=>{
      const el=document.getElementById(id);setImp(el,'display','none');setImp(el,'visibility','hidden');setImp(el,'opacity','0');
    });
    const actors=document.getElementById('saPhotoActors');
    const terrain=document.getElementById('saPhotoTerrain');
    [actors,terrain].forEach(el=>{setImp(el,'display','block');setImp(el,'visibility','visible');setImp(el,'opacity','1')});
    document.documentElement.dataset.steelVisual='photo-v43';
  }
  sync();
  try{new MutationObserver(sync).observe(levelEl,{childList:true,characterData:true,subtree:true})}catch{}
  let tries=0;const timer=setInterval(()=>{sync();if(++tries>20)clearInterval(timer)},120);
})();
