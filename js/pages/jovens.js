import { bootstrapPage } from "../app.js";
import { YouthService } from "../services/youth-service.js";
import { CityService } from "../services/city-service.js";
import { CongregationService } from "../services/congregation-service.js";
import { defaultFilters, applyYouthFilters, availableCongregations } from "../services/filter-service.js";
import { BackupService } from "../services/backup-service.js";
import { renderFilterBar, renderFilterChips } from "../components/filter-bar.js";
import { renderDataTable, sortRows } from "../components/data-table.js";
import { renderPagination } from "../components/pagination.js";
import { openModal, confirmModal } from "../components/modal.js";
import { toast } from "../components/toast.js";
import { el, qs, debounce, refreshIcons } from "../utils/dom-utils.js";
import { calculateAge, formatDateBR } from "../utils/dates.js";
import { formatBoolean } from "../utils/formatters.js";
import { YOUTH_STATUS_LABELS, AGE_RANGES } from "../config/constants.js";

const ok = await bootstrapPage({ activeKey: "jovens", title: "Jovens" });
if (ok) init();

let allYouth = [];
let cities = [];
let congregations = [];
let instruments = [];
let filters = defaultFilters();
let searchTerm = "";
let sort = { key: "nome", dir: "asc" };
let page = 1;
const pageSize = 12;

async function init() {
  [cities, congregations] = await Promise.all([CityService.list(), CongregationService.list()]);
  await loadAndRender();

  qs("#search-input").addEventListener(
    "input",
    debounce((e) => {
      searchTerm = e.target.value;
      page = 1;
      render();
    }, 250)
  );

  qs("#export-btn").addEventListener("click", async () => {
    const rows = getFilteredSorted();
    await BackupService.exportYouthCSV(rows, cities, congregations);
    toast.success("Exportação CSV concluída.");
  });

  qs("#export-excel-btn").addEventListener("click", async () => {
    const rows = getFilteredSorted();
    try {
      await BackupService.exportYouthExcel(rows, cities, congregations);
      toast.success("Exportação Excel concluída.");
    } catch {
      toast.error("Não foi possível exportar em Excel.");
    }
  });

  qs("#new-youth-btn").addEventListener("click", () => openYouthForm());

  renderFiltersUI();
}

async function loadAndRender() {
  const youth = await YouthService.list();
  allYouth = youth.map((y) => ({ ...y, idade: calculateAge(y.dataNascimento) }));
  instruments = [...new Set(allYouth.map((y) => y.instrumento).filter(Boolean))].sort();
  render();
}

function renderFiltersUI() {
  renderFilterBar(qs("#global-filters"), {
    cities,
    congregations,
    instruments,
    filters,
    onChange: (newFilters) => {
      filters = newFilters;
      page = 1;
      renderFiltersUI();
      render();
    },
  });
  renderFilterChips(
    qs("#filter-chips"),
    filters,
    {
      cityName: (id) => cities.find((c) => c.id === id)?.nome || "",
      congregationName: (id) => congregations.find((c) => c.id === id)?.nome || "",
      statusLabel: (key) => YOUTH_STATUS_LABELS[key] || key,
      ageRangeLabel: (key) => AGE_RANGES.find((r) => r.key === key)?.label || key,
    },
    (key) => {
      filters = { ...filters, [key]: key === "dataInicio" || key === "dataFim" ? "" : "all" };
      page = 1;
      renderFiltersUI();
      render();
    }
  );
}

function cityName(id) {
  return cities.find((c) => c.id === id)?.nome || "—";
}
function congName(id) {
  return congregations.find((c) => c.id === id)?.nome || "—";
}

function getFilteredSorted() {
  let rows = applyYouthFilters(allYouth, filters);
  if (searchTerm) rows = rows.filter((y) => y.nome.toLowerCase().includes(searchTerm.toLowerCase()));
  return sortRows(rows, sort);
}

function render() {
  const rows = getFilteredSorted();
  const start = (page - 1) * pageSize;
  const pageRows = rows.slice(start, start + pageSize);

  renderDataTable(qs("#youth-table"), {
    columns: [
      { key: "nome", label: "Nome" },
      { key: "idade", label: "Idade", render: (r) => (r.idade === null ? "Não informado" : `${r.idade} anos`) },
      { key: "cidadeId", label: "Cidade", render: (r) => cityName(r.cidadeId) },
      { key: "congregacaoId", label: "Congregação", render: (r) => congName(r.congregacaoId) },
      {
        key: "status",
        label: "Status",
        render: (r) => `<span class="badge badge-${statusBadge(r.status)}">${YOUTH_STATUS_LABELS[r.status] || r.status}</span>`,
      },
      { key: "dataBatismoAguas", label: "Batismo águas", render: (r) => (r.dataBatismoAguas ? formatDateBR(r.dataBatismoAguas) : "Não") },
    ],
    rows: pageRows,
    sort,
    onSortChange: (key) => {
      sort = { key, dir: sort.key === key && sort.dir === "asc" ? "desc" : "asc" };
      render();
    },
    actions: (row) => [
      { icon: "eye", label: "Ver detalhes", onClick: () => openYouthDetails(row) },
      { icon: "pencil", label: "Editar", onClick: () => openYouthForm(row) },
      { icon: "trash-2", label: "Excluir", onClick: () => removeYouth(row) },
    ],
    emptyMessage: "Nenhum jovem encontrado com os filtros atuais.",
  });

  renderPagination(qs("#youth-pagination"), {
    page,
    pageSize,
    total: rows.length,
    onPageChange: (p) => {
      page = p;
      render();
    },
  });
}

