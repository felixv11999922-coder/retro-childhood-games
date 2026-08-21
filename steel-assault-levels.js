'use strict';
window.SteelAssaultLevels=[
 {id:1,name:'Штурм аванпоста',description:'Высадка у передового вражеского поста. Пройди лесной рубеж, подави охрану и уничтожь сторожевую платформу.',mode:'horizontal',theme:'frontier',scene:'frontier_outpost',length:4000,difficulty:.62,boss:'Сторожевая платформа',bossType:'fortress',hazards:'none',pickups:['V','F']},
 {id:2,name:'Речной перевал',description:'Пробейся через разрушенную переправу над быстрой рекой. Прыгай через разрывы моста и удержи плацдарм.',mode:'horizontal',theme:'river',scene:'river_pass',length:4450,difficulty:.72,boss:'Амфибия-12',bossType:'walker',hazards:'pits',pickups:['V','F','B']},
 {id:3,name:'Цитадель водопада',description:'Вертикальный штурм гидрокрепости среди скал и водопадов. Поднимайся по платформам, уклоняйся от камней и доберись до командного узла.',mode:'vertical',theme:'waterfall',scene:'waterfall_citadel',height:3350,difficulty:.80,boss:'Гидра-9',bossType:'orbiter',hazards:'rocks',pickups:['F','L']},
 {id:4,name:'Каньон B-17',mode:'horizontal',theme:'energy',scene:'canyon_radar',length:4700,difficulty:.86,boss:'Магмовый страж',bossType:'titan',hazards:'flame',pickups:['V','L','B']},
 {id:5,name:'Бункер-7',mode:'bunker',theme:'bunker',scene:'bunker',rooms:4,difficulty:.90,boss:'Оптическое ядро',bossType:'eye',hazards:'gate',pickups:['F','L']},
 {id:6,name:'Ледяной фронт',mode:'horizontal',theme:'snow',scene:'snow_base',length:5000,difficulty:.95,boss:'Полярный шагоход',bossType:'walker',hazards:'pits',pickups:['V','F','X']},
 {id:7,name:'Завод прессов',mode:'horizontal',theme:'factory',scene:'rain_factory',length:5100,difficulty:1.00,boss:'Пресс-мастер',bossType:'titan',hazards:'press',pickups:['L','B']},
 {id:8,name:'Небесный мост',mode:'horizontal',theme:'sky',scene:'sky_bridge',length:5250,difficulty:1.05,boss:'Аэроносец',bossType:'carrier',hazards:'pits',pickups:['F','V','B']},
 {id:9,name:'Башня связи',mode:'vertical',theme:'tower',scene:'canyon_radar',height:3700,difficulty:1.10,boss:'Сфера связи',bossType:'orbiter',hazards:'rocks',pickups:['L','F','B']},
 {id:10,name:'Реакторный коридор',mode:'bunker',theme:'reactor',scene:'rain_reactor',rooms:5,difficulty:1.15,boss:'Двойной протокол',bossType:'eye',hazards:'gate',pickups:['V','L','X']},
 {id:11,name:'Живая матрица',mode:'horizontal',theme:'bio',scene:'swamp_lab',length:5450,difficulty:1.20,boss:'Матка роя',bossType:'carrier',hazards:'flame',pickups:['F','L','B']},
 {id:12,name:'Последний протокол',mode:'arena',theme:'final',scene:'final_core',length:1600,difficulty:1.28,boss:'Командный нуль',bossType:'final',hazards:'mixed',pickups:['F','L','B']}
];
