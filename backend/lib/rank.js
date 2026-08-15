const STOPWORDS = new Set([
  "a","o","as","os","um","uma","de","do","da","dos","das","e","ou","em","no","na","nos","nas",
  "para","por","com","sem","que","qual","quais","como","onde","the","of","and","or","in","on",
  "for","to","with","is","are","at","by","this","that","site","sites","melhor","melhores",
]);

/** Normaliza texto: minúsculas, sem acento, sem pontuação. */
export function normalize(text = "") {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Extrai palavras-chave relevantes de uma frase do usuário. */
export function keywords(query) {
  return [...new Set(normalize(query).split(" "))].filter(
    (w) => w.length > 2 && !STOPWORDS.has(w),
  );
}

/**
 * Pontua um resultado de busca contra o pedido do usuário.
 * Considera título, snippet e a própria URL (slug/domínio).
 */
export function scoreResult(result, terms, extraKeywords = []) {
  const all = [...new Set([...terms, ...extraKeywords.map((k) => normalize(k))])].filter(Boolean);
  if (all.length === 0) return { score: 0, matched: [], missing: [] };

  const title = normalize(result.title);
  const snippet = normalize(result.snippet);
  const url = normalize(decodeURIComponent(result.url));

  let score = 0;
  const matched = [];
  const missing = [];

  for (const term of all) {
    let hit = 0;
    if (title.includes(term)) hit += 3;
    if (url.includes(term)) hit += 2;
    if (snippet.includes(term)) hit += 1;
    if (hit > 0) {
      matched.push(term);
      score += hit;
    } else {
      missing.push(term);
    }
  }

  // frase completa no título vale bônus
  const phrase = all.join(" ");
  if (phrase && title.includes(phrase)) score += 4;

  // pequeno bônus por aparecer no topo do buscador
  score += Math.max(0, 3 - (result.position - 1) * 0.3);

  const maxPerTerm = 6;
  const relevance = Math.min(1, score / (all.length * maxPerTerm + 4));

  return {
    score: Number(score.toFixed(2)),
    relevance: Number(relevance.toFixed(3)),
    coverage: Number((matched.length / all.length).toFixed(3)),
    matched,
    missing,
  };
}

/** Ordena resultados por aderência ao pedido do usuário. */
export function rankResults(results, query, extraKeywords = []) {
  const terms = keywords(query);
  return results
    .map((r) => ({ ...r, ...scoreResult(r, terms, extraKeywords) }))
    .sort((a, b) => b.score - a.score);
}