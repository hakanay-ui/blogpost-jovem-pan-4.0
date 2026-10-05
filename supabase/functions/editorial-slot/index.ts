// Motor editorial da Jovem Pan Goiás: gera o post de um horário da grade.
//  1) escolhe a pauta entre os itens RSS recentes (categoria prioritária do horário,
//     com fallback para outra categoria; descarta repetidos das últimas 72h);
//  2) lê a matéria original + pesquisa complementar (Perplexity);
//  3) redige no formato do briefing;
//  4) valida (placeholders, números sem fonte, links, imagem, categoria);
//  5) publica, ou deixa em rascunho com o motivo (bloqueio ou aprovação humana).
// Chamado pelo scheduler ({ slotId }) ou pelo admin ({ topicSlugs, focus }).
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { fetchWithRetry } from "../_shared/retry.ts";
import { startRun, finishRun } from "../_shared/runs.ts";
import { getApiKey, getDefaultModel } from "../_shared/keys.ts";
import { requireAdminOrScheduler } from "../_shared/auth.ts";
import { toCoverWebp } from "../_shared/image.ts";
import {
  AI_COVER_CREDIT,
  BLOCKED_SOURCE_DOMAINS,
  EXCLUSIONS,
  STYLE_RULES,
  type ValidationIssue,
  articleTextFromHtml,
  canUseSourcePhoto,
  extractOgImage,
  fetchPage,
  findForbiddenExpressions,
  findPlaceholders,
  hostOf,
  isBlockedSource,
  isLinkAlive,
  mentionedAdvertisers,
  slugify,
  unsupportedNumbers,
  wordCount,
} from "../_shared/editorial.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CANDIDATE_WINDOW_HOURS = 30;
const DUPLICATE_WINDOW_HOURS = 72;
const MAX_ATTEMPTS = 2;

type Topic = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  praca: string;
  requires_approval: boolean;
};

type Candidate = {
  id: string;
  title: string;
  link: string;
  description: string | null;
  published_at: string | null;
  feed: {
    name: string;
    source_kind: string;
    discovery_only: boolean;
    topic: { slug: string | null } | null;
  };
};

type Pick = {
  item_id: string;
  category_slug: string;
  praca: "goiania" | "caldas-novas" | "ambas";
  risk_flags: string[];
  reason: string;
};

