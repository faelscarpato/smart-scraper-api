# Scraper API (backend standalone)

Roda em **cmd, PowerShell, bash** — só precisa de Node 18+ (fetch nativo).

## Instalar

```bash
npm install cheerio
```

(já instalado neste projeto)

## Servidor HTTP

```bash
node backend/server.js
# PORT=9000 node backend/server.js     (bash)
# $env:PORT=9000; node backend/server.js   (PowerShell)
```

Endpoints (GET com querystring ou POST com JSON):

| Rota | Descrição |
|---|---|
| `GET /search?q=...` | busca e ranqueia os resultados |
| `GET /scrape?url=...` | raspa uma página específica |
| `GET /smart-search?q=...&topN=3` | busca → ranqueia → abre os melhores → raspa |
| `GET /health` | status |

Exemplo:

```bash
curl "http://localhost:8787/smart-search?q=melhor+placa+de+video+custo+beneficio&topN=2"
```

## CLI

```bash
node backend/cli.js smart "notebook para programar até 5 mil reais" --topN 2
node backend/cli.js buscar "receita de pão de queijo mineiro"
node backend/cli.js raspar "https://example.com" --json
```

## Como o casamento pedido × resultado funciona

1. O pedido é normalizado (minúsculas, sem acento) e as stopwords são removidas.
2. Cada resultado ganha pontos: título (3), URL (2), snippet (1) por palavra-chave,
   +4 se a frase completa aparecer no título, e um bônus decrescente pela posição.
3. Só os `topN` melhores (acima de `minScore`) são abertos e raspados.
4. A resposta traz `matched` / `missing` por resultado, para você auditar o casamento.