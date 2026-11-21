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
export const MAX_DEPTH = 1500;       // metros hasta el núcleo (de verdad, para el juego)
// Lo que se MUESTRA (medidor, carteles, charlas): cada metro del juego se ve como 2, así el núcleo queda a
// 3000 m y los regalos a 600, 1600 y 3000 m. El recorrido es exactamente el mismo; solo cambia la numeración.
export const SHOW_M = 2;
export const showM = (m) => Math.round(m * SHOW_M);
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

// ---- Jetpack ----
// 'hover' (el nuevo): saltar en el piso salta; tocarlo de nuevo en el aire prende el jetpack, que frena de a poco
//   y te deja flotando quieto; ahí te movés para arriba, abajo y a los costados. Se apaga solo al tocar el piso,
//   al quedarte sin energía, o con E / X / APAGAR en el aire.
// 'clasico' (el de antes, guardado de respaldo): mantener saltar empuja para arriba con gravedad, S baja despacio,
//   y los dos últimos niveles traen el modo vuelo con E (HOVER, abajo).
export const JET_MODE = 'hover';
// jetpack nuevo, por nivel de la mejora Jetpack: h = velocidad a los costados, up / down = para subir y bajar,
// acc = qué tan rápido responde el manejo, brake = qué tan fuerte frena si venís más rápido que eso
// (por ejemplo cayendo, al prenderlo). Subir va a la misma velocidad que el jetpack de antes en cada nivel.
export const JET_HOVER = [
  { h: 70, up: 85, down: 90, acc: 230, brake: 600 },
  { h: 80, up: 115, down: 105, acc: 300, brake: 700 },
  { h: 92, up: 150, down: 120, acc: 390, brake: 820 },
  { h: 105, up: 190, down: 140, acc: 500, brake: 950 },
  { h: 120, up: 235, down: 160, acc: 650, brake: 1100 },
  { h: 135, up: 290, down: 185, acc: 850, brake: 1300 },
  { h: 160, up: 350, down: 220, acc: 1300, brake: 1700 },
  { h: 210, up: 420, down: 270, acc: 2600, brake: 2800 },
];
// cuánto gasta el jetpack nuevo (multiplica la energía por segundo del nivel): subiendo, moviéndote
// a los costados o para abajo, o flotando quieto
export const JET_COST = { up: 1, move: 0.7, idle: 0.4 };

// Modo vuelo del jetpack clásico (se prende y apaga con E): h/v = velocidad, acc = qué tan rápido responde
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

