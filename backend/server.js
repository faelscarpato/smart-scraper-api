import http from "node:http";
import { search } from "./lib/search.js";
import { scrape } from "./lib/scrape.js";
import { rankResults } from "./lib/rank.js";
import { smartSearch } from "./lib/pipeline.js";

const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.HOST || "0.0.0.0";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function send(res, status, payload) {
  const body = JSON.stringify(payload, null, 2);
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", ...CORS });
  res.end(body);
}

async function readJson(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new Error("JSON inválido no corpo da requisição");
  }
}

function num(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, CORS);
    return res.end();
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const q = Object.fromEntries(url.searchParams);
  const body = req.method === "POST" ? await readJson(req).catch((e) => ({ __error: e.message })) : {};
  if (body.__error) return send(res, 400, { error: body.__error });
  const input = { ...q, ...body };

  try {
    switch (url.pathname) {
      case "/":
      case "/health":
        return send(res, 200, {
          ok: true,
          service: "scraper-api",
          endpoints: ["/search", "/scrape", "/smart-search", "/health"],
        });

      case "/search": {
        if (!input.q) return send(res, 400, { error: "Parâmetro 'q' é obrigatório" });
        const results = await search(String(input.q), {
          limit: num(input.limit, 10),
          region: input.region || "br-pt",
        });
        return send(res, 200, { query: input.q, results: rankResults(results, String(input.q), toList(input.keywords)) });
      }

      case "/scrape": {
        if (!input.url) return send(res, 400, { error: "Parâmetro 'url' é obrigatório" });
        const data = await scrape(String(input.url), {
          maxChars: num(input.maxChars, 20000),
          includeLinks: input.includeLinks !== "false" && input.includeLinks !== false,
        });
        return send(res, data.ok ? 200 : 502, data);
      }

      case "/smart-search": {
        if (!input.q) return send(res, 400, { error: "Parâmetro 'q' é obrigatório" });
        const data = await smartSearch(String(input.q), {
          limit: num(input.limit, 10),
          topN: num(input.topN, 3),
          minScore: num(input.minScore, 0),
          keywords: toList(input.keywords),
          region: input.region || "br-pt",
          maxChars: num(input.maxChars, 20000),
          includeLinks: input.includeLinks === "true" || input.includeLinks === true,
          concurrency: num(input.concurrency, 3),
          scrape: !(input.scrape === "false" || input.scrape === false),
        });
        return send(res, 200, data);
      }

      default:
        return send(res, 404, { error: "Rota não encontrada" });
    }
  } catch (err) {
    return send(res, 500, { error: String(err.message || err) });
  }
});

function toList(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : String(value).split(",").map((s) => s.trim()).filter(Boolean);
}

server.listen(PORT, HOST, () => {
  console.log(`\n  Scraper API rodando em http://localhost:${PORT}`);
  console.log(`  GET  /search?q=...`);
  console.log(`  GET  /scrape?url=...`);
  console.log(`  GET  /smart-search?q=...&topN=3\n`);
});