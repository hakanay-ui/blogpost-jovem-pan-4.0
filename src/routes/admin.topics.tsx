import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Trash2, Save, Loader2, Sparkles, Pencil } from "lucide-react";
import { toast } from "sonner";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { useTopics, useTopicMutations, type TopicDraft } from "@/hooks/queries/useTopics";
import { LoadingCard } from "@/components/ui/state-card";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/topics")({
  component: TopicsPage,
});

const inputCls =
  "w-full rounded-lg border border-input bg-bg-elevated px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30";

const EMPTY_DRAFT: TopicDraft = {
  name: "",
  description: "",
  keywords: [],
  publish_mode: "review",
  frequency_hours: 24,
  active: true,
  schedule_mode: "daily_window",
  daily_run_hour: 9,
  max_posts_per_day: 3,
};

function TopicsPage() {
  const { data: topics = [], isLoading } = useTopics();
  const { create, update, remove } = useTopicMutations();
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<TopicDraft>(EMPTY_DRAFT);
  const [keywordInput, setKeywordInput] = useState("");
  const [suggesting, setSuggesting] = useState(false);
  const { confirm, dialog } = useConfirm();

  const handleSuggest = async () => {
    const name = draft.name.trim();
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
    setDraft((d) => ({
      ...d,
      description: s.description ?? d.description,
      keywords: Array.isArray(s.keywords) && s.keywords.length ? s.keywords : d.keywords,
      publish_mode: s.publish_mode ?? d.publish_mode,
      frequency_hours: s.frequency_hours ?? d.frequency_hours,
    }));
    toast.success("Campos preenchidos pela IA — revise antes de salvar");
  };

  const addKeyword = () => {
    const k = keywordInput.trim();
    if (!k) return;
    setDraft({ ...draft, keywords: [...draft.keywords, k] });
    setKeywordInput("");
  };

  const handleCreate = () => {
    if (!draft.name.trim()) return;
    create.mutate(draft, {
      onSuccess: () => {
        toast.success("Tema criado");
        setCreating(false);
        setDraft(EMPTY_DRAFT);
      },
      onError: (e: any) => toast.error(e.message),
    });
  };

  const startEdit = (t: typeof topics[number]) => {
    setEditingId(t.id);
    setCreating(false);
    setDraft({
      name: t.name,
      description: t.description ?? "",
      keywords: t.keywords ?? [],
      publish_mode: t.publish_mode,
      frequency_hours: t.frequency_hours,
      active: t.active,
      schedule_mode: t.schedule_mode,
      daily_run_hour: t.daily_run_hour,
      max_posts_per_day: t.max_posts_per_day,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
    setKeywordInput("");
  };

  const handleSaveEdit = () => {
    if (!editingId || !draft.name.trim()) return;
    update.mutate(
      { id: editingId, patch: draft },
      {
        onSuccess: () => {
          toast.success("Tema atualizado");
          cancelEdit();
        },
        onError: (e: any) => toast.error(e.message),
      },
    );
  };

  const handleToggleActive = (id: string, active: boolean) => {
    update.mutate(
      { id, patch: { active } },
      {
        onSuccess: () => toast.success("Tema atualizado"),
        onError: (e: any) => toast.error(e.message),
      },
    );
  };

  const handleRemove = async (id: string, name: string) => {
    const ok = await confirm({
      title: "Excluir tema?",
      description: `"${name}" será removido. Posts associados perdem o vínculo mas não são apagados.`,
      confirmLabel: "Excluir",
      destructive: true,
    });
    if (!ok) return;
    remove.mutate(id, {
      onSuccess: () => toast.success("Tema excluído"),
      onError: (e: any) => toast.error(e.message),
    });
  };

  return (
    <div className="p-8 lg:p-10">
      {dialog}
      <div className="mb-6 flex items-center justify-between animate-fade-in-up">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-accent">Editorial</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-text-primary">
            Linha editorial
          </h1>
          <p className="mt-1 text-text-secondary">
            Configure temas, palavras-chave, frequência e modo de publicação.
          </p>
        </div>
        <button
          onClick={() => {
            setEditingId(null);
            setDraft(EMPTY_DRAFT);
            setCreating(!creating);
          }}
          className="lp-btn-primary-indigo"
        >
          <Plus className="h-4 w-4" /> Novo tema
        </button>
      </div>

      {(creating || editingId) && (
        <div className="lp-card-elevated mb-6 space-y-4 p-6 animate-fade-in-up">
          <h2 className="text-lg font-semibold text-text-primary">
            {editingId ? "Editar tema" : "Novo tema"}
          </h2>
          <div>
            <label className="mb-1 block text-sm font-medium text-text-primary">
              Nome do tema
            </label>
            <div className="flex gap-2">
              <input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="ex: Inteligência artificial generativa"
                className={`${inputCls} flex-1`}
              />
              <button
                type="button"
                onClick={handleSuggest}
                disabled={suggesting || draft.name.trim().length < 2}
                className="lp-btn-secondary whitespace-nowrap"
                title="Preencher descrição, palavras-chave, modo e frequência com IA"
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
              Descrição da linha editorial
            </label>
            <textarea
              value={draft.description ?? ""}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              rows={2}
              placeholder="Tom, ângulo, público-alvo…"
              className={inputCls}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-text-primary">
              Palavras-chave
            </label>
            <div className="flex gap-2">
              <input
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addKeyword();
                  }
                }}
                placeholder="Pressione Enter para adicionar"
                className={`${inputCls} flex-1`}
              />
              <button onClick={addKeyword} className="lp-btn-secondary">
                Adicionar
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {draft.keywords.map((k, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent"
                >
                  {k}
                  <button
                    onClick={() =>
                      setDraft({ ...draft, keywords: draft.keywords.filter((_, j) => j !== i) })
                    }
                    className="hover:text-accent-hover"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-text-primary">
                Modo de publicação
              </label>
              <select
                value={draft.publish_mode}
                onChange={(e) =>
                  setDraft({ ...draft, publish_mode: e.target.value as "auto" | "review" })
                }
                className={inputCls}
              >
                <option value="review">Revisão (rascunho)</option>
                <option value="auto">Auto-publicar</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-primary">
                Modo de agendamento
              </label>
              <select
                value={draft.schedule_mode}
                onChange={(e) =>
                  setDraft({ ...draft, schedule_mode: e.target.value as TopicDraft["schedule_mode"] })
                }
                className={inputCls}
              >
                <option value="interval">Intervalo fixo (horas)</option>
                <option value="daily_window">Janela diária (1x/dia)</option>
                <option value="per_new_item">Por nova notícia</option>
              </select>
            </div>
          </div>

          {draft.schedule_mode === "interval" && (
            <div>
              <label className="mb-1 block text-sm font-medium text-text-primary">
                Frequência (horas)
              </label>
              <input
                type="number"
                min={1}
                value={draft.frequency_hours}
                onChange={(e) =>
                  setDraft({ ...draft, frequency_hours: Number(e.target.value) || 24 })
                }
                className={inputCls}
              />
              <p className="mt-1 text-xs text-text-tertiary">
                Gera um post a cada N horas, contadas da última geração.
              </p>
            </div>
          )}

          {draft.schedule_mode === "daily_window" && (
            <div>
              <label className="mb-1 block text-sm font-medium text-text-primary">
                Hora UTC (0-23)
              </label>
              <input
                type="number"
                min={0}
                max={23}
                value={draft.daily_run_hour}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    daily_run_hour: Math.max(0, Math.min(23, Number(e.target.value) || 0)),
                  })
                }
                className={inputCls}
              />
              <p className="mt-1 text-xs text-text-tertiary">
                Roda 1x por dia nessa hora UTC. Ex.: 12 UTC ≈ 09h Brasília.
              </p>
            </div>
          )}

          {draft.schedule_mode === "per_new_item" && (
            <div>
              <label className="mb-1 block text-sm font-medium text-text-primary">
                Máx. posts por dia
              </label>
              <input
                type="number"
                min={1}
                max={50}
                value={draft.max_posts_per_day}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    max_posts_per_day: Math.max(1, Math.min(50, Number(e.target.value) || 1)),
                  })
                }
                className={inputCls}
              />
              <p className="mt-1 text-xs text-text-tertiary">
                Gera 1 post para cada nova notícia RSS detectada, até esse limite diário.
              </p>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => {
                if (editingId) cancelEdit();
                else setCreating(false);
              }}
              className="lp-btn-secondary"
            >
              Cancelar
            </button>
            <button
              onClick={editingId ? handleSaveEdit : handleCreate}
              disabled={
                (editingId ? update.isPending : create.isPending) || !draft.name.trim()
              }
              className="lp-btn-primary-indigo"
            >
              {(editingId ? update.isPending : create.isPending) ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}{" "}
              {editingId ? "Salvar alterações" : "Criar tema"}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {isLoading ? (
          <LoadingCard title="Carregando temas…" />
        ) : topics.length === 0 ? (
          <div className="lp-card-elevated p-12 text-center text-text-secondary">
            Nenhum tema cadastrado. Crie o primeiro!
          </div>
        ) : (
          topics.map((t, i) => (
            <div
              key={t.id}
              style={{ ["--stagger" as any]: i }}
              className="lp-card-elevated p-5 animate-fade-in-up"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold tracking-tight text-text-primary">{t.name}</h3>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        t.active ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {t.active ? "Ativo" : "Inativo"}
                    </span>
                  </div>
                  {t.description && (
                    <p className="mt-1 text-sm text-text-secondary">{t.description}</p>
                  )}
                  {t.keywords?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {t.keywords.map((k, j) => (
                        <span
                          key={j}
                          className="rounded-full bg-bg-subtle-accent px-2 py-0.5 text-xs text-text-secondary"
                        >
                          {k}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-text-secondary">
                    <span>
                      Publicação:{" "}
                      <strong className="text-text-primary">
                        {t.publish_mode === "auto" ? "Auto-publicar" : "Revisão"}
                      </strong>
                    </span>
                    <span>
                      Agendamento:{" "}
                      <strong className="text-text-primary">
                        {t.schedule_mode === "interval"
                          ? `Intervalo · ${t.frequency_hours}h`
                          : t.schedule_mode === "daily_window"
                            ? `Diário · ${String(t.daily_run_hour).padStart(2, "0")}:00 UTC`
                            : `Por nova notícia · até ${t.max_posts_per_day}/dia`}
                      </strong>
                    </span>
                    {t.last_generated_at && (
                      <span>
                        Última geração: {new Date(t.last_generated_at).toLocaleString("pt-BR")}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleToggleActive(t.id!, !t.active)}
                    className="lp-btn-secondary"
                  >
                    {t.active ? "Desativar" : "Ativar"}
                  </button>
                  <button
                    onClick={() => startEdit(t)}
                    className="rounded p-1.5 text-text-secondary hover:bg-bg-subtle-accent hover:text-text-primary"
                    title="Editar"
                    aria-label={`Editar tema ${t.name}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleRemove(t.id!, t.name)}
                    className="rounded p-1.5 text-destructive hover:bg-destructive/10"
                    title="Excluir"
                    aria-label={`Excluir tema ${t.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
