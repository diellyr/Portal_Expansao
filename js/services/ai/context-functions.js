import { YouthService } from "../youth-service.js";
import { CityService } from "../city-service.js";
import { CongregationService } from "../congregation-service.js";
import { getCurrentUserProfile } from "../user-profile-service.js";
import { DataQualityService } from "../data-quality-service.js";
import { CityComparisonService } from "../city-comparison-service.js";
import { calculateAge, getAgeRangeKey, isBirthdayInMonth, isBirthdayInWeek, todayISO } from "../../utils/dates.js";
import { averageCompleteness } from "../../utils/completeness-utils.js";
import { AGE_RANGES } from "../../config/constants.js";
import { toNamedSafeYouth } from "./privacy-utils.js";

/**
 * The ONLY data access the Estratégia AI is allowed: a fixed set of
 * read-only, aggregation-first functions. The AI never queries the
 * database, never chooses tables/columns, and never sees anything these
 * functions don't return. Every function:
 *   1. Reuses the exact same YouthService/CityService/CongregationService
 *      calls every other page uses -- so whatever RLS/scope already
 *      restricts a role/city, restricts these results too, automatically.
 *   2. Returns { data, meta } where meta always states the filters/criteria
 *      applied and whether data is insufficient for a confident answer.
 *   3. Applies "privacidade reforçada" redaction by default (see
 *      privacy-utils.js) -- names only appear where a feature genuinely
 *      needs them (e.g. a contact list), never phone/address/documents.
 */

async function loadBaseData() {
  const [cities, congregations, youthRaw] = await Promise.all([CityService.list(), CongregationService.list(), YouthService.list()]);
  const youth = youthRaw.map((y) => ({ ...y, idade: calculateAge(y.dataNascimento) }));
  return { cities, congregations, youth };
}

function meta({ filters = {}, recordCount, insufficientData = false, source }) {
  return { filtersApplied: filters, recordCount, insufficientData, source, generatedAt: new Date().toISOString() };
}

