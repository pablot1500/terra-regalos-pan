// Aguilus en el fondo del núcleo: espera junto al último cofre, charla con los chicos y,
// después del "interruptor secreto" de Carlos, pelea contra las súper pistolas de agua.
// Tira rocas de magma (el agua las apaga), plumas, columnas de fuego, picadas, un rayo violeta,
// lluvia de meteoritos y llama aguilitas. Si alguno cae, el otro lo puede revivir.
import { TILE, SURFACE, BOSS, HP_MAX, ENDING_TEXT, CHARACTERS } from './config.js';
import { CORE_PLATFORM } from './world.js';
import { drawAguilus, AG_H } from './aguilus.js';
import { DIG_ZONE, TRAILER_X, TRAILER_H } from './structures.js';
import { mulberry32 } from './rng.js';
import { clamp, fmtMoney, makeCanvas, flipH, outlined } from './util.js';

const FLOOR_Y = CORE_PLATFORM.r * TILE;
const ARENA = { x0: (CORE_PLATFORM.c0 + 2) * TILE, x1: (CORE_PLATFORM.c1 - 1) * TILE };
const PLAT = { x0: CORE_PLATFORM.c0 * TILE, x1: (CORE_PLATFORM.c1 + 1) * TILE }; // borde real de la plataforma
const LAVA_Y = (CORE_PLATFORM.r + 4) * TILE + 3; // superficie del mar de lava, abajo de la plataforma
const SKY_Y = FLOOR_Y - 80;         // altura a la que vuela durante la pelea
const ROCK_G = 210;
const BEAM_LEN = 420;

// ------------------------------------------------------------
//  Rocas de magma: piedras marrón oscuro, irregulares, con grietas encendidas
//  (y su versión apagada, gris, cuando les tiran agua)
// ------------------------------------------------------------
function paintRock(seed, size, cool = false) {
  const rnd = mulberry32(seed);
  const [c, x] = makeCanvas(size, size);
  const m = (size - 1) / 2, r = size / 2 - 0.3;
  // contorno irregular: radio que varía con el ángulo
  const ph = [rnd() * 6.3, rnd() * 6.3, rnd() * 6.3];
  const am = [0.07 + rnd() * 0.06, 0.04 + rnd() * 0.04, 0.02 + rnd() * 0.03];
  const R = (a) => r * (0.8 + am[0] * Math.sin(a * 2 + ph[0]) + am[1] * Math.sin(a * 3 + ph[1]) + am[2] * Math.sin(a * 5 + ph[2]));
  const mask = new Uint8Array(size * size);
  for (let py = 0; py < size; py++) for (let px = 0; px < size; px++) {
    const dx = px - m, dy = py - m;
    mask[py * size + px] = Math.hypot(dx, dy) <= R(Math.atan2(dy, dx)) ? 1 : 0;
  }
  const inside = (px, py) => px >= 0 && py >= 0 && px < size && py < size && mask[py * size + px] === 1;
  // sin pelitos sueltos en el borde
  for (let pass = 0; pass < 2; pass++) for (let py = 0; py < size; py++) for (let px = 0; px < size; px++) {
    if (inside(px, py) && inside(px - 1, py) + inside(px + 1, py) + inside(px, py - 1) + inside(px, py + 1) < 2) mask[py * size + px] = 0;
  }
  const C = cool
    ? { edge: '#1a1a1e', lit: '#8a8a90', dark: '#3e3e44', spot: '#6a6a72', mid: '#58585f', hot: '#2e2e34', warm: '#45454c' }
    : { edge: '#170b06', lit: '#5a3a24', dark: '#26150c', spot: '#43291a', mid: '#3a2316', hot: '#ffd060', warm: '#ff6a1a' };
  const cell = [];
  for (let py = 0; py < size; py++) for (let px = 0; px < size; px++) {
    if (!inside(px, py)) continue;
    const edge = !inside(px - 1, py) || !inside(px + 1, py) || !inside(px, py - 1) || !inside(px, py + 1);
    const lit = (m - px) + (m - py); // luz desde arriba a la izquierda
    x.fillStyle = edge ? C.edge : lit > r * 0.6 ? C.lit : lit < -r * 0.5 ? C.dark : rnd() < 0.15 ? C.spot : C.mid;
    x.fillRect(px, py, 1, 1);
    if (!edge) cell.push([px, py]);
  }
  // grietas: caminitos desde cerca del centro hacia afuera
  const ok = new Set(cell.map(([a, b]) => a + ',' + b));
  const cracks = 2 + Math.floor(rnd() * 2) + (size >= 12 ? 1 : 0);
  for (let k = 0; k < cracks; k++) {
    let px = Math.round(m + (rnd() - 0.5) * 2), py = Math.round(m + (rnd() - 0.5) * 2);
    const a = rnd() * Math.PI * 2;
    const len = Math.round(r * (0.7 + rnd() * 0.5));
    for (let i = 0; i < len; i++) {
      if (!ok.has(px + ',' + py)) break;
      x.fillStyle = i < len * 0.4 && rnd() < 0.6 ? C.hot : C.warm;
      x.fillRect(px, py, 1, 1);
      const b = a + (rnd() - 0.5) * 1.6;
      px += Math.round(Math.cos(b)); py += Math.round(Math.sin(b));
    }
  }
  return c;
}

/** cada roca tiene sus 4 giros de a 90° (sin rotación borrosa) */
function rotations(src) {
  const out = [src];
  for (let k = 1; k < 4; k++) {
    const [c, x] = makeCanvas(src.width, src.height);
    x.translate(src.width / 2, src.height / 2);
    x.rotate(k * Math.PI / 2);
    x.drawImage(src, -src.width / 2, -src.height / 2);
    out.push(c);
  }
  return out;
}

const ROCK_SIZES = [9, 10, 11, 12, 13, 10, 12, 14];
let ROCKS = null, COOL = null;
export function rockSprites() {
  if (!ROCKS) ROCKS = ROCK_SIZES.map((s, i) => rotations(paintRock(900 + i * 37, s)));
  return ROCKS;
}
function coolSprites() {
  if (!COOL) COOL = ROCK_SIZES.map((s, i) => rotations(paintRock(900 + i * 37, s, true)));
  return COOL;
}

// pluma-dardo (la dibuja apuntando a la derecha y se rota según la dirección)
const FEATHER = (() => {
  const [c, x] = makeCanvas(9, 3);
  x.fillStyle = '#4a3070'; x.fillRect(0, 1, 9, 1);
  x.fillStyle = '#a374dc'; x.fillRect(1, 0, 5, 1); x.fillRect(1, 2, 5, 1);
  x.fillStyle = '#e8d8ff'; x.fillRect(6, 1, 3, 1);
  return c;
})();

// ------------------------------------------------------------
//  Aguilitas: las ayudantes de Aguilus (chiquitas, con las alas violetas)
// ------------------------------------------------------------
function paintEaglet(up) {
  const [c, x] = makeCanvas(12, 9);
  const P = (a, b, w, h, col) => { x.fillStyle = col; x.fillRect(a, b, w, h); };
  P(0, 4, 2, 1, '#5a3218'); P(1, 5, 2, 1, '#5a3218');           // cola
  P(2, 3, 6, 3, '#8a5530'); P(3, 6, 4, 1, '#5a3218');           // cuerpo
  P(7, 1, 3, 3, '#f2e3c4'); P(7, 4, 2, 1, '#f2e3c4');           // cabeza blanca
  P(9, 2, 1, 1, '#1d1012');                                      // ojo
  P(10, 2, 2, 1, '#f2c14e'); P(10, 3, 1, 1, '#c98a2a');         // pico
  P(4, 7, 1, 1, '#f2c14e'); P(6, 7, 1, 1, '#f2c14e');           // patitas
  if (up) { P(3, 1, 4, 2, '#a374dc'); P(2, 0, 3, 1, '#c9a6ff'); }
  else { P(3, 5, 4, 2, '#a374dc'); P(2, 7, 2, 1, '#c9a6ff'); P(3, 3, 4, 1, '#6a3fa6'); }
  return outlined(c, '#22142b');
}
let EAGLET = null;
function eagletSprites() {
  if (!EAGLET) {
    const up = paintEaglet(true), down = paintEaglet(false);
    EAGLET = { right: [up, down], left: [flipH(up), flipH(down)] };
  }
  return EAGLET;
}

const HIT_LINES = ['¡AIAA!', '¡MIS PLUMAS!', '¡ESTOY EMPAPADO!', '¡AGUA NO!', '¡PUAJ!', '¡ESTÁ FRÍA!', '¡MI TÚNICA!'];
const BOT_CHEERS = ['¡TOMÁ!', '¡MOJADO!', '¡DALE!', '¡CUIDADO!', '¡AGUA VA!', '¡VAMOS!'];

export class Boss {
  constructor(game, done, losses = 0) {
    this.g = game;
    this.losses = losses;     // cuántas veces te ganó (para que te gaste al volver)
    this.state = done ? 'done' : 'waiting'; // waiting → scene → fight → scene → done
    this.hp = BOSS.hp;
    this.phase = 1;
    const ch = game.world.chests.find((c) => c.core);
    this.homeX = ch ? ch.c * TILE - 20 : ARENA.x1 - 40;
    this.x = this.homeX; this.y = FLOOR_Y; this.facing = -1;
    this.tx = this.x; this.ty = SKY_Y; this.baseY = SKY_Y;
    this.vx = 0; this.spd = 60; this.pauseT = 0;
    this.attack = null; this.attackN = 0; this.lastType = null;
    this.clearHazards();
    this.t = 0; this.castT = 2.5; this.flash = 0; this.shieldT = 0;
    this.hitAcc = 0; this.allDownT = 0; this.cheerT = 5;
    this.ceilY = FLOOR_Y - BOSS.ceiling;
    this.floorY = FLOOR_Y;
    this.platX0 = PLAT.x0; this.platX1 = PLAT.x1; // en la pelea no se sale de la plataforma
  }

  get fighting() { return this.state === 'fight'; }
  get phase2() { return this.phase >= 2; }

  clearHazards() {
    this.rocks = []; this.marks = []; this.feathers = []; this.pillars = []; this.waves = [];
    this.minions = []; this.water = [];
  }

  // ------------------------------------------------------------
  //  Fases
  // ------------------------------------------------------------
  /** los que pelean: las personas y, sin nadie online, el compañero bot */
  fighters() {
    return this.g.players.filter((pl) => !pl.ai || pl.ai.fighting);
  }

  /** jugador que manejás en esta pantalla */
  get local() { return this.g.players[0]; }

  update(dt) {
    this.t += dt;
    if (this.state === 'waiting') {
      // cuando alguien pisa la plataforma del núcleo, arranca el encuentro
      for (const p of this.g.players) {
        if (p.ai) continue;
        if (p.onGround && !p.dead && Math.abs(p.y + p.h - FLOOR_Y) < 3 && p.cx > ARENA.x0 - 16 && p.cx < ARENA.x1 + 16) { this.startEncounter(p); break; }
      }
      return;
    }
    if (this.state === 'fight') this.updateFight(dt);
  }

