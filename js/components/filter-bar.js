import { el, refreshIcons } from "../utils/dom-utils.js";
import { availableCongregations, activeFilterChips } from "../services/filter-service.js";
import { AGE_RANGES, YOUTH_STATUS_LABELS } from "../config/constants.js";

const TRI_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "sim", label: "Sim" },
  { value: "nao", label: "Não" },
];

function option(value, label, selected) {
  return el("option", { value, selected: selected || undefined }, label);
}

/**
 * Renders the global filter bar. `onChange(filters)` fires whenever any field changes.
 * Congregação options automatically re-scope when the cidade changes.
 */
export function renderFilterBar(container, { cities, congregations, instruments, filters, onChange, showPeriodo = true }) {
  container.innerHTML = "";

  const cityField = el("div", { class: "filter-field" }, [
    el("label", { for: "filter-cidade" }, "Cidade"),
    el(
      "select",
      {
        id: "filter-cidade",
        class: "form-control",
        onChange: (e) => onChange({ ...filters, cidadeId: e.target.value, congregacaoId: "all" }),
      },
      [option("all", "Todas as cidades", filters.cidadeId === "all"), ...cities.map((c) => option(c.id, c.nome, filters.cidadeId === c.id))]
    ),
  ]);

  const scopedCongregations = availableCongregations(congregations, filters.cidadeId);
  const congField = el("div", { class: "filter-field" }, [
    el("label", { for: "filter-congregacao" }, "Congregação"),
    el(
      "select",
      {
        id: "filter-congregacao",
        class: "form-control",
        onChange: (e) => onChange({ ...filters, congregacaoId: e.target.value }),
      },
      [
        option("all", "Todas as congregações", filters.congregacaoId === "all"),
        ...scopedCongregations.map((c) => option(c.id, c.nome, filters.congregacaoId === c.id)),
      ]
    ),
  ]);

  const statusField = el("div", { class: "filter-field" }, [
    el("label", { for: "filter-status" }, "Status"),
    el(
      "select",
      { id: "filter-status", class: "form-control", onChange: (e) => onChange({ ...filters, status: e.target.value }) },
      [
        option("all", "Todos os status", filters.status === "all"),
        ...Object.entries(YOUTH_STATUS_LABELS).map(([key, label]) => option(key, label, filters.status === key)),
      ]
    ),
  ]);

  const ageField = el("div", { class: "filter-field" }, [
    el("label", { for: "filter-idade" }, "Faixa etária"),
    el(
      "select",
      { id: "filter-idade", class: "form-control", onChange: (e) => onChange({ ...filters, faixaEtaria: e.target.value }) },
      [
        option("all", "Todas as idades", filters.faixaEtaria === "all"),
        ...AGE_RANGES.map((r) => option(r.key, r.label, filters.faixaEtaria === r.key)),
        option("nao_informado", "Não informado", filters.faixaEtaria === "nao_informado"),
      ]
    ),
  ]);

  const aguasField = el("div", { class: "filter-field" }, [
    el("label", { for: "filter-aguas" }, "Batizado nas águas"),
    el(
      "select",
      { id: "filter-aguas", class: "form-control", onChange: (e) => onChange({ ...filters, batizadoAguas: e.target.value }) },
      TRI_OPTIONS.map((o) => option(o.value, o.label, filters.batizadoAguas === o.value))
    ),
  ]);

  const esField = el("div", { class: "filter-field" }, [
    el("label", { for: "filter-es" }, "Batizado no Espírito Santo"),
    el(
      "select",
      { id: "filter-es", class: "form-control", onChange: (e) => onChange({ ...filters, batizadoEspiritoSanto: e.target.value }) },
      TRI_OPTIONS.map((o) => option(o.value, o.label, filters.batizadoEspiritoSanto === o.value))
    ),
  ]);

  const pregaField = el("div", { class: "filter-field" }, [
    el("label", { for: "filter-prega" }, "Prega"),
    el(
      "select",
      { id: "filter-prega", class: "form-control", onChange: (e) => onChange({ ...filters, prega: e.target.value }) },
      TRI_OPTIONS.map((o) => option(o.value, o.label, filters.prega === o.value))
    ),
  ]);

  const cantaField = el("div", { class: "filter-field" }, [
    el("label", { for: "filter-canta" }, "Canta"),
    el(
      "select",
      { id: "filter-canta", class: "form-control", onChange: (e) => onChange({ ...filters, canta: e.target.value }) },
      TRI_OPTIONS.map((o) => option(o.value, o.label, filters.canta === o.value))
    ),
  ]);

  const instrumentField = el("div", { class: "filter-field" }, [
    el("label", { for: "filter-instrumento" }, "Instrumento"),
    el(
      "select",
      { id: "filter-instrumento", class: "form-control", onChange: (e) => onChange({ ...filters, instrumento: e.target.value }) },
      [
        option("all", "Todos", filters.instrumento === "all"),
        option("nenhum", "Nenhum", filters.instrumento === "nenhum"),
        ...instruments.map((i) => option(i, i.charAt(0).toUpperCase() + i.slice(1), filters.instrumento === i)),
      ]
    ),
  ]);

  const fields = [cityField, congField, statusField, ageField, aguasField, esField, pregaField, cantaField, instrumentField];

  if (showPeriodo) {
    const periodoInicioField = el("div", { class: "filter-field" }, [
      el("label", { for: "filter-periodo-inicio" }, "Cadastrado a partir de"),
      el("input", {
        id: "filter-periodo-inicio",
        type: "date",
        class: "form-control",
        value: filters.dataInicio || "",
        onChange: (e) => onChange({ ...filters, dataInicio: e.target.value }),
      }),
    ]);
    const periodoFimField = el("div", { class: "filter-field" }, [
      el("label", { for: "filter-periodo-fim" }, "Cadastrado até"),
      el("input", {
        id: "filter-periodo-fim",
        type: "date",
        class: "form-control",
        value: filters.dataFim || "",
        onChange: (e) => onChange({ ...filters, dataFim: e.target.value }),
      }),
    ]);
    fields.push(periodoInicioField, periodoFimField);
  }

  const clearBtn = el(
    "div",
    { class: "filter-actions" },
    [
      el(
        "button",
        {
          type: "button",
          class: "btn btn-secondary",
          onClick: () => onChange({ cidadeId: "all", congregacaoId: "all", status: "all", faixaEtaria: "all", batizadoAguas: "all", batizadoEspiritoSanto: "all", prega: "all", canta: "all", instrumento: "all", dataInicio: "", dataFim: "" }),
        },
        [el("i", { "data-lucide": "filter-x", class: "icon icon-sm" }), " Limpar filtros"]
      ),
    ]
  );

  const bar = el("div", { class: "surface filter-bar" }, [...fields, clearBtn]);
  container.appendChild(bar);
  refreshIcons();
}

export function renderFilterChips(container, filters, lookups, onRemove) {
  container.innerHTML = "";
  const chips = activeFilterChips(filters, lookups);
  if (!chips.length) return;
  const wrap = el(
    "div",
    { class: "filter-chips" },
    chips.map((chip) =>
      el("span", { class: "filter-chip" }, [
        chip.label,
        el("button", { type: "button", "aria-label": `Remover filtro ${chip.label}`, onClick: () => onRemove(chip.key) }, [
          el("i", { "data-lucide": "x", class: "icon icon-sm" }),
        ]),
      ])
    )
  );
  container.appendChild(wrap);
  refreshIcons();
}
