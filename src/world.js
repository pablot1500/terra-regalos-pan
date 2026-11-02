// Generación del mundo, acceso a bloques y render por chunks.
import {
  TILE, CHUNK, WORLD_W, WORLD_H, SURFACE, METERS_PER_TILE, BOTTOM_ROW, EDGE,
  LAYERS, LAYER_LOOT, GIFTS, ITEMS,
} from './config.js';
import { T, DEF, LAYER_TILES, VARIANTS, getTex, getWall, WALL_MID, isDiggable } from './tiles.js';
import { hash2, fbm } from './rng.js';
import { makeCanvas } from './util.js';
import { LOOT_SPR } from './sprites.js';
import { placeStructures, PATIO } from './structures.js';

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

export class World {
  constructor(seed) {
    this.seed = seed;
    this.w = WORLD_W;
    this.h = WORLD_H;
    const n = this.w * this.h;
    this.tiles = new Uint8Array(n);
    this.mat = new Uint8Array(n);   // material original (para la pared de fondo)
    this.loot = new Uint8Array(n);
    this.dug = new Uint8Array(n);
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

  setRaw(c, r, t) {
    const i = this.idx(c, r);
    this.tiles[i] = t;
    if (r >= SURFACE) this.mat[i] = t === T.AIR ? this.mat[i] : t;
    if (t === T.AIR || !isDiggable(t)) this.loot[i] = 0;
  }

  generate() {
    const { w, h, seed, tiles, mat, loot } = this;
    const chambers = GIFTS.map((g, i) => ({
      gift: g,
      c: PATIO.c0 + 4 + Math.floor(hash2(i * 13 + 5, 7, seed) * (PATIO.c1 - PATIO.c0 - 8)),
      r: rowForDepth(g.depth),
    }));
    const nearChamber = (c, r) => chambers.some((ch) => Math.abs(c - ch.c) < 10 && Math.abs(r - ch.r) < 9);

    for (let r = 0; r < h; r++) {
      for (let c = 0; c < w; c++) {
        const i = r * w + c;
        if (r < SURFACE) { tiles[i] = T.AIR; continue; }
        if (c < EDGE || c >= w - EDGE || r >= BOTTOM_ROW) { tiles[i] = mat[i] = T.BEDROCK; continue; }
        const d = r - SURFACE;
        const meters = d * METERS_PER_TILE + (fbm(c * 0.07, r * 0.015, seed + 5) - 0.5) * 18;
        let L = layerIndex(meters);
        if (d > 10) {
          const n = fbm(c * 0.11 + 3.1, r * 0.11, seed + 9);
          if (n > 0.69 && L < LAYERS.length - 1) L++;
          else if (n < 0.28 && L > 0) L--;
        }
        const t = LAYER_TILES[L];
        mat[i] = t;
        if (d > 22) {
          const cn = fbm(c * 0.085, r * 0.15, seed + 21);
          if (cn > 0.72 && !nearChamber(c, r)) { tiles[i] = T.AIR; continue; }
        }
        tiles[i] = t;
        const LL = LAYER_LOOT[L];
        if (hash2(c, r, seed + 77) < LL.density) loot[i] = pickLoot(LL.w, hash2(c, r, seed + 78));
      }
    }

    // Cámaras de los regalos
    for (const ch of chambers) {
      const t = LAYER_TILES[layerIndex((ch.r - SURFACE) * METERS_PER_TILE)];
      for (let rr = ch.r - 6; rr <= ch.r + 2; rr++) {
        for (let cc = ch.c - 6; cc <= ch.c + 6; cc++) {
          if (rr >= BOTTOM_ROW || cc < EDGE || cc >= w - EDGE) continue;
          const i = rr * w + cc;
          const dx = cc - ch.c, dy = rr - (ch.r - 2);
          const inside = Math.abs(dx) <= 3 && rr >= ch.r - 3 && rr <= ch.r - 1 && !(Math.abs(dx) === 3 && rr === ch.r - 3);
          loot[i] = 0;
          if (inside) { tiles[i] = T.AIR; mat[i] = T.CRYSTAL; continue; }
          if (rr === ch.r && Math.abs(dx) <= 4) { tiles[i] = t; mat[i] = t; continue; }
          const e = (dx / 5.5) ** 2 + (dy / 3.6) ** 2;
          if (e <= 1.25) {
            const v = hash2(cc, rr, seed + 300) < 0.8 ? T.CRYSTAL : t;
            tiles[i] = v; mat[i] = v;
          } else if (tiles[i] === T.AIR && e <= 2.2) {
            tiles[i] = t; mat[i] = t;
          }
        }
      }
      this.chests.push({ id: ch.gift.id, gift: ch.gift, c: ch.c, r: ch.r, opened: false, open: 0 });
    }

    placeStructures(this);
    for (let c = 0; c < w; c++) this.updateSkyTop(c);
  }

  updateSkyTop(c) {
    let r = 0;
    while (r < this.h && this.tiles[r * this.w + c] === T.AIR) r++;
    this.skyTop[c] = r;
  }

  /** Rompe un bloque. Devuelve el id del tesoro (0 si no había) o -1 si no se pudo. */
  dig(c, r) {
    if (c < 0 || c >= this.w || r < 0 || r >= this.h) return -1;
    const i = this.idx(c, r);
    const t = this.tiles[i];
    if (!isDiggable(t)) return -1;
    this.tiles[i] = T.AIR;
    this.dug[i] = 1;
    const item = this.loot[i];
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
    const n = this.dug.length;
    const bytes = new Uint8Array(Math.ceil(n / 8));
    for (let i = 0; i < n; i++) if (this.dug[i]) bytes[i >> 3] |= 1 << (i & 7);
    let s = '';
    for (let i = 0; i < bytes.length; i += 4096) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 4096));
    return btoa(s);
  }

  importDug(b64) {
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
        this.tiles[i] = T.AIR; this.loot[i] = 0; this.dug[i] = 1;
      }
    }
    for (let c = 0; c < this.w; c++) this.updateSkyTop(c);
    this.chunks.clear();
  }

  // ---------- Render ----------
  isOpen(c, r) { return this.get(c, r) === T.AIR; }

  renderChunk(cx, cy) {
    const key = cx + ',' + cy;
    let ch = this.chunks.get(key);
    if (!ch) {
      const [cv, x] = makeCanvas(CHUNK * TILE, CHUNK * TILE);
      ch = { cv, x, dirty: true };
      this.chunks.set(key, ch);
    }
    const x = ch.x;
    x.clearRect(0, 0, CHUNK * TILE, CHUNK * TILE);
    const c0 = cx * CHUNK, r0 = cy * CHUNK;
    for (let r = r0; r < r0 + CHUNK; r++) {
      if (r < SURFACE - 2 || r >= this.h) continue;
      for (let c = c0; c < c0 + CHUNK; c++) {
        if (c >= this.w) continue;
        const lx = (c - c0) * TILE, ly = (r - r0) * TILE;
        const t = this.tiles[r * this.w + c];
        const v = Math.floor(hash2(c, r, 5) * VARIANTS);
        if (t === T.AIR) {
          if (r >= SURFACE) {
            const m = this.mat[r * this.w + c];
            const wall = getWall(m || T.DIRT, v);
            if (wall) x.drawImage(wall, lx, ly);
          } else if (r === SURFACE - 1) {
            this.drawDecor(x, c, r, lx, ly);
          }
          continue;
        }
        const d = DEF[t];
        if (!d) continue; // estructuras invisibles
        x.drawImage(getTex(t, v), lx, ly);
        const li = this.loot[r * this.w + c];
        if (li) {
          const spr = LOOT_SPR[ITEMS[li].key];
          const ox = (TILE - spr.width) >> 1, oy = (TILE - spr.height) >> 1;
          x.drawImage(spr, lx + ox + (hash2(c, r, 9) < 0.5 ? 0 : 1) - (spr.width > 6 ? 0 : 0), ly + oy);
        }
        this.drawEdges(x, c, r, lx, ly, t, d);
      }
    }
    ch.dirty = false;
    return ch;
  }

  drawEdges(x, c, r, lx, ly, t, d) {
    const up = this.isOpen(c, r - 1), dn = this.isOpen(c, r + 1);
    const lf = this.isOpen(c - 1, r), rt = this.isOpen(c + 1, r);
    if (!(up || dn || lf || rt)) return;
    const P = d.pal;
    x.fillStyle = P[0];
    if (up) x.fillRect(lx, ly, 8, 1);
    if (dn) x.fillRect(lx, ly + 7, 8, 1);
    if (lf) x.fillRect(lx, ly, 1, 8);
    if (rt) x.fillRect(lx + 7, ly, 1, 8);
    if (up) {
      x.fillStyle = P[3];
      x.fillRect(lx + (lf ? 1 : 0), ly + 1, 8 - (lf ? 1 : 0) - (rt ? 1 : 0), 1);
    }
    const corner = (px, py, ix, iy, top) => {
      if (top && r <= SURFACE) x.clearRect(px, py, 1, 1);
      else { x.fillStyle = WALL_MID[this.mat[r * this.w + c]] || '#140e0a'; x.fillRect(px, py, 1, 1); }
      x.fillStyle = P[0];
      x.fillRect(ix, iy, 1, 1);
    };
    if (up && lf) corner(lx, ly, lx + 1, ly + 1, true);
    if (up && rt) corner(lx + 7, ly, lx + 6, ly + 1, true);
    if (dn && lf) corner(lx, ly + 7, lx + 1, ly + 6, false);
    if (dn && rt) corner(lx + 7, ly + 7, lx + 6, ly + 6, false);

    // pasto en la superficie
    if (t === T.DIRT && r === SURFACE) {
      if (up) {
        for (let i = 0; i < 8; i++) {
          const hgt = 2 + (hash2(c * 8 + i, r, 11) < 0.35 ? 1 : 0);
          x.fillStyle = '#4f9a32'; x.fillRect(lx + i, ly, 1, hgt);
          x.fillStyle = '#6cc04a'; x.fillRect(lx + i, ly, 1, 1);
        }
        x.fillStyle = '#3a7a26';
        x.fillRect(lx + (c % 3), ly + 3, 1, 1);
      }
      if (lf) { x.fillStyle = '#4f9a32'; x.fillRect(lx, ly, 1, 4); }
      if (rt) { x.fillStyle = '#4f9a32'; x.fillRect(lx + 7, ly, 1, 4); }
    }
  }

  drawDecor(x, c, r, lx, ly) {
    if (c < PATIO.c0 || c > PATIO.c1) return;
    if (this.get(c, r + 1) !== T.DIRT) return;
    const q = hash2(c, r, 41);
    const base = ly + 8;
    // briznas de pasto
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
