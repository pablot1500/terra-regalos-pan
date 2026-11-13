// Edificio, escalera, departamento, casa rodante del taller y decoración del patio.
import { SURFACE, TILE } from './config.js';
import { T } from './tiles.js';
import { makeCanvas, mapSprite, pixelLine } from './util.js';
import { mulberry32 } from './rng.js';
import { drawText, getCharFrames } from './sprites.js';

const S = SURFACE;

// Zonas en píxeles de mundo
export const HOME_ZONE = { x0: 11 * TILE, x1: 19 * TILE, y0: (S - 11) * TILE, y1: (S - 6) * TILE }; // departamento 1B, en el primer piso
export const TRAILER_X = 62 * TILE + 4; // casa rodante del taller (se compra por la ventanita)
export const SHOP_ZONE = { x0: TRAILER_X + 8, x1: TRAILER_X + 56, y0: (S - 4) * TILE, y1: S * TILE };
export const SPAWN = { x: 14 * TILE + 1, y: (S - 6) * TILE - 15 };
export const GATE_X = 75 * TILE + 4;   // portón a la calle, al fondo del patio
export const PATIO = { c0: 27, c1: 64 };
export const DIG_ZONE = { c0: 41, c1: 50 }; // cantero del medio: lo único que se puede cavar desde arriba
export const DOG_POS = { x: 54 * TILE, y: S * TILE - 14 }; // Popi espera en el patio, a la derecha del cantero
export const GOL_X = 51 * TILE + 4;     // el Gol gris, justo a la derecha del cantero (Popi viene escondido adentro)
export const GOL_H = 34;
export const SEDAN_X = 34 * TILE - 2;   // el sedán rojo, entre el arbolito y el cantero (el cantero queda libre)
export const TREE_X = 27 * TILE;      // el arbolito, al pie de la escalera
export const GOL_DOOR = { x0: 30, x1: 43, y0: 5, y1: 23 }; // puerta de adelante del Gol (en el dibujo)

