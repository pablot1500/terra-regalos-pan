// Popi, el perro salchicha compañero: sigue al personaje, salta, vuela con su
// mini jetpack y ayuda a cavar los bloques de al lado (al 25% del ritmo).
import { TILE, PHYS, DIG } from './config.js';
import { POPI } from './sprites.js';
import { SUB } from './world.js';

const HELP_SPEED = 0.25;   // Popi cava al 25% del ritmo del personaje
const HELP_RADIUS = 0.6;   // y con un círculo más chico
const FOLLOW_GAP = 14;     // px detrás del personaje

export class Popi {
  constructor(game) {
    this.g = game;
    this.w = 6;   // misma anchura que el personaje: entra en cualquier pozo que cave
    this.h = 9;
    this.vx = 0; this.vy = 0;
    this.facing = 1;
    this.onGround = false;
    this.flying = false;
    this.digging = false;
    this.digT = 0;
    this.side = 1;
    this.anim = 0;
    this.stuckT = 0;
    this.barkT = 15 + Math.random() * 20;
    this.place();
  }

  get cx() { return this.x + this.w / 2; }
  get cy() { return this.y + this.h / 2; }

  /** aparece al lado del personaje */
  place() {
    const p = this.g.players[0];
    this.x = p.cx - this.w / 2 - p.facing * 8;
    this.y = p.y + p.h - this.h;
    if (this.collides(this.x, this.y)) this.x = p.cx - this.w / 2;
    this.vx = 0; this.vy = 0;
    this.stuckT = 0;
  }

  poof() {
    for (let i = 0; i < 10; i++) {
      this.g.particles.add({ x: this.cx, y: this.cy, vx: (Math.random() - 0.5) * 50, vy: (Math.random() - 0.5) * 50, life: 0.5, max: 0.5, color: 'rgba(240,235,225,0.8)', size: 2, grav: 0, smoke: true });
    }
  }

  collides(x, y) {
    const W = this.g.world;
    const s0 = Math.floor(x / SUB), s1 = Math.floor((x + this.w - 0.001) / SUB);
    const r0 = Math.floor(y / SUB), r1 = Math.floor((y + this.h - 0.001) / SUB);
    for (let r = r0; r <= r1; r++) for (let s = s0; s <= s1; s++) if (W.subAt(s, r)) return true;
    return false;
  }

  moveX(dx) {
    if (!dx) return false;
    const nx = this.x + dx;
    if (!this.collides(nx, this.y)) { this.x = nx; return false; }
    if (this.onGround) {
      for (let s = 1; s <= 6; s++) if (!this.collides(nx, this.y - s)) { this.x = nx; this.y -= s; return false; }
    }
    if (dx > 0) this.x = Math.floor((nx + this.w - 0.001) / SUB) * SUB - this.w;
    else this.x = (Math.floor(nx / SUB) + 1) * SUB;
    if (this.collides(this.x, this.y)) this.x = nx - dx;
    return true;
  }

  moveY(dy) {
    if (!dy) return false;
    const ny = this.y + dy;
    if (!this.collides(this.x, ny)) { this.y = ny; return false; }
    if (dy > 0) this.y = Math.floor((ny + this.h - 0.001) / SUB) * SUB - this.h;
    else this.y = (Math.floor(ny / SUB) + 1) * SUB;
    if (this.collides(this.x, this.y)) this.y = ny - dy;
    return true;
  }

