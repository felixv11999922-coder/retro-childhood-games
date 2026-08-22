'use strict';
(function(){
  const canvas=document.getElementById('gameCanvas');
  const wrap=document.querySelector('.canvasWrap');
  const levelEl=document.getElementById('level');
  if(!canvas||!wrap||!levelEl)return;

  const levels=window.SteelAssaultLevels||[];
  let objective=document.getElementById('steelMissionObjective');
  if(!objective){
    objective=document.createElement('div');
    objective.id='steelMissionObjective';
    objective.setAttribute('aria-hidden','true');
    wrap.appendChild(objective);
  }
  const objectives={
    1:'Зачистить аванпост',2:'Удержать речной перевал',3:'Добраться до командного узла',
    4:'Вывести из строя радар B-17',5:'Прорваться через Бункер-7',6:'Захватить ледяную базу',
    7:'Остановить завод прессов',8:'Пересечь небесный мост',9:'Отключить башню связи',
    10:'Погасить реакторный коридор',11:'Уничтожить живую матрицу',12:'Ликвидировать Командный нуль'
  };
  function syncObjective(){
    const n=Math.max(1,parseInt(levelEl.textContent||'1',10)||1);
    objective.innerHTML='<b>МИССИЯ '+String(n).padStart(2,'0')+'</b><span>'+(objectives[n]||(levels[n-1]?.name||''))+'</span>';
  }
  syncObjective();
  try{new MutationObserver(syncObjective).observe(levelEl,{childList:true,characterData:true,subtree:true})}catch{}

  // The title belongs to the catalog/menu, not to the battlefield.
  const proto=CanvasRenderingContext2D.prototype;
  const previousFillText=proto.fillText;
  proto.fillText=function(text,x,y,maxWidth){
    if(this.canvas===canvas){
      const s=String(text||'').trim().toUpperCase();
      if(s.includes('СТАЛЬНОЙ ДЕСАНТ')||s.includes('RETRO GAMES PLAY'))return;
    }
    return previousFillText.call(this,text,x,y,maxWidth);
  };

  function hideBattlefieldTitles(){
    document.querySelectorAll('.canvasWrap *').forEach(el=>{
      if(el.children.length===0&&/^\s*(СТАЛЬНОЙ\s+ДЕСАНТ|RETRO\s+GAMES\s+PLAY(?:\s*·\s*GAME\s*02)?)\s*$/i.test(el.textContent||''))el.style.display='none';
    });
  }
  hideBattlefieldTitles();
  try{new MutationObserver(hideBattlefieldTitles).observe(wrap,{childList:true,subtree:true})}catch{}

  ['pad','jump','fire','pause','gameBack'].forEach(id=>{
    const el=document.getElementById(id);if(el){el.style.pointerEvents='auto';el.style.touchAction='none'}
  });
  document.documentElement.dataset.steelVisual='remaster-v3';
})();
