// Aguilitas en el pozo: las ayudantes de Aguilus aparecen después del primer regalo, de los 300 m para abajo.
// Salen de las cuevas y de los huecos ya cavados (nunca de adentro de la tierra), persiguen al personaje y
// pican; no suben más arriba de EAGLETS.ceil. Con la pistola de agua (Carlos) se las moja y se van.
// Acá también vuelan las gotitas de la pistola cuando se usa fuera de la pelea con Aguilus.
import { EAGLETS, BOSS, TILE } from './config.js';
import { rowForDepth, SUB } from './world.js';
import { eagletSprites } from './boss.js';
import { clamp } from './util.js';

const CORE_Y = () => rowForDepth(1490) * TILE; // en el núcleo no hay aguilitas sueltas (ahí está Aguilus)

export class Eaglets {
  constructor(game) {
    this.g = game;
    this.list = [];
    this.drops = [];
    this.spawnT = 3;
    this.chasing = false; // hubo aguilitas persiguiendo (para avisar cuando se escapan)
  }

  get ceilY() { return rowForDepth(EAGLETS.ceil) * TILE; }
  get fromY() { return rowForDepth(EAGLETS.from) * TILE; }

  clear() { this.list.length = 0; this.drops.length = 0; }

  /** ¿entra una aguilita acá sin tocar tierra? */
  free(x, y) {
    const W = this.g.world;
    return !W.solidPx(x, y) && !W.solidPx(x - 3, y - 3) && !W.solidPx(x + 3, y - 3) && !W.solidPx(x - 3, y + 3) && !W.solidPx(x + 3, y + 3);
  }

  /**
   * busca de dónde puede salir una aguilita: un hueco (cueva o túnel ya cavado) cerca del personaje,
   * debajo de los 300 m y fuera de la pantalla si se puede. Prefiere los túneles cavados (llegan más fácil).
   */
  findCave(p, onScreenOk = false, aboveOnly = false) {
    const g = this.g, W = g.world, z = g.zoom || 1;
    const vx0 = g.cam.x - 8, vy0 = g.cam.y - 8, vx1 = g.cam.x + g.vw / z + 8, vy1 = g.cam.y + g.vh / z + 8;
    let onScreen = null, natural = null;
    for (let k = 0; k < 120; k++) {
      const a = Math.random() * Math.PI * 2, d = 100 + Math.random() * 160;
      const x = p.cx + Math.cos(a) * d, y = p.cy + Math.sin(a) * d;
      if ((aboveOnly ? y > p.cy - 24 : y < this.fromY + 4) || y > CORE_Y() || !this.free(x, y)) continue;
      const dug = W.subDug[Math.floor(y / SUB) * W.sw + Math.floor(x / SUB)];
      const seen = x > vx0 && x < vx1 && y > vy0 && y < vy1;
      if (seen) { if (!onScreen) onScreen = { x, y }; continue; }
      if (dug) return { x, y };
      if (!natural) natural = { x, y };
    }
    return natural || (onScreenOk ? onScreen : null);
  }

  /** una aguilita nueva en (x, y) */
  spawn(x, y, opts = {}) {
    this.list.push({
      x, y, vx: 0, vy: 0, st: 'chase', t: 0, nextT: 1.6 + Math.random() * 1.6, hp: EAGLETS.hp,
      flash: 0, ph: Math.random() * 6, facing: 1, stuck: 0, cd: 0, alpha: 1, waitT: 0, rot: 0, spin: 0, ...opts,
    });
    for (let i = 0; i < 5; i++) this.g.particles.add({ x, y, vx: (Math.random() - 0.5) * 40, vy: (Math.random() - 0.5) * 40, life: 0.5, max: 0.5, color: 'rgba(220,200,255,0.7)', size: 2, grav: 0, smoke: true });
  }

