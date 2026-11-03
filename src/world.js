// Generación del mundo, cavado libre (resolución de 2 px) y render por chunks.
//
// El mundo tiene dos niveles:
//  - bloques de 8x8 (`tiles`): definen el material, el tesoro y la pared de fondo.
//  - sub-celdas de 2x2 px (`sub`): definen dónde hay terreno de verdad. La pala
//    saca círculos de sub-celdas, así los pozos quedan orgánicos.
import {
  TILE, CHUNK, WORLD_W, WORLD_H, SURFACE, METERS_PER_TILE, BOTTOM_ROW, EDGE,
  LAYERS, LAYER_LOOT, GIFTS, ITEMS, MAX_DEPTH, CORE_ROW, LAVA,
} from './config.js';
import { T, DEF, LAYER_TILES, VARIANTS, TEXPX, WALLPX, PALRGB, isDiggable, hardness } from './tiles.js';
import { hash2, fbm } from './rng.js';
import { makeCanvas, clamp } from './util.js';
import { LOOT_SPR } from './sprites.js';
import { placeStructures, PATIO, DIG_ZONE } from './structures.js';

export const SUB = 2;            // px por sub-celda
export const SPT = TILE / SUB;   // sub-celdas por bloque (4)
const CRUMBLE = 3;               // si a un bloque le quedan <= 3 sub-celdas, se desmorona

export const rowForDepth = (m) => SURFACE + Math.round(m / METERS_PER_TILE);
export const depthAtY = (yPx) => Math.max(0, (yPx / TILE - SURFACE) * METERS_PER_TILE);

function layerIndex(meters) {
  for (let i = 0; i < LAYERS.length; i++) if (meters < LAYERS[i].to) return i;
  return LAYERS.length - 1;
}

function pickLoot(weights, q) {
  let total = 0;
  for (const k in weights) total += weights[k];
  let acc = 0;
  for (const k in weights) {
    acc += weights[k] / total;
    if (q < acc) return +k;
  }
  return +Object.keys(weights).pop();
}

const GRASS_HI = [124, 214, 90], GRASS = [79, 154, 50], GRASS_D = [58, 122, 38];

// plataforma del fondo del núcleo y el último cofre
export const CORE_PLATFORM = { c0: 12, c1: 66, r: BOTTOM_ROW - 7 };
const OBS = LAYERS.length - 1; // índice de la capa de obsidiana

// colores de la lava (cuerpo, de oscuro a claro) y de la superficie
const LAVA_BODY = [[176, 30, 8], [214, 60, 12], [246, 102, 22], [255, 146, 40]];
const LAVA_TOP = [[255, 214, 92], [255, 242, 170]];


export class World {
  constructor(seed) {
    this.seed = seed;
    this.w = WORLD_W;
    this.h = WORLD_H;
    this.sw = this.w * SPT;
    this.sh = this.h * SPT;
    const n = this.w * this.h;
    this.tiles = new Uint8Array(n);
    this.mat = new Uint8Array(n);     // material original (pared de fondo)
    this.loot = new Uint8Array(n);
    this.cnt = new Uint8Array(n);     // sub-celdas sólidas por bloque
    this.variant = new Uint8Array(n);
    this.sub = new Uint8Array(this.sw * this.sh);
    this.subDug = new Uint8Array(this.sw * this.sh);
    this.lava = new Uint8Array(this.sw * this.sh);      // sub-celdas con lava (siempre donde no hay terreno)
    this.lavaStamp = new Uint8Array(this.sw * this.sh); // para no mover dos veces la misma gota en un paso
    this.lavaTick = 1;
    this.lavaAcc = 0;
    this.lavaRow0 = rowForDepth(LAVA.from - 40) * SPT;
    this.steam = [];          // dónde se evaporó lava al caer en el núcleo (main.js hace el humito)
    this.skyTop = new Int16Array(this.w);
    this.chests = [];
    this.chunks = new Map();
    this.generate();
  }

  idx(c, r) { return r * this.w + c; }

  get(c, r) {
    if (c < 0 || c >= this.w || r >= this.h) return T.BEDROCK;
    if (r < 0) return T.AIR;
    return this.tiles[r * this.w + c];
  }

  solid(c, r) { return this.get(c, r) !== T.AIR; }

  subAt(sx, sy) {
    if (sx < 0 || sx >= this.sw || sy >= this.sh) return 1;
    if (sy < 0) return 0;
    return this.sub[sy * this.sw + sx];
  }

  solidPx(x, y) { return this.subAt(Math.floor(x / SUB), Math.floor(y / SUB)); }

  fillTileSubs(c, r, v) {
    for (let j = 0; j < SPT; j++) {
      const row = (r * SPT + j) * this.sw + c * SPT;
      for (let i = 0; i < SPT; i++) this.sub[row + i] = v;
    }
    this.cnt[r * this.w + c] = v ? SPT * SPT : 0;
  }

  setRaw(c, r, t) {
    const i = this.idx(c, r);
    this.tiles[i] = t;
    if (r >= SURFACE && t !== T.AIR) this.mat[i] = t;
    if (t === T.AIR || !isDiggable(t)) this.loot[i] = 0;
    this.fillTileSubs(c, r, t === T.AIR ? 0 : 1);
  }

