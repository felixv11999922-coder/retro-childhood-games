'use strict';
(function(){
  const GD=window.GameData;
  if(!GD||!Array.isArray(GD.CAMPAIGN_LEVELS)||!GD.ENEMY_TYPES)return;

  // Rebalance 2: первый уровень должен знакомить с управлением, а не отсеивать
  // новых игроков. Сложность плавно возвращается к исходной к 6-му уровню.
  const PROFILES={
    1:{maxActive:1,speed:.68,bullet:.58,fire:2.10,label:'onboarding'},
    2:{maxActive:2,speed:.80,bullet:.72,fire:1.70,label:'easy'},
    3:{maxActive:2,speed:.86,bullet:.80,fire:1.45,label:'easy-plus'},
    4:{maxActive:3,speed:.92,bullet:.88,fire:1.25,label:'normal-minus'},
    5:{maxActive:3,speed:.97,bullet:.95,fire:1.10,label:'normal-entry'}
  };
  const BASE_TYPES=['NORMAL','FAST','ARMORED','ASSAULT','ELITE'];

  function scaledType(baseName,levelId,p){
    const alias=`${baseName}_L${levelId}_R2`;
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
    level.balanceVersion='rebalance_2';
    const aliases={};
    for(const type of BASE_TYPES)aliases[type]=scaledType(type,level.id,p);
    level.waves=level.waves.map(wave=>wave.map(type=>aliases[type]||type));
  }

  window.RGPDifficultyRebalance={version:'1.1.0',balanceVersion:'rebalance_2',profiles:PROFILES};
  console.info('RGP rebalance_2 active: gentler levels 1-5; level 6+ unchanged');
})();
