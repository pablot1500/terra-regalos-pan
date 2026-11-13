// Cinemática de inicio: Pablo y Panchi llegan al edificio, entran al departamento,
// buscan los regalos debajo de la cama y encuentran una nota misteriosa.
// Cada `yield` espera a que termine lo anterior (ver scene.js).
import { TILE, SURFACE } from './config.js';
import { TRAILER_X, TRAILER_H, GATE_X, GOL_X, GOL_H, GOL_DOOR } from './structures.js';

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

/**
 * Mini escena la primera vez que bajan al patio jugando: algo ladra adentro del Gol,
 * se abre la puerta... ¡y aparece Popi! Al final se lo llevan en la aventura.
 */
export function* popiScript(sc, p) {
  const g = sc.g, A = sc.actors, S = g.structs;
  const me = p.char, mate = me === 'pablo' ? 'pancha' : 'pablo';
  const x0 = p.cx;
  sc.actor(me, x0, FLOOR, { facing: 1 });
  sc.actor(mate, x0 - 14, FLOOR, { facing: 1, alpha: 0 });
  sc.fixed = { x: x0 + 30, y: FLOOR - 16 };
  sc.setZoom(2);
  sc.snapCam();
  yield sc.wait(0.4);
  // ladridos desde adentro del Gol
  S.golShake = 1;
  g.sfx('bark');
  g.addText(GOL_X + 31, FLOOR - GOL_H - 2, '¡GUAU!', '#fff4e0');
  sc.emote(me, '!'); sc.emote(mate, '!');
  yield sc.wait(0.7);
  S.golShake = 0;
  yield sc.say('pancha', '¿Escucharon eso?');
  yield sc.say('pablo', 'Viene del Gol...');
  // se acercan al auto
  sc.walk(me, GOL_X - 4, 55); sc.walk(mate, GOL_X - 18, 55);
  sc.fixed = { x: GOL_X + 20, y: FLOOR - 18 };
  sc.setZoom(2.4);
  yield sc.arrive(me, mate);
  A[me].facing = 1; A[mate].facing = 1;
  S.golShake = 1;
  g.sfx('bark');
  yield sc.wait(0.45);
  S.golShake = 0;
  // se abre la puerta y asoma Popi
  g.sfx('click');
  const swing = (to, dur) => { const from = S.golDoor, t0 = sc.t; return () => (S.golDoor = from + (to - from) * Math.min(1, (sc.t - t0) / dur)) === to; };
  yield swing(1, 0.5);
  // sentado en el asiento de adelante, en el hueco de la puerta
  const seatY = FLOOR - GOL_H + 1 + GOL_DOOR.y1 - 2;
  sc.actor('popi', GOL_X + (GOL_DOOR.x0 + GOL_DOOR.x1) / 2, seatY, { facing: -1, phase: 0 });
  sc.emote('popi', '♥');
  g.sfx('bark');
  yield sc.wait(0.8);
  // salta del auto y corre hasta ellos
  sc.drop('popi', FLOOR);
  A.popi.vy = -110;
  sc.walk('popi', GOL_X + 12, 60);
  yield sc.arrive('popi');
  A.popi.facing = -1;
  for (let i = 0; i < 4; i++) g.particles.add({ x: A.popi.x - 4 + i * 3, y: FLOOR - 12, vx: (i - 1.5) * 6, vy: -14, life: 1.2, max: 1.2, heart: true, grav: 0 });
  yield sc.say('pancha', '¡Popito! ¿Qué hacés acá? ¿Cómo viniste?');
  yield sc.say('popi', 'Guau. (Traducción: me colé en el auto cuando no estaban viendo, je.)');
  yield sc.say('pablo', 'Con razón el auto olía a salchicha...');
  yield sc.say('pancha', 'Bueno, ya que estás acá... ¿nos ayudás a buscar los regalos?');
  yield sc.say('popi', '¡Guau, guau! (Traducción: ¡obvio! Traje casco y todo.)');
  yield sc.say('pablo', '¡Listo! Aprovechamos y te llevamos en esta aventura, Popi.');
  sc.emote('popi', '♥'); sc.emote(me, '♥'); sc.emote(mate, '♥');
  g.audio.play('gateShut');
  yield swing(0, 0.3);
  yield sc.wait(0.9);
}