  /** ubica a un jugador (si es el del otro, se lo manda por la red) */
  place(p, cx, fy, facing, full = false) {
    if (p.remote) { this.g.net.send('tp', { cx, fy, f: facing, full }); p.x = cx - p.w / 2; p.y = fy - p.h; p.tx = undefined; return; }
    p.x = cx - p.w / 2; p.y = fy - p.h; p.vx = 0; p.vy = 0; p.peakY = p.y;
    p.facing = facing; p.jetFuel = BOSS.jetTime; p.hovering = false;
    p.downed = false; p.revive = 0;
    if (full) p.hp = HP_MAX;
  }

  startEncounter(p) {
    this.state = 'scene';
    this.mateId = p.char === 'pablo' ? 'pancha' : 'pablo';
    p.vx = 0; p.digging = false; p.hovering = false;
    this.spots = null;
    this.g.startScene((sc) => encounterScript(sc, this, p), {
      onSkip: (sc) => {
        const A = sc.actors;
        // si se saltó en medio del recuerdo, vuelven a la plataforma
        if (this.spots) for (const [id, s] of Object.entries(this.spots)) Object.assign(A[id], s, { target: null, ty: null, fallTo: null });
        Object.assign(A.aguilus, { y: SKY_Y, ty: null, target: null, pose: 'fly', hidden: false });
        Object.assign(A[this.mateId], { y: FLOOR_Y, fallTo: null });
        sc.flashback = false;
      },
      onEnd: (skipped, sc) => this.startFight(sc, p),
    });
  }

  /** sin nadie online, el compañero bot pelea al lado (aunque el modo de a dos esté apagado) */
  enlistBot() {
    const g = this.g;
    if (g.net.remote) return;
    let bot = g.players.find((pl) => pl.ai);
    if (!bot) { bot = g.makeBuddy(); bot.tempBot = true; g.players.push(bot); }
    bot.ai.fighting = true; bot.ai.active = true;
    bot.hp = HP_MAX; bot.downed = false; bot.revive = 0;
  }

  releaseBot() {
    const g = this.g;
    for (const pl of g.players) if (pl.ai) { pl.ai.fighting = false; pl.downed = false; pl.revive = 0; pl.hp = HP_MAX; pl.firing = false; }
    g.players = g.players.filter((pl) => !pl.tempBot);
  }

  startFight(sc, p) {
    const g = this.g, A = sc.actors;
    const ag = A.aguilus;
    this.enlistBot();
    for (const f of this.fighters()) {
      const a = A[f.char];
      this.place(f, a ? a.x : clamp(p.cx - 16, ARENA.x0, ARENA.x1), FLOOR_Y, a ? a.facing : 1, true);
      f.gunCd = 0; f.firing = false;
    }
    this.x = ag.x; this.y = SKY_Y; this.baseY = SKY_Y; this.tx = this.x; this.vx = 0;
    this.state = 'fight';
    this.castT = 1.4; this.attack = null; this.attackN = 0;
    this.g.ui.setBossBar(this.hp / BOSS.hp);
    g.toast(g.ui.isTouch
      ? 'Joystick derecho: apuntar y tirar agua · Izquierdo: moverte (para arriba, volar)'
      : g.input.padSeen ? 'Stick derecho: apuntar · RT: tirar agua · A: saltar' : 'Apuntá con el mouse y mantené el click para tirar agua', null, 'good');
  }

  defeat(p) {
    if (this.state !== 'fight') return;
    this.state = 'scene';
    const other = this.fighters().find((f) => f !== p);
    this.mateX = other ? other.cx : p.cx - 16;
    this.clearHazards();
    this.attack = null;
    this.releaseBot();
    this.g.ui.setBossBar(null);
    this.g.startScene((sc) => victoryScript(sc, this, p), {
      onEnd: (skipped, sc) => this.finish(p, sc, skipped),
    });
  }

  finish(p, sc, skipped) {
    const g = this.g;
    this.state = 'done';
    this.losses = 0;
    // todos aterrizan en el patio (online, el otro también)
    for (const f of this.fighters()) {
      const a = sc.actors[f.char];
      const x = skipped || !a ? LAND_X + (f === this.local ? -10 : 10) : a.x;
      this.place(f, x, SURFACE * TILE, 1, true);
    }
    g.popiMet = true; // después del final, Popi ya está en el patio (sin la escena del Gol)
    g.save();
    if (g.net.isHost) g.net.send('ending', { earned: Math.floor(g.counters.earned) });
    const mins = Math.floor(g.counters.playTime / 60);
    g.state = 'paused';
    g.ui.showMsg('¡Fin! ♥', `${ENDING_TEXT}\n\nTiempo: ${mins} min · Bloques cavados: ${Math.round(g.counters.tiles)}\nPlata juntada: ${fmtMoney(g.counters.earned)}`, [
      { label: 'Seguir jugando', onClick: () => { g.state = 'play'; } },
    ]);
  }

  // ------------------------------------------------------------
  //  Caer y revivir
  // ------------------------------------------------------------
  /** a alguien se le terminó la vida: queda tirado hasta que el otro lo levante */
  knockDown(p) {
    const g = this.g;
    if (p.downed) return;
    p.downed = true; p.revive = 0; p.hp = 0;
    p.firing = false; p.digging = false; p.hovering = false;
    g.audio.play('faint');
    for (let i = 0; i < 12; i++) g.particles.add({ x: p.cx, y: p.cy, vx: (Math.random() - 0.5) * 60, vy: -Math.random() * 60, life: 0.8, max: 0.8, color: '#ffffff', star: true, grav: 40 });
    const mate = CHARACTERS[p.char === 'pablo' ? 'pancha' : 'pablo'].name;
    if (p === this.local) g.toast(`¡Caíste! ${mate} te puede levantar`, null, 'warn');
    else if (!p.remote) {
      g.addText(p.cx, p.y - 8, '¡AYUDA!', '#ff9ccc');
      g.tip('revive', g.ui.isTouch || g.input.padSeen ? `¡${CHARACTERS[p.char].name} cayó! Acercate y tocá REVIVIR (o X) varias veces` : `¡${CHARACTERS[p.char].name} cayó! Acercate y apretá E varias veces para levantarla`);
    }
  }

  /** un toque de E al lado de alguien caído */
  reviveTap(by, target) {
    const g = this.g;
    if (!target || !target.downed) return;
    if (target.remote) {
      g.net.send('rv');
      target.revive = Math.min(0.99, (target.revive || 0) + BOSS.reviveTap); // se ve enseguida; lo confirma el otro
    } else target.reviveTap();
    g.audio.play('ui');
    for (let i = 0; i < 2; i++) g.particles.add({ x: target.cx + (Math.random() - 0.5) * 10, y: target.y + target.h - 4, vx: (Math.random() - 0.5) * 10, vy: -20, life: 0.6, max: 0.6, heart: true, grav: 0 });
  }

  /** el caído más cerca de `p` (a distancia de revivir), si hay */
  downedNear(p) {
    let best = null, bd = BOSS.reviveR;
    for (const f of this.fighters()) {
      if (f === p || !f.downed) continue;
      const d = Math.abs(f.cx - p.cx) + Math.abs((f.y + f.h) - (p.y + p.h)) * 0.5;
      if (d < bd) { bd = d; best = f; }
    }
    return best;
  }

  /**
   * cayeron todos: se desmayan, "algo" los lleva hasta casa y tienen que volver a bajar.
   * Aguilus se recupera y los espera junto al cofre.
   */
  playerDown() {
    const g = this.g, p = this.local, online = g.net.isHost;
    if (this.state !== 'fight') return;
    if (online) g.net.send('teamDown'); // online: vuelven los dos
    g.state = 'faint';
    for (const f of this.fighters()) { f.downed = false; f.revive = 0; f.firing = false; }
    p.dead = true;
    g.audio.jet(false);
    g.audio.play('faint');
    g.counters.deaths++;
    this.losses++;
    this.releaseBot();
    this.reset();
    g.ui.setBossBar(null);
    setTimeout(() => g.ui.fade(true), 400);
    setTimeout(() => {
      const msg = online
        ? ['¡Se desmayaron!', 'Aguilus los dejó viendo estrellitas.\n\nCuando abrieron los ojos estaban en casa... con una pluma violeta en la almohada.\n\nAguilus los espera abajo de todo, ¡y ya se recuperó!']
        : ['¡Se desmayaron!', 'Aguilus los dejó viendo estrellitas a los dos.\n\nCuando abrieron los ojos estaban en casa. Nadie sabe cómo llegaron... solo había una pluma violeta en la almohada.\n\nAguilus los espera abajo de todo, ¡y ya se recuperó!'];
      g.ui.showMsg(msg[0], msg[1], [{
        label: 'Volver a bajar',
        onClick: () => {
          p.spawn();
          if (g.popi) g.popi.place();
          p.hp = HP_MAX;
          p.energy = g.stats.energyMax;
          g.cam.x = p.cx - g.vw / 2;
          g.cam.y = p.cy - g.vh / 2;
          g.ui.fade(false);
          g.state = 'play';
          g.save();
        },
      }]);
    }, 1300);
  }

  /** vuelve a esperar parado junto al cofre, con la vida llena */
  reset() {
    this.state = 'waiting';
    this.hp = BOSS.hp;
    this.phase = 1;
    this.clearHazards();
    this.attack = null; this.attackN = 0; this.shieldT = 0;
    this.x = this.tx = this.homeX; this.y = FLOOR_Y; this.baseY = SKY_Y; this.vx = 0; this.facing = -1;
  }

  // ------------------------------------------------------------
  //  Pelea
  // ------------------------------------------------------------
  orb() {
    return { x: this.x + this.facing * 5.5, y: this.y - AG_H - 3 };
  }

  /** caja del cuerpo de Aguilus */
  body() {
    return { x0: this.x - 7, x1: this.x + 7, y0: this.y - AG_H + 2, y1: this.y };
  }

  hurtPlayer(p, dmg, kx = 0) {
    if (p.dead || p.downed || p.hurtT > 0 || p.guardT > 0) return false;
    if (!p.remote && this.g.state !== 'play') return false; // online: mientras tenés la pausa abierta no te pegan
    if (p.remote) {
      // el daño del otro se lo aplica su propio dispositivo
      this.g.net.send('hurt', { dmg, kx });
      p.guardT = 0.8;
      return true;
    }
    if (kx) { p.vx = kx; p.vy = Math.min(p.vy, -110); }
    p.hurt(dmg, 'boss');
    return true;
  }

  /** a quién apunta el próximo ataque (cualquiera que siga en pie) */
  pickTarget() {
    const fs = this.fighters().filter((f) => !f.dead && !f.downed);
    // a las personas las elige un poco más seguido que al bot
    const w = fs.map((f) => (f.ai ? 0.6 : 1));
    let r = Math.random() * w.reduce((s, v) => s + v, 0);
    for (let i = 0; i < fs.length; i++) if ((r -= w[i]) < 0) return fs[i];
    return fs[0] || this.local;
  }

