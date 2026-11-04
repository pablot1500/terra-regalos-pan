// Todos los sprites pixel art del juego, dibujados a mano en texto.
import { makeCanvas, mapSprite, flipH, outlined, pixelLine } from './util.js';
import { SHOVEL_BLADES } from './config.js';

// ============================================================
//  Fuente pixel 3x5
// ============================================================
const G = {
  A: ['.#.', '#.#', '###', '#.#', '#.#'], B: ['##.', '#.#', '##.', '#.#', '##.'],
  C: ['.##', '#..', '#..', '#..', '.##'], D: ['##.', '#.#', '#.#', '#.#', '##.'],
  E: ['###', '#..', '##.', '#..', '###'], F: ['###', '#..', '##.', '#..', '#..'],
  G: ['.##', '#..', '#.#', '#.#', '.##'], H: ['#.#', '#.#', '###', '#.#', '#.#'],
  I: ['###', '.#.', '.#.', '.#.', '###'], J: ['..#', '..#', '..#', '#.#', '.#.'],
  K: ['#.#', '#.#', '##.', '#.#', '#.#'], L: ['#..', '#..', '#..', '#..', '###'],
  M: ['#.#', '###', '###', '#.#', '#.#'], N: ['##.', '#.#', '#.#', '#.#', '#.#'],
  O: ['.#.', '#.#', '#.#', '#.#', '.#.'], P: ['##.', '#.#', '##.', '#..', '#..'],
  Q: ['.#.', '#.#', '#.#', '##.', '.##'], R: ['##.', '#.#', '##.', '#.#', '#.#'],
  S: ['.##', '#..', '.#.', '..#', '##.'], T: ['###', '.#.', '.#.', '.#.', '.#.'],
  U: ['#.#', '#.#', '#.#', '#.#', '###'], V: ['#.#', '#.#', '#.#', '#.#', '.#.'],
  W: ['#.#', '#.#', '###', '###', '#.#'], X: ['#.#', '#.#', '.#.', '#.#', '#.#'],
  Y: ['#.#', '#.#', '.#.', '.#.', '.#.'], Z: ['###', '..#', '.#.', '#..', '###'],
  0: ['###', '#.#', '#.#', '#.#', '###'], 1: ['.#.', '##.', '.#.', '.#.', '###'],
  2: ['##.', '..#', '.#.', '#..', '###'], 3: ['##.', '..#', '.#.', '..#', '##.'],
  4: ['#.#', '#.#', '###', '..#', '..#'], 5: ['###', '#..', '###', '..#', '##.'],
  6: ['.##', '#..', '###', '#.#', '###'], 7: ['###', '..#', '.#.', '.#.', '.#.'],
  8: ['###', '#.#', '###', '#.#', '###'], 9: ['###', '#.#', '###', '..#', '##.'],
  $: ['.##', '##.', '.#.', '.##', '##.'], '+': ['...', '.#.', '###', '.#.', '...'],
  '-': ['...', '...', '###', '...', '...'], '!': ['.#.', '.#.', '.#.', '...', '.#.'],
  '?': ['##.', '..#', '.#.', '...', '.#.'], '.': ['...', '...', '...', '...', '.#.'],
  ',': ['...', '...', '...', '.#.', '#..'], ':': ['...', '.#.', '...', '.#.', '...'],
  '<': ['#.#', '###', '###', '.#.', '...'], ' ': ['...', '...', '...', '...', '...'],
  '°': ['###', '#.#', '###', '...', '...'], '/': ['..#', '..#', '.#.', '#..', '#..'],
};
const ACCENTS = { Á: 'A', É: 'E', Í: 'I', Ó: 'O', Ú: 'U', Ñ: 'N', Ü: 'U', '¡': '!', '¿': '?' };

export function textWidth(s) {
  return s.length * 4 - 1;
}

export function drawText(ctx, s, x, y, color, outline = null) {
  s = s.toUpperCase();
  const draw = (ox, oy, col) => {
    ctx.fillStyle = col;
    let cx = x + ox;
    for (const ch0 of s) {
      const ch = ACCENTS[ch0] || ch0;
      const g = G[ch] || G['?'];
      for (let j = 0; j < 5; j++) for (let i = 0; i < 3; i++) if (g[j][i] === '#') ctx.fillRect(cx + i, y + oy + j, 1, 1);
      cx += 4;
    }
  };
  if (outline) {
    draw(-1, 0, outline); draw(1, 0, outline); draw(0, -1, outline); draw(0, 1, outline);
    draw(-1, 1, outline); draw(1, 1, outline);
  }
  draw(0, 0, color);
}

