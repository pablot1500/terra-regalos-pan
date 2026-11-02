// Cielo, sol, nubes y siluetas lejanas con parallax.
import { SURFACE, TILE } from './config.js';
import { makeCanvas } from './util.js';
import { mulberry32, valueNoise } from './rng.js';

const SKY = ['#4fa6e8', '#5daeeb', '#6cb8ee', '#7cc2f1', '#8ecbf3', '#a1d5f5', '#b6dff7', '#cbe9f9'];

function makeCloud(seed) {
  const rnd = mulberry32(seed);
  const w = 40 + Math.floor(rnd() * 30), h = 18;
  const [c, x] = makeCanvas(w, h);
  const blobs = [];
  const n = 4 + Math.floor(rnd() * 3);
  for (let i = 0; i < n; i++) {
    const r = 5 + rnd() * 5;
    blobs.push([8 + rnd() * (w - 16), h - r - 1 + rnd() * 2, r]);
  }
  for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) {
    let inside = false, top = false;
    for (const [bx, by, r] of blobs) {
      const d = (xx - bx) ** 2 + (yy - by) ** 2;
      if (d <= r * r) { inside = true; if (yy < by - r * 0.35) top = true; }
    }
    if (yy > h - 4 && inside && rnd() < 0.2) inside = true;
    if (!inside) continue;
    x.fillStyle = yy > h - 5 ? '#d8e7f3' : top ? '#ffffff' : '#f2f7fb';
    x.fillRect(xx, yy, 1, 1);
  }
  return c;
}

function makeSkyline(w, h, seed, col, winCol, minH, maxH) {
  const [c, x] = makeCanvas(w, h);
  const rnd = mulberry32(seed);
  let xx = 0;
  while (xx < w) {
    const bw = 10 + Math.floor(rnd() * 18);
    const bh = minH + Math.floor(rnd() * (maxH - minH));
    x.fillStyle = col;
    x.fillRect(xx, h - bh, bw, bh);
    if (rnd() < 0.3) x.fillRect(xx + (bw >> 1), h - bh - 4, 1, 4); // antena
    x.fillStyle = winCol;
    for (let wy = h - bh + 3; wy < h - 2; wy += 4) for (let wx = xx + 2; wx < xx + bw - 2; wx += 3) {
      if (rnd() < 0.55) x.fillRect(wx, wy, 1, 2);
    }
    xx += bw + Math.floor(rnd() * 3);
  }
  return c;
}

function makeHills(w, h, seed, col, colHi) {
  const [c, x] = makeCanvas(w, h);
  for (let xx = 0; xx < w; xx++) {
    // periódico en w para poder repetir
    const u = xx / w * Math.PI * 2;
    const n = Math.sin(u * 2 + seed) * 0.35 + Math.sin(u * 5 + seed * 2) * 0.15 + Math.sin(u * 11 + seed) * 0.06;
    const top = Math.floor(h * 0.45 - n * h * 0.5);
    x.fillStyle = col;
    x.fillRect(xx, top, 1, h - top);
    x.fillStyle = colHi;
    x.fillRect(xx, top, 1, 1);
  }
  return c;
}

export class Background {
  constructor() {
    this.clouds = [];
    const rnd = mulberry32(42);
    for (let i = 0; i < 9; i++) {
      this.clouds.push({ spr: makeCloud(100 + i * 7), x: i * 130 + rnd() * 60, y: 70 + rnd() * 110, sp: 3 + rnd() * 4, par: 0.1 + rnd() * 0.12 });
    }
    this.hillsFar = makeHills(512, 70, 1.3, '#a9d2e6', '#c2e2f0');
    this.hillsMid = makeHills(512, 60, 4.1, '#93c9a7', '#b2dcbf');
    this.city = makeSkyline(600, 60, 9, '#b4cde0', '#d6e6f2', 14, 52);
    this.birds = [{ x: 120, y: 120, sp: 18 }, { x: 132, y: 116, sp: 18 }, { x: 400, y: 150, sp: 14 }];
  }

