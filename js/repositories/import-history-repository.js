import { getAll, getById, put, remove, clearStore, STORES } from "../database/db.js";

export const ImportHistoryRepository = {
  async list() {
    return getAll(STORES.IMPORT_HISTORY);
  },
  async getById(id) {
    return getById(STORES.IMPORT_HISTORY, id);
  },
  async save(entry) {
    return put(STORES.IMPORT_HISTORY, entry);
  },
  async remove(id) {
    return remove(STORES.IMPORT_HISTORY, id);
  },
  async clear() {
    return clearStore(STORES.IMPORT_HISTORY);
  },
};