type Article = {
  title: string;
  subtitle: string;
  slug: string;
  body: string;
  service_block: string;
  context: string;
  meta_description: string;
  cover_alt: string;
  cover_prompt: string;
  tags: string[];
  used_source_numbers: number[];
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function stripHtml(s: string | null | undefined): string {
  return (s ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function callTool<T>(
  system: string,
  user: string,
  tool: { name: string; description: string; parameters: Record<string, unknown> },
): Promise<T> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurado");
  const { model } = await getDefaultModel();
  const res = await fetchWithRetry(
    "https://ai.gateway.lovable.dev/v1/chat/completions",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        tools: [{ type: "function", function: tool }],
        tool_choice: { type: "function", function: { name: tool.name } },
      }),
    },
    { maxAttempts: 3 },
  );
  if (res.status === 429) throw new Error("Rate limit do AI Gateway atingido.");
  if (res.status === 402) throw new Error("Créditos do AI Gateway esgotados.");
  if (!res.ok) throw new Error(`AI Gateway error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const call = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!call) throw new Error("IA não retornou a estrutura esperada");
  return JSON.parse(call.function.arguments) as T;
}

async function selectStories(
  candidates: Candidate[],
  topics: Topic[],
  prioritySlugs: string[],
  focus: string | null,
  strongest: boolean,
  recentTitles: string[],
): Promise<{ picks: Pick[]; none_reason?: string }> {
  const categories = topics
    .map((t) => `- ${t.slug}: ${t.name} — ${t.description ?? ""} (praça: ${t.praca})`)
    .join("\n");
  const list = candidates
    .map(
      (c) =>
        `[${c.id}] (${c.feed.name}${c.feed.source_kind === "oficial" ? ", FONTE OFICIAL" : ""}) ${c.title}` +
        (c.description ? ` — ${stripHtml(c.description).slice(0, 220)}` : ""),
    )
    .join("\n");

  const priority = strongest
    ? "Este horário publica O ASSUNTO MAIS FORTE DO DIA em Goiás, de qualquer categoria."
    : `Categoria(s) prioritária(s) deste horário, em ordem: ${prioritySlugs.join(", ")}.` +
      " Se nenhuma notícia boa dessas categorias existir, escolha a melhor notícia de outra categoria.";

  const system = `Você é o editor de pauta da Jovem Pan Goiás (rádio de Goiânia 106,7 e Caldas Novas 105,7).
O blog é o jornal local: o que acontece em Goiânia, Caldas Novas e em Goiás e afeta a vida de quem mora aqui.
Volume nunca vence qualidade: se nada for bom, não escolha nada.

CATEGORIAS:
${categories}

${EXCLUSIONS}

RISCO (marque em risk_flags quando se aplicar): "politica", "policia_justica", "acusacao" (contra pessoa ou empresa), "saude_publica" (alerta).`;

  const user = `${priority}
${focus ? `Foco do horário: ${focus}.` : ""}

JÁ PUBLICADO NAS ÚLTIMAS 72H (não repita o mesmo assunto, mesmo com outro título):
${recentTitles.length ? recentTitles.map((t) => `- ${t}`).join("\n") : "(nada)"}

NOTÍCIAS CANDIDATAS:
${list}

Escolha até 3 notícias, da melhor para a pior, para este horário.`;

  return await callTool(system, user, {
    name: "choose_stories",
    description: "Escolhe as pautas do horário",
    parameters: {
      type: "object",
      properties: {
        picks: {
          type: "array",
          maxItems: 3,
          items: {
            type: "object",
            properties: {
              item_id: { type: "string", description: "id entre colchetes da notícia candidata" },
              category_slug: { type: "string", enum: topics.map((t) => t.slug) },
              praca: { type: "string", enum: ["goiania", "caldas-novas", "ambas"] },
              risk_flags: {
                type: "array",
                items: {
                  type: "string",
                  enum: ["politica", "policia_justica", "acusacao", "saude_publica"],
                },
              },
              reason: { type: "string", description: "Por que esta pauta, em uma frase" },
            },
            required: ["item_id", "category_slug", "praca", "risk_flags", "reason"],
            additionalProperties: false,
          },
        },
        none_reason: { type: "string", description: "Se não escolheu nada, por quê" },
      },
      required: ["picks"],
      additionalProperties: false,
    },
  });
}

async function research(item: Candidate): Promise<{ text: string; citations: string[] }> {
  const key = await getApiKey("perplexity_api_key");
  if (!key) return { text: "", citations: [] };
  try {
    const res = await fetchWithRetry(
      "https://api.perplexity.ai/chat/completions",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "sonar",
          messages: [
            {
              role: "system",
              content:
                "Você é apurador de uma redação de rádio em Goiás. Responda em português do Brasil, só com fatos verificáveis, citando as fontes. Prefira fontes oficiais (prefeituras, governo de Goiás, órgãos públicos) e veículos de Goiás. Não especule.",
            },
            {
              role: "user",
              content: `Apure esta notícia e traga os fatos principais, números, datas, locais, nomes e cargos, e o serviço para a população (horário, endereço, prazo, telefone), se houver:\n"${item.title}"\n${stripHtml(item.description).slice(0, 500)}`,
            },
          ],
          search_recency_filter: "week",
          search_domain_filter: BLOCKED_SOURCE_DOMAINS.slice(0, 10).map((d) => `-${d}`),
        }),
      },
      { maxAttempts: 2 },
    );
    if (!res.ok) {
      console.error("[editorial-slot] Perplexity", res.status, await res.text());
      return { text: "", citations: [] };
    }
    const data = await res.json();
    return {
      text: data.choices?.[0]?.message?.content ?? "",
      citations: ((data.citations ?? []) as string[]).filter((u) => !isBlockedSource(u)),
    };
  } catch (e) {
    console.error("[editorial-slot] Perplexity falhou:", e);
    return { text: "", citations: [] };
  }
}

async function writeArticle(
  item: Candidate,
  topic: Topic,
  focus: string | null,
  sources: Array<{ n: number; url: string; text: string }>,
): Promise<Article> {
  const system = `Você é redator da Jovem Pan Goiás. Escreve notícias para o blog da rádio, em português do Brasil.

${STYLE_RULES}

${EXCLUSIONS}

FORMATO:
- title: sujeito + verbo + fato, até 70 caracteres, sem clickbait, sem ponto final. Ex.: "Goiânia amplia horário de vacinação nos Cais até sexta".
- subtitle (linha fina): uma frase com o principal dado de serviço.
- body: 250 a 500 palavras, em parágrafos curtos, SEM títulos/intertítulos. Os dois primeiros parágrafos resolvem o fato. Cite as fontes no texto como [1], [2] conforme a numeração fornecida.
- service_block: lista em markdown ("- ") com horário, endereço, prazo, telefone, link oficial — só o que estiver nas fontes. String vazia se não houver serviço.
- context: até dois parágrafos de histórico, só com informação das fontes. String vazia se não houver.
- slug: 3 a 6 palavras-chave sem acento, separadas por hífen.
- meta_description: até 155 caracteres.
- cover_alt: descrição objetiva da imagem de capa, para leitores de tela.
- cover_prompt: a cena de uma FOTOGRAFIA REAL que um fotógrafo de jornal faria para esta notícia, em Goiânia ou Caldas Novas: lugar concreto (rua, posto de saúde, estádio, lavoura, rodoviária, praça, parque aquático...), objetos, hora do dia e luz. Pessoas só de longe, de costas ou desfocadas. Sem rostos, logotipos ou texto escrito. Uma ou duas frases.
- tags: até 4 tags curtas (lugares, órgãos, times).
- used_source_numbers: números das fontes que tratam do assunto e foram usadas.`;

  const sourcesText = sources
    .map((s) => `[${s.n}] ${s.url}\n${s.text.slice(0, 6000)}`)
    .join("\n\n---\n\n");

  const user = `Categoria: ${topic.name}${focus ? ` · Foco do horário: ${focus}` : ""}
Pauta: ${item.title}

FONTES (use somente estas informações):
${sourcesText}`;

  return await callTool<Article>(system, user, {
    name: "write_news",
    description: "Redige a notícia no formato da Jovem Pan Goiás",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string" },
        subtitle: { type: "string" },
        slug: { type: "string" },
        body: { type: "string" },
        service_block: { type: "string" },
        context: { type: "string" },
        meta_description: { type: "string" },
        cover_alt: { type: "string" },
        cover_prompt: { type: "string" },
        tags: { type: "array", items: { type: "string" }, maxItems: 4 },
        used_source_numbers: { type: "array", items: { type: "integer" } },
      },
      required: [
        "title",
        "subtitle",
        "slug",
        "body",
        "service_block",
        "context",
        "meta_description",
        "cover_alt",
        "cover_prompt",
        "tags",
        "used_source_numbers",
      ],
      additionalProperties: false,
    },
  });
}

function assembleContent(a: Article): string {
  const parts = [a.body.trim()];
  if (a.service_block.trim()) parts.push(`## O que muda pra você\n\n${a.service_block.trim()}`);
  if (a.context.trim()) parts.push(`## Contexto\n\n${a.context.trim()}`);
  return parts.join("\n\n");
}

