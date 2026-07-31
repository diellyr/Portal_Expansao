import { getAgeRangeKey } from "../../utils/dates.js";
import { AGE_RANGES } from "../../config/constants.js";

/**
 * "Privacidade reforçada" (on by default -- see session-config-store.js).
 * Converts a youth record into the minimum shape the AI ever needs:
 * aggregated/categorical fields only, never phone/address/documents/
 * parents' names/full birthdate. Used by every context function before
 * anything is sent to a provider.
 */
export function toAggregateSafeYouth(youth) {
  const ageRange = AGE_RANGES.find((r) => r.key === getAgeRangeKey(youth.idade));
  return {
    cidadeId: youth.cidadeId,
    congregacaoId: youth.congregacaoId,
    faixaEtaria: ageRange?.label || "Não informado",
    status: youth.status,
    temConselheiroLocal: !!youth.conselheiroLocal,
    temBatismoAguas: !!youth.dataBatismoAguas,
    batizadoEspiritoSanto: youth.batizadoEspiritoSanto === true,
    prega: youth.prega === true,
    canta: youth.canta === true,
    tocaInstrumento: !!youth.instrumento,
  };
}

/**
 * The rarer case where a function legitimately needs to show names (e.g. a
 * priority contact list) -- still strips every non-essential personal
 * field, keeping only what the specific feature needs.
 */
export function toNamedSafeYouth(youth, extraFields = []) {
  const base = { id: youth.id, nome: youth.nome, cidadeId: youth.cidadeId, congregacaoId: youth.congregacaoId };
  extraFields.forEach((field) => {
    if (field in youth) base[field] = youth[field];
  });
  return base;
}

export function countBy(list, keyFn) {
  const counts = new Map();
  list.forEach((item) => {
    const key = keyFn(item);
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  return counts;
}