export function placeStructures(world) {
  const set = (c, r, t) => world.setRaw(c, r, t);
  // cimientos
  for (let r = S; r <= S + 1; r++) {
    for (let c = 2; c <= 26; c++) set(c, r, T.CONCRETE);
    for (let c = 65; c <= 76; c++) set(c, r, T.CONCRETE);
  }
  // cantero: los primeros bloques son grava (solo estético, se cava igual que la tierra)
  for (let c = DIG_ZONE.c0; c <= DIG_ZONE.c1; c++) for (let r = S; r <= S + 3; r++) set(c, r, T.GRAVEL);
  // patio: baldosas en todo menos el cantero del medio
  for (let c = PATIO.c0; c <= PATIO.c1; c++) {
    if (c >= DIG_ZONE.c0 && c <= DIG_ZONE.c1) continue;
    set(c, S, T.PAVER);
    set(c, S + 1, T.CONCRETE);
  }
  // edificio sólido
  for (let c = 2; c <= 19; c++) for (let r = S - 12; r <= S - 1; r++) set(c, r, T.STRUCT);
  // departamento 1B del primer piso (interior) y su puerta al descanso
  for (let c = 11; c <= 18; c++) for (let r = S - 11; r <= S - 7; r++) set(c, r, T.AIR);
  for (let r = S - 9; r <= S - 7; r++) set(19, r, T.AIR);
  // escalera: descanso + 5 escalones bajando hacia el patio
  for (let r = S - 6; r <= S - 1; r++) { set(20, r, T.STAIR); set(21, r, T.STAIR); }
  for (let i = 0; i < 5; i++) for (let r = S - 5 + i; r <= S - 1; r++) set(22 + i, r, T.STAIR);
  // pared invisible junto a la cerca del fondo (la casa rodante no es sólida)
  for (let r = S - 14; r <= S - 1; r++) set(77, r, T.STRUCT);
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

  // ---------- Departamento 1B (interior visible) ----------
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

// Casa rodante vintage estacionada al fondo del patio: no se entra, se compra por la ventanita.
// Lienzo de 100x64; el piso es la fila 64.
export const TRAILER_W = 100, TRAILER_H = 64;
export const TR_WIN = { x0: 16, x1: 48, y0: 19, y1: 40 }; // ventanita-mostrador
const TR_WHEEL = { x: 60, y: 56, r: 8 };
function paintTrailer() {
  const [cv, x] = makeCanvas(TRAILER_W, TRAILER_H);
  const { R, P } = painter(x);
  const rnd = mulberry32(404);
  const L = 4, Rt = 88, Top = 10, Bot = 54;
  // silueta: atrás redondeada, adelante con la esquina de arriba cortada en diagonal
  const body = (xx, yy) => {
    if (xx < L || xx > Rt || yy < Top || yy > Bot) return false;
    const corner = (cx, cy, r) => (xx - cx) ** 2 + (yy - cy) ** 2 <= r * r;
    if (xx < L + 11 && yy < Top + 11 && !corner(L + 11, Top + 11, 11)) return false;
    if (xx < L + 7 && yy > Bot - 7 && !corner(L + 7, Bot - 7, 7)) return false;
    if (xx > Rt - 4 && yy > Bot - 4 && !corner(Rt - 4, Bot - 4, 4)) return false;
    if (xx > Rt - 15 && yy < Top + (xx - (Rt - 15))) return false;
    // hueco del guardabarros
    if ((xx - TR_WHEEL.x) ** 2 + (yy - TR_WHEEL.y) ** 2 < 10 * 10) return false;
    return true;
  };
  // sombra en el piso
  x.fillStyle = 'rgba(0,0,0,0.18)';
  x.fillRect(L + 4, 62, Rt - L + 4, 2); x.fillRect(L + 8, 61, Rt - L - 6, 1);
  // lanza de enganche con la ruedita de apoyo
  pixelLine(x, Rt - 2, 50, 98, 56, '#26262b'); pixelLine(x, Rt - 2, 51, 98, 57, '#3a3f45');
  R(94, 55, 2, 7, '#3a3f45'); R(92, 62, 6, 2, '#26262b'); P(94, 55, '#6b7280');
  for (let yy = 0; yy < TRAILER_H; yy++) for (let xx = 0; xx < TRAILER_W; xx++) {
    if (!body(xx, yy)) continue;
    const edge = !body(xx - 1, yy) || !body(xx + 1, yy) || !body(xx, yy - 1) || !body(xx, yy + 1);
    let col;
    if (edge) col = '#5b636d';
    else if (!body(xx - 2, yy) || !body(xx + 2, yy) || !body(xx, yy - 2)) col = '#c9d1d8'; // moldura de aluminio
    else {
      col = (yy - Top) % 3 === 0 ? '#e4e0d7' : '#f4f1ea';     // chapa acanalada
      if (yy > Bot - 4) col = (yy - Top) % 3 === 0 ? '#d2cdc2' : '#e2ddd3';
    }
    P(xx, yy, col);
  }
  const inBody = (xx, yy) => body(xx, yy) && body(xx - 2, yy) && body(xx + 2, yy) && body(xx, yy - 2) && body(xx, yy + 2);
  const band = (y0, h, cols, x0 = L, x1 = Rt) => {
    for (let yy = y0; yy < y0 + h; yy++) for (let xx = x0; xx <= x1; xx++) if (inBody(xx, yy)) P(xx, yy, cols[(yy - y0) % cols.length]);
  };
  // molduras horizontales
  band(25, 1, ['#aab3bc']); band(26, 1, ['#e9edf0']);
  band(33, 1, ['#aab3bc']); band(34, 1, ['#e9edf0']);
  // franjas grises con la "ola" retro y franja celeste abajo
  for (let k = 0; k < 2; k++) {
    const y0 = 38 + k * 3;
    for (let xx = L; xx <= 70; xx++) {
      const tip = xx > 58 ? xx - 58 : 0; // la punta sube como en la foto
      for (let yy = y0 - Math.floor(tip / 2); yy < y0 + 2 - Math.floor(tip / 2); yy++) if (inBody(xx, yy) && tip < 10) P(xx, yy, '#a7a8ab');
    }
  }
  band(45, 5, ['#56b6dc', '#6cc3e6', '#56b6dc', '#4aa6cc', '#56b6dc']);
  band(50, 1, ['#f4f1ea']); band(51, 1, ['#4aa6cc']);
  // luces traseras (rojas arriba, ojo de buey naranja y faros abajo)
  for (const [lx, ly] of [[9, 15], [7, 19], [6, 23]]) { R(lx, ly, 2, 2, '#d9344e'); P(lx, ly, '#ff8a8a'); }
  R(6, 41, 3, 4, '#3a3f45'); R(7, 42, 2, 2, '#ff5a3d'); P(7, 42, '#ffb08a');
  R(10, 47, 3, 3, '#ff8a2e'); P(10, 47, '#ffd0a0');
  R(84, 44, 2, 2, '#ff8a2e'); P(84, 44, '#ffd0a0');
  // puerta con marco de aluminio y manija
  const dx0 = 62, dx1 = 74, dy0 = 15, dy1 = 52;
  for (let yy = dy0; yy <= dy1; yy++) for (let xx = dx0; xx <= dx1; xx++) {
    const onFrame = xx === dx0 || xx === dx1 || yy === dy0 || yy === dy1;
    const cornerCut = (xx === dx0 || xx === dx1) && (yy === dy0 || yy === dy1);
    if (onFrame && !cornerCut && inBody(xx, yy)) P(xx, yy, xx === dx0 || yy === dy0 ? '#e9edf0' : '#8a94a3');
  }
  R(dx0 + 2, 33, 3, 3, '#1d1d22'); P(dx0 + 3, 34, '#6b7280');
  // ventanita de adelante con cortinas
  R(77, 23, 8, 8, '#8a94a3'); R(78, 24, 6, 6, '#9fc7de'); R(78, 24, 2, 6, '#e9dcc0'); R(82, 24, 2, 6, '#e9dcc0'); R(78, 24, 6, 1, '#cbbd9e');
  // ---------- ventanita-mostrador ----------
  const { x0, x1, y0, y1 } = TR_WIN;
  R(x0 - 1, y0 - 1, x1 - x0 + 3, y1 - y0 + 3, '#8a94a3');
  R(x0, y0, x1 - x0 + 1, y1 - y0 + 1, '#4a2f22');
  // luz cálida adentro
  for (let yy = y0; yy <= y1; yy++) {
    const k = (yy - y0) / (y1 - y0);
    x.fillStyle = `rgba(255,200,120,${0.22 - k * 0.14})`;
    x.fillRect(x0, yy, x1 - x0 + 1, 1);
  }
  // estante del fondo con herramientas
  R(x0 + 1, y0 + 9, x1 - x0 - 1, 1, '#7a4a2a'); R(x0 + 1, y0 + 10, x1 - x0 - 1, 1, '#3a2117');
  R(x0 + 3, y0 + 5, 3, 4, '#4fa3ff'); R(x0 + 3, y0 + 5, 3, 1, '#9aa3ad');      // latas de pintura
  R(x0 + 7, y0 + 6, 3, 3, '#ff6b8a'); R(x0 + 7, y0 + 6, 3, 1, '#9aa3ad');
  R(x0 + 12, y0 + 3, 2, 6, '#c3cad4'); R(x0 + 15, y0 + 3, 2, 6, '#c3cad4');    // jetpack en exhibición
  R(x0 + 14, y0 + 4, 1, 4, '#4a5260'); P(x0 + 12, y0 + 3, '#e8eef3'); P(x0 + 15, y0 + 3, '#e8eef3'); P(x0 + 13, y0 + 5, '#ff5a5a'); P(x0 + 16, y0 + 5, '#ff5a5a');
  R(x0 + 20, y0 + 7, 4, 2, '#f2c14e'); R(x0 + 23, y0 + 6, 2, 1, '#7d8796');    // taladro
  R(x0 + 27, y0 + 5, 3, 4, '#ffd34d'); R(x0 + 27, y0 + 5, 3, 1, '#9aa3ad');
  // palas colgadas y farolito
  pixelLine(x, x0 + 22, y0 + 1, x0 + 21, y0 + 4, '#8a5a36'); R(x0 + 20, y0 + 1, 3, 1, '#3a2117');
  R(x0 + 6, y0, 1, 2, '#3a3f45'); R(x0 + 5, y0 + 2, 3, 2, '#ffe08a');
  x.fillStyle = 'rgba(255,224,140,0.25)';
  x.beginPath(); x.arc(x0 + 6.5, y0 + 3, 6, 0, Math.PI * 2); x.fill();
  // mercadería sobre el mostrador (va en una capa aparte, por delante de Carlos)
  const goods = (gx) => {
    const G = painter(gx).R, GP = painter(gx).P;
    G(x0 + 1, y1 - 4, 4, 4, '#b98b54'); G(x0 + 1, y1 - 4, 4, 1, '#d6a96c'); G(x0 + 3, y1 - 4, 1, 4, '#8a6440');
    G(x0 + 6, y1 - 3, 2, 3, '#3a3f45'); G(x0 + 6, y1 - 5, 2, 2, '#ff9a3d'); GP(x0 + 6, y1 - 6, '#fff3a8'); // antorchas
    G(x0 + 9, y1 - 3, 2, 3, '#3a3f45'); G(x0 + 9, y1 - 5, 2, 2, '#ff9a3d');
    G(x1 - 9, y1 - 4, 5, 4, '#7a4a26'); G(x1 - 9, y1 - 4, 5, 1, '#c9b79c'); pixelLine(gx, x1 - 5, y1 - 7, x1 - 6, y1 - 4, '#d8dde3'); // mate
    G(x1 - 3, y1 - 8, 2, 8, '#3e7d5a'); G(x1 - 3, y1 - 8, 2, 1, '#2b2b2b');        // termo
  };
  goods(x);
  const [front, fx] = makeCanvas(TRAILER_W, TRAILER_H);
  goods(fx);
  cv.front = front;
  // mostrador de madera que sobresale
  R(x0 - 3, y1 + 1, x1 - x0 + 7, 2, '#a8743f'); R(x0 - 3, y1 + 1, x1 - x0 + 7, 1, '#c99260'); R(x0 - 3, y1 + 3, x1 - x0 + 7, 1, '#6b4429');
  R(x0, y1 + 4, 1, 3, '#6b4429'); R(x1, y1 + 4, 1, 3, '#6b4429');
  // toldo a rayas celeste y blanco con borde festoneado
  const aw0 = x0 - 4, aw1 = x1 + 4, ay = y0 - 7;
  for (let xx = aw0; xx <= aw1; xx++) {
    const blue = Math.floor((xx - aw0) / 4) % 2 === 0;
    const h = 5 + (((xx - aw0) % 4 === 1 || (xx - aw0) % 4 === 2) ? 1 : 0);
    R(xx, ay + 1, 1, h, blue ? '#56b6dc' : '#fbf8f1');
    P(xx, ay + h, blue ? '#3d8fb3' : '#d9d4c8');
  }
  R(aw0 - 1, ay, aw1 - aw0 + 3, 1, '#3d8fb3'); R(aw0, ay - 1, aw1 - aw0 + 1, 1, '#2b6a86');
  R(x0, ay + 7, x1 - x0 + 1, 1, 'rgba(0,0,0,0.18)');
  // guirnalda de lamparitas colgando del toldo
  const bulbs = ['#ffd34d', '#ff6b8a', '#7fd0ff', '#9fe870'];
  for (let i = 0; i <= 8; i++) {
    const bx = aw0 + 1 + i * 5, by = ay + 7 + (i % 2);
    P(bx, by, '#5a4a40'); P(bx, by + 1, bulbs[i % 4]);
  }
  // cartel "TALLER" en el techo
  R(30, 1, 1, 9, '#4e2e1a'); R(54, 1, 1, 9, '#4e2e1a');
  R(25, 0, 35, 9, '#4e2e1a'); R(26, 1, 33, 7, '#7a4a2a'); R(26, 1, 33, 1, '#9b6a43');
  drawText(x, 'TALLER', 31, 2, '#ffe7b5', '#3a2117');
  P(27, 2, '#ffd34d'); P(57, 6, '#ffd34d');
  // rueda con llanta negra
  const { x: wx, y: wy, r } = TR_WHEEL;
  for (let yy = -r; yy <= r; yy++) for (let xx = -r; xx <= r; xx++) {
    const d = xx * xx + yy * yy;
    if (d > r * r || wy + yy >= TRAILER_H) continue;
    P(wx + xx, wy + yy, d > (r - 2) ** 2 ? '#1d1d22' : d > (r - 4) ** 2 ? '#2e2f35' : d > 2 ? '#26262b' : '#8a94a3');
  }
  P(wx - 4, wy - 5, '#4a4d55'); P(wx - 5, wy - 4, '#4a4d55');
  // suciedad de ruta
  for (let i = 0; i < 18; i++) {
    const xx = L + 4 + Math.floor(rnd() * (Rt - L - 8)), yy = Bot - 2 - Math.floor(rnd() * 3);
    if (inBody(xx, yy)) P(xx, yy, '#cfc8b8');
  }
  return cv;
}

function paintBrickWall(w, h) {
  // medianera de ladrillos pintados de blanco
  const [cv, x] = makeCanvas(w, h);
  const { R, P } = painter(x);
  const rnd = mulberry32(77);
  const top = 8;
  R(0, top, w, h - top, '#cfc8bd');
  for (let row = 0; top + 3 + row * 4 < h; row++) {
    const yy = top + 3 + row * 4;
    for (let xx = (row % 2) * -4; xx < w; xx += 8) {
      const cols = ['#f4f1ea', '#efebe3', '#f8f6f1', '#ebe6dc'];
      R(xx, yy, 7, 3, cols[Math.floor(rnd() * cols.length)]);
      P(xx, yy, '#ffffff');
      if (rnd() < 0.08) P(xx + 2 + Math.floor(rnd() * 4), yy + 1 + Math.floor(rnd() * 2), '#d8d0c4');
    }
  }
  // pintura gastada: algún ladrillo pelado
  for (let k = 0; k < 7; k++) {
    const xx = Math.floor(rnd() * (w - 8)), yy = top + 7 + Math.floor(rnd() * 6) * 4;
    R(xx, yy, 5, 2, '#c98d78'); P(xx + 5, yy, '#e8d8cf');
  }
  R(0, top, w, 3, '#e2ddd3'); R(0, top, w, 1, '#ffffff'); R(0, top + 3, w, 1, '#a9a197');
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
  x.globalCompositeOperation = 'source-atop';
  x.fillStyle = 'rgba(90,100,140,0.08)';
  x.fillRect(0, 0, w, h);
  x.globalCompositeOperation = 'source-over';
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

// Volkswagen Gol Trend gris estacionado (de costado, mirando a la derecha). Popi viene escondido adentro.
// Más grande que los personajes, como un auto de verdad al lado de ellos.
function paintGol() {
  const W = 62, H = 34;
  const [cv, x] = makeCanvas(W, H);
  const { R, P } = painter(x);
  const body = '#666b72', bodyD = '#4b4f55', bodyH = '#8c9299', edge = '#2e3136';
  const glass = '#262c35', glassH = '#56657a', black = '#1c1d21', trim = '#2a2c31', chrome = '#c3cad2';
  const WHEELS = [13, 48], WY = 27;
  // sombra en el piso
  x.fillStyle = 'rgba(0,0,0,0.22)'; x.fillRect(3, H - 1, W - 6, 1); x.fillRect(6, H - 2, W - 12, 1);
  // carrocería de hatchback: cola corta y redonda, techo largo, parabrisas inclinado y trompa baja
  const outline = [[2, 27], [1, 19], [2, 12], [5, 6], [10, 3], [34, 3], [37, 4], [46, 13], [55, 15], [59, 17], [60, 21], [60, 27]];
  fillPoly(x, outline, edge);
  fillPoly(x, [[3, 26], [2, 19], [3, 12], [6, 7], [11, 4], [34, 4], [36, 5], [45, 14], [55, 16], [58, 18], [59, 21], [59, 26]], body);
  // reflejo en la línea de cintura y la parte de abajo más oscura
  R(3, 14, 55, 1, bodyH); R(3, 23, 56, 4, bodyD);
  // vidrios polarizados: ventanilla de atrás, puerta de atrás y puerta de adelante
  fillPoly(x, [[6, 13], [9, 8], [12, 6], [17, 6], [17, 13]], glass);
  fillPoly(x, [[19, 13], [19, 6], [28, 6], [28, 13]], glass);
  fillPoly(x, [[30, 13], [30, 6], [35, 6], [42, 13]], glass);
  P(11, 8, glassH); P(10, 9, glassH); P(21, 7, glassH); P(22, 8, glassH); P(32, 7, glassH); P(33, 8, glassH);
  // puertas, manijas y espejo
  R(18, 14, 1, 10, bodyD); R(29, 6, 1, 18, bodyD); R(43, 14, 1, 9, bodyD);
  R(24, 16, 3, 1, trim); R(38, 16, 3, 1, trim);
  R(42, 11, 3, 2, body); P(42, 11, edge); P(44, 12, edge);
  // faro, giros, luces de atrás y paragolpes negros
  R(54, 16, 4, 3, '#fff3a8'); P(55, 16, '#ffffff'); P(57, 19, '#ffa13d');
  R(2, 12, 2, 6, '#c83a3a'); P(2, 12, '#ff7a7a'); P(3, 18, '#ffa13d');
  R(52, 23, 8, 2, trim); R(2, 23, 4, 2, trim);
  R(56, 20, 3, 2, black); P(57, 20, chrome); // parrilla con el logo
  R(58, 22, 2, 1, '#ffffff'); // patente
  // pasarruedas y ruedas con llantas de aleación
  for (const cx of WHEELS) {
    for (let j = -7; j <= 0; j++) { const w = Math.round(Math.sqrt(50 - j * j)); R(cx - w, WY + j, w * 2 + 1, 1, edge); }
    for (let j = -6; j <= 6; j++) { const w = Math.round(Math.sqrt(36.5 - j * j)); R(cx - w, WY + j, w * 2 + 1, 1, black); }
    for (let j = -4; j <= 4; j++) { const w = Math.round(Math.sqrt(16.5 - j * j)); R(cx - w, WY + j, w * 2 + 1, 1, chrome); }
    for (const [dx, dy] of [[0, -3], [-3, -1], [3, -1], [-2, 3], [2, 3]]) P(cx + dx, WY + dy, '#5b636d');
    P(cx - 1, WY - 3, '#eef2f5'); R(cx - 1, WY - 1, 3, 3, '#7d8796'); P(cx, WY, '#3a3e44');
  }
  return cv;
}

/** relleno de un polígono de a pixel (sin bordes borrosos) */
function fillPoly(x, pts, col) {
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  x.fillStyle = col;
  for (let py = Math.floor(Math.min(...ys)); py <= Math.ceil(Math.max(...ys)); py++) {
    for (let px = Math.floor(Math.min(...xs)); px <= Math.ceil(Math.max(...xs)); px++) {
      let inside = false;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const [xi, yi] = pts[i], [xj, yj] = pts[j];
        if ((yi > py + 0.5) !== (yj > py + 0.5) && px + 0.5 < (xj - xi) * (py + 0.5 - yi) / (yj - yi) + xi) inside = !inside;
      }
      if (inside) x.fillRect(px, py, 1, 1);
    }
  }
}

// Sedán rojo estacionado, visto de frente y en diagonal hacia la derecha (donde estaba el tender)
function paintSedan() {
  const W = 50, H = 30;
  const [cv, x] = makeCanvas(W, H);
  const { R, P } = painter(x);
  const body = '#c8463c', bodyD = '#9a2f2a', bodyH = '#e8766a', edge = '#4a1614';
  const glass = '#2a3340', glassH = '#6f86a3', black = '#1c1d21', trim = '#2a2c31', chrome = '#c3cad2';
  // sombra en el piso
  x.fillStyle = 'rgba(0,0,0,0.22)'; x.fillRect(3, H - 2, W - 5, 2);
  // costado (se aleja hacia la izquierda: la cola queda más chica)
  fillPoly(x, [[1, 15], [30, 12], [30, 26], [2, 24]], edge);
  fillPoly(x, [[2, 16], [29, 13], [29, 25], [3, 23]], body);
  fillPoly(x, [[3, 21], [29, 21], [29, 25], [3, 23]], bodyD);
  // frente (más cerca: más alto)
  fillPoly(x, [[30, 12], [48, 13], [49, 25], [30, 27]], edge);
  fillPoly(x, [[31, 13], [47, 14], [48, 24], [31, 26]], body);
  // capot visto un poco desde arriba
  fillPoly(x, [[29, 12], [45, 11], [48, 14], [31, 14]], bodyH);
  // techo y vidrios: ventanillas del costado y parabrisas
  fillPoly(x, [[8, 15], [12, 6], [27, 5], [30, 12]], edge);
  fillPoly(x, [[9, 14], [13, 7], [26, 6], [28, 12]], glass);
  fillPoly(x, [[28, 12], [26, 5], [40, 5], [45, 11]], edge);
  fillPoly(x, [[29, 11], [27, 6], [39, 6], [43, 11]], glass);
  fillPoly(x, [[12, 6], [26, 4], [40, 4], [40, 5], [26, 5], [13, 7]], bodyH);
  R(18, 7, 2, 7, edge); // parante del medio
  P(15, 8, glassH); P(16, 9, glassH); P(31, 7, glassH); P(32, 8, glassH); P(33, 9, glassH); P(36, 7, glassH);
  // espejo, puertas y manijas
  R(28, 11, 2, 2, body); P(28, 11, edge);
  R(17, 15, 1, 8, bodyD); R(28, 14, 1, 9, bodyD);
  R(13, 17, 2, 1, trim); R(24, 16, 2, 1, trim);
  // frente: faros, parrilla, paragolpes y patente
  R(32, 15, 4, 2, '#fff3a8'); P(33, 15, '#ffffff');
  R(43, 16, 4, 2, '#fff3a8'); P(44, 16, '#ffffff');
  R(37, 17, 5, 3, black); R(37, 18, 5, 1, '#3a3e44'); P(39, 18, chrome);
  R(31, 22, 18, 2, trim); R(31, 22, 18, 1, '#3a3e44');
  R(37, 20, 5, 2, '#ffffff'); R(38, 21, 3, 1, '#3d5c9c');
  P(31, 21, '#ffa13d'); P(47, 21, '#ffa13d');
  // ruedas: la de atrás de costado, la de adelante en la esquina y la otra de adelante asomando
  const wheel = (cx, cy, rx, ry, rim) => {
    for (let j = -ry; j <= ry; j++) { const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (j / (ry + 0.4)) ** 2))); R(cx - w, cy + j, w * 2 + 1, 1, black); }
    if (rim) for (let j = -ry + 2; j <= ry - 2; j++) { const w = Math.round((rx - 1.6) * Math.sqrt(Math.max(0, 1 - (j / (ry - 1.4)) ** 2))); R(cx - w, cy + j, w * 2 + 1, 1, chrome); }
  };
  wheel(7, 24, 3, 3, true);
  wheel(26, 25, 3, 3, true);
  R(46, 23, 3, 5, black);
  return cv;
}

