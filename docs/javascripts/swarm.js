/* Multiplayer cursors that move pieces of a page around: the landing page's contact card (assets/landing/landing.js) and the About page's tool table (site.js). A nod to Joel Califa's Swarm and Dhvanil Patel's Swarm Rebuild, written from scratch. Styles live in stylesheets/swarm.css. */
window.agSwarm = (() => {
  'use strict';

  // Cursor shapes and their hot spots: the pointer clicks at its tip, the resize arrows at their centre
  const EW = '<path d="M1 9 5.5 4.5V7.5h7V4.5L17 9l-4.5 4.5V10.5h-7v3Z"/>';
  const SHAPES = {
    arrow: ['<path d="M2 2 15.5 8 9.6 9.6 7 15.5Z"/>', 2],
    ew: [EW, 9],
    nwse: [`<g transform="rotate(45 9 9)">${EW}</g>`, 9],
  };
  const ARROW = `<svg viewBox="0 0 18 18" aria-hidden="true">${SHAPES.arrow[0]}</svg>`;
  const ease = (p) => (p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2);
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

  // A cursor-free layer over a positioned host; cursors fade in once it gets .is-on
  function layer(host) {
    const node = document.createElement('div');
    node.className = 'swarm';
    node.setAttribute('aria-hidden', 'true');
    host.append(node);
    return node;
  }

  // One cursor per [name, colour], each with its own snap guide ('y' runs down, 'x' runs across)
  function crew(into, specs, guide) {
    return specs.map(([name, color], i) => {
      const node = document.createElement('span');
      node.className = 'swarm-cursor';
      node.style.setProperty('--c', color);
      node.innerHTML = ARROW;
      const tag = document.createElement('b');
      tag.textContent = name;
      node.append(tag);
      const line = document.createElement('i');
      line.className = `swarm-guide swarm-guide--${guide || 'y'}`;
      line.style.setProperty('--c', color);
      into.append(line, node);
      return { node, guide: line, color, i, x: 0, y: 0, hot: 2, tween: null, gone: false };
    });
  }

  const place = (b) => (b.node.style.transform = `translate3d(${b.x - b.hot}px, ${b.y - b.hot}px, 0)`);

  // Swap a cursor between the pointer ('arrow') and the resize arrows ('ew' across, 'nwse' diagonal), keeping its hot spot where it was
  function shape(b, name) {
    const [paths, hot] = SHAPES[name] || SHAPES.arrow;
    b.node.querySelector('svg').innerHTML = paths;
    b.node.style.setProperty('--hot', `${hot}px`);
    b.hot = hot;
    place(b);
  }

  // A small live readout (a width, a font size) that rides along beside a cursor in its colour
  function readout(b, text) {
    if (!b.readout) {
      b.readout = document.createElement('span');
      b.readout.className = 'swarm-readout';
      b.node.append(b.readout);
    }
    b.readout.textContent = text;
    b.readout.hidden = !text;
  }

  // Cursors move like hands do: eased, on a slight curve (straight while carrying something, which `step` follows), starting no earlier than `at`
  function go(b, to, at, dur, then, step) {
    const from = { x: b.x, y: b.y }, dx = to.x - from.x, dy = to.y - from.y, dist = Math.hypot(dx, dy) || 1;
    const arc = step ? 0 : Math.min(40, dist * 0.15) * (b.i % 2 ? 1 : -1);
    b.tween = { from, to, at, dur, then, step, nx: (-dy / dist) * arc, ny: (dx / dist) * arc };
  }

  // Advance every cursor's tween each frame, then call tick(now). Time-based, so a slow or background tab catches up instead of drifting. Stops once every cursor has left; the returned function stops it early.
  function run(bots, tick) {
    let raf = 0;
    const frame = (now) => {
      raf = requestAnimationFrame(frame);
      for (const b of bots) {
        const tw = b.tween;
        if (!tw) continue;
        const p = clamp((now - tw.at) / tw.dur, 0, 1), e = ease(p), bend = Math.sin(Math.PI * p);
        b.x = tw.from.x + (tw.to.x - tw.from.x) * e + tw.nx * bend;
        b.y = tw.from.y + (tw.to.y - tw.from.y) * e + tw.ny * bend;
        if (tw.step) tw.step(e);
        if (p === 1) {
          b.tween = null;
          if (tw.then) tw.then(now);
        }
      }
      bots.forEach((b) => b.gone || place(b));
      if (tick) tick(now);
      if (bots.every((b) => b.gone)) cancelAnimationFrame(raf);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }

  // Off to x (past the host's edge), fading on the way
  function leave(b, now, x) {
    go(b, { x, y: b.y + 30 }, now, 700, () => dismiss([b]));
    setTimeout(() => b.node.classList.add('is-gone'), Math.max(0, now - performance.now()) + 150);
  }

  function dismiss(bots) {
    bots.forEach((b) => {
      b.gone = true;
      b.tween = null;
      b.node.remove();
      b.guide.remove();
    });
  }

  // Pick a piece up: it rotates about the grab point, so that point stays under the cursor tip all the way home
  function hold(node, grab, color) {
    node.style.transition = 'none';
    node.style.transformOrigin = `${grab.x}px ${grab.y}px`;
    if (color) {
      node.classList.add('swarm-picked');
      node.style.setProperty('--pick', color);
    }
  }
  const pose = (node, d, k) => (node.style.transform = `translate(${d.x * k}px, ${d.y * k}px) rotate(${d.r * k}deg)`);
  function settle(node) {
    node.classList.remove('swarm-picked');
    node.style.transform = node.style.transition = node.style.transformOrigin = '';
  }

  // Where `node` sits inside `host`'s padding box, ignoring any transform it has right now
  function rel(host, node) {
    const keep = node.style.transform;
    node.style.transform = 'none';
    const h = host.getBoundingClientRect(), r = node.getBoundingClientRect();
    node.style.transform = keep;
    return { x: r.left - h.left - host.clientLeft, y: r.top - h.top - host.clientTop, w: r.width, h: r.height };
  }

  return { layer, crew, place, shape, readout, go, run, leave, dismiss, hold, pose, settle, rel, ease, clamp };
})();
