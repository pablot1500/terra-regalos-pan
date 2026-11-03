// Generación del mundo, cavado libre (resolución de 2 px) y render por chunks.
//
// El mundo tiene dos niveles:
//  - bloques de 8x8 (`tiles`): definen el material, el tesoro y la pared de fondo.
//  - sub-celdas de 2x2 px (`sub`): definen dónde hay terreno de verdad. La pala
//    saca círculos de sub-celdas, así los pozos quedan orgánicos.
import {
  TILE, CHUNK, WORLD_W, WORLD_H, SURFACE, METERS_PER_TILE, BOTTOM_ROW, EDGE,
  LAYERS, LAYER_LOOT, GIFTS, ITEMS,
} from './config.js';
import { T, DEF, LAYER_TILES, VARIANTS, TEXPX, WALLPX, PALRGB, isDiggable, hardness } from './tiles.js';
import { hash2, fbm } from './rng.js';
import { makeCanvas } from './util.js';
import { LOOT_SPR } from './sprites.js';
import { placeStructures, PATIO } from './structures.js';

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
    const chambers = GIFTS.map((g, i) => ({
      gift: g,
      c: PATIO.c0 + 4 + Math.floor(hash2(i * 13 + 5, 7, seed) * (PATIO.c1 - PATIO.c0 - 8)),
      r: rowForDepth(g.depth),
    }));
    const nearChamber = (c, r) => chambers.some((ch) => Math.abs(c - ch.c) < 10 && Math.abs(r - ch.r) < 9);

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
        if (d > 10) {
          const nn = fbm(c * 0.11 + 3.1, r * 0.11, seed + 9);
          if (nn > 0.69 && L < LAYERS.length - 1) L++;
          else if (nn < 0.28 && L > 0) L--;
        }
        const t = LAYER_TILES[L];
        tiles[i] = mat[i] = t;
        const LL = LAYER_LOOT[L];
        if (hash2(c, r, seed + 77) < LL.density) loot[i] = pickLoot(LL.w, hash2(c, r, seed + 78));
      }
    }
    for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) this.fillTileSubs(c, r, tiles[r * w + c] === T.AIR ? 0 : 1);

    // 2) cuevas orgánicas: ruido en las esquinas de los bloques, interpolado por sub-celda
    const cr0 = SURFACE + 22, cr1 = BOTTOM_ROW - 3;
    const CW = w + 1;
    const corner = new Float32Array(CW * (h + 1));
    for (let r = cr0; r <= cr1 + 1; r++) for (let c = 0; c <= w; c++) corner[r * CW + c] = fbm(c * 0.085, r * 0.15, seed + 21);
    const TH = 0.72;
    for (let r = cr0; r < cr1; r++) {
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
      for (let rr = ch.r - 7; rr <= ch.r + 2; rr++) {
        for (let cc = ch.c - 7; cc <= ch.c + 7; cc++) {
          if (rr >= BOTTOM_ROW || cc < EDGE || cc >= w - EDGE) continue;
          const i = rr * w + cc;
          loot[i] = 0;
          const dx = cc + 0.5 - (ch.c + 0.5), dy = rr + 0.5 - ch.r;
          const e = (dx / 6) ** 2 + (dy / 4.4) ** 2;
          let v = t;
          if (e <= 1.15 && rr < ch.r) v = hash2(cc, rr, seed + 300) < 0.85 ? T.CRYSTAL : t;
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
      this.chests.push({ id: ch.gift.id, gift: ch.gift, c: ch.c, r: ch.r, opened: false, open: 0 });
    }

    // 4) estructuras
    placeStructures(this);

    // 5) recuento final
    for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) this.recount(c, r);
    for (let c = 0; c < w; c++) this.updateSkyTop(c);
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
   * Saca un círculo de terreno. Devuelve cuántas sub-celdas se rompieron,
   * los tesoros liberados y cuántas sub-celdas de cada material.
   */
  digCircle(cx, cy, R, power) {
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
          const t = this.tiles[ti];
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
          const m = this.mat[ti];
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
