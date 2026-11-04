// Aguilus, el águila mago que esconde los regalos: más alto y estilizado que los protagonistas.
// Sprite de 16x30 mirando a la derecha; el báculo se dibuja aparte para poder levantarlo.
import { mapSprite, flipH, makeCanvas } from './util.js';
import { STAFF } from './sprites.js';

export const AG_W = 16, AG_H = 30;

const BODY = [
  '..o.o.oo........',
  '.oHohohhoo......',
  'ohHhhhhhhhoo....',
  'oHhhhhghhhhho...',
  '.oHhhhhhhhhhho..',
  '.oHhhhhvvhhhho..',
  'ohhhhhhrvvyYYo..',
  'oHhhhhrwerryYYo.',
  'oCchhfrrrryyyYYo',
  '.oCfffffffoyoYYo',
  '.oCfFfFfFfo..oo.',
  '...oCdfffdCo....',
  '...oCcdfdcCo....',
  '...oCccdcccCo...',
  '...oCccdccccCoo.',
  '...oCzcdccccCso.',
  '...oCzllldlCoo..',
  '...oCcclcdcCo...',
  '...oCcclcdcCo...',
  '...oCcccdcccCo..',
  '..oCccccdcccCo..',
  '..oCccccdccccCo.',
  '..oCccccdccccCo.',
  '.oCcccccdccccCo.',
  '.oCcccccdcccccCo',
  '.oCcccccdcccccCo',
  '.odddddddddddddo',
  '.ooooooooooooooo',
  '....obbo.obbbo..',
  '....oooo.ooooo..',
];
// volando: la túnica flamea hacia atrás y no se ven los pies
const TAILS = [
  ['.oCcccccdccccCo.', 'ooCccccdccccCo..', 'oCcccdddddCo....', 'oCcddoo.oo......', 'odo.............', '................', '................'],
  ['.oCcccccdccccCo.', '.oCcccccdcccCo..', 'oCccccdddddCo...', 'oCddoooo.o......', '.oo.............', '................', '................'],
];

const PAL = {
  o: '#22142b', h: '#8a5530', H: '#5a3218', g: '#b07a4a', f: '#f2e3c4', F: '#d9c49c', r: '#d9603a',
  y: '#f2c14e', Y: '#9fb0a0', v: '#3a2014', w: '#ffffff', e: '#1d1012', E: '#3a2a1a',
  s: '#e8b48a', c: '#4a3070', C: '#2e1c4a', d: '#a374dc', z: '#c9c0b0', l: '#c9a26b', b: '#6b4429',
};

const closed = (rows) => rows.map((r, i) => (i === 7 ? r.replace(/[weE]/g, 'r') : r));

function build(rows) {
  const right = mapSprite(rows, PAL);
  // versión toda blanca para el destello al recibir un golpe
  const [w, x] = makeCanvas(AG_W, AG_H);
  x.drawImage(right, 0, 0);
  x.globalCompositeOperation = 'source-atop';
  x.fillStyle = '#ffffff';
  x.fillRect(0, 0, AG_W, AG_H);
  return { right, left: flipH(right), flashR: w, flashL: flipH(w) };
}

let F = null;
function frames() {
  if (F) return F;
  F = {
    idle: build(BODY),
    blink: build(closed(BODY)),
    flyA: build(BODY.slice(0, 23).concat(TAILS[0])),
    flyB: build(BODY.slice(0, 23).concat(TAILS[1])),
    weak: build(closed(BODY)),
  };
  return F;
}

/** Retrato para la caja de diálogo (18x24, como los demás) */
let portraitURL = null;
export function aguilusPortrait() {
  if (portraitURL) return portraitURL;
  const [c, x] = makeCanvas(18, 24);
  x.drawImage(frames().idle.right, 1, 1);
  return (portraitURL = c.toDataURL());
}

/**
 * Dibuja a Aguilus con los pies en (x, y) (x = centro).
 * pose: 'idle' | 'cast' | 'fly' | 'weak' | 'hurt' ; flash: destello blanco del golpe
 */
export function drawAguilus(ctx, x, y, facing, pose, t, flash = false) {
  const fr = frames();
  let f = fr.idle, bob = 0;
  if (pose === 'fly' || pose === 'cast' || pose === 'hurt') {
    f = Math.floor(t * 7) % 2 ? fr.flyB : fr.flyA;
    bob = Math.round(Math.sin(t * 4) * 1);
  } else if (pose === 'weak') f = fr.weak;
  else if (t % 3.9 > 3.75) f = fr.blink;
  const sx = Math.round(x - AG_W / 2), sy = Math.round(y - AG_H) + bob;
  const R = facing > 0;
  if (pose === 'weak') {
    // tirado en el piso: agachado, sin báculo y con estrellitas dando vueltas
    ctx.drawImage(R ? f.right : f.left, 0, 0, AG_W, 26, sx, sy + 6, AG_W, 26);
    for (let i = 0; i < 3; i++) {
      const a = t * 4 + i * 2.1;
      ctx.fillStyle = i % 2 ? '#ffd34d' : '#fff4e0';
      ctx.fillRect(Math.round(x + Math.cos(a) * 7), Math.round(sy + 4 + Math.sin(a) * 2), 1, 1);
    }
    // el báculo quedó tirado al lado
    ctx.save();
    ctx.translate(Math.round(x + (R ? 9 : -9)), Math.round(y - 1));
    ctx.rotate(Math.PI / 2 * (R ? 1 : -1));
    ctx.drawImage(STAFF, -2, -10);
    ctx.restore();
    return;
  }
  // báculo en la mano de adelante; al lanzar un hechizo lo levanta y el orbe brilla
  const hx = R ? sx + 11 : sx + AG_W - 16, raise = pose === 'cast' ? -7 : 0;
  const sy2 = sy + 1 + raise;
  if (pose === 'cast') {
    const r = 6 + Math.sin(t * 20) * 1.5;
    ctx.fillStyle = 'rgba(201,140,255,0.35)';
    ctx.beginPath(); ctx.arc(hx + 2.5, sy2 + 2.5, r + 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,200,120,0.5)';
    ctx.beginPath(); ctx.arc(hx + 2.5, sy2 + 2.5, r * 0.6, 0, Math.PI * 2); ctx.fill();
  }
  ctx.drawImage(STAFF, hx, sy2);
  ctx.drawImage(flash ? (R ? f.flashR : f.flashL) : (R ? f.right : f.left), sx, sy);
  // mano sobre el báculo
  ctx.fillStyle = PAL.s;
  ctx.fillRect(hx + 2, sy + 15 + raise, 1, 2);
}