  tileCenterSolid(c, r) {
    const sx = c * SPT + 1, sy = r * SPT + 1;
    return this.subAt(sx, sy) && this.subAt(sx + 1, sy) && this.subAt(sx, sy + 1) && this.subAt(sx + 1, sy + 1);
  }

  generate() {
    const { w, h, seed, tiles, mat, loot } = this;
    const chambers = GIFTS.filter((g) => !g.core).map((g, i) => ({
      gift: g,
      c: PATIO.c0 + 4 + Math.floor(hash2(i * 13 + 5, 7, seed) * (PATIO.c1 - PATIO.c0 - 8)),
      r: rowForDepth(g.depth),
    }));
    const nearChamber = (c, r) => chambers.some((ch) => Math.abs(c - ch.c) < 14 && Math.abs(r - ch.r) < 13);

    // 1) materiales y tesoros por bloque
    for (let r = 0; r < h; r++) {
      for (let c = 0; c < w; c++) {
        const i = r * w + c;
        this.variant[i] = Math.floor(hash2(c, r, 5) * VARIANTS);
        if (r < SURFACE) { tiles[i] = T.AIR; continue; }
        if (c < EDGE || c >= w - EDGE || r >= BOTTOM_ROW) { tiles[i] = mat[i] = T.BEDROCK; continue; }
        const d = r - SURFACE;
        const meters = d * METERS_PER_TILE + (fbm(c * 0.07, r * 0.015, seed + 5) - 0.5) * 18;
        let L = layerIndex(meters);
        // de los 1000 m para abajo la obsidiana se va comiendo al abismo
        const deep = clamp((meters - LAVA.from) / (MAX_DEPTH - LAVA.from), 0, 1);
        if (d > 10) {
          const nn = fbm(c * 0.11 + 3.1, r * 0.11, seed + 9);
          if (nn > 0.69 && L < OBS && (L + 1 < OBS || meters > LAVA.from - 60)) L++;
          else if (nn < (L === OBS ? 0.28 * (1 - deep) : 0.28) && L > 0) L--;
        }
        const t = LAYER_TILES[L];
        tiles[i] = mat[i] = t;
        const LL = LAYER_LOOT[L];
        let dens = LL.density;
        if (meters > LAVA.from) dens = Math.min(dens, LAYER_LOOT[OBS].density + (LAYER_LOOT[OBS].fadeTo - LAYER_LOOT[OBS].density) * deep);
        if (hash2(c, r, seed + 77) < dens) loot[i] = pickLoot(LL.w, hash2(c, r, seed + 78));
      }
    }
    for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) this.fillTileSubs(c, r, tiles[r * w + c] === T.AIR ? 0 : 1);

    // 2) cuevas orgánicas: ruido en las esquinas de los bloques, interpolado por sub-celda
    const cr0 = SURFACE + 22, cr1 = CORE_ROW - 6;
    const CW = w + 1;
    const corner = new Float32Array(CW * (h + 1));
    for (let r = cr0; r <= cr1 + 1; r++) for (let c = 0; c <= w; c++) corner[r * CW + c] = fbm(c * 0.085, r * 0.15, seed + 21);
    for (let r = cr0; r < cr1; r++) {
      // más abajo de los 1000 m las cuevas son mucho más grandes (para volar entre la lava)
      const TH = 0.72 - 0.11 * clamp(((r - SURFACE) * METERS_PER_TILE - LAVA.from) / 160, 0, 1);
      for (let c = EDGE; c < w - EDGE; c++) {
        if (nearChamber(c, r)) continue;
        const a = corner[r * CW + c], b = corner[r * CW + c + 1], cc = corner[(r + 1) * CW + c], dd = corner[(r + 1) * CW + c + 1];
        if (Math.max(a, b, cc, dd) < TH) continue;
        for (let j = 0; j < SPT; j++) {
          const v = (j + 0.5) / SPT;
          for (let i = 0; i < SPT; i++) {
            const u = (i + 0.5) / SPT;
            const val = a * (1 - u) * (1 - v) + b * u * (1 - v) + cc * (1 - u) * v + dd * u * v;
            if (val > TH) this.sub[(r * SPT + j) * this.sw + c * SPT + i] = 0;
          }
        }
      }
    }

