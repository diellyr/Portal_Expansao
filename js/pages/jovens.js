import { bootstrapPage } from "../app.js";
import { YouthService } from "../services/youth-service.js";
import { CityService } from "../services/city-service.js";
import { CongregationService } from "../services/congregation-service.js";
import { defaultFilters, applyYouthFilters, availableCongregations } from "../services/filter-service.js";
import { applySegment, segmentCounts } from "../services/segmentation-service.js";
import { PreferencesService } from "../services/preferences-service.js";
import { BackupService } from "../services/backup-service.js";
import { renderFilterBar, renderFilterChips } from "../components/filter-bar.js";
import { renderDataTable, sortRows } from "../components/data-table.js";
import { renderPagination } from "../components/pagination.js";
import { openModal, confirmModal } from "../components/modal.js";
import { toast } from "../components/toast.js";
import { createPhotoUpload } from "../components/photo-upload.js";
import { openYouthFicha, avatarNode, statusBadge } from "../components/youth-ficha-modal.js";
import { el, qs, debounce, refreshIcons } from "../utils/dom-utils.js";
import { calculateAge, formatDateBR } from "../utils/dates.js";
import { YOUTH_STATUS_LABELS, AGE_RANGES, TIPO_ADMISSAO_LABELS, SEXO_LABELS } from "../config/constants.js";

const ok = await bootstrapPage({ activeKey: "jovens", title: "Jovens" });
if (ok) init();

let allYouth = [];
let cities = [];
let congregations = [];
let instruments = [];
let filters = defaultFilters();
let searchTerm = "";
let activeSegment = "all";
let sort = { key: "nome", dir: "asc" };
let page = 1;
let pageSize = PreferencesService.getJovensRowsPerPage(12);

async function init() {
  [cities, congregations] = await Promise.all([CityService.list(), CongregationService.list()]);
  await loadAndRender();

  const rowsPerPageSelect = qs("#rows-per-page-select");
  if (![...rowsPerPageSelect.options].some((o) => Number(o.value) === pageSize)) {
    rowsPerPageSelect.appendChild(new Option(String(pageSize), String(pageSize)));
  }
  rowsPerPageSelect.value = String(pageSize);
  rowsPerPageSelect.addEventListener("change", (e) => {
    pageSize = Number(e.target.value);
    page = 1;
    PreferencesService.setJovensRowsPerPage(pageSize);
    render();
  });

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
  openYouthFromDeepLink();
}

/**
 * Supports jovens.html?edit=<id>, used by Central de Qualidade and Pesquisa
 * Global so "corrigir cadastro" jumps straight into the edit form instead of
 * making the user search for the record again.
 */
function openYouthFromDeepLink() {
  const id = new URLSearchParams(window.location.search).get("edit");
  if (!id) return;
  const youth = allYouth.find((y) => y.id === id);
  if (youth) openYouthForm(youth);
  window.history.replaceState({}, "", window.location.pathname);
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
  if (!id) return "Sem igreja cadastrada";
  return congregations.find((c) => c.id === id)?.nome || "—";
}

function getFilteredBeforeSegment() {
  let rows = applyYouthFilters(allYouth, filters);
  if (searchTerm) rows = rows.filter((y) => y.nome.toLowerCase().includes(searchTerm.toLowerCase()));
  return rows;
}

function getFilteredSorted() {
  const rows = applySegment(getFilteredBeforeSegment(), activeSegment);
  return sortRows(rows, sort);
}

function renderSegmentChips() {
  const container = qs("#segment-chips");
  container.innerHTML = "";
  const baseRows = getFilteredBeforeSegment();
  const counts = segmentCounts(baseRows);

  const allChip = el(
    "button",
    { type: "button", class: `segment-chip${activeSegment === "all" ? " active" : ""}` },
    [el("span", {}, "Todos"), el("span", { class: "segment-chip-count" }, String(baseRows.length))]
  );
  allChip.addEventListener("click", () => {
    activeSegment = "all";
    page = 1;
    render();
  });
  container.appendChild(allChip);

  counts.forEach((s) => {
    const chip = el(
      "button",
      {
        type: "button",
        class: `segment-chip${activeSegment === s.key ? " active" : ""}`,
        "data-tooltip": s.tooltip,
      },
      [el("i", { "data-lucide": s.icon, class: "icon icon-sm" }), el("span", {}, s.label), el("span", { class: "segment-chip-count" }, String(s.count))]
    );
    chip.addEventListener("click", () => {
      activeSegment = activeSegment === s.key ? "all" : s.key;
      page = 1;
      render();
    });
    container.appendChild(chip);
  });
  refreshIcons();
}

