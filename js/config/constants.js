export const APP_NAME = "Portal Expansão";
export const APP_SUBTITLE = "Gestão Regional";
// Keep this in sync with version.md at the repository root.
export const APP_VERSION = "1.9.0";

export const DB_NAME = "portal_expansao_db";
export const DB_VERSION = 1;

export const STORES = {
  CITIES: "cities",
  CONGREGATIONS: "congregations",
  YOUTH: "youth",
  EVENTS: "events",
  IMPORT_HISTORY: "import_history",
  SETTINGS: "settings",
};

export const AUTH_SESSION_KEY = "portal_expansao_session";

export const YOUTH_STATUS = {
  ATIVO: "ativo",
  VISITANTE: "visitante",
  NOVO_CONVERTIDO: "novo_convertido",
  AUSENTE: "ausente",
  TRANSFERIDO: "transferido",
  INATIVO: "inativo",
};

export const YOUTH_STATUS_LABELS = {
  ativo: "Ativo",
  visitante: "Visitante",
  novo_convertido: "Novo Convertido",
  ausente: "Ausente",
  transferido: "Transferido",
  inativo: "Inativo",
};

export const TIPO_ADMISSAO = {
  BATISMO: "batismo",
  TRANSFERENCIA: "transferencia",
  ACLAMACAO: "aclamacao",
  OUTRO: "outro",
};

export const TIPO_ADMISSAO_LABELS = {
  batismo: "Batismo",
  transferencia: "Transferência",
  aclamacao: "Aclamação",
  outro: "Outro",
};

export const SEXO_LABELS = {
  masculino: "Masculino",
  feminino: "Feminino",
};

export const YOUTH_STATUS_BADGE = {
  ativo: "success",
  visitante: "info",
  novo_convertido: "info",
  ausente: "warning",
  transferido: "neutral",
  inativo: "danger",
};

export const EVENT_TYPES = [
  "culto",
  "vigilia",
  "congresso",
  "ensaio",
  "evangelismo",
  "reuniao",
  "palestra",
  "retiro",
  "outro",
];

export const EVENT_TYPE_LABELS = {
  culto: "Culto",
  vigilia: "Vigília",
  congresso: "Congresso",
  ensaio: "Ensaio",
  evangelismo: "Evangelismo",
  reuniao: "Reunião",
  palestra: "Palestra",
  retiro: "Retiro",
  outro: "Outro",
};

export const AGE_RANGES = [
  { key: "menor_12", label: "Menores de 12 anos", min: 0, max: 11 },
  { key: "12_14", label: "12 a 14 anos", min: 12, max: 14 },
  { key: "15_18", label: "15 a 18 anos", min: 15, max: 18 },
  { key: "19_25", label: "19 a 25 anos", min: 19, max: 25 },
  { key: "26_35", label: "26 a 35 anos", min: 26, max: 35 },
  { key: "acima_35", label: "Acima de 35 anos", min: 36, max: 999 },
];

export const CHART_COLORS = [
  "#1d4ed8", "#0ea5a4", "#f59e0b", "#db2777", "#7c3aed",
  "#16a34a", "#dc2626", "#0891b2", "#6366f1", "#64748b",
];

export const NAV_ITEMS = [
  { href: "dashboard.html", icon: "layout-dashboard", label: "Dashboard", key: "dashboard" },
  { href: "cidades.html", icon: "map-pin", label: "Cidades", key: "cidades" },
  { href: "congregacoes.html", icon: "building-2", label: "Congregações", key: "congregacoes" },
  { href: "jovens.html", icon: "users", label: "Jovens", key: "jovens" },
  { href: "eventos.html", icon: "calendar", label: "Eventos", key: "eventos" },
  { href: "relatorios.html", icon: "bar-chart-3", label: "Relatórios", key: "relatorios" },
  {
    href: "backup.html",
    icon: "database-backup",
    label: "Backup",
    key: "backup",
    roles: ["lider_simplifique_regional", "conselheiro_regional", "lider_simplifique", "conselheiro"],
  },
  { href: "usuarios.html", icon: "user-cog", label: "Usuários", key: "usuarios", adminOnly: true },
  { href: "administracao.html", icon: "settings", label: "Administração", key: "administracao", adminOnly: true },
];

export const DEMO_FLAG = "isDemo";
