// La apertura del cofre: el cofre grande en el medio de la pantalla, que se abre en tres golpes (tac, tac, tac)
// con la luz escapándose cada vez más, y al final un destello blanco; detrás del destello aparece el cartel del regalo.
// Es una capa HTML con su propio reloj, así anda igual en el juego y en "Ver cómo queda" desde Configuración.
import { drawChest } from './sprites.js';

const W = 84, H = 64;          // resolución del dibujo (se agranda con píxeles nítidos)
const CX = 42, CY = 50;        // dónde está el cofre (centro de abajo)
const S = 3;                   // el cofre, de 15x11, se dibuja 3 veces más grande
const STEPS = [0.85, 1.4, 1.95]; // los tres golpes
const BURST = 2.55;            // se abre del todo y destello
const END = 2.75;              // aparece el cartel (detrás del destello)
const FADE = 0.55;             // lo que tarda en irse el destello

/** el cofre con la tapa levantada `gap` píxeles (luz dorada saliendo por la rendija) */
function drawChestGap(x, ox, oy, gap, glow) {
  const R = (a, b, w, h, c) => { x.fillStyle = c; x.fillRect(ox + a, oy + b, w, h); };
  const O = '#3a2117', W1 = '#8a5230', W2 = '#a8693d', D = '#6b3c22', Au = '#e2b33c', Au2 = '#fff0a0';
  // cuerpo
  R(0, 5, 15, 6, O); R(1, 5, 13, 5, W1); R(1, 7, 13, 1, D);
  R(1, 5, 1, 5, Au); R(13, 5, 1, 5, Au);
  // tapa (levantada y un poquito inclinada hacia atrás: el frente sube un pixel más)
  const ly = -gap;
  R(1, ly, 13, 1, O); R(0, ly + 1, 15, 5, O);
  R(1, ly + 1, 13, 4, W2); R(2, ly + 1, 11, 1, '#c98552');
  R(1, ly + 1, 1, 4, Au); R(13, ly + 1, 1, 4, Au);
  R(0, ly + 4, 15, 2, Au); R(0, ly + 4, 15, 1, Au2);
  // luz por la rendija, entre la tapa y el cofre
  if (gap > 0) {
    R(0, 6 - gap, 15, gap, `rgba(255,236,150,${0.75 + glow * 0.25})`);
    R(2, 6 - gap, 11, gap, '#fffbe6');
  }
  // candado corazón (al último golpe se suelta y queda colgando)
  const hy = ly + (gap >= 3 ? 2 : 0);
  R(5, hy + 3, 2, 1, '#ff5d8f'); R(8, hy + 3, 2, 1, '#ff5d8f');
  R(5, hy + 4, 5, 2, '#ff5d8f'); R(6, hy + 6, 3, 1, '#ff5d8f'); R(7, hy + 7, 1, 1, '#ff5d8f');
  R(5, hy + 3, 1, 1, '#ffc2d6');
}

/** rayos de luz girando desde el cofre (se desvanecen antes del borde) */
function rays(x, cx, cy, n, len, a0, alpha, col) {
  const g = x.createRadialGradient(cx, cy, 2, cx, cy, len);
  g.addColorStop(0, col); g.addColorStop(0.55, col); g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g;
  x.globalAlpha = alpha;
  for (let k = 0; k < n; k++) {
    const a = a0 + (k / n) * Math.PI * 2, w = 0.09;
    x.beginPath(); x.moveTo(cx, cy);
    x.lineTo(cx + Math.cos(a - w) * len, cy + Math.sin(a - w) * len);
    x.lineTo(cx + Math.cos(a + w) * len, cy + Math.sin(a + w) * len);
    x.closePath(); x.fill();
  }
  x.globalAlpha = 1;
}

let running = null;

/**
 * Muestra la apertura del cofre y llama a `onReveal` en el momento del destello (para mostrar el cartel detrás).
 * `audio` es el de juego (para los golpes y el destello). Con `empty`, el cofre está vacío: se abre, sale
 * un poco de polvo, no hay destello, y se queda un ratito mostrando que no hay nada.
 */
