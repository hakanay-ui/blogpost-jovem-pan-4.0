// Helper para registrar execuções da pipeline em public.generation_runs.
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export type RunType = "scheduler" | "fetch-rss" | "generate-post" | "editorial-slot";

export type RunRecord = {
  id: string;
  started_at: number;
};

export async function startRun(
  supabase: SupabaseClient,
  runType: RunType,
  ctx?: { topicId?: string | null; metadata?: Record<string, unknown> },
): Promise<RunRecord | null> {
  try {
    const { data, error } = await supabase
      .from("generation_runs")
      .insert({
        run_type: runType,
        status: "running",
        topic_id: ctx?.topicId ?? null,
        metadata: ctx?.metadata ?? {},
      })
      .select("id")
      .single();
    if (error || !data) {
      console.error("[startRun] falha ao registrar início:", error);
      return null;
    }
    return { id: data.id, started_at: Date.now() };
  } catch (e) {
    console.error("[startRun] exceção:", e);
    return null;
  }
}

export async function finishRun(
  supabase: SupabaseClient,
  run: RunRecord | null,
  outcome:
    | { status: "success"; postId?: string | null; metadata?: Record<string, unknown> }
    | { status: "error"; error: unknown; metadata?: Record<string, unknown> }
    | { status: "skipped"; reason: string; metadata?: Record<string, unknown> },
): Promise<void> {
  if (!run) return;
  const duration_ms = Date.now() - run.started_at;
  try {
    const patch: Record<string, unknown> = {
      status: outcome.status,
      finished_at: new Date().toISOString(),
      duration_ms,
    };
    if (outcome.status === "success") {
      patch.post_id = outcome.postId ?? null;
      if (outcome.metadata) patch.metadata = outcome.metadata;
    } else if (outcome.status === "error") {
      const err = outcome.error;
      patch.error_message = err instanceof Error ? err.message : String(err);
      if (outcome.metadata) patch.metadata = outcome.metadata;
    } else {
      patch.error_message = outcome.reason;
      if (outcome.metadata) patch.metadata = outcome.metadata;
    }
    const { error } = await supabase
      .from("generation_runs")
      .update(patch)
      .eq("id", run.id);
    if (error) console.error("[finishRun] update error:", error);
  } catch (e) {
    console.error("[finishRun] exceção:", e);
  }
}