  /** se mueve de un lado a otro con ritmo cambiante: lento, normal, ráfagas rápidas y pausas */
  pickLeg() {
    const r = Math.random();
    this.spd = r < 0.3 ? 28 + Math.random() * 20 : r < 0.72 ? 62 + Math.random() * 30 : 125 + Math.random() * 50;
    this.spd *= [1, 1.25, 1.4][this.phase - 1];
    let tx = this.x;
    for (let i = 0; i < 6 && Math.abs(tx - this.x) < 50; i++) tx = ARENA.x0 + 24 + Math.random() * (ARENA.x1 - ARENA.x0 - 48);
    this.tx = tx;
    this.ty = SKY_Y - 22 + Math.random() * 36;
    if (Math.random() < 0.3) this.pauseT = 0.3 + Math.random() * 0.8;
  }

  cruise(dt, mult) {
    let want = 0;
    if (this.pauseT > 0) this.pauseT -= dt;
    else {
      if (Math.abs(this.tx - this.x) < 6) this.pickLeg();
      const d = this.tx - this.x;
      want = Math.sign(d) * this.spd * mult * clamp(Math.abs(d) / 24, 0.3, 1);
    }
    this.vx += (want - this.vx) * Math.min(1, dt * 3.5);
    this.x = clamp(this.x + this.vx * dt, ARENA.x0 + 8, ARENA.x1 - 8);
    this.baseY += (this.ty - this.baseY) * Math.min(1, dt * 1.5);
    this.y = this.baseY + Math.sin(this.t * 1.7) * 6;
    // estela de viento en las ráfagas rápidas
    if (Math.abs(this.vx) > 110 && Math.random() < 0.6) this.g.particles.add({ x: this.x - Math.sign(this.vx) * 8, y: this.y - 8 - Math.random() * 18, vx: -this.vx * 0.3, vy: 0, life: 0.3, max: 0.3, color: 'rgba(255,240,220,0.5)', size: 1, grav: 0 });
  }

  updateFight(dt) {
    const g = this.g;
    const fs = this.fighters();
    for (const f of fs) if (f.guardT > 0) f.guardT -= dt;
    const up = fs.filter((f) => !f.downed && !f.dead);
    // cayeron todos: un ratito y se desmayan
    if (!up.length) {
      this.allDownT += dt;
      if (this.allDownT > 1.6) { this.allDownT = 0; this.playerDown(); return; }
    } else this.allDownT = 0;
    if (!this.target || !up.includes(this.target)) this.target = up.length ? this.pickTarget() : this.local;
    const p = this.target;
    this.flash = Math.max(0, this.flash - dt);
    this.shieldT = Math.max(0, this.shieldT - dt);
    const atk = this.attack;
    if (!atk || atk.free) this.cruise(dt, atk ? 0.5 : 1);
    if (atk) this.updateAttack(dt, p, atk);
    else if (up.length) {
      this.castT -= dt;
      if (this.castT <= 0) { this.target = this.pickTarget(); this.startAttack(this.target); }
    }
    const a = this.attack;
    if (!a || (a.type !== 'dive' && a.type !== 'beam')) this.facing = p.cx > this.x ? 1 : -1;
    // el compañero bot grita cada tanto
    this.cheerT -= dt;
    if (this.cheerT <= 0) {
      this.cheerT = 6 + Math.random() * 5;
      const bot = fs.find((f) => f.ai && !f.downed);
      if (bot) g.addText(bot.cx, bot.y - 8, BOT_CHEERS[Math.floor(Math.random() * BOT_CHEERS.length)], '#fff4e0');
    }
    for (const m of this.marks) m.t -= dt;
    this.marks = this.marks.filter((m) => m.t > 0);
    this.updateRocks(dt, up);
    this.updateHazards(dt, up);
    this.updateMinions(dt, up, true);
    this.updateWater(dt, fs, true);
  }

  /** online, en el invitado: el agua y las aguilitas que caen se mueven acá (el daño lo cuenta el anfitrión) */
  updateRemote(dt) {
    this.t += dt;
    if (this.state !== 'fight') { this.water.length = 0; return; }
    const fs = this.fighters();
    for (const m of this.minions) {
      if (m.nx === undefined) continue;
      const k = Math.min(1, dt * 14);
      m.x += (m.nx - m.x) * k; m.y += (m.ny - m.y) * k;
    }
    this.updateWater(dt, fs, false);
  }

  // ---- ataques ----
  startAttack(p) {
    const g = this.g, ph = this.phase;
    this.attackN++;
    const alive = this.minions.filter((m) => m.state !== 'dead').length;
    const cap = BOSS.minionCap[ph - 1];
    let type;
    if (this.attackN === 2) type = 'summon'; // al principio llama a las aguilitas enseguida
    else {
      const opts = [
        ['rocks', 1], ['feathers', 1], ['pillars', 0.9], ['dive', ph >= 2 ? 1.1 : 0.7],
        ['summon', alive < cap ? (alive === 0 ? 1.4 : 0.6) : 0],
        ['beam', ph >= 2 ? 1 : 0], ['meteor', ph >= 3 ? 0.9 : 0],
      ].map(([k, w]) => [k, k === this.lastType ? w * 0.25 : w]);
      let r = Math.random() * opts.reduce((s, o) => s + o[1], 0);
      type = 'rocks';
      for (const [k, w] of opts) { if ((r -= w) < 0) { type = k; break; } }
    }
    this.lastType = type;
    g.sfx('charge');
    if (type === 'rocks') this.attack = { type, t: 0, wind: 0.75, free: true };
    else if (type === 'feathers') this.attack = { type, t: 0, wind: 0.65, free: true, shots: ph >= 2 ? 2 : 1 };
    else if (type === 'pillars') {
      this.attack = { type, t: 0, wind: 1.05, free: true };
      // una columna justo debajo del jugador y otras cerca, separadas para que haya dónde pararse
      const xs = [clamp(p.cx, ARENA.x0 + 6, ARENA.x1 - 6)];
      const n = ph >= 2 ? 4 : 3;
      for (let tries = 0; xs.length < n && tries < 40; tries++) {
        const x = clamp(p.cx + (Math.random() - 0.5) * 220, ARENA.x0 + 6, ARENA.x1 - 6);
        if (xs.every((o) => Math.abs(o - x) > 30)) xs.push(x);
      }
      for (const x of xs) this.pillars.push({ x, t: -1.05, hit: false });
    } else if (type === 'summon') {
      this.attack = { type, t: 0, wind: 1.3, free: false, n: Math.min(cap - alive, ph >= 3 ? 3 : 2), done: false };
      this.shieldT = 1.6;
      const lines = ['¡AGUILITAS, AL ATAQUE!', '¡VENGAN, MIS PICHONES!', '¡REFUERZOS!'];
      g.addText(this.x, this.y - AG_H - 8, lines[Math.floor(Math.random() * lines.length)], '#c9a6ff');
    } else if (type === 'beam') {
      const o = this.orb();
      this.attack = { type, t: 0, stage: 'aim', free: false, ang: Math.atan2(p.cy - o.y, p.cx - o.x), hits: new Set() };
      g.addText(this.x, this.y - AG_H - 6, '¡!', '#c98cff');
    } else if (type === 'meteor') {
      this.attack = { type, t: 0, wind: 0.9, free: true };
      g.addText(this.x, this.y - AG_H - 8, '¡LLUVIA DE METEORITOS!', '#ffb347');
    } else {
      this.attack = { type, t: 0, stage: 'aim', tx: p.cx, free: false };
      g.addText(this.x, this.y - AG_H - 6, '¡!', '#ff5d6c');
    }
  }

  endAttack() {
    this.attack = null;
    this.castT = [1.3, 0.85, 0.6][this.phase - 1] + Math.random() * 0.7;
  }

  updateAttack(dt, p, a) {
    const g = this.g;
    a.t += dt;
    const o = this.orb();
    if (a.type === 'rocks' || a.type === 'meteor') {
      if (Math.random() < 0.7) g.particles.add({ x: o.x + (Math.random() - 0.5) * 16, y: o.y + (Math.random() - 0.5) * 16, vx: 0, vy: 0, life: 0.35, max: 0.35, color: Math.random() < 0.5 ? '#c98cff' : '#ffb347', star: true, grav: 0 });
      if (a.t >= a.wind) { if (a.type === 'rocks') this.spawnRocks(p); else this.spawnMeteors(); this.endAttack(); }
    } else if (a.type === 'feathers') {
      // abre las alas: plumitas violetas alrededor antes de disparar
      if (a.t < a.wind && Math.random() < 0.8) g.particles.add({ x: this.x + (Math.random() - 0.5) * 24, y: this.y - 14 - Math.random() * 14, vx: 0, vy: 0, life: 0.3, max: 0.3, color: Math.random() < 0.5 ? '#a374dc' : '#e8d8ff', star: true, grav: 0 });
      if (a.t >= a.wind) {
        this.shootFeathers(p);
        a.shots--;
        if (a.shots > 0) { a.t = a.wind - 0.45; return; }
        this.endAttack();
      }
    } else if (a.type === 'pillars') {
      if (Math.random() < 0.7) g.particles.add({ x: o.x + (Math.random() - 0.5) * 14, y: o.y + (Math.random() - 0.5) * 14, vx: 0, vy: 0, life: 0.35, max: 0.35, color: Math.random() < 0.5 ? '#ff5d2e' : '#ffd34d', star: true, grav: 0 });
      if (a.t >= a.wind) this.endAttack();
    } else if (a.type === 'summon') {
      this.vx *= Math.max(0, 1 - dt * 5);
      if (Math.random() < 0.8) g.particles.add({ x: o.x + (Math.random() - 0.5) * 20, y: o.y + (Math.random() - 0.5) * 20, vx: 0, vy: 0, life: 0.4, max: 0.4, color: Math.random() < 0.5 ? '#c9a6ff' : '#ffffff', star: true, grav: 0 });
      if (!a.done && a.t >= 0.6) {
        a.done = true;
        g.sfx('magic');
        for (let i = 0; i < a.n; i++) this.spawnMinion(o.x + (i - (a.n - 1) / 2) * 16, o.y - 6);
      }
      if (a.t >= a.wind) this.endAttack();
    } else if (a.type === 'beam') this.updateBeam(dt, p, a);
    else this.updateDive(dt, p, a);
  }