export function playChestOpen(audio, onReveal, { empty = false } = {}) {
  if (running) running.stop(false);
  const root = document.getElementById('chest-open');
  const cv = root.querySelector('canvas'), flash = root.querySelector('.co-flash');
  const x = cv.getContext('2d');
  cv.width = W; cv.height = H;
  root.classList.remove('hidden', 'out');
  flash.style.opacity = 0;
  const parts = [];
  const t0 = performance.now();
  let step = 0, revealed = false, raf = 0, last = t0;
  const burst = (n, sp, cols) => {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = sp * (0.4 + Math.random() * 0.8);
      parts.push({ x: CX, y: CY - 6 * S, vx: Math.cos(a) * v, vy: Math.sin(a) * v - sp * 0.3, life: 0.6 + Math.random() * 0.7, col: cols[i % cols.length] });
    }
  };
  const stop = (reveal = true) => {
    cancelAnimationFrame(raf);
    running = null;
    if (reveal && !revealed) { revealed = true; onReveal && onReveal(); }
    root.classList.add('hidden');
  };
  const frame = (now) => {
    const t = (now - t0) / 1000, dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    // los tres golpes
    while (step < 3 && t >= STEPS[step]) {
      step++;
      audio.play('click'); audio.play('clink');
      burst(6 + step * 4, 18 + step * 6, ['#ffd34d', '#fff0a0', '#ff9ccc']);
    }
    if (t >= BURST && step === 3) {
      step = 4;
      if (empty) {
        // vacío: un "clonc" y polvo gris
        audio.play('clink'); audio.play('deny');
        for (let i = 0; i < 26; i++) parts.push({ x: CX + (Math.random() - 0.5) * 20, y: CY - 6 * S, vx: (Math.random() - 0.5) * 20, vy: -8 - Math.random() * 14, life: 0.8 + Math.random() * 0.6, col: Math.random() < 0.5 ? '#8a8090' : '#5d5560' });
      } else {
        audio.play('chest'); audio.play('magic');
        burst(60, 60, ['#ffffff', '#ffd34d', '#ff9ccc', '#8fe9ff', '#fff0a0']);
      }
    }
    // destello: sube de golpe, y cuando ya aparece el cartel se va despacito (vacío: sin destello)
    const end = empty ? END + 1.1 : END;
    let fl = 0;
    if (!empty && t >= BURST) fl = Math.min(1, (t - BURST) / 0.12);
    if (!empty && t >= end) fl = Math.max(0, 1 - (t - end) / FADE);
    flash.style.opacity = fl.toFixed(3);
    if (t >= end && !revealed) {
      revealed = true;
      root.classList.add('out'); // el fondo oscuro se va: queda el destello arriba del cartel
      onReveal && onReveal();
    }
    // dibujo
    x.clearRect(0, 0, W, H);
    const k = step >= 4 ? 1 : step / 3;
    const pre = Math.min(1, t / 0.35);
    // el cofre cae desde arriba y rebota
    let dy = 0;
    if (t < 0.35) dy = -(1 - pre) * 70;
    else if (t < 0.6) dy = -Math.sin(((t - 0.35) / 0.25) * Math.PI) * 4;
    // cada golpe: un saltito y temblor
    const since = step && step < 4 ? t - STEPS[step - 1] : 9;
    if (since < 0.18) dy -= Math.sin((since / 0.18) * Math.PI) * (2 + step);
    const shake = step < 4 && t > 0.6 && t < BURST ? Math.round(Math.sin(t * 60) * (k * 0.8)) : 0;
    // rayos (cada vez más fuertes)
    if (step && !(empty && step >= 4)) {
      const cyR = CY - 6 * S + dy, len = 22 + k * 10 + (step >= 4 ? 10 : 0);
      rays(x, CX, cyR, 12, len, t * 0.6, 0.18 + k * 0.3, '#ffe38a');
      rays(x, CX, cyR, 12, len, -t * 0.4 + 0.26, 0.1 + k * 0.2, '#ff9ccc');
    }
    x.save();
    x.translate(Math.round(CX - 7.5 * S) + shake, Math.round(CY - 11 * S + dy));
    x.scale(S, S);
    if (step >= 4) {
      drawChest(x, 0, 0, 1);
      // vacío: adentro está oscuro (sin el brillo dorado) y hay una telita de araña
      if (empty) { x.fillStyle = '#2a1410'; x.fillRect(1, 2, 13, 3); x.fillStyle = '#9a909e'; x.fillRect(2, 2, 1, 1); x.fillRect(3, 3, 1, 1); x.fillRect(4, 2, 1, 1); x.fillRect(3, 2, 1, 1); }
    } else drawChestGap(x, 0, 0, step, k);
    x.restore();
    // chispas
    for (const p of parts) {
      p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 40 * dt;
      if (p.life <= 0) continue;
      x.fillStyle = p.col; x.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
    }
    for (let i = parts.length - 1; i >= 0; i--) if (parts[i].life <= 0) parts.splice(i, 1);
    if (t >= end + FADE) { stop(); return; }
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  running = { stop };
}

/** corta la apertura si se está mostrando (por ejemplo, si saltean la escena) */
export function stopChestOpen() { if (running) running.stop(false); }

/** ¿se está mostrando la apertura? */
export function chestOpening() { return !!running; }
