// Terrari Pancha — loop principal y estado del juego.
import {
  TILE, SURFACE, WORLD_W, WORLD_H, DEFAULT_SEED, UPGRADES, ITEMS, GIFTS, HP_MAX,
  DEATH_MONEY_PENALTY, ENDING_TEXT, CHARACTERS, BRUSH_R, SUPPLIES, TORCH, DIG,
  CORE_ROW, BOTTOM_ROW,
} from './config.js';
import { initTiles, T } from './tiles.js';
import { hash2 } from './rng.js';
import { initSprites, drawChest, drawGiftBox, drawTorch, DOG } from './sprites.js';
import { World } from './world.js';
import { Structures, DOG_POS, PATIO, TRAILER_X, TRAILER_H } from './structures.js';
import { Background } from './background.js';
import { CoreBackdrop } from './core.js';
import { Lighting } from './lighting.js';
import { Particles, Pickups, FloatTexts } from './entities.js';
import { Player } from './player.js';
import { Popi } from './popi.js';
import { Intro } from './intro.js';
import { Input } from './input.js';
import { Audio } from './audio.js';
import { UI } from './ui.js';
import { store } from './save.js';
import { fmtMoney, clamp } from './util.js';

const STEP = 1 / 120;

// qué materiales destellan y con qué probabilidad por bloque
const GLINT = {
  [T.GRANITE]: { p: 0.1, col: '#ffd6e6' },
  [T.BASALT]: { p: 0.14, col: '#9fc3ff' },
  [T.ABYSS]: { p: 0.24, col: '#c9a6ff' },
  [T.CRYSTAL]: { p: 0.35, col: '#ff9ccc' },
  [T.OBSIDIAN]: { p: 0.12, col: '#ff8a3d' },
};

function computeStats(u) {
  const v = (id) => UPGRADES.find((x) => x.id === id).levels[u[id]][0];
  return {
    power: v('pala'),
    brush: v('ancho'),
    brushR: BRUSH_R[v('ancho')],
    energyMax: Number.isFinite(v('bateria')) ? v('bateria') : 1000,
    infEnergy: !Number.isFinite(v('bateria')),
    armor: v('armadura').a,
    lavaResist: v('armadura').lava / 100,
    jetSpeed: v('motor').s,
    jetCost: v('motor').e,
    glide: v('motor').g,
    hover: v('motor').h || 0,
    lightR: v('casco'),
    reach: DIG.reachMult * (1 + DIG.reachPerUpgrade * (u.pala + u.ancho)),
  };
}

class Game {
  constructor(boot = {}) {
    this.canvas = document.getElementById('game');
    this.ctx = this.canvas.getContext('2d');
    initTiles();
    initSprites();
    this.audio = new Audio();
    this.input = new Input(this.canvas);
    this.input.onAnyInput = () => this.audio.unlock();
    this.bg = new Background();
    this.coreBg = new CoreBackdrop();
    this.structs = new Structures();
    this.lighting = new Lighting();
    this.particles = new Particles();
    this.pickups = new Pickups(this);
    this.texts = new FloatTexts();
    this.lights = [];
    this.time = 0;
    this.shakeT = 0; this.shakeA = 0;
    this.toastTimes = {};
    this.zoom = 1;
    this.state = 'splash'; // splash → intro → title → descend (la cámara baja del cielo) → play
    this.intro = null;
    try { this.charId = localStorage.getItem('terra-regalos-pan:char') || 'pancha'; } catch { this.charId = 'pancha'; }
    this.charId = { el: 'pablo', ella: 'pancha' }[this.charId] || this.charId; // nombres viejos de los personajes
    if (!CHARACTERS[this.charId]) this.charId = 'pancha';
    this.savedData = null;
    this.freshGame();
    this.ui = new UI(this);
    this.resize();
    this.cam = this.titleCam();
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('orientationchange', () => setTimeout(() => this.resize(), 200));
    document.addEventListener('visibilitychange', () => { if (document.hidden) { this.save(); if (this.state === 'play') this.pause(); } });
    window.addEventListener('pagehide', () => this.save());
    store.load().then((d) => {
      this.savedData = d && (d.v === 1 || d.v === 2) ? d : null;
      this.ui.updateTitle();
      // al recibir una versión nueva en vivo, retomar la partida donde estaba
      if (boot.resume && this.savedData) { this.ui.show('screen-splash', false); this.continueGame(); }
    });
    this.acc = 0;
    this.lastTs = performance.now();
    requestAnimationFrame((t) => this.frame(t));
  }

  // ------------------------------------------------------------
  //  Partida
  // ------------------------------------------------------------
  freshGame(seed = DEFAULT_SEED) {
    this.seed = seed;
    this.world = new World(seed);
    this.money = 0;
    this.upgrades = Object.fromEntries(UPGRADES.map((u) => [u.id, 0]));
    this.stats = computeStats(this.upgrades);
    this.openedGifts = [];
    this.counters = { tiles: 0, deaths: 0, playTime: 0, best: 0, earned: 0 };
    this.tips = {};
    this.inv = { torch: 0 };
    this.torches = [];
    this.popi = null;
    this.players = [new Player(this, this.charId)];
    this.pickups.list = [];
    this.particles.list = [];
  }

