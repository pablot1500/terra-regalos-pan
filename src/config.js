// ============================================================
//  Terrari Pancha — configuración general del juego
//  Casi todo lo "ajustable" (precios, dureza, textos) vive acá.
// ============================================================

// ---- Mundo ----
export const TILE = 8;               // px por bloque (resolución virtual)
export const CHUNK = 16;             // bloques por chunk de render
export const WORLD_W = 79;           // ancho del mundo en bloques
export const SURFACE = 40;           // fila donde empieza el suelo
export const METERS_PER_TILE = 2;    // cada bloque = 2 metros de profundidad
export const MAX_DEPTH = 1500;       // metros hasta el núcleo
export const CORE_ROW = SURFACE + MAX_DEPTH / METERS_PER_TILE; // donde termina la roca y empieza el núcleo
export const CORE_ROWS = 96;         // alto de la caverna del núcleo (en bloques): una caída larga
export const BOTTOM_ROW = CORE_ROW + CORE_ROWS; // primera fila de roca madre
export const WORLD_H = BOTTOM_ROW + 3;
export const EDGE = 2;               // columnas de roca madre a cada lado
export const DEFAULT_SEED = 14022;   // mismo mundo para los dos jugadores

// ---- Personajes (los nombres se pueden cambiar acá) ----
export const CHARACTERS = {
  pablo: { name: 'Pablo' },
  pancha: { name: 'Panchi' },
};

// ---- Física ----
export const PHYS = {
  gravity: 640,
  maxFall: 430,
  walk: 74,
  accelGround: 1000,
  accelAir: 620,
  jump: 182,
  stepUp: 9,             // sube escalones de 1 bloque solo
  safeFallTiles: 9,      // caer más de esto (18 m) lastima
  safeFallPerArmor: 1.5, // cada nivel de armadura suma bloques de caída segura
  fallDmgPerTile: 4,     // daño por cada bloque extra de caída
  jetAccel: 1050,
  sprintMult: 1.7,       // Shift: correr (también volando)
};

// Modo vuelo del jetpack (se prende y apaga con E): h/v = velocidad, acc = qué tan rápido responde
export const HOVER = [
  null,
  { h: 120, v: 150, acc: 900 },   // anteúltimo nivel: vuelo estable y manejable
  { h: 210, v: 270, acc: 2600 },  // último nivel: rapidísimo y muy preciso
];

// Lava (de los 1000 m para abajo): se derrama como un líquido y quema
export const LAVA = {
  from: 1000,       // metros donde empiezan a aparecer los parches
  dps: 40,          // daño por segundo al tocarla (la armadura del último nivel lo baja)
  tick: 1 / 40,     // cada cuánto se mueve el líquido
};

export const HP_MAX = 100;
export const REST = { energyPerSec: 110, hpPerSec: 70 };
export const DEATH_MONEY_PENALTY = 0.1; // pierden 10% de la plata si se desmayan/mueren

// ---- Cavado ----
export const DIG = {
  baseTime: 0.42,    // segundos por palazo cuando fuerza == dureza
  minTime: 0.07,
  energyCost: [0.7, 0.65, 0.6, 0.55, 0.5, 0.45, 0.4, 0.35], // energía por palazo según el nivel de pala
  reach: 6,          // px de alcance más allá del borde del personaje
  reachMult: 1.3,    // multiplicador del alcance total (+30%)
  reachPerUpgrade: 0.10, // +10% de alcance por cada mejora de fuerza o de pala ancha
};

// cáscara de cristal de las cámaras de regalo: se pica de a poquito, sin importar la pala
export const CRYSTAL_DIG = {
  depth: 5,      // px de cristal que avanza cada palazo (aunque la pala sea muy ancha)
  width: 9,      // medio ancho del hueco, de costado a la pala: entra el personaje justo
  time: 0.55,    // segundos mínimos por palazo cuando hay cristal en juego
};

// Radio (en px) del círculo que saca cada palazo, según el nivel de pala ancha
export const BRUSH_R = [10, 11.5, 13.5, 16, 19, 23, 28];

// Colores del filo de la pala según el nivel de fuerza
export const SHOVEL_BLADES = [
  ['#8d96a0', '#c3cad2', '#5b636d'], // hierro
  ['#b9c6d2', '#eef4f9', '#6f7f8f'], // acero
  ['#e6a92e', '#fff0a0', '#9c6a12'], // oro
  ['#36c47c', '#b6ffd8', '#1c7a4a'], // esmeralda
  ['#ff4f74', '#ffc0cf', '#a8203f'], // rubí
  ['#6fdcff', '#eafcff', '#2c8db5'], // diamante
  ['#ff7ac8', '#ffe1f3', '#b0307a'], // pala del amor
];

