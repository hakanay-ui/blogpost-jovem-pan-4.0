import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Sparkles, FilePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { useCreatePost } from "@/hooks/queries/usePosts";

type Mode = "choose" | "manual";

type Props = {
  open: boolean;
  onClose: () => void;
};

const inputCls =
  "w-full rounded-lg border border-input bg-bg-elevated px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30";

export function NewPostDialog({ open, onClose }: Props) {
  const navigate = useNavigate();
  const createPost = useCreatePost();
  const [mode, setMode] = useState<Mode>("choose");
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");

  if (!open) return null;

  const reset = () => {
    setMode("choose");
    setTitle("");
    setSlug("");
    setExcerpt("");
  };

  const handleClose = () => {
    if (createPost.isPending) return;
    reset();
    onClose();
  };

  const handleAI = () => {
    handleClose();
    navigate({ to: "/admin/generate" });
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim().length < 3) {
      toast.error("Informe um título com pelo menos 3 caracteres");
      return;
    }
    createPost.mutate(
      { title, slug, excerpt },
      {
        onSuccess: (id) => {
          toast.success("Rascunho criado — adicione capa e conteúdo");
          reset();
          onClose();
          navigate({ to: "/admin/posts/$id", params: { id } });
        },
        onError: (e: any) => toast.error(e.message ?? "Falha ao criar post"),
      },
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-post-title"
    >
      <div
        className="lp-card-elevated w-full max-w-lg p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 id="new-post-title" className="text-xl font-bold text-text-primary">
              {mode === "choose" ? "Novo post" : "Criar manualmente"}
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              {mode === "choose"
                ? "Escolha como quer começar"
                : "Preencha os campos básicos. Capa e conteúdo na próxima tela."}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="rounded p-1 text-text-secondary hover:bg-bg-surface-2 hover:text-text-primary"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {mode === "choose" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              onClick={handleAI}
              className="group flex flex-col items-start gap-2 rounded-xl border border-border bg-bg-surface-1 p-4 text-left transition-all hover:border-accent hover:bg-accent/5"
            >
              <div className="rounded-lg bg-accent/15 p-2 text-accent">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-text-primary">Gerar com IA</h3>
                <p className="mt-1 text-xs text-text-secondary">
                  A IA escreve título, conteúdo e capa a partir de um tema.
                </p>
              </div>
            </button>
            <button
              onClick={() => setMode("manual")}
              className="group flex flex-col items-start gap-2 rounded-xl border border-border bg-bg-surface-1 p-4 text-left transition-all hover:border-accent hover:bg-accent/5"
            >
              <div className="rounded-lg bg-warm/15 p-2 text-warm">
                <FilePlus className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-text-primary">Criar manualmente</h3>
                <p className="mt-1 text-xs text-text-secondary">
                  Você escreve tudo: título, conteúdo, capa e SEO.
                </p>
              </div>
            </button>
          </div>
        ) : (
          <form onSubmit={handleManualSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-text-primary">
                Título <span className="text-destructive">*</span>
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={inputCls}
                placeholder="Ex.: As novidades do framework X"
                autoFocus
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-primary">
                Slug{" "}
                <span className="text-xs font-normal text-text-tertiary">
                  (opcional — gerado do título)
                </span>
              </label>
              <input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className={inputCls}
                placeholder="novidades-framework-x"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-text-primary">
                Resumo <span className="text-xs font-normal text-text-tertiary">(opcional)</span>
              </label>
              <textarea
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                rows={2}
                className={inputCls}
                placeholder="Uma frase descrevendo o post"
              />
            </div>
            <p className="text-xs text-text-tertiary">
              Capa, conteúdo e SEO ficam disponíveis na próxima tela.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setMode("choose")}
                disabled={createPost.isPending}
                className="lp-btn-secondary"
              >
                Voltar
              </button>
              <button
                type="submit"
                disabled={createPost.isPending}
                className="lp-btn-primary-indigo"
              >
                {createPost.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FilePlus className="h-4 w-4" />
                )}
                Criar e continuar
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
