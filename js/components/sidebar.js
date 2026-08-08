import { el, refreshIcons } from "../utils/dom-utils.js";
import { NAV_ITEMS, NAV_CATEGORIES, APP_NAME, APP_VERSION } from "../config/constants.js";
import { t } from "../services/i18n-service.js";

export function renderSidebar(container, activeKey, isAdmin = false, role = null) {
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

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (item.adminOnly) return isAdmin;
    if (item.roles) return isAdmin || item.roles.includes(role);
    return true;
  });

  const navChildren = [];
  NAV_CATEGORIES.forEach((category) => {
    const items = visibleItems.filter((item) => item.category === category.key);
    if (!items.length) return;
    navChildren.push(
      el("div", { class: "sidebar-category" }, [el("span", { class: "sidebar-category-label" }, t(`nav.category.${category.key}`))])
    );
    items.forEach((item) => {
      navChildren.push(
        el("a", { href: item.href, class: `sidebar-link${item.key === activeKey ? " active" : ""}`, "aria-current": item.key === activeKey ? "page" : undefined }, [
          el("i", { "data-lucide": item.icon, class: "icon" }),
          el("span", {}, t(`nav.${item.key}`)),
        ])
      );
    });
  });

  const nav = el("nav", { class: "sidebar-nav", "aria-label": "Navegação principal" }, navChildren);

  const footer = el("div", { class: "sidebar-footer" }, t("sidebar.footer"));

  container.appendChild(brand);
  container.appendChild(nav);
  container.appendChild(footer);
  refreshIcons();
}
