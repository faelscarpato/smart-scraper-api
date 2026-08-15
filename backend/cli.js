#!/usr/bin/env node
import { search } from "./lib/search.js";
import { scrape } from "./lib/scrape.js";
import { rankResults } from "./lib/rank.js";
import { smartSearch } from "./lib/pipeline.js";

const argv = process.argv.slice(2);

function parseFlags(args) {
  const flags = {};
  const rest = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith("--")) {
      const [k, v] = a.slice(2).split("=");
      flags[k] = v ?? (args[i + 1] && !args[i + 1].startsWith("--") ? args[++i] : true);
    } else rest.push(a);
  }
  return { flags, rest };
}

function help() {
  console.log(`
Scraper CLI — busca, ranqueia e raspa os melhores resultados

  node backend/cli.js buscar "sua pergunta"          apenas busca + ranking
  node backend/cli.js raspar "https://site.com"      scraping de uma URL
  node backend/cli.js smart "sua pergunta"           busca + ranking + scraping

Opções:
  --topN 3          quantos links abrir (smart)
  --limit 10        resultados da busca
  --minScore 0      score mínimo para abrir o link
  --keywords a,b    palavras-chave extras para o casamento
  --maxChars 20000  tamanho máximo do texto extraído
  --region br-pt    região da busca
  --json            imprime JSON puro
`);
}

function printResults(results) {
  for (const r of results) {
    console.log(`\n[${r.score}] ${r.title}`);
    console.log(`  ${r.url}`);
    console.log(`  match: ${r.matched.join(", ") || "-"}${r.missing.length ? ` | falta: ${r.missing.join(", ")}` : ""}`);
    if (r.snippet) console.log(`  ${r.snippet.slice(0, 160)}`);
  }
}

const { flags, rest } = parseFlags(argv);
const [command, ...args] = rest;
const query = args.join(" ");
const json = Boolean(flags.json);
const kw = flags.keywords ? String(flags.keywords).split(",").map((s) => s.trim()) : [];

try {
  if (!command || flags.help) {
    help();
  } else if (command === "buscar" || command === "search") {
    if (!query) throw new Error("Informe a busca.");
    const ranked = rankResults(await search(query, { limit: Number(flags.limit) || 10, region: flags.region || "br-pt" }), query, kw);
    json ? console.log(JSON.stringify(ranked, null, 2)) : printResults(ranked);
  } else if (command === "raspar" || command === "scrape") {
    if (!query) throw new Error("Informe a URL.");
    const data = await scrape(query, { maxChars: Number(flags.maxChars) || 20000 });
    if (json) console.log(JSON.stringify(data, null, 2));
    else if (!data.ok) console.error(`Falhou: ${data.error}`);
    else {
      console.log(`\n${data.title}\n${data.finalUrl}\n${data.wordCount} palavras\n`);
      console.log(data.text.slice(0, 2000));
    }
  } else if (command === "smart") {
    if (!query) throw new Error("Informe o que você procura.");
    const out = await smartSearch(query, {
      limit: Number(flags.limit) || 10,
      topN: Number(flags.topN) || 3,
      minScore: Number(flags.minScore) || 0,
      keywords: kw,
      region: flags.region || "br-pt",
      maxChars: Number(flags.maxChars) || 20000,
    });
    if (json) console.log(JSON.stringify(out, null, 2));
    else {
      console.log(`\nPalavras-chave: ${out.keywords.join(", ")}`);
      printResults(out.results);
      console.log(`\n--- Páginas abertas (${out.scraped.length}) ---`);
      for (const s of out.scraped) {
        console.log(`\n>> [${s.score}] ${s.title}\n   ${s.url}`);
        if (s.page?.ok) console.log(`   ${s.page.wordCount} palavras\n\n${s.page.text.slice(0, 1200)}\n`);
        else console.log(`   erro: ${s.page?.error}`);
      }
    }
  } else {
    help();
    process.exitCode = 1;
  }
} catch (err) {
  console.error(`Erro: ${err.message || err}`);
  process.exitCode = 1;
}