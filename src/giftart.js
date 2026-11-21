// Dibujos de los regalos en pixel art (lo que aparece en el cartel al abrir un cofre).
// El primer regalo es una caja de bombones Ferrero Rocher con un bombón gigante adelante.
import { makeCanvas, outlined } from './util.js';

const OUTLINE = '#1d1420';

// dorados del papel de los bombones, del más claro al más oscuro
const G = { W: '#fff6d2', Y: '#f7dc85', y: '#e0b244', o: '#b9852a', d: '#82561a', D: '#5e3a10' };
// el bombón (7x7): papel dorado arrugado con la etiquetita ovalada en el medio
const BALL = [
  '..doo..',
  '.oYyyo.',
  'oYWYyyd',
  'oyyccyd',
  'oyYyyod',
  '.dyoyd.',
  '..ddd..',
];
const BALL_PAL = { ...G, c: '#fffbe9' };

function px(x, cx, cy, c) { x.fillStyle = c; x.fillRect(cx, cy, 1, 1); }
function rect(x, a, b, w, h, c) { x.fillStyle = c; x.fillRect(a, b, w, h); }
function sprite(x, rows, pal, ox, oy) {
  rows.forEach((row, j) => { for (let i = 0; i < row.length; i++) { const c = pal[row[i]]; if (c) px(x, ox + i, oy + j, c); } });
}
function disc(x, cx, cy, r, c) {
  for (let j = Math.floor(cy - r); j <= Math.ceil(cy + r); j++) for (let i = Math.floor(cx - r); i <= Math.ceil(cx + r); i++) {
    if ((i + 0.5 - cx) ** 2 + (j + 0.5 - cy) ** 2 <= r * r) px(x, i, j, c);
  }
}

/** la etiqueta redonda del medio: blanca, con borde dorado, la pirámide de bombones y las letras en marrón */
function label(x, cx, cy) {
  const rx = 7, ry = 6;
  for (let j = -ry - 1; j <= ry; j++) for (let i = -rx - 1; i <= rx; i++) {
    const d = ((i + 0.5) / (rx + 0.5)) ** 2 + ((j + 0.5) / (ry + 0.5)) ** 2;
    if (d <= 1) px(x, cx + i, cy + j, d > 0.72 ? '#d9a940' : '#fffdf6');
  }
  // pirámide de bombones chiquita arriba
  px(x, cx - 1, cy - 4, '#e0b244'); px(x, cx, cy - 4, '#f7dc85');
  px(x, cx - 2, cy - 3, '#b9852a'); px(x, cx - 1, cy - 3, '#e0b244'); px(x, cx, cy - 3, '#e0b244'); px(x, cx + 1, cy - 3, '#b9852a');
  // FERRERO / ROCHER: dos renglones de "letras" marrones
  const brown = '#6b3418';
  for (let i = -5; i <= 4; i++) if (i % 3 !== 1) px(x, cx + i, cy - 1, brown);
  for (let i = -4; i <= 3; i++) if (i % 3 !== 0) px(x, cx + i, cy + 1, brown);
}

/**
 * La caja vista de frente: bandeja dorada con 5x5 huecos (24 bombones + la etiqueta en el medio)
 * y la tapa de plástico transparente con brillos. Devuelve un canvas sin contorno.
 */
