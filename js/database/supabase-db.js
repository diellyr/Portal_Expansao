import { getSupabaseClient } from "./supabase-client.js";
import { toSnakeCaseObject, toCamelCaseObject } from "../utils/case-utils.js";
import { STORES } from "../config/constants.js";

/**
 * Mirrors database/db.js's API (getAll/getById/put/bulkPut/remove/clearStore)
 * but talks to Supabase instead of IndexedDB. Table names match STORES values
 * one-to-one with the SQL schema (see README).
 */

export async function getAll(table) {
  const client = await getSupabaseClient();
  const { data, error } = await client.from(table).select("*");
  if (error) throw new Error(`Supabase (${table}): ${error.message}`);
  return (data || []).map(toCamelCaseObject);
}

export async function getById(table, id) {
  const client = await getSupabaseClient();
  const { data, error } = await client.from(table).select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`Supabase (${table}): ${error.message}`);
  return data ? toCamelCaseObject(data) : undefined;
}

export async function put(table, record) {
  const client = await getSupabaseClient();
  const { error } = await client.from(table).upsert(toSnakeCaseObject(record));
  if (error) throw new Error(`Supabase (${table}): ${error.message}`);
  return record;
}

export async function bulkPut(table, records) {
  const client = await getSupabaseClient();
  const { error } = await client.from(table).upsert(records.map(toSnakeCaseObject));
  if (error) throw new Error(`Supabase (${table}): ${error.message}`);
  return records;
}

export async function remove(table, id) {
  const client = await getSupabaseClient();
  const { error } = await client.from(table).delete().eq("id", id);
  if (error) throw new Error(`Supabase (${table}): ${error.message}`);
}

export async function clearStore(table) {
  const client = await getSupabaseClient();
  const { error } = await client.from(table).delete().not("id", "is", null);
  if (error) throw new Error(`Supabase (${table}): ${error.message}`);
}

export async function clearAllStores() {
  for (const table of Object.values(STORES)) {
    await clearStore(table);
  }
}
