import { el, refreshIcons } from "../utils/dom-utils.js";

let overlayEl = null;

function ensureOverlay() {
  if (!overlayEl) {
    overlayEl = el("div", { class: "modal-overlay", id: "modal-overlay", hidden: true });
    document.body.appendChild(overlayEl);
  }
  return overlayEl;
}

/**
 * Opens a modal. `body` can be an HTMLElement or an HTML string.
 * `actions` is an array of { label, className, onClick, closeOnClick=true }.
 * Returns a handle with .close().
 */
export function openModal({ title, body, actions = [], size = "" }) {
  const overlay = ensureOverlay();
  overlay.innerHTML = "";
  overlay.hidden = false;

  const bodyEl = el("div", { class: "modal-body" });
  if (typeof body === "string") bodyEl.innerHTML = body;
  else if (body instanceof Node) bodyEl.appendChild(body);

  const footer = el(
    "div",
    { class: "modal-footer" },
    actions.map((action) =>
      el(
        "button",
        {
          class: action.className || "btn btn-secondary",
          type: "button",
          onClick: () => {
            action.onClick?.();
            if (action.closeOnClick !== false) close();
          },
        },
        action.label
      )
    )
  );

  const modal = el("div", { class: `modal ${size}`.trim(), role: "dialog", "aria-modal": "true", "aria-label": title }, [
    el("div", { class: "modal-header" }, [
      el("h2", { class: "modal-title" }, title),
      el("button", { class: "btn btn-ghost btn-icon", "aria-label": "Fechar", type: "button", onClick: () => close() }, [
        el("i", { "data-lucide": "x", class: "icon" }),
      ]),
    ]),
    bodyEl,
    footer,
  ]);

  overlay.appendChild(modal);
  refreshIcons();

  function onOverlayClick(e) {
    if (e.target === overlay) close();
  }
  function onKeydown(e) {
    if (e.key === "Escape") close();
  }
  overlay.addEventListener("click", onOverlayClick);
  document.addEventListener("keydown", onKeydown);

  function close() {
    overlay.hidden = true;
    overlay.innerHTML = "";
    overlay.removeEventListener("click", onOverlayClick);
    document.removeEventListener("keydown", onKeydown);
  }

  return { close, modalEl: modal, bodyEl };
}

export function confirmModal({ title, message, confirmLabel = "Confirmar", danger = false }) {
  return new Promise((resolve) => {
    openModal({
      title,
      body: `<p>${message}</p>`,
      actions: [
        { label: "Cancelar", className: "btn btn-secondary", onClick: () => resolve(false) },
        {
          label: confirmLabel,
          className: danger ? "btn btn-danger" : "btn btn-primary",
          onClick: () => resolve(true),
        },
      ],
    });
  });
}
