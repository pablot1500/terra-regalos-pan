// Edificio, escalera, departamento, taller y decoración del patio.
import { SURFACE, TILE } from './config.js';
import { T } from './tiles.js';
import { makeCanvas, mapSprite, pixelLine } from './util.js';
import { mulberry32 } from './rng.js';
import { drawText } from './sprites.js';

const S = SURFACE;

// Zonas en píxeles de mundo
export const HOME_ZONE = { x0: 11 * TILE, x1: 19 * TILE, y0: (S - 11) * TILE, y1: (S - 6) * TILE };
export const SHOP_ZONE = { x0: 65 * TILE, x1: 76 * TILE, y0: (S - 6) * TILE, y1: S * TILE };
export const SPAWN = { x: 14 * TILE + 1, y: (S - 6) * TILE - 15 };
export const PATIO = { c0: 27, c1: 64 };
export const CAT_POS = { x: 64 * TILE + 50, y: (S - 9) * TILE + 56 - 10 };

export function placeStructures(world) {
  const set = (c, r, t) => world.setRaw(c, r, t);
  // cimientos
  for (let r = S; r <= S + 1; r++) {
    for (let c = 2; c <= 26; c++) set(c, r, T.CONCRETE);
    for (let c = 65; c <= 76; c++) set(c, r, T.CONCRETE);
  }
  // edificio sólido
  for (let c = 2; c <= 19; c++) for (let r = S - 12; r <= S - 1; r++) set(c, r, T.STRUCT);
  // departamento (interior) y puerta
  for (let c = 11; c <= 18; c++) for (let r = S - 11; r <= S - 7; r++) set(c, r, T.AIR);
  for (let r = S - 9; r <= S - 7; r++) set(19, r, T.AIR);
  // escalera: descanso + 5 escalones bajando hacia el patio
  for (let r = S - 6; r <= S - 1; r++) { set(20, r, T.STAIR); set(21, r, T.STAIR); }
  for (let i = 0; i < 5; i++) for (let r = S - 5 + i; r <= S - 1; r++) set(22 + i, r, T.STAIR);
  // taller: techo y pared derecha
  for (let c = 64; c <= 76; c++) set(c, S - 7, T.STRUCT);
  for (let r = S - 6; r <= S - 1; r++) set(76, r, T.STRUCT);
}

// ------------------------------------------------------------
//  Pintado
// ------------------------------------------------------------
function painter(x) {
  const R = (a, b, w, h, c) => { x.fillStyle = c; x.fillRect(a, b, w, h); };
  const P = (a, b, c) => R(a, b, 1, 1, c);
  return { R, P };
}

const WALL = '#efe9dc', WALL_SH = '#ddd5c5', WALL_HI = '#fbf8f1', LINE = '#8a8072', BAND = '#e6dfd1', BAND_SH = '#b9af9f';

function windowAt(x, a, b, w, h, opts = {}) {
  const { R, P } = painter(x);
  R(a - 1, b - 1, w + 2, h + 2, LINE);
  R(a, b, w, h, '#ffffff');
  const gx = a + 1, gy = b + 1, gw = w - 2, gh = h - 2;
  R(gx, gy, gw, gh, '#7fbfe4');
  R(gx, gy, gw, Math.ceil(gh / 3), '#a9dbf4');
  R(gx, gy + gh - Math.ceil(gh / 3), gw, Math.ceil(gh / 3), '#68a9d6');
  for (let k = 0; k < gh; k++) { // reflejos diagonales
    const px = gx + 2 + k, px2 = gx + 5 + k;
    if (px < gx + gw) P(px, gy + gh - 1 - k, '#e3f6fd');
    if (px2 < gx + gw) P(px2, gy + gh - 1 - k, '#cdeefb');
  }
  if (opts.persiana) {
    const ph = Math.floor(gh * opts.persiana);
    R(gx, gy, gw, ph, '#e2d8c6');
    for (let k = 1; k < ph; k += 2) R(gx, gy + k, gw, 1, '#c9bda8');
    R(gx, gy + ph - 1, gw, 1, '#a99f8f');
  }
  if (opts.curtain) {
    R(gx, gy, 3, gh, opts.curtain);
    R(gx + gw - 3, gy, 3, gh, opts.curtain);
    R(gx + 1, gy, 1, gh, 'rgba(255,255,255,0.35)');
    R(gx + gw - 2, gy, 1, gh, 'rgba(255,255,255,0.35)');
  }
  R(a + (w >> 1), b, 1, h, '#ffffff');
  R(a - 2, b + h + 1, w + 4, 2, '#d2c9b9');
  R(a - 2, b + h + 2, w + 4, 1, '#a99f8f');
}