  /** rayo violeta: apunta un ratito (una línea finita avisa) y dispara un rayo grueso */
  updateBeam(dt, p, a) {
    const g = this.g, o = this.orb();
    this.vx *= Math.max(0, 1 - dt * 6);
    this.x = clamp(this.x + this.vx * dt, ARENA.x0 + 8, ARENA.x1 - 8);
    if (a.stage === 'aim') {
      if (a.t < 0.6) {
        // sigue al objetivo, pero girando de a poco
        const want = Math.atan2(p.cy - o.y, p.cx - o.x);
        let d = want - a.ang;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        a.ang += clamp(d, -dt * 2.2, dt * 2.2);
      }
      this.facing = Math.cos(a.ang) >= 0 ? 1 : -1;
      if (Math.random() < 0.8) g.particles.add({ x: o.x + (Math.random() - 0.5) * 8, y: o.y + (Math.random() - 0.5) * 8, vx: 0, vy: 0, life: 0.3, max: 0.3, color: '#e8d8ff', star: true, grav: 0 });
      if (a.t >= 0.95) { a.stage = 'fire'; a.t = 0; g.sfx('beam'); g.shakeAll(3); }
      return;
    }
    if (a.stage === 'fire') {
      const dx = Math.cos(a.ang), dy = Math.sin(a.ang);
      for (const q of this.fighters()) {
        if (a.hits.has(q) || q.downed || q.dead) continue;
        const rx = q.cx - o.x, ry = q.cy - o.y;
        const along = rx * dx + ry * dy;
        if (along < 0 || along > BEAM_LEN) continue;
        if (Math.abs(rx * dy - ry * dx) < 8 && this.hurtPlayer(q, BOSS.beamDmg, dx * 130)) a.hits.add(q);
      }
      // chispas donde pega en el piso
      const hitT = dy > 0.05 ? (FLOOR_Y - o.y) / dy : BEAM_LEN;
      if (hitT < BEAM_LEN && Math.random() < 0.9) g.particles.add({ x: o.x + dx * hitT, y: FLOOR_Y - 2, vx: (Math.random() - 0.5) * 70, vy: -30 - Math.random() * 50, life: 0.4, max: 0.4, color: Math.random() < 0.5 ? '#e8d8ff' : '#c98cff', size: 1, grav: 160 });
      if (a.t >= 0.45) this.endAttack();
    }
  }

  /** picada: apunta, se tira en diagonal contra el piso, hace temblar todo y vuelve a subir */
  updateDive(dt, p, a) {
    const g = this.g;
    if (a.stage === 'aim') {
      this.vx *= Math.max(0, 1 - dt * 6);
      this.x += this.vx * dt + (Math.random() - 0.5) * 1.2;
      if (a.t < 0.55) a.tx = clamp(p.cx, ARENA.x0 + 8, ARENA.x1 - 8);
      this.facing = a.tx > this.x ? 1 : -1;
      if (a.t >= 0.85) { a.stage = 'dive'; a.t = 0; g.sfx('swoosh'); }
      return;
    }
    if (a.stage === 'dive') {
      const dx = a.tx - this.x, dy = FLOOR_Y - this.y, d = Math.hypot(dx, dy);
      const v = [280, 330, 360][this.phase - 1] * dt;
      if (d <= v) {
        this.x = a.tx; this.y = FLOOR_Y;
        a.stage = 'ground'; a.t = 0;
        g.sfx('boom'); g.shakeAll(5);
        for (let i = 0; i < 14; i++) g.particles.add({ x: this.x + (Math.random() - 0.5) * 20, y: FLOOR_Y - 1, vx: (Math.random() - 0.5) * 90, vy: -Math.random() * 50, life: 0.6, max: 0.6, color: Math.random() < 0.5 ? '#7a4a2c' : '#ff8a2e', size: 1, grav: 160 });
        for (const dir of [-1, 1]) this.waves.push({ x: this.x + dir * 8, dir });
      } else { this.x += dx / d * v; this.y += dy / d * v; }
      this.facing = dx >= 0 ? 1 : -1;
      if (Math.random() < 0.8) g.particles.add({ x: this.x, y: this.y - 14, vx: 0, vy: 0, life: 0.3, max: 0.3, color: 'rgba(201,140,255,0.6)', size: 2, grav: 0 });
    } else if (a.stage === 'ground') {
      if (a.t >= 0.8) { a.stage = 'rise'; a.t = 0; }
    } else if (a.stage === 'rise') {
      this.y -= 110 * dt;
      if (this.y <= SKY_Y) { this.y = this.baseY = SKY_Y; this.vx = 0; this.endAttack(); }
    }
    // embestida: chocarlo en la picada o justo al aterrizar duele
    if (a.stage === 'dive' || (a.stage === 'ground' && a.t < 0.15)) {
      const b = this.body();
      for (const q of this.fighters()) {
        if (q.x < b.x1 && q.x + q.w > b.x0 && q.y < b.y1 && q.y + q.h > b.y0) this.hurtPlayer(q, BOSS.diveDmg, q.cx > this.x ? 140 : -140);
      }
    }
  }

  shootFeathers(p) {
    const g = this.g;
    const n = [3, 5, 7][this.phase - 1], sp = [125, 150, 160][this.phase - 1];
    const ox = this.x + this.facing * 4, oy = this.y - 16;
    const base = Math.atan2(p.cy - oy, p.cx - ox);
    for (let i = 0; i < n; i++) {
      const a = base + (i - (n - 1) / 2) * 0.22;
      this.feathers.push({ x: ox, y: oy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, a });
    }
    g.sfx('throw');
  }

  addRock(x, y, vx, vy) {
    const spr = rockSprites();
    const k = Math.floor(Math.random() * spr.length);
    this.rocks.push({ x, y, vx, vy, state: 'fall', t: 0, dead: false, wet: 0, k, rad: spr[k][0].width / 2, spin: (Math.random() < 0.5 ? -1 : 1) * (3 + Math.random() * 4) });
  }

  spawnRocks(p) {
    const g = this.g, o = this.orb();
    const n = (this.phase >= 2 ? 3 : 2) + (Math.random() < 0.35 ? 1 : 0);
    g.sfx('magma');
    for (let i = 0; i < n; i++) {
      const tx = clamp(p.cx + (i - (n - 1) / 2) * 30 + (Math.random() - 0.5) * 18, ARENA.x0, ARENA.x1);
      const T = (this.phase >= 2 ? 1.05 : 1.3) + Math.random() * 0.35;
      const ty = FLOOR_Y - 4;
      this.addRock(o.x, o.y, (tx - o.x) / T, (ty - o.y - 0.5 * ROCK_G * T * T) / T);
      this.marks.push({ x: tx, t: T });
    }
  }

  /** lluvia de meteoritos: caen derecho desde arriba por toda la plataforma, de a poco */
  spawnMeteors() {
    const g = this.g;
    g.sfx('magma'); g.shakeAll(2);
    const n = 7 + Math.floor(Math.random() * 3);
    const span = ARENA.x1 - ARENA.x0 - 20;
    for (let i = 0; i < n; i++) {
      const x = ARENA.x0 + 10 + (i + 0.5) * span / n + (Math.random() - 0.5) * 12;
      const y0 = this.ceilY - 30 - Math.random() * 130;
      const T = Math.sqrt(2 * (FLOOR_Y - 4 - y0) / ROCK_G);
      this.addRock(x, y0, 0, 0);
      this.marks.push({ x, t: T });
    }
  }

  updateRocks(dt, up) {
    const g = this.g;
    for (const r of this.rocks) {
      if (r.dead) continue;
      r.t += dt;
      r.vy += ROCK_G * dt;
      r.x += r.vx * dt; r.y += r.vy * dt;
      if (r.state === 'fall' && Math.random() < 0.5) g.particles.add({ x: r.x + (Math.random() - 0.5) * r.rad, y: r.y, vx: (Math.random() - 0.5) * 8, vy: -6, life: 0.4, max: 0.4, color: Math.random() < 0.4 ? '#ff7a1e' : 'rgba(70,50,45,0.6)', size: 1, grav: -10, smoke: Math.random() < 0.3 });
      if (r.state === 'fall') {
        const m = r.rad * 0.6;
        for (const p of up) {
          if (r.x > p.x - m && r.x < p.x + p.w + m && r.y > p.y - m && r.y < p.y + p.h + m) {
            this.hurtPlayer(p, BOSS.rockDmg);
            this.shatter(r);
            break;
          }
        }
        if (r.dead) continue;
      }
      if (g.world.solidPx(r.x, r.y + r.rad - 2) || r.y > FLOOR_Y + 30 || r.x < ARENA.x0 - 60 || r.x > ARENA.x1 + 60) this.shatter(r);
    }
    this.rocks = this.rocks.filter((r) => !r.dead);
  }

  /** el agua apagó una roca: se vuelve piedra gris, no lastima y se rompe al caer */
  coolRock(r) {
    const g = this.g;
    r.state = 'cool';
    r.vx *= 0.5; r.vy = Math.min(r.vy, 20);
    g.sfx('steam');
    for (let i = 0; i < 6; i++) g.particles.add({ x: r.x + (Math.random() - 0.5) * r.rad, y: r.y, vx: (Math.random() - 0.5) * 20, vy: -20 - Math.random() * 20, life: 0.9, max: 0.9, color: 'rgba(235,235,240,0.7)', size: 2, grav: -15, smoke: true });
  }

  /** plumas, columnas de fuego y ondas de choque: hay que esquivarlas */
  updateHazards(dt, up) {
    const g = this.g;
    for (const f of this.feathers) {
      f.x += f.vx * dt; f.y += f.vy * dt;
      if (Math.random() < 0.3) g.particles.add({ x: f.x, y: f.y, vx: 0, vy: 0, life: 0.25, max: 0.25, color: '#c98cff', size: 1, grav: 0 });
      for (const p of up) {
        if (!f.dead && f.x > p.x - 1 && f.x < p.x + p.w + 1 && f.y > p.y - 1 && f.y < p.y + p.h + 1) {
          f.dead = true;
          this.hurtPlayer(p, BOSS.featherDmg, Math.sign(f.vx) * 60);
        }
      }
      if (g.world.solidPx(f.x, f.y) || f.y > FLOOR_Y + 4 || f.x < ARENA.x0 - 80 || f.x > ARENA.x1 + 80 || f.y < this.ceilY - 100) f.dead = true;
    }
    this.feathers = this.feathers.filter((f) => !f.dead);

    for (const c of this.pillars) {
      const was = c.t;
      c.t += dt;
      if (was < 0 && c.t >= 0) {
        g.sfx('flame'); g.shakeAll(2);
        for (let i = 0; i < 10; i++) g.particles.add({ x: c.x + (Math.random() - 0.5) * 10, y: FLOOR_Y - 2, vx: (Math.random() - 0.5) * 40, vy: -60 - Math.random() * 80, life: 0.6, max: 0.6, color: Math.random() < 0.5 ? '#ffd34d' : '#ff6a1a', size: 1, grav: 60 });
      }
      if (c.t < 0) {
        if (Math.random() < 0.25) g.particles.add({ x: c.x + (Math.random() - 0.5) * 10, y: FLOOR_Y - 1, vx: 0, vy: -20 - Math.random() * 20, life: 0.4, max: 0.4, color: '#ff8a2e', size: 1, grav: 0 });
        continue;
      }
      const h = pillarH(c.t);
      c.hits = c.hits || new Set();
      for (const p of up) {
        if (!c.hits.has(p) && h > 8 && Math.abs(p.cx - c.x) < 6 + p.w / 2 - 1 && p.y + p.h > FLOOR_Y - h) {
          if (this.hurtPlayer(p, BOSS.pillarDmg, p.cx > c.x ? 90 : -90)) c.hits.add(p);
        }
      }
    }
    this.pillars = this.pillars.filter((c) => c.t < 0.9);

    for (const w of this.waves) {
      w.x += w.dir * [125, 150, 165][this.phase - 1] * dt;
      if (Math.random() < 0.6) g.particles.add({ x: w.x, y: FLOOR_Y - 2, vx: -w.dir * 10, vy: -30 - Math.random() * 30, life: 0.35, max: 0.35, color: Math.random() < 0.5 ? '#7a4a2c' : '#ff8a2e', size: 1, grav: 160 });
      // se salta: solo pega si estás en el piso (o casi)
      for (const p of up) {
        if (!w.dead && Math.abs(p.cx - w.x) < 5 && p.y + p.h > FLOOR_Y - 6) {
          if (this.hurtPlayer(p, BOSS.waveDmg, w.dir * 120)) w.dead = true;
        }
      }
      if (w.x < ARENA.x0 - 16 || w.x > ARENA.x1 + 16) w.dead = true;
    }
    this.waves = this.waves.filter((w) => !w.dead);
  }

