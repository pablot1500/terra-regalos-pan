// Partículas, tesoros que saltan y textos flotantes.
import { ITEMS, TILE } from './config.js';
import { LOOT_SPR, drawText, textWidth } from './sprites.js';

const HEART = [[1, 0], [3, 0], [0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [1, 2], [2, 2], [3, 2], [2, 3]];

export class Particles {
  constructor() { this.list = []; }
  add(p) { if (this.list.length < 700) this.list.push(p); }

  update(dt, world) {
    const L = this.list;
    for (let i = L.length - 1; i >= 0; i--) {
      const p = L[i];
      p.life -= dt;
      if (p.life <= 0) { L[i] = L[L.length - 1]; L.pop(); continue; }
      p.vy += (p.grav || 0) * dt;
      const nx = p.x + p.vx * dt, ny = p.y + p.vy * dt;
      if (p.collide && world.solid(Math.floor(nx / TILE), Math.floor(ny / TILE))) {
        p.vx *= -0.3; p.vy *= -0.25;
      } else { p.x = nx; p.y = ny; }
    }
  }

  draw(ctx, camX, camY) {
    for (const p of this.list) {
      const a = Math.min(1, p.life / (p.max || 1) * 1.5);
      const x = Math.round(p.x - camX), y = Math.round(p.y - camY);
      ctx.globalAlpha = a;
      if (p.heart) {
        ctx.fillStyle = '#ff6b8a';
        for (const [i, j] of HEART) ctx.fillRect(x + i - 2, y + j, 1, 1);
      } else if (p.star) {
        ctx.fillStyle = p.color;
        ctx.fillRect(x, y - 1, 1, 3); ctx.fillRect(x - 1, y, 3, 1);
      } else if (p.smoke) {
        const s = Math.round(p.size + (1 - p.life / p.max) * 2);
        ctx.fillStyle = p.color; ctx.fillRect(x - (s >> 1), y - (s >> 1), s, s);
      } else {
        ctx.fillStyle = p.color; ctx.fillRect(x, y, p.size || 1, p.size || 1);
      }
    }
    ctx.globalAlpha = 1;
  }
}

export class Pickups {
  constructor(game) { this.game = game; this.list = []; }

  spawn(x, y, item) {
    this.list.push({ x, y, vx: (Math.random() - 0.5) * 70, vy: -70 - Math.random() * 40, t: 0, item });
  }

  update(dt) {
    const g = this.game;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.t += dt;
      if (p.t < 0.32) {
        p.vy += 320 * dt;
        p.x += p.vx * dt; p.y += p.vy * dt;
        continue;
      }
      // imán hacia el jugador más cercano
      let best = null, bd = 1e9;
      for (const pl of g.players) {
        if (pl.dead) continue;
        const d = Math.hypot(pl.cx - p.x, pl.cy - p.y);
        if (d < bd) { bd = d; best = pl; }
      }
      if (!best) continue;
      const sp = 120 + p.t * 260;
      p.x += ((best.cx - p.x) / (bd || 1)) * sp * dt;
      p.y += ((best.cy - p.y) / (bd || 1)) * sp * dt;
      if (bd < 6) {
        this.list.splice(i, 1);
        g.collect(p.item, best);
      }
    }
  }

  draw(ctx, camX, camY, t) {
    for (const p of this.list) {
      const spr = LOOT_SPR[ITEMS[p.item].key];
      const x = Math.round(p.x - spr.width / 2 - camX), y = Math.round(p.y - spr.height / 2 - camY);
      ctx.drawImage(spr, x, y);
      if (Math.floor((t + p.x) * 6) % 3 === 0) { ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 1, y + 1, 1, 1); }
    }
  }
}

export class FloatTexts {
  constructor() { this.list = []; }
  add(x, y, text, color) {
    this.list.push({ x, y, text, color, life: 1.1 });
    if (this.list.length > 30) this.list.shift();
  }
  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const f = this.list[i];
      f.life -= dt; f.y -= 16 * dt;
      if (f.life <= 0) this.list.splice(i, 1);
    }
  }
  draw(ctx, camX, camY) {
    for (const f of this.list) {
      if (f.life < 0.25 && Math.floor(f.life * 30) % 2) continue;
      const x = Math.round(f.x - textWidth(f.text) / 2 - camX), y = Math.round(f.y - camY);
      drawText(ctx, f.text, x, y, f.color, '#1d1420');
    }
  }
}
