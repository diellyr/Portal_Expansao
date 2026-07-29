import { bootstrapPage } from "../app.js";
import { EventService } from "../services/event-service.js";
import { CityService } from "../services/city-service.js";
import { CongregationService } from "../services/congregation-service.js";
import { availableCongregations } from "../services/filter-service.js";
import { renderDataTable, sortRows } from "../components/data-table.js";
import { renderPagination } from "../components/pagination.js";
import { openModal, confirmModal } from "../components/modal.js";
import { toast } from "../components/toast.js";
import { el, qs, debounce, refreshIcons } from "../utils/dom-utils.js";
import { formatDateBR, todayISO } from "../utils/dates.js";
import { EVENT_TYPES, EVENT_TYPE_LABELS } from "../config/constants.js";

const ok = await bootstrapPage({ activeKey: "eventos", title: "Eventos" });
if (ok) init();

let allEvents = [];
let cities = [];
let congregations = [];
let searchTerm = "";
let typeFilter = "all";
let cityFilter = "all";
let congregationFilter = "all";
let dateStart = "";
let dateEnd = "";
let activeTab = "futuros";
let sort = { key: "data", dir: "asc" };
let page = 1;
const pageSize = 10;

async function init() {
  [cities, congregations] = await Promise.all([CityService.list(), CongregationService.list()]);

  const typeSelect = qs("#type-filter");
  EVENT_TYPES.forEach((t) => typeSelect.appendChild(new Option(EVENT_TYPE_LABELS[t], t)));
  const citySelect = qs("#city-filter");
  cities.forEach((c) => citySelect.appendChild(new Option(c.nome, c.id)));
  refreshCongregationFilterOptions();

  await loadAndRender();

  qs("#search-input").addEventListener("input", debounce((e) => { searchTerm = e.target.value; page = 1; render(); }, 250));
  typeSelect.addEventListener("change", (e) => { typeFilter = e.target.value; page = 1; render(); });
  citySelect.addEventListener("change", (e) => { cityFilter = e.target.value; congregationFilter = "all"; refreshCongregationFilterOptions(); page = 1; render(); });
  qs("#congregation-filter").addEventListener("change", (e) => { congregationFilter = e.target.value; page = 1; render(); });
  qs("#date-start").addEventListener("change", (e) => { dateStart = e.target.value; page = 1; render(); });
  qs("#date-end").addEventListener("change", (e) => { dateEnd = e.target.value; page = 1; render(); });

  qs("#tab-futuros").addEventListener("click", () => setTab("futuros"));
  qs("#tab-passados").addEventListener("click", () => setTab("passados"));

  qs("#new-event-btn").addEventListener("click", () => openEventForm());
}

function refreshCongregationFilterOptions() {
  const select = qs("#congregation-filter");
  select.innerHTML = "";
  select.appendChild(new Option("Todas", "all"));
  availableCongregations(congregations, cityFilter).forEach((c) => select.appendChild(new Option(c.nome, c.id)));
}

function setTab(tab) {
  activeTab = tab;
  qs("#tab-futuros").classList.toggle("active", tab === "futuros");
  qs("#tab-futuros").setAttribute("aria-selected", tab === "futuros");
  qs("#tab-passados").classList.toggle("active", tab === "passados");
  qs("#tab-passados").setAttribute("aria-selected", tab === "passados");
  page = 1;
  render();
}

async function loadAndRender() {
  allEvents = await EventService.list();
  render();
}

function cityName(id) { return cities.find((c) => c.id === id)?.nome || "—"; }
function congName(id) { return id ? congregations.find((c) => c.id === id)?.nome || "—" : "—"; }

