// Interfaz HTML: HUD, taller, regalos, pausa y menú principal.
import { UPGRADES, GIFTS, CHARACTERS, LAYERS, MAX_DEPTH, HP_MAX, SUPPLIES } from './config.js';
import { ICON_URL, DOG, POPI, charPortrait } from './sprites.js';
import { fmtMoney } from './util.js';
import { MusicDirector, hasGenerated } from './music.js';

const $ = (id) => document.getElementById(id);

export class UI {
  constructor(game) {
    this.g = game;
    this.last = {};
    this.isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
    if (this.isTouch) document.body.classList.add('touch');

    document.querySelectorAll('img[data-icon]').forEach((img) => { img.src = ICON_URL[img.dataset.icon]; });
    document.querySelector('.shop-cat').src = charPortrait('carlos', 1).toDataURL(); // Carlos atiende el taller
    document.querySelector('.gift-img').src = ICON_URL.giftBig;
    this.setupTitle();

    // marcas de regalos en el medidor de profundidad
    const gauge = $('gauge');
    this.giftMarks = GIFTS.map((gf) => {
      const d = document.createElement('div');
      d.className = 'gauge-gift';
      d.style.top = (gf.depth / MAX_DEPTH) * 100 + '%';
      d.innerHTML = `<span>${gf.depth} m</span><img src="${ICON_URL.giftBig}" alt="">`;
      gauge.appendChild(d);
      return d;
    });

    // selección de personaje
    document.querySelectorAll('.char').forEach((b) => {
      const id = b.dataset.char;
      b.querySelector('img').src = ICON_URL['char_' + id];
      b.querySelector('span').textContent = CHARACTERS[id].name;
      b.addEventListener('click', () => { game.audio.unlock(); game.audio.play('ui'); this.selectChar(id); });
    });
    this.selectChar(game.charId);

    $('btn-splash').addEventListener('click', () => game.startIntro());
    $('intro-skip').addEventListener('click', () => game.scene && game.scene.skip());
    $('intro').addEventListener('pointerdown', (e) => { if (e.target.closest('button')) return; if (game.scene) game.scene.advance(); });
    $('intro-note-ok').addEventListener('click', () => { const cb = this.noteCb; this.introNote(null); if (cb) cb(); });
    $('btn-intro').addEventListener('click', () => { game.audio.play('ui'); game.startIntro(); });
    // configuración y controles: se abren desde el título o desde la pausa
    const sub = (id, open) => {
      game.audio.play('ui');
      this.show(id, open);
      if (game.state === 'paused') this.show('screen-pause', !open);
    };
    for (const [btn, id] of [['btn-settings', 'screen-settings'], ['p-settings', 'screen-settings'], ['btn-controls', 'screen-controls'], ['p-controls', 'screen-controls'], ['p-songs', 'screen-songs']]) {
      $(btn).addEventListener('click', () => { game.audio.unlock(); sub(id, true); });
    }
    $('settings-ok').addEventListener('click', () => sub('screen-settings', false));
    $('controls-ok').addEventListener('click', () => sub('screen-controls', false));
    $('songs-ok').addEventListener('click', () => sub('screen-songs', false));
    // canciones originales o generadas, y escucharlas desde Configuración
    $('btn-music-src').addEventListener('click', () => {
      const a = game.audio;
      a.unlock();
      a.setMusicSrc(a.musicSrc === 'gen' ? 'orig' : 'gen');
      if (a.musicSrc === 'gen' && !hasGenerated()) this.toast('Todavía no hay canciones generadas: mientras tanto suenan las originales', 'warn');
      this.refreshAudioBtns();
    });
    $('s-songs').addEventListener('click', () => { game.audio.unlock(); this.show('screen-settings', false); sub('screen-songs', true); this.refreshSongs(); });
    // jugar online
    const net = game.net;
    net.onStatus = (msg, kind) => this.netStatus(msg, kind);
    $('btn-online').addEventListener('click', () => { game.audio.unlock(); game.audio.play('ui'); this.openOnline(); });
    $('p-online').addEventListener('click', () => { game.audio.play('ui'); this.show('screen-pause', false); this.openOnline(); });
    $('on-close').addEventListener('click', () => {
      game.audio.play('ui');
      this.show('screen-online', false);
      if (game.state === 'paused') this.show('screen-pause', true);
    });
    $('on-host').addEventListener('click', () => { game.audio.play('ui'); game.hostOnline(); });
    $('on-join').addEventListener('click', () => { game.audio.play('ui'); net.join($('on-code').value); });
    $('on-code').addEventListener('keydown', (e) => { if (e.key === 'Enter') net.join($('on-code').value); e.stopPropagation(); });
    $('on-code').addEventListener('input', () => { $('on-code').value = $('on-code').value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4); });
    $('on-leave').addEventListener('click', () => { game.audio.play('ui'); net.leave(); this.openOnline(); });
    const ios = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (ios && !navigator.standalone) this.show('ios-hint', true);
    $('songs-auto').addEventListener('click', () => { if (game.audio.music) game.audio.music.release(); this.refreshSongs(); });
    $('p-songs').addEventListener('click', () => this.refreshSongs());
    this.closeSub = () => {
      for (const id of ['screen-settings', 'screen-controls', 'screen-songs']) if (!$(id).classList.contains('hidden')) { sub(id, false); return true; }
      return false;
    };
    $('btn-new').addEventListener('click', () => { game.audio.unlock(); game.requestNewGame(); });
    $('btn-continue').addEventListener('click', () => { game.audio.unlock(); game.continueGame(); });
    $('btn-pause').addEventListener('click', () => game.pause());
    $('q-music').addEventListener('click', () => this.toggleMusic());
    $('q-sfx').addEventListener('click', () => this.toggleSfx());
    $('q-auto').addEventListener('click', () => this.toggleAuto());
    $('btn-resume').addEventListener('click', () => game.resume());
    $('btn-title').addEventListener('click', () => game.toTitle());
    $('btn-reset').addEventListener('click', () => game.confirmReset());
    $('btn-rematch').addEventListener('click', () => { game.audio.play('ui'); game.rematchBoss(); });
    $('btn-sfx').addEventListener('click', () => { game.audio.setSfx(!game.audio.sfxOn); this.refreshAudioBtns(); });
    $('btn-music').addEventListener('click', () => { game.audio.setMusic(!game.audio.musicOn); this.refreshAudioBtns(); });
    $('btn-duo').addEventListener('click', () => { game.audio.play('ui'); game.setDuo(!game.duo); this.refreshAudioBtns(); });
    $('shop-close').addEventListener('click', () => game.closeShop());
    $('screen-shop').addEventListener('click', (e) => { if (e.target.id === 'screen-shop') game.closeShop(); });
    $('gift-ok').addEventListener('click', () => game.closeGift());
    this.refreshAudioBtns();
    for (const k of ['music', 'sfx', 'jet']) {
      const el = $('vol-' + k), out = el.nextElementSibling;
      el.value = Math.round(game.audio.vol[k] * 100);
      out.textContent = el.value + '%';
      el.addEventListener('input', () => {
        game.audio.unlock();
        game.audio.setVolume(k, el.value / 100);
        out.textContent = el.value + '%';
      });
    }
    let auto = false;
    try { auto = localStorage.getItem('terra-regalos-pan:autodig') === '1'; } catch { /* nada */ }
    this.toggleAuto(auto);
    this.updateTitle();
  }

  selectChar(id) {
    this.g.charId = id;
    try { localStorage.setItem('terra-regalos-pan:char', id); } catch { /* nada */ }
    document.querySelectorAll('.char').forEach((b) => b.classList.toggle('sel', b.dataset.char === id));
    if ($('btn-duo')) this.refreshAudioBtns();
  }

  /** arma la lista de canciones del menú de prueba y marca la que está sonando */
  refreshSongs() {
    const a = this.g.audio, m = a.music;
    const list = $('songs-list');
    const ZONES = ['Superficie (hasta 300 m)', 'Zona media (300 a 800 m)', 'Profundo (800 a 1500 m)', 'Núcleo (combate final)'];
    list.innerHTML = '';
    const orig = MusicDirector.list('orig'), gen = MusicDirector.list('gen');
    const isOn = (z, i, src) => m && m.forced && m.forced.zone === z && m.forced.idx === i && (m.forced.src || 'orig') === src;
    orig.forEach((songs, z) => {
      const h = document.createElement('h3');
      h.textContent = ZONES[z];
      list.appendChild(h);
      for (const [src, names, label] of [['orig', songs, 'Originales'], ['gen', gen[z], 'Generadas (ElevenLabs)']]) {
        const sub = document.createElement('p');
        sub.className = 'song-src';
        sub.textContent = label + (src === 'gen' && !names.length ? ': todavía no hay' : '');
        list.appendChild(sub);
        if (!names.length) continue;
        const row = document.createElement('div');
        row.className = 'song-row';
        names.forEach((name, i) => {
          const b = document.createElement('button');
          b.className = 'btn small alt song' + (src === 'gen' ? ' gen' : '');
          b.textContent = name;
          if (isOn(z, i, src)) b.classList.add('sel');
          b.addEventListener('click', () => {
            a.unlock();
            if (!a.musicOn) { a.setMusic(true); this.refreshAudioBtns(); }
            if (a.music) a.music.play(z, i, src);
            this.refreshSongs();
          });
          row.appendChild(b);
        });
        list.appendChild(row);
      }
    });
    const f = m && m.forced;
    const now = f ? '♪ Sonando: ' + MusicDirector.list(f.src || 'orig')[f.zone][f.idx] + (f.src === 'gen' ? ' (generada)' : ' (original)')
      : m ? '♪ Música normal: cambia según la profundidad' : '♪ La música arranca al tocar una canción';
    $('songs-now').textContent = now + (a.musicOn ? '' : ' (la música está apagada)');
  }

  /** pantalla de jugar online: muestra el menú o el estado de la sala */
  openOnline() {
    const net = this.g.net;
    this.show('screen-online', true);
    const inRoom = !!net.role;
    this.show('online-menu', !inRoom);
    this.show('on-leave', inRoom);
    // el invitado no puede crear salas desde adentro de otra partida
    $('on-host').textContent = this.g.state === 'title' || this.g.state === 'splash' ? 'Crear sala (con tu partida)' : 'Crear sala con esta partida';
    if (!inRoom) { this.show('on-status', false); this.show('on-room', false); }
    else this.netStatus(net.statusMsg || '', net.linked ? 'ok' : 'wait');
  }

  netStatus(msg, kind) {
    const net = this.g.net;
    const el = $('on-status');
    el.textContent = msg;
    el.className = 'on-status ' + (kind || '');
    this.show('on-status', !!msg);
    const showCode = net.role === 'host' && net.code;
    $('on-room').textContent = showCode ? net.code : '';
    this.show('on-room', !!showCode);
    const inRoom = !!net.role;
    this.show('online-menu', !inRoom);
    this.show('on-leave', inRoom);
    if (net.role === 'host' && !net.linked && net.code) this.setNetBadge(`Sala ${net.code} · esperando...`);
    // el invitado entra directo a la partida
    if (net.role === 'guest' && net.linked) this.show('screen-online', false);
  }

  /** cartelito de la sala arriba al medio; con fade = true se queda 2 s y se desvanece (ya conectados) */
  setNetBadge(text, fade = false) {
    const el = $('net-badge');
    clearTimeout(this.badgeT);
    el.classList.remove('gone');
    el.textContent = text || '';
    this.show('net-badge', !!text);
    if (text && fade) this.badgeT = setTimeout(() => el.classList.add('gone'), 2000);
  }

  refreshAudioBtns() {
    $('btn-sfx').textContent = 'Sonidos: ' + (this.g.audio.sfxOn ? 'Sí' : 'No');
    $('btn-music').textContent = 'Música: ' + (this.g.audio.musicOn ? 'Sí' : 'No');
    const other = this.g.charId === 'pablo' ? 'Panchi' : 'Pablo';
    $('btn-duo').textContent = `Compañero (${other}): ` + (this.g.duo ? 'Sí' : 'No');
    $('btn-music-src').textContent = 'Canciones: ' + (this.g.audio.musicSrc === 'gen' ? 'generadas' : 'originales');
    $('q-sfx').classList.toggle('off', !this.g.audio.sfxOn);
    $('q-music').classList.toggle('off', !this.g.audio.musicOn);
    $('q-sfx').setAttribute('aria-pressed', String(this.g.audio.sfxOn));
    $('q-music').setAttribute('aria-pressed', String(this.g.audio.musicOn));
  }

  toggleMusic() {
    this.g.audio.unlock();
    this.g.audio.setMusic(!this.g.audio.musicOn);
    this.refreshAudioBtns();
    this.toast(this.g.audio.musicOn ? 'Música activada' : 'Música silenciada');
  }

  toggleSfx() {
    this.g.audio.unlock();
    this.g.audio.setSfx(!this.g.audio.sfxOn);
    this.refreshAudioBtns();
    this.toast(this.g.audio.sfxOn ? 'Sonidos activados' : 'Sonidos silenciados');
  }

  toggleAuto(on) {
    const g = this.g;
    const v = on === undefined ? !g.input.autoDig : on;
    g.input.setAutoDig(v);
    $('q-auto').classList.toggle('on', v);
    $('q-auto').setAttribute('aria-pressed', String(v));
    try { localStorage.setItem('terra-regalos-pan:autodig', v ? '1' : '0'); } catch { /* nada */ }
    if (on === undefined) {
      const how = this.isTouch ? 'un toque en CAVAR empieza, otro frena' : 'un click empieza a cavar, otro click frena';
      this.toast(v ? `Cavado automático: ${how}` : 'Cavado automático desactivado', 'good');
    }
  }

  /** título: letras sueltas que caen y ondean, y regalitos que reaccionan al mouse */
  setupTitle() {
    const l1 = $('logo-l1');
    let i = 0;
    // cada palabra no se corta; cada letra es un span (para que caigan, ondeen y salten)
    // (la entrada va en el span de afuera y el salto del mouse en el de adentro: si fueran el mismo,
    // al sacar el mouse se volvía a correr la entrada, que arranca invisible, y la letra desaparecía)
    l1.innerHTML = l1.textContent.split(' ').map((w) => `<span class="w">${[...w].map((c) => `<span class="ch" style="--i:${i++}"><span class="hv">${c}</span></span>`).join('')}</span>`).join('<span class="ch sp"> </span>');
    const stamp = document.querySelector('.logo .stamp');
    stamp.innerHTML = `<span class="hv">${stamp.textContent}</span>`;
    // el 2 dibujado en pixeles (con las fuentes pixel parecía una S dada vuelta)
    const TWO = ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'];
    const px = TWO.flatMap((row, y) => [...row].map((c, x) => (c === '#' ? `<rect x="${x}" y="${y}" width="1" height="1"/>` : ''))).join('');
    const two = document.querySelector('.logo .two');
    two.innerHTML = `<span class="hv"><svg viewBox="-1 -1 7 9" aria-label="2"><g class="sh" transform="translate(0.5 0.6)">${px}</g><g class="fg">${px}</g></svg></span>`;
    // efecto al pasar el mouse (o tocar): se juega completo una vez y vuelve a quedar como estaba
    const hover = (el, sound) => {
      const hv = el.querySelector('.hv');
      el.addEventListener('pointerenter', () => {
        hv.classList.remove('pop'); void hv.offsetWidth; hv.classList.add('pop');
        if (sound && this.g.audio.ctx) this.g.audio.play(sound);
      });
      hv.addEventListener('animationend', () => hv.classList.remove('pop'));
    };
    l1.querySelectorAll('.ch:not(.sp)').forEach((el) => hover(el, 'talk'));
    hover(stamp, 'ui');
    hover(two, 'coin');
    // el sello grande que reemplaza al 2: una torta de cumple con ¡25!
    const cake = document.querySelector('.logo .cake');
    const C = (x, y, w, h, c) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`;
    const INK = '#1d1420', CREAM = '#fff4e0';
    const cakeSvg = [
      // velitas con su llamita
      C(10, 6, 4, 9, INK), C(17, 6, 4, 9, INK),
      C(11, 7, 2, 7, '#7fd0ff'), C(11, 8, 2, 1, '#ffffff'), C(11, 11, 2, 1, '#ffffff'),
      C(18, 7, 2, 7, '#ff9ad5'), C(18, 8, 2, 1, '#ffffff'), C(18, 11, 2, 1, '#ffffff'),
      `<g class="fl">${C(11, 3, 2, 3, '#ffd34d')}${C(18, 3, 2, 3, '#ffd34d')}${C(12, 2, 1, 1, '#ff8a3d')}${C(19, 2, 1, 1, '#ff8a3d')}${C(11, 5, 1, 1, '#ff8a3d')}${C(18, 5, 1, 1, '#ff8a3d')}</g>`,
      // plato
      C(0, 26, 31, 4, INK), C(1, 26, 29, 2, '#d9dde1'), C(1, 26, 29, 1, '#ffffff'),
      // bizcochuelo rosa
      C(2, 13, 27, 14, INK), C(3, 15, 25, 11, '#f07aa6'), C(3, 24, 25, 2, '#d4608f'),
      // crema de arriba que chorrea
      C(3, 14, 25, 3, CREAM), C(5, 17, 2, 2, CREAM), C(9, 17, 2, 3, CREAM), C(14, 17, 3, 2, CREAM), C(20, 17, 2, 3, CREAM), C(24, 17, 2, 2, CREAM),
      // granitos de colores
      C(4, 21, 1, 1, '#ffd34d'), C(26, 20, 1, 1, '#7fd0ff'), C(5, 24, 1, 1, '#9fe870'), C(25, 23, 1, 1, '#ffd34d'),
      C(7, 14, 1, 1, '#ff6b8a'), C(12, 15, 1, 1, '#7fd0ff'), C(17, 14, 1, 1, '#9fe870'), C(22, 15, 1, 1, '#ffd34d'),
    ].join('');
    // ¡25! dibujado en pixeles (la fuente pixel hace que el 2 parezca una S)
    const GLYPHS = {
      '¡': ['#', '.', '#', '#', '#', '#', '#'],
      '2': TWO,
      '5': ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
      '!': ['#', '#', '#', '#', '#', '.', '#'],
    };
    let gx = 0;
    const txt = [...'¡25!'].map((ch) => {
      const g = GLYPHS[ch];
      const out = g.flatMap((row, y) => [...row].map((c, x) => (c === '#' ? `<rect x="${gx + x}" y="${y}" width="1" height="1"/>` : ''))).join('');
      gx += g[0].length + 1;
      return out;
    }).join('');
    const tw = gx - 1;
    cake.innerHTML = `<span class="hv"><svg viewBox="0 0 31 30" aria-hidden="true">${cakeSvg}</svg>`
      + `<svg class="num" viewBox="-1 -1 ${tw + 2} 9"><g class="sh" transform="translate(0.5 0.6)">${txt}</g><g class="fg">${txt}</g></svg></span>`;
    hover(cake, 'gem');
    const box = document.querySelector('.logo-box');
    document.querySelectorAll('.title-gift').forEach((img) => {
      img.src = ICON_URL.giftBig;
      const burst = () => {
        img.classList.remove('pop'); void img.offsetWidth; img.classList.add('pop');
        if (this.g.audio.ctx) this.g.audio.play('coin');
        const bx = box.getBoundingClientRect(), r = img.getBoundingClientRect();
        for (let i = 0; i < 6; i++) {
          const s = document.createElement('span');
          s.className = 'title-fx';
          s.textContent = i % 2 ? '♥' : '✦';
          s.style.left = (r.left - bx.left + r.width / 2 - 6) + 'px';
          s.style.top = (r.top - bx.top + r.height / 2 - 8) + 'px';
          const a = (i / 6) * Math.PI * 2;
          s.style.setProperty('--dx', Math.round(Math.cos(a) * 36) + 'px');
          s.style.setProperty('--dy', Math.round(Math.sin(a) * 30 - 18) + 'px');
          if (i % 2 === 0) s.style.color = 'var(--gold)';
          box.appendChild(s);
          setTimeout(() => s.remove(), 950);
        }
      };
      img.addEventListener('pointerenter', burst);
      img.addEventListener('click', burst);
    });
  }

  updateTitle() {
    const has = !!this.g.savedData;
    $('btn-continue').classList.toggle('hidden', !has);
    $('btn-new').textContent = has ? 'Nueva partida' : 'Empezar';
    const hint = $('title-hint');
    if (has) {
      const s = this.g.savedData;
      const gifts = (s.gifts || []).length;
      hint.textContent = `Partida guardada: ${fmtMoney(s.money || 0)} · récord ${Math.floor(s.counters?.best || 0)} m · ${gifts}/${GIFTS.length} regalos`;
    } else {
      hint.textContent = this.isTouch ? 'Tip: jugalo con el celu acostado' : 'Tip: se juega con teclado o mouse';
    }
  }

  show(id, on = true) { $(id).classList.toggle('hidden', !on); }

  setPlaying(on) {
    this.show('hud', on);
    this.show('touch', on && this.isTouch);
    this.show('screen-title', !on);
    if (on) this.show('screen-splash', false);
    // el "golpe" del sello del título
    else {
      // golpes de los sellos del título (el 2, que después se despega y se cae, y la torta del ¡25!)
      const at = (ms, ...sfx) => setTimeout(() => { if (this.g.state === 'title' && this.g.audio.ctx) sfx.forEach((s) => this.g.audio.play(s)); }, ms);
      at(2780, 'land', 'dig');
      at(6100, 'swoosh');
      at(7330, 'land', 'dig', 'gem');
    }
  }

  // ---------- Intro ----------
  setIntro(on, skipLabel = 'Saltar intro ▸▸') {
    this.show('intro', on);
    $('intro').classList.toggle('on', on);
    $('intro-skip').textContent = skipLabel;
  }

  /** barra de vida de Aguilus (null la esconde) */
  setBossBar(frac) {
    const el = $('boss-bar');
    el.classList.toggle('hidden', frac === null);
    if (frac !== null) el.querySelector('.fill').style.width = Math.max(0, frac) * 100 + '%';
  }

  introCaption(text) {
    this.captionText = text || null;
    const el = $('intro-caption');
    if (text) el.textContent = text;
    el.classList.toggle('hidden', !text);
  }

  /** abre la caja de diálogo con quien habla (o la cierra con null) */
  introSay(name, face, text = '') {
    if (!name) { this.show('intro-box', false); return; }
    $('intro-name').textContent = name;
    $('intro-face').src = face;
    $('intro-text').textContent = text;
    this.show('intro-box', true);
  }

  introText(text) { $('intro-text').textContent = text; }

  introNote(text, onClose) {
    this.noteCb = text ? onClose : null;
    if (text) $('intro-note-text').textContent = text;
    this.show('intro-note', !!text);
  }

  // ---------- HUD ----------
  updateHUD() {
    const g = this.g, p = g.players[0];
    if (!p) return;
    const L = this.last;
    const hp = Math.ceil(p.hp), en = Math.ceil(p.energy), emax = g.stats.energyMax;
    if (L.hp !== hp) {
      L.hp = hp;
      $('bar-hp').querySelector('.fill').style.width = (hp / HP_MAX) * 100 + '%';
      $('bar-hp').querySelector('.num').textContent = `${hp}/${HP_MAX}`;
      $('bar-hp').classList.toggle('low', hp < HP_MAX * 0.3);
    }
    if (L.en !== en || L.emax !== emax) {
      L.en = en; L.emax = emax;
      $('bar-en').querySelector('.fill').style.width = (en / emax) * 100 + '%';
      $('bar-en').querySelector('.num').textContent = g.stats.infEnergy ? '∞' : `${en}/${emax}`;
      $('bar-en').classList.toggle('low', en < emax * 0.25);
    }
    const money = Math.floor(g.money);
    if (L.money !== money) {
      if (L.money !== undefined && money > L.money) {
        const mb = $('money-box');
        mb.classList.remove('bump'); void mb.offsetWidth; mb.classList.add('bump');
      }
      L.money = money;
      $('money').textContent = fmtMoney(money);
    }
    const depth = Math.floor(p.depth);
    if (L.depth !== depth) {
      L.depth = depth;
      $('depth-num').textContent = `${depth} m`;
      $('gauge-you').style.top = Math.min(100, (depth / MAX_DEPTH) * 100) + '%';
      $('gauge-fill').style.height = Math.min(100, (depth / MAX_DEPTH) * 100) + '%';
      let name = 'Superficie';
      if (p.resting) name = 'Casa';
      else if (depth > 0) {
        let acc = 0;
        for (const l of LAYERS) { if (depth < l.to) { name = l.name; break; } acc = l.to; }
      }
      $('depth-layer').textContent = name;
    }
    const best = Math.floor(g.counters.best);
    if (L.best !== best) {
      L.best = best;
      $('gauge-best').style.top = Math.min(100, (best / MAX_DEPTH) * 100) + '%';
    }
    const it = g.inv.torch;
    if (L.torch !== it) {
      L.torch = it;
      $('inv-torch').textContent = it;
      $('t-torch-n').textContent = it;
    }
    const opened = g.openedGifts.length;
    if (L.gifts !== opened) {
      L.gifts = opened;
      this.giftMarks.forEach((m, i) => m.classList.toggle('done', g.openedGifts.includes(GIFTS[i].id)));
    }
  }

  setPrompt(text) {
    if (this.last.prompt === text) return;
    this.last.prompt = text;
    const el = $('prompt');
    if (!text) { el.classList.add('hidden'); } else { el.textContent = text; el.classList.remove('hidden'); }
  }

  setActButton(label) {
    const el = $('t-act');
    if (this.last.act === label) return;
    this.last.act = label;
    if (!label) el.classList.add('hidden');
    else { el.textContent = label; el.classList.remove('hidden'); }
  }

  toast(msg, kind = '') {
    const box = $('toasts');
    const el = document.createElement('div');
    el.className = 'toast ' + kind;
    el.textContent = msg;
    box.appendChild(el);
    while (box.children.length > 3) box.removeChild(box.firstChild);
    setTimeout(() => { el.style.transition = 'opacity 0.4s'; el.style.opacity = '0'; }, 2300);
    setTimeout(() => el.remove(), 2750);
  }

  // ---------- Taller ----------
  renderShop() {
    const g = this.g;
    $('shop-money').textContent = fmtMoney(g.money);
    const list = $('shop-list');
    list.innerHTML = '';
    const section = (txt) => { const h = document.createElement('h3'); h.className = 'shop-section'; h.textContent = txt; list.appendChild(h); };

    section('Consumibles');
    for (const [id, it] of Object.entries(SUPPLIES)) {
      const card = document.createElement('div');
      card.className = 'up supply';
      card.innerHTML = `
        <div class="up-ico"><img src="${ICON_URL[id]}" alt=""></div>
        <div><h4>${it.name} · ${fmtMoney(it.price)}</h4><p class="desc">${it.desc}</p></div>
        <p class="have">Tienen: ${g.inv[id]} · tecla T</p>
      `;
      const row = document.createElement('div');
      row.className = 'buy-row';
      for (const n of [1, 5]) {
        const b = document.createElement('button');
        b.className = 'btn' + (n === 5 ? ' alt' : '');
        b.textContent = `${n === 1 ? 'Comprar 1' : 'Comprar 5'} · ${fmtMoney(it.price * n)}`;
        b.disabled = g.money < it.price * n;
        b.addEventListener('click', () => g.buySupply(id, n));
        row.appendChild(b);
      }
      card.appendChild(row);
      list.appendChild(card);
    }

    if (g.popiMet) section('Compañero');
    if (g.popiMet) {
      const st = g.popiState();
      const withMe = st === 'me', other = st === 'other';
      const otherName = other && g.net.remote ? CHARACTERS[g.net.remote.char].name : 'tu compañero';
      const card = document.createElement('div');
      card.className = 'up supply';
      card.innerHTML = `
        <div class="up-ico"><img src="${(st ? POPI.right.idleA : DOG.happyA).toDataURL()}" alt="" style="width:36px;height:26px"></div>
        <div><h4>Popi</h4><p class="desc">Tu perro salchicha. Con su casquito y su mini jetpack camina, salta y vuela solo detrás tuyo, y te ayuda a cavar los bloques de al lado. No gasta energía ni se lastima.</p></div>
        <p class="have">${withMe ? 'Está con vos' : other ? `Está con ${otherName}` : 'Te espera en el patio (acercate y apretá E, o tocá POPI)'}</p>
      `;
      const b = document.createElement('button');
      b.className = 'btn buy' + (withMe ? ' alt' : '');
      b.textContent = withMe ? 'Dejar a Popi en el patio' : other ? `Popi está con ${otherName}` : 'Llevar a Popi';
      b.disabled = other;
      b.addEventListener('click', () => g.togglePopi());
      card.appendChild(b);
      list.appendChild(card);
    }

    section('Mejoras');
    for (const up of UPGRADES) {
      const lvl = g.upgrades[up.id];
      const max = lvl >= up.levels.length - 1;
      const [val] = up.levels[lvl];
      const next = max ? null : up.levels[lvl + 1];
      const icon = ICON_URL[up.id + '_' + lvl] || ICON_URL[up.icon];
      const tier = up.tiers ? up.tiers[lvl] : null;
      const nextTier = up.tiers && !max ? up.tiers[lvl + 1] : null;
      const card = document.createElement('div');
      card.className = 'up' + (max ? ' max' : '');
      const pips = up.levels.slice(1).map((_, i) => `<div class="pip ${i < lvl ? 'on' : ''}"></div>`).join('');
      card.innerHTML = `
        <div class="up-ico"><img src="${icon}" alt=""></div>
        <div><h4>${tier || up.name}</h4>${tier ? `<p class="tier">${up.name}</p>` : ''}<p class="desc">${up.desc}</p></div>
        <div class="pips">${pips}</div>
        <div class="vals"><span class="now">${up.label(val)}</span>${next ? `<span class="next">→ ${up.label(next[0])}${nextTier && nextTier !== tier ? ` · ${nextTier}` : ''}</span>` : '<span class="next">¡Al máximo!</span>'}</div>
      `;
      const btn = document.createElement('button');
      btn.className = 'btn buy';
      if (max) { btn.textContent = 'Completo'; btn.disabled = true; }
      else {
        btn.textContent = `Mejorar · ${fmtMoney(next[1])}`;
        btn.disabled = g.money < next[1];
        btn.addEventListener('click', () => g.buy(up.id));
      }
      card.appendChild(btn);
      list.appendChild(card);
    }
  }

  // ---------- Regalo ----------
  showGift(gift) {
    $('gift-kicker').textContent = `¡Regalo encontrado a ${gift.depth} m!`;
    $('gift-title').textContent = gift.title;
    $('gift-text').textContent = gift.text;
    $('gift-ok').textContent = gift.final ? '¡Gracias!' : '¡Seguir cavando!';
    this.show('screen-gift', true);
  }

  // ---------- Mensajes ----------
  /** botón de la pausa para volver a pelear con Aguilus (solo si ya le ganaste) */
  showRematch(on) { $('btn-rematch').classList.toggle('hidden', !on); }

  /** modo recuerdo de las escenas (sepia y bordes de sueño) */
  setFlashback(on) {
    if (this.last.fb === on) return;
    this.last.fb = on;
    document.body.classList.toggle('flashback', on);
    $('flashback').classList.toggle('hidden', !on);
  }

  /** controles táctiles de la pelea final: sin CAVAR ni antorcha, con el joystick de apuntar */
  setFightControls(on) {
    if (this.last.fight === on) return;
    this.last.fight = on;
    $('touch').classList.toggle('fight', on);
  }

  showMsg(title, text, buttons) {
    $('msg-title').textContent = title;
    $('msg-text').textContent = text;
    const box = $('msg-btns');
    box.innerHTML = '';
    for (const b of buttons) {
      const el = document.createElement('button');
      el.className = 'btn ' + (b.cls || '');
      el.textContent = b.label;
      el.addEventListener('click', () => { this.show('screen-msg', false); b.onClick && b.onClick(); });
      box.appendChild(el);
    }
    this.show('screen-msg', true);
  }

  fade(on, white = false) {
    this.fadeState = on ? (white ? 'white' : 'black') : null;
    if (on) $('fade').classList.toggle('white', white);
    $('fade').classList.toggle('on', on);
  }
}