  requestNewGame() {
    if (this.savedData) {
      this.ui.showMsg('¿Empezar de nuevo?', 'Ya hay una partida guardada. Si empezás una nueva, se borra el progreso.', [
        { label: 'Cancelar', cls: 'alt' },
        { label: 'Empezar de cero', cls: 'danger', onClick: () => this.startNew() },
      ]);
    } else this.startNew();
  }

  startNew() {
    this.freshGame();
    this.startPlaying();
    this.save();
    this.pendingTip = ['start', '¡Salgan al patio y empiecen a cavar en el cantero!'];
  }

  continueGame() {
    const d = this.savedData;
    if (!d) return this.startNew();
    this.freshGame(d.seed || DEFAULT_SEED);
    if (d.v === 2) this.world.importDug(d.dug);
    else this.world.importDugTiles(d.dug);
    this.money = d.money || 0;
    const du = d.upgrades || {};
    for (const u of UPGRADES) this.upgrades[u.id] = clamp(du[u.id] || 0, 0, u.levels.length - 1);
    // partidas viejas: motor y eficiencia del jetpack eran mejoras separadas
    if (du.eficiencia) this.upgrades.motor = clamp(Math.max(du.motor || 0, du.eficiencia), 0, UPGRADES.find((u) => u.id === 'motor').levels.length - 1);
    this.stats = computeStats(this.upgrades);
    this.openedGifts = d.gifts || [];
    for (const ch of this.world.chests) if (this.openedGifts.includes(ch.id)) { ch.opened = true; ch.open = 1; }
    Object.assign(this.counters, d.counters || {});
    this.tips = d.tips || {};
    this.inv = { torch: (d.inv && Number.isFinite(d.inv.torch)) ? d.inv.torch : 0 };
    this.popiWith = !!d.popi;
    this.torches = Array.isArray(d.torches)
      ? d.torches.filter((t) => t && Number.isFinite(t.x) && Number.isFinite(t.y)).map((t) => ({ x: t.x, y: t.y, seed: Number.isFinite(t.seed) ? t.seed : Math.random() * 10 }))
      : [];
    // antorchas que hayan quedado en el cielo o en la superficie: se devuelven al inventario
    const sky = this.torches.filter((t) => t.y < (SURFACE + 1) * TILE).length;
    if (sky) { this.torches = this.torches.filter((t) => t.y >= (SURFACE + 1) * TILE); this.inv.torch += sky; }
    const p = new Player(this, this.charId);
    this.players = [p];
    if (d.player) {
      const { x, y, hp, energy } = d.player;
      if (Number.isFinite(x) && Number.isFinite(y) && !p.collides(x, y)) { p.x = x; p.y = y; p.peakY = y; }
      if (Number.isFinite(hp)) p.hp = clamp(hp, 1, HP_MAX);
      if (Number.isFinite(energy)) p.energy = clamp(energy, 0, this.stats.energyMax);
    }
    this.startPlaying();
  }

  startPlaying() {
    const fromTitle = this.state === 'title';
    this.popi = this.popiWith ? new Popi(this) : null;
    this.popiWith = false;
    this.saveTimer = 0;
    const p = this.players[0];
    const tx = p.cx - this.vw / 2, ty = p.cy - this.vh / 2;
    if (fromTitle) {
      // desde el título la cámara baja del cielo hasta donde está el personaje
      this.state = 'descend';
      this.ui.show('screen-title', false);
      const dist = Math.hypot(tx - this.cam.x, ty - this.cam.y);
      this.descend = { t: 0, dur: clamp(1.6 + dist / 900, 2.2, 4.5), x0: this.cam.x, y0: this.cam.y, x1: tx, y1: ty };
      return;
    }
    this.state = 'play';
    this.ui.setPlaying(true);
    this.cam.x = tx;
    this.cam.y = ty;
    if (this.pendingTip) { this.tip(...this.pendingTip); this.pendingTip = null; }
  }

  // ------------------------------------------------------------
  //  Intro y título
  // ------------------------------------------------------------
  /** posición de la cámara para la pantalla de título: arriba, en el cielo */
  titleCam() {
    const vw = this.vw || 400, vh = this.vh || 240;
    return { x: 26 * TILE - vw / 2, y: (SURFACE - 17) * TILE - vh };
  }

  startIntro() {
    this.audio.unlock();
    this.ui.show('screen-splash', false);
    this.ui.show('screen-title', false);
    this.ui.setIntro(true);
    this.state = 'intro';
    this.intro = new Intro(this);
  }

  endIntro() {
    this.intro = null;
    this.ui.setIntro(false);
    this.state = 'title';
    this.ui.setPlaying(false);
    this.ui.updateTitle();
  }

