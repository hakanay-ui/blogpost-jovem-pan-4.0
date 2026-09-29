import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { useFeeds, useFeedMutations, type FeedDraft } from "@/hooks/queries/useFeeds";
import { useTopics } from "@/hooks/queries/useTopics";
import { LoadingCard } from "@/components/ui/state-card";

export const Route = createFileRoute("/admin/feeds")({
  component: FeedsPage,
});

const inputCls =
  "rounded-lg border border-input bg-bg-elevated px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30";

const PRESETS = [
  { name: "Hacker News (frontpage)", url: "https://hnrss.org/frontpage" },
  { name: "TechCrunch", url: "https://techcrunch.com/feed/" },
  { name: "The Verge", url: "https://www.theverge.com/rss/index.xml" },
  { name: "Ars Technica", url: "https://feeds.arstechnica.com/arstechnica/index" },
  { name: "MIT Technology Review", url: "https://www.technologyreview.com/feed/" },
  { name: "Smashing Magazine", url: "https://www.smashingmagazine.com/feed/" },
];

const EMPTY_DRAFT: FeedDraft = { name: "", url: "", topic_id: null, active: true };

function FeedsPage() {
  const { data: feeds = [], isLoading, refetch } = useFeeds();
  const { data: allTopics = [] } = useTopics();
  const activeTopics = allTopics.filter((t) => t.active);
  const { create, remove } = useFeedMutations();
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<FeedDraft>(EMPTY_DRAFT);
  const [fetchingAll, setFetchingAll] = useState(false);
  const { confirm, dialog } = useConfirm();

  const handleCreate = () => {
    if (!draft.name.trim() || !draft.url.trim()) return;
    create.mutate(draft, {
      onSuccess: () => {
        toast.success("Feed adicionado");
        setDraft(EMPTY_DRAFT);
        setCreating(false);
      },
      onError: (e: any) => toast.error(e.message),
    });
  };

  const importPreset = (p: { name: string; url: string }) => {
    create.mutate(
      { name: p.name, url: p.url, topic_id: null, active: true },
      {
        onSuccess: () => toast.success(`${p.name} importado`),
        onError: (e: any) => toast.error(e.message),
      },
    );
  };

  const handleRemove = async (id: string, name: string) => {
    const ok = await confirm({
      title: "Excluir feed?",
      description: `"${name}" e suas referências em rss_items serão removidas.`,
      confirmLabel: "Excluir",
      destructive: true,
    });
    if (!ok) return;
    remove.mutate(id, {
      onSuccess: () => toast.success("Feed excluído"),
      onError: (e: any) => toast.error(e.message),
    });
  };

  const refreshAll = async () => {
    setFetchingAll(true);
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const { error } = await supabase.functions.invoke("fetch-rss", {
      headers: session ? { Authorization: `Bearer ${session.access_token}` } : undefined,
    });
    setFetchingAll(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Feeds atualizados");
    }
    refetch();
  };

  const presetUrls = new Set(feeds.map((f) => f.url));
  const availablePresets = PRESETS.filter((p) => !presetUrls.has(p.url));

  return (
    <>
      {dialog}
    <div className="p-8 lg:p-10">
      <div className="mb-6 flex items-center justify-between animate-fade-in-up">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-accent">Coleta</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-text-primary">Fontes RSS</h1>
          <p className="mt-1 text-text-secondary">
            Adicione feeds para alimentar a geração de conteúdo.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={refreshAll}
            disabled={fetchingAll}
            className="lp-btn-secondary"
          >
            {fetchingAll ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}{" "}
            Buscar agora
          </button>
          <button onClick={() => setCreating(!creating)} className="lp-btn-primary-indigo">
            <Plus className="h-4 w-4" /> Adicionar feed
          </button>
        </div>
      </div>

      {creating && (
        <div className="lp-card-elevated mb-6 space-y-3 p-5 animate-fade-in-up">
          <div className="grid grid-cols-2 gap-3">
            <input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="Nome do feed"
              className={inputCls}
            />
            <input
              value={draft.url}
              onChange={(e) => setDraft({ ...draft, url: e.target.value })}
              placeholder="https://exemplo.com/feed.xml"
              className={inputCls}
            />
          </div>
          <div className="flex items-center justify-between gap-3">
            <select
              value={draft.topic_id ?? ""}
              onChange={(e) => setDraft({ ...draft, topic_id: e.target.value || null })}
              className={inputCls}
            >
              <option value="">Sem tema vinculado</option>
              {activeTopics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <button onClick={() => setCreating(false)} className="lp-btn-secondary">
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                disabled={create.isPending}
                className="lp-btn-primary-indigo"
              >
                {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Criar
              </button>
            </div>
          </div>
        </div>
      )}

      {availablePresets.length > 0 && (
        <div className="lp-card-elevated mb-6 p-5 animate-fade-in-up">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-text-secondary">
            Sugestões para importar
          </h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {availablePresets.map((p) => (
              <button
                key={p.url}
                onClick={() => importPreset(p)}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-bg-elevated px-3 py-1 text-xs font-medium text-text-secondary hover:border-accent hover:text-accent"
              >
                <Plus className="h-3 w-3" /> {p.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        {isLoading ? (
          <LoadingCard title="Carregando feeds…" />
        ) : feeds.length === 0 ? (
          <div className="lp-card-elevated p-12 text-center text-text-secondary">
            Nenhum feed cadastrado.
          </div>
        ) : (
          feeds.map((f, i) => (
            <div
              key={f.id}
              style={{ ["--stagger" as any]: i }}
              className="lp-card-elevated flex items-center justify-between p-4 animate-fade-in-up"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="truncate font-medium text-text-primary">{f.name}</h3>
                  {!f.active && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs">Inativo</span>
                  )}
                </div>
                <a
                  href={f.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block truncate text-xs text-text-secondary hover:text-accent"
                >
                  {f.url}
                </a>
                {f.last_fetched_at && (
                  <div className="mt-1 text-xs text-text-tertiary">
                    Última coleta: {new Date(f.last_fetched_at).toLocaleString("pt-BR")}
                  </div>
                )}
              </div>
              <button
                onClick={() => handleRemove(f.id!, f.name)}
                className="rounded p-1.5 text-destructive hover:bg-destructive/10"
                aria-label={`Excluir feed ${f.name}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
    </>
  );
}
