const STORAGE_KEY = "portal_expansao_data_mode";

export const DATA_MODES = {
  INDEXEDDB: "indexeddb",
  SUPABASE: "supabase",
};

export function getDataMode() {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === DATA_MODES.SUPABASE ? DATA_MODES.SUPABASE : DATA_MODES.INDEXEDDB;
}

export function setDataMode(mode) {
  localStorage.setItem(STORAGE_KEY, mode === DATA_MODES.SUPABASE ? DATA_MODES.SUPABASE : DATA_MODES.INDEXEDDB);
}

export function isSupabaseMode() {
  return getDataMode() === DATA_MODES.SUPABASE;
}