  serialize() {
    const p = this.players[0];
    return {
      v: 2,
      seed: this.seed,
      money: Math.floor(this.money),
      upgrades: this.upgrades,
      gifts: this.openedGifts,
      dug: this.world.exportDug(),
      counters: this.counters,
      tips: this.tips,
      inv: this.inv,
      torches: this.torches.map((t) => ({ x: t.x, y: t.y, seed: t.seed })),
      popi: !!this.popi,
      player: p ? { char: p.char, x: p.x, y: p.y, hp: p.hp, energy: p.energy } : null,
      savedAt: Date.now(),
    };
  }

  save() {
    if (!['play', 'shop', 'paused', 'gift'].includes(this.state)) return;
    const d = this.serialize();
    this.savedData = d;
    store.save(d);
  }

  toTitle() {
    this.save();
    this.audio.jet(false);
    this.ui.show('screen-pause', false);
    this.state = 'title';
    this.ui.setPlaying(false);
    this.ui.updateTitle();
  }

  confirmReset() {
    this.ui.show('screen-pause', false);
    this.ui.showMsg('¿Borrar la partida?', 'Se pierde todo: la plata, las mejoras y el pozo. No se puede deshacer.', [
      { label: 'Cancelar', cls: 'alt', onClick: () => this.ui.show('screen-pause', true) },
      {
        label: 'Borrar', cls: 'danger', onClick: async () => {
          await store.clear();
          this.savedData = null;
          this.freshGame();
          this.state = 'title';
          this.ui.setPlaying(false);
          this.ui.updateTitle();
        },
      },
    ]);
  }

  pause() {
    if (this.state !== 'play') return;
    this.state = 'paused';
    this.audio.jet(false);
    this.ui.show('screen-pause', true);
    this.save();
  }

  resume() {
    this.ui.show('screen-pause', false);
    this.state = 'play';
  }

  // ------------------------------------------------------------
  //  Eventos del juego
  // ------------------------------------------------------------
  toast(msg, key, kind = 'warn') {
    const now = this.time;
    if (key && this.toastTimes[key] && now - this.toastTimes[key] < 3) return;
    if (key) this.toastTimes[key] = now;
    this.ui.toast(msg, kind);
  }

  tip(key, msg) {
    if (this.tips[key]) return;
    this.tips[key] = true;
    this.ui.toast(msg, 'good');
  }

  addText(x, y, text, color) { this.texts.add(x, y, text, color); }

  shake(a) { this.shakeT = 0.25; this.shakeA = Math.max(this.shakeA, a); }

  collect(item, player) {
    const it = ITEMS[item];
    this.money += it.value;
    this.counters.earned += it.value;
    this.audio.play(it.sfx);
    this.addText(player.cx, player.y - 6, '+$' + it.value, it.value >= 300 ? '#8fe9ff' : it.value >= 35 ? '#9cf08a' : '#ffd34d');
    const cols = it.glow ? ['#ffffff', `rgb(${it.glow.join(',')})`] : ['#fff0a0', '#ffd34d'];
    for (let i = 0; i < 4; i++) this.particles.add({ x: player.cx, y: player.cy, vx: (Math.random() - 0.5) * 60, vy: -30 - Math.random() * 40, life: 0.5, max: 0.5, color: cols[i % 2], star: true, grav: 60 });
    if (it.value >= 300) this.toast(`¡${it.name}! +${fmtMoney(it.value)}`, null, 'good');
    this.tip('money', '¡Plata! Gastala en el Taller, la casa rodante a la derecha del patio');
  }

  buy(id) {
    const up = UPGRADES.find((u) => u.id === id);
    const lvl = this.upgrades[id];
    if (lvl >= up.levels.length - 1) return;
    const cost = up.levels[lvl + 1][1];
    if (this.money < cost) { this.audio.play('deny'); return; }
    this.money -= cost;
    this.upgrades[id] = lvl + 1;
    this.stats = computeStats(this.upgrades);
    if (id === 'bateria') for (const p of this.players) p.energy = this.stats.energyMax;
    this.audio.play('buy');
    const newTier = up.tiers && up.tiers[lvl + 1] !== up.tiers[lvl] ? up.tiers[lvl + 1] : null;
    this.ui.toast(newTier ? `¡Nuevo: ${newTier}!` : `¡${up.name} mejorada!`, 'good');
    this.ui.renderShop();
    this.save();
  }

  buySupply(id, n) {
    const it = SUPPLIES[id];
    const cost = it.price * n;
    if (this.money < cost) { this.audio.play('deny'); return; }
    this.money -= cost;
    this.inv[id] += n;
    this.audio.play('buy');
    this.ui.toast(`+${n} ${it.name.toLowerCase()}${n > 1 ? 's' : ''}`, 'good');
    this.ui.renderShop();
    this.save();
  }

  placeTorch(p) {
    const x = Math.round(p.cx + p.facing * 2), y = Math.round(p.y + 2);
    if (y < (SURFACE + 1) * TILE) { this.toast('Las antorchas se ponen bajo tierra', 'torchsky'); return; }
    if (this.inv.torch <= 0) { this.toast('No tenés antorchas: compralas en el Taller', 'notorch'); return; }
    if (this.torches.some((t) => Math.abs(t.x - x) < 6 && Math.abs(t.y - y) < 6)) return;
    this.inv.torch--;
    this.torches.push({ x, y, seed: Math.random() * 10 });
    this.audio.play('torch');
    for (let i = 0; i < 6; i++) this.particles.add({ x, y, vx: (Math.random() - 0.5) * 30, vy: -Math.random() * 30, life: 0.5, max: 0.5, color: '#ffd34d', size: 1, grav: 40 });
  }