  shatter(r) {
    const g = this.g;
    r.dead = true;
    g.sfx('break');
    const cool = r.state === 'cool';
    for (let i = 0; i < 6 + r.rad; i++) g.particles.add({ x: r.x, y: r.y, vx: (Math.random() - 0.5) * 70, vy: -Math.random() * 60, life: 0.5, max: 0.5, color: cool ? (Math.random() < 0.5 ? '#58585f' : '#8a8a90') : Math.random() < 0.55 ? '#3a2316' : Math.random() < 0.5 ? '#ff6a1a' : '#ffd060', size: 1, grav: 200 });
  }

  // ---- aguilitas ----
  spawnMinion(x, y) {
    const g = this.g;
    for (let i = 0; i < 8; i++) g.particles.add({ x, y, vx: (Math.random() - 0.5) * 50, vy: (Math.random() - 0.5) * 50, life: 0.5, max: 0.5, color: 'rgba(220,200,255,0.8)', size: 2, grav: 0, smoke: true });
    this.minions.push({
      x, y, vx: (Math.random() - 0.5) * 60, vy: -40, hp: BOSS.minionHp, state: 'fly', t: 0,
      nextT: 1.4 + Math.random() * 1.6, facing: 1, flash: 0, ph: Math.random() * 6, rot: 0, id: Math.random(),
    });
  }

  killMinion(m, vx) {
    const g = this.g;
    m.state = 'dead'; m.t = 0;
    // sale volando para afuera de la plataforma y se cae
    const out = m.x < (PLAT.x0 + PLAT.x1) / 2 ? -1 : 1;
    m.vx = (Math.abs(vx) > 1 ? Math.sign(vx) : out) * (50 + Math.random() * 40);
    m.vy = -110; m.spin = (Math.random() < 0.5 ? -1 : 1) * (9 + Math.random() * 5); m.bounced = false;
    g.sfx('peep');
    g.addText(m.x, m.y - 6, '¡PÍO!', '#e8e3d6');
    for (let i = 0; i < 6; i++) g.particles.add({ x: m.x, y: m.y, vx: (Math.random() - 0.5) * 50, vy: -Math.random() * 40, life: 0.8, max: 0.8, color: Math.random() < 0.5 ? '#a374dc' : '#8a5530', size: 1, grav: 60 });
  }

  updateMinions(dt, up, auth) {
    for (const m of this.minions) {
      m.t += dt;
      m.flash = Math.max(0, m.flash - dt);
      if (m.state === 'dead') {
        // cae dando vueltas; si pega en la plataforma rebota y rueda hasta caerse por el borde
        m.vy += 420 * dt;
        m.x += m.vx * dt; m.y += m.vy * dt;
        m.rot += m.spin * dt;
        const onPlat = m.x > PLAT.x0 + 2 && m.x < PLAT.x1 - 2;
        if (onPlat && m.vy > 0 && m.y >= FLOOR_Y - 4 && m.y < FLOOR_Y + 6) {
          m.y = FLOOR_Y - 4;
          if (!m.bounced) { m.bounced = true; m.vy = -80; m.vx = (m.x < (PLAT.x0 + PLAT.x1) / 2 ? -1 : 1) * 120; this.g.audio.play('land'); }
          else m.vy = 0;
        }
        if (m.y > LAVA_Y) {
          // se cae al mar de lava: chispazo y humito
          m.gone = true;
          this.g.audio.play('steam');
          for (let i = 0; i < 8; i++) this.g.particles.add({ x: m.x + (Math.random() - 0.5) * 8, y: LAVA_Y - 1, vx: (Math.random() - 0.5) * 40, vy: -30 - Math.random() * 50, life: 0.7, max: 0.7, color: i % 3 ? '#ffb347' : 'rgba(200,190,190,0.6)', size: 1, grav: 90, smoke: i % 3 === 0 });
        }
        continue;
      }
      if (!auth) continue;
      const tgt = m.tgt && up.includes(m.tgt) ? m.tgt : (m.tgt = up[Math.floor(Math.random() * up.length)] || null);
      const sp = [1, 1.1, 1.2][this.phase - 1];
      if (m.state === 'fly') {
        // revolotea arriba de alguien, cada una a su ritmo
        const hx = tgt ? tgt.cx + Math.sin(m.t * 1.3 + m.ph) * 55 : this.x;
        const hy = FLOOR_Y - 58 + Math.sin(m.t * 2.1 + m.ph) * 14;
        m.vx += clamp((hx - m.x) * 3 - m.vx, -260, 260) * dt * 2;
        m.vy += clamp((hy - m.y) * 3 - m.vy, -260, 260) * dt * 2;
        m.nextT -= dt;
        if (m.nextT <= 0 && tgt) { m.state = 'aim'; m.t = 0; }
      } else if (m.state === 'aim') {
        m.vx *= Math.max(0, 1 - dt * 8); m.vy *= Math.max(0, 1 - dt * 8);
        if (tgt) { m.ax = tgt.cx; m.ay = tgt.cy; }
        if (m.t >= 0.55) {
          const d = Math.hypot(m.ax - m.x, m.ay - m.y) || 1, v = 175 * sp;
          m.vx = (m.ax - m.x) / d * v; m.vy = (m.ay - m.y) / d * v;
          m.state = 'swoop'; m.t = 0;
          this.g.audio.play('swoosh');
        }
      } else if (m.state === 'swoop') {
        if (m.y >= FLOOR_Y - 7 || m.t > 1.3) { m.state = 'rise'; m.t = 0; m.vy = -110; m.vx *= 0.4; }
      } else if (m.state === 'rise') {
        m.vy = Math.min(m.vy + 60 * dt, -40);
        if (m.t > 0.7) { m.state = 'fly'; m.t = 0; m.nextT = (2 + Math.random() * 2) / sp; }
      }
      m.x = clamp(m.x + m.vx * dt, ARENA.x0 - 10, ARENA.x1 + 10);
      m.y = clamp(m.y + m.vy * dt, this.ceilY + 10, FLOOR_Y - 5);
      if (Math.abs(m.vx) > 8) m.facing = m.vx > 0 ? 1 : -1;
      // chocarlas duele
      if (m.state !== 'aim') {
        for (const p of up) {
          if (Math.abs(p.cx - m.x) < p.w / 2 + 4 && Math.abs(p.cy - m.y) < p.h / 2 + 3) this.hurtPlayer(p, BOSS.minionDmg, Math.sign(p.cx - m.x || 1) * 90);
        }
      }
    }
    this.minions = this.minions.filter((m) => !m.gone);
  }

  // ---- agua ----
  /** cada pistola tira gotitas mientras se aprieta; `auth`: acá se cuenta el daño (anfitrión o sin red) */
  updateWater(dt, fs, auth) {
    const g = this.g;
    for (const f of fs) {
      if (f.gunKick > 0) f.gunKick = Math.max(0, f.gunKick - dt * 8);
      const firing = f.firing && !f.downed && !f.dead && f.aim;
      if (!firing) { f.gunCd = Math.max(0, (f.gunCd || 0) - dt); continue; }
      f.gunCd = (f.gunCd || 0) - dt;
      while (f.gunCd <= 0) {
        f.gunCd += 1 / BOSS.fireRate;
        const a = Math.atan2(f.aim.y, f.aim.x) + (Math.random() - 0.5) * 0.07;
        const v = BOSS.waterSpeed * (0.95 + Math.random() * 0.1);
        this.water.push({ x: f.cx + f.aim.x * 9, y: f.cy - 2 + f.aim.y * 9, vx: Math.cos(a) * v + f.vx * 0.3, vy: Math.sin(a) * v, t: 0, by: f });
        f.gunKick = 1;
        if (f === this.local && Math.random() < 0.5) g.audio.play('squirt');
      }
    }
    const b = this.body(), shield = this.shieldT > 0;
    for (const d of this.water) {
      d.t += dt;
      d.vy += BOSS.waterGrav * dt;
      d.x += d.vx * dt; d.y += d.vy * dt;
      let hit = false;
      // Aguilus (con el escudo, el agua rebota)
      if (shield && Math.hypot(d.x - this.x, d.y - (this.y - AG_H / 2)) < 21) {
        this.splash(d.x, d.y, '#c9a6ff');
        hit = true;
      } else if (d.x > b.x0 && d.x < b.x1 && d.y > b.y0 && d.y < b.y1) {
        this.splash(d.x, d.y);
        if (auth) this.hit(d.by, 1);
        hit = true;
      }
      // aguilitas
      if (!hit) {
        for (const m of this.minions) {
          if (m.state === 'dead' || Math.abs(d.x - m.x) > 6 || Math.abs(d.y - m.y) > 5) continue;
          this.splash(d.x, d.y);
          m.flash = 0.1;
          if (auth && --m.hp <= 0) this.killMinion(m, d.vx);
          hit = true; break;
        }
      }
      // rocas encendidas: el agua las apaga
      if (!hit) {
        for (const r of this.rocks) {
          if (r.state !== 'fall' || Math.hypot(d.x - r.x, d.y - r.y) > r.rad * 0.6 + 2) continue;
          this.splash(d.x, d.y, '#e8e8f0');
          if (auth && ++r.wet >= BOSS.rockWater) this.coolRock(r);
          hit = true; break;
        }
      }
      if (!hit && (g.world.solidPx(d.x, d.y) || d.y > FLOOR_Y)) { this.splash(d.x, Math.min(d.y, FLOOR_Y - 1)); hit = true; }
      if (hit || d.t > BOSS.waterLife || d.x < ARENA.x0 - 90 || d.x > ARENA.x1 + 90) d.dead = true;
    }
    this.water = this.water.filter((d) => !d.dead);
  }

  splash(x, y, col = '#bfeaff') {
    const g = this.g;
    for (let i = 0; i < 3; i++) g.particles.add({ x, y, vx: (Math.random() - 0.5) * 50, vy: -10 - Math.random() * 40, life: 0.35, max: 0.35, color: i ? '#7fd8ff' : col, size: 1, grav: 220 });
  }

