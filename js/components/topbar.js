import { el, refreshIcons } from "../utils/dom-utils.js";
import { getSession, logout } from "../services/auth-service.js";
import { getTheme, toggleTheme } from "../services/theme-service.js";
import { getLang, setLang, t } from "../services/i18n-service.js";
import { NotificationService } from "../services/notification-service.js";

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

  const currentTheme = getTheme();
  const themeToggle = el(
    "button",
    {
      class: `theme-toggle${currentTheme === "dark" ? " is-dark" : ""}`,
      id: "theme-toggle-btn",
      type: "button",
      role: "switch",
      "aria-checked": currentTheme === "dark" ? "true" : "false",
      "aria-label": t("topbar.theme.aria"),
      title: t("topbar.theme.aria"),
    },
    [
      el("i", { "data-lucide": "sun", class: "icon icon-xs theme-toggle-icon theme-toggle-icon-sun" }),
      el("i", { "data-lucide": "moon", class: "icon icon-xs theme-toggle-icon theme-toggle-icon-moon" }),
      el("span", { class: "theme-toggle-thumb" }),
    ]
  );
  themeToggle.addEventListener("click", () => {
    toggleTheme();
    window.location.reload();
  });

  const notifList = el("div", { class: "notif-dropdown-list", id: "notif-dropdown-list" }, [
    el("div", { class: "notif-empty" }, t("topbar.alerts.empty")),
  ]);
  const notifDropdown = el("div", { class: "notif-dropdown", id: "notif-dropdown", hidden: true }, [
    el("div", { class: "notif-dropdown-title" }, t("topbar.alerts.title")),
    notifList,
  ]);
  const notifBadge = el("span", { class: "notif-badge", id: "notif-badge", hidden: true }, "0");
  const notifBellBtn = el(
    "button",
    {
      class: "btn btn-ghost btn-icon notif-bell-btn",
      id: "notif-bell-btn",
      type: "button",
      "aria-label": t("topbar.alerts.aria"),
      title: t("topbar.alerts.title"),
      "aria-haspopup": "true",
      "aria-expanded": "false",
    },
    [el("i", { "data-lucide": "bell", class: "icon icon-sm" }), notifBadge]
  );
  const notifWrap = el("div", { class: "notif-wrap" }, [notifBellBtn, notifDropdown]);

  notifBellBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const isHidden = notifDropdown.hasAttribute("hidden");
    if (isHidden) notifDropdown.removeAttribute("hidden");
    else notifDropdown.setAttribute("hidden", "");
    notifBellBtn.setAttribute("aria-expanded", isHidden ? "true" : "false");
  });
  document.addEventListener("click", (e) => {
    if (!notifWrap.contains(e.target)) notifDropdown.setAttribute("hidden", "");
  });

  NotificationService.getAlerts().then((alerts) => {
    if (alerts.length === 0) return;
    notifBadge.textContent = String(alerts.length);
    notifBadge.removeAttribute("hidden");
    notifList.innerHTML = "";
    alerts.forEach((a) => {
      notifList.appendChild(
        el("a", { href: a.href, class: "notif-item" }, [
          el("i", { "data-lucide": a.icon, class: "icon icon-sm" }),
          el("span", {}, a.text),
        ])
      );
    });
    refreshIcons();
  }).catch((err) => {
    console.error("Falha ao carregar alertas:", err);
  });

  const currentLang = getLang();
  const langSelect = el(
    "select",
    {
      class: "form-control lang-select",
      id: "lang-select",
      "aria-label": t("topbar.lang.aria"),
    },
    [
      el("option", { value: "pt", selected: currentLang === "pt" ? true : undefined }, "Português"),
      el("option", { value: "es", selected: currentLang === "es" ? true : undefined }, "Español"),
      el("option", { value: "en", selected: currentLang === "en" ? true : undefined }, "English"),
    ]
  );
  langSelect.addEventListener("change", (e) => {
    setLang(e.target.value);
    window.location.reload();
  });

  const right = el("div", { class: "topbar-right" }, [
    el("div", { class: "topbar-user" }, [
      el("div", { class: "topbar-user-avatar" }, initials),
      el("span", {}, session?.email || "Administrador"),
    ]),
    themeToggle,
    notifWrap,
    langSelect,
    el(
      "button",
      {
        class: "btn btn-secondary btn-sm",
        onClick: async () => {
          await logout();
          window.location.href = "../index.html";
        },
      },
      [el("i", { "data-lucide": "log-out", class: "icon icon-sm" }), el("span", { id: "logout-btn-label" }, ` ${t("topbar.sair")}`)]
    ),
  ]);

  container.appendChild(left);
  container.appendChild(right);
  refreshIcons();
}
