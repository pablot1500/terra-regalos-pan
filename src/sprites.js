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
  4: ['#.#', '#.#', '###', '..#', '..#'], 5: ['###', '#..', '##.', '..#', '##.'],
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
//  Personajes (12x16, mirando a la derecha)
// ============================================================
// Generado con un script de pintado (14x18, mirando a la derecha)
const BODY_TOP = [
 "..............",
 ".....ooooooo..",
 "....ossssssso.",
 "....ossssssso.",
 "....oSsesseso.",
 "....oSsessesso",
 "....oSmssssmo.",
 ".....oSsssqso.",
 ".kk...oooooo..",
 "kjJkoccCSSCo..",
 "kJjkoCcccdco..",
 "kJrkoCcccdco..",
 "kjjkosccccCo..",
 "kkkkoPPPPyPo.."
];
const LEGS = {"idle": [".kk.oPppppo...", "....oPpopPo...", "....obbobbBo..", "....oooooooo.."], "walkA": [".kk.oppppppo..", "...oPPo.oppo..", "...obbo.obbBo.", "...oooo.ooooo."], "walkC": [".kk.oppppppo..", "...oppo.oPPo..", "...obbo.obbBo.", "...oooo.ooooo."], "air": [".kk.oppppppo..", "....oPppPppo..", "....obbobbbo..", "....ooo.oooo.."]};
const HAIR = {"el": [".....HH.HH.H..", "....HhhghhghH.", "...HhhghhghhH.", "...Hhh.hH.hH..", "...Hh.........", "....H........."], "ella": [".....HHHHHHf..", "....HhhgghfFf.", "...HhhghhhhfH.", "..HhhhhhhHhH..", "..Hhgh........", ".HHhhh........", ".HHhgh..zz....", "..Hhhh........", ".HHhgH........", ".HHhhH........", "..HhgH........", "..HhhH........", "..HhhH........", "...hH........."]};

export const CHAR_W = 14, CHAR_H = 18;

const BASE_PAL = {
  o: '#2b1d2b', e: '#2b1d2b', k: '#4a5260', j: '#c3cad4', J: '#8a94a3', r: '#ff5a5a', y: '#f2c14e',
};
export const CHAR_PAL = {
  el: {
    ...BASE_PAL,
    s: '#f2c7a5', S: '#d9a17f', w: '#ffffff', m: '#f0a7a0', q: '#a8574f',
    c: '#3e9b6a', C: '#2b744e', d: '#62c08e', p: '#3d5c9c', P: '#2c4475', b: '#5a3a26', B: '#8a5a36',
    h: '#2a2733', H: '#121018', g: '#58536e',
  },
  ella: {
    ...BASE_PAL,
    s: '#fde9dd', S: '#f0c8b2', w: '#ffffff', m: '#ffaab6', q: '#d0606e', z: '#dc9a7c',
    c: '#f07aa6', C: '#c9578a', d: '#ffa3c6', p: '#6b56a8', P: '#4d3d80', b: '#7a4a3a', B: '#a8705a',
    h: '#d9572b', H: '#8e2c14', g: '#f6955a', f: '#ff9ccc', F: '#ffe066',
  },
};