function paintBox() {
  const N = 5, cell = 8, pad = 3;
  const S = N * cell + pad * 2;
  const [c, x] = makeCanvas(S, S + 2);
  // bandeja: borde oscuro, filo claro y fondo dorado
  rect(x, 0, 0, S, S, '#7a4c14');
  rect(x, 1, 1, S - 2, S - 2, '#f2cf6e');
  rect(x, 2, 2, S - 4, S - 4, '#c08b2c');
  // grosor de la caja abajo (se ve el costado)
  rect(x, 1, S, S - 2, 2, '#9c6a1e'); rect(x, 0, S - 1, 1, 2, '#7a4c14'); rect(x, S - 1, S - 1, 1, 2, '#7a4c14');
  for (let r = 0; r < N; r++) for (let q = 0; q < N; q++) {
    const cx = pad + q * cell + cell / 2, cy = pad + r * cell + cell / 2;
    if (r === 2 && q === 2) continue;
    // el hueco de cada bombón (la bandeja hundida, más oscura) y el pirotín marrón
    disc(x, cx, cy + 0.5, 3.9, '#8e5d18');
    disc(x, cx, cy + 0.8, 3.4, '#5e3a10');
    sprite(x, BALL, BALL_PAL, cx - 3.5 | 0, (cy - 3.5) | 0);
  }
  label(x, S / 2 | 0, S / 2 | 0);
  // brillos de la tapa de plástico: dos franjas en diagonal
  for (let i = 0; i < S; i++) for (let j = 0; j < S; j++) {
    const k = i + j;
    if ((k === 14 || k === 15 || k === 58 || k === 59) && i > 1 && j > 1 && i < S - 2 && j < S - 2) { x.fillStyle = 'rgba(255,255,255,0.45)'; x.fillRect(i, j, 1, 1); }
  }
  // reflejo del borde de la tapa
  rect(x, 2, 1, S - 4, 1, '#fff3c0');
  return c;
}

/** la caja con un bombón gigante adelante (con su pirotín plisado marrón y dorado) y brillitos */
function paintGift1() {
  const box = paintBox();
  const [c, x] = makeCanvas(62, 58);
  x.drawImage(box, 18, 0);
  const cx = 18, cy = 40, R = 13;
  // la esfera dorada arrugada: sombreado por luz desde arriba a la izquierda y "arrugas" de a pixel
  const shades = [G.W, G.Y, G.y, G.o, G.d, G.D];
  for (let j = -R; j <= R; j++) for (let i = -R; i <= R; i++) {
    const dd = (i + 0.5) ** 2 + (j + 0.5) ** 2;
    if (dd > R * R) continue;
    const nx = (i + 0.5) / R, ny = (j + 0.5) / R, nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
    let l = 0.3 + 0.55 * (-0.45 * nx - 0.55 * ny + 0.7 * nz);
    const h = Math.sin(i * 12.9898 + j * 78.233) * 43758.5453;
    l += ((h - Math.floor(h)) - 0.5) * 0.4; // papel arrugado
    const k = Math.max(0, Math.min(shades.length - 1, Math.round((1 - l) * (shades.length - 1))));
    px(x, cx + i, cy + j, shades[k]);
  }
  // pirotín marrón plisado que envuelve la mitad de abajo
  for (let j = 4; j <= R + 1; j++) for (let i = -R - 1; i <= R + 1; i++) {
    if ((i + 0.5) ** 2 + (j + 0.5) ** 2 > (R + 1.3) ** 2) continue;
    const edge = j === 4 || (j === 5 && (i + 40) % 2 === 0); // borde ondulado de arriba
    let col = edge ? '#a8692a' : (i + 40) % 3 === 0 ? '#3e2208' : (i + 40) % 3 === 1 ? '#6b3e12' : '#80501a';
    // la guarda dorada del pirotín: un damero dorado y marrón, y una línea de puntitos dorados más abajo
    if (j === 7 || j === 8) col = ((i + 40 + (j === 8 ? 2 : 0)) % 4 < 2) ? (j === 7 ? '#f2cf6e' : '#d9a940') : '#2e1806';
    else if (j === 11 && (i + 40) % 3 === 1) col = '#d9a940';
    px(x, cx + i, cy + j, col);
  }
  // etiqueta ovalada blanca con borde dorado
  for (let j = -3; j <= 2; j++) for (let i = -5; i <= 4; i++) {
    const d = ((i + 0.5) / 5.5) ** 2 + ((j + 0.5) / 3.5) ** 2;
    if (d <= 1) px(x, cx + i, cy - 1 + j, d > 0.6 ? '#d9a940' : '#fffdf6');
  }
  for (let i = -3; i <= 2; i++) if (i !== 0) px(x, cx + i, cy - 1, '#6b3418');
  // brillitos
  const star = (sx, sy) => { px(x, sx, sy, '#fff'); px(x, sx - 1, sy, '#fff3a8'); px(x, sx + 1, sy, '#fff3a8'); px(x, sx, sy - 1, '#fff3a8'); px(x, sx, sy + 1, '#fff3a8'); };
  star(cx - 7, cy - 8); star(cx + 15, cy - 13); star(4, 22);
  return outlined(c, OUTLINE);
}