  update(dt) {
    const g = this.g, p = g.players[0];
    this.updateGuns(dt);
    this.updateDrops(dt);
    if (!g.aguiMet || !p) return;
    const fight = !!(g.boss && (g.boss.fighting || g.boss.state === 'scene'));
    // nuevas aguilitas: de los 300 m para abajo (en el núcleo no)
    if (!p.dead && !fight && p.depth > EAGLETS.from && p.y < CORE_Y()) {
      this.spawnT -= dt;
      if (this.spawnT <= 0) {
        const k = Math.min(0.5, (p.depth - EAGLETS.from) / 2400);
        this.spawnT = (EAGLETS.every[0] + Math.random() * (EAGLETS.every[1] - EAGLETS.every[0])) * (1 - k);
        const max = Math.min(EAGLETS.max, 2 + Math.floor((p.depth - EAGLETS.from) / 300));
        const alive = this.list.filter((b) => b.st !== 'dead' && b.st !== 'leave').length;
        if (alive < max) { const c = this.findCave(p); if (c) this.spawn(c.x, c.y); }
      }
    }
    // ¿se escapó para arriba (o está en casa, o se desmayó)?
    const away = p.dead || p.resting || p.y + p.h < this.ceilY - 2 || fight;
    for (const b of this.list) this.step(b, dt, p, away);
    this.list = this.list.filter((b) => !b.gone);
    const chasing = this.list.some((b) => b.st !== 'dead' && b.st !== 'leave');
    if (this.chasing && !chasing && away && !p.dead && !g.gunGiven) {
      g.tip('escaped', `¡Uf, zafamos! Las aguilitas no suben más arriba de los ${EAGLETS.ceil} m. Vayan a contarle a Carlos al taller`);
    }
    this.chasing = chasing;
  }

  /** mueve una aguilita sin atravesar la tierra; devuelve si chocó */
  move(b, dt) {
    let hit = false;
    const nx = b.x + b.vx * dt;
    if (this.free(nx, b.y)) b.x = nx; else { b.vx *= -0.3; hit = true; }
    let ny = b.y + b.vy * dt;
    if (ny < this.ceilY + 4) { ny = this.ceilY + 4; b.vy = Math.max(0, b.vy); }
    if (this.free(b.x, ny)) b.y = ny; else { b.vy *= -0.3; hit = true; }
    return hit;
  }

  step(b, dt, p, away) {
    const g = this.g;
    b.t += dt;
    b.flash = Math.max(0, b.flash - dt);
    b.cd = Math.max(0, b.cd - dt);
    if (b.st === 'dead') {
      // mojada: cae dando vueltas y, al tocar la tierra, se va en un "puf"
      b.vy = Math.min(b.vy + 420 * dt, 300);
      b.x += b.vx * dt; b.y += b.vy * dt; b.rot += b.spin * dt;
      if (g.world.solidPx(b.x, b.y + 3) || b.t > 3) { b.gone = true; this.puff(b.x, b.y); }
      return;
    }
    if (b.st === 'leave') {
      // se vuelve a su cueva: se aleja hacia abajo y se desvanece
      b.vy = Math.min(b.vy + 80 * dt, 70);
      b.x += b.vx * dt; b.y += b.vy * dt;
      b.alpha -= dt * 0.7;
      if (b.alpha <= 0) b.gone = true;
      return;
    }
    const dx = p.cx - b.x, dy = p.cy - b.y, dist = Math.hypot(dx, dy);
    if (away || dist > 460) {
      // no suben más: esperan un ratito abajo del techo, mirando, y se van
      b.waitT += dt;
      b.vx *= Math.max(0, 1 - dt * 3); b.vy = Math.sin(b.t * 4 + b.ph) * 12;
      this.move(b, dt);
      if (b.waitT > 1.3) {
        b.st = 'leave'; b.vx = (Math.random() - 0.5) * 30; b.vy = 20;
        if (Math.random() < 0.5) g.addText(b.x, b.y - 6, '¡PÍO!', '#e8e3d6');
      }
      return;
    }
    b.waitT = 0;
    if (b.st === 'chase') {
      // revolotea alrededor y un poco arriba del personaje, cada una a su ritmo
      const tx = p.cx + Math.sin(b.t * 1.3 + b.ph) * 30, ty = p.cy - 20 + Math.sin(b.t * 2.1 + b.ph) * 8;
      const ex = tx - b.x, ey = ty - b.y, ed = Math.hypot(ex, ey) || 1;
      const sp = EAGLETS.speed * Math.min(1, ed / 30 + 0.35);
      b.vx += ((ex / ed) * sp - b.vx) * Math.min(1, dt * 3);
      b.vy += ((ey / ed) * sp - b.vy) * Math.min(1, dt * 3);
      b.nextT -= dt;
      if (b.nextT <= 0 && dist < 95) { b.st = 'aim'; b.t = 0; }
    } else if (b.st === 'aim') {
      // se frena un instante (titila) y se tira en picada
      b.vx *= Math.max(0, 1 - dt * 8); b.vy *= Math.max(0, 1 - dt * 8);
      if (b.t >= 0.45) {
        const d = dist || 1;
        b.vx = (dx / d) * EAGLETS.swoop; b.vy = (dy / d) * EAGLETS.swoop;
        b.st = 'swoop'; b.t = 0;
        g.audio.play('swoosh');
      }
    } else if (b.st === 'swoop') {
      if (b.t > 0.8) { b.st = 'rise'; b.t = 0; b.vy = -70; b.vx *= 0.4; }
    } else if (b.st === 'rise') {
      b.vy = Math.min(b.vy + 60 * dt, -20);
      if (b.t > 0.5) { b.st = 'chase'; b.t = 0; b.nextT = 1.8 + Math.random() * 1.6; }
    }
    const hit = this.move(b, dt);
    if (hit && b.st === 'swoop') { b.st = 'rise'; b.t = 0; b.vy = -60; }
    // si se queda trabada contra la tierra mucho rato, se vuelve a su cueva
    if (hit && Math.hypot(b.vx, b.vy) < 25) b.stuck += dt; else b.stuck = Math.max(0, b.stuck - dt);
    if (b.stuck > 2.5) { b.st = 'leave'; b.vx = 0; b.vy = 10; }
    if (Math.abs(b.vx) > 6) b.facing = b.vx > 0 ? 1 : -1;
    // picotazo
    if ((b.st === 'chase' || b.st === 'swoop') && b.cd <= 0 && !p.dead && p.hurtT <= 0
      && Math.abs(p.cx - b.x) < p.w / 2 + 4 && Math.abs(p.cy - b.y) < p.h / 2 + 3) {
      const s = Math.sign(dx) || 1;
      p.hurt(EAGLETS.dmg, 'eaglet');
      p.vx = s * 120; p.vy = Math.min(p.vy, -80);
      b.cd = 1.2; b.st = 'rise'; b.t = 0; b.vy = -90; b.vx = -s * 60;
    }
  }

