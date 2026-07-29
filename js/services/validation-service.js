const TRUE_VALUES = new Set(["sim", "s", "yes", "y", "true", "1", "batizado"]);
const FALSE_VALUES = new Set(["não", "nao", "n", "no", "false", "0"]);

export function normalizeText(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

export function normalizeForComparison(value) {
  return normalizeText(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export function normalizeBoolean(value) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "boolean") return value;
  const normalized = normalizeForComparison(value);
  if (TRUE_VALUES.has(normalized)) return true;
  if (FALSE_VALUES.has(normalized)) return false;
  return null;
}

/**
 * Row status ranking (worst wins when combined): invalida > duplicada > aviso > valida.
 */
export function validateMappedRow(row) {
  const errors = [];
  const warnings = [];

  if (!normalizeText(row.nome)) errors.push("Nome é obrigatório.");
  if (!normalizeText(row.cidade)) errors.push("Cidade é obrigatória.");
  if (!normalizeText(row.congregacao)) errors.push("Congregação é obrigatória.");

  if (row.data_nascimento_raw && row.data_nascimento === null) {
    warnings.push("Data de nascimento em formato não reconhecido.");
  }
  if (!row.data_nascimento) warnings.push("Data de nascimento não informada.");
  if (!normalizeText(row.telefone)) warnings.push("Telefone não informado.");
  if (row.status && !row.statusValido) warnings.push(`Status "${row.status}" não reconhecido — será definido como "ativo".`);

  let status = "valida";
  if (errors.length) status = "invalida";
  else if (warnings.length) status = "aviso";

  return { status, errors, warnings };
}