let url = null;
/** el dibujo del primer regalo (data URL) */
export function gift1Url() {
  if (!url) url = paintGift1().toDataURL();
  return url;
}

// ------------------------------------------------------------
//  Segundo regalo: un reloj plateado de frente, con la esfera blanca y números negros
// ------------------------------------------------------------
// metal del reloj, del más claro al más oscuro
const M = ['#ffffff', '#e9edf1', '#cbd2d9', '#a7b0ba', '#808a95', '#5d6670', '#3f464e'];
const INK = '#23262b';
// números y letras de 3x5
const FONT = {
  0: ['111', '101', '101', '101', '111'], 1: ['01', '11', '01', '01', '01'], 2: ['111', '001', '111', '100', '111'],
  3: ['111', '001', '111', '001', '111'], 4: ['101', '101', '111', '001', '001'], 5: ['111', '100', '111', '001', '111'],
  6: ['111', '100', '111', '101', '111'], 7: ['111', '001', '010', '010', '010'], 8: ['111', '101', '111', '101', '111'],
  9: ['111', '101', '111', '001', '111'],
  C: ['111', '100', '100', '100', '111'], A: ['010', '101', '111', '101', '101'], S: ['111', '100', '111', '001', '111'],
  I: ['1', '1', '1', '1', '1'], O: ['111', '101', '101', '101', '111'],
};
function textW(s) { return [...s].reduce((w, ch) => w + FONT[ch][0].length, 0) + s.length - 1; }
function text(x, s, ox, oy, col) {
  let cx = ox;
  for (const ch of s) {
    const g = FONT[ch];
    g.forEach((row, j) => { for (let i = 0; i < row.length; i++) if (row[i] === '1') px(x, cx + i, oy + j, col); });
    cx += g[0].length + 1;
  }
}
/** línea de a pixel */
function line(x, x0, y0, x1, y1, col, w = 1) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2 || 1;
  for (let k = 0; k <= n; k++) {
    const a = Math.round(x0 + (x1 - x0) * k / n), b = Math.round(y0 + (y1 - y0) * k / n);
    rect(x, a - (w > 1 ? 1 : 0), b - (w > 1 ? 1 : 0), w, w, col);
  }
}

/**
 * La caja y la esfera del reloj (de frente, o achatada con sx < 1 para verlo de costadito).
 * r = radio de afuera de la caja; con r grande lleva los números, con r chico solo las marquitas.
 */