// ============================================================
//  Personajes (16x20, mirando a la derecha)
// ============================================================
// Pablo y Pancha: cabeza (filas 0-10) y torso (11-15) propios de cada uno;
// las piernas (16-19) son las mismas con otra paleta.
// Ojos en las filas 6 y 7: w = brillo, e = pupila, E = iris.
const TOP = {
  pablo: [
    '...oo.ooo.oo....',
    '..oghohghoghoo..',
    '.ohhgHhhhgHhhgo.',
    'ohgHhhhgHhhhgHho',
    'ohgHhhgsHssHsgho',
    'ohgHhhsHssssHsso',
    'ohhgHSswesswesso',
    'ohgHosSEesseEsso',
    'ohhHosmmssSsmmso',
    '.oHosxsSqqqSsxo.',
    '..ooxxxxxxxxxo..',
    '.kk.oCcciiicCo..',
    'kjJkoCcclcclCo..',
    'kJrkoCcccccdCo..',
    'kjjkoCccccccCo..',
    'kkkkoCCCCCCCCo..',
  ],
  pancha: [
    '.....oooooo.....',
    '...oohhhgghoo...',
    '..ohhhhghhhhho..',
    '.ohhhhhhhghhhho.',
    'ohghhhhhsssshhho',
    'ohhghhsvvssvvsho',
    'ohghhhswesswesho',
    'ohhghhsEesseEsho',
    'ohhhghmmssSsmmho',
    'ohhghhsssqqssho.',
    'ohhhhgosssssoho.',
    '.kk.hhcCssCcho..',
    'kjJkhhccccccho..',
    'kJrkhCccccdcCo..',
    'kjjkoCcccccCCo..',
    'kkkkoCCCCCCCCo..',
  ],
  // pelado, cara amigable y flaquito
  carlos: [
    '.....oooooo.....',
    '...oonnssssoo...',
    '..onnsssssssso..',
    '.onsssssssssso..',
    '.ohSssssssssso..',
    '.ohhSsssvvssvvo.',
    '.ohhoSsswesswes.',
    '.ohhoSssEessEeso',
    '.ohhsssmsssSsmo.',
    '..ohsssqwwwwqo..',
    '...oossqqqqoo...',
    '.kk.oclllco.....',
    'kjJkoccdcco.....',
    'kJrkoCcdcCo.....',
    'kjjkoCcdcCo.....',
    'kkkkoCCCCCo.....',
  ],
  // águila mago: cresta castaña, antifaz rojizo, pico ganchudo y túnica violeta
  aguilus: [
    '..o.o.oo........',
    '.oHohohhoo......',
    'ohHhhhhhhhoo....',
    'oHhhhhghhhhho...',
    '.oHhhhhhhhhhho..',
    '.oHhhhhvvhhhho..',
    'ohhhhhhrvvyYYo..',
    'oHhhhhrwerryYYo.',
    'oCchhfrrrryyyYYo',
    '.oCfffffffoyoYYo',
    '.oCfFfFfFfo..oo.',
    '.kk.oCdfffdCo...',
    'kjJkoCcdfdcczo..',
    'kJrkoCcldllcCo..',
    'kjjkoCccldcCCo..',
    'kkkkoCCcdcCCCo..',
  ],
};
const LEGS = {
  idle: ['....oPpppppppo..', '....oPppoPpppo..', '...obbbuobbbbuo.', '...oooooooooooo.'],
  walkA: ['....oPpppppppo..', '...oPpo..oPppo..', '..obbuo..obbbuo.', '..oooo...oooooo.'],
  walkC: ['....oPpppppppo..', '....oPpo.oPppo..', '...obbuo.obbbuo.', '...ooooo.oooooo.'],
  air: ['....oPpppppppo..', '....oPppPpppo...', '....obbuobbbuo..', '....oooo.ooooo..'],
};
// piernas finitas para Carlos
const LEGS_THIN = {
  idle: ['....oPppppo.....', '....oPpoPpo.....', '...obbuobbuo....', '...ooooooooo....'],
  walkA: ['....oPppppo.....', '...oPpo.oPpo....', '..obbuo.obbuo...', '..ooooo.ooooo...'],
  walkC: ['....oPppppo.....', '....oPo.oPpo....', '...obuo.obbuo...', '...oooo.ooooo...'],
  air: ['....oPppppo.....', '....oPpPppo.....', '....obuobbuo....', '....oooooooo....'],
};
const CHAR_LEGS = { carlos: LEGS_THIN };

export const CHAR_W = 16, CHAR_H = 20;
const SHOULDER = { x: 10, y: 12 }; // donde nace el brazo que sostiene la pala o el taladro

