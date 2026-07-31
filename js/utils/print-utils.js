const PRINT_AREA_ID = "app-print-area";

function ensurePrintArea() {
  let area = document.getElementById(PRINT_AREA_ID);
  if (!area) {
    area = document.createElement("div");
    area.id = PRINT_AREA_ID;
    document.body.appendChild(area);
  }
  return area;
}

/**
 * Prints a detached DOM node cleanly, regardless of where it came from
 * (including content built for a modal, which is normally scroll-limited
 * and fixed-position and doesn't print well as-is). Moves the node into a
 * dedicated print-only area and hides everything else on the page for the
 * duration of the print, via the "app-printing" class handled in CSS.
 */
export function printNode(node) {
  const area = ensurePrintArea();
  area.innerHTML = "";
  area.appendChild(node);
  document.body.classList.add("app-printing");
  window.requestAnimationFrame(() => window.print());
}

window.addEventListener("afterprint", () => {
  document.body.classList.remove("app-printing");
  const area = document.getElementById(PRINT_AREA_ID);
  if (area) area.innerHTML = "";
});
