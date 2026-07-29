import { YouthService } from "./youth-service.js";
import { EventService } from "./event-service.js";
import { todayISO } from "../utils/dates.js";

/**
 * Aggregates real, actionable alerts for the topbar notification bell.
 * Kept intentionally lightweight (no pagination) since youth/event lists
 * are already loaded fully in-memory elsewhere in the app.
 */
export const NotificationService = {
  async getAlerts() {
    const [youth, events] = await Promise.all([YouthService.list(), EventService.upcoming(5)]);
    const todayMonthDay = todayISO().slice(5, 10);

    const aniversariantes = youth.filter(
      (y) => y.dataNascimento && y.dataNascimento.slice(5, 10) === todayMonthDay
    );
    const incompletos = youth.filter((y) => YouthService.isIncomplete(y).length > 0);

    const alerts = [];
    aniversariantes.forEach((y) =>
      alerts.push({ icon: "cake", type: "aniversario", text: `${y.nome} faz aniversário hoje`, href: "jovens.html" })
    );
    events.slice(0, 3).forEach((e) =>
      alerts.push({ icon: "calendar", type: "evento", text: `Evento "${e.titulo}" em ${formatDatePt(e.data)}`, href: "eventos.html" })
    );
    if (incompletos.length > 0) {
      alerts.push({
        icon: "alert-triangle",
        type: "incompleto",
        text: `${incompletos.length} cadastro(s) com dados incompletos`,
        href: "jovens.html",
      });
    }

    return alerts;
  },
};

function formatDatePt(dateStr) {
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
}
