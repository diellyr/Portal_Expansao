import { getAll, getById, put, remove, STORES } from "../database/db.js";
import * as supabaseDb from "../database/supabase-db.js";
import { isSupabaseMode } from "../services/data-mode-service.js";

export const EventRepository = {
  async list() {
    return isSupabaseMode() ? supabaseDb.getAll(STORES.EVENTS) : getAll(STORES.EVENTS);
  },
  async getById(id) {
    return isSupabaseMode() ? supabaseDb.getById(STORES.EVENTS, id) : getById(STORES.EVENTS, id);
  },
  async save(event) {
    return isSupabaseMode() ? supabaseDb.put(STORES.EVENTS, event) : put(STORES.EVENTS, event);
  },
  async remove(id) {
    return isSupabaseMode() ? supabaseDb.remove(STORES.EVENTS, id) : remove(STORES.EVENTS, id);
  },
};
