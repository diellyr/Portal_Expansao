import { YouthService } from "./youth-service.js";
import { CityService } from "./city-service.js";
import { CongregationService } from "./congregation-service.js";
import { normalizeText, normalizePhone, tokenize, matchesAllTerms } from "../utils/text-utils.js";

/**
 * Pesquisa Global Inteligente -- searches youth already loaded through the
 * same read-scoped services every other page uses (so results automatically
 * respect whatever the current role/city can see), matching by name, city,
 * congregação, conselheiro local/da cidade, pastor, instrumento, outros
 * talentos and phone digits. Indexed in-memory per page view; rebuilt after
 * CACHE_TTL_MS so a long-open tab doesn't keep searching stale data, but
 * repeated keystrokes on the same page don't re-query the backend each time.
 */
const CACHE_TTL_MS = 60_000;
let cache = null;
let cacheBuiltAt = 0;

async function buildIndex() {
  const [cities, congregations, youthRaw] = await Promise.all([
    CityService.list(),
    CongregationService.list(),
    YouthService.list(),
  ]);
  const cityMap = Object.fromEntries(cities.map((c) => [c.id, c.nome]));
  const congMap = Object.fromEntries(congregations.map((c) => [c.id, c.nome]));

  const entries = youthRaw.map((y) => {
    const cidade = cityMap[y.cidadeId] || "";
    const congregacao = congMap[y.congregacaoId] || "";
    const talentos = [y.instrumento, y.outrosTalentos, y.prega ? "prega" : "", y.canta ? "canta" : ""].filter(Boolean).join(" ");
    const haystack = normalizeText([y.nome, cidade, congregacao, y.pastor, y.conselheiroLocal, y.conselheiroCidade, talentos].join(" "));
    const phoneDigits = `${normalizePhone(y.telefone)} ${normalizePhone(y.celular)}`;
    return { youth: y, cidade, congregacao, haystack, phoneDigits };
  });

  return entries;
}

async function getIndex() {
  const now = Date.now();
  if (!cache || now - cacheBuiltAt > CACHE_TTL_MS) {
    cache = await buildIndex();
    cacheBuiltAt = now;
  }
  return cache;
}

export const SearchService = {
  /** Returns up to `limit` matches: [{ youth, cidade, congregacao }]. Empty array for a blank/whitespace-only query. */
  async search(query, limit = 8) {
    const terms = tokenize(query);
    if (!terms.length) return [];

    const entries = await getIndex();
    const digitsQuery = String(query).replace(/\D/g, "");
    const matches = entries.filter((e) => {
      if (matchesAllTerms(e.haystack, terms)) return true;
      return digitsQuery.length >= 4 && e.phoneDigits.includes(digitsQuery);
    });

    return matches.slice(0, limit).map((e) => ({ youth: e.youth, cidade: e.cidade, congregacao: e.congregacao }));
  },

  /** Forces the next search() call to reload from the backend -- call after saving/removing a youth on the current page. */
  invalidate() {
    cache = null;
  },
};
