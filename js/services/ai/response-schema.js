/**
 * Validates the structured strategic-analysis JSON the AI is asked to
 * return. Hand-rolled (no schema-validation library added) since the shape
 * is small and fixed. Anything that fails validation is treated as
 * "invalid" by the caller (estrategia-ai.js), which retries once and then
 * falls back to plain text -- this file only ever reports true/false plus
 * a list of problems, it never repairs or executes anything from the JSON.
 */

const SEVERITIES = ["info", "attention", "opportunity"];
const PRIORITIES = ["low", "medium", "high"];
const CHART_TYPES = ["bar", "stacked-bar", "line", "pie", "doughnut"];

function isString(v) {
  return typeof v === "string";
}
function isArray(v) {
  return Array.isArray(v);
}
function isPlainObject(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

export function validateStrategicResponse(payload) {
  const problems = [];
  if (!isPlainObject(payload)) return { valid: false, problems: ["Resposta não é um objeto JSON."] };

  if (!isString(payload.title)) problems.push("Campo 'title' ausente ou inválido.");
  if (!isString(payload.directAnswer)) problems.push("Campo 'directAnswer' ausente ou inválido.");
  if (payload.summary !== undefined && !isString(payload.summary)) problems.push("Campo 'summary' inválido.");

  if (payload.findings !== undefined) {
    if (!isArray(payload.findings)) problems.push("Campo 'findings' deve ser uma lista.");
    else
      payload.findings.forEach((f, i) => {
        if (!isPlainObject(f)) return problems.push(`findings[${i}] não é um objeto.`);
        if (!isString(f.title)) problems.push(`findings[${i}].title inválido.`);
        if (f.severity !== undefined && !SEVERITIES.includes(f.severity)) problems.push(`findings[${i}].severity inválido.`);
      });
  }

  if (payload.evidence !== undefined && !isArray(payload.evidence)) problems.push("Campo 'evidence' deve ser uma lista.");

  if (payload.recommendations !== undefined) {
    if (!isArray(payload.recommendations)) problems.push("Campo 'recommendations' deve ser uma lista.");
    else
      payload.recommendations.forEach((r, i) => {
        if (!isPlainObject(r)) return problems.push(`recommendations[${i}] não é um objeto.`);
        if (!isString(r.action)) problems.push(`recommendations[${i}].action inválido.`);
        if (r.priority !== undefined && !PRIORITIES.includes(r.priority)) problems.push(`recommendations[${i}].priority inválido.`);
      });
  }

  if (payload.limitations !== undefined && !isArray(payload.limitations)) problems.push("Campo 'limitations' deve ser uma lista.");
  if (payload.relatedRecordIds !== undefined && !isArray(payload.relatedRecordIds)) problems.push("Campo 'relatedRecordIds' deve ser uma lista.");

  if (payload.chart !== undefined && payload.chart !== null) {
    const chart = payload.chart;
    if (!isPlainObject(chart)) problems.push("Campo 'chart' inválido.");
    else {
      if (!CHART_TYPES.includes(chart.type)) problems.push(`chart.type inválido (${chart.type}).`);
      if (!isArray(chart.labels)) problems.push("chart.labels deve ser uma lista.");
      if (!isArray(chart.datasets)) problems.push("chart.datasets deve ser uma lista.");
      else
        chart.datasets.forEach((d, i) => {
          if (!isPlainObject(d) || !isArray(d.data)) problems.push(`chart.datasets[${i}] inválido.`);
        });
    }
  }

  return { valid: problems.length === 0, problems };
}

/** relatedRecordIds must only ever reference ids the caller already has in scope -- never trusted blindly. */
export function sanitizeRelatedRecordIds(ids, allowedIds) {
  if (!Array.isArray(ids)) return [];
  const allowed = new Set(allowedIds || []);
  return ids.filter((id) => allowed.has(id));
}
