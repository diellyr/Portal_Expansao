import { bootstrapPage } from "../app.js";
import { CongregationService } from "../services/congregation-service.js";
import { CityService } from "../services/city-service.js";
import { renderDataTable, sortRows } from "../components/data-table.js";
import { renderPagination } from "../components/pagination.js";
import { openModal, confirmModal } from "../components/modal.js";
import { toast } from "../components/toast.js";
import { el, qs, debounce, refreshIcons } from "../utils/dom-utils.js";
import { formatNumber } from "../utils/formatters.js";

const ok = await bootstrapPage({ activeKey: "congregacoes", title: "Congregações" });
if (ok) init();

let allCongregations = [];
let cities = [];
let searchTerm = "";
let cityFilter = "all";
let statusFilter = "all";
let sort = { key: "nome", dir: "asc" };
let page = 1;
const pageSize = 10;

async function init() {
  cities = await CityService.list();
  const citySelect = qs("#city-filter");
  cities.forEach((c) => citySelect.appendChild(new Option(c.nome, c.id)));

  await loadAndRender();

  qs("#search-input").addEventListener(
    "input",
    debounce((e) => {
      searchTerm = e.target.value;
      page = 1;
      render();
    }, 250)
  );
  citySelect.addEventListener("change", (e) => {
    cityFilter = e.target.value;
    page = 1;
    render();
  });
  qs("#status-filter").addEventListener("change", (e) => {
    statusFilter = e.target.value;
    page = 1;
    render();
  });
  qs("#new-congregation-btn").addEventListener("click", () => openCongregationForm());
}

async function loadAndRender() {
  allCongregations = await CongregationService.listWithCounts();
  render();
}

function cityName(id) {
  return cities.find((c) => c.id === id)?.nome || "—";
}