function paintBush(w, h, seed, flowers) {
  const [cv, x] = makeCanvas(w, h);
  const { P } = painter(x);
  const rnd = mulberry32(seed);
  // matas redondas que entran enteras en el dibujo: solo se apoyan en el piso
  const blob = (r, bx, by) => [Math.max(r, Math.min(w - r, bx)), Math.max(r, by), r];
  const blobs = [
    blob(h / 2, w / 2 + (rnd() - 0.5) * w * 0.15, h / 2),
    blob(h * 0.36, 0, h * 0.7),
    blob(h * 0.38, w, h * 0.68),
    blob(h * 0.3 + rnd() * h * 0.06, w * (0.25 + rnd() * 0.5), h * 0.45),
  ];
  // la mata más cercana a su centro decide la luz de cada pixel (luz de arriba a la izquierda)
  const near = (xx, yy) => {
    let best = null, bd = 1;
    for (const b of blobs) {
      const d = ((xx + 0.5 - b[0]) ** 2 + (yy + 0.5 - b[1]) ** 2) / (b[2] * b[2]);
      if (d <= bd) { bd = d; best = b; }
    }
    return best;
  };
  const inside = (xx, yy) => yy >= h || (xx >= 0 && xx < w && yy >= 0 && near(xx, yy));
  for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) {
    const b = near(xx, yy);
    if (!b) continue;
    const edge = !inside(xx - 1, yy) || !inside(xx + 1, yy) || !inside(xx, yy - 1);
    const light = (b[0] - xx - 0.5 + b[1] - yy - 0.5) / (b[2] * 1.41);
    const q = rnd();
    let col;
    if (edge) col = '#2b622d';
    else if (yy >= h - 2) col = q < 0.3 ? '#2f6e30' : '#2a5f2b';
    else if (light > 0.45) col = q < 0.5 ? '#7fcf62' : '#5cb84d';
    else if (light > 0.05) col = q < 0.25 ? '#6cc05a' : q < 0.6 ? '#4fae47' : '#5cb84d';
    else if (light > -0.4) col = q < 0.3 ? '#3f9a3f' : '#45a043';
    else col = q < 0.4 ? '#2f7a33' : '#357f37';
    P(xx, yy, col);
  }
  if (flowers) for (let k = 0; k < Math.floor(w / 4); k++) {
    const fx = 1 + Math.floor(rnd() * (w - 2)), fy = 1 + Math.floor(rnd() * h * 0.7);
    if (inside(fx - 1, fy) && inside(fx + 1, fy) && inside(fx, fy - 1) && near(fx, fy)) P(fx, fy, flowers[k % flowers.length]);
  }
  return cv;
}


