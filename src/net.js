// Juego online de a dos, con código de sala (WebRTC con PeerJS: sin servidor propio).
//
// El que crea la sala es el ANFITRIÓN: su partida es la que se juega y se guarda, y él maneja
// todo lo compartido (plata, mejoras, minerales que caen, lava, Popi, cofres, Aguilus y las escenas).
// El que se une es el INVITADO: maneja a su personaje en su pantalla y le avisa al anfitrión
// lo que hace (dónde está, qué cava, qué compra). Cada uno ve al otro moverse en tiempo real.
//
// Funciona entre cualquier dispositivo (compu, celu, tablet) mientras los dos tengan internet.
import { CHARACTERS, BOSS, ENDING_TEXT, HP_MAX } from './config.js';
import { Player } from './player.js';
import { Popi } from './popi.js';
import { Scene, SPEAKERS } from './scene.js';
import { fmtMoney } from './util.js';

const PEER_SRC = 'https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js';
const PREFIX = 'cumple-panchita-sala-';
const ALPHA = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // sin letras que se confunden (I, L, O, 0, 1)
const SNAP = 1 / 15;      // el anfitrión manda cómo está todo, 15 veces por segundo
const SELF = 1 / 20;      // el invitado manda dónde está su personaje, 20 veces por segundo
const TIMEOUT = 12;       // segundos sin noticias del otro = se cortó

function loadPeer() {
  if (window.Peer) return Promise.resolve(window.Peer);
  return new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = PEER_SRC;
    s.onload = () => (window.Peer ? res(window.Peer) : rej(new Error('peer')));
    s.onerror = () => rej(new Error('No se pudo cargar la conexión online (¿hay internet?)'));
    document.head.appendChild(s);
  });
}

const r1 = (v) => Math.round(v * 10) / 10;

export class Net {
  constructor(game) {
    this.g = game;
    this.role = null;       // 'host' | 'guest' | null
    this.peer = null;
    this.conn = null;
    this.code = null;
    this.linked = false;    // conectados y con la partida compartida
    this.remote = null;     // el personaje del otro (un Player que se mueve con lo que llega por la red)
    this.sendT = 0; this.lavaT = 0; this.sceneT = 0;
    this.lastLava = ''; this.lastRecv = 0; this.now = 0;
    this.applying = false;  // aplicando un cavado que vino de la red (no hay que reenviarlo)
    this.sceneOn = false;
    this.torchVer = 0; this.sentTorchVer = -1;
    this.onStatus = null;   // la UI escucha los cambios de estado
  }

  get isHost() { return this.linked && this.role === 'host'; }
  get isGuest() { return this.linked && this.role === 'guest'; }

  status(msg, kind = 'info') {
    this.statusMsg = msg;
    if (this.onStatus) this.onStatus(msg, kind);
  }

  // ------------------------------------------------------------
  //  Conexión
  // ------------------------------------------------------------
  async host() {
    if (this.peer) return;
    this.role = 'host';
    this.status('Creando la sala...');
    let Peer;
    try { Peer = await loadPeer(); } catch (e) { this.fail(e.message); return; }
    const tryOpen = (tries) => {
      this.code = Array.from({ length: 4 }, () => ALPHA[Math.floor(Math.random() * ALPHA.length)]).join('');
      const peer = new Peer(PREFIX + this.code);
      this.peer = peer;
      peer.on('open', () => this.status(`Sala ${this.code}: pasale el código a quien se quiera unir`, 'wait'));
      peer.on('error', (err) => {
        if (err.type === 'unavailable-id' && tries > 0) { peer.destroy(); tryOpen(tries - 1); return; }
        if (!this.linked) this.fail('No se pudo crear la sala: ' + (err.type || err.message));
      });
      peer.on('connection', (conn) => {
        if (this.conn && this.conn.open) { conn.on('open', () => { conn.send({ t: 'full' }); setTimeout(() => conn.close(), 300); }); return; }
        this.attach(conn);
      });
      peer.on('disconnected', () => { if (!this.linked && this.peer) this.peer.reconnect(); });
    };
    tryOpen(4);
  }

