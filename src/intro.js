// Cinemática de inicio: Pablo y Panchi llegan al edificio, entran al departamento,
// buscan los regalos debajo de la cama y encuentran una nota misteriosa.
// Cada `yield` espera a que termine lo anterior (ver scene.js).
import { TILE, SURFACE } from './config.js';
import { DOG_POS } from './structures.js';

const FLOOR = SURFACE * TILE;          // piso del patio y del departamento de planta baja

export const NOTE_TEXT = `Querida cumpleañera:

Este año TAMPOCO te vas a salvar.

Tus regalos ya no están acá: me los llevé muy, muy, MUY abajo, donde la tierra se pone calentita.

Si los querés, van a tener que cavar.

— Anónimo

P.D.: Traigan pala. Y paciencia.`;

export function* introScript(sc) {
  const g = sc.g;
  const A = sc.actors;
  // la cámara arranca en el cielo (donde estaba el botón de empezar) y baja hasta el patio;
  // recién cuando llega aparecen los dos, entrando caminando desde la derecha
  const SPOT = 560;
  sc.actor('pancha', SPOT, FLOOR, { phase: 0, hidden: true });
  sc.actor('pablo', SPOT, FLOOR, { phase: 1.3, hidden: true });
  sc.fixed = { x: SPOT, y: FLOOR, k: 0.6 };
  sc.ui.fade(false);
  yield sc.descend(7.5, 1.5);
  sc.caption('El día del cumple de Panchita...');
  yield sc.wait(0.5);
  const edge = SPOT + sc.viewW() / 2;
  Object.assign(A.pancha, { x: edge + 10, hidden: false });
  Object.assign(A.pablo, { x: edge + 30, hidden: false });
  sc.walk('pancha', 470, 42); sc.walk('pablo', 492, 42);
  yield () => A.pancha.x < SPOT + 40;
  sc.fixed = null;
  sc.follow = ['pancha', 'pablo'];
  sc.camSpeed = 1.6;
  yield sc.wait(1.4);
  sc.camSpeed = null;
  A.pancha.speed = 30; A.pablo.speed = 30;
  sc.caption(null);
  yield sc.say('pancha', '¡Llegamos! ¡Qué lindo festejar mi cumple juntos otra vez!');
  yield sc.say('pablo', 'Otro año más aguantándome... sos una campeona.');
  yield sc.arrive('pancha', 'pablo');

  // Popi los recibe en el patio
  g.audio.play('bark');
  g.addText(DOG_POS.x + 10, DOG_POS.y - 2, '¡GUAU!', '#fff4e0');
  for (let i = 0; i < 3; i++) g.particles.add({ x: DOG_POS.x + 6 + i * 3, y: DOG_POS.y - 2, vx: (i - 1) * 6, vy: -14, life: 1.2, max: 1.2, heart: true, grav: 0 });
  yield sc.say('pancha', '¡Popi! ¿Cuidaste la casa mientras no estábamos?');
  yield sc.say('popi', 'Guau. (Traducción: más o menos.)');

  sc.walk('pancha', 178); sc.walk('pablo', 198);
  yield sc.say('pancha', '¿Te acordás de lo que pasó el año pasado con los regalos?');
  yield sc.say('pablo', 'Ni me lo nombres. Todavía tengo pesadillas.');
  yield sc.say('pablo', 'Pero tranqui: este año los escondí yo. Lugar ultra secreto. Imposible que falle.');
  yield sc.say('pancha', 'Mmm... eso mismo dijiste el año pasado.');
  yield sc.arrive('pancha', 'pablo');
  sc.walk('pancha', 150); sc.walk('pablo', 166);
  yield sc.wait(0.8);

  // ---- corte: adentro del departamento ----
  sc.ui.fade(true);
  yield sc.wait(0.7);
  Object.assign(A.pablo, { x: 150, y: FLOOR, target: null, pose: 'idle' });
  Object.assign(A.pancha, { x: 160, y: FLOOR, target: null, pose: 'idle' });
  sc.follow = null;
  sc.fixed = { x: 128, y: FLOOR - 14 };
  sc.setZoom(2.2);
  sc.snapCam();
  sc.walk('pablo', 116); sc.walk('pancha', 140);
  sc.ui.fade(false);
  yield sc.wait(0.5);
  yield sc.say('pablo', '¡Ta-tán! El escondite perfecto: debajo de la cama.');
  yield sc.arrive('pablo');
  A.pablo.facing = -1;
  A.pablo.pose = 'search';
  for (let i = 0; i < 4; i++) { g.audio.play('dig'); yield sc.wait(0.3); }
  sc.emote('pablo', '?');
  yield sc.wait(1.0);
  yield sc.say('pablo', 'Momento...');
  A.pablo.pose = 'idle';
  sc.emote('pablo', '!');
  sc.fixed = { x: 118, y: FLOOR - 12 };
  sc.setZoom(2.8);
  g.audio.play('surprise');
  g.shake(1.5);
  yield sc.say('pablo', '¡LOS REGALOS NO ESTÁN!');
  sc.emote('pancha', '!');
  A.pancha.facing = -1;
  yield sc.say('pancha', '¿¡CÓMO QUE NO ESTÁN!?');
  sc.fixed = { x: 128, y: FLOOR - 14 };
  sc.setZoom(2.2);
  yield sc.say('pablo', 'Solo hay una nota... y una pluma.');
  sc.feathers.push({ x: A.pablo.x - 6, y: FLOOR - 16, floor: FLOOR, vy: 6, t: 0, landed: false });
  g.audio.play('paper');
  yield sc.wait(0.6);
  yield sc.note(NOTE_TEXT);
  yield sc.say('pancha', '¿¡Otra vez!? ¿Quién hace estas cosas?');
  yield sc.say('pablo', 'Ni idea... pero dice "muy abajo". ¡El cantero del patio!');
  yield sc.say('pancha', 'Y en el taller de la casa rodante venden palas.');
  sc.emote('pancha', '♥');
  yield sc.say('pancha', '¡Bueno, a cavar! Este cumple no me lo arruina nadie.');

  // ---- la cámara baja hasta el primer regalo ----
  const ch = g.world.chests.filter((c) => !c.core).sort((a, b) => a.r - b.r)[0];
  sc.caption('Mientras tanto, muy, muy abajo...');
  sc.setZoom(1);
  if (ch) {
    sc.feathers.push({ x: ch.c * TILE + 14, y: ch.r * TILE - 1, floor: ch.r * TILE + 1, vy: 0, t: 0, landed: true });
    yield sc.pan(ch.c * TILE + 4 - g.vw / 2, ch.r * TILE - g.vh / 2, 3.2);
    // acercamiento al cofre (con una plumita sospechosa al lado)
    sc.fixed = { x: ch.c * TILE + 8, y: ch.r * TILE - 8 };
    sc.setZoom(2.2);
    yield sc.wait(2.6);
    sc.setZoom(1);
  }
  sc.caption(null);
  const tc = g.titleCam();
  yield sc.pan(tc.x, tc.y, 2.6);
}
