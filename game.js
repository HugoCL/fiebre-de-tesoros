(function () {
  'use strict';

  const W = 800, H = 600, T = 32, HB = 56;
  const PH = { g: 1500, run: 200, jump: 600, cut: 0.45, coy: 90, buf: 110, fall: 720 };
  const PC = [0xe1ff00, 0xff6ec7];
  const KC = [0xff5a4d, 0x4da6ff, 0x5fe37a, 0xffd23f, 0xc77dff, 0xff9a3c];
  const REEL = [[100, 1], [200, 1], [300, 1], [500, 1], [100, 1], [200, 1], [300, 1], [1000, 0.5]];
  const LUCK = [[300, 1], [500, 1], [1000, 0.5], [500, 1]];
  // th picks the theme, L is the grid ('#' ground, '=' one-way platform, 'C' chest), PS, KS and BS are the
  // surface cells where players, keys and powerup boxes appear, and tc the light sources in pixels.
  const MAPS = [
    {
      n: 'RAPA NUI', th: 0, hz: { n: 'PUKAOS', d: 'RUEDAN POR LA ISLA Y ATURDEN' },
      L: [
        '.........................',
        '.........................',
        '.........................',
        '.........................',
        '=====.....=====.....=====',
        '.........................',
        '.........................',
        '.....=====.....=====.....',
        '.........................',
        '..C...................C..',
        '=====......===......=====',
        '.........................',
        '........C.......C........',
        '......=====...=====......',
        '.........................',
        '...C.................C...',
        '#########################',
      ],
      PS: [[6, 16], [18, 16]],
      KS: [[2, 4], [22, 4], [12, 4], [7, 7], [17, 7], [12, 10]],
      BS: [[12, 16], [8, 16], [16, 16], [10, 13], [14, 13], [4, 10], [20, 10], [9, 7], [15, 7]],
      tc: [[176, 257], [624, 257]],
    },
    {
      n: 'TORRES DEL PAINE', th: 1, hz: { n: 'HIELO', d: 'SE DESPRENDE Y CAE. ¡CUIDADO!' },
      L: [
        '.........................',
        '.........................',
        '.........................',
        '.........................',
        '..=======.......=======..',
        '.........................',
        '.........................',
        '====......=====......====',
        '.........................',
        '.....C.............C.....',
        '...=====.........=====...',
        '.........................',
        '.C.....................C.',
        '=====....=======....=====',
        '.........................',
        '......C...........C......',
        '#########################',
      ],
      PS: [[3, 16], [21, 16]],
      KS: [[4, 4], [20, 4], [12, 7], [1, 7], [23, 7], [12, 13]],
      BS: [[12, 16], [9, 16], [15, 16], [10, 13], [14, 13], [3, 13], [21, 13], [7, 10], [17, 10], [7, 4], [17, 4]],
      tc: [[112, 353], [688, 353]],
    },
    {
      n: 'VILLARRICA', th: 2, hz: { n: 'ERUPCIONES', d: 'EL SUELO ESTALLA Y LLUEVE FUEGO' },
      L: [
        '.........................',
        '.........................',
        '.........................',
        '.........................',
        '===.......=====.......===',
        '.........................',
        '.........................',
        '.....====.......====.....',
        '.........................',
        '..........C...C..........',
        '====.....=======.....====',
        '.........................',
        '.....C.............C.....',
        '...====...........====...',
        '.........................',
        '.C.....................C.',
        '#####...#########...#####',
      ],
      PS: [[3, 16], [21, 16]],
      KS: [[1, 4], [23, 4], [12, 4], [7, 7], [17, 7], [12, 16]],
      BS: [[9, 16], [15, 16], [3, 13], [21, 13], [1, 10], [23, 10], [12, 10], [8, 7], [16, 7]],
      tc: [[176, 257], [624, 257]],
    },
  ];
  // Hazard frequency: label and multiplier on the spawn interval (0 is off).
  const DF = [['APAGADOS', 0], ['POCOS', 1.6], ['NORMALES', 1], ['MUCHOS', 0.55]];
  // One hazard per map: kind and base ms between spawns. Tune the rhythm here.
  const HZ = [['roll', 5000], ['ice', 4500], ['erupt', 6000]];
  // v2 holds one top 8 per mode and DF row. v1 is only read, once, and its scores go to APAGADOS.
  const SK = 'fiebre-de-tesoros.scores.v2', SK1 = 'fiebre-de-tesoros.scores.v1';
  const ABC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  // DO NOT replace existing keys: they match the physical arcade cabinet wiring.
  const CABINET_KEYS = {
    P1_U: ['w'],
    P1_D: ['s'],
    P1_L: ['a'],
    P1_R: ['d'],
    P1_1: ['u'],
    P1_2: ['i'],
    P1_3: ['o'],
    P1_4: ['j'],
    P1_5: ['k'],
    P1_6: ['l'],
    P2_U: ['ArrowUp'],
    P2_D: ['ArrowDown'],
    P2_L: ['ArrowLeft'],
    P2_R: ['ArrowRight'],
    P2_1: ['r'],
    P2_2: ['t'],
    P2_3: ['y'],
    P2_4: ['f'],
    P2_5: ['g'],
    P2_6: ['h'],
    START1: ['Enter'],
    START2: ['2'],
  };
  const KA = {};
  for (const [a, ks] of Object.entries(CABINET_KEYS)) for (const k of ks) KA[k.toLowerCase()] = a;

  const G = { ph: '', t: 0, wv: 1, wd: 0, mi: 0, lm: -1, P: [], K: [], C: [], B: [], lb: Array.from({ length: 8 }, () => []), rl: 0, so: 0, win: -1, df: 2,
    // The ranking of the mode and level selected on the title (mode * 4 + level). Ranking screens look at lb[rl] instead.
    get hs() { return G.lb[G.so * 4 + G.df]; },
    set hs(v) { G.lb[G.so * 4 + G.df] = v; },
    H: [], ht: 6000, sp: (k, x, y) => addH(k, x, y) };
  const held = {}, pressed = {};
  const UI = {}, U = {}, hud = { sc: [], sk: [], ki: [], pi: [], pn: [], ch: [], st: [], o: [[], []] };
  const nm = { l: [], i: 0 };
  let S, gfx, kg, sg, pg, LD, cur = 0;

  const sh = (a) => {
    for (let i = a.length; --i > 0;) {
      const j = (Math.random() * (i + 1)) | 0;
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const fx = (n, x = W / 2, y = H / 2, a) => ev(S, n, x, y, a);
  const set = (t, s) => t.l !== s && ((t.l = s), t.setText(s), 1);
  const ov = (b, x, y, w, h) => b.left < x + w / 2 && b.right > x - w / 2 && b.top < y + h / 2 && b.bottom > y - h / 2;
  const pr = (c) => pressed['P1_' + c] || pressed['P2_' + c];
  const any = () => { for (const _ in pressed) return true; return false; };
  const ok = () => !!(pr('1') || pr('2') || pressed.START1 || pressed.START2);
  const nav = () => ({ x: !!pr('R') - !!pr('L'), y: !!pr('D') - !!pr('U') });
  const inp = (i) => {
    const p = 'P' + (i + 1) + '_', h = (c) => !!held[p + c];
    return { x: h('R') - h('L'), j: h('1') || h('U'), jp: !!(pressed[p + '1'] || pressed[p + 'U']), dn: !!pressed[p + 'D'], b: !!pressed[p + '2'] };
  };

  window.addEventListener('keydown', (e) => {
    const a = KA[String(e.key).toLowerCase()];
    if (!a) return;
    e.preventDefault();
    if (!held[a]) pressed[a] = true;
    held[a] = true;
  });
  window.addEventListener('blur', () => { for (const k in held) held[k] = false; });
  window.addEventListener('keyup', (e) => {
    const a = KA[String(e.key).toLowerCase()];
    if (a) held[a] = false;
  });

  // ---- keys -------------------------------------------------------------

  function mkKey(m) {
    const s = kg.create(0, 0, 'key', m ? 6 : 0).setDepth(3);
    s.body.setSize(20, 12).setDragX(500).setBounce(0, 0.2);
    s.body.maxVelocity.y = PH.fall;
    const k = { id: G.K.length, m, live: true, own: null, s, c: 0xffffff };
    G.K.push(k);
    return k;
  }

  function take(p, k) {
    if (k.own) k.own.k = null;
    k.own = p;
    p.k = k;
    k.s.body.enable = false;
    fx('keyup', k.s.x, k.s.y, k.s);
  }

  function drop(p) {
    const k = p.k, b = k.s.body;
    k.own = null;
    p.k = null;
    p.np = 700;
    k.s.setPosition(p.s.x, p.s.y - 30);
    b.enable = true;
    b.reset(k.s.x, k.s.y);
    b.setVelocity((Math.random() - 0.5) * 120, -260);
    fx('drop', k.s.x, k.s.y, k.s);
  }

  function swap(p) {
    const k = G.K.find((k) => k.live && !k.own && ov(p.s.body, k.s.x, k.s.y, 30, 22));
    if (!k) return;
    drop(p);
    take(p, k);
  }

  function kill(k) {
    if (k.own) k.own.k = null;
    k.own = null;
    k.live = false;
    k.s.setVisible(false);
    k.s.body.enable = false;
  }

  // ---- chests -----------------------------------------------------------

  function settle(c) {
    const v = c.r[c.ri][0], n = v * c.x;
    G.P[c.by].sc += n;
    c.st = 2;
    c.b.body.enable = false;
    fx(v == 1000 ? 'jack' : 'win', c.s.x, c.s.y, n);
  }

  function open(c, p) {
    c.st = 1;
    c.by = p.i;
    G.P[1 - p.i].sk = 0;
    c.x = p.sk = Math.min(p.sk + 1, 3);
    if (c.x > 1) fx('streak', c.s.x, c.s.y, p);
    c.r = p.luck ? LUCK : REEL;
    p.luck = 0;
    c.ri = (Math.random() * c.r.length) | 0;
    c.rt = c.r[c.ri][1] * 130;
    c.life = 6000;
    c.b.body.enable = true;
    fx('open', c.s.x, c.s.y, c.s);
  }

  function poke(p, c) {
    const k = p.k;
    if (c.st || !k || p.stun > 0 || !ov(p.s.body, c.s.x, c.s.y, T, T)) return;
    if (k.m) {
      kill(k);
      fx('poof', c.k.s.x, c.k.s.y, c.k.s);
      kill(c.k);
      open(c, p);
    } else if (k === c.k) {
      kill(k);
      open(c, p);
    } else if (!c.m.includes(k.id)) {
      fx('wrong', c.s.x, c.s.y, c.s);
      c.m.push(k.id);
    }
  }

  // ---- powerups ---------------------------------------------------------

  const PW = [
    { id: 'slow', r: 1, n: 'TORTUGA', d: 'RIVAL LENTO', f: 0, w: 14, wl: 12, use(p, r) { r.slow = 4500; fx('slow', r.s.x, r.s.y, p.i); } },
    {
      id: 'master', n: 'LLAVE MAESTRA', d: 'ABRE TODO', f: 1, w: 6, wl: 14,
      use(p) {
        if (p.k) drop(p);
        take(p, mkKey(1));
        fx('master', p.s.x, p.s.y, p.i);
      },
    },
    {
      id: 'mix', n: 'REVOLTIJO', d: 'MEZCLA COFRES', f: 2, w: 8, wl: 4,
      use(p) {
        const cs = G.C.filter((c) => !c.st), ks = sh(cs.map((c) => c.k));
        cs.forEach((c, i) => { c.k = ks[i]; c.m = []; });
        G.C.forEach((c) => { c.lk = 0; });
        fx('mix', p.s.x, p.s.y, p.i);
      },
    },
    {
      id: 'grab', r: 1, n: 'IMÁN', d: 'ROBA LA LLAVE', f: 3, w: 10, wl: 12,
      use(p, r) {
        const k = r.k || (!p.k && G.K.filter((k) => k.live && !k.own).sort((a, b) => dist(a.s, p.s) - dist(b.s, p.s))[0]);
        if (!k) return fx('fizz', p.s.x, p.s.y, p.i);
        if (p.k) drop(p);
        take(p, k);
        fx('grab', p.s.x, p.s.y, p.i);
      },
    },
    {
      id: 'look', n: 'LUPA', d: 'REVELA UN COFRE', f: 4, w: 12, wl: 10,
      use(p) {
        const k = p.k && !p.k.m ? p.k : sh(G.K.filter((k) => k.live && !k.m))[0], c = k && G.C.find((c) => !c.st && c.k === k);
        if (!c) return fx('fizz', p.s.x, p.s.y, p.i);
        c.lk = 6000;
        fx('look', c.s.x, c.s.y, p.i);
      },
    },
    { id: 'fast', n: 'AJÍ', d: 'CORRES MÁS', f: 5, w: 14, wl: 10, use(p) { p.slow = 0; p.fast = 5000; fx('fast', p.s.x, p.s.y, p.i); } },
    { id: 'luck', n: 'TRÉBOL', d: 'MEJORES PREMIOS', f: 6, w: 8, wl: 12, use(p) { p.luck = 1; fx('luck', p.s.x, p.s.y, p.i); } },
    {
      id: 'cut', r: 1, n: 'TIJERAS', d: 'CORTA LA RACHA', f: 7, w: 4, wl: 12,
      use(p, r) {
        if (!r.sk) return fx('fizz', p.s.x, p.s.y, p.i);
        r.sk = 0;
        fx('cut', r.s.x, r.s.y, p.i);
      },
    },
    { id: 'dizzy', r: 1, n: 'MAREO', d: 'RIVAL AL REVÉS', f: 8, w: 12, wl: 8, use(p, r) { r.dz = 4000; fx('dizzy', r.s.x, r.s.y, p.i); } },
    {
      id: 'trade', r: 1, n: 'CAMBIAZO', d: 'CAMBIA DE LUGAR', f: 9, w: 6, wl: 4,
      use(p, r) {
        const [a, b] = [p.s.body, r.s.body], [x, y, rx, ry] = [p.s.x, p.s.y, r.s.x, r.s.y];
        a.reset(rx, ry);
        b.reset(x, y);
        fx('trade', rx, ry, p.i);
      },
    },
    {
      id: 'quake', n: 'TERREMOTO', d: 'SACUDE TODO', f: 10, w: 6, wl: 2,
      use(p, r) {
        G.K.forEach((k) => {
          if (!k.live || k.own) return;
          k.s.body.setVelocity((Math.random() * 2 - 1) * 200, -420);
        });
        const b = r.s.body;
        if (!G.so && (b.blocked.down || b.touching.down)) hurt(r, 0, 0);
        fx('quake', p.s.x, p.s.y, p.i);
      },
    },
  ];
  // In solo player 2 is absent: hidden, without a body, never read, targeted or hurt.
  const here = (p) => !G.so || !p.i;
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  // Solo has no rival, so the powerups that only act on one are left out and nobody trails.
  function roll(p) {
    const lose = !G.so && G.P[1 - p.i].sc - p.sc >= 300, w = (r) => (lose ? r.wl : r.w), pool = PW.filter((r) => !(G.so && r.r));
    let x = Math.random() * pool.reduce((a, r) => a + w(r), 0);
    for (const r of pool) if ((x -= w(r)) < 0) return r.id;
    return pool[0].id;
  }

  function act(p) {
    const c = G.C.filter((c) => c.st == 1 && c.by == p.i).sort((a, b) => a.life - b.life)[0];
    if (c) return settle(c);
    const w = PW.find((w) => w.id == p.pw);
    if (!w) return;
    p.pw = null;
    w.use(p, G.P[1 - p.i]);
  }

  function spawnBox() {
    const free = MAPS[G.lm].BS.map(([c, r]) => [c * T + T / 2, HB + r * T - 18]).filter(([x, y]) =>
      !G.B.some((b) => dist(b.s, { x, y }) < 40) && !G.K.some((k) => k.live && dist(k.s, { x, y }) < 40));
    if (!free.length) return false;
    const [x, y] = free[(Math.random() * free.length) | 0];
    G.B.push({ s: S.add.image(x, y, 'box', 0).setDepth(3), y });
    fx('spawn', x, y);
    return true;
  }

  // ---- round ------------------------------------------------------------

  // Shuts the six chests and brings the six real keys back with new colours and a new pairing.
  function deal() {
    const KS = MAPS[G.lm].KS, cs = sh(KC.slice()), ks = G.K.slice(0, 6);
    G.wd = 0;
    ks.forEach((k, i) => {
      const [x, y] = [KS[i][0] * T + T / 2, HB + KS[i][1] * T - 8];
      if (k.own) k.own.k = null;
      Object.assign(k, { live: true, own: null, c: cs[i] });
      k.s.setVisible(true).setFrame(KC.indexOf(k.c));
      k.s.body.enable = true;
      k.s.body.reset(x, y);
    });
    sh(ks);
    G.C.forEach((c, i) => {
      Object.assign(c, { st: 0, k: ks[i], m: [], by: -1, ri: 0, rt: 0, life: 0, x: 1, r: REEL, lk: 0 });
      c.b.body.enable = false;
    });
  }

  function reset() {
    const { PS } = MAPS[G.lm];
    Object.assign(G, { t: 99000, rush: 0, bt: 4000, win: -1, wn: 99, wv: 1, ht: 6000 });
    G.H.splice(0).forEach((h) => h.s && h.s.destroy());
    G.B.splice(0).forEach((b) => b.s.destroy());
    G.K.splice(6).forEach((k) => k.s.destroy());
    deal();
    G.P.forEach((p, i) => {
      Object.assign(p, { sc: 0, sk: 0, k: null, pw: null, slow: 0, stun: 0, inv: 0, np: 0, fast: 0, dz: 0, luck: 0, rf: 0, cy: 0, jb: 0, cj: 0, vy: 0, kx: 0 });
      const x = PS[i][0] * T + T / 2, y = HB + PS[i][1] * T;
      p.s.setPosition(x, y).setFlipX(i == 1).setAlpha(1);
      p.s.body.reset(x, y);
      p.s.setVisible(here(p));
      p.s.body.enable = here(p);
    });
    view();
  }

  // The stun shared by a stomp, a quake and every hazard. kx is a sideways push that move() lets fade.
  function hurt(p, kx, vy) {
    if (p.inv > 0 || p.stun > 0) return false;
    p.stun = 700;
    p.inv = 1200;
    if (p.k) drop(p);
    p.kx = kx;
    if (vy) p.s.body.setVelocityY(vy);
    p.cj = 0;
    return true;
  }

  function stomp(a, v) {
    const A = a.s.body, V = v.s.body;
    if (a.stun > 0 || v.stun > 0 || v.inv > 0 || A.velocity.y <= 120) return;
    if (A.bottom < V.top || A.bottom > V.top + 20 || A.right < V.left + 4 || A.left > V.right - 4) return;
    hurt(v, 0, 0);
    A.velocity.y = -380;
    a.cj = 0;
    fx('stomp', v.s.x, v.s.y, v.s);
  }

  // Wraps sideways. Whatever falls out of the bottom (the Volcán pits) comes back in just under the HUD.
  function ring(s) {
    const b = s.body;
    s.x = Phaser.Math.Wrap(s.x, -16, W + 16);
    if (b.top <= H) return;
    const [vx, vy] = [b.velocity.x, Math.min(b.velocity.y, PH.fall)];
    b.reset(s.x, s.y + HB + 2 - b.top);
    b.setVelocity(vx, vy);
    fx('pit', s.x, s.y, s);
  }

  function move(p, dt) {
    const s = p.s, b = s.body, n = inp(p.i), st = p.stun > 0, x = st ? 0 : p.dz > 0 ? -n.x : n.x;
    const g = b.blocked.down || b.touching.down;
    p.cy = g ? PH.coy : p.cy - dt;
    p.jb = n.jp && !st ? PH.buf : p.jb - dt;
    b.setVelocityX(x * PH.run * (p.slow > 0 ? 0.45 : 1) * (p.fast > 0 ? 1.5 : 1) + p.kx);
    p.kx = p.kx > 0 ? Math.max(0, p.kx - dt * 0.8) : Math.min(0, p.kx + dt * 0.8);
    if (p.jb > 0 && p.cy > 0 && !st) {
      b.setVelocityY(-PH.jump * (p.slow > 0 ? 0.8 : 1));
      p.cy = p.jb = 0;
      p.cj = 1;
      fx('jump', s.x, s.y, s);
    } else if (p.cj && b.velocity.y < 0 && !n.j) {
      b.velocity.y *= PH.cut;
      p.cj = 0;
    }
    if (b.velocity.y >= 0) p.cj = 0;
    if (g && !p.g && p.vy > 200) fx('land', s.x, s.y, s);
    p.g = g;
    p.vy = b.velocity.y;
    if (!st) {
      if (n.dn && p.k) swap(p);
      if (n.b) act(p);
    }
    if (x) s.setFlipX(x < 0);
    const rf = g && x ? 1 + (((S.time.now / 110) | 0) & 1) : 0;
    if (rf && rf != p.rf && !st) fx('step', s.x, s.y, s);
    p.rf = rf;
    s.setFrame(st ? 5 : !g ? (b.velocity.y < 0 ? 3 : 4) : rf);
    s.setAlpha(p.inv > 0 && !st && ((S.time.now / 90) | 0) & 1 ? 0.5 : 1).setTint(p.slow > 0 ? 0x99bb99 : st ? 0xffffff : p.dz > 0 ? 0xc77dff : p.fast > 0 ? 0xffb07a : 0xffffff);
    ring(s);
  }

  function view() {
    gfx.clear();
    G.C.forEach((c) => {
      c.s.setFrame(c.st ? 1 : 0);
      c.t.setVisible(c.st == 1);
      if (c.st == 1) {
        const v = c.r[c.ri][0], x = c.s.x - 40, y = c.s.y - 80;
        set(c.t, '' + v * c.x);
        c.t.setTint(v == 1000 ? 0xffd23f : 0xffffff);
        gfx.fillStyle(PC[c.by]).fillTriangle(x + 32, y + 32, x + 48, y + 32, x + 40, y + 42);
        gfx.fillStyle(0x1b1326, 0.92).fillRoundedRect(x, y, 80, 32, 6).lineStyle(2, PC[c.by]).strokeRoundedRect(x, y, 80, 32, 6);
      }
      const lk = !c.st && c.lk > 0, ly = c.s.y - 50 + 3 * Math.sin(S.time.now / 120);
      c.q.setVisible(lk);
      if (lk) {
        c.q.setPosition(c.s.x, ly).setFrame(KC.indexOf(c.k.c));
        gfx.fillStyle(0x1b1326, 0.92).fillRoundedRect(c.s.x - 18, ly - 12, 36, 24, 5).lineStyle(2, c.k.c).strokeRoundedRect(c.s.x - 18, ly - 12, 36, 24, 5);
      }
      if (!c.st) c.m.forEach((id, n) => {
        const x = c.s.x - c.m.length * 5 + n * 10, y = c.s.y - 28;
        gfx.fillStyle(0x1b1326).fillRect(x, y, 10, 10).fillStyle(G.K[id].c).fillRect(x + 2, y + 2, 6, 6);
      });
    });
    G.B.forEach((b) => b.s.setFrame(((S.time.now / 300) | 0) & 1).setY(b.y + 2 * Math.sin(S.time.now / 240)));
    const sec = Math.max(0, Math.ceil(G.t / 1000));
    set(hud.tm, '' + sec);
    hud.tm.setTint(sec > 10 ? 0xffffff : 0xff5a4d);
    G.C.forEach((c, i) => hud.ch[i].setFrame(c.st ? 1 : 0).setTint(c.st ? PC[c.by] : 0xffffff));
    G.P.forEach((p, i) => {
      set(hud.sc[i], '' + p.sc);
      set(hud.sk[i], p.sk ? 'PRÓXIMO COFRE X' + Math.min(p.sk + 1, 3) : '');
      hud.ki[i].setVisible(!!p.k && G.ph != 'end');
      if (p.k) hud.ki[i].setFrame(p.k.s.frame.name);
      const w = PW.find((w) => w.id == p.pw);
      hud.pi[i].setVisible(!!w);
      if (w) hud.pi[i].setFrame(w.f);
      set(hud.pn[i], w ? w.n : '');
      // One effect icon rides over the player's head, above the key when there is one.
      const f = p.dz > 0 ? 8 : p.slow > 0 ? 0 : p.fast > 0 ? 5 : p.luck ? 6 : -1;
      hud.st[i].setVisible(f >= 0).setFrame(Math.max(f, 0)).setPosition(p.s.x, p.s.y - (p.k ? 74 : 56));
    });
    hud.o[1].forEach((o) => o.setVisible(!G.so));
    set(hud.rb, G.so && G.ph != 'title' && G.hs[0] ? 'RÉCORD ' + G.hs[0].s : '');
    hzView();
  }

  function tick(dt) {
    G.t -= dt;
    G.P.forEach((p) => {
      p.slow -= dt;
      p.fast -= dt;
      p.dz -= dt;
      p.np -= dt;
      if (p.stun > 0) p.stun -= dt;
      else p.inv -= dt;
    });
    hzTick(dt);
    G.bt -= dt;
    if (G.bt <= 0) {
      G.bt = 7000;
      if (G.B.length < 2 && !spawnBox()) G.bt = 1000;
    }
    if (G.t < 15000 && !G.rush) {
      G.rush = 1;
      music(S, 'rush');
    }
    G.C.forEach((c) => {
      if (c.lk > 0) c.lk -= dt;
      if (c.st != 1) return;
      c.life -= dt;
      c.rt -= dt;
      if (c.rt <= 0) {
        c.ri = (c.ri + 1) % c.r.length;
        c.rt += c.r[c.ri][1] * 130;
        fx('tick', c.s.x, c.s.y, c.by);
      }
      if (c.life <= 0) settle(c);
    });
    const sec = Math.ceil(G.t / 1000);
    if (sec <= 10 && sec > 0 && sec != G.wn) { G.wn = sec; fx('warn', W / 2, H / 2, sec); }
  }

  function grab(p) {
    const k = !p.k && p.np <= 0 && p.stun <= 0 && G.K.find((k) => k.live && !k.own && ov(p.s.body, k.s.x, k.s.y, 20, 12));
    if (k) take(p, k);
    const b = p.pw ? null : G.B.find((b) => ov(p.s.body, b.s.x, b.s.y, 24, 24));
    if (b) {
      G.B.splice(G.B.indexOf(b), 1);
      fx('box', b.s.x, b.s.y);
      b.s.destroy();
      p.pw = roll(p);
    }
  }

  // ---- hazards ----------------------------------------------------------
  // Plain data driven from tick(), so pause, end and the title freeze them. Each one warns (w ms) and then acts.
  // roll: x, y, d, vx, vy, a (spin), sy (surface it rolls on, 0 in the air). ice: x, y, vy, fy (landing height).
  // erupt: x, y (surface), x0, x1. fire: x, y, vx, vy.

  const solid = (ch) => ch == '#' || ch == '=';
  const rowY = (r) => HB + r * T;
  // The level continues one mirrored column past each side, so off screen counts as the edge column.
  const colOf = (x) => Math.min(24, Math.max(0, (x / T) | 0));
  // Is there a surface at exactly height y under x?
  const onSurf = (x, y) => {
    const r = Math.round((y - HB) / T);
    return solid((MAPS[G.lm].L[r] || '')[colOf(x)]) && rowY(r) == y;
  };

  // The first solid cell of a column at or below y: its surface height, or Infinity over a pit.
  function floorAt(c, y) {
    const L = MAPS[G.lm].L;
    for (let r = 0; r < L.length; r++) if (solid(L[r][c]) && rowY(r) >= y) return rowY(r);
    return Infinity;
  }

  // The three-tile stretch of ground or platform nearest to (x, y), as [centre column, surface y].
  function spot(x, y) {
    let best, bd = 1e9;
    MAPS[G.lm].L.forEach((row, r) => {
      for (let c = 1; c < 24; c++) {
        const d = Math.abs(c * T + T / 2 - x) + 2 * Math.abs(rowY(r) - y);
        if (solid(row[c]) && row[c - 1] == row[c] && row[c + 1] == row[c] && d < bd) [best, bd] = [[c, rowY(r)], d];
      }
    });
    return best;
  }

  // Where a hazard shows up on screen: a pukao at the edge it enters from, anything else at its own x.
  const hx = (h) => (h.k == 'roll' ? (h.d > 0 ? 0 : W) : h.x);

  function addH(k, x, y) {
    const h = { k, x, y, w: k == 'erupt' ? 1200 : k == 'fire' ? 0 : 1000, s: null };
    if (k == 'fire') Object.assign(h, { vx: 0, vy: 0 });
    if (k == 'roll') {
      // x only picks the side and y is the surface it enters on. A row without floor at the edge drops it to the one below.
      h.d = x < W / 2 ? 1 : -1;
      Object.assign(h, { x: h.d > 0 ? -16 : W + 16, y: y - 14, vx: h.d * 260, vy: 0, a: 0, sy: 0 });
      if (onSurf(h.x, y)) h.sy = y;
    } else if (k == 'ice') {
      h.x = Phaser.Math.Clamp(x, 16, W - 16);
      h.y = HB + 14;
      h.vy = 0;
      h.fy = floorAt((h.x / T) | 0, 0);
    } else if (k == 'erupt') {
      const [c, sy] = spot(x, y);
      Object.assign(h, { x: c * T + T / 2, y: sy, x0: (c - 1) * T, x1: (c + 2) * T });
    }
    if (k != 'erupt') {
      h.s = S.add.image(h.x, h.y, 'hz', ['roll', 'ice', 'fire'].indexOf(k)).setDepth(5).setVisible(k == 'fire');
    }
    G.H.push(h);
    if (k != 'fire') fx('hzw', hx(h), h.y, k);
    return h;
  }

  // 60 % of the time at where a random player stands, otherwise anywhere. Solo only ever aims at player 1.
  function aim() {
    const k = HZ[G.lm][0], r = Math.random, p = G.P[G.so ? 0 : (r() * 2) | 0], b = p.s.body, at = r() < 0.6;
    const rows = MAPS[G.lm].L.map((row, i) => (/[#=]/.test(row) ? rowY(i) : 0)).filter((y) => y);
    const ry = rows[(r() * rows.length) | 0], near = rows.reduce((a, y) => (Math.abs(y - b.bottom) < Math.abs(a - b.bottom) ? y : a));
    if (k == 'roll') addH(k, r() < 0.5 ? 0 : W, at ? near : ry);
    else addH(k, at ? p.s.x : 40 + r() * (W - 80), at ? b.bottom : ry);
  }

  function hit(h, w, hh, kx) {
    const p = G.P.find((p) => here(p) && ov(p.s.body, h.x, h.y, w, hh) && hurt(p, kx, 0));
    if (p) fx('hzhit', h.x, h.y, p.s);
    return !!p;
  }

  // Did a body whose bottom went from pb to nb land on a surface? Returns the surface height.
  function lands(x, pb, nb) {
    const L = MAPS[G.lm].L, c = colOf(x);
    for (let r = Math.max(0, Math.floor((pb - HB) / T)); r <= Math.min(L.length - 1, Math.floor((nb - HB) / T)); r++) {
      const ch = L[r][c], y = rowY(r);
      if (nb >= y && (ch == '#' || (ch == '=' && pb <= y + 8))) return y;
    }
    return 0;
  }

  // Returns true when the hazard is done.
  function stepH(h, dt) {
    const s = dt / 1000;
    if (h.k == 'roll') {
      h.x += h.vx * s;
      h.a += (h.vx * s) / 14;
      if (h.sy && !onSurf(h.x, h.sy)) h.sy = 0;
      if (!h.sy) {
        const pb = h.y + 14;
        h.vy += PH.g * s;
        h.y += h.vy * s;
        const ly = h.vy > 0 && lands(h.x, pb, h.y + 14);
        if (ly) Object.assign(h, { sy: ly, y: ly - 14, vy: 0 });
      }
      hit(h, 28, 28, h.d * 260);
      return h.x < -24 || h.x > W + 24 || h.y > H;
    }
    if (h.k == 'ice') {
      h.vy = Math.min(h.vy + PH.g * s, PH.fall);
      h.y += h.vy * s;
      if (h.y + 12 >= h.fy) return fx('hzend', h.x, h.fy, 'ice'), true;
      return h.y > H || hit(h, 24, 24, 0);
    }
    const pb = h.y + 8;
    h.vy += PH.g * s;
    h.x += h.vx * s;
    h.y += h.vy * s;
    if (h.x < 0 || h.x >= W || h.y > H || hit(h, 20, 20, (h.vx < 0 ? -1 : 1) * 180)) return true;
    const ly = h.vy > 0 && lands(h.x, pb, h.y + 8);
    return ly ? (fx('hzend', h.x, ly, 'fire'), true) : false;
  }

  function erupt(h) {
    G.P.forEach((p) => {
      if (here(p) && p.s.x >= h.x0 && p.s.x <= h.x1 && Math.abs(p.s.body.bottom - h.y) <= 6 && hurt(p, (p.s.x < h.x ? -1 : 1) * 320, -720)) fx('hzhit', p.s.x, p.s.y, p.s);
    });
    for (let i = 0; i < 3; i++) {
      const f = addH('fire', h.x, h.y - 8);
      f.vx = (Math.random() * 2 - 1) * 220;
      f.vy = -480 - Math.random() * 140;
    }
  }

  function hzTick(dt) {
    const df = DF[G.df][1];
    if (df) {
      G.ht -= dt;
      if (G.ht <= 0) {
        G.ht = HZ[G.lm][1] * df * (0.75 + Math.random() * 0.5) * (G.rush ? 0.75 : 1);
        aim();
      }
    }
    for (let i = G.H.length; i--;) {
      const h = G.H[i];
      if (h.w > 0) {
        h.w -= dt;
        if (h.w > 0) continue;
        fx('hz', hx(h), h.y, h.k);
        if (h.k == 'erupt') erupt(h);
        else h.s.setVisible(true);
      }
      if (h.k == 'erupt' || stepH(h, dt)) {
        G.H.splice(i, 1);
        if (h.s) h.s.destroy();
      } else h.s.setPosition(h.x, h.y).setRotation(h.a || 0);
    }
  }

  // Warnings, redrawn every frame: the pukao trembles at the edge it will enter from, the ice shakes loose over
  // a mark where it will land, both behind arrows that march the way they will go, and an eruption heats its ground.
  function hzView() {
    const now = S.time.now, on = ((now / 90) | 0) & 1;
    // Three arrows marching from (x, y) along (dx, dy), the way the hazard will come.
    const arrows = (x, y, dx, dy) => {
      for (let i = 0; i < 3; i++) {
        const n = 30 + i * 22 + ((now / 16) % 22), cx = x + dx * n, cy = y + dy * n, t = (a, b, col) => gfx.fillStyle(col).fillTriangle(cx - dx * a - dy * b, cy - dy * a - dx * b, cx - dx * a + dy * b, cy - dy * a + dx * b, cx + dx * b, cy + dy * b);
        t(4, 15, 0x1b1326);
        t(0, 9, on ? 0xffd23f : 0xff5a4d);
      }
    };
    G.H.forEach((h) => {
      const s = h.s, k = 1 - h.w / (h.k == 'erupt' ? 1200 : 1000);
      if (h.k == 'fire') burst(h.x, h.y, 1, 0xff9a3c);
      if (h.w <= 0) return h.sy && on && burst(h.x, h.y + 14, 1, 0xc9a37a);
      if (h.k == 'roll') {
        s.setVisible(true).setPosition(hx(h) - h.d * 2 + Math.sin(now / 20) * 2, h.y).setRotation(Math.sin(now / 45) * 0.3);
        arrows(hx(h), h.y, h.d, 0);
      } else if (h.k == 'ice') {
        const fy = Math.min(h.fy, H);
        s.setVisible(true).setPosition(h.x + Math.sin(now / 16) * (1 + 3 * k), h.y);
        gfx.lineStyle(2, 0xffffff).beginPath().moveTo(h.x - 26, HB + 2).lineTo(h.x - 14, HB + 8).lineTo(h.x - 4, HB + 3).lineTo(h.x + 8, HB + 9).lineTo(h.x + 24, HB + 2).strokePath();
        arrows(h.x, h.y - 6, 0, 1);
        gfx.fillStyle(0x1b1326).fillRect(h.x - 18, fy - 6, 36, 8).fillStyle(on ? 0xffd23f : 0xff5a4d).fillRect(h.x - 16, fy - 4, 32, 4);
      } else {
        const col = k < 0.4 ? 0xff5a4d : k < 0.75 ? 0xff9a3c : 0xffe08a;
        gfx.fillStyle(0x1b1326).fillRect(h.x0 - 2, h.y - 2, 100, 10).fillStyle(col, on ? 1 : 0.6).fillRect(h.x0, h.y, 96, 6);
        for (let i = 0; i < 6; i++) {
          const fh = (14 + 30 * k) * (0.55 + 0.45 * Math.sin(now / 60 + i * 2.4));
          gfx.fillStyle(col).fillRect(h.x0 + 4 + i * 16, h.y - fh, 8, fh).fillStyle(0xffffff, 0.8).fillRect(h.x0 + 6 + i * 16, h.y - fh * 0.45, 4, fh * 0.45);
        }
        if (on) burst(h.x0 + Math.random() * 96, h.y, 1, col);
      }
    });
  }

  // ---- phases -----------------------------------------------------------

  const best = () => G.P[G.win < 0 ? 0 : G.win].sc;
  const qual = () => best() > 0 && (G.hs.length < 8 || best() > G.hs[G.hs.length - 1].s);

  function go(id) {
    if (G.ph) {
      PHASES[G.ph].out?.();
      UI[G.ph]?.setVisible(false);
    }
    G.ph = id;
    UI[id]?.setVisible(true);
    PHASES[id].in?.();
  }

  function menu() {
    U.menu.forEach((t, i) => t.setTint(i == cur ? 0xffd23f : 0x8a84b8));
    const pick = (i, s) => (cur == i ? '< ' + s + ' >' : s);
    set(U.menu[0], 'JUGAR: ' + pick(0, MAPS[G.mi].n));
    set(U.menu[1], 'MODO: ' + pick(1, G.so ? 'SOLO' : 'DUELO'));
    set(U.menu[2], 'PELIGROS: ' + pick(2, DF[G.df][0]));
    U.hz.put(G.mi).setAlpha(DF[G.df][1] ? 1 : 0.3);
    U.mc.setPosition(356 - U.menu[cur].width / 2, 250 + cur * 34);
  }

  function rank() {
    U.rk.forEach((r, i) => {
      const e = G.lb[G.rl][i], c = [0xffd23f, 0xcfd6e6, 0xe0935a][i] || 0xffffff;
      r[0].setText(i + 1 + '.').setTint(c);
      r[1].setText(e ? e.n : '---').setTint(c);
      r[2].setText(e ? '' + e.s : '').setTint(c);
    });
    set(U.rl, (G.rl > 3 ? 'SOLO' : 'DUELO') + ' - PELIGROS: < ' + DF[G.rl & 3][0] + ' >');
    U.ra.forEach((a) => a.setX(400 - U.rl.width / 2 + (G.rl > 3 ? 24 : 30)));
    const li = G.lb[G.rl].indexOf(G.last);
    U.rc.setVisible(li >= 0).setY(158 + li * 44);
  }

  function fin() {
    fx('ok');
    G.last = { n: nm.l.join(''), s: best() };
    G.hs = G.hs.concat(G.last).sort((a, b) => b.s - a.s).slice(0, 8);
    save();
    go('rank');
  }

  function cell() {
    U.nv.setText([0, 1, 2].map((i) => nm.l[i] || '-').join(' '));
    U.cells.forEach((t, i) => t.setTint(i == nm.i ? 0 : 0xffffff));
    U.cu.setPosition(...U.cp[nm.i]);
  }

  const PHASES = {
    title: {
      in() {
        G.id = 0;
        cur = 0;
        // Physics stays frozen from the end of a match until here, so nothing falls into a pit behind the ranking.
        S.physics.resume();
        if (G.lm != G.mi) {
          lvl();
          reset();
        }
        menu();
        music(S, 'title');
      },
      up(dt) {
        const n = nav();
        if (n.y) { cur = (cur + n.y + 5) % 5; menu(); fx('move'); }
        else if (n.x && cur == 2) {
          G.df = (G.df + n.x + DF.length) % DF.length;
          menu();
          fx('move');
        } else if (n.x && cur == 1) {
          G.so ^= 1;
          reset();
          menu();
          fx('move');
        } else if (n.x && !cur) {
          G.mi = (G.mi + n.x + MAPS.length) % MAPS.length;
          lvl();
          reset();
          menu();
          fx('move');
        }
        if (ok()) { fx('ok'); return go(['ready', 'ready', 'ready', 'rank', 'how'][cur]); }
        G.id = any() ? 0 : G.id + dt;
        if (G.id > 12000) go('rank');
        set(U.best, G.hs[0] ? 'RÉCORD  ' + G.hs[0].n + '  ' + G.hs[0].s : '');
      },
    },
    how: {
      in() { G.id = 0; },
      up(dt) { G.id += dt; if ((G.id > 400 && ok()) || G.id > 20000) { fx('ok'); go('title'); } },
    },
    rank: {
      in() { G.id = 0; G.rl = G.so * 4 + G.df; rank(); },
      up(dt) {
        const n = nav();
        G.id += dt;
        if (n.x || n.y) {
          // Left and right walk the levels of this mode, up and down switch the mode.
          G.rl = n.y ? G.rl ^ 4 : (G.rl & 4) | (((G.rl & 3) + n.x + DF.length) % DF.length);
          G.id = Math.min(G.id, 601);
          rank();
          fx('move');
        }
        if ((G.id > 600 && ok()) || G.id > 12000) go('title');
      },
    },
    ready: {
      in() {
        G.last = null;
        lvl();
        reset();
        G.cd = 0;
        music(S, 'off');
        U.rn.setText(MAPS[G.mi].n);
        U.rh.put(G.mi).setVisible(!!DF[G.df][1]);
        U.pt[1].setVisible(!G.so);
        fx('map', W / 2, H / 2, G.mi);
      },
      up(dt) {
        G.cd += dt;
        const s = (G.cd / 1000) | 0, lab = s < 3 ? '' + (3 - s) : '¡YA!';
        if (set(U.cd, lab)) fx(s < 3 ? 'count' : 'go', W / 2, H / 2, 3 - s);
        if (G.cd >= 3700) { music(S, 'play'); go('play'); }
      },
    },
    play: {
      up(dt) {
        if (pressed.START1 || pressed.START2) return go('pause');
        tick(dt);
        G.P.filter(here).forEach((p) => move(p, dt));
        G.K.forEach((k) => {
          if (k.own) k.s.setPosition(k.own.s.x, k.own.s.y - 52);
          else if (k.live) ring(k.s);
        });
        G.P.filter(here).forEach(grab);
        if (!G.so) {
          stomp(G.P[0], G.P[1]);
          stomp(G.P[1], G.P[0]);
        }
        G.P.filter(here).forEach((p) => G.C.forEach((c) => poke(p, c)));
        view();
        if (G.t <= 0) return go('end');
        // The next wave comes 1.2 s after the sixth chest pays, or after 10 s with one chest left shut,
        // so nobody can stall the match by sitting on the last key.
        const paid = G.C.filter((c) => c.st == 2).length, lim = paid > 5 ? 1200 : paid > 4 && G.C.some((c) => !c.st) ? 10000 : 0;
        G.wd = lim ? G.wd + dt : 0;
        if (lim && G.wd >= lim) {
          G.wv++;
          deal();
          fx('wave', W / 2, H / 2, G.wv);
        }
      },
    },
    pause: {
      in() { S.physics.pause(); },
      up() { if (pressed.START1 || pressed.START2) go('play'); },
      out() { S.physics.resume(); },
    },
    end: {
      in() {
        S.physics.pause();
        music(S, 'off');
        G.mi = (G.mi + 1) % MAPS.length;
        G.t = Math.max(G.t, 0);
        G.C.forEach((c) => c.st == 1 && settle(c));
        G.P.forEach((p) => Object.assign(p, { pw: null, sk: 0, slow: 0, fast: 0, dz: 0, luck: 0, kx: 0 }));
        const [a, b] = [G.P[0].sc, G.P[1].sc];
        // Solo has no winner and no tie: player 1 is the one who scores.
        G.win = G.so || a > b ? 0 : a == b ? -1 : 1;
        G.et = 0;
        view();
        fx(G.so ? 'endsolo' : 'end', W / 2, H / 2, G.win);
        U.ew.setText(G.so ? 'PUNTAJE: ' + a : G.win < 0 ? 'EMPATE' : 'GANA JUGADOR ' + (G.win + 1)).setTint(G.win < 0 ? 0xffd23f : PC[G.win]);
        U.es[0].setText(G.so ? '' : 'JUGADOR 1: ' + a);
        U.es[1].setText(G.so ? '' : 'JUGADOR 2: ' + b);
      },
      up(dt) {
        G.et += dt;
        if (G.et - dt < 800 && G.et >= 800) fx('fanfare', W / 2, H / 2, G.win);
        if (G.et >= 3000) go(qual() ? 'name' : 'rank');
      },
    },
    name: {
      in() {
        nm.l = [];
        nm.i = 0;
        const col = G.win < 0 ? 0xffd23f : PC[G.win];
        U.nh.setText(G.win < 0 ? 'EMPATE: INICIALES COMPARTIDAS' : (G.so ? '' : 'JUGADOR ' + (G.win + 1) + ': ') + '¡ENTRASTE AL RANKING!').setTint(col);
        U.cu.setFillStyle(col);
        G.id = 0;
        cell();
      },
      up(dt) {
        const n = nav();
        G.id = any() ? 0 : G.id + dt;
        if (G.id > 20000) return nm.l.length ? fin() : go('rank');
        if (n.x || n.y) {
          nm.i = ((((nm.i / 7) | 0) + n.y + 4) % 4) * 7 + ((nm.i % 7) + n.x + 7) % 7;
          fx('move');
        }
        if (ok()) {
          if (nm.i < 26) {
            if (nm.l.length < 3) nm.l.push(ABC[nm.i]);
            if (nm.l.length == 3) nm.i = 27;
            fx('type');
          } else if (nm.i == 26) {
            nm.l.pop();
            fx('type');
          } else if (nm.l.length) return fin();
        }
        cell();
      },
    },
  };

  // ---- storage ----------------------------------------------------------

  const valid = (e) => e && typeof e.n == 'string' && /^[A-Z]{1,3}$/.test(e.n) && Number.isInteger(e.s) && e.s >= 0;

  // Anything unreadable counts as missing, so a broken v2 still falls back to v1.
  async function read(k) {
    try {
      const st = window.platanusArcadeStorage;
      if (st) {
        const r = await st.get(k);
        return r && r.found ? r.value : null;
      }
      const r = window.localStorage.getItem(k);
      return r && JSON.parse(r);
    } catch (e) {
      return null;
    }
  }

  async function load() {
    try {
      let v = await read(SK);
      if (!Array.isArray(v) || v.length != G.lb.length || !v.every(Array.isArray)) {
        v = await read(SK1);
        v = G.lb.map((_, i) => (i || !Array.isArray(v) ? [] : v));
      }
      v.forEach((l, i) => { G.lb[i] = G.lb[i].concat(l.filter(valid)).map((e) => ({ n: e.n, s: e.s })).sort((a, b) => b.s - a.s).slice(0, 8); });
      if (G.ph == 'rank') rank();
    } catch (e) { /* ranking stays in memory */ }
  }

  // Saving writes every list, so it waits for the load: otherwise a slow load would lose the stored ones.
  async function save() {
    try {
      await LD;
      const st = window.platanusArcadeStorage;
      if (st) await st.set(SK, G.lb);
      else window.localStorage.setItem(SK, JSON.stringify(G.lb));
    } catch (e) { /* ranking stays in memory */ }
  }

  // ---- scene ------------------------------------------------------------

  function mkUI(id, dim) {
    const c = S.add.container(0, 0).setDepth(10).setVisible(false);
    c.add(S.add.rectangle(W / 2, H / 2, W, H, 0x0e0b22, dim));
    return (UI[id] = c);
  }

  function L(c, x, y, s, z, col, ox = 0.5) {
    const t = txt(S, x, y, s, z, col).setOrigin(ox, 0.5);
    c.add(t);
    return t;
  }

  function big(c, y, s, z) {
    L(c, 400 + z / 2, y + z / 2, s, z, 0x8a4a12);
    L(c, 400, y, s, z, 0xffd23f);
  }

  function hudTxt(x, y, s, z, col, ox) {
    return txt(S, x, y, s, z, col).setOrigin(ox, 0.5).setDepth(8);
  }

  // Loads MAPS[G.mi]. The colliders and the six chests live on across maps, so only their contents move.
  function lvl() {
    if (G.lm === G.mi) return;
    G.lm = G.mi;
    const m = MAPS[G.mi], n = [];
    sg.clear(true, true);
    pg.clear(true, true);
    // One extra column per side, mirrored off screen, so the floor continues under a wrapping player.
    m.L.forEach((row, r) => {
      for (let c = -1; c <= 25; c++) {
        const ch = row[(c + 25) % 25], x = c * T + T / 2, y = HB + r * T;
        if (ch == '#') sg.create(x, y + T / 2, 'tile', m.th).setDepth(1);
        else if (ch == '=') {
          const s = pg.create(x, y + 6, 'plat', m.th * 3 + (row[(c + 24) % 25] != '=' ? 0 : row[(c + 26) % 25] != '=' ? 2 : 1)).setDepth(1);
          s.body.setSize(T, 8, false);
          const k = s.body.checkCollision;
          k.down = k.left = k.right = false;
        } else if (ch == 'C' && c >= 0 && c < 25) n.push([x, y + T / 2]);
      }
    });
    G.C.forEach((c, i) => {
      const [x, y] = n[i];
      c.s.setPosition(x, y);
      c.t.setPosition(x, y - 64);
      c.b.setPosition(x, y - 64).body.updateFromGameObject();
    });
    m.PS.forEach(([x, y], i) => U.pt[i].setPosition(x * T + T / 2, HB + y * T - 64));
    bg(S, m);
  }

  function build() {
    kitTex(S);
    sg = S.physics.add.staticGroup();
    pg = S.physics.add.staticGroup();
    const bz = [];
    kg = S.physics.add.group();
    gfx = S.add.graphics().setDepth(5);
    for (let i = 0; i < 6; i++) {
      const b = S.physics.add.existing(S.add.zone(0, 0, 48, 32), true);
      b.body.enable = false;
      b.o = { id: i, s: S.add.image(0, 0, 'chest', 0).setDepth(2), st: 0, k: null, m: [], by: -1, ri: 0, rt: 0, life: 0, x: 1, r: REEL, lk: 0, b, t: txt(S, 0, 0, '', 3).setOrigin(0.5, 0.5).setDepth(5), q: S.add.image(0, 0, 'key', 0).setDepth(5) };
      G.C.push(b.o);
      bz.push(b);
    }
    for (let i = 0; i < 6; i++) mkKey(0);
    [0, 1].forEach((i) => {
      const s = S.physics.add.sprite(0, 0, 'p' + i, 0).setOrigin(0.5, 1).setDepth(4);
      s.body.setSize(18, 34).setOffset(7, 6);
      s.body.maxVelocity.y = PH.fall;
      s.o = { i, s, sc: 0, sk: 0, k: null, pw: null, slow: 0, stun: 0, inv: 0, np: 0, fast: 0, dz: 0, luck: 0, rf: 0, cy: 0, jb: 0, cj: 0, g: 0, vy: 0, kx: 0 };
      G.P.push(s.o);
    });
    const ps = G.P.map((p) => p.s);
    [sg, pg].forEach((g) => { S.physics.add.collider(ps, g); S.physics.add.collider(kg, g); });
    S.physics.add.collider(ps, S.physics.add.existing(S.add.zone(W / 2, HB - 8, W + 64, 16), true));
    S.physics.add.collider(ps, bz, (a, b) => {
      const c = b.o;
      // The box arms 400 ms after it appears, so the jump that opened the chest cannot also stop the slot.
      if (c.st == 1 && c.life < 5600 && c.by == a.o.i && a.body.touching.up && b.body.touching.down) settle(c);
    });
    hudUI();
    screens();
  }

  function hudUI() {
    hud.tm = hudTxt(W / 2, 17, '', 3, undefined, 0.5);
    for (let k = 0; k < 6; k++) hud.ch.push(S.add.image(W / 2 + (k - 2.5) * 22, 42, 'chest', 0).setScale(0.5).setDepth(8));
    [0, 1].forEach((i) => {
      const d = i ? -1 : 1, x = i ? W : 0;
      hud.o[i].push(hudTxt(x + d * 12, 17, 'P' + (i + 1), 2, PC[i], i));
      hud.sc.push(hudTxt(x + d * 46, 17, '', 3, 0xffffff, i));
      hud.o[i].push(hud.sc[i]);
      [[26, 32], [62, 22]].forEach(([o, w]) => hud.o[i].push(S.add.rectangle(x + d * o, 41, w, 20, 0x1b1736).setStrokeStyle(1, 0x3a3566).setDepth(7)));
      hud.ki.push(S.add.image(x + d * 26, 41, 'key', 0).setDepth(8));
      hud.pi.push(S.add.image(x + d * 62, 41, 'ic', 0).setDepth(8));
      hud.pn.push(hudTxt(x + d * 80, 41, '', 2, PC[i], i));
      hud.sk.push(hudTxt(x + d * 150, 17, '', 2, 0xffd23f, i));
      hud.o[i].push(hud.pn[i], hud.sk[i]);
      hud.st.push(S.add.image(0, 0, 'ic', 0).setDepth(6));
    });
    hud.rb = hudTxt(W - 12, 17, '', 2, 0xffd23f, 1);
  }

  // The hazard of a map on a dark plate: its sprite and one line. put(mi) fills it in.
  function chip(c, y) {
    const k = S.add.container(0, y), i = S.add.image(0, 0, 'hz'), t = txt(S, 0, 0, '', 2).setOrigin(0, 0.5);
    k.add([S.add.rectangle(400, 0, 600, 36, 0x1b1326, 0.9).setStrokeStyle(2, 0x8a4a12), i, t]);
    c.add(k);
    k.put = (mi) => {
      const hz = MAPS[mi].hz;
      t.setText(hz.n + ': ' + hz.d);
      i.setFrame(mi).setX(396 - t.width / 2);
      t.setX(i.x + 22);
      return k;
    };
    return k;
  }

  function screens() {
    let c = mkUI('title', 0.72);
    deco(S, c);
    big(c, 84, 'FIEBRE DE', 6);
    big(c, 154, 'TESOROS', 10);
    U.menu = ['JUGAR', 'MODO', 'PELIGROS', 'RANKING', 'CÓMO JUGAR'].map((s, i) => L(c, 400, 250 + i * 34, s, 3));
    U.mc = S.add.image(0, 0, 'key', 6).setScale(2);
    c.add(U.mc);
    U.hz = chip(c, 432);
    U.best = L(c, 400, 470, '', 2, 0xffffff);
    L(c, 400, 578, 'PALANCA: ELEGIR Y CAMBIAR. BOTÓN 1: CONFIRMAR', 2, 0x8a84b8);

    c = mkUI('how', 0.93);
    big(c, 34, 'CÓMO JUGAR', 4);
    [
      ['p0', 0, 'PALANCA: MOVERTE. BOTÓN 1: SALTAR'],
      ['key', 0, 'TOCA UNA LLAVE PARA TOMARLA'],
      ['key', 6, 'PARA CAMBIARLA: PALANCA ABAJO SOBRE OTRA LLAVE'],
      ['chest', 0, 'TOCA UN COFRE CON LA LLAVE PARA PROBARLA'],
      ['chest', 1, 'SI ABRE, GOLPEA LA CAJA DESDE ABAJO O USA BOTÓN 2'],
      ['box', 0, 'LAS CAJAS DAN POWERUPS. BOTÓN 2 LOS USA'],
      ['p1', 5, 'PISA AL RIVAL PARA QUE SUELTE SU LLAVE'],
      ['hz', 2, 'PELIGROS DEL MAPA: TE ATURDEN Y SUELTAS LA LLAVE'],
    ].forEach(([k, f, s], i) => {
      c.add(S.add.image(96, 76 + i * 32, k, f));
      L(c, 132, 76 + i * 32, s, 2, 0xffffff, 0);
    });
    c.add([S.add.image(36, 300, 'hz', 0), S.add.image(66, 300, 'hz', 1)]);
    L(c, 400, 330, 'RACHA: CADA COFRE SEGUIDO VALE MÁS, X2 Y LUEGO X3', 2, 0xffd23f);
    L(c, 400, 352, 'AL ABRIR LOS SEIS LLEGA OTRA OLEADA. GANA QUIEN SUME MÁS', 2, 0xffd23f);
    L(c, 400, 374, 'MODO SOLO: SIN RIVAL, A SUPERAR EL RÉCORD', 2, 0xffd23f);
    L(c, 400, 400, 'POWERUPS', 2, 0x8a84b8);
    PW.forEach((w, i) => {
      const x = 76 + (i % 2) * 348, y = 422 + ((i / 2) | 0) * 25;
      c.add(S.add.image(x, y, 'ic', w.f));
      L(c, x + 18, y, w.n + ': ' + w.d, 2, 0xffffff, 0);
    });
    L(c, 400, 578, 'BOTÓN PARA VOLVER', 2, 0x8a84b8);

    c = mkUI('rank', 0.9);
    big(c, 56, 'RANKING', 6);
    U.rl = L(c, 400, 114, '', 2, 0xff9a3c);
    // The stick's up and down switch the mode, so the mode word sits between two arrows.
    U.ra = [S.add.triangle(0, 98, 0, 8, 6, 0, 12, 8, 0xff9a3c), S.add.triangle(0, 130, 0, 0, 12, 0, 6, 8, 0xff9a3c)];
    U.rc = S.add.image(190, 0, 'key', 6).setScale(2);
    c.add([U.rc, ...U.ra]);
    U.rk = [...Array(8).keys()].map((i) => [L(c, 230, 158 + i * 44, '', 3, 0xffffff, 0), L(c, 330, 158 + i * 44, '', 3, 0xffffff, 0), L(c, 570, 158 + i * 44, '', 3, 0xffffff, 1)]);
    L(c, 400, 578, 'PALANCA: CAMBIAR. BOTÓN: VOLVER', 2, 0x8a84b8);

    c = mkUI('ready', 0.3);
    U.cd = L(c, 400, 300, '', 12, 0xffd23f);
    U.pt = [0, 1].map((i) => L(c, 0, 0, 'P' + (i + 1), 2, PC[i]));
    U.rn = L(c, 400, 100, '', 5, 0xffd23f);
    U.rh = chip(c, 146);

    c = mkUI('pause', 0.75);
    big(c, 270, 'PAUSA', 8);
    L(c, 400, 350, 'START PARA SEGUIR', 2);

    c = mkUI('end', 0.75);
    U.ew = L(c, 400, 230, '', 5);
    U.es = [L(c, 250, 320, '', 3, PC[0]), L(c, 550, 320, '', 3, PC[1])];

    c = mkUI('name', 0.9);
    U.nh = L(c, 400, 70, '', 3);
    U.nv = L(c, 400, 150, '', 6);
    U.cu = S.add.rectangle(0, 0, 60, 44, PC[0]);
    c.add(U.cu);
    U.cp = [...Array(28).keys()].map((i) => [400 + ((i % 7) - 3) * 72, 250 + ((i / 7) | 0) * 56]);
    U.cells = U.cp.map(([x, y], i) => L(c, x, y, i < 26 ? ABC[i] : i == 26 ? 'DEL' : 'FIN', i < 26 ? 3 : 2));
    L(c, 400, 578, 'ELIGE TUS INICIALES Y TERMINA CON FIN', 2, 0x8a84b8);
  }

  function create() {
    S = this;
    S.G = G;
    build();
    lvl();
    reset();
    LD = load();
    go('title');
  }

  function update(_, d) {
    PHASES[G.ph].up(Math.min(d, 50));
    for (const k in pressed) delete pressed[k];
  }

  // ==== KIT ====
  const FC = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,:!¡?¿-+/'<> ÁÉÍÓÚÑ";
  const FD =
    'ehhvhhhuhhuhhuehgggheuhhhhhuvgguggvvggugggehgnhhehhhvhhhe44444e72222ichikokihggggggvhrllhhhhpljhhhehhhhheuhhugggehhhliduhhukihfgge11uv444444hhhhhhehhhhha4hhhllrhhha4ahhhha4444v1248gvehjlphe4c4444eeh1248vu11e11u26aiv22vgu11heegguhhev124444ehhehheehhf11e00000cc0000c480cc0cc044444044044444eh124044048ghe000v000044v44011248gg4480000248g842g84248g';

  const PAL = {
    o: '#1b1326',
    e: '#d9966a',
    x: '#3b2418',
    X: '#5e3a24',
    h: '#b0763a',
    H: '#7a4a22',
    s: '#f6cfa0',
    b: '#4a3059',
    w: '#ffffff',
    l: '#b9bccb',
    g: '#ffd23f',
    G: '#c9902a',
    W: '#a5622f',
    D: '#6e3b1c',
    v: '#7b4dff',
    u: '#a98bff',
    V: '#4a2bb8',
    t: '#5fe37a',
    T: '#2f9e4c',
    m: '#6fd26b',
    M: '#3f9a4f',
    S: '#55647a',
    a: '#7c8ca3',
    k: '#2b3345',
    r: '#ff5a4d',
    R: '#c93a3a',
    n: '#ff9a3c',
    i: '#8fe3ff',
    y: '#e1ff00',
    p: '#ff6ec7',
  };

  // Players are 16x20: a head (rows 0-7, one per player), eyes (8-9), torso with arms (10-15) and legs (16-19).
  // Frames: 0 idle, 1-2 walk, 3 jump, 4 fall, 5 stunned, 6 cheering. c and d are the player's colour and its shade.
  const P_HEAD = [
    '................' +
      '.....oooooo.....' +
      '....ohhhhhHo....' +
      '....ohhhhhHo....' +
      '....occcccdo....' +
      '..oohhhhhhhhhoo.' +
      '...ooHHHHHHHoo..' +
      '...oeeeeeeeeo...',
    '................' +
      '.....oooooo.....' +
      '....oxxxxxXxo...' +
      '...oxxxxxxxXxo..' +
      '.ooxxccccccccdo.' +
      '.oXoxxxxxxxxxo..' +
      '.oxoxxeeeeeexo..' +
      '.oxoxeeeeeeeeo..',
  ];
  const P_EYE = ['...ossssososo...' + '...ossssososo...', '...osssssssso...' + '...ossoosooso...'];
  const P_ARM = [
    '....oessssso....' + '..oocccccccdo...' + '.ohocccccccdso..' + '.ohocccccccoso..',
    '....oessssso....' + '..oocccccccdo...' + '.ohocccccccdo...' + '.ohoscccccccso..',
    '....oessssso.os.' + '..oocccccccdocs.' + '.ohocccccccddo..' + '.ohocccccccdo...',
    '.s..oessosso..s.' + '.coocccccccdooc.' + '.oocccccccccdoo.' + '...ocsccccccdo..',
    '....oessssso....' + '...occcccccdo...' + '..ohcccccccdo...' + '..ohcccccccco...',
    '.s..oessRRso..s.' + '.coocccccccdooc.' + '.oocccccccccdoo.' + '...ocsccccccdo..',
  ];
  const P_BELT = ['..oohhhghhhoo...', '..oohhhghhhoso..', '...ohhhghhhho...', '..osohhghhhos...'];
  const P_LEG = [
    '...obbbobbbo....' + '...obbo.obbo....' + '..oHHHo.oHHHo...' + '..ooooo.ooooo...',
    '...obbbobbbo....' + '..obbo...obbo...' + '.oHHHo...oHHHo..' + '.ooooo...ooooo..',
    '....obbbbbo.....' + '....obbobbo.....' + '...oHHHoHHHo....' + '...oooooooo.....',
    '...obbbobbbo....' + '..obbo..obbo....' + '..oHHo..oHHHo...' + '..ooo...ooooo...',
    '...obbbobbbo....' + '...obbo..obbo...' + '...oHHHo.oHHHo..' + '...oooo..oooo...',
    '...obbbobbbo....' + '....obbobbo.....' + '...oHHHo.oHHo...' + '...ooooo.ooo....',
  ];
  // Per frame: eyes, arms, belt, legs.
  const P_FR = ['0000', '0111', '0002', '0203', '0324', '1435', '0520'];

  const CH_LID =
    '..oooooooooooo..' +
    '.oWWgWWWWWWgWWo.' +
    'oWWWgWWWWWWgWWWo' +
    'oWWWgWWWWWWgWWWo' +
    'oDDDgDDDDDDgDDDo' +
    'oggggggggggggggo' +
    'oGGGGGoggoGGGGGo' +
    'ooooooogGooooooo';
  const CH_OPEN =
    '.oooooooooooooo.' +
    'oDDDgDDDDDDgDDDo' +
    'oDDDgDDDDDDgDDDo' +
    '.oooooooooooooo.' +
    '..ogwgggwgggwo..' +
    '.ogggwgggggwgggo' +
    'oggggggggggggggo' +
    'oooooooooooooooo';
  const CH_BASE =
    'oWWWgWogGoWgWWWo' +
    'oWWWgWWooWWgWWWo' +
    'oWWWgWWWWWWgWWWo' +
    'oWWWgWWWWWWgWWWo' +
    'oDDDgDDDDDDgDDDo' +
    'oDDDgDDDDDDgDDDo' +
    'oGGGGGGGGGGGGGGo' +
    '.oooooooooooooo.';

  const KEY =
    '.ooo........' +
    'owwwo.......' +
    'owowoooooooo' +
    'owowwwwwwwwo' +
    'ololooololoo' +
    'olllo.ololo.' +
    '.ooo...o.o..';

  const BOX =
    '.oooooooooo.' +
    'ovvvvvvvvvvo' +
    'ovvvwwwwvvvo' +
    'ovvwwvvwwvvo' +
    'ovvvvvvwwvvo' +
    'ovvvvvwwvvvo' +
    'ovvvvwwvvvvo' +
    'ovvvvwwvvvvo' +
    'ovvvvvvvvvvo' +
    'ovvvvwwvvvvo' +
    'oVVVVVVVVVVo' +
    '.oooooooooo.';

  const IC = [
    '...tt...' + 't.TTTT.t' + '.TtTTtT.' + '.TTttTT.' + '.TTttTT.' + '.TtTTtT.' + 't.TTTT.t' + '........',
    '........' + '.ggg....' + 'gg.gg...' + 'g...gggg' + 'gg.gg.gg' + '.ggg..g.' + '........' + '........',
    '........' + '....n...' + 'nnnnnn..' + '....n...' + '...n....' + '..nnnnnn' + '...n....' + '........',
    '........' + 'ww....ww' + 'ww....ww' + 'rr....rr' + 'rr....rr' + 'rrr..rrr' + '.rrrrrr.' + '..rrrr..',
    '.lll....' + 'liiwl...' + 'liiil...' + 'liiil...' + '.lllW...' + '....WW..' + '.....WW.' + '......W.',
    '......t.' + '.....tT.' + '...rrr..' + '..rrrr..' + '.rrrR...' + 'rrrR....' + 'rrR.....' + 'R.......',
    '.tt.tt..' + 'tttTttt.' + 'tttTttt.' + '.TTTTT..' + 'tttTttt.' + 'tttTttt.' + '.tt.tT..' + '.....T..',
    'l.....l.' + '.l...l..' + '..l.l...' + '...l....' + '..r.r...' + '.rr.rr..' + 'r.r.r.r.' + '.rr.rr..',
    '.uuuuu..' + 'u.....u.' + 'u.uuu.u.' + 'u.u.u.u.' + 'u.u...u.' + 'u.uuuuu.' + 'u.......' + '.uuuuuu.',
    '..y.....' + '.yyy....' + 'yyyyy...' + '..y..p..' + '..y..p..' + '...ppppp' + '....ppp.' + '.....p..',
    'aaanaaaa' + 'aaanaaaa' + 'aannaaaa' + 'SSnSSSSS' + 'SSnnSSSS' + 'SSSnSSSS' + 'SSSnnSSS' + 'SSSSnSSS',
  ];
  // Hazards: pukao, ice and fireball, in their own colours (a b c stone, i e ice).
  const HAZ = [
    '....oooooo....' + '..ooccaaaaoo..' + '.occaaaaaaabo.' + '.ocaaabbaaabo.' + 'ocaaaabbaaaabo' + 'ocaaaaaaaaaabo' + 'oaaaaaaaaaabbo' + 'oaabaaaaaaabbo' + 'oaabbaaaaaabbo' + 'oaaaaaaaaabbbo' + '.oaaaaaaabbbo.' + '.obbaaabbbbbo.' + '..oobbbbbboo..' + '....oooooo....',
    '..oooooooooo..' + '.owwwiiiiieeo.' + '.owwiiiiiieeo.' + '.owiiiwiiieeo.' + '..oiiiwiiieo..' + '..oiiiiiiieo..' + '..owiiiiieeo..' + '...oiiiiieo...' + '...oiwiiieo...' + '....oiiieo....' + '....oiiieo....' + '.....oieo.....' + '.....oieo.....' + '......oo......',
    '..............' + '......r.......' + '.....rr..r....' + '....rnnr.r....' + '...rnnnnrr....' + '..rnnggnnnr...' + '..rnggggnnr...' + '.rnnggwggnnr..' + '.rnnggwwgnnr..' + '.rnnngggnnnr..' + '..rnnnggnnr...' + '..rrnnnnnrr...' + '...rrrrrrr....' + '..............',
  ];
  const CROWN = 'g...g...g' + 'gg.ggg.gg' + 'ggggggggg' + 'gwggrggwg' + 'GGGGGGGGG';
  const COIN = '.gggg.' + 'gwgggG' + 'gwgggG' + 'gggggG' + 'gggggG' + '.GGGG.';

  const TILE =
    'mmmmmmmmmmmmmmmm' +
    'mmMmmmmMmmmmmMmm' +
    'MMaMMaMMMMaMMMaM' +
    'kaaaaaaakaaaaaaa' +
    'kSSSSSSSkSSScSSS' +
    'kSSSSSSSkSSSScSS' +
    'kSSSSSSSkSSSScSS' +
    'kkkkkkkkkkkkkckk' +
    'aaaakaaaaaaakcaa' +
    'SScSkSSSSSSSkSSS' +
    'SSScSSSSSSSSkSSS' +
    'SSSckSSSSSSSkSSS' +
    'kkkkckkkkkkkkkkk' +
    'kaaaacaakaaaaaaa' +
    'kSSSSScSkSSSSSSS' +
    'kSSSSSScSSSSSSSS';

  const PL_MID =
    'mmmmmmmmmmmmmmmm' +
    'MmMMmMmMMmMMmMmM' +
    'aaaaaaaaaaaaaaaa' +
    'SSScSSSkSSSSSSSk' +
    'SSSScSSkSSSSSSSk' +
    'kkkkkkkkkkkkkkkk';
  const PL_END =
    '.mmmmmmmmmmmmmmm' +
    'kMmMMmMmMMmMMmMm' +
    'kaaaaaaaaaaaaaaa' +
    'kSSSSSSkSSSSSSSk' +
    '.kSSSSSkSSSSSSSk' +
    '..kkkkkkkkkkkkkk';

  const BN = [];
  const LT = [];
  let BGI;
  let CN;
  let AC;
  let SG;
  let MG;
  let EM;
  let mTimer;
  let mMode;
  let mStep;
  let mNext;

  const flip = (s, w) =>
    s
      .match(new RegExp('.{' + w + '}', 'g'))
      .map((r) => [...r].reverse().join(''))
      .join('');

  const hex = (n) => '#' + n.toString(16).padStart(6, '0');

  // Draws a pixel string w wide at (x, y), z px per pixel. Chars missing from pal stay transparent.
  function stamp(c, str, w, pal, x, y, z) {
    for (let n = 0; n < str.length; n++) {
      const col = pal[str[n]];
      if (col) {
        c.fillStyle = col;
        c.fillRect(x + (n % w) * z, y + ((n / w) | 0) * z, z, z);
      }
    }
  }

  function sheet(scene, key, fw, fh, frames, pal, z) {
    const t = scene.textures.createCanvas(key, fw * z * frames.length, fh * z);
    frames.forEach((f, i) => {
      stamp(t.getContext(), f, fw, pal.call ? pal(i) : pal, i * fw * z, 0, z);
      t.add(i, 0, i * fw * z, 0, fw * z, fh * z);
    });
    t.refresh();
  }

  function kitTex(scene) {
    AC = scene.sound.context;
    if (AC) {
      SG = AC.createGain();
      SG.gain.value = 0.5;
      SG.connect(AC.destination);
      MG = AC.createGain();
      MG.gain.value = 0.2;
      MG.connect(AC.destination);
    }

    PC.forEach((col, i) => {
      const c = Phaser.Display.Color.IntegerToColor(col);
      const frames = P_FR.map(([e, a, b, l]) => P_HEAD[i] + P_EYE[e] + P_ARM[a] + P_BELT[b] + '...obbbbbbbo....' + P_LEG[l]);
      sheet(scene, 'p' + i, 16, 20, frames, { ...PAL, c: hex(col), d: c.clone().darken(28).rgba }, 2);
    });
    sheet(scene, 'chest', 16, 16, [CH_LID + CH_BASE, CH_OPEN + CH_BASE], PAL, 2);
    sheet(scene, 'key', 12, 7, Array(7).fill(KEY), (i) => {
      const c = Phaser.Display.Color.IntegerToColor(KC[i] || 0xffd23f);
      return { o: PAL.o, w: c.rgba, l: c.clone().darken(25).rgba };
    }, 2);
    sheet(scene, 'box', 12, 12, [BOX, BOX.replace(/v/g, 'u')], PAL, 2);
    sheet(scene, 'ic', 8, 8, IC, PAL, 2);
    sheet(scene, 'hz', 14, 14, HAZ, { ...PAL, a: '#b8452f', b: '#7d2a26', c: '#e0704a', e: '#4d9fe0' }, 2);
    sheet(scene, 'tile', 16, 16, [TILE, TILE, TILE], (i) => ({ ...PAL, c: TH[i].p.S, ...TH[i].p }), 2);
    sheet(scene, 'plat', 16, 6, [0, 1, 2].flatMap(() => [PL_END, PL_MID, flip(PL_END, 16)]), (i) => ({ ...PAL, c: TH[(i / 3) | 0].p.S, ...TH[(i / 3) | 0].p }), 2);
    sheet(scene, 'px', 1, 1, ['w'], PAL, 4);
    sheet(scene, 'coin', 6, 6, [COIN], PAL, 2);
    sheet(scene, 'crown', 9, 5, [CROWN], PAL, 2);

    const cols = 28;
    const ft = scene.textures.createCanvas('font', cols * 6, 20);
    const fc = ft.getContext();
    [1, 0].forEach((sh) => {
      fc.fillStyle = sh ? PAL.o : '#fff';
      for (let g = 0; g < FC.length; g++) {
        const acc = g - 50;
        const src = acc < 0 ? g : FC.indexOf('AEIOUN'[acc]);
        const dot = (x, y) => fc.fillRect((g % cols) * 6 + x + sh, ((g / cols) | 0) * 10 + y + sh, 1, 1);
        for (let r = 0; r < 7; r++) {
          const v = parseInt(FD[src * 7 + r] || 0, 32);
          for (let x = 0; x < 5; x++) if ((v >> (4 - x)) & 1) dot(x, r + 2);
        }
        if (acc == 5) [1, 2, 3].forEach((x) => dot(x, 0));
        else if (acc >= 0) (dot(3, 0), dot(2, 1));
      }
    });
    ft.refresh();
    scene.cache.bitmapFont.add(
      'f',
      Phaser.GameObjects.RetroFont.Parse(scene, { image: 'font', width: 6, height: 10, chars: FC, charsPerRow: cols }),
    );

    EM = scene.add
      .particles(0, 0, 'px', {
        speed: { min: 40, max: 190 },
        angle: { min: 0, max: 360 },
        lifespan: { min: 260, max: 620 },
        gravityY: 520,
        scale: { start: 1.2, end: 0 },
        emitting: false,
      })
      .setDepth(5);
    CN = scene.add
      .particles(0, 0, 'coin', {
        speed: { min: 140, max: 330 },
        angle: { min: 235, max: 305 },
        lifespan: { min: 500, max: 900 },
        gravityY: 900,
        emitting: false,
      })
      .setDepth(11);
  }

  function txt(scene, x, y, str, size, tint) {
    const t = scene.add.bitmapText(x, y, 'f', str).setScale(size || 1);
    return tint === undefined ? t : t.setTint(tint);
  }

  // Title dressing: both players running in place and a chest that spits coins.
  function deco(scene, c) {
    const add = (x, y, k, f, z) => {
      const o = scene.add.image(x, y, k, f).setScale(z);
      c.add(o);
      return o;
    };
    const run = [add(96, 400, 'p0', 1, 3).setOrigin(0.5, 1), add(704, 400, 'p1', 1, 3).setOrigin(0.5, 1).setFlipX(true)];
    add(400, 528, 'chest', 1, 2);
    let n = 0;
    scene.time.addEvent({
      delay: 130,
      loop: true,
      callback: () => {
        if (!c.visible) return;
        n++;
        run.forEach((o, i) => o.setFrame(1 + (n & 1)).setVisible(!i || !scene.G.so));
        if (n % 6 == 0) CN.explode(1, 400, 516);
      },
    });
  }

  // Per theme: tile palette, sky stops and the height where they end, light glow as rgb, flame colours and
  // the ambient particles [y min, y max, vy min, vy max, lifespan, frequency, tints].
  const TH = [
    {
      p: { m: '#a7cf4f', M: '#5c9440', a: '#5f5874', S: '#3b344c', k: '#1b1628' },
      sky: ['#1a1442', '#43266b', '#a8446c', '#f0924e'], hy: 404, gl: '255,170,60', fl: [0xffb13d, 0xfff2a8],
      am: [90, 560, -10, 10, 4200, 300, [0xffe2a8, 0xff9a6c]],
    },
    {
      p: { m: '#f4fbff', M: '#a9d8f5', a: '#97a6c6', S: '#67779f', k: '#2b3964' },
      sky: ['#07122e', '#12366b', '#3f7fb0'], hy: 440, gl: '255,170,60', fl: [0xffb13d, 0xfff2a8],
      am: [56, 56, 30, 70, 9000, 110, [0xffffff, 0xbfe6ff]],
    },
    {
      p: { m: '#ffb13d', M: '#e2542b', a: '#8d6f7c', S: '#59404f', k: '#261722', c: '#ff7a2e' },
      sky: ['#0b0922', '#2b123f', '#7a2a3c', '#c2562e'], hy: 460, gl: '255,110,40', fl: [0xff7a2e, 0xffe08a],
      am: [600, 600, -110, -40, 5200, 90, [0xff9a3c, 0xff5a4d, 0xffd23f]],
    },
  ];

  const MOAI =
    '...bbbbbb...' +
    '..bbbbbbbb..' +
    '..bddddddd..' +
    '..bddbbddb..' +
    '..bbbbbbbb..' +
    '..bbbddbbb..' +
    '..bbbbbbbb..' +
    '..bbddddbb..' +
    '...bbbbbb...' +
    '..bbbbbbbb..' +
    '.bbbbbbbbbb.' +
    'bbbbbbbbbbbb' +
    'bbbbbbbbbbbb' +
    'bbdbbbbbbdbb' +
    'bbdbbbbbbdbb' +
    'bbdbbbbbbdbb' +
    'bbbbbbbbbbbb' +
    '.bbbbbbbbbb.' +
    '.bbbbbbbbbb.';
  const MP = { b: '#2c1d42', d: '#170f28' };

  function paint(scene, key, m, th) {
    const t = scene.textures.createCanvas(key, 800, 600);
    const c = t.getContext();
    let seed = 7 + m.th;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) % 1000) / 1000;
    const each = (n, f) => { for (let i = 0; i < n; i++) f(rnd(), rnd(), rnd()); };
    const R = (col, x, y, w, h) => {
      c.fillStyle = col;
      c.fillRect(x, y, w, h);
    };
    const lin = (y0, y1, stops) => {
      const g = c.createLinearGradient(0, y0, 0, y1);
      stops.forEach((s, i) => g.addColorStop(i / (stops.length - 1), s));
      return g;
    };
    // Stepped triangle on a 4 px grid: base centred on x at y, tip h px away (negative h points up).
    const tri = (col, x, y, w, h) => {
      const n = Math.abs(h) / 4;
      for (let j = 0; j < n; j++) {
        const k = (w * (1 - j / n)) & ~3;
        R(col, (x & ~3) - k, h > 0 ? y + j * 4 : y - j * 4 - 4, k * 2 + 4, 4);
      }
    };
    const glow = (x, y, r, a, col = th.gl) => {
      const g = c.createRadialGradient(x, y, 4, x, y, r);
      g.addColorStop(0, 'rgba(' + col + ',' + a + ')');
      g.addColorStop(1, 'rgba(' + col + ',0)');
      R(g, x - r, y - r, r * 2, r * 2);
    };

    R(lin(56, th.hy, th.sky), 0, 0, 800, 600);
    each(46, (a, b, d) => R('rgba(255,255,255,' + d * 0.6 + ')', a * 800, 60 + b * b * 240, 2, 2));

    if (!m.th) {
      // Ahu Tongariki: the sun going down behind the moái, who stand on their ahu with their backs to the sea.
      glow(250, 340, 200, 0.55, '255,190,110');
      for (let y = -32; y < 32; y += 4) {
        const w = Math.sqrt(1024 - y * y) & ~3;
        R('#ffdf96', 250 - w, 340 + y, w * 2, 4);
      }
      each(14, (a, b, d) => R(b > 0.45 ? 'rgba(255,150,110,.2)' : 'rgba(24,14,58,.35)', a * 900 - 100, 100 + ((b * 30) | 0) * 8, 70 + d * 170, 8));
      R(lin(392, 440, ['#4a2a6e', '#231a50']), 0, 392, 800, 48);
      each(14, (a, b) => R('rgba(255,180,120,.4)', 230 - b * 80, 394 + ((a * 9) | 0) * 4, 40 + b * 160, 2));
      R(lin(432, 600, ['#24382f', '#10181c']), 0, 432, 800, 168);
      each(80, (a, b) => R('rgba(170,210,110,.13)', a * 800, 444 + b * 140, 8, 4));
      R('#241a3d', 84, 412, 632, 24);
      R('#7a5270', 84, 412, 632, 2);
      for (let i = 0; i < 8; i++) {
        const x = 108 + i * 76, y = 336 - [8, 0, 12, 4, 0, 24, 4, 12][i];
        R(MP.d, x - 14, 418, 2, 18);
        stamp(c, MOAI, 12, MP, x, y, 4);
        R(MP.b, x + 4, y + 76, 40, 336 - y);
        if (i == 5 || i == 2) {
          R('#7d2a26', x + 6, y - 16, 36, 16);
          R('#c9523a', x + 6, y - 16, 4, 16);
          R('#7d2a26', x + 16, y - 20, 16, 4);
        }
      }
    } else if (m.th == 1) {
      // Base Torres at first light: Sur, Central and Norte catch the sun over their snowfield and the lagoon.
      // Each one is [x, top, half width, bluntness], drawn column by column so the granite reads as vertical.
      [[258, 196, 44, 1.7], [366, 104, 58, 2.6], [470, 132, 50, 2.8], [512, 160, 40, 2.2]].forEach(([cx, top, w, p]) => {
        for (let x = -w; x < w; x += 4) {
          const y = (top + (420 - top) * Math.abs((x + 2) / w) ** p) & ~3, sh = x > w * 0.25, dk = rnd() > 0.75;
          const ys = Math.max(y, (300 + x * 0.5 + (cx - 366) * 0.3 + rnd() * 16) & ~3);
          R(sh ? (dk ? '#844657' : '#9c5464') : dk ? '#c97355' : '#e08f66', cx + x, y, 4, ys - y);
          R(sh ? '#3d4878' : dk ? '#52639a' : '#6076aa', cx + x, ys, 4, 420 - ys);
        }
      });
      for (let x = 0; x < 800; x += 4) {
        const y = (396 + 8 * Math.sin(x / 30) + 4 * Math.sin(x / 11)) & ~3;
        R('#d8e9fa', x, y, 4, 432 - y);
        R('#9dbfe6', x, y + 12 + ((rnd() * 4) | 0) * 4, 4, 8);
        R(rnd() > 0.5 ? '#2b3a68' : '#35477a', x, 432, 4, 24);
      }
      R(lin(456, 530, ['#2f9e9b', '#155a78']), 0, 456, 800, 74);
      each(30, (a, b) => R('rgba(200,245,240,.22)', a * 800, 460 + ((b * 16) | 0) * 4, 16 + a * 48, 2));
      // Scree slopes close the valley from both sides. The right one is the taller, darker wall.
      for (let y = 180; y < 600; y += 4) {
        const l = ((y - 250) * 0.95 + rnd() * 10) & ~3, r = ((y - 180) * 0.78 + rnd() * 10) & ~3;
        R('#1a2850', 0, y, l, 4);
        R('#111c3e', 800 - r, y, r, 4);
        R('#33487c', l - 4, y, 4, 4);
        R('#253764', 800 - r, y, 4, 4);
      }
      R('#0d1736', 0, 528, 800, 72);
      each(40, (a, b) => R('#1a2850', a * 800, 532 + b * 60, 12, 4));
      // The ice that breaks off hangs from this cornice.
      R('#6f9fd0', 0, 56, 800, 6);
      each(44, (a, b) => tri(b > 0.5 ? '#7fb0dc' : '#4f7fb8', a * 800, 60, 4 + b * 4, 12 + b * 36));
    } else {
      // Villarrica at night: snow cap, lit crater and its plume, the lake and araucarias in front.
      each(46, (a, b, d) => {
        const i = a * 22, r = (10 + i * 3) & ~3, x = (400 + i * i * 0.8 + b * 30) & ~3, y = (212 - i * 8 - d * 24) & ~3;
        c.fillStyle = i < 3 ? 'rgba(255,130,60,.25)' : 'rgba(84,62,104,.2)';
        c.fillRect(x - r, y - r / 2, r * 2, r);
        c.fillRect(x - r / 2, y - r, r, r * 2);
      });
      glow(400, 212, 170, 0.6);
      for (let y = 216; y < 464; y += 4) {
        const w = (14 + 320 * ((y - 216) / 248) ** 1.25) & ~3;
        R('#1c1232', 400 - w, y, w * 2, 4);
        R('#130c26', 400 + (w >> 2), y, w - (w >> 2), 4);
      }
      for (let x = -140; x < 140; x += 4) {
        const ax = Math.abs(x + 2), ys = (216 + 248 * (Math.max(0, ax - 14) / 320) ** 0.8) & ~3, yb = 286 + rnd() * 64 - ax * 0.25;
        if (yb > ys) R(x < 24 ? '#dde4fa' : '#8a8fc6', 400 + x, ys, 4, yb - ys);
      }
      R('#ffc23f', 388, 212, 24, 4);
      R('#ff6a2e', 384, 216, 32, 4);
      const dk = '#0c0818';
      each(60, (a, b) => tri('#0e0a20', a * 800, 464, 6 + b * 6, -(8 + b * 12)));
      R('#1a1030', 0, 464, 800, 34);
      each(16, (a, b) => R('rgba(255,120,50,.3)', 330 + a * 140 - b * 30, 468 + ((b * 7) | 0) * 4, 24 + b * 50, 2));
      R(dk, 0, 498, 800, 102);
      each(24, (a, b) => R('rgba(255,120,50,.16)', a * 800, 506 + b * 56, 16 + a * 30, 2));
      [[60, 250], [138, 330], [716, 300], [778, 230], [650, 380]].forEach(([x, top]) => {
        R(dk, x - 4, top, 8, 520 - top);
        [14, 26, 34, 38, 0, 44, 34].forEach((w, j) => {
          const y = top + j * 10;
          R(dk, x - w, y, w * 2, j > 4 ? 4 : 10);
          R(dk, x - w - 6, y - 10, 12, 12);
          R(dk, x + w - 6, y - 10, 12, 12);
        });
      });
      R(lin(430, 600, ['rgba(255,90,30,0)', 'rgba(255,90,30,.4)']), 0, 430, 800, 170);
    }

    m.tc.forEach(([x, y]) => glow(x, y, 150, 0.3));
    // A hole in the ground glows from below.
    [...m.L[16]].forEach((ch, i) => ch != '#' && R(lin(520, 600, ['rgba(' + th.gl + ',0)', 'rgba(' + th.gl + ',.95)']), i * 32, 520, 32, 80));

    R('#0e0b22', 0, 0, 800, 56);
    R(PAL.G, 0, 52, 800, 2);
    R(PAL.o, 0, 54, 800, 2);
    t.refresh();
  }

  // Call once per map load: swaps the backdrop and rebuilds its lights and ambient particles.
  function bg(scene, m) {
    const th = TH[m.th];
    const key = 'bg' + m.th;
    if (!scene.textures.exists(key)) paint(scene, key, m, th);
    if (BGI) BGI.setTexture(key);
    else BGI = scene.add.image(0, 0, key).setOrigin(0).setDepth(0);
    LT.splice(0).forEach((o) => {
      scene.tweens.killTweensOf(o);
      o.destroy();
    });
    m.tc.forEach(([x, y]) => {
      const f = scene.add.rectangle(x, y - 6, 10, 14, th.fl[0]).setDepth(0);
      const f2 = scene.add.rectangle(x, y - 3, 4, 8, th.fl[1]).setDepth(0);
      LT.push(scene.add.rectangle(x, y + 12, 6, 22, 0x6e3b1c).setDepth(0), f, f2);
      scene.tweens.add({
        targets: [f, f2],
        scaleY: 1.5,
        scaleX: 0.75,
        y: '-=3',
        duration: 130,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    });
    const [y0, y1, v0, v1, life, freq, tint] = th.am;
    LT.push(
      scene.add
        .particles(0, 0, 'px', {
          x: { min: 0, max: 800 },
          y: { min: y0, max: y1 },
          speedY: { min: v0, max: v1 },
          speedX: { min: -14, max: 14 },
          lifespan: life,
          frequency: freq,
          tint,
          alpha: { start: 0.75, end: 0 },
          scale: { min: 0.4, max: 0.9 },
          advance: life / 2,
        })
        .setDepth(0),
    );
  }

  // [wave, f0, f1, ms, vol, delay ms]. Wave 4 is filtered noise and f0 its cutoff.
  const WV = ['square', 'sawtooth', 'triangle', 'sine'];
  const SFX = {
    move: [[0, 660, 660, 30, 5]],
    ok: [[0, 660, 660, 60, 7], [0, 990, 990, 110, 7, 60]],
    count: [[0, 440, 440, 120, 9]],
    go: [[0, 880, 880, 320, 9]],
    jump: [[0, 280, 580, 110, 6]],
    land: [[4, 400, 0, 60, 9]],
    wrong: [[1, 220, 110, 140, 9], [1, 165, 82, 220, 9, 120]],
    open: [[0, 523, 523, 70, 8], [0, 659, 659, 70, 8, 70], [0, 784, 784, 70, 8, 140], [0, 1047, 1047, 180, 8, 210]],
    tick: [[0, 1568, 1568, 16, 3]],
    win: [[0, 988, 988, 70, 9], [0, 1319, 1319, 280, 9, 70]],
    jack: [
      [0, 523, 523, 80, 9],
      [0, 659, 659, 80, 9, 80],
      [0, 784, 784, 80, 9, 160],
      [0, 1047, 1047, 80, 9, 240],
      [0, 1319, 1319, 80, 9, 320],
      [0, 1568, 2093, 420, 9, 400],
    ],
    keyup: [[2, 660, 990, 90, 12]],
    drop: [[2, 500, 250, 90, 10]],
    poof: [[4, 1500, 0, 220, 9]],
    spawn: [[3, 1200, 1800, 120, 6]],
    box: [[0, 784, 784, 50, 7], [0, 1047, 1047, 50, 7, 50], [0, 1319, 1319, 100, 7, 100]],
    slow: [[1, 500, 90, 520, 9]],
    grab: [[1, 200, 1400, 230, 8]],
    mix: [[0, 400, 1200, 80, 7], [0, 900, 300, 80, 7, 80], [0, 500, 1500, 80, 7, 160], [0, 1100, 200, 130, 7, 240]],
    master: [[2, 1047, 1047, 80, 11], [2, 1319, 1319, 80, 11, 80], [2, 1568, 1568, 80, 11, 160], [2, 2093, 2093, 320, 11, 240]],
    fizz: [[4, 3000, 0, 160, 6]],
    stomp: [[0, 200, 60, 130, 11], [4, 600, 0, 80, 9]],
    warn: [[0, 880, 880, 60, 6]],
    end: [[0, 659, 659, 150, 9], [0, 523, 523, 150, 9, 150], [0, 392, 392, 420, 9, 300]],
    fanfare: [
      [0, 523, 523, 110, 9],
      [0, 523, 523, 110, 9, 130],
      [0, 523, 523, 110, 9, 260],
      [0, 659, 659, 300, 9, 390],
      [0, 587, 587, 110, 9, 720],
      [0, 659, 659, 110, 9, 850],
      [0, 784, 784, 520, 9, 980],
    ],
    type: [[0, 880, 880, 40, 6]],
    // Each streak level plays a major third above the last one.
    streak: (p) => [[392, 392, 90, 0], [523, 523, 90, 90], [659, 659, 90, 180], [784, 1047, 340, 270]].map(([a, b, ms, at]) => [0, a * 1.26 ** (p.sk - 2), b * 1.26 ** (p.sk - 2), ms, 9, at]),
    look: [[3, 1319, 1319, 90, 9], [3, 1976, 1976, 220, 9, 90]],
    fast: [[1, 200, 900, 150, 7], [1, 320, 1500, 220, 7, 110]],
    luck: [[2, 784, 784, 70, 11], [2, 988, 988, 70, 11, 70], [2, 1175, 1175, 70, 11, 140], [2, 1568, 1568, 260, 11, 210]],
    cut: [[4, 6000, 0, 45, 10], [4, 6000, 0, 45, 10, 110], [0, 1200, 500, 120, 6, 110]],
    dizzy: [[3, 700, 350, 150, 9], [3, 350, 700, 150, 9, 150], [3, 700, 350, 190, 9, 300]],
    trade: [[0, 300, 1200, 120, 7], [0, 1200, 300, 150, 7, 120]],
    quake: [[4, 220, 0, 650, 14], [1, 90, 40, 550, 11]],
    pit: [[2, 900, 150, 260, 9], [2, 300, 620, 110, 9, 260]],
    map: [[2, 523, 523, 90, 9], [2, 784, 784, 240, 9, 90]],
    wave: [[2, 523, 523, 80, 11], [2, 659, 659, 80, 11, 80], [2, 784, 784, 80, 11, 160], [2, 1047, 1047, 260, 11, 240]],
    // Hazards stay under the music: a rumble, a crack or a growl to warn, and a short hit when they land.
    hzw: (k) => ({ roll: [[4, 220, 0, 500, 10]], ice: [[4, 5000, 0, 40, 5], [4, 5000, 0, 40, 5, 130], [4, 5000, 0, 60, 5, 330]], erupt: [[1, 45, 110, 1100, 5], [4, 220, 0, 1100, 8]] })[k] || [],
    hz: (k) => ({ roll: [[4, 300, 0, 260, 9], [1, 70, 40, 260, 6]], ice: [[2, 1800, 600, 120, 6]], erupt: [[4, 900, 0, 500, 12], [1, 110, 35, 450, 9]] })[k] || [],
    hzhit: [[0, 180, 60, 140, 9], [4, 900, 0, 90, 8]],
    hzend: (k) => (k == 'ice' ? [[4, 7000, 0, 110, 6], [2, 2400, 900, 80, 4]] : [[4, 2500, 0, 70, 3]]),
  };
  SFX.endsolo = SFX.end;

  function tone(w, f0, f1, ms, vol, at, out) {
    const d = ms / 1000;
    const g = AC.createGain();
    g.gain.setValueAtTime(vol / 100, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + d);
    g.connect(out);
    let src;
    if (w > 3) {
      const n = (AC.sampleRate * d) | 0;
      const b = AC.createBuffer(1, n, AC.sampleRate);
      const ch = b.getChannelData(0);
      for (let i = 0; i < n; i++) ch[i] = Math.random() * 2 - 1;
      src = AC.createBufferSource();
      src.buffer = b;
      const lp = AC.createBiquadFilter();
      lp.frequency.value = f0;
      src.connect(lp);
      lp.connect(g);
    } else {
      src = AC.createOscillator();
      src.type = WV[w];
      src.frequency.setValueAtTime(f0, at);
      if (f1 !== f0) src.frequency.exponentialRampToValueAtTime(f1, at + d);
      src.connect(g);
    }
    src.start(at);
    src.stop(at + d + 0.02);
    src.onended = () => g.disconnect();
  }

  function burst(x, y, n, tint) {
    EM.setParticleTint(tint);
    EM.explode(n, x, y);
  }

  function squash(scene, o, sx, sy) {
    scene.tweens.killTweensOf(o);
    o.setScale(sx, sy);
    scene.tweens.add({ targets: o, scaleX: 1, scaleY: 1, duration: 150, ease: 'Back.easeOut' });
  }

  function nudge(scene, o, dx, dy) {
    if (scene.tweens.isTweening(o)) return;
    scene.tweens.add({ targets: o, x: o.x + dx, y: o.y + dy, duration: 55, yoyo: true, repeat: dx ? 2 : 0 });
  }

  function pop(scene, x, y, str, size, tint, ms) {
    const w = str.length * 3 * size + 8;
    const t = txt(scene, Phaser.Math.Clamp(x, w, 800 - w), y, str, size, tint).setOrigin(0.5).setDepth(6);
    scene.tweens.add({ targets: t, y: y - 34, duration: ms || 800, ease: 'Cubic.easeOut' });
    scene.tweens.add({ targets: t, alpha: 0, delay: (ms || 800) * 0.6, duration: (ms || 800) * 0.4, onComplete: () => t.destroy() });
  }

  function banner(scene, str, i) {
    const y = 230 + i * 56;
    if (BN[i]) BN[i].destroy();
    const t = (BN[i] = txt(scene, 400, y, str, 5, PC[i]).setOrigin(0.5).setDepth(9).setScale(0.5));
    scene.tweens.add({ targets: t, scale: 5, duration: 180, ease: 'Back.easeOut' });
    scene.tweens.add({ targets: t, alpha: 0, y: y - 30, delay: 750, duration: 250, onComplete: () => t.destroy() });
  }

  const FX = {
    jump: (s, x, y, a) => (squash(s, a, 0.8, 1.2), burst(x, y, 3, 0x8a93b8)),
    land: (s, x, y, a) => (squash(s, a, 1.25, 0.78), burst(x, y, 5, 0x8a93b8)),
    wrong: (s, x, y, a) => (nudge(s, a, 4, 0), burst(x, y + 14, 8, 0xff5a4d)),
    open: (s, x, y, a) => (nudge(s, a, 0, -7), burst(x, y - 8, 18, 0xffd23f)),
    win: (s, x, y, a) => (pop(s, x, y - 30, '+' + a, 3, 0xffd23f), CN.explode(Math.min(a / 100, 12), x, y - 8)),
    jack: (s, x, y, a) => (
      pop(s, x, y - 34, '¡PREMIO! +' + a, 4, 0xffd23f, 1400),
      burst(x, y - 8, 30, 0xffd23f),
      CN.explode(26, x, y - 8),
      s.cameras.main.shake(260, 0.008),
      s.cameras.main.flash(180, 255, 220, 90)
    ),
    keyup: (s, x, y, a) => burst(x, y, 6, KC[a.frame.name] || 0xffd23f),
    poof: (s, x, y) => burst(x, y, 14, 0xb9bccb),
    spawn: (s, x, y) => burst(x, y, 8, 0xb9a4ff),
    box: (s, x, y) => burst(x, y, 14, 0x7b4dff),
    slow: (s) => s.cameras.main.flash(160, 80, 220, 120),
    mix: (s) => s.cameras.main.shake(420, 0.012),
    master: (s, x, y) => burst(x, y - 30, 20, 0xffd23f),
    look: (s, x, y) => burst(x, y - 30, 14, 0x8fe3ff),
    fast: (s, x, y) => burst(x, y - 20, 14, 0xff5a4d),
    luck: (s, x, y) => burst(x, y - 20, 14, 0x5fe37a),
    cut: (s, x, y) => (pop(s, x, y - 50, 'SIN RACHA', 2, 0xffffff), burst(x, y - 20, 10, 0xffffff)),
    dizzy: (s, x, y) => burst(x, y - 40, 14, 0xc77dff),
    trade: (s, x, y) => (burst(x, y - 20, 16, 0xffffff), s.cameras.main.flash(120, 255, 255, 255)),
    quake: (s) => s.cameras.main.shake(520, 0.016),
    pit: (s, x, y, a) => (squash(s, a, 0.7, 1.3), burst(x, y, 10, 0xffffff)),
    wave: (s, x, y, a) => (pop(s, x, 190, '¡OLEADA ' + a + '!', 5, 0xffd23f, 1500), s.cameras.main.flash(160, 255, 220, 90)),
    step: (s, x, y) => burst(x, y, 1, 0x8a93b8),
    fizz: (s, x, y) => (pop(s, x, y - 40, 'NADA...', 2, 0xb9bccb), burst(x, y - 20, 6, 0xb9bccb)),
    stomp: (s, x, y) => (burst(x, y - 34, 12, 0xffffff), s.cameras.main.shake(120, 0.006)),
    streak: (s, x, y, a) => banner(s, '¡RACHA X' + a.sk + '!', a.i),
    // The winner hops under a crown for as long as the results stay up. A tie shows both players and no crown.
    end: (s, x, y, a) => {
      s.cameras.main.flash(300, 255, 255, 255);
      (a < 0 ? [0, 1] : [a]).forEach((i, n) => {
        const o = [s.add.image(a < 0 ? 320 + n * 160 : 400, 510, 'p' + i, 6).setOrigin(0.5, 1).setScale(3).setDepth(11).setFlipX(!!n)];
        if (a >= 0) o.push(s.add.image(400, 384, 'crown').setScale(3).setDepth(11));
        s.tweens.add({ targets: o, y: '-=34', duration: 270, yoyo: true, repeat: 4, ease: 'Quad.easeOut', onComplete: () => o.forEach((e) => e.destroy()) });
      });
    },
    endsolo: (s) => (s.cameras.main.flash(300, 255, 255, 255), CN.explode(18, 400, 300)),
    hzw: (s, x, y, a) => a != 'erupt' && burst(x, y, 8, a == 'ice' ? 0xdff4ff : 0xc9a37a),
    hz: (s, x, y, a) => (a == 'erupt' ? (burst(x, y, 26, 0xff9a3c), s.cameras.main.shake(160, 0.006)) : burst(x, y, 8, a == 'ice' ? 0xdff4ff : 0xc9a37a)),
    hzhit: (s, x, y, a) => (a && squash(s, a, 1.3, 0.7), burst(x, y, 14, 0xffffff), s.cameras.main.shake(110, 0.005)),
    hzend: (s, x, y, a) => burst(x, y, a == 'ice' ? 16 : 8, a == 'ice' ? 0xbfe6ff : 0xff9a3c),
    fanfare: (s, x, y, a) => {
      for (let i = 0; i < 8; i++) {
        burst(60 + i * 97, 90 + (i % 3) * 30, 14, a < 0 ? PC[i % 2] : PC[a]);
        CN.explode(3, 60 + i * 97, 120);
      }
    },
  };

  function ev(scene, name, x, y, a) {
    const rows = SFX[name];
    if (AC && rows) {
      if (AC.state === 'suspended') AC.resume();
      (rows.call ? rows(a) : rows).forEach((r) => tone(r[0], r[1], r[2], r[3], r[4], AC.currentTime + (r[5] || 0) / 1000, SG));
    }
    // Every powerup announces itself with its name from the table, in the colour of who used it.
    const w = PW.find((w) => w.id == name);
    if (w) banner(scene, '¡' + w.n + '!', a);
    if (FX[name]) FX[name](scene, x, y, a);
  }

  // One char per eighth note: base-36 digit minus 6 semitones, '.' is a rest.
  // Each song is [lead, bass, seconds per eighth, lead wave, lead volume, echo volume, drum bar].
  // The drum bar has one digit per eighth: 1 hat, 2 kick, 4 snare, summed.
  const SONG = [
    // Title: Am F C G Am F E E.
    [
      '69did9d.' + '269e969.' + '9dglgd9.' + '48bgb8b.' + 'idi.d96.' + 'e9e.962.' + '158d85d.' + 'dhd.851.',
      '6...6.d.' + '2...2.9.' + '9...9.g.' + '4...4.b.' + '6...6.d.' + '2...2.9.' + '1...1.8.' + '1.1.1.8.',
      0.26, 2, 22, 0, '00000000',
    ],
    // Rapa Nui: Am Am Dm Dm E E Am E, then F G Am Am F G E E.
    [
      '69d969d.' + 'gd9di...' + 'beiebei.' + 'iebed...' + 'dhkhdhk.' + 'nkhkl.k.' + 'i.d.9.6.' + '8.5.1...' +
        '69e9i.e.' + '8bgbk.g.' + '9didl.i.' + 'idi.d.9.' + 'e.i.l.i.' + 'g.k.n.k.' + 'p.n.k.h.' + 'd.hkd.8.',
      '6.d.6.dd' + '6.d.6.dd' + 'b.i.b.ii' + 'b.i.b.ii' + 'd.k.d.kh' + 'd.k.d.kh' + '6.d.6.dd' + 'd.k.d.h.' +
        '2.9.2.99' + '4.b.4.bb' + '6.d.6.dd' + '6.d.6.dd' + '2.9.2.99' + '4.b.4.bb' + '1.8.1.88' + '1.8.1.5.',
      0.19, 0, 9, 0, '21016101',
    ],
    // Torres del Paine: Gm Gm Eb Eb Cm Cm D D, then Cm Gm Ab D Cm Gm Eb D. Slow and sparse, so the echo fills the gaps.
    [
      'b..g.j..' + 'j.i.g.b.' + 'c..g.j..' + 'j.l.j.g.' + '9..c.g..' + 'g.c.9...' + 'b..f.i..' + 'l.i.f.b.' +
        'l.l.jlo.' + 'n.n.jgc.' + 'c.hlo.l.' + 'n.l.i.b.' + 'l.l.jlo.' + 'n.l.n.j.' + 'o.n.j.b.' + 'f.i.f.b.',
      '4..4..b.' + '4..4..b.' + '0..0..7.' + '0..0..7.' + '9..9..4.' + '9..9..4.' + 'b..b..6.' + 'b..b..3.' +
        '9..9..4.' + '4..4..7.' + '5..5..c.' + 'b..b..6.' + '9..9..4.' + '4..4..b.' + '0..0..7.' + 'b..b..3.',
      0.21, 2, 20, 7, '20120140',
    ],
    // Villarrica: F# F# G F# F# F# Em F#, then Bm A G F# twice. Fast, with the kick on every beat.
    [
      '343.743.' + '347a.743' + '48b.848.' + 'a87a743.' + '343.743.' + '7ad.fda.' + 'd84.841.' + '3.7af.a.' +
        'f.fdb.8.' + 'd.dba.6.' + 'b.ba8.4.' + 'a.743.a.' + 'fkn.nmk.' + 'dim.mki.' + 'bgk.kig.' + 'mjgfa74.',
      '3.3f3.3f' + '3.3f3.3f' + '4.4g4.4g' + '3.3f3.3f' + '3.3f3.3f' + '3.3f3.3f' + '1.1d1.1d' + '3.3f3.3f' +
        '8.8k8.8k' + '6.6i6.6i' + '4.4g4.4g' + '3.3f3.3f' + '8.8k8.8k' + '6.6i6.6i' + '4.4g4.4g' + '3.3f3faf',
      0.17, 1, 8, 0, '21612161',
    ],
  ];

  function music(scene, mode) {
    if (mode === mMode) return;
    if (mode !== 'rush') mStep = 0;
    mMode = mode;
    if (!AC || mTimer) return;
    mNext = 0;
    mTimer = scene.time.addEvent({
      delay: 60,
      loop: true,
      callback: () => {
        if (mMode === 'off' || AC.state !== 'running') {
          mNext = 0;
          return;
        }
        const calm = mMode === 'title';
        const [lead, bass, t, w, v, e, dr] = SONG[calm ? 0 : scene.G.lm + 1];
        const d = mMode === 'rush' ? t * 0.763 : t;
        if (mNext < AC.currentTime) mNext = AC.currentTime + 0.05;
        while (mNext < AC.currentTime + 0.2) {
          const n = lead.length, i = mStep++ % n, k = dr[i % 8];
          const note = (ch, base, w, vol, len) => {
            const f = base * 2 ** ((parseInt(ch, 36) - 6) / 12);
            if (ch !== '.') tone(w, f, f, d * len * 1000, vol, mNext, MG);
          };
          note(lead[i], 440, w, v, calm ? 1.6 : 0.9);
          note(bass[i], 110, 2, 30, calm ? 3 : 1.6);
          if (k & 1) tone(4, 7000, 0, 40, 9, mNext, MG);
          if (k & 2) tone(3, 130, 45, 110, 45, mNext, MG);
          if (k & 4) tone(4, 2200, 0, 90, 16, mNext, MG);
          if (e) note(lead[(i + n - 3) % n], 440, w, e, 0.9);
          if (mMode === 'rush') note(lead[i], 880, 0, 4, 0.5);
          mNext += d;
        }
      },
    });
  }
  // ==== END KIT ====

  new Phaser.Game({
    type: Phaser.AUTO,
    width: W,
    height: H,
    parent: 'game-root',
    backgroundColor: '#0b0f03',
    pixelArt: true,
    physics: { default: 'arcade', arcade: { gravity: { y: PH.g } } },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: { create, update },
  });
})();
