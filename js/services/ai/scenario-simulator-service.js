import { YouthService } from "../youth-service.js";
import { DataQualityService } from "../data-quality-service.js";
import { CityService } from "../city-service.js";
import { averageCompleteness } from "../../utils/completeness-utils.js";

/**
 * Funcionalidade 13 -- Simulador de cenários. Every calculation here is
 * plain arithmetic over data already loaded elsewhere in the app; the AI
 * (when configured) is only ever asked to explain/interpret the result
 * that this file already computed -- it never does the math itself. Each
 * function returns { formula, inputs, result, assumptions } so the
 * "mostrar sempre: fórmula, valores de entrada, resultado, arredondamentos,
 * premissas" requirement is met by construction, not left to the model.
 */
export const ScenarioSimulatorService = {
  async counselorsNeeded(youthPerCounselor = 10) {
    const youth = await YouthService.list();
    const total = youth.length;
    const needed = Math.ceil(total / youthPerCounselor);
    return {
      formula: "conselheiros = arredondar_para_cima(total_de_jovens / jovens_por_conselheiro)",
      inputs: { totalJovens: total, jovensPorConselheiro: youthPerCounselor },
      result: needed,
      assumptions: ["Considera todos os jovens cadastrados no sistema, independentemente de já terem conselheiro.", "Não distingue faixa etária ou cidade nesta simulação simples."],
    };
  },

  async participantsIfCitiesSendPercentage(percentage = 20) {
    const [cities, youth] = await Promise.all([CityService.list(), YouthService.list()]);
    const perCity = cities.map((c) => {
      const total = youth.filter((y) => y.cidadeId === c.id).length;
      const enviados = Math.round(total * (percentage / 100));
      return { cidade: c.nome, totalJovens: total, participantesEstimados: enviados };
    });
    const totalParticipantes = perCity.reduce((sum, c) => sum + c.participantesEstimados, 0);
    return {
      formula: "participantes_por_cidade = arredondar(total_de_jovens_da_cidade * percentual)",
      inputs: { percentual: percentage, cidades: perCity.length },
      result: { perCity, totalParticipantes },
      assumptions: ["Assume que o percentual é aplicado igualmente a todas as cidades, sem considerar disponibilidade real."],
    };
  },

  async distributeMusiciansAcrossEvents(numEvents = 3, cidadeId = null) {
    const youth = await YouthService.list();
    const musicians = youth.filter((y) => !!y.instrumento && (!cidadeId || y.cidadeId === cidadeId));
    const base = Math.floor(musicians.length / numEvents);
    const remainder = musicians.length % numEvents;
    const groups = Array.from({ length: numEvents }, (_, i) => base + (i < remainder ? 1 : 0));
    return {
      formula: "músicos_por_evento = dividir_o_mais_igualmente_possível(total_de_músicos, número_de_eventos)",
      inputs: { totalMusicos: musicians.length, numEvents, cidadeId: cidadeId || "todas" },
      result: { groups, totalMusicos: musicians.length },
      assumptions: ["Não considera qual instrumento cada músico toca -- apenas a quantidade total de músicos disponíveis."],
    };
  },

  async completenessIfHalfPendingFixed() {
    const youth = await YouthService.list();
    const currentAvg = averageCompleteness(youth);
    const incomplete = DataQualityService.incompleteRecords(youth);
    const toFix = Math.floor(incomplete.length / 2);
    // Recompute average treating the "fixed" records as 100% complete, everyone else unchanged.
    const unaffectedSum = currentAvg * youth.length - incomplete.slice(0, toFix).reduce((sum, r) => sum + r.score, 0);
    const projectedAvg = youth.length ? Math.round((unaffectedSum + toFix * 100) / youth.length) : currentAvg;
    return {
      formula: "completude_projetada = média(completude_atual dos não corrigidos, 100% para metade dos incompletos corrigidos)",
      inputs: { completudeAtual: currentAvg, totalIncompletos: incomplete.length, corrigidosSimulados: toFix },
      result: { completudeProjetada: projectedAvg },
      assumptions: ["Assume que os registros corrigidos passam a ter 100% de completude nos 8 campos-chave monitorados.", "A escolha de quais registros seriam corrigidos é arbitrária (os primeiros da lista) -- serve apenas para estimar o efeito agregado."],
    };
  },

  distributeIntoGroups(totalParticipants, numGroups) {
    const base = Math.floor(totalParticipants / numGroups);
    const remainder = totalParticipants % numGroups;
    const groups = Array.from({ length: numGroups }, (_, i) => base + (i < remainder ? 1 : 0));
    return {
      formula: "participantes_por_grupo = dividir_o_mais_igualmente_possível(total_de_participantes, número_de_grupos)",
      inputs: { totalParticipants, numGroups },
      result: { groups },
      assumptions: [],
    };
  },

  capacityNeeded(totalParticipants, capacityPerUnit, unitLabel = "ônibus/sala") {
    const units = capacityPerUnit > 0 ? Math.ceil(totalParticipants / capacityPerUnit) : 0;
    return {
      formula: `unidades_necessárias = arredondar_para_cima(total_de_participantes / capacidade_por_${unitLabel})`,
      inputs: { totalParticipants, capacityPerUnit, unitLabel },
      result: units,
      assumptions: ["Não considera reservas de segurança nem ocupação parcial já planejada."],
    };
  },
};
