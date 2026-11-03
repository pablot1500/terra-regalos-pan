// Cielo, nubes, barrio de casitas y la costa con el mar a la derecha (parallax).
import { SURFACE, TILE } from './config.js';
import { makeCanvas } from './util.js';
import { mulberry32 } from './rng.js';

const SKY = ['#4fa6e8', '#5daeeb', '#6cb8ee', '#7cc2f1', '#8ecbf3', '#a1d5f5', '#b6dff7', '#cbe9f9'];
const P_FAR = 0.12, P_MID = 0.35;
const SEA_U = 300;            // donde empieza el mar en la capa lejana
const FAR_H = 100, HORIZON = 42;

function painter(x) {
  const R = (a, b, w, h, c) => { x.fillStyle = c; x.fillRect(a, b, w, h); };
  const P = (a, b, c) => R(a, b, 1, 1, c);
  return { R, P };
}

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
    if (!inside) continue;
    x.fillStyle = yy > h - 5 ? '#d8e7f3' : top ? '#ffffff' : '#f2f7fb';
    x.fillRect(xx, yy, 1, 1);
  }
  return c;
}

// ---------- capa lejana: lomas a la izquierda, costa y mar a la derecha ----------
function makeFar() {
  const W = 1500;
  const [c, x] = makeCanvas(W, FAR_H);
  const { R, P } = painter(x);
  const rnd = mulberry32(7);
  // mar (de punta a punta; la tierra lo tapa a la izquierda)
  const seaBands = ['#93d3ec', '#7cc6e6', '#69b9df', '#5aaed8', '#4ca2d1', '#4198ca'];
  for (let i = 0; i < seaBands.length; i++) {
    const y0 = HORIZON + i * 5;
    R(0, y0, W, i === seaBands.length - 1 ? FAR_H - y0 : 5, seaBands[i]);
  }
  R(0, HORIZON, W, 1, '#c6ecf8');
  for (let k = 0; k < 300; k++) {
    const u = Math.floor(rnd() * W);
    const y = HORIZON + 3 + Math.floor(rnd() * 40);
    R(u, y, 2 + Math.floor(rnd() * 4), 1, y < HORIZON + 15 ? '#b6e4f5' : '#8fd1ec');
  }
  // playa cercana
  for (let u = SEA_U; u < W; u++) {
    const y = 74 - Math.round(Math.min(1, (u - SEA_U) / 80) * 6);
    R(u, y, 1, FAR_H - y, '#f1dca3');
    R(u, y, 1, 2, '#d9c084');
    if ((u + Math.floor(u / 9)) % 5) P(u, y - 1, '#ffffff');
    if (rnd() < 0.08) P(u, y + 4 + Math.floor(rnd() * 15), '#e2c98a');
  }
  // tierra con la costa en diagonal (la playa se curva hacia nosotros)
  const COAST0 = SEA_U - 40;
  const coastAt = (y) => COAST0 + (y - HORIZON) * 2.4 + Math.sin(y * 0.7) * 1.5;
  for (let y = HORIZON; y < FAR_H; y++) {
    const cx = Math.round(coastAt(y));
    R(0, y, cx, 1, '#a9cbbd');
    R(cx, y, 3, 1, '#ead9a8');
    P(cx + 3, y, '#ffffff');
    if (y % 3 === 0) R(cx + 4, y, 2, 1, '#c6ecf8');
  }
  // lomas bajitas (las sierras quedan lejos)
  for (let u = 0; u < COAST0 + 2; u++) {
    const t = u / 90;
    let hgt = 7 + Math.sin(t * 1.7) * 3 + Math.sin(t * 4.1 + 1) * 1.5;
    const fade = Math.min(1, (COAST0 - u) / 70);
    hgt *= fade * fade * (3 - 2 * fade);
    const top = Math.round(HORIZON - hgt);
    if (top >= HORIZON) continue;
    R(u, top, 1, HORIZON - top, '#b2d2cc');
    P(u, top, '#c9e3df');
  }
  // la ciudad lejana sobre la costa
  for (let u = 40; u < COAST0 - 10;) {
    const bw = 3 + Math.floor(rnd() * 5);
    const bh = 3 + Math.floor(rnd() * (u > COAST0 - 90 ? 13 : 7));
    R(u, HORIZON - bh, bw, bh, '#bcd3dc');
    R(u, HORIZON - bh, 1, bh, '#cfe0e7');
    u += bw + 1 + Math.floor(rnd() * 6);
  }
  // islita con faro
  const fx = SEA_U + 230;
  R(fx - 14, HORIZON - 3, 28, 4, '#7a8a8f'); R(fx - 10, HORIZON - 5, 20, 2, '#8c9ca1'); R(fx - 14, HORIZON, 28, 1, '#5f6e73');
  R(fx - 2, HORIZON - 20, 5, 15, '#ffffff');
  R(fx - 2, HORIZON - 16, 5, 3, '#e04848'); R(fx - 2, HORIZON - 10, 5, 3, '#e04848');
  R(fx - 3, HORIZON - 23, 7, 3, '#3a3f45'); R(fx - 1, HORIZON - 22, 3, 1, '#ffe58a');
  R(fx - 1, HORIZON - 25, 3, 2, '#e04848');
  // velero
  const bx = SEA_U + 120;
  R(bx, HORIZON + 8, 12, 2, '#ffffff'); R(bx + 1, HORIZON + 10, 10, 1, '#c9d6de');
  R(bx + 5, HORIZON - 6, 1, 14, '#6b6f78');
  for (let j = 0; j < 12; j++) R(bx + 6, HORIZON - 5 + j, Math.floor(j / 2), 1, '#fff7e6');
  for (let j = 0; j < 8; j++) R(bx + 5 - Math.floor(j / 2), HORIZON - 1 + j, Math.floor(j / 2), 1, '#ff9fbf');
  // costa lejana a la derecha
  for (let u = SEA_U + 520; u < W; u++) {
    const top = HORIZON - 4 - Math.round(Math.sin((u - SEA_U) / 60) * 3 + 3);
    R(u, top, 1, HORIZON - top, '#9cc3cf');
  }
  return c;
}

