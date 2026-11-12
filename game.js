(function () {
  'use strict';

  const W = 800, H = 600, T = 32, HB = 56;
  const PH = { g: 1500, run: 200, jump: 600, cut: 0.45, coy: 90, buf: 110, fall: 720 };
  const PC = [0xe1ff00, 0xff6ec7];
  const KC = [0xff5a4d, 0x4da6ff, 0x5fe37a, 0xffd23f, 0xc77dff, 0xff9a3c];
  const REEL = [[100, 1], [200, 1], [300, 1], [500, 1], [100, 1], [200, 1], [300, 1], [1000, 0.5]];
  const LEVEL = [
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
  ];
  const PS = [[6, 16], [18, 16]];
  const KS = [[2, 4], [22, 4], [12, 4], [7, 7], [17, 7], [12, 10]];
  const BS = [[12, 16], [8, 16], [16, 16], [10, 13], [14, 13], [4, 10], [20, 10], [9, 7], [15, 7]];
  const SK = 'fiebre-de-tesoros.scores.v1';
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

  const G = { ph: '', t: 0, mx: 1, P: [], K: [], C: [], B: [], hs: [], win: -1 };
  const held = {}, pressed = {};
  const UI = {}, U = {}, hud = { sc: [], sk: [], ki: [], pi: [], pn: [], ch: [] };
  const nm = { l: [], i: 0 };
  let S, gfx, kg, cur = 0;

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
    const v = REEL[c.ri][0], n = v * c.x;
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
    c.ri = (Math.random() * REEL.length) | 0;
    c.rt = REEL[c.ri][1] * 130;
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
    { id: 'slow', n: 'TORTUGA', d: 'RIVAL LENTO', f: 0, w: 35, wl: 30, use(p, r) { r.slow = 4500; fx('slow', r.s.x, r.s.y, p.i); } },
    {
      id: 'grab', n: 'IMÁN', d: 'ROBA LA LLAVE', f: 3, w: 25, wl: 25,
      use(p, r) {
        const k = r.k || (!p.k && G.K.filter((k) => k.live && !k.own).sort((a, b) => dist(a.s, p.s) - dist(b.s, p.s))[0]);
        if (!k) return fx('fizz', p.s.x, p.s.y, p.i);
        if (p.k) drop(p);
        take(p, k);
        fx('grab', p.s.x, p.s.y, p.i);
      },
    },
    {
      id: 'mix', n: 'REVOLTIJO', d: 'MEZCLA COFRES', f: 2, w: 20, wl: 10,
      use(p) {
        const cs = G.C.filter((c) => !c.st), ks = sh(cs.map((c) => c.k));
        cs.forEach((c, i) => { c.k = ks[i]; c.m = []; });
        fx('mix', p.s.x, p.s.y, p.i);
      },
    },
    {
      id: 'master', n: 'LLAVE MAESTRA', d: 'ABRE TODO', f: 1, w: 20, wl: 35,
      use(p) {
        if (p.k) drop(p);
        take(p, mkKey(1));
        fx('master', p.s.x, p.s.y, p.i);
      },
    },
  ];
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  function roll(p) {
    const lose = G.P[1 - p.i].sc - p.sc >= 300, w = (r) => (lose ? r.wl : r.w);
    let x = Math.random() * PW.reduce((a, r) => a + w(r), 0);
    for (const r of PW) if ((x -= w(r)) < 0) return r.id;
    return PW[0].id;
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
    const free = BS.map(([c, r]) => [c * T + T / 2, HB + r * T - 18]).filter(([x, y]) =>
      !G.B.some((b) => dist(b.s, { x, y }) < 40) && !G.K.some((k) => k.live && dist(k.s, { x, y }) < 40));
    if (!free.length) return false;
    const [x, y] = free[(Math.random() * free.length) | 0];
    G.B.push({ s: S.add.image(x, y, 'box', 0).setDepth(3) });
    fx('spawn', x, y);
    return true;
  }

  // ---- round ------------------------------------------------------------

  function reset() {
    Object.assign(G, { t: 99000, rush: 0, bt: 4000, win: -1, wn: 99, last: null });
    G.B.splice(0).forEach((b) => b.s.destroy());
    G.K.splice(6).forEach((k) => k.s.destroy());
    const cs = sh(KC.slice());
    G.K.forEach((k, i) => {
      const [x, y] = [KS[i][0] * T + T / 2, HB + KS[i][1] * T - 8];
      Object.assign(k, { live: true, own: null, c: cs[i] });
      k.s.setVisible(true).setFrame(KC.indexOf(k.c));
      k.s.body.enable = true;
      k.s.body.reset(x, y);
    });
    const ks = sh(G.K.slice());
    G.C.forEach((c, i) => {
      Object.assign(c, { st: 0, k: ks[i], m: [], by: -1, ri: 0, rt: 0, life: 0, x: 1 });
      c.b.body.enable = false;
    });
    G.P.forEach((p, i) => {
      Object.assign(p, { sc: 0, sk: 0, k: null, pw: null, slow: 0, stun: 0, inv: 0, np: 0, cy: 0, jb: 0, cj: 0, vy: 0 });
      const x = PS[i][0] * T + T / 2, y = HB + PS[i][1] * T;
      p.s.setPosition(x, y).setFlipX(i == 1).setAlpha(1);
      p.s.body.reset(x, y);
    });
    view();
  }

  function stomp(a, v) {
    const A = a.s.body, V = v.s.body;
    if (a.stun > 0 || v.stun > 0 || v.inv > 0 || A.velocity.y <= 120) return;
    if (A.bottom < V.top || A.bottom > V.top + 20 || A.right < V.left + 4 || A.left > V.right - 4) return;
    v.stun = 700;
    v.inv = 1200;
    if (v.k) drop(v);
    A.velocity.y = -380;
    a.cj = 0;
    fx('stomp', v.s.x, v.s.y, v.s);
  }

  function move(p, dt) {
    const s = p.s, b = s.body, n = inp(p.i), st = p.stun > 0, x = st ? 0 : n.x;
    const g = b.blocked.down || b.touching.down;
    p.cy = g ? PH.coy : p.cy - dt;
    p.jb = n.jp && !st ? PH.buf : p.jb - dt;
    b.setVelocityX(x * PH.run * (p.slow > 0 ? 0.45 : 1));
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
    s.setFrame(st ? 5 : !g ? (b.velocity.y < 0 ? 3 : 4) : x ? 1 + (((S.time.now / 110) | 0) & 1) : 0);
    s.setAlpha(p.inv > 0 && !st && ((S.time.now / 90) | 0) & 1 ? 0.5 : 1).setTint(p.slow > 0 ? 0x99bb99 : 0xffffff);
    S.physics.world.wrap(s, 16);
  }

  function view() {
    gfx.clear();
    G.C.forEach((c) => {
      c.s.setFrame(c.st ? 1 : 0);
      c.t.setVisible(c.st == 1);
      if (c.st == 1) {
        const v = REEL[c.ri][0], x = c.s.x - 40, y = c.s.y - 80;
        set(c.t, '' + v * c.x);
        c.t.setTint(v == 1000 ? 0xffd23f : 0xffffff);
        gfx.fillStyle(PC[c.by]).fillTriangle(x + 32, y + 32, x + 48, y + 32, x + 40, y + 42);
        gfx.fillStyle(0x1b1326, 0.92).fillRoundedRect(x, y, 80, 32, 6).lineStyle(2, PC[c.by]).strokeRoundedRect(x, y, 80, 32, 6);
      }
      if (!c.st) c.m.forEach((id, n) => {
        const x = c.s.x - c.m.length * 5 + n * 10, y = c.s.y - 28;
        gfx.fillStyle(0x1b1326).fillRect(x, y, 10, 10).fillStyle(G.K[id].c).fillRect(x + 2, y + 2, 6, 6);
      });
    });
    G.B.forEach((b) => b.s.setFrame(((S.time.now / 300) | 0) & 1));
    const sec = Math.max(0, Math.ceil(G.t / 1000));
    set(hud.tm, '' + sec);
    hud.tm.setTint(sec > 10 ? 0xffffff : 0xff5a4d);
    G.C.forEach((c, i) => hud.ch[i].setFrame(c.st ? 1 : 0).setTint(c.st ? PC[c.by] : 0xffffff));
    G.P.forEach((p, i) => {
      set(hud.sc[i], '' + p.sc);
      set(hud.sk[i], p.sk ? 'RACHA X' + Math.min(p.sk + 1, 3) : '');
      hud.ki[i].setVisible(!!p.k);
      if (p.k) hud.ki[i].setFrame(p.k.s.frame.name);
      const w = PW.find((w) => w.id == p.pw);
      hud.pi[i].setVisible(!!w);
      if (w) hud.pi[i].setFrame(w.f);
      set(hud.pn[i], w ? w.n : '');
    });
  }

  function tick(dt) {
    G.t -= dt;
    G.P.forEach((p) => {
      p.slow -= dt;
      p.np -= dt;
      if (p.stun > 0) p.stun -= dt;
      else p.inv -= dt;
    });
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
      if (c.st != 1) return;
      c.life -= dt;
      c.rt -= dt;
      if (c.rt <= 0) {
        c.ri = (c.ri + 1) % REEL.length;
        c.rt += REEL[c.ri][1] * 130;
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
    U.mc.setPosition(266, 300 + cur * 48);
  }

  function rank() {
    U.rk.forEach((r, i) => {
      const e = G.hs[i], c = e && e === G.last ? 0xffd23f : 0xffffff;
      r[0].setText(i + 1 + '.').setTint(c);
      r[1].setText(e ? e.n : '---').setTint(c);
      r[2].setText(e ? '' + e.s : '').setTint(c);
    });
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
      in() { G.id = 0; cur = 0; menu(); music(S, 'title'); },
      up(dt) {
        const n = nav();
        if (n.y) { cur = (cur + n.y + 3) % 3; menu(); fx('move'); }
        if (ok()) { fx('ok'); return go(['ready', 'rank', 'how'][cur]); }
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
      in() { G.id = 0; rank(); },
      up(dt) { G.id += dt; if ((G.id > 600 && ok()) || G.id > 12000) go('title'); },
    },
    ready: {
      in() { reset(); G.cd = 0; music(S, 'off'); },
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
        G.P.forEach((p) => move(p, dt));
        G.K.forEach((k) => {
          if (k.own) k.s.setPosition(k.own.s.x, k.own.s.y - 52);
          else if (k.live) S.physics.world.wrap(k.s, 16);
        });
        G.P.forEach(grab);
        stomp(G.P[0], G.P[1]);
        stomp(G.P[1], G.P[0]);
        G.P.forEach((p) => G.C.forEach((c) => poke(p, c)));
        view();
        if (G.t <= 0 || G.C.every((c) => c.st == 2)) go('end');
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
        G.t = Math.max(G.t, 0);
        G.C.forEach((c) => c.st == 1 && settle(c));
        const [a, b] = [G.P[0].sc, G.P[1].sc];
        G.win = a == b ? -1 : a > b ? 0 : 1;
        G.et = 0;
        view();
        fx('end', W / 2, H / 2, G.win);
        U.ew.setText(G.win < 0 ? 'EMPATE' : 'GANA JUGADOR ' + (G.win + 1)).setTint(G.win < 0 ? 0xffd23f : PC[G.win]);
        U.es[0].setText('JUGADOR 1: ' + a);
        U.es[1].setText('JUGADOR 2: ' + b);
      },
      up(dt) {
        G.et += dt;
        if (G.et - dt < 800 && G.et >= 800) fx('fanfare', W / 2, H / 2, G.win);
        if (G.et >= 3000) go(qual() ? 'name' : 'rank');
      },
      out() { S.physics.resume(); },
    },
    name: {
      in() {
        nm.l = [];
        nm.i = 0;
        const col = G.win < 0 ? 0xffd23f : PC[G.win];
        U.nh.setText(G.win < 0 ? 'EMPATE: INICIALES COMPARTIDAS' : 'JUGADOR ' + (G.win + 1) + ': ¡ENTRASTE AL RANKING!').setTint(col);
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

  async function load() {
    try {
      const st = window.platanusArcadeStorage;
      let v;
      if (st) {
        const r = await st.get(SK);
        v = r && r.found ? r.value : null;
      } else {
        const r = window.localStorage.getItem(SK);
        v = r && JSON.parse(r);
      }
      if (Array.isArray(v)) G.hs = G.hs.concat(v.filter(valid)).map((e) => ({ n: e.n, s: e.s })).sort((a, b) => b.s - a.s).slice(0, 8);
      if (G.ph == 'rank') rank();
    } catch (e) { /* ranking stays in memory */ }
  }

  async function save() {
    try {
      const st = window.platanusArcadeStorage;
      if (st) await st.set(SK, G.hs);
      else window.localStorage.setItem(SK, JSON.stringify(G.hs));
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

  function build() {
    kitTex(S);
    bg(S);
    const sg = S.physics.add.staticGroup(), pg = S.physics.add.staticGroup(), bz = [];
    kg = S.physics.add.group();
    gfx = S.add.graphics().setDepth(5);
    // One extra column per side, mirrored off screen, so the floor continues under a wrapping player.
    LEVEL.forEach((row, r) => {
      for (let c = -1; c <= 25; c++) {
        const ch = row[(c + 25) % 25], x = c * T + T / 2, y = HB + r * T;
        if (ch == '#') sg.create(x, y + T / 2, 'tile', 0).setDepth(1);
        else if (ch == '=') {
          const s = pg.create(x, y + 6, 'plat', row[(c + 24) % 25] != '=' ? 0 : row[(c + 26) % 25] != '=' ? 2 : 1).setDepth(1);
          s.body.setSize(T, 8, false);
          const k = s.body.checkCollision;
          k.down = k.left = k.right = false;
        } else if (ch == 'C') {
          const cy = y + T / 2, b = S.physics.add.existing(S.add.zone(x, cy - 64, 48, 32), true);
          b.body.enable = false;
          b.o = { id: G.C.length, s: S.add.image(x, cy, 'chest', 0).setDepth(2), st: 0, k: null, m: [], by: -1, ri: 0, rt: 0, life: 0, x: 1, b, t: txt(S, x, cy - 64, '', 3).setOrigin(0.5, 0.5).setDepth(5) };
          G.C.push(b.o);
          bz.push(b);
        }
      }
    });
    for (let i = 0; i < 6; i++) mkKey(0);
    [0, 1].forEach((i) => {
      const s = S.physics.add.sprite(0, 0, 'p' + i, 0).setOrigin(0.5, 1).setDepth(4);
      s.body.setSize(18, 34).setOffset(7, 6);
      s.body.maxVelocity.y = PH.fall;
      s.o = { i, s, sc: 0, sk: 0, k: null, pw: null, slow: 0, stun: 0, inv: 0, np: 0, cy: 0, jb: 0, cj: 0, g: 0, vy: 0 };
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
      hudTxt(x + d * 12, 17, 'P' + (i + 1), 2, PC[i], i);
      hud.sc.push(hudTxt(x + d * 46, 17, '', 3, 0xffffff, i));
      [[26, 32], [62, 22]].forEach(([o, w]) => S.add.rectangle(x + d * o, 41, w, 20, 0x1b1736).setStrokeStyle(1, 0x3a3566).setDepth(7));
      hud.ki.push(S.add.image(x + d * 26, 41, 'key', 0).setDepth(8));
      hud.pi.push(S.add.image(x + d * 62, 41, 'ic', 0).setDepth(8));
      hud.pn.push(hudTxt(x + d * 80, 41, '', 2, PC[i], i));
      hud.sk.push(hudTxt(x + d * 150, 17, '', 2, 0xffd23f, i));
    });
  }

  function screens() {
    let c = mkUI('title', 0.72);
    big(c, 96, 'FIEBRE DE', 6);
    big(c, 172, 'TESOROS', 10);
    U.menu = ['JUGAR', 'RANKING', 'CÓMO JUGAR'].map((s, i) => L(c, 400, 300 + i * 48, s, 3));
    U.mc = S.add.image(0, 0, 'key', 6).setScale(2);
    c.add(U.mc);
    U.best = L(c, 400, 474, '', 2, 0xffffff);
    L(c, 400, 572, 'PALANCA: ELEGIR. BOTÓN 1: CONFIRMAR', 2, 0x8a84b8);

    c = mkUI('how', 0.9);
    big(c, 50, 'CÓMO JUGAR', 5);
    [
      ['p0', 0, 'PALANCA: MOVERTE. BOTÓN 1: SALTAR'],
      ['key', 0, 'TOCA UNA LLAVE PARA TOMARLA'],
      ['key', 6, 'PARA CAMBIARLA: PALANCA ABAJO SOBRE OTRA LLAVE'],
      ['chest', 0, 'TOCA UN COFRE CON LA LLAVE PARA PROBARLA'],
      ['chest', 1, 'SI ABRE, GOLPEA LA CAJA DESDE ABAJO O USA BOTÓN 2'],
      ['box', 0, 'LAS CAJAS DAN POWERUPS. BOTÓN 2 LOS USA'],
      ['p1', 5, 'PISA AL RIVAL PARA QUE SUELTE SU LLAVE'],
    ].forEach(([k, f, s], i) => {
      c.add(S.add.image(110, 110 + i * 48, k, f));
      L(c, 150, 110 + i * 48, s, 2, 0xffffff, 0);
    });
    PW.forEach((w, i) => {
      const x = 110 + (i % 2) * 330, y = 448 + ((i / 2) | 0) * 34;
      c.add(S.add.image(x, y, 'ic', w.f));
      L(c, x + 18, y, w.n + ': ' + w.d, 2, 0xffd23f, 0);
    });
    L(c, 400, 526, 'RACHA: ABRE COFRES SEGUIDOS Y VALEN X2 Y X3', 2);
    L(c, 400, 572, 'BOTÓN PARA VOLVER', 2, 0x8a84b8);

    c = mkUI('rank', 0.9);
    big(c, 60, 'RANKING', 6);
    U.rk = [...Array(8).keys()].map((i) => [L(c, 230, 140 + i * 46, '', 3, 0xffffff, 0), L(c, 330, 140 + i * 46, '', 3, 0xffffff, 0), L(c, 570, 140 + i * 46, '', 3, 0xffffff, 1)]);
    L(c, 400, 572, 'BOTÓN PARA VOLVER', 2, 0x8a84b8);

    c = mkUI('ready', 0);
    U.cd = L(c, 400, 300, '', 12, 0xffd23f);
    PS.forEach(([x, y], i) => L(c, x * T + T / 2, HB + y * T - 64, 'P' + (i + 1), 2, PC[i]));

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
    L(c, 400, 572, 'ELIGE TUS INICIALES Y TERMINA CON FIN', 2, 0x8a84b8);
  }

  function create() {
    S = this;
    S.G = G;
    build();
    reset();
    load();
    go('title');
  }

  function update(_, d) {
    PHASES[G.ph].up(Math.min(d, 50));
    for (const k in pressed) delete pressed[k];
  }

  // ==== KIT ====
  // Provisional kit: flat-colour textures, system font, no sound. It honours the same five-function contract as the final one.
  function kitTex(s) {
    const mk = (key, w, h, n, col) => {
      const t = s.textures.createCanvas(key, w * n, h), x = t.getContext();
      for (let i = 0; i < n; i++) {
        x.fillStyle = col.pop ? col[i % col.length] : col;
        x.fillRect(i * w, 0, w, h);
        t.add(i, 0, i * w, 0, w, h);
      }
      t.refresh();
    };
    const hex = (c) => '#' + c.toString(16).padStart(6, '0');
    PC.forEach((c, i) => mk('p' + i, 32, 40, 6, hex(c)));
    mk('chest', 32, 32, 2, ['#8a5a2b', '#d9a441']);
    mk('key', 24, 14, 7, KC.map(hex).concat('#ffd23f'));
    mk('box', 24, 24, 2, ['#7b4dff', '#a98bff']);
    mk('ic', 16, 16, 4, ['#5fe37a', '#ffd23f', '#ff9a3c', '#ff5a4d']);
    mk('tile', 32, 32, 1, '#55647a');
    mk('plat', 32, 12, 3, '#7c8ca3');
    mk('px', 4, 4, 1, '#fff');
  }

  function txt(s, x, y, str, size, tint) {
    const t = s.add.text(x, y, str, { fontFamily: 'monospace', fontSize: size * 8 + 'px', color: '#fff' });
    return tint === undefined ? t : t.setTint(tint);
  }

  function bg(s) {
    s.add.rectangle(W / 2, H / 2, W, H, 0x141033).setDepth(0);
  }

  function ev() {}

  function music() {}
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
