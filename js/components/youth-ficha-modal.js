import { el, refreshIcons } from "../utils/dom-utils.js";
import { openModal } from "./modal.js";
import { toast } from "./toast.js";
import { printNode } from "../utils/print-utils.js";
import { formatDateBR } from "../utils/dates.js";
import { formatBoolean } from "../utils/formatters.js";
import { YOUTH_STATUS_LABELS, SEXO_LABELS, TIPO_ADMISSAO_LABELS } from "../config/constants.js";
import { PreferencesService } from "../services/preferences-service.js";

/**
 * Shared "ficha do jovem" (individual youth report) -- used by Jovens,
 * Qualidade dos Cadastros and Pesquisa Global so the full detail view,
 * print/PDF, WhatsApp summary and leadership card only exist in one place.
 */

export function statusBadge(status) {
  return { ativo: "success", visitante: "info", novo_convertido: "info", ausente: "warning", transferido: "neutral", inativo: "danger" }[status] || "neutral";
}

export function avatarNode(youth, size = "sm") {
  if (youth.foto) {
    return el("img", { src: youth.foto, alt: "", class: size === "lg" ? "ficha-header-photo" : "avatar-thumb" });
  }
  return el("div", { class: size === "lg" ? "ficha-header-photo-placeholder" : "avatar-thumb-placeholder" }, [
    el("i", { "data-lucide": "user", class: size === "lg" ? "icon icon-lg" : "icon icon-sm" }),
  ]);
}

function detailItem(label, value) {
  return el("div", { class: "detail-item" }, [el("span", { class: "detail-item-label" }, label), el("span", { class: "detail-item-value" }, value)]);
}

function fichaHeader(youth, cityLabel, congLabel) {
  return el("div", { class: "ficha-header" }, [
    avatarNode(youth, "lg"),
    el("div", { class: "ficha-header-info" }, [
      el("div", { class: "ficha-header-name" }, youth.nome),
      el(
        "div",
        { class: "ficha-header-meta" },
        [
          youth.codigo ? el("span", {}, `Código ${youth.codigo}`) : null,
          el("span", { class: `badge badge-${statusBadge(youth.status)}` }, YOUTH_STATUS_LABELS[youth.status] || youth.status),
          el("span", {}, cityLabel),
          el("span", {}, congLabel),
        ].filter(Boolean)
      ),
    ]),
  ]);
}

function fichaGrid(youth, cityLabel, congLabel) {
  return el("div", { class: "detail-grid" }, [
    detailItem("Código", youth.codigo || "Não informado"),
    detailItem("Idade", youth.idade === null || youth.idade === undefined ? "Não informado" : `${youth.idade} anos`),
    detailItem("Data de nascimento", formatDateBR(youth.dataNascimento)),
    detailItem("Naturalidade", youth.naturalidade || "Não informado"),
    detailItem("Sexo", SEXO_LABELS[youth.sexo] || "Não informado"),
    detailItem("Telefone", youth.telefone || "Não informado"),
    detailItem("Celular", youth.celular || "Não informado"),
    detailItem("Endereço", youth.endereco || "Não informado"),
    detailItem("Número", youth.numero || "Não informado"),
    detailItem("Bairro", youth.bairro || "Não informado"),
    detailItem("CEP", youth.cep || "Não informado"),
    detailItem("Cidade", cityLabel),
    detailItem("Congregação", congLabel),
    detailItem("Status", YOUTH_STATUS_LABELS[youth.status] || youth.status),
    detailItem("RG", youth.rg || "Não informado"),
    detailItem("Órgão emissor", youth.orgaoEmissor || "Não informado"),
    detailItem("CPF", youth.cpf || "Não informado"),
    detailItem("Escolaridade", youth.escolaridade || "Não informado"),
    detailItem("Profissão", youth.profissao || "Não informado"),
    detailItem("Estado civil", youth.estadoCivil || "Não informado"),
    detailItem("Outro (qual)?", youth.outroEstadoCivil || "Não informado"),
    detailItem("Cônjuge", youth.conjuge || "Não informado"),
    detailItem("Nome do pai", youth.nomePai || "Não informado"),
    detailItem("Nome da mãe", youth.nomeMae || "Não informado"),
    detailItem("Cargo", youth.cargo || "Não informado"),
    detailItem("Pastor", youth.pastor || "Não informado"),
    detailItem("Conselheiro local", youth.conselheiroLocal || "Não informado"),
    detailItem("Conselheiro da cidade", youth.conselheiroCidade || "Não informado"),
    detailItem("Batismo nas águas", youth.dataBatismoAguas ? formatDateBR(youth.dataBatismoAguas) : "Não"),
    detailItem("Batizado no Espírito Santo", formatBoolean(youth.batizadoEspiritoSanto)),
    detailItem("Instrumento", youth.instrumento || "Nenhum"),
    detailItem("Prega", formatBoolean(youth.prega)),
    detailItem("Canta", formatBoolean(youth.canta)),
    detailItem("Outros talentos", youth.outrosTalentos || "Não informado"),
    detailItem("Qtd", youth.qtd || "Não informado"),
    detailItem("Líder de Expansão?", formatBoolean(youth.liderExpansao)),
    detailItem("Se líder, qual?", youth.seLider || "Não informado"),
    detailItem("Qual departamento?", youth.qualDepartamento || "Não informado"),
    detailItem("Nome do dirigente", youth.nomeDirigente || "Não informado"),
    detailItem("Cadastro recebido por", youth.recebidoPor || "Não informado"),
    detailItem("Tipo de admissão", TIPO_ADMISSAO_LABELS[youth.tipoAdmissao] || "Não informado"),
    detailItem("Observações", youth.observacoes || "Não informado"),
    detailItem("Data de entrada", formatDateBR(youth.dataEntrada)),
  ]);
}

