// Dibujos de las aguilitas: 4 versiones distintas (cada una con su aleteo) para elegir en Configuración →
// "Dibujos de las aguilitas". Todas miran a la derecha y miden 12×9 (más el borde), así se dibujan igual en
// todos lados. La elegida se guarda en el navegador.
import { makeCanvas, flipH, outlined } from './util.js';

const KEY = 'terra-regalos-pan:agui-art';
const LINE = '#22142b';

export const EAGLET_STYLES = [
  { name: 'Clásica', desc: 'La de siempre: dos posiciones de alas, aleteo rápido.' },
  { name: 'Aleteo suave', desc: 'Cuatro posiciones: las alas suben, pasan por el medio y bajan.' },
  { name: 'Planeadora', desc: 'Planea con las alas abiertas y cada tanto da unos aletazos.' },
  { name: 'Rapaz', desc: 'Más de águila: marrón oscuro, pico ganchudo y plumas en las puntas de las alas.' },
];

/** pinta un cuadro: body(P) dibuja el cuerpo y wing(P) las alas */
function frame(body, wing) {
  const [c, x] = makeCanvas(12, 9);
  const P = (a, b, w, h, col) => { x.fillStyle = col; x.fillRect(a, b, w, h); };
  body(P); wing(P);
  return outlined(c, LINE);
}

// ---- cuerpo de las primeras tres (la aguilita de siempre) ----
const baseBody = (P) => {
  P(0, 4, 2, 1, '#5a3218'); P(1, 5, 2, 1, '#5a3218');           // cola
  P(2, 3, 6, 3, '#8a5530'); P(3, 6, 4, 1, '#5a3218');           // cuerpo
  P(7, 1, 3, 3, '#f2e3c4'); P(7, 4, 2, 1, '#f2e3c4');           // cabeza blanca
  P(9, 2, 1, 1, '#1d1012');                                      // ojo
  P(10, 2, 2, 1, '#f2c14e'); P(10, 3, 1, 1, '#c98a2a');         // pico
  P(4, 7, 1, 1, '#f2c14e'); P(6, 7, 1, 1, '#f2c14e');           // patitas
};
const W1 = '#a374dc', W2 = '#c9a6ff', W3 = '#6a3fa6';
const wUp = (P) => { P(3, 1, 4, 2, W1); P(2, 0, 3, 1, W2); };
const wDown = (P) => { P(3, 5, 4, 2, W1); P(2, 7, 2, 1, W2); P(3, 3, 4, 1, W3); };
const wMid = (P) => { P(2, 3, 5, 2, W1); P(0, 3, 2, 1, W2); P(3, 5, 4, 1, W3); };
const wHigh = (P) => { P(4, 1, 3, 2, W1); P(3, 0, 3, 1, W2); P(5, 0, 1, 1, W1); };
const wLow = (P) => { P(3, 5, 4, 2, W1); P(3, 7, 3, 1, W2); P(3, 3, 4, 1, W3); P(4, 8, 1, 1, W2); };
const wGlide = (P) => { P(2, 2, 6, 2, W1); P(0, 2, 2, 1, W2); P(0, 1, 1, 1, W2); P(3, 4, 4, 1, W3); };

// ---- la rapaz: otro cuerpo ----
const R1 = '#7a4fc0', R2 = '#b48cf0', R3 = '#4e2f85';
const raptorBody = (P) => {
  P(0, 3, 1, 3, '#3e2412'); P(1, 4, 2, 2, '#4a2a14');           // cola en abanico
  P(2, 3, 6, 3, '#6b3f22'); P(3, 5, 4, 1, '#c9a06a');           // cuerpo y pancita clara
  P(3, 6, 4, 1, '#4a2a14');
  P(7, 1, 3, 3, '#f2e3c4'); P(7, 4, 2, 1, '#e2cfa8');           // cabeza
  P(8, 2, 1, 1, '#8a5530');                                      // rayita del ojo
  P(9, 2, 1, 1, '#1d1012');                                      // ojo
  P(10, 2, 1, 1, '#f2c14e'); P(11, 3, 1, 1, '#c98a2a'); P(10, 3, 1, 1, '#f2c14e'); // pico ganchudo
  P(4, 7, 1, 1, '#f2c14e'); P(6, 7, 1, 1, '#f2c14e');           // garritas
};
const rUp = (P) => { P(3, 1, 4, 2, R1); P(2, 0, 1, 1, R2); P(4, 0, 1, 1, R2); P(6, 0, 1, 1, R2); };
const rMid = (P) => { P(2, 3, 5, 1, R1); P(1, 2, 2, 1, R2); P(0, 3, 2, 1, R2); P(3, 4, 3, 1, R3); };
const rDown = (P) => { P(3, 5, 4, 2, R1); P(3, 7, 1, 1, R2); P(5, 7, 1, 1, R2); P(3, 3, 4, 1, R3); P(2, 8, 1, 1, R2); };

/** los cuadros (mirando a la derecha) y la velocidad de cada versión */
function paintStyle(i) {
  const f = (w) => frame(baseBody, w);
  if (i === 1) { const up = f(wHigh), mid = f(wMid), down = f(wLow); return { fps: 12, frames: [up, f(wUp), mid, down, mid, f(wUp)] }; }
  if (i === 2) {
    const g = f(wGlide), up = f(wUp), mid = f(wMid), down = f(wDown);
    return { fps: 10, frames: [g, g, g, g, g, g, up, mid, down, mid, up, mid, down, mid] };
  }
  if (i === 3) { const up = frame(raptorBody, rUp), mid = frame(raptorBody, rMid), down = frame(raptorBody, rDown); return { fps: 9, frames: [up, mid, down, mid] }; }
  return { fps: 10, frames: [f(wUp), f(wDown)] };
}

const CACHE = [];
/** cuadros de la versión i, para los dos lados */
export function eagletStyleSprites(i) {
  if (!CACHE[i]) {
    const { fps, frames } = paintStyle(i);
    CACHE[i] = { fps, right: frames, left: frames.map(flipH) };
  }
  return CACHE[i];
}

let current = null;
export function eagletStyle() {
  if (current === null) {
    let v = 0;
    try { v = parseInt(localStorage.getItem(KEY) || '0', 10) || 0; } catch { /* nada */ }
    current = v >= 0 && v < EAGLET_STYLES.length ? v : 0;
  }
  return current;
}
export function setEagletStyle(i) {
  current = i;
  try { localStorage.setItem(KEY, String(i)); } catch { /* nada */ }
}

/** el cuadro que toca ahora (t en segundos, ph para que no aleteen todas juntas) */
export function eagletFrame(facing, t, ph = 0, style = eagletStyle()) {
  const E = eagletStyleSprites(style), arr = E[facing > 0 ? 'right' : 'left'];
  return arr[Math.floor(t * E.fps + ph) % arr.length];
}