function flowers(x, a, b, w, rnd, colors) {
  const { P } = painter(x);
  for (let i = 0; i < w; i++) {
    if (rnd() < 0.7) P(a + i, b + 1, rnd() < 0.5 ? '#3f8f3a' : '#5cb24f');
    if (rnd() < 0.45) P(a + i, b, colors[Math.floor(rnd() * colors.length)]);
  }
}

function paintComplex() {
  const [cv, x] = makeCanvas(200, 128);
  const { R, P } = painter(x);
  const rnd = mulberry32(1234);

  // ---------- Terraza ----------
  // antena de TV
  R(22, 3, 1, 25, '#6b6f78');
  R(16, 7, 13, 1, '#6b6f78'); R(18, 11, 9, 1, '#6b6f78'); R(19, 15, 7, 1, '#6b6f78');
  P(22, 2, '#ff5a5a');
  // tanque de agua
  R(100, 22, 2, 6, '#3d414b'); R(114, 22, 2, 6, '#3d414b'); R(98, 22, 20, 1, '#3d414b');
  R(98, 8, 20, 14, '#2a2c33'); R(99, 7, 18, 1, '#2a2c33'); R(97, 9, 1, 12, '#2a2c33'); R(118, 9, 1, 12, '#2a2c33');
  for (const yy of [11, 15, 19]) R(98, yy, 20, 1, '#3a3e48');
  R(100, 9, 2, 12, '#4f5562'); R(101, 9, 1, 12, '#5f6676');
  R(103, 5, 10, 2, '#3a3e48'); R(105, 4, 6, 1, '#4f5562');
  // plantas en macetas
  R(48, 22, 7, 6, '#c0663a'); R(48, 22, 7, 1, '#e08a5a'); R(49, 27, 5, 1, '#9c4f2c');
  for (let i = 0; i < 14; i++) P(47 + Math.floor(rnd() * 9), 14 + Math.floor(rnd() * 8), rnd() < 0.5 ? '#3f8f3a' : '#5cb24f');
  R(51, 15, 1, 7, '#2f6e2c');
  R(58, 24, 5, 4, '#c0663a'); R(58, 24, 5, 1, '#e08a5a');
  P(59, 21, '#ff6b8a'); P(61, 22, '#ffd34d'); P(60, 22, '#5cb24f'); P(59, 23, '#3f8f3a'); P(61, 23, '#3f8f3a');
  // parabólica
  R(130, 20, 8, 1, '#9aa3ad'); R(129, 19, 1, 3, '#9aa3ad'); R(131, 17, 6, 3, '#c3cad2'); R(132, 16, 4, 1, '#c3cad2');
  R(133, 21, 1, 7, '#6b6f78');
  // soga con ropa en la terraza
  pixelLine(x, 66, 18, 90, 20, '#6b6f78');
  R(66, 18, 1, 10, '#6b6f78'); R(90, 18, 1, 10, '#6b6f78');
  R(70, 19, 5, 5, '#7fd0ff'); R(78, 20, 4, 6, '#ffd34d'); R(84, 20, 4, 3, '#ff9fbf');

  // ---------- Cuerpo del edificio ----------
  R(0, 28, 144, 100, WALL);
  for (let i = 0; i < 260; i++) P(Math.floor(rnd() * 144), 28 + Math.floor(rnd() * 100), rnd() < 0.5 ? WALL_SH : WALL_HI);
  // parapeto
  R(0, 28, 144, 4, '#e4ddcf'); R(0, 28, 144, 1, WALL_HI); R(0, 31, 144, 1, BAND_SH);
  // losa del techo
  R(0, 32, 144, 6, BAND); R(0, 32, 144, 1, WALL_HI); R(0, 37, 144, 1, BAND_SH); R(0, 38, 144, 1, '#d7cfbf');
  // losa entre pisos
  R(0, 80, 144, 8, BAND); R(0, 80, 144, 1, WALL_HI); R(0, 87, 144, 1, BAND_SH);
  // zócalo
  R(0, 120, 144, 8, '#cfc6b6'); R(0, 120, 144, 1, '#e6dfd1'); R(0, 127, 144, 1, '#9d9485');
  for (let i = 4; i < 144; i += 12) R(i, 121, 1, 6, '#bdb3a2');
  // bordes
  R(0, 28, 1, 100, LINE); R(143, 28, 1, 100, LINE); R(1, 39, 2, 81, WALL_SH);

  // ---------- Primer piso, vecino de la izquierda ----------
  windowAt(x, 10, 46, 18, 18, { curtain: '#9fd18c' });
  R(5, 72, 28, 2, '#d2c9b9'); R(5, 74, 28, 1, '#a99f8f');
  R(5, 64, 28, 1, '#3a3f45'); R(5, 63, 28, 1, '#5b626b');
  for (let i = 5; i < 33; i += 2) R(i, 65, 1, 7, '#3a3f45');
  flowers(x, 6, 61, 8, rnd, ['#ff6b8a', '#ff9ad5']);
  flowers(x, 24, 61, 8, rnd, ['#ffd34d', '#ffffff']);
  windowAt(x, 41, 46, 16, 16, { persiana: 0.45 });
  R(39, 64, 20, 3, '#a0522d'); R(39, 64, 20, 1, '#c0703f');
  flowers(x, 40, 62, 18, rnd, ['#ff4d4d', '#ff8a3d', '#ffd34d']);
  // pilar que enmarca el departamento
  R(64, 39, 8, 41, WALL); R(70, 39, 2, 41, WALL_SH); R(71, 39, 1, 41, '#cfc6b6');

  // ---------- Departamento (interior visible) ----------
  paintApartment(x, rnd);

  // ---------- Planta baja ----------
  // puerta de entrada
  R(9, 92, 20, 3, '#5d6b78'); R(9, 92, 20, 1, '#8796a5'); R(10, 95, 18, 1, 'rgba(0,0,0,0.15)');
  R(11, 96, 16, 24, LINE);
  R(12, 97, 14, 23, '#8b5a36');
  R(14, 99, 4, 8, '#a06a41'); R(20, 99, 4, 8, '#a06a41');
  R(14, 110, 4, 8, '#a06a41'); R(20, 110, 4, 8, '#a06a41');
  R(14, 99, 4, 1, '#b97f52'); R(20, 99, 4, 1, '#b97f52');
  P(24, 108, '#e2b33c'); P(24, 109, '#9c6a12');
  // placa "PB"
  R(30, 99, 11, 9, '#ffffff'); R(30, 99, 11, 1, LINE); R(30, 107, 11, 1, LINE); R(30, 99, 1, 9, LINE); R(40, 99, 1, 9, LINE);
  drawText(x, 'PB', 32, 101, '#3d5c9c');
  windowAt(x, 47, 96, 16, 15, { curtain: '#ffd59e' });
  windowAt(x, 76, 96, 16, 15, {});
  windowAt(x, 104, 96, 16, 15, { persiana: 0.6 });
  // aire acondicionado
  R(126, 93, 13, 9, '#9aa3ad'); R(127, 94, 11, 7, '#d9dde1');
  for (let i = 128; i < 137; i += 2) R(i, 95, 1, 5, '#b3bac1');
  R(137, 102, 1, 6, '#9aa3ad');
  // planta grande en la entrada
  R(2, 112, 7, 8, '#c0663a'); R(2, 112, 7, 1, '#e08a5a');
  for (let i = 0; i < 24; i++) P(1 + Math.floor(rnd() * 9), 98 + Math.floor(rnd() * 14), rnd() < 0.5 ? '#3f8f3a' : '#2f6e2c');
  R(5, 100, 1, 12, '#2f6e2c');

  // ---------- Escalera ----------
  paintStairs(x);
  return cv;
}

