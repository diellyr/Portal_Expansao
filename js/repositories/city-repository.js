import { getAll, getById, put, remove, STORES } from "../database/db.js";

/**
 * Repository for the "cities" store. This is the only module allowed to talk
 * to IndexedDB for cities. Swapping IndexedDB for Supabase later means
 * rewriting only this file — services and pages never change.
 */
export const CityRepository = {
  async list() {
    return getAll(STORES.CITIES);
  },
  async getById(id) {
    return getById(STORES.CITIES, id);
  },
  async save(city) {
    return put(STORES.CITIES, city);
  },
  async remove(id) {
    return remove(STORES.CITIES, id);
  },
};
