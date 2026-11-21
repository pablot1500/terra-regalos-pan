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
