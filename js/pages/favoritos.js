import { bootstrapPage } from "../app.js";
import { PreferencesService } from "../services/preferences-service.js";
import { CityService } from "../services/city-service.js";
import { YouthService } from "../services/youth-service.js";
import { CongregationService } from "../services/congregation-service.js";
import { openYouthFicha } from "../components/youth-ficha-modal.js";
import { confirmModal } from "../components/modal.js";
import { renderEmptyState } from "../components/empty-state.js";
import { toast } from "../components/toast.js";
import { el, qs, refreshIcons } from "../utils/dom-utils.js";
import { calculateAge } from "../utils/dates.js";

const ok = await bootstrapPage({ activeKey: "favoritos", title: "Favoritos e Preferências" });
if (ok) init();

let cities = [];

async function init() {
  if (!PreferencesService.isAvailable()) {
    qs("#prefs-unavailable-notice").hidden = false;
  }

  cities = await CityService.list();

  const rowsSelect = qs("#rows-per-page-pref");
  const currentRows = PreferencesService.getJovensRowsPerPage(12);
  if (![...rowsSelect.options].some((o) => Number(o.value) === currentRows)) {
    rowsSelect.appendChild(new Option(String(currentRows), String(currentRows)));
  }
  rowsSelect.value = String(currentRows);
  rowsSelect.addEventListener("change", (e) => {
    const ok2 = PreferencesService.setJovensRowsPerPage(Number(e.target.value));
    toast[ok2 ? "success" : "error"](ok2 ? "Preferência salva." : "Não foi possível salvar a preferência.");
  });

  qs("#clear-prefs-btn").addEventListener("click", async () => {
    const confirmed = await confirmModal({
      title: "Limpar preferências locais",
      message: "Isso remove cidades favoritas, jovens vistos recentemente e preferências de exibição salvos neste navegador. Nenhum dado no Supabase é afetado. Deseja continuar?",
      confirmLabel: "Limpar",
      danger: true,
    });
    if (!confirmed) return;
    const cleared = PreferencesService.clearAll();
    toast[cleared ? "success" : "error"](cleared ? "Preferências locais removidas." : "Não foi possível limpar as preferências.");
    render();
  });

  render();
}

function render() {
  renderFavoriteCities();
  renderRecentYouth();
}

function renderFavoriteCities() {
  const container = qs("#favorite-cities-list");
  container.innerHTML = "";
  const favoriteIds = PreferencesService.getFavoriteCityIds();
  const favoriteCities = cities.filter((c) => favoriteIds.includes(c.id));

  if (!favoriteCities.length) {
    renderEmptyState(container, {
      icon: "star",
      title: "Nenhuma cidade favoritada ainda",
      description: 'Use o ícone de estrela na página Cidades para adicionar favoritas.',
    });
    return;
  }

  const list = el(
    "div",
    { class: "grid grid-cards" },
    favoriteCities.map((c) =>
      el("div", { class: "surface", style: "padding: var(--space-4); display:flex; align-items:center; justify-content:space-between; gap: var(--space-3);" }, [
        el("div", {}, [el("i", { "data-lucide": "star", class: "icon icon-sm favorite-star-active" }), el("span", { style: "margin-left: 8px; font-weight: 600;" }, c.nome)]),
        el(
          "button",
          {
            type: "button",
            class: "btn btn-ghost btn-sm btn-icon",
            "aria-label": "Remover dos favoritos",
            "data-tooltip": "Remover dos favoritos",
            onClick: () => {
              PreferencesService.toggleFavoriteCity(c.id);
              render();
            },
          },
          [el("i", { "data-lucide": "x", class: "icon icon-sm" })]
        ),
      ])
    )
  );
  container.appendChild(list);
  refreshIcons();
}

function renderRecentYouth() {
  const container = qs("#recent-youth-list");
  container.innerHTML = "";
  const recent = PreferencesService.getRecentYouth();

  if (!recent.length) {
    renderEmptyState(container, {
      icon: "history",
      title: "Nenhum jovem visto recentemente",
      description: "Abra a ficha de um jovem em Jovens, Qualidade dos Cadastros ou na Pesquisa Global para vê-lo aqui.",
    });
    return;
  }

  const list = el(
    "div",
    { class: "grid grid-cards" },
    recent.map((r) =>
      el("div", { class: "surface", style: "padding: var(--space-4); display:flex; align-items:center; justify-content:space-between; gap: var(--space-3);" }, [
        el("span", { style: "font-weight: 600;" }, r.nome),
        el(
          "button",
          { type: "button", class: "btn btn-secondary btn-sm", onClick: () => openRecentYouthFicha(r) },
          [el("i", { "data-lucide": "eye", class: "icon icon-sm" }), " Ver ficha"]
        ),
      ])
    )
  );
  container.appendChild(list);
  refreshIcons();
}

async function openRecentYouthFicha(recentEntry) {
  const youth = await YouthService.getById(recentEntry.id);
  if (!youth) {
    toast.warning("Este cadastro não existe mais.");
    return;
  }
  const cityLabel = cities.find((c) => c.id === youth.cidadeId)?.nome || "Não informado";
  const congLabel = youth.congregacaoId
    ? (await CongregationService.getById(youth.congregacaoId))?.nome || "—"
    : "Sem igreja cadastrada";
  openYouthFicha({ ...youth, idade: calculateAge(youth.dataNascimento) }, cityLabel, congLabel);
}

refreshIcons();
