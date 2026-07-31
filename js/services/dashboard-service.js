import { CityService } from "./city-service.js";
import { CongregationService } from "./congregation-service.js";
import { YouthService } from "./youth-service.js";
import { EventService } from "./event-service.js";
import { applyYouthFilters } from "./filter-service.js";
import { AGE_RANGES, YOUTH_STATUS_LABELS, EVENT_TYPE_LABELS } from "../config/constants.js";
import { calculateAge, isBirthdayInMonth, todayISO } from "../utils/dates.js";

export const MONTH_LABELS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export function monthlyCounts(items, dateGetter, year) {
  const counts = new Array(12).fill(0);
  items.forEach((item) => {
    const dateStr = dateGetter(item);
    if (!dateStr) return;
    const [y, m] = dateStr.split("-").map(Number);
    if (y === year) counts[m - 1] += 1;
  });
  return counts;
}

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
  async build(filters, selectedYear, growthYearRange) {
    const { cities, congregations, youth, events } = await loadRawData();
    const filtered = applyYouthFilters(youth, filters);
    const scopedCongregations =
      filters.cidadeId === "all" ? congregations : congregations.filter((c) => c.cidadeId === filters.cidadeId);
    const scopedCities = filters.cidadeId === "all" ? cities : cities.filter((c) => c.id === filters.cidadeId);
    const year = selectedYear || new Date().getFullYear();
    const availableYears = this.getAvailableYears(youth);
    const range = growthYearRange || {
      from: Math.min(...availableYears),
      to: Math.max(...availableYears),
    };

    return {
      cities,
      congregations,
      allYouthCount: youth.length,
      filtered,
      cards: this.buildCards(filtered, scopedCities, scopedCongregations, events),
      demografia: this.buildDemografia(filtered),
      charts: this.buildCharts(filtered, cities, congregations),
      yearCharts: this.buildYearCharts(filtered, year),
      growth: this.buildGrowthByCity(filtered, cities, range),
      availableYears,
      lists: await this.buildLists(filtered, cities, congregations, events),
    };
  },

  getAvailableYears(youth) {
    const years = new Set([new Date().getFullYear()]);
    youth.forEach((y) => {
      [y.createdAt?.slice(0, 4), y.dataEntrada?.slice(0, 4), y.dataBatismoAguas?.slice(0, 4)]
        .filter(Boolean)
        .forEach((yr) => years.add(Number(yr)));
    });
    return [...years].sort((a, b) => b - a);
  },

  buildDemografia(filtered) {
    const bySexo = (list, sexo) => list.filter((y) => y.sexo === sexo).length;
    const ativos = filtered.filter((y) => y.status === "ativo");
    const semCongregacao = filtered.filter((y) => !y.congregacaoId);
    const todayMonthDay = todayISO().slice(5, 10);
    const currentMonth = new Date().getMonth() + 1;

    return {
      totalGeral: { total: filtered.length, masculino: bySexo(filtered, "masculino"), feminino: bySexo(filtered, "feminino") },
      totalAtivos: { total: ativos.length, masculino: bySexo(ativos, "masculino"), feminino: bySexo(ativos, "feminino") },
      semCongregacao: { total: semCongregacao.length, masculino: bySexo(semCongregacao, "masculino"), feminino: bySexo(semCongregacao, "feminino") },
      aniversariantes: {
        hoje: filtered.filter((y) => y.dataNascimento && y.dataNascimento.slice(5, 10) === todayMonthDay).length,
        mesAtual: filtered.filter((y) => isBirthdayInMonth(y.dataNascimento, currentMonth)).length,
      },
    };
  },

  buildYearCharts(filtered, year) {
    const cadastrosPorMes = monthlyCounts(filtered, (y) => y.createdAt?.slice(0, 10), year);
    const admissoesPorMes = monthlyCounts(filtered, (y) => y.dataEntrada, year);
    const batizadosPorMes = monthlyCounts(filtered, (y) => y.dataBatismoAguas, year);
    return {
      year,
      cadastrosPorMes: { labels: MONTH_LABELS, values: cadastrosPorMes },
      admissoesPorMes: { labels: MONTH_LABELS, values: admissoesPorMes },
      batizadosPorMes: { labels: MONTH_LABELS, values: batizadosPorMes },
    };
  },

  /**
   * Cumulative headcount per city, year by year, inside [from, to] --
   * lets you compare each city's growth trend on the same chart instead of
   * a single-point-in-time breakdown like the other "por cidade" charts.
   * Uses createdAt (when the record entered the system) as the growth
   * signal, since there's no separate "left the group" date to subtract.
   */
  buildGrowthByCity(filtered, cities, { from, to }) {
    const years = [];
    for (let y = from; y <= to; y++) years.push(y);

    const series = cities.map((city) => {
      const cityYouth = filtered.filter((y) => y.cidadeId === city.id);
      const values = years.map(
        (year) => cityYouth.filter((y) => y.createdAt && Number(y.createdAt.slice(0, 4)) <= year).length
      );
      return { label: city.nome, values };
    });

    return { labels: years.map(String), series };
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

    const sexoEntries = [
      { label: "Masculino", value: filtered.filter((y) => y.sexo === "masculino").length },
      { label: "Feminino", value: filtered.filter((y) => y.sexo === "feminino").length },
    ];
    const semSexoInformado = filtered.filter((y) => y.sexo !== "masculino" && y.sexo !== "feminino").length;
    if (semSexoInformado > 0) sexoEntries.push({ label: "Não informado", value: semSexoInformado });

    const aniversariantesPorDia = {
      labels: Array.from({ length: 31 }, (_, i) => String(i + 1)),
      values: new Array(31).fill(0),
    };
    filtered.forEach((y) => {
      if (!y.dataNascimento) return;
      const day = Number(y.dataNascimento.slice(8, 10));
      if (day >= 1 && day <= 31) aniversariantesPorDia.values[day - 1] += 1;
    });

    const faixaEtariaPorSexo = AGE_RANGES.map((range) => {
      const inRange = filtered.filter((y) => y.idade !== null && y.idade !== undefined && y.idade >= range.min && y.idade <= range.max);
      return {
        faixa: range.label,
        total: inRange.length,
        masculino: inRange.filter((y) => y.sexo === "masculino").length,
        feminino: inRange.filter((y) => y.sexo === "feminino").length,
      };
    });
    const semIdade = filtered.filter((y) => y.idade === null || y.idade === undefined);
    if (semIdade.length > 0) {
      faixaEtariaPorSexo.push({
        faixa: "Não informado",
        total: semIdade.length,
        masculino: semIdade.filter((y) => y.sexo === "masculino").length,
        feminino: semIdade.filter((y) => y.sexo === "feminino").length,
      });
    }

    return {
      byCity, byCongregation, statusEntries, ageEntries, batismoAguas, batismoEs, instruments, pregacao, canto,
      sexoEntries, aniversariantesPorDia, faixaEtariaPorSexo,
    };
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
