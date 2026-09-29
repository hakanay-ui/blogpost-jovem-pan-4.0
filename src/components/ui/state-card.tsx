import { AlertCircle, Inbox, Loader2 } from "lucide-react";
import type { ReactNode } from "react";

type Props = {
  title: string;
  description?: string;
  action?: ReactNode;
};

export function LoadingCard({ title = "Carregando…", description }: Partial<Props>) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="lp-card-elevated flex flex-col items-center justify-center gap-3 p-12 text-center"
    >
      <Loader2 className="h-6 w-6 animate-spin text-accent" />
      <div>
        <p className="font-medium text-text-primary">{title}</p>
        {description && <p className="mt-1 text-sm text-text-secondary">{description}</p>}
      </div>
    </div>
  );
}

export function EmptyCard({ title, description, action }: Props) {
  return (
    <div className="lp-card-elevated flex flex-col items-center justify-center gap-3 p-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-bg-surface-2 text-text-secondary">
        <Inbox className="h-5 w-5" />
      </div>
      <div>
        <p className="font-semibold text-text-primary">{title}</p>
        {description && <p className="mt-1 text-sm text-text-secondary">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function ErrorCard({ title = "Algo deu errado", description, action }: Partial<Props>) {
  return (
    <div
      role="alert"
      className="lp-card-elevated flex flex-col items-center justify-center gap-3 p-12 text-center"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertCircle className="h-5 w-5" />
      </div>
      <div>
        <p className="font-semibold text-text-primary">{title}</p>
        {description && <p className="mt-1 text-sm text-text-secondary">{description}</p>}
      </div>
      {action}
    </div>
  );
}
