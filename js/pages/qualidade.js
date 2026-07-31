import { bootstrapPage } from "../app.js";
import { DataQualityService } from "../services/data-quality-service.js";
import { openYouthFicha } from "../components/youth-ficha-modal.js";
import { renderMetricCards } from "../components/metric-card.js";
import { renderDataTable, sortRows } from "../components/data-table.js";
import { el, qs, refreshIcons } from "../utils/dom-utils.js";

const ok = await bootstrapPage({ activeKey: "qualidade", title: "Central de Qualidade dos Cadastros" });
if (ok) init();

const TABS = [
  { key: "incompletos", label: "Cadastros incompletos" },
  { key: "duplicadosNome", label: "Possíveis duplicados (nome)" },
  { key: "duplicadosTelefone", label: "Possíveis duplicados (telefone)" },
  { key: "datas", label: "Datas incoerentes" },
  { key: "cidades", label: "Cidades com grafia semelhante" },
  { key: "congregacoes", label: "Congregações com grafia semelhante" },
];

let cities = [];
let congregations = [];
let youth = [];
let activeTab = "incompletos";
let tableSort = { key: null, dir: "asc" };

async function init() {
  await loadAndRender();
}

async function loadAndRender() {
  ({ cities, congregations, youth } = await DataQualityService.load());
  renderCards();
  renderTabs();
  renderContent();
}

function cityName(id) {
  return cities.find((c) => c.id === id)?.nome || "—";
}
function congName(id) {
  if (!id) return "Sem igreja cadastrada";
  return congregations.find((c) => c.id === id)?.nome || "—";
}

function selectTab(key) {
  activeTab = key;
  tableSort = { key: null, dir: "asc" };
  renderTabs();
  renderContent();
}

function renderCards() {
  const s = DataQualityService.summary(youth, cities, congregations);
  renderMetricCards(qs("#quality-cards"), [
    {
      title: "Completude média dos cadastros",
      value: s.completudeMedia,
      suffix: "%",
      icon: "gauge",
      meta: `${s.total} jovem(ns) analisado(s)`,
      tooltip: "Média de 8 campos-chave preenchidos (data de nascimento, cidade, congregação, telefone, pastor, conselheiro local, conselheiro da cidade, batismo nas águas).",
      onClick: () => selectTab("incompletos"),
    },
    {
      title: "Cadastros incompletos",
      value: s.incompletos,
      icon: "alert-triangle",
      meta: "Faltando ao menos 1 campo-chave",
      onClick: () => selectTab("incompletos"),
    },
    {
      title: "Possíveis duplicados (nome)",
      value: s.duplicidadesNome,
      icon: "users",
      meta: "Grupos com nome igual (sem acentos/maiúsculas)",
      tooltip: "Apenas uma sugestão -- confira manualmente antes de qualquer ação.",
      onClick: () => selectTab("duplicadosNome"),
    },
    {
      title: "Possíveis duplicados (telefone)",
      value: s.duplicidadesTelefone,
      icon: "phone",
      meta: "Grupos com o mesmo telefone/celular",
      tooltip: "Apenas uma sugestão -- confira manualmente antes de qualquer ação.",
      onClick: () => selectTab("duplicadosTelefone"),
    },
    {
      title: "Datas incoerentes",
      value: s.inconsistenciasData,
      icon: "calendar-off",
      meta: "Nascimento/batismo no futuro ou fora de ordem",
      onClick: () => selectTab("datas"),
    },
    {
      title: "Cidades com grafia semelhante",
      value: s.cidadesSemelhantes,
      icon: "map-pin",
      meta: "Podem ser a mesma cidade cadastrada 2x",
      onClick: () => selectTab("cidades"),
    },
    {
      title: "Congregações com grafia semelhante",
      value: s.congregacoesSemelhantes,
      icon: "building-2",
      meta: "Mesmo nome, mesma cidade",
      onClick: () => selectTab("congregacoes"),
    },
  ]);
}

function renderTabs() {
  const container = qs("#quality-tabs");
  container.innerHTML = "";
  TABS.forEach((tabDef) => {
    const btn = el("button", { type: "button", class: `wizard-step${activeTab === tabDef.key ? " active" : ""}` }, tabDef.label);
    btn.addEventListener("click", () => selectTab(tabDef.key));
    container.appendChild(btn);
  });
  refreshIcons();
}

function openYouthAction(y) {
  return { icon: "eye", label: "Ver ficha", onClick: () => openYouthFicha(y, cityName(y.cidadeId), congName(y.congregacaoId)) };
}

function editYouthAction(y) {
  return { icon: "pencil", label: "Abrir cadastro", onClick: () => window.location.assign(`jovens.html?edit=${y.id}`) };
}

function tableContainer() {
  const div = el("div", { class: "surface", style: "padding: var(--space-4);" }, [el("div", { id: "quality-table" })]);
  return div;
}

function drawTable(columns, rows, actions, emptyMessage) {
  const container = qs("#quality-table");
  function draw() {
    renderDataTable(container, {
      columns,
      rows: sortRows(rows, tableSort),
      actions,
      sort: tableSort,
      onSortChange: (key) => {
        tableSort = { key, dir: tableSort.key === key && tableSort.dir === "asc" ? "desc" : "asc" };
        draw();
      },
      emptyMessage,
    });
  }
  draw();
}

