// Dibujo de las aguilitas: la "rapaz" (marrón oscuro, pico ganchudo y plumas en las puntas de las alas),
// con cuatro posiciones de alas. Mira a la derecha y mide 12×9 (más el borde).
import { makeCanvas, flipH, outlined } from './util.js';

const LINE = '#22142b';
const FPS = 9;

/** pinta un cuadro: el cuerpo y las alas */
function frame(wing) {
  const [c, x] = makeCanvas(12, 9);
  const P = (a, b, w, h, col) => { x.fillStyle = col; x.fillRect(a, b, w, h); };
  P(0, 3, 1, 3, '#3e2412'); P(1, 4, 2, 2, '#4a2a14');           // cola en abanico
  P(2, 3, 6, 3, '#6b3f22'); P(3, 5, 4, 1, '#c9a06a');           // cuerpo y pancita clara
  P(3, 6, 4, 1, '#4a2a14');
  P(7, 1, 3, 3, '#f2e3c4'); P(7, 4, 2, 1, '#e2cfa8');           // cabeza
  P(8, 2, 1, 1, '#8a5530');                                      // rayita del ojo
  P(9, 2, 1, 1, '#1d1012');                                      // ojo
  P(10, 2, 1, 1, '#f2c14e'); P(11, 3, 1, 1, '#c98a2a'); P(10, 3, 1, 1, '#f2c14e'); // pico ganchudo
  P(4, 7, 1, 1, '#f2c14e'); P(6, 7, 1, 1, '#f2c14e');           // garritas
  wing(P);
  return outlined(c, LINE);
}

const R1 = '#7a4fc0', R2 = '#b48cf0', R3 = '#4e2f85';
const up = (P) => { P(3, 1, 4, 2, R1); P(2, 0, 1, 1, R2); P(4, 0, 1, 1, R2); P(6, 0, 1, 1, R2); };
const mid = (P) => { P(2, 3, 5, 1, R1); P(1, 2, 2, 1, R2); P(0, 3, 2, 1, R2); P(3, 4, 3, 1, R3); };
const down = (P) => { P(3, 5, 4, 2, R1); P(3, 7, 1, 1, R2); P(5, 7, 1, 1, R2); P(3, 3, 4, 1, R3); P(2, 8, 1, 1, R2); };

let SPR = null;
/** los cuadros del aleteo, para los dos lados */
export function eagletSprites() {
  if (!SPR) {
    const m = frame(mid), right = [frame(up), m, frame(down), m];
    SPR = { right, left: right.map(flipH) };
  }
  return SPR;
}

/** el cuadro que toca ahora (t en segundos, ph para que no aleteen todas juntas) */
export function eagletFrame(facing, t, ph = 0) {
  const arr = eagletSprites()[facing > 0 ? 'right' : 'left'];
  return arr[Math.floor(t * FPS + ph) % arr.length];
}
