// Generates a blog post for a topic using Perplexity (research) + Lovable AI (writing).
// Registra run em generation_runs, com retry em chamadas externas.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { fetchWithRetry } from "../_shared/retry.ts";
import { startRun, finishRun } from "../_shared/runs.ts";
import { getApiKey, getDefaultModel } from "../_shared/keys.ts";
import { requireAdminOrScheduler } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

async function researchWithPerplexity(
  topic: any,
  rssItems: any[],
): Promise<{ research: string; citations: string[]; usedPerplexity: boolean }> {
  const PERPLEXITY_API_KEY = await getApiKey("perplexity_api_key");
  if (!PERPLEXITY_API_KEY) {
    console.warn("[research] Perplexity não configurada — fallback sem pesquisa externa.");
    return { research: "", citations: [], usedPerplexity: false };
  }

  const rssContext = rssItems.length > 0
    ? `\n\nNotícias recentes para considerar:\n${rssItems
        .map((i, n) => `${n + 1}. ${i.title} — ${i.link}`)
        .join("\n")}`
    : "";

  const prompt = `Pesquise as últimas notícias e desenvolvimentos sobre: "${topic.name}".
${topic.description ? `Contexto: ${topic.description}` : ""}
${topic.keywords?.length ? `Palavras-chave: ${topic.keywords.join(", ")}` : ""}
${rssContext}

Forneça um resumo factual e detalhado com os principais pontos, dados e tendências dos últimos dias. Seja preciso e cite fontes.`;

  try {
    const res = await fetchWithRetry(
      "https://api.perplexity.ai/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${PERPLEXITY_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "sonar",
          messages: [
            {
              role: "system",
              content:
                "Você é um pesquisador editorial. Seja factual, preciso e cite fontes. Responda SEMPRE em português brasileiro, traduzindo trechos, citações e títulos de fontes que estiverem em outro idioma (inglês, espanhol, etc.).",
            },
            { role: "user", content: prompt },
          ],
          search_recency_filter: "week",
        }),
      },
      { maxAttempts: 3 },
    );
    if (!res.ok) {
      console.error("Perplexity error:", res.status, await res.text());
      return { research: "", citations: [], usedPerplexity: false };
    }
    const data = await res.json();
    return {
      research: data.choices?.[0]?.message?.content ?? "",
      citations: data.citations ?? [],
      usedPerplexity: true,
    };
  } catch (e) {
    console.error("Perplexity request failed:", e);
    return { research: "", citations: [], usedPerplexity: false };
  }
}