function renderContent() {
  const container = qs("#quality-content");
  container.innerHTML = "";
  container.appendChild(tableContainer());

  switch (activeTab) {
    case "incompletos":
      return renderIncompletos();
    case "duplicadosNome":
      return renderDuplicadosNome();
    case "duplicadosTelefone":
      return renderDuplicadosTelefone();
    case "datas":
      return renderDatas();
    case "cidades":
      return renderCidadesSemelhantes();
    case "congregacoes":
      return renderCongregacoesSemelhantes();
  }
}

function renderIncompletos() {
  const rows = DataQualityService.incompleteRecords(youth).map((r) => ({
    id: r.youth.id,
    nome: r.youth.nome,
    cidade: cityName(r.youth.cidadeId),
    congregacao: congName(r.youth.congregacaoId),
    completude: r.score,
    faltando: r.faltando.map((f) => f.label).join(", "),
    _youth: r.youth,
  }));
  drawTable(
    [
      { key: "nome", label: "Nome" },
      { key: "cidade", label: "Cidade" },
      { key: "congregacao", label: "Congregação" },
      { key: "completude", label: "Completude", render: (r) => `${r.completude}%` },
      { key: "faltando", label: "Campos faltando", sortable: false },
    ],
    rows,
    (row) => [openYouthAction(row._youth), editYouthAction(row._youth)],
    "Nenhum cadastro incompleto encontrado -- todos os campos-chave estão preenchidos."
  );
}

function renderDuplicadosNome() {
  const groups = DataQualityService.possibleDuplicateNames(youth);
  const rows = [];
  groups.forEach((group, i) => {
    group.forEach((y) => rows.push({ grupo: i + 1, nome: y.nome, cidade: cityName(y.cidadeId), congregacao: congName(y.congregacaoId), _youth: y }));
  });
  drawTable(
    [
      { key: "grupo", label: "Grupo" },
      { key: "nome", label: "Nome" },
      { key: "cidade", label: "Cidade" },
      { key: "congregacao", label: "Congregação" },
    ],
    rows,
    (row) => [openYouthAction(row._youth), editYouthAction(row._youth)],
    "Nenhum nome repetido encontrado."
  );
}

function renderDuplicadosTelefone() {
  const groups = DataQualityService.possibleDuplicatePhones(youth);
  const rows = [];
  groups.forEach((group, i) => {
    group.forEach((y) =>
      rows.push({
        grupo: i + 1,
        nome: y.nome,
        telefone: y.telefone || y.celular || "—",
        cidade: cityName(y.cidadeId),
        congregacao: congName(y.congregacaoId),
        _youth: y,
      })
    );
  });
  drawTable(
    [
      { key: "grupo", label: "Grupo" },
      { key: "nome", label: "Nome" },
      { key: "telefone", label: "Telefone" },
      { key: "cidade", label: "Cidade" },
      { key: "congregacao", label: "Congregação" },
    ],
    rows,
    (row) => [openYouthAction(row._youth), editYouthAction(row._youth)],
    "Nenhum telefone repetido encontrado."
  );
}

function renderDatas() {
  const rows = DataQualityService.dateInconsistencies(youth).map((r) => ({
    nome: r.youth.nome,
    tipo: r.tipo,
    detalhe: r.detalhe,
    cidade: cityName(r.youth.cidadeId),
    _youth: r.youth,
  }));
  drawTable(
    [
      { key: "nome", label: "Nome" },
      { key: "tipo", label: "Inconsistência", sortable: false },
      { key: "detalhe", label: "Detalhe", sortable: false },
      { key: "cidade", label: "Cidade" },
    ],
    rows,
    (row) => [openYouthAction(row._youth), editYouthAction(row._youth)],
    "Nenhuma inconsistência de datas encontrada."
  );
}

function renderCidadesSemelhantes() {
  const groups = DataQualityService.possiblySameCities(cities);
  const rows = [];
  groups.forEach((group, i) => group.forEach((c) => rows.push({ grupo: i + 1, cidade: c.nome, estado: c.estado || "—" })));
  drawTable(
    [
      { key: "grupo", label: "Grupo" },
      { key: "cidade", label: "Cidade (como está cadastrada)" },
      { key: "estado", label: "Estado" },
    ],
    rows,
    null,
    "Nenhuma cidade com grafia semelhante encontrada."
  );
}

function renderCongregacoesSemelhantes() {
  const groups = DataQualityService.possiblySameCongregations(congregations);
  const rows = [];
  groups.forEach((group, i) =>
    group.forEach((c) => rows.push({ grupo: i + 1, congregacao: c.nome, cidade: cityName(c.cidadeId), bairro: c.bairro || "—" }))
  );
  drawTable(
    [
      { key: "grupo", label: "Grupo" },
      { key: "congregacao", label: "Congregação (como está cadastrada)" },
      { key: "cidade", label: "Cidade" },
      { key: "bairro", label: "Bairro" },
    ],
    rows,
    null,
    "Nenhuma congregação com grafia semelhante encontrada."
  );
}

refreshIcons();
