// Aguilus en el fondo del núcleo: espera junto al último cofre, charla con los chicos,
// pelea tirando rocas de magma (que se atajan con el taladro y se le devuelven con E)
// y otros hechizos que hay que esquivar sí o sí; al final... se van todos juntos para arriba.
import { TILE, SURFACE, BOSS, HP_MAX, ENDING_TEXT, CHARACTERS } from './config.js';
import { CORE_PLATFORM } from './world.js';
import { drawAguilus, AG_H } from './aguilus.js';
import { getCharFrames, CHAR_W, CHAR_H } from './sprites.js';
import { DIG_ZONE, TRAILER_X, TRAILER_H } from './structures.js';
import { mulberry32 } from './rng.js';
import { clamp, fmtMoney, makeCanvas } from './util.js';

const FLOOR_Y = CORE_PLATFORM.r * TILE;
const ARENA = { x0: (CORE_PLATFORM.c0 + 2) * TILE, x1: (CORE_PLATFORM.c1 - 1) * TILE };
const SKY_Y = FLOOR_Y - 80;         // altura a la que vuela durante la pelea
const ROCK_G = 210, THROW_G = 35; // tirada casi recta: va adonde apuntás (pero hay que adelantarse si se mueve)

// ------------------------------------------------------------
//  Rocas de magma: piedras marrón oscuro, irregulares, con grietas encendidas
// ------------------------------------------------------------
function paintRock(seed, size) {
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
  const cell = [];
  for (let py = 0; py < size; py++) for (let px = 0; px < size; px++) {
    if (!inside(px, py)) continue;
    const edge = !inside(px - 1, py) || !inside(px + 1, py) || !inside(px, py - 1) || !inside(px, py + 1);
    const lit = (m - px) + (m - py); // luz desde arriba a la izquierda
    x.fillStyle = edge ? '#170b06' : lit > r * 0.6 ? '#5a3a24' : lit < -r * 0.5 ? '#26150c' : rnd() < 0.15 ? '#43291a' : '#3a2316';
    x.fillRect(px, py, 1, 1);
    if (!edge) cell.push([px, py]);
  }
  // grietas: caminitos desde cerca del centro hacia afuera, naranja con corazón amarillo
  const ok = new Set(cell.map(([a, b]) => a + ',' + b));
  const cracks = 2 + Math.floor(rnd() * 2) + (size >= 12 ? 1 : 0);
  for (let k = 0; k < cracks; k++) {
    let px = Math.round(m + (rnd() - 0.5) * 2), py = Math.round(m + (rnd() - 0.5) * 2);
    const a = rnd() * Math.PI * 2;
    const len = Math.round(r * (0.7 + rnd() * 0.5));
    for (let i = 0; i < len; i++) {
      if (!ok.has(px + ',' + py)) break;
      x.fillStyle = i < len * 0.4 && rnd() < 0.6 ? '#ffd060' : '#ff6a1a';
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

let ROCKS = null;
export function rockSprites() {
  if (!ROCKS) ROCKS = [9, 10, 11, 12, 13, 10, 12, 14].map((s, i) => rotations(paintRock(900 + i * 37, s)));
  return ROCKS;
}

// pluma-dardo (la dibuja apuntando a la derecha y se rota según la dirección)
const FEATHER = (() => {
  const [c, x] = makeCanvas(9, 3);
  x.fillStyle = '#4a3070'; x.fillRect(0, 1, 9, 1);
  x.fillStyle = '#a374dc'; x.fillRect(1, 0, 5, 1); x.fillRect(1, 2, 5, 1);
  x.fillStyle = '#e8d8ff'; x.fillRect(6, 1, 3, 1);
  return c;
})();

export class Boss {
  constructor(game, done, losses = 0) {
    this.g = game;
    this.losses = losses;     // cuántas veces te ganó (para que te gaste al volver)
    this.state = done ? 'done' : 'waiting'; // waiting → scene → fight → scene → done
    this.hp = BOSS.hp;
    const ch = game.world.chests.find((c) => c.core);
    this.homeX = ch ? ch.c * TILE - 20 : ARENA.x1 - 40;
    this.x = this.homeX; this.y = FLOOR_Y; this.facing = -1;
    this.tx = this.x; this.ty = SKY_Y; this.baseY = SKY_Y;
    this.vx = 0; this.spd = 60; this.pauseT = 0;
    this.attack = null; this.sinceRocks = 1;
    this.clearHazards();
    this.t = 0; this.castT = 2.5; this.flash = 0; this.phase2 = false;
    this.partner = null;
    this.cheerT = 6;
    this.ceilY = FLOOR_Y - BOSS.ceiling;
    this.floorY = FLOOR_Y;
  }

  get fighting() { return this.state === 'fight'; }

  clearHazards() {
    this.rocks = []; this.marks = []; this.feathers = []; this.pillars = []; this.waves = [];
  }

  // ------------------------------------------------------------
  //  Fases
  // ------------------------------------------------------------
  /** los que pelean: las personas (la tuya y, online, la del otro). El compañero bot mira de lejos. */
  fighters() {
    return this.g.players.filter((pl) => !pl.ai);
  }

  /** jugador que manejás en esta pantalla */
  get local() { return this.g.players[0]; }

  update(dt) {
    this.t += dt;
    if (this.state === 'waiting') {
      // cuando alguien pisa la plataforma del núcleo, arranca el encuentro
      for (const p of this.fighters()) {
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
    p.facing = facing; p.heldRock = null; p.jetFuel = BOSS.jetTime; p.hovering = false;
    if (full) p.hp = HP_MAX;
  }

  startEncounter(p) {
    this.state = 'scene';
    this.mateId = p.char === 'pablo' ? 'pancha' : 'pablo';
    p.vx = 0; p.digging = false; p.hovering = false;
    this.g.startScene((sc) => encounterScript(sc, this, p), {
      onSkip: (sc) => {
        Object.assign(sc.actors.aguilus, { y: SKY_Y, ty: null, target: null, pose: 'fly' });
        Object.assign(sc.actors[this.mateId], { y: FLOOR_Y, fallTo: null });
      },
      onEnd: (skipped, sc) => this.startFight(sc, p),
    });
  }

  startFight(sc, p) {
    const A = sc.actors;
    const mate = A[this.mateId], ag = A.aguilus;
    const fs = this.fighters();
    for (const f of fs) { const a = A[f.char]; if (a) this.place(f, a.x, FLOOR_Y, a.facing); }
    // sin otra persona, la pareja queda en la plataforma dando ánimo
    this.partner = fs.length < 2 ? { id: this.mateId, x: mate.x, facing: mate.facing } : null;
    this.x = ag.x; this.y = SKY_Y; this.baseY = SKY_Y; this.tx = this.x; this.vx = 0;
    this.state = 'fight';
    this.castT = 1.6; this.attack = null; this.sinceRocks = 1;
    this.g.ui.setBossBar(this.hp / BOSS.hp);
    this.g.toast(this.g.ui.isTouch ? 'Mantené CAVAR apuntando a las rocas para atajarlas y tocá LANZAR' : 'Mantené el taladro apuntando a las rocas para atajarlas y tirálas con E', null, 'good');
  }

  defeat(p) {
    this.state = 'scene';
    this.clearHazards();
    this.attack = null;
    for (const f of this.fighters()) f.heldRock = null;
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
    g.save();
    if (g.net.isHost) g.net.send('ending', { earned: Math.floor(g.counters.earned) });
    const mins = Math.floor(g.counters.playTime / 60);
    g.state = 'paused';
    g.ui.showMsg('¡Fin! ♥', `${ENDING_TEXT}\n\nTiempo: ${mins} min · Bloques cavados: ${Math.round(g.counters.tiles)}\nPlata juntada: ${fmtMoney(g.counters.earned)}`, [
      { label: 'Seguir jugando', onClick: () => { g.state = 'play'; } },
    ]);
  }

  /**
   * el jugador cayó K.O. durante la pelea: se desmaya, "algo" lo lleva hasta casa
   * y tiene que volver a bajar. Aguilus se recupera y lo espera junto al cofre.
   */
  playerDown() {
    const g = this.g, p = this.local, online = g.net.isHost;
    if (online) g.net.send('teamDown'); // online: vuelven los dos
    g.state = 'faint';
    p.dead = true;
    p.heldRock = null;
    g.audio.jet(false);
    g.audio.play('faint');
    g.counters.deaths++;
    for (let i = 0; i < 14; i++) g.particles.add({ x: p.cx, y: p.cy, vx: (Math.random() - 0.5) * 60, vy: -Math.random() * 60, life: 0.8, max: 0.8, color: '#ffffff', star: true, grav: 40 });
    this.losses++;
    this.reset();
    g.ui.setBossBar(null);
    setTimeout(() => g.ui.fade(true), 400);
    setTimeout(() => {
      const msg = online
        ? ['¡Se desmayaron!', 'Aguilus los dejó viendo estrellitas.\n\nCuando abrieron los ojos estaban en casa... con una pluma violeta en la almohada.\n\nAguilus los espera abajo de todo, ¡y ya se recuperó!']
        : ['¡Te desmayaste!', 'Aguilus te dejó viendo estrellitas y caíste redondo.\n\nCuando abriste los ojos estabas en casa. Nadie sabe cómo llegaste... solo había una pluma violeta en tu almohada.\n\nAguilus te espera abajo de todo, ¡y ya se recuperó!'];
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
    this.phase2 = false;
    this.clearHazards();
    this.attack = null; this.sinceRocks = 1;
    this.x = this.tx = this.homeX; this.y = FLOOR_Y; this.baseY = SKY_Y; this.vx = 0; this.facing = -1;
    this.partner = null;
  }

  // ------------------------------------------------------------
  //  Pelea
  // ------------------------------------------------------------
  orb() {
    return { x: this.x + this.facing * 5.5, y: this.y - AG_H - 3 };
  }

  /** caja del cuerpo de Aguilus */
  body() {
    return { x0: this.x - 6, x1: this.x + 6, y0: this.y - AG_H + 4, y1: this.y };
  }

  hurtPlayer(p, dmg, kx = 0) {
    if (p.dead || p.hurtT > 0 || p.guardT > 0) return false;
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

  /** golpe de roca: pega aunque recién te hayan pegado (como antes) */
  rockHit(p) {
    if (p.remote) { if (!(p.guardT > 0)) { this.g.net.send('hurt', { dmg: BOSS.rockDmg, kx: 0 }); p.guardT = 0.3; } return; }
    p.hurt(BOSS.rockDmg, 'rock');
  }

  /** a quién apunta el próximo ataque (online: a cualquiera de los dos) */
  pickTarget() {
    const fs = this.fighters().filter((f) => !f.dead);
    return fs[Math.floor(Math.random() * fs.length)] || this.local;
  }

  /** se mueve de un lado a otro con ritmo cambiante: lento, normal, ráfagas rápidas y pausas */
  pickLeg() {
    const r = Math.random();
    this.spd = r < 0.3 ? 28 + Math.random() * 20 : r < 0.72 ? 62 + Math.random() * 30 : 125 + Math.random() * 50;
    if (this.phase2) this.spd *= 1.25;
    let tx = this.x;
    for (let i = 0; i < 6 && Math.abs(tx - this.x) < 50; i++) tx = ARENA.x0 + 24 + Math.random() * (ARENA.x1 - ARENA.x0 - 48);
    this.tx = tx;
    this.ty = SKY_Y - 18 + Math.random() * 30;
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
    // cada ataque apunta a alguien (online puede ser cualquiera de los dos)
    if (!this.target || !fs.includes(this.target) || this.target.dead) this.target = this.pickTarget();
    const p = this.target;
    this.flash = Math.max(0, this.flash - dt);
    const atk = this.attack;
    if (!atk || atk.free) this.cruise(dt, atk ? 0.5 : 1);
    if (atk) this.updateAttack(dt, p, atk);
    else {
      this.castT -= dt;
      if (this.castT <= 0) { this.target = this.pickTarget(); this.startAttack(this.target); }
    }
    if (!this.attack || this.attack.type !== 'dive') this.facing = p.cx > this.x ? 1 : -1;
    // la pareja da ánimo de vez en cuando
    this.cheerT -= dt;
    if (this.cheerT <= 0 && this.partner) {
      this.cheerT = 7 + Math.random() * 5;
      const lines = ['¡VAMOS!', '¡ATAJALA!', '¡TIRÁSELA!', '¡DALE QUE PODÉS!', '¡CUIDADO!', '¡ESQUIVÁ!'];
      g.addText(this.partner.x, FLOOR_Y - CHAR_H - 6, lines[Math.floor(Math.random() * lines.length)], '#fff4e0');
    }
    for (const m of this.marks) m.t -= dt;
    this.marks = this.marks.filter((m) => m.t > 0);
    this.updateRocks(dt, fs);
    this.updateHazards(dt, fs);
  }

  // ---- ataques ----
  startAttack(p) {
    const g = this.g;
    let type = 'rocks';
    if (this.sinceRocks < 1) {
      // las rocas son la única forma de pegarle: salen al menos un ataque sí y otro no
      const opts = [['rocks', 1], ['feathers', 1], ['pillars', 1], ['dive', this.phase2 ? 1.1 : 0.7]];
      let r = Math.random() * opts.reduce((s, o) => s + o[1], 0);
      for (const [k, w] of opts) { if ((r -= w) < 0) { type = k; break; } }
    }
    this.sinceRocks = type === 'rocks' ? 0 : this.sinceRocks + 1;
    g.sfx('charge');
    if (type === 'rocks') this.attack = { type, t: 0, wind: 0.75, free: true };
    else if (type === 'feathers') this.attack = { type, t: 0, wind: 0.65, free: true, shots: this.phase2 ? 2 : 1 };
    else if (type === 'pillars') {
      this.attack = { type, t: 0, wind: 1.05, free: true };
      // una columna justo debajo del jugador y otras cerca, separadas para que haya dónde pararse
      const xs = [clamp(p.cx, ARENA.x0 + 6, ARENA.x1 - 6)];
      const n = this.phase2 ? 4 : 3;
      for (let tries = 0; xs.length < n && tries < 40; tries++) {
        const x = clamp(p.cx + (Math.random() - 0.5) * 220, ARENA.x0 + 6, ARENA.x1 - 6);
        if (xs.every((o) => Math.abs(o - x) > 30)) xs.push(x);
      }
      for (const x of xs) this.pillars.push({ x, t: -1.05, hit: false });
    } else {
      this.attack = { type, t: 0, stage: 'aim', tx: p.cx, free: false };
      g.addText(this.x, this.y - AG_H - 6, '¡!', '#ff5d6c');
    }
  }

  endAttack() {
    this.attack = null;
    this.castT = this.phase2 ? 0.8 + Math.random() * 0.7 : 1.3 + Math.random() * 0.8;
  }

  updateAttack(dt, p, a) {
    const g = this.g;
    a.t += dt;
    const o = this.orb();
    if (a.type === 'rocks') {
      if (Math.random() < 0.7) g.particles.add({ x: o.x + (Math.random() - 0.5) * 16, y: o.y + (Math.random() - 0.5) * 16, vx: 0, vy: 0, life: 0.35, max: 0.35, color: Math.random() < 0.5 ? '#c98cff' : '#ffb347', star: true, grav: 0 });
      if (a.t >= a.wind) { this.spawnRocks(p); this.endAttack(); }
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
    } else this.updateDive(dt, p, a);
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
      const v = (this.phase2 ? 330 : 280) * dt;
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
    const n = this.phase2 ? 5 : 3, sp = this.phase2 ? 150 : 125;
    const ox = this.x + this.facing * 4, oy = this.y - 16;
    const base = Math.atan2(p.cy - oy, p.cx - ox);
    for (let i = 0; i < n; i++) {
      const a = base + (i - (n - 1) / 2) * 0.24;
      this.feathers.push({ x: ox, y: oy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, a });
    }
    g.sfx('throw');
  }

  spawnRocks(p) {
    const g = this.g, o = this.orb(), spr = rockSprites();
    const n = (this.phase2 ? 3 : 2) + (Math.random() < 0.35 ? 1 : 0);
    g.sfx('magma');
    for (let i = 0; i < n; i++) {
      const tx = clamp(p.cx + (i - (n - 1) / 2) * 30 + (Math.random() - 0.5) * 18, ARENA.x0, ARENA.x1);
      const T = (this.phase2 ? 1.05 : 1.3) + Math.random() * 0.35;
      const ty = FLOOR_Y - 4;
      const k = Math.floor(Math.random() * spr.length);
      this.rocks.push({
        x: o.x, y: o.y, vx: (tx - o.x) / T, vy: (ty - o.y - 0.5 * ROCK_G * T * T) / T, state: 'fall', t: 0, dead: false,
        k, rad: spr[k][0].width / 2, spin: (Math.random() < 0.5 ? -1 : 1) * (3 + Math.random() * 4),
      });
      this.marks.push({ x: tx, t: T });
    }
  }

  updateRocks(dt, fs) {
    const g = this.g;
    const tipOf = (p) => (p.digging && p.aim && !p.dead ? { x: p.cx + p.aim.x * 9, y: p.cy - 1 + p.aim.y * 9 } : null);
    for (const r of this.rocks) {
      if (r.dead) continue;
      r.t += dt;
      if (r.state === 'held') {
        // queda pegada en la punta del taladro de quien la atajó
        const p = r.by, tip = tipOf(p);
        if (!p || p.dead || p.heldRock !== r) { this.shatter(r); continue; }
        const ax = tip ? p.aim.x : p.facing, ay = tip ? p.aim.y : -0.3;
        const h = tip || { x: p.cx + p.facing * 7, y: p.cy - 3 };
        r.x = h.x + ax * (r.rad - 2); r.y = h.y + ay * (r.rad - 2);
        continue;
      }
      r.vy += (r.state === 'thrown' ? THROW_G : ROCK_G) * dt;
      r.x += r.vx * dt; r.y += r.vy * dt;
      if (Math.random() < 0.5) g.particles.add({ x: r.x + (Math.random() - 0.5) * r.rad, y: r.y, vx: (Math.random() - 0.5) * 8, vy: -6, life: 0.4, max: 0.4, color: Math.random() < 0.4 ? '#ff7a1e' : 'rgba(70,50,45,0.6)', size: 1, grav: -10, smoke: Math.random() < 0.3 });
      if (r.state === 'fall') {
        let done = false;
        for (const p of fs) {
          if (p.dead) continue;
          // atajarla con el taladro
          const tip = tipOf(p);
          if (tip && Math.hypot(r.x - tip.x, r.y - tip.y) < BOSS.catchR + r.rad * 0.4) {
            if (!p.heldRock) {
              r.state = 'held'; r.by = p; p.heldRock = r;
              g.sfx('clink');
              for (let i = 0; i < 6; i++) g.particles.add({ x: r.x, y: r.y, vx: (Math.random() - 0.5) * 50, vy: -Math.random() * 40, life: 0.4, max: 0.4, color: '#ffd34d', star: true, grav: 80 });
              if (p === this.local) g.tip('catch', g.ui.isTouch ? '¡La atajaste! Apuntá y tocá LANZAR para devolvérsela' : '¡La atajaste! Apuntá con el mouse y apretá E para devolvérsela');
            } else this.shatter(r);
            done = true; break;
          }
          // si no, te pega
          const m = r.rad * 0.6;
          if (r.x > p.x - m && r.x < p.x + p.w + m && r.y > p.y - m && r.y < p.y + p.h + m) {
            this.rockHit(p);
            this.shatter(r);
            done = true; break;
          }
        }
        if (done) continue;
      }
      if (r.state === 'thrown') {
        const b = this.body(), m = r.rad * 0.5;
        if (r.x > b.x0 - m && r.x < b.x1 + m && r.y > b.y0 - m && r.y < b.y1 + m) {
          this.shatter(r);
          this.hit(r.by || this.local);
          continue;
        }
      }
      if (g.world.solidPx(r.x, r.y + r.rad - 2) || r.y > FLOOR_Y + 30 || r.y < this.ceilY - 160 || r.x < ARENA.x0 - 60 || r.x > ARENA.x1 + 60) this.shatter(r);
    }
    this.rocks = this.rocks.filter((r) => !r.dead);
  }

  /** plumas, columnas de fuego y ondas de choque: no se atajan, hay que esquivarlas */
  updateHazards(dt, fs) {
    const g = this.g;
    for (const f of this.feathers) {
      f.x += f.vx * dt; f.y += f.vy * dt;
      if (Math.random() < 0.3) g.particles.add({ x: f.x, y: f.y, vx: 0, vy: 0, life: 0.25, max: 0.25, color: '#c98cff', size: 1, grav: 0 });
      for (const p of fs) {
        if (!p.dead && !f.dead && f.x > p.x - 1 && f.x < p.x + p.w + 1 && f.y > p.y - 1 && f.y < p.y + p.h + 1) {
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
      for (const p of fs) {
        if (!c.hits.has(p) && h > 8 && !p.dead && Math.abs(p.cx - c.x) < 6 + p.w / 2 - 1 && p.y + p.h > FLOOR_Y - h) {
          if (this.hurtPlayer(p, BOSS.pillarDmg, p.cx > c.x ? 90 : -90)) c.hits.add(p);
        }
      }
    }
    this.pillars = this.pillars.filter((c) => c.t < 0.9);

    for (const w of this.waves) {
      w.x += w.dir * (this.phase2 ? 150 : 125) * dt;
      if (Math.random() < 0.6) g.particles.add({ x: w.x, y: FLOOR_Y - 2, vx: -w.dir * 10, vy: -30 - Math.random() * 30, life: 0.35, max: 0.35, color: Math.random() < 0.5 ? '#7a4a2c' : '#ff8a2e', size: 1, grav: 160 });
      // se salta: solo pega si estás en el piso (o casi)
      for (const p of fs) {
        if (!p.dead && !w.dead && Math.abs(p.cx - w.x) < 5 && p.y + p.h > FLOOR_Y - 6) {
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
    for (let i = 0; i < 6 + r.rad; i++) g.particles.add({ x: r.x, y: r.y, vx: (Math.random() - 0.5) * 70, vy: -Math.random() * 60, life: 0.5, max: 0.5, color: Math.random() < 0.55 ? '#3a2316' : Math.random() < 0.5 ? '#ff6a1a' : '#ffd060', size: 1, grav: 200 });
  }

  /** dirección del tiro: al mouse en compu, hacia donde apunta el taladro en el celu. Sin ayudas: se puede errar. */
  aimDir(p, r, useMouse = true) {
    const g = this.g, inp = g.input;
    let dx, dy;
    if (useMouse && !g.ui.isTouch && inp.mouseSeen) { dx = inp.mouse.x + g.cam.x - r.x; dy = inp.mouse.y + g.cam.y - r.y; }
    else if (p.aim || p.lastAim) { const a = p.aim || p.lastAim; dx = a.x; dy = a.y; }
    else { dx = p.facing; dy = -0.35; }
    const d = Math.hypot(dx, dy) || 1;
    return { x: dx / d, y: dy / d };
  }

  /** E: devuelve la roca */
  /** aim: {mx, my} hacia dónde apunta el mouse, o null (taladro / joystick / para adelante) */
  throwRock(p, aim) {
    const g = this.g, r = p.heldRock;
    if (!r) return;
    let dx, dy;
    if (aim && Number.isFinite(aim.mx)) { dx = aim.mx - r.x; dy = aim.my - r.y; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d; }
    else ({ x: dx, y: dy } = this.aimDir(p, r, false));
    const v = BOSS.throwSpeed;
    r.state = 'thrown'; r.vx = dx * v; r.vy = dy * v;
    p.heldRock = null;
    g.sfx('throw');
  }

  hit(p) {
    const g = this.g;
    this.hp--;
    this.flash = 0.3;
    g.sfx('bossHit');
    g.shakeAll(2.5);
    g.addText(this.x, this.y - AG_H - 6, '¡AUCH!', '#ffd34d');
    for (let i = 0; i < 6; i++) g.particles.add({ x: this.x + (Math.random() - 0.5) * 10, y: this.y - 20, vx: (Math.random() - 0.5) * 50, vy: -20 - Math.random() * 30, life: 0.8, max: 0.8, color: '#c9c0b0', size: 1, grav: 40 });
    g.ui.setBossBar(Math.max(0, this.hp) / BOSS.hp);
    if (!this.phase2 && this.hp <= BOSS.hp / 2) {
      this.phase2 = true;
      setTimeout(() => g.addText(this.x, this.y - AG_H - 14, '¡GRRR! ¡AHORA VAN A VER!', '#ff9ccc'), 500);
    }
    if (this.hp <= 0) this.defeat(p);
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
    const t = this.t, g = this.g;
    if (this.partner) {
      const P = this.partner;
      const f = getCharFrames(P.id)[this.x > P.x ? 'right' : 'left'];
      const hop = Math.max(0, Math.sin(t * 5)) > 0.97 ? 2 : 0; // saltitos de aliento
      ctx.drawImage(t % 1.6 > 1 ? f.idleB : f.idle, Math.round(P.x - CHAR_W / 2 - camX), Math.round(FLOOR_Y - CHAR_H - camY - hop));
    }
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
    // aviso de la picada
    const a = this.attack;
    if (a && a.type === 'dive' && a.stage === 'aim' && Math.floor(a.t * 10) % 2 === 0) {
      const x = Math.round(a.tx - camX);
      ctx.fillStyle = 'rgba(255,60,60,0.9)';
      ctx.fillRect(x - 6, fy - 1, 13, 1); ctx.fillRect(x, fy - 7, 1, 6);
      ctx.fillRect(x - 3, fy - 4, 7, 1);
    }
    const pose = a && a.type === 'dive' ? (a.stage === 'ground' ? 'idle' : 'fly') : a && a.type !== 'feathers' && a.t < (a.wind || 0) ? 'cast' : 'fly';
    drawAguilus(ctx, this.x - camX, this.y - camY, this.facing, pose, t, this.flash > 0 && Math.floor(t * 30) % 2 === 0);
    // plumas-dardo
    for (const f of this.feathers) {
      ctx.save();
      ctx.translate(Math.round(f.x - camX), Math.round(f.y - camY));
      ctx.rotate(f.a);
      ctx.drawImage(FEATHER, -7, -1);
      ctx.restore();
    }
    // rocas de magma con un resplandor suave
    const spr = rockSprites();
    for (const r of this.rocks) {
      const x = r.x - camX, y = r.y - camY;
      ctx.fillStyle = `rgba(255,110,30,${0.14 + Math.sin(t * 8 + r.k) * 0.05})`;
      ctx.beginPath(); ctx.arc(x, y, r.rad + 2.5, 0, Math.PI * 2); ctx.fill();
      const img = spr[r.k][((Math.floor(r.t * r.spin) % 4) + 4) % 4];
      ctx.drawImage(img, Math.round(x - img.width / 2), Math.round(y - img.height / 2));
    }
    // guía de puntería mientras tenés una roca: la curva real del tiro, sin corrección
    const p = g.players[0], r = p && p.heldRock;
    if (r && !p.dead) {
      const d = this.aimDir(p, r), v = BOSS.throwSpeed;
      ctx.fillStyle = 'rgba(255,244,224,0.8)';
      for (let i = 1; i <= 9; i++) {
        const tt = i * 0.04;
        const px = r.x + d.x * v * tt, py = r.y + d.y * v * tt + 0.5 * THROW_G * tt * tt;
        ctx.globalAlpha = 0.9 - i / 11;
        ctx.fillRect(Math.round(px - camX), Math.round(py - camY), 1, 1);
      }
      ctx.globalAlpha = 1;
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
const LAND_X = 34 * TILE;

// ------------------------------------------------------------
//  Guiones
// ------------------------------------------------------------
function* encounterScript(sc, B, p) {
  const g = sc.g, me = p.char, mate = B.mateId;
  if (B.losses > 0) { yield* rematchScript(sc, B, p); return; }
  const meX = clamp(p.cx, ARENA.x0, ARENA.x1);
  const towards = B.homeX > meX ? 1 : -1;
  const mateX = clamp(meX - towards * 18, ARENA.x0, ARENA.x1);
  sc.actor(me, meX, FLOOR_Y, { facing: towards });
  sc.actor(mate, mateX, FLOOR_Y - 220, { facing: towards });
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
  yield sc.say('aguilus', '¡Vaya, vaya! Así que llegaron hasta el centro de la Tierra...');
  sc.fixed = { x: B.homeX, y: FLOOR_Y - 18 };
  sc.setZoom(2.2);
  yield sc.say('pancha', '¡¿Aguilus?! ¡Sabía que eras vos! ¡La pluma te delató!');
  yield sc.say('aguilus', 'Esta vez no voy a dejar que se los lleven. ¡Este año sí te arruino el cumple, Pancha!');
  sc.fixed = { x: mid, y: FLOOR_Y - 20 };
  sc.setZoom(1.5);
  yield sc.say('pablo', '¡Devolvé esos regalos, pajarraco!');
  yield sc.say('aguilus', '¡Jamás! ¡Prepárense para la lluvia de magma!');
  // se eleva
  sc.actors.aguilus.pose = 'fly';
  sc.fly('aguilus', B.homeX, SKY_Y, 45);
  g.sfx('charge');
  g.shakeAll(3);
  sc.fixed = { x: mid, y: FLOOR_Y - 60 };
  sc.setZoom(1);
  yield sc.arrive('aguilus');
  const name = CHARACTERS[me].name;
  yield sc.say(mate, `¡${name}! Si mantenés el taladro apuntando a las rocas, se le quedan pegadas.`);
  yield sc.say(me, g.ui.isTouch ? '¡Y con el botón LANZAR se las devuelvo!' : '¡Y con la E se las tiro de vuelta!');
  yield sc.say(mate, 'Pero sus plumas, el fuego y las picadas no se atajan: ¡esos hay que esquivarlos!');
  yield sc.say(mate, '¡Y ojo, que acá abajo el jetpack casi no tiene fuerza! No hay forma de escaparse volando.');
}

/** cuando volvés a bajar después de que te noqueó: Aguilus te gasta */
function* rematchScript(sc, B, p) {
  const g = sc.g, me = p.char, mate = B.mateId, n = B.losses;
  const name = CHARACTERS[me].name;
  const meX = clamp(p.cx, ARENA.x0, ARENA.x1);
  const towards = B.homeX > meX ? 1 : -1;
  const mateX = clamp(meX - towards * 18, ARENA.x0, ARENA.x1);
  sc.actor(me, meX, FLOOR_Y, { facing: towards });
  sc.actor(mate, mateX, FLOOR_Y - 220, { facing: towards });
  sc.actor('aguilus', B.homeX, FLOOR_Y, { facing: -towards, phase: 0 });
  const mid = (meX + B.homeX) / 2;
  sc.fixed = { x: mid, y: FLOOR_Y - 20 };
  sc.setZoom(Math.abs(B.homeX - meX) > 170 ? 1 : 1.5);
  sc.snapCam();
  sc.drop(mate, FLOOR_Y);
  yield sc.arrive(mate);
  sc.fixed = { x: B.homeX, y: FLOOR_Y - 18 };
  sc.setZoom(2.2);
  // las gastadas cambian según cuántas veces te ganó
  const pick = (arr) => arr[(n - 1) % arr.length];
  yield sc.say('aguilus', pick([
    `¡Ja! ¿Ya te despertaste, ${name}? Pensé que te ibas a quedar durmiendo la siesta hasta el año que viene.`,
    `¡¿Otra vez vos?! Ya van ${n} veces... Te voy a empezar a cobrar la entrada.`,
    `${n} a 0, ${name}. ¿Querés que te preste mi báculo, a ver si así te va mejor?`,
  ]));
  sc.fixed = { x: mid, y: FLOOR_Y - 20 };
  sc.setZoom(1.5);
  yield sc.say(me, pick([
    'Eso fue un calentamiento nomás.',
    'Me resbalé. El piso está lleno de magma, ¿sabés?',
    'Te estaba estudiando los movimientos...',
  ]));
  sc.fixed = { x: B.homeX, y: FLOOR_Y - 18 };
  sc.setZoom(2.2);
  yield sc.say('aguilus', pick([
    'Ajá. Y las estrellitas que veías, ¿también eran de calentamiento?',
    'Claro, claro. Y yo soy un pollito.',
    '¿Y qué aprendiste? ¿Que las rocas de magma duelen? ¡Jiji!',
  ]));
  sc.fixed = { x: mid, y: FLOOR_Y - 20 };
  sc.setZoom(1.5);
  yield sc.say(mate, '¡No le hagas caso! ¡Esta vez le ganamos!');
  yield sc.say('aguilus', '¡Ya veremos! ¡Ahí va otra lluvia de magma!');
  sc.actors.aguilus.pose = 'fly';
  sc.fly('aguilus', B.homeX, SKY_Y, 55);
  g.sfx('charge');
  g.shakeAll(3);
  sc.fixed = { x: mid, y: FLOOR_Y - 60 };
  sc.setZoom(1);
  yield sc.arrive('aguilus');
  yield sc.say(mate, 'Acordate: las rocas se atajan con el taladro, ¡y lo demás se esquiva!');
}

function* victoryScript(sc, B, p) {
  // online el golpe final lo puede dar cualquiera de los dos: la pareja es siempre el otro personaje
  const g = sc.g, me = p.char, mate = me === 'pablo' ? 'pancha' : 'pablo', A = sc.actors;
  const gx = clamp(B.x, ARENA.x0 + 50, ARENA.x1 - 30);
  const ag = sc.actor('aguilus', gx, B.y, { pose: 'hurt', facing: -1, phase: 0 }); // primero: queda detrás en el abrazo
  sc.actor(me, clamp(p.cx, ARENA.x0, ARENA.x1), FLOOR_Y, { facing: gx > p.cx ? 1 : -1 });
  // online la pareja es la otra persona: arranca donde estaba
  const other = B.fighters().find((f) => f !== p);
  const mx = other ? clamp(other.cx, ARENA.x0, ARENA.x1) : B.partner ? B.partner.x : p.cx - 16;
  sc.actor(mate, mx, FLOOR_Y, { facing: gx > mx ? 1 : -1 });
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
  yield sc.say('aguilus', '¡Está bien, está bien! ¡Me rindo! ¡Auch, mis plumitas!');
  yield sc.say('pancha', '¿Otra vez vos, Aguilus? ¡Todos los años lo mismo!');
  yield sc.say('pablo', 'Ya nos tenés hartos con tus escondites.');
  yield sc.say('aguilus', 'Es que... nadie me invita a los cumples... y los regalos brillan tanto...');
  yield sc.say('pancha', 'Bueno. Nos llevamos mis regalos. Chau, Aguilus.');
  // hacen como que se van
  sc.walk(me, gx - 70, 34); sc.walk(mate, gx - 86, 34);
  sc.fixed = { x: gx - 40, y: FLOOR_Y - 14 };
  sc.setZoom(1.5);
  yield sc.wait(1.3);
  ag.pose = 'idle';
  sc.emote('aguilus', '!');
  yield sc.say('aguilus', '¡Esperen! ¿Me van a dejar acá abajo? ¡Esto es un horno!');
  yield sc.arrive(me, mate);
  A[me].facing = 1; A[mate].facing = 1;
  yield sc.say('pablo', '...');
  yield sc.say('pancha', 'Ay, bueno. Vení, dale.');
  // abrazo de a tres
  sc.walk(me, gx - 9, 45); sc.walk(mate, gx + 9, 60);
  sc.fixed = { x: gx, y: FLOOR_Y - 14 };
  sc.setZoom(2.2);
  yield sc.arrive(me, mate);
  A[mate].facing = -1; A[me].facing = 1;
  A[me].pose = 'hug'; A[mate].pose = 'hug';
  sc.emote(me, '♥'); sc.emote(mate, '♥'); sc.emote('aguilus', '♥');
  yield sc.say('aguilus', '¡Snif! Ustedes sí que son buenos...');
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
  yield sc.say('carlos', '¡Ni se les ocurra!');
  sc.fixed = { x: LAND_X, y: GY - 12 };
  sc.setZoom(2.2);
  yield sc.wait(0.5);
  sc.emote('pancha', '♥'); sc.emote('pablo', '♥');
  yield sc.say('pancha', '¡Feliz cumple a mí!');
  yield sc.wait(0.8);
}