  hit(by, dmg) {
    const g = this.g;
    if (this.state !== 'fight') return;
    this.hp -= dmg;
    this.flash = Math.max(this.flash, 0.05);
    this.hitAcc += dmg;
    if (this.hitAcc >= 22) {
      this.hitAcc = 0;
      g.sfx('bossHit');
      g.shakeAll(1.2);
      g.addText(this.x, this.y - AG_H - 6, HIT_LINES[Math.floor(Math.random() * HIT_LINES.length)], '#ffd34d');
      for (let i = 0; i < 4; i++) g.particles.add({ x: this.x + (Math.random() - 0.5) * 10, y: this.y - 20, vx: (Math.random() - 0.5) * 50, vy: -20 - Math.random() * 30, life: 0.8, max: 0.8, color: '#c9c0b0', size: 1, grav: 40 });
    }
    const frac = Math.max(0, this.hp) / BOSS.hp;
    const pct = Math.round(frac * 200);
    if (pct !== this.barPct) { this.barPct = pct; g.ui.setBossBar(frac); }
    if (this.phase === 1 && frac <= BOSS.phases[0]) {
      this.phase = 2; this.castT = Math.min(this.castT, 0.4);
      g.addText(this.x, this.y - AG_H - 14, '¡GRRR! ¡AHORA VAN A VER!', '#ff9ccc');
      g.sfx('charge'); g.shakeAll(3);
    } else if (this.phase === 2 && frac <= BOSS.phases[1]) {
      this.phase = 3; this.shieldT = 1.5; this.castT = Math.min(this.castT, 0.4);
      g.addText(this.x, this.y - AG_H - 14, '¡SUFICIENTE! ¡PODER MÁXIMO!', '#ff5d6c');
      g.sfx('charge'); g.shakeAll(5);
    }
    if (this.hp <= 0) this.defeat(by && !by.ai ? by : this.local);
  }

  // ------------------------------------------------------------
  //  Dibujo
  // ------------------------------------------------------------
  draw(ctx, camX, camY) {
    if (this.state === 'waiting') {
      drawAguilus(ctx, this.x - camX, this.y - camY, -1, 'idle', this.t);
      return;
    }
    if (this.state !== 'fight') return;
    const t = this.t;
    const fy = Math.round(FLOOR_Y - camY);
    // aviso en el piso de dónde va a caer cada roca
    for (const m of this.marks) {
      if (Math.floor(m.t * 8) % 2) continue;
      ctx.fillStyle = 'rgba(255,90,60,0.8)';
      const x = Math.round(m.x - camX);
      ctx.fillRect(x - 5, fy - 1, 11, 1); ctx.fillRect(x - 3, fy - 2, 7, 1);
    }
    // columnas de fuego: primero el aviso titilante, después la llamarada
    for (const c of this.pillars) {
      const x = Math.round(c.x - camX);
      if (c.t < 0) {
        if (Math.floor(c.t * 10) % 2) continue;
        ctx.fillStyle = 'rgba(255,70,40,0.85)';
        ctx.fillRect(x - 6, fy - 1, 12, 1);
        ctx.fillStyle = 'rgba(255,70,40,0.25)';
        ctx.fillRect(x - 6, fy - 26, 1, 25); ctx.fillRect(x + 5, fy - 26, 1, 25);
        continue;
      }
      const h = Math.round(pillarH(c.t));
      for (let yy = 0; yy < h; yy += 2) {
        const u = yy / Math.max(1, h), wob = Math.round(Math.sin(t * 24 + yy * 0.35) * 1.2);
        const w = Math.max(3, Math.round(14 * (1 - u * 0.6)));
        const x0 = x - (w >> 1) + wob;
        ctx.fillStyle = u > 0.85 ? '#b8300e' : '#e8481a'; ctx.fillRect(x0, fy - yy - 2, w, 2);
        if (w > 4) { ctx.fillStyle = '#ff9a2e'; ctx.fillRect(x0 + 2, fy - yy - 2, w - 4, 2); }
        if (w > 8 && u < 0.7) { ctx.fillStyle = '#fff0a0'; ctx.fillRect(x0 + 4, fy - yy - 2, w - 8, 2); }
      }
    }
    // ondas de choque por el piso
    for (const w of this.waves) {
      const x = Math.round(w.x - camX);
      ctx.fillStyle = '#7a4a2c'; ctx.fillRect(x - 3, fy - 3, 7, 3);
      ctx.fillStyle = '#ff8a2e'; ctx.fillRect(x - 2, fy - 5, 5, 2); ctx.fillRect(x - 1 + w.dir, fy - 6, 2, 1);
    }
    const a = this.attack;
    // aviso de la picada
    if (a && a.type === 'dive' && a.stage === 'aim' && Math.floor(a.t * 10) % 2 === 0) {
      const x = Math.round(a.tx - camX);
      ctx.fillStyle = 'rgba(255,60,60,0.9)';
      ctx.fillRect(x - 6, fy - 1, 13, 1); ctx.fillRect(x, fy - 7, 1, 6);
      ctx.fillRect(x - 3, fy - 4, 7, 1);
    }
    // rayo violeta: la línea de aviso y después el rayo
    if (a && a.type === 'beam') this.drawBeam(ctx, camX, camY, a);
    const pose = a && a.type === 'dive' ? (a.stage === 'ground' ? 'idle' : 'fly')
      : a && (a.type === 'beam' || a.type === 'summon' || (a.type !== 'feathers' && a.t < (a.wind || 0))) ? 'cast' : 'fly';
    drawAguilus(ctx, this.x - camX, this.y - camY, this.facing, pose, t, this.flash > 0 && Math.floor(t * 30) % 2 === 0);
    // escudo mágico: burbuja violeta (el agua rebota)
    if (this.shieldT > 0) {
      const cx = this.x - camX, cy = this.y - AG_H / 2 - camY, r = 20 + Math.sin(t * 12) * 1;
      ctx.strokeStyle = `rgba(201,160,255,${0.55 + Math.sin(t * 20) * 0.2})`;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = 'rgba(180,140,255,0.12)';
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    }
    // aguilitas
    const E = eagletSprites();
    for (const m of this.minions) {
      const x = m.x - camX, y = m.y - camY;
      const fr = E[m.facing > 0 ? 'right' : 'left'][Math.floor(t * 10 + m.ph) % 2];
      if (m.state === 'dead') {
        ctx.save();
        ctx.translate(Math.round(x), Math.round(y));
        ctx.rotate(Math.round(m.rot / (Math.PI / 2)) * (Math.PI / 2)); // de a 90°, sin borronear
        ctx.drawImage(fr, -7, -5);
        ctx.restore();
        continue;
      }
      if (m.flash > 0 && Math.floor(t * 40) % 2) continue;
      ctx.drawImage(fr, Math.round(x - 7), Math.round(y - 5));
      if (m.state === 'aim' && Math.floor(m.t * 12) % 2 === 0) {
        ctx.fillStyle = '#ff4d6d';
        ctx.fillRect(Math.round(x), Math.round(y - 12), 1, 3); ctx.fillRect(Math.round(x), Math.round(y - 8), 1, 1);
      }
    }
    // plumas-dardo
    for (const f of this.feathers) {
      ctx.save();
      ctx.translate(Math.round(f.x - camX), Math.round(f.y - camY));
      ctx.rotate(f.a);
      ctx.drawImage(FEATHER, -7, -1);
      ctx.restore();
    }
    // rocas de magma con un resplandor suave (las apagadas, grises)
    const hot = rockSprites(), cold = coolSprites();
    for (const r of this.rocks) {
      const x = r.x - camX, y = r.y - camY;
      const cool = r.state === 'cool';
      if (!cool) {
        ctx.fillStyle = `rgba(255,110,30,${0.14 + Math.sin(t * 8 + r.k) * 0.05})`;
        ctx.beginPath(); ctx.arc(x, y, r.rad + 2.5, 0, Math.PI * 2); ctx.fill();
      }
      const img = (cool ? cold : hot)[r.k][((Math.floor(r.t * r.spin) % 4) + 4) % 4];
      ctx.drawImage(img, Math.round(x - img.width / 2), Math.round(y - img.height / 2));
    }
    // gotitas de agua
    for (const d of this.water) {
      const x = Math.round(d.x - camX), y = Math.round(d.y - camY);
      const sx = Math.abs(d.vx) > Math.abs(d.vy) ? Math.sign(d.vx) : 0, sy = sx ? 0 : Math.sign(d.vy);
      ctx.fillStyle = '#2f8fe0'; ctx.fillRect(x - sx * 2, y - sy * 2, 1, 1);
      ctx.fillStyle = '#4fb3ff'; ctx.fillRect(x - sx, y - sy, 1, 1);
      ctx.fillStyle = '#d8f4ff'; ctx.fillRect(x, y, 2, 2);
    }
  }

  drawBeam(ctx, camX, camY, a) {
    const o = this.orb(), t = this.t;
    const dy = Math.sin(a.ang);
    const len = dy > 0.05 ? Math.min(BEAM_LEN, (FLOOR_Y - o.y) / dy) : BEAM_LEN;
    ctx.save();
    ctx.translate(o.x - camX, o.y - camY);
    ctx.rotate(a.ang);
    if (a.stage === 'aim') {
      if (Math.floor(a.t * 14) % 2 === 0) {
        ctx.fillStyle = 'rgba(232,216,255,0.75)';
        for (let i = 4; i < len; i += 4) ctx.fillRect(i, -0.5, 2, 1);
      }
    } else {
      const w = 3 + Math.sin(t * 50) * 1;
      ctx.fillStyle = 'rgba(163,116,220,0.45)'; ctx.fillRect(0, -w - 2, len, (w + 2) * 2);
      ctx.fillStyle = '#c98cff'; ctx.fillRect(0, -w, len, w * 2);
      ctx.fillStyle = '#fff4ff'; ctx.fillRect(0, -1, len, 2);
    }
    ctx.restore();
  }

  /** lo que va arriba de todo: barritas de vida del compañero y de revivir, y la mira */
  drawOverlay(ctx, camX, camY) {
    if (this.state !== 'fight') return;
    for (const f of this.fighters()) {
      const x = Math.round(f.cx - camX), top = Math.round(f.y - camY);
      if (f.downed) {
        // barrita de revivir que se va llenando
        const w = 18, y = Math.round(f.y + f.h - camY) - 13;
        ctx.fillStyle = '#1d1420'; ctx.fillRect(x - w / 2 - 1, y - 1, w + 2, 4);
        ctx.fillStyle = '#4a3a50'; ctx.fillRect(x - w / 2, y, w, 2);
        ctx.fillStyle = '#ff9ccc'; ctx.fillRect(x - w / 2, y, Math.round(w * clamp(f.revive || 0, 0, 1)), 2);
        continue;
      }
      if (f === this.local) continue;
      // vida del compañero (o del otro jugador)
      const w = 14, y = top - 5;
      ctx.fillStyle = '#1d1420'; ctx.fillRect(x - w / 2 - 1, y - 1, w + 2, 3);
      ctx.fillStyle = f.hp > 40 ? '#9cf08a' : f.hp > 20 ? '#ffd34d' : '#ff5d6c';
      ctx.fillRect(x - w / 2, y, Math.round(w * clamp(f.hp / HP_MAX, 0, 1)), 1);
    }
  }
}

/** altura de una columna de fuego según cuánto hace que salió */
function pillarH(t) {
  if (t < 0) return 0;
  if (t < 0.12) return (t / 0.12) * 84;
  if (t < 0.65) return 84 + Math.sin(t * 40) * 3;
  return Math.max(0, 84 * (1 - (t - 0.65) / 0.25));
}

/** columna del pozo en el cantero por donde salen volando al final */
function shaftX(g) {
  for (let c = DIG_ZONE.c0; c <= DIG_ZONE.c1; c++) {
    const x = c * TILE + 4;
    if (!g.world.solidPx(x, SURFACE * TILE + 12) && !g.world.solidPx(x, SURFACE * TILE + 4)) return x;
  }
  return 46 * TILE;
}

