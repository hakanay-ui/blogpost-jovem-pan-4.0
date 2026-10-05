// Regras editoriais da Jovem Pan Goiás (docs/brand/briefing-editorial.md).
// Usadas pelo editorial-slot: seleção de pauta, redação e validação antes de publicar.

export const BYLINE = "Redação Jovem Pan Goiás (com IA)";
export const AI_COVER_CREDIT = "Imagem ilustrativa gerada por IA";
export const TZ_OFFSET_HOURS = -3; // America/Sao_Paulo (sem horário de verão desde 2019)

// Domínios que nunca podem ser citados como fonte.
export const BLOCKED_SOURCE_DOMAINS = [
  "news.google.com",
  "google.com",
  "adorocinema.com",
  "noticiatodahora.com.br",
  "mixvale.com.br",
  "tudoemdia.com",
  "msn.com",
  "yahoo.com",
  "dci.com.br",
  "jornalcontabil.com.br",
  "investing.com",
];

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

export function isBlockedSource(url: string): boolean {
  const host = hostOf(url);
  if (!host) return true;
  return BLOCKED_SOURCE_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`));
}

export const EXCLUSIONS = `O QUE FICA DE FORA (descarte a pauta):
- Opinião política. Só fatos e declarações com aspas, nome e cargo.
- Pesquisa eleitoral sem número de registro no TSE.
- Boato, vazamento ou "post viral" sem confirmação de fonte oficial ou de dois veículos.
- Crime contado de forma sensacionalista. Nunca publicar nome ou foto de suspeito sem indiciamento ou prisão confirmada; nunca nome ou rosto de menor de idade nem de vítima de violência sexual.
- Fofoca de celebridade, horóscopo, apostas e bets, publieditorial disfarçado.
- Notícia de outra "Caldas" (Poços de Caldas-MG, Caldas-MG) e de lugares sem ligação com Goiás.
- Brasil e Mundo sem impacto claro para quem mora em Goiás.`;

export const STYLE_RULES = `TOM: rádio de notícia — direto, sério e próximo, de quem conta ao vizinho o que mudou na cidade.

REGRAS DE ESCRITA (obrigatórias):
1. A primeira frase entrega o fato. Nada de introdução.
2. Ordem: fato, dimensão, desdobramento e impacto prático para quem mora em Goiânia ou Caldas Novas.
3. Voz ativa e verbos concretos. Frases curtas, de até 25 palavras.
4. Números só quando mostram tamanho, prazo, lugar ou impacto.
5. Sem adjetivo de importância, sem superlativo, sem linguagem de release ("importante iniciativa", "representa um marco").
6. Expressões proibidas: "vale destacar", "cabe ressaltar", "em um cenário", "mais do que X, Y".
7. Não editorializar, não aconselhar, não dramatizar. Sem frase de efeito no fim: acabou a informação, acabou o texto.
8. Linguagem de Goiás sem caricatura. Nada de gíria forçada nem "cê".
9. Política: só fatos e falas entre aspas, com nome e cargo. Quando houver acusação, sempre cite o outro lado (ou informe que foi procurado).
10. Use APENAS informações presentes nas fontes fornecidas. Nunca invente número, data, nome, cargo, endereço ou telefone.`;

export const FORBIDDEN_EXPRESSIONS = [
  "vale destacar",
  "cabe ressaltar",
  "em um cenário",
  "importante iniciativa",
  "representa um marco",
];

const PLACEHOLDER_PATTERNS: Array<[RegExp, string]> = [
  [/\bxx+\b/i, '"xx"'],
  [/\[(inserir|insira|preencher|nome|data|link|fonte)[^\]]*\]/i, "[inserir]"],
  [/\blorem\b/i, "lorem"],
  [/\(\s*\)/, "parênteses vazios"],
  [/\bTODO\b|\bTBD\b/, "TODO/TBD"],
];

export type ValidationIssue = { code: string; message: string; blocking: boolean };

export function wordCount(markdown: string): number {
  return markdown
    .replace(/\]\([^)]*\)/g, " ") // URL de links markdown não é palavra
    .replace(/\[\d+\]/g, " ") // marcadores de fonte [1]
    .replace(/[#>*_`[\]()-]/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;
}