function paintApartment(x, rnd) {
  const { R, P } = painter(x);
  // pared con empapelado
  R(72, 39, 64, 41, '#f6d9cb');
  for (let i = 74; i < 136; i += 4) R(i, 41, 1, 29, '#f0cbbb');
  R(72, 39, 64, 2, '#d9b3a3');
  R(72, 70, 64, 10, '#e7bfa9'); R(72, 70, 64, 1, '#fbe8de'); R(72, 71, 64, 1, '#c99c86');
  // guirnalda de lucecitas
  const bulbs = ['#ff6b8a', '#ffd34d', '#7fd0ff', '#9fe870', '#d9a6ff'];
  for (let i = 73; i < 135; i++) {
    const yy = 43 + Math.round(Math.sin((i - 73) / 62 * Math.PI * 3) * 1.5);
    P(i, yy, '#7a6a60');
    if (i % 6 === 0) { P(i, yy + 1, bulbs[(i / 6) % 5]); P(i, yy + 2, bulbs[(i / 6) % 5]); }
  }
  // piso de madera (arriba de la losa)
  R(72, 80, 72, 2, '#b07a4a'); R(72, 80, 72, 1, '#c99260');
  for (let i = 76; i < 144; i += 9) P(i, 81, '#8a5a36');
  // alfombra
  R(102, 80, 22, 2, '#6f9fd0'); R(102, 80, 22, 1, '#9cc4ea');
  // cama
  R(74, 59, 3, 21, '#8a5a36'); R(74, 59, 3, 1, '#a8703f'); R(73, 59, 1, 21, '#6b4429');
  R(76, 72, 22, 4, '#9b6a43'); R(76, 72, 22, 1, '#b07a4a');
  R(77, 76, 2, 4, '#6b4429'); R(95, 76, 2, 4, '#6b4429');
  R(76, 68, 22, 4, '#fbf3ea');
  R(77, 65, 7, 4, '#ffffff'); R(77, 68, 7, 1, '#e3dad2');
  P(79, 66, '#ff6b8a'); P(81, 66, '#ff6b8a'); R(79, 67, 3, 1, '#ff6b8a'); P(80, 68, '#ff6b8a');
  R(84, 66, 14, 6, '#f28fb0'); R(84, 66, 14, 1, '#ffb3cc'); R(84, 71, 14, 1, '#c96a8e');
  for (let i = 86; i < 98; i += 4) { P(i, 68, '#ffd1e1'); P(i + 2, 70, '#ffd1e1'); }
  R(97, 63, 2, 17, '#8a5a36'); R(97, 63, 2, 1, '#a8703f');
  // mesita de luz + velador
  R(101, 72, 7, 8, '#a8703f'); R(101, 72, 7, 1, '#c99260'); R(102, 75, 5, 1, '#8a5a36'); P(104, 77, '#e2b33c');
  R(103, 69, 3, 3, '#6b4429');
  R(101, 63, 7, 6, '#ffe08a'); R(101, 67, 7, 2, '#f2c14e'); R(102, 62, 5, 1, '#ffe08a');
  x.fillStyle = 'rgba(255,230,150,0.22)';
  x.beginPath(); x.arc(104.5, 66, 9, 0, Math.PI * 2); x.fill();
  // ventana con cortinas
  R(108, 46, 17, 17, '#8a5a36');
  R(109, 47, 15, 15, '#9ed6f5'); R(109, 55, 15, 7, '#bfe6fb');
  R(112, 50, 6, 2, '#ffffff'); R(111, 51, 9, 2, '#ffffff'); R(113, 49, 3, 1, '#ffffff');
  R(116, 47, 1, 15, '#8a5a36'); R(109, 54, 15, 1, '#8a5a36');
  R(106, 45, 21, 1, '#6b4429');
  R(107, 46, 3, 18, '#ff9fbf'); R(123, 46, 3, 18, '#ff9fbf');
  R(108, 46, 1, 18, '#ffc2d6'); R(124, 46, 1, 18, '#ffc2d6');
  R(107, 63, 19, 2, '#d2b39a');
  // cuadro con foto de los dos
  R(82, 47, 12, 10, '#8a5a36'); R(83, 48, 10, 8, '#fff4e0');
  R(85, 51, 2, 2, '#4a2c1a'); R(85, 53, 2, 2, '#3e9b6a');
  R(89, 51, 2, 2, '#8c3d24'); R(89, 53, 2, 2, '#f07aa6');
  P(87, 49, '#ff4d6d'); P(88, 49, '#ff4d6d'); P(87, 50, '#ff4d6d'); P(88, 50, '#ff4d6d');
  // mesa con mate y termo
  R(109, 72, 14, 2, '#9b6a43'); R(109, 72, 14, 1, '#b07a4a');
  R(110, 74, 1, 6, '#6b4429'); R(121, 74, 1, 6, '#6b4429');
  R(111, 68, 4, 4, '#7a4a26'); R(111, 68, 4, 1, '#c9b79c'); P(112, 69, '#9b6a43');
  pixelLine(x, 114, 65, 113, 68, '#d8dde3');
  R(117, 62, 3, 10, '#3e7d5a'); R(117, 62, 3, 2, '#2b2b2b'); R(118, 64, 1, 7, '#5fa57f');
  // planta (monstera)
  R(126, 73, 7, 7, '#c0663a'); R(126, 73, 7, 1, '#e08a5a');
  const leaf = [[124, 64], [128, 61], [131, 65], [126, 68], [130, 69]];
  for (const [lx, ly] of leaf) {
    R(lx, ly, 4, 3, '#3f9a3f'); P(lx + 1, ly, '#6cc05a'); P(lx + 2, ly + 2, '#2f6e2c');
  }
  R(129, 66, 1, 7, '#2f6e2c');
  // puerta abierta (hoja) + marco
  R(133, 55, 3, 25, '#8a5a36'); R(133, 55, 1, 25, '#a8703f'); P(134, 67, '#e2b33c');
  R(136, 39, 8, 16, WALL); R(143, 39, 1, 16, LINE);
  R(136, 55, 8, 1, LINE);
  R(136, 56, 8, 24, '#e9cdbd');
  // placa "1B"
  R(136, 46, 7, 7, '#ffffff'); R(136, 46, 7, 1, LINE); R(136, 52, 7, 1, LINE);
  drawText(x, '1B', 135, 47, '#c9578a');
}