// donde aterrizan al final: sobre las baldosas del patio, al lado del arbolito
const LAND_X = 32 * TILE;

// ------------------------------------------------------------
//  Guiones
// ------------------------------------------------------------
/** chispitas mágicas que giran alrededor de los dos y los taladros se vuelven pistolas de agua */
function* transform(sc, ids, quick = false) {
  const g = sc.g, A = sc.actors;
  g.sfx('click');
  yield sc.wait(0.35);
  g.sfx('magic');
  const cols = ['#ffd34d', '#8fe9ff', '#ff9ccc', '#ffffff', '#c9a6ff'];
  const n = quick ? 22 : 40;
  for (let i = 0; i < n; i++) {
    for (const id of ids) {
      const a = A[id], ang = sc.t * 10 + i * 0.4, r = 11 - (i / n) * 6;
      for (let k = 0; k < 2; k++) {
        const aa = ang + k * Math.PI;
        g.particles.add({ x: a.x + Math.cos(aa) * r, y: a.y - 11 + Math.sin(aa) * r * 1.2, vx: 0, vy: -8, life: 0.5, max: 0.5, color: cols[(i + k) % cols.length], star: true, grav: 0 });
      }
    }
    yield sc.wait(0.03);
  }
  sc.ui.fade(true, true);
  yield sc.wait(0.18);
  for (const id of ids) { A[id].tool = 'water'; A[id].gunAng = 0.3; }
  g.sfx('splash');
  sc.ui.fade(false);
  for (const id of ids) {
    const a = A[id];
    for (let i = 0; i < 10; i++) g.particles.add({ x: a.x + a.facing * 6, y: a.y - 10, vx: (Math.random() - 0.5) * 70, vy: -20 - Math.random() * 60, life: 0.6, max: 0.6, color: i % 2 ? '#7fd8ff' : '#ffffff', size: 1, grav: 200 });
  }
  yield sc.wait(0.5);
}

/** cinemática de pelea: primeros planos de los tres y "¡A PELEAR!" */
function* epicIntro(sc, B, me, mate, mid) {
  const g = sc.g, A = sc.actors, ag = A.aguilus;
  const close = (id, y, z) => { sc.fixed = { x: A[id].x, y, k: 0.5 }; sc.setZoom(z, true); sc.snapCam(); };
  // los dos apuntan para arriba, a Aguilus
  for (const id of [me, mate]) { A[id].facing = ag.x > A[id].x ? 1 : -1; A[id].gunAng = -0.55; }
  close(me, A[me].y - 12, 3.4);
  g.sfx('pump'); g.shakeAll(2);
  yield sc.wait(0.85);
  close(mate, A[mate].y - 12, 3.4);
  g.sfx('pump'); g.shakeAll(2);
  yield sc.wait(0.85);
  ag.pose = 'cast';
  close('aguilus', ag.y - 16, 3);
  g.sfx('charge'); g.shakeAll(3);
  yield sc.wait(0.95);
  ag.pose = 'fly';
  sc.fixed = { x: mid, y: FLOOR_Y - 60 };
  sc.setZoom(1, true);
  sc.snapCam();
  sc.caption('¡A PELEAR!');
  g.sfx('boom'); g.shakeAll(6);
  yield sc.wait(1.4);
  sc.caption(null);
}

/** la escena del "recuerdo" en el Taller de Carlos (con el filtro de recuerdo) */
function* flashback(sc, B, me, mate) {
  const g = sc.g, A = sc.actors, GY = SURFACE * TILE;
  // guarda dónde estaban, para volver (y por si se salta la escena)
  B.spots = {};
  for (const id of [me, mate]) B.spots[id] = { x: A[id].x, y: A[id].y, facing: A[id].facing, tool: A[id].tool, hidden: false };
  sc.ui.fade(true, true);
  yield sc.wait(0.7);
  // hace unos días, frente a la ventanita del taller (sin taladros todavía)
  Object.assign(A.pancha, { x: TRAILER_X + 16, y: GY, facing: 1, tool: null, target: null, ty: null, fallTo: null, flying: false });
  Object.assign(A.pablo, { x: TRAILER_X + 2, y: GY, facing: 1, tool: null, target: null, ty: null, fallTo: null, flying: false });
  A.aguilus.hidden = true;
  sc.flashback = true;
  sc.fixed = { x: TRAILER_X + 24, y: GY - 30 };
  sc.setZoom(2.4, true);
  sc.snapCam();
  sc.ui.fade(false);
  sc.caption('Hace unos días, en el Taller de Carlos...');
  yield sc.wait(1.6);
  sc.emote('pablo', 'Z');
  yield sc.say('carlos', 'Y una cosa más, chicos. Si algún día las cosas se complican...');
  yield sc.say('carlos', '...y parece que ya no hay más remedio...');
  sc.emote('pablo', 'Z');
  yield sc.say('carlos', '¡toquen el interruptor secreto!');
  yield sc.say('pancha', '¿Qué interruptor secreto?');
  yield sc.say('carlos', 'Ya se van a dar cuenta. ¡Pero no lo usen para regar las plantas, eh!');
  sc.emote('pablo', 'Z');
  yield sc.wait(0.9);
  sc.caption(null);
  sc.ui.fade(true, true);
  yield sc.wait(0.7);
  for (const [id, s] of Object.entries(B.spots)) Object.assign(A[id], s);
  A.aguilus.hidden = false;
  sc.flashback = false;
  B.spots = null;
}

function* encounterScript(sc, B, p) {
  const g = sc.g, me = p.char, mate = B.mateId;
  if (B.losses > 0) { yield* rematchScript(sc, B, p); return; }
  const meX = clamp(p.cx, ARENA.x0, ARENA.x1);
  const towards = B.homeX > meX ? 1 : -1;
  const mateX = clamp(meX - towards * 18, ARENA.x0, ARENA.x1);
  const A = sc.actors;
  sc.actor(me, meX, FLOOR_Y, { facing: towards, tool: 'drill' });
  sc.actor(mate, mateX, FLOOR_Y - 220, { facing: towards, tool: 'drill' });
  sc.actor('aguilus', B.homeX, FLOOR_Y, { facing: -towards, phase: 0 });
  sc.fixed = { x: meX, y: FLOOR_Y - 14 };
  sc.setZoom(2);
  sc.snapCam();
  sc.drop(mate, FLOOR_Y);
  yield sc.say(mate, '¡Esperame! ¡Uf, qué caída!');
  yield sc.arrive(mate);
  // aparece Aguilus junto al cofre
  const mid = (meX + B.homeX) / 2;
  sc.fixed = { x: mid, y: FLOOR_Y - 20 };
  sc.setZoom(Math.abs(B.homeX - meX) > 170 ? 1 : 1.5);
  g.sfx('surprise');
  sc.emote(me, '!'); sc.emote(mate, '!');
  yield sc.say('aguilus', '¡Mira vos! Así que llegaron hasta el centro de la Tierra...');
  sc.fixed = { x: B.homeX, y: FLOOR_Y - 18 };
  sc.setZoom(2.2);
  yield sc.say('pablo', '¡¿Aguilus?! ¡Sabía que eras vos! ¡La pluma te delató!');
  yield sc.say('pancha', 'Pablo... lo sabíamos desde el principio.');
  yield sc.say('aguilus', 'Esta vez no voy a dejar que se los lleven. ¡Este año sí te arruino el cumple, Pancha!');
  sc.fixed = { x: mid, y: FLOOR_Y - 20 };
  sc.setZoom(1.5);
  yield sc.say('pablo', '¡Devolvé esos regalos, pajarraco!');
  // se eleva volando y se ríe
  A.aguilus.pose = 'fly';
  sc.fly('aguilus', B.homeX, SKY_Y, 45);
  g.sfx('charge');
  g.shakeAll(3);
  sc.fixed = { x: mid, y: FLOOR_Y - 60 };
  sc.setZoom(1);
  yield sc.arrive('aguilus');
  sc.fixed = { x: B.homeX, y: SKY_Y - 10 };
  sc.setZoom(2.2);
  g.sfx('laugh');
  yield sc.say('aguilus', '¡JA, JA, JAAA! ¡No me van a vencer! ¡Con esos taladritos no me hacen ni cosquillas!');
  // los chicos, abajo
  sc.fixed = { x: (meX + mateX) / 2, y: FLOOR_Y - 14 };
  sc.setZoom(2.4);
  A[me].facing = A[mate].x > A[me].x ? 1 : -1;
  A[mate].facing = -A[me].facing;
  yield sc.say('pablo', '¿Y ahora qué hacemos? ¡Él vuela y nosotros tenemos taladros!');
  sc.emote('pancha', '!');
  yield sc.say('pancha', '¡Acordate lo que nos dijo Carlos!');
  yield sc.say('pablo', '¿Carlos? ¿Qué nos dijo Carlos?');
  yield* flashback(sc, B, me, mate);
  // de vuelta en el núcleo
  sc.fixed = { x: (meX + mateX) / 2, y: FLOOR_Y - 14 };
  sc.setZoom(2.4, true);
  sc.snapCam();
  sc.ui.fade(false);
  yield sc.wait(0.6);
  yield sc.say('pablo', '¿El interruptor secreto? ¡Pero Carlos nunca dijo eso!');
  yield sc.say('pancha', 'Sí que lo dijo. Vos estabas durmiendo parado.');
  yield sc.say('pablo', '¿Este botoncito rojo del taladro que dice "NO TOCAR"?');
  yield sc.say('pancha', '¡Sí! ¡Tocalo!');
  yield* transform(sc, [me, mate]);
  for (const id of [me, mate]) { A[id].facing = A.aguilus.x > A[id].x ? 1 : -1; A[id].gunAng = -0.2; }
  sc.emote(me, '!'); sc.emote(mate, '!');
  yield sc.say('pablo', '¡Wow!');
  sc.fixed = { x: B.homeX, y: SKY_Y - 10 };
  sc.setZoom(2.2);
  g.sfx('laugh');
  yield sc.say('aguilus', '¡JUA, JUA, JUA! ¿Me van a ganar con una pistolita de agua?');
  sc.fixed = { x: (meX + mateX) / 2, y: FLOOR_Y - 14 };
  sc.setZoom(2.4);
  for (const id of [me, mate]) A[id].facing = A.aguilus.x > A[id].x ? 1 : -1;
  yield sc.say('pablo', 'No es una pistola de agua...');
  yield sc.say('pancha', '¡Es una SÚPER pistola de agua!');
  yield* epicIntro(sc, B, me, mate, mid);
  const touch = g.ui.isTouch || g.input.padSeen;
  yield sc.say(mate, `¡Y si alguno cae, el otro lo levanta! ${touch ? 'Tocá REVIVIR' : 'Apretá E'} varias veces al lado.`);
}