export { paintTrailer };

let trailerCache = null;
/** Casa rodante con Carlos atendiendo detrás del mostrador. (x, y) = esquina sup. izq.
 *  `open`: 1 = ventanita abierta; menos de 1 = la persiana metálica tapa la ventanita (0 = cerrada del todo) */
export function drawTrailer(ctx, x, y, t, open = 1) {
  const tr = trailerCache || (trailerCache = paintTrailer());
  ctx.drawImage(tr, x, y);
  // Carlos asoma por la ventanita mirando al patio; parpadea y se balancea un poquito
  const f = getCharFrames('carlos').left;
  const blink = t % 3.7 > 3.55, bob = t % 2.2 > 1.4 ? 1 : 0;
  const { x0, x1, y0, y1 } = TR_WIN;
  ctx.save();
  ctx.beginPath(); ctx.rect(x + x0, y + y0, x1 - x0 + 1, y1 - y0 + 1); ctx.clip();
  ctx.drawImage(blink ? f.blink : f.idle, x + 23, y + 24 + bob);
  ctx.restore();
  ctx.drawImage(tr.front, x, y);
  if (open < 1) {
    // persiana enrollable de chapa: baja desde arriba de la ventanita
    const w = x1 - x0 + 1, full = y1 - y0 + 1;
    const h = Math.round(full * (1 - open));
    if (h > 0) {
      const sx = x + x0, sy = y + y0;
      ctx.fillStyle = '#c3cad2'; ctx.fillRect(sx, sy, w, h);
      ctx.fillStyle = '#9aa3ad';
      for (let r = 1; r < h - 2; r += 3) ctx.fillRect(sx, sy + r, w, 1);
      ctx.fillStyle = '#dde2e7';
      for (let r = 0; r < h - 2; r += 3) ctx.fillRect(sx, sy + r, w, 1);
      // varilla de abajo con la manija
      ctx.fillStyle = '#6b6f78'; ctx.fillRect(sx, sy + h - 2, w, 2);
      ctx.fillStyle = '#3a3f45'; ctx.fillRect(sx + (w >> 1) - 2, sy + h - 1, 5, 1);
    }
    // el rollo arriba
    ctx.fillStyle = '#8a929b'; ctx.fillRect(x + x0 - 1, y + y0 - 1, w + 2, 2);
  }
}

