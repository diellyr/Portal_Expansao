import { getAll, getById, put, remove, bulkPut, STORES } from "../database/db.js";

export const YouthRepository = {
  async list() {
    return getAll(STORES.YOUTH);
  },
  async getById(id) {
    return getById(STORES.YOUTH, id);
  },
  async save(youth) {
    return put(STORES.YOUTH, youth);
  },
  async bulkSave(youthList) {
    return bulkPut(STORES.YOUTH, youthList);
  },
  async remove(id) {
    return remove(STORES.YOUTH, id);
  },
};
