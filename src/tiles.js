// Tipos de bloque y generación de texturas pixel art (8x8)
import { makeCanvas, hexToRgb, rgb } from './util.js';
import { mulberry32 } from './rng.js';

export const T = {
  AIR: 0,
  DIRT: 1,
  CLAY: 2,
  STONE: 3,
  GRANITE: 4,
  BASALT: 5,
  ABYSS: 6,
  BEDROCK: 7,
  CONCRETE: 8,
  STRUCT: 9,   // sólido invisible (edificios: los dibuja structures.js)
  STAIR: 10,   // escalera (sólida, invisible)
  CRYSTAL: 11, // cristales rosados que rodean las cámaras de regalos
  PAVER: 12,   // baldosas del patio (no se rompen)
  GIFTFLOOR: 13, // piso de mármol de las cámaras de regalo (no se rompe)
};

export const LAYER_TILES = [T.DIRT, T.CLAY, T.STONE, T.GRANITE, T.BASALT, T.ABYSS];

// pal: [contorno, oscuro, medio, claro, acento]
export const DEF = [];
DEF[T.DIRT] = { name: 'Tierra', hard: 1, pal: ['#3a2213', '#5b3920', '#77492a', '#91603a', '#ad7b4c'], style: 'dirt' };
DEF[T.CLAY] = { name: 'Arcilla', hard: 2, pal: ['#4a1f15', '#783624', '#964a30', '#b2623d', '#cf8a5c'], style: 'clay' };
DEF[T.STONE] = { name: 'Piedra', hard: 4, pal: ['#26262f', '#464654', '#5f5f72', '#7c7c92', '#a0a0b8'], style: 'stone' };
DEF[T.GRANITE] = { name: 'Granito', hard: 7, pal: ['#2c2028', '#523c48', '#6e5563', '#8f7282', '#d2b4c2'], style: 'granite' };
DEF[T.BASALT] = { name: 'Basalto', hard: 11, pal: ['#0c0d12', '#1b1d27', '#272a38', '#363a4d', '#58607e'], style: 'basalt' };
DEF[T.ABYSS] = { name: 'Abismo', hard: 16, pal: ['#0b0712', '#180f25', '#26193a', '#382552', '#a77bff'], style: 'abyss' };
DEF[T.BEDROCK] = { name: 'Roca madre', hard: 9999, pal: ['#050407', '#100e15', '#1b1822', '#28242f', '#37323f'], style: 'bedrock' };
DEF[T.CONCRETE] = { name: 'Cemento', hard: 9999, pal: ['#5f5b56', '#8a8680', '#a29e98', '#b9b5ae', '#d2cec7'], style: 'concrete' };
DEF[T.PAVER] = { name: 'Baldosa', hard: 9999, pal: ['#6f665b', '#a89c8a', '#cfc4b2', '#e3dacb', '#efe8dc'], style: 'paver' };
DEF[T.GIFTFLOOR] = { name: 'Mármol', hard: 9999, pal: ['#6e3a52', '#d9a6bd', '#f3d6e2', '#fdeef4', '#e6b33c'], style: 'giftfloor' };
DEF[T.CRYSTAL] = { name: 'Cristal', hard: 1, pal: ['#4c1236', '#9a2e66', '#d4508f', '#ff86c2', '#ffd6ec'], style: 'crystal', glow: true };

export const VARIANTS = 4;
const TEX = [];
const WALL = [];
export const WALL_MID = [];
// píxeles crudos para el render por ImageData
export const TEXPX = [];
export const WALLPX = [];
export const PALRGB = [];

export function isDiggable(t) {
  const d = DEF[t];
  return !!d && d.hard < 9999;
}
export function hardness(t) {
  const d = DEF[t];
  return d ? d.hard : 9999;
}

