import { getAll, getById, put, remove, STORES } from "../database/db.js";
import * as supabaseDb from "../database/supabase-db.js";
import { isSupabaseMode } from "../services/data-mode-service.js";

export const CongregationRepository = {
  async list() {
    return isSupabaseMode() ? supabaseDb.getAll(STORES.CONGREGATIONS) : getAll(STORES.CONGREGATIONS);
  },
  async getById(id) {
    return isSupabaseMode() ? supabaseDb.getById(STORES.CONGREGATIONS, id) : getById(STORES.CONGREGATIONS, id);
  },
  async save(congregation) {
    return isSupabaseMode() ? supabaseDb.put(STORES.CONGREGATIONS, congregation) : put(STORES.CONGREGATIONS, congregation);
  },
  async remove(id) {
    return isSupabaseMode() ? supabaseDb.remove(STORES.CONGREGATIONS, id) : remove(STORES.CONGREGATIONS, id);
  },
};