function watchFace(x, cx, cy, r, sx = 1) {
  const dialR = r - 4;
  // caja plateada: anillo con luz de arriba a la izquierda
  for (let j = -r - 1; j <= r + 1; j++) for (let i = -r - 1; i <= r + 1; i++) {
    const u = (i + 0.5) / sx, v = j + 0.5, d = Math.hypot(u, v);
    if (d > r) continue;
    let col;
    if (d > r - 1.2) col = M[5];                                 // filo de afuera
    else if (d > dialR + 0.6) {                                   // bisel
      const lit = -(u * 0.6 + v * 0.8) / d;                       // de arriba a la izquierda
      col = M[Math.max(0, Math.min(5, Math.round(2.6 - lit * 2.4 + (d > dialR + 2.4 ? 0.6 : -0.4))))];
    } else if (d > dialR - 0.4) col = M[4];                       // borde de la esfera
    else col = '#fbfbf8';                                         // esfera blanca
    px(x, cx + i, cy + j, col);
  }
  // sombrita de la esfera arriba (el vidrio)
  for (let i = -dialR + 3; i <= dialR - 3; i++) { const k = Math.round(-Math.sqrt(Math.max(0, dialR * dialR - i * i)) + 1); px(x, cx + Math.round(i * sx), cy + k, '#e3e5e2'); }
  const at = (h, rr) => { const a = (h / 12) * Math.PI * 2; return [cx + Math.sin(a) * rr * sx, cy - Math.cos(a) * rr]; };
  // minuteros: puntitos alrededor
  for (let m = 0; m < 60; m++) {
    if (dialR < 12 && m % 5) continue;
    const [a, b] = at(m / 5, dialR - 1);
    px(x, Math.round(a - 0.5), Math.round(b - 0.5), m % 5 ? '#9aa0a6' : INK);
  }
  if (dialR >= 15) {
    // los doce números
    for (let h = 1; h <= 12; h++) {
      const s = String(h), w = textW(s), rr = dialR - (s.length > 1 ? 6.2 : 5.2);
      const [a, b] = at(h, rr);
      text(x, s, Math.round(a - w / 2), Math.round(b - 2.5), INK);
    }
    if (dialR >= 22) text(x, 'CASIO', cx - (textW('CASIO') >> 1), cy - Math.round(dialR * 0.56), INK);
    else for (let i = -3; i <= 3; i++) px(x, cx + i, cy - Math.round(dialR * 0.45), i % 2 ? INK : '#6b7076');
    // "water resist": un renglón finito abajo
    for (let i = -5; i <= 5; i++) if (i % 3) px(x, cx + i, cy + Math.round(dialR * 0.36), '#5d6268');
  } else {
    // esfera chiquita: el 12 y "CASIO" de a pixel
    for (let i = -2; i <= 2; i++) px(x, cx + i, cy - Math.round(dialR * 0.45), i % 2 ? INK : '#6b7076');
  }
  // agujas a las 10:08 (como en la foto) y el segundero por el 8
  const hand = (h, len, col, w) => { const [a, b] = at(h, len); line(x, cx, cy, a, b, col, w); };
  hand(10.15, dialR * 0.5, INK, dialR >= 15 ? 2 : 1);
  hand(1.6, dialR * 0.82, '#3a3f45', 1);
  hand(7.9, dialR * 0.88, '#8d949c', 1);
  rect(x, cx - 1, cy - 1, 2, 2, M[5]); px(x, cx - 1, cy - 1, M[2]);
  // la corona a la derecha
  const kx = cx + Math.round(r * sx);
  rect(x, kx, cy - 2, 3, 4, M[3]); rect(x, kx, cy - 2, 3, 1, M[1]); rect(x, kx + 2, cy - 2, 1, 4, M[5]);
}

/** un tramo de malla de eslabones (vertical): eslabones del medio y de los costados intercalados */
function bracelet(x, cx, y0, y1, w, { skew = 0, dark = 0 } = {}) {
  const side = Math.max(2, Math.round(w * 0.28));
  for (let y = y0; y <= y1; y++) {
    const ox = Math.round(cx - w / 2 + (y - y0) * skew);
    for (let i = 0; i < w; i++) {
      const inCenter = i >= side && i < w - side;
      const link = Math.floor((y - y0 + (inCenter ? 3 : 0)) / 6), ly = (y - y0 + (inCenter ? 3 : 0)) % 6;
      // brillo según la columna (es redondeada) y un poco por eslabón
      const t = i / (w - 1);
      let s = Math.round(1 + Math.abs(t - 0.32) * 4.2) + dark;
      if (ly === 0) s = 6; else if (ly === 1) s -= 1; else if (ly === 5) s += 1;
      if (i === side - 1 || i === w - side) s = Math.max(s, 5);
      if (link % 2 && inCenter) s += 0;
      px(x, ox + i, y, M[Math.max(0, Math.min(6, s))]);
    }
  }
}

/** asas de la caja (donde se engancha la malla) */
function lugs(x, cx, cy, r, w, sx = 1) {
  for (const dir of [-1, 1]) {
    const y0 = cy + dir * (r - 3), y1 = cy + dir * (r + 2);
    for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) {
      const k = Math.abs(y - y0);
      const hw = Math.round((w / 2 + 2 - k * 0.3) * sx);
      for (let i = -hw; i <= hw; i++) px(x, cx + i, y, M[i < -hw + 2 ? 1 : i > hw - 2 ? 5 : 3]);
    }
  }
}

