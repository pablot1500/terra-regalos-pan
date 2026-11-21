// Cinemática de inicio: Pablo y Panchi llegan al edificio, entran al departamento,
// buscan los regalos debajo de la cama y encuentran una nota misteriosa.
// Cada `yield` espera a que termine lo anterior (ver scene.js).
import { TILE, SURFACE } from './config.js';
import { ACTION_ZONE } from './music.js';
import { TRAILER_X, TRAILER_H, GATE_X, BIG_BUSH } from './structures.js';
import { clamp } from './util.js';

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
  // la música se va apagando: queda todo en silencio hasta que cierran la nota
  g.audio.hushMusic(true);
  yield sc.say('pablo', 'Esperá...');
  // escarba otra vez, más fuerte... y nada
  for (let i = 0; i < 3; i++) { g.audio.play('dig'); yield sc.wait(0.18); }
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
  // al cerrar la nota arranca la música de acción, hasta el final de la intro
  g.introMusic = ACTION_ZONE;
  g.audio.setScene(ACTION_ZONE);
  yield sc.say('pancha', '¿¡Otra vez!? ¿Y quién puede haber sido ahora?');
  yield sc.say('pablo', 'Alguna sospecha tengo... pero acá dice "muy abajo". Abajo de dónde?');

  // ---- mientras tanto: la cámara baja hasta el primer regalo ----
  const ch = g.world.chests.filter((c) => !c.core).sort((a, b) => a.r - b.r)[0];
  sc.caption('Mientras tanto, muy, muy abajo...');
  sc.setZoom(1);
  if (ch) {
    sc.feathers.push({ x: ch.c * TILE + 14, y: ch.r * TILE - 1, floor: ch.r * TILE + 1, vy: 0, t: 0, landed: true });
    // la cámara baja hasta dejar el cofre en el centro...
    const cx = ch.c * TILE + 6, cy = ch.r * TILE - 6;
    yield sc.pan(cx - g.vw / 2, cy - g.vh / 2, 3.2);
    // ...y se acerca derecho, sin moverse para los costados (el cofre brilla, con una plumita sospechosa al lado)
    sc.fixed = { x: cx, y: cy, k: 0.5, lock: true };
    sc.setZoom(2.2);
    sc.shine = { x: ch.c * TILE + 4, y: ch.r * TILE - 6, t: 0 };
    for (let k = 0; k < 34; k++) {
      const a = Math.random() * Math.PI * 2, r = 6 + Math.random() * 10;
      g.particles.add({ x: sc.shine.x + Math.cos(a) * r, y: sc.shine.y + Math.sin(a) * r * 0.7, vx: Math.cos(a) * 6, vy: -8 - Math.random() * 10, life: 0.9, max: 0.9, color: Math.random() < 0.6 ? '#ffd34d' : '#fff4e0', star: true, grav: -4 });
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
 * Primera vez en la ventanita del taller: Carlos les cuenta que "siempre pasa" y les da el equipo
 * (pala, jetpack y batería). Recién ahí pueden cavar y volar.
 */
export function* carlosScript(sc, p) {
  const g = sc.g, A = sc.actors;
  const me = p.char, mate = me === 'pablo' ? 'pancha' : 'pablo';
  const WIN = TRAILER_X + 31;
  const x0 = clamp(p.cx, TRAILER_X + 10, TRAILER_X + 50);
  sc.actor(me, x0, FLOOR, { facing: WIN > x0 ? 1 : -1 });
  sc.actor(mate, x0 - 14, FLOOR, { facing: 1, alpha: 0 });
  sc.fixed = { x: WIN - 4, y: FLOOR - 26 };
  sc.setZoom(2.2);
  sc.snapCam();
  yield sc.wait(0.4);
  yield sc.say('carlos', '¡Hola, chicos! ¿Qué andan buscando con esas caras?');
  yield sc.say('pancha', '¡Alguien se llevó mis regalos de cumple! Dice que están muy, muy abajo.');
  yield sc.say('carlos', 'Ah, ¿van a buscar los regalos? ¿Otra vez?');
  sc.emote('pancha', '?');
  yield sc.say('pancha', 'Esperá... ¿y vos cómo sabés que están abajo?');
  yield sc.say('carlos', 'No, nada... siempre pasa. Todos los años lo mismo. Ya es una tradición del barrio.');
  sc.emote('pablo', '~');
  yield sc.say('pablo', '...');
  yield sc.say('carlos', 'Bueno, van a necesitar esto.');
  g.audio.play('magic');
  yield sc.kit();
  // ¡equipados! aparecen la pala y el jetpack
  g.kitGiven = true;
  g.audio.play('buy');
  for (const id of [me, mate]) {
    A[id].tool = 'shovel';
    for (let i = 0; i < 10; i++) g.particles.add({ x: A[id].x + (Math.random() - 0.5) * 12, y: A[id].y - 6 - Math.random() * 14, vx: (Math.random() - 0.5) * 30, vy: -20 - Math.random() * 30, life: 0.7, max: 0.7, color: i % 2 ? '#ffd34d' : '#fff4e0', star: true, grav: 30 });
  }
  yield sc.wait(0.6);
  yield sc.say('pablo', '¡Gracias, Carlos!');
  yield sc.say('carlos', 'El cantero del medio es lo único que se puede cavar. Y cuando junten plata, vuelvan: ¡tengo mejoras!');
  yield sc.say('pancha', '¡Vamos a cavar!');
}

/**
 * Mini escena la primera vez que pisan el cantero con el equipo puesto: el arbusto grande se mece...
 * ¡y sale Popi! Al final se lo llevan en la aventura (y recién ahí abre el taller).
 */
export function* popiScript(sc, p) {
  const g = sc.g, A = sc.actors, S = g.structs;
  const me = p.char, mate = me === 'pablo' ? 'pancha' : 'pablo';
  const BX = BIG_BUSH.x + BIG_BUSH.w / 2;
  const x0 = p.cx;
  sc.actor(me, x0, FLOOR, { facing: -1, tool: 'shovel' });
  sc.actor(mate, x0 + 14, FLOOR, { facing: -1, alpha: 0, tool: 'shovel' });
  sc.fixed = { x: (BX + x0) / 2 + 4, y: FLOOR - 18 };
  sc.setZoom(2.2);
  sc.snapCam();
  yield sc.wait(0.5);
  const leaves = (n) => {
    for (let i = 0; i < n; i++) g.particles.add({ x: BX + (Math.random() - 0.5) * BIG_BUSH.w, y: FLOOR - BIG_BUSH.h + Math.random() * 10, vx: (Math.random() - 0.5) * 40, vy: -20 - Math.random() * 30, life: 0.9, max: 0.9, color: Math.random() < 0.5 ? '#4fae47' : '#7fcf62', size: 1, grav: 60 });
  };
  // algo se mueve en el arbusto
  S.bushShake = 1;
  g.sfx('rustle');
  leaves(6);
  sc.emote(me, '?'); sc.emote(mate, '?');
  yield sc.wait(0.9);
  S.bushShake = 0;
  yield sc.say('pancha', '¿Qué hay ahí?');
  yield sc.say('pablo', '¿Un gato? ¿Una comadreja? ¿Aguilus disfrazado de arbusto?');
  S.bushShake = 2;
  g.sfx('rustle');
  leaves(10);
  yield sc.wait(0.7);
  S.bushShake = 0;
  // ¡sale Popi de un salto!
  sc.actor('popi', BX, FLOOR - BIG_BUSH.h + 8, { facing: 1, phase: 0 });
  sc.drop('popi', FLOOR);
  A.popi.vy = -140;
  sc.walk('popi', x0 - 18, 70);
  g.sfx('bark');
  leaves(12);
  sc.emote(me, '!'); sc.emote(mate, '!');
  yield sc.arrive('popi');
  A.popi.facing = 1;
  for (let i = 0; i < 4; i++) g.particles.add({ x: A.popi.x - 4 + i * 3, y: FLOOR - 12, vx: (i - 1.5) * 6, vy: -14, life: 1.2, max: 1.2, heart: true, grav: 0 });
  yield sc.say('pancha', '¡Popito! ¿Qué hacés acá? ¿Cómo apareciste?');
  yield sc.say('popi', 'Guau. (Traducción: me colé en el auto cuando no estaban viendo, je.)');
  yield sc.say('pablo', 'Con razón el auto olía a salchicha...');
  yield sc.say('pancha', 'Bueno, ya que estás acá... ¿nos ayudás a buscar los regalos?');
  yield sc.say('popi', '¡Guau, guau! (Traducción: ¡obvio! Traje casco y todo.)');
  yield sc.say('pablo', '¡Listo! Aprovechamos y te llevamos en esta aventura, Popi.');
  sc.emote('popi', '♥'); sc.emote(me, '♥'); sc.emote(mate, '♥');
  yield sc.wait(0.9);
}

/** la herramienta de cavar que tienen ahora (para mostrarla en las escenas) */
const digTool = (g) => (g.upgrades.pala >= 3 ? 'drill' : 'shovel');

/**
 * Justo después del primer regalo (a 300 m): se escucha algo... ¡y aparecen las aguilitas de Aguilus,
 * bajando por los túneles! Sin con qué defenderse, solo queda escapar para arriba.
 * `caves`: de dónde salen; `report(spots)`: dónde quedaron (ahí arrancan a perseguir en el juego).
 */
export function* eagletScript(sc, p, caves, report) {
  const g = sc.g, A = sc.actors, W = g.world;
  const me = p.char, mate = me === 'pablo' ? 'pancha' : 'pablo';
  const fy = p.y + p.h, x0 = p.cx;
  // el otro al lado, donde haya piso (si no, atrás)
  let mx = x0 - 6;
  for (const dx of [-12, 12, -9, 9]) if (W.solidPx(x0 + dx, fy + 1) && !W.solidPx(x0 + dx, fy - 8)) { mx = x0 + dx; break; }
  sc.actor(me, x0, fy, { facing: mx < x0 ? -1 : 1, tool: digTool(g) });
  sc.actor(mate, mx, fy, { facing: mx < x0 ? 1 : -1, alpha: 0, tool: digTool(g) });
  sc.fixed = { x: x0, y: fy - 16 };
  sc.setZoom(2.4);
  sc.snapCam();
  yield sc.wait(0.6);
  g.sfx('peep');
  sc.emote(me, '?'); sc.emote(mate, '?');
  yield sc.say(mate, '¿Escuchaste eso?');
  yield sc.say(me, 'Debe ser el eco... ¿no? Hay eco acá abajo, ¿no?');
  // aparecen por los túneles y se acercan revoloteando
  caves.forEach((c, i) => sc.actor('eaglet' + i, c.x, c.y, { kind: 'eaglet', facing: c.x < x0 ? 1 : -1 }));
  const spots = caves.map((c, i) => ({ x: x0 + (i - 1) * 18, y: fy - 32 - (i % 2) * 7 }));
  sc.fixed = { x: x0, y: fy - 34 };
  sc.setZoom(1.5);
  g.sfx('peep');
  spots.forEach((s, i) => sc.fly('eaglet' + i, s.x, s.y, 95 - i * 18)); // a distinta velocidad: llegan una detrás de otra
  yield sc.arrive(...caves.map((_, i) => 'eaglet' + i));
  g.sfx('surprise');
  sc.emote(me, '!'); sc.emote(mate, '!');
  A[me].facing = A[mate].facing = 1;
  sc.fixed = { x: x0, y: fy - 24 };
  sc.setZoom(2.2);
  yield sc.say(me, '¡¿Aguilitas?! ¡Son las ayudantes de Aguilus!');
  g.sfx('peep');
  yield sc.say(mate, '¡Y vienen para acá! ¡Con la pala no les hacemos nada!');
  yield sc.say(me, '¡A subir! ¡Rápido, con el jetpack!');
  report(caves.map((_, i) => ({ x: A['eaglet' + i].x, y: A['eaglet' + i].y })));
}

/**
 * Vuelven al taller escapando de las aguilitas: Carlos dice que es "normal" y les da la súper pistola de agua,
 * que va enchufada a la batería (cada tiro gasta un poquito de energía).
 */
export function* carlosGunScript(sc, p) {
  const g = sc.g, A = sc.actors;
  const me = p.char, mate = me === 'pablo' ? 'pancha' : 'pablo';
  const WIN = TRAILER_X + 31;
  const x0 = clamp(p.cx, TRAILER_X + 10, TRAILER_X + 50);
  sc.actor(me, x0, FLOOR, { facing: WIN > x0 ? 1 : -1, tool: digTool(g) });
  sc.actor(mate, x0 - 14, FLOOR, { facing: 1, alpha: 0, tool: digTool(g) });
  sc.fixed = { x: WIN - 4, y: FLOOR - 26 };
  sc.setZoom(2.2);
  sc.snapCam();
  yield sc.wait(0.4);
  yield sc.say('pancha', '¡Carlos! ¡Allá abajo había unos pájaros que nos quisieron picotear!');
  yield sc.say('pablo', 'Subimos volando del susto. Bueno... literalmente volando.');
  yield sc.say('carlos', '¿Pájaros? Ah, las aguilitas. Sí, sí, normal. Todos los años lo mismo.');
  sc.emote('pablo', '?');
  yield sc.say('pablo', '¿Cómo que normal?');
  yield sc.say('carlos', 'Tranquilos, que no les gusta nada el agua. Tomen, usen esto.');
  // ¡pistolas de agua!
  g.audio.play('magic');
  yield sc.wait(0.4);
  g.sfx('pump');
  for (const id of [me, mate]) {
    A[id].tool = 'water'; A[id].gunAng = 0.3;
    for (let i = 0; i < 10; i++) g.particles.add({ x: A[id].x + A[id].facing * 6, y: A[id].y - 10, vx: (Math.random() - 0.5) * 60, vy: -20 - Math.random() * 50, life: 0.6, max: 0.6, color: i % 2 ? '#7fd8ff' : '#ffffff', size: 1, grav: 200 });
  }
  yield sc.wait(0.7);
  yield sc.say('carlos', 'Súper pistola de agua. Va enchufada a la batería: cada chorrito gasta un poquito de energía.');
  yield sc.say('pancha', '¿Una pistola de agua... eléctrica?');
  yield sc.say('carlos', 'Tecnología del barrio, querida. Si se quedan sin batería, a casa a cargar.');
  yield sc.say('carlos', 'Y cuando junten plata, me la traen y se la mejoro: que tire más rápido.');
  for (const id of [me, mate]) A[id].gunAng = -0.4;
  yield sc.say('pablo', '¡Ahora sí! ¡Que vengan esas aguilitas!');
}
