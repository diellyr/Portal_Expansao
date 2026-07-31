import { isBirthdayInMonth, getAgeRangeKey } from "../utils/dates.js";
import { YouthService } from "./youth-service.js";

/**
 * Segmentação Automática -- named groups computed purely as predicates over
 * data other pages already loaded (each `youth` item is expected to already
 * carry `.idade` from calculateAge, same as Jovens/Relatórios/Dashboard do).
 * No new query, no new stored state: a "segment" is just a filter preset
 * layered on top of the existing filter/table system.
 */
export const SEGMENTS = [
  {
    key: "adolescentes",
    label: "Adolescentes",
    icon: "smile",
    tooltip: "12 a 18 anos, com base nas faixas etárias já usadas em Relatórios/Dashboard.",
    predicate: (y) => ["12_14", "15_18"].includes(getAgeRangeKey(y.idade)),
  },
  {
    key: "jovens_adultos",
    label: "Jovens adultos",
    icon: "user",
    tooltip: "19 a 35 anos.",
    predicate: (y) => ["19_25", "26_35"].includes(getAgeRangeKey(y.idade)),
  },
  { key: "musicos", label: "Músicos", icon: "music", tooltip: "Campo Instrumento preenchido.", predicate: (y) => !!y.instrumento },
  { key: "pregadores", label: "Pregadores", icon: "mic", tooltip: "Campo Prega marcado como Sim.", predicate: (y) => y.prega === true },
  { key: "cantores", label: "Cantores", icon: "music-2", tooltip: "Campo Canta marcado como Sim.", predicate: (y) => y.canta === true },
  {
    key: "nao_batizados",
    label: "Não batizados",
    icon: "droplet",
    tooltip: "Sem data de batismo nas águas registrada.",
    predicate: (y) => !y.dataBatismoAguas,
  },
  {
    key: "aniversariantes_mes",
    label: "Aniversariantes do mês",
    icon: "cake",
    tooltip: "Data de nascimento cai no mês atual.",
    predicate: (y) => isBirthdayInMonth(y.dataNascimento, new Date().getMonth() + 1),
  },
  {
    key: "sem_conselheiro",
    label: "Sem conselheiro",
    icon: "user-x",
    tooltip: "Campo Conselheiro local vazio.",
    predicate: (y) => !y.conselheiroLocal,
  },
  {
    key: "cadastro_incompleto",
    label: "Cadastro incompleto",
    icon: "alert-triangle",
    tooltip: "Mesmo critério usado em Qualidade dos Cadastros e Relatórios.",
    predicate: (y) => YouthService.isIncomplete(y).length > 0,
  },
];

/** Applies a segment (by key) to an already-filtered list; "all"/falsy returns the list unchanged. */
export function applySegment(youthList, segmentKey) {
  if (!segmentKey || segmentKey === "all") return youthList;
  const segment = SEGMENTS.find((s) => s.key === segmentKey);
  return segment ? youthList.filter(segment.predicate) : youthList;
}

/** Segment definitions with a live count for the given (already-filtered) list -- for chip badges. */
export function segmentCounts(youthList) {
  return SEGMENTS.map((s) => ({ ...s, count: youthList.filter(s.predicate).length }));
}