function sparkle(x, sx, sy) { px(x, sx, sy, '#fff'); px(x, sx - 1, sy, '#dff3ff'); px(x, sx + 1, sy, '#dff3ff'); px(x, sx, sy - 1, '#dff3ff'); px(x, sx, sy + 1, '#dff3ff'); }

/** el reloj de frente, con la malla para arriba y para abajo */
function paintWatchFront() {
  const [c, x] = makeCanvas(58, 84);
  const cx = 29, cy = 42, r = 24, bw = 24;
  bracelet(x, cx, 0, cy - r + 1, bw);
  bracelet(x, cx, cy + r - 1, 79, bw);
  lugs(x, cx, cy, r, bw);
  watchFace(x, cx, cy, r);
  sparkle(x, 5, 18); sparkle(x, 52, 66);
  return outlined(c, OUTLINE);
}

let url2 = null;
/** el dibujo del segundo regalo (data URL) */
export function gift2Url() {
  if (!url2) url2 = paintWatchFront().toDataURL();
  return url2;
}

// ------------------------------------------------------------
//  Tercer regalo: un par de zapatillas estilo retro, blancas de malla, con plateado, rayas y el cuello negro
// ------------------------------------------------------------
// el contorno de la capellada (de costado, la punta a la derecha), en proporciones del ancho y el alto
const UPPER = [[0.04, 0.74], [0.025, 0.3], [0.05, 0.12], [0.1, 0.05], [0.17, 0.12], [0.24, 0.17], [0.3, 0.09], [0.35, 0.06],
  [0.41, 0.15], [0.5, 0.23], [0.62, 0.32], [0.74, 0.41], [0.86, 0.48], [0.95, 0.56], [0.985, 0.66], [0.97, 0.74]];