// ---------- capa media: el barrio ----------
const FACADES = ['#f3d9b1', '#cfe6dc', '#f6cfcf', '#d9e4f7', '#fbe6b8', '#e8d6f0', '#f0e2d0', '#cde0c4'];

function house(x, rnd, u, base) {
  const { R, P } = painter(x);
  const bw = 22 + Math.floor(rnd() * 18), hh = 16 + Math.floor(rnd() * 16);
  const col = FACADES[Math.floor(rnd() * FACADES.length)];
  const top = base - hh;
  R(u, top, bw, hh, col);
  R(u, top, 1, hh, 'rgba(0,0,0,0.12)'); R(u + bw - 1, top, 1, hh, 'rgba(0,0,0,0.18)');
  const roof = rnd();
  if (roof < 0.55) {
    // techo de tejas a dos aguas
    const rh = 7 + Math.floor(rnd() * 4);
    for (let j = 0; j < rh; j++) {
      const inset = Math.round((j / rh) * 0) ;
      const w = bw + 4 - Math.round(((rh - j) / rh) * (bw * 0.8));
      const xx = u + Math.round((bw - w) / 2);
      R(xx, top - rh + j, w, 1, j % 2 ? '#c4664a' : '#b45a40');
    }
    R(u - 2, top - 1, bw + 4, 1, '#8e4330');
    if (rnd() < 0.5) { R(u + bw - 8, top - rh - 2, 3, 6, '#9a5b48'); R(u + bw - 9, top - rh - 3, 5, 1, '#6e3f31'); }
  } else {
    // terraza con parapeto, tanque y antena
    R(u - 1, top - 2, bw + 2, 2, '#e9e1d2'); R(u - 1, top - 2, bw + 2, 1, '#ffffff');
    if (rnd() < 0.7) { const tx = u + 3 + Math.floor(rnd() * (bw - 10)); R(tx, top - 9, 6, 7, '#2a2c33'); R(tx + 1, top - 10, 4, 1, '#2a2c33'); R(tx + 1, top - 8, 1, 5, '#4f5562'); }
    if (rnd() < 0.5) { const ax = u + bw - 4; R(ax, top - 12, 1, 10, '#6b6f78'); R(ax - 3, top - 10, 7, 1, '#6b6f78'); }
  }
  // ventanas
  const floors = hh > 26 ? 2 : 1;
  for (let f = 0; f < floors; f++) {
    const wy = top + 4 + f * 12;
    for (let wx = u + 3; wx < u + bw - 5; wx += 8) {
      if (rnd() < 0.2) continue;
      R(wx - 1, wy - 1, 6, 7, '#ffffff');
      R(wx, wy, 4, 5, rnd() < 0.3 ? '#fff1b0' : '#7fb6d9');
      if (rnd() < 0.5) R(wx, wy, 4, 2, '#d9cdb6'); // persiana
      R(wx - 1, wy + 6, 6, 1, '#c9bda8');
      if (f === 1 && rnd() < 0.4) { R(wx - 2, wy + 7, 8, 1, '#3a3f45'); for (let k = 0; k < 8; k += 2) R(wx - 2 + k, wy + 7, 1, 3, '#3a3f45'); }
      if (f === 0 && rnd() < 0.35) { R(wx - 1, wy + 7, 6, 2, '#a0522d'); P(wx, wy + 6, '#ff6b8a'); P(wx + 2, wy + 6, '#ffd34d'); P(wx + 4, wy + 6, '#ff6b8a'); }
    }
  }
  // puerta
  const dx = u + Math.floor(bw / 2) - 2 + (rnd() < 0.5 ? -6 : 4);
  if (dx > u + 1 && dx < u + bw - 6) { R(dx, base - 9, 5, 9, '#8b5a36'); P(dx + 3, base - 5, '#e2b33c'); }
  return bw;
}

