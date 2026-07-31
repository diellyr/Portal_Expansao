import { el } from "../utils/dom-utils.js";
import { formatDateBR, todayISO } from "../utils/dates.js";
import { YOUTH_STATUS_LABELS } from "../config/constants.js";

/**
 * Text/print builders shared by Gerador de Listas para Eventos -- kept
 * separate from the page so the same "nomes só", "texto para WhatsApp" and
 * "lista imprimível" formats stay in one place instead of being redefined
 * wherever a filtered youth list needs to be shared or printed.
 */

/** Plain list of names, one per line -- e.g. for pasting into an attendance sheet. */
export function buildNamesText(rows) {
  return rows.map((r) => r.nome).join("\n");
}

/** WhatsApp-ready text (uses WhatsApp's *bold* markdown) -- never includes RG/CPF/address. */
export function buildWhatsAppListText(rows, title) {
  const lines = [`*${title || "Lista de jovens"}*`, `Total: ${rows.length} jovem(ns)`, ""];
  rows.forEach((r, i) => {
    const parts = [r.nome];
    if (r.cidadeNome) parts.push(r.cidadeNome);
    if (r.telefone || r.celular) parts.push(r.telefone || r.celular);
    lines.push(`${i + 1}. ${parts.join(" - ")}`);
  });
  return lines.join("\n");
}

/** Printable DOM node for printNode()/window.print() -- same fields shown in the results table. */
export function buildPrintableList(rows, title) {
  const headers = ["Nome", "Idade", "Cidade", "Congregação", "Telefone", "Conselheiro local", "Status"];
  return el("div", { class: "ficha-print" }, [
    el("h1", { class: "ficha-print-title" }, title || "Lista de jovens"),
    el("p", {}, `Total: ${rows.length} jovem(ns) -- gerado em ${formatDateBR(todayISO())}`),
    el("table", { class: "data-table" }, [
      el("thead", {}, el("tr", {}, headers.map((h) => el("th", {}, h)))),
      el(
        "tbody",
        {},
        rows.map((r) =>
          el("tr", {}, [
            el("td", {}, r.nome),
            el("td", {}, r.idade === null || r.idade === undefined ? "Não informado" : `${r.idade} anos`),
            el("td", {}, r.cidadeNome || "—"),
            el("td", {}, r.congregacaoNome || "—"),
            el("td", {}, r.telefone || r.celular || "—"),
            el("td", {}, r.conselheiroLocal || "—"),
            el("td", {}, YOUTH_STATUS_LABELS[r.status] || r.status || "—"),
          ])
        )
      ),
    ]),
  ]);
}
