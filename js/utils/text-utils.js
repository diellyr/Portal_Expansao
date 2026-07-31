/**
 * Shared text-normalization helpers used across search, duplicate detection
 * and "possibly the same city/congregation" grouping. Never mutates stored
 * data -- only used for comparisons.
 */

const DIACRITICS_REGEX = new RegExp("[\\u0300-\\u036f]", "g");

/** Lowercase, strip accents, trim and collapse internal whitespace. */
export function normalizeText(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .normalize("NFD")
    .replace(DIACRITICS_REGEX, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

/** Keeps only digits, so phone numbers compare the same regardless of (), -, spaces. */
export function normalizePhone(value) {
  if (!value) return "";
  return String(value).replace(/\D/g, "");
}

/** Splits a search query into normalized, non-empty terms. */
export function tokenize(query) {
  return normalizeText(query).split(" ").filter(Boolean);
}

/** True if every term appears somewhere in the (already normalized) haystack. */
export function matchesAllTerms(haystackText, terms) {
  return terms.length > 0 && terms.every((term) => haystackText.includes(term));
}

/** True if at least one term appears in the (already normalized) haystack. */
export function matchesAnyTerm(haystackText, terms) {
  return terms.some((term) => haystackText.includes(term));
}
