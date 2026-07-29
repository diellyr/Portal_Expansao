import { getById, put, STORES } from "../database/db.js";

const SETTINGS_ID = "app-settings";

export const SettingsRepository = {
  async get() {
    const settings = await getById(STORES.SETTINGS, SETTINGS_ID);
    return settings || { id: SETTINGS_ID, cityColors: {}, sidebarCollapsed: false };
  },
  async save(settings) {
    return put(STORES.SETTINGS, { ...settings, id: SETTINGS_ID });
  },
};
