import { getAll, getById, put, remove, STORES } from "../database/db.js";

export const EventRepository = {
  async list() {
    return getAll(STORES.EVENTS);
  },
  async getById(id) {
    return getById(STORES.EVENTS, id);
  },
  async save(event) {
    return put(STORES.EVENTS, event);
  },
  async remove(id) {
    return remove(STORES.EVENTS, id);
  },
};
