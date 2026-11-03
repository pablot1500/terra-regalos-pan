// Fondo del núcleo con parallax: el magma veteado bien lejos y, hacia abajo de todo,
// un mundo abierto de cuevas de lava (techo con estalactitas, mesetas, cascadas y un lago).
// Cada capa se mueve más lento que el mundo cuanto más lejos está.
import { TILE, WORLD_W, WORLD_H, CORE_ROW, DEFAULT_SEED } from './config.js';
import { hash2, fbm, mulberry32 } from './rng.js';
import { makeCanvas, clamp } from './util.js';

// colores del magma de fondo, de oscuro a claro
const MAGMA = [[30, 8, 6], [50, 13, 8], [76, 21, 10], [108, 32, 12], [160, 60, 16], [232, 128, 44]];

const LAYERS = [
  { f: 0.1, paint: paintMagma },
  { f: 0.28, paint: paintFar },
  { f: 0.52, paint: paintMid },
  { f: 0.78, paint: paintNear },
];

export class CoreBackdrop {
  constructor(seed = DEFAULT_SEED) {
    this.seed = seed;
    this.key = '';
  }

  build(vw, vh) {
    // la cámara recorre desde que el núcleo asoma abajo de la pantalla hasta el fondo del mundo
    this.top = CORE_ROW * TILE - vh;
    this.bottom = WORLD_H * TILE - vh;
    this.spanX = Math.max(0, WORLD_W * TILE - vw);
    const spanY = this.bottom - this.top;
    this.layers = LAYERS.map((L, i) => {
      const W = Math.ceil(vw + this.spanX * L.f) + 2, H = Math.ceil(vh + spanY * L.f) + 2;
      const [cv, x] = makeCanvas(W, H);
      x.imageSmoothingEnabled = false;
      const rnd = mulberry32(this.seed * 7 + i * 131);
      const extra = L.paint(x, W, H, rnd, this.seed) || {};
      return { f: L.f, cv, W, H, ...extra };
    });
  }

  draw(ctx, camX, camY, vw, vh, t) {
    if (camY + vh < CORE_ROW * TILE - 32) return;
    const key = vw + 'x' + vh;
    if (key !== this.key) { this.key = key; this.build(vw, vh); }
    ctx.fillStyle = '#1e0605';
    ctx.fillRect(0, 0, vw, vh);
    const cx = clamp(camX, 0, this.spanX);
    for (const L of this.layers) {
      const sx = -Math.round(cx * L.f);
      const sy = Math.round(vh - L.H + (this.bottom - camY) * L.f);
      if (sy > vh || sy + L.H < 0) continue;
      ctx.drawImage(L.cv, sx, sy);
      if (L.falls) for (const fl of L.falls) drawFall(ctx, sx + fl.x, sy + fl.y0, fl.w, fl.y1 - fl.y0, t, fl.seed, vh);
    }
  }
}

/** cascada de lava animada (franjas que bajan) */
function drawFall(ctx, x, y, w, h, t, seed, vh) {
  const y0 = Math.max(y, -8), y1 = Math.min(y + h, vh + 8);
  if (y1 <= y0) return;
  ctx.fillStyle = '#d4501a'; ctx.fillRect(x, y0, w, y1 - y0);
  ctx.fillStyle = '#ff8a3d'; ctx.fillRect(x + 1, y0, w - 2, y1 - y0);
  ctx.fillStyle = '#ffd36a';
  const off = (t * 70 + seed * 13) % 14;
  for (let yy = y + off - 14; yy < y1; yy += 14) {
    if (yy + 6 < y0) continue;
    for (let i = 0; i < w - 2; i += 2) {
      const dy = Math.round(Math.sin(i * 1.3 + seed) * 2);
      const a = Math.max(y0, yy + dy), b = Math.min(y1, yy + dy + 4);
      if (b > a) ctx.fillRect(x + 1 + i, a, 1, b - a);
    }
  }
  // salpicón abajo
  if (y + h < vh + 8) {
    ctx.fillStyle = 'rgba(255,200,100,0.55)';
    const sp = 2 + Math.round(Math.sin(t * 9 + seed) * 1.5);
    ctx.fillRect(x - sp, y + h - 2, w + sp * 2, 2);
  }
}

// ------------------------------------------------------------
//  Capas
// ------------------------------------------------------------

