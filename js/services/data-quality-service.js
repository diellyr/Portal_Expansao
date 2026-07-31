import { YouthService } from "./youth-service.js";
import { CityService } from "./city-service.js";
import { CongregationService } from "./congregation-service.js";
import { calculateAge, todayISO } from "../utils/dates.js";
import { normalizeText, normalizePhone } from "../utils/text-utils.js";
import { missingCompletenessFields, completenessScore, averageCompleteness } from "../utils/completeness-utils.js";

/**
 * Central de Qualidade dos Cadastros -- read-only analysis over data that's
 * already loaded elsewhere in the app. Never modifies a record; every result
 * here is a hint for a person to review and fix manually in Jovens/Cidades/
 * Congregações. Duplicate/similar-spelling groups are suggestions, not merges.
 */
export const DataQualityService = {
  async load() {
    const [cities, congregations, youthRaw] = await Promise.all([
      CityService.list(),
      CongregationService.list(),
      YouthService.list(),
    ]);
    const youth = youthRaw.map((y) => ({ ...y, idade: calculateAge(y.dataNascimento) }));
    return { cities, congregations, youth };
  },

  /** Youth with at least one tracked field empty, least-complete first. */
  incompleteRecords(youthList) {
    return youthList
      .map((y) => ({ youth: y, faltando: missingCompletenessFields(y), score: completenessScore(y) }))
      .filter((r) => r.faltando.length > 0)
      .sort((a, b) => a.score - b.score);
  },

  /** Dates that can't be true given the rest of the record -- flag only, never auto-corrected. */
  dateInconsistencies(youthList) {
    const today = todayISO();
    const issues = [];
    youthList.forEach((y) => {
      if (y.dataNascimento && y.dataNascimento > today) {
        issues.push({ youth: y, tipo: "Data de nascimento no futuro", detalhe: y.dataNascimento });
      }
      if (y.dataBatismoAguas && y.dataBatismoAguas > today) {
        issues.push({ youth: y, tipo: "Data de batismo nas águas no futuro", detalhe: y.dataBatismoAguas });
      }
      if (y.dataNascimento && y.dataBatismoAguas && y.dataBatismoAguas < y.dataNascimento) {
        issues.push({
          youth: y,
          tipo: "Batismo registrado antes do nascimento",
          detalhe: `Nascimento: ${y.dataNascimento} · Batismo: ${y.dataBatismoAguas}`,
        });
      }
      if (typeof y.idade === "number" && y.idade > 100) {
        issues.push({ youth: y, tipo: "Idade incoerente (acima de 100 anos)", detalhe: `${y.idade} anos` });
      }
    });
    return issues;
  },

  /** Groups of youth sharing a normalized name -- a hint to check manually, never merged automatically. */
  possibleDuplicateNames(youthList) {
    const groups = new Map();
    youthList.forEach((y) => {
      const key = normalizeText(y.nome);
      if (!key) return;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(y);
    });
    return [...groups.values()].filter((g) => g.length > 1);
  },

  /** Groups of youth sharing a normalized phone number (telefone or celular). */
  possibleDuplicatePhones(youthList) {
    const groups = new Map();
    youthList.forEach((y) => {
      const numbers = new Set([normalizePhone(y.telefone), normalizePhone(y.celular)].filter((n) => n && n.length >= 8));
      numbers.forEach((key) => {
        if (!groups.has(key)) groups.set(key, new Set());
        groups.get(key).add(y);
      });
    });
    return [...groups.values()].map((set) => [...set]).filter((g) => g.length > 1);
  },

  /** Cities with different ids but the same normalized name -- may be the same place typed twice. */
  possiblySameCities(cities) {
    const groups = new Map();
    cities.forEach((c) => {
      const key = normalizeText(c.nome);
      if (!key) return;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(c);
    });
    return [...groups.values()].filter((g) => g.length > 1);
  },

  /** Congregations in the same city with the same normalized name. */
  possiblySameCongregations(congregations) {
    const groups = new Map();
    congregations.forEach((c) => {
      const nameKey = normalizeText(c.nome);
      if (!nameKey) return;
      const key = `${c.cidadeId}::${nameKey}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(c);
    });
    return [...groups.values()].filter((g) => g.length > 1);
  },

  summary(youthList, cities, congregations) {
    return {
      total: youthList.length,
      completudeMedia: averageCompleteness(youthList),
      incompletos: this.incompleteRecords(youthList).length,
      duplicidadesNome: this.possibleDuplicateNames(youthList).length,
      duplicidadesTelefone: this.possibleDuplicatePhones(youthList).length,
      inconsistenciasData: this.dateInconsistencies(youthList).length,
      cidadesSemelhantes: this.possiblySameCities(cities).length,
      congregacoesSemelhantes: this.possiblySameCongregations(congregations).length,
    };
  },
};
