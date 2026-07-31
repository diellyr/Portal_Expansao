import { ContextFunctions } from "./context-functions.js";

/**
 * Funcionalidade 14 -- Perguntas sugeridas automaticamente. Only suggests
 * questions the module can actually answer with the data/scope currently
 * available (never a question that would need data the user can't see or
 * that the system doesn't have), per "não sugerir perguntas que o sistema
 * não possa responder".
 */
export const SuggestedQuestionsService = {
  async getSuggestions() {
    const [scope, quality, withoutCounselor] = await Promise.all([
      ContextFunctions.getCurrentUserScope(),
      ContextFunctions.getRegistrationQuality(),
      ContextFunctions.getYouthWithoutCounselor(),
    ]);

    const suggestions = ["O que precisa de atenção nesta semana?", "Gere um resumo regional.", "Mostre padrões incomuns."];

    if (quality.data?.summary?.incompletos > 0) {
      suggestions.push("Qual cidade possui mais cadastros incompletos?");
      suggestions.push("Quais congregações precisam atualizar os dados?");
    }
    if (withoutCounselor.data?.total > 0) {
      suggestions.push("Onde existem mais jovens sem conselheiro?");
    }
    suggestions.push("Quem faz aniversário nos próximos 30 dias?");

    if (scope.data?.isRegionalScope) {
      suggestions.push("Compare as cidades da região.");
      suggestions.push("Analise a cobertura de músicos.");
    }

    suggestions.push("Gere uma pauta para a próxima reunião.");
    suggestions.push("Crie um plano de atualização cadastral.");
    suggestions.push("Simule a participação no próximo evento.");

    return suggestions;
  },
};