/** la piel de magma veteado (la más lejana, cubre todo) */
function paintMagma(x, W, H, rnd, seed) {
  const img = x.createImageData(W, H), d = img.data;
  for (let py = 0; py < H; py++) {
    const heat = py / H;
    for (let px = 0; px < W; px++) {
      const n = fbm(px * 0.03, py * 0.045, seed + 71);
      const vein = Math.abs(fbm(px * 0.06 + 5, py * 0.08, seed + 73) - 0.5);
      let i = Math.floor(n * 2.6 + heat * 1.3 + hash2(px >> 1, py >> 1, 74) * 0.4);
      if (vein < 0.025) i += 2;
      else if (vein < 0.05) i += 1;
      const c = MAGMA[clamp(i, 0, MAGMA.length - 1)];
      const k = (py * W + px) * 4;
      d[k] = c[0]; d[k + 1] = c[1]; d[k + 2] = c[2]; d[k + 3] = 255;
    }
  }
  x.putImageData(img, 0, 0);
}

/** perfil irregular: altura por columna a partir de "picos" sueltos */
function ridge(W, rnd, n, minW, maxW, minH, maxH, flat) {
  const h = new Float32Array(W);
  for (let k = 0; k < n; k++) {
    const cx = rnd() * W, w = minW + rnd() * (maxW - minW), top = minH + rnd() * (maxH - minH);
    for (let px = Math.max(0, Math.floor(cx - w / 2)); px < Math.min(W, cx + w / 2); px++) {
      const u = Math.abs(px - cx) / (w / 2);
      // mesetas: tapa plana y costados empinados
      const v = flat ? top * (u < 0.7 ? 1 : 1 - ((u - 0.7) / 0.3) ** 1.6) : top * (1 - u * u);
      if (v > h[px]) h[px] = v;
    }
  }
  for (let px = 0; px < W; px++) h[px] += (hash2(px >> 1, 3, n) - 0.5) * 3;
  return h;
}

function fillLake(x, W, H, top, cols) {
  x.fillStyle = cols[0]; x.fillRect(0, top, W, H - top);
  x.fillStyle = cols[1]; x.fillRect(0, top, W, 1);
  for (let k = 0; k < W / 6; k++) {
    const lx = hash2(k, 1, 5) * W, ly = top + 3 + hash2(k, 2, 5) * (H - top - 4);
    x.fillStyle = hash2(k, 3, 5) < 0.5 ? cols[1] : cols[2];
    x.fillRect(Math.round(lx), Math.round(ly), 4 + Math.round(hash2(k, 4, 5) * 10), 1);
  }
}

/** lejos: cordillera de mesetas oscuras recortadas contra el resplandor y un lago de lava */
function paintFar(x, W, H, rnd) {
  // el lago queda por encima de la plataforma, para que se vea de fondo al llegar abajo
  const lake = H - 96;
  // bruma oscura: abajo de todo el magma se pierde y se abre una caverna enorme
  const haze = x.createLinearGradient(0, lake - 320, 0, lake);
  haze.addColorStop(0, 'rgba(34,9,7,0)');
  haze.addColorStop(0.45, 'rgba(34,9,7,0.85)');
  haze.addColorStop(0.8, 'rgba(70,16,9,0.95)');
  haze.addColorStop(1, 'rgba(150,44,14,1)');
  x.fillStyle = haze; x.fillRect(0, lake - 320, W, 320);
  const h = ridge(W, rnd, Math.ceil(W / 30), 30, 90, 30, 110, true);
  for (let px = 0; px < W; px++) {
    const top = Math.round(lake - h[px]);
    x.fillStyle = '#5a2016'; x.fillRect(px, top, 1, lake - top);
    x.fillStyle = '#7a3220'; x.fillRect(px, top, 1, 1);
  }
  // techo lejano con estalactitas
  const st = ridge(W, rnd, Math.ceil(W / 18), 8, 30, 20, 90, false);
  for (let px = 0; px < W; px++) {
    x.fillStyle = '#3a120c'; x.fillRect(px, 0, 1, 10 + Math.round(st[px]));
  }
  fillLake(x, W, H, lake, ['#a8360c', '#e0662a', '#8a2a0a']);
}

