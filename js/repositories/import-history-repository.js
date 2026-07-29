import { getAll, getById, put, remove, clearStore, STORES } from "../database/db.js";
import * as supabaseDb from "../database/supabase-db.js";
import { isSupabaseMode } from "../services/data-mode-service.js";

export const ImportHistoryRepository = {
  async list() {
    return isSupabaseMode() ? supabaseDb.getAll(STORES.IMPORT_HISTORY) : getAll(STORES.IMPORT_HISTORY);
  },
  async getById(id) {
    return isSupabaseMode() ? supabaseDb.getById(STORES.IMPORT_HISTORY, id) : getById(STORES.IMPORT_HISTORY, id);
  },
  async save(entry) {
    return isSupabaseMode() ? supabaseDb.put(STORES.IMPORT_HISTORY, entry) : put(STORES.IMPORT_HISTORY, entry);
  },
  async remove(id) {
    return isSupabaseMode() ? supabaseDb.remove(STORES.IMPORT_HISTORY, id) : remove(STORES.IMPORT_HISTORY, id);
  },
  async clear() {
    return isSupabaseMode() ? supabaseDb.clearStore(STORES.IMPORT_HISTORY) : clearStore(STORES.IMPORT_HISTORY);
  },
};