function paintStairs(x) {
  const { R, P } = painter(x);
  const stone = '#d3ccc0', stoneSh = '#bdb5a8', tread = '#ece7de', edge = '#8a8072';
  const topAt = (xx) => (xx < 160 ? 80 : 88 + Math.floor((xx - 160) / 8) * 8);
  for (let xx = 144; xx < 200; xx++) {
    const top = topAt(xx);
    R(xx, top, 1, 128 - top, stone);
    if (xx >= 160) {
      const yy = 98 + (xx - 160);
      if (yy < 127) R(xx, yy, 1, 2, stoneSh);
    }
  }
  // huellas de los escalones
  R(144, 80, 16, 2, tread); R(144, 80, 16, 1, '#fbf8f1');
  for (let i = 0; i < 5; i++) {
    const sx = 160 + i * 8, ty = 88 + i * 8;
    R(sx, ty, 8, 2, tread); R(sx, ty, 8, 1, '#fbf8f1');
    R(sx, ty - 8, 1, 8, edge);
  }
  R(199, 120, 1, 8, edge);
  // puertita de depósito bajo el descanso
  R(147, 98, 10, 22, '#8a939b'); R(148, 99, 8, 21, '#b9c1c9'); R(148, 99, 8, 1, '#d6dce1'); P(155, 109, '#5b636d');
  // baranda
  const rail = '#2f3a35', railHi = '#5d6b64';
  R(144, 72, 17, 1, rail); R(144, 71, 17, 1, railHi);
  R(145, 72, 1, 8, rail); R(152, 72, 1, 8, rail);
  pixelLine(x, 160, 72, 199, 111, rail);
  pixelLine(x, 160, 71, 199, 110, railHi);
  for (let i = 0; i < 5; i++) R(163 + i * 8, 75 + i * 8, 1, 13, rail);
  for (let xx = 147; xx < 199; xx += 3) {
    if (xx === 152) continue;
    const top = xx < 160 ? 72 : 72 + (xx - 160);
    const bottom = topAt(xx);
    if (bottom - top > 2) R(xx, top + 1, 1, bottom - top - 1, 'rgba(47,58,53,0.55)');
  }
}