  togglePopi() {
    if (this.popi) {
      this.popi.poof();
      this.popi = null;
      this.ui.toast('Popi te espera en el patio', 'good');
    } else {
      this.popi = new Popi(this);
      this.popi.poof();
      this.audio.play('bark');
      this.ui.toast('¡Popi se puso el casco y viene con vos!', 'good');
    }
    this.ui.renderShop();
    this.save();
  }

  openShop() {
    if (this.state !== 'play') return;
    this.state = 'shop';
    this.audio.jet(false);
    this.audio.play('ui');
    this.ui.renderShop();
    this.ui.show('screen-shop', true);
  }

  closeShop() {
    this.ui.show('screen-shop', false);
    if (this.state === 'shop') this.state = 'play';
  }

  openChest(ch, player) {
    if (this.state !== 'play' || ch.opened) return;
    ch.opened = true;
    this.state = 'cinematic';
    this.cine = { ch, t: 0, player };
    player.vx = 0;
    player.digging = false;
    this.audio.jet(false);
    this.audio.play('chest');
  }

  updateCinematic(dt) {
    const c = this.cine;
    c.t += dt;
    c.ch.open = Math.min(1, c.t / 0.5);
    const x = c.ch.c * TILE + 4, y = c.ch.r * TILE - 8;
    if (Math.random() < 0.6) {
      this.particles.add({ x: x + (Math.random() - 0.5) * 14, y, vx: (Math.random() - 0.5) * 30, vy: -40 - Math.random() * 50, life: 1, max: 1, color: Math.random() < 0.5 ? '#ffd34d' : '#ff9ccc', star: true, grav: 10 });
    }
    if (Math.random() < 0.15) this.particles.add({ x: x + (Math.random() - 0.5) * 20, y: y - 6, vx: 0, vy: -20, life: 1.2, max: 1.2, heart: true, grav: 0 });
    if (c.t > 2.2 && !c.shown) {
      c.shown = true;
      this.state = 'gift';
      this.openedGifts.push(c.ch.id);
      this.ui.showGift(c.ch.gift);
      this.save();
    }
  }

  closeGift() {
    this.ui.show('screen-gift', false);
    const ch = this.cine && this.cine.ch;
    this.state = 'play';
    this.cine = null;
    this.save();
    if (ch && ch.gift.final) {
      const mins = Math.floor(this.counters.playTime / 60);
      this.state = 'paused';
      this.ui.showMsg('¡Fin! ♥', `${ENDING_TEXT}\n\nTiempo: ${mins} min · Bloques cavados: ${Math.round(this.counters.tiles)}\nPlata juntada: ${fmtMoney(this.counters.earned)}`, [
        { label: 'Seguir jugando', onClick: () => { this.state = 'play'; } },
      ]);
    } else if (this.openedGifts.length < GIFTS.length) {
      const next = GIFTS.find((g) => !this.openedGifts.includes(g.id));
      if (next) this.toast(`El próximo regalo está a ${next.depth} m`, null, 'good');
    }
  }

  faint(player, reason) {
    if (this.state !== 'play') return;
    this.state = 'faint';
    player.dead = true;
    this.audio.jet(false);
    this.audio.play('faint');
    this.counters.deaths++;
    const lost = Math.floor(this.money * DEATH_MONEY_PENALTY);
    for (let i = 0; i < 14; i++) this.particles.add({ x: player.cx, y: player.cy, vx: (Math.random() - 0.5) * 60, vy: -Math.random() * 60, life: 0.8, max: 0.8, color: '#ffffff', star: true, grav: 40 });
    setTimeout(() => this.ui.fade(true), 400);
    setTimeout(() => {
      const title = reason === 'energy' ? '¡Sin energía!' : reason === 'lava' ? '¡Te quemaste!' : '¡Auch!';
      const text = (reason === 'energy'
        ? 'Te quedaste sin energía bajo tierra y te desmayaste.\nAlguien te rescató y te llevó a casa.'
        : reason === 'lava'
          ? 'Estuviste demasiado tiempo en la lava y te desmayaste.\nTe despertaste en casa.'
          : 'Te caíste demasiado fuerte y quedaste K.O.\nTe despertaste en casa.')
        + (lost > 0 ? `\n\nPerdiste ${fmtMoney(lost)} en el camino.` : '');
      this.ui.showMsg(title, text, [{
        label: 'Volver a cavar',
        onClick: () => {
          this.money -= lost;
          player.spawn();
          if (this.popi) this.popi.place();
          player.hp = HP_MAX;
          player.energy = this.stats.energyMax;
          this.cam.x = player.cx - this.vw / 2;
          this.cam.y = player.cy - this.vh / 2;
          this.ui.fade(false);
          this.state = 'play';
          this.save();
        },
      }]);
    }, 1300);
  }

