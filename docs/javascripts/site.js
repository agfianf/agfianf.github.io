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