function paintShed() {
  const [cv, x] = makeCanvas(104, 72);
  const { R, P } = painter(x);
  // pared del fondo (tablones)
  for (let xx = 8; xx < 96; xx += 6) {
    R(xx, 24, 6, 48, (xx / 6) % 2 ? '#7d5233' : '#744c30');
    R(xx, 24, 1, 48, '#4e3020');
    P(xx + 2, 27, '#c9b79c'); P(xx + 2, 66, '#c9b79c');
  }
  R(8, 24, 88, 3, 'rgba(0,0,0,0.3)');
  // pared derecha de ladrillos
  R(96, 24, 8, 48, '#9e5340');
  for (let yy = 24; yy < 72; yy += 4) {
    R(96, yy, 8, 1, '#c98d78');
    P(96 + ((yy / 4) % 2 ? 2 : 6), yy + 1, '#c98d78'); P(96 + ((yy / 4) % 2 ? 2 : 6), yy + 2, '#c98d78');
  }
  R(103, 24, 1, 48, '#5a2f22');
  // techo de chapa
  for (let xx = 0; xx < 104; xx++) R(xx, 16, 1, 8, xx % 3 === 0 ? '#8b97a3' : xx % 3 === 1 ? '#aeb8c1' : '#c6cfd6');
  R(0, 16, 104, 1, '#dfe6eb'); R(0, 23, 104, 1, '#56606b');
  // poste delantero
  R(8, 24, 2, 48, '#5a3a24'); R(8, 24, 1, 48, '#7a5236');
  // cartel TALLER
  R(34, 13, 1, 3, '#4e2e1a'); R(70, 13, 1, 3, '#4e2e1a');
  R(26, 2, 52, 12, '#4e2e1a'); R(27, 3, 50, 10, '#7a4a2a'); R(27, 3, 50, 1, '#9b6a43');
  drawText(x, 'TALLER', 41, 6, '#ffe7b5', '#3a2117');
  P(29, 5, '#ffd34d'); P(74, 10, '#ffd34d');
  // tablero de herramientas
  R(28, 30, 40, 17, '#c49a6c'); R(28, 30, 40, 1, '#dbb488'); R(28, 46, 40, 1, '#8a6440');
  for (let yy = 32; yy < 46; yy += 3) for (let xx = 30; xx < 67; xx += 3) P(xx, yy, '#9c7650');
  // martillo
  R(32, 33, 1, 10, '#8a5a36'); R(30, 32, 5, 2, '#7d8796');
  // llave inglesa
  R(39, 34, 1, 9, '#9aa3ad'); R(38, 33, 3, 2, '#9aa3ad'); P(39, 33, '#c49a6c'); R(38, 42, 3, 2, '#9aa3ad');
  // serrucho
  R(45, 33, 3, 3, '#c9302c'); R(46, 36, 8, 4, '#c9d3dc'); for (let i = 46; i < 54; i += 2) P(i, 40, '#9aa3ad');
  // destornilladores
  R(58, 33, 2, 4, '#ffd34d'); R(58, 37, 1, 6, '#9aa3ad');
  R(62, 33, 2, 4, '#4fa3ff'); R(62, 37, 1, 6, '#9aa3ad');
  // farol colgante
  R(50, 24, 1, 4, '#3a3f45'); R(48, 28, 5, 5, '#3a3f45'); R(49, 29, 3, 3, '#ffe08a');
  x.fillStyle = 'rgba(255,220,140,0.18)';
  x.beginPath(); x.arc(50.5, 31, 12, 0, Math.PI * 2); x.fill();
  // banco de trabajo
  R(36, 56, 46, 3, '#a8743f'); R(36, 56, 46, 1, '#c99260'); R(36, 58, 46, 1, '#7a4a26');
  R(38, 59, 2, 13, '#6b4429'); R(78, 59, 2, 13, '#6b4429');
  R(40, 65, 38, 2, '#8a5a36');
  R(44, 61, 6, 4, '#c9a26b'); R(52, 62, 5, 3, '#b07a4a'); R(60, 61, 6, 4, '#c9a26b');
  R(73, 51, 6, 5, '#6b7280'); R(74, 50, 4, 1, '#9aa3ad'); R(78, 53, 3, 1, '#9aa3ad');
  // palas apoyadas (una de oro)
  pixelLine(x, 85, 34, 87, 63, '#8a5a36');
  R(85, 63, 4, 6, '#9aa3ad'); R(85, 63, 1, 6, '#c3cad2');
  pixelLine(x, 91, 32, 92, 63, '#8a5a36');
  R(90, 63, 4, 6, '#e6a92e'); R(90, 63, 1, 6, '#fff0a0');
  // jetpack en exhibición
  R(12, 46, 16, 2, '#6b4429');
  R(14, 34, 5, 12, '#c3cad4'); R(20, 34, 5, 12, '#c3cad4');
  R(14, 34, 1, 12, '#e8eef3'); R(20, 34, 1, 12, '#e8eef3');
  R(19, 37, 1, 6, '#4a5260'); P(16, 38, '#ff5a5a'); P(22, 38, '#ff5a5a');
  R(14, 33, 5, 1, '#8a94a3'); R(20, 33, 5, 1, '#8a94a3');
  // barril
  R(12, 58, 11, 14, '#7a4a2a'); R(13, 58, 2, 14, '#9b6a43');
  R(12, 60, 11, 1, '#3a3f45'); R(12, 68, 11, 1, '#3a3f45');
  // guirnalda de lamparitas bajo el techo
  for (let xx = 10; xx < 95; xx++) {
    const yy = 25 + Math.round(Math.sin((xx - 10) / 85 * Math.PI * 2) * 1);
    P(xx, yy, '#5a4a40');
    if (xx % 7 === 3) { P(xx, yy + 1, ['#ffd34d', '#ff6b8a', '#7fd0ff', '#9fe870'][(xx / 7 | 0) % 4]); }
  }
  // calendario con un corazón
  R(70, 29, 10, 11, '#ffffff'); R(70, 29, 10, 3, '#e04848'); R(74, 28, 2, 2, '#3a3f45');
  for (let yy = 33; yy < 39; yy += 2) for (let xx = 71; xx < 79; xx += 2) P(xx, yy, '#b9b0a5');
  P(75, 35, '#ff4d6d'); P(77, 35, '#ff4d6d'); R(75, 36, 3, 1, '#ff4d6d'); P(76, 37, '#ff4d6d');
  // estante con latas de pintura
  R(68, 48, 14, 2, '#6b4429'); R(68, 48, 14, 1, '#8a5a36');
  R(69, 43, 4, 5, '#4fa3ff'); R(69, 43, 4, 1, '#9aa3ad'); R(70, 45, 2, 2, '#ffffff');
  R(74, 44, 3, 4, '#ff6b8a'); R(74, 44, 3, 1, '#9aa3ad');
  R(78, 42, 3, 6, '#ffd34d'); R(78, 42, 3, 1, '#9aa3ad');
  // radio en el banco
  R(62, 51, 8, 5, '#c0392b'); R(63, 52, 3, 3, '#3a3f45'); P(67, 52, '#ffd34d'); P(68, 52, '#ffd34d'); R(67, 54, 2, 1, '#ffffff');
  R(64, 49, 1, 2, '#9aa3ad');
  // plantita sobre el barril
  R(15, 54, 4, 4, '#c0663a'); P(15, 51, '#5cb24f'); P(17, 50, '#3f9a3f'); P(18, 52, '#5cb24f'); P(16, 52, '#3f9a3f'); P(17, 53, '#2f6e2c');
  // cajas
  R(24, 62, 10, 10, '#b98b54'); R(24, 62, 10, 1, '#d6a96c'); R(24, 66, 10, 1, '#8a6440'); R(28, 62, 1, 10, '#8a6440');
  return cv;
}