  // ------------------------------------------------------------
  //  Loop
  // ------------------------------------------------------------
  resize() {
    const W = window.innerWidth, H = window.innerHeight;
    const scale = Math.max(1, Math.round(Math.min(W, H) / 215));
    this.scale = scale;
    this.vw = Math.ceil(W / scale);
    this.vh = Math.ceil(H / scale);
    // el canvas va a resolución de pantalla; el arte se dibuja escalado (pixeles grandes)
    // y la cámara se puede mover de a un pixel real: scroll suave sin perder el pixel art
    this.canvas.width = this.vw * scale;
    this.canvas.height = this.vh * scale;
    this.canvas.style.width = this.vw * scale + 'px';
    this.canvas.style.height = this.vh * scale + 'px';
    this.ctx.imageSmoothingEnabled = false;
    this.input.scale = scale;
    const portrait = H > W && this.ui && this.ui.isTouch;
    document.getElementById('rotate-hint').classList.toggle('hidden', !portrait);
  }

  frame(ts) {
    const dt = Math.min(0.1, (ts - this.lastTs) / 1000);
    this.lastTs = ts;
    // la física avanza exactamente lo que duró el cuadro, en pasos chicos (máx. 1/120 s)
    // así cada cuadro dibujado muestra movimiento parejo, sea la pantalla de 60, 120 o 144 Hz
    if (dt > 0) {
      const n = Math.max(1, Math.ceil(dt / STEP));
      const h = dt / n;
      for (let i = 0; i < n; i++) this.update(h);
    }
    this.render();
    requestAnimationFrame((t) => this.frame(t));
  }