const BASE_PAL = {
  o: '#2b1d2b', w: '#ffffff', k: '#4a5260', j: '#c3cad4', J: '#8a94a3', r: '#ff5a5a', y: '#f2c14e',
};
export const CHAR_PAL = {
  // pelo negro con rulos, barba de unos días y buzo gris con capucha
  pablo: {
    ...BASE_PAL,
    s: '#f3cdb0', S: '#dcaa8a', m: '#f4a097', q: '#a85a52', e: '#2e1c14', E: '#7a4a2a', x: '#d8aa8c',
    h: '#2a2530', H: '#121018', g: '#4f4862',
    c: '#8e9a94', C: '#66726c', d: '#b5c0ba', i: '#f4f1ea', l: '#cfc7b6',
    p: '#5e7370', P: '#45565a', b: '#2f3b37', u: '#f1ede4',
  },
  // pelo largo castaño cobrizo, suéter caqui y jeans
  pancha: {
    ...BASE_PAL,
    s: '#fde6d6', S: '#efc2aa', m: '#f7a1a6', q: '#b04a58', e: '#3e2416', E: '#8a5530',
    h: '#b9552c', H: '#7c2f16', g: '#e07c45', v: '#8e3f22',
    c: '#c9b27a', C: '#a08a55', d: '#e2cf9c',
    p: '#5f86b0', P: '#456890', b: '#8a4436', u: '#efe3c8',
  },
  // pelado con un poquito de pelo a los costados, camisa celeste y pantalón caqui
  carlos: {
    ...BASE_PAL,
    s: '#f1c9a5', S: '#d9a47f', n: '#fff1e2', m: '#f29a8e', q: '#9c4a3e', e: '#2e1c14', E: '#5a7a4a',
    h: '#6b5a4e', v: '#6b5a4e',
    c: '#7db8d8', C: '#5590b3', d: '#eaf4f8', l: '#f4f1ea',
    p: '#9c8a68', P: '#7a6a4e', b: '#4e3020', u: '#c9b79c',
  },
  // plumas castañas, cara crema, pico amarillo con punta gris y túnica violeta con ribetes
  aguilus: {
    ...BASE_PAL,
    h: '#8a5530', H: '#5a3218', g: '#b07a4a', f: '#f2e3c4', F: '#d9c49c', r: '#d9603a',
    y: '#f2c14e', Y: '#9fb0a0', v: '#3a2014', e: '#1d1012', E: '#3a2a1a',
    s: '#e8b48a', c: '#4a3070', C: '#2e1c4a', d: '#a374dc', z: '#c9c0b0', l: '#c9a26b',
    p: '#3e2860', P: '#2e1c4a', b: '#6b4429', u: '#8a5a36',
  },
};
// báculo de Aguilus (por ahora solo en el sandbox)
export const STAFF = mapSprite(
  ['.ooo.', 'oVWvo', 'oVvvo', 'ovvvo', '.ooo.', '.nNn.', '..Nn.', '.nN..', '..nN.', '.Nn..', '..nN.', '.nN..', '..Nn.', '.nN..', '..nN.', '.Nn..', '..nN.', '.nN..', '..Nn.', '..n..'],
  { o: '#2b1d2b', V: '#c98cff', v: '#8a3fd0', W: '#ffffff', n: '#5a3218', N: '#a8703f' },
);

function composeFrame(charId, legsKey, bob, blink, jet = 0, helmet = 0) {
  const pal = { ...CHAR_PAL[charId], ...JET_TIERS[Math.min(jet, JET_TIERS.length - 1)] };
  const [c, x] = makeCanvas(CHAR_W, CHAR_H);
  x.drawImage(mapSprite((CHAR_LEGS[charId] || LEGS)[legsKey], pal), 0, 16);
  // parpadeo: se apaga el brillo y queda la línea de las pestañas
  const top = blink ? TOP[charId].map((r, i) => (i === 6 ? r.replace(/[weE]/g, 's') : i === 7 ? r.replace(/E/g, 'e') : r)) : TOP[charId];
  x.drawImage(mapSprite(top, pal), 0, bob);
  const H = HELMET_TIERS[Math.min(helmet, HELMET_TIERS.length - 1)];
  if (H) x.drawImage(mapSprite(HELMET, { o: '#2b1d2b', ...H }), 0, bob);
  return c;
}

const FRAME_DEFS = {
  idle: ['idle', 0, false],
  idleB: ['idle', 1, false],
  blink: ['idle', 0, true],
  walkA: ['walkA', 0, false],
  walkB: ['idle', 1, false],
  walkC: ['walkC', 0, false],
  air: ['air', 0, false],
};

// colores del jetpack según el nivel de motor
export const JET_TIERS = [
  { j: '#c3cad4', J: '#8a94a3', r: '#ff5a5a' },
  { j: '#8fc4ff', J: '#4a7fd0', r: '#ffd34d' },
  { j: '#86e3a8', J: '#3e9b6a', r: '#ff5a5a' },
  { j: '#ff8a72', J: '#c0392b', r: '#ffd34d' },
  { j: '#ffd860', J: '#c8871a', r: '#ff4d6d' },
  { j: '#ffa8d6', J: '#c9578a', r: '#8fe9ff' },
  { j: '#eafcff', J: '#7fd8ff', r: '#ff7ac8' },
  { j: '#4a3a44', J: '#ff7a2e', r: '#ffd34d' }, // nave del núcleo
];