    // 3) cámaras de los regalos (cúpula de cristales con piso plano)
    for (const ch of chambers) {
      const t = LAYER_TILES[layerIndex((ch.r - SURFACE) * METERS_PER_TILE)];
      for (let rr = ch.r - 10; rr <= ch.r + 2; rr++) {
        for (let cc = ch.c - 11; cc <= ch.c + 11; cc++) {
          if (rr >= BOTTOM_ROW || cc < EDGE || cc >= w - EDGE) continue;
          const i = rr * w + cc;
          loot[i] = 0;
          const dx = cc + 0.5 - (ch.c + 0.5), dy = rr + 0.5 - ch.r;
          // cáscara gruesa de cristal (con el borde de afuera irregular)
          const e = (dx / 10) ** 2 + (dy / 8) ** 2;
          let v = t;
          if (rr < ch.r && e <= 1 + (hash2(cc, rr, seed + 301) - 0.5) * 0.3) v = hash2(cc, rr, seed + 300) < 0.92 ? T.CRYSTAL : t;
          tiles[i] = mat[i] = v;
          this.fillTileSubs(cc, rr, 1);
        }
      }
      // interior
      for (let sy = (ch.r - 5) * SPT; sy < ch.r * SPT; sy++) {
        for (let sx = (ch.c - 6) * SPT; sx < (ch.c + 7) * SPT; sx++) {
          const fx = (sx + 0.5) / SPT, fy = (sy + 0.5) / SPT;
          if (((fx - (ch.c + 0.5)) / 4.3) ** 2 + ((fy - ch.r) / 3.4) ** 2 <= 1) this.sub[sy * this.sw + sx] = 0;
        }
      }
      for (let rr = ch.r - 5; rr < ch.r; rr++) for (let cc = ch.c - 6; cc <= ch.c + 6; cc++) mat[rr * w + cc] = T.CRYSTAL;
      // piso de mármol indestructible debajo del cofre
      for (let cc = ch.c - 6; cc <= ch.c + 6; cc++) {
        if (cc < EDGE || cc >= w - EDGE || ch.r >= BOTTOM_ROW) continue;
        const i = ch.r * w + cc;
        tiles[i] = mat[i] = T.GIFTFLOOR;
        loot[i] = 0;
        this.fillTileSubs(cc, ch.r, 1);
      }
      this.chests.push({ id: ch.gift.id, gift: ch.gift, c: ch.c, r: ch.r, opened: false, open: 0 });
    }

    // 4) lava y núcleo
    this.genLava();
    this.genCore();

    // 5) estructuras
    placeStructures(this);

