import { STORES } from "../config/constants.js";

/**
 * Runs schema migrations for the portal_expansao_db IndexedDB database.
 * Each version bump should add a branch here rather than rewriting existing ones,
 * so upgrades from any older version keep working.
 */
export function runMigrations(db, oldVersion) {
  if (oldVersion < 1) {
    const cities = db.createObjectStore(STORES.CITIES, { keyPath: "id" });
    cities.createIndex("nome", "nome", { unique: false });
    cities.createIndex("ativo", "ativo", { unique: false });

    const congregations = db.createObjectStore(STORES.CONGREGATIONS, { keyPath: "id" });
    congregations.createIndex("cidadeId", "cidadeId", { unique: false });
    congregations.createIndex("nome", "nome", { unique: false });
    congregations.createIndex("ativo", "ativo", { unique: false });

    const youth = db.createObjectStore(STORES.YOUTH, { keyPath: "id" });
    youth.createIndex("cidadeId", "cidadeId", { unique: false });
    youth.createIndex("congregacaoId", "congregacaoId", { unique: false });
    youth.createIndex("status", "status", { unique: false });
    youth.createIndex("nome", "nome", { unique: false });

    const events = db.createObjectStore(STORES.EVENTS, { keyPath: "id" });
    events.createIndex("cidadeId", "cidadeId", { unique: false });
    events.createIndex("data", "data", { unique: false });
    events.createIndex("tipo", "tipo", { unique: false });

    db.createObjectStore(STORES.IMPORT_HISTORY, { keyPath: "id" });
    db.createObjectStore(STORES.SETTINGS, { keyPath: "id" });
  }
}