// Portón de madera al fondo del patio, que da a la calle
function paintGate() {
  const [cv, x] = makeCanvas(28, 44);
  const { R, P } = painter(x);
  // pilares blancos con remate
  for (const px of [0, 23]) {
    R(px, 6, 5, 38, '#efebe3'); R(px, 6, 1, 38, '#ffffff'); R(px + 4, 6, 1, 38, '#c9c2b6');
    R(px - (px ? 0 : 0), 4, 5, 2, '#d8d1c4'); R(px, 3, 5, 1, '#ffffff');
  }
  // hojas del portón: tablones verticales marrones
  for (let xx = 5; xx < 23; xx++) {
    const plank = Math.floor((xx - 5) / 3);
    R(xx, 10, 1, 34, plank % 2 ? '#7a4a2a' : '#8b5a36');
    if ((xx - 5) % 3 === 0) R(xx, 10, 1, 34, '#5a3220');
  }
  R(5, 9, 18, 2, '#5a3220'); R(5, 9, 18, 1, '#a06a41');
  R(13, 10, 2, 34, '#4a2a18'); // unión de las dos hojas
  // travesaños, bisagras y manijas
  for (const yy of [16, 34]) { R(5, yy, 18, 2, '#6b4429'); R(5, yy, 18, 1, '#9b6a43'); }
  R(5, 15, 3, 1, '#3a3f45'); R(5, 33, 3, 1, '#3a3f45'); R(20, 15, 3, 1, '#3a3f45'); R(20, 33, 3, 1, '#3a3f45');
  P(12, 26, '#e2b33c'); P(15, 26, '#e2b33c'); P(12, 27, '#9c6a12'); P(15, 27, '#9c6a12');
  // numerito de la calle
  R(17, 21, 5, 4, '#ffffff'); drawText(x, '1', 18, 21, '#3d5c9c');
  return cv;
}

