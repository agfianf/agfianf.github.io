// Small additions to Material's own scripts.

// Mermaid diagrams: Material renders each one into a closed shadow root on a div.mermaid, sized to the column, so a wide diagram on a phone shrinks until its labels are unreadable. Each rendered diagram gets a scroll wrapper, and blog.css gives the diagram a minimum width inside it on small screens.
(function () {
  function wrap(diagram) {
    if (diagram.parentElement && diagram.parentElement.classList.contains("ag-mermaid")) return;
    var scroller = document.createElement("div");
    scroller.className = "ag-mermaid";
    scroller.tabIndex = 0;
    scroller.setAttribute("role", "region");
    scroller.setAttribute("aria-label", "Diagram, scrolls sideways");
    diagram.replaceWith(scroller);
    scroller.appendChild(diagram);
  }

  // Material swaps the source <pre> for the rendered div once the mermaid library has loaded, on the first page and after every instant navigation, so watch for those divs being added
  new MutationObserver(function (records) {
    records.forEach(function (record) {
      record.addedNodes.forEach(function (node) {
        if (node.nodeType !== 1) return;
        if (node.matches("div.mermaid")) wrap(node);
        else node.querySelectorAll("div.mermaid").forEach(wrap);
      });
    });
  }).observe(document.body, { childList: true, subtree: true });

  document.querySelectorAll("div.mermaid").forEach(wrap);
})();

// Code annotations: Material places the popup from the marker's position inside the <pre>, assuming the <pre> is what the popup is positioned against. In titled blocks extra.css makes the <pre> static so the copy buttons can sit in the file name bar, and the popup then lands off by the bar's height and the line-number column's width. Before a popup opens, measure how far the <pre> sits from the popup's real containing block and hand that to extra.css as --ag-annotation-dx/dy.
(function () {
  function correct(event) {
    var annotation = event.target.closest && event.target.closest(".md-annotation");
    if (!annotation) return;
    // Material only builds the popup on first open, so read the containing block off the marker: it is positioned and shares the popup's nearest positioned ancestor
    var index = annotation.querySelector(".md-annotation__index");
    var pre = annotation.closest("pre");
    var box = index && index.offsetParent;
    if (!pre || !box) return;
    var dx = 0;
    var dy = 0;
    if (box !== pre) {
      var a = pre.getBoundingClientRect();
      var b = box.getBoundingClientRect();
      dx = a.left + pre.clientLeft - (b.left + box.clientLeft);
      dy = a.top + pre.clientTop - (b.top + box.clientTop);
    }
    annotation.style.setProperty("--ag-annotation-dx", dx + "px");
    annotation.style.setProperty("--ag-annotation-dy", dy + "px");
  }

  // Capture phase, so the offsets are set before Material reacts to the same click or focus
  document.addEventListener("pointerdown", correct, true);
  document.addEventListener("focusin", correct, true);
})();