function statusBadge(status) {
  return { ativo: "success", visitante: "info", novo_convertido: "info", ausente: "warning", transferido: "neutral", inativo: "danger" }[status] || "neutral";
}

function detailItem(label, value) {
  return el("div", { class: "detail-item" }, [el("span", { class: "detail-item-label" }, label), el("span", { class: "detail-item-value" }, value)]);
}

function openYouthDetails(youth) {
  const body = el("div", { class: "detail-grid" }, [
    detailItem("Idade", youth.idade === null ? "Não informado" : `${youth.idade} anos`),
    detailItem("Data de nascimento", formatDateBR(youth.dataNascimento)),
    detailItem("Telefone", youth.telefone || "Não informado"),
    detailItem("Bairro", youth.bairro || "Não informado"),
    detailItem("Cidade", cityName(youth.cidadeId)),
    detailItem("Congregação", congName(youth.congregacaoId)),
    detailItem("Status", YOUTH_STATUS_LABELS[youth.status]),
    detailItem("Nome do pai", youth.nomePai || "Não informado"),
    detailItem("Nome da mãe", youth.nomeMae || "Não informado"),
    detailItem("Pastor", youth.pastor || "Não informado"),
    detailItem("Conselheiro local", youth.conselheiroLocal || "Não informado"),
    detailItem("Conselheiro da cidade", youth.conselheiroCidade || "Não informado"),
    detailItem("Batismo nas águas", youth.dataBatismoAguas ? formatDateBR(youth.dataBatismoAguas) : "Não"),
    detailItem("Batizado no Espírito Santo", formatBoolean(youth.batizadoEspiritoSanto)),
    detailItem("Instrumento", youth.instrumento || "Nenhum"),
    detailItem("Prega", formatBoolean(youth.prega)),
    detailItem("Canta", formatBoolean(youth.canta)),
    detailItem("Outros talentos", youth.outrosTalentos || "Não informado"),
    detailItem("Observações", youth.observacoes || "Não informado"),
    detailItem("Data de entrada", formatDateBR(youth.dataEntrada)),
  ]);
  openModal({ title: youth.nome, body, size: "modal-lg", actions: [{ label: "Fechar", className: "btn btn-secondary" }] });
}

function field(id, label, inputEl, required = false) {
  return el("div", { class: "form-group" }, [
    el("label", { for: id, class: required ? "required" : "" }, label),
    inputEl,
    el("span", { class: "form-error", id: `error-${id.replace("field-", "")}` }),
  ]);
}

function textInput(id, value, type = "text") {
  return el("input", { type, id, class: "form-control", value: value || "" });
}

function checkboxField(id, label, checked) {
  return el("div", { class: "form-checkbox-row" }, [
    el("input", { type: "checkbox", id, checked: checked || undefined }),
    el("label", { for: id }, label),
  ]);
}

