(() => {
  'use strict';

  // ============================================================ UTILITIES
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  const dist2 = (ax, ay, bx, by) => (ax - bx) * (ax - bx) + (ay - by) * (ay - by);
  const angleDiff = (a, b) => {
    let d = (a - b) % TAU;
    if (d > Math.PI) d -= TAU;
    if (d < -Math.PI) d += TAU;
    return d;
  };
  const hex = h => {
    const n = parseInt(h.replace('#', ''), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const rgba = (h, a) => { const [r, g, b] = hex(h); return `rgba(${r},${g},${b},${a})`; };
  const pack = (r, g, b) => (255 << 24) | (b << 16) | (g << 8) | r;
  const mulberry32 = seed => () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
  const nowSec = () => performance.now() / 1000;
  const $ = id => document.getElementById(id);
  const makeCanvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const isTouch = () => matchMedia('(pointer: coarse)').matches || window.innerWidth < 900;

  // ============================================================ DOM
  const canvas = $('scene');
  const ctx = canvas.getContext('2d', { alpha: false });
  const minimap = $('minimap');
  const mctx = minimap.getContext('2d');
  const D = {
    body: document.body,
    splash: $('splash'),
    mapUI: $('mapUI'),
    hud: $('hud'),
    lotCard: $('lotCard'),
    houseName: $('houseName'),
    familyName: $('familyName'),
    houseTagline: $('houseTagline'),
    lotNo: $('lotNo'),
    levelName: $('levelName'),
    threatPips: $('threatPips'),
    statEnemies: $('statEnemies'),
    clearedCount: $('clearedCount'),
    funds: $('funds'),
    enterBtn: $('enterBtn'),
    playBtn: $('playBtn'),
    pauseMenu: $('pauseMenu'),
    pauseBtn: $('pauseBtn'),
    resultMenu: $('resultMenu'),
    resultKicker: $('resultKicker'),
    resultTitle: $('resultTitle'),
    resultSub: $('resultSub'),
    resKills: $('resKills'),
    resTime: $('resTime'),
    resHealth: $('resHealth'),
    nextBtn: $('nextBtn'),
    mapBtn: $('mapBtn'),
    healthVal: $('healthVal'),
    healthBar: $('healthBar'),
    ammoVal: $('ammoVal'),
    ammoBar: $('ammoBar'),
    levelHeader: $('levelHeader'),
    objectiveText: $('objectiveText'),
    toast: $('toast'),
    mapToast: $('mapToast'),
    keyToast: $('keyToast'),
    tiltBtn: $('tiltBtn'),
    pauseTiltBtn: $('pauseTiltBtn'),
    pauseTiltState: $('pauseTiltState'),
    pauseSoundBtn: $('pauseSoundBtn'),
    pauseSoundState: $('pauseSoundState'),
    soundBtn: $('soundBtn'),
    tiltTip: $('tiltTip'),
    moveZone: $('moveZone'),
    moveStick: $('moveStick'),
    fireBtn: $('fireBtn'),
    damageFlash: $('damageFlash'),
    clock: $('clock'),
    bootError: $('bootError')
  };

  // ============================================================ HOUSES
  const HOUSES = [
    {
      id: 'goth', name: 'Goth Manor', family: 'The Goths', lot: '13',
      tagline: 'Gloomy. Spooky. Structurally cursed.', levelName: 'THE GOTH BASEMENT',
      threat: 3, seed: 1301, body: '#6b5f7c', roof: '#3a304b', trim: '#251d33',
      accent: '#b6a0ff', enemyKinds: ['wraith', 'gnome'],
      theme: 'goth', blurb: 'A tasteful Victorian home with a non-tasteful portal to the underworld.'
    },
    {
      id: 'pleasant', name: 'Pastel Palace', family: 'The Pleasants', lot: '02',
      tagline: 'Open concept. Closed caskets.', levelName: 'THE PLEASANT PANTRY',
      threat: 2, seed: 2402, body: '#efc3ca', roof: '#6b8fa3', trim: '#f7ecd9',
      accent: '#ff9fc0', enemyKinds: ['gnome', 'imp'],
      theme: 'pastel', blurb: 'Coordinated curtains, coordinated demons. The HOA is thrilled.'
    },
    {
      id: 'landgraab', name: 'Landgraab Estate', family: 'The Landgraabs', lot: '08',
      tagline: 'Capitalism is a hellscape.', levelName: 'THE GOLDEN VAULT',
      threat: 4, seed: 3503, body: '#d8c39a', roof: '#3f3a30', trim: '#f3e5bd',
      accent: '#ffd166', enemyKinds: ['imp', 'roomba'],
      theme: 'landgraab', blurb: 'Forty-two rooms, one heir, and an alarming number of armed Roombas.'
    },
    {
      id: 'pancakes', name: 'Pancakes Place', family: 'The Pancakes', lot: '05',
      tagline: 'Burnt breakfast, eternal damnation.', levelName: 'THE BURNT KITCHEN',
      threat: 3, seed: 4604, body: '#e7cf9a', roof: '#a14f39', trim: '#fff1cf',
      accent: '#ff8a4c', enemyKinds: ['imp', 'gnome'],
      theme: 'pancakes', blurb: 'Something in the oven is screaming. Again.'
    },
    {
      id: 'caliente', name: 'Caliente Casa', family: 'The Calientes', lot: '11',
      tagline: 'Hot tub. Hotter demons.', levelName: 'THE TILE SPA',
      threat: 2, seed: 5705, body: '#efab98', roof: '#2f7d7a', trim: '#fbe8d3',
      accent: '#59e0d0', enemyKinds: ['roomba', 'wraith'],
      theme: 'caliente', blurb: 'A romantic retreat with excellent acoustics and poor exit routes.'
    },
    {
      id: 'bustin', name: 'Bustin\u2019 Bungalow', family: 'The Bustin\u2019s', lot: '07',
      tagline: 'The plumbing is alive.', levelName: 'THE MOLD WING',
      threat: 4, seed: 6806, body: '#a9b98f', roof: '#4d5b3c', trim: '#dce6c4',
      accent: '#9dff6a', enemyKinds: ['gnome', 'roomba', 'wraith'],
      theme: 'bungalow', blurb: 'Fixer-upper. Sold as-is. The basement has opinions.'
    }
  ];

  const THEMES = {
    goth: {
      wallA: '#514267', wallB: '#463a5b', trim: '#241b31', accent: '#b6a0ff',
      floorA: '#3c2c2a', floorB: '#322321', ceil: '#171020', fog: '#120b18',
      wallStyle: 'wallpaper', floorStyle: 'wood', name: 'GOTH'
    },
    pastel: {
      wallA: '#f0c8cf', wallB: '#e8b8c2', trim: '#b77083', accent: '#ff9fc0',
      floorA: '#a8d8c8', floorB: '#f7ecd9', ceil: '#2a1d22', fog: '#1b1116',
      wallStyle: 'tile', floorStyle: 'checker', name: 'PASTEL'
    },
    landgraab: {
      wallA: '#c9b58a', wallB: '#bca578', trim: '#4d4029', accent: '#ffd166',
      floorA: '#5a3028', floorB: '#43211b', ceil: '#241b12', fog: '#160f0b',
      wallStyle: 'marble', floorStyle: 'marble', name: 'LANDGRAAB'
    },
    pancakes: {
      wallA: '#dfc38a', wallB: '#d3b57a', trim: '#7c3a22', accent: '#ff8a4c',
      floorA: '#8d4a2f', floorB: '#6f3823', ceil: '#251610', fog: '#170d09',
      wallStyle: 'brick', floorStyle: 'wood', name: 'PANCAKES'
    },
    caliente: {
      wallA: '#e4a08d', wallB: '#d8917f', trim: '#8a463d', accent: '#59e0d0',
      floorA: '#3b8d8a', floorB: '#dfe6d2', ceil: '#1a2322', fog: '#0d1615',
      wallStyle: 'tile', floorStyle: 'checker', name: 'CALIENTE'
    },
    bungalow: {
      wallA: '#9cae83', wallB: '#8b9d73', trim: '#4d5b3c', accent: '#9dff6a',
      floorA: '#6c5737', floorB: '#5b472d', ceil: '#1a1c12', fog: '#0f120a',
      wallStyle: 'mold', floorStyle: 'tile', name: 'BUNGALOW'
    }
  };

  // ============================================================ STATE
  const state = {
    mode: 'splash',
    selected: 0,
    hover: -1,
    cleared: new Set(),
    level: null,
    player: null,
    mapIntro: 0,
    mapView: null,
    layout: null,
    tilt: { supported: typeof DeviceOrientationEvent !== 'undefined', enabled: false, base: null, gamma: 0, beta: 0, yaw: 0 },
    time: 0,
    last: nowSec(),
    runStart: 0,
    runCount: 0
  };

  try {
    const saved = JSON.parse(localStorage.getItem('strangeville.cleared') || '[]');
    if (Array.isArray(saved)) saved.forEach(id => state.cleared.add(id));
  } catch (_) { /* private mode */ }

  // ============================================================ AUDIO
  const audio = {
    ac: null, master: null, muted: false, ambient: null, ambientGain: null,
    init() {
      if (this.ac) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      try {
        this.ac = new AC();
        this.master = this.ac.createGain();
        this.master.gain.value = this.muted ? 0 : 0.5;
        this.master.connect(this.ac.destination);
      } catch (_) { this.ac = null; }
    },
    resume() { if (this.ac && this.ac.state === 'suspended') this.ac.resume().catch(() => {}); },
    setMuted(m) {
      this.muted = m;
      if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.5, this.ac.currentTime, 0.04);
      updateSoundUI();
    },
    tone(freq, dur, type = 'square', vol = 0.12, slide = 0) {
      if (!this.ac || this.muted) return;
      const t = this.ac.currentTime;
      const o = this.ac.createOscillator();
      const g = this.ac.createGain();
      o.type = type; o.frequency.setValueAtTime(freq, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur);
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(this.master);
      o.start(t); o.stop(t + dur + 0.02);
    },
    noise(dur, vol = 0.1, cutoff = 1600, q = 0.8) {
      if (!this.ac || this.muted) return;
      const t = this.ac.currentTime;
      const len = Math.max(1, Math.floor(this.ac.sampleRate * dur));
      const buf = this.ac.createBuffer(1, len, this.ac.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = this.ac.createBufferSource(); src.buffer = buf;
      const f = this.ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = cutoff; f.Q.value = q;
      const g = this.ac.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(f).connect(g).connect(this.master);
      src.start(t);
    },
    shoot() {
      this.tone(180, 0.09, 'square', 0.11, -120);
      this.noise(0.09, 0.16, 2600, 0.6);
      this.tone(70, 0.16, 'sawtooth', 0.09, -40);
    },
    dryFire() { this.tone(110, 0.05, 'square', 0.04, -30); },
    hit() { this.tone(540, 0.05, 'square', 0.07, -160); this.noise(0.045, 0.06, 3200); },
    hurt() { this.tone(95, 0.2, 'sawtooth', 0.13, -50); this.noise(0.18, 0.12, 700, 1.2); },
    pickup() { this.tone(620, 0.09, 'sine', 0.09, 140); setTimeout(() => this.tone(880, 0.11, 'sine', 0.07, 80), 55); },
    key() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this.tone(f, 0.16, 'triangle', 0.09), i * 72)); },
    portal() { this.tone(160, 0.5, 'sine', 0.1, 380); this.noise(0.4, 0.08, 1200); },
    clear() { [392, 523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this.tone(f, 0.3, 'triangle', 0.1), i * 105)); },
    death() { [220, 180, 140, 90, 50].forEach((f, i) => setTimeout(() => this.tone(f, 0.32, 'sawtooth', 0.1, -20), i * 120)); },
    startAmbient(theme) {
      if (!this.ac || this.ambient) return;
      this.resume();
      const t = this.ac.currentTime;
      const o1 = this.ac.createOscillator(); o1.type = 'sine'; o1.frequency.value = 48;
      const o2 = this.ac.createOscillator(); o2.type = 'triangle'; o2.frequency.value = 55.5;
      const f = this.ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 160;
      const g = this.ac.createGain(); g.gain.value = 0.0001;
      g.gain.setTargetAtTime(0.045, t, 1.1);
      const lfo = this.ac.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = 0.08;
      const lg = this.ac.createGain(); lg.gain.value = 55;
      lfo.connect(lg).connect(f.frequency);
      o1.connect(f); o2.connect(f); f.connect(g).connect(this.master);
      o1.start(); o2.start(); lfo.start();
      this.ambient = { o1, o2, lfo, g };
      this.ambientGain = g;
    },
    stopAmbient() {
      if (!this.ambient) return;
      const { o1, o2, lfo, g } = this.ambient;
      const t = this.ac.currentTime;
      g.gain.setTargetAtTime(0.0001, t, 0.2);
      setTimeout(() => { try { o1.stop(); o2.stop(); lfo.stop(); } catch (_) {} }, 700);
      this.ambient = null;
    }
  };

  // ============================================================ TEXTURES
  function addGrime(g, rng, color, count) {
    for (let i = 0; i < count; i++) {
      const x = rng() * 64, y = 24 + rng() * 40;
      const r = 1 + rng() * (4 + rng() * 8);
      const grad = g.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, rgba(color, 0.13 + rng() * 0.17));
      grad.addColorStop(1, rgba(color, 0));
      g.fillStyle = grad;
      g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    }
  }

  function makeWallTexture(themeKey, variant) {
    const t = THEMES[themeKey];
    const c = makeCanvas(64, 64);
    const g = c.getContext('2d');
    const rng = mulberry32(themeKey.length * 997 + variant * 131 + 7);
    g.fillStyle = variant ? t.wallB : t.wallA;
    g.fillRect(0, 0, 64, 64);

    if (t.wallStyle === 'wallpaper') {
      g.globalAlpha = 0.16;
      for (let x = 4; x < 64; x += 12) {
        g.fillStyle = t.accent;
        g.fillRect(x, 0, 1, 64);
      }
      g.globalAlpha = 0.2;
      g.strokeStyle = t.accent;
      for (let y = 9; y < 54; y += 13) {
        for (let x = 8; x < 64; x += 13) {
          g.beginPath(); g.moveTo(x, y - 3); g.lineTo(x + 3, y); g.lineTo(x, y + 3); g.lineTo(x - 3, y); g.closePath(); g.stroke();
        }
      }
      g.globalAlpha = 1;
    } else if (t.wallStyle === 'tile') {
      g.strokeStyle = rgba(t.trim, 0.34);
      g.lineWidth = 1;
      for (let y = 0; y < 64; y += 16) {
        for (let x = 0; x < 64; x += 16) {
          if (((x / 16) + (y / 16)) % 2 === 0) {
            g.fillStyle = rgba(t.accent, 0.06);
            g.fillRect(x + 1, y + 1, 14, 14);
          }
          g.strokeRect(x + 0.5, y + 0.5, 15, 15);
        }
      }
    } else if (t.wallStyle === 'brick') {
      g.fillStyle = rgba(t.trim, 0.24);
      for (let y = 0; y < 64; y += 10) {
        g.fillRect(0, y, 64, 1);
        const off = (Math.floor(y / 10) % 2) * 12;
        for (let x = -off; x < 64; x += 24) {
          g.fillRect(x, y, 1, 10);
          if (rng() > 0.55) {
            g.fillStyle = rgba(variant ? '#2b120c' : '#3a170e', 0.1);
            g.fillRect(x + 2, y + 2, 20, 7);
            g.fillStyle = rgba(t.trim, 0.24);
          }
        }
      }
    } else if (t.wallStyle === 'marble') {
      g.globalAlpha = 0.24;
      g.strokeStyle = '#6e5b36';
      g.lineWidth = 1.3;
      for (let i = 0; i < 7; i++) {
        g.beginPath();
        const y = rng() * 64;
        g.moveTo(0, y);
        for (let x = 0; x <= 64; x += 12) g.lineTo(x, y + Math.sin(x * 0.15 + i) * (2 + rng() * 4));
        g.stroke();
      }
      g.globalAlpha = 1;
    } else if (t.wallStyle === 'mold') {
      g.strokeStyle = rgba(t.trim, 0.4);
      for (let y = 0; y < 64; y += 16) {
        g.beginPath(); g.moveTo(0, y + 0.5); g.lineTo(64, y + 0.5); g.stroke();
        for (let x = 0; x < 64; x += 16) {
          g.beginPath(); g.moveTo(x + 0.5, 0); g.lineTo(x + 0.5, 64); g.stroke();
        }
      }
      addGrime(g, rng, '#2d4a1d', 12);
      addGrime(g, rng, '#0f1c0b', 8);
    }

    // baseboard + picture rail
    g.fillStyle = rgba(t.trim, 0.93);
    g.fillRect(0, 54, 64, 10);
    g.fillStyle = rgba(t.trim, 0.5);
    g.fillRect(0, 53, 64, 1);
    g.fillStyle = rgba('#ffffff', 0.08);
    g.fillRect(0, 56, 64, 1);
    g.fillStyle = rgba(t.trim, 0.35);
    g.fillRect(0, 0, 64, 3);
    g.fillStyle = rgba(t.accent, 0.12);
    g.fillRect(0, 3, 64, 1);

    addGrime(g, rng, '#120b08', 5 + variant * 2);
    // subtle vertical light falloff
    const shade = g.createLinearGradient(0, 0, 64, 0);
    shade.addColorStop(0, 'rgba(0,0,0,0.13)');
    shade.addColorStop(0.4, 'rgba(255,255,255,0.035)');
    shade.addColorStop(1, 'rgba(0,0,0,0.18)');
    g.fillStyle = shade; g.fillRect(0, 0, 64, 64);
    return c;
  }

  function makeFloorArray(themeKey) {
    const t = THEMES[themeKey];
    const size = 64;
    const arr = new Uint32Array(size * size);
    const rng = mulberry32(themeKey.length * 311 + 71);
    const a = hex(t.floorA), b = hex(t.floorB);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        let r, g, bl;
        if (t.floorStyle === 'checker') {
          const on = ((x >> 3) + (y >> 3)) & 1;
          const base = on ? a : b;
          const n = (rng() - 0.5) * 12;
          r = base[0] + n; g = base[1] + n; bl = base[2] + n;
          if ((x & 7) === 0 || (y & 7) === 0) { r *= 0.82; g *= 0.82; bl *= 0.82; }
        } else if (t.floorStyle === 'wood') {
          const plank = (y / 16) | 0;
          const shift = (plank * 23) % 64;
          const px = (x + shift) % 64;
          const n = Math.sin(px * 0.37 + plank * 2.1) * 7 + (rng() - 0.5) * 8;
          const base = (plank & 1) ? a : b;
          r = base[0] + n; g = base[1] + n; bl = base[2] + n;
          if ((y & 15) === 0 || (x + shift) % 64 === 0) { r *= 0.68; g *= 0.68; bl *= 0.68; }
        } else if (t.floorStyle === 'marble') {
          const n = Math.sin(x * 0.21 + Math.sin(y * 0.17) * 3.1) * 12 + (rng() - 0.5) * 8;
          const base = ((x >> 4) + (y >> 4)) & 1 ? a : b;
          r = base[0] + n; g = base[1] + n; bl = base[2] + n;
        } else {
          const grout = (x & 15) === 0 || (y & 15) === 0;
          const base = ((x >> 4) + (y >> 4)) & 1 ? a : b;
          const n = (rng() - 0.5) * 11;
          r = base[0] + n; g = base[1] + n; bl = base[2] + n;
          if (grout) { r *= 0.72; g *= 0.72; bl *= 0.72; }
        }
        arr[y * size + x] = pack(clamp(r | 0, 0, 255), clamp(g | 0, 0, 255), clamp(bl | 0, 0, 255));
      }
    }
    return { size, data: arr };
  }

  function makeCeilArray(themeKey) {
    const t = THEMES[themeKey];
    const [cr, cg, cb] = hex(t.ceil);
    const size = 64;
    const arr = new Uint32Array(size * size);
    const rng = mulberry32(themeKey.length * 521 + 9);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const panel = (x & 31) === 0 || (y & 31) === 0;
        const n = (rng() - 0.5) * 12;
        arr[y * size + x] = pack(
          clamp(cr + n + (panel ? 8 : 0) | 0, 0, 255),
          clamp(cg + n + (panel ? 8 : 0) | 0, 0, 255),
          clamp(cb + n + (panel ? 8 : 0) | 0, 0, 255)
        );
      }
    }
    return { size, data: arr };
  }

  // ------------------------------------------------------------ sprites
  function glowCircle(g, x, y, r, color, alpha = 0.5) {
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, rgba(color, alpha));
    gr.addColorStop(1, rgba(color, 0));
    g.fillStyle = gr;
    g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  }

  function monsterSprite(type, frame) {
    const c = makeCanvas(160, 200);
    const g = c.getContext('2d');
    const f = frame ? 1 : 0;
    g.lineJoin = 'round';
    g.lineCap = 'round';

    if (type === 'wraith') {
      glowCircle(g, 80, 102, 76, '#7dff4b', 0.2);
      g.translate(80, 190);
      // smoky tail
      g.fillStyle = 'rgba(38,88,44,0.62)';
      g.beginPath();
      g.moveTo(-34, -20);
      g.bezierCurveTo(-46 + f * 5, -70, -28, -110, -10, -150);
      g.bezierCurveTo(18, -118, 36, -68, 34, -18);
      g.quadraticCurveTo(0, -4, -34, -20);
      g.fill();
      // inner robe
      g.fillStyle = 'rgba(26,58,32,0.9)';
      g.beginPath();
      g.moveTo(-22, -22);
      g.bezierCurveTo(-28, -62, -15, -110, 0, -138);
      g.bezierCurveTo(14, -108, 27, -62, 20, -22);
      g.quadraticCurveTo(0, -8, -22, -22);
      g.fill();
      // crystal head
      g.save();
      g.translate(0, -138 + f * 3);
      g.shadowColor = '#8dff54'; g.shadowBlur = 26;
      const gr = g.createLinearGradient(-24, -34, 24, 34);
      gr.addColorStop(0, '#f0ffc4'); gr.addColorStop(0.4, '#9dff62'); gr.addColorStop(1, '#2b8c1f');
      g.fillStyle = gr;
      g.beginPath(); g.moveTo(0, -36); g.lineTo(23, -9); g.lineTo(0, 36); g.lineTo(-23, -9); g.closePath(); g.fill();
      g.shadowBlur = 0;
      g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 1.5; g.stroke();
      g.restore();
      // eyes
      g.shadowColor = '#c9ff9d'; g.shadowBlur = 12;
      g.fillStyle = '#efffd8';
      g.beginPath(); g.ellipse(-11, -31, 4.6, 2.9, 0, 0, TAU); g.fill();
      g.beginPath(); g.ellipse(11, -31, 4.6, 2.9, 0, 0, TAU); g.fill();
      g.shadowBlur = 0;
      // arms
      g.strokeStyle = 'rgba(64,132,60,.82)'; g.lineWidth = 8;
      g.beginPath(); g.moveTo(-22, -84); g.quadraticCurveTo(-52 - f * 5, -78, -57, -52 + f * 8); g.stroke();
      g.beginPath(); g.moveTo(22, -84); g.quadraticCurveTo(52 + f * 5, -78, 57, -52 - f * 8); g.stroke();
    } else if (type === 'imp') {
      glowCircle(g, 80, 112, 68, '#ff542e', 0.16);
      g.translate(80, 190);
      // tail
      g.strokeStyle = '#8f2415'; g.lineWidth = 6;
      g.beginPath(); g.moveTo(0, -28); g.bezierCurveTo(24, -12, 50, -22, 46, -52); g.stroke();
      g.fillStyle = '#8f2415';
      g.beginPath(); g.moveTo(46, -52); g.lineTo(58, -62); g.lineTo(40, -64); g.closePath(); g.fill();
      // legs
      g.fillStyle = '#a9361d';
      g.beginPath(); g.ellipse(-15, -49, 15, 25 + f * 3, 0.08, 0, TAU); g.fill();
      g.beginPath(); g.ellipse(15, -49, 15, 25 - f * 3, -0.08, 0, TAU); g.fill();
      // body
      const body = g.createLinearGradient(-35, -145, 35, -35);
      body.addColorStop(0, '#e65b35'); body.addColorStop(0.55, '#c63d20'); body.addColorStop(1, '#7e2111');
      g.fillStyle = body;
      g.beginPath(); g.ellipse(0, -88, 31, 48, 0, 0, TAU); g.fill();
      // chest
      g.fillStyle = 'rgba(255,169,110,.18)';
      g.beginPath(); g.ellipse(-8, -102, 13, 22, -0.2, 0, TAU); g.fill();
      // arms
      g.strokeStyle = '#b83b1e'; g.lineWidth = 12;
      g.beginPath(); g.moveTo(-27, -110); g.quadraticCurveTo(-52, -96 - f * 4, -51, -64); g.stroke();
      g.beginPath(); g.moveTo(27, -110); g.quadraticCurveTo(51, -98 + f * 4, 50, -62); g.stroke();
      // claws
      g.strokeStyle = '#f4d7a0'; g.lineWidth = 3;
      for (let i = -1; i <= 1; i++) {
        g.beginPath(); g.moveTo(-51 + i * 5, -64); g.lineTo(-55 + i * 6, -53); g.stroke();
        g.beginPath(); g.moveTo(50 + i * 5, -62); g.lineTo(55 + i * 6, -51); g.stroke();
      }
      // head
      g.fillStyle = '#d9512c';
      g.beginPath(); g.ellipse(0, -145, 25, 22, 0, 0, TAU); g.fill();
      // horns
      g.fillStyle = '#efd8ab';
      g.beginPath(); g.moveTo(-18, -160); g.lineTo(-31, -186); g.lineTo(-7, -166); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(18, -160); g.lineTo(31, -186); g.lineTo(7, -166); g.closePath(); g.fill();
      // eyes
      g.shadowColor = '#ffe05c'; g.shadowBlur = 16; g.fillStyle = '#ffe45e';
      g.beginPath(); g.ellipse(-10, -147, 5, 3.2, 0.1, 0, TAU); g.fill();
      g.beginPath(); g.ellipse(10, -147, 5, 3.2, -0.1, 0, TAU); g.fill();
      g.shadowBlur = 0;
      // mouth
      g.strokeStyle = '#3d0d07'; g.lineWidth = 2.5;
      g.beginPath(); g.moveTo(-11, -136); g.quadraticCurveTo(0, -128, 11, -136); g.stroke();
      g.fillStyle = '#f6e2b5';
      g.beginPath(); g.moveTo(-8, -134); g.lineTo(-5, -127); g.lineTo(-2, -134); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(2, -134); g.lineTo(5, -127); g.lineTo(8, -134); g.closePath(); g.fill();
    } else if (type === 'gnome') {
      glowCircle(g, 80, 130, 62, '#ffb34e', 0.12);
      g.translate(80, 190);
      // boots
      g.fillStyle = '#2b241e';
      g.beginPath(); g.ellipse(-17, -19, 15, 9, 0, 0, TAU); g.fill();
      g.beginPath(); g.ellipse(17, -19, 15, 9, 0, 0, TAU); g.fill();
      // legs
      g.fillStyle = '#3c5a34'; g.fillRect(-22, -44, 14, 28); g.fillRect(8, -44, 14, 28);
      // tunic
      const tunic = g.createLinearGradient(0, -90, 0, -34);
      tunic.addColorStop(0, '#4e7c8f'); tunic.addColorStop(1, '#243f4d');
      g.fillStyle = tunic;
      g.beginPath(); g.moveTo(-30, -84); g.quadraticCurveTo(0, -98, 30, -84); g.lineTo(23, -40); g.quadraticCurveTo(0, -30, -23, -40); g.closePath(); g.fill();
      // belt
      g.fillStyle = '#30221a'; g.fillRect(-25, -54, 50, 7);
      g.fillStyle = '#d6a443'; g.fillRect(-5, -56, 10, 11);
      // beard
      g.fillStyle = '#e7e2d0';
      g.beginPath(); g.moveTo(-17, -112); g.quadraticCurveTo(-28, -78, 0, -66); g.quadraticCurveTo(28, -78, 17, -112); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(150,145,125,.5)'; g.lineWidth = 1.4;
      for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(i * 6, -102); g.lineTo(i * 3, -74); g.stroke(); }
      // face
      g.fillStyle = '#e8b690';
      g.beginPath(); g.ellipse(0, -119, 17, 14, 0, 0, TAU); g.fill();
      // eyes
      g.fillStyle = '#19120d';
      g.beginPath(); g.arc(-7, -122, 2.2, 0, TAU); g.fill();
      g.beginPath(); g.arc(7, -122, 2.2, 0, TAU); g.fill();
      g.fillStyle = '#ff3b23'; g.beginPath(); g.arc(-7, -122, 0.9, 0, TAU); g.fill(); g.beginPath(); g.arc(7, -122, 0.9, 0, TAU); g.fill();
      // nose
      g.fillStyle = '#d99d78'; g.beginPath(); g.ellipse(0, -116, 4, 5, 0, 0, TAU); g.fill();
      // hat
      const hat = g.createLinearGradient(-30, -180, 30, -125);
      hat.addColorStop(0, '#e34832'); hat.addColorStop(1, '#8d1c12');
      g.fillStyle = hat;
      g.beginPath(); g.moveTo(-25, -126); g.quadraticCurveTo(-2, -205, 14 + f * 3, -196); g.quadraticCurveTo(9, -160, 25, -126); g.quadraticCurveTo(0, -116, -25, -126); g.closePath(); g.fill();
      // axe
      g.strokeStyle = '#5a3d22'; g.lineWidth = 5;
      g.beginPath(); g.moveTo(29, -95); g.lineTo(40 + f * 2, -140); g.stroke();
      g.fillStyle = '#c6d3d6';
      g.beginPath(); g.moveTo(38, -141); g.lineTo(59, -149); g.lineTo(51, -126); g.closePath(); g.fill();
      g.fillStyle = '#8c9ca1';
      g.beginPath(); g.moveTo(38, -141); g.lineTo(48, -136); g.lineTo(51, -126); g.closePath(); g.fill();
    } else if (type === 'roomba') {
      glowCircle(g, 80, 134, 68, '#ff2f2f', 0.18);
      g.translate(80, 190);
      // blades
      g.save();
      g.translate(0, -34);
      g.rotate(f * 0.55);
      g.fillStyle = '#a6b6b9';
      for (let i = 0; i < 4; i++) {
        g.save(); g.rotate(i * Math.PI / 2);
        g.beginPath(); g.moveTo(0, -12); g.lineTo(55, -23); g.lineTo(50, -9); g.lineTo(0, 4); g.closePath(); g.fill();
        g.restore();
      }
      g.restore();
      // body disc
      const disc = g.createLinearGradient(0, -76, 0, -6);
      disc.addColorStop(0, '#4c5a5e'); disc.addColorStop(0.55, '#2c373a'); disc.addColorStop(1, '#12191b');
      g.fillStyle = disc;
      g.beginPath(); g.ellipse(0, -30, 47, 39, 0, 0, TAU); g.fill();
      g.strokeStyle = '#809094'; g.lineWidth = 2;
      g.beginPath(); g.ellipse(0, -30, 47, 39, 0, 0, TAU); g.stroke();
      g.fillStyle = '#182225';
      g.beginPath(); g.ellipse(0, -34, 34, 27, 0, 0, TAU); g.fill();
      // eye
      g.shadowColor = '#ff2e2e'; g.shadowBlur = 18; g.fillStyle = '#ff3b32';
      g.beginPath(); g.ellipse(0, -39, 15, 6.5, 0, 0, TAU); g.fill();
      g.fillStyle = '#ffd9c8'; g.beginPath(); g.ellipse(0, -39, 4.2, 2.1, 0, 0, TAU); g.fill();
      g.shadowBlur = 0;
      // vents
      g.strokeStyle = 'rgba(173,195,197,.4)'; g.lineWidth = 1.4;
      for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(i * 9, -17); g.lineTo(i * 9, -7); g.stroke(); }
    }
    return c;
  }

  function itemSprite(type, frame) {
    const c = makeCanvas(96, 128);
    const g = c.getContext('2d');
    g.translate(48, 118);
    if (type === 'key') {
      glowCircle(g, 0, -52, 40, '#ffd166', 0.42);
      g.save(); g.translate(0, -52 + (frame ? 2 : -2));
      g.rotate(-0.38);
      g.strokeStyle = '#ffe7a3'; g.lineWidth = 8; g.lineCap = 'round';
      g.beginPath(); g.moveTo(-14, 0); g.lineTo(23, 0); g.stroke();
      g.strokeStyle = '#c99325'; g.lineWidth = 3;
      g.beginPath(); g.moveTo(-8, 0); g.lineTo(-8, 0); g.stroke();
      g.fillStyle = '#ffd166';
      g.beginPath(); g.arc(-17, 0, 14, 0, TAU); g.fill();
      g.fillStyle = '#fff4cf'; g.beginPath(); g.arc(-17, -3, 6, 0, TAU); g.fill();
      g.fillStyle = '#c99325';
      g.fillRect(11, 0, 5, 12); g.fillRect(20, 0, 5, 9);
      g.restore();
    } else if (type === 'health') {
      glowCircle(g, 0, -50, 39, '#8dff54', 0.4);
      g.save(); g.translate(0, -50 + (frame ? 2 : -2));
      const gr = g.createLinearGradient(0, -28, 0, 26);
      gr.addColorStop(0, '#e8ffc0'); gr.addColorStop(0.45, '#8dff54'); gr.addColorStop(1, '#2c8f1e');
      g.fillStyle = gr;
      g.beginPath(); g.moveTo(0, -32); g.lineTo(20, -10); g.lineTo(0, 30); g.lineTo(-20, -10); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 1.5; g.stroke();
      g.fillStyle = 'rgba(255,255,255,.7)';
      g.beginPath(); g.moveTo(-4, -20); g.lineTo(4, -20); g.lineTo(4, -3); g.lineTo(-4, -3); g.closePath(); g.fill();
      g.beginPath(); g.moveTo(-11, -9); g.lineTo(11, -9); g.lineTo(11, -3); g.lineTo(-11, -3); g.closePath(); g.fill();
      g.restore();
    } else if (type === 'ammo') {
      glowCircle(g, 0, -43, 36, '#5ad9ff', 0.4);
      g.save(); g.translate(0, -43 + (frame ? 2 : -2));
      g.fillStyle = '#18313c'; g.strokeStyle = '#69dfff'; g.lineWidth = 2.5;
      g.beginPath(); g.roundRect(-17, -27, 34, 49, 7); g.fill(); g.stroke();
      g.fillStyle = '#64e2ff';
      g.beginPath(); g.moveTo(0, -19); g.lineTo(11, 0); g.lineTo(2, 0); g.lineTo(7, 17); g.lineTo(-11, -3); g.lineTo(-2, -3); g.closePath(); g.fill();
      g.fillStyle = 'rgba(255,255,255,.8)'; g.fillRect(-8, 12, 16, 3);
      g.restore();
    } else if (type === 'exit') {
      // tall portal
      g.translate(0, 0);
      glowCircle(g, 0, -80, 62, '#8dff54', 0.28);
      const spin = frame * 0.4;
      g.save(); g.translate(0, -80);
      g.rotate(spin * 0.2);
      g.strokeStyle = 'rgba(141,255,84,.55)'; g.lineWidth = 3;
      g.beginPath(); g.ellipse(0, 0, 32, 55, 0, 0, TAU); g.stroke();
      g.rotate(-spin * 0.55);
      g.strokeStyle = 'rgba(240,255,196,.5)'; g.lineWidth = 2;
      g.beginPath(); g.ellipse(0, 0, 23, 46, 0, 0.3, TAU - 0.4); g.stroke();
      g.restore();
      g.save(); g.translate(0, -80);
      const gr = g.createLinearGradient(-22, -32, 22, 32);
      gr.addColorStop(0, '#f0ffc4'); gr.addColorStop(0.45, '#9dff62'); gr.addColorStop(1, '#2c8f1e');
      g.fillStyle = gr;
      g.beginPath(); g.moveTo(0, -40); g.lineTo(26, -12); g.lineTo(0, 40); g.lineTo(-26, -12); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 1.4; g.stroke();
      g.globalAlpha = 0.5; g.fillStyle = '#ffffff';
      g.beginPath(); g.moveTo(-4, -26); g.lineTo(0, -10); g.lineTo(-9, -19); g.closePath(); g.fill();
      g.restore();
    } else if (type === 'plant') {
      g.fillStyle = '#6d4a2b'; g.beginPath(); g.moveTo(-14, -20); g.lineTo(14, -20); g.lineTo(10, 0); g.lineTo(-10, 0); g.closePath(); g.fill();
      g.fillStyle = '#2a4b24';
      for (let i = 0; i < 6; i++) {
        g.save(); g.rotate(-0.7 + i * 0.28); g.beginPath(); g.ellipse(0, -45, 8, 27, 0, 0, TAU); g.fill(); g.restore();
      }
      g.fillStyle = '#3d7334'; g.beginPath(); g.ellipse(0, -76, 20, 30, 0, 0, TAU); g.fill();
    } else if (type === 'lamp') {
      glowCircle(g, 0, -80, 54, '#ffd166', 0.26);
      g.fillStyle = '#31291f'; g.fillRect(-4, -74, 8, 74);
      g.fillStyle = '#ffd166';
      g.beginPath(); g.moveTo(-17, -92); g.lineTo(17, -92); g.lineTo(12, -68); g.lineTo(-12, -68); g.closePath(); g.fill();
      g.fillStyle = 'rgba(255,255,255,.5)'; g.beginPath(); g.ellipse(0, -90, 13, 4, 0, 0, TAU); g.fill();
    }
    return c;
  }

  function makeSprites() {
    const sprites = { monsters: {}, items: {} };
    ['wraith', 'imp', 'gnome', 'roomba'].forEach(t => sprites.monsters[t] = [monsterSprite(t, 0), monsterSprite(t, 1)]);
    ['key', 'health', 'ammo', 'exit', 'plant', 'lamp'].forEach(t => {
      sprites.items[t] = [itemSprite(t, 0), itemSprite(t, 1), itemSprite(t, 2), itemSprite(t, 3)];
    });
    return sprites;
  }

  const SPRITES = makeSprites();

  // ============================================================ LEVEL GENERATION
  const ENEMY_TYPES = {
    wraith: { hp: 72, speed: 1.02, damage: 9, worldH: 1.65, radius: 0.42, label: 'PLUMB WRAITH' },
    imp: { hp: 86, speed: 1.32, damage: 11, worldH: 1.42, radius: 0.38, label: 'HELLION' },
    gnome: { hp: 58, speed: 1.45, damage: 7, worldH: 0.92, radius: 0.32, label: 'MURDER GNOME' },
    roomba: { hp: 112, speed: 1.15, damage: 12, worldH: 0.62, radius: 0.44, label: 'ROOMBA OF DOOM' }
  };

  function generateLevel(house) {
    const W = 25, H = 25;
    const rng = mulberry32(house.seed * 7919 + 23);
    const grid = new Uint8Array(W * H);
    grid.fill(1);
    const rooms = [];
    const cols = 3, rows = 3;
    const cellW = (W - 2) / cols;
    const cellH = (H - 2) / rows;

    const carve = (x, y) => {
      if (x > 0 && y > 0 && x < W - 1 && y < H - 1) grid[y * W + x] = 0;
    };
    const carveRoom = (x0, y0, x1, y1) => {
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) carve(x, y);
    };
    const corridor = (ax, ay, bx, by) => {
      let x = ax, y = ay;
      if (rng() > 0.5) {
        while (x !== bx) { carve(x, y); x += Math.sign(bx - x); }
        while (y !== by) { carve(x, y); y += Math.sign(by - y); }
      } else {
        while (y !== by) { carve(x, y); y += Math.sign(by - y); }
        while (x !== bx) { carve(x, y); x += Math.sign(bx - x); }
      }
      carve(bx, by);
    };

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const maxW = Math.floor(cellW) - 2;
        const maxH = Math.floor(cellH) - 2;
        const rw = 4 + Math.floor(rng() * Math.max(1, maxW - 3));
        const rh = 4 + Math.floor(rng() * Math.max(1, maxH - 3));
        const baseX = 1 + Math.floor(c * cellW);
        const baseY = 1 + Math.floor(r * cellH);
        const x0 = baseX + Math.floor((Math.floor(cellW) - rw) / 2);
        const y0 = baseY + Math.floor((Math.floor(cellH) - rh) / 2);
        carveRoom(x0, y0, x0 + rw - 1, y0 + rh - 1);
        rooms.push({
          x0, y0, x1: x0 + rw - 1, y1: y0 + rh - 1,
          cx: x0 + rw / 2, cy: y0 + rh / 2
        });
      }
    }

    // minimum spanning tree through room centers
    const connected = new Set([4]);
    while (connected.size < rooms.length) {
      let best = Infinity, ba = 0, bb = 0;
      for (const a of connected) {
        for (let b = 0; b < rooms.length; b++) {
          if (connected.has(b)) continue;
          const d = dist2(rooms[a].cx, rooms[a].cy, rooms[b].cx, rooms[b].cy);
          if (d < best) { best = d; ba = a; bb = b; }
        }
      }
      corridor(Math.floor(rooms[ba].cx), Math.floor(rooms[ba].cy), Math.floor(rooms[bb].cx), Math.floor(rooms[bb].cy));
      connected.add(bb);
    }
    // loops make it feel like a house, not a maze
    for (let i = 0; i < 3; i++) {
      const a = Math.floor(rng() * rooms.length);
      let b = Math.floor(rng() * rooms.length);
      if (a === b) b = (b + 1) % rooms.length;
      corridor(Math.floor(rooms[a].cx), Math.floor(rooms[a].cy), Math.floor(rooms[b].cx), Math.floor(rooms[b].cy));
    }

    const startRoom = rooms[4];
    let exitRoom = rooms[0], far = -1;
    rooms.forEach(room => {
      const d = dist2(room.cx, room.cy, startRoom.cx, startRoom.cy);
      if (d > far) { far = d; exitRoom = room; }
    });
    let keyRoom = null, bestKey = -1;
    rooms.forEach(room => {
      if (room === startRoom || room === exitRoom) return;
      const d = dist2(room.cx, room.cy, exitRoom.cx, exitRoom.cy);
      if (d > bestKey) { bestKey = d; keyRoom = room; }
    });
    if (!keyRoom) keyRoom = rooms.find(r => r !== startRoom && r !== exitRoom) || exitRoom;

    const start = { x: startRoom.cx, y: startRoom.cy };
    const exit = { x: exitRoom.cx, y: exitRoom.cy };
    const key = { x: keyRoom.cx, y: keyRoom.cy };

    const floorTiles = [];
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) if (grid[y * W + x] === 0) floorTiles.push({ x: x + 0.5, y: y + 0.5, tx: x, ty: y });
    const tooClose = (p, pts, d) => pts.some(q => dist2(p.x, p.y, q.x, q.y) < d * d);
    const occupied = [start, exit, key];
    const pickTile = (minStart = 4, extra = []) => {
      for (let tries = 0; tries < 140; tries++) {
        const t = floorTiles[Math.floor(rng() * floorTiles.length)];
        if (dist2(t.x, t.y, start.x, start.y) < minStart * minStart) continue;
        if (tooClose(t, occupied, 1.35) || tooClose(t, extra, 0.9)) continue;
        return t;
      }
      return floorTiles[Math.floor(rng() * floorTiles.length)];
    };

    const enemyCount = 4 + house.threat;
    const enemies = [];
    const used = [];
    for (let i = 0; i < enemyCount; i++) {
      const t = pickTile(7.5, used);
      used.push(t);
      const type = house.enemyKinds[Math.floor(rng() * house.enemyKinds.length)];
      const def = ENEMY_TYPES[type];
      enemies.push({
        type, x: t.x, y: t.y, hp: def.hp + (i > 3 ? 14 : 0), maxHp: def.hp + (i > 3 ? 14 : 0),
        speed: def.speed + rng() * 0.14, damage: def.damage, worldH: def.worldH, radius: def.radius,
        alive: true, deadT: 0, cooldown: 0.5 + rng() * 1.4, phase: rng() * TAU, hitFlash: 0, attackT: 0
      });
    }

    const items = [];
    const itemKinds = ['ammo', 'ammo', 'ammo', 'health', 'health'];
    itemKinds.forEach((kind, i) => {
      const t = pickTile(2.5, used);
      used.push(t);
      items.push({ type: kind, x: t.x, y: t.y, taken: false, phase: rng() * TAU });
    });

    const props = [];
    rooms.forEach((room, i) => {
      if (i % 2 === 1) return;
      const type = rng() > 0.55 ? 'plant' : 'lamp';
      const x = room.x0 + 1.15, y = room.y0 + 1.15;
      if (grid[Math.floor(y) * W + Math.floor(x)] === 0) props.push({ type, x, y, phase: rng() * TAU });
    });

    let angle = Math.atan2(exit.y - start.y, exit.x - start.x);
    if (!Number.isFinite(angle)) angle = 0;

    return {
      W, H, grid, rooms, start, exit, key, enemies, items, props,
      house, theme: THEMES[house.theme], themeKey: house.theme,
      enemyCount, angle, time: 0,
      wallTextures: [makeWallTexture(house.theme, 0), makeWallTexture(house.theme, 1)],
      floor: makeFloorArray(house.theme), ceil: makeCeilArray(house.theme),
      hasKey: false, kills: 0, startedAt: 0
    };
  }

  // more code appended below...

  // ============================================================ CANVAS / MAP VIEW
  let VW = window.innerWidth;
  let VH = window.innerHeight;
  let RW = 0, RH = 0;
  let frame = null, fbuf = null;
  let zbuf = new Float32Array(1);

  function resize() {
    VW = Math.max(1, window.innerWidth);
    VH = Math.max(1, window.innerHeight);
    const scale = Math.min(window.devicePixelRatio || 1, 1.35);
    RW = Math.round(clamp(VW * scale, 360, 1280));
    RH = Math.round(RW * VH / VW);
    canvas.width = RW;
    canvas.height = RH;
    frame = ctx.createImageData(RW, RH);
    fbuf = new Uint32Array(frame.data.buffer);
    zbuf = new Float32Array(RW);
    updateMapView();
  }

  const YS = 0.72;
  const ZS = 0.92;
  const SKX = 0.085;
  const SKZ = 0.13;

  function rawProject(x, y, z) {
    return { x: x + y * SKX - z * SKZ, y: y * YS - z * ZS };
  }

  function mapViewport() {
    const vw = window.innerWidth, vh = window.innerHeight;
    if (vw >= 900) return { x: 18, y: 74, w: vw - 410, h: vh - 104 };
    if (vh < 580) return { x: 12, y: 62, w: vw - 320, h: vh - 84 };
    const cardH = vh < 700 ? 180 : 222;
    return { x: 10, y: 64, w: vw - 20, h: vh - 64 - cardH - 28 };
  }

  function buildLayout() {
    const portrait = window.innerHeight > window.innerWidth * 0.98;
    const W = portrait ? 900 : 1160;
    const H = portrait ? 1200 : 820;
    const street = 100;
    const margin = 26;
    const lotGap = 28;
    const cols = portrait ? 2 : 3;
    const rows = portrait ? 3 : 2;
    let cellW, cellH;
    if (portrait) {
      cellW = (W - margin * 2 - street - lotGap * 2) / 2;
      cellH = (H - margin * 2) / 3;
    } else {
      cellW = (W - margin * 2) / 3;
      cellH = (H - margin * 2 - street - lotGap * 2) / 2;
    }
    const layout = {
      portrait, W, H, street, margin, lotGap, cols, rows, cellW, cellH,
      road: portrait
        ? { x: W / 2 - street / 2, y: -30, w: street, h: H + 60, vertical: true }
        : { x: -30, y: H / 2 - street / 2, w: W + 60, h: street, vertical: false },
      lots: [], trees: [], objects: [], tufts: [], lamps: []
    };
    const rng = mulberry32(portrait ? 777 : 991);

    HOUSES.forEach((house, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      let lot;
      if (portrait) {
        const right = col === 1;
        const x0 = right ? W / 2 + street / 2 + lotGap : margin;
        const x1 = right ? W - margin : W / 2 - street / 2 - lotGap;
        const y0 = margin + row * cellH;
        const y1 = y0 + cellH - 6;
        lot = { x0, y0, x1, y1 };
      } else {
        const top = row === 0;
        const y0 = top ? margin : H / 2 + street / 2 + lotGap;
        const y1 = top ? H / 2 - street / 2 - lotGap : H - margin;
        const x0 = margin + col * cellW;
        const x1 = x0 + cellW - 6;
        lot = { x0, y0, x1, y1 };
      }
      const lotW = lot.x1 - lot.x0;
      const lotH = lot.y1 - lot.y0;
      const hw = Math.min(lotW * 0.68, 244);
      const hd = Math.min(lotH * 0.55, 188);
      const cx = (lot.x0 + lot.x1) / 2 + (i % 2 ? 4 : -4);
      const cy = (lot.y0 + lot.y1) / 2 + (row === rows - 1 ? -8 : 4);
      house.lotRect = lot;
      house.index = i;
      house.bx0 = cx - hw / 2;
      house.bx1 = cx + hw / 2;
      house.by0 = cy - hd / 2;
      house.by1 = cy + hd / 2;
      house.cx = cx;
      house.cy = cy;
      house.wallH = 50 + (i % 3) * 5;
      house.roofH = 34 + (i % 2) * 7;
      house.driveway = null;
      layout.lots.push(lot);

      // driveway runs from the house toward the street
      if (portrait) {
        const rightSide = cx > W / 2;
        house.driveway = {
          x0: rightSide ? house.bx0 : house.bx1,
          x1: rightSide ? W / 2 + street / 2 : W / 2 - street / 2,
          y0: house.by1 - Math.min(34, hd * 0.22),
          y1: house.by1 - 2
        };
      } else {
        const below = cy > H / 2;
        house.driveway = {
          x0: cx - 18,
          x1: cx + 18,
          y0: below ? H / 2 + street / 2 : house.by1,
          y1: below ? house.by0 : H / 2 - street / 2
        };
      }

      layout.objects.push({ kind: 'house', house, index: i, y: house.by1 + 2 });
      layout.lots.push(lot);

      // trees in the lot corners, avoiding the house
      const treeSpots = [
        { x: lot.x0 + 22, y: lot.y0 + 26 },
        { x: lot.x1 - 24, y: lot.y1 - 22 },
        { x: lot.x0 + 26, y: lot.y1 - 30 },
        { x: lot.x1 - 26, y: lot.y0 + 28 }
      ];
      for (const spot of treeSpots) {
        if (spot.x > house.bx0 - 20 && spot.x < house.bx1 + 20 && spot.y > house.by0 - 14 && spot.y < house.by1 + 14) continue;
        if (rng() < 0.38) continue;
        const size = 20 + rng() * 22;
        layout.trees.push({ x: spot.x + (rng() - 0.5) * 10, y: spot.y + (rng() - 0.5) * 10, size, seed: rng() * 100 });
      }
    });

    layout.trees.forEach(t => layout.objects.push({ kind: 'tree', tree: t, y: t.y }));
    // street lamps
    const lampCount = portrait ? 6 : 5;
    for (let i = 0; i < lampCount; i++) {
      if (portrait) {
        const side = i % 2 ? 1 : -1;
        layout.lamps.push({ x: W / 2 + side * (street / 2 + 15), y: 100 + (i * 197) % (H - 170) });
      } else {
        const side = i % 2 ? 1 : -1;
        layout.lamps.push({ x: 120 + (i * 251) % (W - 240), y: H / 2 + side * (street / 2 + 15) });
      }
    }

    for (let i = 0; i < (portrait ? 170 : 140); i++) {
      layout.tufts.push({ x: rng() * W, y: rng() * H, s: 0.5 + rng() * 1.4, r: rng() * TAU });
    }

    state.layout = layout;
    updateMapView();
  }

  function updateMapView() {
    if (!state.layout) return;
    const l = state.layout;
    const vp = mapViewport();
    let minX = 0, maxX = l.W, minY = 0, maxY = l.H * YS;
    const sample = (x, y, z) => {
      const p = rawProject(x, y, z);
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    };
    for (const h of HOUSES) {
      if (h.bx0 == null) continue;
      const top = h.wallH + h.roofH + 26;
      sample(h.bx0 - 12, h.by0 - 12, top);
      sample(h.bx1 + 12, h.by1 + 12, top);
      sample(h.bx0 - 12, h.by1 + 12, 0);
      sample(h.bx1 + 12, h.by0 - 12, 0);
    }
    for (const t of l.trees) sample(t.x, t.y, t.size * 1.75);
    const dw = Math.max(1, maxX - minX);
    const dh = Math.max(1, maxY - minY);
    const s = Math.min(vp.w / dw, vp.h / dh) * 0.94;
    const ox = vp.x + (vp.w - dw * s) / 2 - minX * s;
    const oy = vp.y + (vp.h - dh * s) / 2 - minY * s;
    state.mapView = { ...vp, s, ox, oy };
  }

  function P(x, y, z = 0) {
    const v = state.mapView;
    return {
      x: v.ox + (x + y * SKX - z * SKZ) * v.s,
      y: v.oy + (y * YS - z * ZS) * v.s
    };
  }

  function polyPath(points) {
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
    ctx.closePath();
  }

  function quad(a, b, c, d) {
    polyPath([P(a[0], a[1], a[2] || 0), P(b[0], b[1], b[2] || 0), P(c[0], c[1], c[2] || 0), P(d[0], d[1], d[2] || 0)]);
  }

  // ============================================================ MAP RENDER
  function drawNeighborhood(now) {
    const v = state.mapView;
    if (!v) return;
    const l = state.layout;
    ctx.setTransform(RW / VW, 0, 0, RH / VH, 0, 0);
    ctx.clearRect(0, 0, VW, VH);

    const bg = ctx.createLinearGradient(0, 0, 0, VH);
    bg.addColorStop(0, '#0b2017');
    bg.addColorStop(0.55, '#081710');
    bg.addColorStop(1, '#050d09');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, VW, VH);

    const glow = ctx.createRadialGradient(VW * 0.5, VH * 0.45, 20, VW * 0.5, VH * 0.45, Math.max(VW, VH) * 0.7);
    glow.addColorStop(0, 'rgba(46,108,65,.3)');
    glow.addColorStop(0.55, 'rgba(20,58,36,.12)');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, VW, VH);

    // ground
    const ground = [P(0, 0), P(l.W, 0), P(l.W, l.H), P(0, l.H)];
    polyPath(ground);
    ctx.save();
    ctx.clip();
    const grass = ctx.createLinearGradient(ground[0].x, ground[0].y, ground[2].x, ground[2].y);
    grass.addColorStop(0, '#3f7547');
    grass.addColorStop(0.5, '#356b41');
    grass.addColorStop(1, '#2a5736');
    ctx.fillStyle = grass;
    ctx.fillRect(0, 0, VW, VH);

    // mowing stripes
    for (let y = 0, i = 0; y < l.H; y += 46, i++) {
      if (i % 2) continue;
      polyPath([P(0, y), P(l.W, y), P(l.W, y + 46), P(0, y + 46)]);
      ctx.fillStyle = 'rgba(184,255,170,.028)';
      ctx.fill();
    }

    // subtle lawn patches
    for (let i = 0; i < 36; i++) {
      const rx = (i * 233 + 71) % l.W;
      const ry = (i * 389 + 53) % l.H;
      const p = P(rx, ry);
      const r = (10 + (i * 37) % 46) * v.s;
      ctx.fillStyle = i % 2 ? 'rgba(18,61,32,.12)' : 'rgba(205,255,180,.035)';
      ctx.beginPath(); ctx.ellipse(p.x, p.y, r * 1.6, r * 0.7, 0, 0, TAU); ctx.fill();
    }

    // tufts
    ctx.strokeStyle = 'rgba(18,62,31,.42)';
    ctx.lineWidth = 1;
    for (const t of l.tufts) {
      const p = P(t.x, t.y);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + Math.cos(t.r) * 2.6 * t.s, p.y - 2.4 * t.s);
      ctx.moveTo(p.x + 1, p.y);
      ctx.lineTo(p.x + 2 + Math.cos(t.r + 2) * 2 * t.s, p.y - 1.8 * t.s);
      ctx.stroke();
    }
    ctx.restore();

    // world border hedge
    polyPath(ground);
    ctx.strokeStyle = 'rgba(10,30,18,.9)';
    ctx.lineWidth = 10 * v.s;
    ctx.stroke();
    polyPath(ground);
    ctx.strokeStyle = 'rgba(92,155,94,.5)';
    ctx.lineWidth = 2 * v.s;
    ctx.stroke();

    drawStreets(l, v);

    // lot borders / garden edges
    HOUSES.forEach((h, i) => {
      const lot = h.lotRect;
      if (!lot) return;
      const pts = [P(lot.x0, lot.y0), P(lot.x1, lot.y0), P(lot.x1, lot.y1), P(lot.x0, lot.y1)];
      polyPath(pts);
      ctx.strokeStyle = i === state.selected ? 'rgba(181,255,145,.55)' : 'rgba(213,255,195,.15)';
      ctx.lineWidth = (i === state.selected ? 2.2 : 1.3) * Math.max(0.6, v.s * 1.2);
      ctx.setLineDash(i === state.selected ? [8 * v.s, 6 * v.s] : [4 * v.s, 8 * v.s]);
      ctx.stroke();
      ctx.setLineDash([]);
    });

    drawGroundShadows(l, now);

    // selected lot glow beneath buildings
    const sel = HOUSES[state.selected];
    if (sel && sel.lotRect) {
      const lot = sel.lotRect;
      const pts = [P(lot.x0, lot.y0), P(lot.x1, lot.y0), P(lot.x1, lot.y1), P(lot.x0, lot.y1)];
      polyPath(pts);
      const pulse = 0.05 + 0.028 * Math.sin(now * 2.5);
      ctx.fillStyle = `rgba(166,255,94,${pulse})`;
      ctx.fill();
    }

    const objects = l.objects.slice().sort((a, b) => a.y - b.y);
    for (const obj of objects) {
      if (obj.kind === 'house') drawHouse(obj.house, now, obj.index === state.selected);
      else if (obj.kind === 'tree') drawTree(obj.tree, now);
    }

    drawCar(l, now);
    drawLamps(l, now);

    // hovering / selected plumbob
    drawSelection(sel, now);

    // slow moving cloud shadows
    ctx.save();
    polyPath(ground);
    ctx.clip();
    ctx.fillStyle = 'rgba(3,16,9,.10)';
    for (let i = 0; i < 3; i++) {
      const cx = ((now * (8 + i * 3) + i * 500) % (VW + 700)) - 350;
      const cy = VH * (0.2 + i * 0.28);
      ctx.beginPath();
      ctx.ellipse(cx, cy, 320 + i * 110, 90 + i * 28, -0.25, 0, TAU);
      ctx.fill();
    }
    ctx.restore();

    // edge vignette
    const vig = ctx.createRadialGradient(VW / 2, VH / 2, Math.min(VW, VH) * 0.25, VW / 2, VH / 2, Math.max(VW, VH) * 0.76);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(0,0,0,.46)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, VW, VH);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  function drawStreets(l, v) {
    const road = l.road;
    const sw = 18;
    // sidewalks
    if (road.vertical) {
      const pts = [P(road.x - sw, road.y), P(road.x + road.w + sw, road.y), P(road.x + road.w + sw, road.y + road.h), P(road.x - sw, road.y + road.h)];
      polyPath(pts); ctx.fillStyle = '#b7b19e'; ctx.fill();
      drawRoadRect(road.x, road.y, road.w, road.h, true, l);
    } else {
      const pts = [P(road.x, road.y - sw), P(road.x + road.w, road.y - sw), P(road.x + road.w, road.y + road.h + sw), P(road.x, road.y + road.h + sw)];
      polyPath(pts); ctx.fillStyle = '#b7b19e'; ctx.fill();
      drawRoadRect(road.x, road.y, road.w, road.h, false, l);
    }

    // driveways
    HOUSES.forEach(h => {
      const d = h.driveway;
      if (!d) return;
      const pts = [P(d.x0, d.y0), P(d.x1, d.y0), P(d.x1, d.y1), P(d.x0, d.y1)];
      polyPath(pts);
      ctx.fillStyle = '#9e9b8e';
      ctx.fill();
      ctx.strokeStyle = 'rgba(60,65,58,.4)';
      ctx.lineWidth = 1 * v.s;
      ctx.stroke();
    });

    // crosswalk at center
    const cx = l.W / 2, cy = l.H / 2;
    ctx.fillStyle = 'rgba(238,232,211,.72)';
    for (let i = -4; i <= 4; i++) {
      if (road.vertical) {
        const p = P(cx + i * 16, cy - 40);
        const q = P(cx + i * 16 + 8, cy + 40);
        ctx.fillRect(p.x, p.y, Math.max(2, q.x - p.x), Math.max(2, q.y - p.y));
      } else {
        const p = P(cx - 40, cy + i * 16);
        const q = P(cx + 40, cy + i * 16 + 8);
        ctx.fillRect(p.x, p.y, Math.max(2, q.x - p.x), Math.max(2, q.y - p.y));
      }
    }

    // little roundabout fountain at the intersection
    const c = P(cx, cy);
    const rx = 72 * v.s, ry = 72 * YS * v.s * 0.9;
    ctx.fillStyle = '#2b3030';
    ctx.beginPath(); ctx.ellipse(c.x, c.y, rx * 1.35, ry * 1.35, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#3d7a45';
    ctx.beginPath(); ctx.ellipse(c.x, c.y, rx, ry, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(218,255,190,.5)';
    ctx.lineWidth = 2 * v.s;
    ctx.beginPath(); ctx.ellipse(c.x, c.y, rx * 0.65, ry * 0.65, 0, 0, TAU); ctx.stroke();
    // fountain
    ctx.fillStyle = '#aeb6aa';
    ctx.beginPath(); ctx.ellipse(c.x, c.y - 2 * v.s, 18 * v.s, 9 * v.s, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#5ac1c6';
    ctx.beginPath(); ctx.ellipse(c.x, c.y - 3 * v.s, 13 * v.s, 6 * v.s, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(215,255,255,.8)';
    ctx.fillRect(c.x - 1.5 * v.s, c.y - 25 * v.s, 3 * v.s, 22 * v.s);
  }

  function drawRoadRect(x, y, w, h, vertical, l) {
    const pts = [P(x, y), P(x + w, y), P(x + w, y + h), P(x, y + h)];
    polyPath(pts);
    ctx.fillStyle = '#313839';
    ctx.fill();
    ctx.strokeStyle = 'rgba(12,18,17,.55)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // dashed center line
    ctx.setLineDash([16, 15]);
    ctx.strokeStyle = 'rgba(240,222,150,.62)';
    ctx.lineWidth = Math.max(1.5, 2 * state.mapView.s);
    ctx.beginPath();
    if (vertical) {
      const a = P(x + w / 2, y), b = P(x + w / 2, y + h);
      ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
    } else {
      const a = P(x, y + h / 2), b = P(x + w, y + h / 2);
      ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // pavement cracks
    ctx.strokeStyle = 'rgba(0,0,0,.18)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 7; i++) {
      const t = (i + 0.5) / 7;
      const px = vertical ? x + w * (0.2 + 0.6 * ((i * 7) % 5) / 5) : x + w * t;
      const py = vertical ? y + h * t : y + h * (0.2 + 0.6 * ((i * 7) % 5) / 5);
      const p = P(px, py);
      ctx.beginPath(); ctx.moveTo(p.x - 7, p.y); ctx.lineTo(p.x + 3, p.y + 2); ctx.lineTo(p.x + 9, p.y - 1); ctx.stroke();
    }
  }

  function drawGroundShadows(l, now) {
    const sun = { x: 24, y: 16 };
    for (const h of HOUSES) {
      if (h.bx0 == null) continue;
      const pts = [
        P(h.bx0 + sun.x, h.by0 + sun.y), P(h.bx1 + sun.x, h.by0 + sun.y),
        P(h.bx1 + sun.x, h.by1 + sun.y), P(h.bx0 + sun.x, h.by1 + sun.y)
      ];
      polyPath(pts);
      ctx.fillStyle = 'rgba(4,18,9,.28)';
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(4,18,9,.22)';
    for (const t of l.trees) {
      const p = P(t.x + 9, t.y + 7);
      ctx.beginPath(); ctx.ellipse(p.x, p.y, t.size * state.mapView.s * 0.9, t.size * state.mapView.s * 0.34, 0, 0, TAU); ctx.fill();
    }
  }

  function drawTree(t, now) {
    const v = state.mapView;
    const base = P(t.x, t.y, 0);
    const top = P(t.x, t.y, t.size * 1.2);
    const sway = Math.sin(now * 0.7 + t.seed) * 2 * v.s;
    ctx.strokeStyle = '#4b3522';
    ctx.lineWidth = Math.max(2, 4 * v.s);
    ctx.beginPath(); ctx.moveTo(base.x, base.y); ctx.lineTo(top.x + sway, top.y + 4 * v.s); ctx.stroke();
    const cx = top.x + sway, cy = top.y;
    const r = t.size * v.s;
    const g1 = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.35, r * 0.1, cx, cy, r);
    g1.addColorStop(0, '#7eb968');
    g1.addColorStop(0.55, '#4e8b46');
    g1.addColorStop(1, '#234b2d');
    ctx.fillStyle = g1;
    ctx.beginPath(); ctx.ellipse(cx, cy, r * 0.86, r * 1.02, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(207,255,173,.18)';
    ctx.beginPath(); ctx.ellipse(cx - r * 0.28, cy - r * 0.4, r * 0.35, r * 0.42, 0.4, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(20,61,28,.45)';
    ctx.beginPath(); ctx.ellipse(cx + r * 0.28, cy + r * 0.15, r * 0.34, r * 0.5, -0.2, 0, TAU); ctx.fill();
  }

  function drawLamps(l, now) {
    const v = state.mapView;
    for (const lamp of l.lamps) {
      const base = P(lamp.x, lamp.y, 0);
      const top = P(lamp.x, lamp.y, 52);
      ctx.strokeStyle = '#3a403c';
      ctx.lineWidth = 2 * v.s;
      ctx.beginPath(); ctx.moveTo(base.x, base.y); ctx.lineTo(top.x, top.y); ctx.stroke();
      const glow = ctx.createRadialGradient(top.x, top.y, 0, top.x, top.y, 26 * v.s);
      glow.addColorStop(0, 'rgba(255,222,146,.45)');
      glow.addColorStop(1, 'rgba(255,222,146,0)');
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(top.x, top.y, 26 * v.s, 0, TAU); ctx.fill();
      ctx.fillStyle = '#ffe3a1';
      ctx.beginPath(); ctx.arc(top.x, top.y, 2.4 * v.s, 0, TAU); ctx.fill();
    }
  }

  function drawCar(l, now) {
    const v = state.mapView;
    let t = (now * 0.045) % 2;
    let dir = 1;
    if (t > 1) { t = 2 - t; dir = -1; }
    const road = l.road;
    let wx, wy;
    if (road.vertical) {
      wx = l.W / 2 - 20 * dir;
      wy = 30 + t * (l.H - 60);
    } else {
      wx = 30 + t * (l.W - 60);
      wy = l.H / 2 + 20 * dir;
    }
    const p = P(wx, wy, 0);
    const s = v.s;
    ctx.save();
    ctx.translate(p.x, p.y);
    if (road.vertical) ctx.rotate(Math.PI / 2);
    // shadow
    ctx.fillStyle = 'rgba(0,0,0,.28)';
    ctx.beginPath(); ctx.ellipse(3 * s, 3 * s, 23 * s, 11 * s, 0, 0, TAU); ctx.fill();
    // body
    const gr = ctx.createLinearGradient(0, -11 * s, 0, 11 * s);
    gr.addColorStop(0, '#d9c04a');
    gr.addColorStop(0.5, '#b99a2e');
    gr.addColorStop(1, '#6f5714');
    ctx.fillStyle = gr;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(-23 * s, -10 * s, 46 * s, 20 * s, 5 * s);
    else ctx.rect(-23 * s, -10 * s, 46 * s, 20 * s);
    ctx.fill();
    // cabin
    ctx.fillStyle = '#a4d9df';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(-9 * s, -7 * s, 20 * s, 14 * s, 3 * s);
    else ctx.rect(-9 * s, -7 * s, 20 * s, 14 * s);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.4)';
    ctx.fillRect(-6 * s, -5 * s, 12 * s, 2 * s);
    // headlights
    ctx.fillStyle = '#fff4b0';
    ctx.beginPath(); ctx.arc(21 * s * dir, -5 * s, 1.8 * s, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(21 * s * dir, 5 * s, 1.8 * s, 0, TAU); ctx.fill();
    ctx.restore();
  }

  function drawSelection(house, now) {
    if (!house || house.bx0 == null) return;
    const v = state.mapView;
    const top = P(house.cx, house.cy, house.wallH + house.roofH + 34 + Math.sin(now * 2.2) * 5);
    const size = 16 * Math.max(0.7, v.s * 1.1);
    ctx.save();
    ctx.shadowColor = '#8dff54';
    ctx.shadowBlur = 22;
    ctx.fillStyle = '#b6ff72';
    ctx.beginPath();
    ctx.moveTo(top.x, top.y - size);
    ctx.lineTo(top.x + size * 0.68, top.y - size * 0.22);
    ctx.lineTo(top.x, top.y + size);
    ctx.lineTo(top.x - size * 0.68, top.y - size * 0.22);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,.72)';
    ctx.beginPath();
    ctx.moveTo(top.x, top.y - size);
    ctx.lineTo(top.x + size * 0.3, top.y - size * 0.35);
    ctx.lineTo(top.x, top.y - size * 0.15);
    ctx.closePath();
    ctx.fill();
    // dotted drop line
    ctx.strokeStyle = 'rgba(166,255,94,.35)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 7]);
    ctx.beginPath();
    ctx.moveTo(top.x, top.y + size);
    const b = P(house.cx, house.cy, house.wallH + house.roofH);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  function drawHouse(h, now, selected) {
    const v = state.mapView;
    const s = v.s;
    const { bx0, bx1, by0, by1, wallH, roofH } = h;
    const over = 9;
    const midY = (by0 + by1) / 2;

    // right side wall
    const sidePts = [P(bx1, by0, 0), P(bx1, by1, 0), P(bx1, by1, wallH), P(bx1, by0, wallH)];
    polyPath(sidePts);
    ctx.fillStyle = shadeColor(h.body, -40);
    ctx.fill();
    ctx.strokeStyle = 'rgba(18,12,18,.28)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    // side siding + window
    ctx.save();
    polyPath(sidePts); ctx.clip();
    ctx.strokeStyle = 'rgba(0,0,0,.12)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 6; i++) {
      const zz = wallH * i / 6;
      const a = P(bx1, by0, zz), b = P(bx1, by1, zz);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    const sx0 = bx1, sy0 = by0 + (by1 - by0) * 0.3, sy1 = sy0 + (by1 - by0) * 0.22;
    const sw0 = wallH * 0.46, sw1 = wallH * 0.76;
    polyPath([P(sx0, sy0, sw0), P(sx0, sy1, sw0), P(sx0, sy1, sw1), P(sx0, sy0, sw1)]);
    ctx.fillStyle = (h.index + 1) % 3 === 0 ? '#26343a' : '#ffd98b';
    ctx.fill();
    ctx.strokeStyle = 'rgba(50,42,40,.55)';
    ctx.stroke();
    ctx.restore();

    // back roof slope
    const backRoof = [P(bx0 - over, by0 - over, wallH), P(bx1 + over, by0 - over, wallH), P(bx1 + over, midY, wallH + roofH), P(bx0 - over, midY, wallH + roofH)];
    polyPath(backRoof);
    ctx.fillStyle = shadeColor(h.roof, -26);
    ctx.fill();
    ctx.strokeStyle = 'rgba(15,12,18,.35)';
    ctx.stroke();

    // front roof slope
    const frontRoof = [P(bx0 - over, by1 + over, wallH), P(bx1 + over, by1 + over, wallH), P(bx1 + over, midY, wallH + roofH), P(bx0 - over, midY, wallH + roofH)];
    polyPath(frontRoof);
    const roofGrad = ctx.createLinearGradient(P(bx0, by1, wallH).x, P(bx0, by1, wallH).y, P(bx1, midY, wallH + roofH).x, P(bx1, midY, wallH + roofH).y);
    roofGrad.addColorStop(0, shadeColor(h.roof, 20));
    roofGrad.addColorStop(0.6, h.roof);
    roofGrad.addColorStop(1, shadeColor(h.roof, -12));
    ctx.fillStyle = roofGrad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(12,9,14,.42)';
    ctx.lineWidth = 1.4;
    ctx.stroke();

    // roof shingle lines
    ctx.save();
    polyPath(frontRoof); ctx.clip();
    ctx.strokeStyle = 'rgba(255,255,255,.09)';
    ctx.lineWidth = 1;
    for (let i = 1; i <= 4; i++) {
      const t = i / 5;
      const yy = P(bx0, by1 + over * (1 - t * 2), 0).y;
      const y0 = P(bx0, by1, wallH).y;
      const ridge = P(bx0, midY, wallH + roofH).y;
      const lineY = lerp(y0, ridge, t);
      const a = P(bx0 - over, 0, 0), b = P(bx1 + over, 0, 0);
      ctx.beginPath(); ctx.moveTo(a.x, lineY); ctx.lineTo(b.x, lineY); ctx.stroke();
    }
    ctx.restore();

    // ridge cap
    const ridgeA = P(bx0 - over, midY, wallH + roofH);
    const ridgeB = P(bx1 + over, midY, wallH + roofH);
    ctx.strokeStyle = shadeColor(h.roof, 38);
    ctx.lineWidth = Math.max(1.6, 3 * s);
    ctx.beginPath(); ctx.moveTo(ridgeA.x, ridgeA.y); ctx.lineTo(ridgeB.x, ridgeB.y); ctx.stroke();

    // front facade
    const facade = [P(bx0, by1, 0), P(bx1, by1, 0), P(bx1, by1, wallH), P(bx0, by1, wallH)];
    polyPath(facade);
    const fh = P(bx1, by1, 0).y - P(bx1, by1, wallH).y;
    const fg = ctx.createLinearGradient(0, P(bx0, by1, wallH).y, 0, P(bx0, by1, 0).y);
    fg.addColorStop(0, shadeColor(h.body, 14));
    fg.addColorStop(0.62, h.body);
    fg.addColorStop(1, shadeColor(h.body, -22));
    ctx.fillStyle = fg;
    ctx.fill();
    ctx.strokeStyle = 'rgba(20,14,20,.28)';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // facade detail: window + door
    const faceRect = (x0, x1, z0, z1) => [P(x0, by1, z0), P(x1, by1, z0), P(x1, by1, z1), P(x0, by1, z1)];
    const hw = bx1 - bx0;
    const doorW = Math.min(20, hw * 0.16);
    const doorX = h.cx - doorW / 2 + (h.index % 2 ? -hw * 0.12 : hw * 0.12);
    const doorZ = wallH * 0.38;
    // doorway
    polyPath(faceRect(doorX - 2, doorX + doorW + 2, 0, doorZ + 3));
    ctx.fillStyle = shadeColor(h.trim, -8);
    ctx.fill();
    polyPath(faceRect(doorX, doorX + doorW, 0, doorZ));
    const dg = ctx.createLinearGradient(P(doorX, by1, 0).x, 0, P(doorX + doorW, by1, 0).x, 0);
    dg.addColorStop(0, shadeColor(h.trim, 28));
    dg.addColorStop(1, h.trim);
    ctx.fillStyle = dg; ctx.fill();
    // knob
    const knob = P(doorX + doorW - 4, by1, doorZ * 0.48);
    ctx.fillStyle = '#ffd76a';
    ctx.beginPath(); ctx.arc(knob.x, knob.y, Math.max(1.2, 1.6 * s), 0, TAU); ctx.fill();
    // windows
    const lit = (h.index + 2) % 3 !== 0;
    const winW = Math.min(28, hw * 0.19);
    const winZ0 = wallH * 0.42, winZ1 = wallH * 0.78;
    const winXs = [bx0 + hw * 0.18, bx0 + hw * 0.72];
    for (const wx of winXs) {
      if (Math.abs(wx + winW / 2 - (doorX + doorW / 2)) < winW * 0.9) continue;
      polyPath(faceRect(wx, wx + winW, winZ0, winZ1));
      ctx.fillStyle = lit ? '#ffd98b' : '#26343a';
      if (lit) {
        ctx.shadowColor = 'rgba(255,210,120,.6)';
        ctx.shadowBlur = 14 * s;
      }
      ctx.fill();
      ctx.shadowBlur = 0;
      // mullions
      const midX = P(wx + winW / 2, by1, 0).x;
      const midY = P(wx, by1, (winZ0 + winZ1) / 2).y;
      ctx.strokeStyle = shadeColor(h.trim, 18);
      ctx.lineWidth = Math.max(1, 1.5 * s);
      ctx.beginPath(); ctx.moveTo(midX, P(wx, by1, winZ0).y); ctx.lineTo(midX, P(wx, by1, winZ1).y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(P(wx, by1, 0).x, midY); ctx.lineTo(P(wx + winW, by1, 0).x, midY); ctx.stroke();
      polyPath(faceRect(wx - 1.5, wx + winW + 1.5, winZ0 - 2, winZ1 + 2));
      ctx.strokeStyle = shadeColor(h.trim, 20);
      ctx.stroke();
    }

    // porch / steps
    const porch = [P(bx0 + hw * 0.2, by1, 0), P(bx1 - hw * 0.2, by1, 0), P(bx1 - hw * 0.18, by1 + 13, 0), P(bx0 + hw * 0.18, by1 + 13, 0)];
    polyPath(porch);
    ctx.fillStyle = '#b5ae9b';
    ctx.fill();
    ctx.strokeStyle = 'rgba(50,50,44,.25)';
    ctx.stroke();

    // chimney
    const chx = bx1 - hw * 0.22;
    const chy = midY + 8;
    const chW = 15;
    const chBottom = wallH + roofH * 0.3;
    const chTop = wallH + roofH + 20;
    const chPts = [P(chx, chy, chBottom), P(chx + chW, chy, chBottom), P(chx + chW, chy, chTop), P(chx, chy, chTop)];
    polyPath(chPts);
    const chGrad = ctx.createLinearGradient(P(chx, chy, chBottom).x, 0, P(chx + chW, chy, chBottom).x, 0);
    chGrad.addColorStop(0, '#6a5145');
    chGrad.addColorStop(0.55, '#574136');
    chGrad.addColorStop(1, '#372b24');
    ctx.fillStyle = chGrad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(15,10,14,.4)';
    ctx.stroke();
    // chimney brick courses
    ctx.strokeStyle = 'rgba(0,0,0,.18)';
    ctx.lineWidth = 0.8;
    for (let i = 1; i < 4; i++) {
      const zz = lerp(chBottom, chTop, i / 4);
      const a = P(chx, chy, zz), b = P(chx + chW, chy, zz);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    // chimney cap
    const capPts = [P(chx - 2, chy - 3, chTop), P(chx + chW + 2, chy - 3, chTop), P(chx + chW + 2, chy + 3, chTop + 3), P(chx - 2, chy + 3, chTop + 3)];
    polyPath(capPts);
    ctx.fillStyle = '#8b6e5a';
    ctx.fill();

    // steps / path
    const path = [P(doorX - 3, by1, 0), P(doorX + doorW + 3, by1, 0), P(doorX + doorW + 7, by1 + 30, 0), P(doorX - 7, by1 + 30, 0)];
    polyPath(path);
    ctx.fillStyle = 'rgba(193,187,171,.66)';
    ctx.fill();

    // number plaque
    const plate = P(doorX + doorW / 2, by1, doorZ + 3.5);
    ctx.font = `700 ${Math.max(5, 7 * s)}px "DejaVu Sans Mono", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = shadeColor(h.trim, 45);
    ctx.fillText(h.lot, plate.x, plate.y);

    // cleared flag
    if (state.cleared.has(h.id)) {
      const flag = P(bx0 + 8, by1 + 6, wallH + 24);
      ctx.strokeStyle = 'rgba(210,255,200,.8)';
      ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(flag.x, flag.y); ctx.lineTo(flag.x, flag.y + 12 * s); ctx.stroke();
      ctx.fillStyle = '#8dff54';
      ctx.shadowColor = '#8dff54'; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.moveTo(flag.x, flag.y); ctx.lineTo(flag.x + 11 * s, flag.y + 3 * s); ctx.lineTo(flag.x, flag.y + 6 * s); ctx.closePath(); ctx.fill();
      ctx.shadowBlur = 0;
    }

    // selected pulse outline on roof
    if (selected) {
      ctx.save();
      polyPath(frontRoof);
      ctx.strokeStyle = `rgba(180,255,130,${0.25 + 0.2 * Math.sin(now * 3)})`;
      ctx.lineWidth = Math.max(1.5, 2.5 * s);
      ctx.stroke();
      ctx.restore();
    }
  }

  function shadeColor(hexColor, amt) {
    const [r, g, b] = hex(hexColor);
    return `rgb(${clamp(r + amt, 0, 255)},${clamp(g + amt, 0, 255)},${clamp(b + amt, 0, 255)})`;
  }

  function hitHouse(px, py) {
    if (!state.mapView) return -1;
    for (let i = HOUSES.length - 1; i >= 0; i--) {
      const h = HOUSES[i];
      if (!h.lotRect) continue;
      const lot = h.lotRect;
      const pts = [P(lot.x0, lot.y0), P(lot.x1, lot.y0), P(lot.x1, lot.y1), P(lot.x0, lot.y1)];
      if (pointInPoly(px, py, pts)) return i;
    }
    return -1;
  }

  function pointInPoly(x, y, pts) {
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const xi = pts[i].x, yi = pts[i].y, xj = pts[j].x, yj = pts[j].y;
      const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  // more code appended below...

  // ============================================================ FIRST-PERSON RENDERER
  const FOV_PLANE = Math.tan(33 * Math.PI / 180);
  const FOG_STYLES = Array.from({ length: 32 }, (_, i) => `rgba(0,0,0,${(i / 31 * 0.9).toFixed(3)})`);

  function renderFloorCeiling(level, player) {
    const size = level.floor.size;
    const floor = level.floor.data;
    const ceil = level.ceil.data;
    const horizon = RH / 2;
    const dirX = Math.cos(player.a);
    const dirY = Math.sin(player.a);
    const planeX = -dirY * FOV_PLANE;
    const planeY = dirX * FOV_PLANE;
    const rayX0 = dirX - planeX;
    const rayY0 = dirY - planeY;
    const rayX1 = dirX + planeX;
    const rayY1 = dirY + planeY;
    const [fr, fg, fb] = hex(level.theme.fog);
    const farColor = pack(fr, fg, fb);
    const block = 2;

    for (let y = 0; y < RH; y += block) {
      const delta = y - horizon;
      const isFloor = delta >= 0;
      if (Math.abs(delta) < 1) continue;
      const rowDist = (0.5 * RH) / Math.abs(delta);
      const fog = clamp(rowDist / 26, 0, 1);
      if (rowDist > 32) {
        for (let dy = 0; dy < block && y + dy < RH; dy++) {
          const off = (y + dy) * RW;
          for (let x = 0; x < RW; x++) fbuf[off + x] = farColor;
        }
        continue;
      }
      const stepX = rowDist * (rayX1 - rayX0) / RW;
      const stepY = rowDist * (rayY1 - rayY0) / RW;
      let wx = player.x + rowDist * rayX0;
      let wy = player.y + rowDist * rayY0;
      const tex = isFloor ? floor : ceil;
      const shade = clamp(1 - rowDist / (isFloor ? 24 : 17), isFloor ? 0.2 : 0.12, 1);
      const t = isFloor ? 0 : 1;
      for (let x = 0; x < RW; x += block) {
        const tx = (wx * size) & (size - 1);
        const ty = (wy * size) & (size - 1);
        const col = tex[(ty << 6) + tx];
        let r = (col & 255) * shade;
        let g = ((col >> 8) & 255) * shade;
        let b = ((col >> 16) & 255) * shade;
        r = r * (1 - fog) + fr * fog;
        g = g * (1 - fog) + fg * fog;
        b = b * (1 - fog) + fb * fog;
        const out = pack(r | 0, g | 0, b | 0);
        const off = y * RW + x;
        for (let dy = 0; dy < block && y + dy < RH; dy++) {
          const o = off + dy * RW;
          for (let dx = 0; dx < block && x + dx < RW; dx++) fbuf[o + dx] = out;
        }
        wx += stepX * block;
        wy += stepY * block;
      }
    }
    ctx.putImageData(frame, 0, 0);
  }

  function renderWalls(level, player) {
    const dirX = Math.cos(player.a);
    const dirY = Math.sin(player.a);
    const planeX = -dirY * FOV_PLANE;
    const planeY = dirX * FOV_PLANE;
    const horizon = RH / 2;
    ctx.imageSmoothingEnabled = false;

    for (let x = 0; x < RW; x++) {
      const cameraX = 2 * x / RW - 1;
      const rayX = dirX + planeX * cameraX;
      const rayY = dirY + planeY * cameraX;
      let mapX = Math.floor(player.x);
      let mapY = Math.floor(player.y);
      const deltaX = Math.abs(1 / (rayX || 1e-9));
      const deltaY = Math.abs(1 / (rayY || 1e-9));
      let stepX, stepY, sideX, sideY;
      if (rayX < 0) { stepX = -1; sideX = (player.x - mapX) * deltaX; }
      else { stepX = 1; sideX = (mapX + 1 - player.x) * deltaX; }
      if (rayY < 0) { stepY = -1; sideY = (player.y - mapY) * deltaY; }
      else { stepY = 1; sideY = (mapY + 1 - player.y) * deltaY; }
      let side = 0, hit = false, guard = 0;
      while (!hit && guard++ < 160) {
        if (sideX < sideY) { sideX += deltaX; mapX += stepX; side = 0; }
        else { sideY += deltaY; mapY += stepY; side = 1; }
        if (mapX < 0 || mapY < 0 || mapX >= level.W || mapY >= level.H) { hit = true; break; }
        hit = level.grid[mapY * level.W + mapX] !== 0;
      }
      let perp = side === 0 ? sideX - deltaX : sideY - deltaY;
      if (!Number.isFinite(perp) || perp < 0.0001) perp = 0.0001;
      zbuf[x] = perp;
      if (!hit) continue;

      const lineH = RH / perp;
      const start = horizon - lineH / 2;
      let wallX = side === 0 ? player.y + perp * rayY : player.x + perp * rayX;
      wallX -= Math.floor(wallX);
      let texX = Math.floor(wallX * 64);
      if ((side === 0 && rayX > 0) || (side === 1 && rayY < 0)) texX = 63 - texX;
      const tex = level.wallTextures[(mapX * 3 + mapY * 5 + side) & 1];
      ctx.drawImage(tex, texX, 0, 1, 64, x, start, 1.04, lineH);
      const fog = clamp((perp - 3.2) / 21, 0, 1) * 0.88 + (side === 1 ? 0.07 : 0);
      if (fog > 0.015) {
        ctx.fillStyle = FOG_STYLES[clamp(Math.floor(fog * 31), 0, 31)];
        ctx.fillRect(x, start, 1.04, lineH);
      }
    }
  }

  function spriteVisible(e, level) {
    return e.x >= 0 && e.y >= 0 && e.x < level.W && e.y < level.H;
  }

  function renderSprites(level, player, now) {
    const list = [];
    for (const e of level.enemies) {
      if (!e.alive && e.deadT <= 0) continue;
      list.push({ kind: 'enemy', ref: e, x: e.x, y: e.y, dist: dist2(e.x, e.y, player.x, player.y), worldH: e.worldH, z: e.type === 'wraith' ? 0.28 + Math.sin(now * 2 + e.phase) * 0.08 : 0, tex: SPRITES.monsters[e.type], frame: Math.floor(now * 5 + e.phase) % 2, alpha: e.alive ? 1 : clamp(e.deadT, 0, 1), ratio: 0.8 });
    }
    for (const item of level.items) {
      if (item.taken) continue;
      list.push({ kind: 'item', ref: item, x: item.x, y: item.y, dist: dist2(item.x, item.y, player.x, player.y), worldH: 0.78, z: 0.16 + Math.sin(now * 2.2 + item.phase) * 0.045, tex: SPRITES.items[item.type], frame: Math.floor(now * 2 + item.phase) % 4, alpha: 1, ratio: 0.75 });
    }
    if (!level.exitTaken) {
      list.push({ kind: 'exit', ref: level, x: level.exit.x, y: level.exit.y, dist: dist2(level.exit.x, level.exit.y, player.x, player.y), worldH: 2.2, z: 0, tex: SPRITES.items.exit, frame: Math.floor(now * 4) % 4, alpha: 1, ratio: 0.75 });
    }
    for (const p of level.props) {
      list.push({ kind: 'prop', ref: p, x: p.x, y: p.y, dist: dist2(p.x, p.y, player.x, player.y), worldH: p.type === 'lamp' ? 1.35 : 0.9, z: 0, tex: SPRITES.items[p.type], frame: 0, alpha: 1, ratio: 0.75 });
    }
    for (const item of level.items) if (item.taken) continue;
    list.sort((a, b) => b.dist - a.dist);

    const dirX = Math.cos(player.a);
    const dirY = Math.sin(player.a);
    const planeX = -dirY * FOV_PLANE;
    const planeY = dirX * FOV_PLANE;
    const horizon = RH / 2;
    const invDet = 1 / (planeX * dirY - dirX * planeY);
    ctx.imageSmoothingEnabled = false;

    for (const o of list) {
      const sx = o.x - player.x;
      const sy = o.y - player.y;
      const transformX = invDet * (dirY * sx - dirX * sy);
      const transformY = invDet * (-planeY * sx + planeX * sy);
      if (transformY <= 0.15) continue;
      const screenX = (RW / 2) * (1 + transformX / transformY);
      const h = (o.worldH * RH / transformY);
      const w = h * o.ratio;
      if (screenX + w / 2 < 0 || screenX - w / 2 > RW) continue;
      const bottom = horizon + ((0.5 - o.z) * RH / transformY);
      const top = bottom - h;
      const tex = o.tex[o.frame % o.tex.length];
      const left = screenX - w / 2;
      const startX = Math.max(0, Math.floor(left));
      const endX = Math.min(RW - 1, Math.ceil(left + w));
      if (endX < startX) continue;

      ctx.globalAlpha = o.alpha;
      let runStart = -1;
      for (let x = startX; x <= endX; x++) {
        const visible = x >= 0 && x < RW && transformY < zbuf[x];
        if (visible && runStart < 0) runStart = x;
        if ((!visible || x === endX) && runStart >= 0) {
          const runEnd = visible && x === endX ? x : x - 1;
          const tx0 = clamp(Math.floor((runStart - left) / w * tex.width), 0, tex.width - 1);
          const tx1 = clamp(Math.ceil((runEnd + 1 - left) / w * tex.width), tx0 + 1, tex.width);
          ctx.drawImage(tex, tx0, 0, tx1 - tx0, tex.height, runStart, top, runEnd - runStart + 1, h);
          runStart = -1;
        }
      }
      ctx.globalAlpha = 1;
    }
  }

  function drawCrosshair(player, now) {
    const cx = RW / 2, cy = RH / 2;
    const spread = 5 + (player.muzzle > 0 ? 5 : 0);
    ctx.save();
    ctx.strokeStyle = player.hitMarker > 0 ? '#ff6a48' : 'rgba(196,255,158,.8)';
    ctx.lineWidth = Math.max(1, RW / 900);
    ctx.shadowColor = player.hitMarker > 0 ? '#ff3b20' : '#9dff62';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.moveTo(cx - spread - 5, cy); ctx.lineTo(cx - spread, cy);
    ctx.moveTo(cx + spread, cy); ctx.lineTo(cx + spread + 5, cy);
    ctx.moveTo(cx, cy - spread - 5); ctx.lineTo(cx, cy - spread);
    ctx.moveTo(cx, cy + spread); ctx.lineTo(cx, cy + spread + 5);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx, cy - 1.4); ctx.lineTo(cx + 1.4, cy); ctx.lineTo(cx, cy + 1.4); ctx.lineTo(cx - 1.4, cy); ctx.closePath();
    ctx.fillStyle = ctx.strokeStyle;
    ctx.fill();
    if (player.hitMarker > 0) {
      ctx.globalAlpha = clamp(player.hitMarker * 6, 0, 1);
      ctx.strokeStyle = '#ff7d5e';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - 10, cy - 10); ctx.lineTo(cx - 5, cy - 5);
      ctx.moveTo(cx + 10, cy - 10); ctx.lineTo(cx + 5, cy - 5);
      ctx.moveTo(cx - 10, cy + 10); ctx.lineTo(cx - 5, cy + 5);
      ctx.moveTo(cx + 10, cy + 10); ctx.lineTo(cx + 5, cy + 5);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawWeapon(player, now) {
    const s = clamp(Math.min(RW / 700, RH / 560), 0.7, 1.16);
    const moving = player.moveAmount || 0;
    const bobX = Math.sin(player.bob * 0.9) * 5 * s * moving;
    const bobY = Math.abs(Math.cos(player.bob * 0.9)) * 6 * s * moving;
    const recoil = player.recoil || 0;
    const cx = RW / 2 + 70 * s + bobX;
    const base = RH + 8 * s + bobY + recoil * 22 * s;
    ctx.save();
    ctx.translate(cx, base);
    ctx.rotate(-0.035 + recoil * 0.018);

    // left supporting forearm
    const armGrad = ctx.createLinearGradient(-90 * s, -160 * s, -10 * s, -30 * s);
    armGrad.addColorStop(0, '#1c4031');
    armGrad.addColorStop(0.55, '#122c21');
    armGrad.addColorStop(1, '#071911');
    ctx.fillStyle = armGrad;
    ctx.beginPath();
    ctx.moveTo(-98 * s, 30 * s);
    ctx.lineTo(-76 * s, -120 * s);
    ctx.lineTo(-40 * s, -160 * s);
    ctx.lineTo(-9 * s, -126 * s);
    ctx.lineTo(-18 * s, 30 * s);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(166,255,94,.16)';
    ctx.lineWidth = 1.3 * s;
    ctx.stroke();

    // supporting hand
    ctx.fillStyle = '#bd8a64';
    ctx.beginPath(); ctx.ellipse(-24 * s, -101 * s, 24 * s, 18 * s, -0.35, 0, TAU); ctx.fill();
    ctx.fillStyle = '#9e6f4e';
    for (let i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.ellipse(-35 * s + i * 6 * s, -111 * s, 5 * s, 10 * s, 0.2, 0, TAU); ctx.fill();
    }

    // main receiver - angular instead of bottle-round
    const metal = ctx.createLinearGradient(-36 * s, -202 * s, 36 * s, -80 * s);
    metal.addColorStop(0, '#8e9e93');
    metal.addColorStop(0.28, '#556760');
    metal.addColorStop(0.68, '#2b3a34');
    metal.addColorStop(1, '#131e19');
    ctx.fillStyle = metal;
    ctx.beginPath();
    ctx.moveTo(-25 * s, -196 * s);
    ctx.lineTo(25 * s, -196 * s);
    ctx.lineTo(37 * s, -150 * s);
    ctx.lineTo(32 * s, -96 * s);
    ctx.lineTo(17 * s, -78 * s);
    ctx.lineTo(-17 * s, -78 * s);
    ctx.lineTo(-32 * s, -96 * s);
    ctx.lineTo(-37 * s, -150 * s);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(210,255,195,.28)';
    ctx.lineWidth = 1.2 * s;
    ctx.stroke();

    // barrel + muzzle ring
    ctx.fillStyle = '#1d2a25';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(-11 * s, -244 * s, 22 * s, 52 * s, 3 * s);
    else ctx.rect(-11 * s, -244 * s, 22 * s, 52 * s);
    ctx.fill();
    ctx.strokeStyle = 'rgba(166,255,94,.3)';
    ctx.stroke();
    ctx.fillStyle = '#42554c';
    ctx.beginPath(); ctx.ellipse(0, -244 * s, 12 * s, 5 * s, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#0a110e';
    ctx.beginPath(); ctx.ellipse(0, -244 * s, 7 * s, 2.6 * s, 0, 0, TAU); ctx.fill();

    // receiver vents
    ctx.strokeStyle = 'rgba(215,255,205,.18)';
    ctx.lineWidth = 1.4 * s;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(-24 * s, (-159 + i * 11) * s);
      ctx.lineTo(-9 * s, (-162 + i * 11) * s);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(24 * s, (-159 + i * 11) * s);
      ctx.lineTo(9 * s, (-162 + i * 11) * s);
      ctx.stroke();
    }

    // plumbob canister on the right shoulder
    ctx.save();
    ctx.translate(26 * s, -126 * s);
    ctx.shadowColor = '#8dff54';
    ctx.shadowBlur = 18 * s;
    const core = ctx.createLinearGradient(-13 * s, -24 * s, 13 * s, 24 * s);
    core.addColorStop(0, '#f2ffcb');
    core.addColorStop(0.45, '#9dff62');
    core.addColorStop(1, '#2f8a20');
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.moveTo(0, -25 * s); ctx.lineTo(15 * s, 0); ctx.lineTo(0, 25 * s); ctx.lineTo(-15 * s, 0); ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = 'rgba(163,255,122,.35)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(26 * s, -126 * s, 18 * s, -1.1, 1.1); ctx.stroke();

    // grip
    ctx.fillStyle = '#111a16';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(-17 * s, -104 * s, 34 * s, 64 * s, 4 * s);
    else ctx.rect(-17 * s, -104 * s, 34 * s, 64 * s);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.1)';
    ctx.stroke();
    for (let i = 0; i < 4; i++) {
      ctx.strokeStyle = 'rgba(130,160,140,.18)';
      ctx.beginPath(); ctx.moveTo(-13 * s, (-94 + i * 12) * s); ctx.lineTo(13 * s, (-94 + i * 12) * s); ctx.stroke();
    }

    // firing hand on grip
    ctx.fillStyle = '#c08d68';
    ctx.beginPath(); ctx.ellipse(4 * s, -62 * s, 25 * s, 20 * s, -0.15, 0, TAU); ctx.fill();
    ctx.fillStyle = '#a57251';
    ctx.beginPath(); ctx.ellipse(-9 * s, -75 * s, 8 * s, 14 * s, 0.3, 0, TAU); ctx.fill();
    ctx.fillStyle = '#d6a47c';
    ctx.beginPath(); ctx.ellipse(16 * s, -55 * s, 8 * s, 12 * s, -0.25, 0, TAU); ctx.fill();

    // trigger guard
    ctx.strokeStyle = '#28352f';
    ctx.lineWidth = 3 * s;
    ctx.beginPath(); ctx.arc(0, -92 * s, 13 * s, 0, Math.PI); ctx.stroke();

    // muzzle glow
    if (player.muzzle > 0) {
      const m = clamp(player.muzzle / 0.12, 0, 1);
      ctx.save();
      ctx.translate(0, -248 * s);
      ctx.globalCompositeOperation = 'lighter';
      const flash = ctx.createRadialGradient(0, 0, 0, 0, 0, 64 * s * m);
      flash.addColorStop(0, 'rgba(255,255,225,.98)');
      flash.addColorStop(0.22, 'rgba(190,255,110,.95)');
      flash.addColorStop(0.55, 'rgba(120,230,55,.4)');
      flash.addColorStop(1, 'rgba(120,230,55,0)');
      ctx.fillStyle = flash;
      ctx.beginPath(); ctx.arc(0, 0, 64 * s * m, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,220,.9)';
      ctx.lineWidth = 2 * s;
      for (let i = 0; i < 5; i++) {
        ctx.save(); ctx.rotate(i * TAU / 5 + now * 3);
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(36 * s * m, 0); ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
    }

    ctx.restore();
  }

  // ============================================================ FPS LOGIC
  function castWall(px, py, dx, dy, maxDist = 40) {
    const mapX = Math.floor(px), mapY = Math.floor(py);
    const deltaX = Math.abs(1 / (dx || 1e-9));
    const deltaY = Math.abs(1 / (dy || 1e-9));
    let stepX, stepY, sideX, sideY;
    let mx = mapX, my = mapY;
    if (dx < 0) { stepX = -1; sideX = (px - mx) * deltaX; }
    else { stepX = 1; sideX = (mx + 1 - px) * deltaX; }
    if (dy < 0) { stepY = -1; sideY = (py - my) * deltaY; }
    else { stepY = 1; sideY = (my + 1 - py) * deltaY; }
    let side = 0;
    for (let i = 0; i < 200; i++) {
      if (sideX < sideY) { sideX += deltaX; mx += stepX; side = 0; }
      else { sideY += deltaY; my += stepY; side = 1; }
      if (mx < 0 || my < 0 || mx >= state.level.W || my >= state.level.H) return maxDist;
      if (state.level.grid[my * state.level.W + mx] !== 0) return side === 0 ? sideX - deltaX : sideY - deltaY;
      if ((side === 0 ? sideX : sideY) > maxDist) return maxDist;
    }
    return maxDist;
  }

  function blocked(x, y, radius = 0.22) {
    const l = state.level;
    const x0 = Math.floor(x - radius), x1 = Math.floor(x + radius);
    const y0 = Math.floor(y - radius), y1 = Math.floor(y + radius);
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        if (tx < 0 || ty < 0 || tx >= l.W || ty >= l.H) return true;
        if (l.grid[ty * l.W + tx] !== 0) return true;
      }
    }
    return false;
  }

  function shoot() {
    const p = state.player, l = state.level;
    if (!p || p.fireCd > 0) return;
    if (p.ammo <= 0) {
      p.fireCd = 0.35;
      audio.dryFire();
      showToast('No plumbum left. Find a blue cell.', 1400, false);
      return;
    }
    p.ammo--;
    p.fireCd = 0.27;
    p.muzzle = 0.12;
    p.recoil = 1;
    audio.shoot();
    const dirX = Math.cos(p.a), dirY = Math.sin(p.a);
    const wallDist = castWall(p.x, p.y, dirX, dirY, 30);
    let best = null, bestDist = wallDist;
    for (const e of l.enemies) {
      if (!e.alive) continue;
      const dx = e.x - p.x, dy = e.y - p.y;
      const d = Math.hypot(dx, dy);
      if (d >= bestDist) continue;
      const ang = Math.abs(angleDiff(Math.atan2(dy, dx), p.a));
      const threshold = Math.atan2(e.radius * 1.45, Math.max(0.35, d));
      if (ang < threshold) { best = e; bestDist = d; }
    }
    if (best) {
      best.hp -= 34;
      best.hitFlash = 0.18;
      p.hitMarker = 0.14;
      audio.hit();
      if (best.hp <= 0) {
        best.alive = false;
        best.deadT = 1;
        l.kills++;
        audio.tone(80, 0.28, 'sawtooth', 0.09, -50);
      }
    }
  }

  function damagePlayer(amount) {
    const p = state.player;
    if (!p) return;
    if ((p.hurtCd || 0) > 0) return;
    p.hurtCd = 0.5;
    p.health = Math.max(0, p.health - amount);
    D.damageFlash.classList.add('hit');
    setTimeout(() => D.damageFlash.classList.remove('hit'), 70);
    canvas.classList.add('shake');
    setTimeout(() => canvas.classList.remove('shake'), 220);
    audio.hurt();
    if (p.health <= 0 && state.mode === 'playing') finishLevel(false);
  }

  function collectItem(item) {
    const p = state.player;
    item.taken = true;
    if (item.type === 'health') {
      p.health = Math.min(100, p.health + 26);
      showToast('+26 HEALTH — tastes like ambrosia.', 1700);
    } else {
      p.ammo = Math.min(60, p.ammo + 10);
      showToast('+10 PLUMBUM', 1300);
    }
    audio.pickup();
  }

  function takeKey() {
    const l = state.level, p = state.player;
    if (l.hasKey) return;
    l.hasKey = true;
    p.hasKey = true;
    D.keyToast.classList.add('show');
    setTimeout(() => D.keyToast.classList.remove('show'), 2600);
    D.objectiveText.textContent = 'Escape through the portal.';
    audio.key();
  }

  function updateLevel(dt, now) {
    const p = state.player, l = state.level;
    if (!p || !l) return;
    l.time += dt;

    // rotation
    let turn = 0;
    if (input.keys['ArrowLeft'] || input.keys['KeyQ']) turn -= 1;
    if (input.keys['ArrowRight'] || input.keys['KeyE']) turn += 1;
    p.a += turn * 2.35 * dt;
    if (state.tilt.enabled) p.a += state.tilt.yaw * dt;

    // movement
    let fwd = 0, strafe = 0;
    if (input.keys['KeyW'] || input.keys['ArrowUp']) fwd += 1;
    if (input.keys['KeyS'] || input.keys['ArrowDown']) fwd -= 1;
    if (input.keys['KeyA']) strafe -= 1;
    if (input.keys['KeyD']) strafe += 1;
    fwd += input.joyY;
    strafe += input.joyX;
    const mag = Math.hypot(fwd, strafe);
    if (mag > 1) { fwd /= mag; strafe /= mag; }
    const moving = Math.min(1, Math.hypot(fwd, strafe));
    p.moveAmount = lerp(p.moveAmount || 0, moving, Math.min(1, dt * 12));
    p.bob += dt * (1.7 + moving * 7.5);
    const speed = 2.55;
    const dirX = Math.cos(p.a), dirY = Math.sin(p.a);
    const rightX = -dirY, rightY = dirX;
    const mx = (dirX * fwd + rightX * strafe) * speed * dt;
    const my = (dirY * fwd + rightY * strafe) * speed * dt;
    if (mx || my) {
      if (!blocked(p.x + mx, p.y, 0.2)) p.x += mx;
      if (!blocked(p.x, p.y + my, 0.2)) p.y += my;
    }

    // weapon timers
    p.fireCd = Math.max(0, p.fireCd - dt);
    p.hurtCd = Math.max(0, (p.hurtCd || 0) - dt);
    p.muzzle = Math.max(0, p.muzzle - dt);
    p.recoil = Math.max(0, p.recoil - dt * 6.5);
    p.hitMarker = Math.max(0, p.hitMarker - dt);
    if (input.firing && p.fireCd <= 0) shoot();

    // collectibles
    for (const item of l.items) {
      if (item.taken) continue;
      if (dist2(p.x, p.y, item.x, item.y) < 0.48 * 0.48) collectItem(item);
    }
    if (!l.hasKey && dist2(p.x, p.y, l.key.x, l.key.y) < 0.62 * 0.62) takeKey();

    // exit
    if (!l.exitTaken && dist2(p.x, p.y, l.exit.x, l.exit.y) < 0.8 * 0.8) {
      if (l.hasKey) {
        finishLevel(true);
        return;
      } else if (!p.lockMsg || now - p.lockMsg > 2.8) {
        p.lockMsg = now;
        showToast('LOCKED. Find the house key first.', 1700, true);
        audio.dryFire();
      }
    }

    // enemies
    for (const e of l.enemies) {
      if (!e.alive) {
        e.deadT = Math.max(0, e.deadT - dt * 0.75);
        continue;
      }
      e.phase += dt * (1.5 + e.speed);
      e.cooldown -= dt;
      e.attackT = Math.max(0, e.attackT - dt);
      e.hitFlash = Math.max(0, e.hitFlash - dt);
      const dx = p.x - e.x, dy = p.y - e.y;
      const d = Math.hypot(dx, dy);
      if (d > 0.001 && d < 11.5) {
        const visible = d < 1.8 || castWall(e.x, e.y, dx / d, dy / d, d) >= d - 0.12;
        if (visible && e.attackT <= 0) {
          if (d > 1.1) {
            let vx = dx / d, vy = dy / d;
            // slight separation from other enemies
            for (const o of l.enemies) {
              if (o === e || !o.alive) continue;
              const ox = e.x - o.x, oy = e.y - o.y;
              const od = Math.hypot(ox, oy);
              if (od > 0.001 && od < 0.85) { vx += (ox / od) * 0.55; vy += (oy / od) * 0.55; }
            }
            const vmag = Math.hypot(vx, vy) || 1;
            vx /= vmag; vy /= vmag;
            const step = e.speed * dt;
            if (!blocked(e.x + vx * step, e.y, e.radius)) e.x += vx * step;
            if (!blocked(e.x, e.y + vy * step, e.radius)) e.y += vy * step;
          } else if (e.cooldown <= 0) {
            e.cooldown = 1.35 + Math.random() * 0.65;
            e.attackT = 0.32;
            damagePlayer(e.damage);
          }
        }
      }
    }

    // HUD
    updateHud();
    drawMinimap();
  }

  function updateHud() {
    const p = state.player;
    if (!p) return;
    const hp = Math.ceil(p.health);
    D.healthVal.textContent = hp;
    D.healthBar.style.width = `${clamp(p.health, 0, 100)}%`;
    D.ammoVal.textContent = p.ammo;
    D.ammoBar.style.width = `${clamp(p.ammo / 60 * 100, 0, 100)}%`;
    D.healthBar.parentElement.parentElement.classList.toggle('low', p.health <= 30);
    D.fireBtn.classList.toggle('empty', p.ammo <= 0);
  }

  function drawMinimap() {
    const l = state.level, p = state.player;
    if (!l || !p) return;
    const size = 128;
    mctx.clearRect(0, 0, size, size);
    mctx.fillStyle = 'rgba(4,16,10,.8)';
    mctx.fillRect(0, 0, size, size);
    const pad = 8;
    const scale = Math.min((size - pad * 2) / l.W, (size - pad * 2) / l.H);
    const ox = (size - l.W * scale) / 2;
    const oy = (size - l.H * scale) / 2;
    mctx.fillStyle = '#123220';
    for (let y = 0; y < l.H; y++) {
      for (let x = 0; x < l.W; x++) {
        if (l.grid[y * l.W + x] !== 0) mctx.fillRect(ox + x * scale, oy + y * scale, scale + 0.4, scale + 0.4);
      }
    }
    // key
    if (!l.hasKey) {
      mctx.fillStyle = '#ffd166';
      mctx.shadowColor = '#ffd166'; mctx.shadowBlur = 6;
      mctx.beginPath(); mctx.arc(ox + l.key.x * scale, oy + l.key.y * scale, 2.5, 0, TAU); mctx.fill();
      mctx.shadowBlur = 0;
    }
    // exit
    mctx.fillStyle = '#8dff54';
    mctx.shadowColor = '#8dff54'; mctx.shadowBlur = 7;
    mctx.beginPath(); mctx.arc(ox + l.exit.x * scale, oy + l.exit.y * scale, 2.6 + Math.sin(l.time * 4) * 0.6, 0, TAU); mctx.fill();
    mctx.shadowBlur = 0;
    // enemies
    mctx.fillStyle = 'rgba(255,82,60,.8)';
    for (const e of l.enemies) if (e.alive) mctx.fillRect(ox + e.x * scale - 1, oy + e.y * scale - 1, 2, 2);
    // player
    mctx.save();
    mctx.translate(ox + p.x * scale, oy + p.y * scale);
    mctx.rotate(p.a + Math.PI / 2);
    mctx.fillStyle = '#b6ff72';
    mctx.shadowColor = '#a6ff5e'; mctx.shadowBlur = 8;
    mctx.beginPath(); mctx.moveTo(0, -5); mctx.lineTo(4, 4); mctx.lineTo(0, 2); mctx.lineTo(-4, 4); mctx.closePath(); mctx.fill();
    mctx.restore();
  }

  // ============================================================ UI / FLOW
  const input = {
    keys: {},
    firing: false,
    joyX: 0, joyY: 0,
    joyPointer: null,
    lookPointer: null,
    lastX: 0, lastY: 0
  };

  let toastTimer = 0, mapToastTimer = 0;
  function showToast(text, ms = 2100, gold = false) {
    const el = (state.mode === 'map' || state.mode === 'splash') ? D.mapToast : D.toast;
    if (!el) return;
    el.textContent = text;
    el.classList.toggle('gold', gold);
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), ms);
  }

  function saveCleared() {
    try { localStorage.setItem('strangeville.cleared', JSON.stringify([...state.cleared])); } catch (_) {}
  }

  function updateCard() {
    const h = HOUSES[state.selected];
    if (!h) return;
    D.houseName.textContent = h.name;
    D.familyName.textContent = h.family;
    D.houseTagline.textContent = h.tagline;
    D.lotNo.textContent = `LOT ${h.lot}`;
    D.levelName.textContent = h.levelName;
    D.statEnemies.textContent = 4 + h.threat;
    D.threatPips.innerHTML = '';
    for (let i = 0; i < 5; i++) {
      const pip = document.createElement('i');
      if (i < h.threat) pip.className = 'on';
      D.threatPips.appendChild(pip);
    }
    const cleared = state.cleared.has(h.id);
    D.lotCard.classList.toggle('cleared', cleared);
    D.enterBtn.querySelector('span').textContent = cleared ? 'REPLAY HOUSE' : 'ENTER HOUSE';
    D.clearedCount.textContent = `${state.cleared.size}/${HOUSES.length}`;
    D.funds.textContent = (6660 + state.cleared.size * 500).toLocaleString('en-US');
  }

  function setMode(mode) {
    state.mode = mode;
    document.body.dataset.state = mode;
    if (mode === 'map') {
      state.hover = -1;
      updateMapView();
      updateCard();
      audio.stopAmbient();
      canvas.style.cursor = 'default';
      resetInput();
    } else if (mode === 'playing') {
      updateMapView();
      resetInput();
      audio.startAmbient(state.level ? state.level.themeKey : 'goth');
    } else if (mode === 'paused') {
      resetInput();
      audio.stopAmbient();
    } else if (mode === 'splash') {
      audio.stopAmbient();
    }
  }

  function resetInput() {
    input.keys = {};
    input.firing = false;
    input.joyX = 0;
    input.joyY = 0;
    input.joyPointer = null;
    input.lookPointer = null;
    D.moveStick.style.transform = 'translate(0px, 0px)';
    D.moveStick.querySelector('i').style.transform = 'translate(0px, 0px)';
    D.fireBtn.classList.remove('down');
  }

  function spawnFacing(l) {
    let best = l.angle, bestScore = -Infinity;
    for (let i = 0; i < 32; i++) {
      const a = i / 32 * TAU;
      const d = castWall(l.start.x, l.start.y, Math.cos(a), Math.sin(a), 16);
      const score = Math.min(d, 12) + Math.cos(angleDiff(a, l.angle)) * 2.2;
      if (score > bestScore) { bestScore = score; best = a; }
    }
    return best;
  }

  function enterHouse(index) {
    audio.init();
    audio.resume();
    state.selected = index;
    const h = HOUSES[index];
    const level = generateLevel(h);
    level.startedAt = nowSec();
    state.level = level;
    const facing = spawnFacing(level);
    state.player = {
      x: level.start.x, y: level.start.y, a: facing,
      health: 100, ammo: 24, hasKey: false,
      fireCd: 0, muzzle: 0, recoil: 0, hitMarker: 0,
      bob: 0, moveAmount: 0, lockMsg: 0, hurtCd: 0
    };
    D.levelHeader.textContent = `LOT ${h.lot} · ${h.name.toUpperCase()}`;
    D.objectiveText.textContent = 'Find the house key.';
    D.keyToast.classList.remove('show');
    D.damageFlash.classList.remove('hit');
    updateHud();
    drawMinimap();
    setMode('playing');
    state.tilt.base = null;
    audio.portal();
    showToast(`${h.levelName} — FIND THE HOUSE KEY`, 3200);
  }

  function formatTime(sec) {
    sec = Math.max(0, Math.floor(sec));
    return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
  }

  function finishLevel(win) {
    if (state.mode !== 'playing') return;
    const l = state.level, h = HOUSES[state.selected], p = state.player;
    const elapsed = nowSec() - l.startedAt;
    audio.stopAmbient();
    if (win) {
      state.cleared.add(h.id);
      saveCleared();
      updateCard();
      audio.clear();
      D.resultKicker.textContent = 'HOUSE CLEARED';
      D.resultTitle.innerHTML = `${h.name.toUpperCase()}<br><span>PURGED</span>`;
      D.resultSub.textContent = state.cleared.size >= HOUSES.length
        ? 'ALL SIX LOTS PURGED. The HOA is speechless.'
        : 'The HOA thanks you for your service. Your deposit is non-refundable.';
      D.nextBtn.textContent = 'NEXT LOT';
      D.resHealth.textContent = Math.ceil(p.health);
    } else {
      audio.death();
      D.resultKicker.textContent = `LOT ${h.lot} · ${h.name.toUpperCase()}`;
      D.resultTitle.innerHTML = 'YOU DIED<br><span>CLAIMED</span>';
      D.resultSub.textContent = 'The neighborhood claims another. Try not to become a lawn ornament.';
      D.nextBtn.textContent = 'TRY AGAIN';
      D.resHealth.textContent = 0;
    }
    D.resKills.textContent = l.kills;
    D.resTime.textContent = formatTime(elapsed);
    setMode(win ? 'cleared' : 'dead');
  }

  function nextLot() {
    const wasDead = state.mode === 'dead';
    if (wasDead) { enterHouse(state.selected); return; }
    let next = (state.selected + 1) % HOUSES.length;
    for (let i = 0; i < HOUSES.length; i++) {
      const idx = (state.selected + 1 + i) % HOUSES.length;
      if (!state.cleared.has(HOUSES[idx].id)) { next = idx; break; }
    }
    enterHouse(next);
  }

  function pauseGame() {
    if (state.mode !== 'playing') return;
    audio.stopAmbient();
    setMode('paused');
  }

  function resumeGame() {
    if (state.mode !== 'paused') return;
    setMode('playing');
    audio.resume();
  }

  // ------------------------------------------------------------ sound UI
  function updateSoundUI() {
    D.soundBtn.classList.toggle('muted', audio.muted);
    D.pauseSoundState.textContent = audio.muted ? 'OFF' : 'ON';
    D.soundBtn.setAttribute('aria-label', audio.muted ? 'Unmute sound' : 'Mute sound');
  }
  function toggleSound() {
    audio.init();
    audio.resume();
    audio.setMuted(!audio.muted);
  }

  // ------------------------------------------------------------ tilt controls
  function updateTiltUI() {
    const on = state.tilt.enabled;
    D.tiltBtn.classList.toggle('on', on);
    D.pauseTiltState.textContent = on ? 'ON' : 'OFF';
    D.tiltTip.textContent = on
      ? 'Tilt aim is ON. Hold your device naturally; tilt left/right to turn. Toggle off to recalibrate.'
      : 'Tilt your device to aim. Permission is requested from this button on iOS.';
  }

  function onOrientation(e) {
    if (!state.tilt.enabled) return;
    const beta = Number.isFinite(e.beta) ? e.beta : 0;
    const gamma = Number.isFinite(e.gamma) ? e.gamma : 0;
    const angleRaw = (screen.orientation && typeof screen.orientation.angle === 'number') ? screen.orientation.angle : (window.orientation || 0);
    const angle = Math.abs(angleRaw) === 90;
    const roll = angle ? beta : gamma;
    if (!state.tilt.base) state.tilt.base = { roll };
    let d = roll - state.tilt.base.roll;
    while (d > 180) d -= 360;
    while (d < -180) d += 360;
    d = clamp(d, -42, 42);
    if (Math.abs(d) < 2.4) d = 0;
    state.tilt.target = clamp(d * 0.055, -2.2, 2.2);
  }

  async function toggleTilt() {
    audio.init();
    audio.resume();
    if (state.tilt.enabled) {
      state.tilt.enabled = false;
      state.tilt.target = 0;
      state.tilt.yaw = 0;
      window.removeEventListener('deviceorientation', onOrientation, true);
      updateTiltUI();
      showToast('TILT AIM OFF', 1500);
      return;
    }
    if (typeof DeviceOrientationEvent === 'undefined') {
      showToast('Tilt is not available on this device.', 2300);
      return;
    }
    try {
      if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        const permission = await DeviceOrientationEvent.requestPermission();
        if (permission !== 'granted') {
          showToast('Motion permission denied. Tilt stays off.', 2500);
          return;
        }
      }
      state.tilt.base = null;
      state.tilt.target = 0;
      state.tilt.yaw = 0;
      window.addEventListener('deviceorientation', onOrientation, true);
      state.tilt.enabled = true;
      updateTiltUI();
      showToast('TILT AIM ON — hold naturally to calibrate', 2300);
    } catch (err) {
      showToast('Tilt unavailable. Your browser blocked motion access.', 2600);
    }
  }

  // ------------------------------------------------------------ input wiring
  D.playBtn.addEventListener('click', () => {
    audio.init();
    audio.resume();
    setMode('map');
    state.mapIntro = 0;
    showToast('SELECT A LOT — TAP AGAIN TO ENTER', 2400);
  });

  D.enterBtn.addEventListener('click', () => enterHouse(state.selected));
  D.pauseBtn.addEventListener('click', pauseGame);
  D.resumeBtn = $('resumeBtn');
  D.resumeBtn.addEventListener('click', resumeGame);
  D.leaveBtn = $('leaveBtn');
  D.leaveBtn.addEventListener('click', () => {
    setMode('map');
    updateCard();
  });
  D.nextBtn.addEventListener('click', nextLot);
  D.mapBtn.addEventListener('click', () => {
    setMode('map');
    updateCard();
  });
  D.soundBtn.addEventListener('click', toggleSound);
  D.pauseSoundBtn.addEventListener('click', toggleSound);
  D.tiltBtn.addEventListener('click', toggleTilt);
  D.pauseTiltBtn.addEventListener('click', toggleTilt);

  canvas.addEventListener('pointermove', e => {
    if (state.mode === 'map') {
      const idx = hitHouse(e.clientX, e.clientY);
      state.hover = idx;
      canvas.style.cursor = idx >= 0 ? 'pointer' : 'default';
      return;
    }
    if (state.mode !== 'playing') return;
    if (input.lookPointer !== e.pointerId) return;
    const dx = e.clientX - input.lastX;
    input.lastX = e.clientX;
    input.lastY = e.clientY;
    const sens = e.pointerType === 'mouse' ? 0.0031 : 0.0046;
    if (state.player) state.player.a += dx * sens;
  });

  canvas.addEventListener('pointerdown', e => {
    if (state.mode !== 'playing') return;
    if (input.lookPointer !== null) return;
    input.lookPointer = e.pointerId;
    input.lastX = e.clientX;
    input.lastY = e.clientY;
    if (e.pointerType === 'mouse') input.firing = true;
    try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
    e.preventDefault();
  });

  const endLook = e => {
    if (input.lookPointer !== e.pointerId) return;
    input.lookPointer = null;
    if (e.pointerType === 'mouse') input.firing = false;
  };
  canvas.addEventListener('pointerup', endLook);
  canvas.addEventListener('pointercancel', endLook);
  canvas.addEventListener('lostpointercapture', e => {
    if (input.lookPointer === e.pointerId) {
      input.lookPointer = null;
      input.firing = false;
    }
  });

  canvas.addEventListener('click', e => {
    if (state.mode !== 'map') return;
    const idx = hitHouse(e.clientX, e.clientY);
    if (idx < 0) return;
    if (idx === state.selected) enterHouse(idx);
    else {
      state.selected = idx;
      updateCard();
      audio.tone(420, 0.06, 'sine', 0.04, 50);
    }
  });

  canvas.addEventListener('pointerleave', () => {
    if (state.mode === 'map') { state.hover = -1; canvas.style.cursor = 'default'; }
  });

  // joystick
  function updateJoy(e) {
    const rect = D.moveZone.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = e.clientX - cx;
    let dy = e.clientY - cy;
    const max = rect.width * 0.32;
    const len = Math.hypot(dx, dy);
    if (len > max) { dx = dx / len * max; dy = dy / len * max; }
    D.moveStick.querySelector('i').style.transform = `translate(${dx}px, ${dy}px)`;
    input.joyX = clamp(dx / max, -1, 1);
    input.joyY = clamp(-dy / max, -1, 1);
  }

  D.moveZone.addEventListener('pointerdown', e => {
    if (state.mode !== 'playing') return;
    input.joyPointer = e.pointerId;
    try { D.moveZone.setPointerCapture(e.pointerId); } catch (_) {}
    updateJoy(e);
    e.preventDefault();
  });
  D.moveZone.addEventListener('pointermove', e => {
    if (input.joyPointer !== e.pointerId) return;
    updateJoy(e);
    e.preventDefault();
  });
  function endJoy(e) {
    if (input.joyPointer !== e.pointerId) return;
    input.joyPointer = null;
    input.joyX = 0; input.joyY = 0;
    D.moveStick.querySelector('i').style.transform = 'translate(0px, 0px)';
  }
  D.moveZone.addEventListener('pointerup', endJoy);
  D.moveZone.addEventListener('pointercancel', endJoy);
  D.moveZone.addEventListener('lostpointercapture', endJoy);

  // fire button
  D.fireBtn.addEventListener('pointerdown', e => {
    if (state.mode !== 'playing') return;
    input.firing = true;
    D.fireBtn.classList.add('down');
    try { D.fireBtn.setPointerCapture(e.pointerId); } catch (_) {}
    e.preventDefault();
  });
  function endFire() {
    input.firing = false;
    D.fireBtn.classList.remove('down');
  }
  D.fireBtn.addEventListener('pointerup', endFire);
  D.fireBtn.addEventListener('pointercancel', endFire);
  D.fireBtn.addEventListener('lostpointercapture', endFire);

  // keyboard
  window.addEventListener('keydown', e => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    if (state.mode === 'splash' && (e.code === 'Enter' || e.code === 'Space')) {
      D.playBtn.click();
      return;
    }
    if (state.mode === 'map' && e.code === 'Enter') { enterHouse(state.selected); return; }
    if (state.mode === 'playing') {
      input.keys[e.code] = true;
      if (e.code === 'Space') input.firing = true;
      if (e.code === 'Escape') pauseGame();
      if (e.code === 'KeyP') pauseGame();
    } else if (state.mode === 'paused' && (e.code === 'Escape' || e.code === 'KeyP')) {
      resumeGame();
    } else if (state.mode === 'cleared' && e.code === 'Enter') {
      nextLot();
    } else if (state.mode === 'dead' && e.code === 'Enter') {
      nextLot();
    }
  });
  window.addEventListener('keyup', e => {
    input.keys[e.code] = false;
    if (e.code === 'Space') input.firing = false;
  });

  window.addEventListener('blur', () => {
    input.keys = {};
    input.firing = false;
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && state.mode === 'playing') pauseGame();
  });

  // resize / orientation
  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      resize();
      buildLayout();
      updateMapView();
      if (state.mode === 'map' || state.mode === 'splash') updateCard();
    }, 120);
  });
  window.addEventListener('orientationchange', () => {
    state.tilt.base = null;
    setTimeout(() => {
      resize();
      buildLayout();
      updateMapView();
      updateCard();
    }, 250);
  });

  // ============================================================ MAIN LOOP
  function renderGame(now) {
    const l = state.level, p = state.player;
    if (!l || !p) return;
    renderFloorCeiling(l, p);
    renderWalls(l, p);
    renderSprites(l, p, now);
    drawCrosshair(p, now);
    drawWeapon(p, now);
  }

  function loop() {
    const now = nowSec();
    let dt = now - state.last;
    state.last = now;
    if (dt > 0.06) dt = 0.06;
    state.time = now;

    if (state.tilt.enabled) {
      state.tilt.yaw = lerp(state.tilt.yaw, state.tilt.target || 0, Math.min(1, dt * 7));
    }

    if (state.mode === 'map' || state.mode === 'splash') {
      drawNeighborhood(now);
    } else if (state.level) {
      if (state.mode === 'playing') updateLevel(dt, now);
      renderGame(now);
    }
    requestAnimationFrame(loop);
  }

  // ============================================================ INIT
  function init() {
    updateSoundUI();
    updateTiltUI();
    buildLayout();
    resize();
    state.selected = HOUSES.findIndex(h => !state.cleared.has(h.id));
    if (state.selected < 0) state.selected = 0;
    updateCard();
    setMode('splash');
    requestAnimationFrame(loop);
  }

  if (new URLSearchParams(location.search).has('debug')) {
    window.__sv = {
      state, input, HOUSES, enterHouse, finishLevel, generateLevel,
      get level() { return state.level; },
      get player() { return state.player; }
    };
  }

  try {
    init();
  } catch (err) {
    console.error(err);
    if (D.bootError) {
      D.bootError.style.display = 'block';
      D.bootError.textContent = 'Could not start Strangeville. ' + (err && err.message ? err.message : 'Unknown error');
    }
  }
})();
