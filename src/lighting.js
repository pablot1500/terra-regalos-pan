// Oscuridad del subsuelo con luz del cielo, de la linterna y de las gemas.
import { TILE, SURFACE, ITEMS } from './config.js';
import { T } from './tiles.js';
import { makeCanvas } from './util.js';

export class Lighting {
  constructor() {
    [this.cv, this.x] = makeCanvas(1, 1);
    this.x.imageSmoothingEnabled = true;
    this.img = null;
  }

  draw(ctx, game, camX, camY, vw, vh, t) {
    const W = game.world;
    const c0 = Math.floor(camX / TILE) - 1, r0 = Math.floor(camY / TILE) - 1;
    const cols = Math.ceil(vw / TILE) + 3, rows = Math.ceil(vh / TILE) + 3;
    if (r0 + rows < SURFACE) return;
    if (this.cv.width !== cols || this.cv.height !== rows) {
      this.cv.width = cols; this.cv.height = rows;
      this.img = this.x.createImageData(cols, rows);
    }
    const data = this.img.data;

    // fuentes de luz
    const src = [];
    for (const p of game.players) if (!p.dead) src.push([p.cx / TILE, (p.y + 4) / TILE, 7.5, 1]);
    for (const ch of W.chests) {
      const flick = 0.9 + Math.sin(t * 3) * 0.08;
      src.push([ch.c + 0.5, ch.r - 1, ch.opened ? 4 : 6.5, flick]);
    }
    for (let r = r0; r < r0 + rows; r++) {
      if (r < SURFACE) continue;
      for (let c = c0; c < c0 + cols; c++) {
        const tt = W.get(c, r);
        if (tt === T.CRYSTAL) { if (W.get(c, r - 1) === T.AIR || W.get(c, r + 1) === T.AIR || W.get(c - 1, r) === T.AIR || W.get(c + 1, r) === T.AIR) src.push([c + 0.5, r + 0.5, 2.6, 0.55]); continue; }
        if (c < 0 || c >= W.w || r >= W.h) continue;
        const li = W.loot[r * W.w + c];
        if (li && ITEMS[li].glow) src.push([c + 0.5, r + 0.5, 2.4, 0.6]);
      }
    }
    for (const fx of game.lights) src.push(fx);

    let k = 0;
    for (let j = 0; j < rows; j++) {
      const r = r0 + j;
      for (let i = 0; i < cols; i++, k += 4) {
        const c = c0 + i;
        let light;
        if (r < SURFACE) light = 1;
        else {
          light = 0;
          // luz del cielo: entra un poco por los pozos, pero se apaga con la profundidad
          const depthFade = 1 - (r - SURFACE) * 0.04;
          for (let dc = -2; dc <= 2; dc++) {
            const cc = c + dc;
            if (cc < 0 || cc >= W.w) continue;
            const st = Math.max(W.skyTop[cc], SURFACE);
            const v = Math.min(depthFade, 1 - Math.max(0, r - st + 1) * 0.105) - Math.abs(dc) * 0.3;
            if (v > light) light = v;
          }
          if (light < 1) {
            const tx = c + 0.5, ty = r + 0.5;
            for (const [sx, sy, R, I] of src) {
              const d = Math.hypot(tx - sx, ty - sy);
              if (d >= R) continue;
              const v = Math.min(1, (1.15 - d / R)) * I;
              if (v > light) light = v;
            }
          }
        }
        if (light > 1) light = 1;
        if (light < 0) light = 0;
        data[k] = 6; data[k + 1] = 4; data[k + 2] = 12;
        data[k + 3] = (1 - light) * 248;
      }
    }
    this.x.putImageData(this.img, 0, 0);
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.cv, c0 * TILE - camX, r0 * TILE - camY, cols * TILE, rows * TILE);
    ctx.restore();
  }
}
