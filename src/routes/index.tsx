import { createFileRoute } from "@tanstack/react-router";

const TITLE = "Scraper API — busca, ranqueia e raspa a web";
const DESCRIPTION =
  "Backend em Node que busca na web, casa os resultados com o pedido do usuário por palavras-chave e faz scraping dos links mais relevantes. Roda em cmd, PowerShell e bash.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const endpoints = [
  {
    method: "GET",
    path: "/search?q=...",
    desc: "Busca no DuckDuckGo e devolve os resultados já ranqueados por aderência.",
  },
  {
    method: "GET",
    path: "/scrape?url=...",
    desc: "Abre uma URL e extrai título, meta, headings, texto limpo e links.",
  },
  {
    method: "GET",
    path: "/smart-search?q=...&topN=3",
    desc: "Fluxo completo: busca → casa com o pedido → abre os melhores links → raspa.",
  },
  { method: "GET", path: "/health", desc: "Status do serviço." },
];

const steps = [
  { n: "01", t: "Busca", d: "Consulta o DuckDuckGo (HTML + fallback Lite), sem API key." },
  { n: "02", t: "Reconhecimento", d: "Normaliza o pedido, remove stopwords e extrai palavras-chave." },
  { n: "03", t: "Casamento", d: "Pontua título (3), URL (2) e snippet (1) por termo, + bônus de frase e posição." },
  { n: "04", t: "Scraping", d: "Abre só os topN acima do minScore e extrai o conteúdo limpo." },
];

function Block({ children }: { children: string }) {
  return (
    <pre className="surface-panel overflow-x-auto p-4 text-xs leading-relaxed text-muted-foreground">
      <code>{children}</code>
    </pre>
  );
}

function Index() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-14">
      <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
        backend / node 18+
      </p>
      <h1 className="mt-3 text-3xl font-bold leading-tight sm:text-4xl">
        <span className="text-prompt">$</span> Scraper API
      </h1>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{DESCRIPTION}</p>

      <section className="mt-10">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-accent">Rodar</h2>
        <div className="mt-3 space-y-3">
          <Block>{`# servidor HTTP
node backend/server.js

# CLI
node backend/cli.js smart "notebook para programar ate 5 mil reais" --topN 2
node backend/cli.js buscar "receita de pao de queijo mineiro"
node backend/cli.js raspar "https://example.com" --json`}</Block>
          <Block>{`# porta customizada
PORT=9000 node backend/server.js          # bash
$env:PORT=9000; node backend/server.js    # PowerShell
set PORT=9000 && node backend/server.js   # cmd`}</Block>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-accent">Endpoints</h2>
        <ul className="mt-3 space-y-2">
          {endpoints.map((e) => (
            <li key={e.path} className="surface-panel p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                  {e.method}
                </span>
                <code className="text-sm text-foreground">{e.path}</code>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{e.desc}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-accent">
          Como o casamento funciona
        </h2>
        <ol className="mt-3 space-y-2">
          {steps.map((s) => (
            <li key={s.n} className="surface-panel flex gap-4 p-4">
              <span className="text-prompt text-sm font-bold">{s.n}</span>
              <div>
                <p className="text-sm font-semibold">{s.t}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{s.d}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-accent">
          Exemplo de resposta
        </h2>
        <Block>{`curl "http://localhost:8787/smart-search?q=historia+do+cafe+no+brasil&topN=1"

{
  "keywords": ["historia", "cafe", "brasil"],
  "results": [
    { "url": "...", "score": 17.7, "coverage": 1,
      "matched": ["historia","cafe","brasil"], "missing": [] }
  ],
  "scraped": [
    { "url": "...", "page": { "title": "...", "wordCount": 1840, "text": "..." } }
  ]
}`}</Block>
      </section>

      <footer className="mt-12 border-t border-border pt-5 text-xs text-muted-foreground">
        Opções: <code>--topN</code> <code>--limit</code> <code>--minScore</code>{" "}
        <code>--keywords a,b</code> <code>--maxChars</code> <code>--region</code>{" "}
        <code>--json</code>
      </footer>
    </main>
  );
}
