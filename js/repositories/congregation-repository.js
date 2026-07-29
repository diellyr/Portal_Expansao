import { getAll, getById, put, remove, STORES } from "../database/db.js";

export const CongregationRepository = {
  async list() {
    return getAll(STORES.CONGREGATIONS);
  },
  async getById(id) {
    return getById(STORES.CONGREGATIONS, id);
  },
  async save(congregation) {
    return put(STORES.CONGREGATIONS, congregation);
  },
  async remove(id) {
    return remove(STORES.CONGREGATIONS, id);
  },
};
