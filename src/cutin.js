// Primeros planos "de historieta" en las escenas: un recuadro grande con líneas de velocidad, un golpe de
// impacto (temblor y destello) y el dibujo en primer plano. Se usan en la escena de la pelea con Aguilus:
// los pies de Aguilus con las zapatillas puestas.
import { shoeCanvas } from './giftart.js';
import { makeCanvas } from './util.js';

const W = 160, H = 90;

/** los pies de Aguilus: el borde de la túnica violeta, las patitas y las zapatillas */
function paintShoes() {
  const [c, x] = makeCanvas(W, H);
  const R = (a, b, w, h, col) => { x.fillStyle = col; x.fillRect(a, b, w, h); };
  // la túnica, arriba
  R(18, 0, 124, 22, '#4a3070'); R(18, 0, 124, 4, '#2e1c4a');
  for (let i = 18; i < 142; i += 6) R(i + 2, 4, 1, 16, '#3c2560');      // pliegues
  R(18, 20, 124, 3, '#a374dc'); R(18, 23, 124, 1, '#22142b');           // el ribete
  // las zapatillas: cada pata baja hasta adentro de la suya (la zapatilla se dibuja encima y tapa la punta,
  // así parece que el pie entra por el cuello)
  const SHOES = [{ lx: 36, sx: 28, sy: 48 }, { lx: 90, sx: 82, sy: 44 }];
  // las patas (de pájaro, pero no tan flaquitas), con las escamitas
  for (const { lx, sy } of SHOES) {
    const h = sy + 14 - 24;
    R(lx, 24, 11, h, '#c9a26b'); R(lx, 24, 3, h, '#e0be86'); R(lx + 9, 24, 2, h, '#8a6a3c');
    for (let y = 28; y < 24 + h - 4; y += 5) R(lx + 3, y, 6, 1, '#a9844f');
    R(lx - 1, 24, 13, 2, '#22142b');
  }
  const s = shoeCanvas(66, 36);
  for (const { sx, sy } of [...SHOES].reverse()) x.drawImage(s, sx, sy); // la de la derecha atrás
  return c;
}

const KINDS = {
  shoes: { paint: paintShoes, bg: ['#2a1640', '#ffd34d'], dark: '#1a0e28' },
};
const cache = {};

let raf = 0;
/** muestra un primer plano (kind: 'shoes') hasta hideCutin() */
export function showCutin(kind) {
  const K = KINDS[kind];
  const root = document.getElementById('cutin');
  const cv = root.querySelector('canvas');
  cv.width = W; cv.height = H;
  const x = cv.getContext('2d');
  const art = cache[kind] || (cache[kind] = K.paint());
  root.classList.remove('hidden');
  root.classList.remove('go'); void root.offsetWidth; root.classList.add('go'); // entra con un golpe
  cancelAnimationFrame(raf);
  const t0 = performance.now();
  const frame = (now) => {
    const t = (now - t0) / 1000;
    x.fillStyle = K.bg[0]; x.fillRect(0, 0, W, H);
    // líneas de velocidad desde el centro (titilan)
    x.fillStyle = K.dark;
    for (let k = 0; k < 18; k++) {
      const a = (k / 18) * Math.PI * 2 + Math.floor(t * 12) * 0.05;
      x.beginPath(); x.moveTo(W / 2, H / 2);
      x.lineTo(W / 2 + Math.cos(a - 0.06) * 200, H / 2 + Math.sin(a - 0.06) * 200);
      x.lineTo(W / 2 + Math.cos(a + 0.06) * 200, H / 2 + Math.sin(a + 0.06) * 200);
      x.closePath(); x.fill();
    }
    x.fillStyle = K.bg[1]; x.globalAlpha = 0.25;
    for (let k = 0; k < 9; k++) {
      const a = (k / 9) * Math.PI * 2 - t * 0.7;
      x.beginPath(); x.moveTo(W / 2, H / 2);
      x.lineTo(W / 2 + Math.cos(a - 0.03) * 200, H / 2 + Math.sin(a - 0.03) * 200);
      x.lineTo(W / 2 + Math.cos(a + 0.03) * 200, H / 2 + Math.sin(a + 0.03) * 200);
      x.closePath(); x.fill();
    }
    x.globalAlpha = 1;
    // el dibujo: un sacudón cortito al entrar y después quieto (así se entiende)
    const sh = t < 0.18 ? 1 : 0;
    x.drawImage(art, Math.round(Math.sin(t * 70) * sh), 0);
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
}

export function hideCutin() {
  cancelAnimationFrame(raf);
  const root = document.getElementById('cutin');
  if (root) root.classList.add('hidden');
}
