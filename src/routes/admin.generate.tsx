import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Sparkles,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
  Eye,
  Search,
  ArrowLeft,
  ExternalLink,
  History,
  Trash2,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { useTopics } from "@/hooks/queries/useTopics";
import { Markdown } from "@/components/blog/Markdown";
import { CoverUploader } from "@/components/blog/CoverUploader";
import {
  useResearchSessions,
  useDeleteResearchSession,
  type ResearchSession,
} from "@/hooks/queries/useResearchSessions";

type GenerateSearch = { adhoc?: string; link?: string };

export const Route = createFileRoute("/admin/generate")({
  component: GeneratePage,
  validateSearch: (s: Record<string, unknown>): GenerateSearch => ({
    adhoc: typeof s.adhoc === "string" ? s.adhoc : undefined,
    link: typeof s.link === "string" ? s.link : undefined,
  }),
});

const inputCls =
  "w-full rounded-lg border border-input bg-bg-elevated px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30";

type Angle = {
  title: string;
  angle: string;
  summary: string;
  source_indices: number[];
};

type GeneratedPost = {
  id: string;
  title: string;
  slug: string;
  status: string;
  excerpt: string | null;
  content: string;
  cover_image_url: string | null;
};

type Mode = "existing" | "adhoc";
type Phase = "idle" | "researching" | "angles" | "writing" | "done";

