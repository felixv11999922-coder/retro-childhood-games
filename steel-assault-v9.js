'use strict';

/*
 * Steel Assault v9
 *
 * One engine owns the viewport, world coordinates, camera, physics and renderer.
 * Actor hitboxes are deliberately smaller than their visual sprites. The world
 * keeps a stable virtual height while its visible width follows the real canvas
 * aspect ratio, so nothing is stretched on iPhone, iPad or desktop Telegram.
 */
(function steelAssaultV9() {
  if (window.__STEEL_ASSAULT_V9__) return;
  window.__STEEL_ASSAULT_V9__ = true;

  const BUILD = '9.2.0';
  const WORLD_HEIGHT = 820;
  const START_X = 145;
  const TAU = Math.PI * 2;
  const $ = (id) => document.getElementById(id);

  const canvas = $('gameCanvas');
  const canvasWrap = document.querySelector('.canvasWrap');
  const ctx = canvas?.getContext('2d', { alpha: false });
  if (!canvas || !canvasWrap || !ctx) return;

  const UI = {
    menu: $('menu'),
    game: $('game'),
    score: $('score'),
    level: $('level'),
    lives: $('lives'),
    weapon: $('weapon'),
    bossHud: $('bossHud'),
    bossHp: $('bossHp'),
    toast: $('toast'),
    modal: $('modal'),
    modalTitle: $('modalTitle'),
    modalText: $('modalText'),
    modalPrimary: $('modalPrimary'),
    modalMenu: $('modalMenu'),
    pauseModal: $('pauseModal'),
    grid: $('levelGrid'),
    progress: $('progressText'),
    best: $('bestScore'),
    pad: $('pad'),
    stick: $('stick'),
    jump: $('jump'),
    fire: $('fire')
  };

  let objective = $('missionObjectiveV9');
  if (!objective) {
    objective = document.createElement('div');
    objective.id = 'missionObjectiveV9';
    objective.className = 'missionObjective';
    canvasWrap.appendChild(objective);
  }

  const LEVELS = [
    { id: 1, name: 'Зачистить аванпост', objective: 'ЗАЧИСТИТЬ АВАНПОСТ', theme: 'coast', length: 5400 },
    { id: 2, name: 'Речной перевал', objective: 'УДЕРЖАТЬ ПЕРЕПРАВУ', theme: 'river', length: 5650 },
    { id: 3, name: 'Цитадель водопада', objective: 'ВЗЯТЬ ЦИТАДЕЛЬ', theme: 'waterfall', length: 5900 },
    { id: 4, name: 'Каньон B-17', objective: 'ПРОРВАТЬ КАНЬОН B-17', theme: 'canyon', length: 6150 },
    { id: 5, name: 'Бункер-7', objective: 'ЗАЧИСТИТЬ БУНКЕР-7', theme: 'ruins', length: 6350 },
    { id: 6, name: 'Ледяной фронт', objective: 'ПРОЙТИ ЛЕДЯНОЙ ФРОНТ', theme: 'snow', length: 6550 },
    { id: 7, name: 'Завод прессов', objective: 'ОСТАНОВИТЬ ПРЕССЫ', theme: 'factory', length: 6750 },
    { id: 8, name: 'Небесный мост', objective: 'ПЕРЕЙТИ НЕБЕСНЫЙ МОСТ', theme: 'city', length: 6950 },
    { id: 9, name: 'Башня связи', objective: 'ЗАХВАТИТЬ БАШНЮ СВЯЗИ', theme: 'radio', length: 7150 },
    { id: 10, name: 'Реакторный коридор', objective: 'ОТКЛЮЧИТЬ РЕАКТОР', theme: 'reactor', length: 7350 },
    { id: 11, name: 'Живая матрица', objective: 'УНИЧТОЖИТЬ МАТРИЦУ', theme: 'swamp', length: 7550 },
    { id: 12, name: 'Последний протокол', objective: 'ОСТАНОВИТЬ ПРОТОКОЛ', theme: 'final', length: 7900 }
  ];

  const PALETTES = {
    coast: ['#f6b96e', '#7fa8b6', '#1a6375', '#0c2531'],
    river: ['#b0cbb5', '#538b78', '#22554d', '#102c2a'],
    waterfall: ['#c5dce5', '#6f99a8', '#2b5c6c', '#102d3a'],
    canyon: ['#e0a169', '#a55e47', '#66352c', '#24191d'],
    ruins: ['#aa8d7c', '#615158', '#342e38', '#15171d'],
    snow: ['#d3e7f2', '#829fb3', '#3c5870', '#122031'],
    factory: ['#7f6870', '#383843', '#1b222b', '#080f16'],
    city: ['#6b4e91', '#293e65', '#142745', '#070e1a'],
    radio: ['#d99d69', '#80534c', '#463035', '#17181f'],
    reactor: ['#758f80', '#30483f', '#153229', '#06130f'],
    swamp: ['#86a776', '#386342', '#173c25', '#06150e'],
    final: ['#a75a56', '#4c2c36', '#251724', '#080a11']
  };

  const MISSION_ONE_SECTIONS = [
    { x: 0, name: 'БЕРЕГОВАЯ ЗОНА' },
    { x: 700, name: 'ПЕРВЫЙ БУНКЕР' },
    { x: 1320, name: 'УКРЕПЛЁННЫЙ ДВОР' },
    { x: 2050, name: 'ВЫШКА СВЯЗИ' },
    { x: 2780, name: 'ВТОРОЙ РУБЕЖ' },
    { x: 3540, name: 'ТЯЖЁЛАЯ ЗОНА' },
    { x: 4300, name: 'КОМАНДНЫЙ СЕКТОР' },
    { x: 4860, name: 'АРЕНА БОССА' }
  ];

  const MISSION_ONE_DECOR = [
    { type: 'growth', x: 12, scale: 1.18 },
    { type: 'palm', x: 74, scale: 1.38 },
    { type: 'crates', x: 245, scale: 0.58 },
    { type: 'wreck', x: 315, scale: 0.58 },
    { type: 'flag', x: 390, scale: 0.92 },
    { type: 'fortress', x: 485, scale: 0.88, label: 'A-01' },
    { type: 'antenna', x: 735, scale: 0.92 },
    { type: 'watchtower', x: 855, scale: 0.9 },
    { type: 'growth', x: 910, scale: 0.84 },
    { type: 'sandbags', x: 1050, scale: 1.05 },
    { type: 'wall', x: 1215, scale: 1.08 },
    { type: 'crates', x: 1390, scale: 0.92 },
    { type: 'palm', x: 1510, scale: 1.08 },
    { type: 'bunker', x: 1600, scale: 0.94, label: 'ДВОР' },
    { type: 'spotlight', x: 1815, scale: 0.94 },
    { type: 'fortress', x: 1950, scale: 0.82, label: 'СВЯЗЬ' },
    { type: 'tower', x: 2215, scale: 1.12 },
    { type: 'antenna', x: 2380, scale: 1.08 },
    { type: 'growth', x: 2460, scale: 0.92 },
    { type: 'sandbags', x: 2590, scale: 1.1 },
    { type: 'wall', x: 2770, scale: 1.16 },
    { type: 'fortress', x: 2925, scale: 0.9, label: 'B-02' },
    { type: 'watchtower', x: 3200, scale: 0.86 },
    { type: 'crates', x: 3335, scale: 1.02 },
    { type: 'truck', x: 3500, scale: 1.04 },
    { type: 'growth', x: 3665, scale: 1.02 },
    { type: 'radar', x: 3805, scale: 1.12 },
    { type: 'sandbags', x: 4000, scale: 1.16 },
    { type: 'fortress', x: 4155, scale: 1.02, label: 'HQ' },
    { type: 'antenna', x: 4465, scale: 1.16 },
    { type: 'palm', x: 4575, scale: 1.12 },
    { type: 'wall', x: 4700, scale: 1.08 },
    { type: 'flag', x: 4830, scale: 1.05 },
    { type: 'command', x: 4910, scale: 1.16 },
    { type: 'spotlight', x: 5180, scale: 1.08 },
    { type: 'growth', x: 5290, scale: 1.18 }
  ];

  const ASSET_SOURCES = {
    hero: window.SteelAssaultHeroV6 || window.SteelAssaultPhotoActors?.hero,
    rifle: window.SteelAssaultPhotoActors?.enemy,
    runner: window.SteelAssaultPhotoActors?.enemy,
    heavy: window.SteelAssaultPhotoActors?.heavy || window.SteelAssaultPhotoActors?.enemy,
    drone: window.SteelAssaultPhotoActors?.drone,
    turret: window.SteelAssaultPhotoActors?.turret,
    boss: window.SteelAssaultPhotoActors?.heavy || window.SteelAssaultPhotoActors?.enemy
  };

  const IMAGES = {};
  Object.entries(ASSET_SOURCES).forEach(([key, source]) => {
    if (!source) return;
    const image = new Image();
    image.decoding = 'async';
    image.src = source;
    IMAGES[key] = image;
  });

  const view = {
    cssWidth: 1,
    cssHeight: 1,
    width: WORLD_HEIGHT,
    height: WORLD_HEIGHT,
    dpr: 1,
    scale: 1
  };

  const input = {
    x: 0,
    y: 0,
    firing: false
  };

  const state = {
    mode: 'menu',
    paused: false,
    missionIndex: 0,
    score: 0,
    lives: 4,
    time: 0,
    player: null,
    camera: { x: 0, anchor: 0.42 },
    platforms: [],
    encounters: [],
    enemies: [],
    projectiles: [],
    particles: [],
    checkpoint: START_X,
    extract: false,
    lastSection: -1,
    respawnTimer: 0,
    currentRunRestored: false
  };

  const debug = new URLSearchParams(location.search).get('debug') === '1';

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const lerp = (a, b, amount) => a + (b - a) * amount;
  const damp = (current, target, speed, dt) => lerp(current, target, 1 - Math.exp(-speed * dt));
  const random = (min, max) => min + Math.random() * (max - min);
  const currentLevel = () => LEVELS[state.missionIndex];
  const pad2 = (value) => String(value).padStart(2, '0');

  function seeded(value) {
    const x = Math.sin(value * 91.731 + 17.123) * 43758.5453;
    return x - Math.floor(x);
  }

  function safeJson(value, fallback) {
    try {
      return JSON.parse(value) ?? fallback;
    } catch {
      return fallback;
    }
  }

  const progressStore = {
    get unlocked() {
      try {
        return clamp(Math.max(1, Number(localStorage.getItem('sa_unlocked')) || 1), 1, 12);
      } catch {
        return 1;
      }
    },
    set unlocked(value) {
      try {
        localStorage.setItem('sa_unlocked', String(clamp(value, 1, 12)));
      } catch {}
    },
    get best() {
      try {
        return Number(localStorage.getItem('sa_best_score')) || 0;
      } catch {
        return 0;
      }
    },
    set best(value) {
      try {
        localStorage.setItem('sa_best_score', String(Math.max(0, Math.round(value))));
      } catch {}
    },
    get completed() {
      try {
        const values = safeJson(localStorage.getItem('sa_completed_missions'), []);
        return Array.isArray(values) ? values.filter((value) => Number.isInteger(value)) : [];
      } catch {
        return [];
      }
    },
    set completed(values) {
      try {
        localStorage.setItem('sa_completed_missions', JSON.stringify([...new Set(values)].sort((a, b) => a - b)));
      } catch {}
    },
    get bestByMission() {
      try {
        return safeJson(localStorage.getItem('sa_best_by_mission'), {});
      } catch {
        return {};
      }
    },
    set bestByMission(value) {
      try {
        localStorage.setItem('sa_best_by_mission', JSON.stringify(value));
      } catch {}
    },
    get run() {
      try {
        const run = safeJson(localStorage.getItem('sa_current_progress'), null);
        return run && run.version >= 9 ? run : null;
      } catch {
        return null;
      }
    },
    set run(value) {
      try {
        if (value) localStorage.setItem('sa_current_progress', JSON.stringify(value));
        else localStorage.removeItem('sa_current_progress');
      } catch {}
    }
  };

  function track(eventName, metadata = {}) {
    try {
      window.saTrack?.(eventName, {
        level: state.missionIndex + 1,
        metadata: { build: BUILD, ...metadata }
      });
    } catch {}
  }

  function saveRun() {
    if (state.mode !== 'play' && state.mode !== 'dead') return;
    progressStore.run = {
      version: 9,
      mission: state.missionIndex + 1,
      checkpoint: Math.round(state.checkpoint),
      score: Math.round(state.score),
      completedEncounterIds: state.encounters.filter((encounter) => encounter.state === 'complete').map((encounter) => encounter.id),
      updatedAt: Date.now()
    };
  }

  function clearRunForMission(missionId) {
    const run = progressStore.run;
    if (run?.mission === missionId) progressStore.run = null;
  }

  function syncViewportHeight() {
    let height = window.innerHeight;
    try {
      const telegram = window.Telegram?.WebApp;
      const telegramHeight = telegram?.viewportStableHeight || telegram?.viewportHeight;
      if (Number.isFinite(telegramHeight) && telegramHeight > 200) height = telegramHeight;
    } catch {}
    document.documentElement.style.setProperty('--sa-app-height', `${Math.round(height)}px`);
  }

  function resizeCanvas() {
    syncViewportHeight();
    const rect = canvasWrap.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) return;

    view.cssWidth = rect.width;
    view.cssHeight = rect.height;
    view.height = WORLD_HEIGHT;
    view.width = WORLD_HEIGHT * (rect.width / rect.height);
    view.dpr = Math.min(2.5, Math.max(1, window.devicePixelRatio || 1));

    const pixelWidth = Math.max(1, Math.round(rect.width * view.dpr));
    const pixelHeight = Math.max(1, Math.round(rect.height * view.dpr));
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }

    const scale = pixelHeight / view.height;
    view.scale = scale;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const maxCamera = Math.max(0, currentLevel().length - view.width);
    state.camera.x = clamp(state.camera.x, 0, maxCamera);
    document.documentElement.dataset.steelAspect = rect.width / rect.height >= 1.2 ? 'wide' : rect.width / rect.height < 0.75 ? 'portrait' : 'compact';
  }

  function groundAt(x) {
    const theme = currentLevel().theme;
    let y = WORLD_HEIGHT * 0.755;
    if (theme === 'canyon' || theme === 'radio') y += Math.sin(x * 0.0038) * 12;
    if (theme === 'snow') y += Math.sin(x * 0.003) * 7;
    if (theme === 'swamp') y += Math.sin(x * 0.0055) * 9;
    return y;
  }

  function isPitAt(x) {
    if (!['river', 'snow', 'city', 'reactor'].includes(currentLevel().theme)) return false;
    const local = (x - 1560) % 1640;
    return x > 1560 && local > 1120 && local < 1250;
  }

  function makePlayer(x = START_X) {
    const bodyHeight = 110;
    return {
      kind: 'player',
      type: 'hero',
      x,
      y: groundAt(x) - bodyHeight,
      w: 54,
      h: bodyHeight,
      hitbox: { ox: 7, oy: 8, w: 40, h: 99 },
      sprite: { ox: -28, oy: -50, w: 110, h: 160 },
      vx: 0,
      vy: 0,
      direction: 1,
      onGround: true,
      coyote: 0.1,
      fireCooldown: 0,
      invulnerable: 0
    };
  }

  const ENEMY_ARCHETYPES = {
    rifle: {
      body: [48, 96],
      hitbox: [5, 7, 38, 86],
      sprite: [-22, -45, 92, 141],
      hp: 2,
      speed: 34,
      range: 58,
      score: 120
    },
    runner: {
      body: [46, 94],
      hitbox: [5, 8, 36, 83],
      sprite: [-21, -43, 88, 137],
      hp: 1,
      speed: 76,
      range: 120,
      score: 130
    },
    heavy: {
      body: [68, 120],
      hitbox: [8, 8, 52, 108],
      sprite: [-31, -62, 130, 182],
      hp: 6,
      speed: 23,
      range: 44,
      score: 280
    },
    drone: {
      body: [78, 40],
      hitbox: [8, 5, 62, 30],
      sprite: [-25, -21, 128, 82],
      hp: 3,
      speed: 0,
      range: 85,
      score: 190
    },
    turret: {
      body: [76, 52],
      hitbox: [7, 8, 62, 40],
      sprite: [-22, -22, 120, 74],
      hp: 4,
      speed: 0,
      range: 0,
      score: 220
    },
    boss: {
      body: [124, 158],
      hitbox: [12, 10, 100, 142],
      sprite: [-45, -88, 214, 246],
      hp: 18,
      speed: 32,
      range: 155,
      score: 1800
    }
  };

  function enemyDifficulty(type) {
    const mission = state.missionIndex;
    const learningMission = mission === 0;
    const hpBonus = Math.floor(mission / 4);
    const cooldownScale = Math.max(0.62, 1 - mission * 0.032);
    const base = {
      rifle: learningMission ? 2.65 : 2.15,
      runner: 99,
      heavy: learningMission ? 2.45 : 1.85,
      drone: learningMission ? 2.75 : 1.95,
      turret: learningMission ? 2.55 : 1.7,
      boss: learningMission ? 1.55 : 1.15
    }[type];
    return {
      hpBonus,
      cooldown: base * cooldownScale,
      projectileSpeed: learningMission ? 270 : 300 + mission * 8,
      maxHostileProjectiles: 4 + Math.floor(mission * 0.75)
    };
  }

  function makeEnemy(descriptor, encounterId, index) {
    const type = descriptor.type;
    const archetype = ENEMY_ARCHETYPES[type];
    const difficulty = enemyDifficulty(type);
    const [w, h] = archetype.body;
    const x = descriptor.x;
    const isFlying = type === 'drone';
    const baseHp = type === 'boss' ? archetype.hp + state.missionIndex * 3 : archetype.hp + difficulty.hpBonus;
    return {
      kind: 'enemy',
      type,
      encounterId,
      x,
      y: isFlying ? descriptor.y || 330 : groundAt(x) - h,
      w,
      h,
      hitbox: { ox: archetype.hitbox[0], oy: archetype.hitbox[1], w: archetype.hitbox[2], h: archetype.hitbox[3] },
      sprite: { ox: archetype.sprite[0], oy: archetype.sprite[1], w: archetype.sprite[2], h: archetype.sprite[3] },
      hp: baseHp,
      maxHp: baseHp,
      speed: archetype.speed,
      score: archetype.score + state.missionIndex * 12,
      homeX: x,
      moveRange: archetype.range,
      phase: random(0, TAU),
      direction: -1,
      fireCooldown: difficulty.cooldown + index * 0.16 + random(0.15, 0.6),
      baseCooldown: difficulty.cooldown,
      projectileSpeed: difficulty.projectileSpeed,
      spawnTimer: 0.38 + index * 0.12,
      dead: false
    };
  }

  function missionOneEncounters() {
    return [
      {
        id: 'm1-bunker',
        title: 'ПЕРВЫЙ БУНКЕР',
        trigger: 620,
        preview: 800,
        lockX: 1280,
        spawns: [
          { type: 'rifle', x: 940 },
          { type: 'rifle', x: 1110 }
        ]
      },
      {
        id: 'm1-yard',
        title: 'УКРЕПЛЁННЫЙ ДВОР',
        trigger: 1390,
        preview: 1590,
        lockX: 2020,
        spawns: [
          { type: 'rifle', x: 1600 },
          { type: 'runner', x: 1780 },
          { type: 'rifle', x: 1910 }
        ]
      },
      {
        id: 'm1-tower',
        title: 'ВЫШКА СВЯЗИ',
        trigger: 2160,
        preview: 2360,
        lockX: 2760,
        spawns: [
          { type: 'rifle', x: 2350 },
          { type: 'turret', x: 2530 },
          { type: 'drone', x: 2640, y: 325 }
        ]
      },
      {
        id: 'm1-defense',
        title: 'ВТОРОЙ ОБОРОНИТЕЛЬНЫЙ РУБЕЖ',
        trigger: 2910,
        preview: 3110,
        lockX: 3520,
        spawns: [
          { type: 'rifle', x: 3100 },
          { type: 'heavy', x: 3290 },
          { type: 'turret', x: 3430 }
        ]
      },
      {
        id: 'm1-heavy',
        title: 'ТЯЖЁЛАЯ ЗОНА',
        trigger: 3650,
        preview: 3850,
        lockX: 4310,
        spawns: [
          { type: 'rifle', x: 3860 },
          { type: 'heavy', x: 4050 },
          { type: 'drone', x: 4190, y: 305 }
        ]
      },
      {
        id: 'm1-boss',
        title: 'КОМАНДНАЯ МАШИНА',
        trigger: 4490,
        preview: 4660,
        lockX: 5200,
        boss: true,
        spawns: [{ type: 'boss', x: 4870 }]
      }
    ].map((encounter) => ({ ...encounter, state: 'pending' }));
  }

  function genericEncounters(level) {
    const encounters = [];
    const mission = state.missionIndex;
    const count = 6;
    const firstTrigger = 690;
    const span = (level.length - 1220) / count;
    for (let index = 0; index < count; index += 1) {
      const trigger = firstTrigger + index * span;
      const lockX = Math.min(level.length - 190, trigger + span * 0.78);
      const center = trigger + span * 0.4;
      const spawns = [
        { type: index % 3 === 1 ? 'runner' : 'rifle', x: center },
        { type: 'rifle', x: center + 160 }
      ];
      if (mission >= 1 && index >= 1) spawns.push({ type: index % 2 ? 'drone' : 'turret', x: center + 290, y: 315 });
      if (mission >= 2 && index >= 2) spawns.push({ type: 'heavy', x: center + 410 });
      if (mission >= 6 && index >= 3) spawns.push({ type: 'rifle', x: center + 520 });
      if (index === count - 1) {
        spawns.length = 0;
        spawns.push({ type: 'boss', x: level.length - 500 });
      }
      encounters.push({
        id: `m${level.id}-g${index + 1}`,
        title: index === count - 1 ? 'БОСС СЕКТОРА' : `БОЕВАЯ СЕКЦИЯ ${pad2(index + 1)}`,
        trigger,
        preview: trigger + 180,
        lockX,
        boss: index === count - 1,
        spawns,
        state: 'pending'
      });
    }
    return encounters;
  }

  function buildPlatforms(level) {
    if (level.id === 1) {
      return [
        { x: 1030, y: groundAt(1030) - 145, w: 205, h: 20 },
        { x: 1670, y: groundAt(1670) - 178, w: 230, h: 20 },
        { x: 2215, y: groundAt(2215) - 215, w: 190, h: 20 },
        { x: 3020, y: groundAt(3020) - 155, w: 220, h: 20 },
        { x: 3820, y: groundAt(3820) - 185, w: 210, h: 20 },
        { x: 4550, y: groundAt(4550) - 150, w: 225, h: 20 }
      ];
    }

    const platforms = [];
    for (let x = 900, index = 0; x < level.length - 800; x += 720, index += 1) {
      const lift = index % 3 === 1 ? 205 : 150;
      platforms.push({ x, y: groundAt(x) - lift, w: 210, h: 20 });
      if (['waterfall', 'factory', 'city', 'reactor'].includes(level.theme) && index % 2 === 0) {
        platforms.push({ x: x + 310, y: groundAt(x + 310) - lift - 130, w: 165, h: 18 });
      }
    }
    return platforms;
  }

  function entityHitbox(entity) {
    return {
      x: entity.x + entity.hitbox.ox,
      y: entity.y + entity.hitbox.oy,
      w: entity.hitbox.w,
      h: entity.hitbox.h
    };
  }

  function entitySpriteRect(entity) {
    return {
      x: entity.x + entity.sprite.ox,
      y: entity.y + entity.sprite.oy,
      w: entity.sprite.w,
      h: entity.sprite.h
    };
  }

  function rectanglesOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function circleHitsRect(circle, rect) {
    const closestX = clamp(circle.x, rect.x, rect.x + rect.w);
    const closestY = clamp(circle.y, rect.y, rect.y + rect.h);
    const dx = circle.x - closestX;
    const dy = circle.y - closestY;
    return dx * dx + dy * dy <= circle.r * circle.r;
  }

  function makeParticles(x, y, color, count = 8, direction = 0, force = 210) {
    for (let index = 0; index < count; index += 1) {
      const angle = direction + random(-0.95, 0.95);
      const speed = random(force * 0.35, force);
      const life = random(0.22, 0.55);
      state.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        life,
        maxLife: life,
        size: random(2.5, 5.5)
      });
    }
  }

  let toastTimer = 0;
  function showToast(text, duration = 1450) {
    if (!UI.toast) return;
    UI.toast.textContent = text;
    UI.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => UI.toast.classList.remove('show'), duration);
  }

  function updateHud() {
    UI.score.textContent = state.score.toLocaleString('ru-RU');
    UI.level.textContent = `${state.missionIndex + 1}/12`;
    UI.lives.textContent = String(Math.max(0, state.lives));
    UI.weapon.textContent = 'PULSE';

    const boss = state.enemies.find((enemy) => enemy.type === 'boss' && !enemy.dead);
    if (boss) {
      UI.bossHud?.classList.remove('hidden');
      if (UI.bossHp) UI.bossHp.style.width = `${clamp((boss.hp / boss.maxHp) * 100, 0, 100)}%`;
    } else {
      UI.bossHud?.classList.add('hidden');
    }
  }

  function updateObjective() {
    objective.textContent = `МИССИЯ ${pad2(state.missionIndex + 1)} · ${currentLevel().objective}`;
  }

  function setModal(title, text, primaryText, onPrimary) {
    UI.modalTitle.textContent = title;
    UI.modalText.textContent = text;
    UI.modalPrimary.textContent = primaryText;
    UI.modal.classList.remove('hidden');
    UI.modalPrimary.onclick = () => {
      UI.modal.classList.add('hidden');
      onPrimary?.();
    };
  }

  function prepareMission(missionIndex, resume = true) {
    state.missionIndex = clamp(missionIndex, 0, LEVELS.length - 1);
    const level = currentLevel();
    const storedRun = resume ? progressStore.run : null;
    const canRestore = storedRun?.mission === level.id && storedRun.checkpoint >= START_X && storedRun.checkpoint < level.length - 140;
    const startX = canRestore ? clamp(storedRun.checkpoint, START_X, level.length - 240) : START_X;

    state.mode = 'play';
    state.paused = false;
    state.score = canRestore ? Number(storedRun.score) || 0 : 0;
    state.lives = 4;
    state.time = 0;
    state.player = makePlayer(startX);
    state.camera.x = clamp(startX - view.width * 0.38, 0, Math.max(0, level.length - view.width));
    state.camera.anchor = 0.42;
    state.platforms = buildPlatforms(level);
    state.encounters = level.id === 1 ? missionOneEncounters() : genericEncounters(level);
    state.enemies = [];
    state.projectiles = [];
    state.particles = [];
    state.checkpoint = startX;
    state.extract = false;
    state.lastSection = -1;
    state.respawnTimer = 0;
    state.currentRunRestored = canRestore;

    const completedIds = new Set(canRestore && Array.isArray(storedRun.completedEncounterIds) ? storedRun.completedEncounterIds : []);
    state.encounters.forEach((encounter) => {
      if (completedIds.has(encounter.id) || encounter.lockX < startX - 30) encounter.state = 'complete';
    });

    UI.menu.classList.add('hidden');
    UI.game.classList.remove('hidden');
    UI.modal?.classList.add('hidden');
    UI.pauseModal?.classList.add('hidden');
    updateObjective();
    updateHud();
    requestAnimationFrame(resizeCanvas);

    if (canRestore) showToast('ПРОГРЕСС ВОССТАНОВЛЕН · продолжай штурм', 1800);
    else showToast(level.id === 1 ? 'ДВИГАЙСЯ ВПРАВО · первый сектор безопасен' : level.objective, 1800);

    saveRun();
    track('game_start', { resumed: canRestore });
    track('level_start', { objective: level.objective, resumed: canRestore });
  }

  function exitToMenu() {
    if (state.mode === 'play') saveRun();
    state.mode = 'menu';
    state.paused = false;
    input.x = 0;
    input.y = 0;
    input.firing = false;
    UI.game.classList.add('hidden');
    UI.menu.classList.remove('hidden');
    UI.modal?.classList.add('hidden');
    UI.pauseModal?.classList.add('hidden');
    resetPad();
    renderMenu();
    track('game_exit');
  }

  function renderMenu() {
    const unlocked = progressStore.unlocked;
    const completed = new Set(progressStore.completed);
    const run = progressStore.run;
    UI.grid.innerHTML = '';
    LEVELS.forEach((level, index) => {
      const available = index < unlocked;
      const card = document.createElement('div');
      card.className = `levelCard${completed.has(level.id) ? ' completed' : ''}`;
      const canContinue = available && run?.mission === level.id && run.checkpoint > START_X + 30;
      card.innerHTML = `<strong>Миссия ${pad2(level.id)}</strong><span>${level.name}</span><button ${available ? '' : 'disabled'}>${available ? (canContinue ? 'Продолжить' : 'Играть') : 'Закрыто'}</button>`;
      if (available) card.querySelector('button').addEventListener('click', () => prepareMission(index, true));
      UI.grid.appendChild(card);
    });
    UI.progress.textContent = `Открыто: ${unlocked}/12 · Пройдено: ${completed.size}/12`;
    UI.best.textContent = progressStore.best.toLocaleString('ru-RU');
  }

  function activateEncounter(encounter) {
    if (!encounter || encounter.state !== 'pending') return;
    encounter.state = 'active';
    encounter.spawns.forEach((descriptor, index) => state.enemies.push(makeEnemy(descriptor, encounter.id, index)));
    showToast(`${encounter.boss ? 'БОСС' : 'БОЕВАЯ СЕКЦИЯ'} · ${encounter.title}`, encounter.boss ? 2100 : 1500);
    track('combat_section_start', { section: encounter.id, enemies: encounter.spawns.length });
  }

  function activeEncounter() {
    return state.encounters.find((encounter) => encounter.state === 'active');
  }

  function tryActivateEncounter() {
    if (activeEncounter()) return;
    const next = state.encounters.find((encounter) => encounter.state === 'pending');
    if (!next || !state.player) return;

    const activationLine = state.camera.x + view.width * 0.78;
    const playerCloseEnough = state.player.x >= next.trigger - 120;
    if (playerCloseEnough && activationLine >= next.preview) activateEncounter(next);
  }

  function finishEncounter(encounter) {
    if (!encounter || encounter.state !== 'active') return;
    encounter.state = 'complete';
    state.checkpoint = Math.max(state.checkpoint, Math.min(currentLevel().length - 260, encounter.lockX + 55));
    state.score += encounter.boss ? 900 : 180;
    if (encounter.boss) {
      state.extract = true;
      showToast('БОСС УНИЧТОЖЕН · ДОЙДИ ДО ЭВАКУАЦИИ', 2300);
      track('boss_complete', { section: encounter.id });
    } else {
      showToast('СЕКТОР ЗАЧИЩЕН · ПРОХОД ОТКРЫТ', 1350);
    }
    saveRun();
    track('combat_section_complete', { section: encounter.id, checkpoint: Math.round(state.checkpoint) });
  }

  function checkEncounterCompletion() {
    const encounter = activeEncounter();
    if (!encounter) return;
    const alive = state.enemies.some((enemy) => enemy.encounterId === encounter.id && !enemy.dead);
    if (!alive) finishEncounter(encounter);
  }

  function firePlayerWeapon() {
    const player = state.player;
    if (!player || state.mode !== 'play' || state.paused || player.fireCooldown > 0 || state.respawnTimer > 0) return;
    player.fireCooldown = state.missionIndex === 0 ? 0.17 : Math.max(0.105, 0.15 - state.missionIndex * 0.003);
    const verticalInput = clamp(input.y, -1, 1);
    const angle = Math.abs(verticalInput) > 0.28 ? (verticalInput < 0 ? -0.68 : 0.5) : 0;
    const speed = 930;
    const hitbox = entityHitbox(player);
    const originX = player.direction > 0 ? hitbox.x + hitbox.w + 25 : hitbox.x - 25;
    const originY = hitbox.y + hitbox.h * 0.34;
    state.projectiles.push({
      owner: 'player',
      x: originX,
      y: originY,
      vx: Math.cos(angle) * speed * player.direction,
      vy: Math.sin(angle) * speed,
      r: 5,
      damage: 1,
      life: 1.7
    });
    makeParticles(originX, originY, '#ffd467', 4, player.direction > 0 ? 0 : Math.PI, 145);
  }

  function fireEnemyWeapon(enemy) {
    if (!state.player || enemy.spawnTimer > 0 || enemy.dead) return;
    const difficulty = enemyDifficulty(enemy.type);
    const hostileCount = state.projectiles.filter((projectile) => projectile.owner === 'enemy').length;
    if (hostileCount >= difficulty.maxHostileProjectiles) {
      enemy.fireCooldown = 0.3;
      return;
    }

    const playerBox = entityHitbox(state.player);
    const enemyBox = entityHitbox(enemy);
    const originX = enemyBox.x + enemyBox.w * 0.5;
    const originY = enemyBox.y + enemyBox.h * 0.38;
    const targetX = playerBox.x + playerBox.w * 0.5;
    const targetY = playerBox.y + playerBox.h * 0.42;
    const dx = targetX - originX;
    const dy = targetY - originY;
    const length = Math.hypot(dx, dy) || 1;
    const speed = enemy.projectileSpeed;
    const projectileCount = enemy.type === 'boss' && state.missionIndex > 2 ? 2 : 1;

    for (let index = 0; index < projectileCount; index += 1) {
      const spread = projectileCount === 1 ? 0 : (index === 0 ? -0.09 : 0.09);
      const angle = Math.atan2(dy, dx) + spread;
      state.projectiles.push({
        owner: 'enemy',
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r: enemy.type === 'heavy' || enemy.type === 'boss' ? 6 : 5,
        damage: 1,
        life: 4.5
      });
    }

    enemy.fireCooldown = enemy.baseCooldown + random(0.15, 0.55);
  }

  function jumpPlayer() {
    const player = state.player;
    if (!player || state.mode !== 'play' || state.paused || state.respawnTimer > 0) return;
    if (player.onGround || player.coyote > 0) {
      player.vy = -720;
      player.onGround = false;
      player.coyote = 0;
      makeParticles(player.x + player.w * 0.5, player.y + player.h, '#cfbc89', 5, Math.PI / 2, 120);
    }
  }

  function killEnemy(enemy, projectile) {
    if (enemy.dead) return;
    enemy.hp -= projectile.damage;
    makeParticles(projectile.x, projectile.y, '#ffba58', 7, 0, 180);
    if (enemy.hp > 0) return;

    enemy.dead = true;
    state.score += enemy.score;
    makeParticles(enemy.x + enemy.w * 0.5, enemy.y + enemy.h * 0.45, enemy.type === 'drone' ? '#84e8ff' : '#ff765d', enemy.type === 'boss' ? 42 : 18, 0, enemy.type === 'boss' ? 390 : 270);
    if (enemy.type === 'boss') track('boss_destroyed', { score: state.score });
  }

  function damagePlayer() {
    const player = state.player;
    if (!player || player.invulnerable > 0 || state.mode !== 'play' || state.respawnTimer > 0) return;
    state.lives -= 1;
    player.invulnerable = 1.8;
    makeParticles(player.x + player.w * 0.5, player.y + player.h * 0.45, '#ff665c', 16, Math.PI, 280);
    updateHud();
    track('player_death', { livesLeft: state.lives, checkpoint: Math.round(state.checkpoint) });

    if (state.lives <= 0) {
      state.mode = 'dead';
      progressStore.best = Math.max(progressStore.best, state.score);
      saveRun();
      track('defeat', { score: state.score });
      setModal('Миссия провалена', 'Четыре жизни потеряны. Повтори атаку с последнего открытого сектора.', 'Переиграть', () => prepareMission(state.missionIndex, true));
      return;
    }

    showToast(`ЖИЗНЬ ПОТЕРЯНА · ОСТАЛОСЬ ${state.lives}`, 1250);
    state.respawnTimer = 0.38;
  }

  function respawnPlayer() {
    const player = state.player;
    if (!player) return;
    player.x = clamp(state.checkpoint, START_X, currentLevel().length - 260);
    player.y = groundAt(player.x) - player.h;
    player.vx = 0;
    player.vy = 0;
    player.onGround = true;
    player.invulnerable = 1.8;
    state.projectiles = state.projectiles.filter((projectile) => projectile.owner === 'player' || Math.abs(projectile.x - player.x) > view.width * 0.7);
    state.camera.x = clamp(player.x - view.width * 0.4, 0, Math.max(0, currentLevel().length - view.width));
  }

  function landOnPlatforms(player, previousY) {
    const previousBottom = previousY + player.h;
    const currentBottom = player.y + player.h;
    const left = player.x + player.w * 0.18;
    const right = player.x + player.w * 0.82;
    let landing = null;

    for (const platform of state.platforms) {
      if (right < platform.x || left > platform.x + platform.w) continue;
      if (player.vy >= 0 && previousBottom <= platform.y + 7 && currentBottom >= platform.y) {
        if (!landing || platform.y < landing.y) landing = platform;
      }
    }

    if (!landing) return false;
    player.y = landing.y - player.h;
    player.vy = 0;
    player.onGround = true;
    player.coyote = 0.1;
    return true;
  }

  function updatePlayer(dt) {
    const player = state.player;
    if (!player) return;

    player.fireCooldown = Math.max(0, player.fireCooldown - dt);
    player.invulnerable = Math.max(0, player.invulnerable - dt);
    player.coyote = Math.max(0, player.coyote - dt);

    if (state.respawnTimer > 0) {
      state.respawnTimer -= dt;
      if (state.respawnTimer <= 0) respawnPlayer();
      return;
    }

    const targetSpeed = input.x * 340;
    player.vx = damp(player.vx, targetSpeed, Math.abs(input.x) > 0.08 ? 13 : 18, dt);
    if (Math.abs(input.x) > 0.12) player.direction = Math.sign(input.x);

    const previousY = player.y;
    player.x += player.vx * dt;
    player.vy += 1740 * dt;
    player.y += player.vy * dt;
    player.onGround = false;

    if (!landOnPlatforms(player, previousY)) {
      const ground = groundAt(player.x) - player.h;
      if (!isPitAt(player.x + player.w * 0.5) && player.y >= ground) {
        player.y = ground;
        player.vy = 0;
        player.onGround = true;
        player.coyote = 0.1;
      }
    }

    const encounter = activeEncounter();
    const encounterLimit = encounter ? encounter.lockX - player.w - 20 : currentLevel().length - player.w - 35;
    player.x = clamp(player.x, 26, encounterLimit);

    if (player.y > WORLD_HEIGHT + 160) damagePlayer();
    if (input.firing) firePlayerWeapon();
  }

  function updateCamera(dt) {
    const player = state.player;
    if (!player) return;
    const movingRight = input.x > 0.12;
    const movingLeft = input.x < -0.12;
    const desiredAnchor = movingRight ? 0.38 : movingLeft ? 0.62 : player.direction > 0 ? 0.42 : 0.58;
    state.camera.anchor = damp(state.camera.anchor, desiredAnchor, 5.2, dt);
    const target = player.x + player.w * 0.5 - view.width * state.camera.anchor;
    const maxCamera = Math.max(0, currentLevel().length - view.width);
    state.camera.x = clamp(damp(state.camera.x, target, 6.4, dt), 0, maxCamera);
  }

  function updateEnemy(enemy, dt) {
    if (enemy.dead) return;
    enemy.spawnTimer = Math.max(0, enemy.spawnTimer - dt);
    if (enemy.spawnTimer > 0 || !state.player) return;

    enemy.fireCooldown -= dt;
    const player = state.player;
    const dx = player.x - enemy.x;
    enemy.direction = dx < 0 ? -1 : 1;

    if (enemy.type === 'drone') {
      enemy.x = enemy.homeX + Math.sin(state.time * 0.72 + enemy.phase) * enemy.moveRange;
      enemy.y = 315 + Math.sin(state.time * 1.55 + enemy.phase) * 56;
    } else if (enemy.type === 'runner') {
      if (Math.abs(dx) < 620 && Math.abs(dx) > 90) enemy.x += Math.sign(dx) * enemy.speed * dt;
      enemy.y = groundAt(enemy.x) - enemy.h;
    } else if (enemy.type === 'rifle' || enemy.type === 'heavy') {
      const roam = Math.sin(state.time * 0.8 + enemy.phase) * enemy.speed * 0.32;
      enemy.x = clamp(enemy.x + roam * dt, enemy.homeX - enemy.moveRange, enemy.homeX + enemy.moveRange);
      enemy.y = groundAt(enemy.x) - enemy.h;
    } else if (enemy.type === 'boss') {
      const encounter = state.encounters.find((item) => item.id === enemy.encounterId);
      const minX = encounter ? encounter.trigger + 240 : enemy.homeX - enemy.moveRange;
      const maxX = encounter ? encounter.lockX - enemy.w - 70 : enemy.homeX + enemy.moveRange;
      const bossTarget = clamp(player.x + 300, minX, maxX);
      enemy.x = damp(enemy.x, bossTarget, 0.45, dt);
      enemy.y = groundAt(enemy.x) - enemy.h;
    } else {
      enemy.y = groundAt(enemy.x) - enemy.h;
    }

    const fireRange = enemy.type === 'boss' ? 820 : enemy.type === 'drone' ? 720 : 670;
    if (enemy.fireCooldown <= 0 && enemy.type !== 'runner' && Math.abs(dx) < fireRange) fireEnemyWeapon(enemy);
  }

  function updateProjectiles(dt) {
    const player = state.player;
    for (const projectile of state.projectiles) {
      projectile.x += projectile.vx * dt;
      projectile.y += projectile.vy * dt;
      projectile.life -= dt;
      if (projectile.life <= 0) continue;

      if (projectile.owner === 'player') {
        for (const enemy of state.enemies) {
          if (enemy.dead || enemy.spawnTimer > 0) continue;
          if (circleHitsRect(projectile, entityHitbox(enemy))) {
            projectile.life = -1;
            killEnemy(enemy, projectile);
            break;
          }
        }
      } else if (player && state.respawnTimer <= 0 && circleHitsRect(projectile, entityHitbox(player))) {
        projectile.life = -1;
        damagePlayer();
      }
    }

    const leftCull = state.camera.x - 360;
    const rightCull = state.camera.x + view.width + 360;
    state.projectiles = state.projectiles.filter((projectile) => projectile.life > 0 && projectile.x > leftCull && projectile.x < rightCull && projectile.y > -180 && projectile.y < WORLD_HEIGHT + 220);
  }

  function updateParticles(dt) {
    for (const particle of state.particles) {
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vy += 430 * dt;
      particle.life -= dt;
    }
    state.particles = state.particles.filter((particle) => particle.life > 0);
  }

  function updateSectionAnnouncements() {
    if (currentLevel().id !== 1 || !state.player) return;
    let current = 0;
    for (let index = 0; index < MISSION_ONE_SECTIONS.length; index += 1) {
      if (state.player.x >= MISSION_ONE_SECTIONS[index].x) current = index;
    }
    if (current !== state.lastSection) {
      state.lastSection = current;
      if (current > 0) showToast(`СЕКТОР ${pad2(current + 1)} · ${MISSION_ONE_SECTIONS[current].name}`, 1300);
    }
  }

  function updateGame(dt) {
    if (state.mode !== 'play' || state.paused) return;
    state.time += dt;

    updatePlayer(dt);
    updateCamera(dt);
    tryActivateEncounter();

    for (const enemy of state.enemies) updateEnemy(enemy, dt);
    updateProjectiles(dt);
    updateParticles(dt);

    if (state.player && state.respawnTimer <= 0) {
      const playerBox = entityHitbox(state.player);
      for (const enemy of state.enemies) {
        if (enemy.dead || enemy.spawnTimer > 0 || enemy.type === 'drone' || enemy.type === 'turret') continue;
        if (rectanglesOverlap(playerBox, entityHitbox(enemy))) {
          damagePlayer();
          break;
        }
      }
    }

    state.enemies = state.enemies.filter((enemy) => !enemy.dead);
    checkEncounterCompletion();
    updateSectionAnnouncements();

    if (state.extract && state.player && state.player.x >= currentLevel().length - 150) completeMission();
    updateHud();
  }

  function completeMission() {
    if (state.mode !== 'play') return;
    const level = currentLevel();
    state.mode = 'result';
    state.score += 700 + state.missionIndex * 125;

    progressStore.best = Math.max(progressStore.best, state.score);
    progressStore.unlocked = Math.max(progressStore.unlocked, Math.min(12, level.id + 1));
    const completed = progressStore.completed;
    if (!completed.includes(level.id)) completed.push(level.id);
    progressStore.completed = completed;
    const bestByMission = progressStore.bestByMission;
    bestByMission[level.id] = Math.max(Number(bestByMission[level.id]) || 0, state.score);
    progressStore.bestByMission = bestByMission;
    clearRunForMission(level.id);

    track('level_complete', { score: state.score, objective: level.objective });
    const hasNext = state.missionIndex < LEVELS.length - 1;
    setModal(
      `Миссия ${pad2(level.id)} пройдена`,
      `${level.objective} — выполнено. Результат: ${state.score.toLocaleString('ru-RU')} очков.`,
      hasNext ? 'Следующая миссия' : 'В каталог',
      () => (hasNext ? prepareMission(state.missionIndex + 1, false) : exitToMenu())
    );
  }

  function line(x1, y1, x2, y2, width, color) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineWidth = width;
    ctx.strokeStyle = color;
    ctx.stroke();
  }

  function polygon(points, color) {
    if (!points.length) return;
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let index = 1; index < points.length; index += 1) ctx.lineTo(points[index][0], points[index][1]);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }

  function screenX(worldX, parallax = 1) {
    return worldX - state.camera.x * parallax;
  }

  function visibleX(x, width = 100) {
    return x > -width && x < view.width + width;
  }

  function drawMountain(x, baseY, width, height, color, capColor = null) {
    polygon([[x, baseY], [x + width * 0.48, baseY - height], [x + width, baseY]], color);
    if (capColor) {
      polygon([
        [x + width * 0.34, baseY - height * 0.7],
        [x + width * 0.48, baseY - height],
        [x + width * 0.63, baseY - height * 0.68],
        [x + width * 0.55, baseY - height * 0.73],
        [x + width * 0.48, baseY - height * 0.63],
        [x + width * 0.42, baseY - height * 0.72]
      ], capColor);
    }
  }

  function drawIslandRidge(x, baseY, width, height, seed = 1, alpha = 1) {
    const ridge = [
      [0, 0], [0.04, -0.08], [0.1, -0.13], [0.16, -0.35], [0.22, -0.29],
      [0.28, -0.56], [0.34, -0.47], [0.41, -0.82], [0.47, -0.69],
      [0.53, -0.96], [0.59, -0.73], [0.65, -0.79], [0.71, -0.52],
      [0.78, -0.6], [0.84, -0.31], [0.9, -0.36], [0.96, -0.12], [1, 0]
    ];
    const points = ridge.map(([px, py], index) => [
      x + px * width,
      baseY + py * height * (0.9 + seeded(seed * 17 + index) * 0.18)
    ]);
    ctx.save();
    ctx.globalAlpha = alpha;
    const body = ctx.createLinearGradient(0, baseY - height, 0, baseY);
    body.addColorStop(0, '#285b5b');
    body.addColorStop(0.55, '#214c4c');
    body.addColorStop(1, '#18393d');
    polygon(points, body);

    polygon([
      points[5], points[7], points[9],
      [x + width * 0.49, baseY], [x + width * 0.27, baseY]
    ], 'rgba(8,35,39,.28)');
    polygon([
      points[9], points[11], points[13],
      [x + width * 0.8, baseY], [x + width * 0.53, baseY]
    ], 'rgba(111,128,103,.16)');

    for (let ledge = 0; ledge < 7; ledge += 1) {
      const lx = x + (0.11 + ledge * 0.12) * width;
      const ly = baseY - (0.18 + (ledge % 4) * 0.13) * height;
      line(lx, ly, lx + width * (0.055 + (ledge % 2) * 0.025), ly - 3, 3, 'rgba(207,190,137,.13)');
    }
    for (let clump = 0; clump < 18; clump += 1) {
      const cx = x + (0.04 + ((clump * 67) % 91) / 100) * width;
      const cy = baseY - (0.12 + ((clump * 37) % 58) / 100) * height;
      ctx.fillStyle = clump % 3 ? 'rgba(24,78,55,.62)' : 'rgba(43,101,61,.58)';
      ctx.beginPath();
      ctx.ellipse(cx, cy, 13 + clump % 4 * 4, 6 + clump % 3 * 2, -0.25, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawSky() {
    const palette = PALETTES[currentLevel().theme];
    const gradient = ctx.createLinearGradient(0, 0, 0, WORLD_HEIGHT);
    gradient.addColorStop(0, palette[0]);
    gradient.addColorStop(0.52, palette[1]);
    gradient.addColorStop(1, palette[3]);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, view.width, WORLD_HEIGHT);

    const theme = currentLevel().theme;
    const daylight = ['coast', 'river', 'waterfall', 'canyon', 'radio', 'snow'].includes(theme);
    const orbX = view.width * (theme === 'coast' ? 0.18 : 0.77);
    const orbY = theme === 'coast' ? WORLD_HEIGHT * 0.46 : WORLD_HEIGHT * 0.19;
    const radius = theme === 'coast' ? 46 : 38;
    const glow = ctx.createRadialGradient(orbX, orbY, 5, orbX, orbY, radius * 3.5);
    glow.addColorStop(0, daylight ? 'rgba(255,228,151,.6)' : 'rgba(174,204,255,.28)');
    glow.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(orbX - radius * 4, orbY - radius * 4, radius * 8, radius * 8);
    ctx.fillStyle = daylight ? 'rgba(255,223,141,.85)' : 'rgba(198,217,241,.68)';
    ctx.beginPath();
    ctx.arc(orbX, orbY, radius, 0, TAU);
    ctx.fill();

    ctx.save();
    const cloudShift = state.camera.x * 0.035;
    if (theme === 'coast') {
      const haze = ctx.createLinearGradient(0, 320, 0, 490);
      haze.addColorStop(0, 'rgba(255,209,143,0)');
      haze.addColorStop(0.65, 'rgba(255,205,132,.2)');
      haze.addColorStop(1, 'rgba(255,187,111,.05)');
      ctx.fillStyle = haze;
      ctx.fillRect(0, 300, view.width, 205);
      ctx.lineCap = 'round';
      for (let index = -1; index < Math.ceil(view.width / 280) + 2; index += 1) {
        const x = index * 280 - (cloudShift % 280);
        const y = 92 + (index % 4) * 63;
        ctx.strokeStyle = index % 2 ? 'rgba(255,235,203,.22)' : 'rgba(255,220,177,.16)';
        ctx.lineWidth = 9 + (index % 3) * 4;
        ctx.beginPath();
        ctx.moveTo(x - 55, y + 11);
        ctx.bezierCurveTo(x + 5, y - 18, x + 74, y + 18, x + 154, y - 3);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(205,148,107,.09)';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(x - 20, y + 27);
        ctx.bezierCurveTo(x + 36, y + 7, x + 91, y + 34, x + 190, y + 15);
        ctx.stroke();
      }
    } else {
      ctx.globalAlpha = theme === 'factory' || theme === 'reactor' ? 0.06 : 0.14;
      ctx.fillStyle = '#fff';
      for (let index = -1; index < Math.ceil(view.width / 310) + 2; index += 1) {
        const x = index * 310 - (cloudShift % 310);
        const y = 125 + (index % 3) * 64;
        ctx.beginPath();
        ctx.ellipse(x, y, 86, 20, 0, 0, TAU);
        ctx.ellipse(x + 55, y + 6, 62, 16, 0, 0, TAU);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  function drawFarBackground() {
    const theme = currentLevel().theme;
    const palette = PALETTES[theme];
    const farShift = state.camera.x * 0.1;
    const midShift = state.camera.x * 0.22;

    if (['coast', 'river', 'waterfall', 'canyon', 'radio', 'snow', 'final'].includes(theme)) {
      const farStep = 330;
      for (let index = Math.floor(farShift / farStep) - 2; index < Math.ceil((farShift + view.width) / farStep) + 3; index += 1) {
        const x = index * farStep - farShift;
        const height = 190 + seeded(index + currentLevel().id) * 135;
        if (theme === 'coast') drawIslandRidge(x, 515, 505, height * 0.92, index + 31, 0.86);
        else drawMountain(x, 520, 470, height, theme === 'snow' ? 'rgba(66,91,116,.82)' : palette[2], theme === 'snow' ? 'rgba(230,243,251,.72)' : null);
      }
      const midStep = 390;
      for (let index = Math.floor(midShift / midStep) - 2; index < Math.ceil((midShift + view.width) / midStep) + 3; index += 1) {
        const x = index * midStep - midShift;
        if (theme === 'coast') drawIslandRidge(x, 575, 540, 165 + seeded(index * 2 + 7) * 105, index + 83, 0.62);
        else drawMountain(x, 590, 510, 155 + seeded(index * 2 + 7) * 95, theme === 'canyon' || theme === 'radio' ? 'rgba(92,48,39,.78)' : 'rgba(17,48,57,.58)');
      }
    }

    if (theme === 'coast') {
      const sea = ctx.createLinearGradient(0, 480, 0, groundAt(0));
      sea.addColorStop(0, 'rgba(47,127,143,.78)');
      sea.addColorStop(0.55, 'rgba(17,92,112,.9)');
      sea.addColorStop(1, 'rgba(8,53,70,.96)');
      ctx.fillStyle = sea;
      ctx.fillRect(0, 480, view.width, groundAt(0) - 480);
      line(0, 480, view.width, 480, 3, 'rgba(255,218,153,.34)');

      const waveShift = (state.camera.x * 0.08) % 180;
      for (let y = 500; y < groundAt(0); y += 27) {
        for (let x = -180 - waveShift + (y % 54); x < view.width + 180; x += 180) {
          line(x, y, x + 76, y, 2, 'rgba(193,239,235,.2)');
        }
      }

      const reflectionX = view.width * 0.18;
      for (let y = 490; y < Math.min(630, groundAt(0)); y += 13) {
        const spread = 15 + (y - 490) * 0.42;
        line(reflectionX - spread, y, reflectionX + spread, y, 3, `rgba(255,205,119,${Math.max(0.04, 0.24 - (y - 490) * 0.0012)})`);
      }

      const islandShift = state.camera.x * 0.07;
      for (let index = -1; index < Math.ceil(view.width / 430) + 2; index += 1) {
        const x = index * 430 - (islandShift % 430);
        polygon([[x - 55, 486], [x + 5, 446], [x + 45, 459], [x + 106, 486]], 'rgba(31,64,62,.7)');
        line(x + 14, 454, x + 10, 423, 3, 'rgba(35,72,58,.7)');
        line(x + 10, 424, x - 10, 413, 5, 'rgba(31,88,57,.64)');
        line(x + 10, 424, x + 31, 411, 5, 'rgba(31,88,57,.64)');
      }
    } else if (theme === 'river') {
      ctx.fillStyle = 'rgba(20,91,81,.74)';
      ctx.fillRect(0, 505, view.width, groundAt(0) - 505);
      for (let x = -50; x < view.width + 120; x += 240) {
        line(x, 560, x + 95, 520, 8, 'rgba(84,65,45,.65)');
        line(x + 95, 520, x + 190, 560, 8, 'rgba(84,65,45,.65)');
      }
    } else if (theme === 'waterfall') {
      ctx.fillStyle = 'rgba(35,80,94,.82)';
      ctx.fillRect(0, 475, view.width, groundAt(0) - 475);
      for (let index = -1; index < Math.ceil(view.width / 360) + 2; index += 1) {
        const x = index * 360 - ((state.camera.x * 0.15) % 360);
        ctx.fillStyle = 'rgba(225,247,250,.25)';
        ctx.fillRect(x, 335, 54, 275);
        ctx.fillStyle = 'rgba(190,234,242,.12)';
        ctx.fillRect(x + 56, 355, 20, 250);
      }
    } else if (theme === 'canyon' || theme === 'radio') {
      for (let index = -1; index < Math.ceil(view.width / 260) + 2; index += 1) {
        const x = index * 260 - ((state.camera.x * 0.18) % 260);
        ctx.fillStyle = index % 2 ? 'rgba(93,48,39,.76)' : 'rgba(112,57,43,.72)';
        ctx.fillRect(x, 370 + (index % 3) * 45, 180, 260);
      }
    } else if (theme === 'ruins' || theme === 'city') {
      for (let index = -1; index < Math.ceil(view.width / 180) + 3; index += 1) {
        const x = index * 180 - ((state.camera.x * 0.17) % 180);
        const top = 245 + (index % 4) * 70;
        ctx.fillStyle = theme === 'city' ? 'rgba(27,39,65,.94)' : 'rgba(45,39,49,.94)';
        ctx.fillRect(x, top, 156, 390);
        for (let y = top + 45; y < 590; y += 62) {
          for (let windowX = x + 20; windowX < x + 138; windowX += 42) {
            ctx.fillStyle = theme === 'city' ? 'rgba(157,104,225,.28)' : 'rgba(231,160,101,.14)';
            ctx.fillRect(windowX, y, 17, 24);
          }
        }
      }
    } else if (theme === 'snow') {
      ctx.fillStyle = 'rgba(232,244,251,.72)';
      ctx.fillRect(0, 565, view.width, 85);
    } else if (theme === 'factory' || theme === 'reactor') {
      ctx.fillStyle = 'rgba(8,14,21,.78)';
      ctx.fillRect(0, 275, view.width, 370);
      for (let index = -1; index < Math.ceil(view.width / 205) + 2; index += 1) {
        const x = index * 205 - ((state.camera.x * 0.16) % 205);
        const top = 260 + (index % 3) * 55;
        ctx.fillStyle = 'rgba(34,39,48,.96)';
        ctx.fillRect(x, top, 175, 370);
        ctx.fillStyle = theme === 'reactor' ? 'rgba(77,235,154,.26)' : 'rgba(239,132,78,.23)';
        for (let y = top + 65; y < 590; y += 105) ctx.fillRect(x + 42, y, 80, 27);
        line(x + 25, top, x + 25, top - 120, 18, 'rgba(26,30,36,.96)');
      }
    } else if (theme === 'swamp') {
      ctx.fillStyle = 'rgba(16,66,36,.73)';
      ctx.fillRect(0, 490, view.width, 165);
      for (let index = -1; index < Math.ceil(view.width / 155) + 3; index += 1) {
        const x = index * 155 - ((state.camera.x * 0.2) % 155);
        ctx.fillStyle = 'rgba(34,91,48,.86)';
        ctx.beginPath();
        ctx.arc(x, 520 + (index % 3) * 42, 72 + (index % 4) * 13, 0, TAU);
        ctx.fill();
      }
    } else if (theme === 'final') {
      ctx.fillStyle = 'rgba(20,9,21,.78)';
      ctx.fillRect(0, 390, view.width, 260);
      for (let index = 0; index < 7; index += 1) {
        const x = index * (view.width / 6) - ((state.camera.x * 0.12) % 190);
        line(x, 600, x, 315, 13, 'rgba(38,25,35,.9)');
        ctx.fillStyle = 'rgba(210,69,73,.2)';
        ctx.beginPath();
        ctx.arc(x, 300, 18, 0, TAU);
        ctx.fill();
      }
    }
  }

  function drawPalmAt(x, baseY, scale = 1, alpha = 1) {
    ctx.save();
    ctx.globalAlpha = alpha;
    const crownX = x - 17 * scale;
    const crownY = baseY - 176 * scale;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#3a2b20';
    ctx.lineWidth = 17 * scale;
    ctx.beginPath();
    ctx.moveTo(x, baseY);
    ctx.bezierCurveTo(x + 4 * scale, baseY - 63 * scale, x - 8 * scale, baseY - 126 * scale, crownX, crownY);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(189,139,78,.52)';
    ctx.lineWidth = 5 * scale;
    ctx.beginPath();
    ctx.moveTo(x - 3 * scale, baseY - 9 * scale);
    ctx.bezierCurveTo(x, baseY - 69 * scale, x - 13 * scale, baseY - 129 * scale, crownX - 3 * scale, crownY + 8 * scale);
    ctx.stroke();
    for (let band = 0; band < 7; band += 1) {
      const by = baseY - (25 + band * 21) * scale;
      line(x - 7 * scale - band * 1.2 * scale, by, x + 7 * scale - band * 2.2 * scale, by - 4 * scale, 2 * scale, 'rgba(34,28,23,.62)');
    }

    const fronds = [
      [-112, 10, -62, -14], [-97, -24, -57, -42], [-70, -58, -35, -65],
      [-28, -76, -12, -72], [28, -72, 18, -66], [73, -50, 47, -54],
      [108, -17, 67, -27], [116, 20, 68, 1], [72, 48, 49, 24], [-65, 42, -42, 18]
    ];
    for (let index = 0; index < fronds.length; index += 1) {
      const [endX, endY, controlX, controlY] = fronds[index];
      ctx.strokeStyle = index % 3 ? '#185c39' : '#277347';
      ctx.lineWidth = 7 * scale;
      ctx.beginPath();
      ctx.moveTo(crownX, crownY);
      ctx.quadraticCurveTo(crownX + controlX * scale, crownY + controlY * scale, crownX + endX * scale, crownY + endY * scale);
      ctx.stroke();
      for (let leaf = 2; leaf < 8; leaf += 1) {
        const t = leaf / 9;
        const oneMinus = 1 - t;
        const px = oneMinus * oneMinus * crownX + 2 * oneMinus * t * (crownX + controlX * scale) + t * t * (crownX + endX * scale);
        const py = oneMinus * oneMinus * crownY + 2 * oneMinus * t * (crownY + controlY * scale) + t * t * (crownY + endY * scale);
        const side = index % 2 ? 1 : -1;
        line(px, py, px + side * 15 * scale, py + (4 + leaf) * scale, 4 * scale, index % 3 ? '#1d6840' : '#2b7d49');
      }
    }
    ctx.fillStyle = '#4b3625';
    for (let nut = 0; nut < 4; nut += 1) {
      ctx.beginPath();
      ctx.arc(crownX + (nut - 1.5) * 7 * scale, crownY + (7 + nut % 2 * 5) * scale, 6 * scale, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawCoastalCliffAt(x, baseY, scale = 1, alpha = 1) {
    const width = 430 * scale;
    const height = 305 * scale;
    ctx.save();
    ctx.globalAlpha = alpha;
    const rock = ctx.createLinearGradient(x, baseY - height, x + width, baseY);
    rock.addColorStop(0, '#6d6955');
    rock.addColorStop(0.42, '#4e5547');
    rock.addColorStop(1, '#283d36');
    polygon([
      [x, baseY], [x + 16 * scale, baseY - 92 * scale], [x + 68 * scale, baseY - 132 * scale],
      [x + 93 * scale, baseY - 224 * scale], [x + 153 * scale, baseY - height],
      [x + 207 * scale, baseY - 250 * scale], [x + 252 * scale, baseY - 278 * scale],
      [x + 305 * scale, baseY - 186 * scale], [x + 361 * scale, baseY - 154 * scale],
      [x + width, baseY - 64 * scale], [x + width, baseY]
    ], rock);
    polygon([
      [x + 92 * scale, baseY - 215 * scale], [x + 153 * scale, baseY - height],
      [x + 207 * scale, baseY - 250 * scale], [x + 178 * scale, baseY - 82 * scale],
      [x + 112 * scale, baseY]
    ], 'rgba(139,123,88,.3)');
    polygon([
      [x + 250 * scale, baseY - 270 * scale], [x + 305 * scale, baseY - 186 * scale],
      [x + 361 * scale, baseY - 154 * scale], [x + 338 * scale, baseY],
      [x + 260 * scale, baseY]
    ], 'rgba(21,49,40,.42)');
    polygon([
      [x + 12 * scale, baseY - 88 * scale], [x + 66 * scale, baseY - 132 * scale],
      [x + 94 * scale, baseY - 211 * scale], [x + 116 * scale, baseY - 92 * scale],
      [x + 74 * scale, baseY]
    ], 'rgba(25,42,37,.34)');
    for (let ledge = 0; ledge < 9; ledge += 1) {
      const lx = x + (42 + ledge * 40) * scale;
      const ly = baseY - (42 + (ledge % 4) * 55) * scale;
      line(lx, ly, lx + (35 + (ledge % 3) * 18) * scale, ly - 8 * scale, 4 * scale, 'rgba(222,197,139,.23)');
      line(lx + 8 * scale, ly + 4 * scale, lx - 2 * scale, ly + 35 * scale, 2 * scale, 'rgba(20,35,31,.45)');
    }
    for (let clump = 0; clump < 22; clump += 1) {
      const cx = x + (28 + (clump * 79) % 370) * scale;
      const cy = baseY - (52 + (clump * 47) % 245) * scale;
      ctx.fillStyle = clump % 3 ? '#1d5938' : '#377247';
      ctx.beginPath();
      ctx.ellipse(cx, cy, (18 + clump % 4 * 4) * scale, (9 + clump % 3 * 3) * scale, -0.25, 0, TAU);
      ctx.fill();
    }
    for (let vine = 0; vine < 5; vine += 1) {
      const vx = x + (92 + vine * 63) * scale;
      const vy = baseY - (230 - vine % 2 * 45) * scale;
      ctx.strokeStyle = 'rgba(39,100,53,.72)';
      ctx.lineWidth = 3 * scale;
      ctx.beginPath();
      ctx.moveTo(vx, vy);
      ctx.bezierCurveTo(vx - 20 * scale, vy + 42 * scale, vx + 18 * scale, vy + 77 * scale, vx - 5 * scale, vy + 118 * scale);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawTropicalGrowthAt(x, baseY, scale = 1, alpha = 1) {
    ctx.save();
    ctx.globalAlpha = alpha;
    for (let clump = 0; clump < 5; clump += 1) {
      const rootX = x + clump * 23 * scale;
      const height = (38 + (clump % 3) * 17) * scale;
      line(rootX, baseY, rootX + (clump - 2) * 9 * scale, baseY - height, 5 * scale, clump % 2 ? '#275d3c' : '#317448');
      for (let leaf = 1; leaf < 5; leaf += 1) {
        const stemX = rootX + (clump - 2) * 9 * scale * (leaf / 5);
        const stemY = baseY - height * (leaf / 5);
        const reach = (12 + leaf * 3) * scale;
        line(stemX, stemY, stemX - reach, stemY - 7 * scale, 5 * scale, '#357e49');
        line(stemX, stemY, stemX + reach, stemY - 9 * scale, 5 * scale, '#28643e');
      }
    }
    ctx.restore();
  }

  function drawConcreteTexture(x, y, width, height, scale = 1, seed = 1) {
    ctx.save();
    for (let speck = 0; speck < 38; speck += 1) {
      const px = x + seeded(seed * 53 + speck * 7) * width;
      const py = y + seeded(seed * 71 + speck * 11) * height;
      const radius = (1.3 + seeded(seed * 29 + speck) * 2.8) * scale;
      ctx.fillStyle = speck % 3 ? 'rgba(20,28,26,.18)' : 'rgba(221,207,167,.1)';
      ctx.beginPath();
      ctx.arc(px, py, radius, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawFlagAt(x, baseY, scale = 1) {
    const top = baseY - 205 * scale;
    line(x, baseY, x, top, 6 * scale, '#343a39');
    polygon([
      [x + 3 * scale, top + 8 * scale], [x + 112 * scale, top + 25 * scale],
      [x + 96 * scale, top + 48 * scale], [x + 116 * scale, top + 70 * scale],
      [x + 3 * scale, top + 58 * scale]
    ], '#8e3730');
    polygon([
      [x + 25 * scale, top + 24 * scale], [x + 52 * scale, top + 34 * scale],
      [x + 78 * scale, top + 28 * scale], [x + 60 * scale, top + 45 * scale],
      [x + 80 * scale, top + 59 * scale], [x + 51 * scale, top + 49 * scale]
    ], 'rgba(226,210,161,.72)');
  }

  function drawWatchtowerAt(x, baseY, scale = 1) {
    const width = 142 * scale;
    const cabinBottom = baseY - 205 * scale;
    const cabinTop = cabinBottom - 92 * scale;
    line(x + 18 * scale, baseY, x + 34 * scale, cabinBottom, 12 * scale, '#302b23');
    line(x + width - 18 * scale, baseY, x + width - 34 * scale, cabinBottom, 12 * scale, '#302b23');
    for (let brace = 0; brace < 3; brace += 1) {
      const y0 = baseY - brace * 63 * scale;
      const y1 = y0 - 58 * scale;
      line(x + 20 * scale, y0, x + width - 28 * scale, y1, 5 * scale, '#6b553a');
      line(x + width - 20 * scale, y0, x + 28 * scale, y1, 5 * scale, '#493b2c');
      line(x + 19 * scale, y1, x + width - 19 * scale, y1, 4 * scale, '#796044');
    }
    const cabin = ctx.createLinearGradient(x, cabinTop, x + width, cabinBottom);
    cabin.addColorStop(0, '#756146');
    cabin.addColorStop(0.52, '#514536');
    cabin.addColorStop(1, '#302c27');
    ctx.fillStyle = cabin;
    ctx.fillRect(x + 12 * scale, cabinTop, width - 24 * scale, 92 * scale);
    for (let board = 1; board < 5; board += 1) line(x + 12 * scale, cabinTop + board * 18 * scale, x + width - 12 * scale, cabinTop + board * 18 * scale, 2 * scale, 'rgba(31,25,20,.38)');
    ctx.fillStyle = '#182021';
    ctx.fillRect(x + 28 * scale, cabinTop + 21 * scale, 36 * scale, 35 * scale);
    ctx.fillRect(x + 79 * scale, cabinTop + 21 * scale, 34 * scale, 35 * scale);
    ctx.fillStyle = 'rgba(242,182,90,.2)';
    ctx.fillRect(x + 83 * scale, cabinTop + 25 * scale, 26 * scale, 8 * scale);
    ctx.fillStyle = '#78664b';
    ctx.fillRect(x, cabinBottom - 10 * scale, width, 16 * scale);
    line(x - 7 * scale, cabinBottom + 9 * scale, x + width + 8 * scale, cabinBottom + 9 * scale, 5 * scale, '#332b22');
    for (let rail = 0; rail < 7; rail += 1) line(x + rail * 23 * scale, cabinBottom + 7 * scale, x + rail * 23 * scale, cabinBottom - 35 * scale, 3 * scale, '#4a3b2a');
    line(x - 4 * scale, cabinBottom - 35 * scale, x + width + 4 * scale, cabinBottom - 35 * scale, 4 * scale, '#5e4a34');
    polygon([
      [x - 18 * scale, cabinTop], [x + 20 * scale, cabinTop - 25 * scale],
      [x + width - 10 * scale, cabinTop - 25 * scale], [x + width + 19 * scale, cabinTop]
    ], '#262923');
    polygon([
      [x - 11 * scale, cabinTop - 2 * scale], [x + 22 * scale, cabinTop - 20 * scale],
      [x + width - 14 * scale, cabinTop - 20 * scale], [x + width - 33 * scale, cabinTop - 10 * scale]
    ], 'rgba(154,139,93,.2)');
    ctx.strokeStyle = 'rgba(25,29,27,.7)';
    ctx.lineWidth = 2 * scale;
    ctx.beginPath();
    ctx.moveTo(x + width - 4 * scale, cabinTop - 10 * scale);
    ctx.bezierCurveTo(x + width + 80 * scale, cabinTop + 23 * scale, x + width + 110 * scale, cabinBottom + 72 * scale, x + width + 135 * scale, cabinBottom + 95 * scale);
    ctx.stroke();
  }

  function drawFortressAt(x, baseY, scale = 1, label = 'A-01') {
    const width = 332 * scale;
    const lowerTop = baseY - 184 * scale;
    const upperTop = baseY - 292 * scale;
    ctx.save();
    polygon([
      [x - 28 * scale, baseY], [x - 8 * scale, baseY - 42 * scale],
      [x + width + 16 * scale, baseY - 30 * scale], [x + width + 36 * scale, baseY]
    ], '#202b29');
    const lowerWall = ctx.createLinearGradient(x, lowerTop, x + width, baseY);
    lowerWall.addColorStop(0, '#5c6157');
    lowerWall.addColorStop(0.55, '#424b46');
    lowerWall.addColorStop(1, '#2d3936');
    ctx.fillStyle = lowerWall;
    ctx.fillRect(x, lowerTop, width, 184 * scale);
    polygon([
      [x + width, lowerTop], [x + width + 28 * scale, lowerTop + 19 * scale],
      [x + width + 28 * scale, baseY - 12 * scale], [x + width, baseY]
    ], '#283431');
    const upperWall = ctx.createLinearGradient(x + 50 * scale, upperTop, x + 266 * scale, lowerTop);
    upperWall.addColorStop(0, '#6e7165');
    upperWall.addColorStop(0.45, '#515a52');
    upperWall.addColorStop(1, '#37433f');
    ctx.fillStyle = upperWall;
    ctx.fillRect(x + 50 * scale, upperTop, 216 * scale, 108 * scale);
    ctx.fillStyle = '#697067';
    ctx.fillRect(x - 15 * scale, lowerTop - 18 * scale, width + 30 * scale, 22 * scale);
    ctx.fillRect(x + 35 * scale, upperTop - 17 * scale, 246 * scale, 20 * scale);
    ctx.fillStyle = 'rgba(18,24,23,.42)';
    ctx.fillRect(x - 7 * scale, lowerTop + 4 * scale, width + 14 * scale, 13 * scale);
    ctx.fillRect(x + 48 * scale, upperTop + 3 * scale, 220 * scale, 10 * scale);
    for (let notch = 0; notch < 7; notch += 1) {
      ctx.fillStyle = notch % 2 ? '#525b55' : '#616961';
      ctx.fillRect(x - 10 * scale + notch * 52 * scale, lowerTop - 36 * scale, 32 * scale, 20 * scale);
    }
    for (let row = 0; row < 6; row += 1) {
      const brickY = lowerTop + row * 31 * scale;
      const offset = row % 2 ? -22 * scale : 0;
      for (let column = 0; column < 7; column += 1) {
        const brickX = x + offset + column * 55 * scale;
        ctx.strokeStyle = 'rgba(23,30,28,.3)';
        ctx.lineWidth = 1.5 * scale;
        ctx.strokeRect(brickX, brickY, 53 * scale, 29 * scale);
      }
    }
    drawConcreteTexture(x, lowerTop, width, 184 * scale, scale, Math.round(x / 100) + 3);
    drawConcreteTexture(x + 50 * scale, upperTop, 216 * scale, 108 * scale, scale, Math.round(x / 100) + 9);

    ctx.fillStyle = '#0c1416';
    ctx.fillRect(x + 22 * scale, lowerTop + 37 * scale, 135 * scale, 73 * scale);
    ctx.fillStyle = '#25302f';
    ctx.fillRect(x + 31 * scale, lowerTop + 47 * scale, 117 * scale, 54 * scale);
    const aperture = ctx.createLinearGradient(x + 31 * scale, 0, x + 148 * scale, 0);
    aperture.addColorStop(0, '#090f11');
    aperture.addColorStop(0.72, '#121b1c');
    aperture.addColorStop(1, 'rgba(238,154,62,.16)');
    ctx.fillStyle = aperture;
    ctx.fillRect(x + 38 * scale, lowerTop + 53 * scale, 104 * scale, 42 * scale);
    ctx.fillStyle = '#101719';
    ctx.fillRect(x + 81 * scale, upperTop + 24 * scale, 120 * scale, 56 * scale);
    ctx.fillStyle = '#202b2b';
    ctx.fillRect(x + 91 * scale, upperTop + 33 * scale, 101 * scale, 38 * scale);
    ctx.fillStyle = 'rgba(243,176,81,.2)';
    ctx.fillRect(x + 101 * scale, upperTop + 38 * scale, 73 * scale, 7 * scale);
    ctx.fillStyle = '#1b2222';
    ctx.fillRect(x + 247 * scale, lowerTop + 50 * scale, 67 * scale, 134 * scale);
    ctx.fillStyle = '#3d4744';
    ctx.fillRect(x + 254 * scale, lowerTop + 58 * scale, 53 * scale, 126 * scale);
    for (let bar = 1; bar < 4; bar += 1) line(x + 254 * scale, lowerTop + (58 + bar * 28) * scale, x + 307 * scale, lowerTop + (58 + bar * 28) * scale, 2 * scale, 'rgba(17,23,22,.55)');
    ctx.fillStyle = 'rgba(247,181,77,.75)';
    ctx.fillRect(x + 271 * scale, lowerTop + 76 * scale, 19 * scale, 9 * scale);

    const cracks = [[44, 25, 62, 52], [182, 12, 164, 39], [220, 119, 240, 148], [82, 134, 63, 158], [287, 19, 276, 41]];
    for (const crack of cracks) {
      line(x + crack[0] * scale, lowerTop + crack[1] * scale, x + crack[2] * scale, lowerTop + crack[3] * scale, 2 * scale, 'rgba(21,27,26,.55)');
    }
    ctx.fillStyle = '#397044';
    for (let patch = 0; patch < 9; patch += 1) {
      const px = x + (18 + patch * 37) * scale;
      const py = patch % 2 ? lowerTop - 5 * scale : baseY - 17 * scale;
      ctx.fillRect(px, py, (18 + patch % 3 * 9) * scale, 8 * scale);
    }
    for (let vine = 0; vine < 3; vine += 1) {
      const vx = x + (62 + vine * 111) * scale;
      const vy = upperTop + (vine % 2) * 34 * scale;
      ctx.strokeStyle = vine % 2 ? '#2f6e40' : '#3b7d47';
      ctx.lineWidth = 3 * scale;
      ctx.beginPath();
      ctx.moveTo(vx, vy);
      ctx.bezierCurveTo(vx - 22 * scale, vy + 41 * scale, vx + 18 * scale, vy + 77 * scale, vx - 7 * scale, vy + 125 * scale);
      ctx.stroke();
      for (let leaf = 1; leaf < 5; leaf += 1) {
        ctx.fillStyle = leaf % 2 ? '#346f42' : '#2b613b';
        ctx.beginPath();
        ctx.ellipse(vx + (leaf % 2 ? -9 : 7) * scale, vy + leaf * 24 * scale, 8 * scale, 4 * scale, leaf % 2 ? -0.5 : 0.5, 0, TAU);
        ctx.fill();
      }
    }
    drawSandbagsAt(x + 160 * scale, upperTop - 14 * scale, scale * 0.62);
    for (let rubble = 0; rubble < 11; rubble += 1) {
      const rx = x - 18 * scale + rubble * 34 * scale;
      const ry = baseY - (5 + rubble % 3 * 3) * scale;
      ctx.fillStyle = rubble % 2 ? '#4a4b42' : '#5b584a';
      ctx.beginPath();
      ctx.ellipse(rx, ry, (12 + rubble % 3 * 4) * scale, (7 + rubble % 2 * 3) * scale, -0.2, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(224,216,183,.68)';
    ctx.font = `900 ${Math.max(11, 17 * scale)}px system-ui`;
    ctx.fillText(label, x + 17 * scale, baseY - 28 * scale);
    ctx.restore();
  }

  function drawBunkerAt(x, baseY, scale = 1, label = '') {
    const width = 250 * scale;
    const height = 205 * scale;
    const wall = ctx.createLinearGradient(x, baseY - height, x + width, baseY);
    wall.addColorStop(0, '#60665c');
    wall.addColorStop(0.5, '#424c48');
    wall.addColorStop(1, '#293532');
    ctx.fillStyle = wall;
    ctx.fillRect(x, baseY - height, width, height);
    polygon([[x - 20 * scale, baseY - height], [x + 38 * scale, baseY - height - 42 * scale], [x + width - 30 * scale, baseY - height - 42 * scale], [x + width + 18 * scale, baseY - height]], '#677066');
    ctx.fillStyle = 'rgba(20,27,26,.4)';
    ctx.fillRect(x - 5 * scale, baseY - height + 4 * scale, width + 10 * scale, 11 * scale);
    ctx.fillStyle = '#151d20';
    ctx.fillRect(x + 23 * scale, baseY - height + 46 * scale, 127 * scale, 70 * scale);
    ctx.fillStyle = '#0a1113';
    ctx.fillRect(x + 33 * scale, baseY - height + 57 * scale, 108 * scale, 48 * scale);
    ctx.fillStyle = '#151d20';
    ctx.fillRect(x + 176 * scale, baseY - height + 35 * scale, 43 * scale, 90 * scale);
    drawConcreteTexture(x, baseY - height, width, height, scale, Math.round(x / 90) + 14);
    for (let row = 1; row < 5; row += 1) line(x, baseY - height + row * 40 * scale, x + width, baseY - height + row * 40 * scale, 2 * scale, 'rgba(19,27,25,.3)');
    ctx.fillStyle = '#3d7948';
    for (let moss = 0; moss < 6; moss += 1) ctx.fillRect(x + (12 + moss * 42) * scale, baseY - height - (moss % 2 ? 1 : 6) * scale, (18 + moss % 3 * 8) * scale, 7 * scale);
    ctx.fillStyle = '#d3a745';
    ctx.fillRect(x + width - 37 * scale, baseY - height + 34 * scale, 14 * scale, 18 * scale);
    if (label) {
      ctx.fillStyle = 'rgba(234,219,170,.65)';
      ctx.font = `900 ${Math.max(9, 12 * scale)}px system-ui`;
      ctx.fillText(label, x + 16 * scale, baseY - 19 * scale);
    }
  }

  function drawTowerAt(x, baseY, scale = 1) {
    const top = baseY - 278 * scale;
    line(x - 59 * scale, baseY, x - 17 * scale, top, 8 * scale, '#1d292e');
    line(x + 59 * scale, baseY, x + 17 * scale, top, 8 * scale, '#1d292e');
    line(x, baseY, x, top - 76 * scale, 4 * scale, '#35434a');
    for (let level = 0; level < 7; level += 1) {
      const y0 = baseY - level * 39 * scale;
      const y1 = y0 - 37 * scale;
      const half0 = (57 - level * 5.7) * scale;
      const half1 = (51 - level * 5.7) * scale;
      line(x - half0, y0, x + half1, y1, 4 * scale, '#34434a');
      line(x + half0, y0, x - half1, y1, 4 * scale, '#25343a');
      line(x - half0, y0, x + half0, y0, 3 * scale, '#526069');
    }
    ctx.fillStyle = '#303b40';
    ctx.fillRect(x - 68 * scale, top - 7 * scale, 136 * scale, 17 * scale);
    line(x - 67 * scale, top - 11 * scale, x + 67 * scale, top - 11 * scale, 4 * scale, '#6e7778');
    line(x, top, x, top - 83 * scale, 5 * scale, '#2f3b41');
    line(x - 20 * scale, top - 35 * scale, x + 20 * scale, top - 35 * scale, 3 * scale, '#58636a');
    ctx.strokeStyle = 'rgba(29,38,39,.62)';
    ctx.lineWidth = 2 * scale;
    ctx.beginPath();
    ctx.moveTo(x - 8 * scale, top - 60 * scale);
    ctx.bezierCurveTo(x - 92 * scale, top + 8 * scale, x - 120 * scale, baseY - 55 * scale, x - 145 * scale, baseY);
    ctx.moveTo(x + 8 * scale, top - 60 * scale);
    ctx.bezierCurveTo(x + 91 * scale, top + 15 * scale, x + 118 * scale, baseY - 55 * scale, x + 145 * scale, baseY);
    ctx.stroke();
    ctx.fillStyle = '#ff4f49';
    ctx.beginPath();
    ctx.arc(x, top - 87 * scale, 6 * scale, 0, TAU);
    ctx.fill();
    const glow = ctx.createRadialGradient(x, top - 87 * scale, 1, x, top - 87 * scale, 20 * scale);
    glow.addColorStop(0, 'rgba(255,76,67,.4)');
    glow.addColorStop(1, 'rgba(255,76,67,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(x - 21 * scale, top - 108 * scale, 42 * scale, 42 * scale);
  }

  function drawAntennaAt(x, baseY, scale = 1) {
    const top = baseY - 215 * scale;
    line(x - 21 * scale, baseY, x, top, 6 * scale, '#273139');
    line(x + 21 * scale, baseY, x, top, 6 * scale, '#202b31');
    for (let y = baseY - 40 * scale; y > top + 12 * scale; y -= 34 * scale) {
      line(x - 28 * scale, y, x + 28 * scale, y, 3 * scale, '#303b42');
      line(x - 28 * scale, y, x, y - 30 * scale, 3 * scale, '#303b42');
      line(x + 28 * scale, y, x, y - 30 * scale, 3 * scale, '#303b42');
    }
    ctx.fillStyle = '#56646a';
    ctx.beginPath();
    ctx.ellipse(x + 29 * scale, top + 45 * scale, 39 * scale, 17 * scale, -0.65, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#909b9c';
    ctx.lineWidth = 4 * scale;
    ctx.beginPath();
    ctx.arc(x + 7 * scale, top + 39 * scale, 38 * scale, -1.28, 1.05);
    ctx.stroke();
    line(x + 7 * scale, top + 39 * scale, x + 54 * scale, top + 7 * scale, 3 * scale, '#9aa4a3');
    line(x, top, x, top - 47 * scale, 4 * scale, '#2c383e');
    line(x - 15 * scale, top - 22 * scale, x + 15 * scale, top - 22 * scale, 3 * scale, '#536067');
    ctx.fillStyle = '#ef514c';
    ctx.beginPath();
    ctx.arc(x, top - 51 * scale, 5 * scale, 0, TAU);
    ctx.fill();
  }

  function drawCratesAt(x, baseY, scale = 1) {
    for (let index = 0; index < 3; index += 1) {
      const size = 52 * scale;
      const column = index === 2 ? 0.5 : index;
      const cx = x + column * size * 0.92;
      const cy = baseY - size - (index === 2 ? size * 0.92 : 0);
      ctx.fillStyle = index % 2 ? '#725034' : '#805b39';
      ctx.fillRect(cx, cy, size, size);
      ctx.strokeStyle = '#d0a05d';
      ctx.lineWidth = 3 * scale;
      ctx.strokeRect(cx, cy, size, size);
      line(cx, cy, cx + size, cy + size, 2 * scale, '#c29458');
      line(cx + size, cy, cx, cy + size, 2 * scale, '#c29458');
    }
  }

  function drawSandbagsAt(x, baseY, scale = 1) {
    for (let row = 0; row < 2; row += 1) {
      const count = row === 0 ? 6 : 5;
      for (let index = 0; index < count; index += 1) {
        const cx = x + (index + row * 0.5) * 27 * scale;
        const cy = baseY - 13 * scale - row * 18 * scale;
        ctx.fillStyle = (index + row) % 2 ? '#766348' : '#897456';
        ctx.beginPath();
        ctx.ellipse(cx, cy, 18 * scale, 10 * scale, 0, 0, TAU);
        ctx.fill();
      }
    }
  }

  function drawWallAt(x, baseY, scale = 1) {
    const width = 210 * scale;
    const height = 92 * scale;
    ctx.fillStyle = '#48504e';
    ctx.fillRect(x, baseY - height, width, height);
    ctx.strokeStyle = 'rgba(20,26,27,.5)';
    ctx.lineWidth = 3 * scale;
    for (let y = baseY - height + 22 * scale; y < baseY; y += 23 * scale) line(x, y, x + width, y, 2 * scale, 'rgba(20,26,27,.55)');
    for (let column = x + 45 * scale; column < x + width; column += 52 * scale) line(column, baseY - height, column, baseY, 2 * scale, 'rgba(20,26,27,.55)');
    ctx.fillStyle = '#d7b24f';
    for (let stripe = 0; stripe < 5; stripe += 1) polygon([[x + stripe * 42 * scale, baseY - 13 * scale], [x + (stripe * 42 + 18) * scale, baseY - 13 * scale], [x + (stripe * 42 + 35) * scale, baseY], [x + (stripe * 42 + 17) * scale, baseY]], '#d7b24f');
  }

  function drawTruckAt(x, baseY, scale = 1) {
    ctx.fillStyle = '#384843';
    ctx.fillRect(x, baseY - 88 * scale, 205 * scale, 70 * scale);
    ctx.fillStyle = '#53605a';
    polygon([[x + 128 * scale, baseY - 88 * scale], [x + 188 * scale, baseY - 88 * scale], [x + 220 * scale, baseY - 51 * scale], [x + 220 * scale, baseY - 18 * scale], [x + 128 * scale, baseY - 18 * scale]], '#526159');
    ctx.fillStyle = '#1c292c';
    ctx.fillRect(x + 153 * scale, baseY - 76 * scale, 43 * scale, 28 * scale);
    for (const wheelX of [x + 48 * scale, x + 169 * scale]) {
      ctx.fillStyle = '#13191b';
      ctx.beginPath();
      ctx.arc(wheelX, baseY - 10 * scale, 24 * scale, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#59605d';
      ctx.beginPath();
      ctx.arc(wheelX, baseY - 10 * scale, 10 * scale, 0, TAU);
      ctx.fill();
    }
  }

  function drawRadarAt(x, baseY, scale = 1) {
    line(x, baseY, x, baseY - 150 * scale, 9 * scale, '#313b40');
    ctx.save();
    ctx.translate(x, baseY - 150 * scale);
    ctx.rotate(-0.35);
    ctx.fillStyle = '#65716f';
    ctx.beginPath();
    ctx.ellipse(0, 0, 72 * scale, 28 * scale, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#2a3337';
    ctx.beginPath();
    ctx.ellipse(0, 2 * scale, 57 * scale, 19 * scale, 0, 0, TAU);
    ctx.fill();
    line(0, 0, 62 * scale, 0, 4 * scale, '#84908c');
    ctx.restore();
  }

  function drawSpotlightAt(x, baseY, scale = 1) {
    line(x, baseY, x, baseY - 135 * scale, 7 * scale, '#343d41');
    const y = baseY - 142 * scale;
    ctx.fillStyle = '#2a3337';
    ctx.fillRect(x - 23 * scale, y - 13 * scale, 46 * scale, 27 * scale);
    const beam = ctx.createLinearGradient(x, y, x + 220 * scale, y - 90 * scale);
    beam.addColorStop(0, 'rgba(255,224,151,.2)');
    beam.addColorStop(1, 'rgba(255,224,151,0)');
    polygon([[x, y - 12 * scale], [x, y + 12 * scale], [x + 250 * scale, y - 72 * scale], [x + 230 * scale, y - 112 * scale]], beam);
  }

  function drawWreckAt(x, baseY, scale = 1) {
    ctx.fillStyle = '#37403e';
    polygon([[x, baseY], [x + 24 * scale, baseY - 50 * scale], [x + 117 * scale, baseY - 60 * scale], [x + 165 * scale, baseY - 18 * scale], [x + 190 * scale, baseY]], '#37403e');
    ctx.fillStyle = '#161d1f';
    ctx.fillRect(x + 67 * scale, baseY - 52 * scale, 55 * scale, 25 * scale);
    line(x + 136 * scale, baseY - 55 * scale, x + 205 * scale, baseY - 105 * scale, 8 * scale, '#2b3434');
    ctx.fillStyle = 'rgba(225,91,55,.18)';
    ctx.beginPath();
    ctx.arc(x + 38 * scale, baseY - 42 * scale, 28 * scale, 0, TAU);
    ctx.fill();
  }

  function drawCommandAt(x, baseY, scale = 1) {
    drawBunkerAt(x, baseY, scale, 'COMMAND');
    drawRadarAt(x + 145 * scale, baseY - 210 * scale, scale * 0.7);
    line(x - 35 * scale, baseY, x - 35 * scale, baseY - 265 * scale, 8 * scale, '#2d373b');
    ctx.fillStyle = '#b9423e';
    ctx.fillRect(x - 35 * scale, baseY - 265 * scale, 72 * scale, 34 * scale);
  }

  function drawMissionOneMidground() {
    const cliffItems = [
      { x: 330, scale: 1.02 }, { x: 1180, scale: 0.88 }, { x: 2100, scale: 1.08 },
      { x: 3050, scale: 0.92 }, { x: 3970, scale: 1.05 }, { x: 4850, scale: 0.94 }
    ];
    const cliffBaseY = groundAt(0) - 22;
    for (const cliff of cliffItems) {
      const x = screenX(cliff.x, 0.42);
      if (visibleX(x, 520)) drawCoastalCliffAt(x, cliffBaseY, cliff.scale, 0.82);
    }

    const midItems = [
      { type: 'palm', x: -20, scale: 1.02 },
      { type: 'antenna', x: 620, scale: 0.82 },
      { type: 'watchtower', x: 830, scale: 0.72 },
      { type: 'palm', x: 1190, scale: 0.82 },
      { type: 'bunker', x: 1480, scale: 0.76 },
      { type: 'palm', x: 1750, scale: 0.9 },
      { type: 'tower', x: 2150, scale: 0.72 },
      { type: 'bunker', x: 2650, scale: 0.82 },
      { type: 'antenna', x: 3190, scale: 0.7 },
      { type: 'watchtower', x: 3540, scale: 0.74 },
      { type: 'bunker', x: 3890, scale: 0.82 },
      { type: 'tower', x: 4380, scale: 0.76 },
      { type: 'bunker', x: 4890, scale: 0.9 }
    ];
    const factor = 0.66;
    const baseY = groundAt(0) - 17;
    ctx.save();
    ctx.globalAlpha = 0.52;
    for (const item of midItems) {
      const x = screenX(item.x, factor);
      if (!visibleX(x, 380)) continue;
      if (item.type === 'palm') drawPalmAt(x, baseY, item.scale, 1);
      if (item.type === 'bunker') drawBunkerAt(x, baseY, item.scale);
      if (item.type === 'tower') drawTowerAt(x, baseY, item.scale);
      if (item.type === 'antenna') drawAntennaAt(x, baseY, item.scale);
      if (item.type === 'watchtower') drawWatchtowerAt(x, baseY, item.scale);
    }
    ctx.restore();
  }

  function drawGenericMidground() {
    const theme = currentLevel().theme;
    const step = theme === 'factory' || theme === 'reactor' ? 430 : 510;
    const projected = state.camera.x * 0.55;
    const start = Math.floor(projected / step) - 2;
    const count = Math.ceil(view.width / step) + 5;
    const baseY = groundAt(state.camera.x) - 18;
    ctx.save();
    ctx.globalAlpha = 0.55;
    for (let offset = 0; offset < count; offset += 1) {
      const index = start + offset;
      const x = index * step - projected;
      if (theme === 'canyon' || theme === 'radio') index % 2 ? drawRadarAt(x, baseY, 0.75) : drawTowerAt(x, baseY, 0.72);
      else if (theme === 'factory' || theme === 'reactor') index % 2 ? drawAntennaAt(x, baseY, 0.78) : drawBunkerAt(x, baseY, 0.72);
      else if (theme === 'swamp') index % 2 ? drawBunkerAt(x, baseY, 0.74) : drawAntennaAt(x, baseY, 0.64);
      else if (theme === 'snow') index % 2 ? drawBunkerAt(x, baseY, 0.82) : drawRadarAt(x, baseY, 0.72);
      else if (theme === 'river' || theme === 'waterfall') index % 2 ? drawPalmAt(x, baseY, 0.86, 1) : drawBunkerAt(x, baseY, 0.7);
      else index % 2 ? drawTowerAt(x, baseY, 0.72) : drawBunkerAt(x, baseY, 0.75);
    }
    ctx.restore();
  }

  function drawTerrain() {
    const step = 28;
    let segmentStart = 0;
    while (segmentStart < view.width) {
      while (segmentStart < view.width && isPitAt(state.camera.x + segmentStart)) segmentStart += step;
      if (segmentStart >= view.width) break;
      let segmentEnd = segmentStart;
      while (segmentEnd < view.width && !isPitAt(state.camera.x + segmentEnd)) segmentEnd += step;

      ctx.beginPath();
      ctx.moveTo(segmentStart, WORLD_HEIGHT);
      ctx.lineTo(segmentStart, groundAt(state.camera.x + segmentStart));
      for (let x = segmentStart + step; x <= Math.min(segmentEnd, view.width); x += step) ctx.lineTo(x, groundAt(state.camera.x + x));
      ctx.lineTo(Math.min(segmentEnd, view.width), WORLD_HEIGHT);
      ctx.closePath();
      ctx.fillStyle = currentLevel().theme === 'snow' ? '#233743' : currentLevel().theme === 'swamp' ? '#102a19' : '#10191d';
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(segmentStart, groundAt(state.camera.x + segmentStart) - 3);
      for (let x = segmentStart + step; x <= Math.min(segmentEnd, view.width); x += step) ctx.lineTo(x, groundAt(state.camera.x + x) - 3);
      ctx.strokeStyle = currentLevel().theme === 'snow' ? 'rgba(235,246,252,.82)' : currentLevel().theme === 'swamp' ? 'rgba(82,143,82,.75)' : 'rgba(188,163,91,.78)';
      ctx.lineWidth = 5;
      ctx.stroke();

      if (currentLevel().id === 1) {
        for (let x = segmentStart; x < Math.min(segmentEnd, view.width); x += 58) {
          const ground = groundAt(state.camera.x + x);
          ctx.fillStyle = Math.floor((state.camera.x + x) / 58) % 2 ? '#323b38' : '#3d443e';
          ctx.fillRect(x, ground + 3, 55, 24);
          line(x, ground + 3, x, ground + 28, 2, 'rgba(12,18,18,.55)');
          ctx.fillStyle = 'rgba(56,113,62,.72)';
          ctx.fillRect(x + 5, ground - 1, 18 + (Math.floor(x / 58) % 3) * 7, 5);
        }
      }
      segmentStart = segmentEnd + step;
    }

    const groundGradient = ctx.createLinearGradient(0, WORLD_HEIGHT * 0.76, 0, WORLD_HEIGHT);
    groundGradient.addColorStop(0, 'rgba(255,255,255,.02)');
    groundGradient.addColorStop(1, 'rgba(0,0,0,.3)');
    ctx.fillStyle = groundGradient;
    ctx.fillRect(0, WORLD_HEIGHT * 0.76, view.width, WORLD_HEIGHT * 0.24);
  }

  function drawMissionOneDecor() {
    for (const item of MISSION_ONE_DECOR) {
      const x = screenX(item.x);
      if (!visibleX(x, 340)) continue;
      const baseY = groundAt(item.x) - 5;
      if (item.type === 'palm') drawPalmAt(x, baseY, item.scale);
      if (item.type === 'bunker') drawBunkerAt(x, baseY, item.scale, item.label);
      if (item.type === 'tower') drawTowerAt(x, baseY, item.scale);
      if (item.type === 'antenna') drawAntennaAt(x, baseY, item.scale);
      if (item.type === 'crates') drawCratesAt(x, baseY, item.scale);
      if (item.type === 'sandbags') drawSandbagsAt(x, baseY, item.scale);
      if (item.type === 'wall') drawWallAt(x, baseY, item.scale);
      if (item.type === 'truck') drawTruckAt(x, baseY, item.scale);
      if (item.type === 'radar') drawRadarAt(x, baseY, item.scale);
      if (item.type === 'spotlight') drawSpotlightAt(x, baseY, item.scale);
      if (item.type === 'wreck') drawWreckAt(x, baseY, item.scale);
      if (item.type === 'command') drawCommandAt(x, baseY, item.scale);
      if (item.type === 'growth') drawTropicalGrowthAt(x, baseY, item.scale);
      if (item.type === 'flag') drawFlagAt(x, baseY, item.scale);
      if (item.type === 'watchtower') drawWatchtowerAt(x, baseY, item.scale);
      if (item.type === 'fortress') drawFortressAt(x, baseY, item.scale, item.label);
    }
  }

  function drawGenericGameDecor() {
    const level = currentLevel();
    const start = Math.floor(state.camera.x / 460) - 1;
    const end = Math.ceil((state.camera.x + view.width) / 460) + 1;
    for (let index = start; index <= end; index += 1) {
      const worldX = index * 460 + 240;
      if (worldX < 150 || worldX > level.length - 180 || isPitAt(worldX)) continue;
      const x = screenX(worldX);
      const baseY = groundAt(worldX) - 5;
      const variant = Math.abs(index + level.id) % 5;
      if (variant === 0) drawCratesAt(x, baseY, 0.82);
      if (variant === 1) drawSandbagsAt(x, baseY, 0.9);
      if (variant === 2) drawWallAt(x, baseY, 0.68);
      if (variant === 3) drawSpotlightAt(x, baseY, 0.72);
      if (variant === 4) drawWreckAt(x, baseY, 0.65);
    }
  }

  function drawPlatforms() {
    for (const platform of state.platforms) {
      const x = screenX(platform.x);
      if (!visibleX(x, platform.w + 30)) continue;
      ctx.fillStyle = '#2e3738';
      ctx.fillRect(x, platform.y, platform.w, platform.h);
      ctx.fillStyle = '#879168';
      ctx.fillRect(x, platform.y, platform.w, 4);
      ctx.fillStyle = 'rgba(0,0,0,.28)';
      ctx.fillRect(x + 8, platform.y + platform.h, platform.w - 16, 9);
      line(x + 18, platform.y + platform.h + 8, x + 18, groundAt(platform.x) - 6, 6, '#303638');
      line(x + platform.w - 18, platform.y + platform.h + 8, x + platform.w - 18, groundAt(platform.x + platform.w) - 6, 6, '#303638');
    }
  }

  function drawGate() {
    const encounter = activeEncounter();
    if (!encounter) return;
    const x = screenX(encounter.lockX);
    if (!visibleX(x, 90)) return;
    const ground = groundAt(encounter.lockX);
    const gradient = ctx.createLinearGradient(x - 35, 0, x + 35, 0);
    gradient.addColorStop(0, 'rgba(255,89,72,0)');
    gradient.addColorStop(0.5, 'rgba(255,89,72,.48)');
    gradient.addColorStop(1, 'rgba(255,89,72,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(x - 36, 185, 72, ground - 185);
    line(x, ground, x, 185, 5, '#ff5f53');
    for (let y = 205; y < ground; y += 36) line(x - 25, y, x + 25, y + 20, 2, 'rgba(255,197,111,.55)');
    ctx.fillStyle = '#ffbd66';
    ctx.font = '900 11px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('СЕКТОР ЗАКРЫТ', x, 168);
    ctx.textAlign = 'start';
  }

  function drawShadow(entity, alpha = 0.3) {
    const sprite = entitySpriteRect(entity);
    const x = sprite.x - state.camera.x + sprite.w * 0.5;
    const y = entity.y + entity.h - 3;
    if (!visibleX(x, sprite.w)) return;
    ctx.fillStyle = `rgba(0,0,0,${alpha})`;
    ctx.beginPath();
    ctx.ellipse(x, y, sprite.w * 0.28, Math.max(7, sprite.h * 0.055), 0, 0, TAU);
    ctx.fill();
  }

  function drawActorImage(image, entity, flip = false) {
    const sprite = entitySpriteRect(entity);
    const x = sprite.x - state.camera.x;
    if (!visibleX(x, sprite.w * 1.5)) return;

    if (!image?.complete || !image.naturalWidth) {
      ctx.fillStyle = entity.kind === 'player' ? '#e47a4d' : entity.type === 'drone' ? '#4b97a5' : '#b55b48';
      ctx.fillRect(x, sprite.y, sprite.w, sprite.h);
      return;
    }

    ctx.save();
    if (flip) {
      ctx.translate(x + sprite.w * 0.5, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(image, -sprite.w * 0.5, sprite.y, sprite.w, sprite.h);
    } else {
      ctx.drawImage(image, x, sprite.y, sprite.w, sprite.h);
    }
    ctx.restore();
  }

  function drawPlayer() {
    const player = state.player;
    if (!player || state.respawnTimer > 0) return;
    drawShadow(player, 0.34);
    ctx.save();
    if (player.invulnerable > 0 && Math.floor(state.time * 13) % 2) ctx.globalAlpha = 0.42;
    drawActorImage(IMAGES.hero, player, player.direction < 0);
    ctx.restore();
  }

  function drawEnemies() {
    for (const enemy of state.enemies) {
      if (enemy.dead) continue;
      const sprite = entitySpriteRect(enemy);
      const x = sprite.x - state.camera.x;
      if (!visibleX(x, sprite.w * 1.6)) continue;

      ctx.save();
      if (enemy.spawnTimer > 0) {
        const progress = 1 - enemy.spawnTimer / 0.75;
        ctx.globalAlpha = clamp(progress, 0.08, 1);
        ctx.translate(0, -Math.max(0, enemy.spawnTimer) * 70);
        const beam = ctx.createLinearGradient(x, sprite.y - 60, x, sprite.y + sprite.h);
        beam.addColorStop(0, 'rgba(100,220,255,0)');
        beam.addColorStop(1, 'rgba(100,220,255,.18)');
        ctx.fillStyle = beam;
        ctx.fillRect(x - 15, sprite.y - 70, sprite.w + 30, sprite.h + 90);
      }

      if (enemy.type !== 'drone') drawShadow(enemy, enemy.type === 'boss' ? 0.42 : 0.29);
      drawActorImage(IMAGES[enemy.type] || IMAGES.rifle, enemy, enemy.direction > 0);

      if (enemy.type === 'boss' && IMAGES.turret?.complete) {
        ctx.drawImage(IMAGES.turret, x + sprite.w * 0.47, sprite.y + 20, sprite.w * 0.46, sprite.h * 0.27);
      }
      ctx.restore();

      if (enemy.hp < enemy.maxHp && enemy.spawnTimer <= 0) {
        const width = sprite.w * 0.7;
        const barX = x + sprite.w * 0.15;
        const barY = sprite.y - 13;
        ctx.fillStyle = 'rgba(0,0,0,.5)';
        ctx.fillRect(barX, barY, width, 7);
        ctx.fillStyle = enemy.type === 'drone' ? '#7ce6ff' : enemy.type === 'boss' ? '#ff665c' : '#f3a06c';
        ctx.fillRect(barX, barY, width * clamp(enemy.hp / enemy.maxHp, 0, 1), 7);
      }
    }
  }

  function drawProjectiles() {
    for (const projectile of state.projectiles) {
      const x = screenX(projectile.x);
      if (!visibleX(x, 40)) continue;
      const color = projectile.owner === 'player' ? '#ffd45d' : '#ff6964';
      const trail = projectile.owner === 'player' ? 'rgba(255,212,93,.55)' : 'rgba(255,105,100,.48)';
      line(x - projectile.vx * 0.022, projectile.y - projectile.vy * 0.022, x, projectile.y, 3, trail);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, projectile.y, projectile.r, 0, TAU);
      ctx.fill();
    }

    for (const particle of state.particles) {
      const x = screenX(particle.x);
      if (!visibleX(x, 20)) continue;
      ctx.globalAlpha = clamp(particle.life / particle.maxLife, 0, 1);
      ctx.fillStyle = particle.color;
      ctx.fillRect(x, particle.y, particle.size, particle.size);
    }
    ctx.globalAlpha = 1;
  }

  function drawExtraction() {
    if (!state.extract) return;
    const worldX = currentLevel().length - 105;
    const x = screenX(worldX);
    if (!visibleX(x, 100)) return;
    const ground = groundAt(worldX);
    const glow = ctx.createLinearGradient(x - 45, 0, x + 45, 0);
    glow.addColorStop(0, 'rgba(92,235,151,0)');
    glow.addColorStop(0.5, 'rgba(92,235,151,.28)');
    glow.addColorStop(1, 'rgba(92,235,151,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(x - 48, 155, 96, ground - 155);
    line(x, ground, x, 168, 4, '#79edaa');
    ctx.fillStyle = '#85f1b0';
    ctx.font = '900 14px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('ЭВАКУАЦИЯ', x, 145);
    ctx.textAlign = 'start';
  }

  function drawWeather() {
    const theme = currentLevel().theme;
    if (theme === 'coast') {
      ctx.save();
      for (let mote = 0; mote < 34; mote += 1) {
        const x = (mote * 173 + state.time * (4 + mote % 5)) % (view.width + 80) - 40;
        const y = 285 + ((mote * 67) % 365);
        ctx.globalAlpha = 0.05 + (mote % 4) * 0.025;
        ctx.fillStyle = mote % 3 ? '#ffe1a3' : '#d8f1dc';
        ctx.beginPath();
        ctx.arc(x, y, 1 + mote % 3, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }
    if (theme === 'factory' || theme === 'city' || theme === 'reactor') {
      ctx.save();
      ctx.globalAlpha = 0.2;
      for (let index = 0; index < 72; index += 1) {
        const x = (index * 137 + state.time * 420) % view.width;
        const y = (index * 83 + state.time * 760) % WORLD_HEIGHT;
        line(x, y, x - 10, y + 38, 2, '#d9e9ff');
      }
      ctx.restore();
    }
    if (theme === 'snow') {
      ctx.save();
      for (let index = 0; index < 62; index += 1) {
        const x = (index * 149 + state.time * (22 + (index % 5))) % view.width;
        const y = (index * 91 + state.time * (55 + (index % 7))) % WORLD_HEIGHT;
        ctx.globalAlpha = 0.28 + (index % 4) * 0.08;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(x, y, 1.4 + (index % 3), 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }
    if (theme === 'swamp') {
      const base = groundAt(state.camera.x + view.width * 0.5);
      for (let index = 0; index < 9; index += 1) {
        const x = (index * 173 - state.camera.x * 0.24) % (view.width + 220) - 80;
        const y = base - 100 - (index % 3) * 45;
        const radius = 50 + (index % 4) * 14;
        const glow = ctx.createRadialGradient(x, y, 0, x, y, radius);
        glow.addColorStop(0, 'rgba(79,255,140,.12)');
        glow.addColorStop(1, 'rgba(79,255,140,0)');
        ctx.fillStyle = glow;
        ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
      }
    }
  }

  function drawForeground() {
    const theme = currentLevel().theme;
    const projected = state.camera.x * 1.08;
    const step = 320;
    const start = Math.floor(projected / step) - 2;
    const count = Math.ceil(view.width / step) + 5;
    ctx.save();
    ctx.fillStyle = theme === 'snow' ? 'rgba(18,32,45,.2)' : theme === 'swamp' ? 'rgba(3,29,15,.28)' : 'rgba(3,8,13,.23)';
    for (let offset = 0; offset < count; offset += 1) {
      const index = start + offset;
      const x = index * step - projected;
      const height = 24 + seeded(index + 9) * 60;
      const width = 80 + seeded(index * 3 + 2) * 105;
      polygon([[x - width * 0.5, WORLD_HEIGHT], [x - width * 0.34, groundAt(state.camera.x + x) + 26], [x, groundAt(state.camera.x + x) - height], [x + width * 0.34, groundAt(state.camera.x + x) + 20], [x + width * 0.5, WORLD_HEIGHT]], ctx.fillStyle);
    }
    ctx.restore();

    if (theme === 'coast') {
      const foliageShift = state.camera.x * 1.12;
      for (let index = -1; index < Math.ceil(view.width / 270) + 2; index += 1) {
        const x = index * 270 - (foliageShift % 270);
        drawTropicalGrowthAt(x, WORLD_HEIGHT + 8, 0.72 + (index % 3) * 0.08, 0.34);
      }
    }

    const vignette = ctx.createRadialGradient(view.width * 0.5, WORLD_HEIGHT * 0.48, WORLD_HEIGHT * 0.28, view.width * 0.5, WORLD_HEIGHT * 0.48, Math.max(view.width, WORLD_HEIGHT) * 0.72);
    vignette.addColorStop(0.58, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,.22)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, view.width, WORLD_HEIGHT);
  }

  function drawDebug() {
    if (!debug) return;
    ctx.save();
    ctx.lineWidth = 2;
    const entities = [state.player, ...state.enemies].filter(Boolean);
    for (const entity of entities) {
      const sprite = entitySpriteRect(entity);
      const hitbox = entityHitbox(entity);
      ctx.strokeStyle = '#55d6ff';
      ctx.strokeRect(sprite.x - state.camera.x, sprite.y, sprite.w, sprite.h);
      ctx.strokeStyle = '#ff4f68';
      ctx.strokeRect(hitbox.x - state.camera.x, hitbox.y, hitbox.w, hitbox.h);
    }
    ctx.fillStyle = 'rgba(3,8,13,.75)';
    ctx.fillRect(8, 82, 320, 78);
    ctx.fillStyle = '#fff';
    ctx.font = '12px monospace';
    ctx.fillText(`canvas ${Math.round(view.cssWidth)}×${Math.round(view.cssHeight)} @${view.dpr.toFixed(2)}`, 16, 103);
    ctx.fillText(`world ${Math.round(view.width)}×${WORLD_HEIGHT} camera ${Math.round(state.camera.x)}`, 16, 123);
    ctx.fillText(`hero ${Math.round(state.player?.x || 0)} · ${(160 / WORLD_HEIGHT * 100).toFixed(1)}% scene height`, 16, 143);
    ctx.restore();
  }

  function renderGame() {
    ctx.clearRect(0, 0, view.width, WORLD_HEIGHT);
    drawSky();
    drawFarBackground();
    if (currentLevel().id === 1) drawMissionOneMidground();
    else drawGenericMidground();
    drawTerrain();
    if (currentLevel().id === 1) drawMissionOneDecor();
    else drawGenericGameDecor();
    drawPlatforms();
    drawGate();
    drawEnemies();
    drawPlayer();
    drawProjectiles();
    drawExtraction();
    drawWeather();
    drawForeground();
    drawDebug();
  }

  function setPadFromPointer(event) {
    const rect = UI.pad.getBoundingClientRect();
    const centerX = rect.left + rect.width * 0.5;
    const centerY = rect.top + rect.height * 0.5;
    const dx = event.clientX - centerX;
    const dy = event.clientY - centerY;
    const max = rect.width * 0.28;
    const length = Math.hypot(dx, dy) || 1;
    const ratio = Math.min(1, max / length);
    const visualX = dx * ratio;
    const visualY = dy * ratio;
    UI.stick.style.transform = `translate(calc(-50% + ${visualX}px), calc(-50% + ${visualY}px))`;
    input.x = clamp(dx / max, -1, 1);
    input.y = clamp(dy / max, -1, 1);
  }

  function resetPad() {
    input.x = 0;
    input.y = 0;
    if (UI.stick) UI.stick.style.transform = 'translate(-50%, -50%)';
    UI.pad?.classList.remove('active');
  }

  function setupInput() {
    let padPointerId = null;
    UI.pad?.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      padPointerId = event.pointerId;
      UI.pad.setPointerCapture(event.pointerId);
      UI.pad.classList.add('active');
      setPadFromPointer(event);
    });
    UI.pad?.addEventListener('pointermove', (event) => {
      if (event.pointerId === padPointerId) setPadFromPointer(event);
    });
    const releasePad = (event) => {
      if (event && padPointerId !== null && event.pointerId !== padPointerId) return;
      padPointerId = null;
      resetPad();
    };
    UI.pad?.addEventListener('pointerup', releasePad);
    UI.pad?.addEventListener('pointercancel', releasePad);
    UI.pad?.addEventListener('lostpointercapture', releasePad);

    UI.jump?.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      jumpPlayer();
    });
    UI.fire?.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      UI.fire.setPointerCapture?.(event.pointerId);
      input.firing = true;
      firePlayerWeapon();
    });
    for (const eventName of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      UI.fire?.addEventListener(eventName, () => {
        input.firing = false;
      });
    }

    const keys = new Set();
    window.addEventListener('keydown', (event) => {
      keys.add(event.code);
      if (['Space', 'ArrowUp', 'KeyW'].includes(event.code) && !event.repeat) jumpPlayer();
      if (['KeyX', 'KeyJ', 'KeyK'].includes(event.code)) input.firing = true;
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(event.code)) event.preventDefault();
    });
    window.addEventListener('keyup', (event) => {
      keys.delete(event.code);
      if (['KeyX', 'KeyJ', 'KeyK'].includes(event.code)) input.firing = false;
    });

    return function updateKeyboard() {
      let horizontal = 0;
      let vertical = 0;
      if (keys.has('ArrowLeft') || keys.has('KeyA')) horizontal = -1;
      if (keys.has('ArrowRight') || keys.has('KeyD')) horizontal = 1;
      if (keys.has('ArrowUp') || keys.has('KeyW')) vertical = -1;
      if (keys.has('ArrowDown') || keys.has('KeyS')) vertical = 1;
      if (horizontal || vertical) {
        input.x = horizontal;
        input.y = vertical;
      } else if (padPointerId === null) {
        input.x = 0;
        input.y = 0;
      }
    };
  }

  const updateKeyboard = setupInput();

  function openPause() {
    if (state.mode !== 'play') return;
    state.paused = true;
    input.firing = false;
    UI.pauseModal?.classList.remove('hidden');
    track('pause');
  }

  function closePause() {
    state.paused = false;
    UI.pauseModal?.classList.add('hidden');
  }

  $('play')?.addEventListener('click', () => {
    const run = progressStore.run;
    const missionIndex = run ? clamp(Number(run.mission) - 1, 0, progressStore.unlocked - 1) : 0;
    prepareMission(missionIndex, true);
  });
  $('gameBack')?.addEventListener('click', openPause);
  $('pause')?.addEventListener('click', openPause);
  $('resume')?.addEventListener('click', closePause);
  $('pauseMenu')?.addEventListener('click', exitToMenu);
  UI.modalMenu?.addEventListener('click', exitToMenu);

  $('backCatalog')?.addEventListener('click', () => {
    if (new URLSearchParams(location.search).get('embedded') === '1') parent.postMessage({ type: 'rgp-close-steel' }, location.origin);
    else history.back();
  });

  $('share')?.addEventListener('click', () => {
    const url = 'https://t.me/RetroGamesPlayBot/retrogames?startapp=game_share';
    const text = 'Стальной десант — ретро run-and-gun прямо в Telegram';
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
    track('share');
    try {
      window.Telegram?.WebApp?.openTelegramLink(shareUrl);
    } catch {
      location.href = shareUrl;
    }
  });

  function setupViewportObservers() {
    const observer = new ResizeObserver(() => requestAnimationFrame(resizeCanvas));
    observer.observe(canvasWrap);
    window.addEventListener('resize', () => requestAnimationFrame(resizeCanvas), { passive: true });
    window.addEventListener('orientationchange', () => window.setTimeout(resizeCanvas, 80), { passive: true });
    try {
      const telegram = window.Telegram?.WebApp;
      telegram?.ready?.();
      telegram?.expand?.();
      telegram?.onEvent?.('viewportChanged', () => requestAnimationFrame(resizeCanvas));
    } catch {}
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && state.mode === 'play' && !state.paused) openPause();
  });
  window.addEventListener('pagehide', saveRun);

  let previousTime = performance.now();
  function frame(now) {
    const dt = Math.min(0.033, Math.max(0, (now - previousTime) / 1000));
    previousTime = now;
    updateKeyboard();
    updateGame(dt);
    if (state.mode !== 'menu') renderGame();
    requestAnimationFrame(frame);
  }

  window.SteelAssaultV9 = {
    build: BUILD,
    state,
    view,
    levels: LEVELS,
    resize: resizeCanvas,
    start: (mission = 1, resume = false) => prepareMission(clamp(Number(mission) - 1, 0, 11), resume),
    diagnostics() {
      return {
        build: BUILD,
        mode: state.mode,
        mission: state.missionIndex + 1,
        canvasCss: { width: view.cssWidth, height: view.cssHeight },
        canvasPixels: { width: canvas.width, height: canvas.height, dpr: view.dpr },
        worldViewport: { width: view.width, height: view.height },
        heroSceneRatio: 160 / WORLD_HEIGHT,
        playerX: state.player?.x ?? null,
        cameraX: state.camera.x,
        cameraAnchor: state.camera.anchor,
        activeEncounter: activeEncounter()?.id || null,
        extract: state.extract,
        enemies: state.enemies.length
      };
    }
  };

  document.documentElement.dataset.steelBuild = BUILD;
  renderMenu();
  setupViewportObservers();
  resizeCanvas();
  requestAnimationFrame(frame);
  track('game_ready', { version: BUILD, renderer: 'single' });

  const query = new URLSearchParams(location.search);
  if (query.get('autostart') === '1') {
    const mission = clamp(Number(query.get('mission')) || 1, 1, 12);
    requestAnimationFrame(() => prepareMission(mission - 1, false));
  }
})();
