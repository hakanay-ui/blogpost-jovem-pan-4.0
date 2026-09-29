import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Save, Loader2, CalendarClock } from "lucide-react";
import { toast } from "sonner";
import { MarkdownEditor } from "@/components/blog/MarkdownEditor";
import { CoverUploader } from "@/components/blog/CoverUploader";
import { TagsSelector, type TagOption } from "@/components/blog/TagsSelector";
import { RevisionsDrawer } from "@/components/blog/RevisionsDrawer";
import { usePostTags, syncPostTags } from "@/hooks/queries/useTags";
import { usePost, useSavePost, usePostMutations } from "@/hooks/queries/usePosts";
import { LoadingCard } from "@/components/ui/state-card";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/admin/posts/$id")({
  component: EditPost,
});

const inputCls =
  "w-full rounded-lg border border-input bg-bg-elevated px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30";

function toLocalDatetimeInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalDatetimeInput(v: string): string | null {
  if (!v) return null;
  const d = new Date(v);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

function EditPost() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: fetchedPost, isLoading, error, isError } = usePost(id);
  const savePost = useSavePost();
  const { cancelSchedule } = usePostMutations();
  const [draft, setDraft] = useState<any>(null);
  const [tags, setTags] = useState<TagOption[]>([]);
  const { data: currentTags } = usePostTags(id);

  // Inicializa o draft assim que o post chega (apenas uma vez)
  useEffect(() => {
    if (fetchedPost && !draft) setDraft(fetchedPost);
  }, [fetchedPost, draft]);

  useEffect(() => {
    if (currentTags) setTags(currentTags);
  }, [currentTags]);

  if (isError) {
    return (
      <div className="max-w-4xl p-8">
        <button
          onClick={() => navigate({ to: "/admin/posts" })}
          className="mb-4 inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>
        <div className="lp-card-elevated p-6">
          <h2 className="text-lg font-semibold text-text-primary">Falha ao carregar post</h2>
          <p className="mt-2 text-sm text-text-secondary">{(error as any)?.message ?? "Erro desconhecido"}</p>
        </div>
      </div>
    );
  }

  if (isLoading || !fetchedPost) {
    if (!isLoading && !fetchedPost) {
      return (
        <div className="max-w-4xl p-8">
          <button
            onClick={() => navigate({ to: "/admin/posts" })}
            className="mb-4 inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary"
          >
            <ArrowLeft className="h-4 w-4" /> Voltar
          </button>
          <div className="lp-card-elevated p-6">
            <h2 className="text-lg font-semibold text-text-primary">Post não encontrado</h2>
          </div>
        </div>
      );
    }
    return <LoadingCard title="Carregando post…" />;
  }

  // Usa o draft (com edições) ou o post recém-chegado como fallback imediato
  const post = draft ?? fetchedPost;
  const update = (patch: any) => setDraft({ ...post, ...patch });

  const save = async (): Promise<boolean> => {
    if (!post.title?.trim() || post.title.trim().length < 3) {
      toast.error("Título precisa ter pelo menos 3 caracteres");
      return false;
    }
    if (!post.slug?.trim() || post.slug.trim().length < 3) {
      toast.error("Slug precisa ter pelo menos 3 caracteres");
      return false;
    }
    try {
      await savePost.mutateAsync({
        id,
        patch: {
          title: post.title,
          slug: post.slug,
          excerpt: post.excerpt,
          content: post.content,
          meta_title: post.meta_title,
          meta_description: post.meta_description,
          cover_image_url: post.cover_image_url,
          scheduled_at: post.scheduled_at,
        },
      });
      await syncPostTags(id, tags);
      qc.invalidateQueries({ queryKey: ["post_tags", id] });
      toast.success("Alterações salvas");
      return true;
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao salvar");
      return false;
    }
  };

  const publish = async () => {
    if (!(await save())) return;
    const { error } = await supabase
      .from("posts")
      .update({ status: "published", published_at: new Date().toISOString(), scheduled_at: null })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Post publicado");
    navigate({ to: "/admin/posts" });
  };

  const schedule = async () => {
    if (!post.scheduled_at) {
      toast.error("Defina uma data/hora antes de agendar");
      return;
    }
    if (!(await save())) return;
    const { error } = await supabase
      .from("posts")
      .update({ status: "scheduled" })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Post agendado");
    navigate({ to: "/admin/posts" });
  };

  const statusLabel =
    post.status === "published"
      ? "Publicado"
      : post.status === "scheduled"
        ? "Agendado"
        : "Rascunho";
  const statusCls =
    post.status === "published"
      ? "bg-success/15 text-success"
      : post.status === "scheduled"
        ? "bg-accent/15 text-accent"
        : "bg-warm/15 text-warm";

  const handleCancelSchedule = async () => {
    cancelSchedule.mutate(id, {
      onSuccess: () => {
        toast.success("Agendamento cancelado");
        setDraft({ ...post, status: "draft", scheduled_at: null });
      },
      onError: (e: any) => toast.error(e.message),
    });
  };

  return (
    <div className="max-w-4xl p-8 lg:p-10">
      <button
        onClick={() => navigate({ to: "/admin/posts" })}
        className="mb-4 inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar
      </button>
      <div className="mb-6 flex items-center gap-3">
        <h1 className="text-3xl font-bold tracking-tight text-text-primary">Editar post</h1>
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusCls}`}>
          {statusLabel}
        </span>
      </div>

      <div className="lp-card-elevated space-y-5 p-6">
        <div>
          <label className="mb-1 block text-sm font-medium text-text-primary">Título</label>
          <input
            value={post.title ?? ""}
            onChange={(e) => update({ title: e.target.value })}
            className={inputCls}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-text-primary">Slug</label>
          <input
            value={post.slug ?? ""}
            onChange={(e) => update({ slug: e.target.value })}
            className={inputCls}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-text-primary">Imagem de capa</label>
          <CoverUploader
            value={post.cover_image_url ?? null}
            onChange={(url) => update({ cover_image_url: url })}
            pathPrefix={id}
            postContext={{ title: post.title, excerpt: post.excerpt }}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-text-primary">Tags</label>
          <TagsSelector value={tags} onChange={setTags} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-text-primary">Resumo</label>
          <textarea
            value={post.excerpt ?? ""}
            onChange={(e) => update({ excerpt: e.target.value })}
            rows={2}
            className={inputCls}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-text-primary">
            Conteúdo (markdown)
          </label>
          <MarkdownEditor
            value={post.content ?? ""}
            onChange={(content) => update({ content })}
            rows={22}
            placeholder="Escreva em markdown... toolbar acima, preview ao lado."
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-text-primary">SEO Title</label>
            <input
              value={post.meta_title ?? ""}
              onChange={(e) => update({ meta_title: e.target.value })}
              className={inputCls}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-text-primary">
              SEO Description
            </label>
            <input
              value={post.meta_description ?? ""}
              onChange={(e) => update({ meta_description: e.target.value })}
              className={inputCls}
            />
          </div>
        </div>
        <div className="rounded-lg border border-border bg-bg-surface-1 p-4">
          <label className="flex items-center gap-2 text-sm font-medium text-text-primary">
            <CalendarClock className="h-4 w-4 text-accent" /> Agendar publicação
          </label>
          <p className="mt-1 text-xs text-text-tertiary">
            Preenchendo a data e clicando em "Agendar", o post vai para status=scheduled e o
            scheduler publica automaticamente na hora devida.
          </p>
          <input
            type="datetime-local"
            value={toLocalDatetimeInput(post.scheduled_at)}
            onChange={(e) => update({ scheduled_at: fromLocalDatetimeInput(e.target.value) })}
            className={`${inputCls} mt-2 max-w-xs`}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button onClick={save} disabled={savePost.isPending} className="lp-btn-secondary">
            {savePost.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}{" "}
            {post.status === "draft" ? "Salvar rascunho" : "Salvar alterações"}
          </button>
          {post.status === "scheduled" && (
            <button
              onClick={handleCancelSchedule}
              disabled={cancelSchedule.isPending}
              className="lp-btn-secondary"
            >
              Cancelar agendamento
            </button>
          )}
          {post.scheduled_at && post.status !== "published" && post.status !== "scheduled" && (
            <button onClick={schedule} className="lp-btn-secondary">
              <CalendarClock className="h-4 w-4" /> Agendar
            </button>
          )}
          {post.status !== "published" && (
            <button onClick={publish} className="lp-btn-primary-indigo">
              Publicar agora
            </button>
          )}
          <div className="ml-auto">
            <RevisionsDrawer postId={id} />
          </div>
        </div>
      </div>
    </div>
  );
}