  update(dt) {
    const g = this.g, p = g.players[0];
    if (!p || p.dead) return;
    this.anim += dt;

    const dy = (p.y + p.h) - (this.y + this.h); // negativo = el personaje está más arriba
    // si el personaje está a otra altura (pozo, cueva), se centra para poder bajar o subir con él
    const tx = p.cx - (Math.abs(dy) > 12 ? 0 : p.facing * FOLLOW_GAP);
    const dx = tx - this.cx;
    const dist = Math.hypot(p.cx - this.cx, p.cy - this.cy);

    // muy lejos o trabado: aparece al lado con un "puf"
    if (dist > 60) this.stuckT += dt; else this.stuckT = 0;
    if (dist > 220 || this.stuckT > 1.6) { this.poof(); this.place(); this.poof(); return; }

    // caminar hacia su lugar (corre si el personaje corre)
    const speed = Math.max(PHYS.walk, Math.abs(p.vx)) * 1.2;
    const deadZone = Math.abs(dy) > 12 ? 0.5 : 5;
    const want = Math.abs(dx) > deadZone ? Math.sign(dx) * Math.min(speed, Math.abs(dx) * 5) : 0;
    const acc = this.onGround ? 1000 : 700;
    if (this.vx < want) this.vx = Math.min(want, this.vx + acc * dt);
    else this.vx = Math.max(want, this.vx - acc * dt);
    if (Math.abs(this.vx) > 4) this.facing = Math.sign(this.vx);
    else this.facing = p.cx >= this.cx ? 1 : -1;

    // gravedad y mini jetpack (sin energía)
    this.vy = Math.min(this.vy + PHYS.gravity * dt, PHYS.maxFall);
    this.flying = false;
    const up = dy < -20 || (p.flying && dy < -6);
    if (up) {
      this.flying = true;
      const vmax = Math.max(110, -p.vy * 1.15);
      this.vy = Math.max(this.vy - 1500 * dt, -vmax);
    } else if (dy > 40 && this.vy > 160) {
      // si el personaje bajó mucho, frena un poco la caída con el jetpack
      this.vy = 160;
      this.flying = true;
    }

    const blocked = this.moveX(this.vx * dt);
    if (blocked) this.vx = 0;
    if (blocked && this.onGround && Math.abs(dx) > 8) { this.vy = -195; this.onGround = false; }
    if (this.moveY(this.vy * dt) && this.vy < 0) this.vy = 0;
    this.onGround = this.vy >= 0 && this.collides(this.x, this.y + 1);
    if (this.onGround) this.vy = 0;

    if (this.flying && Math.random() < 0.5) {
      const nx = this.facing > 0 ? this.x + 1 : this.x + this.w - 1;
      g.particles.add({ x: nx, y: this.y + 2, vx: (Math.random() - 0.5) * 12, vy: 50 + Math.random() * 30, life: 0.25, max: 0.25, color: Math.random() < 0.5 ? '#ffd34d' : '#ff8a3d', size: 1, grav: -30 });
    }

    this.updateDig(dt, p);

    // algún ladrido de vez en cuando
    this.barkT -= dt;
    if (this.barkT <= 0) {
      this.barkT = 20 + Math.random() * 25;
      g.audio.play('bark');
      g.addText(this.cx, this.y - 10, '¡GUAU!', '#fff4e0');
    }
  }

  /** cava bloques al costado de donde está cavando el personaje */
  updateDig(dt, p) {
    const g = this.g, W = g.world, st = g.stats;
    this.digging = false;
    if (!p.digging || !p.digPoint || p.tooHard || !p.aim) { this.digT = 0; return; }
    const dp = p.digPoint;
    if (Math.hypot(dp.cx - this.cx, dp.cy - this.cy) > 50) return;
    this.digging = true;
    const R = dp.R * HELP_RADIUS;
    // punto al costado del del personaje (va alternando de lado)
    const nx = -p.aim.y, ny = p.aim.x;
    const off = dp.R * 1.15;
    const cx = dp.cx + nx * off * this.side + p.aim.x * R * 0.3;
    const cy = dp.cy + ny * off * this.side + p.aim.y * R * 0.3;
    const info = W.circleInfo(cx, cy, R, st.power);
    if (!info.any) { this.side *= -1; return; }
    const time = Math.max(DIG.minTime, (DIG.baseTime * Math.max(1, info.hard)) / st.power) / HELP_SPEED;
    this.digT += dt;
    if (this.digT < time) return;
    this.digT = 0;
    this.side *= -1;
    const res = W.digCircle(cx, cy, R, st.power);
    if (!res.n) return;
    g.counters.tiles += res.n / 16;
    for (const l of res.loot) g.pickups.spawn(l.x, l.y, l.item);
    for (const [t, n] of Object.entries(res.mats)) {
      p.debris(cx, cy, +t, Math.min(6, 1 + (n >> 3)), R);
      p.materialFx(cx, cy, +t, n, R);
    }
  }

  draw(ctx, camX, camY) {
    const set = POPI[this.facing > 0 ? 'right' : 'left'];
    let f;
    if (!this.onGround) f = 'air';
    else if (this.digging) f = Math.floor(this.anim * 8) % 2 ? 'digA' : 'digB';
    else if (Math.abs(this.vx) > 6) f = Math.floor(this.anim * 10) % 2 ? 'walkA' : 'walkB';
    else f = (this.anim % 3.7) > 3.55 ? 'blink' : Math.floor(this.anim * 3) % 2 ? 'idleA' : 'idleB';
    const spr = set[f];
    const sx = Math.round(this.cx - spr.width / 2 - camX), sy = Math.round(this.y + this.h + 1 - spr.height - camY);
    if (this.flying) {
      const fx = this.facing > 0 ? sx + 5 : sx + spr.width - 7;
      ctx.fillStyle = '#ff8a3d'; ctx.fillRect(fx, sy + 7, 2, 3);
      ctx.fillStyle = '#ffd34d'; ctx.fillRect(fx, sy + 7, 2, 1);
    }
    ctx.drawImage(spr, sx, sy);
  }
}

export { TILE };
