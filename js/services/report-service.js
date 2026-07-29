import { CityService } from "./city-service.js";
import { CongregationService } from "./congregation-service.js";
import { YouthService } from "./youth-service.js";
import { applyYouthFilters } from "./filter-service.js";
import { AGE_RANGES, YOUTH_STATUS_LABELS } from "../config/constants.js";
import { calculateAge, isBirthdayInMonth } from "../utils/dates.js";
import { formatPercent } from "../utils/formatters.js";

async function scopedYouth(filters) {
  const [cities, congregations, youthRaw] = await Promise.all([
    CityService.list(),
    CongregationService.list(),
    YouthService.list(),
  ]);
  const youth = youthRaw.map((y) => ({ ...y, idade: calculateAge(y.dataNascimento) }));
  let filtered = applyYouthFilters(youth, filters);
  if (filters.completude === "completos") {
    filtered = filtered.filter((y) => YouthService.isIncomplete(y).length === 0);
  } else if (filters.completude === "incompletos") {
    filtered = filtered.filter((y) => YouthService.isIncomplete(y).length > 0);
  }
  return { cities, congregations, youth: filtered };
}

export const ReportService = {
  async porCidade(filters) {
    const { cities, youth } = await scopedYouth(filters);
    const total = youth.length;
    return cities.map((city) => {
      const qtd = youth.filter((y) => y.cidadeId === city.id).length;
      return { cidade: city.nome, quantidade: qtd, percentual: formatPercent(qtd, total) };
    });
  },

  async porCongregacao(filters) {
    const { congregations, youth, cities } = await scopedYouth(filters);
    const cityMap = Object.fromEntries(cities.map((c) => [c.id, c.nome]));
    const total = youth.length;
    return congregations
      .map((c) => {
        const qtd = youth.filter((y) => y.congregacaoId === c.id).length;
        return { congregacao: c.nome, cidade: cityMap[c.cidadeId], quantidade: qtd, percentual: formatPercent(qtd, total) };
      })
      .filter((r) => r.quantidade > 0)
      .sort((a, b) => b.quantidade - a.quantidade);
  },

  async porStatus(filters) {
    const { youth } = await scopedYouth(filters);
    const total = youth.length;
    return Object.entries(YOUTH_STATUS_LABELS).map(([key, label]) => {
      const qtd = youth.filter((y) => y.status === key).length;
      return { status: label, quantidade: qtd, percentual: formatPercent(qtd, total) };
    });
  },

  async porFaixaEtaria(filters) {
    const { youth } = await scopedYouth(filters);
    const total = youth.length;
    const rows = AGE_RANGES.map((range) => {
      const qtd = youth.filter((y) => y.idade !== null && y.idade >= range.min && y.idade <= range.max).length;
      return { faixa: range.label, quantidade: qtd, percentual: formatPercent(qtd, total) };
    });
    const semInfo = youth.filter((y) => y.idade === null || y.idade === undefined).length;
    if (semInfo) rows.push({ faixa: "Não informado", quantidade: semInfo, percentual: formatPercent(semInfo, total) });
    return rows;
  },

  async batismoAguas(filters) {
    const { youth } = await scopedYouth(filters);
    const total = youth.length;
    const batizados = youth.filter((y) => !!y.dataBatismoAguas).length;
    const naoBatizados = youth.filter((y) => y.dataBatismoAguas === null && y.dataNascimento).length;
    const naoInformado = total - batizados - naoBatizados;
    return [
      { situacao: "Batizados", quantidade: batizados, percentual: formatPercent(batizados, total) },
      { situacao: "Não batizados", quantidade: naoBatizados, percentual: formatPercent(naoBatizados, total) },
      { situacao: "Não informado", quantidade: naoInformado, percentual: formatPercent(naoInformado, total) },
    ];
  },

  async batismoEspiritoSanto(filters) {
    const { youth } = await scopedYouth(filters);
    const total = youth.length;
    const sim = youth.filter((y) => y.batizadoEspiritoSanto === true).length;
    const nao = youth.filter((y) => y.batizadoEspiritoSanto === false).length;
    const naoInformado = total - sim - nao;
    return [
      { situacao: "Sim", quantidade: sim, percentual: formatPercent(sim, total) },
      { situacao: "Não", quantidade: nao, percentual: formatPercent(nao, total) },
      { situacao: "Não informado", quantidade: naoInformado, percentual: formatPercent(naoInformado, total) },
    ];
  },

  async talentos(filters) {
    const { youth } = await scopedYouth(filters);
    const instrumentCounts = {};
    youth.forEach((y) => {
      if (y.instrumento) instrumentCounts[y.instrumento] = (instrumentCounts[y.instrumento] || 0) + 1;
    });
    return {
      pregam: youth.filter((y) => y.prega === true).length,
      cantam: youth.filter((y) => y.canta === true).length,
      instrumentos: Object.entries(instrumentCounts).map(([instrumento, quantidade]) => ({ instrumento, quantidade })),
      outrosTalentos: youth.filter((y) => y.outrosTalentos).map((y) => ({ nome: y.nome, talento: y.outrosTalentos })),
    };
  },

  async aniversariantes(filters, month) {
    const { youth, cities, congregations } = await scopedYouth(filters);
    const cityMap = Object.fromEntries(cities.map((c) => [c.id, c.nome]));
    const congMap = Object.fromEntries(congregations.map((c) => [c.id, c.nome]));
    return youth
      .filter((y) => isBirthdayInMonth(y.dataNascimento, month))
      .map((y) => ({
        nome: y.nome,
        dataNascimento: y.dataNascimento,
        cidade: cityMap[y.cidadeId] || "",
        congregacao: congMap[y.congregacaoId] || "",
      }))
      .sort((a, b) => a.dataNascimento.slice(5, 10).localeCompare(b.dataNascimento.slice(5, 10)));
  },

  async dadosIncompletos(filters) {
    const { youth, cities, congregations } = await scopedYouth(filters);
    const cityMap = Object.fromEntries(cities.map((c) => [c.id, c.nome]));
    const congMap = Object.fromEntries(congregations.map((c) => [c.id, c.nome]));
    return youth
      .map((y) => ({ y, faltando: YouthService.isIncomplete(y) }))
      .filter((r) => r.faltando.length > 0)
      .map((r) => ({
        nome: r.y.nome,
        cidade: cityMap[r.y.cidadeId] || "",
        congregacao: congMap[r.y.congregacaoId] || "",
        camposFaltando: r.faltando.join(", "),
      }));
  },

  async comparativoCidades(filters) {
    const { cities, congregations, youth } = await scopedYouth(filters);
    const total = youth.length;
    return cities.map((city) => {
      const cityYouth = youth.filter((y) => y.cidadeId === city.id);
      return {
        cidade: city.nome,
        total: cityYouth.length,
        ativos: cityYouth.filter((y) => y.status === "ativo").length,
        visitantes: cityYouth.filter((y) => y.status === "visitante").length,
        congregacoes: congregations.filter((c) => c.cidadeId === city.id).length,
        batizadosAguas: cityYouth.filter((y) => !!y.dataBatismoAguas).length,
        batizadosEspiritoSanto: cityYouth.filter((y) => y.batizadoEspiritoSanto === true).length,
        pregadores: cityYouth.filter((y) => y.prega === true).length,
        cantores: cityYouth.filter((y) => y.canta === true).length,
        musicos: cityYouth.filter((y) => !!y.instrumento).length,
        percentualRegional: formatPercent(cityYouth.length, total),
      };
    });
  },
};
