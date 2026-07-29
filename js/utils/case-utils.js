/** Converts a camelCase object's keys to snake_case (one level deep — records here are flat). */
export function toSnakeCaseObject(obj) {
  const out = {};
  for (const [key, value] of Object.entries(obj)) {
    out[key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)] = value;
  }
  return out;
}

/** Converts a snake_case object's keys to camelCase (one level deep). */
export function toCamelCaseObject(obj) {
  const out = {};
  for (const [key, value] of Object.entries(obj)) {
    out[key.replace(/_([a-z0-9])/g, (_, letter) => letter.toUpperCase())] = value;
  }
  return out;
}