  update(dt) {
    this.time += dt;
    const inp = this.input.read(this.cam.x, this.cam.y);
    const p = this.players[0];

    if (this.state === 'play') {
      if (inp.pause) this.pause();
      if (inp.torchPressed) this.placeTorch(p);
      if (inp.musicPressed) this.ui.toggleMusic();
      if (inp.sfxPressed) this.ui.toggleSfx();
      if (inp.autoPressed) this.ui.toggleAuto();
      this.counters.playTime += dt;
      this.world.updateLava(dt, this.cam.x, this.cam.y, this.vw, this.vh);
      for (const [x, y] of this.world.steam.splice(0)) {
        this.particles.add({ x, y, vx: (Math.random() - 0.5) * 14, vy: -14 - Math.random() * 16, life: 0.9, max: 0.9, color: 'rgba(120,100,100,0.55)', size: 2, grav: -20, smoke: true });
        if (Math.random() < 0.3) this.particles.add({ x, y, vx: (Math.random() - 0.5) * 30, vy: -30, life: 0.4, max: 0.4, color: '#ffd34d', size: 1, grav: 60 });
      }
      for (const pl of this.players) pl.update(dt, inp);
      if (this.popi) this.popi.update(dt);
      // Popi espera en el patio: al acercarte te ladra y te lo podés llevar
      const nearDog = !this.popi && Math.abs(p.cx - (DOG_POS.x + 10)) < 22 && Math.abs(p.y + p.h - (DOG_POS.y + 14)) < 12;
      if (nearDog && !this.wasNearDog) {
        this.audio.play('bark');
        this.addText(DOG_POS.x + 10, DOG_POS.y - 2, '¡GUAU!', '#fff4e0');
      }
      this.wasNearDog = nearDog;
      const enteredShop = p.inShop && !nearDog && !this.wasInShop;
      this.wasInShop = p.inShop && !nearDog;
      if (nearDog) {
        this.ui.setPrompt(this.ui.isTouch ? null : 'Presioná E para llevar a Popi');
        this.ui.setActButton('POPI');
        if (inp.interact) this.togglePopi();
        this.tip('popi', '¡Es Popi! Te puede acompañar y ayudar a cavar');
      } else if (p.inShop) {
        // Carlos saluda desde la ventanita
        if (enteredShop) this.addText(TRAILER_X + 31, SURFACE * TILE - TRAILER_H + 20, '¡HOLA!', '#fff4e0');
        this.ui.setPrompt(this.ui.isTouch ? null : 'Presioná E para comprar en la ventanita');
        this.ui.setActButton('TALLER');
        if (inp.interact) this.openShop();
        this.tip('shop', 'Este es el Taller rodante: por la ventanita se compran las mejoras');
      } else {
        // modo vuelo del jetpack (últimos niveles): E lo prende y lo apaga
        this.ui.setActButton(this.stats.hover ? (p.hovering ? 'ATERRIZAR' : 'VOLAR') : null);
        if (inp.interact && this.stats.hover) p.toggleHover();
        if (p.resting && (p.energy < this.stats.energyMax - 0.5 || p.hp < HP_MAX - 0.5)) this.ui.setPrompt('Descansando... ♥');
        else this.ui.setPrompt(null);
      }
      this.counters.best = Math.max(this.counters.best, p.depth);
      this.audio.setDepth(p.depth);
      this.pickups.update(dt);
      this.updateTips(p);
      this.saveTimer += dt;
      if (this.saveTimer > 12) { this.saveTimer = 0; this.save(); }
    } else if (this.state === 'title' || this.state === 'splash') {
      this.audio.setDepth(0);
      if (inp.pause) this.ui.closeSub();
    } else if (this.state === 'intro') {
      this.audio.setDepth(0);
      this.intro.update(dt);
    } else if (this.state === 'descend') {
      const d = this.descend;
      d.t += dt;
      if (d.t >= d.dur) { this.descend = null; this.state = 'title-done'; this.startPlaying(); }
    } else if (this.state === 'shop') {
      this.input.releaseLatch();
      if (inp.pause || inp.interact) this.closeShop();
    } else if (this.state === 'paused') {
      if (inp.pause && !this.ui.closeSub() && !document.getElementById('screen-pause').classList.contains('hidden')) this.resume();
    } else if (this.state === 'cinematic') {
      this.updateCinematic(dt);
    }

    if (this.state !== 'play') this.input.releaseLatch();

    // destellos de cofres cercanos
    for (const ch of this.world.chests) {
      if (ch.opened) continue;
      if (Math.random() < 0.08) {
        this.particles.add({ x: ch.c * TILE + 4 + (Math.random() - 0.5) * 18, y: ch.r * TILE - 6 + (Math.random() - 0.5) * 10, vx: 0, vy: -8, life: 0.7, max: 0.7, color: Math.random() < 0.5 ? '#ffd34d' : '#ff9ccc', star: true, grav: 0 });
      }
    }

    // fuentes de luz extra para la iluminación
    this.lights = [];
    const cx0 = this.cam.x / TILE - 12, cx1 = (this.cam.x + this.vw) / TILE + 12;
    const cy0 = this.cam.y / TILE - 12, cy1 = (this.cam.y + this.vh) / TILE + 12;
    if (this.popi) this.lights.push([this.popi.cx / TILE, this.popi.cy / TILE, 3.5, 0.85]);
    for (const tq of this.torches) {
      const tx = tq.x / TILE, ty = tq.y / TILE;
      if (tx < cx0 || tx > cx1 || ty < cy0 || ty > cy1) continue;
      this.lights.push([tx, ty, TORCH.radius, 0.95 + Math.sin(this.time * 9 + tq.seed) * 0.04]);
    }
    // chispas de magma subiendo en el núcleo
    if (this.cam.y + this.vh > CORE_ROW * TILE && Math.random() < dt * 14) {
      this.particles.add({ x: this.cam.x + Math.random() * this.vw, y: Math.min((BOTTOM_ROW - 3) * TILE, this.cam.y + this.vh + 4), vx: (Math.random() - 0.5) * 12, vy: -18 - Math.random() * 30, life: 3 + Math.random() * 3, max: 6, color: Math.random() < 0.6 ? '#ffb347' : '#ff6a1a', size: 1, grav: -2 });
    }
    // polvillo flotando en la luz de la linterna bajo tierra
    if (this.state === 'play' && p && p.depth > 8 && Math.random() < dt * 6) {
      const a = Math.random() * Math.PI * 2, d = 10 + Math.random() * 60;
      this.particles.add({ x: p.cx + Math.cos(a) * d, y: p.cy + Math.sin(a) * d * 0.7, vx: (Math.random() - 0.5) * 5, vy: (Math.random() - 0.5) * 4, life: 2.5 + Math.random() * 2, max: 4, color: 'rgba(255,238,205,0.55)', size: 1, grav: 1 });
    }
    this.particles.update(dt, this.world);
    this.texts.update(dt);
    this.updateCamera(dt);
    if (this.shakeT > 0) { this.shakeT -= dt; if (this.shakeT <= 0) this.shakeA = 0; }
    this.input.endFrame();
  }

  updateTips(p) {
    if (p.x > 27 * TILE && p.depth < 2) {
      this.tip('dig', this.ui.isTouch ? 'Cavá en el cantero del medio del patio: joystick abajo o CAVAR' : 'Cavá en el cantero del medio del patio: click hacia donde quieras (o J + dirección)');
    }
    if (p.depth > 14) this.tip('jet', this.ui.isTouch ? 'Para subir: mantené SALTAR y volás con el jetpack' : 'Para subir: mantené Espacio y volás con el jetpack');
    if (p.energy < this.stats.energyMax * 0.3 && p.depth > 4) this.tip('energy', 'Energía baja: volvé al departamento a descansar');
    if (this.money >= 60 && this.upgrades.pala === 0) this.tip('afford', '¡Ya te alcanza para mejorar la pala en el Taller!');
    if (p.depth > 30) this.tip('torch', this.ui.isTouch ? 'Tip: en el Taller venden antorchas para iluminar' : 'Tip: en el Taller venden antorchas (se ponen con T)');
    if (p.depth > 990) this.tip('lava', 'Cuidado con la lava: quema, y si cavás por debajo se derrama');
    if (this.stats.hover && p.depth > 4) this.tip('hover', this.ui.isTouch ? 'Tu jetpack tiene modo vuelo: tocá VOLAR para prenderlo o apagarlo' : 'Tu jetpack tiene modo vuelo: tocá E para prenderlo o apagarlo');
    if (p.depth > 40) this.tip('fall', this.ui.isTouch ? 'Ojo con las caídas: para bajar despacio mantené SALTAR + joystick abajo' : 'Ojo con las caídas: mantené S para bajar despacio con el jetpack');
  }

