'use strict';
(function(){
  const A=window.SAV8;if(!A)return;

  function aspect(){
    const r=A.canvas.getBoundingClientRect();
    return r.height? r.width/r.height : 1;
  }
  function actorScale(){
    const q=aspect();
    if(q>=1.55)return 1.34;
    if(q>=1.25)return 1.24;
    if(q>=1.0)return 1.15;
    if(q<0.68)return .98;
    return 1.05;
  }
  function scaleEntity(e,k){
    if(!e||e._v82scaled)return;
    e._v82scaled=true;
    e.w=Math.round(e.w*k);
    e.h=Math.round(e.h*k);
    if(e.type!=='drone')e.y=A.ground(e.x)-e.h;
  }
  function tuneSpawn(){
    const S=A.S,k=actorScale();
    if(S.p){
      S.p.w=Math.round(112*k);
      S.p.h=Math.round(166*k);
      S.p.y=A.ground(S.p.x)-S.p.h;
      S.p.speed=365;
    }
    const enemyK=Math.max(1.05,k*.92);
    S.enemies.forEach(e=>scaleEntity(e,enemyK));

    // First missions should teach the controls, not instantly drain lives.
    if(S.i===0){
      S.enemies.forEach((e,n)=>{
        if(e.type==='rifle'||e.type==='runner'){e.hp=e.maxHp=1;e.cool=Math.max(e.cool,2.2+n*.08);e.speed=Math.min(e.speed,44)}
        if(e.type==='drone'){e.hp=e.maxHp=2;e.cool=Math.max(e.cool,2.25)}
        if(e.type==='turret'){e.hp=e.maxHp=2;e.cool=Math.max(e.cool,2.15)}
      });
    }else if(S.i===1){
      S.enemies.forEach(e=>{e.cool=Math.max(e.cool,1.85);if(e.type==='rifle')e.hp=e.maxHp=Math.min(e.maxHp,2)});
    }

    // Keep the opening 500 px readable and free from unfair instant hits.
    S.enemies=S.enemies.filter(e=>e.x>620);
  }

  const baseSpawn=A.spawn;
  A.spawn=function(){baseSpawn();tuneSpawn()};

  const baseResize=A.resize;
  A.resize=function(){
    baseResize();
    const q=aspect();
    document.documentElement.dataset.steelAspect=q>=1.2?'wide':q<.75?'portrait':'compact';
  };

  const baseUpdate=A.update;
  A.update=function(dt){
    baseUpdate(dt);
    const S=A.S;
    if(S.mode!=='play')return;

    // Tune bosses once when they are created by the core.
    if(S.boss&&!S.boss._v82tuned){
      S.boss._v82tuned=true;
      const k=Math.max(1.08,actorScale()*.92);
      scaleEntity(S.boss,k);
      const hp=12+S.i*2;
      S.boss.hp=S.boss.maxHp=hp;
      S.boss.cool=Math.max(S.boss.cool,1.05);
    }

    // Prevent a rare soft-lock when the player reaches the extraction edge
    // but floating point/clamping leaves him a few pixels short.
    if(S.extract&&S.p&&S.p.x>A.meta().length-190&&S.mode==='play')A.complete();
  };

  const oldDamage=A.damage;
  A.damage=function(){
    const S=A.S,p=S.p;
    if(p&&p.inv<=0&&S.mode==='play'){
      // Slightly longer invulnerability makes touch controls fairer.
      oldDamage();
      if(S.p)S.p.inv=Math.max(S.p.inv,1.75);
      return;
    }
    oldDamage();
  };

  addEventListener('resize',()=>setTimeout(A.resize,40),{passive:true});
  A.resize();
})();