// ---- Capas del subsuelo (en metros) ----
export const LAYERS = [
  { name: 'Tierra', to: 80 },
  { name: 'Arcilla', to: 200 },
  { name: 'Piedra', to: 350 },
  { name: 'Granito', to: 550 },
  { name: 'Basalto', to: 800 },
  { name: 'Abismo', to: 1000 },
  { name: 'Obsidiana', to: 99999 },
];

// ---- Tesoros ----
export const ITEMS = [
  null,
  { key: 'coin', name: 'Moneda', value: 1, sfx: 'coin' },
  { key: 'coins', name: 'Moneda de plata', value: 4, sfx: 'coin' },
  { key: 'bill', name: 'Billete de $1000', value: 10, sfx: 'bill' },
  { key: 'billstack', name: 'Dólar', value: 35, sfx: 'bill' },
  { key: 'goldbar', name: 'Lingote de oro', value: 120, sfx: 'gold' },
  { key: 'ruby', name: 'Rubí', value: 300, sfx: 'gem', glow: [255, 80, 110] },
  { key: 'emerald', name: 'Esmeralda', value: 650, sfx: 'gem', glow: [60, 220, 150] },
  { key: 'diamond', name: 'Diamante', value: 1500, sfx: 'gem', glow: [140, 230, 255] },
  { key: 'moneybag', name: 'Bolsa de plata', value: 900, sfx: 'gold' },
  { key: 'gembag', name: 'Bolsa de diamantes', value: 3000, sfx: 'gem', glow: [200, 160, 255] },
  { key: 'crown', name: 'Corona', value: 5000, sfx: 'gem', glow: [255, 220, 120] },
];

// Por capa: probabilidad de que un bloque tenga tesoro y pesos de cada ítem
export const LAYER_LOOT = [
  { density: 0.14, w: { 1: 55, 2: 35, 3: 10 } },
  { density: 0.13, w: { 1: 15, 2: 40, 3: 35, 4: 10 } },
  { density: 0.10, w: { 2: 25, 3: 40, 4: 25, 5: 10 } },
  { density: 0.10, w: { 3: 20, 4: 40, 5: 32, 6: 8 } },
  { density: 0.10, w: { 4: 22, 5: 42, 6: 22, 7: 8, 9: 6 } },
  { density: 0.10, w: { 5: 22, 6: 28, 7: 22, 8: 12, 9: 10, 10: 4, 11: 2 } },
  // obsidiana: cada vez menos tesoros a medida que se baja (de 0.045 a 0.008)
  { density: 0.045, fadeTo: 0.008, w: { 7: 18, 8: 30, 9: 14, 10: 24, 11: 14 } },
];

