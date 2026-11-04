// Sandbox de personajes: se abre con ?sandbox en la misma página del juego
// (así anda en cualquier hosting, sin depender de una página aparte).
import { getCharFrames, drawArmShovel, drawDrill, CHAR_W, CHAR_H } from './sprites.js';
import { drawAguilus } from './aguilus.js';
import { drawTrailer, TRAILER_W, TRAILER_H } from './structures.js';
import { makeCanvas } from './util.js';

const CSS = `
:root { --ink: #120c16; --panel: #2b1f33; --panel-2: #3a2b45; --cream: #fff4e0; --muted: #cdb8d8; --pink: #ff7eb6; --gold: #ffd34d; }
* { box-sizing: border-box; }
body { margin: 0; background: #1d1424; color: var(--cream); font-family: 'Pixelify Sans', monospace; }
header { padding: 16px 20px 8px; }
h1 { margin: 0; font-size: 26px; color: var(--pink); }
h1 small { color: var(--muted); font-size: 15px; font-weight: 400; margin-left: 8px; }
h2 { font-size: 18px; color: var(--gold); margin: 22px 20px 10px; }
.controls { display: flex; flex-wrap: wrap; gap: 10px 18px; padding: 10px 20px; background: var(--panel); border-top: 3px solid var(--ink); border-bottom: 3px solid var(--ink); position: sticky; top: 0; z-index: 2; }
.controls label { display: flex; align-items: center; gap: 6px; font-size: 14px; color: var(--muted); }
select, input[type=range] { font-family: inherit; font-size: 14px; }
select { background: var(--panel-2); color: var(--cream); border: 2px solid var(--ink); padding: 3px 6px; }
output { color: var(--cream); min-width: 2ch; display: inline-block; }
.grid { display: flex; flex-wrap: wrap; gap: 16px; padding: 0 20px; }
.card { background: var(--panel); border: 3px solid var(--ink); padding: 12px; }
.card h3 { margin: 0 0 2px; font-size: 18px; }
.card p { margin: 0 0 10px; color: var(--muted); font-size: 13px; max-width: 360px; }
.stage { display: block; border: 2px solid var(--ink); image-rendering: pixelated; }
.strip { display: flex; gap: 6px; margin-top: 10px; flex-wrap: wrap; }
.strip figure { margin: 0; text-align: center; font-size: 11px; color: var(--muted); }
.strip canvas { display: block; image-rendering: pixelated; border: 2px solid var(--ink); }
.scene { padding: 0 20px 30px; }
.scene canvas { image-rendering: pixelated; border: 3px solid var(--ink); max-width: 100%; }
a { color: var(--pink); }
  
body.sandbox { overflow: auto; height: auto; position: static; touch-action: auto; user-select: auto; }
`;

const HTML = `
<header>
  <h1>Sandbox de personajes <small>para revisar los modelos y pedir cambios · <a href="./">volver al juego</a></small></h1>
</header>
<div class="controls">
  <label>Zoom <input id="zoom" type="range" min="3" max="14" value="7"><output id="zoom-o"></output></label>
  <label>Animación
    <select id="anim">
      <option value="idle">Quieto</option>
      <option value="walk">Caminando</option>
      <option value="air">En el aire</option>
      <option value="fly">Volando</option>
      <option value="dig">Cavando</option>
    </select>
  </label>
  <label>Mira a
    <select id="facing"><option value="1">la derecha</option><option value="-1">la izquierda</option></select>
  </label>
  <label>Herramienta
    <select id="tool">
      <option value="0">Pala (nivel 0)</option>
      <option value="1">Pala (nivel 1)</option>
      <option value="2">Pala (nivel 2)</option>
      <option value="3">Taladro</option>
      <option value="5">Taladro diamante</option>
      <option value="7">Taladro cósmico</option>
      <option value="none">Nada</option>
    </select>
  </label>
  <label>Jetpack <input id="jet" type="range" min="0" max="7" value="0"><output id="jet-o"></output></label>
  <label>Casco <input id="helmet" type="range" min="0" max="6" value="0"><output id="helmet-o"></output></label>
  <label>Fondo
    <select id="bg">
      <option value="sky">Cielo</option>
      <option value="dirt">Tierra</option>
      <option value="dark">Oscuro</option>
      <option value="check">Cuadriculado</option>
    </select>
  </label>
</div>

<h2>Personajes</h2>
<div class="grid" id="chars"></div>

<h2>Taller (casa rodante)</h2>
<div class="scene"><canvas id="trailer"></canvas></div>


`;