// casco de minero (desde el nivel 1): color del casco y de la lámpara por nivel
export const HELMET_TIERS = [
  null,
  { Y: '#f2c14e', y: '#c8871a', w: '#fff3a8', l: '#5b636d', L: '#fff3a8' },
  { Y: '#ff8a3d', y: '#c0562a', w: '#ffc8a0', l: '#5b636d', L: '#ffffff' },
  { Y: '#eef2f5', y: '#a9b4bd', w: '#ffffff', l: '#5b636d', L: '#bff3ff' },
  { Y: '#9ab8d6', y: '#5b7a9c', w: '#dbe9f7', l: '#3a3f45', L: '#eafcff' },
  { Y: '#ffd34d', y: '#c8871a', w: '#fff7c8', l: '#9c6a12', L: '#ffffff' },
  { Y: '#c49bff', y: '#7a4fc9', w: '#efe3ff', l: '#4a2c8a', L: '#fff3a8' },
];
const HELMET = [
  '....oooooooo....',
  '...oYwYYYYYYolL.',
  '..oYYYYYYYYYYolL',
  '.oyyyyyyyyyyyyo.',
];
const charCache = {};
export function getCharFrames(charId, jet = 0, helmet = 0) {
  const ck = charId + ':' + jet + ':' + helmet;
  if (charCache[ck]) return charCache[ck];
  const right = {}, left = {};
  for (const [name, [legs, bob, blink]] of Object.entries(FRAME_DEFS)) {
    right[name] = composeFrame(charId, legs, bob, blink, jet, helmet);
    left[name] = flipH(right[name]);
  }
  return (charCache[ck] = { right, left });
}

/** Retrato grande para el menú */
export function charPortrait(charId, scale = 6) {
  const f = getCharFrames(charId).right.idle;
  const [c, x] = makeCanvas((CHAR_W + 2) * scale, (CHAR_H + 2) * scale);
  x.imageSmoothingEnabled = false;
  x.drawImage(f, 1 * scale, 1 * scale, CHAR_W * scale, CHAR_H * scale);
  return c;
}

/**
 * Dibuja brazo + pala. (sx, sy) = esquina sup. izq. del sprite del personaje.
 * armAng y shovelAng en radianes, mirando a la derecha (0 = derecha, PI/2 = abajo).
 */
export function drawArmShovel(ctx, sx, sy, facing, bob, armAng, shovelAng, palaLevel, charId, len = 7) {
  const pal = CHAR_PAL[charId];
  const mx = (lx) => (facing > 0 ? sx + Math.round(lx) : sx + CHAR_W - 1 - Math.round(lx));
  const my = (ly) => sy + Math.round(ly);
  const shX = SHOULDER.x, shY = SHOULDER.y + bob;
  const hx = shX + Math.cos(armAng) * 3, hy = shY + Math.sin(armAng) * 3;
  const ca = Math.cos(shovelAng), sa = Math.sin(shovelAng);
  const tipX = hx + ca * len, tipY = hy + sa * len;
  const blade = SHOVEL_BLADES[Math.min(palaLevel, SHOVEL_BLADES.length - 1)];
  // mango (con un poquito detrás de la mano)
  pixelLine(ctx, mx(hx - ca * 2), my(hy - sa * 2), mx(tipX), my(tipY), '#7a4a26');
  // hoja
  const cx = tipX + ca * 1.5, cy = tipY + sa * 1.5;
  const px = (lx, ly, col) => { ctx.fillStyle = col; ctx.fillRect(mx(lx), my(ly), 1, 1); };
  for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) px(cx + i, cy + j, blade[0]);
  px(cx + ca * 2, cy + sa * 2, blade[2]);
  px(cx - 1, cy - 1, blade[1]);
  // brazo (manga + mano)
  pixelLine(ctx, mx(shX), my(shY), mx((shX + hx) / 2), my((shY + hy) / 2), pal.C);
  px(hx, hy, pal.s);
}

const DRILL_TIERS = [
  null, null, null,
  { body: '#f2c14e', dark: '#9c6a12', hi: '#fff0a0' },  // taladro (amarillo de obra)
  { body: '#ff6b3d', dark: '#a8321a', hi: '#ffc0a8' },  // turbo
  { body: '#6fdcff', dark: '#2c8db5', hi: '#eafcff' },  // diamante
  { body: '#ff7ac8', dark: '#b0307a', hi: '#ffe1f3' },  // del amor
  { body: '#6a4cff', dark: '#2a1b8a', hi: '#d4c8ff', cosmic: true }, // cósmico
];