async function uniqueSlug(supabase: SupabaseClient, base: string): Promise<string> {
  const slug = base || `noticia-${Date.now().toString(36)}`;
  const { data } = await supabase.from("posts").select("id").eq("slug", slug).maybeSingle();
  return data ? `${slug}-${Date.now().toString(36).slice(-4)}` : slug;
}

async function attachTags(supabase: SupabaseClient, postId: string, names: string[]) {
  for (const name of names.slice(0, 4)) {
    const slug = slugify(name);
    if (!slug) continue;
    const { data: tag } = await supabase
      .from("tags")
      .upsert({ name: name.trim(), slug }, { onConflict: "slug" })
      .select("id")
      .single();
    if (tag) {
      await supabase
        .from("post_tags")
        .upsert({ post_id: postId, tag_id: tag.id }, { onConflict: "post_id,tag_id" });
    }
  }
}

// Capa por IA: a função generate-cover-image transforma a cena em instrução de
// fotografia realista e salva em WebP 1200×675.
async function generateCover(
  postId: string,
  article: Article,
  quality: "standard" | "high",
): Promise<string | null> {
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  try {
    const res = await fetch(`${url}/functions/v1/generate-cover-image`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ postId, prompt: article.cover_prompt, quality, count: 1 }),
    });
    const j = await res.json().catch(() => ({}));
    return res.ok && j?.url ? (j.url as string) : null;
  } catch (e) {
    console.warn("[editorial-slot] capa falhou:", e);
    return null;
  }
}