// ---- Mejoras (compartidas entre los dos jugadores) ----
// levels: [valor, costo]. El nivel 0 es el inicial (gratis).
export const UPGRADES = [
  {
    id: 'pala', name: 'Herramienta de cavar', icon: 'shovel',
    desc: 'Más fuerza: rompe materiales más duros, cava más rápido y llega un poco más lejos.',
    levels: [[1, 0], [2, 60], [4, 330], [7, 1350], [11, 4800], [16, 15000], [24, 36000], [34, 80000]],
    label: (v) => `Fuerza ${v}`,
    tiers: ['Pala de hierro', 'Pala de acero', 'Pala de oro', 'Taladro', 'Taladro turbo', 'Taladro de diamante', 'Mega taladro del amor', 'Taladro cósmico'],
  },
  {
    id: 'ancho', name: 'Pala ancha', icon: 'wide',
    desc: 'Cava más área de un solo palazo y llega un poco más lejos.',
    levels: [[0, 0], [1, 150], [2, 800], [3, 3000], [4, 9000], [5, 21000], [6, 45000]],
    label: (v) => ['Ancha', 'Muy ancha', 'Enorme', 'Gigante', 'Colosal', 'Titánica', 'Descomunal'][v],
  },
  {
    id: 'bateria', name: 'Batería', icon: 'battery',
    desc: 'Más energía para cavar y volar sin volver a casa.',
    levels: [[210, 0], [290, 90], [400, 380], [550, 1350], [750, 4200], [1000, 11250], [Infinity, 30000]],
    label: (v) => (v === Infinity ? 'Energía infinita' : `${v} de energía`),
  },
  {
    id: 'armadura', name: 'Armadura', icon: 'armor',
    desc: 'Te protege de los golpes cuando caés de muy alto. Al máximo, también de la lava.',
    // a = % menos de daño por caídas, lava = % menos de daño por lava
    levels: [[{ a: 0, lava: 0 }, 0], [{ a: 25, lava: 0 }, 120], [{ a: 45, lava: 0 }, 600], [{ a: 60, lava: 0 }, 2250], [{ a: 75, lava: 0 }, 6750], [{ a: 90, lava: 0 }, 16500], [{ a: 100, lava: 0 }, 32000], [{ a: 100, lava: 80 }, 70000]],
    label: (v) => (v.lava ? `Inmune a caídas · -${v.lava}% lava` : v.a >= 100 ? 'Inmune a las caídas' : v.a ? `-${v.a}% de daño` : 'Sin armadura'),
  },
  {
    // s = velocidad, e = energía por segundo, g = velocidad al bajar despacio (S),
    // h = modo vuelo con E (1: estable, 2: rapidísimo; ver HOVER)
    id: 'motor', name: 'Jetpack', icon: 'rocket',
    desc: 'Volás más rápido, gastás menos energía y bajás más despacio con S. Los últimos niveles traen modo vuelo (E).',
    levels: [
      [{ s: 85, e: 6, g: 60 }, 0], [{ s: 115, e: 4.6, g: 52 }, 260], [{ s: 150, e: 3.5, g: 45 }, 1200], [{ s: 190, e: 2.6, g: 38 }, 4300],
      [{ s: 235, e: 1.9, g: 31 }, 13000], [{ s: 290, e: 1.3, g: 25 }, 30000], [{ s: 350, e: 0.8, g: 20, h: 1 }, 60000],
      [{ s: 420, e: 0.5, g: 15, h: 2 }, 120000],
    ],
    label: (v) => (v.h ? `Modo vuelo${v.h === 2 ? ' turbo' : ''} (E) · Vel. ${v.s}` : `Vel. ${v.s} · ${String(v.e).replace('.', ',')}/seg`),
    tiers: ['Jetpack básico', 'Jetpack sport', 'Jetpack turbo', 'Jetpack a reacción', 'Cohete', 'Cohete supersónico', 'Cohete estelar', 'Nave del núcleo'],
  },
  {
    id: 'casco', name: 'Casco de minero', icon: 'helmet',
    desc: 'La lámpara del casco ilumina más lejos bajo tierra.',
    levels: [[7.5, 0], [9, 120], [10.5, 550], [12, 1900], [14, 5800], [16, 14000], [19, 30000]],
    label: (v) => `Luz ${Math.round(v * 2)} m`,
    tiers: ['Linterna chiquita', 'Casco de minero', 'Casco con LED', 'Casco reflector', 'Casco faro', 'Casco solar', 'Casco de estrella'],
  },
];

// ---- Consumibles (precio fijo, sin límite de cantidad) ----
export const SUPPLIES = {
  torch: { name: 'Antorcha', price: 25, desc: 'Se clava en la pared e ilumina alrededor. No se rompe al cavar.' },
};
export const TORCH = { radius: 14 };           // en bloques

// ---- Regalos ----
// Textos de prueba: después los cambiamos por los regalos de verdad.
export const GIFTS = [
  {
    id: 1, depth: 300, title: 'Primer regalo',
    text: 'Acá va a ir la primera sorpresa.\n(Texto de prueba: después lo cambiamos por el regalo de verdad.)',
  },
  {
    id: 2, depth: 800, title: 'Segundo regalo',
    text: 'Acá va a ir la segunda sorpresa.\n(Texto de prueba.)',
  },
  {
    // el último está en el núcleo: en la plataforma de abajo de todo (por ahora no se abre)
    id: 3, depth: 1500, title: 'El regalo final', final: true, core: true,
    text: 'Acá va a ir la última sorpresa.\n(Texto de prueba.)',
  },
];

export const ENDING_TEXT = '¡Le ganaron a Aguilus, rescataron los regalos y hasta se hicieron amigos!\n¡Feliz cumple, Panchita! ♥\nGracias por jugar.';

// Pelea con Aguilus en el fondo del núcleo
export const BOSS = {
  hp: 10,            // rocas que hay que pegarle
  rockDmg: 14,       // daño de cada roca de magma
  featherDmg: 10,    // plumas-dardo (no se atajan)
  pillarDmg: 16,     // columnas de fuego que salen del piso
  diveDmg: 18,       // picada: chocarlo cuando se tira contra el piso
  waveDmg: 12,       // onda de choque de la picada (se salta)
  catchR: 10,        // qué tan cerca de la punta del taladro tiene que pasar la roca para atajarla
  throwSpeed: 300,
  jetTime: 0.6,      // en la pelea el jetpack dura poquito (se recarga al pisar)...
  jetSpeed: 100,     // ...y tiene menos fuerza
  ceiling: 150,      // techo invisible: no se puede escapar volando
};
