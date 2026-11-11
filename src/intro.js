// Cinemática de inicio: Pablo y Panchi llegan al edificio, entran al departamento,
// buscan los regalos debajo de la cama y encuentran una nota misteriosa.
// Cada `yield` espera a que termine lo anterior (ver scene.js).
import { TILE, SURFACE } from './config.js';
import { DOG_POS, TRAILER_X, TRAILER_H, GATE_X } from './structures.js';

const FLOOR = SURFACE * TILE;          // piso del patio
const APT = (SURFACE - 6) * TILE;      // piso del departamento 1B (primer piso, subiendo la escalera)

export const NOTE_TEXT = `Querida cumpleañera:

Este año TAMPOCO te vas a salvar. ¿Se pensaban que se libraron de mi tan fácil?

Me llevé tus regalos. Bien, bien, bieeen abajo. No hay forma de que los alcancen.

Si los quieren, los voy a estar esperando.

Me caen mal.

— A (de Anónimo, para nada es la primera letra de otro nombre de un personaje que ya conocen)

P.D.: Ni se les ocurra traer las guitarritas y esas cosas musicales suyas`;

export function* introScript(sc) {
  const g = sc.g;
  const A = sc.actors;
  // la cámara arranca en el cielo (donde estaba el botón de empezar) y baja hasta el patio;
  // recién cuando llega se abre el portón de la calle y entran los dos por ahí
  // encuadre del patio con el portón entero sobre el borde derecho (sea cual sea el ancho de la pantalla)
  const viewAt = (z) => g.vw / (Math.max(1, Math.round((g.scale || 1) * z)) / (g.scale || 1));
  const SPOT = Math.round(GATE_X + 34 - viewAt(1.5) / 2);
  sc.actor('pancha', SPOT, FLOOR, { phase: 0, hidden: true });
  sc.actor('pablo', SPOT, FLOOR, { phase: 1.3, hidden: true });
  sc.fixed = { x: SPOT, y: FLOOR, k: 0.6 };
  g.structs.trailerOpen = 0; // el taller arranca cerrado: Carlos aparece recién cuando hablan de las palas
  sc.ui.fade(false);
  yield sc.descend(7.5, 1.5);
  sc.caption('Hoy es el día del cumple de Panchi...');
  yield sc.wait(0.6);
  // se abre el portón de la calle y entran por ahí
  const S = g.structs, DOOR = GATE_X + 14;
  const swing = (to, dur) => { const from = S.gateOpen, t0 = sc.t; return () => (S.gateOpen = from + (to - from) * Math.min(1, (sc.t - t0) / dur)) === to; };
  g.audio.play('gate');
  yield swing(1, 0.7);
  Object.assign(A.pancha, { x: DOOR, hidden: false, alpha: 0, facing: -1 });
  sc.walk('pancha', 470, 42);
  yield sc.wait(0.45);
  Object.assign(A.pablo, { x: DOOR, hidden: false, alpha: 0, facing: -1 });
  sc.walk('pablo', 492, 42);
  yield () => A.pablo.x < GATE_X - 6;
  g.audio.play('gate');
  yield swing(0, 0.5);
  g.audio.play('gateShut');
  yield () => A.pancha.x < SPOT + 40;
  sc.fixed = null;
  sc.follow = ['pancha', 'pablo'];
  sc.camSpeed = 1.6;
  yield sc.wait(1.4);
  sc.camSpeed = null;
  A.pancha.speed = 30; A.pablo.speed = 30;
  sc.caption(null);
  yield sc.say('pancha', '¡Qué bueno que llegamos!! ¡Qué lindo que festejemos mi cumple juntos otra vez!');
  yield sc.say('pablo', 'Obvio corazón, no me lo perdería jamás.');
  yield sc.arrive('pancha', 'pablo');

  // Popi los recibe en el patio
  g.audio.play('bark');
  g.addText(DOG_POS.x + 10, DOG_POS.y - 2, '¡GUAU!', '#fff4e0');
  for (let i = 0; i < 3; i++) g.particles.add({ x: DOG_POS.x + 6 + i * 3, y: DOG_POS.y - 2, vx: (i - 1) * 6, vy: -14, life: 1.2, max: 1.2, heart: true, grav: 0 });
  yield sc.say('pancha', '¡Popito! ¿Qué haces acá? ¿Te escapaste de casa?');
  yield sc.say('popi', 'Guau. (Traducción: me colé en el auto cuando no veían je.)');

  sc.walk('pancha', 214); sc.walk('pablo', 236);
  yield sc.say('pancha', '¿Che Pabli, te acordás de lo que pasó el año pasado con.. los regalos?');
  yield sc.say('pablo', 'Ni lo menciones. Todavía sueño con ese pajarraco.');
  yield sc.say('pablo', 'Igual tranqui: este año los escondí bien bien. No hay chance de que falle esta vez.');
  yield sc.say('pancha', 'Mmm... oki.');
  yield sc.arrive('pancha', 'pablo');
  // suben la escalera hasta el 1B
  A.pancha.ground = true; A.pablo.ground = true;
  sc.walk('pancha', 150); sc.walk('pablo', 166);
  yield sc.arrive('pancha', 'pablo');

  // ---- corte: adentro del departamento ----
  sc.ui.fade(true);
  yield sc.wait(0.7);
  Object.assign(A.pablo, { x: 150, y: APT, ground: false, target: null, pose: 'idle' });
  Object.assign(A.pancha, { x: 160, y: APT, ground: false, target: null, pose: 'idle' });
  sc.follow = null;
  sc.fixed = { x: 128, y: APT - 14 };
  sc.setZoom(2.2);
  sc.snapCam();
  sc.walk('pablo', 116); sc.walk('pancha', 140);
  sc.ui.fade(false);
  yield sc.wait(0.5);
  yield sc.say('pablo', '¡Ahora sí! El escondite perfecto: debajo de la cama.');
  yield sc.arrive('pablo');
  A.pablo.facing = -1;
  A.pablo.pose = 'search';
  for (let i = 0; i < 4; i++) { g.audio.play('dig'); yield sc.wait(0.3); }
  sc.emote('pablo', '?');
  yield sc.wait(1.0);
  yield sc.say('pablo', 'Esperá...');
  A.pablo.pose = 'idle';
  sc.emote('pablo', '!');
  sc.fixed = { x: 118, y: APT - 12 };
  sc.setZoom(2.8);
  g.audio.play('surprise');
  g.shake(1.5);
  yield sc.say('pablo', '¡LOS REGALOS NO ESTÁN!');
  sc.emote('pancha', '!');
  A.pancha.facing = -1;
  yield sc.say('pancha', '¿¡CÓMO QUE NO ESTÁN!?');
  sc.fixed = { x: 128, y: APT - 14 };
  sc.setZoom(2.2);
  yield sc.say('pablo', 'Alguien se los volvió a llevar!! Dejaron una notita y una pluma.');
  sc.feathers.push({ x: A.pablo.x - 6, y: APT - 16, floor: APT, vy: 6, t: 0, landed: false });
  g.audio.play('paper');
  yield sc.wait(0.6);
  yield sc.note(NOTE_TEXT);
  yield sc.say('pancha', '¿¡Otra vez!? ¿Y quién puede haber sido ahora?');
  yield sc.say('pablo', 'Alguna sospecha tengo... pero acá dice "muy abajo". Abajo de dónde?');

  // ---- mientras tanto: la cámara baja hasta el primer regalo ----
  const ch = g.world.chests.filter((c) => !c.core).sort((a, b) => a.r - b.r)[0];
  sc.caption('Mientras tanto, muy, muy abajo...');
  sc.setZoom(1);
  if (ch) {
    sc.feathers.push({ x: ch.c * TILE + 14, y: ch.r * TILE - 1, floor: ch.r * TILE + 1, vy: 0, t: 0, landed: true });
    yield sc.pan(ch.c * TILE + 4 - g.vw / 2, ch.r * TILE - g.vh / 2, 3.2);
    // acercamiento al cofre, que brilla (con una plumita sospechosa al lado)
    sc.fixed = { x: ch.c * TILE + 8, y: ch.r * TILE - 8 };
    sc.setZoom(2.2);
    sc.shine = { x: ch.c * TILE + 4, y: ch.r * TILE - 6, t: 0 };
    g.audio.play('gem');
    for (let k = 0; k < 34; k++) {
      const a = Math.random() * Math.PI * 2, r = 6 + Math.random() * 10;
      g.particles.add({ x: sc.shine.x + Math.cos(a) * r, y: sc.shine.y + Math.sin(a) * r * 0.7, vx: Math.cos(a) * 6, vy: -8 - Math.random() * 10, life: 0.9, max: 0.9, color: Math.random() < 0.6 ? '#ffd34d' : '#fff4e0', star: true, grav: -4 });
      if (k === 17) g.audio.play('gem');
      yield sc.wait(0.12);
    }
    sc.shine = null;
  }
  // corte: de vuelta al departamento
  sc.ui.fade(true);
  yield sc.wait(0.7);
  sc.caption(null);
  sc.fixed = { x: 128, y: APT - 14 };
  sc.setZoom(2.2);
  sc.snapCam();
  sc.ui.fade(false);
  yield sc.wait(0.6);

  // ---- se miran... y se dan cuenta: ¡abajo de ellos! ----
  A.pablo.facing = 1; A.pancha.facing = -1;
  sc.emote('pablo', '?'); sc.emote('pancha', '?');
  yield sc.wait(1.6);
  sc.emote('pablo', '!'); sc.emote('pancha', '!');
  g.audio.play('surprise');
  g.shake(1.2);
  yield sc.say('pancha', '¡Abajo nuestro!!!');
  yield sc.say('pablo', 'No puedo creer que tengamos que hacer esto..');
  yield sc.say('pancha', 'En el taller de la casa rodante venden palas.');

  // ---- la cámara va hasta el taller de Carlos ----
  sc.camSpeed = 1.6;
  sc.fixed = { x: TRAILER_X + 34, y: FLOOR - TRAILER_H * 0.6 };
  sc.setZoom(1.8);
  yield sc.wait(2.2);
  // sube la persiana de la ventanita y aparece Carlos
  g.audio.play('shutter');
  yield (() => { const t0 = sc.t; return () => (g.structs.trailerOpen = Math.min(1, (sc.t - t0) / 0.9)) === 1; })();
  yield sc.wait(0.6);
  yield sc.say('pablo', '¿Carlos? ¿No vendían comida ahí?');
  yield sc.say('pancha', 'La crisis nos pega a todos, ya sabes.');
  // y vuelve a los dos
  sc.fixed = { x: 128, y: APT - 14 };
  sc.setZoom(2.2);
  yield sc.wait(1.9);
  sc.camSpeed = null;
  sc.emote('pancha', '♥');
  yield sc.say('pancha', '¡Bueno, arranquemos! Este cumple no me lo arruina nadie.');

  sc.setZoom(1);
  const tc = g.titleCam();
  yield sc.pan(tc.x, tc.y, 2.6);
}