/** Taladro en la mano, apuntando en `ang` (local, mirando a la derecha). `spin` anima la mecha. */
export function drawDrill(ctx, sx, sy, facing, bob, ang, level, charId, spin) {
  const pal = CHAR_PAL[charId];
  const T = DRILL_TIERS[Math.min(level, DRILL_TIERS.length - 1)] || DRILL_TIERS[3];
  const mx = (lx) => (facing > 0 ? sx + Math.round(lx) : sx + CHAR_W - 1 - Math.round(lx));
  const my = (ly) => sy + Math.round(ly);
  const px = (lx, ly, col) => { ctx.fillStyle = col; ctx.fillRect(mx(lx), my(ly), 1, 1); };
  const shX = SHOULDER.x, shY = SHOULDER.y + bob;
  const ca = Math.cos(ang), sa = Math.sin(ang);
  const hx = shX + ca * 2.5, hy = shY + sa * 2.5;
  const nx = -sa, ny = ca; // perpendicular
  // cuerpo del taladro
  for (let t = -1.5; t <= 3.5; t += 0.5) {
    for (let w = -1; w <= 1; w++) {
      const col = w === -1 ? T.hi : w === 1 ? T.dark : T.body;
      px(hx + ca * t + nx * w, hy + sa * t + ny * w, col);
    }
  }
  px(hx + ca * -2 + nx * 2, hy + sa * -2 + ny * 2, '#3a3f45'); // empuñadura
  px(hx + ca * -1.5 + nx * 2, hy + sa * -1.5 + ny * 2, '#3a3f45');
  // mecha cónica con rosca que gira
  const ph = Math.floor((spin || 0) * 24) % 2;
  for (let t = 4; t <= 8; t += 0.5) {
    const wmax = t < 6 ? 1 : 0;
    for (let w = -wmax; w <= wmax; w++) {
      const stripe = (Math.floor(t * 2) + ph) % 2 === 0;
      const cols = T.cosmic ? ['#8fe9ff', '#ff7ac8'] : ['#e8eef3', '#7d8796'];
      px(hx + ca * t + nx * w, hy + sa * t + ny * w, stripe ? cols[0] : cols[1]);
    }
  }
  // estrellitas del taladro cósmico
  if (T.cosmic) {
    const tw = Math.floor(performance.now() / 120);
    const stars = ['#ffffff', '#fff3a8', '#8fe9ff', '#ff9ccc'];
    px(hx + ca * (tw % 5) + nx * ((tw >> 1) % 3 - 1), hy + sa * (tw % 5) + ny * ((tw >> 1) % 3 - 1), stars[tw % 4]);
    px(hx + ca * 1 + nx * 0, hy + sa * 1, stars[(tw + 2) % 4]);
  }
  // brazo + mano
  pixelLine(ctx, mx(shX), my(shY), mx(hx - ca), my(hy - sa), pal.C);
  px(hx - ca * 0.5, hy - sa * 0.5, pal.s);
}

// ============================================================
//  Tesoros
// ============================================================
const LOOT_PAL = {
  d: '#c8871a', y: '#f5c242', Y: '#fff0a0', o: '#7a4c0d',
  g: '#24583a', G: '#62b878', L: '#a9e3b0', r: '#d9344e', w: '#ffffff',
  R: '#7a0f24', E: '#d6284a', P: '#ff9fb3',
  e: '#0d5e3a', M: '#2ec27e', F: '#a8f5cf',
  c: '#2a6f9e', C: '#7fd8ff', W: '#effcff',
  n: '#9a6a3a', N: '#c99a5a', v: '#5b3a8c', V: '#8f63d9',
  // moneda de bronce ($1) y de plata
  b: '#8a4e22', B: '#f0b07a', z: '#c97a3e', Z: '#5e3313',
  s: '#7d8794', S: '#f4f8fb', m: '#c3ccd5', t: '#55606b',
  // billete de $1000 (naranja) y dólar (verde, con el retrato en el medio)
  k: '#a8491a', K: '#f2963a', j: '#ffd9a8',
  u: '#3d6b3a', U: '#a9c99a', x: '#e4f0d6', X: '#24452a',
};
const LOOT_MAPS = {
  coin: ['.bbb.', 'bBzzb', 'bzzzb', 'bzzZb', '.ZZZ.'],
  coins: ['.ssss.', 'sSSmms', 'sSmmms', 'smmmts', 'smmtts', '.tttt.'],
  bill: ['kkkkkkkk', 'kKjKKKjk', 'kjjjKKKk', 'kKjKKjjk', 'kkkkkkkk'],
  billstack: ['uuuuuuuu', 'uxUXXUxu', 'uUXxxXUu', 'uxUXXUxu', 'uuuuuuuu'],
  goldbar: ['.ddddd.', 'dYYyyyd', 'dyyyyyd', 'ooooooo'],
  ruby: ['.RRR.', 'RPwER', 'REEER', '.RER.', '..R..'],
  emerald: ['.eee.', 'eFMMe', 'eFMMe', 'eMMMe', '.eee.'],
  diamond: ['.ccc.', 'cWCWc', 'cCCCc', '.cCc.', '..c..'],
  moneybag: ['..o..', '.nNn.', 'nNgNn', 'nNNNn', '.nnn.'],
  gembag: ['.CoR.', '.vVv.', 'vVWVv', 'vVVVv', '.vvv.'],
  crown: ['y.y.y', 'yRyCy', 'yyyyy', 'ddddd'],
};
export const LOOT_SPR = {};
export function initSprites() {
  for (const [k, m] of Object.entries(LOOT_MAPS)) LOOT_SPR[k] = mapSprite(m, LOOT_PAL);
  initDog();
  initCracks();
  initIcons();
}

