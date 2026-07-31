import { YouthService } from "./youth-service.js";
import { EventService } from "./event-service.js";
import { CityService } from "./city-service.js";
import { CongregationService } from "./congregation-service.js";
import { todayISO, isBirthdayInMonth, isBirthdayInWeek } from "../utils/dates.js";
import { averageCompleteness } from "../utils/completeness-utils.js";

/**
 * Aggregates real, actionable alerts for the topbar notification bell.
 * Kept intentionally lightweight (no pagination) since youth/event lists
 * are already loaded fully in-memory elsewhere in the app.
 *
 * Every alert is grouped into one of 4 categories so the dropdown doesn't
 * turn into an unsorted wall of text, and every threshold used below
 * (poucos jovens, completude mínima) is stated explicitly in the alert's own
 * text -- never a silent flag.
 */
export const CATEGORY_LABELS = {
  atencao: "Atenção necessária",
  aniversario: "Aniversários",
  oportunidade: "Oportunidade ministerial",
  informativo: "Informativo",
};
export const CATEGORY_ORDER = ["atencao", "aniversario", "oportunidade", "informativo"];

const POUCOS_JOVENS_LIMITE = 3;
const CONGREGACAO_COMPLETUDE_MINIMA = 50;
const MAX_ANIVERSARIANTES_LISTADOS = 5;

function entry(category, icon, text, href) {
  return { category, icon, text, href };
}

export const NotificationService = {
  async getAlerts() {
    const [youth, events, cities, congregations] = await Promise.all([
      YouthService.list(),
      EventService.upcoming(5),
      CityService.list(),
      CongregationService.list(),
    ]);

    const alerts = [];
    const todayMonthDay = todayISO().slice(5, 10);
    const mesAtual = new Date().getMonth() + 1;

    // --- Aniversários ---
    youth
      .filter((y) => y.dataNascimento && y.dataNascimento.slice(5, 10) === todayMonthDay)
      .forEach((y) => alerts.push(entry("aniversario", "cake", `${y.nome} faz aniversário hoje`, "jovens.html")));

    const estaSemana = youth.filter(
      (y) => y.dataNascimento && y.dataNascimento.slice(5, 10) !== todayMonthDay && isBirthdayInWeek(y.dataNascimento)
    );
    estaSemana
      .slice(0, MAX_ANIVERSARIANTES_LISTADOS)
      .forEach((y) => alerts.push(entry("aniversario", "cake", `${y.nome} faz aniversário esta semana`, "jovens.html")));
    if (estaSemana.length > MAX_ANIVERSARIANTES_LISTADOS) {
      alerts.push(
        entry(
          "aniversario",
          "cake",
          `+${estaSemana.length - MAX_ANIVERSARIANTES_LISTADOS} outro(s) aniversariante(s) esta semana`,
          "jovens.html"
        )
      );
    }

    const esteMesCount = youth.filter((y) => isBirthdayInMonth(y.dataNascimento, mesAtual)).length;
    if (esteMesCount > 0) {
      alerts.push(entry("aniversario", "calendar-heart", `${esteMesCount} aniversariante(s) este mês`, "relatorios.html"));
    }

    // --- Informativo ---
    events.slice(0, 3).forEach((e) =>
      alerts.push(entry("informativo", "calendar", `Evento "${e.titulo}" em ${formatDatePt(e.data)}`, "eventos.html"))
    );

    const poucosJovens = cities
      .map((c) => ({ cidade: c.nome, total: youth.filter((y) => y.cidadeId === c.id).length }))
      .filter((c) => c.total <= POUCOS_JOVENS_LIMITE);
    if (poucosJovens.length > 0) {
      const nomes = poucosJovens.map((c) => `${c.cidade} (${c.total})`).join(", ");
      alerts.push(
        entry(
          "informativo",
          "map-pin",
          `${poucosJovens.length} cidade(s) com ${POUCOS_JOVENS_LIMITE} jovem(ns) ou menos cadastrados -- critério: total ≤ ${POUCOS_JOVENS_LIMITE}. ${nomes}`,
          "relatorios.html"
        )
      );
    }

    // --- Atenção necessária ---
    const incompletos = youth.filter((y) => YouthService.isIncomplete(y).length > 0);
    if (incompletos.length > 0) {
      alerts.push(entry("atencao", "alert-triangle", `${incompletos.length} cadastro(s) com dados incompletos`, "qualidade.html"));
    }

    const semBatismo = youth.filter((y) => !y.dataBatismoAguas);
    if (semBatismo.length > 0) {
      alerts.push(entry("atencao", "droplet", `${semBatismo.length} jovem(ns) sem batismo nas águas registrado`, "relatorios.html"));
    }

    const semConselheiro = youth.filter((y) => !y.conselheiroLocal);
    if (semConselheiro.length > 0) {
      alerts.push(entry("atencao", "user-x", `${semConselheiro.length} jovem(ns) sem conselheiro local definido`, "jovens.html"));
    }

    const congregacoesBaixaCompletude = congregations
      .map((c) => {
        const congYouth = youth.filter((y) => y.congregacaoId === c.id);
        return { nome: c.nome, total: congYouth.length, completude: averageCompleteness(congYouth) };
      })
      .filter((c) => c.total > 0 && c.completude < CONGREGACAO_COMPLETUDE_MINIMA);
    if (congregacoesBaixaCompletude.length > 0) {
      alerts.push(
        entry(
          "atencao",
          "file-warning",
          `${congregacoesBaixaCompletude.length} congregação(ões) com completude média de cadastro abaixo de ${CONGREGACAO_COMPLETUDE_MINIMA}%`,
          "qualidade.html"
        )
      );
    }

    // --- Oportunidade ministerial ---
    const comTalento = youth.filter((y) => y.prega === true || y.canta === true || !!y.instrumento);
    if (comTalento.length > 0) {
      alerts.push(
        entry(
          "oportunidade",
          "sparkles",
          `${comTalento.length} jovem(ns) com talentos identificados (prega, canta ou toca instrumento) -- oportunidade para escalar em ministérios`,
          "relatorios.html"
        )
      );
    }

    return alerts;
  },
};

function formatDatePt(dateStr) {
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
}
