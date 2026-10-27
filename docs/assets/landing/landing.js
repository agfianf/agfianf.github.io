/* Landing page for agfian's space: theme sync with Material, the rotating headline, latest notes from the JSON feed, and the particle field behind the hero and the scroll story. */
(() => {
  'use strict';

  const root = document.documentElement;
  const motionQuery = matchMedia('(prefers-reduced-motion: reduce)');
  const lightQuery = matchMedia('(prefers-color-scheme: light)');
  const narrowQuery = matchMedia('(max-width: 900px)');
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const isDark = () => root.dataset.theme !== 'light';

  /* ------------------------------------------------------------------ theme */

  // Material keeps the palette under "<site root>.__palette"; writing the same record keeps the blog in sync.
  const PALETTE_KEY = new URL('.', location).pathname + '.__palette';
  const PALETTES = {
    light: { index: 0, color: { media: '(prefers-color-scheme: light)', scheme: 'default', primary: 'white', accent: 'grey' } },
    dark: { index: 1, color: { media: '(prefers-color-scheme: dark)', scheme: 'slate', primary: 'black', accent: 'white' } },
  };

  function storedTheme() {
    try {
      const palette = JSON.parse(localStorage.getItem(PALETTE_KEY));
      if (palette && palette.color) return palette.color.scheme === 'slate' ? 'dark' : 'light';
    } catch {
      // storage can be blocked; fall back to the system preference
    }
    return null;
  }

  function setTheme(theme, persist) {
    root.dataset.theme = theme;
    document.getElementById('theme-toggle').setAttribute('aria-label', theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
    if (persist) {
      try {
        localStorage.setItem(PALETTE_KEY, JSON.stringify(PALETTES[theme]));
      } catch {
        // the theme still applies for this visit
      }
    }
    document.dispatchEvent(new Event('themechange'));
  }

  function initTheme() {
    setTheme(isDark() ? 'dark' : 'light', false);
    document.getElementById('theme-toggle').addEventListener('click', () => setTheme(isDark() ? 'light' : 'dark', true));
    lightQuery.addEventListener('change', (e) => {
      if (!storedTheme()) setTheme(e.matches ? 'light' : 'dark', false);
    });
  }

  /* ------------------------------------------------------------------ page chrome */

  function initChrome() {
    const nav = document.querySelector('.nav');
    const onScroll = () => nav.classList.toggle('is-scrolled', scrollY > 8);
    addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    const year = new Date().getFullYear();
    document.getElementById('year').textContent = String(year);
    document.querySelectorAll('[data-years-since]').forEach((el) => (el.textContent = String(year - Number(el.dataset.yearsSince))));

    const items = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window)) {
      items.forEach((el) => el.classList.add('in'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('in');
        io.unobserve(entry.target);
      }
    }, { rootMargin: '0px 0px -8% 0px' });
    items.forEach((el) => io.observe(el));
  }

  /* ------------------------------------------------------------------ rotating headline */

  const CRAFTS = ['computer vision', 'MLOps pipelines', 'LLM systems', 'AI evaluations', 'backend services', 'DevOps pipelines', 'automations', 'reliable software'];
  const SCRAMBLE = '@#8S%x*+=~-';

  function initRotator() {
    const el = document.getElementById('rotator');
    if (!el) return;
    let index = 0;

    // Each character scrambles, then locks into the next word, left to right with a little jitter
    function decode(next) {
      const from = el.textContent;
      const len = Math.max(from.length, next.length);
      const lockAt = Array.from({ length: len }, (_, k) => (k / len) * 0.65 + Math.random() * 0.35);
      const start = performance.now();
      const step = (now) => {
        const p = (now - start) / 760;
        let out = '';
        for (let k = 0; k < len; k++) {
          if (p >= lockAt[k]) out += next[k] || '';
          else if (p < lockAt[k] * 0.35) out += from[k] || '';
          else out += next[k] === ' ' ? ' ' : SCRAMBLE[(Math.random() * SCRAMBLE.length) | 0];
        }
        el.textContent = out;
        if (p < 1) requestAnimationFrame(step);
        else el.textContent = next;
      };
      requestAnimationFrame(step);
    }

    setInterval(() => {
      if (document.hidden) return;
      index = (index + 1) % CRAFTS.length;
      if (motionQuery.matches) el.textContent = CRAFTS[index];
      else decode(CRAFTS[index]);
    }, 2600);
  }

  /* ------------------------------------------------------------------ latest notes */

  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function formatDate(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return `${String(d.getUTCDate()).padStart(2, '0')} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  }

  // The feed holds absolute production URLs; keep only the path so links also work on localhost
  function sitePath(url) {
    try {
      const u = new URL(url, location.href);
      return u.pathname.replace(/^\//, '') + u.hash;
    } catch {
      return url;
    }
  }

  function excerpt(html) {
    const doc = new DOMParser().parseFromString(html || '', 'text/html');
    for (const p of doc.querySelectorAll('p')) {
      if (p.classList.contains('admonition-title')) continue;
      const text = p.textContent.replace(/\s+/g, ' ').trim();
      if (text.length < 60) continue;
      return text.length > 180 ? text.slice(0, 180).replace(/\s+\S*$/, '') + '…' : text;
    }
    return '';
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function noteCard(item, i) {
    const li = el('li');
    const a = el('a', 'note');
    a.href = sitePath(item.url);
    a.dataset.label = `note ${(0.98 - i * 0.03).toFixed(2)}`;

    const meta = el('p', 'note-meta');
    const time = el('time', '', formatDate(item.date_published));
    time.dateTime = item.date_published || '';
    meta.append(time);

    const tags = el('p', 'note-tags');
    for (const tag of [...new Set(item.tags || [])].slice(0, 3)) tags.append(el('span', '', `#${tag}`));

    const go = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    go.setAttribute('viewBox', '0 0 24 24');
    go.setAttribute('class', 'note-go');
    go.setAttribute('aria-hidden', 'true');
    go.innerHTML = '<path d="M7 17 17 7M8 7h9v9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';

    a.append(meta, el('h3', 'note-title', item.title), el('p', 'note-excerpt', excerpt(item.content_html)), tags, go);
    li.append(a);
    return li;
  }

  async function initNotes() {
    const list = document.getElementById('notes-list');
    const topics = document.getElementById('topics');
    let items;
    try {
      const res = await fetch('feed_json_created.json', { cache: 'no-cache' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const seen = new Set();
      // mkdocs serve can list a post more than once after live reloads
      items = ((await res.json()).items || []).filter((item) => !seen.has(item.url) && seen.add(item.url));
    } catch {
      return; // keep the static "browse every post" card
    }
    if (!items.length) return;

    list.replaceChildren(...items.slice(0, 6).map(noteCard));

    const counts = new Map();
    for (const item of items) for (const tag of new Set(item.tags || [])) counts.set(tag, (counts.get(tag) || 0) + 1);
    const top = [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 9);
    topics.replaceChildren(...top.map(([tag, n]) => {
      const li = el('li');
      const a = el('a', 'topic', tag);
      a.href = `tags/#tag:${encodeURIComponent(tag.toLowerCase().replace(/\s+/g, '-'))}`;
      a.append(el('span', '', String(n)));
      li.append(a);
      return li;
    }));
  }

  /* ------------------------------------------------------------------ particle field: palette and timing */

  // Glyphs from sparse to dense; a cell's brightness picks both its glyph and its colour
  const GLYPHS = '.-~=+*xS%#8@';
  const STEPS = GLYPHS.length;

  const PALETTE = {
    dark: {
      ramp: ['#1f2a17', '#3d5c22', '#78a32f', '#c2e24b', '#f6f9d8'],
      paper: '#0d100b',
      dust: ['rgba(168, 204, 63, 0.6)', 'rgba(217, 194, 122, 0.5)', 'rgba(233, 236, 217, 0.4)'],
      box: '#e9ecd9',
      boxInk: '#11150d',
      primary: '#d4e85a',
      primaryInk: '#11150d',
      scan: '212, 232, 90',
    },
    light: {
      ramp: ['#d3d3bb', '#a3b07a', '#678537', '#36561b', '#16240a'],
      paper: '#f1eee4',
      dust: ['rgba(79, 122, 29, 0.55)', 'rgba(138, 95, 54, 0.45)', 'rgba(27, 32, 21, 0.35)'],
      box: '#1b2015',
      boxInk: '#f1eee4',
      primary: '#3f6a14',
      primaryInk: '#f6f4ec',
      scan: '63, 106, 20',
    },
  };

  // Frame counts are at 60 fps and scale with the real frame time
  const TIMING = { introScatter: 54, scatter: 32, build: 72, jitter: 26, flowStagger: 30, flowJitter: 12, heroScanMs: 1300, storyScanMs: 950, holdMs: 9000 };

  /* ------------------------------------------------------------------ particle field: what it draws */

  // Boxes use the picture's own 0–1 coordinates. hoverOnly regions are never drawn; they only name what the cursor points at.
  const HERO_SHAPES = [
    {
      kind: 'photo',
      src: 'assets/profile.jpeg',
      file: 'agfian.jpg',
      chapter: 'portrait',
      build: 'down',
      invertOnLight: true,
      boxes: [
        { label: 'person', conf: 0.98, x: 0.02, y: 0.18, w: 0.82, h: 0.82 },
        { label: 'face', conf: 0.96, x: 0.33, y: 0.3, w: 0.34, h: 0.4, primary: true },
        { label: 'smile', conf: 0.93, x: 0.43, y: 0.52, w: 0.14, h: 0.065 },
        { label: 'hair', x: 0.315, y: 0.18, w: 0.37, h: 0.13, hoverOnly: true },
        { label: 'hoodie', x: 0, y: 0.6, w: 0.84, h: 0.4, hoverOnly: true },
      ],
    },
    {
      kind: 'alpha',
      src: 'assets/logo.png',
      file: 'logo.png',
      chapter: 'signal',
      build: 'up',
      boxes: [
        { label: 'lightning', conf: 0.99, x: 0.23, y: 0, w: 0.55, h: 0.93, primary: true },
        { label: 'leaf', conf: 0.91, x: 0.86, y: 0.23, w: 0.12, h: 0.08 },
        { label: 'leaf', conf: 0.86, x: 0.79, y: 0.72, w: 0.13, h: 0.09 },
        { label: 'node', conf: 0.78, x: 0.13, y: 0.21, w: 0.08, h: 0.07 },
      ],
    },
  ];

  // Story scenes are drawn in grey on a transparent square: brightness becomes the glyph level, coverage decides which cells exist
  const SCENE = 480;
  const box = (label, x, y, w, h, extra) => ({ label, x: x / SCENE, y: y / SCENE, w: w / SCENE, h: h / SCENE, ...extra });

  function seeded(seed) {
    return () => {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function paintScene(draw) {
    const c = document.createElement('canvas');
    c.width = c.height = SCENE;
    const g = c.getContext('2d');
    g.lineCap = 'round';
    g.lineJoin = 'round';
    const shade = (v) => {
      const n = Math.round(clamp(v, 0, 1) * 255);
      return `rgb(${n}, ${n}, ${n})`;
    };
    const kit = {
      g,
      rand: seeded(7),
      rect(x, y, w, h, r, fill, stroke, width) {
        g.beginPath();
        if (g.roundRect) g.roundRect(x, y, w, h, r);
        else g.rect(x, y, w, h);
        if (fill != null) {
          g.fillStyle = shade(fill);
          g.fill();
        }
        if (stroke != null) {
          g.strokeStyle = shade(stroke);
          g.lineWidth = width || 5;
          g.stroke();
        }
      },
      line(points, v, width, dash) {
        g.beginPath();
        g.setLineDash(dash || []);
        points.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
        g.strokeStyle = shade(v);
        g.lineWidth = width;
        g.stroke();
        g.setLineDash([]);
      },
      dot(x, y, r, v) {
        g.beginPath();
        g.arc(x, y, r, 0, Math.PI * 2);
        g.fillStyle = shade(v);
        g.fill();
      },
      ring(x, y, r, v, width) {
        g.beginPath();
        g.arc(x, y, r, 0, Math.PI * 2);
        g.strokeStyle = shade(v);
        g.lineWidth = width;
        g.stroke();
      },
      fillShade: shade,
    };
    draw(kit);
    return c;
  }

  const SCENES = [
    {
      // 01 see: a dataset of field images, some already labelled
      file: 'dataset/',
      chapter: 'see',
      boxes: [
        box('ffb', 184, 184, 112, 116, { conf: 0.94, primary: true }),
        box('plate', 219, 92, 42, 25, { conf: 0.91 }),
        box('pond', 334, 50, 112, 80, { conf: 0.88 }),
        box('digits', 37, 190, 106, 100, { conf: 0.97 }),
      ],
      draw({ g, rect, line, dot, rand }) {
        for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) rect(25 + c * 150, 25 + r * 150, 130, 130, 12, 0.13, 0.3, 4);
        // leaf
        g.save();
        g.translate(90, 90);
        g.rotate(-0.65);
        g.beginPath();
        g.ellipse(0, 0, 50, 22, 0, 0, Math.PI * 2);
        g.fillStyle = 'rgb(184, 184, 184)';
        g.fill();
        g.restore();
        line([[56, 114], [124, 66]], 0.38, 5);
        // car with a number plate
        rect(193, 85, 94, 34, 10, 0.5);
        rect(213, 63, 54, 28, 8, 0.42);
        dot(213, 121, 11, 0.8);
        dot(267, 121, 11, 0.8);
        rect(225, 98, 30, 13, 3, 0.97);
        // pond from above
        g.beginPath();
        g.ellipse(390, 90, 50, 34, 0, 0, Math.PI * 2);
        g.fillStyle = 'rgb(128, 128, 128)';
        g.fill();
        line([[360, 82], [372, 76], [384, 82], [396, 76], [408, 82], [420, 76]], 0.88, 5);
        line([[364, 102], [376, 96], [388, 102], [400, 96], [412, 102]], 0.7, 5);
        // seven-segment display
        for (const ox of [47, 95]) {
          const s = [[0, 0, 36, 0], [0, 39, 36, 39], [0, 78, 36, 78], [0, 0, 0, 39], [0, 39, 0, 78], [36, 0, 36, 39], [36, 39, 36, 78]];
          for (const [x1, y1, x2, y2] of s) line([[ox + x1, 200 + y1], [ox + x2, 200 + y2]], 0.95, 8);
        }
        // fresh fruit bunch
        line([[240, 190], [240, 212]], 0.5, 6);
        const fruit = [];
        for (let k = 0; fruit.length < 26 && k < 600; k++) {
          const a = rand() * Math.PI * 2;
          const d = Math.sqrt(rand()) * 40;
          const x = 240 + Math.cos(a) * d;
          const y = 246 + Math.sin(a) * d * 1.05;
          if (fruit.every(([fx, fy]) => (fx - x) ** 2 + (fy - y) ** 2 > 220)) fruit.push([x, y]);
        }
        fruit.forEach(([x, y]) => dot(x, y, 8.5, 0.6 + rand() * 0.4));
        // person
        dot(390, 215, 18, 0.8);
        rect(358, 240, 64, 52, 22, 0.55);
        // an unlabelled frame: just noise
        for (let k = 0; k < 46; k++) dot(38 + rand() * 104, 338 + rand() * 104, 2.5 + rand() * 3, 0.25 + rand() * 0.3);
        // crop rows
        for (let x = 188; x <= 290; x += 22) line([[x, 444], [x + 30, 342]], 0.5, 6);
        // tomato
        dot(390, 398, 34, 0.75);
        line([[378, 360], [390, 370], [402, 358]], 0.45, 6);
      },
    },
    {
      // 02 train: loss falls, mAP climbs, the best checkpoint gets picked
      file: 'train.log',
      chapter: 'train',
      boxes: [
        box('loss ↓', 296, 322, 160, 60),
        box('mAP ↑', 148, 186, 126, 104),
        box('best ckpt', 359, 135, 52, 52, { primary: true }),
      ],
      draw({ line, dot, ring, rand }) {
        for (const y of [110, 180, 250, 320, 390]) line([[80, y], [452, y]], 0.13, 3);
        line([[70, 40], [70, 420], [456, 420]], 0.5, 6);
        const loss = [];
        const map = [];
        for (let x = 80; x <= 452; x += 4) {
          const t = (x - 80) / 372;
          loss.push([x, 72 + 296 * (1 - Math.exp(-4.2 * t)) + (rand() - 0.5) * 14 * (1 - t * 0.7)]);
          map.push([x, 404 - 262 * (1 - Math.exp(-3.2 * t)) + (rand() - 0.5) * 7]);
        }
        line(map, 0.55, 6);
        line(loss, 0.95, 8);
        ring(385, 161, 22, 0.7, 4);
        dot(385, 161, 12, 1);
      },
    },
    {
      // 03 ship: a camera feeding an edge module
      file: 'model_fp16.engine',
      chapter: 'ship',
      boxes: [
        box('jetson orin', 112, 102, 316, 316, { conf: 0.97, primary: true }),
        box('tensorrt fp16', 188, 178, 164, 164),
        box('camera', 18, 28, 84, 56, { conf: 0.93 }),
      ],
      draw({ rect, line, dot, ring }) {
        rect(24, 34, 70, 42, 8, 0.55);
        ring(59, 55, 19, 0.3, 5);
        dot(59, 55, 13, 0.95);
        line([[96, 55], [150, 55], [150, 92]], 0.45, 4, [8, 9]);
        rect(120, 110, 300, 300, 18, 0.2, 0.6, 7);
        for (let i = 0; i < 9; i++) {
          const p = 148 + i * 30.5;
          rect(p, 88, 12, 22, 3, 0.55);
          rect(p, 410, 12, 22, 3, 0.55);
          rect(98, p - 10, 22, 12, 3, 0.55);
          rect(420, p - 10, 22, 12, 3, 0.55);
        }
        rect(195, 185, 150, 150, 10, 0.92);
        for (const v of [225, 255, 285, 315]) {
          line([[v, 192], [v, 328]], 0.5, 4);
          line([[202, v + 5], [338, v + 5]], 0.5, 4);
        }
        rect(142, 368, 64, 10, 5, 0.45);
        rect(142, 388, 40, 10, 5, 0.32);
      },
    },
    {
      // 04 serve: a rack of services with containers beside it
      file: 'api.service',
      chapter: 'serve',
      boxes: [
        box('api', 114, 36, 252, 58, { conf: 0.98, primary: true }),
        box('queue', 114, 154, 252, 58, { conf: 0.93 }),
        box('postgres', 114, 272, 252, 58, { conf: 0.95 }),
        box('pods ×3', 396, 82, 72, 252),
      ],
      draw({ rect, line, dot }) {
        rect(96, 22, 288, 436, 12, null, 0.55, 7);
        for (let y = 40; y <= 440; y += 24) {
          dot(108, y, 3, 0.38);
          dot(372, y, 3, 0.38);
        }
        const leds = [[1, 1], [1, 0], [1, 1], [0, 1], [1, 1], [1, 0], [0, 0]];
        for (let k = 0; k < 7; k++) {
          const y = 42 + k * 59;
          rect(120, y, 240, 46, 8, 0.24, 0.45, 3);
          for (let v = 0; v < 8; v++) line([[138 + v * 14, y + 12], [138 + v * 14, y + 34]], 0.45, 4);
          dot(318, y + 23, 7, leds[k][0] ? 0.98 : 0.42);
          dot(340, y + 23, 7, leds[k][1] ? 0.98 : 0.42);
        }
        for (const y of [90, 180, 270]) {
          line([[384, y + 28], [404, y + 28]], 0.45, 4);
          rect(404, y, 56, 56, 10, 0.4, 0.75, 5);
          dot(432, y + 28, 10, 0.92);
        }
      },
    },
    {
      // 05 watch: live data drifts away from the reference, and the alert fires
      file: 'drift.prom',
      chapter: 'watch',
      boxes: [
        box('reference', 118, 62, 140, 174),
        box('live · drift', 240, 50, 126, 186),
        box('alert', 312, 280, 56, 60, { conf: 0.99, primary: true }),
      ],
      draw({ g, line, dot, rand, fillShade }) {
        const bell = (c, s, h) => (x) => 232 - h * Math.exp(-((x - c) ** 2) / (2 * s * s));
        const ref = bell(188, 52, 168);
        const live = bell(296, 44, 178);
        g.beginPath();
        g.moveTo(28, 232);
        for (let x = 28; x <= 452; x += 4) g.lineTo(x, ref(x));
        g.lineTo(452, 232);
        g.closePath();
        g.fillStyle = fillShade(0.3);
        g.fill();
        const curve = (f) => {
          const pts = [];
          for (let x = 28; x <= 452; x += 4) pts.push([x, f(x)]);
          return pts;
        };
        line(curve(ref), 0.5, 5);
        line(curve(live), 0.95, 8);
        line([[28, 232], [452, 232]], 0.4, 5);
        line([[188, 64], [188, 228]], 0.35, 3, [6, 8]);
        line([[296, 54], [296, 228]], 0.35, 3, [6, 8]);
        line([[194, 40], [290, 40]], 0.7, 4);
        line([[28, 340], [452, 340]], 0.4, 4, [10, 10]);
        const series = [];
        for (let x = 28; x <= 452; x += 6) series.push([x, 410 + Math.sin(x * 0.09) * 6 + (rand() - 0.5) * 10 - 108 * Math.exp(-((x - 340) ** 2) / 160)]);
        line(series, 0.78, 6);
        dot(340, 303, 11, 1);
      },
    },
    {
      // 06 automate: an LLM workflow with a tool call, an eval gate and a retry loop
      file: 'agent.flow',
      chapter: 'automate',
      boxes: [
        box('llm', 174, 54, 132, 86, { conf: 0.97 }),
        box('tool call', 336, 54, 132, 86, { conf: 0.92 }),
        box('eval', 174, 292, 132, 86, { conf: 0.95, primary: true }),
      ],
      draw({ g, rect, line, fillShade }) {
        const arrow = (x, y, dir) => {
          g.save();
          g.translate(x, y);
          g.rotate(dir);
          g.beginPath();
          g.moveTo(0, 0);
          g.lineTo(-13, -8);
          g.lineTo(-13, 8);
          g.closePath();
          g.fillStyle = fillShade(0.6);
          g.fill();
          g.restore();
        };
        line([[136, 97], [172, 97]], 0.5, 6);
        arrow(180, 97, 0);
        line([[298, 97], [334, 97]], 0.5, 6);
        arrow(342, 97, 0);
        line([[402, 134], [402, 194], [262, 194], [262, 142]], 0.42, 5, [9, 9]);
        arrow(262, 136, -Math.PI / 2);
        line([[222, 134], [222, 288]], 0.5, 6);
        arrow(222, 296, Math.PI / 2);
        line([[298, 335], [334, 335]], 0.5, 6);
        arrow(342, 335, 0);
        line([[182, 350], [96, 350], [96, 224], [176, 224]], 0.42, 5, [9, 9]);
        arrow(182, 224, 0);
        const node = (x, y, fill, stroke, bar) => {
          rect(x, y, 116, 70, 14, fill, stroke, 5);
          rect(x + 16, y + 20, 64, 10, 5, bar);
          rect(x + 16, y + 40, 40, 10, 5, bar * 0.8);
        };
        node(20, 62, 0.22, 0.6, 0.55);
        node(182, 62, 0.88, 1, 0.42);
        node(344, 62, 0.22, 0.6, 0.55);
        node(182, 300, 0.55, 0.95, 0.9);
        node(344, 300, 0.22, 0.6, 0.55);
        line([[372, 410], [388, 426], [416, 394]], 0.95, 9);
      },
    },
  ];

  /* ------------------------------------------------------------------ particle field: helpers */

  function hexToRgb(hex) {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function rampColor(ramp, t) {
    const pos = clamp(t, 0, 1) * (ramp.length - 1);
    const i = Math.min(ramp.length - 2, Math.floor(pos));
    const a = hexToRgb(ramp[i]);
    const b = hexToRgb(ramp[i + 1]);
    const f = pos - i;
    return a.map((c, k) => Math.round(c + (b[k] - c) * f));
  }

  const luma = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

  function loadImage(src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }

  // A plain bolt, used if the logo cannot be read (for example when the page is opened from file://)
  function fallbackMark() {
    const c = document.createElement('canvas');
    c.width = 300;
    c.height = 330;
    const g = c.getContext('2d');
    const grad = g.createLinearGradient(0, 0, 300, 330);
    grad.addColorStop(0, '#f4f7a0');
    grad.addColorStop(0.5, '#a8cc3f');
    grad.addColorStop(1, '#2f5a14');
    g.fillStyle = grad;
    g.beginPath();
    [[190, 0], [70, 190], [150, 190], [110, 330], [235, 125], [155, 125], [215, 0]].forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.closePath();
    g.fill();
    return c;
  }

  /* ------------------------------------------------------------------ particle field */

  // One fixed canvas serves two stages: the hero, and the pinned stage of the scroll story.
  // Particles belong to whichever stage is active and flow to the other one when the reader scrolls between them.
  function initField() {
    const canvas = document.getElementById('field');
    const ctx = canvas && canvas.getContext && canvas.getContext('2d');
    const heroStage = document.getElementById('stage');
    const storyStage = document.getElementById('story-stage');
    if (!ctx || !heroStage || !storyStage) return;

    const scratch = document.createElement('canvas');
    const sctx = scratch.getContext('2d', { willReadFrequently: true });
    const atlas = document.createElement('canvas');
    const steps = [...document.querySelectorAll('[data-step]')];

    const anchor = (key, el, section, shapes, scanMs) => ({ key, el, section, shapes, scanMs, sources: [], grids: [], cols: 0, cs: 8, size: 0, x: 0, y: 0, lastX: 0, lastY: 0, current: 0 });
    const hero = anchor('hero', heroStage, document.getElementById('hero'), HERO_SHAPES, TIMING.heroScanMs);
    const story = anchor('story', storyStage, document.getElementById('story'), SCENES, TIMING.storyScanMs);
    const anchors = [hero, story];

    const hud = {
      hero: {
        file: document.getElementById('hud-file'),
        fps: document.getElementById('hud-fps'),
        pts: document.getElementById('hud-pts'),
        chapter: document.getElementById('hud-shape'),
        buttons: [...heroStage.querySelectorAll('[data-shape]')],
      },
      story: {
        file: document.getElementById('story-file'),
        fps: document.getElementById('story-fps'),
        pts: document.getElementById('story-pts'),
        chapter: document.getElementById('story-chapter'),
        segments: [...storyStage.querySelectorAll('.progress i')],
      },
    };

    let W = 0;
    let H = 0;
    let dpr = 1;
    let cpx = 8; // atlas cell size in device px
    let atlasFor = '';
    let labelPx = 11;
    let active = hero;
    let ready = false;
    let maxCount = 0;
    let shapeCount = 0;
    let dustCount = 0;
    let invert = false;
    let scanAt = Infinity;
    let scanPending = false;
    let builtAt = 0;
    let landed = 0;
    let autoplay = true;
    let motion = !motionQuery.matches;
    let visible = true;
    let raf = 0;
    let last = 0;
    let lastScroll = scrollY;
    let tick = 0;
    let fps = 60;
    let hudAt = 0;
    let fillShown = -1;

    // Particles as parallel typed arrays. mode: 0 parked, 1 dust, 2 part of the picture. gx/gy: the grid cell it is heading for.
    let N = 0;
    let px, py, vx, vy, gx, gy, val, wait, alpha, flick, mode;
    const pointer = { x: 0, y: 0, rx: 0, ry: 0, active: false, inStage: false, seen: false, radius: 70 };
    const rings = [];

    function ensurePool(n) {
      if (n <= N) return;
      const grow = (a, T) => {
        const b = new T(n);
        if (a) b.set(a);
        return b;
      };
      px = grow(px, Float32Array);
      py = grow(py, Float32Array);
      vx = grow(vx, Float32Array);
      vy = grow(vy, Float32Array);
      gx = grow(gx, Int16Array);
      gy = grow(gy, Int16Array);
      val = grow(val, Float32Array);
      wait = grow(wait, Float32Array);
      alpha = grow(alpha, Float32Array);
      flick = grow(flick, Float32Array);
      mode = grow(mode, Uint8Array);
      for (let i = N; i < n; i++) {
        px[i] = Math.random() * W;
        py[i] = Math.random() * H;
      }
      N = n;
    }

    /* ---------- sampling pictures into glyph grids ---------- */

    function readPixels(src, sx, sy, sw, sh, w, h) {
      scratch.width = w;
      scratch.height = h;
      sctx.clearRect(0, 0, w, h);
      sctx.imageSmoothingQuality = 'high';
      sctx.drawImage(src, sx, sy, sw, sh, 0, 0, w, h);
      return sctx.getImageData(0, 0, w, h).data;
    }

    // Average k×k pixel blocks into one [r, g, b, coverage] per cell, all 0–1
    function cellAverages(data, gw, gh, k) {
      const out = new Float32Array(gw * gh * 4);
      const rowPx = gw * k;
      for (let cy = 0; cy < gh; cy++) {
        for (let cx = 0; cx < gw; cx++) {
          let r = 0;
          let g = 0;
          let b = 0;
          let a = 0;
          for (let y = 0; y < k; y++) {
            let o = ((cy * k + y) * rowPx + cx * k) * 4;
            for (let x = 0; x < k; x++, o += 4) {
              const al = data[o + 3];
              r += data[o] * al;
              g += data[o + 1] * al;
              b += data[o + 2] * al;
              a += al;
            }
          }
          const i = (cy * gw + cx) * 4;
          out[i] = a ? r / a / 255 : 0;
          out[i + 1] = a ? g / a / 255 : 0;
          out[i + 2] = a ? b / a / 255 : 0;
          out[i + 3] = a / (k * k * 255);
        }
      }
      return out;
    }

    // Keep the cells that have a value, optionally stretch values to 0–1, and shuffle so particles pick cells at random
    function toGrid(size, valueAt, content, boxes, stretch) {
      const cells = [];
      const values = [];
      for (let i = 0; i < size * size; i++) {
        const v = valueAt(i);
        if (v < 0) continue;
        cells.push(i);
        values.push(v);
      }
      let lo = 0;
      let hi = 1;
      if (stretch) {
        const sorted = values.slice().sort((a, b) => a - b);
        lo = sorted[Math.floor(sorted.length * 0.02)] || 0;
        hi = sorted[Math.floor(sorted.length * 0.95)] || 1;
      }
      const count = cells.length;
      const order = Array.from({ length: count }, (_, i) => i);
      for (let i = count - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
      }
      const cx = new Int16Array(count);
      const cy = new Int16Array(count);
      const v = new Float32Array(count);
      for (let j = 0; j < count; j++) {
        const o = order[j];
        cx[j] = cells[o] % size;
        cy[j] = Math.floor(cells[o] / size);
        v[j] = clamp((values[o] - lo) / (hi - lo || 1), 0, 1);
      }
      return { count, cx, cy, v, size, content, boxes };
    }

    function samplePhoto(img, n, boxes) {
      const k = 4;
      const avg = cellAverages(readPixels(img, 0, 0, img.naturalWidth, img.naturalHeight, n * k, n * k), n, n, k);
      const lum = new Float32Array(n * n);
      const wall = new Uint8Array(n * n);
      for (let i = 0; i < n * n; i++) {
        const r = avg[i * 4];
        const g = avg[i * 4 + 1];
        const b = avg[i * 4 + 2];
        lum[i] = luma(r, g, b);
        // The portrait sits on a plain light wall: bright and almost grey
        wall[i] = lum[i] > 0.68 && Math.max(r, g, b) - Math.min(r, g, b) < 0.11 ? 1 : 0;
      }
      // Flood-fill the wall in from the top and side edges...
      const bg = new Uint8Array(n * n);
      const stack = [];
      for (let i = 0; i < n; i++) stack.push(i, i * n, i * n + n - 1);
      while (stack.length) {
        const i = stack.pop();
        if (bg[i] || !wall[i]) continue;
        bg[i] = 1;
        const x = i % n;
        if (x > 0) stack.push(i - 1);
        if (x < n - 1) stack.push(i + 1);
        if (i >= n) stack.push(i - n);
        if (i < n * (n - 1)) stack.push(i + n);
      }
      // ...then take wall-coloured gaps that touch it (between hair strands) without reaching enclosed bright bits like teeth
      for (let pass = 0; pass < 2; pass++) {
        const next = bg.slice();
        for (let i = 0; i < n * n; i++) {
          if (bg[i] || !wall[i]) continue;
          const x = i % n;
          const touching = (x > 0 ? bg[i - 1] : 0) + (x < n - 1 ? bg[i + 1] : 0) + (i >= n ? bg[i - n] : 0) + (i < n * (n - 1) ? bg[i + n] : 0);
          if (touching >= 2) next[i] = 1;
        }
        bg.set(next);
      }
      return toGrid(n, (i) => (bg[i] ? -1 : lum[i]), { x: 0, y: 0, w: n, h: n }, boxes, true);
    }

    // Logos are cropped to their opaque pixels and stretched; scenes keep their full square and their exact shades
    function sampleAlpha(img, n, boxes, crop) {
      const w0 = img.naturalWidth || img.width;
      const h0 = img.naturalHeight || img.height;
      let x0 = 0;
      let y0 = 0;
      let x1 = w0 - 1;
      let y1 = h0 - 1;
      if (crop) {
        const full = readPixels(img, 0, 0, w0, h0, w0, h0);
        x0 = w0;
        y0 = h0;
        x1 = -1;
        y1 = -1;
        for (let y = 0; y < h0; y++) {
          for (let x = 0; x < w0; x++) {
            if (full[(y * w0 + x) * 4 + 3] <= 40) continue;
            if (x < x0) x0 = x;
            if (x > x1) x1 = x;
            if (y < y0) y0 = y;
            if (y > y1) y1 = y;
          }
        }
        if (x1 < 0) return null;
      }
      const bw = x1 - x0 + 1;
      const bh = y1 - y0 + 1;
      const scale = n / Math.max(bw, bh);
      const gw = Math.max(1, Math.round(bw * scale));
      const gh = Math.max(1, Math.round(bh * scale));
      const k = 4;
      const avg = cellAverages(readPixels(img, x0, y0, bw, bh, gw * k, gh * k), gw, gh, k);
      const ox = Math.floor((n - gw) / 2);
      const oy = Math.floor((n - gh) / 2);
      const minCover = crop ? 0.14 : 0.18;
      return toGrid(n, (i) => {
        const x = (i % n) - ox;
        const y = Math.floor(i / n) - oy;
        if (x < 0 || y < 0 || x >= gw || y >= gh) return -1;
        const j = (y * gw + x) * 4;
        const cover = avg[j + 3];
        // Thin lines only half-cover a cell, so keep them at a low threshold and dim them by coverage
        if (cover < minCover) return -1;
        return luma(avg[j], avg[j + 1], avg[j + 2]) * (0.55 + 0.45 * cover);
      }, { x: ox, y: oy, w: gw, h: gh }, boxes, crop);
    }

    function sampleAnchor(a) {
      a.grids = a.shapes.map((shape, s) => {
        const src = a.sources[s];
        if (!src) return null;
        try {
          return shape.kind === 'photo' ? samplePhoto(src, a.cols, shape.boxes) : sampleAlpha(src, a.cols, shape.boxes, shape.kind === 'alpha');
        } catch {
          return null; // a tainted canvas, e.g. opened from file://
        }
      });
      if (a === hero && !a.grids[1]) a.grids[1] = sampleAlpha(fallbackMark(), a.cols, [{ label: 'lightning', conf: 0.99, x: 0, y: 0, w: 1, h: 1, primary: true }], true);
      if (!a.grids[a.current]) a.current = Math.max(0, a.grids.findIndex(Boolean));
      if (a === hero) hud.hero.buttons.forEach((b, s) => (b.hidden = !a.grids[s]));
      maxCount = Math.max(0, ...anchors.flatMap((x) => x.grids.map((g) => (g ? g.count : 0))));
    }

    /* ---------- glyph atlas: every glyph × brightness, as a lit tile and as a bare glyph ---------- */

    function buildAtlas() {
      const pal = PALETTE[isDark() ? 'dark' : 'light'];
      cpx = Math.max(4, Math.ceil(Math.max(hero.cs, story.cs) * dpr));
      atlasFor = `${cpx}|${isDark()}`;
      atlas.width = cpx * STEPS;
      atlas.height = cpx * STEPS * 2;
      const g = atlas.getContext('2d');
      g.clearRect(0, 0, atlas.width, atlas.height);
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.font = `600 ${Math.round(cpx * 0.72)}px "IBM Plex Mono", ui-monospace, monospace`;
      const inset = Math.max(0.75, cpx * 0.07);
      for (let level = 0; level < STEPS; level++) {
        const t = level / (STEPS - 1);
        const [r, gr, b] = rampColor(pal.ramp, t);
        const glyph = rampColor(pal.ramp, t + 0.22);
        const tileAlpha = 0.1 + 0.78 * Math.pow(t, 1.25);
        // Bright tiles carry a dark glyph, like a lit key cap
        const glyphOnTile = t > 0.62 ? pal.paper : `rgb(${glyph})`;
        for (let style = 0; style < 2; style++) {
          const y = (style * STEPS + level) * cpx;
          for (let ch = 0; ch < STEPS; ch++) {
            const x = ch * cpx;
            if (style === 0) {
              g.fillStyle = `rgba(${r}, ${gr}, ${b}, ${tileAlpha})`;
              g.fillRect(x + inset, y + inset, cpx - inset * 2, cpx - inset * 2);
              g.fillStyle = glyphOnTile;
            } else {
              g.fillStyle = `rgb(${glyph})`;
            }
            g.fillText(GLYPHS[ch], x + cpx / 2, y + cpx / 2 + cpx * 0.03);
          }
        }
      }
    }

    /* ---------- layout ---------- */

    function measureCanvas() {
      const r = canvas.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = r.width;
      H = r.height;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      dustCount = Math.round(clamp((W * H) / 8000, 40, 240));
    }

    // Read where both stages are right now; resample a stage's pictures when its size changes the grid
    function measureAnchors() {
      let atlasStale = false;
      for (const a of anchors) {
        const r = a.el.getBoundingClientRect();
        a.x = r.left;
        a.y = r.top;
        const size = Math.min(r.width, r.height);
        if (Math.abs(size - a.size) < 0.5) continue;
        a.size = size;
        const target = size >= 520 ? 9.6 : size >= 400 ? 8.4 : 7.4;
        const cols = clamp(Math.round(size / target), 36, 72);
        a.cs = size / cols;
        atlasStale = true;
        if (cols !== a.cols) {
          a.cols = cols;
          if (ready) {
            sampleAnchor(a);
            if (a === active) buildShape(a, a.current, motion ? 'place' : 'snap');
          }
        }
      }
      labelPx = active.size >= 440 ? 11 : 9.5;
      pointer.radius = active.size >= 440 ? 70 : 56;
      if (ready && (atlasStale || atlasFor !== `${Math.max(4, Math.ceil(Math.max(hero.cs, story.cs) * dpr))}|${isDark()}`)) buildAtlas();
    }

    // Keep the picture glued to its stage while the page scrolls; dust drifts with a little parallax
    function follow() {
      const dx = active.x - active.lastX;
      const dy = active.y - active.lastY;
      active.lastX = active.x;
      active.lastY = active.y;
      for (const a of anchors) {
        if (a === active) continue;
        a.lastX = a.x;
        a.lastY = a.y;
      }
      const ds = scrollY - lastScroll;
      lastScroll = scrollY;
      if (!dx && !dy && !ds) return;
      for (let i = 0; i < N; i++) {
        if (mode[i] === 2) {
          px[i] += dx;
          py[i] += dy;
        } else {
          py[i] -= ds * 0.25;
        }
      }
      for (const ring of rings) {
        ring.x += dx;
        ring.y += dy;
      }
    }

    /* ---------- which stage, which chapter ---------- */

    function stepAt() {
      let index = 0;
      if (narrowQuery.matches) {
        // Cards slide up over the pinned stage, so a chapter starts as soon as its card is well into view
        steps.forEach((step, i) => {
          if (step.getBoundingClientRect().top < H * 0.72) index = i;
        });
        return index;
      }
      // Side by side, the chapter is whichever one sits nearest the middle of the screen
      let best = Infinity;
      steps.forEach((step, i) => {
        const r = step.getBoundingClientRect();
        const d = Math.abs(r.top + r.height / 2 - H * 0.5);
        if (d < best) {
          best = d;
          index = i;
        }
      });
      return index;
    }

    function markStep(index) {
      steps.forEach((step, i) => step.classList.toggle('is-active', i === index));
    }

    function choose() {
      // The story takes over once its stage is well into view; a gap between the two thresholds stops flicker
      if (active === hero && story.y < H * 0.7) setActive(story);
      else if (active === story && story.y > H * 0.82) setActive(hero);
      if (active !== story) return;
      const index = stepAt();
      if (index === story.current) return;
      story.current = index;
      markStep(index);
      buildShape(story, index, motion ? 'flow' : 'snap');
    }

    function setActive(a) {
      active = a;
      a.lastX = a.x;
      a.lastY = a.y;
      if (a === story) {
        a.current = stepAt();
        markStep(a.current);
      }
      buildShape(a, a.current, motion ? 'flow' : 'snap');
    }

    /* ---------- building pictures ---------- */

    function burst(i, cx, cy, speed) {
      const a = Math.atan2(py[i] - cy, px[i] - cx) + (Math.random() - 0.5) * 0.9;
      vx[i] += Math.cos(a) * speed + 1.1;
      vy[i] += Math.sin(a) * speed - 0.5;
    }

    // how: 'intro' bursts every seed from one spot, 'scatter' blows the picture apart, 'flow' glides particles to the
    // next picture, 'place' moves them without a show (resizes), 'snap' puts them there instantly (reduced motion).
    function buildShape(a, index, how) {
      const grid = a.grids[index];
      if (!grid) return;
      a.current = index;
      const prevCount = shapeCount;
      shapeCount = grid.count;
      invert = !isDark() && Boolean(a.shapes[index].invertOnLight);
      ensurePool(maxCount + dustCount);
      const cx = a.x + a.size / 2;
      const cy = a.y + a.size / 2;
      const quiet = how === 'place' || how === 'snap';
      const fromTop = a.shapes[index].build !== 'up';
      const scatter = how === 'intro' ? TIMING.introScatter : TIMING.scatter;

      for (let i = 0; i < N; i++) {
        const was = mode[i];
        if (i < shapeCount) {
          mode[i] = 2;
          gx[i] = grid.cx[i];
          gy[i] = grid.cy[i];
          val[i] = grid.v[i];
          const tx = a.x + (gx[i] + 0.5) * a.cs;
          const ty = a.y + (gy[i] + 0.5) * a.cs;
          if (was !== 2 && how !== 'intro' && alpha[i] < 0.05 && prevCount) {
            // A parked particle joins from inside the crowd rather than popping in from nowhere
            const j = Math.floor(Math.random() * Math.min(prevCount, i || 1));
            px[i] = px[j] + (Math.random() - 0.5) * 8;
            py[i] = py[j] + (Math.random() - 0.5) * 8;
          }
          alpha[i] = 1;
          if (how === 'snap') {
            px[i] = tx;
            py[i] = ty;
            vx[i] = vy[i] = wait[i] = 0;
            continue;
          }
          if (how === 'place') {
            wait[i] = 0;
            continue;
          }
          const sweep = gy[i] / grid.size;
          const order = fromTop ? sweep : 1 - sweep;
          if (how === 'flow') {
            wait[i] = order * TIMING.flowStagger + Math.random() * TIMING.flowJitter;
            continue;
          }
          wait[i] = scatter + order * TIMING.build + Math.random() * TIMING.jitter;
          if (how === 'intro') {
            const ang = Math.random() * Math.PI * 2;
            const r = Math.random() * 10;
            const s = 5 + Math.random() * 19;
            px[i] = cx + Math.cos(ang) * r;
            py[i] = cy + Math.sin(ang) * r;
            vx[i] = Math.cos(ang) * s;
            vy[i] = Math.sin(ang) * s;
          } else if (was === 2) {
            burst(i, cx, cy, 2 + Math.random() * 7);
          }
        } else {
          mode[i] = i < shapeCount + dustCount ? 1 : 0;
          if (how === 'intro') {
            px[i] = Math.random() * W;
            py[i] = Math.random() * H;
            alpha[i] = 0;
          } else if (was === 2) {
            alpha[i] = how === 'snap' ? 0 : 1;
            if (how === 'scatter') burst(i, cx, cy, 2 + Math.random() * 6);
          }
        }
      }

      // The scan starts once the picture has landed (see frame), so slow devices never label an unfinished picture
      builtAt = performance.now();
      scanPending = !quiet;
      scanAt = quiet ? builtAt - a.scanMs : Infinity;
      updateHud(a);
    }

    function updateHud(a) {
      const h = hud[a.key];
      const shape = a.shapes[a.current];
      h.file.textContent = shape.file;
      h.pts.textContent = (a.grids[a.current] ? a.grids[a.current].count : 0).toLocaleString('en-US');
      if (h.buttons) h.buttons.forEach((b, s) => b.setAttribute('aria-pressed', String(s === a.current)));
      if (h.chapter) h.chapter.textContent = `${String(a.current + 1).padStart(2, '0')} / ${shape.chapter}`;
      if (h.segments) h.segments.forEach((seg, s) => seg.classList.toggle('on', s <= a.current));
    }

    function nextHeroShape() {
      let next = hero.current;
      do next = (next + 1) % hero.shapes.length;
      while (!hero.grids[next] && next !== hero.current);
      buildShape(hero, next, motion ? 'scatter' : 'snap');
      if (!motion) still();
    }

    /* ---------- simulation ---------- */

    function update(dt, now) {
      const a = active;
      const kHome = 0.06 * dt;
      const dHome = Math.pow(0.78, dt);
      const dFree = Math.pow(0.955, dt);
      const dDust = Math.pow(0.97, dt);
      const vmax = 26 * dt; // long flows between stages stream instead of teleporting
      const R = pointer.radius;
      const R2 = R * R;
      const t = now * 0.00012;
      landed = 0;
      for (let i = 0; i < N; i++) {
        const m = mode[i];
        if (m === 0 && alpha[i] < 0.01) continue;
        if (m === 2 && wait[i] <= 0) {
          const dx = a.x + (gx[i] + 0.5) * a.cs - px[i];
          const dy = a.y + (gy[i] + 0.5) * a.cs - py[i];
          if (Math.abs(dx) + Math.abs(dy) < a.cs) landed++;
          vx[i] = (vx[i] + dx * kHome) * dHome;
          vy[i] = (vy[i] + dy * kHome) * dHome;
          const sp = Math.abs(vx[i]) + Math.abs(vy[i]);
          if (sp > vmax) {
            vx[i] *= vmax / sp;
            vy[i] *= vmax / sp;
          }
        } else {
          // Drift on a slow flow field, like seeds in the wind
          const ang = Math.sin(px[i] * 0.0042 + t) * 2.1 + Math.cos(py[i] * 0.0037 - t * 1.3) * 2.1;
          const f = m === 2 ? 0.09 : 0.025;
          const d = m === 2 ? dFree : dDust;
          vx[i] = (vx[i] + (Math.cos(ang) * f + 0.006) * dt) * d;
          vy[i] = (vy[i] + (Math.sin(ang) * f - 0.004) * dt) * d;
          if (m === 2) wait[i] -= dt;
        }
        if (pointer.active) {
          const ex = px[i] - pointer.x;
          const ey = py[i] - pointer.y;
          const d2 = ex * ex + ey * ey;
          if (d2 < R2 && d2 > 0.01) {
            const d = Math.sqrt(d2);
            const f = (1 - d / R) * 1.4 * dt;
            vx[i] += (ex / d) * f;
            vy[i] += (ey / d) * f;
          }
        }
        px[i] += vx[i] * dt;
        py[i] += vy[i] * dt;
        if (m !== 2) {
          // Dust wraps around the screen; parked particles fade out
          if (px[i] < -10) px[i] = W + 10;
          else if (px[i] > W + 10) px[i] = -10;
          if (py[i] < -10) py[i] = H + 10;
          else if (py[i] > H + 10) py[i] = -10;
          alpha[i] += ((m === 1 ? 1 : 0) - alpha[i]) * Math.min(1, 0.04 * dt);
        } else if (flick[i] > 0) {
          flick[i] -= dt;
        } else if (Math.random() < 0.0008 * dt) {
          flick[i] = 4 + Math.random() * 10; // a cell briefly re-decodes, like a noisy feed
        }
      }
    }

    function shock(x, y) {
      rings.push({ x, y, t0: performance.now() });
      const R = 190;
      for (let i = 0; i < N; i++) {
        if (mode[i] === 0) continue;
        const ex = px[i] - x;
        const ey = py[i] - y;
        const d2 = ex * ex + ey * ey;
        if (d2 >= R * R || d2 < 0.01) continue;
        const d = Math.sqrt(d2);
        const f = (1 - d / R) * 10;
        vx[i] += (ex / d) * f;
        vy[i] += (ey / d) * f;
      }
    }

    /* ---------- drawing ---------- */

    function boxRect(a, grid, b) {
      const c = grid.content;
      return {
        x: a.x + (c.x + b.x * c.w) * a.cs,
        y: a.y + (c.y + b.y * c.h) * a.cs,
        w: b.w * c.w * a.cs,
        h: b.h * c.h * a.cs,
      };
    }

    function brackets(x, y, w, h, len) {
      ctx.beginPath();
      ctx.moveTo(x, y + len);
      ctx.lineTo(x, y);
      ctx.lineTo(x + len, y);
      ctx.moveTo(x + w - len, y);
      ctx.lineTo(x + w, y);
      ctx.lineTo(x + w, y + len);
      ctx.moveTo(x + w, y + h - len);
      ctx.lineTo(x + w, y + h);
      ctx.lineTo(x + w - len, y + h);
      ctx.moveTo(x + len, y + h);
      ctx.lineTo(x, y + h);
      ctx.lineTo(x, y + h - len);
      ctx.stroke();
    }

    function tag(text, x, y, bg, ink, below) {
      const pad = 5;
      const h = Math.round(labelPx + 8);
      const w = Math.ceil(ctx.measureText(text).width) + pad * 2;
      const top = below ? y : y - h;
      ctx.fillStyle = bg;
      ctx.fillRect(x, top, w, h);
      ctx.fillStyle = ink;
      ctx.fillText(text, x + pad, top + h / 2 + 0.5);
    }

    function drawBoxes(now, grid, pal) {
      const a = active;
      ctx.font = `600 ${labelPx}px "IBM Plex Mono", ui-monospace, monospace`;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      grid.boxes.forEach((b, k) => {
        if (b.hoverOnly) return;
        const r = boxRect(a, grid, b);
        // A box appears when the scan line reaches its top edge
        const appear = scanAt + a.scanMs * clamp((r.y - a.y) / a.size, 0, 1);
        const t = motion ? clamp((now - appear) / 450, 0, 1) : 1;
        if (t <= 0) return;
        const e = 1 - Math.pow(1 - t, 3);
        const jx = motion ? Math.sin(now * 0.0021 + k * 1.7) * 0.7 : 0;
        const jy = motion ? Math.cos(now * 0.0017 + k) * 0.7 : 0;
        const x = Math.round(r.x + jx) + 0.5;
        const y = Math.round(r.y + jy) + 0.5;
        const w = Math.round(r.w);
        const h = Math.round(Math.min(r.h, a.y + a.size - r.y));
        const color = b.primary ? pal.primary : pal.box;
        ctx.strokeStyle = color;
        ctx.globalAlpha = 0.45 * e;
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, w, h);
        ctx.globalAlpha = e;
        ctx.lineWidth = 2;
        brackets(x, y, w, h, Math.min(w, h, 70) * 0.26 * e + 3);
        let text = b.label.toUpperCase();
        if (b.conf != null) {
          const settle = motion ? clamp((now - appear) / 700, 0, 1) : 1;
          const wobble = motion ? Math.sin(now * 0.003 + k * 2.3) * 0.006 : 0;
          text += ` ${clamp(b.conf * settle + wobble * settle, 0, 0.99).toFixed(2)}`;
        }
        const inside = r.y - labelPx - 8 < a.y - 2; // no room above: tuck the label inside
        tag(text, x - 0.5, inside ? y : y - 0.5, color, b.primary ? pal.primaryInk : pal.boxInk, inside);
      });
      ctx.globalAlpha = 1;
    }

    function regionAt(grid, x, y) {
      const a = active;
      const c = grid.content;
      const u = ((x - a.x) / a.cs - c.x) / c.w;
      const v = ((y - a.y) / a.cs - c.y) / c.h;
      let best = null;
      for (const b of grid.boxes) {
        if (u < b.x || v < b.y || u > b.x + b.w || v > b.y + b.h) continue;
        if (!best || b.w * b.h < best.w * best.h) best = b;
      }
      return best ? best.label : 'bg';
    }

    function drawReticle(grid, pal) {
      pointer.rx += (pointer.x - pointer.rx) * 0.35;
      pointer.ry += (pointer.y - pointer.ry) * 0.35;
      const s = 34;
      const x = Math.round(pointer.rx - s / 2) + 0.5;
      const y = Math.round(pointer.ry - s / 2) + 0.5;
      ctx.strokeStyle = pal.primary;
      ctx.lineWidth = 1.5;
      brackets(x, y, s, s, 8);
      ctx.beginPath();
      ctx.moveTo(pointer.rx - 4, pointer.ry);
      ctx.lineTo(pointer.rx + 4, pointer.ry);
      ctx.moveTo(pointer.rx, pointer.ry - 4);
      ctx.lineTo(pointer.rx, pointer.ry + 4);
      ctx.stroke();
      const col = Math.floor((pointer.rx - active.x) / active.cs);
      const row = Math.floor((pointer.ry - active.y) / active.cs);
      ctx.font = `600 ${labelPx}px "IBM Plex Mono", ui-monospace, monospace`;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      tag(`${regionAt(grid, pointer.rx, pointer.ry).toUpperCase()} · ${col},${row}`, x + s + 4, y + s, pal.primary, pal.primaryInk, false);
    }

    function draw(now) {
      const a = active;
      const pal = PALETTE[isDark() ? 'dark' : 'light'];
      const grid = a.grids[a.current];
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      if (motion) {
        for (let i = 0; i < N; i++) {
          if (mode[i] === 2 || alpha[i] < 0.02) continue;
          ctx.globalAlpha = alpha[i];
          ctx.fillStyle = pal.dust[i % 3];
          const s = i % 7 === 0 ? 2 : 1.25;
          ctx.fillRect(px[i], py[i], s, s);
        }
        ctx.globalAlpha = 1;
      }

      const cs = a.cs;
      const scanning = motion && now >= scanAt && now < scanAt + a.scanMs;
      const scanY = scanning ? a.y + ((now - scanAt) / a.scanMs) * a.size : -1e9;
      const near = pointer.active ? pointer.radius * pointer.radius * 0.8 : -1;
      const top = STEPS - 1;
      for (let i = 0; i < N; i++) {
        if (mode[i] !== 2) continue;
        const y = py[i];
        if (y < -cs || y > H + cs) continue;
        const tx = a.x + (gx[i] + 0.5) * cs;
        const ty = a.y + (gy[i] + 0.5) * cs;
        const settled = wait[i] <= 0 && Math.abs(tx - px[i]) + Math.abs(ty - y) < cs * 0.5;
        let level = Math.round((invert ? 1 - val[i] : val[i]) * top);
        if (near > 0) {
          const ex = px[i] - pointer.x;
          const ey = y - pointer.y;
          if (ex * ex + ey * ey < near) level += 3;
        }
        if (Math.abs(ty - scanY) < cs * 2) level += 4;
        if (level > top) level = top;
        // Moving cells cycle through random glyphs and lock in when they land
        const glyph = settled && flick[i] <= 0 ? level : (Math.imul(i + 1, 2654435761) ^ Math.imul((tick >> 2) + i, 40503)) >>> 0;
        const size = settled ? cs : cs * 0.82;
        ctx.drawImage(atlas, (glyph % STEPS) * cpx, ((settled ? 0 : STEPS) + level) * cpx, cpx, cpx, px[i] - size / 2, y - size / 2, size, size);
      }

      if (scanning) {
        const band = ctx.createLinearGradient(0, scanY - 70, 0, scanY);
        band.addColorStop(0, `rgba(${pal.scan}, 0)`);
        band.addColorStop(1, `rgba(${pal.scan}, 0.16)`);
        ctx.fillStyle = band;
        ctx.fillRect(a.x, scanY - 70, a.size, 70);
        ctx.fillStyle = `rgba(${pal.scan}, 0.9)`;
        ctx.fillRect(a.x, scanY, a.size, 1);
      }

      if (grid && now >= scanAt) drawBoxes(now, grid, pal);
      if (grid && motion && pointer.inStage) drawReticle(grid, pal);

      for (let k = rings.length - 1; k >= 0; k--) {
        const ring = rings[k];
        const t = (now - ring.t0) / 700;
        if (t >= 1) {
          rings.splice(k, 1);
          continue;
        }
        ctx.globalAlpha = (1 - t) * 0.6;
        ctx.strokeStyle = pal.primary;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(ring.x, ring.y, 12 + (1 - Math.pow(1 - t, 3)) * 140, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    // Reduced motion: no animation, but the picture still follows the page and switches chapters as you scroll
    let stillQueued = false;
    function still() {
      stillQueued = false;
      if (!ready) return;
      measureAnchors();
      choose();
      for (let i = 0; i < N; i++) {
        if (mode[i] === 2) {
          px[i] = active.x + (gx[i] + 0.5) * active.cs;
          py[i] = active.y + (gy[i] + 0.5) * active.cs;
          wait[i] = 0;
        }
      }
      draw(performance.now());
    }

    /* ---------- loop ---------- */

    const running = () => motion && visible && !document.hidden;

    function frame(now) {
      raf = 0;
      const delta = last ? now - last : 16.7;
      last = now;
      const dt = Math.min(delta, 50) / 16.667;
      tick++;
      fps += (1000 / Math.max(delta, 1) - fps) * 0.08;
      measureAnchors();
      follow();
      choose();
      update(dt, now);
      if (scanPending && (landed >= shapeCount * 0.9 || now - builtAt > 7000)) {
        scanPending = false;
        scanAt = now + 200;
      }
      draw(now);
      if (now - hudAt > 500) {
        hudAt = now;
        hud[active.key].fps.textContent = String(Math.round(Math.min(fps, 240)));
      }
      if (active === hero) {
        // The current bar fills up while the picture holds, then autoplay moves on
        const fill = !autoplay ? 1 : Number.isFinite(scanAt) ? clamp((now - scanAt - hero.scanMs) / TIMING.holdMs, 0, 1) : 0;
        if (Math.abs(fill - fillShown) > 0.004 || (fill !== fillShown && (fill === 0 || fill === 1))) {
          fillShown = fill;
          hud.hero.buttons[hero.current].style.setProperty('--fill', fill.toFixed(3));
        }
      }
      if (autoplay && active === hero && !pointer.inStage && now > scanAt + hero.scanMs + TIMING.holdMs) nextHeroShape();
      if (running()) raf = requestAnimationFrame(frame);
      else ctx.clearRect(0, 0, W, H);
    }

    function start() {
      if (raf || !running() || !ready) return;
      last = 0;
      raf = requestAnimationFrame(frame);
    }

    /* ---------- input ---------- */

    const inside = (a, x, y) => x >= a.x && y >= a.y && x <= a.x + a.size && y <= a.y + a.size;
    const overField = (target) => Boolean(target && target.closest && target.closest('#hero, #story'));

    function trackPointer(e) {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      pointer.active = motion && overField(e.target);
      pointer.inStage = pointer.active && inside(active, pointer.x, pointer.y);
      if (!pointer.seen) {
        pointer.rx = pointer.x;
        pointer.ry = pointer.y;
        pointer.seen = true;
      }
    }

    function releasePointer() {
      pointer.active = false;
      pointer.inStage = false;
      pointer.seen = false;
    }

    addEventListener('pointermove', trackPointer, { passive: true });
    document.documentElement.addEventListener('pointerleave', releasePointer);
    addEventListener('blur', releasePointer);
    addEventListener('pointerup', (e) => {
      if (e.pointerType !== 'mouse') releasePointer();
    });
    addEventListener('pointerdown', (e) => {
      // Ripples only on empty space, so selecting text or pressing a control never sets one off
      if (!motion || !overField(e.target) || e.target.closest('a, button, h1, h2, h3, p, li')) return;
      trackPointer(e);
      if (!pointer.inStage) shock(pointer.x, pointer.y);
    });
    heroStage.addEventListener('click', (e) => {
      if (e.target.closest('button') || !ready || active !== hero) return;
      autoplay = false;
      nextHeroShape();
    });
    storyStage.addEventListener('click', () => {
      if (!ready || active !== story || !motion) return;
      buildShape(story, story.current, 'scatter');
    });
    hud.hero.buttons.forEach((button, s) => {
      button.addEventListener('click', () => {
        autoplay = false;
        if (s === hero.current || active !== hero) return;
        buildShape(hero, s, motion ? 'scatter' : 'snap');
        if (!motion) still();
      });
    });

    addEventListener('resize', () => {
      measureCanvas();
      if (!motion) still();
    });
    addEventListener('scroll', () => {
      if (motion || stillQueued) return;
      stillQueued = true;
      requestAnimationFrame(still);
    }, { passive: true });

    const shown = new Set();
    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) shown.add(entry.target);
        else shown.delete(entry.target);
      }
      visible = shown.size > 0;
      start();
    });
    anchors.forEach((a) => io.observe(a.section));
    document.addEventListener('visibilitychange', start);

    document.addEventListener('themechange', () => {
      if (!ready) return;
      invert = !isDark() && Boolean(active.shapes[active.current].invertOnLight);
      buildAtlas();
      if (!motion) still();
    });

    motionQuery.addEventListener('change', () => {
      motion = !motionQuery.matches;
      releasePointer();
      if (!ready) return;
      if (motion) {
        buildShape(active, active.current, 'scatter');
        start();
      } else {
        buildShape(active, active.current, 'snap');
        still();
      }
    });

    /* ---------- boot ---------- */

    (async () => {
      measureCanvas();
      measureAnchors();
      const font = document.fonts ? Promise.race([document.fonts.load('600 12px "IBM Plex Mono"'), new Promise((r) => setTimeout(r, 1500))]).catch(() => {}) : null;
      hero.sources = await Promise.all(HERO_SHAPES.map((s) => loadImage(s.src)));
      story.sources = SCENES.map((s) => paintScene(s.draw));
      await font;
      hero.size = story.size = 0; // force a fresh measure now that fonts and layout have settled
      measureAnchors();
      anchors.forEach(sampleAnchor);
      ready = true;
      buildAtlas();
      active = story.y < H * 0.7 ? story : hero;
      active.lastX = active.x;
      active.lastY = active.y;
      if (active === story) {
        story.current = stepAt();
        markStep(story.current);
      }
      buildShape(active, active.current, motion ? 'intro' : 'snap');
      if (motion) start();
      else still();
      // Rebuild glyphs once the web font has really arrived
      if (document.fonts) {
        document.fonts.ready.then(() => {
          buildAtlas();
          if (!motion) still();
        });
      }
    })();
  }

  /* ------------------------------------------------------------------ start */

  initTheme();
  initChrome();
  initRotator();
  initField();
  initNotes();
})();
