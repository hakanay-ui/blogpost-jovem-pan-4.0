// Cron-triggered:
//  1) publica posts com status=scheduled e scheduled_at <= now().
//  2) baixa RSS (fetch-rss).
//  3) dispara generate-post para topics cujo frequency_hours elapsou.
// Registra execução em generation_runs.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { fetchWithRetry } from "../_shared/retry.ts";
import { startRun, finishRun } from "../_shared/runs.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  // Secret vive em project_config (gerado pela migration). Sem env var manual.
  // Fallback para Deno.env para compatibilidade se alguém tiver setado antes.
  let expected = Deno.env.get("SCHEDULER_SECRET");
  if (!expected) {
    const { data: cfg } = await supabase
      .from("project_config")
      .select("value")
      .eq("key", "scheduler_secret")
      .maybeSingle();
    expected = cfg?.value;
  }

  const auth = req.headers.get("authorization") ?? "";
  const provided = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7) : "";
  if (!expected || provided !== expected) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const run = await startRun(supabase, "scheduler");

  try {
    // 1) Publica posts agendados com hora devida.
    const nowIso = new Date().toISOString();
    const { data: dueScheduled, error: dueErr } = await supabase
      .from("posts")
      .update({ status: "published", published_at: nowIso })
      .eq("status", "scheduled")
      .lte("scheduled_at", nowIso)
      .select("id, slug");
    if (dueErr) console.error("[scheduler] publish scheduled error:", dueErr);
    const publishedScheduled = dueScheduled?.length ?? 0;

    // 2) Atualiza feeds RSS.
    const rssRes = await fetchWithRetry(`${supabaseUrl}/functions/v1/fetch-rss`, {
      method: "POST",
      headers: { Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
      body: "{}",
    });
    const rssData = await rssRes.json().catch(() => ({}));

    // 3) Topics devidos — agora suportando 3 modos: interval | daily_window | per_new_item.
    const { data: topics } = await supabase
      .from("editorial_topics")
      .select("id, name, frequency_hours, last_generated_at, schedule_mode, daily_run_hour, max_posts_per_day")
      .eq("active", true);

    const nowDate = new Date();
    const nowMs = nowDate.getTime();
    const currentHourUTC = nowDate.getUTCHours();
    const startOfTodayUTC = Date.UTC(
      nowDate.getUTCFullYear(),
      nowDate.getUTCMonth(),
      nowDate.getUTCDate(),
    );

    const due: typeof topics = [];
    for (const t of topics ?? []) {
      const mode = t.schedule_mode ?? "interval";

      if (mode === "interval") {
        if (!t.last_generated_at) {
          due.push(t);
        } else {
          const elapsed = (nowMs - new Date(t.last_generated_at).getTime()) / (1000 * 60 * 60);
          if (elapsed >= t.frequency_hours) due.push(t);
        }
        continue;
      }

      if (mode === "daily_window") {
        if (currentHourUTC !== (t.daily_run_hour ?? 9)) continue;
        const lastGen = t.last_generated_at ? new Date(t.last_generated_at).getTime() : 0;
        if (lastGen < startOfTodayUTC) due.push(t);
        continue;
      }

      if (mode === "per_new_item") {
        // Conta posts criados hoje para esse tópico (limite diário).
        const { count: todayPosts } = await supabase
          .from("posts")
          .select("id", { count: "exact", head: true })
          .eq("topic_id", t.id)
          .gte("created_at", new Date(startOfTodayUTC).toISOString());
        if ((todayPosts ?? 0) >= (t.max_posts_per_day ?? 3)) continue;

        // Existe ao menos um rss_item não usado vinculado a esse tópico?
        const { data: feeds } = await supabase
          .from("rss_feeds")
          .select("id")
          .eq("topic_id", t.id)
          .eq("active", true);
        const feedIds = (feeds ?? []).map((f) => f.id);
        if (feedIds.length === 0) continue;

        const { count: unusedItems } = await supabase
          .from("rss_items")
          .select("id", { count: "exact", head: true })
          .in("feed_id", feedIds)
          .is("used_in_post_id", null);
        if ((unusedItems ?? 0) > 0) due.push(t);
        continue;
      }
    }

    const generated: Array<Record<string, unknown>> = [];
    for (const topic of due) {
      try {
        const r = await fetchWithRetry(
          `${supabaseUrl}/functions/v1/generate-post`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({ topicId: topic.id }),
          },
          { maxAttempts: 2 },
        );
        const j = await r.json().catch(() => ({}));
        generated.push({ topic: topic.name, ok: r.ok, ...j });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        generated.push({ topic: topic.name, error: msg });
      }
    }

    const generateFailures = generated.filter((g) => g.ok === false || g.error);
    const generateSuccesses = generated.filter((g) => g.ok === true && !g.error);

    const result = {
      ok: generateFailures.length === 0,
      publishedScheduled,
      rss: rssData,
      generated,
    };

    // Se algum generate-post interno falhou, marca run como error para não
    // mascarar pipeline quebrada no dashboard. Erros de feed individual em
    // fetch-rss não escalam (o próprio fetch-rss já registra sua run).
    if (generateFailures.length > 0) {
      await finishRun(supabase, run, {
        status: "error",
        error: new Error(
          `${generateFailures.length}/${generated.length} generate-post falharam`,
        ),
        metadata: {
          publishedScheduled,
          dueTopics: due.length,
          generatedOk: generateSuccesses.length,
          generatedFail: generateFailures.length,
          failures: generateFailures.map((f) => ({
            topic: f.topic,
            error: f.error ?? "ok=false",
          })),
        },
      });
    } else {
      await finishRun(supabase, run, {
        status: "success",
        metadata: {
          publishedScheduled,
          dueTopics: due.length,
          generatedCount: generateSuccesses.length,
        },
      });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("scheduler error:", e);
    await finishRun(supabase, run, { status: "error", error: e });
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