function paintBrickWall(w, h) {
  const [cv, x] = makeCanvas(w, h);
  const { R, P } = painter(x);
  const rnd = mulberry32(77);
  const top = 8;
  R(0, top, w, h - top, '#d8b19c');
  for (let row = 0; top + 3 + row * 4 < h; row++) {
    const yy = top + 3 + row * 4;
    for (let xx = (row % 2) * -4; xx < w; xx += 8) {
      const cols = ['#b4634a', '#a65a42', '#bf6d52', '#ad5f47'];
      R(xx, yy, 7, 3, cols[Math.floor(rnd() * cols.length)]);
      P(xx, yy, '#c97a5e');
    }
  }
  R(0, top, w, 3, '#cfc6b6'); R(0, top, w, 1, '#ece6da'); R(0, top + 3, w, 1, '#8f877b');
  // enredadera
  for (let k = 0; k < 9; k++) {
    const cx = Math.floor(rnd() * w), len = 6 + Math.floor(rnd() * 16);
    for (let j = 0; j < len; j++) {
      const xx = cx + Math.round(Math.sin(j * 0.7 + k) * 2);
      P(xx, top + j, '#2f6e2c');
      if (rnd() < 0.7) P(xx + (rnd() < 0.5 ? -1 : 1), top + j, rnd() < 0.5 ? '#3f8f3a' : '#5cb24f');
    }
    for (let j = 0; j < 8; j++) P(cx - 4 + Math.floor(rnd() * 9), top - 2 + Math.floor(rnd() * 4), rnd() < 0.5 ? '#3f8f3a' : '#5cb24f');
  }
  x.fillStyle = 'rgba(70,80,130,0.13)';
  x.fillRect(0, 0, w, h);
  return cv;
}

