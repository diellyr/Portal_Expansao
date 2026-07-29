import { getAll, getById, put, remove, bulkPut, STORES } from "../database/db.js";
import * as supabaseDb from "../database/supabase-db.js";
import { isSupabaseMode } from "../services/data-mode-service.js";

export const YouthRepository = {
  async list() {
    return isSupabaseMode() ? supabaseDb.getAll(STORES.YOUTH) : getAll(STORES.YOUTH);
  },
  async getById(id) {
    return isSupabaseMode() ? supabaseDb.getById(STORES.YOUTH, id) : getById(STORES.YOUTH, id);
  },
  async save(youth) {
    return isSupabaseMode() ? supabaseDb.put(STORES.YOUTH, youth) : put(STORES.YOUTH, youth);
  },
  async bulkSave(youthList) {
    return isSupabaseMode() ? supabaseDb.bulkPut(STORES.YOUTH, youthList) : bulkPut(STORES.YOUTH, youthList);
  },
  async remove(id) {
    return isSupabaseMode() ? supabaseDb.remove(STORES.YOUTH, id) : remove(STORES.YOUTH, id);
  },
};
