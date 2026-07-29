import { el, refreshIcons } from "../utils/dom-utils.js";
import { NAV_ITEMS, APP_NAME, APP_SUBTITLE } from "../config/constants.js";

export function renderSidebar(container, activeKey) {
  container.innerHTML = "";

  const brand = el("div", { class: "sidebar-brand" }, [
    el("div", { class: "sidebar-brand-mark" }, "PE"),
    el("div", { class: "sidebar-brand-text" }, [
      el("div", { class: "sidebar-brand-title" }, APP_NAME),
      el("div", { class: "sidebar-brand-subtitle" }, APP_SUBTITLE),
    ]),
  ]);

  const nav = el(
    "nav",
    { class: "sidebar-nav", "aria-label": "Navegação principal" },
    NAV_ITEMS.map((item) =>
      el("a", { href: item.href, class: `sidebar-link${item.key === activeKey ? " active" : ""}`, "aria-current": item.key === activeKey ? "page" : undefined }, [
        el("i", { "data-lucide": item.icon, class: "icon" }),
        el("span", {}, item.label),
      ])
    )
  );

  const footer = el("div", { class: "sidebar-footer" }, "MVP local · dados no navegador");

  container.appendChild(brand);
  container.appendChild(nav);
  container.appendChild(footer);
  refreshIcons();
}