function paintTree() {
  const [cv, x] = makeCanvas(56, 72);
  const { R, P } = painter(x);
  const rnd = mulberry32(31);
  // tronco
  R(25, 36, 6, 36, '#6b4429'); R(25, 36, 2, 36, '#8a5a36'); R(30, 36, 1, 36, '#4e3020');
  R(21, 66, 14, 6, '#6b4429'); R(20, 70, 16, 2, '#4e3020');
  pixelLine(x, 27, 44, 16, 30, '#6b4429'); pixelLine(x, 29, 40, 40, 26, '#6b4429');
  // copa
  const blobs = [[28, 22, 18], [16, 26, 12], [40, 26, 12], [22, 12, 11], [36, 13, 11], [28, 32, 12]];
  const greens = ['#2f7d32', '#3f9a3f', '#4fae47', '#2a6b2c'];
  for (const [cx, cy, r] of blobs) {
    for (let yy = -r; yy <= r; yy++) for (let xx = -r; xx <= r; xx++) {
      if (xx * xx + yy * yy > r * r) continue;
      const shadeIdx = yy > r * 0.4 ? 3 : yy < -r * 0.4 ? 2 : rnd() < 0.5 ? 0 : 1;
      P(cx + xx, cy + yy, greens[shadeIdx]);
    }
  }
  for (let i = 0; i < 70; i++) P(6 + Math.floor(rnd() * 44), 2 + Math.floor(rnd() * 40), rnd() < 0.5 ? '#6cc05a' : '#2a6b2c');
  // limones
  const lemons = [[14, 24], [24, 30], [37, 20], [42, 30], [30, 12], [20, 16], [33, 34]];
  for (const [lx, ly] of lemons) { R(lx, ly, 3, 2, '#ffe14d'); P(lx, ly, '#fff59d'); P(lx + 2, ly + 1, '#d4b21f'); }
  return cv;
}