// ============================================================
//  Cofre de regalo
// ============================================================
export function drawChest(ctx, x, y, open) {
  // 15x11 cerrado, con tapa que se abre hacia atrás
  const R = (a, b, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x + a, y + b, w, h); };
  const O = '#3a2117', W1 = '#8a5230', W2 = '#a8693d', D = '#6b3c22', Au = '#e2b33c', Au2 = '#fff0a0';
  // cuerpo
  R(0, 5, 15, 6, O);
  R(1, 5, 13, 5, W1);
  R(1, 7, 13, 1, D);
  R(1, 5, 1, 5, Au); R(13, 5, 1, 5, Au);
  if (open < 0.5) {
    // tapa cerrada
    R(1, 0, 13, 1, O); R(0, 1, 15, 5, O);
    R(1, 1, 13, 4, W2);
    R(2, 1, 11, 1, '#c98552');
    R(1, 1, 1, 4, Au); R(13, 1, 1, 4, Au);
    R(0, 4, 15, 2, Au); R(0, 4, 15, 1, Au2);
    // candado corazón
    R(5, 3, 2, 1, '#ff5d8f'); R(8, 3, 2, 1, '#ff5d8f');
    R(5, 4, 5, 2, '#ff5d8f'); R(6, 6, 3, 1, '#ff5d8f'); R(7, 7, 1, 1, '#ff5d8f');
    R(5, 3, 1, 1, '#ffc2d6');
  } else {
    // tapa abierta (parada hacia atrás) + interior brillante
    R(0, -5, 15, 7, O);
    R(1, -4, 13, 5, D);
    R(2, -4, 11, 1, '#4e2a18');
    R(1, -4, 1, 5, Au); R(13, -4, 1, 5, Au);
    R(1, 0, 13, 1, Au);
    R(0, 2, 15, 3, O);
    R(1, 2, 13, 3, '#2a1410');
    R(2, 3, 11, 2, Au);
    R(3, 3, 9, 1, Au2);
    R(0, 4, 15, 1, Au);
  }
}

export function drawGiftBox(ctx, x, y) {
  const R = (a, b, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x + a, y + b, w, h); };
  R(0, 4, 11, 8, '#9c2f63');
  R(1, 4, 9, 7, '#ff7eb6');
  R(1, 9, 9, 2, '#d9578f');
  R(0, 3, 11, 3, '#9c2f63');
  R(1, 3, 9, 2, '#ffa6cf');
  R(5, 3, 1, 9, '#ffd34d');
  R(1, 4, 9, 1, '#ffd34d');
  // moño
  R(2, 0, 3, 3, '#e6a92e'); R(3, 1, 1, 1, '#9c2f63');
  R(6, 0, 3, 3, '#e6a92e'); R(7, 1, 1, 1, '#9c2f63');
  R(5, 1, 1, 2, '#fff0a0');
}

// ============================================================
//  Perro salchicha del taller (mirando a la izquierda)
// ============================================================
const DOG_PAL = {
  b: '#9a5428', B: '#6b3518', h: '#b8693a', l: '#d99a5a', n: '#1d1012', e: '#1d1012',
  c: '#d9344e', y: '#ffd34d', t: '#ff8fa3',
  g: '#ece4da', G: '#cbbfb2', // pelito canoso
};
// legs: 'stand' | 'walkA' | 'walkB' | 'air' | 'dig'
function paintDog(tailUp, blink, tongue, { legs = 'stand', helmet = false, jet = false } = {}) {
  const [cv, x] = makeCanvas(18, 12);
  const R = (a, b, w, h, k) => { x.fillStyle = DOG_PAL[k] || k; x.fillRect(a, b + 2, w, h); }; // +2: lugar para el casco
  // mini jetpack (atrás, sobre el lomo)
  if (jet) { R(10, 1, 4, 3, '#c3cad4'); R(10, 1, 1, 3, '#e8eef3'); R(13, 1, 1, 3, '#8a94a3'); R(11, 0, 2, 1, '#8a94a3'); R(12, 2, 1, 1, '#ff5a5a'); }
  // cuerpo largo y bajito
  R(5, 4, 11, 4, 'b'); R(7, 4, 7, 1, 'h'); R(6, 7, 9, 1, 'g'); R(6, 6, 2, 1, 'G'); R(10, 6, 3, 1, 'G');
  // patitas cortas
  const leg = (lx, ly = 8, lh = 2) => { R(lx, ly, 2, lh, 'B'); R(lx, ly + lh - 1, 2, 1, 'l'); };
  if (legs === 'walkA') { leg(5); leg(14); }
  else if (legs === 'walkB') { leg(7); leg(12); }
  else if (legs === 'air') { leg(6, 8, 1); leg(13, 8, 1); }
  else if (legs === 'dig') { R(3, 6, 3, 2, 'B'); R(2, 7, 1, 1, 'l'); leg(13); }
  else { leg(6); leg(13); }
  // cola
  if (tailUp) { R(16, 4, 1, 1, 'b'); R(16, 3, 1, 1, 'b'); R(17, 2, 1, 1, 'b'); }
  else { R(16, 4, 1, 1, 'b'); R(17, 5, 1, 1, 'b'); }
  // cabeza, hocico y nariz
  R(1, 1, 6, 5, 'b'); R(2, 1, 4, 1, 'h');
  R(0, 3, 3, 3, 'g'); R(0, 3, 1, 1, 'n'); R(1, 5, 5, 1, 'G'); R(3, 4, 1, 1, 'G'); R(2, 2, 1, 1, 'G');
  if (tongue) R(1, 6, 1, 1, 't');
  // ojo y ceja
  R(3, 2, 1, 1, blink ? 'b' : 'e'); R(3, 1, 1, 1, 'g');
  // oreja larga caída
  R(5, 1, 2, 5, 'B');
  // collar con chapita
  R(7, 4, 1, 3, 'c'); R(7, 7, 1, 1, 'y');
  // casquito de minero con lámpara
  if (helmet) {
    R(2, -2, 5, 1, '#f2c14e'); R(1, -1, 7, 2, '#f2c14e'); R(2, -1, 1, 1, '#fff3a8');
    R(1, 1, 7, 1, '#c8871a'); R(0, -1, 1, 2, '#fff3a8');
  }
  return outlined(cv, '#2b1a12');
}
export const DOG = {};
// Popi aventurero: casquito + mini jetpack, mirando a la izquierda (left) y a la derecha (right)
export const POPI = { left: {}, right: {} };
function initDog() {
  DOG.a = paintDog(true, false, false);
  DOG.b = paintDog(false, false, false);
  DOG.blink = paintDog(true, true, false);
  DOG.happyA = paintDog(true, false, true);
  DOG.happyB = paintDog(false, false, true);
  const gear = { helmet: true, jet: true };
  const frames = {
    idleA: [true, false, true, 'stand'], idleB: [false, false, true, 'stand'], blink: [true, true, false, 'stand'],
    walkA: [true, false, true, 'walkA'], walkB: [false, false, true, 'walkB'],
    air: [true, false, false, 'air'], digA: [true, false, false, 'dig'], digB: [false, false, false, 'stand'],
  };
  for (const [k, [tail, blink, tongue, legs]] of Object.entries(frames)) {
    POPI.left[k] = paintDog(tail, blink, tongue, { legs, ...gear });
    POPI.right[k] = flipH(POPI.left[k]);
  }
}

