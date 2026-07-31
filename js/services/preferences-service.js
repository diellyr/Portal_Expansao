const STORAGE_KEY = "portal_expansao_local_prefs";
const MAX_RECENT_YOUTH = 8;

/**
 * Favoritos, Filtros Recentes e Preferências -- purely browser-local UI
 * preferences, stored in a single localStorage key. Never stores tokens,
 * passwords, or full personal youth records: recently-viewed youth keep
 * only id+nome (just enough to show a name and reopen the existing ficha
 * modal), never phone/birthdate/address/documents. Every read/write is
 * wrapped so a full/blocked localStorage (private browsing, quota, etc.)
 * degrades to "no preferences" instead of throwing.
 */
function defaults() {
  return { favoriteCityIds: [], recentYouth: [], jovensRowsPerPage: null };
}

function safeRead() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults();
    return { ...defaults(), ...JSON.parse(raw) };
  } catch {
    return defaults();
  }
}

function safeWrite(prefs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    return true;
  } catch {
    return false;
  }
}

export const PreferencesService = {
  isAvailable() {
    try {
      const testKey = "__portal_expansao_prefs_test__";
      localStorage.setItem(testKey, "1");
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  },

  getFavoriteCityIds() {
    return safeRead().favoriteCityIds;
  },
  isFavoriteCity(cityId) {
    return this.getFavoriteCityIds().includes(cityId);
  },
  toggleFavoriteCity(cityId) {
    const prefs = safeRead();
    prefs.favoriteCityIds = prefs.favoriteCityIds.includes(cityId)
      ? prefs.favoriteCityIds.filter((id) => id !== cityId)
      : [...prefs.favoriteCityIds, cityId];
    return safeWrite(prefs);
  },

  getRecentYouth() {
    return safeRead().recentYouth;
  },
  addRecentYouth(id, nome) {
    const prefs = safeRead();
    const withoutThis = prefs.recentYouth.filter((r) => r.id !== id);
    prefs.recentYouth = [{ id, nome }, ...withoutThis].slice(0, MAX_RECENT_YOUTH);
    return safeWrite(prefs);
  },

  getJovensRowsPerPage(fallback) {
    const value = safeRead().jovensRowsPerPage;
    return typeof value === "number" && value > 0 ? value : fallback;
  },
  setJovensRowsPerPage(value) {
    const prefs = safeRead();
    prefs.jovensRowsPerPage = value;
    return safeWrite(prefs);
  },

  clearAll() {
    try {
      localStorage.removeItem(STORAGE_KEY);
      return true;
    } catch {
      return false;
    }
  },
};