/** medio: mesetas de roca en bloques con grietas encendidas, cascadas de lava y el lago */
function paintMid(x, W, H, rnd) {
  const lake = H - 84;
  const falls = [];
  // techo
  const st = ridge(W, rnd, Math.ceil(W / 26), 10, 40, 30, 140, false);
  for (let px = 0; px < W; px++) {
    x.fillStyle = '#2e0f0a'; x.fillRect(px, 0, 1, 16 + Math.round(st[px]));
    x.fillStyle = '#5a2216'; x.fillRect(px, 16 + Math.round(st[px]), 1, 1);
  }
  // mesetas con textura de bloques
  const n = Math.max(3, Math.round(W / 140));
  for (let k = 0; k < n; k++) {
    const w = 34 + Math.round(rnd() * 50), hh = 50 + Math.round(rnd() * 90);
    const x0 = Math.round((k + 0.15 + rnd() * 0.5) * (W / n) - w / 2);
    const top = lake - hh;
    for (let yy = top; yy < lake; yy += 6) {
      const row = (yy - top) / 6;
      const inset = Math.round(Math.max(0, 4 - row) * 1.5 + hash2(k, row, 9) * 3);
      let bx = x0 + inset - ((row % 2) * 5);
      while (bx < x0 + w - inset) {
        const bw = 7 + Math.round(hash2(bx, yy, 11) * 7);
        const a = Math.max(bx, x0 + inset), b = Math.min(bx + bw, x0 + w - inset);
        if (b > a) {
          x.fillStyle = hash2(bx, yy, 12) < 0.5 ? '#4a1e14' : '#3e1910'; x.fillRect(a, yy, b - a, 6);
          x.fillStyle = '#6a3020'; x.fillRect(a, yy, b - a, 1);
          x.fillStyle = '#2e1009'; x.fillRect(b - 1, yy, 1, 6); x.fillRect(a, yy + 5, b - a, 1);
        }
        bx += bw;
      }
    }
    // grieta de lava en zigzag
    if (rnd() < 0.7) {
      let cx = x0 + Math.round(w * (0.3 + rnd() * 0.4));
      x.fillStyle = '#ff7a2e';
      for (let yy = top + 10; yy < lake - 2; yy += 3) {
        cx += Math.round((rnd() - 0.5) * 4);
        x.fillRect(cx, yy, 1, 3);
        if (rnd() < 0.3) x.fillRect(cx, yy, 3, 1);
      }
    }
    // cascada desde el techo hasta el lago, al costado de la meseta
    if (k % 2 === 0) falls.push({ x: x0 + w + 6 + Math.round(rnd() * 20), y0: 10, y1: lake + 2, w: 6 + Math.round(rnd() * 4), seed: k * 3.7 });
  }
  fillLake(x, W, H, lake, ['#d4501a', '#ff8a3d', '#b03c10']);
  return { falls };
}

/** cerca: estalactitas gigantes oscuras arriba y peñascos con grietas encendidas abajo */
function paintNear(x, W, H, rnd) {
  const n = Math.max(3, Math.round(W / 90));
  for (let k = 0; k < n; k++) {
    const cx = (k + 0.2 + rnd() * 0.6) * (W / n), w = 18 + rnd() * 34, len = 60 + rnd() * 220;
    for (let yy = 0; yy < len; yy++) {
      const u = yy / len;
      const half = (w / 2) * (1 - u) ** 0.8 + (hash2(k, yy >> 1, 21) - 0.5) * 2;
      if (half < 0.5) continue;
      x.fillStyle = '#1c0806'; x.fillRect(Math.round(cx - half), yy, Math.round(half * 2), 1);
      x.fillStyle = '#3a140c'; x.fillRect(Math.round(cx - half), yy, 1, 1);
    }
  }
  x.fillStyle = '#1c0806'; x.fillRect(0, 0, W, 12);
  // peñascos a los costados del fondo
  for (const side of [0, 1]) {
    const w = 60 + rnd() * 50, hh = 90 + rnd() * 80;
    for (let yy = 0; yy < hh; yy++) {
      const ww = Math.round(w * (0.55 + 0.45 * (yy / hh) ** 0.5) + (hash2(side, yy >> 1, 23) - 0.5) * 4);
      const y = H - hh + yy;
      x.fillStyle = '#220a07';
      if (side === 0) x.fillRect(0, y, ww, 1); else x.fillRect(W - ww, y, ww, 1);
    }
    let cx = side === 0 ? Math.round(w * 0.4) : Math.round(W - w * 0.4);
    x.fillStyle = '#ff7a2e';
    for (let yy = H - hh + 12; yy < H; yy += 3) { cx += Math.round((rnd() - 0.5) * 5); x.fillRect(cx, yy, 1, 3); }
  }
}
