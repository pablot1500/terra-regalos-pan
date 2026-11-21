// Dibujos de los regalos en pixel art (lo que aparece en el cartel al abrir un cofre).
// El primer regalo es una caja de bombones Ferrero Rocher: hay 4 versiones para elegir en
// Configuración → "Dibujo del primer regalo"; la elegida se guarda en el navegador.
import { makeCanvas, outlined } from './util.js';

const OUTLINE = '#1d1420';
export const GIFT1_KEY = 'terra-regalos-pan:regalo1';

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
function label(x, cx, cy, big = false) {
  const rx = big ? 8 : 7, ry = big ? 7 : 6;
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
  if (big) for (let i = -3; i <= 2; i += 1) px(x, cx + i, cy + 3, '#d9a940');
}

/** los sellos negros de "EXCESO EN..." (octógonos) */
function stamp(x, ox, oy) {
  sprite(x, ['.kkkkk.', 'kkkkkkk', 'kwwkwwk', 'kkkkkkk', 'kwkwwwk', 'kkkkkkk', '.kkkkk.'], { k: '#141014', w: '#e8e8e8' }, ox, oy);
}

/**
 * La caja vista de frente: bandeja dorada con 5x5 huecos (24 bombones + la etiqueta en el medio)
 * y la tapa de plástico transparente con brillos. Devuelve un canvas sin contorno.
 */
function paintBox({ stamps = false, shine = true } = {}) {
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
  if (shine) {
    // brillos de la tapa de plástico: dos franjas en diagonal
    for (let i = 0; i < S; i++) for (let j = 0; j < S; j++) {
      const k = i + j;
      if (k === 14 || k === 15 || k === 58 || k === 59) { if (i > 1 && j > 1 && i < S - 2 && j < S - 2) { x.fillStyle = 'rgba(255,255,255,0.45)'; x.fillRect(i, j, 1, 1); } }
    }
    // reflejo del borde de la tapa
    rect(x, 2, 1, S - 4, 1, '#fff3c0');
  }
  if (stamps) for (let i = 0; i < 4; i++) stamp(x, 8 + i * 9, 2);
  return c;
}

/**
 * Pasa un canvas dibujado "suave" (rotado, escalado) a pixel art: sin semitransparencias y con cada
 * color llevado al más cercano de la paleta original, para que no queden bordes borrosos.
 */
function crisp(src, palSrc) {
  const pal = [];
  const pd = palSrc.getContext('2d').getImageData(0, 0, palSrc.width, palSrc.height).data;
  const seen = new Set();
  for (let i = 0; i < pd.length; i += 4) {
    if (pd[i + 3] < 250) continue;
    const k = (pd[i] << 16) | (pd[i + 1] << 8) | pd[i + 2];
    if (!seen.has(k)) { seen.add(k); pal.push([pd[i], pd[i + 1], pd[i + 2]]); }
  }
  const sx = src.getContext('2d');
  const img = sx.getImageData(0, 0, src.width, src.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 140) { d[i + 3] = 0; continue; }
    const a = d[i + 3] / 255;
    const r = d[i] / a, g = d[i + 1] / a, b = d[i + 2] / a;
    let best = pal[0], bd = Infinity;
    for (const p of pal) { const e = (p[0] - r) ** 2 + (p[1] - g) ** 2 + (p[2] - b) ** 2; if (e < bd) { bd = e; best = p; } }
    d[i] = best[0]; d[i + 1] = best[1]; d[i + 2] = best[2]; d[i + 3] = 255;
  }
  sx.putImageData(img, 0, 0);
  return src;
}

// ---- las 4 opciones ----

/** 1. De frente, como la foto, con los sellos negros */
function optFront() { return outlined(paintBox({ stamps: true }), OUTLINE); }

/** 2. Inclinada, como en la foto (rotada y un poco en perspectiva) */
function optTilted() {
  const box = paintBox({ stamps: true });
  const [c, x] = makeCanvas(62, 58);
  x.imageSmoothingEnabled = false;
  x.translate(31, 29);
  x.rotate(-0.2);
  x.transform(1, 0.08, -0.06, 0.94, 0, 0);
  x.drawImage(box, -box.width / 2, -box.height / 2);
  x.setTransform(1, 0, 0, 1, 0, 0);
  return outlined(crisp(c, box), OUTLINE);
}

/** 3. Envuelta para regalo: cinta rosa cruzada y un moño grande arriba */
function optRibbon() {
  const box = paintBox({ stamps: false });
  const W = box.width, H = box.height;
  const [c, x] = makeCanvas(W, H + 8);
  x.drawImage(box, 0, 8);
  const mid = (W / 2) | 0;
  // cinta vertical y horizontal
  rect(x, mid - 2, 8, 5, H, '#ff6fae'); rect(x, mid - 2, 8, 1, H, '#ffb3d6'); rect(x, mid + 2, 8, 1, H, '#c93d7e');
  rect(x, 0, 8 + mid - 2, W, 5, '#ff6fae'); rect(x, 0, 8 + mid - 2, W, 1, '#ffb3d6'); rect(x, 0, 8 + mid + 2, W, 1, '#c93d7e');
  // moño
  const bow = [
    '.pppp.....pppp.',
    'pPPPPp...pPPPPp',
    'pPPWPPp.pPPWPPp',
    'pPPPPPpkpPPPPPp',
    '.pPPPPpKpPPPPp.',
    '..pppp.k.pppp..',
    '.....pPPPp.....',
    '....pPp.pPp....',
    '...pPp...pPp...',
    '...pp.....pp...',
  ];
  sprite(x, bow, { p: '#c93d7e', P: '#ff6fae', W: '#ffd1e6', k: '#c93d7e', K: '#ff9ccc' }, mid - 7, 8 + mid - 7);
  return outlined(c, OUTLINE);
}

/** 4. Un bombón gigante adelante de la caja, con brillitos */
function optBigBall() {
  const box = paintBox({ stamps: false });
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
    px(x, cx + i, cy + j, edge ? '#a8692a' : (i + 40) % 3 === 0 ? '#3e2208' : (i + 40) % 3 === 1 ? '#6b3e12' : '#80501a');
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

export const GIFT1_OPTIONS = [
  { name: 'De frente, como la foto', paint: optFront },
  { name: 'Inclinada, como en la foto', paint: optTilted },
  { name: 'Envuelta con moño', paint: optRibbon },
  { name: 'Con un bombón gigante adelante', paint: optBigBall },
];

const cache = {};
/** imagen (data URL) de la opción `i` (0 a 3) */
export function gift1Url(i) {
  if (!cache[i]) cache[i] = GIFT1_OPTIONS[i].paint().toDataURL();
  return cache[i];
}
export function gift1Size(i) { const c = GIFT1_OPTIONS[i].paint(); return [c.width, c.height]; }

export function gift1Choice() {
  try { const v = Number(localStorage.getItem(GIFT1_KEY)); if (v >= 0 && v < GIFT1_OPTIONS.length) return v; } catch { /* nada */ }
  return 0;
}
export function setGift1Choice(i) { try { localStorage.setItem(GIFT1_KEY, String(i)); } catch { /* nada */ } }
