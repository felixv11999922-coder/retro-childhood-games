'use strict';
(function(){
  const GD=window.GameData;
  if(!GD||!Array.isArray(GD.CAMPAIGN_LEVELS)||!GD.ENEMY_TYPES)return;

  // Мягкий вход в кампанию. К 6-му уровню игра возвращается
  // к исходным характеристикам противников без дальнейших изменений.
  const PROFILES={
    1:{maxActive:2,speed:.78,bullet:.72,fire:1.65,label:'training'},
    2:{maxActive:2,speed:.85,bullet:.80,fire:1.45,label:'easy'},
    3:{maxActive:3,speed:.90,bullet:.87,fire:1.30,label:'easy-plus'},
    4:{maxActive:3,speed:.95,bullet:.93,fire:1.18,label:'normal-minus'},
    5:{maxActive:4,speed:.98,bullet:.97,fire:1.08,label:'normal-entry'}
  };
  const BASE_TYPES=['NORMAL','FAST','ARMORED','ASSAULT','ELITE'];

  function scaledType(baseName,levelId,p){
    const alias=`${baseName}_L${levelId}`;
    if(GD.ENEMY_TYPES[alias])return alias;
    const base=GD.ENEMY_TYPES[baseName];
    if(!base)return baseName;
    GD.ENEMY_TYPES[alias]={
      ...base,
      speed:Math.max(1,Math.round(base.speed*p.speed)),
      bulletSpeed:Math.max(1,Math.round(base.bulletSpeed*p.bullet)),
      fireInterval:base.fireInterval.map(v=>Number((v*p.fire).toFixed(2)))
    };
    return alias;
  }

  for(const level of GD.CAMPAIGN_LEVELS){
    const p=PROFILES[level.id];
    if(!p)continue;
    level.maxActive=p.maxActive;
    level.difficultyProfile=p.label;
    const aliases={};
    for(const type of BASE_TYPES)aliases[type]=scaledType(type,level.id,p);
    level.waves=level.waves.map(wave=>wave.map(type=>aliases[type]||type));
  }

  window.RGPDifficultyRebalance={version:'1.0.0',profiles:PROFILES};
  console.info('RGP early-level rebalance active: levels 1-5; level 6+ unchanged');
})();