function render() {
  renderSegmentChips();
  const rows = getFilteredSorted();
  const start = (page - 1) * pageSize;
  const pageRows = rows.slice(start, start + pageSize);

  renderDataTable(qs("#youth-table"), {
    columns: [
      { key: "codigo", label: "Código", render: (r) => r.codigo || "—" },
      {
        key: "nome",
        label: "Nome",
        render: (r) =>
          el(
            "button",
            { type: "button", class: "name-cell-link", "aria-label": `Abrir ficha de ${r.nome}`, onClick: () => openYouthDetails(r) },
            [avatarNode(r, "sm"), el("span", {}, r.nome)]
          ),
      },
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

function openYouthDetails(youth) {
  openYouthFicha(youth, cityName(youth.cidadeId), congName(youth.congregacaoId));
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

async function openYouthForm(youth) {
  const isEdit = !!youth;
  const data = youth || {
    codigo: await YouthService.getNextCode(),
    nome: "", dataNascimento: "", telefone: "", celular: "", bairro: "", endereco: "", numero: "", cep: "",
    naturalidade: "", rg: "", orgaoEmissor: "", cpf: "", cidadeId: cities[0]?.id || "", congregacaoId: "",
    status: "ativo", sexo: "", escolaridade: "", profissao: "", cargo: "", conjuge: "",
    nomePai: "", nomeMae: "", pastor: "", conselheiroLocal: "", conselheiroCidade: "",
    dataBatismoAguas: "", batizadoEspiritoSanto: false, instrumento: "", prega: false, canta: false,
    outrosTalentos: "", qtd: "", estadoCivil: "", outroEstadoCivil: "", liderExpansao: false, seLider: "", qualDepartamento: "",
    nomeDirigente: "", recebidoPor: "", tipoAdmissao: "", foto: null,
    observacoes: "", dataEntrada: new Date().toISOString().slice(0, 10),
  };

  const photoUpload = createPhotoUpload({ value: data.foto });

  const citySelect = el("select", { id: "field-cidadeId", class: "form-control" }, cities.map((c) => new Option(c.nome, c.id, false, c.id === data.cidadeId)));
  const congSelect = el("select", { id: "field-congregacaoId", class: "form-control" });

  function refreshCongregationOptions() {
    const options = availableCongregations(congregations, citySelect.value);
    congSelect.innerHTML = "";
    congSelect.appendChild(new Option("Sem igreja cadastrada", "", false, !data.congregacaoId));
    options.forEach((c) => congSelect.appendChild(new Option(c.nome, c.id, false, c.id === data.congregacaoId)));
  }
  refreshCongregationOptions();
  citySelect.addEventListener("change", refreshCongregationOptions);

  const statusSelect = el(
    "select",
    { id: "field-status", class: "form-control" },
    Object.entries(YOUTH_STATUS_LABELS).map(([key, label]) => new Option(label, key, false, key === data.status))
  );

  const sexoSelect = el(
    "select",
    { id: "field-sexo", class: "form-control" },
    [
      new Option("Não informado", "", false, !data.sexo),
      ...Object.entries(SEXO_LABELS).map(([key, label]) => new Option(label, key, false, key === data.sexo)),
    ]
  );

  const tipoAdmissaoSelect = el(
    "select",
    { id: "field-tipoAdmissao", class: "form-control" },
    [
      new Option("Não informado", "", false, !data.tipoAdmissao),
      ...Object.entries(TIPO_ADMISSAO_LABELS).map(([key, label]) => new Option(label, key, false, key === data.tipoAdmissao)),
    ]
  );

  const form = el("form", { novalidate: true }, [
    el("div", { class: "form-section-title" }, "Foto"),
    photoUpload.element,
    el("div", { class: "form-section-title" }, "Registro do cadastro"),
    el("div", { class: "form-grid" }, [
      field("field-codigo", "Código", textInput("field-codigo", data.codigo)),
      field("field-nomeDirigente", "Nome do dirigente", textInput("field-nomeDirigente", data.nomeDirigente)),
      field("field-recebidoPor", "Cadastro recebido por", textInput("field-recebidoPor", data.recebidoPor)),
      field("field-tipoAdmissao", "Tipo de admissão", tipoAdmissaoSelect),
      field("field-dataEntrada", "Data de entrada", textInput("field-dataEntrada", data.dataEntrada, "date")),
    ]),
    el("div", { class: "form-section-title" }, "Identificação"),
    el("div", { class: "form-grid" }, [
      field("field-nome", "Nome completo", textInput("field-nome", data.nome), true),
      field("field-dataNascimento", "Data de nascimento", textInput("field-dataNascimento", data.dataNascimento, "date")),
      field("field-naturalidade", "Naturalidade", textInput("field-naturalidade", data.naturalidade)),
      field("field-sexo", "Sexo", sexoSelect),
      field("field-telefone", "Telefone", textInput("field-telefone", data.telefone)),
      field("field-celular", "Celular", textInput("field-celular", data.celular)),
      field("field-cidadeId", "Cidade", citySelect, true),
      field("field-congregacaoId", "Congregação", congSelect),
      field("field-status", "Status", statusSelect),
    ]),
    el("div", { class: "form-section-title" }, "Endereço"),
    el("div", { class: "form-grid" }, [
      field("field-endereco", "Endereço", textInput("field-endereco", data.endereco)),
      field("field-numero", "Número", textInput("field-numero", data.numero)),
      field("field-bairro", "Bairro", textInput("field-bairro", data.bairro)),
      field("field-cep", "CEP", textInput("field-cep", data.cep)),
    ]),
    el("div", { class: "form-section-title" }, "Documentos e dados pessoais"),
    el("div", { class: "form-grid" }, [
      field("field-rg", "RG", textInput("field-rg", data.rg)),
      field("field-orgaoEmissor", "Órgão emissor", textInput("field-orgaoEmissor", data.orgaoEmissor)),
      field("field-cpf", "CPF", textInput("field-cpf", data.cpf)),
      field("field-escolaridade", "Escolaridade", textInput("field-escolaridade", data.escolaridade)),
      field("field-profissao", "Profissão", textInput("field-profissao", data.profissao)),
      field("field-cargo", "Cargo", textInput("field-cargo", data.cargo)),
    ]),
    el("div", { class: "form-section-title" }, "Família e liderança"),
    el("div", { class: "form-grid" }, [
      field("field-estadoCivil", "Estado civil", textInput("field-estadoCivil", data.estadoCivil)),
      field("field-outroEstadoCivil", "Outro (qual)?", textInput("field-outroEstadoCivil", data.outroEstadoCivil)),
      field("field-conjuge", "Cônjuge", textInput("field-conjuge", data.conjuge)),
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
    el("div", { class: "form-section-title" }, "Expansão e departamento"),
    el("div", { class: "form-grid" }, [
      field("field-qtd", "Qtd", textInput("field-qtd", data.qtd)),
      field("field-seLider", "Se líder, qual?", textInput("field-seLider", data.seLider)),
      field("field-qualDepartamento", "Qual departamento?", textInput("field-qualDepartamento", data.qualDepartamento)),
    ]),
    el("div", { class: "row-wrap gap-4", style: "margin: var(--space-2) 0 var(--space-4);" }, [
      checkboxField("field-liderExpansao", "Líder de Expansão?", data.liderExpansao),
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
            foto: photoUpload.getValue(),
            codigo: qs("#field-codigo", form).value,
            nomeDirigente: qs("#field-nomeDirigente", form).value,
            recebidoPor: qs("#field-recebidoPor", form).value,
            tipoAdmissao: qs("#field-tipoAdmissao", form).value,
            nome: qs("#field-nome", form).value,
            dataNascimento: qs("#field-dataNascimento", form).value || null,
            naturalidade: qs("#field-naturalidade", form).value,
            telefone: qs("#field-telefone", form).value,
            celular: qs("#field-celular", form).value,
            endereco: qs("#field-endereco", form).value,
            numero: qs("#field-numero", form).value,
            bairro: qs("#field-bairro", form).value,
            cep: qs("#field-cep", form).value,
            cidadeId: qs("#field-cidadeId", form).value,
            congregacaoId: qs("#field-congregacaoId", form).value,
            status: qs("#field-status", form).value,
            sexo: qs("#field-sexo", form).value,
            dataEntrada: qs("#field-dataEntrada", form).value,
            rg: qs("#field-rg", form).value,
            orgaoEmissor: qs("#field-orgaoEmissor", form).value,
            cpf: qs("#field-cpf", form).value,
            escolaridade: qs("#field-escolaridade", form).value,
            profissao: qs("#field-profissao", form).value,
            cargo: qs("#field-cargo", form).value,
            estadoCivil: qs("#field-estadoCivil", form).value,
            outroEstadoCivil: qs("#field-outroEstadoCivil", form).value,
            conjuge: qs("#field-conjuge", form).value,
            nomePai: qs("#field-nomePai", form).value,
            nomeMae: qs("#field-nomeMae", form).value,
            pastor: qs("#field-pastor", form).value,
            conselheiroLocal: qs("#field-conselheiroLocal", form).value,
            conselheiroCidade: qs("#field-conselheiroCidade", form).value,
            dataBatismoAguas: qs("#field-dataBatismoAguas", form).value || null,
            instrumento: qs("#field-instrumento", form).value,
            outrosTalentos: qs("#field-outrosTalentos", form).value,
            qtd: qs("#field-qtd", form).value,
            seLider: qs("#field-seLider", form).value,
            qualDepartamento: qs("#field-qualDepartamento", form).value,
            observacoes: qs("#field-observacoes", form).value,
            batizadoEspiritoSanto: qs("#field-batizadoEspiritoSanto", form).checked,
            prega: qs("#field-prega", form).checked,
            canta: qs("#field-canta", form).checked,
            liderExpansao: qs("#field-liderExpansao", form).checked,
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
