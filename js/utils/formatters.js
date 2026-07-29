export function formatBoolean(value) {
  if (value === true) return "Sim";
  if (value === false) return "Não";
  return "Não informado";
}

export function formatPercent(part, total, decimals = 1) {
  if (!total) return "0%";
  return `${((part / total) * 100).toFixed(decimals)}%`;
}

export function formatNumber(value) {
  return new Intl.NumberFormat("pt-BR").format(value ?? 0);
}

export function formatPhone(value) {
  return value || "Não informado";
}

export function truncate(text, maxLength = 40) {
  if (!text) return "";
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

export function capitalize(text) {
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
}