function tree(x, u, base, rnd, big) {
  const { R, P } = painter(x);
  const r = big ? 9 : 6;
  R(u, base - r - 6, 2, r + 6, '#6b4429');
  for (let yy = -r; yy <= r; yy++) for (let xx = -r; xx <= r; xx++) {
    if (xx * xx + yy * yy > r * r) continue;
    P(u + 1 + xx, base - r * 2 - 4 + yy, yy > r * 0.3 ? '#3b8a3e' : rnd() < 0.5 ? '#4fa64a' : '#5db856');
  }
}

function palm(x, u, base, h, rnd) {
  const { R, P } = painter(x);
  for (let j = 0; j < h; j++) {
    const xx = u + Math.round(Math.sin(j / h * 1.6) * 4);
    R(xx, base - j, 2, 1, j % 3 === 0 ? '#7a5236' : '#9a6a44');
  }
  const tx = u + Math.round(Math.sin(1.6) * 4), ty = base - h;
  const fronds = [[-1, 0.2], [1, 0.2], [-1, 0.7], [1, 0.7], [-0.4, -0.6], [0.5, -0.5]];
  for (const [dx, dy] of fronds) {
    for (let k = 0; k < 9; k++) {
      const px = tx + Math.round(dx * k), py = ty + Math.round(dy * k + (k * k) / 14);
      R(px, py, 2, 1, k % 2 ? '#3f9a3f' : '#5cb85c');
    }
  }
  R(tx - 1, ty, 3, 2, '#6b4429');
}