// ============================================================
//  Grietas al cavar
// ============================================================
export const CRACKS = [];
function initCracks() {
  const maps = [
    ['........', '...#....', '...#....', '....#...', '........', '........', '........', '........'],
    ['........', '.#.#....', '..##..#.', '....##..', '...#....', '..#.....', '........', '........'],
    ['#..#..#.', '.#.#.#..', '..###.#.', '.#..##..', '#..#.#..', '..#...#.', '.#....#.', '#.....#.'],
  ];
  for (const m of maps) CRACKS.push(mapSprite(m, { '#': 'rgba(10,6,4,0.75)' }));
}

// ============================================================
//  Íconos para la interfaz (se convierten a dataURL)
// ============================================================
const ICON_PAL = {
  r: '#c81d3a', R: '#ff4d6d', W: '#ffd1da',
  y: '#ffd23f', Y: '#fff3a8', d: '#c8871a', o: '#7a4c0d',
  w: '#a8703f', s: '#9aa3ad', S: '#e8eef3',
  G: '#5be36b', g: '#2e9e44', k: '#3a3f45',
  a: '#6e7f91', A: '#b8c6d4',
  b: '#4a5260', p: '#ff7eb6', P: '#d9578f',
  l: '#7cd65a', L: '#3e9b3e',
  c: '#fff4e0',
};
const ICONS = {
  heart: ['.rr.rr.', 'rRRrRRr', 'rRWRRRr', 'rRRRRRr', '.rRRRr.', '..rRr..', '...r...'],
  bolt: ['...yy.', '..yy..', '.yyY..', 'yyyyy.', '..yy..', '.yy...', 'yy....'],
  coin: ['..ddd..', '.dYyyd.', 'dYyyyyd', 'dyyyyyd', 'dyyyyod', '.dyyod.', '..ooo..'],
  shovel: ['..www..', '...w...', '...w...', '...w...', '..sss..', '.sSsss.', '.sSsss.', '..sss..', '...s...'],
  wide: ['...w...', '...w...', '...w...', 'sssssss', 'sSsssss', 'sSsssss', '.sssss.'],
  battery: ['kkkkkkk.', 'kGGGGgkk', 'kGGGGgkk', 'kkkkkkk.'],
  armor: ['aa...aa', 'aAaaaAa', 'aAAAAAa', 'aAAAAAa', '.aAAAa.', '..aAa..', '...a...'],
  rocket: ['...R...', '..RRR..', '..SsS..', '..SbS..', '..SsS..', '.RSsSR.', '.R.y.R.', '...Y...'],
  leaf: ['....ll', '..llll', '.lLll.', 'lLll..', 'L.....'],
  gift: ['.p.p.', 'pPyPp', 'ppypp', 'PPyPP', 'PPyPP'],
  pick: ['sss..', '...w.', '..w..', '.w...', 'w....'],
  note: ['...ccc', '...c.c', '...c.c', '...c.c', '.ccc.c', 'cccc.c', '.cc.cc', '....cc'],
  speaker: ['...c....', '..cc..c.', 'cccc.c.c', 'cccc.c.c', 'cccc.c.c', '..cc..c.', '...c....'],
  autodig: ['..www..', '...w...', '...w...', '..sss..', '.sSsss.', '.sSsss.', '..sss..', 'y.y.y.y'],
};
export const ICON_URL = {};
let c_;
function initIcons() {
  for (const [k, m] of Object.entries(ICONS)) {
    const c = outlined(mapSprite(m, ICON_PAL), '#1d1420');
    ICON_URL[k] = c.toDataURL();
  }
  // íconos que evolucionan con el nivel: pala → taladro, jetpack → cohete
  for (let lvl = 0; lvl < 8; lvl++) {
    let c;
    if (lvl < 3) {
      const b = SHOVEL_BLADES[lvl];
      c = mapSprite(ICONS.shovel, { ...ICON_PAL, s: b[0], S: b[1] });
      if (lvl === 2) c = mapSprite(['..www..', '...w...', '...w...', '..sss..', '.sSsss.', 'sSsssss', 'sSsssss', '.sssss.', '..sss..', '...s...'], { ...ICON_PAL, s: b[0], S: b[1] });
    } else {
      const T = DRILL_TIERS[lvl];
      const rows = ['.HBBBB....', 'kBBBBBmMm.', 'kBBBBBMmMm', 'kBBBBBmMm.', '.DDkDD....', '...kk.....', '...kk.....'];
      if (lvl >= 5) rows.unshift('......Y...', '.....Y.Y..');
      if (T.cosmic) rows.unshift('..Y.....Y.', '.YyY...YyY', '..Y.....Y.');
      c = mapSprite(rows, { ...ICON_PAL, B: T.body, H: T.hi, D: T.dark, k: '#3a3f45', m: T.cosmic ? '#ff7ac8' : '#7d8796', M: T.cosmic ? '#8fe9ff' : '#e8eef3', Y: '#fff3a8', y: '#ff9ccc' });
    }
    ICON_URL['pala_' + lvl] = outlined(c, '#1d1420').toDataURL();
  }
  for (let lvl = 0; lvl < JET_TIERS.length; lvl++) {
    const J = JET_TIERS[lvl];
    const rows = ['...R...', '..RRR..', '..jWj..', '..jbj..', '..jJj..', '.RjJjR.', lvl >= 3 ? 'RR.k.RR' : '.R.k.R.'];
    const fl = 1 + Math.floor(lvl / 2);
    const flames = [['...y...'], ['..yYy..', '...y...'], ['..yYy..', '..yYy..', '...y...'], ['.yyYyy.', '..yYy..', '..yYy..', '...y...']][Math.min(fl, 4) - 1];
    c_ = mapSprite(rows.concat(flames), { ...ICON_PAL, j: J.j, J: J.J, W: '#e8f6ff', R: J.r === '#ffd34d' ? '#ff4d6d' : '#ff4d6d', b: '#3a3f45' });
    ICON_URL['motor_' + lvl] = outlined(c_, '#1d1420').toDataURL();
  }
  for (let lvl = 0; lvl < 7; lvl++) {
    const H = HELMET_TIERS[lvl];
    const spr = H
      ? mapSprite(lvl >= 4 ? ['.........W', '..YYYYY.W.', '.YwYYYYlL.', '.YYYYYYlLW', 'yyyyyyyyy.'] : ['..YYYYY...', '.YwYYYYlL.', '.YYYYYYlL.', 'yyyyyyyyy.'], { ...H, W: H.L })
      : mapSprite(['LLk.....', 'LLkkkkkk', 'LLkkkkkk', 'LLk.....'], { L: '#fff3a8', k: '#5b636d' });
    ICON_URL['casco_' + lvl] = outlined(spr, '#1d1420').toDataURL();
  }
  ICON_URL.torch = outlined(mapSprite(['..y..', '.yYy.', '.yYy.', '.kkk.', '..w..', '..w..', '..w..', '..w..'], { ...ICON_PAL, y: '#ff9a3d', Y: '#fff3a8', k: '#3a3f45', w: '#a8703f' }), '#1d1420').toDataURL();
  const [gc, gx] = makeCanvas(13, 14);
  drawGiftBox(gx, 1, 1);
  ICON_URL.giftBig = outlined(gc, '#1d1420').toDataURL();
  for (const k of ['pablo', 'pancha']) ICON_URL['char_' + k] = charPortrait(k, 1).toDataURL();
}

// ============================================================
//  Antorcha y dinamita en el mundo
// ============================================================
export function drawTorch(ctx, x, y, t, seed) {
  // (x, y) = punta de la llama
  const R = (a, b, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x + a, y + b, w, h); };
  R(-2, 6, 5, 1, '#5b636d');           // grampa en la pared
  R(0, 4, 1, 7, '#8a5a36'); R(0, 4, 1, 1, '#3a3f45');
  R(-1, 3, 3, 2, '#3a3f45');
  const f = Math.floor(t * 9 + seed) % 3;
  R(-1, 1, 3, 2, '#ff8a3d'); R(0, 0, 1, 3, '#ffd34d');
  if (f === 0) { R(0, -2, 1, 2, '#ff8a3d'); R(0, -1, 1, 1, '#fff3a8'); }
  else if (f === 1) { R(-1, -1, 1, 1, '#ff8a3d'); R(1, -2, 1, 2, '#ffd34d'); }
  else { R(0, -3, 1, 2, '#ff6b3d'); R(1, -1, 1, 1, '#ffd34d'); }
}
