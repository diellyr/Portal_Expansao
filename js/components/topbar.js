import { el, refreshIcons, debounce } from "../utils/dom-utils.js";
import { getSession, logout } from "../services/auth-service.js";
import { getTheme, toggleTheme } from "../services/theme-service.js";
import { getLang, setLang, t } from "../services/i18n-service.js";
import { NotificationService } from "../services/notification-service.js";
import { SearchService } from "../services/search-service.js";
import { openChangePasswordModal } from "./change-password-modal.js";
import { openYouthFicha } from "./youth-ficha-modal.js";

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

  const searchResults = el("div", { class: "search-dropdown", id: "search-dropdown", hidden: true });
  const searchInput = el("input", {
    type: "search",
    class: "form-control topbar-search-input",
    id: "global-search-input",
    placeholder: "Buscar jovem, cidade, congregação, conselheiro...",
    "aria-label": "Pesquisa global",
    autocomplete: "off",
  });
  const searchWrap = el("div", { class: "topbar-search", id: "topbar-search" }, [
    el("i", { "data-lucide": "search", class: "icon icon-sm topbar-search-icon" }),
    searchInput,
    searchResults,
  ]);
  const searchMobileToggle = el(
    "button",
    { type: "button", class: "btn btn-ghost btn-icon search-mobile-toggle", id: "search-mobile-toggle", "aria-label": "Abrir pesquisa" },
    [el("i", { "data-lucide": "search", class: "icon" })]
  );

  function closeSearch() {
    searchResults.hidden = true;
    searchWrap.classList.remove("mobile-open");
  }

  function renderSearchResults(results, query) {
    searchResults.innerHTML = "";
    searchResults.hidden = false;
    if (!results.length) {
      searchResults.appendChild(el("div", { class: "notif-empty" }, `Nenhum resultado para "${query}"`));
      return;
    }
    results.forEach((r) => {
      const item = el(
        "button",
        { type: "button", class: "search-result-item" },
        [
          el("i", { "data-lucide": "user", class: "icon icon-sm" }),
          el("div", { class: "search-result-text" }, [
            el("div", { class: "search-result-name" }, r.youth.nome),
            el("div", { class: "search-result-meta" }, [r.cidade, r.congregacao].filter(Boolean).join(" · ") || "Sem cidade cadastrada"),
          ]),
        ]
      );
      item.addEventListener("click", () => {
        closeSearch();
        searchInput.value = "";
        openYouthFicha(r.youth, r.cidade || "Não informado", r.congregacao || "Sem igreja cadastrada");
      });
      searchResults.appendChild(item);
    });
    refreshIcons();
  }

  const runSearch = debounce(async () => {
    const query = searchInput.value.trim();
    if (!query) return closeSearch();
    const results = await SearchService.search(query, 8);
    renderSearchResults(results, query);
  }, 250);

  searchInput.addEventListener("input", runSearch);
  searchInput.addEventListener("focus", () => {
    if (searchInput.value.trim()) runSearch();
  });
  searchMobileToggle.addEventListener("click", (e) => {
    e.stopPropagation();
    searchWrap.classList.toggle("mobile-open");
    if (searchWrap.classList.contains("mobile-open")) searchInput.focus();
    else closeSearch();
  });
  document.addEventListener("click", (e) => {
    if (!searchWrap.contains(e.target) && e.target !== searchMobileToggle) closeSearch();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeSearch();
  });

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
      // Some mobile browsers restore a <select>'s previous value across a
      // location.reload() (form-state restoration), overriding the option
      // this render marks as selected -- autocomplete="off" opts out of that.
      autocomplete: "off",
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

  const userMenuDropdown = el("div", { class: "notif-dropdown", id: "user-menu-dropdown", hidden: true }, [
    el(
      "button",
      {
        type: "button",
        class: "notif-item user-menu-item",
        onClick: () => {
          userMenuDropdown.setAttribute("hidden", "");
          openChangePasswordModal();
        },
      },
      [el("i", { "data-lucide": "key-round", class: "icon icon-sm" }), el("span", {}, "Alterar senha")]
    ),
  ]);
  const userMenuBtn = el(
    "button",
    {
      type: "button",
      class: "topbar-user",
      id: "user-menu-btn",
      "aria-haspopup": "true",
      "aria-expanded": "false",
    },
    [el("div", { class: "topbar-user-avatar" }, initials), el("span", {}, session?.email || "Administrador")]
  );
  const userMenuWrap = el("div", { class: "notif-wrap" }, [userMenuBtn, userMenuDropdown]);

  userMenuBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const isHidden = userMenuDropdown.hasAttribute("hidden");
    if (isHidden) userMenuDropdown.removeAttribute("hidden");
    else userMenuDropdown.setAttribute("hidden", "");
    userMenuBtn.setAttribute("aria-expanded", isHidden ? "true" : "false");
  });
  document.addEventListener("click", (e) => {
    if (!userMenuWrap.contains(e.target)) userMenuDropdown.setAttribute("hidden", "");
  });

  const right = el("div", { class: "topbar-right" }, [
    searchMobileToggle,
    userMenuWrap,
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
  container.appendChild(searchWrap);
  container.appendChild(right);
  refreshIcons();
}
