/**
 * Centralized "cadastro completo" scoring, reused by Central de Qualidade,
 * Comparador de Cidades, Painel de Cobertura Regional and Segmentação --
 * one definition instead of each module inventing its own completeness rule.
 *
 * Only fields where "not filled" is distinguishable from a real value are
 * scored here. Talent/ministry booleans (prega, canta, batizadoEspiritoSanto,
 * liderExpansao) are stored as plain true/false with no null state in the
 * data model, so absence of information can't be told apart from an explicit
 * "não" without a schema change -- they're used elsewhere (alerts, search)
 * as positive-only signals instead of counted here.
 */
export const COMPLETENESS_FIELDS = [
  { key: "dataNascimento", label: "Data de nascimento" },
  { key: "cidadeId", label: "Cidade" },
  { key: "congregacaoId", label: "Congregação" },
  { key: "contato", label: "Telefone" },
  { key: "pastor", label: "Pastor" },
  { key: "conselheiroLocal", label: "Conselheiro local" },
  { key: "conselheiroCidade", label: "Conselheiro da cidade" },
  { key: "dataBatismoAguas", label: "Data de batismo nas águas" },
];

function hasField(youth, key) {
  if (key === "contato") return !!(youth.telefone || youth.celular);
  const value = youth[key];
  return value !== null && value !== undefined && value !== "";
}

/** Which of the tracked fields are empty for this youth, most-relevant-first. */
export function missingCompletenessFields(youth) {
  return COMPLETENESS_FIELDS.filter((f) => !hasField(youth, f.key));
}

/** 0-100 completeness score for a single youth. */
export function completenessScore(youth) {
  const missing = missingCompletenessFields(youth).length;
  return Math.round(((COMPLETENESS_FIELDS.length - missing) / COMPLETENESS_FIELDS.length) * 100);
}

/** 0-100 average completeness score across a list (0 for an empty list). */
export function averageCompleteness(youthList) {
  if (!youthList.length) return 0;
  const total = youthList.reduce((sum, y) => sum + completenessScore(y), 0);
  return Math.round(total / youthList.length);
}
