const STORAGE_KEY = "portal_expansao_lang";

/**
 * Translation coverage is scoped to shared chrome (sidebar, topbar, login
 * page and common component defaults) — page-specific content (dashboard,
 * jovens, cidades, congregações, eventos, relatórios, administração) is not
 * translated in this pass.
 */
const DICTS = {
  pt: {
    "app.subtitle": "Gestão Regional",
    "nav.dashboard": "Dashboard",
    "nav.cidades": "Cidades",
    "nav.congregacoes": "Congregações",
    "nav.jovens": "Jovens",
    "nav.eventos": "Eventos",
    "nav.relatorios": "Relatórios",
    "nav.administracao": "Administração",
    "sidebar.footer": "MVP local · dados no navegador",
    "topbar.sair": "Sair",
    "topbar.theme.aria": "Alternar tema claro/escuro",
    "topbar.alerts.aria": "Ver alertas",
    "topbar.alerts.title": "Alertas",
    "topbar.alerts.empty": "Nenhum alerta no momento",
    "topbar.lang.aria": "Selecionar idioma",
    "login.title": "Portal Expansão",
    "login.email": "E-mail",
    "login.password": "Senha",
    "login.enter": "Entrar",
    "login.notePrefix": "Login demonstrativo — sem autenticação real. Use",
    "login.noteSuffix": "Os dados ficam salvos apenas neste navegador (IndexedDB).",
  },
  es: {
    "app.subtitle": "Gestión Regional",
    "nav.dashboard": "Panel",
    "nav.cidades": "Ciudades",
    "nav.congregacoes": "Congregaciones",
    "nav.jovens": "Jóvenes",
    "nav.eventos": "Eventos",
    "nav.relatorios": "Informes",
    "nav.administracao": "Administración",
    "sidebar.footer": "MVP local · datos en el navegador",
    "topbar.sair": "Salir",
    "topbar.theme.aria": "Alternar tema claro/oscuro",
    "topbar.alerts.aria": "Ver alertas",
    "topbar.alerts.title": "Alertas",
    "topbar.alerts.empty": "Ningún alerta por el momento",
    "topbar.lang.aria": "Seleccionar idioma",
    "login.title": "Portal Expansão",
    "login.email": "Correo electrónico",
    "login.password": "Contraseña",
    "login.enter": "Entrar",
    "login.notePrefix": "Inicio de sesión de demostración — sin autenticación real. Use",
    "login.noteSuffix": "Los datos se guardan solo en este navegador (IndexedDB).",
  },
  en: {
    "app.subtitle": "Regional Management",
    "nav.dashboard": "Dashboard",
    "nav.cidades": "Cities",
    "nav.congregacoes": "Congregations",
    "nav.jovens": "Youth",
    "nav.eventos": "Events",
    "nav.relatorios": "Reports",
    "nav.administracao": "Administration",
    "sidebar.footer": "Local MVP · data stored in browser",
    "topbar.sair": "Log out",
    "topbar.theme.aria": "Toggle light/dark theme",
    "topbar.alerts.aria": "View alerts",
    "topbar.alerts.title": "Alerts",
    "topbar.alerts.empty": "No alerts right now",
    "topbar.lang.aria": "Select language",
    "login.title": "Portal Expansão",
    "login.email": "Email",
    "login.password": "Password",
    "login.enter": "Sign in",
    "login.notePrefix": "Demo login — no real authentication. Use",
    "login.noteSuffix": "Data is saved only in this browser (IndexedDB).",
  },
};

export function getLang() {
  const stored = localStorage.getItem(STORAGE_KEY);
  return DICTS[stored] ? stored : "pt";
}

export function setLang(lang) {
  localStorage.setItem(STORAGE_KEY, DICTS[lang] ? lang : "pt");
}

export function t(key) {
  const lang = getLang();
  return DICTS[lang][key] ?? DICTS.pt[key] ?? key;
}