// ---- Aguilitas en el pozo (desde el primer regalo) ----
// Salen de las cuevas y los huecos ya cavados, de los 300 m para abajo, y persiguen; no suben más arriba de `ceil`
// (el primer cofre está justo a 300 m: con el techo un poco más arriba hay un tramo para escaparse).
export const EAGLETS = {
  from: 300,        // metros: de acá para abajo aparecen
  ceil: 270,        // metros: no suben más arriba que esto
  speed: 62,        // velocidad persiguiendo (el jetpack del primer nivel sube a 85: se puede escapar)
  swoop: 150,       // velocidad de la picada
  standoff: 82,     // a qué distancia se quedan midiéndote entre ataque y ataque
  retreat: 130,     // velocidad con la que se alejan después de atacar
  retreatTo: 130,   // hasta qué distancia se alejan después de atacar (antes de volver a medirte)
  measure: 0.75,    // segundos que se quedan frenadas, midiéndote, antes de tirarse
  wait: [2, 3.6],   // segundos que te miden (de lejos) antes de volver a atacar
  dmg: 8,           // daño de un picotazo
  hp: 4,            // gotitas de agua para bajarlas
  max: 5,           // cuántas puede haber a la vez como mucho (empieza con 2 y suma una cada 300 m)
  every: [30, 50],  // segundos entre una y otra (un poco más seguido cuanto más hondo)
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
  reachPerUpgrade: 0.10, // +10% de alcance por cada nivel de fuerza o de ancho de la herramienta
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
    // pala, pico y taladro en una sola mejora (antes la pala ancha era aparte):
    // p = fuerza (qué tan duro rompe y qué tan rápido cava), b = ancho del palazo (índice de BRUSH_R)
    id: 'pala', name: 'Herramienta de cavar', icon: 'shovel',
    desc: 'Más fuerza y más ancha: rompe materiales más duros, cava más rápido, saca más tierra de un palazo y llega más lejos.',
    levels: [
      [{ p: 1, b: 0 }, 0], [{ p: 2, b: 0 }, 60], [{ p: 4, b: 1 }, 480], [{ p: 7, b: 2 }, 2150],
      [{ p: 11, b: 3 }, 7800], [{ p: 16, b: 4 }, 24000], [{ p: 24, b: 5 }, 57000], [{ p: 34, b: 6 }, 125000],
    ],
    label: (v) => `Fuerza ${v.p} · ${['Normal', 'Ancha', 'Muy ancha', 'Enorme', 'Gigante', 'Colosal', 'Descomunal'][v.b]}`,
    tiers: ['Pala de hierro', 'Pala de acero', 'Pala de oro', 'Taladro', 'Taladro turbo', 'Taladro de diamante', 'Mega taladro del amor', 'Taladro cósmico'],
  },
  {
    id: 'bateria', name: 'Batería', icon: 'battery',
    desc: 'Más energía para cavar y volar sin volver a casa.',
    levels: [[200, 0], [300, 90], [400, 380], [550, 1350], [750, 4200], [1000, 11250], [Infinity, 30000]],
    label: (v) => (v === Infinity ? 'Energía infinita' : `${v} de energía`),
  },
  {
    id: 'armadura', name: 'Armadura', icon: 'armor',
    desc: 'Te protege de los golpes cuando caés de muy alto. Al máximo, también de la lava.',
    // una vez que aparecieron las aguilitas, la descripción cuenta que también protege de sus picotazos
    descAgui: 'Te protege de los golpes cuando caés de muy alto y de los picotazos de las aguilitas. Al máximo, también de la lava.',
    // a = % menos de daño por caídas, ag = % menos de daño de las aguilitas, lava = % menos de daño por lava
    levels: [
      [{ a: 0, ag: 0, lava: 0 }, 0], [{ a: 25, ag: 10, lava: 0 }, 120], [{ a: 45, ag: 20, lava: 0 }, 600],
      [{ a: 60, ag: 30, lava: 0 }, 2250], [{ a: 75, ag: 40, lava: 0 }, 6750], [{ a: 90, ag: 50, lava: 0 }, 16500],
      [{ a: 100, ag: 60, lava: 0 }, 32000], [{ a: 100, ag: 70, lava: 80 }, 70000],
    ],
    label: (v, agui) => {
      const base = v.lava ? `Inmune a caídas · -${v.lava}% lava` : v.a >= 100 ? 'Inmune a las caídas' : v.a ? `-${v.a}% de daño` : 'Sin armadura';
      return agui && v.ag ? `${base.replace('de daño', 'caídas')} · -${v.ag}% aguilitas` : base;
    },
  },
  {
    // s = velocidad, e = energía por segundo, g = velocidad al bajar despacio (S),
    // h = modo vuelo con E (1: estable, 2: rapidísimo; ver HOVER)
    id: 'motor', name: 'Jetpack', icon: 'rocket',
    desc: JET_MODE === 'hover'
      ? 'Más velocidad y mejor manejo en el aire, y gastás menos energía. Flotando quieto gasta menos que moviéndote.'
      : 'Volás más rápido, gastás menos energía y bajás más despacio con S. Los últimos niveles traen modo vuelo (E).',
    levels: [
      [{ s: 85, e: 6, g: 60 }, 0], [{ s: 115, e: 4.6, g: 52 }, 260], [{ s: 150, e: 3.5, g: 45 }, 1200], [{ s: 190, e: 2.6, g: 38 }, 4300],
      [{ s: 235, e: 1.9, g: 31 }, 13000], [{ s: 290, e: 1.3, g: 25 }, 30000], [{ s: 350, e: 0.8, g: 20, h: 1 }, 60000],
      [{ s: 420, e: 0.5, g: 15, h: 2 }, 120000],
    ],
    label: (v) => (JET_MODE !== 'hover' && v.h ? `Modo vuelo${v.h === 2 ? ' turbo' : ''} (E) · Vel. ${v.s}` : `Vel. ${v.s} · ${String(v.e).replace('.', ',')}/seg`),
    tiers: ['Jetpack básico', 'Jetpack sport', 'Jetpack turbo', 'Jetpack a reacción', 'Cohete', 'Cohete supersónico', 'Cohete estelar', 'Nave del núcleo'],
  },
  {
    id: 'casco', name: 'Casco de minero', icon: 'helmet',
    desc: 'La lámpara del casco ilumina más lejos bajo tierra, y las antorchas también iluminan más (hasta las que ya pusiste).',
    // l = alcance de la lámpara, t = alcance de las antorchas (en bloques; vale también para las ya clavadas)
    levels: [
      [{ l: 7.5, t: 14 }, 0], [{ l: 9, t: 15.5 }, 120], [{ l: 10.5, t: 17 }, 550], [{ l: 12, t: 18.5 }, 1900],
      [{ l: 14, t: 20 }, 5800], [{ l: 16, t: 22 }, 14000], [{ l: 19, t: 24 }, 30000],
    ],
    label: (v) => `Luz ${showM(v.l * 2)} m · antorchas ${showM(v.t * 2)} m`,
    tiers: ['Linterna chiquita', 'Casco de minero', 'Casco con LED', 'Casco reflector', 'Casco faro', 'Casco solar', 'Casco de estrella'],
  },
  {
    // la súper pistola de agua: se desbloquea cuando Carlos se la da (después de las aguilitas, a los 300 m).
    // r = tiros por segundo, e = energía por tiro. La fuerza de cada gotita es siempre la misma.
    id: 'pistola', name: 'Pistola de agua', icon: 'gun', unlock: 'gun',
    desc: 'Tira más rápido y gasta menos batería por tiro. Cada gotita moja igual: lo que mejora es la cadencia.',
    levels: [
      [{ r: 3, e: 0.6 }, 0], [{ r: 4, e: 0.5 }, 300], [{ r: 5, e: 0.42 }, 1200], [{ r: 6.5, e: 0.35 }, 4000],
      [{ r: 8, e: 0.28 }, 11000], [{ r: 10, e: 0.22 }, 26000], [{ r: 12, e: 0.16 }, 55000],
    ],
    label: (v) => `${String(v.r).replace('.', ',')} tiros/seg · ${String(v.e).replace('.', ',')} por tiro`,
    tiers: ['Pistolita de agua', 'Pistola de agua', 'Súper pistola', 'Hidro pistola', 'Hidro cañón', 'Tormenta de agua', 'Diluvio del amor'],
  },
];

