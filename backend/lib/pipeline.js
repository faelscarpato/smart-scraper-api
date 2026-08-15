import { search } from "./search.js";
import { rankResults, keywords } from "./rank.js";
import { scrapeMany } from "./scrape.js";

/**
 * Fluxo principal: busca -> ranqueia contra o pedido -> abre os melhores -> raspa.
 * @param {string} query pedido do usuário em linguagem natural
 * @param {{
 *  limit?: number, topN?: number, minScore?: number, keywords?: string[],
 *  region?: string, maxChars?: number, includeLinks?: boolean, concurrency?: number,
 *  scrape?: boolean
 * }} [options]
 */
export async function smartSearch(query, options = {}) {
  const {
    limit = 10,
    topN = 3,
    minScore = 0,
    keywords: extra = [],
    region = "br-pt",
    maxChars = 20000,
    includeLinks = false,
    concurrency = 3,
    scrape: doScrape = true,
  } = options;

  const startedAt = Date.now();
  const raw = await search(query, { limit, region });
  const ranked = rankResults(raw, query, extra);
  const selected = ranked.filter((r) => r.score >= minScore).slice(0, topN);

  const pages = doScrape
    ? await scrapeMany(selected.map((r) => r.url), { maxChars, includeLinks }, concurrency)
    : [];

  return {
    query,
    keywords: [...new Set([...keywords(query), ...extra])],
    tookMs: Date.now() - startedAt,
    totalResults: ranked.length,
    results: ranked,
    scraped: selected.map((r, i) => ({
      url: r.url,
      title: r.title,
      score: r.score,
      relevance: r.relevance,
      matched: r.matched,
      missing: r.missing,
      page: pages[i] ?? null,
    })),
  };
}