export class Structures {
  constructor() {
    this.complex = paintComplex();
    this.brick = paintBrickWall(GATE_X - 216, 40);
    this.gate = paintGate();
    this.gateOpen = 0;   // 0 = cerrado, 1 = abierto del todo (lo usa la intro)
    this.trailerOpen = 1; // ventanita del taller: 1 = abierta (en la intro arranca cerrada)
    this.tree = paintTree();
    this.hedgeL = paintHedge(16, 60, 5);
    this.bushes = [
      [27.4 * TILE, paintBush(18, 14, 3, ['#ff9ad5', '#ffffff'])],
      [59.2 * TILE, paintBush(20, 15, 11, ['#ffd34d', '#ffffff'])],
    ];
    this.gol = paintGol();
    this.sedan = paintSedan();
    this.golDoor = 0;  // puerta del Gol: 0 = cerrada, 1 = abierta (escena de Popi)
    this.golShake = 0; // el Gol se sacude (Popi ladrando adentro)
  }

  /** Fondo del patio (pared, árbol, autos, arbustos) — va detrás de todo */
  drawBackdrop(ctx, camX, camY, t, lift = 0, px = 1) {
    this.ctx = ctx;
    const g0 = S * TILE - camY;
    // parallax al bajar del cielo: la pared del fondo sube un poco más que el piso
    // (y su último renglón se estira hasta el suelo, así sigue apoyada)
    const l = Math.round(lift * 0.22 / px) * px, gy = g0 - l;
    const stand = (img, x, y) => {
      ctx.drawImage(img, x, y);
      if (l > 0) ctx.drawImage(img, 0, img.height - 1, img.width, 1, x, y + img.height, img.width, l);
    };
    stand(this.brick, 216 - camX, gy - 40);
    stand(this.hedgeL, 0 - camX, gy - 60);
    this.drawGate(GATE_X - camX, gy - 44, l);
    // lo que está apoyado en el patio (árbol, autos, arbustos) va pegado al piso, sin parallax:
    // así en la bajada de la intro no parece que flota
    ctx.drawImage(this.tree, TREE_X - camX, g0 - 72);
    // autos estacionados al fondo: el sedán rojo (de frente, en diagonal) y el Gol gris
    ctx.drawImage(this.sedan, SEDAN_X - camX, g0 - this.sedan.height + 1);
    this.drawGol(GOL_X - camX, g0 - this.gol.height + 1, t);
    // arbustos contra la medianera
    for (const [bx, spr] of this.bushes) ctx.drawImage(spr, Math.round(bx) - camX, g0 - spr.height);
  }

