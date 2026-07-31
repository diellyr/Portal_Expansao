import { CityService } from "./city-service.js";
import { CongregationService } from "./congregation-service.js";
import { YouthService } from "./youth-service.js";
import { calculateAge, getAgeRangeKey } from "../utils/dates.js";
import { averageCompleteness } from "../utils/completeness-utils.js";
import { AGE_RANGES } from "../config/constants.js";

/**
 * Comparador de Cidades -- side-by-side metrics for 2+ selected cities,
 * computed client-side over the same YouthService/CityService/
 * CongregationService reads other pages use (so RLS scoping applies
 * automatically). Reuses AGE_RANGES/getAgeRangeKey and completeness-utils
 * instead of redefining age brackets or a completeness rule here.
 */
export const CityComparisonService = {
  async load() {
    const [cities, congregations, youthRaw] = await Promise.all([
      CityService.list(),
      CongregationService.list(),
      YouthService.list(),
    ]);
    const youth = youthRaw.map((y) => ({ ...y, idade: calculateAge(y.dataNascimento) }));
    return { cities, congregations, youth };
  },

  /** Per-city metrics for the given city ids, in the same order they were passed in. */
  compare(cityIds, { cities, congregations, youth }) {
    return cityIds.map((cidadeId) => {
      const city = cities.find((c) => c.id === cidadeId);
      const cityYouth = youth.filter((y) => y.cidadeId === cidadeId);
      const total = cityYouth.length;
      const comConselheiro = cityYouth.filter((y) => !!y.conselheiroLocal).length;

      return {
        cidadeId,
        cidade: city?.nome || "—",
        total,
        ativos: cityYouth.filter((y) => y.status === "ativo").length,
        congregacoes: congregations.filter((c) => c.cidadeId === cidadeId).length,
        batizadosAguas: cityYouth.filter((y) => !!y.dataBatismoAguas).length,
        batizadosEspiritoSanto: cityYouth.filter((y) => y.batizadoEspiritoSanto === true).length,
        pregadores: cityYouth.filter((y) => y.prega === true).length,
        cantores: cityYouth.filter((y) => y.canta === true).length,
        musicos: cityYouth.filter((y) => !!y.instrumento).length,
        completudeMedia: averageCompleteness(cityYouth),
        percentualComConselheiro: total ? Math.round((comConselheiro / total) * 100) : 0,
        faixaEtaria: AGE_RANGES.map((r) => ({
          key: r.key,
          label: r.label,
          quantidade: cityYouth.filter((y) => getAgeRangeKey(y.idade) === r.key).length,
        })),
      };
    });
  },

  /** Congregations belonging to any of the given cities, with their own per-congregação metrics. */
  congregationBreakdown(cityIds, { cities, congregations, youth }) {
    const cityMap = Object.fromEntries(cities.map((c) => [c.id, c.nome]));
    return congregations
      .filter((c) => cityIds.includes(c.cidadeId))
      .map((c) => {
        const congYouth = youth.filter((y) => y.congregacaoId === c.id);
        return {
          congregacao: c.nome,
          cidade: cityMap[c.cidadeId] || "—",
          total: congYouth.length,
          comConselheiro: congYouth.filter((y) => !!y.conselheiroLocal).length,
          completudeMedia: averageCompleteness(congYouth),
        };
      })
      .sort((a, b) => b.total - a.total);
  },
};
