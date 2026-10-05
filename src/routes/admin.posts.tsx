import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Edit,
  Trash2,
  Eye,
  EyeOff,
  ExternalLink,
  Sparkles,
  CalendarClock,
  Search,
  ChevronLeft,
  ChevronRight,
  Plus,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { usePosts, usePostMutations } from "@/hooks/queries/usePosts";
import { EmptyCard, LoadingCard } from "@/components/ui/state-card";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { NewPostDialog } from "@/components/blog/NewPostDialog";

export const Route = createFileRoute("/admin/posts")({
  component: PostsPage,
});

type Filter = "all" | "draft" | "scheduled" | "published";
const PAGE_SIZE = 10;

function PostsPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [newOpen, setNewOpen] = useState(false);
  const { data: posts = [], isLoading } = usePosts(filter);
  const { publish, unpublish, remove, cancelSchedule } = usePostMutations();
  const { confirm, dialog } = useConfirm();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? posts.filter((p) => p.title.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q)) : posts;
  }, [posts, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handlePublish = (id: string) =>
    publish.mutate(id, {
      onSuccess: () => toast.success("Post publicado"),
      onError: (e: any) => toast.error(e.message),
    });
  const handleUnpublish = (id: string) =>
    unpublish.mutate(id, {
      onSuccess: () => toast.success("Post despublicado"),
      onError: (e: any) => toast.error(e.message),
    });
  const handleCancelSchedule = async (id: string, title: string) => {
    const ok = await confirm({
      title: "Cancelar agendamento?",
      description: `"${title}" voltará para rascunho e não será publicado automaticamente.`,
      confirmLabel: "Cancelar agendamento",
    });
    if (!ok) return;
    cancelSchedule.mutate(id, {
      onSuccess: () => toast.success("Agendamento cancelado"),
      onError: (e: any) => toast.error(e.message),
    });
  };
  const handleRemove = async (id: string, title: string) => {
    const ok = await confirm({
      title: "Excluir post?",
      description: `"${title}" será removido permanentemente. Esta ação não pode ser desfeita.`,
      confirmLabel: "Excluir",
      destructive: true,
    });
    if (!ok) return;
    remove.mutate(id, {
      onSuccess: () => toast.success("Post excluído"),
      onError: (e: any) => toast.error(e.message),
    });
  };

  return (
    <div className="p-8 lg:p-10">
      {dialog}
      <NewPostDialog open={newOpen} onClose={() => setNewOpen(false)} />
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-accent">Conteúdo</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-text-primary">Posts</h1>
          <p className="mt-1 text-text-secondary">Gerencie rascunhos, agendamentos e publicações</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setNewOpen(true)}
            className="lp-btn-primary-indigo"
            aria-label="Criar novo post"
          >
            <Plus className="h-4 w-4" />
            Novo post
          </button>
          <label className="relative block" htmlFor="posts-search">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
            <input
              id="posts-search"
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Buscar por título ou slug…"
              className="w-60 rounded-lg border border-input bg-bg-elevated py-2 pl-9 pr-3 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
              aria-label="Buscar posts"
            />
          </label>
          <div
            role="tablist"
            aria-label="Filtrar por status"
            className="inline-flex rounded-xl border border-border bg-bg-elevated p-1 shadow-[var(--shadow-elevation-1)]"
          >
            {(["all", "draft", "scheduled", "published"] as Filter[]).map((f) => (
              <button
                key={f}
                role="tab"
                aria-selected={filter === f}
                onClick={() => {
                  setFilter(f);
                  setPage(1);
                }}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  filter === f
                    ? "bg-accent text-white shadow-[var(--shadow-accent-glow)]"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                {f === "all"
                  ? "Todos"
                  : f === "draft"
                    ? "Rascunhos"
                    : f === "scheduled"
                      ? "Agendados"
                      : "Publicados"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {isLoading ? (
        <LoadingCard title="Carregando posts…" />
      ) : filtered.length === 0 ? (
        <EmptyCard
          title={query ? "Nenhum resultado" : "Nenhum post encontrado"}
          description={
            query
              ? "Nada bateu com o termo buscado. Tente outra palavra-chave ou remova o filtro."
              : "Crie um tópico editorial e gere o primeiro post, ou aguarde o scheduler."
          }
        />
      ) : (
        <>
          <div className="lp-card-elevated overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-bg-surface-1 text-left text-xs uppercase tracking-wider text-text-secondary">
                <tr>
                  <th className="px-4 py-3 font-semibold">Título</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Data</th>
                  <th className="px-4 py-3 text-right font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((p) => {
                  const statusLabel =
                    p.status === "published"
                      ? "Publicado"
                      : p.status === "scheduled"
                        ? "Agendado"
                        : "Rascunho";
                  const statusCls =
                    p.status === "published"
                      ? "bg-success/15 text-success"
                      : p.status === "scheduled"
                        ? "bg-accent/15 text-accent"
                        : "bg-warm/15 text-warm";
                  const displayDate =
                    p.status === "scheduled"
                      ? p.scheduled_at
                      : (p.published_at ?? p.created_at);
                  return (
                    <tr
                      key={p.id}
                      className="border-b border-border/60 last:border-0 hover:bg-bg-surface-1/60"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {p.ai_generated && (
                            <Sparkles className="h-3.5 w-3.5 shrink-0 text-accent" aria-label="Gerado com IA" />
                          )}
                          <span className="font-medium text-text-primary">{p.title}</span>
                        </div>
                        {p.status === "draft" && p.review_reason && (
                          <p className="mt-1 text-xs text-warm">{p.review_reason}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${statusCls}`}
                        >
                          {p.status === "scheduled" && <CalendarClock className="h-3 w-3" />}
                          {statusLabel}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-text-secondary">
                        {displayDate
                          ? new Date(displayDate).toLocaleString("pt-BR", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {p.status === "published" ? (
                            <>
                              <a
                                href={`/post/${p.slug}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rounded p-1.5 text-text-secondary hover:bg-bg-surface-2 hover:text-text-primary"
                                aria-label={`Ver post público "${p.title}"`}
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                              <button
                                onClick={() => handleUnpublish(p.id)}
                                className="rounded p-1.5 text-text-secondary hover:bg-bg-surface-2 hover:text-text-primary"
                                aria-label={`Despublicar "${p.title}"`}
                              >
                                <EyeOff className="h-4 w-4" />
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => handlePublish(p.id)}
                              className="rounded p-1.5 text-success hover:bg-success/10"
                              aria-label={`Publicar agora "${p.title}"`}
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          )}
                          {p.status === "scheduled" && (
                            <button
                              onClick={() => handleCancelSchedule(p.id, p.title)}
                              className="rounded p-1.5 text-warm hover:bg-warm/10"
                              aria-label={`Cancelar agendamento de "${p.title}"`}
                              title="Cancelar agendamento"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          )}
                          <Link
                            to="/admin/posts/$id"
                            params={{ id: p.id }}
                            className="rounded p-1.5 text-text-secondary hover:bg-bg-surface-2 hover:text-text-primary"
                            aria-label={`Editar "${p.title}"`}
                          >
                            <Edit className="h-4 w-4" />
                          </Link>
                          <button
                            onClick={() => handleRemove(p.id, p.title)}
                            className="rounded p-1.5 text-destructive hover:bg-destructive/10"
                            aria-label={`Excluir "${p.title}"`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <nav
              aria-label="Paginação"
              className="mt-4 flex items-center justify-between text-sm text-text-secondary"
            >
              <span>
                Página {currentPage} de {totalPages} — {filtered.length} resultados
              </span>
              <div className="inline-flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="inline-flex items-center gap-1 rounded-lg border border-border bg-bg-elevated px-3 py-1.5 text-sm disabled:opacity-40 hover:bg-bg-surface-2"
                  aria-label="Página anterior"
                >
                  <ChevronLeft className="h-4 w-4" /> Anterior
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="inline-flex items-center gap-1 rounded-lg border border-border bg-bg-elevated px-3 py-1.5 text-sm disabled:opacity-40 hover:bg-bg-surface-2"
                  aria-label="Próxima página"
                >
                  Próxima <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