    // 6) recuento final
    for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) this.recount(c, r);
    for (let c = 0; c < w; c++) this.updateSkyTop(c);
  }

  /** Parches de lava encerrados en la roca y charcos en el piso de las cuevas (de los 1000 m para abajo). */
  genLava() {
    const { w, seed, sub, lava, sw } = this;
    const r0 = rowForDepth(LAVA.from - 20), r1 = CORE_ROW - 5;
    const CW = w + 1;
    const corner = new Float32Array(CW * (r1 - r0 + 2));
    for (let r = r0; r <= r1 + 1; r++) for (let c = 0; c <= w; c++) corner[(r - r0) * CW + c] = fbm(c * 0.17, r * 0.23, seed + 33);
    for (let r = r0; r < r1; r++) {
      const deep = clamp(((r - SURFACE) * METERS_PER_TILE - LAVA.from) / (MAX_DEPTH - LAVA.from), 0, 1);
      const TH = 0.75 - 0.09 * deep; // cada vez más parches
      for (let c = EDGE + 1; c < w - EDGE - 1; c++) {
        const t = this.tiles[r * w + c];
        if (t !== T.OBSIDIAN && t !== T.ABYSS && t !== T.AIR) continue;
        const k = (r - r0) * CW + c;
        const a = corner[k], b = corner[k + 1], cc = corner[k + CW], dd = corner[k + CW + 1];
        if (Math.max(a, b, cc, dd) < TH) continue;
        for (let j = 0; j < SPT; j++) {
          const v = (j + 0.5) / SPT;
          for (let i = 0; i < SPT; i++) {
            const u = (i + 0.5) / SPT;
            const val = a * (1 - u) * (1 - v) + b * u * (1 - v) + cc * (1 - u) * v + dd * u * v;
            if (val <= TH) continue;
            const q = (r * SPT + j) * sw + c * SPT + i;
            sub[q] = 0;
            lava[q] = 1;
          }
        }
        this.loot[r * w + c] = 0;
      }
    }
    // charcos: en el piso de las cuevas se junta lava
    const sy0 = r0 * SPT, sy1 = r1 * SPT;
    for (let sx = (EDGE + 1) * SPT; sx < (w - EDGE - 1) * SPT; sx++) {
      for (let sy = sy0 + 1; sy < sy1; sy++) {
        const q = sy * sw + sx;
        if (!sub[q] || sub[q - sw] || lava[q - sw]) continue;
        // piso de una cueva: ¿hay charco acá?
        const deep = clamp(((sy / SPT - SURFACE) * METERS_PER_TILE - LAVA.from) / (MAX_DEPTH - LAVA.from), 0, 1);
        if (fbm(sx * 0.045, sy * 0.06, seed + 37) < 0.6 - 0.07 * deep) continue;
        const depth = 2 + Math.floor(hash2(sx >> 3, sy >> 2, seed + 38) * 5);
        for (let k = 1; k <= depth; k++) {
          const p = q - k * sw;
          if (sub[p]) break;
          lava[p] = 1;
        }
      }
    }
  }

  /** Caverna del núcleo: el piso de roca termina en una línea ondulada y abajo hay magma, una plataforma y el último cofre. */
  genCore() {
    const { w, seed, sub, lava, sw, tiles, mat } = this;
    // línea ondulada donde termina la roca
    for (let sx = EDGE * SPT; sx < (w - EDGE) * SPT; sx++) {
      const wx = sx * SUB + 1;
      const top = CORE_ROW * TILE + (fbm(wx * 0.018, 1.3, seed + 51) - 0.5) * 44 + (fbm(wx * 0.09, 4.2, seed + 52) - 0.5) * 10;
      for (let sy = Math.max(0, Math.floor(top / SUB)); sy < BOTTOM_ROW * SPT; sy++) {
        const q = sy * sw + sx;
        sub[q] = 0;
        lava[q] = 0;
      }
    }
    for (let r = CORE_ROW - 4; r < BOTTOM_ROW; r++) {
      for (let c = EDGE; c < w - EDGE; c++) {
        const i = r * w + c;
        let n = 0;
        for (let j = 0; j < SPT; j++) for (let k = 0; k < SPT; k++) n += sub[(r * SPT + j) * sw + c * SPT + k];
        if (n === SPT * SPT) continue;
        mat[i] = T.CORE;
        if (!n) { tiles[i] = T.AIR; this.loot[i] = 0; }
      }
    }
    // plataforma flotando sobre un mar de lava
    const P = CORE_PLATFORM;
    for (let c = P.c0; c <= P.c1; c++) {
      const fromEdge = Math.min(c - P.c0, P.c1 - c);
      const thick = Math.min(3, 1 + fromEdge) + (hash2(c, 3, seed + 55) < 0.35 && fromEdge > 3 ? 1 : 0);
      for (let r = P.r; r < P.r + thick; r++) {
        const i = r * w + c;
        tiles[i] = T.COREFLOOR;
        mat[i] = T.CORE;
        this.loot[i] = 0;
        this.fillTileSubs(c, r, 1);
      }
    }
    for (let sy = (BOTTOM_ROW - 3) * SPT; sy < BOTTOM_ROW * SPT; sy++) {
      for (let sx = EDGE * SPT; sx < (w - EDGE) * SPT; sx++) {
        const q = sy * sw + sx;
        if (!sub[q]) lava[q] = 1;
      }
    }
    const gift = GIFTS.find((g) => g.core);
    if (gift) this.chests.push({ id: gift.id, gift, c: P.c1 - 4, r: P.r, opened: false, open: 0, locked: true });
  }

  /** Recuenta las sub-celdas de un bloque y lo desmorona si quedó casi vacío. */
  recount(c, r) {
    const i = r * this.w + c;
    let n = 0;
    for (let j = 0; j < SPT; j++) {
      const row = (r * SPT + j) * this.sw + c * SPT;
      for (let k = 0; k < SPT; k++) n += this.sub[row + k];
    }
    this.cnt[i] = n;
    const t = this.tiles[i];
    if (t !== T.AIR && isDiggable(t) && n <= CRUMBLE) {
      if (n) for (let j = 0; j < SPT; j++) {
        const row = (r * SPT + j) * this.sw + c * SPT;
        for (let k = 0; k < SPT; k++) if (this.sub[row + k]) { this.sub[row + k] = 0; }
      }
      this.cnt[i] = 0;
      this.tiles[i] = T.AIR;
      this.loot[i] = 0;
    } else if (t === T.AIR && n > 0) {
      this.fillTileSubs(c, r, 0);
    }
    if (this.loot[i] && !this.tileCenterSolid(c, r)) this.loot[i] = 0;
  }

  updateSkyTop(c) {
    let r = 0;
    while (r < this.h && this.tiles[r * this.w + c] === T.AIR) r++;
    this.skyTop[c] = r;
  }

  /** Primer píxel sólido en la dirección (dx, dy) desde (x, y), hasta maxD px. */
  probe(x, y, dx, dy, maxD) {
    for (let d = 0; d <= maxD; d += 1) {
      const px = x + dx * d, py = y + dy * d;
      if (this.solidPx(px, py)) {
        const c = Math.floor(px / TILE), r = Math.floor(py / TILE);
        return { x: px, y: py, d, c, r, t: this.get(c, r) };
      }
    }
    return null;
  }

  /** Píxel sólido más cercano a (x, y) dentro de un radio R */
  nearestSolid(x, y, R) {
    let best = null, bd = R * R + 1;
    const sx0 = Math.floor((x - R) / SUB), sx1 = Math.floor((x + R) / SUB);
    const sy0 = Math.floor((y - R) / SUB), sy1 = Math.floor((y + R) / SUB);
    for (let sy = sy0; sy <= sy1; sy++) for (let sx = sx0; sx <= sx1; sx++) {
      if (!this.subAt(sx, sy)) continue;
      const px = sx * SUB + 1, py = sy * SUB + 1;
      const d = (px - x) ** 2 + (py - y) ** 2;
      if (d < bd) { bd = d; best = { x: px, y: py }; }
    }
    if (!best) return null;
    const c = Math.floor(best.x / TILE), r = Math.floor(best.y / TILE);
    return { x: best.x, y: best.y, c, r, t: this.get(c, r) };
  }

  /** Material más duro (que se pueda romper con `power`) dentro de un círculo */
  circleInfo(cx, cy, R, power) {
    let hard = 0, any = false;
    const c0 = Math.floor((cx - R) / TILE), c1 = Math.floor((cx + R) / TILE);
    const r0 = Math.floor((cy - R) / TILE), r1 = Math.floor((cy + R) / TILE);
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
      const t = this.get(c, r);
      if (t === T.AIR || !isDiggable(t)) continue;
      const hd = hardness(t);
      if (hd > power) continue;
      any = true;
      if (hd > hard) hard = hd;
    }
    return { any, hard };
  }

  /**
   * Saca un círculo de terreno (el cristal solo dentro de `chip`, si se pasa). Devuelve cuántas sub-celdas se rompieron,
   * los tesoros liberados y cuántas sub-celdas de cada material.
   */
  digCircle(cx, cy, R, power, chip = null) {
    const { sw, sub, w } = this;
    const sx0 = Math.max(0, Math.floor((cx - R) / SUB)), sx1 = Math.min(sw - 1, Math.floor((cx + R) / SUB));
    const sy0 = Math.max(0, Math.floor((cy - R) / SUB)), sy1 = Math.min(this.sh - 1, Math.floor((cy + R) / SUB));
    const R2 = R * R;
    const touched = new Set();
    const mats = {};
    let n = 0;
    for (let sy = sy0; sy <= sy1; sy++) {
      const py = sy * SUB + 1;
      for (let sx = sx0; sx <= sx1; sx++) {
        const px = sx * SUB + 1;
        if ((px - cx) ** 2 + (py - cy) ** 2 > R2) continue;
        const j = sy * sw + sx;
        if (!sub[j]) continue;
        const ti = (sy >> 2) * w + (sx >> 2);
        const t = this.tiles[ti];
        if (!isDiggable(t) || hardness(t) > power) continue;
        // el cristal solo se rompe de a poquito alrededor de donde pega la pala
        if (t === T.CRYSTAL) {
          if (!chip) continue;
          const dx = px - chip.x, dy = py - chip.y;
          if (((dx * chip.ax + dy * chip.ay) / chip.depth) ** 2 + ((dy * chip.ax - dx * chip.ay) / chip.width) ** 2 > 1) continue;
        }
        sub[j] = 0;
        this.subDug[j] = 1;
        touched.add(ti);
        mats[t] = (mats[t] || 0) + 1;
        n++;
      }
    }
    const loot = [];
    const cols = new Set();
    for (const ti of touched) {
      const c = ti % w, r = (ti / w) | 0;
      const item = this.loot[ti];
      // marcar como cavadas las sub-celdas que se desmoronan
      const before = this.tiles[ti];
      this.recount(c, r);
      if (before !== T.AIR && this.tiles[ti] === T.AIR) this.markTileDug(c, r);
      if (item && !this.loot[ti]) loot.push({ x: c * TILE + 4, y: r * TILE + 4, item });
      this.markDirty(c, r);
      cols.add(c);
    }
    for (const c of cols) this.updateSkyTop(c);
    return { n, loot, mats };
  }

  markTileDug(c, r) {
    for (let j = 0; j < SPT; j++) {
      const row = (r * SPT + j) * this.sw + c * SPT;
      for (let k = 0; k < SPT; k++) this.subDug[row + k] = 1;
    }
  }

  /** Rompe un bloque entero (lo usan las pruebas y herramientas de debug). */
  dig(c, r) {
    if (c < 0 || c >= this.w || r < 0 || r >= this.h) return -1;
    const i = this.idx(c, r);
    if (!isDiggable(this.tiles[i])) return -1;
    const item = this.loot[i];
    this.fillTileSubs(c, r, 0);
    this.markTileDug(c, r);
    this.tiles[i] = T.AIR;
    this.loot[i] = 0;
    this.markDirty(c, r);
    this.updateSkyTop(c);
    return item;
  }

  markDirty(c, r) {
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      const key = Math.floor((c + dc) / CHUNK) + ',' + Math.floor((r + dr) / CHUNK);
      const ch = this.chunks.get(key);
      if (ch) ch.dirty = true;
    }
  }

  // ---------- Guardado ----------
  exportDug() {
    const n = this.subDug.length;
    const bytes = new Uint8Array(Math.ceil(n / 8));
    for (let i = 0; i < n; i++) if (this.subDug[i]) bytes[i >> 3] |= 1 << (i & 7);
    let s = '';
    for (let i = 0; i < bytes.length; i += 4096) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 4096));
    return btoa(s);
  }

  /** v2: bits por sub-celda */
  importDug(b64) {
    if (!b64) return;
    const s = atob(b64);
    for (let k = 0; k < s.length; k++) {
      const byte = s.charCodeAt(k);
      if (!byte) continue;
      for (let b = 0; b < 8; b++) {
        if (!(byte & (1 << b))) continue;
        const j = k * 8 + b;
        if (j >= this.sub.length) break;
        const sx = j % this.sw, sy = (j / this.sw) | 0;
        const t = this.tiles[(sy >> 2) * this.w + (sx >> 2)];
        if (!isDiggable(t) && t !== T.AIR) continue;
        this.sub[j] = 0;
        this.subDug[j] = 1;
      }
    }
    this.afterImport();
  }

  /** v1 (partidas viejas): bits por bloque */
  importDugTiles(b64) {
    if (!b64) return;
    const s = atob(b64);
    for (let k = 0; k < s.length; k++) {
      const byte = s.charCodeAt(k);
      if (!byte) continue;
      for (let b = 0; b < 8; b++) {
        if (!(byte & (1 << b))) continue;
        const i = k * 8 + b;
        if (i >= this.tiles.length) break;
        if (!isDiggable(this.tiles[i])) continue;
        const c = i % this.w, r = (i / this.w) | 0;
        this.fillTileSubs(c, r, 0);
        this.markTileDug(c, r);
      }
    }
    this.afterImport();
  }

  afterImport() {
    for (let r = 0; r < this.h; r++) for (let c = 0; c < this.w; c++) this.recount(c, r);
    for (let c = 0; c < this.w; c++) this.updateSkyTop(c);
    this.chunks.clear();
  }

  // ---------- Lava ----------
  /** cuántas sub-celdas de lava hay en un bloque */
  lavaInTile(c, r) {
    if (c < 0 || c >= this.w || r < 0 || r >= this.h) return 0;
    let n = 0;
    for (let j = 0; j < SPT; j++) {
      const row = (r * SPT + j) * this.sw + c * SPT;
      for (let k = 0; k < SPT; k++) n += this.lava[row + k];
    }
    return n;
  }

  /** cuántas sub-celdas de lava toca un rectángulo (en px) */
  lavaInRect(x, y, w, h) {
    const sx0 = Math.max(0, Math.floor(x / SUB)), sx1 = Math.min(this.sw - 1, Math.floor((x + w - 0.001) / SUB));
    const sy0 = Math.max(this.lavaRow0, Math.floor(y / SUB)), sy1 = Math.min(this.sh - 1, Math.floor((y + h - 0.001) / SUB));
    let n = 0;
    for (let sy = sy0; sy <= sy1; sy++) for (let sx = sx0; sx <= sx1; sx++) n += this.lava[sy * this.sw + sx];
    return n;
  }

  /** La lava cae y se desparrama como un líquido espeso (solo cerca de la cámara). */
  updateLava(dt, camX, camY, vw, vh) {
    this.lavaAcc += dt;
    if (this.lavaAcc < LAVA.tick) return;
    this.lavaAcc = Math.min(this.lavaAcc - LAVA.tick, LAVA.tick);
    const M = 56;
    const { sw, sub, lava, lavaStamp } = this;
    const sy0 = Math.max(this.lavaRow0, Math.floor(camY / SUB) - M), sy1 = Math.min(this.sh - 2, Math.ceil((camY + vh) / SUB) + M);
    if (sy0 > sy1) return;
    const sx0 = 1, sx1 = sw - 2;
    const tick = this.lavaTick = this.lavaTick % 255 + 1;
    const free = (q) => !sub[q] && !lava[q];
    // la lava que cae dentro de la caverna del núcleo se va evaporando de a poco mientras cae:
    // cuanto más abajo, más probable; nunca llega a la plataforma
    const seaTop = (BOTTOM_ROW - 3) * SPT, coreTop = CORE_ROW * SPT, never = seaTop - 110;
    const move = (a, b) => {
      lava[a] = 0;
      const by = (b / sw) | 0;
      if (by < seaTop && this.mat[(by >> 2) * this.w + ((b % sw) >> 2)] === T.CORE) {
        const p = by > never ? 1 : 0.004 + Math.max(0, by - coreTop) * 0.0003;
        if (hash2(b, tick, 91) < p) {
          if (this.steam.length < 40 && hash2(b, tick, 92) < 0.5) this.steam.push([(b % sw) * SUB + 1, by * SUB + 1]);
          return;
        }
      }
      lava[b] = 1; lavaStamp[b] = tick;
    };
    for (let sy = sy1; sy >= sy0; sy--) {
      const row = sy * sw;
      const ltr = (sy + tick) & 1;
      for (let k = 0; k <= sx1 - sx0; k++) {
        const sx = ltr ? sx0 + k : sx1 - k;
        const q = row + sx;
        if (!lava[q] || lavaStamp[q] === tick) continue;
        const dn = q + sw;
        if (free(dn)) { move(q, sy < sy1 && free(dn + sw) ? dn + sw : dn); continue; }
        const dir = (hash2(sx, sy, tick) < 0.5) ? -1 : 1;
        if (free(dn + dir)) { move(q, dn + dir); continue; }
        if (free(dn - dir)) { move(q, dn - dir); continue; }
        // espesa: se corre de costado más despacio que el agua
        if (hash2(sx, sy, tick + 300) < 0.45) {
          if (free(q + dir)) move(q, q + dir);
          else if (free(q - dir)) move(q, q - dir);
        }
      }
    }
  }

  /** dibuja la lava que se ve en pantalla (cuerpo animado y superficie brillante) */
  drawLava(ctx, camX, camY, vw, vh, t) {
    const sx0 = Math.max(0, Math.floor(camX / SUB)), sy0 = Math.max(this.lavaRow0, Math.floor(camY / SUB));
    const sx1 = Math.min(this.sw - 1, Math.ceil((camX + vw) / SUB)), sy1 = Math.min(this.sh - 1, Math.ceil((camY + vh) / SUB));
    if (sy0 > sy1) return;
    const cols = sx1 - sx0 + 1, rows = sy1 - sy0 + 1;
    if (!this.lavaCv || this.lavaCv.width < cols || this.lavaCv.height < rows) {
      [this.lavaCv, this.lavaX] = makeCanvas(cols + 8, rows + 8);
      this.lavaImg = this.lavaX.createImageData(cols + 8, rows + 8);
    }
    const img = this.lavaImg, d = img.data, IW = img.width;
    d.fill(0);
    const { sw, lava, sub } = this;
    let any = false;
    for (let sy = sy0; sy <= sy1; sy++) {
      const row = sy * sw;
      for (let sx = sx0; sx <= sx1; sx++) {
        const q = row + sx;
        if (!lava[q]) continue;
        any = true;
        let col;
        if (!lava[q + sw] && !sub[q + sw]) col = LAVA_BODY[(sx + sy) & 1 ? 2 : 3]; // gotas cayendo
        else if (!lava[q - sw] && !sub[q - sw]) col = LAVA_TOP[(Math.sin(sx * 0.9 + t * 4) > 0.6) ? 1 : 0];
        else {
          const v = Math.sin(sx * 0.42 + t * 1.3 + Math.sin(sy * 0.37 - t * 0.9) * 1.8) + Math.sin(sy * 0.53 + t * 0.7 + sx * 0.11) * 0.8;
          col = LAVA_BODY[clamp(Math.floor((v + 1.8) * 1.15), 0, 3)];
        }
        const k = ((sy - sy0) * IW + (sx - sx0)) * 4;
        d[k] = col[0]; d[k + 1] = col[1]; d[k + 2] = col[2]; d[k + 3] = 255;
      }
    }
    if (!any) return;
    this.lavaX.putImageData(img, 0, 0, 0, 0, cols, rows);
    ctx.drawImage(this.lavaCv, 0, 0, cols, rows, sx0 * SUB - camX, sy0 * SUB - camY, cols * SUB, rows * SUB);
  }

  // ---------- Render ----------
  renderChunk(cx, cy) {
    const key = cx + ',' + cy;
    const S = CHUNK * TILE;
    let ch = this.chunks.get(key);
    if (!ch) {
      const [cv, x] = makeCanvas(S, S);
      ch = { cv, x, img: x.createImageData(S, S), dirty: true };
      this.chunks.set(key, ch);
    }
    const d = ch.img.data;
    d.fill(0);
    const { sw, sub, w } = this;
    const subAt = (sx, sy) => (sx < 0 || sx >= sw ? 1 : sy < 0 ? 0 : sy >= this.sh ? 1 : sub[sy * sw + sx]);
    const X0 = cx * S, Y0 = cy * S;
    for (let py = 0; py < S; py++) {
      const wy = Y0 + py;
      const r = wy >> 3;
      if (r < SURFACE || r >= this.h) continue;
      const sy = wy >> 1, ly = wy & 1, ty = wy & 7;
      for (let px = 0; px < S; px++) {
        const wx = X0 + px;
        const c = wx >> 3;
        if (c >= w) break;
        const ti = r * w + c;
        const sx = wx >> 1, lx = wx & 1, tx = wx & 7;
        const k = (py * S + px) * 4;
        const v = this.variant[ti];
        const o = (ty * 8 + tx) * 4;
        if (sub[sy * sw + sx]) {
          let t = this.tiles[ti];
          if ((t === T.GRAVEL || t === T.DIRT) && this.nearGravelEdge(c, r)) t = this.gravelPx(wx, wy) ? T.GRAVEL : T.DIRT;
          const tex = TEXPX[t];
          if (!tex) continue; // estructuras invisibles
          const pal = PALRGB[t];
          const up = !subAt(sx, sy - 1), dn = !subAt(sx, sy + 1), lf = !subAt(sx - 1, sy), rt = !subAt(sx + 1, sy);
          let col = null;
          if (t === T.DIRT && r === SURFACE && (up || !subAt(sx, sy - 2))) {
            col = up ? (ly === 0 ? GRASS_HI : GRASS) : (hash2(wx, wy, 3) < 0.4 ? GRASS_D : GRASS);
          } else if ((up && ly === 0) || (dn && ly === 1) || (lf && lx === 0) || (rt && lx === 1)) col = pal[0];
          else if (up && ly === 1) col = pal[3];
          if (col) { d[k] = col[0]; d[k + 1] = col[1]; d[k + 2] = col[2]; d[k + 3] = 255; }
          else { const tx_ = tex[v]; d[k] = tx_[o]; d[k + 1] = tx_[o + 1]; d[k + 2] = tx_[o + 2]; d[k + 3] = 255; }
        } else {
          let m = this.mat[ti];
          if (m === T.CORE) continue; // el fondo del núcleo lo dibuja core.js (con parallax)
          if ((m === T.GRAVEL || m === T.DIRT) && this.nearGravelEdge(c, r)) m = this.gravelPx(wx, wy) ? T.GRAVEL : T.DIRT;
          const wt = WALLPX[m || T.DIRT];
          if (!wt) continue;
          const p = wt[v];
          // sombrita debajo de los bordes de arriba
          const shadow = subAt(sx, sy - 1) && !this.solidStruct(sx, sy - 1) ? 0.7 : 1;
          d[k] = p[o] * shadow; d[k + 1] = p[o + 1] * shadow; d[k + 2] = p[o + 2] * shadow; d[k + 3] = 255;
        }
      }
    }
    ch.x.putImageData(ch.img, 0, 0);
    // tesoros incrustados y decoración del pasto
    const c0 = cx * CHUNK, r0 = cy * CHUNK;
    for (let r = r0; r < r0 + CHUNK; r++) {
      if (r < SURFACE - 1 || r >= this.h) continue;
      for (let c = c0; c < c0 + CHUNK && c < w; c++) {
        const lx = (c - c0) * TILE, ly = (r - r0) * TILE;
        if (r === SURFACE - 1) { this.drawDecor(ch.x, c, r, lx, ly); continue; }
        const li = this.loot[r * w + c];
        if (!li) continue;
        const spr = LOOT_SPR[ITEMS[li].key];
        ch.x.drawImage(spr, lx + ((TILE - spr.width) >> 1), ly + ((TILE - spr.height) >> 1));
      }
    }
    ch.dirty = false;
    return ch;
  }

  // La grava del cantero se dibuja con un borde irregular contra la tierra
  // (solo es dibujo: los bloques siguen siendo los mismos para cavar).
  nearGravelEdge(c, r) {
    return r >= SURFACE + 2 && r <= SURFACE + 5 && c >= DIG_ZONE.c0 - 1 && c <= DIG_ZONE.c1 + 1;
  }

  gravelPx(wx, wy) {
    const x0 = DIG_ZONE.c0 * TILE, x1 = (DIG_ZONE.c1 + 1) * TILE, y1 = (SURFACE + 4) * TILE;
    // contornos con ondas grandes (ruido suave) y mordiscos chicos (de a 2 px)
    const bot = y1 + (fbm(wx * 0.09, 3.7, 61) - 0.5) * 14 + (hash2(wx >> 1, 5, 62) - 0.5) * 3;
    const left = x0 + (fbm(wy * 0.12, 8.1, 63) - 0.5) * 9 + (hash2(wy >> 1, 6, 64) - 0.5) * 3;
    const right = x1 + (fbm(wy * 0.12, 2.9, 65) - 0.5) * 9 + (hash2(wy >> 1, 7, 66) - 0.5) * 3;
    // esquinas de abajo redondeadas
    const corner = Math.max(0, 5 - (wx - left), 5 - (right - wx));
    if (wx >= left && wx < right && wy < bot - corner * corner * 0.25) return true;
    // piedritas sueltas metidas en la tierra cerca del borde
    const d = Math.max(wy - bot, left - wx, wx - right);
    return d < 7 && hash2(wx >> 1, wy >> 1, 67) < 0.16 * (1 - d / 7);
  }

  solidStruct(sx, sy) {
    const t = this.get(sx >> 2, sy >> 2);
    return t === T.STRUCT || t === T.STAIR;
  }

  drawDecor(x, c, r, lx, ly) {
    if (c < PATIO.c0 || c > PATIO.c1) return;
    if (this.get(c, r + 1) !== T.DIRT) return;
    const sy = (r + 1) * SPT;
    for (let i = 0; i < SPT; i++) if (!this.subAt(c * SPT + i, sy)) return;
    const q = hash2(c, r, 41);
    const base = ly + 8;
    for (let i = 0; i < 8; i++) {
      const hh = hash2(c * 8 + i, r, 43);
      if (hh < 0.45) { x.fillStyle = hh < 0.2 ? '#7cd65a' : '#5cb24f'; x.fillRect(lx + i, base - 1 - (hh < 0.12 ? 1 : 0), 1, 1 + (hh < 0.12 ? 1 : 0)); }
    }
    if (q < 0.28) {
      const colors = ['#ff5d6c', '#ffd34d', '#ff9ad5', '#ffffff', '#b48bff', '#ff8a3d'];
      const col = colors[Math.floor(hash2(c, r, 47) * colors.length)];
      const fx = lx + 2 + Math.floor(hash2(c, r, 49) * 4);
      const hgt = 3 + Math.floor(hash2(c, r, 51) * 3);
      x.fillStyle = '#3f8f3a'; x.fillRect(fx, base - hgt, 1, hgt);
      x.fillStyle = '#5cb24f'; x.fillRect(fx + 1, base - 2, 1, 1);
      x.fillStyle = col;
      x.fillRect(fx - 1, base - hgt - 1, 3, 1);
      x.fillRect(fx, base - hgt - 2, 1, 3);
      x.fillStyle = '#fff3a0'; x.fillRect(fx, base - hgt - 1, 1, 1);
    }
  }

  draw(ctx, camX, camY, vw, vh) {
    const S = CHUNK * TILE;
    const cx0 = Math.max(0, Math.floor(camX / S)), cy0 = Math.max(0, Math.floor(camY / S));
    const cx1 = Math.min(Math.ceil(this.w / CHUNK) - 1, Math.floor((camX + vw) / S));
    const cy1 = Math.min(Math.ceil(this.h / CHUNK) - 1, Math.floor((camY + vh) / S));
    for (let cy = cy0; cy <= cy1; cy++) {
      if ((cy + 1) * CHUNK < SURFACE - 2) continue;
      for (let cx = cx0; cx <= cx1; cx++) {
        let ch = this.chunks.get(cx + ',' + cy);
        if (!ch || ch.dirty) ch = this.renderChunk(cx, cy);
        ctx.drawImage(ch.cv, cx * S - camX, cy * S - camY);
      }
    }
  }
}
