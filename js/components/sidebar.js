import { el, refreshIcons } from "../utils/dom-utils.js";
import { NAV_ITEMS, APP_NAME, APP_VERSION } from "../config/constants.js";
import { t } from "../services/i18n-service.js";

export function renderSidebar(container, activeKey, isAdmin = false) {
  container.innerHTML = "";

  const subtitle = t("app.subtitle");
  const brand = el("div", { class: "sidebar-brand" }, [
    el("div", { class: "sidebar-brand-mark" }, [el("img", { src: "../assets/images/logo.png", alt: APP_NAME })]),
    el("div", { class: "sidebar-brand-text" }, [
      el("div", { class: "sidebar-brand-title", title: APP_NAME }, APP_NAME),
      el("div", { class: "sidebar-brand-subtitle", title: subtitle }, subtitle),
      el("div", { class: "sidebar-brand-version" }, `v${APP_VERSION}`),
    ]),
  ]);

  const nav = el(
    "nav",
    { class: "sidebar-nav", "aria-label": "Navegação principal" },
    NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin).map((item) =>
      el("a", { href: item.href, class: `sidebar-link${item.key === activeKey ? " active" : ""}`, "aria-current": item.key === activeKey ? "page" : undefined }, [
        el("i", { "data-lucide": item.icon, class: "icon" }),
        el("span", {}, t(`nav.${item.key}`)),
      ])
    )
  );

  const footer = el("div", { class: "sidebar-footer" }, t("sidebar.footer"));

  container.appendChild(brand);
  container.appendChild(nav);
  container.appendChild(footer);
  refreshIcons();
}
