import * as cheerio from "cheerio";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

/** Decodes DuckDuckGo redirect links (/l/?uddg=...) into real URLs. */
function normalizeUrl(href) {
  if (!href) return null;
  try {
    if (href.startsWith("//")) href = "https:" + href;
    const u = new URL(href, "https://duckduckgo.com");
    const uddg = u.searchParams.get("uddg");
    if (uddg) return decodeURIComponent(uddg);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    if (u.hostname.endsWith("duckduckgo.com")) return null;
    return u.toString();
  } catch {
    return null;
  }
}

/**
 * Busca no DuckDuckGo (endpoint HTML, sem API key).
 * @param {string} query
 * @param {{ limit?: number, region?: string, timeoutMs?: number }} [options]
 * @returns {Promise<Array<{url:string,title:string,snippet:string,position:number}>>}
 */
export async function search(query, options = {}) {
  const { limit = 10, region = "br-pt", timeoutMs = 15000 } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let html;
  try {
    const res = await fetch("https://html.duckduckgo.com/html/", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "User-Agent": UA,
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
      },
      body: new URLSearchParams({ q: query, kl: region }).toString(),
    });
    if (!res.ok) throw new Error(`DuckDuckGo respondeu ${res.status}`);
    html = await res.text();
  } finally {
    clearTimeout(timer);
  }

  const $ = cheerio.load(html);
  const results = [];
  const seen = new Set();

  $(".result, .web-result").each((_, el) => {
    const node = $(el);
    const url = normalizeUrl(node.find("a.result__a").attr("href"));
    if (!url || seen.has(url)) return;
    seen.add(url);
    results.push({
      url,
      title: node.find("a.result__a").text().trim(),
      snippet: node.find(".result__snippet").text().replace(/\s+/g, " ").trim(),
      position: results.length + 1,
    });
  });

  return results.slice(0, limit);
}