function genTex(id, v) {
  const d = DEF[id];
  const P = d.pal;
  const [c, x] = makeCanvas(8, 8);
  const r = mulberry32(id * 1000 + v * 77 + 3);
  const px = (i, j, col) => { x.fillStyle = col; x.fillRect(i, j, 1, 1); };
  const ri = (n) => Math.floor(r() * n);
  x.fillStyle = P[2];
  x.fillRect(0, 0, 8, 8);

  switch (d.style) {
    case 'dirt': {
      for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) {
        const q = r();
        if (q < 0.17) px(i, j, P[1]);
        else if (q > 0.9) px(i, j, P[3]);
      }
      for (let k = 0; k < 2; k++) { // piedritas
        const i = ri(7), j = ri(7);
        px(i, j, P[4]); px(i + 1, j, P[3]); px(i, j + 1, P[1]); px(i + 1, j + 1, P[1]);
      }
      break;
    }
    case 'clay': {
      for (let j = 0; j < 8; j++) {
        const band = (j + v) % 4 === 0 ? P[3] : (j + v) % 4 === 2 ? P[1] : null;
        for (let i = 0; i < 8; i++) {
          if (band && r() < 0.75) px(i, j, band);
          else if (r() < 0.08) px(i, j, P[4]);
        }
      }
      break;
    }
    case 'stone': {
      for (let k = 0; k < 3; k++) {
        const w = 2 + ri(3), h = 2 + ri(2), i = ri(8 - w + 1), j = ri(8 - h + 1);
        x.fillStyle = P[3]; x.fillRect(i, j, w, h);
        px(i, j, P[4]);
        x.fillStyle = P[1]; x.fillRect(i, j + h, w, 1); x.fillRect(i + w, j, 1, h + 1);
      }
      for (let n = 0; n < 4; n++) px(ri(8), ri(8), P[1]);
      break;
    }
    case 'granite': {
      for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) {
        const q = r();
        if (q < 0.2) px(i, j, P[1]);
        else if (q < 0.32) px(i, j, P[3]);
        else if (q < 0.38) px(i, j, P[4]);
        else if (q < 0.42) px(i, j, '#17101a');
      }
      break;
    }
    case 'basalt': {
      const off = v % 3;
      for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) {
        if ((i + off) % 4 === 0) px(i, j, P[1]);
        else if ((i + off) % 4 === 1 && r() < 0.5) px(i, j, P[3]);
        else if (r() < 0.06) px(i, j, P[4]);
      }
      for (let k = 0; k < 2; k++) { const j = ri(8); x.fillStyle = P[1]; x.fillRect(0, j, 8, 1); }
      break;
    }
    case 'abyss': {
      x.fillStyle = P[1]; x.fillRect(0, 0, 8, 8);
      for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) {
        const q = r();
        if (q < 0.3) px(i, j, P[2]);
        else if (q < 0.42) px(i, j, P[0]);
        else if (q < 0.48) px(i, j, P[3]);
      }
      const i = 1 + ri(6), j = 1 + ri(6);
      px(i, j, P[4]); px(i - 1, j, P[3]); px(i + 1, j, P[3]); px(i, j - 1, P[3]);
      if (v % 2) px(ri(8), ri(8), '#d9c2ff');
      break;
    }
    case 'bedrock': {
      x.fillStyle = P[1]; x.fillRect(0, 0, 8, 8);
      for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) {
        const q = r();
        if (q < 0.3) px(i, j, P[0]);
        else if (q < 0.45) px(i, j, P[2]);
        else if (q < 0.5) px(i, j, P[3]);
      }
      break;
    }
    case 'concrete': {
      x.fillStyle = P[3]; x.fillRect(0, 0, 8, 8);
      for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) {
        const q = r();
        if (q < 0.14) px(i, j, P[2]);
        else if (q > 0.93) px(i, j, P[4]);
      }
      if (v === 0) { x.fillStyle = P[2]; x.fillRect(7, 0, 1, 8); }
      break;
    }
    case 'giftfloor': {
      // mármol rosado con vetas doradas
      x.fillStyle = P[3]; x.fillRect(0, 0, 8, 8);
      for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) if (r() < 0.18) px(i, j, P[2]);
      const vy = 2 + (v % 4);
      for (let i = 0; i < 8; i++) px(i, Math.max(0, Math.min(7, vy + Math.round(Math.sin((i + v * 3) * 0.9)))), P[4]);
      x.fillStyle = P[1]; x.fillRect(7, 0, 1, 8);
      break;
    }
    case 'paver': {
      // baldosa calcárea con junta
      x.fillStyle = P[3]; x.fillRect(0, 0, 8, 8);
      for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) if (r() < 0.12) px(i, j, P[2]);
      x.fillStyle = P[1]; x.fillRect(7, 0, 1, 8); x.fillRect(0, 7, 8, 1);
      px(1 + (v % 3) * 2, 2 + (v % 2) * 3, P[4]);
      break;
    }
    case 'crystal': {
      x.fillStyle = P[1]; x.fillRect(0, 0, 8, 8);
      for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) {
        if ((i + j + v) % 5 === 0) px(i, j, P[2]);
        if ((i - j + 16 + v) % 6 === 0) px(i, j, P[3]);
      }
      px(1 + ri(6), 1 + ri(6), P[4]);
      px(1 + ri(6), 1 + ri(6), P[4]);
      break;
    }
  }
  return c;
}

function genWall(tex, id) {
  const [c, x] = makeCanvas(8, 8);
  x.drawImage(tex, 0, 0);
  x.fillStyle = id === T.CRYSTAL ? 'rgba(40,6,30,0.55)' : 'rgba(8,5,14,0.6)';
  x.fillRect(0, 0, 8, 8);
  return c;
}

export function initTiles() {
  for (let id = 0; id < DEF.length; id++) {
    if (!DEF[id]) continue;
    TEX[id] = [];
    WALL[id] = [];
    for (let v = 0; v < VARIANTS; v++) {
      const t = genTex(id, v);
      TEX[id][v] = t;
      WALL[id][v] = genWall(t, id);
    }
    TEXPX[id] = TEX[id].map((cv) => cv.getContext('2d').getImageData(0, 0, 8, 8).data);
    WALLPX[id] = WALL[id].map((cv) => cv.getContext('2d').getImageData(0, 0, 8, 8).data);
    PALRGB[id] = DEF[id].pal.map(hexToRgb);
    const [r, g, b] = hexToRgb(DEF[id].pal[2]);
    const f = id === T.CRYSTAL ? 0.5 : 0.4;
    WALL_MID[id] = rgb(r * f, g * f, b * f);
  }
}

export const getTex = (id, v) => TEX[id][v];
export const getWall = (id, v) => WALL[id] && WALL[id][v];