function filtered() {
  return allCongregations.filter((c) => {
    if (cityFilter !== "all" && c.cidadeId !== cityFilter) return false;
    if (statusFilter !== "all" && (statusFilter === "ativo") !== c.ativo) return false;
    if (searchTerm && !c.nome.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });
}

function render() {
  const rows = sortRows(filtered(), sort);
  const start = (page - 1) * pageSize;
  const pageRows = rows.slice(start, start + pageSize);

  renderDataTable(qs("#congregations-table"), {
    columns: [
      { key: "nome", label: "Congregação" },
      { key: "cidadeId", label: "Cidade", render: (r) => cityName(r.cidadeId) },
      { key: "pastor", label: "Pastor", render: (r) => r.pastor || "—" },
      { key: "totalJovens", label: "Jovens" },
      { key: "ativo", label: "Status", render: (r) => `<span class="badge ${r.ativo ? "badge-success" : "badge-neutral"}">${r.ativo ? "Ativa" : "Inativa"}</span>` },
    ],
    rows: pageRows,
    sort,
    onSortChange: (key) => {
      sort = { key, dir: sort.key === key && sort.dir === "asc" ? "desc" : "asc" };
      render();
    },
    actions: (row) => [
      { icon: "eye", label: "Ver detalhes", onClick: () => openDetails(row) },
      { icon: "pencil", label: "Editar", onClick: () => openCongregationForm(row) },
      { icon: "trash-2", label: "Excluir", onClick: () => remove(row) },
    ],
    emptyMessage: "Nenhuma congregação encontrada.",
  });

  renderPagination(qs("#congregations-pagination"), {
    page,
    pageSize,
    total: rows.length,
    onPageChange: (p) => {
      page = p;
      render();
    },
  });
}

async function openDetails(cong) {
  const indicators = await CongregationService.getIndicators(cong.id);
  const body = el("div", { class: "detail-grid" }, [
    detailItem("Cidade", cityName(cong.cidadeId)),
    detailItem("Bairro", cong.bairro || "Não informado"),
    detailItem("Endereço", cong.endereco || "Não informado"),
    detailItem("Pastor", cong.pastor || "Não informado"),
    detailItem("Conselheiro local", cong.conselheiroLocal || "Não informado"),
    detailItem("Telefone do conselheiro", cong.telefoneConselheiro || "Não informado"),
    detailItem("Total de jovens", formatNumber(indicators.totalJovens)),
    detailItem("Ativos", formatNumber(indicators.ativos)),
    detailItem("Visitantes", formatNumber(indicators.visitantes)),
    detailItem("Batizados nas águas", formatNumber(indicators.batizadosAguas)),
    detailItem("Batizados no Espírito Santo", formatNumber(indicators.batizadosEspiritoSanto)),
    detailItem("Cantam", formatNumber(indicators.cantam)),
    detailItem("Pregam", formatNumber(indicators.pregam)),
  ]);
  openModal({ title: `Detalhes — ${cong.nome}`, body, size: "modal-lg", actions: [{ label: "Fechar", className: "btn btn-secondary" }] });
}

function detailItem(label, value) {
  return el("div", { class: "detail-item" }, [el("span", { class: "detail-item-label" }, label), el("span", { class: "detail-item-value" }, value)]);
}

function openCongregationForm(cong) {
  const isEdit = !!cong;
  const data = cong || { nome: "", cidadeId: cities[0]?.id || "", bairro: "", endereco: "", pastor: "", conselheiroLocal: "", telefoneConselheiro: "", ativo: true };

  const citySelect = el(
    "select",
    { id: "field-cidadeId", class: "form-control" },
    cities.map((c) => new Option(c.nome, c.id, false, c.id === data.cidadeId))
  );

  const form = el("form", { novalidate: true }, [
    el("div", { class: "form-grid" }, [
      el("div", { class: "form-group" }, [
        el("label", { for: "field-cidadeId", class: "required" }, "Cidade"),
        citySelect,
        el("span", { class: "form-error", id: "error-cidadeId" }),
      ]),
      formGroup("nome", "Nome da congregação", data.nome, true),
      formGroup("bairro", "Bairro", data.bairro),
      formGroup("endereco", "Endereço", data.endereco),
      formGroup("pastor", "Pastor", data.pastor),
      formGroup("conselheiroLocal", "Conselheiro local", data.conselheiroLocal),
      formGroup("telefoneConselheiro", "Telefone do conselheiro", data.telefoneConselheiro),
    ]),
    el("div", { class: "form-checkbox-row" }, [
      el("input", { type: "checkbox", id: "field-ativo", checked: data.ativo || undefined }),
      el("label", { for: "field-ativo" }, "Congregação ativa"),
    ]),
  ]);

  const { close } = openModal({
    title: isEdit ? "Editar congregação" : "Nova congregação",
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
            cidadeId: qs("#field-cidadeId", form).value,
            nome: qs("#field-nome", form).value,
            bairro: qs("#field-bairro", form).value,
            endereco: qs("#field-endereco", form).value,
            pastor: qs("#field-pastor", form).value,
            conselheiroLocal: qs("#field-conselheiroLocal", form).value,
            telefoneConselheiro: qs("#field-telefoneConselheiro", form).value,
            ativo: qs("#field-ativo", form).checked,
          };
          const errors = CongregationService.validate(payload);
          clearFormErrors(form);
          if (Object.keys(errors).length) {
            showFormErrors(form, errors);
            return;
          }
          try {
            await CongregationService.save(payload);
            toast.success(isEdit ? "Congregação atualizada." : "Congregação cadastrada.");
            close();
            await loadAndRender();
          } catch {
            toast.error("Não foi possível salvar a congregação.");
          }
        },
      },
    ],
  });
}

function formGroup(name, label, value, required = false) {
  return el("div", { class: "form-group" }, [
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

async function remove(cong) {
  const confirmed = await confirmModal({
    title: "Excluir congregação",
    message: `Tem certeza que deseja excluir <strong>${cong.nome}</strong>?`,
    confirmLabel: "Excluir",
    danger: true,
  });
  if (!confirmed) return;
  await CongregationService.remove(cong.id);
  toast.success("Congregação excluída.");
  await loadAndRender();
}

refreshIcons();
