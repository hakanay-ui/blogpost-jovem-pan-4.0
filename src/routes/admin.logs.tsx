import { createFileRoute } from "@tanstack/react-router";
import { useRuns } from "@/hooks/queries/useRuns";
import { CheckCircle2, XCircle, Loader2, Circle, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/admin/logs")({
  component: LogsPage,
});

function statusIcon(s: string) {
  switch (s) {
    case "success":
      return <CheckCircle2 className="h-4 w-4 text-success" />;
    case "error":
      return <XCircle className="h-4 w-4 text-destructive" />;
    case "running":
      return <Loader2 className="h-4 w-4 animate-spin text-accent" />;
    default:
      return <Circle className="h-4 w-4 text-text-secondary" />;
  }
}

function formatMs(ms: number | null): string {
  if (!ms) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function LogsPage() {
  const { data: runs, isLoading, refetch, isFetching } = useRuns(50);

  return (
    <div className="p-8 lg:p-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-accent">Observabilidade</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-text-primary">
            Execuções da pipeline
          </h1>
          <p className="mt-1 text-text-secondary">
            Últimas 50 execuções de scheduler, fetch-rss e generate-post
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="lp-btn-secondary"
          disabled={isFetching}
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} /> Atualizar
        </button>
      </div>

      <div className="lp-card-elevated overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-text-secondary">Carregando…</div>
        ) : !runs || runs.length === 0 ? (
          <div className="p-12 text-center text-text-secondary">
            Nenhuma execução registrada ainda.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-bg-surface-1 text-left text-xs uppercase tracking-wider text-text-secondary">
              <tr>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Tipo</th>
                <th className="px-4 py-3 font-semibold">Tema</th>
                <th className="px-4 py-3 font-semibold">Início</th>
                <th className="px-4 py-3 font-semibold">Duração</th>
                <th className="px-4 py-3 font-semibold">Detalhes</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-border/60 last:border-0 hover:bg-bg-surface-1/60"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {statusIcon(r.status)}
                      <span className="text-text-primary">{r.status}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <code className="rounded bg-bg-surface-2 px-1.5 py-0.5 text-xs text-text-primary">
                      {r.run_type}
                    </code>
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    {r.topic?.name ?? <span className="text-text-tertiary">—</span>}
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    {new Date(r.started_at).toLocaleString("pt-BR")}
                  </td>
                  <td className="px-4 py-3 text-text-secondary">{formatMs(r.duration_ms)}</td>
                  <td className="px-4 py-3 text-text-secondary">
                    {r.error_message ? (
                      <span className="text-destructive">{r.error_message}</span>
                    ) : (
                      <span className="text-xs text-text-tertiary">
                        {Object.keys(r.metadata ?? {}).length > 0
                          ? JSON.stringify(r.metadata).slice(0, 80)
                          : "—"}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
