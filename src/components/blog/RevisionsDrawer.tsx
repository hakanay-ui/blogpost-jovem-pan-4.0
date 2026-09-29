import { useState } from "react";
import { History, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { useRevisions, useRestoreRevision, type Revision } from "@/hooks/queries/useRevisions";
import { useConfirm } from "@/components/ui/confirm-dialog";

export function RevisionsDrawer({ postId }: { postId: string }) {
  const [open, setOpen] = useState(false);
  const { data: revisions = [], isLoading } = useRevisions(open ? postId : null);
  const restore = useRestoreRevision();
  const { confirm, dialog } = useConfirm();

  async function handleRestore(rev: Revision) {
    const ok = await confirm({
      title: "Restaurar versão?",
      description: `Isso vai substituir o conteúdo atual pelo snapshot de ${new Date(rev.created_at).toLocaleString("pt-BR")}. Uma nova revisão será criada do estado atual antes.`,
      confirmLabel: "Restaurar",
    });
    if (!ok) return;
    restore.mutate(rev, {
      onSuccess: () => {
        toast.success("Versão restaurada");
        setOpen(false);
      },
      onError: (e: any) => toast.error(e.message ?? "Falha ao restaurar"),
    });
  }

  return (
    <>
      {dialog}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="lp-btn-secondary"
        aria-haspopup="dialog"
      >
        <History className="h-4 w-4" /> Revisões
      </button>
      {open && (
        <div
          className="fixed inset-0 z-40 flex justify-end bg-black/40 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Histórico de revisões"
        >
          <aside className="flex h-full w-[min(92vw,420px)] flex-col border-l border-border bg-bg-elevated shadow-[var(--shadow-elevation-3)]">
            <header className="flex items-center justify-between border-b border-border p-4">
              <h2 className="text-lg font-semibold text-text-primary">Revisões</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-sm text-text-secondary hover:text-text-primary"
              >
                Fechar
              </button>
            </header>
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <p className="p-6 text-sm text-text-secondary">Carregando…</p>
              ) : revisions.length === 0 ? (
                <p className="p-6 text-sm text-text-secondary">
                  Nenhuma revisão ainda. As versões são capturadas automaticamente quando você salva
                  alterações relevantes.
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {revisions.map((r) => (
                    <li key={r.id} className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="truncate font-medium text-text-primary">{r.title}</p>
                          <p className="mt-0.5 text-xs text-text-secondary">
                            {new Date(r.created_at).toLocaleString("pt-BR")}
                          </p>
                          {r.excerpt && (
                            <p className="mt-2 line-clamp-2 text-xs text-text-tertiary">
                              {r.excerpt}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRestore(r)}
                          disabled={restore.isPending}
                          className="shrink-0 rounded-lg border border-border px-2 py-1 text-xs font-medium text-text-primary hover:border-accent hover:text-accent"
                          aria-label={`Restaurar versão de ${new Date(r.created_at).toLocaleString("pt-BR")}`}
                        >
                          <RotateCcw className="inline h-3 w-3" /> Restaurar
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
