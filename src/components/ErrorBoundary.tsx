import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw, Database, ExternalLink } from "lucide-react";

type Props = { children: ReactNode };
type State = { error: Error | null };

function isSupabaseConfigError(err: Error): boolean {
  return /Missing Supabase environment/i.test(err.message)
    || /VITE_SUPABASE/i.test(err.message);
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("[ErrorBoundary]", error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;

    if (isSupabaseConfigError(this.state.error)) {
      return <SupabaseConfigError message={this.state.error.message} />;
    }

    return (
      <div
        role="alert"
        className="flex min-h-screen items-center justify-center bg-bg-base p-6"
      >
        <div className="lp-card-elevated max-w-md p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <h1 className="mt-4 text-xl font-bold tracking-tight text-text-primary">
            Algo quebrou
          </h1>
          <p className="mt-2 text-sm text-text-secondary">
            Um erro inesperado impediu a renderização. Você pode recarregar para tentar de novo.
          </p>
          <pre className="mt-4 max-h-32 overflow-auto rounded bg-bg-surface-2 p-3 text-left text-[11px] text-text-tertiary">
            {this.state.error.message}
          </pre>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="lp-btn-primary-indigo mt-6 inline-flex"
          >
            <RefreshCw className="h-4 w-4" /> Recarregar
          </button>
        </div>
      </div>
    );
  }
}

function SupabaseConfigError({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="flex min-h-screen items-center justify-center bg-bg-base p-6"
    >
      <div className="lp-card-elevated max-w-xl p-8">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-accent">
          <Database className="h-5 w-5" />
        </div>
        <h1 className="mt-4 text-center text-xl font-bold tracking-tight text-text-primary">
          Backend Supabase não configurado
        </h1>
        <p className="mt-2 text-center text-sm text-text-secondary">
          Este blog precisa de duas variáveis de ambiente para conectar ao banco de dados. Elas
          ainda não estão disponíveis no build atual.
        </p>

        <div className="mt-6 space-y-4">
          <div className="rounded-lg border border-border bg-bg-surface-1 p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-text-secondary">
              No Lovable
            </p>
            <ol className="mt-2 space-y-1 text-sm text-text-primary">
              <li>
                1. Vá em <strong>Settings → Environment Variables</strong>
              </li>
              <li>
                2. Adicione <code className="rounded bg-bg-surface-2 px-1 text-xs">VITE_SUPABASE_URL</code>
              </li>
              <li>
                3. Adicione{" "}
                <code className="rounded bg-bg-surface-2 px-1 text-xs">
                  VITE_SUPABASE_PUBLISHABLE_KEY
                </code>{" "}
                (anon key)
              </li>
              <li>4. Clique em <strong>Republish</strong></li>
            </ol>
          </div>

          <div className="rounded-lg border border-border bg-bg-surface-1 p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-text-secondary">
              Rodando local
            </p>
            <p className="mt-2 text-sm text-text-primary">
              Crie um <code className="rounded bg-bg-surface-2 px-1 text-xs">.env.local</code> com
              as duas variáveis (copie de{" "}
              <code className="rounded bg-bg-surface-2 px-1 text-xs">.env.example</code>) e
              reinicie o dev server.
            </p>
          </div>

          <a
            href="https://supabase.com/dashboard/project/_/settings/api"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-accent hover:text-accent-hover"
          >
            Obter as chaves no Supabase Dashboard <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        <details className="mt-6">
          <summary className="cursor-pointer text-xs text-text-tertiary">
            Detalhes técnicos do erro
          </summary>
          <pre className="mt-2 max-h-32 overflow-auto rounded bg-bg-surface-2 p-3 text-[11px] text-text-tertiary">
            {message}
          </pre>
        </details>

        <button
          type="button"
          onClick={() => window.location.reload()}
          className="lp-btn-primary-indigo mt-6 inline-flex w-full justify-center"
        >
          <RefreshCw className="h-4 w-4" /> Tentar novamente
        </button>
      </div>
    </div>
  );
}
