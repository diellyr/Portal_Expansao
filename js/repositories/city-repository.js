import { getAll, getById, put, remove, STORES } from "../database/db.js";
import * as supabaseDb from "../database/supabase-db.js";
import { isSupabaseMode } from "../services/data-mode-service.js";

/**
 * Repository for the "cities" store. This is the only module allowed to talk
 * to the database for cities. Routes to IndexedDB or Supabase based on the
 * data-source toggle in Administração — services and pages never change.
 */
export const CityRepository = {
  async list() {
    return isSupabaseMode() ? supabaseDb.getAll(STORES.CITIES) : getAll(STORES.CITIES);
  },
  async getById(id) {
    return isSupabaseMode() ? supabaseDb.getById(STORES.CITIES, id) : getById(STORES.CITIES, id);
  },
  async save(city) {
    return isSupabaseMode() ? supabaseDb.put(STORES.CITIES, city) : put(STORES.CITIES, city);
  },
  async remove(id) {
    return isSupabaseMode() ? supabaseDb.remove(STORES.CITIES, id) : remove(STORES.CITIES, id);
  },
};