function inPoly(px_, py_, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > py_) !== (yj > py_) && px_ < ((xj - xi) * (py_ - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
/** el borde de arriba de la capellada en la columna u (0..1) */
function topAt(u) {
  for (let k = 1; k < UPPER.length - 2; k++) {
    const [x0, y0] = UPPER[k], [x1, y1] = UPPER[k + 1];
    if (u >= x0 && u <= x1) return y0 + ((u - x0) / (x1 - x0)) * (y1 - y0);
  }
  return 0.06;
}

/** una zapatilla de costado, de W x H, dibujada en (ox, oy) del contexto x (sin contorno) */
function shoe(x, ox, oy, W, H) {
  const SL = ['#f3f5f7', '#d3d9df', '#b0b9c3', '#8b95a0', '#69737e'];
  const P = (i, j, c) => px(x, ox + i, oy + j, c);
  const sole0 = Math.round(H * 0.72);
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const u = (i + 0.5) / W, v = (j + 0.5) / H;
    // suela: blanca, gruesa, con la punta levantada y el taco redondeado; abajo la goma negra
    const toeLift = u > 0.82 ? ((u - 0.82) / 0.18) ** 2 * 0.16 : 0, heelRound = u < 0.06 ? ((0.06 - u) / 0.06) ** 2 * 0.1 : 0;
    if (j >= sole0 && v <= 1 - toeLift - heelRound && u > 0.02 && u < 0.99) {
      const fromBot = Math.round((1 - toeLift - heelRound) * H) - j;
      let col = '#f7f7f5';
      if (fromBot <= Math.max(1, Math.round(H / 24))) col = '#1d1d22';                     // goma negra
      else if (fromBot === Math.max(1, Math.round(H / 24)) + 1) col = '#3a3a40';
      else if (j === sole0) col = '#c9ccd2';                                                // unión con la capellada
      else if (j === sole0 + Math.round((H - sole0) * 0.5) && u > 0.12 && u < 0.84) col = '#d3d6db'; // rayita
      P(i, j, col);
      continue;
    }
    if (!inPoly(u, v, UPPER)) continue;
    const top = topAt(u), dTop = (v - top) * H; // píxeles desde el borde de arriba
    // malla blanca con agujeritos
    let col = (i % 3 === 0 && j % 3 === 1) || (i % 3 === 2 && j % 3 === 2 && u > 0.5) ? '#d4d6e0' : '#f7f7fa';
    // cuello acolchado y talón de arriba: negros
    if ((u > 0.07 && u < 0.33 && dTop < Math.max(2.5, H * 0.1)) || (u < 0.12 && v < 0.24)) col = dTop < 1 ? '#2c2c33' : '#141418';
    // lengüeta (arriba, entre el cuello y los cordones): blanca lisa
    else if (u >= 0.3 && u < 0.4 && dTop < H * 0.12) col = '#ececf1';
    else {
      // plateado: puntera, talón y la tira de los ojalillos
      let sv = -1;
      if (u > 0.8 && v > 0.5 + (0.92 - u) * 0.3) sv = (v - 0.5) * 6;
      else if (u < 0.22 && v > 0.38 - u * 0.4) sv = (v - 0.35) * 5 + 0.5;
      else if (u > 0.38 && u < 0.8 && dTop >= 0 && dTop < Math.max(2, H * 0.09)) sv = 1 + dTop * 0.6;
      if (sv >= 0) col = SL[Math.max(0, Math.min(4, Math.round(sv + Math.sin(i * 0.6) * 0.4)))];
      // las cuatro rayas en diagonal, blancas con el borde negro (se inclinan hacia atrás al bajar)
      const sw_ = Math.max(1, Math.round(W / 42));
      // atrás de las rayas, plateado (así se ven las rayas blancas)
      const c0 = (0.46 - (v - 0.3) * 0.42) * W, c3 = c0 + 3 * 0.075 * W;
      if (dTop > Math.max(2.5, H * 0.1) && v < 0.68 && i + 0.5 > c0 - sw_ - 3 && i + 0.5 < c3 + sw_ + 3) col = SL[2 + ((i + j) % 5 === 0 ? 1 : 0)];
      for (let k = 0; k < 4; k++) {
        const cx = (0.46 + k * 0.075 - (v - 0.3) * 0.42) * W;
        const d = Math.abs(i + 0.5 - cx);
        if (dTop > Math.max(2.5, H * 0.1) && v < 0.68 && d <= sw_ + 1) col = d > sw_ ? '#16161b' : '#ffffff';
      }
    }
    P(i, j, col);
  }
  // cordones blancos cruzados sobre los ojalillos
  for (let k = 0; k < 6; k++) {
    const u = 0.42 + k * 0.06, j = Math.round(topAt(u) * H), i = Math.round(u * W);
    P(i - 1, j - 1, '#ffffff'); P(i, j - 1, '#ffffff'); P(i + 1, j, '#ffffff'); P(i - 2, j, '#ffffff');
    P(i, j + 1, '#5d6670');
  }
}

/** el par, una atrás de la otra */
function paintShoePair() {
  const [c, x] = makeCanvas(56, 31);
  shoe(x, 0, 0, 56, 31);
  // la de atrás un poco más oscura
  const [b, bx] = makeCanvas(56, 31);
  shoe(bx, 0, 0, 56, 31);
  bx.globalCompositeOperation = 'source-atop'; bx.fillStyle = 'rgba(40,40,60,0.18)'; bx.fillRect(0, 0, 56, 31);
  const [c2, x2] = makeCanvas(70, 46);
  x2.drawImage(outlined(b, OUTLINE), 12, 0);   // la de atrás, más arriba y a la derecha
  x2.drawImage(outlined(c, OUTLINE), 0, 13);   // la de adelante
  sparkle(x2, 4, 8); sparkle(x2, 66, 40);
  return c2;
}
let url3 = null;
/** el dibujo del tercer regalo: el par de zapatillas (data URL) */
export function gift3Url() {
  if (!url3) url3 = paintShoePair().toDataURL();
  return url3;
}

/** una zapatilla suelta (para los primeros planos de las escenas): canvas sin contorno de W x H */
export function shoeCanvas(W, H) {
  const [c, x] = makeCanvas(W, H);
  shoe(x, 0, 0, W, H);
  return outlined(c, OUTLINE);
}