async function writePostWithAI(
  topic: any,
  research: string,
  citations: string[],
  selectedAngle?: { title: string; angle: string; summary: string } | null,
): Promise<any> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurado");
  const { model: defaultModel } = await getDefaultModel();

  const systemPrompt = `Você é um redator editorial especialista em conteúdo técnico.
Escreva SEMPRE em português brasileiro (pt-BR), independentemente do idioma das fontes.
Se a pesquisa, notícias ou citações estiverem em outro idioma (inglês, espanhol, etc.), TRADUZA todo o conteúdo relevante para português brasileiro de forma natural e fluente — não copie trechos no idioma original.
Adapte nomes próprios, jargões técnicos e termos consagrados (mantenha em inglês apenas quando for o uso padrão no Brasil, ex.: "machine learning", "deploy").
Use markdown: ## para seções, ### para subseções, listas, citações, código quando relevante.
NÃO inclua o título principal H1 no conteúdo (ele é separado).
O título, excerpt, meta_title e meta_description também devem estar em português brasileiro.
Cite as fontes ao longo do texto usando o formato [1], [2], etc.`;

  const angleBrief = selectedAngle
    ? `\nÂNGULO SELECIONADO PELO EDITOR (siga rigorosamente):
Título sugerido: ${selectedAngle.title}
Tipo: ${selectedAngle.angle}
Resumo do enfoque: ${selectedAngle.summary}\n`
    : "";

  const userPrompt = `Tema editorial: ${topic.name}
${topic.description ? `Linha editorial: ${topic.description}` : ""}
${topic.keywords?.length ? `Palavras-chave alvo: ${topic.keywords.join(", ")}` : ""}
${angleBrief}
PESQUISA RECENTE (use como base factual):
${research || "(sem pesquisa externa disponível, use seu conhecimento)"}

${citations.length ? `FONTES DISPONÍVEIS:\n${citations.map((c, i) => `[${i + 1}] ${c}`).join("\n")}` : ""}

Gere um artigo de blog completo e original.`;

  const tools = [
    {
      type: "function",
      function: {
        name: "create_blog_post",
        description: "Gera um post de blog estruturado",
        parameters: {
          type: "object",
          properties: {
            title: { type: "string", description: "Título atrativo, max 80 chars" },
            excerpt: { type: "string", description: "Resumo de 1-2 frases, max 200 chars" },
            content: { type: "string", description: "Corpo completo em markdown, sem H1" },
            meta_title: { type: "string", description: "SEO title, max 60 chars" },
            meta_description: { type: "string", description: "SEO description, max 160 chars" },
          },
          required: ["title", "excerpt", "content", "meta_title", "meta_description"],
          additionalProperties: false,
        },
      },
    },
  ];

  const res = await fetchWithRetry(
    "https://ai.gateway.lovable.dev/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: defaultModel,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools,
        tool_choice: { type: "function", function: { name: "create_blog_post" } },
      }),
    },
    { maxAttempts: 3 },
  );

  if (res.status === 429)
    throw new Error("Rate limit do AI Gateway atingido. Tente novamente em alguns instantes.");
  if (res.status === 402)
    throw new Error(
      "Créditos do AI Gateway esgotados. Adicione créditos em Settings → Workspace → Usage.",
    );
  if (!res.ok) throw new Error(`AI Gateway error ${res.status}: ${await res.text()}`);

  const data = await res.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) throw new Error("AI não retornou estrutura esperada");
  return JSON.parse(toolCall.function.arguments);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = await requireAdminOrScheduler(req);
  if (!auth.ok) return auth.response;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Resolve o usuário que chamou (para gravar author_id no post).
  let authorId: string | null = null;
  try {
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const { data: u } = await supabase.auth.getUser(token);
      authorId = u.user?.id ?? null;
    }
  } catch (_e) {
    // sem auth → segue sem author_id
  }

  let topicId: string | undefined;
  let run = null as Awaited<ReturnType<typeof startRun>>;

  try {
    const body = await req.json();
    topicId = body?.topicId;
    const adhoc = body?.adhocTopic as
      | { name: string; keywords?: string[]; description?: string }
      | undefined;
    const selectedAngle = body?.selectedAngle as
      | { title: string; angle: string; summary: string }
      | undefined;
    const prefetchedResearch = body?.prefetchedResearch as
      | { research?: string; citations?: string[] }
      | undefined;
    const researchSessionId = body?.researchSessionId as string | undefined;

    if (!topicId && !adhoc?.name) throw new Error("topicId ou adhocTopic.name é obrigatório");

    run = await startRun(supabase, "generate-post", { topicId: topicId ?? null });

    let topic: any;
    let rssItems: any[] = [];

    if (topicId) {
      const { data, error: topicErr } = await supabase
        .from("editorial_topics")
        .select("*")
        .eq("id", topicId)
        .single();
      if (topicErr || !data) throw new Error("Tópico não encontrado");
      topic = data;

      const { data: items } = await supabase
        .from("rss_items")
        .select("id, title, link, description, feed:rss_feeds!inner(topic_id)")
        .eq("feed.topic_id", topicId)
        .is("used_in_post_id", null)
        .order("published_at", { ascending: false, nullsFirst: false })
        .limit(8);
      rssItems = items ?? [];
    } else {
      topic = {
        name: adhoc!.name,
        description: adhoc!.description ?? null,
        keywords: adhoc!.keywords ?? [],
        publish_mode: "review",
      };
    }

    let research = prefetchedResearch?.research ?? "";
    let citations = prefetchedResearch?.citations ?? [];
    let usedPerplexity = !!prefetchedResearch?.research;
    if (!prefetchedResearch) {
      const r = await researchWithPerplexity(topic, rssItems);
      research = r.research;
      citations = r.citations;
      usedPerplexity = r.usedPerplexity;
    }

    const article = await writePostWithAI(topic, research, citations, selectedAngle);

    let slug = slugify(article.title);
    if (!slug) slug = `post-${Date.now()}`;
    const { data: existing } = await supabase
      .from("posts")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (existing) slug = `${slug}-${Date.now().toString(36)}`;

    const status = topic.publish_mode === "auto" ? "published" : "draft";
    const published_at = status === "published" ? new Date().toISOString() : null;

    const sources = citations.map((url: string, i: number) => ({ index: i + 1, url }));

    const { data: post, error: postErr } = await supabase
      .from("posts")
      .insert({
        topic_id: topicId ?? null,
        title: article.title,
        slug,
        excerpt: article.excerpt,
        content: article.content,
        meta_title: article.meta_title,
        meta_description: article.meta_description,
        sources,
        ai_generated: true,
        status,
        published_at,
        author_id: authorId,
      })
      .select()
      .single();

    if (postErr) throw postErr;

    // Auto-gerar capa via IA (opcional, controlado por project_config.auto_generate_cover).
    let coverGenerated = false;
    let coverError: string | null = null;
    try {
      const { data: cfgRows } = await supabase
        .from("project_config")
        .select("value")
        .in("key", ["auto_generate_cover", "cover_image_quality"]);
      const cfgMap = Object.fromEntries(
        (cfgRows ?? []).map((r: any) => [r.key, r.value] as const),
      );
      const enabled = cfgMap.auto_generate_cover == null
        ? true
        : cfgMap.auto_generate_cover === "true";
      const quality = cfgMap.cover_image_quality === "high" ? "high" : "standard";
      if (enabled) {
        const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
        const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const coverRes = await fetch(
          `${SUPABASE_URL}/functions/v1/generate-cover-image`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${SERVICE_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              postId: post.id,
              title: post.title,
              excerpt: post.excerpt,
              quality,
              count: 1,
            }),
          },
        );
        const coverJson = await coverRes.json().catch(() => ({}));
        if (coverRes.ok && coverJson?.url) {
          coverGenerated = true;
          post.cover_image_url = coverJson.url;
        } else {
          coverError = coverJson?.error ?? `status ${coverRes.status}`;
          console.warn("[generate-post] cover generation failed:", coverError);
        }
      }
    } catch (coverEx) {
      coverError = coverEx instanceof Error ? coverEx.message : String(coverEx);
      console.warn("[generate-post] cover generation threw:", coverError);
    }

    if (rssItems && rssItems.length > 0) {
      const ids = rssItems.map((i: any) => i.id).filter(Boolean);
      if (ids.length > 0) {
        await supabase.from("rss_items").update({ used_in_post_id: post.id }).in("id", ids);
      }
    }

    if (topicId) {
      await supabase
        .from("editorial_topics")
        .update({ last_generated_at: new Date().toISOString() })
        .eq("id", topicId);
    }

    if (researchSessionId) {
      await supabase
        .from("research_sessions")
        .update({
          used_for_post_id: post.id,
          used_angle: selectedAngle ?? null,
        })
        .eq("id", researchSessionId);
    }

    await finishRun(supabase, run, {
      status: "success",
      postId: post.id,
      metadata: {
        autoPublished: status === "published",
        rssItemsUsed: rssItems?.length ?? 0,
        research: usedPerplexity ? "perplexity" : "fallback-internal",
        coverGenerated,
        coverError,
      },
    });

    return new Response(JSON.stringify({ ok: true, post }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-post error:", e);
    await finishRun(supabase, run, { status: "error", error: e, metadata: { topicId } });
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