// ---- Consumibles (precio fijo, sin límite de cantidad) ----
export const SUPPLIES = {
  torch: { name: 'Antorcha', price: 25, desc: 'Se clava en la pared e ilumina alrededor. No se rompe al cavar. Con mejor casco, iluminan más.' },
};
export const TORCH = { radius: 14 };           // en bloques (sin mejorar el casco; con el casco llega más lejos)

// ---- Regalos ----
// Textos de prueba: después los cambiamos por los regalos de verdad.
export const GIFTS = [
  {
    // art: 'ferrero' = el dibujo de la caja de bombones con el bombón gigante (src/giftart.js)
    id: 1, depth: 300, headline: '¡¡El primer regalo!!', art: 'ferrero', title: 'Bombones!!!',
    text: 'Una caja de ferrero para la cumpleañera!! (obligatorio compartir)',
  },
  {
    // art: 'reloj' = el reloj plateado de frente (src/giftart.js)
    id: 2, depth: 800, headline: '¡¡El segundo regalo!!', art: 'reloj', title: 'Un reloj!!!',
    text: 'Un reloj plateado para la cumpleañera, para que nunca más lleguemos tarde.',
  },
  {
    // el último está en el núcleo: en la plataforma de abajo de todo (por ahora no se abre)
    // art: 'zapatillas' = el par de zapatillas (src/giftart.js)
    id: 3, depth: 1500, headline: '¡¡El regalo final!!', art: 'zapatillas', title: 'Zapatillas!!!', final: true, core: true,
    text: 'Unas zapatillas estilo retro para la cumpleañera.',
  },
];

export const ENDING_TEXT = '¡Le ganamos a Aguilus y rescatamos los regalos!\n¡Feliz cumple, mi amor!!! ♥';

// Pelea con Aguilus en el fondo del núcleo (con las súper pistolas de agua)
export const BOSS = {
  hp: 750,           // vida de Aguilus: cada gotita de agua le saca 1 (750: llegan con la pistola mejorada, que tira más rápido)
  phases: [0.66, 0.33], // fracción de vida donde se enoja (fase 2) y se pone furioso (fase 3)
  fireRate: 8,       // gotitas por segundo si no tienen la mejora de la pistola (en la pelea se usa la del taller)
  waterSpeed: 270,
  waterGrav: 90,
  waterLife: 1.1,
  // (los daños son la mitad de los de antes: la pelea se hacía muy difícil)
  rockDmg: 7,        // rocas de magma (se apagan con agua)
  rockWater: 4,      // gotitas que hacen falta para apagar una roca
  featherDmg: 5,     // plumas-dardo
  pillarDmg: 8,      // columnas de fuego que salen del piso
  diveDmg: 9,        // picada: chocarlo cuando se tira contra el piso
  waveDmg: 6,        // onda de choque de la picada (se salta)
  beamDmg: 10,       // rayo violeta (fase 2 en adelante)
  sweepDmg: 7,       // vendaval: una ráfaga que barre todo el aire (en el piso no pega)
  magmaDmg: 7,       // piso de lava: el piso de la plataforma quema un ratito (volando no pega)
  minionHp: 8,       // aguilitas: gotitas para bajarlas
  minionDmg: 4,
  minionCap: [2, 3, 4], // cuántas aguilitas puede haber a la vez en cada fase
  reviveTap: 0.12,   // cuánto carga cada toque de E al revivir al otro
  reviveDecay: 0.16, // cuánto se descarga por segundo si dejás de tocar
  reviveR: 18,       // qué tan cerca hay que estar para revivir
  jetTime: 0.6,      // (jetpack viejo) en la pelea el jetpack es infinito...
  jetSpeed: 100,     // ...pero tiene menos fuerza
  ceiling: 128,      // techo invisible: se vuela hasta la altura de Aguilus, o un poquito más
};
