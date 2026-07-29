import { put as indexedDbPut } from "../database/db.js";
import * as supabaseDb from "../database/supabase-db.js";
import { isSupabaseMode } from "./data-mode-service.js";
import { isSupabaseConfigured } from "./supabase-settings-service.js";
import { logImport } from "./import-log-service.js";

let supabaseMirrorFailed = false;

/**
 * Mirrors an already-saved record to whichever backend is NOT the active one.
 * Used only by the spreadsheet import flow so IndexedDB and Supabase stay in
 * sync while both are being exercised during development — regular CRUD
 * elsewhere in the app only ever touches the active backend (see
 * data-mode-service.js).
 */
export async function mirrorToOtherBackend(table, record) {
  if (isSupabaseMode()) {
    try {
      await indexedDbPut(table, record);
    } catch (err) {
      logImport(`Falha ao espelhar "${table}" (id ${record.id}) para o IndexedDB: ${err.message}`, "error");
    }
    return;
  }

  if (!isSupabaseConfigured()) return;
  logImport(`Espelhando "${table}" (id ${record.id}) para o Supabase...`);
  try {
    await supabaseDb.put(table, record);
    logImport(`Espelhamento de "${table}" (id ${record.id}) no Supabase concluído.`);
  } catch (err) {
    supabaseMirrorFailed = true;
    logImport(`Falha ao espelhar "${table}" (id ${record.id}) para o Supabase: ${err.message}`, "error");
  }
}

/** Call once per commitImport() run to know whether to warn the user. */
export function consumeSupabaseMirrorFailure() {
  const failed = supabaseMirrorFailed;
  supabaseMirrorFailed = false;
  return failed;
}
