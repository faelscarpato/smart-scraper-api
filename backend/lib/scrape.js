import * as cheerio from "cheerio";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

/**
 * Baixa uma página e extrai texto limpo, metadados e links.
 * @param {string} url
 * @param {{ timeoutMs?: number, maxChars?: number, includeLinks?: boolean }} [options]
 */
export async function scrape(url, options = {}) {
  const { timeoutMs = 20000, maxChars = 20000, includeLinks = true } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": UA, Accept: "text/html,*/*" },
    });

    const contentType = res.headers.get("content-type") || "";
    if (!res.ok) {
      return { url, ok: false, status: res.status, error: `HTTP ${res.status}` };
    }
    if (!contentType.includes("html")) {
      return { url, ok: false, status: res.status, error: `Conteúdo não-HTML (${contentType})` };
    }

    const html = await res.text();
    const $ = cheerio.load(html);
    $("script, style, noscript, svg, iframe, nav, footer, header, aside").remove();

    const meta = (sel, attr = "content") => $(sel).first().attr(attr)?.trim() || "";
    const root = $("article").length ? $("article") : $("main").length ? $("main") : $("body");
    const text = root.text().replace(/[ \t\u00a0]+/g, " ").replace(/\n\s*\n+/g, "\n\n").trim();

    const headings = [];
    root.find("h1, h2, h3").each((_, el) => {
      const t = $(el).text().replace(/\s+/g, " ").trim();
      if (t) headings.push({ tag: el.tagName.toLowerCase(), text: t });
    });

    const links = [];
    if (includeLinks) {
      const seen = new Set();
      root.find("a[href]").each((_, el) => {
        try {
          const abs = new URL($(el).attr("href"), res.url).toString();
          if (!/^https?:/.test(abs) || seen.has(abs)) return;
          seen.add(abs);
          links.push({ url: abs, text: $(el).text().replace(/\s+/g, " ").trim() });
        } catch {
          /* ignora href inválido */
        }
      });
    }

    return {
      url,
      finalUrl: res.url,
      ok: true,
      status: res.status,
      title: $("title").first().text().trim() || meta('meta[property="og:title"]'),
      description:
        meta('meta[name="description"]') || meta('meta[property="og:description"]'),
      image: meta('meta[property="og:image"]'),
      lang: $("html").attr("lang") || "",
      headings: headings.slice(0, 50),
      wordCount: text.split(/\s+/).filter(Boolean).length,
      text: text.slice(0, maxChars),
      truncated: text.length > maxChars,
      links: links.slice(0, 200),
    };
  } catch (err) {
    return { url, ok: false, error: err.name === "AbortError" ? "Timeout" : String(err.message || err) };
  } finally {
    clearTimeout(timer);
  }
}

/** Faz scraping de várias URLs com limite de concorrência. */
export async function scrapeMany(urls, options = {}, concurrency = 3) {
  const out = [];
  let i = 0;
  const workers = Array.from({ length: Math.min(concurrency, urls.length) }, async () => {
    while (i < urls.length) {
      const idx = i++;
      out[idx] = await scrape(urls[idx], options);
    }
  });
  await Promise.all(workers);
  return out;
}