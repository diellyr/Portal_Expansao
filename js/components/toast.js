import { el, refreshIcons } from "../utils/dom-utils.js";

const ICONS = {
  success: "check-circle-2",
  error: "x-circle",
  warning: "alert-triangle",
  info: "info",
};

function ensureContainer() {
  let container = document.getElementById("toast-container");
  if (!container) {
    container = el("div", { id: "toast-container", class: "toast-container", "aria-live": "polite", role: "status" });
    document.body.appendChild(container);
  }
  return container;
}

export function showToast(message, type = "info", duration = 4000) {
  const container = ensureContainer();
  const toast = el("div", { class: `toast toast-${type}` }, [
    el("i", { "data-lucide": ICONS[type] || ICONS.info, class: "icon icon-sm" }),
    el("span", {}, message),
  ]);
  container.appendChild(toast);
  refreshIcons();
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transition = "opacity 200ms ease";
    setTimeout(() => toast.remove(), 220);
  }, duration);
}

export const toast = {
  success: (msg) => showToast(msg, "success"),
  error: (msg) => showToast(msg, "error"),
  warning: (msg) => showToast(msg, "warning"),
  info: (msg) => showToast(msg, "info"),
};
