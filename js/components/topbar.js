import { el, refreshIcons } from "../utils/dom-utils.js";
import { getSession, logout } from "../services/auth-service.js";

export function renderTopbar(container, { title, breadcrumbs = [] } = {}) {
  container.innerHTML = "";

  const left = el("div", { class: "topbar-left" }, [
    el("button", { class: "btn btn-ghost btn-icon mobile-menu-toggle", id: "mobile-menu-toggle", "aria-label": "Abrir menu" }, [
      el("i", { "data-lucide": "menu", class: "icon" }),
    ]),
    el("button", { class: "btn btn-ghost btn-icon", id: "sidebar-collapse-toggle", "aria-label": "Recolher menu" }, [
      el("i", { "data-lucide": "panel-left", class: "icon" }),
    ]),
    el("div", {}, [
      breadcrumbs.length
        ? el(
            "div",
            { class: "breadcrumbs" },
            breadcrumbs.flatMap((b, i) => [
              i > 0 ? el("i", { "data-lucide": "chevron-right", class: "icon icon-sm" }) : null,
              b.href ? el("a", { href: b.href }, b.label) : el("span", {}, b.label),
            ])
          )
        : null,
      el("h1", { class: "topbar-page-title" }, title),
    ]),
  ]);

  const session = getSession();
  const initials = (session?.email || "AD").slice(0, 2).toUpperCase();

  const right = el("div", { class: "topbar-right" }, [
    el("div", { class: "topbar-user" }, [
      el("div", { class: "topbar-user-avatar" }, initials),
      el("span", {}, session?.email || "Administrador"),
    ]),
    el(
      "button",
      {
        class: "btn btn-secondary btn-sm",
        onClick: () => {
          logout();
          window.location.href = "../index.html";
        },
      },
      [el("i", { "data-lucide": "log-out", class: "icon icon-sm" }), el("span", { id: "logout-btn-label" }, " Sair")]
    ),
  ]);

  container.appendChild(left);
  container.appendChild(right);
  refreshIcons();
}