function GeneratePage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const { data: allTopics = [] } = useTopics();
  const topics = allTopics.filter((t) => t.active);

  const [mode, setMode] = useState<Mode>(search.adhoc ? "adhoc" : "existing");
  const [topicId, setTopicId] = useState("");
  const [adhocName, setAdhocName] = useState(search.adhoc ?? "");
  const [adhocKeywords, setAdhocKeywords] = useState("");
  const [adhocDescription, setAdhocDescription] = useState(
    search.link ? `Notícia de referência: ${search.link}` : "",
  );

  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [phaseStart, setPhaseStart] = useState<number | null>(null);

  const [angles, setAngles] = useState<Angle[] | null>(null);
  const [citations, setCitations] = useState<string[]>([]);
  const [research, setResearch] = useState<string>("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [success, setSuccess] = useState<GeneratedPost | null>(null);
  const [suggesting, setSuggesting] = useState(false);

  const { data: recentSessions = [] } = useResearchSessions(20);
  const deleteSession = useDeleteResearchSession();

  const handleSuggestAdhoc = async () => {
    const name = adhocName.trim();
    if (name.length < 2) {
      toast.error("Informe o nome do tema primeiro");
      return;
    }
    setSuggesting(true);
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const { data, error } = await supabase.functions.invoke("suggest-topic", {
      body: { name },
      headers: session ? { Authorization: `Bearer ${session.access_token}` } : undefined,
    });
    setSuggesting(false);
    if (error) return toast.error(error.message);
    if (data?.error) return toast.error(data.error);
    const s = data?.suggestion;
    if (!s) return toast.error("Sem sugestão retornada");
    if (Array.isArray(s.keywords) && s.keywords.length) {
      setAdhocKeywords(s.keywords.join(", "));
    }
    if (s.description) setAdhocDescription(s.description);
    toast.success("Campos preenchidos pela IA — revise antes de buscar ideias");
  };

  useEffect(() => {
    if (phase !== "researching" && phase !== "writing") {
      setElapsed(0);
      setPhaseStart(null);
      return;
    }
    const start = Date.now();
    setPhaseStart(start);
    const t = setInterval(() => setElapsed(Math.round((Date.now() - start) / 1000)), 500);
    return () => clearInterval(t);
  }, [phase]);

  const buildPayload = () => {
    if (mode === "existing") return { topicId };
    return {
      adhocTopic: {
        name: adhocName.trim(),
        description: adhocDescription.trim() || undefined,
        keywords: adhocKeywords
          .split(",")
          .map((k) => k.trim())
          .filter(Boolean),
      },
    };
  };

  const canSearch =
    phase === "idle" &&
    ((mode === "existing" && !!topicId) || (mode === "adhoc" && adhocName.trim().length >= 3));

  const searchAngles = async () => {
    setError(null);
    setSuccess(null);
    setAngles(null);
    setSessionId(null);
    setPhase("researching");

    const {
      data: { session },
    } = await supabase.auth.getSession();
    const { data, error } = await supabase.functions.invoke("suggest-angles", {
      body: buildPayload(),
      headers: session ? { Authorization: `Bearer ${session.access_token}` } : undefined,
    });

    if (error || data?.error) {
      const msg = error?.message ?? data?.error ?? "Erro desconhecido";
      setError(msg);
      toast.error(msg);
      setPhase("idle");
      return;
    }
    setAngles(data.angles ?? []);
    setCitations(data.citations ?? []);
    setResearch(data.research ?? "");
    setSessionId(data.sessionId ?? null);
    setPhase("angles");
  };

  const restoreSession = (s: ResearchSession) => {
    setError(null);
    setSuccess(null);
    if (s.topic_id) {
      setMode("existing");
      setTopicId(s.topic_id);
    } else {
      setMode("adhoc");
      setAdhocName(s.topic_name);
      setAdhocDescription(s.topic_description ?? "");
      setAdhocKeywords((s.topic_keywords ?? []).join(", "));
    }
    setAngles(s.angles ?? []);
    setCitations(s.citations ?? []);
    setResearch(s.research ?? "");
    setSessionId(s.id);
    setPhase("angles");
  };

  const generateFromAngle = async (angle: Angle) => {
    setError(null);
    setPhase("writing");

    const {
      data: { session },
    } = await supabase.auth.getSession();
    const { data, error } = await supabase.functions.invoke("generate-post", {
      body: {
        ...buildPayload(),
        selectedAngle: { title: angle.title, angle: angle.angle, summary: angle.summary },
        prefetchedResearch: { research, citations },
        researchSessionId: sessionId ?? undefined,
      },
      headers: session ? { Authorization: `Bearer ${session.access_token}` } : undefined,
    });

    if (error || data?.error) {
      const msg = error?.message ?? data?.error ?? "Erro desconhecido";
      setError(msg);
      toast.error(msg);
      setPhase("angles");
      return;
    }
    toast.success(`Post gerado: ${data?.post?.title ?? ""}`);
    setSuccess(data?.post as GeneratedPost);
    setPhase("done");
  };

  const reset = () => {
    setPhase("idle");
    setAngles(null);
    setCitations([]);
    setResearch("");
    setSessionId(null);
    setSuccess(null);
    setError(null);
  };

  return (
    <div className="max-w-4xl p-8 lg:p-10">
      <div className="mb-8 animate-fade-in-up">
        <p className="text-xs font-semibold uppercase tracking-widest text-accent">IA</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-text-primary">
          Gerar novo post
        </h1>
        <p className="mt-1 text-text-secondary">
          Pesquisa em tempo real (Perplexity) → você escolhe o ângulo → redação editorial (Lovable AI).
        </p>
      </div>

      {/* STEP 1: tema */}
      {phase === "idle" && (
        <div className="lp-card-elevated space-y-5 p-6">
          <div className="flex gap-2">
            <button
              onClick={() => setMode("existing")}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                mode === "existing"
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border text-text-secondary hover:bg-bg-surface-2"
              }`}
            >
              Tema da linha editorial
            </button>
            <button
              onClick={() => setMode("adhoc")}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                mode === "adhoc"
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-border text-text-secondary hover:bg-bg-surface-2"
              }`}
            >
              Novo tema (ad-hoc)
            </button>
          </div>

          {mode === "existing" ? (
            <div>
              <label className="mb-1 block text-sm font-medium text-text-primary">
                Tema editorial
              </label>
              <select
                value={topicId}
                onChange={(e) => setTopicId(e.target.value)}
                className={inputCls}
              >
                <option value="">Selecione um tema…</option>
                {topics.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.publish_mode === "auto" ? "auto-publica" : "vai para revisão"})
                  </option>
                ))}
              </select>
              {topics.length === 0 && (
                <p className="mt-2 text-sm text-text-secondary">
                  Nenhum tema ativo.{" "}
                  <a href="/admin/topics" className="text-accent hover:underline">
                    Crie um tema primeiro
                  </a>
                  .
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-text-primary">
                  Tema / assunto
                </label>
                <div className="flex gap-2">
                  <input
                    value={adhocName}
                    onChange={(e) => setAdhocName(e.target.value)}
                    placeholder="Ex: Anthropic Claude 4 lançamento"
                    className={`${inputCls} flex-1`}
                  />
                  <button
                    type="button"
                    onClick={handleSuggestAdhoc}
                    disabled={suggesting || adhocName.trim().length < 2}
                    className="lp-btn-secondary whitespace-nowrap"
                    title="Preencher palavras-chave e linha editorial com IA"
                  >
                    {suggesting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}{" "}
                    Gerar com IA
                  </button>
                </div>
                <p className="mt-1 text-xs text-text-tertiary">
                  Informe o nome e clique em "Gerar com IA" para preencher os demais campos.
                </p>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-text-primary">
                  Palavras-chave <span className="text-text-secondary">(separadas por vírgula)</span>
                </label>
                <input
                  value={adhocKeywords}
                  onChange={(e) => setAdhocKeywords(e.target.value)}
                  placeholder="claude, anthropic, llm, benchmark"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-text-primary">
                  Linha editorial <span className="text-text-secondary">(opcional)</span>
                </label>
                <textarea
                  value={adhocDescription}
                  onChange={(e) => setAdhocDescription(e.target.value)}
                  rows={2}
                  placeholder="Tom, ângulo geral, público-alvo…"
                  className={inputCls}
                />
              </div>
              <p className="text-xs text-text-secondary">
                Este tema não será salvo na linha editorial — uso pontual.
              </p>
            </div>
          )}

          <button
            onClick={searchAngles}
            disabled={!canSearch}
            className="lp-btn-primary-indigo w-full py-3"
          >
            <Search className="h-4 w-4" /> Buscar ideias de post
          </button>

          {error && (
            <div
              role="alert"
              className="flex gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> <div>{error}</div>
            </div>
          )}
        </div>
      )}

      {/* Histórico de pesquisas recentes (visível antes de pesquisar) */}
      {phase === "idle" && recentSessions.length > 0 && (
        <div className="lp-card-elevated mt-6 p-6">
          <div className="mb-4 flex items-center gap-2">
            <History className="h-4 w-4 text-accent" />
            <h2 className="text-base font-semibold text-text-primary">Pesquisas recentes</h2>
            <span className="text-xs text-text-tertiary">
              ({recentSessions.length}) — reaproveite sem refazer Perplexity
            </span>
          </div>
          <ul className="space-y-2">
            {recentSessions.map((s) => (
              <li
                key={s.id}
                className="group flex items-start gap-3 rounded-lg border border-border bg-bg-elevated p-3 transition hover:border-accent/50"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-medium text-text-primary">
                      {s.topic_name}
                    </span>
                    <span className="rounded-full border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-text-tertiary">
                      {s.mode === "existing" ? "tema editorial" : "ad-hoc"}
                    </span>
                    {s.used_for_post_id && (
                      <span className="rounded-full border border-success/40 bg-success/10 px-1.5 py-0.5 text-[10px] text-success">
                        post gerado
                      </span>
                    )}
                  </div>
                  <p className="mt-1 line-clamp-1 text-xs text-text-secondary">
                    {(s.angles?.length ?? 0)} ângulos · {(s.citations?.length ?? 0)} fontes ·{" "}
                    {new Date(s.created_at).toLocaleString("pt-BR")}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    onClick={() => restoreSession(s)}
                    className="lp-btn-secondary px-2 py-1 text-xs"
                    title="Reabrir esta pesquisa"
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> Reabrir
                  </button>
                  <button
                    onClick={() => {
                      if (confirm("Remover esta pesquisa do histórico?")) {
                        deleteSession.mutate(s.id);
                      }
                    }}
                    className="rounded-md border border-border p-1.5 text-text-tertiary opacity-0 transition hover:border-destructive/50 hover:text-destructive group-hover:opacity-100"
                    title="Remover do histórico"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* STEP 1.5: researching */}
      {phase === "researching" && (
        <LiveProgress
          elapsed={elapsed}
          label="Pesquisando últimas notícias e gerando ângulos…"
          phases={["Conectando", "Perplexity buscando", "AI propondo ângulos"]}
        />
      )}

      {/* STEP 2: angles */}
      {phase === "angles" && angles && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-text-primary">
                Escolha um ângulo para o post
              </h2>
              <p className="text-sm text-text-secondary">
                {angles.length} sugestões com base em {citations.length} fontes recentes.
              </p>
            </div>
            <button onClick={reset} className="lp-btn-secondary text-sm">
              <ArrowLeft className="h-4 w-4" /> Trocar tema
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {angles.map((a, i) => (
              <AngleCard
                key={i}
                angle={a}
                citations={citations}
                onSelect={() => generateFromAngle(a)}
              />
            ))}
          </div>

          {citations.length > 0 && (
            <details className="lp-card-elevated p-4 text-sm">
              <summary className="cursor-pointer font-medium text-text-primary">
                Fontes consultadas ({citations.length})
              </summary>
              <ul className="mt-3 space-y-1.5">
                {citations.map((c, i) => (
                  <li key={i} className="flex gap-2 text-text-secondary">
                    <span className="shrink-0 font-mono text-accent">[{i + 1}]</span>
                    <a
                      href={c}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="break-all hover:text-accent hover:underline"
                    >
                      {c}
                    </a>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      {/* STEP 3: writing */}
      {phase === "writing" && (
        <LiveProgress
          elapsed={elapsed}
          label="Lovable AI redigindo o artigo completo…"
          phases={["Estruturando", "Escrevendo", "Salvando"]}
        />
      )}

      {/* DONE */}
      {phase === "done" && success && (
        <div className="space-y-4">
          <div className="rounded-lg border border-success/40 bg-success/10 p-4 text-sm">
            <div className="flex items-center gap-2 font-semibold text-success">
              <CheckCircle2 className="h-4 w-4" /> Post gerado com sucesso
            </div>
            <p className="mt-1 text-text-secondary">
              Status: <strong className="text-text-primary">{success.status}</strong>
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={() => navigate({ to: "/admin/posts/$id", params: { id: success.id } })}
                className="lp-btn-primary-indigo px-3 py-1.5 text-xs"
              >
                Editar post
              </button>
              {success.status === "published" && (
                <a
                  href={`/post/${success.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="lp-btn-secondary"
                >
                  Ver no blog
                </a>
              )}
              <button onClick={reset} className="lp-btn-secondary">
                Gerar outro
              </button>
            </div>
          </div>

          <div className="lp-card-elevated p-6">
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-accent">
              <Eye className="h-3.5 w-3.5" /> Prévia
            </div>
            <div className="mb-4">
              <CoverUploader
                value={success.cover_image_url}
                onChange={async (url) => {
                  setSuccess({ ...success, cover_image_url: url });
                  await supabase
                    .from("posts")
                    .update({ cover_image_url: url })
                    .eq("id", success.id);
                }}
                pathPrefix={success.id}
                postContext={{ title: success.title, excerpt: success.excerpt ?? undefined }}
              />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-text-primary">
              {success.title}
            </h2>
            {success.excerpt && (
              <p className="mt-2 text-sm text-text-secondary">{success.excerpt}</p>
            )}
            <div className="mt-4 max-h-[480px] overflow-y-auto rounded-md border border-border bg-bg-base p-4">
              <Markdown>{success.content}</Markdown>
            </div>
          </div>
        </div>
      )}

      {error && phase !== "idle" && (
        <div
          role="alert"
          className="mt-4 flex gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> <div>{error}</div>
        </div>
      )}
    </div>
  );
}

function AngleCard({
  angle,
  citations,
  onSelect,
}: {
  angle: Angle;
  citations: string[];
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className="lp-card-elevated group flex flex-col gap-3 p-5 text-left transition hover:border-accent hover:shadow-lg"
    >
      <span className="inline-flex w-fit rounded-full border border-accent/30 bg-accent/5 px-2 py-0.5 text-xs font-medium text-accent">
        {angle.angle}
      </span>
      <h3 className="text-base font-semibold leading-tight text-text-primary group-hover:text-accent">
        {angle.title}
      </h3>
      <p className="text-sm text-text-secondary">{angle.summary}</p>
      {angle.source_indices?.length > 0 && (
        <div className="mt-auto flex flex-wrap gap-1 pt-2">
          {angle.source_indices.map((idx) => {
            const url = citations[idx - 1];
            if (!url) return null;
            return (
              <a
                key={idx}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 rounded-md border border-border bg-bg-surface-2 px-1.5 py-0.5 text-[10px] font-mono text-text-secondary hover:border-accent hover:text-accent"
              >
                [{idx}] <ExternalLink className="h-2.5 w-2.5" />
              </a>
            );
          })}
        </div>
      )}
      <div className="text-xs font-medium text-accent opacity-0 transition group-hover:opacity-100">
        <Sparkles className="mr-1 inline h-3 w-3" /> Gerar este post →
      </div>
    </button>
  );
}

function LiveProgress({
  elapsed,
  label,
  phases,
}: {
  elapsed: number;
  label: string;
  phases: string[];
}) {
  const idx = elapsed < 5 ? 0 : elapsed < 25 ? 1 : 2;
  return (
    <div
      role="status"
      aria-live="polite"
      className="lp-card-elevated p-6"
    >
      <div className="flex items-center gap-2 text-sm font-medium text-accent">
        <Loader2 className="h-4 w-4 animate-spin" /> {label}
      </div>
      <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-bg-surface-2">
        <div
          className="h-full bg-accent transition-[width] duration-500"
          style={{ width: `${Math.min(100, (elapsed / 60) * 100)}%` }}
        />
      </div>
      <div className="mt-3 flex justify-between text-xs text-text-secondary">
        <span className="flex items-center gap-1.5">
          <Clock className="h-3 w-3" /> {elapsed}s decorridos
        </span>
        <span>{phases[idx]}</span>
      </div>
    </div>
  );
}