function printableFicha(youth, cityLabel, congLabel) {
  return el("div", { class: "ficha-print" }, [
    el("h1", { class: "ficha-print-title" }, "Ficha do jovem"),
    fichaHeader(youth, cityLabel, congLabel),
    fichaGrid(youth, cityLabel, congLabel),
  ]);
}

function leadershipCard(youth, cityLabel, congLabel) {
  return el("div", { class: "ficha-print" }, [
    el("h1", { class: "ficha-print-title" }, "Cartão resumido — reunião de liderança"),
    fichaHeader(youth, cityLabel, congLabel),
    el("div", { class: "detail-grid" }, [
      detailItem("Cidade", cityLabel),
      detailItem("Congregação", congLabel),
      detailItem("Conselheiro local", youth.conselheiroLocal || "Não informado"),
      detailItem("Conselheiro da cidade", youth.conselheiroCidade || "Não informado"),
      detailItem("Pastor", youth.pastor || "Não informado"),
      detailItem("Status", YOUTH_STATUS_LABELS[youth.status] || youth.status),
      detailItem("Instrumento", youth.instrumento || "Nenhum"),
      detailItem("Prega", formatBoolean(youth.prega)),
      detailItem("Canta", formatBoolean(youth.canta)),
      detailItem("Batizado no Espírito Santo", formatBoolean(youth.batizadoEspiritoSanto)),
      detailItem("Observações", youth.observacoes || "Não informado"),
    ]),
  ]);
}

/** Plain-text summary meant to be pasted into WhatsApp -- only fields that
 * make sense to share, never documents (RG/CPF) or address. */
export function buildWhatsAppSummary(youth, cityLabel, congLabel) {
  const lines = [`Nome: ${youth.nome}`, `Cidade: ${cityLabel}`, `Congregação: ${congLabel}`];
  if (youth.conselheiroLocal) lines.push(`Conselheiro local: ${youth.conselheiroLocal}`);
  if (youth.conselheiroCidade) lines.push(`Conselheiro da cidade: ${youth.conselheiroCidade}`);
  if (youth.pastor) lines.push(`Pastor: ${youth.pastor}`);
  const habilidades = [];
  if (youth.instrumento) habilidades.push(`toca ${youth.instrumento}`);
  if (youth.prega) habilidades.push("prega");
  if (youth.canta) habilidades.push("canta");
  if (youth.outrosTalentos) habilidades.push(youth.outrosTalentos);
  if (habilidades.length) lines.push(`Ministério/Habilidades: ${habilidades.join(", ")}`);
  return lines.join("\n");
}

/**
 * Opens the shared ficha modal. `cityLabel`/`congLabel` are passed in
 * (instead of resolved here) so each caller can use whatever city/congregation
 * list it already has loaded -- no extra Supabase/IndexedDB reads.
 */
export function openYouthFicha(youth, cityLabel, congLabel) {
  PreferencesService.addRecentYouth(youth.id, youth.nome);
  const body = el("div", {}, [fichaHeader(youth, cityLabel, congLabel), fichaGrid(youth, cityLabel, congLabel)]);

  openModal({
    title: "Ficha do jovem",
    body,
    size: "modal-lg",
    actions: [
      { label: "Fechar", className: "btn btn-secondary" },
      {
        label: "Imprimir / PDF",
        className: "btn btn-secondary",
        closeOnClick: false,
        onClick: () => {
          printNode(printableFicha(youth, cityLabel, congLabel));
          toast.info('Na tela de impressão, escolha "Salvar como PDF" para gerar um arquivo.');
        },
      },
      {
        label: "Cartão resumido",
        className: "btn btn-secondary",
        closeOnClick: false,
        onClick: () => printNode(leadershipCard(youth, cityLabel, congLabel)),
      },
      {
        label: "Copiar p/ WhatsApp",
        className: "btn btn-secondary",
        closeOnClick: false,
        onClick: async () => {
          try {
            await navigator.clipboard.writeText(buildWhatsAppSummary(youth, cityLabel, congLabel));
            toast.success("Resumo copiado! Cole no WhatsApp.");
          } catch {
            toast.error("Não foi possível copiar automaticamente. Selecione e copie o texto manualmente.");
          }
        },
      },
    ],
  });
  refreshIcons();
}
