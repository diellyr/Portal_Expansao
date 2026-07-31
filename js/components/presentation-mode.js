import { el, refreshIcons } from "../utils/dom-utils.js";

/**
 * Modo Apresentação -- a full-page presentation toggle for pages that
 * already show only aggregated data (Dashboard, Cobertura Regional,
 * Comparador de Cidades). Hides the sidebar/topbar so charts and metrics
 * take over the screen, requests Fullscreen when the browser supports it
 * (fails silently otherwise -- e.g. iframes or a user gesture requirement
 * not met), and always leaves a visible exit button plus Escape/
 * fullscreenchange handling so the user is never stuck in the mode.
 *
 * Never wire this into a page that lists individual youth records (Jovens,
 * Qualidade dos Cadastros, Gerador de Listas) -- it does not redact
 * anything on the page, it only changes layout.
 */
export function createPresentationModeToggle() {
  // CSS shows/hides this based on the body.presentation-mode class alone, so
  // there is exactly one element even if this is called again on the same page.
  let exitBtn = document.getElementById("presentation-exit-btn");
  if (!exitBtn) {
    exitBtn = el(
      "button",
      { type: "button", class: "presentation-exit-btn", id: "presentation-exit-btn", "aria-label": "Sair do modo apresentação" },
      [el("i", { "data-lucide": "x", class: "icon icon-sm" }), el("span", {}, "Sair da apresentação")]
    );
    document.body.appendChild(exitBtn);
    exitBtn.addEventListener("click", exit);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && document.body.classList.contains("presentation-mode")) exit();
    });
    document.addEventListener("fullscreenchange", () => {
      if (!document.fullscreenElement && document.body.classList.contains("presentation-mode")) exit();
    });
  }

  function enter() {
    document.body.classList.add("presentation-mode");
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  }

  function exit() {
    document.body.classList.remove("presentation-mode");
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  }

  const btn = el("button", { type: "button", class: "btn btn-secondary", id: "presentation-mode-btn", onClick: enter }, [
    el("i", { "data-lucide": "presentation", class: "icon icon-sm" }),
    el("span", {}, " Modo Apresentação"),
  ]);
  refreshIcons();
  return btn;
}