/** cuando vuelven a bajar después de que los noqueó: Aguilus los gasta (versión corta del interruptor) */
function* rematchScript(sc, B, p) {
  const g = sc.g, me = p.char, mate = B.mateId, n = B.losses;
  const name = CHARACTERS[me].name;
  const meX = clamp(p.cx, ARENA.x0, ARENA.x1);
  const towards = B.homeX > meX ? 1 : -1;
  const mateX = clamp(meX - towards * 18, ARENA.x0, ARENA.x1);
  sc.actor(me, meX, FLOOR_Y, { facing: towards, tool: 'drill' });
  sc.actor(mate, mateX, FLOOR_Y - 220, { facing: towards, tool: 'drill' });
  sc.actor('aguilus', B.homeX, FLOOR_Y, { facing: -towards, phase: 0 });
  const mid = (meX + B.homeX) / 2;
  sc.fixed = { x: mid, y: FLOOR_Y - 20 };
  sc.setZoom(Math.abs(B.homeX - meX) > 170 ? 1 : 1.5);
  sc.snapCam();
  sc.drop(mate, FLOOR_Y);
  yield sc.arrive(mate);
  sc.fixed = { x: B.homeX, y: FLOOR_Y - 18 };
  sc.setZoom(2.2);
  // las gastadas cambian según cuántas veces les ganó
  const pick = (arr) => arr[(n - 1) % arr.length];
  yield sc.say('aguilus', pick([
    `¡Ja! ¿Ya te despertaste, ${name}? Pensé que te ibas a quedar durmiendo hasta el año que viene.`,
    `¡¿Otra vez vos?! Ya van ${n} veces... Te voy a empezar a cobrar la entrada.`,
    `${n} a 0, ${name}. ¿Querés que te preste mi báculo, a ver si así te va mejor?`,
  ]));
  sc.fixed = { x: mid, y: FLOOR_Y - 20 };
  sc.setZoom(1.5);
  yield sc.say(me, pick([
    'Estábamos calentando nomás.',
    'Me resbalé, nadie es perfecto, ya sabes..',
    'Te estaba estudiando los movimientos...',
  ]));
  sc.fixed = { x: B.homeX, y: FLOOR_Y - 18 };
  sc.setZoom(2.2);
  yield sc.say('aguilus', pick([
    'Ajá. Y las estrellitas que veías, ¿también eran de calentamiento?',
    'Claro, claro. Y yo soy un pollito.',
    '¿Y qué aprendiste? ¿Que mis aguilitas pican? ¡Jejee!',
  ]));
  sc.fixed = { x: (meX + mateX) / 2, y: FLOOR_Y - 14 };
  sc.setZoom(2.4);
  yield sc.say(mate, '¡No le hagas caso! ¡Interruptor secreto, de nuevo!');
  yield* transform(sc, [me, mate], true);
  sc.actors.aguilus.pose = 'fly';
  sc.fly('aguilus', B.homeX, SKY_Y, 55);
  g.sfx('charge');
  g.shakeAll(3);
  sc.fixed = { x: mid, y: FLOOR_Y - 60 };
  sc.setZoom(1);
  yield sc.say('aguilus', '¿Otra vez con la pistolita? ¡Ya veremos!');
  yield sc.arrive('aguilus');
  for (const id of [me, mate]) { sc.actors[id].facing = B.homeX > sc.actors[id].x ? 1 : -1; sc.actors[id].gunAng = -0.55; }
  yield sc.say(me, '¡SÚPER pistola! ¡A PELEAR!');
}

function* victoryScript(sc, B, p) {
  // online el golpe final lo puede dar cualquiera de los dos: la pareja es siempre el otro personaje
  const g = sc.g, me = p.char, mate = me === 'pablo' ? 'pancha' : 'pablo', A = sc.actors;
  const gx = clamp(B.x, ARENA.x0 + 50, ARENA.x1 - 30);
  const ag = sc.actor('aguilus', gx, B.y, { pose: 'hurt', facing: -1, phase: 0 }); // primero: queda detrás en el abrazo
  sc.actor(me, clamp(p.cx, ARENA.x0, ARENA.x1), FLOOR_Y, { facing: gx > p.cx ? 1 : -1, tool: 'water' });
  const mx = clamp(B.mateX ?? p.cx - 16, ARENA.x0, ARENA.x1);
  sc.actor(mate, mx, FLOOR_Y, { facing: gx > mx ? 1 : -1, tool: 'water' });
  sc.fixed = { x: gx, y: FLOOR_Y - 26 };
  sc.setZoom(1.5);
  sc.snapCam();
  g.shakeAll(4);
  yield sc.wait(0.6);
  sc.drop('aguilus', FLOOR_Y);
  yield sc.arrive('aguilus');
  ag.pose = 'weak';
  g.shakeAll(3);
  sc.walk(me, gx - 22, 50); sc.walk(mate, gx - 38, 50);
  sc.fixed = { x: gx - 18, y: FLOOR_Y - 14 };
  sc.setZoom(2.2);
  yield sc.arrive(me, mate);
  A[me].facing = 1; A[mate].facing = 1;
  A[me].gunAng = 0.3; A[mate].gunAng = 0.3;
  sc.emote('aguilus', '~');
  yield sc.say('aguilus', '¡Bueno listo!! ¡Está bien, está bien! ¡Me rindo! Estoy empapado... mis plumitas..');
  yield sc.say('pancha', '¿Por qué siempre vos, Aguilus? ¡Todos los años lo mismo!');
  yield sc.say('pablo', 'Ya nos tenés hartos con tus pavadas.');
  yield sc.say('aguilus', 'Es que... nadie me invita a los cumples... y los regalos son tan lindos...');
  yield sc.say('pancha', 'Bueno. Nos llevamos los regalos. Chau, Aguilus.');
  // hacen como que se van
  sc.walk(me, gx - 70, 34); sc.walk(mate, gx - 86, 34);
  sc.fixed = { x: gx - 40, y: FLOOR_Y - 14 };
  sc.setZoom(1.5);
  yield sc.wait(1.3);
  ag.pose = 'idle';
  sc.emote('aguilus', '!');
  yield sc.say('aguilus', '¡Esperen! ¿Me van a dejar acá abajo? ¡No sean malos!!');
  yield sc.arrive(me, mate);
  A[me].facing = 1; A[mate].facing = 1;
  yield sc.say('pablo', '...');
  yield sc.say('pancha', 'Ay, bueno. Vení, dale.');
  // abrazo de a tres
  A[me].tool = null; A[mate].tool = null;
  sc.walk(me, gx - 9, 45); sc.walk(mate, gx + 9, 60);
  sc.fixed = { x: gx, y: FLOOR_Y - 14 };
  sc.setZoom(2.2);
  yield sc.arrive(me, mate);
  A[mate].facing = -1; A[me].facing = 1;
  A[me].pose = 'hug'; A[mate].pose = 'hug';
  sc.emote(me, '♥'); sc.emote(mate, '♥'); sc.emote('aguilus', '♥');
  yield sc.wait(1.6);
  // ¡arriba!
  for (const id of [me, mate, 'aguilus']) sc.fly(id, A[id].x, FLOOR_Y - 420, 170);
  ag.pose = 'fly';
  sc.follow = [me, 'aguilus', mate];
  sc.camSpeed = 7;
  sc.setZoom(1.5);
  g.audio.jet(true);
  yield sc.wait(1.6);
  sc.ui.fade(true, true);
  yield sc.wait(0.8);
  g.audio.jet(false);

  // ---- arriba: salen por el pozo del cantero y van volando hasta el arbolito ----
  const sx = shaftX(g), GY = SURFACE * TILE, AIR = GY - 32;
  const off = { [me]: -10, aguilus: 0, [mate]: 10 };
  Object.assign(A[me], { x: sx - 10, y: GY + 70, target: null, ty: null, pose: 'hug', facing: 1, lockFacing: true });
  Object.assign(A.aguilus, { x: sx, y: GY + 72, target: null, ty: null, pose: 'fly', facing: -1, lockFacing: true });
  Object.assign(A[mate], { x: sx + 10, y: GY + 70, target: null, ty: null, pose: 'hug', facing: -1, lockFacing: true });
  sc.follow = null; sc.camSpeed = 2.6;
  sc.fixed = { x: sx, y: GY - 34 };
  sc.setZoom(1.8);
  sc.snapCam();
  // suben derecho por el hueco del medio...
  for (const id of [me, mate, 'aguilus']) sc.fly(id, A[id].x, AIR, 150);
  g.audio.jet(true);
  sc.ui.fade(false);
  yield sc.arrive(me, mate, 'aguilus');
  // ...se van para la izquierda, hasta el arbolito...
  sc.fixed = { x: (sx + LAND_X) / 2, y: GY - 36 };
  sc.setZoom(1.6);
  for (const id of [me, mate, 'aguilus']) sc.fly(id, LAND_X + off[id], AIR, 70);
  yield sc.arrive(me, mate, 'aguilus');
  // ...y bajan despacito sobre las baldosas
  for (const id of [me, mate, 'aguilus']) sc.fly(id, A[id].x, GY, 45);
  sc.fixed = { x: LAND_X + 12, y: GY - 14 };
  sc.setZoom(2);
  yield sc.arrive(me, mate, 'aguilus');
  g.audio.jet(false);
  g.sfx('land');
  for (const id of [me, mate, 'aguilus']) A[id].lockFacing = false;
  for (const id of [me, mate]) { A[id].flying = false; A[id].pose = 'idle'; }
  A.aguilus.flying = false;
  // Aguilus se suelta, jadea y se recompone
  A.aguilus.pose = 'idle';
  sc.walk('aguilus', LAND_X + 34, 40);
  sc.walk(mate, LAND_X + 6, 40);
  yield sc.arrive('aguilus');
  A.aguilus.facing = -1;
  A.aguilus.pose = 'weak';
  sc.emote('aguilus', '~');
  yield sc.say('aguilus', 'Uf... uf... ¡Pensé que me dejaban ahí abajo!');
  A.aguilus.pose = 'idle';
  yield sc.wait(0.5);
  yield sc.say('aguilus', 'Ejem. Digo... ¡Esto no termina acá! ¡Hasta el año que viene, cumpleañera!');
  A.aguilus.pose = 'fly';
  A.aguilus.facing = 1;
  sc.fly('aguilus', LAND_X + 330, GY - 280, 130);
  g.sfx('jump');
  yield sc.wait(1.8);
  A.aguilus.hidden = true;
  A[me].facing = 1; A[mate].facing = -1;
  yield sc.say('pablo', '¿"Hasta el año que viene"?');
  yield sc.say('pancha', 'Ya sé dónde vamos a esconder los regalos el año que viene...');
  yield sc.say('pablo', '¿Dónde?');
  yield sc.say('pancha', '¡En la casa rodante de Carlos!');
  sc.fixed = { x: TRAILER_X + 32, y: GY - TRAILER_H + 30 };
  sc.setZoom(2.4);
  yield sc.wait(0.6);
  yield sc.say('carlos', '¡Ja, ni se les ocurra! ¡Y devuélvanme las pistolas de agua!');
  sc.fixed = { x: LAND_X, y: GY - 12 };
  sc.setZoom(2.2);
  yield sc.wait(0.5);
  sc.emote('pancha', '♥'); sc.emote('pablo', '♥');
  yield sc.say('pancha', '¡Feliz cumple para mí!');
  yield sc.wait(0.8);
}