// Foto da própria fonte oficial (prefeitura, governo, Agência Brasil), com crédito.
// Recusa imagens pequenas (logotipos, ícones) e salva em WebP 1200×675.
async function saveSourcePhotoCover(
  supabase: SupabaseClient,
  postId: string,
  imageUrl: string,
): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10_000);
    const res = await fetch(imageUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; JovemPanGoiasBot/1.0)" },
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const cover = await toCoverWebp(new Uint8Array(await res.arrayBuffer()), 800);
    if (!cover) return null;
    const path = `${postId}/${Date.now()}-fonte.${cover.ext}`;
    const { error } = await supabase.storage
      .from("post-covers")
      .upload(path, cover.bytes, { contentType: cover.mime, upsert: true, cacheControl: "3600" });
    if (error) return null;
    return supabase.storage.from("post-covers").getPublicUrl(path).data.publicUrl;
  } catch (e) {
    console.warn("[editorial-slot] foto da fonte falhou:", e);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const auth = await requireAdminOrScheduler(req);
  if (!auth.ok) return auth.response;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  let run = null as Awaited<ReturnType<typeof startRun>>;

  try {
    const body = await req.json().catch(() => ({}));
    const slotId: string | undefined = body?.slotId;
    run = await startRun(supabase, "editorial-slot", { metadata: { slotId: slotId ?? null } });

    let prioritySlugs: string[] = Array.isArray(body?.topicSlugs) ? body.topicSlugs : [];
    let focus: string | null = body?.focus ?? null;
    let strongest = !!body?.strongest;
    if (slotId) {
      const { data: slot, error } = await supabase
        .from("schedule_slots")
        .select("topic_slugs, focus, strongest_of_day")
        .eq("id", slotId)
        .single();
      if (error || !slot) throw new Error("Horário não encontrado");
      prioritySlugs = slot.topic_slugs ?? [];
      focus = slot.focus;
      strongest = slot.strongest_of_day;
    }

    const { data: topicRows } = await supabase
      .from("editorial_topics")
      .select("id, slug, name, description, praca, requires_approval")
      .eq("active", true)
      .not("slug", "is", null)
      .order("sort_order");
    const topics = (topicRows ?? []) as Topic[];
    if (topics.length === 0) throw new Error("Nenhuma categoria ativa com slug");

    const since = new Date(Date.now() - CANDIDATE_WINDOW_HOURS * 3600_000).toISOString();
    const { data: itemRows, error: itemsErr } = await supabase
      .from("rss_items")
      .select(
        "id, title, link, description, published_at, feed:rss_feeds!inner(name, source_kind, discovery_only, active, topic:editorial_topics(slug))",
      )
      .is("used_in_post_id", null)
      .eq("feed.active", true)
      .or(`published_at.gte.${since},and(published_at.is.null,created_at.gte.${since})`)
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(80);
    if (itemsErr) throw itemsErr;
    const candidates = ((itemRows ?? []) as unknown as Candidate[]).filter(
      (c) => c.feed.discovery_only || !isBlockedSource(c.link),
    );

    const dupSince = new Date(Date.now() - DUPLICATE_WINDOW_HOURS * 3600_000).toISOString();
    const { data: recent } = await supabase
      .from("posts")
      .select("title")
      .neq("status", "archived")
      .gte("created_at", dupSince)
      .order("created_at", { ascending: false })
      .limit(80);
    const recentTitles = (recent ?? []).map((p: { title: string }) => p.title);

    if (candidates.length === 0) {
      await finishRun(supabase, run, {
        status: "success",
        metadata: { skipped: "sem notícias novas" },
      });
      return json({ ok: true, published: false, reason: "sem notícias novas" });
    }

    const selection = await selectStories(
      candidates,
      topics,
      prioritySlugs,
      focus,
      strongest,
      recentTitles,
    );
    const picks = (selection.picks ?? []).filter((p) => candidates.some((c) => c.id === p.item_id));
    if (picks.length === 0) {
      await finishRun(supabase, run, {
        status: "success",
        metadata: {
          skipped: selection.none_reason ?? "nenhuma pauta boa",
          candidates: candidates.length,
        },
      });
      return json({
        ok: true,
        published: false,
        reason: selection.none_reason ?? "nenhuma pauta boa",
      });
    }

    const { data: cfgRows } = await supabase
      .from("project_config")
      .select("key, value")
      .in("key", ["editorial_advertisers", "cover_image_quality"]);
    const cfg = Object.fromEntries(
      (cfgRows ?? []).map((r: { key: string; value: string }) => [r.key, r.value]),
    );
    const coverQuality: "standard" | "high" =
      cfg.cover_image_quality === "standard" ? "standard" : "high";

    const attempts: Array<Record<string, unknown>> = [];
    for (const pick of picks.slice(0, MAX_ATTEMPTS)) {
      const item = candidates.find((c) => c.id === pick.item_id)!;
      const topic = topics.find((t) => t.slug === pick.category_slug) ?? topics[0];

      // Fontes: matéria original (quando citável) + apuração complementar.
      const sources: Array<{ n: number; url: string; text: string }> = [];
      let sourcePhotoUrl: string | null = null;
      if (!item.feed.discovery_only) {
        const { html } = await fetchPage(item.link);
        const original = articleTextFromHtml(html);
        if (canUseSourcePhoto(item.link, item.feed.source_kind)) {
          sourcePhotoUrl = extractOgImage(html, item.link);
        }
        sources.push({
          n: 1,
          url: item.link,
          text: original || `${item.title}. ${stripHtml(item.description)}`,
        });
      }
      const r = await research(item);
      for (const c of r.citations) {
        if (sources.some((s) => s.url === c)) continue;
        sources.push({ n: sources.length + 1, url: c, text: "" });
      }
      if (r.text) {
        sources.push({ n: 0, url: "apuracao", text: r.text });
      }
      const citable = sources.filter((s) => s.n > 0);
      if (citable.length === 0) {
        attempts.push({ item: item.title, skipped: "sem fonte citável" });
        continue;
      }

      // Para o redator, a apuração entra junto das citações (que são as URLs dela).
      const writerSources = citable.map((s) =>
        s.text ? s : { ...s, text: "(ver apuração abaixo)" },
      );
      if (r.text)
        writerSources.push({
          n: 0,
          url: "Apuração complementar (fatos citados nas fontes acima)",
          text: r.text,
        });

      const article = await writeArticle(item, topic, focus, writerSources);
      const content = assembleContent(article);

      const usedNumbers = new Set(article.used_source_numbers ?? []);
      const usedSources = citable.filter((s) => usedNumbers.size === 0 || usedNumbers.has(s.n));

      // ── Validação ────────────────────────────────────────────────────
      const issues: ValidationIssue[] = [];
      const fullText = `${article.title}\n${article.subtitle}\n${content}`;

      const placeholders = findPlaceholders(fullText);
      if (placeholders.length)
        issues.push({
          code: "placeholder",
          message: `Texto incompleto: ${placeholders.join(", ")}`,
          blocking: true,
        });

      const forbidden = findForbiddenExpressions(fullText);
      if (forbidden.length)
        issues.push({
          code: "expressao_proibida",
          message: `Expressões proibidas: ${forbidden.join(", ")}`,
          blocking: false,
        });

      if (article.title.length > 70)
        issues.push({
          code: "titulo_longo",
          message: `Título com ${article.title.length} caracteres (máx. 70)`,
          blocking: false,
        });

      const words = wordCount(article.body);
      if (words < 150)
        issues.push({
          code: "texto_curto",
          message: `Corpo com ${words} palavras`,
          blocking: true,
        });
      else if (words < 250 || words > 500)
        issues.push({
          code: "tamanho",
          message: `Corpo com ${words} palavras (ideal 250–500)`,
          blocking: false,
        });

      const corpus = [item.title, stripHtml(item.description), ...sources.map((s) => s.text)].join(
        "\n",
      );
      const missingNumbers = unsupportedNumbers(fullText, corpus);
      if (missingNumbers.length)
        issues.push({
          code: "numero_sem_fonte",
          message: `Números que não aparecem nas fontes: ${missingNumbers.slice(0, 8).join(", ")}`,
          blocking: true,
        });

      const alive = await Promise.all(usedSources.map((s) => isLinkAlive(s.url)));
      const liveSources = usedSources.filter((_, i) => alive[i]);
      const dead = usedSources.filter((_, i) => !alive[i]).map((s) => hostOf(s.url));
      if (dead.length)
        issues.push({
          code: "link_quebrado",
          message: `Fontes fora do ar removidas: ${dead.join(", ")}`,
          blocking: false,
        });
      if (liveSources.length === 0)
        issues.push({ code: "sem_fonte", message: "Nenhuma fonte válida", blocking: true });

      const advertisers = mentionedAdvertisers(fullText, cfg.editorial_advertisers);

      // Grava como rascunho; o status final sai depois da capa.
      const slug = await uniqueSlug(supabase, slugify(article.slug || article.title));
      const { data: post, error: postErr } = await supabase
        .from("posts")
        .insert({
          topic_id: topic.id,
          title: article.title.slice(0, 120),
          subtitle: article.subtitle,
          slug,
          excerpt: article.subtitle,
          content,
          meta_title: article.title.slice(0, 70),
          meta_description: article.meta_description.slice(0, 155),
          sources: liveSources.map((s, i) => ({ index: i + 1, url: s.url })),
          ai_generated: true,
          status: "draft",
          praca: pick.praca,
          cover_alt: article.cover_alt,
          slot_id: slotId ?? null,
          source_item_id: item.id,
        })
        .select("id")
        .single();
      if (postErr) throw postErr;

      await supabase.from("rss_items").update({ used_in_post_id: post.id }).eq("id", item.id);
      await attachTags(supabase, post.id, article.tags ?? []);

      // Imagem (briefing, seção 5): 1º foto da fonte oficial com crédito; 2º IA ilustrativa.
      let coverUrl: string | null = null;
      let coverCredit: string | null = null;
      if (sourcePhotoUrl) {
        coverUrl = await saveSourcePhotoCover(supabase, post.id, sourcePhotoUrl);
        if (coverUrl) {
          coverCredit = `Foto: ${item.feed.name}`;
          await supabase
            .from("posts")
            .update({
              cover_image_url: coverUrl,
              cover_alt: `Foto de divulgação: ${article.title}`,
            })
            .eq("id", post.id);
        }
      }
      if (!coverUrl) {
        coverUrl = await generateCover(post.id, article, coverQuality);
        if (coverUrl) coverCredit = AI_COVER_CREDIT;
      }
      if (!coverUrl)
        issues.push({ code: "sem_imagem", message: "Capa não foi gerada", blocking: true });

      const blocking = issues.filter((i) => i.blocking);
      const approvalReasons: string[] = [];
      if (topic.requires_approval) approvalReasons.push(`categoria ${topic.name}`);
      for (const f of pick.risk_flags ?? []) approvalReasons.push(f.replace("_", " "));
      if (advertisers.length) approvalReasons.push(`cita anunciante: ${advertisers.join(", ")}`);

      let status: "published" | "draft" = "published";
      let reviewReason: string | null = null;
      if (blocking.length) {
        status = "draft";
        reviewReason = `Bloqueado: ${blocking.map((b) => b.message).join("; ")}`;
      } else if (approvalReasons.length) {
        status = "draft";
        reviewReason = `Aprovação humana: ${[...new Set(approvalReasons)].join(", ")}`;
      }

      await supabase
        .from("posts")
        .update({
          status,
          published_at: status === "published" ? new Date().toISOString() : null,
          review_reason: reviewReason,
          cover_credit: coverCredit,
          validation: { issues, pick, words, checked_at: new Date().toISOString() },
        })
        .eq("id", post.id);

      attempts.push({
        item: item.title,
        postId: post.id,
        status,
        reviewReason,
        issues: issues.length,
      });
      if (!blocking.length) break;
    }

    await supabase
      .from("editorial_topics")
      .update({ last_generated_at: new Date().toISOString() })
      .in(
        "slug",
        picks.map((p) => p.category_slug),
      );

    await finishRun(supabase, run, {
      status: "success",
      postId: (attempts.find((a) => a.postId)?.postId as string | undefined) ?? undefined,
      metadata: { slotId, prioritySlugs, candidates: candidates.length, attempts },
    });
    return json({ ok: true, attempts });
  } catch (e) {
    console.error("editorial-slot error:", e);
    await finishRun(supabase, run, { status: "error", error: e });
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