  puff(x, y) {
    for (let i = 0; i < 6; i++) this.g.particles.add({ x, y, vx: (Math.random() - 0.5) * 40, vy: -Math.random() * 30, life: 0.5, max: 0.5, color: 'rgba(220,210,230,0.7)', size: 2, grav: -10, smoke: true });
  }

  /** la mojaron: "¡PÍO!", cae dando vueltas y se va */
  kill(b, vx) {
    const g = this.g;
    b.st = 'dead'; b.t = 0;
    b.vx = (Math.sign(vx) || 1) * 60; b.vy = -90; b.spin = (Math.random() < 0.5 ? -1 : 1) * 10;
    g.audio.play('peep');
    g.addText(b.x, b.y - 6, '¡PÍO!', '#e8e3d6');
    for (let i = 0; i < 6; i++) g.particles.add({ x: b.x, y: b.y, vx: (Math.random() - 0.5) * 50, vy: -Math.random() * 40, life: 0.8, max: 0.8, color: Math.random() < 0.5 ? '#a374dc' : '#8a5530', size: 1, grav: 60 });
  }

  // ---- pistola de agua fuera de la pelea ----
  /** cada personaje con la pistola en la mano tira gotitas mientras aprieta; cada tiro gasta un poco de batería */
  updateGuns(dt) {
    const g = this.g, st = g.stats;
    if (g.boss && g.boss.fighting) return; // en la pelea dispara boss.js
    for (const f of g.players) {
      if (f.ai || f.remote) continue;
      if (f.gunKick > 0) f.gunKick = Math.max(0, f.gunKick - dt * 8);
      const on = f.firing && f.aim && !f.dead && f.tool === 'gun' && g.gunGiven;
      if (!on) { f.gunCd = Math.max(0, (f.gunCd || 0) - dt); continue; }
      f.gunCd = (f.gunCd || 0) - dt;
      while (f.gunCd <= 0) {
        const cost = st.infEnergy ? 0 : st.gunCost;
        if (f.energy < cost) { f.note('¡Sin energía para la pistola! Volvé a casa a cargar', 'nogun'); f.gunCd = 0.3; break; }
        f.energy -= cost;
        f.gunCd += 1 / st.gunRate;
        const a = Math.atan2(f.aim.y, f.aim.x) + (Math.random() - 0.5) * 0.07;
        const v = BOSS.waterSpeed * (0.95 + Math.random() * 0.1);
        this.drops.push({ x: f.cx + f.aim.x * 9, y: f.cy - 2 + f.aim.y * 9, vx: Math.cos(a) * v + f.vx * 0.3, vy: Math.sin(a) * v, t: 0 });
        f.gunKick = 1;
        if (Math.random() < 0.6) g.audio.play('squirt');
      }
    }
  }