  /** el Gol: se sacude si Popi ladra adentro y la puerta de adelante se abre para que salga */
  drawGol(x, y, t) {
    const ctx = this.ctx, img = this.gol;
    const dx = this.golShake > 0 ? Math.round(Math.sin(t * 60) * this.golShake) : 0;
    ctx.drawImage(img, x + dx, y);
    const o = this.golDoor;
    if (o <= 0) return;
    // hueco de la puerta (oscuro, con el asiento) y la puerta abierta hacia nosotros, cada vez más angosta
    const hx = x + dx + GOL_DOOR.x0, hy = y + GOL_DOOR.y0, hw = GOL_DOOR.x1 - GOL_DOOR.x0, hh = GOL_DOOR.y1 - GOL_DOOR.y0;
    ctx.fillStyle = '#1b1d22'; ctx.fillRect(hx, hy, hw, hh);
    ctx.fillStyle = '#5a3a2a'; ctx.fillRect(hx + 2, hy + 5, hw - 4, hh - 6);
    ctx.fillStyle = '#7a5038'; ctx.fillRect(hx + 2, hy + 5, hw - 4, 1);
    const w = Math.max(2, Math.round(hw * Math.cos(o * Math.PI * 0.42)));
    const px = hx + hw;
    ctx.fillStyle = '#2e3136'; ctx.fillRect(px, hy - 1, w + 1, hh + 2);
    ctx.fillStyle = '#666b72'; ctx.fillRect(px, hy + 4, w, hh - 4);
    ctx.fillStyle = '#262c35'; ctx.fillRect(px, hy, w, 4);
    ctx.fillStyle = '#4b4f55'; ctx.fillRect(px, hy + hh - 2, w, 2);
  }

