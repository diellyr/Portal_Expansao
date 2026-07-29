import { CityService } from "./city-service.js";
import { CongregationService } from "./congregation-service.js";
import { YouthService } from "./youth-service.js";
import { EventService } from "./event-service.js";
import { applyYouthFilters } from "./filter-service.js";
import { AGE_RANGES, YOUTH_STATUS_LABELS, EVENT_TYPE_LABELS } from "../config/constants.js";
import { calculateAge, isBirthdayInMonth } from "../utils/dates.js";

async function loadRawData() {
  const [cities, congregations, youthRaw, events] = await Promise.all([
    CityService.list(),
    CongregationService.list(),
    YouthService.list(),
    EventService.list(),
  ]);
  const youth = youthRaw.map((y) => ({ ...y, idade: calculateAge(y.dataNascimento) }));
  return { cities, congregations, youth, events };
}

export const DashboardService = {
  async build(filters) {
    const { cities, congregations, youth, events } = await loadRawData();
    const filtered = applyYouthFilters(youth, filters);
    const scopedCongregations =
      filters.cidadeId === "all" ? congregations : congregations.filter((c) => c.cidadeId === filters.cidadeId);
    const scopedCities = filters.cidadeId === "all" ? cities : cities.filter((c) => c.id === filters.cidadeId);

    return {
      cities,
      congregations,
      allYouthCount: youth.length,
      filtered,
      cards: this.buildCards(filtered, scopedCities, scopedCongregations, events),
      charts: this.buildCharts(filtered, cities, congregations),
      lists: await this.buildLists(filtered, cities, congregations, events),
    };
  },

  buildCards(filtered, scopedCities, scopedCongregations, events) {
    const today = new Date().toISOString().slice(0, 10);
    return {
      total: filtered.length,
      ativos: filtered.filter((y) => y.status === "ativo").length,
      visitantes: filtered.filter((y) => y.status === "visitante").length,
      novosConvertidos: filtered.filter((y) => y.status === "novo_convertido").length,
      totalCidades: scopedCities.length,
      totalCongregacoes: scopedCongregations.length,
      batizadosAguas: filtered.filter((y) => !!y.dataBatismoAguas).length,
      batizadosEspiritoSanto: filtered.filter((y) => y.batizadoEspiritoSanto === true).length,
      pregam: filtered.filter((y) => y.prega === true).length,
      cantam: filtered.filter((y) => y.canta === true).length,
      proximosEventos: events.filter((e) => e.data >= today).length,
    };
  },

  buildCharts(filtered, cities, congregations) {
    const byCity = cities.map((city) => ({
      label: city.nome,
      value: filtered.filter((y) => y.cidadeId === city.id).length,
    }));

    const byCongregation = congregations
      .map((cong) => ({
        label: cong.nome,
        value: filtered.filter((y) => y.congregacaoId === cong.id).length,
      }))
      .filter((c) => c.value > 0)
      .sort((a, b) => b.value - a.value);

    const statusEntries = Object.entries(YOUTH_STATUS_LABELS).map(([key, label]) => ({
      label,
      value: filtered.filter((y) => y.status === key).length,
    }));

    const ageEntries = AGE_RANGES.map((range) => ({
      label: range.label,
      value: filtered.filter((y) => {
        if (y.idade === null || y.idade === undefined) return false;
        return y.idade >= range.min && y.idade <= range.max;
      }).length,
    }));
    const naoInformadoIdade = filtered.filter((y) => y.idade === null || y.idade === undefined).length;
    if (naoInformadoIdade > 0) ageEntries.push({ label: "Não informado", value: naoInformadoIdade });

    const batismoAguas = [
      { label: "Batizados", value: filtered.filter((y) => !!y.dataBatismoAguas).length },
      { label: "Não batizados", value: filtered.filter((y) => !y.dataBatismoAguas).length },
    ];

    const batismoEs = [
      { label: "Sim", value: filtered.filter((y) => y.batizadoEspiritoSanto === true).length },
      { label: "Não", value: filtered.filter((y) => y.batizadoEspiritoSanto === false).length },
    ];
    const esNaoInformado = filtered.filter((y) => y.batizadoEspiritoSanto !== true && y.batizadoEspiritoSanto !== false).length;
    if (esNaoInformado > 0) batismoEs.push({ label: "Não informado", value: esNaoInformado });

    const instrumentCounts = {};
    filtered.forEach((y) => {
      if (y.instrumento) instrumentCounts[y.instrumento] = (instrumentCounts[y.instrumento] || 0) + 1;
    });
    const instruments = Object.entries(instrumentCounts)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);

    const pregacao = [
      { label: "Pregam", value: filtered.filter((y) => y.prega === true).length },
      { label: "Não pregam", value: filtered.filter((y) => y.prega !== true).length },
    ];

    const canto = [
      { label: "Cantam", value: filtered.filter((y) => y.canta === true).length },
      { label: "Não cantam", value: filtered.filter((y) => y.canta !== true).length },
    ];

    return { byCity, byCongregation, statusEntries, ageEntries, batismoAguas, batismoEs, instruments, pregacao, canto };
  },

  async buildLists(filtered, cities, congregations, events) {
    const currentMonth = new Date().getMonth() + 1;
    const aniversariantes = filtered
      .filter((y) => isBirthdayInMonth(y.dataNascimento, currentMonth))
      .sort((a, b) => a.dataNascimento.slice(5, 10).localeCompare(b.dataNascimento.slice(5, 10)));

    const proximosEventos = await EventService.upcoming(6);

    const recentes = [...filtered]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 6);

    const cityMap = Object.fromEntries(cities.map((c) => [c.id, c.nome]));
    const congMap = Object.fromEntries(congregations.map((c) => [c.id, c.nome]));

    const cidadesRanking = cities
      .map((city) => ({ nome: city.nome, total: filtered.filter((y) => y.cidadeId === city.id).length }))
      .sort((a, b) => b.total - a.total);

    const congregacoesRanking = congregations
      .map((cong) => ({ nome: cong.nome, total: filtered.filter((y) => y.congregacaoId === cong.id).length }))
      .filter((c) => c.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);

    const instrumentGroups = {};
    filtered.forEach((y) => {
      if (y.instrumento) {
        instrumentGroups[y.instrumento] = instrumentGroups[y.instrumento] || [];
        instrumentGroups[y.instrumento].push(y.nome);
      }
    });

    const incompletos = filtered.filter((y) => YouthService.isIncomplete(y).length > 0).slice(0, 8);

    return {
      aniversariantes,
      proximosEventos: proximosEventos.map((e) => ({ ...e, cidadeNome: cityMap[e.cidadeId], tipoLabel: EVENT_TYPE_LABELS[e.tipo] })),
      recentes: recentes.map((y) => ({ ...y, cidadeNome: cityMap[y.cidadeId], congregacaoNome: congMap[y.congregacaoId] })),
      cidadesRanking,
      congregacoesRanking,
      instrumentGroups,
      incompletos: incompletos.map((y) => ({ ...y, faltando: YouthService.isIncomplete(y) })),
    };
  },
};
