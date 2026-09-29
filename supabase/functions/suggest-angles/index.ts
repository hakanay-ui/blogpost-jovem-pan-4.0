// Pesquisa o tema (Perplexity) e devolve 5 ângulos possíveis de post.
// Aceita topicId (existente) OU adhocTopic { name, keywords?, description? }.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { fetchWithRetry } from "../_shared/retry.ts";
import { getApiKey, getDefaultModel } from "../_shared/keys.ts";
import { requireAdminOrScheduler } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type AdhocTopic = { name: string; keywords?: string[]; description?: string };

async function research(
  topic: { name: string; description?: string | null; keywords?: string[] },
  rssItems: any[],
) {
  const PERPLEXITY_API_KEY = await getApiKey("perplexity_api_key");
  if (!PERPLEXITY_API_KEY) {
    return { research: "", citations: [] as string[], usedPerplexity: false };
  }
  const rssContext = rssItems.length
    ? `\n\nNotícias coletadas via RSS:\n${rssItems
        .map((i, n) => `${n + 1}. ${i.title} — ${i.link}`)
        .join("\n")}`
    : "";

  const prompt = `Pesquise as últimas notícias e desenvolvimentos sobre: "${topic.name}".
${topic.description ? `Contexto editorial: ${topic.description}` : ""}
${topic.keywords?.length ? `Palavras-chave: ${topic.keywords.join(", ")}` : ""}
${rssContext}

Retorne os principais fatos, dados, tendências e debates dos últimos dias. Cite fontes.`;

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
            { role: "system", content: "Você é um pesquisador editorial. Seja factual e cite fontes." },
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
      citations: (data.citations ?? []) as string[],
      usedPerplexity: true,
    };
  } catch (e) {
    console.error("Perplexity failed:", e);
    return { research: "", citations: [], usedPerplexity: false };
  }
}

async function proposeAngles(
  topic: { name: string; description?: string | null; keywords?: string[] },
  researchText: string,
  citations: string[],
) {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurado");
  const { model } = await getDefaultModel();

  const systemPrompt = `Você é um editor-chefe. Dado um tema e uma pesquisa recente, proponha 5 ângulos de post DISTINTOS e instigantes em português brasileiro.
Cada ângulo deve ter título único, summary (2-3 frases), e indicar quais fontes (índices) o sustentam.`;

  const userPrompt = `Tema: ${topic.name}
${topic.description ? `Contexto: ${topic.description}` : ""}
${topic.keywords?.length ? `Palavras-chave: ${topic.keywords.join(", ")}` : ""}

PESQUISA:
${researchText || "(sem pesquisa externa — use conhecimento geral atual)"}

${citations.length ? `FONTES:\n${citations.map((c, i) => `[${i + 1}] ${c}`).join("\n")}` : ""}`;

  const tools = [
    {
      type: "function",
      function: {
        name: "propose_angles",
        description: "Propõe 5 ângulos de post distintos",
        parameters: {
          type: "object",
          properties: {
            angles: {
              type: "array",
              minItems: 5,
              maxItems: 5,
              items: {
                type: "object",
                properties: {
                  title: { type: "string", description: "Título do post (max 80 chars)" },
                  angle: { type: "string", description: "Tipo do ângulo (ex: análise, listicle, opinião, explainer, contraponto)" },
                  summary: { type: "string", description: "2-3 frases descrevendo o post" },
                  source_indices: {
                    type: "array",
                    items: { type: "integer" },
                    description: "Índices (1-based) das fontes usadas",
                  },
                },
                required: ["title", "angle", "summary", "source_indices"],
                additionalProperties: false,
              },
            },
          },
          required: ["angles"],
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
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools,
        tool_choice: { type: "function", function: { name: "propose_angles" } },
      }),
    },
    { maxAttempts: 3 },
  );

  if (res.status === 429) throw new Error("Rate limit do AI Gateway. Tente novamente em instantes.");
  if (res.status === 402) throw new Error("Créditos do AI Gateway esgotados.");
  if (!res.ok) throw new Error(`AI Gateway error ${res.status}: ${await res.text()}`);

  const data = await res.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) throw new Error("AI não retornou estrutura esperada");
  const parsed = JSON.parse(toolCall.function.arguments);
  return parsed.angles as Array<{
    title: string;
    angle: string;
    summary: string;
    source_indices: number[];
  }>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = await requireAdminOrScheduler(req);
  if (!auth.ok) return auth.response;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Resolve usuário autor da pesquisa (para histórico)
  let createdBy: string | null = null;
  try {
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const { data: u } = await supabase.auth.getUser(token);
      createdBy = u.user?.id ?? null;
    }
  } catch (_e) {
    // segue sem author
  }

  try {
    const body = await req.json();
    const topicId: string | undefined = body?.topicId;
    const adhoc: AdhocTopic | undefined = body?.adhocTopic;

    let topic: { name: string; description?: string | null; keywords?: string[] };
    let rssItems: any[] = [];

    if (topicId) {
      const { data, error } = await supabase
        .from("editorial_topics")
        .select("*")
        .eq("id", topicId)
        .single();
      if (error || !data) throw new Error("Tópico não encontrado");
      topic = data;
      const { data: items } = await supabase
        .from("rss_items")
        .select("id, title, link, description, feed:rss_feeds!inner(topic_id)")
        .eq("feed.topic_id", topicId)
        .is("used_in_post_id", null)
        .order("published_at", { ascending: false, nullsFirst: false })
        .limit(8);
      rssItems = items ?? [];
    } else if (adhoc?.name) {
      topic = {
        name: adhoc.name,
        description: adhoc.description ?? null,
        keywords: adhoc.keywords ?? [],
      };
    } else {
      throw new Error("Informe topicId ou adhocTopic.name");
    }

    const { research: researchText, citations, usedPerplexity } = await research(topic, rssItems);
    const angles = await proposeAngles(topic, researchText, citations);

    // Persiste a pesquisa no histórico (não bloqueia em caso de erro)
    let sessionId: string | null = null;
    try {
      const { data: session } = await supabase
        .from("research_sessions")
        .insert({
          created_by: createdBy,
          topic_id: topicId ?? null,
          topic_name: topic.name,
          topic_description: topic.description ?? null,
          topic_keywords: topic.keywords ?? [],
          mode: topicId ? "existing" : "adhoc",
          research: researchText,
          citations,
          angles,
        })
        .select("id")
        .single();
      sessionId = session?.id ?? null;
    } catch (e) {
      console.error("research_sessions insert failed:", e);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        sessionId,
        angles,
        citations,
        research: researchText,
        usedPerplexity,
        topic,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("suggest-angles error:", e);
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