function composeFrame(charId, legsKey, bob, blink, jet = 0) {
  const pal = { ...CHAR_PAL[charId], ...JET_TIERS[Math.min(jet, JET_TIERS.length - 1)] };
  const [c, x] = makeCanvas(CHAR_W, CHAR_H);
  const legs = mapSprite(LEGS[legsKey], pal);
  x.drawImage(legs, 0, 14);
  const top = blink ? BODY_TOP.map((r, i) => (i === 4 || i === 5 ? r.replace(/[ew]/g, i === 5 ? 'S' : 's') : r)) : BODY_TOP;
  x.drawImage(mapSprite(top, pal), 0, bob);
  x.drawImage(mapSprite(HAIR[charId], pal), 0, bob);
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
];
const charCache = {};
export function getCharFrames(charId, jet = 0) {
  const ck = charId + ':' + jet;
  if (charCache[ck]) return charCache[ck];
  const right = {}, left = {};
  for (const [name, [legs, bob, blink]] of Object.entries(FRAME_DEFS)) {
    right[name] = composeFrame(charId, legs, bob, blink, jet);
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
 * Dibuja brazo + pala. (sx, sy) = esquina sup. izq. del sprite de 12x16.
 * armAng y shovelAng en radianes, mirando a la derecha (0 = derecha, PI/2 = abajo).
 */
export function drawArmShovel(ctx, sx, sy, facing, bob, armAng, shovelAng, palaLevel, charId, len = 7) {
  const pal = CHAR_PAL[charId];
  const mx = (lx) => (facing > 0 ? sx + Math.round(lx) : sx + CHAR_W - 1 - Math.round(lx));
  const my = (ly) => sy + Math.round(ly);
  const shX = 9, shY = 10 + bob;
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
];

/** Taladro en la mano, apuntando en `ang` (local, mirando a la derecha). `spin` anima la mecha. */
export function drawDrill(ctx, sx, sy, facing, bob, ang, level, charId, spin) {
  const pal = CHAR_PAL[charId];
  const T = DRILL_TIERS[Math.min(level, DRILL_TIERS.length - 1)] || DRILL_TIERS[3];
  const mx = (lx) => (facing > 0 ? sx + Math.round(lx) : sx + CHAR_W - 1 - Math.round(lx));
  const my = (ly) => sy + Math.round(ly);
  const px = (lx, ly, col) => { ctx.fillStyle = col; ctx.fillRect(mx(lx), my(ly), 1, 1); };
  const shX = 9, shY = 10 + bob;
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
      px(hx + ca * t + nx * w, hy + sa * t + ny * w, stripe ? '#e8eef3' : '#7d8796');
    }
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
};
const LOOT_MAPS = {
  coin: ['.ddd.', 'dYyyd', 'dyyyd', 'dyyod', '.ooo.'],
  coins: ['..ddd..', '.dYyyd.', '.ddddd.', 'dyyyyyd', 'ooooooo'],
  bill: ['ggggggg', 'gGLgLGg', 'gGLgLGg', 'ggggggg'],
  billstack: ['ggggggg', 'gGLrLGg', 'gggrggg', 'gGLrLGg', 'ggggggg'],
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
  initCat();
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
//  Gato del taller
// ============================================================
const CAT_PAL = {
  o: '#3b2418', a: '#f2a24e', A: '#c9782c', w: '#fff1dc', G: '#5bd16a', n: '#ff9db5',
  R: '#d9344e', y: '#ffd34d', '-': '#c9b8a8',
};
const CAT_A = [
  '..o...o......',
  '.ono.ono.....',
  '.oaAaAao....o',
  '.oGaaGao...oa',
  '-oawnwao...oA',
  '..oRyRoooaAo.',
  '...oawAaAaao.',
  '...oawaAaAao.',
  '...oawaaaaAo.',
  '...owwoowwoo.',
];
const CAT_B = [
  '..o...o......',
  '.ono.ono.....',
  '.oaAaAao...o.',
  '.oGaaGao..oa.',
  '-oawnwao..oA.',
  '..oRyRoooaAo.',
  '...oawAaAaao.',
  '...oawaAaAao.',
  '...oawaaaaAo.',
  '...owwoowwoo.',
];
export const CAT = {};
function initCat() {
  CAT.a = mapSprite(CAT_A, CAT_PAL);
  CAT.b = mapSprite(CAT_B, CAT_PAL);
  CAT.blink = mapSprite(CAT_A.map((r) => r.replace(/G/g, 'o')), CAT_PAL);
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
};
export const ICON_URL = {};
let c_;
function initIcons() {
  for (const [k, m] of Object.entries(ICONS)) {
    const c = outlined(mapSprite(m, ICON_PAL), '#1d1420');
    ICON_URL[k] = c.toDataURL();
  }
  // íconos que evolucionan con el nivel: pala → taladro, jetpack → cohete
  for (let lvl = 0; lvl < 7; lvl++) {
    let c;
    if (lvl < 3) {
      const b = SHOVEL_BLADES[lvl];
      c = mapSprite(ICONS.shovel, { ...ICON_PAL, s: b[0], S: b[1] });
      if (lvl === 2) c = mapSprite(['..www..', '...w...', '...w...', '..sss..', '.sSsss.', 'sSsssss', 'sSsssss', '.sssss.', '..sss..', '...s...'], { ...ICON_PAL, s: b[0], S: b[1] });
    } else {
      const T = DRILL_TIERS[lvl];
      const rows = ['.HBBBB....', 'kBBBBBmMm.', 'kBBBBBMmMm', 'kBBBBBmMm.', '.DDkDD....', '...kk.....', '...kk.....'];
      if (lvl >= 5) rows.unshift('......Y...', '.....Y.Y..');
      c = mapSprite(rows, { ...ICON_PAL, B: T.body, H: T.hi, D: T.dark, k: '#3a3f45', m: '#7d8796', M: '#e8eef3', Y: '#fff3a8' });
    }
    ICON_URL['pala_' + lvl] = outlined(c, '#1d1420').toDataURL();
  }
  for (let lvl = 0; lvl < 6; lvl++) {
    const J = JET_TIERS[lvl];
    const rows = ['...R...', '..RRR..', '..jWj..', '..jbj..', '..jJj..', '.RjJjR.', lvl >= 3 ? 'RR.k.RR' : '.R.k.R.'];
    const fl = 1 + Math.floor(lvl / 2);
    const flames = [['...y...'], ['..yYy..', '...y...'], ['..yYy..', '..yYy..', '...y...'], ['.yyYyy.', '..yYy..', '..yYy..', '...y...']][Math.min(fl, 4) - 1];
    c_ = mapSprite(rows.concat(flames), { ...ICON_PAL, j: J.j, J: J.J, W: '#e8f6ff', R: J.r === '#ffd34d' ? '#ff4d6d' : '#ff4d6d', b: '#3a3f45' });
    ICON_URL['motor_' + lvl] = outlined(c_, '#1d1420').toDataURL();
  }
  ICON_URL.torch = outlined(mapSprite(['..y..', '.yYy.', '.yYy.', '.kkk.', '..w..', '..w..', '..w..', '..w..'], { ...ICON_PAL, y: '#ff9a3d', Y: '#fff3a8', k: '#3a3f45', w: '#a8703f' }), '#1d1420').toDataURL();
  ICON_URL.dyn = outlined(mapSprite(['.....Y.', '....y..', '...k...', '.RRRR..', '.RrRR..', '.RWWR..', '.RrRR..', '.RRRR..'], { R: '#d9344e', r: '#ff7b7b', W: '#f4f1ea', k: '#3a3f45', y: '#ffd23f', Y: '#fff3a8' }), '#1d1420').toDataURL();
  const [gc, gx] = makeCanvas(13, 14);
  drawGiftBox(gx, 1, 1);
  ICON_URL.giftBig = outlined(gc, '#1d1420').toDataURL();
  for (const k of ['el', 'ella']) ICON_URL['char_' + k] = charPortrait(k, 1).toDataURL();
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

export function drawDynamite(ctx, x, y, t, left) {
  // (x, y) = centro de la base
  const R = (a, b, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x + a, y + b, w, h); };
  const flash = left < 1 && Math.floor(t * 16) % 2 === 0;
  R(-2, -6, 4, 6, flash ? '#ffffff' : '#d9344e');
  R(-2, -6, 1, 6, flash ? '#ffffff' : '#ff7b7b');
  R(-2, -4, 4, 1, '#f4f1ea');
  R(0, -8, 1, 2, '#3a3f45');
  if (Math.floor(t * 20) % 2) R(1, -9, 1, 1, '#fff3a8'); else R(0, -9, 1, 1, '#ffd23f');
}