export function findPlaceholders(text: string): string[] {
  return PLACEHOLDER_PATTERNS.filter(([re]) => re.test(text)).map(([, label]) => label);
}

export function findForbiddenExpressions(text: string): string[] {
  const lower = text.toLowerCase();
  return FORBIDDEN_EXPRESSIONS.filter((e) => lower.includes(e));
}

// Números do texto (ex.: 1.200, 3,5, 2026, 14h30) que não aparecem em nenhuma fonte.
// Ignora 1 a 10 (contagens triviais por extenso/algarismo) e os dials da rádio.
export function unsupportedNumbers(text: string, sourceCorpus: string): string[] {
  const norm = (s: string) => s.replace(/[.\s]/g, "").replace(",", ".");
  const corpus = sourceCorpus.replace(/(\d)\.(\d{3})/g, "$1$2");
  const corpusNums = new Set((corpus.match(/\d+(?:[.,]\d+)?/g) ?? []).map(norm));
  const found = text.match(/\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+(?:,\d+)?/g) ?? [];
  const ignored = new Set(["106.7", "105.7"]);
  const missing = new Set<string>();
  for (const raw of found) {
    const n = norm(raw);
    if (ignored.has(n)) continue;
    const asNumber = Number(n);
    if (!Number.isNaN(asNumber) && asNumber <= 10 && !n.includes(".")) continue;
    if (!corpusNums.has(n)) missing.add(raw);
  }
  return [...missing];
}

export function mentionedAdvertisers(
  text: string,
  advertisersCsv: string | null | undefined,
): string[] {
  if (!advertisersCsv) return [];
  const lower = text.toLowerCase();
  return advertisersCsv
    .split(/[,\n]/)
    .map((a) => a.trim())
    .filter((a) => a.length >= 3 && lower.includes(a.toLowerCase()));
}

// Busca o texto principal de uma página (sem dependências): prioriza <article>,
// depois junta os <p>. Limita o tamanho para caber no prompt.
const BOT_UA = "Mozilla/5.0 (compatible; JovemPanGoiasBot/1.0; +https://jovempan.com.br)";

// A página serve como fonte? Casos reais dos feeds do briefing:
// - Prefeitura de Goiânia responde 404 em matérias que existem (WordPress mal configurado);
// - o portal do Governo de Goiás redireciona toda matéria para um comunicado
//   (notícias suspensas no período eleitoral). Isso não é a matéria.
export function isUsablePage(
  status: number,
  html: string,
  requestedUrl: string,
  finalUrl: string,
): boolean {
  const norm = (u: string) => {
    try {
      const x = new URL(u);
      return `${x.hostname.replace(/^www\./, "")}${x.pathname.replace(/\/+$/, "")}`;
    } catch {
      return u;
    }
  };
  if (finalUrl && norm(finalUrl) !== norm(requestedUrl)) return false;
  if (status < 400) return true;
  return status === 404 && html.length > 20_000 && /<article[\s>]/i.test(html);
}

// Baixa a página (10 s de limite). html vazio quando ela não serve como fonte.
export async function fetchPage(url: string): Promise<{ ok: boolean; html: string }> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10_000);
    const res = await fetch(url, {
      headers: { "User-Agent": BOT_UA, Accept: "text/html,application/xhtml+xml" },
      redirect: "follow",
      signal: ctrl.signal,
    });
    const html = await res.text();
    clearTimeout(timer);
    const ok = isUsablePage(res.status, html, url, res.url || url);
    return { ok, html: ok ? html : "" };
  } catch {
    return { ok: false, html: "" };
  }
}