function makeMid() {
  const W = 620, H = 90, base = 82;
  const [c, x] = makeCanvas(W, H);
  const { R, P } = painter(x);
  const rnd = mulberry32(21);
  let u = -6;
  let k = 0;
  while (u < 360) {
    if (k % 3 === 2) { tree(x, u + 3, base, rnd, rnd() < 0.5); u += 10; }
    const bw = house(x, rnd, u, base);
    u += bw + 1 + Math.floor(rnd() * 3);
    k++;
    // farolas
    if (rnd() < 0.35) { R(u, base - 18, 1, 18, '#3a3f45'); R(u - 1, base - 19, 3, 1, '#3a3f45'); P(u, base - 18, '#ffe58a'); }
  }
  // médanos hacia la playa
  for (let uu = 370; uu < W; uu++) {
    const top = base - 6 - Math.round(Math.sin((uu - 370) / 26) * 4 + 2);
    R(uu, top, 1, H - top, '#ead39a');
    P(uu, top, '#f6e5b8');
    if ((uu * 7) % 11 === 0) { R(uu, top - 3, 1, 3, '#7aa64a'); P(uu - 1, top - 2, '#8cba55'); }
  }
  palm(x, 382, base - 6, 30, rnd);
  palm(x, 410, base - 7, 24, rnd);
  palm(x, 452, base - 6, 34, rnd);
  // sombrilla de playa
  R(486, base - 22, 1, 16, '#ffffff');
  for (let j = 0; j < 4; j++) R(479 + j, base - 24 + j, 15 - j * 2, 1, j % 2 ? '#ff7eb6' : '#ffffff');
  // aire de distancia
  x.globalCompositeOperation = 'source-atop';
  x.fillStyle = 'rgba(175,212,240,0.28)';
  x.fillRect(0, 0, W, H);
  x.globalCompositeOperation = 'source-over';
  return { c, base };
}

export class Background {
  constructor() {
    this.clouds = [];
    const rnd = mulberry32(42);
    for (let i = 0; i < 9; i++) {
      this.clouds.push({ spr: makeCloud(100 + i * 7), x: i * 130 + rnd() * 60, y: 70 + rnd() * 110, sp: 3 + rnd() * 4, par: 0.1 + rnd() * 0.12 });
    }
    this.far = makeFar();
    this.mid = makeMid();
    this.birds = [{ x: 120, y: 120, sp: 18 }, { x: 132, y: 116, sp: 18 }, { x: 400, y: 150, sp: 14 }, { x: 640, y: 190, sp: 10 }];
  }

  draw(ctx, camX, camY, vw, vh, t) {
    const gy = SURFACE * TILE - camY;
    ctx.fillStyle = '#0b0810';
    ctx.fillRect(0, 0, vw, vh);
    if (gy <= 0) return;

    // cielo en bandas
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
      if (i > 0) {
        ctx.fillStyle = SKY[i - 1];
        for (let xx = (y0 & 1); xx < vw; xx += 2) ctx.fillRect(xx, y0, 1, 1);
      }
    }

    // sol
    const sx = Math.round(vw * 0.78 - camX * 0.02), sy = Math.round(gy - 200);
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

    // gaviotas
    for (const b of this.birds) {
      const span = 900;
      let xx = (b.x + t * b.sp - camX * 0.3) % span;
      if (xx < 0) xx += span;
      xx = Math.round(xx - 40);
      const yy = Math.round(gy - 300 + b.y + Math.sin(t * 2 + b.x) * 3);
      const flap = Math.floor(t * 6 + b.x) % 2;
      ctx.fillStyle = '#3b4a5a';
      ctx.fillRect(xx, yy, 1, 1);
      ctx.fillRect(xx - 1, yy - flap, 1, 1); ctx.fillRect(xx + 1, yy - flap, 1, 1);
      ctx.fillRect(xx - 2, yy - 1 + flap, 1, 1); ctx.fillRect(xx + 2, yy - 1 + flap, 1, 1);
    }

    // costa y mar
    const fx = Math.round(-camX * P_FAR);
    const fy = gy - 100;
    ctx.drawImage(this.far, fx, fy);
    // destellos del agua
    for (let i = 0; i < 26; i++) {
      const u = SEA_U + 10 + ((i * 97) % 900);
      const y = HORIZON + 4 + ((i * 37) % 30);
      if (Math.sin(t * 2.2 + i * 1.7) > 0.55) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(fx + u, fy + y, 2, 1);
      }
    }
    // barrio
    const mx = Math.round(-camX * P_MID);
    ctx.drawImage(this.mid.c, mx, gy - 24 - this.mid.base);
  }

  pixelCircle(ctx, cx, cy, r, col) {
    ctx.fillStyle = col;
    for (let y = -r; y <= r; y++) {
      const w = Math.floor(Math.sqrt(r * r - y * y));
      ctx.fillRect(cx - w, cy + y, w * 2 + 1, 1);
    }
  }
}
