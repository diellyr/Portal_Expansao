import { DB_NAME, DB_VERSION, STORES } from "../config/constants.js";
import { runMigrations } from "./migrations.js";

let dbInstance = null;
let openPromise = null;

function openDatabase() {
  if (openPromise) return openPromise;
  openPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      runMigrations(request.result, event.oldVersion, event.newVersion);
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      dbInstance.onversionchange = () => {
        dbInstance.close();
        dbInstance = null;
        openPromise = null;
      };
      resolve(dbInstance);
    };

    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("Abertura do banco bloqueada por outra aba."));
  });
  return openPromise;
}

export async function getDB() {
  return dbInstance || openDatabase();
}

export function tx(storeName, mode = "readonly") {
  return getDB().then((db) => db.transaction(storeName, mode).objectStore(storeName));
}

export function promisifyRequest(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getAll(storeName) {
  const store = await tx(storeName, "readonly");
  return promisifyRequest(store.getAll());
}

export async function getById(storeName, id) {
  const store = await tx(storeName, "readonly");
  return promisifyRequest(store.get(id));
}

export async function put(storeName, record) {
  const store = await tx(storeName, "readwrite");
  await promisifyRequest(store.put(record));
  return record;
}

export async function bulkPut(storeName, records) {
  const store = await tx(storeName, "readwrite");
  await Promise.all(records.map((record) => promisifyRequest(store.put(record))));
  return records;
}

export async function remove(storeName, id) {
  const store = await tx(storeName, "readwrite");
  await promisifyRequest(store.delete(id));
}

export async function clearStore(storeName) {
  const store = await tx(storeName, "readwrite");
  await promisifyRequest(store.clear());
}

export async function clearAllStores() {
  for (const storeName of Object.values(STORES)) {
    await clearStore(storeName);
  }
}

export async function countAll(storeName) {
  const store = await tx(storeName, "readonly");
  return promisifyRequest(store.count());
}

export { STORES };