function filtered() {
  const today = todayISO();
  return allEvents.filter((e) => {
    if (activeTab === "futuros" && e.data < today) return false;
    if (activeTab === "passados" && e.data >= today) return false;
    if (typeFilter !== "all" && e.tipo !== typeFilter) return false;
    if (cityFilter !== "all" && e.cidadeId !== cityFilter) return false;
    if (congregationFilter !== "all" && e.congregacaoId !== congregationFilter) return false;
    if (dateStart && e.data < dateStart) return false;
    if (dateEnd && e.data > dateEnd) return false;
    if (searchTerm && !e.titulo.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });
}

function render() {
  const rows = sortRows(filtered(), sort);
  const start = (page - 1) * pageSize;
  const pageRows = rows.slice(start, start + pageSize);

  renderDataTable(qs("#events-table"), {
    columns: [
      { key: "titulo", label: "Título" },
      { key: "tipo", label: "Tipo", render: (r) => `<span class="badge badge-info">${EVENT_TYPE_LABELS[r.tipo] || r.tipo}</span>` },
      { key: "data", label: "Data", render: (r) => `${formatDateBR(r.data)}${r.horario ? " · " + r.horario : ""}` },
      { key: "cidadeId", label: "Cidade", render: (r) => cityName(r.cidadeId) },
      { key: "congregacaoId", label: "Congregação", render: (r) => congName(r.congregacaoId) },
      { key: "regional", label: "Regional", render: (r) => (r.regional ? '<span class="badge badge-success">Sim</span>' : "Não") },
    ],
    rows: pageRows,
    sort,
    onSortChange: (key) => { sort = { key, dir: sort.key === key && sort.dir === "asc" ? "desc" : "asc" }; render(); },
    actions: (row) => [
      { icon: "eye", label: "Ver detalhes", onClick: () => openEventDetails(row) },
      { icon: "pencil", label: "Editar", onClick: () => openEventForm(row) },
      { icon: "trash-2", label: "Excluir", onClick: () => removeEvent(row) },
    ],
    emptyMessage: "Nenhum evento encontrado.",
  });

  renderPagination(qs("#events-pagination"), {
    page, pageSize, total: rows.length,
    onPageChange: (p) => { page = p; render(); },
  });
}

function detailItem(label, value) {
  return el("div", { class: "detail-item" }, [el("span", { class: "detail-item-label" }, label), el("span", { class: "detail-item-value" }, value)]);
}

function openEventDetails(event) {
  const body = el("div", { class: "detail-grid" }, [
    detailItem("Tipo", EVENT_TYPE_LABELS[event.tipo]),
    detailItem("Data", formatDateBR(event.data)),
    detailItem("Horário", event.horario || "Não informado"),
    detailItem("Cidade", cityName(event.cidadeId)),
    detailItem("Congregação", congName(event.congregacaoId)),
    detailItem("Regional", event.regional ? "Sim" : "Não"),
    detailItem("Local", event.local || "Não informado"),
    detailItem("Descrição", event.descricao || "Não informado"),
  ]);
  openModal({ title: event.titulo, body, size: "modal-lg", actions: [{ label: "Fechar", className: "btn btn-secondary" }] });
}

function field(id, label, inputEl, required = false) {
  return el("div", { class: "form-group" }, [
    el("label", { for: id, class: required ? "required" : "" }, label),
    inputEl,
    el("span", { class: "form-error", id: `error-${id.replace("field-", "")}` }),
  ]);
}

function openEventForm(event) {
  const isEdit = !!event;
  const data = event || { titulo: "", tipo: "culto", data: todayISO(), horario: "", cidadeId: cities[0]?.id || "", congregacaoId: "", regional: false, local: "", descricao: "" };

  const typeSelect = el("select", { id: "field-tipo", class: "form-control" }, EVENT_TYPES.map((t) => new Option(EVENT_TYPE_LABELS[t], t, false, t === data.tipo)));
  const citySelect = el("select", { id: "field-cidadeId", class: "form-control" }, cities.map((c) => new Option(c.nome, c.id, false, c.id === data.cidadeId)));
  const congSelect = el("select", { id: "field-congregacaoId", class: "form-control" });

  function refreshCong() {
    const options = availableCongregations(congregations, citySelect.value);
    congSelect.innerHTML = "";
    congSelect.appendChild(new Option("Nenhuma (evento regional)", ""));
    options.forEach((c) => congSelect.appendChild(new Option(c.nome, c.id, false, c.id === data.congregacaoId)));
  }
  refreshCong();
  citySelect.addEventListener("change", refreshCong);

  const form = el("form", { novalidate: true }, [
    el("div", { class: "form-grid" }, [
      field("field-titulo", "Título", el("input", { type: "text", id: "field-titulo", class: "form-control", value: data.titulo }), true),
      field("field-tipo", "Tipo", typeSelect, true),
      field("field-data", "Data", el("input", { type: "date", id: "field-data", class: "form-control", value: data.data }), true),
      field("field-horario", "Horário", el("input", { type: "time", id: "field-horario", class: "form-control", value: data.horario })),
      field("field-cidadeId", "Cidade", citySelect, true),
      field("field-congregacaoId", "Congregação", congSelect),
      field("field-local", "Local", el("input", { type: "text", id: "field-local", class: "form-control", value: data.local })),
    ]),
    el("div", { class: "form-checkbox-row", style: "margin-bottom: var(--space-4);" }, [
      el("input", { type: "checkbox", id: "field-regional", checked: data.regional || undefined }),
      el("label", { for: "field-regional" }, "Evento regional"),
    ]),
    el("div", { class: "form-group" }, [
      el("label", { for: "field-descricao" }, "Descrição"),
      el("textarea", { id: "field-descricao", class: "form-control" }, data.descricao || ""),
    ]),
  ]);

  const { close } = openModal({
    title: isEdit ? "Editar evento" : "Novo evento",
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
            titulo: qs("#field-titulo", form).value,
            tipo: qs("#field-tipo", form).value,
            data: qs("#field-data", form).value,
            horario: qs("#field-horario", form).value,
            cidadeId: qs("#field-cidadeId", form).value,
            congregacaoId: qs("#field-congregacaoId", form).value || null,
            regional: qs("#field-regional", form).checked,
            local: qs("#field-local", form).value,
            descricao: qs("#field-descricao", form).value,
          };
          const errors = EventService.validate(payload);
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
            await EventService.save(payload);
            toast.success(isEdit ? "Evento atualizado." : "Evento cadastrado.");
            close();
            await loadAndRender();
          } catch {
            toast.error("Não foi possível salvar o evento.");
          }
        },
      },
    ],
  });
}

async function removeEvent(event) {
  const confirmed = await confirmModal({
    title: "Excluir evento",
    message: `Tem certeza que deseja excluir <strong>${event.titulo}</strong>?`,
    confirmLabel: "Excluir",
    danger: true,
  });
  if (!confirmed) return;
  await EventService.remove(event.id);
  toast.success("Evento excluído.");
  await loadAndRender();
}

refreshIcons();