  updateDrops(dt) {
    const g = this.g;
    for (const d of this.drops) {
      d.t += dt;
      d.vy += BOSS.waterGrav * dt;
      d.x += d.vx * dt; d.y += d.vy * dt;
      let hit = false;
      for (const b of this.list) {
        if (b.st === 'dead' || b.st === 'leave' || Math.abs(d.x - b.x) > 6 || Math.abs(d.y - b.y) > 5) continue;
        this.splash(d.x, d.y);
        b.flash = 0.1;
        if (--b.hp <= 0) this.kill(b, d.vx);
        hit = true; break;
      }
      if (!hit && g.world.solidPx(d.x, d.y)) { this.splash(d.x, d.y); hit = true; }
      if (hit || d.t > BOSS.waterLife) d.dead = true;
    }
    this.drops = this.drops.filter((d) => !d.dead);
  }

  splash(x, y) {
    for (let i = 0; i < 3; i++) this.g.particles.add({ x, y, vx: (Math.random() - 0.5) * 50, vy: -10 - Math.random() * 40, life: 0.35, max: 0.35, color: i ? '#7fd8ff' : '#bfeaff', size: 1, grav: 220 });
  }

  // ---- dibujo ----
  draw(ctx, camX, camY) {
    const E = eagletSprites(), t = this.g.time;
    for (const b of this.list) {
      const x = b.x - camX, y = b.y - camY;
      const fr = E[b.facing > 0 ? 'right' : 'left'][Math.floor(t * 10 + b.ph) % 2];
      if (b.st === 'dead') {
        ctx.save();
        ctx.translate(Math.round(x), Math.round(y));
        ctx.rotate(Math.round(b.rot / (Math.PI / 2)) * (Math.PI / 2)); // de a 90°, sin borronear
        ctx.drawImage(fr, -7, -5);
        ctx.restore();
        continue;
      }
      if (b.flash > 0 && Math.floor(t * 40) % 2) continue;
      ctx.globalAlpha = clamp(b.alpha, 0, 1);
      ctx.drawImage(fr, Math.round(x - 7), Math.round(y - 5));
      ctx.globalAlpha = 1;
      if (b.st === 'aim' && Math.floor(b.t * 12) % 2 === 0) {
        // "!" rojo arriba: está por tirarse en picada
        ctx.fillStyle = '#ff4d6d';
        ctx.fillRect(Math.round(x), Math.round(y - 12), 1, 3); ctx.fillRect(Math.round(x), Math.round(y - 8), 1, 1);
      }
    }
    for (const d of this.drops) {
      const x = Math.round(d.x - camX), y = Math.round(d.y - camY);
      const sx = Math.abs(d.vx) > Math.abs(d.vy) ? Math.sign(d.vx) : 0, sy = sx ? 0 : Math.sign(d.vy);
      ctx.fillStyle = '#2f8fe0'; ctx.fillRect(x - sx * 2, y - sy * 2, 1, 1);
      ctx.fillStyle = '#4fb3ff'; ctx.fillRect(x - sx, y - sy, 1, 1);
      ctx.fillStyle = '#d8f4ff'; ctx.fillRect(x, y, 2, 2);
    }
  }

  /** después de la oscuridad: los ojitos brillan, así se las ve venir en la oscuridad */
  drawOverlay(ctx, camX, camY) {
    for (const b of this.list) {
      if (b.st === 'dead' || b.st === 'leave') continue;
      if (Math.floor(this.g.time * 3 + b.ph) % 7 === 0) continue; // parpadean
      const x = Math.round(b.x - camX + b.facing * 3), y = Math.round(b.y - camY - 3);
      ctx.fillStyle = '#ffe066'; ctx.fillRect(x, y, 1, 1);
      ctx.fillStyle = 'rgba(255,224,102,0.35)'; ctx.fillRect(x - 1, y, 3, 1); ctx.fillRect(x, y - 1, 1, 3);
    }
  }
}
