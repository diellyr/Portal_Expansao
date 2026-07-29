import { bootstrapPage } from "../app.js";
import { CityService } from "../services/city-service.js";
import { renderDataTable, sortRows } from "../components/data-table.js";
import { renderPagination } from "../components/pagination.js";
import { openModal, confirmModal } from "../components/modal.js";
import { toast } from "../components/toast.js";
import { el, qs, debounce, refreshIcons } from "../utils/dom-utils.js";
import { formatBoolean, formatNumber } from "../utils/formatters.js";

const ok = await bootstrapPage({ activeKey: "cidades", title: "Cidades" });
if (ok) init();

let allCities = [];
let searchTerm = "";
let statusFilter = "all";
let sort = { key: "nome", dir: "asc" };
let page = 1;
const pageSize = 10;

async function init() {
  await loadAndRender();

  qs("#search-input").addEventListener(
    "input",
    debounce((e) => {
      searchTerm = e.target.value;
      page = 1;
      render();
    }, 250)
  );

  qs("#status-filter").addEventListener("change", (e) => {
    statusFilter = e.target.value;
    page = 1;
    render();
  });

  qs("#new-city-btn").addEventListener("click", () => openCityForm());
}

async function loadAndRender() {
  allCities = await CityService.listWithCounts();
  render();
}

function filteredCities() {
  return allCities.filter((c) => {
    if (statusFilter !== "all" && (statusFilter === "ativo") !== c.ativo) return false;
    if (searchTerm && !c.nome.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });
}

function render() {
  const filtered = sortRows(filteredCities(), sort);
  const start = (page - 1) * pageSize;
  const pageRows = filtered.slice(start, start + pageSize);

  renderDataTable(qs("#cities-table"), {
    columns: [
      { key: "nome", label: "Cidade" },
      { key: "pastorResponsavel", label: "Pastor responsável", render: (r) => r.pastorResponsavel || "—" },
      { key: "totalCongregacoes", label: "Congregações" },
      { key: "totalJovens", label: "Jovens" },
      {
        key: "ativo",
        label: "Status",
        render: (r) => `<span class="badge ${r.ativo ? "badge-success" : "badge-neutral"}">${r.ativo ? "Ativa" : "Inativa"}</span>`,
      },
    ],
    rows: pageRows,
    sort,
    onSortChange: (key) => {
      sort = { key, dir: sort.key === key && sort.dir === "asc" ? "desc" : "asc" };
      render();
    },
    actions: (row) => [
      { icon: "eye", label: "Ver detalhes", onClick: () => openCityDetails(row) },
      { icon: "pencil", label: "Editar", onClick: () => openCityForm(row) },
      { icon: "trash-2", label: "Excluir", className: "btn btn-ghost btn-sm btn-icon", onClick: () => deleteCity(row) },
    ],
    emptyMessage: "Nenhuma cidade encontrada.",
  });

  renderPagination(qs("#cities-pagination"), {
    page,
    pageSize,
    total: filtered.length,
    onPageChange: (p) => {
      page = p;
      render();
    },
  });
}

async function openCityDetails(city) {
  const indicators = await CityService.getIndicators(city.id);
  const instrumentCounts = {};
  indicators.instrumentos.forEach((i) => (instrumentCounts[i] = (instrumentCounts[i] || 0) + 1));

  const body = el("div", { class: "detail-grid" }, [
    detailItem("Líder da cidade", city.liderCidade || "Não informado"),
    detailItem("Conselheiro da cidade", city.conselheiroCidade || "Não informado"),
    detailItem("Telefone do líder", city.telefoneLider || "Não informado"),
    detailItem("Pastor responsável", city.pastorResponsavel || "Não informado"),
    detailItem("Total de jovens", formatNumber(indicators.totalJovens)),
    detailItem("Ativos", formatNumber(indicators.ativos)),
    detailItem("Visitantes", formatNumber(indicators.visitantes)),
    detailItem("Congregações", formatNumber(indicators.congregacoes)),
    detailItem("Batizados nas águas", formatNumber(indicators.batizadosAguas)),
    detailItem("Batizados no Espírito Santo", formatNumber(indicators.batizadosEspiritoSanto)),
    detailItem("Cantam", formatNumber(indicators.cantam)),
    detailItem("Pregam", formatNumber(indicators.pregam)),
    detailItem("Instrumentos", Object.entries(instrumentCounts).map(([k, v]) => `${k} (${v})`).join(", ") || "Nenhum"),
  ]);

  openModal({ title: `Detalhes — ${city.nome}`, body, size: "modal-lg", actions: [{ label: "Fechar", className: "btn btn-secondary" }] });
}

function detailItem(label, value) {
  return el("div", { class: "detail-item" }, [el("span", { class: "detail-item-label" }, label), el("span", { class: "detail-item-value" }, value)]);
}

function openCityForm(city) {
  const isEdit = !!city;
  const data = city || { nome: "", estado: "", liderCidade: "", conselheiroCidade: "", telefoneLider: "", pastorResponsavel: "", ativo: true };

  const form = el("form", { novalidate: true }, [
    el("div", { class: "form-grid" }, [
      formGroup("nome", "Nome da cidade", data.nome, true),
      formGroup("estado", "Estado", data.estado),
      formGroup("liderCidade", "Líder da cidade", data.liderCidade),
      formGroup("conselheiroCidade", "Conselheiro da cidade", data.conselheiroCidade),
      formGroup("telefoneLider", "Telefone do líder", data.telefoneLider),
      formGroup("pastorResponsavel", "Pastor responsável", data.pastorResponsavel),
    ]),
    el("div", { class: "form-checkbox-row" }, [
      el("input", { type: "checkbox", id: "field-ativo", checked: data.ativo || undefined }),
      el("label", { for: "field-ativo" }, "Cidade ativa"),
    ]),
  ]);

  const { close } = openModal({
    title: isEdit ? "Editar cidade" : "Nova cidade",
    body: form,
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
            estado: qs("#field-estado", form).value,
            liderCidade: qs("#field-liderCidade", form).value,
            conselheiroCidade: qs("#field-conselheiroCidade", form).value,
            telefoneLider: qs("#field-telefoneLider", form).value,
            pastorResponsavel: qs("#field-pastorResponsavel", form).value,
            ativo: qs("#field-ativo", form).checked,
          };
          const errors = CityService.validate(payload);
          clearFormErrors(form);
          if (Object.keys(errors).length) {
            showFormErrors(form, errors);
            return;
          }
          try {
            await CityService.save(payload);
            toast.success(isEdit ? "Cidade atualizada com sucesso." : "Cidade cadastrada com sucesso.");
            close();
            await loadAndRender();
          } catch (err) {
            toast.error("Não foi possível salvar a cidade.");
          }
        },
      },
    ],
  });
}

