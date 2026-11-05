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