  /** portón: cerrado es el dibujo entero; abriéndose, cada hoja gira sobre su pilar
   *  (se ve cada vez más angosta y más oscura) y por el hueco se ve la vereda */
  drawGate(x, y, l) {
    const img = this.gate, o = this.gateOpen;
    const part = (sx, sw, dx, dw) => {
      if (dw <= 0) return;
      ctx.drawImage(img, sx, 0, sw, img.height, x + dx, y, dw, img.height);
      if (l > 0) ctx.drawImage(img, sx, img.height - 1, sw, 1, x + dx, y + img.height, dw, l);
    };
    const ctx = this.ctx;
    if (o <= 0) { part(0, img.width, 0, img.width); return; }
    part(0, 5, 0, 5); part(23, 5, 23, 5);
    // vereda del otro lado
    ctx.fillStyle = '#a49e94'; ctx.fillRect(x + 5, y + 41, 18, 3 + l);
    ctx.fillStyle = '#c4beb3'; ctx.fillRect(x + 5, y + 41, 18, 1);
    const c = Math.cos(o * Math.PI * 0.44);
    const w = Math.max(1, Math.round(9 * c));
    const dark = `rgba(20,10,5,${(0.5 * o).toFixed(2)})`;
    part(5, 9, 5, w);
    part(14, 9, 23 - w, w);
    ctx.fillStyle = dark;
    ctx.fillRect(x + 5, y + 9, w, 35 + l); ctx.fillRect(x + 23 - w, y + 9, w, 35 + l);
  }

  drawBuildings(ctx, camX, camY, t) {
    ctx.drawImage(this.complex, 2 * TILE - camX, (S - 16) * TILE - camY);
    drawTrailer(ctx, TRAILER_X - camX, S * TILE - TRAILER_H - camY, t, this.trailerOpen);
  }
}

export function inZone(z, x, y) {
  return x >= z.x0 && x <= z.x1 && y >= z.y0 && y <= z.y1;
}