export const ContextFunctions = {
  /** Current user's role and city scope -- every other function's results are implicitly limited to this. */
  async getCurrentUserScope() {
    const profile = await getCurrentUserProfile();
    if (!profile) return { data: null, meta: meta({ insufficientData: true, source: "user-profile-service" }) };
    const cityName = profile.cidadeId ? (await CityService.getById(profile.cidadeId))?.nome || null : null;
    return {
      data: { role: profile.role, cidadeId: profile.cidadeId, cityName, isRegionalScope: !profile.cidadeId },
      meta: meta({ recordCount: 1, source: "user-profile-service" }),
    };
  },

  async getRegionalSummary() {
    const { cities, congregations, youth } = await loadBaseData();
    const comConselheiro = youth.filter((y) => !!y.conselheiroLocal).length;
    return {
      data: {
        totalJovens: youth.length,
        totalCidades: cities.length,
        totalCongregacoes: congregations.length,
        completudeMedia: averageCompleteness(youth),
        percentualComConselheiro: youth.length ? Math.round((comConselheiro / youth.length) * 100) : 0,
        ativos: youth.filter((y) => y.status === "ativo").length,
        batizadosAguas: youth.filter((y) => !!y.dataBatismoAguas).length,
        batizadosEspiritoSanto: youth.filter((y) => y.batizadoEspiritoSanto === true).length,
      },
      meta: meta({ recordCount: youth.length, source: "YouthService/CityService/CongregationService" }),
    };
  },

  async getCityComparison(cityIds) {
    const data = await loadBaseData();
    const ids = cityIds && cityIds.length ? cityIds : data.cities.map((c) => c.id);
    if (ids.length < 2) {
      return { data: null, meta: meta({ filters: { cityIds: ids }, insufficientData: true, source: "city-comparison-service" }) };
    }
    const rows = CityComparisonService.compare(ids, data);
    return { data: rows, meta: meta({ filters: { cityIds: ids }, recordCount: rows.length, source: "city-comparison-service" }) };
  },

  async getRegistrationQuality() {
    const { cities, congregations, youth } = await loadBaseData();
    const summary = DataQualityService.summary(youth, cities, congregations);
    const incomplete = DataQualityService.incompleteRecords(youth).map((r) => ({
      ...toNamedSafeYouth(r.youth),
      camposFaltando: r.faltando.map((f) => f.label),
      completude: r.score,
    }));
    const duplicateNames = DataQualityService.possibleDuplicateNames(youth).length;
    const duplicatePhones = DataQualityService.possibleDuplicatePhones(youth).length;
    const dateIssues = DataQualityService.dateInconsistencies(youth).length;
    return {
      data: { summary, incomplete, duplicateNameGroups: duplicateNames, duplicatePhoneGroups: duplicatePhones, dateInconsistencies: dateIssues },
      meta: meta({ recordCount: youth.length, source: "data-quality-service" }),
    };
  },

  async getBirthdays({ period = "month" } = {}) {
    const { cities, congregations, youth } = await loadBaseData();
    const cityMap = Object.fromEntries(cities.map((c) => [c.id, c.nome]));
    const congMap = Object.fromEntries(congregations.map((c) => [c.id, c.nome]));
    const month = new Date().getMonth() + 1;
    const matches = youth.filter((y) => {
      if (!y.dataNascimento) return false;
      if (period === "week") return isBirthdayInWeek(y.dataNascimento);
      return isBirthdayInMonth(y.dataNascimento, month);
    });
    const rows = matches.map((y) => ({
      ...toNamedSafeYouth(y),
      dataNascimento: y.dataNascimento,
      cidade: cityMap[y.cidadeId] || "",
      congregacao: congMap[y.congregacaoId] || "",
    }));
    return { data: rows, meta: meta({ filters: { period }, recordCount: rows.length, source: "YouthService" }) };
  },

  async getYouthWithoutCounselor() {
    const { cities, congregations, youth } = await loadBaseData();
    const cityMap = Object.fromEntries(cities.map((c) => [c.id, c.nome]));
    const congMap = Object.fromEntries(congregations.map((c) => [c.id, c.nome]));
    const without = youth.filter((y) => !y.conselheiroLocal);
    const byCity = {};
    without.forEach((y) => {
      const key = cityMap[y.cidadeId] || "Não informado";
      byCity[key] = (byCity[key] || 0) + 1;
    });
    return {
      data: {
        total: without.length,
        percentual: youth.length ? Math.round((without.length / youth.length) * 100 * 10) / 10 : 0,
        porCidade: byCity,
        registros: without.map((y) => ({ ...toNamedSafeYouth(y), cidade: cityMap[y.cidadeId] || "", congregacao: congMap[y.congregacaoId] || "" })),
      },
      meta: meta({ recordCount: without.length, source: "YouthService" }),
    };
  },

  async getMinistryCoverage(cidadeId) {
    const { cities, youth } = await loadBaseData();
    const scoped = cidadeId ? youth.filter((y) => y.cidadeId === cidadeId) : youth;
    const instrumentCounts = {};
    scoped.forEach((y) => {
      if (y.instrumento) instrumentCounts[y.instrumento] = (instrumentCounts[y.instrumento] || 0) + 1;
    });
    const musicos = scoped.filter((y) => !!y.instrumento).length;
    const porCidade = cities.map((c) => {
      const cityYouth = youth.filter((y) => y.cidadeId === c.id);
      return {
        cidade: c.nome,
        musicos: cityYouth.filter((y) => !!y.instrumento).length,
        pregadores: cityYouth.filter((y) => y.prega === true).length,
        cantores: cityYouth.filter((y) => y.canta === true).length,
        instrumentosDistintos: new Set(cityYouth.map((y) => y.instrumento).filter(Boolean)).size,
      };
    });
    return {
      data: {
        totalMusicos: musicos,
        totalPregadores: scoped.filter((y) => y.prega === true).length,
        totalCantores: scoped.filter((y) => y.canta === true).length,
        instrumentos: instrumentCounts,
        porCidade,
      },
      meta: meta({ filters: { cidadeId: cidadeId || "todas" }, recordCount: scoped.length, source: "YouthService" }),
    };
  },

  async getAgeDistribution(cidadeId) {
    const { youth } = await loadBaseData();
    const scoped = cidadeId ? youth.filter((y) => y.cidadeId === cidadeId) : youth;
    const rows = AGE_RANGES.map((r) => ({
      faixa: r.label,
      quantidade: scoped.filter((y) => getAgeRangeKey(y.idade) === r.key).length,
    }));
    const semInfo = scoped.filter((y) => y.idade === null || y.idade === undefined).length;
    return {
      data: { faixas: rows, semInformacao: semInfo },
      meta: meta({ filters: { cidadeId: cidadeId || "todas" }, recordCount: scoped.length, source: "YouthService" }),
    };
  },

  async getAvailableMusicians(cidadeId) {
    const { cities, congregations, youth } = await loadBaseData();
    const cityMap = Object.fromEntries(cities.map((c) => [c.id, c.nome]));
    const congMap = Object.fromEntries(congregations.map((c) => [c.id, c.nome]));
    const scoped = (cidadeId ? youth.filter((y) => y.cidadeId === cidadeId) : youth).filter((y) => !!y.instrumento || y.canta === true || y.prega === true);
    const rows = scoped.map((y) => ({
      ...toNamedSafeYouth(y, ["instrumento", "canta", "prega"]),
      cidade: cityMap[y.cidadeId] || "",
      congregacao: congMap[y.congregacaoId] || "",
    }));
    return { data: rows, meta: meta({ filters: { cidadeId: cidadeId || "todas" }, recordCount: rows.length, source: "YouthService" }) };
  },

  async getIncompleteRegistrations() {
    const { youth } = await loadBaseData();
    const incomplete = DataQualityService.incompleteRecords(youth);
    return {
      data: incomplete.map((r) => ({ ...toNamedSafeYouth(r.youth), camposFaltando: r.faltando.map((f) => f.label), completude: r.score })),
      meta: meta({ recordCount: incomplete.length, source: "data-quality-service" }),
    };
  },

  async getCongregationDistribution(cityIds) {
    const data = await loadBaseData();
    const ids = cityIds && cityIds.length ? cityIds : data.cities.map((c) => c.id);
    const rows = CityComparisonService.congregationBreakdown(ids, data);
    return { data: rows, meta: meta({ filters: { cityIds: ids }, recordCount: rows.length, source: "city-comparison-service" }) };
  },
};

export const TODAY_ISO = todayISO();