document.title = 'Cumple Panchita · Sandbox';
document.getElementById('app')?.remove();
document.querySelector('link[href="styles.css"]')?.remove();
document.body.className = 'sandbox';
const style = document.createElement('style');
style.textContent = CSS;
document.head.appendChild(style);
document.body.insertAdjacentHTML('afterbegin', HTML);
const CHARS = [
  ['pablo', 'Pablo', 'Pelo negro ondulado con volumen, barba de unos días, remera violeta, pantalón negro y zapatillas blancas.'],
  ['pancha', 'Panchi', 'Pelo largo castaño cobrizo, remera blanca, jean azul y zapatillas negras con cordones celestes.'],
  ['carlos', 'Carlos', 'Pelado, flaquito y con cara amigable: camisa celeste y pantalón caqui.'],
  ['aguilus', 'Aguilus', 'Águila mago (el jefe): más alto y estilizado, cresta castaña, antifaz rojizo, pico ganchudo, túnica violeta larga y báculo con orbe.'],
];
const FRAMES = ['idle', 'idleB', 'blink', 'walkA', 'walkB', 'walkC', 'air'];
const AG_FRAMES = ['idle', 'cast', 'fly', 'hurt', 'weak'];
const STRIKE_AT = 0.62;
const $ = (id) => document.getElementById(id);
const opts = () => ({
  zoom: +$('zoom').value, anim: $('anim').value, facing: +$('facing').value,
  tool: $('tool').value, jet: +$('jet').value, helmet: +$('helmet').value, bg: $('bg').value,
});
for (const k of ['zoom', 'jet', 'helmet']) {
  const sync = () => { $(k + '-o').textContent = $(k).value; };
  $(k).addEventListener('input', sync); sync();
}

// escena chica a resolución nativa: el personaje parado en el piso
const SW = 32, SH = 44, GROUND = 40;
function paintBg(x, w, h, bg, ground) {
  if (bg === 'sky') {
    x.fillStyle = '#9fd6f5'; x.fillRect(0, 0, w, h);
    x.fillStyle = '#c8b9a4'; x.fillRect(0, ground, w, h - ground);
    x.fillStyle = '#e6dfd1'; x.fillRect(0, ground, w, 1);
  } else if (bg === 'dirt') {
    x.fillStyle = '#4a2f22'; x.fillRect(0, 0, w, h);
    x.fillStyle = '#7a4f33'; x.fillRect(0, ground, w, h - ground);
    x.fillStyle = '#9b6a43'; x.fillRect(0, ground, w, 1);
  } else if (bg === 'dark') {
    x.fillStyle = '#120c16'; x.fillRect(0, 0, w, h);
    x.fillStyle = '#2b1f33'; x.fillRect(0, ground, w, h - ground);
  } else {
    for (let yy = 0; yy < h; yy += 2) for (let xx = 0; xx < w; xx += 2) {
      x.fillStyle = ((xx + yy) / 2) % 2 ? '#d9d4dc' : '#f4f1f5'; x.fillRect(xx, yy, 2, 2);
    }
  }
}