  /** destellos de los minerales de las capas profundas (se ven aunque esté oscuro) */
  drawGlints(ctx, camX, camY, vw, vh, t) {
    const W = this.world;
    const c0 = Math.max(0, Math.floor(camX / TILE)), c1 = Math.min(W.w - 1, Math.ceil((camX + vw) / TILE));
    const r0 = Math.max(SURFACE, Math.floor(camY / TILE)), r1 = Math.min(W.h - 1, Math.ceil((camY + vh) / TILE));
    if (r0 > r1) return;
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        const i = r * W.w + c;
        const tt = W.tiles[i];
        const li = W.loot[i];
        const gem = li && ITEMS[li].glow;
        const g = GLINT[tt];
        if (!g && !gem) continue;
        const h = hash2(c, r, 99);
        if (!gem && h > g.p) continue;
        // destello corto cada tanto, con fase propia por bloque
        const s = Math.max(0, Math.sin(t * (gem ? 2.2 : 1.3) + h * 40)) ** (gem ? 6 : 14);
        if (s < 0.08) continue;
        const px = c * TILE + 1 + Math.floor(hash2(c, r, 7) * 6), py = r * TILE + 1 + Math.floor(hash2(c, r, 8) * 6);
        if (!W.solidPx(px, py)) continue;
        const col = gem ? `rgb(${ITEMS[li].glow.join(',')})` : g.col;
        const x = px - camX, y = py - camY;
        ctx.globalAlpha = Math.min(1, s * 1.2);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x, y, 1, 1);
        ctx.fillStyle = col;
        if (s > 0.45) { ctx.fillRect(x - 1, y, 1, 1); ctx.fillRect(x + 1, y, 1, 1); ctx.fillRect(x, y - 1, 1, 1); ctx.fillRect(x, y + 1, 1, 1); }
        if (s > 0.85) { ctx.globalAlpha = 0.5; ctx.fillRect(x - 2, y, 1, 1); ctx.fillRect(x + 2, y, 1, 1); ctx.fillRect(x, y - 2, 1, 1); ctx.fillRect(x, y + 2, 1, 1); }
      }
    }
    ctx.globalAlpha = 1;
  }

  updateCamera(dt) {
    const vw = this.vw, vh = this.vh;
    let tx, ty;
    const sky = ['splash', 'title', 'intro', 'descend'].includes(this.state);
    if (this.state === 'intro' && this.intro) {
      this.intro.updateCam(dt);
      tx = this.cam.x; ty = this.cam.y;
    } else if (this.state === 'descend') {
      const d = this.descend, u = clamp(d.t / d.dur, 0, 1);
      const e = u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2;
      tx = this.cam.x = d.x0 + (d.x1 - d.x0) * e;
      ty = this.cam.y = d.y0 + (d.y1 - d.y0) * e;
    } else if (this.state === 'title' || this.state === 'splash') {
      const tc = this.titleCam();
      tx = tc.x + Math.sin(this.time * 0.12) * 60;
      ty = tc.y;
    } else {
      const p = this.players[0];
      tx = p.cx - vw / 2;
      ty = p.cy - vh / 2;
    }
    const k = Math.min(1, dt * (sky ? 1.5 : 9));
    this.cam.x += (tx - this.cam.x) * k;
    this.cam.y += (ty - this.cam.y) * k;
    const z = this.zoom || 1;
    const maxX = WORLD_W * TILE - vw / z;
    this.cam.x = maxX < 0 ? maxX / 2 : clamp(this.cam.x, 0, maxX);
    // en el título la cámara puede subir más allá del borde del mundo: arriba solo hay cielo
    this.cam.y = clamp(this.cam.y, sky ? -2000 : 0, WORLD_H * TILE - vh / z);
  }

  render() {
    // zoom de cámara (solo lo usa la intro): achica la vista y agranda los pixeles
    const z = this.zoom || 1;
    const ctx = this.ctx, vw = this.vw / z, vh = this.vh / z;
    let sx = 0, sy = 0;
    if (this.shakeT > 0) { sx = (Math.random() - 0.5) * this.shakeA * 2; sy = (Math.random() - 0.5) * this.shakeA * 2; }
    const S = this.scale * z;
    ctx.setTransform(S, 0, 0, S, 0, 0);
    ctx.imageSmoothingEnabled = false;
    const camX = Math.round((this.cam.x + sx) * S) / S, camY = Math.round((this.cam.y + sy) * S) / S;
    const t = this.time;

    this.bg.draw(ctx, camX, camY, vw, vh, t);
    this.coreBg.draw(ctx, camX, camY, vw, vh, t);
    this.structs.drawBackdrop(ctx, camX, camY, t);
    this.structs.drawBuildings(ctx, camX, camY, t);
    this.world.draw(ctx, camX, camY, vw, vh);
    this.structs.drawFloor(ctx, camX, camY);
    this.world.drawLava(ctx, camX, camY, vw, vh, t);

    // círculo de cavado: puntitos que se van cerrando a medida que avanza el palazo
    for (const p of this.players) {
      if (!p.digging || !p.digPoint) continue;
      const { cx, cy, R } = p.digPoint;
      const n = 22;
      const shown = p.tooHard ? n : Math.ceil(n * Math.min(1, p.digProg + 0.08));
      ctx.fillStyle = p.tooHard ? 'rgba(255,90,110,0.75)' : 'rgba(255,244,224,0.55)';
      for (let i = 0; i < shown; i++) {
        const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
        ctx.fillRect(Math.round(cx + Math.cos(a) * R - camX), Math.round(cy + Math.sin(a) * R - camY), 1, 1);
      }
    }
    // mira del mouse
    if (this.state === 'play' && !this.ui.isTouch && this.input.mouseSeen) {
      const mx = Math.round(this.input.mouse.x), my = Math.round(this.input.mouse.y);
      ctx.fillStyle = 'rgba(29,20,32,0.7)';
      ctx.fillRect(mx - 3, my, 2, 1); ctx.fillRect(mx + 2, my, 2, 1); ctx.fillRect(mx, my - 3, 1, 2); ctx.fillRect(mx, my + 2, 1, 2);
      ctx.fillStyle = this.input.mouse.latched ? '#ff7eb6' : '#fff4e0';
      ctx.fillRect(mx - 3, my - 1, 2, 1); ctx.fillRect(mx + 2, my - 1, 2, 1); ctx.fillRect(mx - 1, my - 3, 1, 2); ctx.fillRect(mx - 1, my + 2, 1, 2);
    }

    // cofres
    for (const ch of this.world.chests) {
      const x = ch.c * TILE - 3 - camX, y = ch.r * TILE - 11 - camY;
      if (x < -30 || x > vw + 30 || y < -40 || y > vh + 30) continue;
      if (!ch.opened) {
        ctx.fillStyle = 'rgba(255,200,230,0.18)';
        const r = 10 + Math.sin(t * 3) * 2;
        ctx.beginPath(); ctx.arc(x + 7.5, y + 5, r, 0, Math.PI * 2); ctx.fill();
      }
      drawChest(ctx, x, y, ch.open);
      if (this.cine && this.cine.ch === ch) {
        const rise = Math.min(1, Math.max(0, (this.cine.t - 0.4) / 1.2));
        drawGiftBox(ctx, x + 2, Math.round(y - 4 - rise * 18 + Math.sin(t * 5) * rise));
      }
    }

    // perro salchicha del taller: mueve la cola más rápido si estás cerca
    const p0 = this.players[0];
    const near = this.state === 'play' && p0 && this.wasNearDog;
    const blink = (t % 4.3) > 4.15;
    const wag = Math.floor(t / (near ? 0.11 : 0.55)) % 2;
    const dogSpr = blink ? DOG.blink : near ? (wag ? DOG.happyB : DOG.happyA) : (wag ? DOG.b : DOG.a);
    if (!this.popi) ctx.drawImage(dogSpr, DOG_POS.x - camX, DOG_POS.y - camY);
    if (!this.popi && near && Math.random() < 0.02) {
      this.particles.add({ x: DOG_POS.x + 5, y: DOG_POS.y - 2, vx: 0, vy: -12, life: 1, max: 1, heart: true, grav: 0 });
    }

    for (const tq of this.torches) {
      const x = tq.x - camX, y = tq.y - camY;
      if (x < -10 || x > vw + 10 || y < -14 || y > vh + 14) continue;
      drawTorch(ctx, x, y, t, tq.seed);
    }
    this.pickups.draw(ctx, camX, camY, t);
    const inGame = !['splash', 'title', 'intro'].includes(this.state);
    if (this.intro) this.intro.draw(ctx, camX, camY);
    if (this.popi && inGame) this.popi.draw(ctx, camX, camY);
    if (inGame) for (const p of this.players) p.draw(ctx, camX, camY);
    this.particles.draw(ctx, camX, camY);
    this.lighting.draw(ctx, this, camX, camY, vw, vh, t);
    this.drawGlints(ctx, camX, camY, vw, vh, t);
    this.texts.draw(ctx, camX, camY);

    if (inGame) this.ui.updateHUD();
  }
}

function start(data) {
  window.game = new Game(data || {});
  const hot = window.claude && window.claude.hot;
  if (hot && hot.snapshot) {
    hot.snapshot(() => {
      const g = window.game;
      g.save();
      return { resume: ['play', 'shop', 'paused', 'gift', 'cinematic', 'faint'].includes(g.state) };
    });
  }
}
const hot = window.claude && window.claude.hot;
if (hot && hot.ready) hot.ready(start);
else start((hot && hot.data) || {});
export { PATIO };
