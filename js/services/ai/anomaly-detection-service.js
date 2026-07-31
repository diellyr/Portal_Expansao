import { YouthService } from "../youth-service.js";
import { CityService } from "../city-service.js";
import { CongregationService } from "../congregation-service.js";
import { calculateAge } from "../../utils/dates.js";
import { averageCompleteness } from "../../utils/completeness-utils.js";
import { normalizeText } from "../../utils/text-utils.js";

/**
 * Funcionalidade 8 -- Detecção de padrões incomuns. Pure, explainable
 * statistics (mean, percentage deviation, concentration ratio) over data
 * already loaded elsewhere -- no AI involved, so this works even without
 * any provider configured. Every result states the rule, the value found,
 * the reference value it was compared against, and a recommendation to
 * verify manually; nothing here is treated as a confirmed fact.
 */
const DEVIATION_THRESHOLD = 0.35; // 35% below/above the regional average triggers a flag
const CONCENTRATION_THRESHOLD = 0.6; // one counselor holding 60%+ of a city's youth

function mean(values) {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
}

export const AnomalyDetectionService = {
  async detect() {
    const [cities, congregations, youthRaw] = await Promise.all([CityService.list(), CongregationService.list(), YouthService.list()]);
    const youth = youthRaw.map((y) => ({ ...y, idade: calculateAge(y.dataNascimento) }));
    const anomalies = [];

    if (youth.length < 10 || cities.length < 2) {
      return { anomalies: [], insufficientData: true };
    }

    const cityStats = cities.map((c) => {
      const cityYouth = youth.filter((y) => y.cidadeId === c.id);
      const comConselheiro = cityYouth.filter((y) => !!y.conselheiroLocal).length;
      return {
        cidade: c.nome,
        total: cityYouth.length,
        percentualComConselheiro: cityYouth.length ? comConselheiro / cityYouth.length : null,
        completude: averageCompleteness(cityYouth),
        instrumentosDistintos: new Set(cityYouth.map((y) => y.instrumento).filter(Boolean)).size,
        musicos: cityYouth.filter((y) => !!y.instrumento).length,
      };
    }).filter((s) => s.total > 0);

    // Rule 1: cidade com muitos jovens e percentual de conselheiro bem abaixo da média regional.
    const avgConselheiro = mean(cityStats.map((s) => s.percentualComConselheiro).filter((v) => v !== null));
    cityStats.forEach((s) => {
      if (s.percentualComConselheiro === null || s.total < 5) return;
      const deviation = avgConselheiro ? (avgConselheiro - s.percentualComConselheiro) / avgConselheiro : 0;
      if (deviation >= DEVIATION_THRESHOLD) {
        anomalies.push({
          rule: "Cidade com muitos jovens e poucos conselheiros",
          reference: `Média regional de cobertura por conselheiro: ${Math.round(avgConselheiro * 100)}%`,
          value: `${s.cidade}: ${Math.round(s.percentualComConselheiro * 100)}% dos jovens têm conselheiro`,
          possibleExplanations: ["Cadastros não atualizados com o conselheiro responsável", "Cidade com crescimento recente de jovens sem realocação de conselheiros"],
          recommendation: `Verificar manualmente os cadastros de ${s.cidade} sem conselheiro definido.`,
        });
      }
    });

    // Rule 2: grande quantidade de cadastros incompletos (completude bem abaixo da média).
    const avgCompletude = mean(cityStats.map((s) => s.completude));
    cityStats.forEach((s) => {
      const deviation = avgCompletude ? (avgCompletude - s.completude) / avgCompletude : 0;
      if (deviation >= DEVIATION_THRESHOLD && s.total >= 5) {
        anomalies.push({
          rule: "Completude de cadastro bem abaixo da média regional",
          reference: `Completude média regional: ${avgCompletude}%`,
          value: `${s.cidade}: completude média de ${s.completude}%`,
          possibleExplanations: ["Cadastros recentes ainda não finalizados", "Falta de acompanhamento administrativo local"],
          recommendation: `Priorizar revisão de cadastros em ${s.cidade} na Central de Qualidade dos Cadastros.`,
        });
      }
    });

    // Rule 3: cidade com pouca diversidade de instrumentos frente à quantidade de músicos.
    cityStats.forEach((s) => {
      if (s.musicos >= 5 && s.instrumentosDistintos <= 1) {
        anomalies.push({
          rule: "Baixa diversidade de instrumentos",
          reference: "Referência: mais de 1 instrumento distinto esperado a partir de 5 músicos cadastrados",
          value: `${s.cidade}: ${s.musicos} músico(s) cadastrados, ${s.instrumentosDistintos} instrumento(s) distinto(s)`,
          possibleExplanations: ["Concentração real em um instrumento", "Outros instrumentistas podem não estar cadastrados corretamente"],
          recommendation: `Verificar se há outros instrumentistas em ${s.cidade} ainda não registrados e avaliar oportunidades de capacitação.`,
        });
      }
    });

    // Rule 4: um único conselheiro associado a uma concentração muito alta de jovens em uma cidade.
    cities.forEach((c) => {
      const cityYouth = youth.filter((y) => y.cidadeId === c.id && y.conselheiroLocal);
      if (cityYouth.length < 5) return;
      const counts = new Map();
      cityYouth.forEach((y) => {
        const key = normalizeText(y.conselheiroLocal);
        counts.set(key, (counts.get(key) || 0) + 1);
      });
      const [topName, topCount] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0] || [];
      if (topName && topCount / cityYouth.length >= CONCENTRATION_THRESHOLD) {
        anomalies.push({
          rule: "Concentração de jovens em um único conselheiro",
          reference: `Referência: concentração acima de ${Math.round(CONCENTRATION_THRESHOLD * 100)}% em uma única pessoa`,
          value: `${c.nome}: um conselheiro responde por ${Math.round((topCount / cityYouth.length) * 100)}% dos jovens com conselheiro definido`,
          possibleExplanations: ["Distribuição real desigual entre conselheiros", "Cadastro desatualizado após troca de conselheiro"],
          recommendation: `Avaliar com a liderança de ${c.nome} se a carga está distribuída de forma sustentável.`,
        });
      }
    });

    // Rule 5: congregação com muitas datas de nascimento ausentes.
    congregations.forEach((cong) => {
      const congYouth = youth.filter((y) => y.congregacaoId === cong.id);
      if (congYouth.length < 5) return;
      const semData = congYouth.filter((y) => !y.dataNascimento).length;
      const percentual = semData / congYouth.length;
      if (percentual >= DEVIATION_THRESHOLD) {
        anomalies.push({
          rule: "Muitas datas de nascimento ausentes",
          reference: "Referência: mais de 35% dos cadastros sem data de nascimento",
          value: `${cong.nome}: ${semData} de ${congYouth.length} cadastros sem data de nascimento (${Math.round(percentual * 100)}%)`,
          possibleExplanations: ["Campo não preenchido no cadastro inicial", "Importação de planilha sem essa coluna mapeada"],
          recommendation: `Solicitar atualização cadastral aos responsáveis por ${cong.nome}.`,
        });
      }
    });

    return { anomalies, insufficientData: anomalies.length === 0 && youth.length < 20 };
  },
};