  async join(code) {
    if (this.peer) return;
    code = (code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (code.length !== 4) { this.status('El código tiene 4 letras o números', 'error'); return; }
    this.role = 'guest';
    this.code = code;
    this.status('Conectando a la sala ' + code + '...');
    let Peer;
    try { Peer = await loadPeer(); } catch (e) { this.fail(e.message); return; }
    const peer = new Peer();
    this.peer = peer;
    peer.on('open', () => {
      const conn = peer.connect(PREFIX + code, { reliable: true });
      this.attach(conn);
      setTimeout(() => { if (!this.linked && this.role === 'guest') this.fail('No se encontró la sala ' + code + '. ¿Está bien el código?'); }, 12000);
    });
    peer.on('error', (err) => {
      if (this.linked) return;
      this.fail(err.type === 'peer-unavailable' ? 'No existe la sala ' + code + '. ¿Está bien el código?' : 'No se pudo conectar: ' + (err.type || err.message));
    });
  }

  attach(conn) {
    this.conn = conn;
    conn.on('open', () => {
      this.lastRecv = this.now;
      if (this.role === 'guest') conn.send({ t: 'hello', char: this.g.charId });
    });
    conn.on('data', (m) => { this.lastRecv = this.now; try { this.onData(m); } catch (e) { console.error(e); } });
    conn.on('close', () => this.lost());
    conn.on('error', () => this.lost());
  }

  fail(msg) {
    this.close();
    this.status(msg, 'error');
  }

  /** se cortó la conexión con el otro */
  lost() {
    if (!this.conn) return;
    const g = this.g, was = this.linked, role = this.role;
    const other = this.remote ? CHARACTERS[this.remote.char].name : 'tu compañero';
    this.conn = null;
    this.linked = false;
    if (role === 'host') {
      if (g.popi && g.popi.owner === this.remote) g.popi = null; // Popi vuelve al patio
      this.remote = null;
      if (was) {
        g.syncBuddy();
        g.toast(`${other} se desconectó. La sala ${this.code} sigue abierta`, null, 'warn');
        this.status(`Sala ${this.code}: ${other} se desconectó. Puede volver a entrar con el mismo código`, 'wait');
      }
      return;
    }
    // invitado: la partida era la del anfitrión, así que se vuelve al inicio
    this.close();
    if (was) {
      g.state = 'paused';
      g.ui.showMsg('Se cortó la conexión', `Se perdió la conexión con ${other}.\nLa partida se guarda en el dispositivo de quien creó la sala.`, [
        { label: 'Volver al inicio', onClick: () => location.reload() },
      ]);
    } else this.status('Se cortó la conexión', 'error');
  }

  /** salir de la sala (o cerrarla) */
  leave() {
    const role = this.role, wasLinked = this.linked;
    if (this.conn) { try { this.conn.send({ t: 'bye' }); } catch { /* nada */ } }
    setTimeout(() => this.close(), 150);
    if (role === 'host') {
      if (this.g.popi && this.g.popi.owner === this.remote) this.g.popi = null;
      this.remote = null;
      this.linked = false;
      this.g.syncBuddy();
      this.status('Sala cerrada');
    } else if (role === 'guest' && wasLinked) setTimeout(() => location.reload(), 200);
  }

  close() {
    this.linked = false;
    if (this.conn) { try { this.conn.close(); } catch { /* nada */ } }
    if (this.peer) { try { this.peer.destroy(); } catch { /* nada */ } }
    this.conn = null; this.peer = null; this.role = null; this.code = null;
    if (this.g.ui) this.g.ui.setNetBadge(null);
  }

  send(t, data = {}) {
    if (!this.conn || !this.conn.open) return;
    try { this.conn.send({ ...data, t }); } catch { /* nada */ } // `t` es siempre el tipo de mensaje
  }

  // ------------------------------------------------------------
  //  Estado del personaje (va y viene)
  // ------------------------------------------------------------
  playerState(p) {
    return {
      x: r1(p.x), y: r1(p.y), vx: r1(p.vx), vy: r1(p.vy), f: p.facing,
      g: p.onGround ? 1 : 0, fl: p.flying ? 1 : 0, d: p.digging ? 1 : 0, th: p.tooHard ? 1 : 0, dead: p.dead ? 1 : 0,
      h: p.hurtT > 0 ? 1 : 0, hv: p.hovering ? 1 : 0, hp: Math.round(p.hp),
      a: p.aim ? [r1(p.aim.x), r1(p.aim.y)] : null,
      dp: p.digPoint ? [r1(p.digPoint.cx), r1(p.digPoint.cy), p.digPoint.R] : null, pr: r1(p.digProg || 0),
    };
  }

  applyPlayer(p, s) {
    const far = Math.hypot(s.x - p.x, s.y - p.y) > 48;
    p.tx = s.x; p.ty = s.y;
    if (far || p.tx === undefined) { p.x = s.x; p.y = s.y; }
    p.vx = s.vx; p.vy = s.vy; p.facing = s.f;
    p.onGround = !!s.g; p.flying = !!s.fl; p.digging = !!s.d; p.tooHard = !!s.th; p.dead = !!s.dead; p.hovering = !!s.hv;
    if (s.h && !p.netHurt) p.hurtT = 0.8;
    p.netHurt = !!s.h;
    p.hp = s.hp;
    p.aim = s.a ? { x: s.a[0], y: s.a[1] } : null;
    if (p.aim) p.lastAim = p.aim;
    p.digPoint = s.dp ? { cx: s.dp[0], cy: s.dp[1], R: s.dp[2] } : null;
    p.digProg = s.pr;
  }

  /** el personaje del otro se desliza suave hasta la última posición que llegó */
  stepPuppet(p, dt) {
    p.anim += dt;
    if (p.hurtT > 0) p.hurtT -= dt;
    if (p.guardT > 0) p.guardT -= dt;
    if (p.tx !== undefined) {
      const k = Math.min(1, dt * 16);
      p.x += (p.tx - p.x) * k;
      p.y += (p.ty - p.y) * k;
    }
    if (p.onGround && Math.abs(p.vx) > 5) p.walkT += dt * Math.max(1, Math.abs(p.vx) / 74); else p.walkT = 0;
    if (p.digging) p.digAnim += dt * 3;
    if (p.flying) p.jetFlame(dt);
  }

  // ------------------------------------------------------------
  //  Cada cuadro
  // ------------------------------------------------------------
  update(dt) {
    this.now += dt;
    if (!this.conn) return;
    if (this.linked && this.now - this.lastRecv > TIMEOUT) { this.lost(); return; }
    if (!this.linked) return;
    const g = this.g;
    this.sendT -= dt;
    if (this.role === 'host') {
      if (this.sendT <= 0) { this.sendT = SNAP; this.send('s', this.snapshot()); }
      // escenas (charla con Aguilus, final): el invitado las ve igual
      const inScene = g.state === 'scene' && g.scene && !g.scene.done;
      if (inScene) {
        this.sceneT -= dt;
        if (this.sceneT <= 0) { this.sceneT = SNAP; this.send('sc', this.sceneFrame(g.scene)); }
      } else if (this.sceneOn) this.send('scEnd');
      this.sceneOn = inScene;
      // la lava: una vez por segundo, si cambió
      this.lavaT -= dt;
      if (this.lavaT <= 0) {
        this.lavaT = 1;
        const L = g.world.exportLava();
        if (L !== this.lastLava) { this.lastLava = L; this.send('lava', { l: L }); }
      }
    } else if (this.sendT <= 0) {
      this.sendT = SELF;
      this.send('u', { p: this.playerState(g.players[0]) });
    }
  }

  /** todo lo que el invitado necesita ver (lo arma el anfitrión) */
  snapshot() {
    const g = this.g, B = g.boss;
    const s = {
      p: this.playerState(g.players[0]),
      m: Math.floor(g.money), up: g.upgrades, inv: g.inv.torch, gf: g.openedGifts,
      pk: g.pickups.list.map((k) => [Math.round(k.x), Math.round(k.y), k.item]),
      po: g.popi ? [r1(g.popi.x), r1(g.popi.y), g.popi.facing, g.popi.onGround ? 1 : 0, g.popi.digging ? 1 : 0, g.popi.flying ? 1 : 0, g.popi.owner === g.players[0] ? 'h' : 'g'] : null,
      ch: g.chatter.netState(g.players[0]),
      b: B ? this.bossState(B) : null,
    };
    if (this.sentTorchVer !== this.torchVer) {
      this.sentTorchVer = this.torchVer;
      s.to = g.torches.map((t) => [t.x, t.y, r1(t.seed)]);
    }
    return s;
  }

  bossState(B) {
    const me = this.g.players[0];
    const b = { s: B.state, x: r1(B.x), y: r1(B.y), f: B.facing };
    if (B.state !== 'fight') return b;
    const a = B.attack;
    Object.assign(b, {
      fl: r1(B.flash), p2: B.phase2 ? 1 : 0, hp: B.hp,
      a: a ? { type: a.type, stage: a.stage, t: r1(a.t), wind: a.wind, tx: a.tx } : null,
      r: B.rocks.map((r) => [r1(r.x), r1(r.y), r.k, r1(r.t), r.spin, r.rad, r.state, r.state === 'held' ? (r.by === me ? 'h' : 'g') : null]),
      fe: B.feathers.map((f) => [r1(f.x), r1(f.y), r1(f.a)]),
      pi: B.pillars.map((c) => [r1(c.x), r1(c.t)]),
      w: B.waves.map((w) => [r1(w.x), w.dir]),
      mk: B.marks.map((m) => [r1(m.x), r1(m.t)]),
    });
    return b;
  }

  sceneFrame(sc) {
    const g = this.g, L = sc.line;
    return {
      st: r1(sc.t),
      a: Object.values(sc.actors).map((a) => ({
        id: a.id, x: r1(a.x), y: r1(a.y), f: a.facing, po: a.pose, fl: a.flying ? 1 : 0, hi: a.hidden ? 1 : 0,
        e: a.emote, et: r1(a.emoteT), ph: r1(a.phase), wt: r1(a.walkT), mv: a.target !== null || a.ty !== null ? 1 : 0, fa: a.fallTo !== null ? 1 : 0,
      })),
      fe: sc.feathers.map((f) => ({ x: r1(f.x), y: r1(f.y), t: r1(f.t), landed: f.landed })),
      l: L ? { w: L.who, x: L.text, s: Math.floor(L.shown) } : null,
      c: g.ui.captionText || null, fd: g.ui.fadeState || null,
      // el centro de la cámara (cada pantalla tiene su tamaño)
      cam: [r1(g.cam.x + g.vw / g.zoom / 2), r1(g.cam.y + g.vh / g.zoom / 2), g.zoom],
    };
  }

  // ------------------------------------------------------------
  //  Mensajes
  // ------------------------------------------------------------
  onData(m) {
    const g = this.g;
    switch (m.t) {
      // ---- los recibe el anfitrión ----
      case 'hello': return this.welcome(m);
      case 'u': if (this.remote) this.applyPlayer(this.remote, m.p); return;
      case 'buy': { const r = g.doBuy(m.id); this.send('res', r); return; }
      case 'supply': { const r = g.doBuySupply(m.id, m.n); this.send('res', r); return; }
      case 'torch': g.addTorch(m.x, m.y, true); return;
      case 'popi': if (this.remote) g.setPopi(this.remote); return;
      case 'chest': { const ch = g.world.chests.find((c) => c.id === m.id); if (ch && this.remote) g.openChest(ch, this.remote); return; }
      case 'throw': if (g.boss && this.remote) g.boss.throwRock(this.remote, m.aim || null); return;
      case 'down': if (g.boss && g.boss.fighting) g.boss.playerDown(); return;
      case 'adv': if (g.state === 'scene' && g.scene) g.scene.advance(); return;
      case 'skip': if (g.state === 'scene' && g.scene) g.scene.skip(); return;

      // ---- los recibe el invitado ----
      case 'welcome': return this.enterGuest(m);
      case 'full': this.fail('Esa sala ya tiene dos jugadores'); return;
      case 's': return this.applySnapshot(m);
      case 'lava': g.world.importLava(m.l); return;
      case 'sc': return this.applySceneFrame(m);
      case 'scEnd': return this.endRemoteScene();
      case 'res': if (m.msg) g.ui.toast(m.msg, m.ok ? 'good' : 'warn'); g.audio.play(m.ok ? 'buy' : 'deny'); return;
      case 'chestOpen': { const ch = g.world.chests.find((c) => c.id === m.id); if (ch && !ch.opened) g.openChest(ch, g.players[0], true); return; }
      case 'tp': return this.teleport(m);
      case 'hurt': { const p = g.players[0]; if (!p.dead && p.hurtT <= 0) { if (m.kx) { p.vx = m.kx; p.vy = Math.min(p.vy, -110); } p.hurt(m.dmg, 'boss'); } return; }
      case 'teamDown': return this.teamDown();
      case 'ending': return this.ending(m);

      // ---- los dos ----
      case 'dig': return this.applyDig(m);
      case 'tx': g.texts.add(m.x, m.y, m.s, m.c); return;
      case 'sfx': g.audio.play(m.n); return;
      case 'sh': g.shake(m.a); return;
      case 'toast': g.ui.toast(m.m, m.k || 'good'); return;
      case 'bye': this.lost(); return;
      default:
    }
  }

  // ---- anfitrión ----
  welcome(m) {
    const g = this.g;
    if (!['play', 'paused', 'shop', 'gift', 'cinematic', 'faint', 'scene', 'descend'].includes(g.state)) { this.send('full'); return; }
    const me = g.players[0];
    const guestChar = me.char === 'pablo' ? 'pancha' : 'pablo';
    const r = new Player(g, guestChar);
    r.remote = true;
    r.x = me.x - me.facing * 12; r.y = me.y; r.peakY = r.y;
    if (r.collides(r.x, r.y)) r.x = me.x;
    this.remote = r;
    this.linked = true;
    this.torchVer++;
    g.syncBuddy();
    this.send('welcome', {
      seed: g.seed, dug: g.world.exportDug(), lava: g.world.exportLava(),
      money: Math.floor(g.money), up: g.upgrades, inv: g.inv.torch, gifts: g.openedGifts,
      torches: g.torches.map((t) => [t.x, t.y, t.seed]), bossDone: !!(g.boss && g.boss.state === 'done'),
      hostChar: me.char, guestChar, at: [r.x, r.y], code: this.code,
    });
    this.lastLava = '';
    const name = CHARACTERS[guestChar].name;
    g.toast(`¡${name} se unió a la sala!`, null, 'good');
    g.audio.play('surprise');
    this.status(`Sala ${this.code}: jugando con ${name}`, 'ok');
    g.ui.setNetBadge(`Sala ${this.code} · con ${name}`);
  }

  // ---- invitado ----
  enterGuest(w) {
    const g = this.g;
    this.linked = true;
    g.enterGuestGame(w);
    const r = new Player(g, w.hostChar);
    r.remote = true;
    r.x = g.players[0].x + 12; r.y = g.players[0].y;
    this.remote = r;
    g.syncBuddy();
    const name = CHARACTERS[w.hostChar].name;
    this.status(`Conectado a la sala ${w.code}: jugando con ${name}`, 'ok');
    g.ui.setNetBadge(`Sala ${w.code} · con ${name}`);
    g.toast(`¡Entraste a la partida de ${name}!`, null, 'good');
  }

  applySnapshot(s) {
    const g = this.g;
    if (this.remote) this.applyPlayer(this.remote, s.p);
    const upChanged = JSON.stringify(s.up) !== JSON.stringify(g.upgrades);
    const moneyChanged = s.m !== g.money;
    g.money = s.m;
    if (upChanged) g.applyUpgrades(s.up);
    g.inv.torch = s.inv;
    if (s.gf.length !== g.openedGifts.length) {
      g.openedGifts = s.gf.slice();
      for (const ch of g.world.chests) if (g.openedGifts.includes(ch.id) && !ch.opened) { ch.opened = true; ch.open = 1; }
    }
    if ((upChanged || moneyChanged) && g.state === 'shop') g.ui.renderShop();
    g.pickups.list = s.pk.map(([x, y, item]) => ({ x, y, item, t: 1, vx: 0, vy: 0 }));
    if (s.to) g.torches = s.to.map(([x, y, seed]) => ({ x, y, seed }));
    // Popi (lo maneja el anfitrión)
    const before = g.popiState();
    if (s.po) {
      if (!g.popi) g.popi = new Popi(g);
      const P = g.popi;
      [P.x, P.y, P.facing] = s.po;
      P.onGround = !!s.po[3]; P.digging = !!s.po[4]; P.flying = !!s.po[5];
      g.popiOwner = s.po[6] === 'g' ? 'me' : 'other';
    } else g.popi = null;
    if (g.state === 'shop' && before !== g.popiState()) g.ui.renderShop();
    g.chatter.remoteState = s.ch;
    if (s.b) this.applyBoss(s.b);
  }

  applyBoss(b) {
    const g = this.g, B = g.boss, me = g.players[0];
    const wasFight = B.state === 'fight';
    B.state = b.s; B.x = b.x; B.y = b.y; B.facing = b.f;
    if (b.s !== 'fight') {
      if (wasFight) { g.ui.setBossBar(null); B.clearHazards(); me.heldRock = null; }
      return;
    }
    B.flash = b.fl; B.phase2 = !!b.p2;
    if (B.hp !== b.hp || !wasFight) g.ui.setBossBar(b.hp / BOSS.hp);
    B.hp = b.hp;
    B.attack = b.a;
    B.partner = null;
    B.rocks = b.r.map(([x, y, k, t, spin, rad, state, holder]) => ({ x, y, k, t, spin, rad, state, holder }));
    B.feathers = b.fe.map(([x, y, a]) => ({ x, y, a }));
    B.pillars = b.pi.map(([x, t]) => ({ x, t }));
    B.waves = b.w.map(([x, dir]) => ({ x, dir }));
    B.marks = b.mk.map(([x, t]) => ({ x, t }));
    me.heldRock = B.rocks.find((r) => r.holder === 'g') || null;
  }

  teleport(m) {
    const g = this.g, p = g.players[0];
    p.x = m.cx - p.w / 2; p.y = m.fy - p.h;
    p.vx = 0; p.vy = 0; p.peakY = p.y; p.heldRock = null; p.hovering = false;
    if (m.f) p.facing = m.f;
    if (m.full) p.hp = HP_MAX;
    p.jetFuel = BOSS.jetTime;
    g.cam.x = p.cx - g.vw / 2; g.cam.y = p.cy - g.vh / 2;
  }

  teamDown() {
    const g = this.g, p = g.players[0];
    g.state = 'faint';
    p.dead = true; p.heldRock = null;
    g.audio.jet(false);
    g.audio.play('faint');
    g.ui.setBossBar(null);
    setTimeout(() => g.ui.fade(true), 400);
    setTimeout(() => {
      g.ui.showMsg('¡Se desmayaron!', 'Aguilus los dejó viendo estrellitas.\n\nCuando abrieron los ojos estaban en casa... con una pluma violeta en la almohada.\n\nAguilus los espera abajo de todo, ¡y ya se recuperó!', [{
        label: 'Volver a bajar',
        onClick: () => {
          p.spawn();
          p.hp = HP_MAX; p.energy = g.stats.energyMax;
          g.cam.x = p.cx - g.vw / 2; g.cam.y = p.cy - g.vh / 2;
          g.ui.fade(false);
          g.state = 'play';
        },
      }]);
    }, 1300);
  }

  ending(m) {
    const g = this.g;
    g.state = 'paused';
    g.ui.showMsg('¡Fin! ♥', `${ENDING_TEXT}\n\nPlata juntada: ${fmtMoney(m.earned || 0)}`, [
      { label: 'Seguir jugando', onClick: () => { g.state = 'play'; } },
    ]);
  }

  // ---- escenas en el invitado: se dibujan igual que en la pantalla del anfitrión ----
  applySceneFrame(f) {
    const g = this.g;
    let sc = g.scene;
    if (g.state !== 'remoteScene' || !sc || !sc.remote) {
      if (g.state === 'shop') g.ui.show('screen-shop', false);
      g.ui.show('screen-pause', false);
      g.audio.jet(false);
      g.input.releaseLatch();
      g.ui.setPrompt(null);
      g.ui.show('hud', false);
      g.ui.show('touch', false);
      g.ui.setIntro(true, 'Saltar ▸▸');
      sc = new Scene(g, function* puppet() { yield () => false; });
      sc.remote = true;
      sc.advance = () => this.send('adv');
      sc.skip = () => this.send('skip');
      sc.update = () => {};
      g.scene = sc;
      g.state = 'remoteScene';
      this.cap = undefined; this.fade = undefined;
    }
    sc.t = f.st;
    const actors = {};
    for (const a of f.a) {
      actors[a.id] = {
        id: a.id, x: a.x, y: a.y, facing: a.f, pose: a.po, flying: !!a.fl, hidden: !!a.hi, emote: a.e, emoteT: a.et,
        phase: a.ph, walkT: a.wt, target: a.mv ? a.x : null, ty: null, fallTo: a.fa ? 1 : null,
      };
    }
    sc.actors = actors;
    sc.feathers = f.fe;
    // diálogo
    if (f.l) {
      if (!sc.line || sc.line.who !== f.l.w || sc.line.text !== f.l.x) {
        sc.line = { who: f.l.w, text: f.l.x, shown: 0 };
        const sp = SPEAKERS[f.l.w];
        g.ui.introSay(sp.name, sp.icon(), '');
      }
      if (f.l.s !== sc.line.shown) {
        if (Math.floor(f.l.s / 3) !== Math.floor(sc.line.shown / 3) && f.l.s < f.l.x.length) g.audio.play(f.l.w === 'popi' ? 'bark' : 'talk');
        sc.line.shown = f.l.s;
        g.ui.introText(f.l.x.slice(0, f.l.s));
      }
    } else if (sc.line) { sc.line = null; g.ui.introSay(null); }
    if (f.c !== this.cap) { this.cap = f.c; g.ui.introCaption(f.c); }
    if (f.fd !== this.fade) { this.fade = f.fd; g.ui.fade(!!f.fd, f.fd === 'white'); }
    this.sceneCam = { x: f.cam[0], y: f.cam[1], z: f.cam[2] };
  }

  endRemoteScene() {
    const g = this.g, sc = g.scene;
    if (!sc || !sc.remote) return;
    sc.done = true;
    window.removeEventListener('keydown', sc.onKey);
    g.scene = null;
    g.ui.introSay(null); g.ui.introCaption(null); g.ui.fade(false);
    g.ui.setIntro(false);
    g.ui.show('hud', true);
    g.ui.show('touch', g.ui.isTouch);
    g.zoom = 1;
    if (g.state === 'remoteScene') g.state = 'play';
  }

  // ---- cavado compartido ----
  /** engancha el cavado del mundo: lo que cava cada uno se le manda al otro */
  hookWorld(world) {
    const orig = world.digCircle.bind(world);
    world.digCircle = (cx, cy, R, power, chip = null) => {
      const res = orig(cx, cy, R, power, chip);
      if (this.linked && !this.applying && res.n > 0) this.send('dig', { d: [cx, cy, R, power], c: chip }); // exacto: los dos mundos tienen que quedar iguales
      return res;
    };
  }

  applyDig(m) {
    const g = this.g;
    const [cx, cy, R, power] = m.d;
    this.applying = true;
    const res = g.world.digCircle(cx, cy, R, power, m.c || null);
    this.applying = false;
    if (!res.n) return;
    if (this.role === 'host') {
      // el anfitrión hace caer los minerales (y los cuenta)
      for (const l of res.loot) g.pickups.spawn(l.x, l.y, l.item);
      g.counters.tiles += res.n / 16;
    }
    const p = this.remote || g.players[0];
    for (const [t, n] of Object.entries(res.mats)) {
      p.debris(cx, cy, +t, Math.min(8, 2 + (n >> 3)), R);
      p.materialFx(cx, cy, +t, n, R);
    }
  }
}
