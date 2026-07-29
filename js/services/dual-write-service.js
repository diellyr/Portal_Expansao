import { put as indexedDbPut } from "../database/db.js";
import * as supabaseDb from "../database/supabase-db.js";
import { isSupabaseMode } from "./data-mode-service.js";
import { isSupabaseConfigured } from "./supabase-settings-service.js";

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
      console.warn(`Não foi possível espelhar o registro em "${table}" para o IndexedDB:`, err);
    }
    return;
  }

  if (!isSupabaseConfigured()) return;
  try {
    await supabaseDb.put(table, record);
  } catch (err) {
    supabaseMirrorFailed = true;
    console.warn(`Não foi possível espelhar o registro em "${table}" para o Supabase:`, err);
  }
}

/** Call once per commitImport() run to know whether to warn the user. */
export function consumeSupabaseMirrorFailure() {
  const failed = supabaseMirrorFailed;
  supabaseMirrorFailed = false;
  return failed;
}