// About page, "What I work with": six multiplayer cursors (swarm.js), one per area, put the section together. "edge" drags the Area column open from a narrow start and "cv" resizes the heading up to full size; once the column is open, the tool chips, which start as one tight heap in the Tools column, are sorted into their rows. Each cursor clears its own area first, then helps whichever area has the most left; the area a chip is heading for lights up in the carrier's colour, and a guide marks its row. Finally cv boxes the whole table as a detection, and a replay button brings the heap back. Opt in by wrapping a table in <div class="ag-swarm" markdown> (docs/about.md).
(function () {
  var S = window.agSwarm;
  var CREW = [["cv", "var(--ag-accent)"], ["mlops", "var(--md-code-hl-function-color)"], ["backend", "var(--ag-leaf)"], ["devops", "var(--md-code-hl-number-color)"], ["geo", "var(--ag-soil)"], ["edge", "var(--ag-ink-2)"]];
  var TITLE_FROM = 0.5; // the heading starts at half size
  var COLUMN_FROM = 0.55; // and the Area column at a little over half its width
  var HEAP = { x: 0.15, y: 0.2 }; // the heap's radii, as a share of the Tools column
  var DETECTION = "toolbox 0.99";
  var cleanup = null;

  function init() {
    if (cleanup) cleanup();
    cleanup = null;
    var host = document.querySelector(".ag-swarm");
    if (!host) return;
    var table = host.querySelector("table");
    var scroller = table && table.closest(".md-typeset__scrollwrap");
    host.classList.add("is-ready");
    // Nothing to build with reduced motion, and where the table scrolls sideways (narrow phones) it simply shows as it is
    if (!S || !table || !table.tBodies[0] || !table.tHead || !("IntersectionObserver" in window) || matchMedia("(prefers-reduced-motion: reduce)").matches || (scroller && scroller.scrollWidth > scroller.clientWidth + 1)) return;

    var title = host.previousElementSibling && /^H[2-4]$/.test(host.previousElementSibling.tagName) ? host.previousElementSibling : null;
    var column = table.tHead.rows[0].cells[0];
    var rows = Array.prototype.slice.call(table.tBodies[0].rows).map(function (row) {
      return { label: row.cells[0], tools: row.cells[row.cells.length - 1], heading: 0 };
    });
    // Each chip moves as one box with the comma after it, so a line never starts with a comma; the comma stays invisible while sorting
    var chips = [];
    rows.forEach(function (row, r) {
      row.tools.querySelectorAll("code").forEach(function (code) {
        var node = document.createElement("span");
        node.className = "swarm-chip";
        code.before(node);
        node.append(code);
        var after = node.nextSibling;
        if (after && after.nodeType === 3 && after.data.charAt(0) === ",") {
          after.splitText(1);
          node.append(after);
        }
        chips.push({ node: node, row: r });
      });
    });
    if (title) title.classList.add("swarm-title");

    var replay = document.createElement("button");
    replay.type = "button";
    replay.className = "swarm-replay";
    replay.textContent = "↻ replay";
    replay.setAttribute("aria-label", "Replay how this table gets sorted");
    replay.hidden = true;
    host.append(replay);

    var current = null;

    // One build, from the scattered start to the labelled table; `now` skips waiting for the table to scroll into view (replays)
    function play(now) {
      var setColumn = function (w) { column.style.width = w ? w + "px" : ""; };
      var full = column.offsetWidth, narrow = Math.round(full * COLUMN_FROM);

      // A fresh heap every time, measured while the table still has its final layout
      var a = S.rel(host, rows[0].tools), z = S.rel(host, rows[rows.length - 1].tools);
      var area = { x: a.x, y: a.y, w: a.w, h: z.y + z.h - a.y };
      chips.forEach(function (chip) {
        var t = Math.random() * Math.PI * 2, k = Math.sqrt(Math.random());
        chip.g = { x: Math.min(14, chip.node.offsetWidth / 3), y: chip.node.offsetHeight / 2 };
        chip.at = { x: area.x + area.w * (0.5 + Math.cos(t) * k * HEAP.x), y: area.y + area.h * (0.5 + Math.sin(t) * k * HEAP.y), r: (Math.random() - 0.5) * 36 };
      });
      // Point every chip at its spot from wherever its home is right now, so the heap holds still while the table reflows under it
      function aim() {
        chips.forEach(function (chip) {
          chip.home = S.rel(host, chip.node);
          chip.d = { x: chip.at.x - chip.home.w / 2 - chip.home.x, y: chip.at.y - chip.home.h / 2 - chip.home.y, r: chip.at.r };
          S.hold(chip.node, chip.g);
          S.pose(chip.node, chip.d, 1);
        });
      }

      setColumn(narrow);
      if (title) {
        title.style.transformOrigin = "0 0";
        title.style.transform = "scale(" + TITLE_FROM + ")";
      }
      aim();
      host.classList.add("is-sorting");
      replay.hidden = true;

      var layer = S.layer(host);
      var box = document.createElement("div");
      var tag = document.createElement("span");
      box.className = "swarm-box is-tight";
      box.append(tag);
      layer.append(box);
      var bots = S.crew(layer, CREW, "x");
      var cv = bots[0], edge = bots[bots.length - 1];
      // A pool per area, in a random order; a cursor works its own pool, then the biggest one left
      var pools = rows.map(function (row, r) {
        return chips.filter(function (c) { return c.row === r; }).sort(function () { return Math.random() - 0.5; });
      });
      var t0 = 0, left = chips.length, stop = null, done = false, opened = false, io = null;

      function light(row, color, on) {
        row.heading += on ? 1 : -1;
        row.label.style.setProperty("--pick", color);
        row.label.classList.toggle("swarm-target", row.heading > 0);
      }

      function work(b, now) {
        var pool = pools[b.i % pools.length];
        if (!pool || !pool.length) pool = pools.reduce(function (most, p) { return p.length > most.length ? p : most; }, []);
        var chip = pool.pop();
        // Out of chips: cv stays for the finale, the others head out
        if (!chip) return b === cv ? (cv.waiting = true) : S.leave(b, now, -70);
        var row = rows[chip.row];
        var grab = { x: chip.home.x + chip.g.x + chip.d.x, y: chip.home.y + chip.g.y + chip.d.y };
        S.go(b, grab, Math.max(now, t0 + b.i * 90), S.clamp(Math.hypot(grab.x - b.x, grab.y - b.y) * 0.9, 200, 480), function (t) {
          b.node.classList.add("is-down");
          S.hold(chip.node, chip.g, b.color);
          light(row, b.color, true);
          b.guide.style.transform = "translateY(" + (chip.home.y + chip.home.h / 2) + "px)";
          var home = { x: chip.home.x + chip.g.x, y: chip.home.y + chip.g.y };
          S.go(b, home, t + 60, S.clamp(Math.hypot(home.x - grab.x, home.y - grab.y) * 0.9, 300, 480), function (t2) {
            b.node.classList.remove("is-down");
            b.guide.classList.remove("is-on");
            S.settle(chip.node);
            light(row, b.color, false);
            left--;
            work(b, t2 + 40);
          }, function (e) {
            S.pose(chip.node, chip.d, 1 - e);
            b.guide.classList.toggle("is-on", e > 0.4);
          });
        });
      }

      // Press on a handle, drag it with a resize cursor and a live readout, let go, then carry on with `then`
      function resize(b, handle, to, at, dur, step, then) {
        S.go(b, handle, at, S.clamp(Math.hypot(handle.x - b.x, handle.y - b.y) * 0.9, 250, 550), function (t) {
          b.node.classList.add("is-down");
          S.go(b, to, t + 90, dur, function (t2) {
            b.node.classList.remove("is-down");
            S.readout(b, "");
            S.shape(b, "arrow");
            then(t2 + 80);
          }, step);
        });
      }

      // "edge" opens the Area column by its right border; everyone starts sorting once the table has its final layout
      function openColumn(now) {
        var c = S.rel(host, column);
        S.shape(edge, "ew");
        resize(edge, { x: c.x + c.w, y: c.y + c.h / 2 }, { x: c.x + c.w + full - narrow, y: c.y + c.h / 2 }, now, 650, function (e) {
          var w = Math.round(narrow + (full - narrow) * e);
          setColumn(w);
          aim();
          S.readout(edge, w + " px");
        }, function (t) {
          setColumn(0);
          aim();
          opened = true;
          bots.forEach(function (b) { if (b !== cv || cv.titled) work(b, t); });
        });
      }

      // "cv" drags the heading's bottom-right corner out until it is full size
      function growTitle(now) {
        if (!title) return (cv.titled = true);
        var at = S.rel(host, title), text = document.createRange();
        text.selectNodeContents(title.firstChild);
        var r = text.getBoundingClientRect(), w = r.width / TITLE_FROM, h = r.height / TITLE_FROM;
        var px = parseFloat(getComputedStyle(title).fontSize);
        S.hold(title, { x: 0, y: 0 }, cv.color);
        title.style.transform = "scale(" + TITLE_FROM + ")";
        S.shape(cv, "nwse");
        resize(cv, { x: at.x + w * TITLE_FROM, y: at.y + h * TITLE_FROM }, { x: at.x + w, y: at.y + h }, now, 750, function (e) {
          var s = TITLE_FROM + (1 - TITLE_FROM) * e;
          title.style.transform = "scale(" + s + ")";
          S.readout(cv, Math.round(px * s) + " px");
        }, function (t) {
          S.settle(title);
          cv.titled = true;
          if (opened) work(cv, t);
        });
      }

      function mark() {
        var m = S.rel(host, table);
        return { x: m.x - 6, y: m.y - 6, w: m.w + 12, h: m.h + 12 };
      }
      function drawBox(m, w, h, label) {
        box.style.transform = "translate(" + m.x + "px, " + m.y + "px)";
        box.style.width = w + "px";
        box.style.height = h + "px";
        tag.textContent = label;
      }
      function labelled() {
        var m = mark();
        box.classList.add("is-on", "is-done");
        drawBox(m, m.w, m.h, DETECTION);
      }

      // Every chip is home: cv boxes the whole table as one detection, then heads out too
      function finale(now) {
        host.classList.remove("is-sorting");
        var m = mark();
        S.go(cv, { x: m.x, y: m.y }, now + 120, 500, function (t) {
          cv.node.classList.add("is-down");
          box.classList.add("is-on");
          S.go(cv, { x: m.x + m.w, y: m.y + m.h }, t + 90, 800, function (t2) {
            cv.node.classList.remove("is-down");
            labelled();
            S.leave(cv, t2 + 200, -70);
          }, function (e) {
            var w = Math.max(6, m.w * e), h = Math.max(6, m.h * e);
            drawBox(m, w, h, Math.round(w) + " × " + Math.round(h));
          });
        });
      }

      function finish() {
        done = true;
        host.classList.remove("is-sorting");
        // Level with the table's right edge, which can stop short of the page column
        var m = S.rel(host, table);
        replay.style.right = Math.max(0, host.clientWidth - m.x - m.w) + "px";
        replay.hidden = false;
      }

      function start() {
        t0 = performance.now();
        aim();
        // Every cursor starts on its own area's label
        bots.forEach(function (b) {
          var row = S.rel(host, rows[b.i % rows.length].label);
          b.x = row.x + 4;
          b.y = row.y + row.h / 2;
          S.place(b);
        });
        openColumn(t0 + 100);
        growTitle(t0 + 150);
        requestAnimationFrame(function () { layer.classList.add("is-on"); });
        stop = S.run(bots, function (now) {
          if (cv.waiting && left === 0) {
            cv.waiting = false;
            finale(now);
          }
          if (!done && bots.every(function (b) { return b.gone; })) finish();
        });
      }

      // Straight to the finished section: on a width change mid-build, when Material's instant navigation leaves the page, and before a replay
      function snap() {
        if (io) io.disconnect();
        if (stop) stop();
        S.dismiss(bots);
        chips.forEach(function (chip) { S.settle(chip.node); });
        rows.forEach(function (row) {
          row.heading = 0;
          row.label.classList.remove("swarm-target");
        });
        setColumn(0);
        if (title) S.settle(title);
        labelled();
        finish();
      }

      if (now) start();
      else {
        io = new IntersectionObserver(function (entries) {
          if (!entries[0].isIntersecting) return;
          io.disconnect();
          start();
        }, { threshold: 0.35 });
        io.observe(host);
      }

      return { snap: snap, done: function () { return done; }, layer: layer };
    }

    current = play(false);

    replay.addEventListener("click", function () {
      if (!current.done()) return;
      current.layer.remove();
      current = play(true);
    });

    // The box follows the table when the page reflows; a width change mid-build snaps the section together
    var width = host.clientWidth;
    var ro = new ResizeObserver(function () {
      if (host.clientWidth === width) return;
      width = host.clientWidth;
      current.snap();
    });
    ro.observe(host);

    cleanup = function () {
      ro.disconnect();
      if (!current.done()) current.snap();
    };
  }

  // Material swaps the page in place on instant navigation and announces each new page on document$; wait a frame so its own table wrappers are in
  function later() { requestAnimationFrame(init); }
  if (window.document$) window.document$.subscribe(later);
  else later();
})();