function paintHedge(w, h, seed) {
  const [cv, x] = makeCanvas(w, h);
  const { P } = painter(x);
  const rnd = mulberry32(seed);
  for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) {
    const edge = yy < 4 && rnd() < 0.5;
    if (edge) continue;
    const q = rnd();
    P(xx, yy, q < 0.3 ? '#2a6b2c' : q < 0.65 ? '#3f8f3a' : q < 0.9 ? '#4fae47' : '#6cc05a');
  }
  return cv;
}

function paintFence(w, h) {
  const [cv, x] = makeCanvas(w, h);
  const { R, P } = painter(x);
  R(0, 8, w, 2, '#e9e3d6'); R(0, 16, w, 2, '#e9e3d6');
  for (let xx = 0; xx < w; xx += 4) {
    R(xx, 2, 3, h - 2, '#ffffff'); P(xx + 1, 1, '#ffffff'); R(xx + 2, 3, 1, h - 3, '#d6cfc2');
  }
  for (let xx = 0; xx < w; xx += 3) { P(xx, h - 1, '#5cb24f'); P(xx + 1, h - 2, '#7cd65a'); }
  return cv;
}

const CLOTHES = {
  shirt: [['gg.gg', 'ggggg', '.ggg.', '.ggg.'], { g: '#3e9b6a' }],
  dress: [['.pp.', 'pppp', '.pp.', 'pppp', 'pppppp'.slice(0, 4)], { p: '#f07aa6' }],
  sock: [['w.', 'w.', 'ww'], { w: '#ffffff' }],
  towel: [['yyyy', 'yryy', 'yyyy', 'yyyy', 'yyyy'], { y: '#ffd34d', r: '#ff4d6d' }],
  pants: [['bbbb', 'bbbb', 'b..b', 'b..b'], { b: '#3d5c9c' }],
};

export class Structures {
  constructor() {
    this.complex = paintComplex();
    this.shed = paintShed();
    this.brick = paintBrickWall(304, 40);
    this.tree = paintTree();
    this.hedgeL = paintHedge(16, 60, 5);
    this.fenceR = paintFence(16, 24);
    this.clothes = Object.fromEntries(Object.entries(CLOTHES).map(([k, [m, p]]) => [k, mapSprite(m, p)]));
  }

  /** Fondo del patio (pared, árbol, tendedero) — va detrás de todo */
  drawBackdrop(ctx, camX, camY, t) {
    const gy = S * TILE - camY;
    ctx.drawImage(this.brick, 216 - camX, gy - 40);
    ctx.drawImage(this.hedgeL, 0 - camX, gy - 60);
    ctx.drawImage(this.fenceR, 77 * TILE - camX, gy - 24);
    ctx.drawImage(this.tree, 30 * TILE - camX, gy - 72);
    // tendedero
    const p1 = 45 * TILE - camX, p2 = 56 * TILE - camX, top = gy - 30;
    ctx.fillStyle = '#6b6f78';
    ctx.fillRect(p1, top, 1, 30); ctx.fillRect(p2, top, 1, 30);
    ctx.fillRect(p1 - 2, top, 5, 1); ctx.fillRect(p2 - 2, top, 5, 1);
    const sag = (u) => top + 1 + Math.round(Math.sin(u * Math.PI) * 4);
    ctx.fillStyle = '#d9dde1';
    for (let xx = p1; xx <= p2; xx++) ctx.fillRect(xx, sag((xx - p1) / (p2 - p1)), 1, 1);
    const items = [['shirt', 0.14], ['dress', 0.32], ['sock', 0.47], ['sock', 0.53], ['towel', 0.68], ['pants', 0.86]];
    items.forEach(([k, u], i) => {
      const spr = this.clothes[k];
      const xx = Math.round(p1 + (p2 - p1) * u - spr.width / 2 + Math.sin(t * 1.7 + i) * 0.8);
      ctx.drawImage(spr, xx, sag(u) + 1);
    });
  }

  drawBuildings(ctx, camX, camY) {
    ctx.drawImage(this.complex, 2 * TILE - camX, (S - 16) * TILE - camY);
    ctx.drawImage(this.shed, 64 * TILE - camX, (S - 9) * TILE - camY);
  }
}

export function inZone(z, x, y) {
  return x >= z.x0 && x <= z.x1 && y >= z.y0 && y <= z.y1;
}