// Texto principal de uma página (sem dependências): prioriza <article>,
// depois junta os <p>. Limita o tamanho para caber no prompt.
export function articleTextFromHtml(html: string, maxChars = 7000): string {
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ");
  const article = cleaned.match(/<article[\s\S]*?<\/article>/i)?.[0] ?? cleaned;
  const paragraphs = article.match(/<p[^>]*>[\s\S]*?<\/p>/gi) ?? [];
  return paragraphs
    .map((p) =>
      p
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, "&")
        .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter((p) => p.length > 40)
    .join("\n")
    .slice(0, maxChars);
}

export async function fetchArticleText(url: string, maxChars = 7000): Promise<string> {
  return articleTextFromHtml((await fetchPage(url)).html, maxChars);
}

// Fontes cujas fotos podem ser usadas como capa, com crédito (briefing, seção 5).
export function canUseSourcePhoto(link: string, sourceKind: string): boolean {
  return sourceKind === "oficial" || hostOf(link).endsWith("agenciabrasil.ebc.com.br");
}

// Confere com GET, não HEAD: o portal do Governo de Goiás responde 200 ao HEAD
// e só no GET redireciona a matéria para o comunicado eleitoral.
export async function isLinkAlive(url: string): Promise<boolean> {
  return (await fetchPage(url)).ok;
}

// Data/hora "de parede" em Goiás.
export function nowInGoias(date = new Date()): {
  dateStr: string;
  minutesOfDay: number;
  isWeekend: boolean;
} {
  const local = new Date(date.getTime() + TZ_OFFSET_HOURS * 3600_000);
  const dow = local.getUTCDay();
  return {
    dateStr: local.toISOString().slice(0, 10),
    minutesOfDay: local.getUTCHours() * 60 + local.getUTCMinutes(),
    isWeekend: dow === 0 || dow === 6,
  };
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 70)
    .replace(/-$/, "");
}

/** Instrução de fotografia jornalística realista. `scene` descreve o que mostrar. */
export function buildPhotoPrompt(scene: string): string {
  return [
    "Photorealistic editorial news photograph for a Brazilian radio station's news website in Goiás, Brazil.",
    `Scene: ${scene.trim()}`,
    "Looks like a real photo taken by a photojournalist on location: real places, real objects, natural daylight or real night lighting,",
    "professional DSLR, 35mm lens, shallow depth of field, true-to-life colors, subtle film grain, documentary style.",
    "When it fits, show the urban landscape of Goiânia or the region of Caldas Novas, Goiás (cerrado vegetation, Brazilian streets, buildings and signage without readable text).",
    "People may appear only at a distance, from behind, or out of focus. No identifiable faces.",
    "No text, no captions, no letters, no logos, no watermarks, no brand names, no flags with emblems.",
    "Not an illustration, not a cartoon, not vector art, not a 3D render, not a painting, not a collage.",
    "Horizontal 16:9 composition.",
  ].join(" ");
}

/** Imagem de destaque da matéria: og:image, twitter:image ou a foto de destaque
 *  do WordPress (wp-post-image). Recusa logotipos e imagens padrão do tema. */
export function extractOgImage(html: string, pageUrl: string): string | null {
  const patterns = [
    /<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::secure_url)?["']/i,
    /<meta[^>]+name=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image(?::src)?["']/i,
    /<img[^>]+class=["'][^"']*wp-post-image[^"']*["'][^>]*\ssrc=["']([^"']+)["']/i,
    /<img[^>]+\ssrc=["']([^"']+)["'][^>]*class=["'][^"']*wp-post-image[^"']*["']/i,
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (!m) continue;
    const raw = m[1].replace(/&amp;/g, "&").trim();
    try {
      const url = new URL(raw, pageUrl);
      // Logotipo/ícone/imagem padrão do site não serve de capa. Olha o nome do arquivo
      // (pastas como /sites/default/files/ da Agência Brasil são fotos normais) e
      // recusa imagens do tema do WordPress (iguais em todas as páginas).
      const file = url.pathname.split("/").pop() ?? "";
      if (/logo|favicon|icon|placeholder|padrao|default|opengraph/i.test(file)) continue;
      if (/\/wp-content\/themes\//i.test(url.pathname)) continue;
      return url.toString();
    } catch {
      continue;
    }
  }
  return null;
}