  draw(ctx, camX, camY, vw, vh, t) {
    const gy = SURFACE * TILE - camY; // y en pantalla del suelo
    ctx.fillStyle = '#0b0810';
    ctx.fillRect(0, 0, vw, vh);
    if (gy <= 0) return;

    // cielo en bandas (estilo pixel)
    const skyTopY = gy - 300;
    const bandH = 300 / SKY.length;
    ctx.fillStyle = SKY[0];
    ctx.fillRect(0, 0, vw, Math.min(gy, Math.max(0, skyTopY + bandH)));
    for (let i = 0; i < SKY.length; i++) {
      const y0 = Math.round(skyTopY + i * bandH);
      const y1 = Math.round(skyTopY + (i + 1) * bandH);
      if (y1 < 0 || y0 > vh) continue;
      ctx.fillStyle = SKY[i];
      ctx.fillRect(0, y0, vw, y1 - y0);
      // tramado entre bandas
      if (i > 0) {
        ctx.fillStyle = SKY[i - 1];
        for (let xx = (y0 & 1); xx < vw; xx += 2) ctx.fillRect(xx, y0, 1, 1);
      }
    }

    // sol
    const sx = Math.round(vw * 0.78 - camX * 0.02), sy = Math.round(gy - 200 + Math.min(0, camY * 0) );
    if (sy > -30) {
      ctx.fillStyle = 'rgba(255,240,180,0.25)';
      ctx.beginPath(); ctx.arc(sx, sy, 20, 0, Math.PI * 2); ctx.fill();
      this.pixelCircle(ctx, sx, sy, 11, '#ffe58a');
      this.pixelCircle(ctx, sx, sy, 9, '#fff6c2');
      this.pixelCircle(ctx, sx - 3, sy - 3, 3, '#ffffff');
    }

    // nubes
    for (const c of this.clouds) {
      const span = 1250;
      let xx = (c.x + t * c.sp - camX * c.par) % span;
      if (xx < 0) xx += span;
      xx -= 80;
      const yy = Math.round(gy - 300 + c.y);
      if (xx > vw || yy > gy) continue;
      ctx.drawImage(c.spr, Math.round(xx), yy);
    }

    // pájaros
    for (const b of this.birds) {
      const span = 900;
      let xx = (b.x + t * b.sp - camX * 0.3) % span;
      if (xx < 0) xx += span;
      xx -= 40;
      const yy = Math.round(gy - 300 + b.y + Math.sin(t * 2 + b.x) * 3);
      const flap = Math.floor(t * 6 + b.x) % 2;
      ctx.fillStyle = '#3b4a5a';
      ctx.fillRect(Math.round(xx), yy, 1, 1);
      ctx.fillRect(Math.round(xx) - 1, yy - flap, 1, 1);
      ctx.fillRect(Math.round(xx) + 1, yy - flap, 1, 1);
      ctx.fillRect(Math.round(xx) - 2, yy - 1 + flap, 1, 1);
      ctx.fillRect(Math.round(xx) + 2, yy - 1 + flap, 1, 1);
    }

    // siluetas lejanas
    this.tile(ctx, this.hillsFar, camX * 0.15, gy - 82, vw);
    this.tile(ctx, this.city, camX * 0.3, gy - 70, vw);
    this.tile(ctx, this.hillsMid, camX * 0.45, gy - 46, vw);
  }

  tile(ctx, img, off, y, vw) {
    let x0 = -Math.floor(off % img.width);
    if (x0 > 0) x0 -= img.width;
    for (let x = x0; x < vw; x += img.width) ctx.drawImage(img, x, Math.round(y));
  }

  pixelCircle(ctx, cx, cy, r, col) {
    ctx.fillStyle = col;
    for (let y = -r; y <= r; y++) {
      const w = Math.floor(Math.sqrt(r * r - y * y));
      ctx.fillRect(cx - w, cy + y, w * 2 + 1, 1);
    }
  }
}

export { valueNoise };