function openYouthForm(youth) {
  const isEdit = !!youth;
  const data = youth || {
    nome: "", dataNascimento: "", telefone: "", bairro: "", cidadeId: cities[0]?.id || "", congregacaoId: "",
    status: "ativo", nomePai: "", nomeMae: "", pastor: "", conselheiroLocal: "", conselheiroCidade: "",
    dataBatismoAguas: "", batizadoEspiritoSanto: false, instrumento: "", prega: false, canta: false,
    outrosTalentos: "", observacoes: "", dataEntrada: new Date().toISOString().slice(0, 10),
  };

  const citySelect = el("select", { id: "field-cidadeId", class: "form-control" }, cities.map((c) => new Option(c.nome, c.id, false, c.id === data.cidadeId)));
  const congSelect = el("select", { id: "field-congregacaoId", class: "form-control" });

  function refreshCongregationOptions() {
    const options = availableCongregations(congregations, citySelect.value);
    congSelect.innerHTML = "";
    options.forEach((c) => congSelect.appendChild(new Option(c.nome, c.id, false, c.id === data.congregacaoId)));
  }
  refreshCongregationOptions();
  citySelect.addEventListener("change", refreshCongregationOptions);

  const statusSelect = el(
    "select",
    { id: "field-status", class: "form-control" },
    Object.entries(YOUTH_STATUS_LABELS).map(([key, label]) => new Option(label, key, false, key === data.status))
  );

  const form = el("form", { novalidate: true }, [
    el("div", { class: "form-section-title" }, "Identificação"),
    el("div", { class: "form-grid" }, [
      field("field-nome", "Nome completo", textInput("field-nome", data.nome), true),
      field("field-dataNascimento", "Data de nascimento", textInput("field-dataNascimento", data.dataNascimento, "date")),
      field("field-telefone", "Telefone", textInput("field-telefone", data.telefone)),
      field("field-bairro", "Bairro", textInput("field-bairro", data.bairro)),
      field("field-cidadeId", "Cidade", citySelect, true),
      field("field-congregacaoId", "Congregação", congSelect, true),
      field("field-status", "Status", statusSelect),
      field("field-dataEntrada", "Data de entrada", textInput("field-dataEntrada", data.dataEntrada, "date")),
    ]),
    el("div", { class: "form-section-title" }, "Família e liderança"),
    el("div", { class: "form-grid" }, [
      field("field-nomePai", "Nome do pai", textInput("field-nomePai", data.nomePai)),
      field("field-nomeMae", "Nome da mãe", textInput("field-nomeMae", data.nomeMae)),
      field("field-pastor", "Pastor", textInput("field-pastor", data.pastor)),
      field("field-conselheiroLocal", "Conselheiro local", textInput("field-conselheiroLocal", data.conselheiroLocal)),
      field("field-conselheiroCidade", "Conselheiro da cidade", textInput("field-conselheiroCidade", data.conselheiroCidade)),
    ]),
    el("div", { class: "form-section-title" }, "Batismo e talentos"),
    el("div", { class: "form-grid" }, [
      field("field-dataBatismoAguas", "Data de batismo nas águas", textInput("field-dataBatismoAguas", data.dataBatismoAguas, "date")),
      field("field-instrumento", "Instrumento", textInput("field-instrumento", data.instrumento)),
      field("field-outrosTalentos", "Outros talentos", textInput("field-outrosTalentos", data.outrosTalentos)),
    ]),
    el("div", { class: "row-wrap gap-4", style: "margin: var(--space-2) 0 var(--space-4);" }, [
      checkboxField("field-batizadoEspiritoSanto", "Batizado no Espírito Santo", data.batizadoEspiritoSanto),
      checkboxField("field-prega", "Prega", data.prega),
      checkboxField("field-canta", "Canta", data.canta),
    ]),
    el("div", { class: "form-group" }, [
      el("label", { for: "field-observacoes" }, "Observações"),
      el("textarea", { id: "field-observacoes", class: "form-control" }, data.observacoes || ""),
    ]),
  ]);

  const { close } = openModal({
    title: isEdit ? "Editar jovem" : "Novo jovem",
    body: form,
    size: "modal-lg",
    actions: [
      { label: "Cancelar", className: "btn btn-secondary" },
      {
        label: "Salvar",
        className: "btn btn-primary",
        closeOnClick: false,
        onClick: async () => {
          const payload = {
            ...data,
            nome: qs("#field-nome", form).value,
            dataNascimento: qs("#field-dataNascimento", form).value || null,
            telefone: qs("#field-telefone", form).value,
            bairro: qs("#field-bairro", form).value,
            cidadeId: qs("#field-cidadeId", form).value,
            congregacaoId: qs("#field-congregacaoId", form).value,
            status: qs("#field-status", form).value,
            dataEntrada: qs("#field-dataEntrada", form).value,
            nomePai: qs("#field-nomePai", form).value,
            nomeMae: qs("#field-nomeMae", form).value,
            pastor: qs("#field-pastor", form).value,
            conselheiroLocal: qs("#field-conselheiroLocal", form).value,
            conselheiroCidade: qs("#field-conselheiroCidade", form).value,
            dataBatismoAguas: qs("#field-dataBatismoAguas", form).value || null,
            instrumento: qs("#field-instrumento", form).value,
            outrosTalentos: qs("#field-outrosTalentos", form).value,
            observacoes: qs("#field-observacoes", form).value,
            batizadoEspiritoSanto: qs("#field-batizadoEspiritoSanto", form).checked,
            prega: qs("#field-prega", form).checked,
            canta: qs("#field-canta", form).checked,
          };
          const errors = YouthService.validate(payload);
          form.querySelectorAll(".form-error").forEach((e) => (e.textContent = ""));
          form.querySelectorAll(".form-control").forEach((e) => e.classList.remove("invalid"));
          if (Object.keys(errors).length) {
            for (const [f, message] of Object.entries(errors)) {
              const errEl = qs(`#error-${f}`, form);
              const inputEl = qs(`#field-${f}`, form);
              if (errEl) errEl.textContent = message;
              if (inputEl) inputEl.classList.add("invalid");
            }
            return;
          }
          try {
            await YouthService.save(payload);
            toast.success(isEdit ? "Jovem atualizado com sucesso." : "Jovem cadastrado com sucesso.");
            close();
            await loadAndRender();
          } catch {
            toast.error("Não foi possível salvar o jovem.");
          }
        },
      },
    ],
  });
}

async function removeYouth(youth) {
  const confirmed = await confirmModal({
    title: "Excluir jovem",
    message: `Tem certeza que deseja excluir <strong>${youth.nome}</strong>? Esta ação não pode ser desfeita.`,
    confirmLabel: "Excluir",
    danger: true,
  });
  if (!confirmed) return;
  await YouthService.remove(youth.id);
  toast.success("Jovem excluído.");
  await loadAndRender();
}

refreshIcons();