function drawChar(x, id, o, t, frameOverride) {
  if (id === 'aguilus') {
    // el jefe tiene su propio sprite: quieto, lanzando un hechizo, volando, golpeado o tirado
    const pose = frameOverride || { walk: 'idle', air: 'fly', fly: 'fly', dig: 'cast' }[o.anim] || 'idle';
    const up = pose === 'fly' || pose === 'cast' || pose === 'hurt' ? 4 : 0;
    drawAguilus(x, SW / 2, GROUND - up, o.facing, pose, t, pose === 'hurt' && Math.floor(t * 10) % 2 === 0);
    return;
  }
  const frames = getCharFrames(id, o.jet, o.helmet)[o.facing > 0 ? 'right' : 'left'];
  let frame = frameOverride;
  let arm = 1.0, sh = 1.05, len = 4;
  const walkT = t;
  if (!frame) {
    if (o.anim === 'walk') {
      frame = ['walkA', 'walkB', 'walkC', 'walkB'][Math.floor(walkT * 9) % 4];
      const sw = Math.sin(walkT * 9 * Math.PI / 2); arm = 1.0 + sw * 0.25; sh = 0.95 + sw * 0.2; len = 4;
    } else if (o.anim === 'air') { frame = 'air'; arm = -0.4; sh = -0.95; len = 5; }
    else if (o.anim === 'fly') { frame = 'air'; arm = 1.1; sh = 1.35; len = 5; }
    else {
      const b = t % 3.4;
      frame = b > 3.25 ? 'blink' : (t % 1.6) > 1.0 ? 'idleB' : 'idle';
    }
  }
  const bob = frame === 'idleB' || frame === 'walkB' ? 1 : 0;
  const sx = Math.round(SW / 2 - CHAR_W / 2), sy = GROUND - CHAR_H - (o.anim === 'air' || o.anim === 'fly' ? 4 : 0);
  if (o.anim === 'fly' && !frameOverride) {
    const nx = o.facing > 0 ? sx + 1 : sx + CHAR_W - 3, l = 3 + Math.floor((t * 20) % 3);
    x.fillStyle = '#ff8a3d'; x.fillRect(nx, sy + 16, 2, l);
    x.fillStyle = '#ffd34d'; x.fillRect(nx, sy + 16, 2, l - 2);
    x.fillStyle = '#ffffff'; x.fillRect(nx, sy + 16, 2, 1);
  }
  x.drawImage(frames[frame], sx, sy);
  if (o.tool === 'none') return;
  const lvl = +o.tool, drill = lvl >= 3;
  let digging = o.anim === 'dig' && !frameOverride;
  if (digging) {
    const a = 0.5;
    if (drill) { arm = a + (Math.random() - 0.5) * 0.12; sh = arm; len = 6; }
    else {
      const p = (t * 1.6) % 1;
      if (p < STRIKE_AT) { const e = (p / STRIKE_AT) ** 2; arm = a + 0.2 - e * 1.9; sh = a + 0.1 - e * 2.1; }
      else { const s = (p - STRIKE_AT) / (1 - STRIKE_AT); arm = a - 1.7 + s * 1.9; sh = a - 2.0 + s * 2.1; }
      len = 7;
    }
  }
  if (drill) drawDrill(x, sx, sy, o.facing, bob, digging ? arm : 0.9, lvl, id, digging ? t : 0);
  else drawArmShovel(x, sx, sy, o.facing, bob, arm, sh, lvl, id, len);
}

const cards = CHARS.map(([id, name, desc]) => {
  const card = document.createElement('div');
  card.className = 'card';
  card.innerHTML = `<h3>${name}</h3><p>${desc}</p>`;
  const stage = document.createElement('canvas');
  stage.className = 'stage';
  card.appendChild(stage);
  const strip = document.createElement('div');
  strip.className = 'strip';
  const thumbs = (id === 'aguilus' ? AG_FRAMES : FRAMES).map((f) => {
    const fig = document.createElement('figure');
    const c = document.createElement('canvas');
    fig.appendChild(c);
    fig.appendChild(Object.assign(document.createElement('figcaption'), { textContent: f }));
    strip.appendChild(fig);
    return [f, c];
  });
  card.appendChild(strip);
  $('chars').appendChild(card);
  const [buf, bx] = makeCanvas(SW, SH);
  return { id, stage, thumbs, buf, bx };
});

function blit(dst, src, z) {
  if (dst.width !== src.width * z) { dst.width = src.width * z; dst.height = src.height * z; }
  const x = dst.getContext('2d');
  x.imageSmoothingEnabled = false;
  x.clearRect(0, 0, dst.width, dst.height);
  x.drawImage(src, 0, 0, dst.width, dst.height);
}

let lastStatic = '';
function frame(now) {
  const t = now / 1000, o = opts();
  for (const c of cards) {
    paintBg(c.bx, SW, SH, o.bg, GROUND);
    drawChar(c.bx, c.id, o, t);
    blit(c.stage, c.buf, o.zoom);
  }
  // los cuadros sueltos solo se redibujan si cambian las opciones
  const key = JSON.stringify({ ...o, anim: 0 });
  if (key !== lastStatic) {
    lastStatic = key;
    const z = Math.max(2, Math.round(o.zoom / 3));
    for (const c of cards) for (const [f, cv] of c.thumbs) {
      const [b, x] = makeCanvas(SW, SH);
      paintBg(x, SW, SH, o.bg, GROUND);
      drawChar(x, c.id, { ...o, anim: 'idle' }, 0, f);
      blit(cv, b, z);
    }
    const [b, x] = makeCanvas(TRAILER_W + 40, TRAILER_H + 12);
    paintBg(x, b.width, b.height, o.bg === 'check' ? 'check' : 'sky', TRAILER_H + 4);
    drawTrailer(x, 20, 4, 0);
    // Pablo frente a la ventanita, para ver la escala
    x.drawImage(getCharFrames('pablo').right.idle, 20 + 28, TRAILER_H + 4 - CHAR_H);
    blit($('trailer'), b, Math.max(3, Math.min(8, Math.floor((innerWidth - 60) / b.width))));
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
  