function formGroup(name, label, value, required = false) {
  return el("div", { class: `form-group${required ? "" : ""}` }, [
    el("label", { for: `field-${name}`, class: required ? "required" : "" }, label),
    el("input", { type: "text", id: `field-${name}`, class: "form-control", value: value || "" }),
    el("span", { class: "form-error", id: `error-${name}` }),
  ]);
}

function clearFormErrors(form) {
  form.querySelectorAll(".form-error").forEach((e) => (e.textContent = ""));
  form.querySelectorAll(".form-control").forEach((e) => e.classList.remove("invalid"));
}

function showFormErrors(form, errors) {
  for (const [field, message] of Object.entries(errors)) {
    const errorEl = qs(`#error-${field}`, form);
    const inputEl = qs(`#field-${field}`, form);
    if (errorEl) errorEl.textContent = message;
    if (inputEl) inputEl.classList.add("invalid");
  }
}

async function deleteCity(city) {
  const confirmed = await confirmModal({
    title: "Excluir cidade",
    message: `Tem certeza que deseja excluir <strong>${city.nome}</strong>? Esta ação não remove congregações ou jovens vinculados automaticamente — utilize a Zona de Perigo na Administração para uma exclusão em cascata.`,
    confirmLabel: "Excluir",
    danger: true,
  });
  if (!confirmed) return;
  await CityService.remove(city.id);
  toast.success("Cidade excluída.");
  await loadAndRender();
}

refreshIcons();
