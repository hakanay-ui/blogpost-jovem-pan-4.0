import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";

export const inputCls =
  "w-full rounded-lg border border-input bg-bg-elevated px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30";

/**
 * Props que toda etapa do wizard recebe. A etapa é dona do próprio "salvar":
 * ela grava no destino definitivo (project_config / editorial_topics / profiles)
 * e só então chama onDone() para avançar.
 */
export type StepProps = {
  onDone: () => void;
  onSkip: () => void;
  onBack: () => void;
  isFirst: boolean;
  isLast: boolean;
};

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-text-primary">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-text-tertiary">{hint}</p>}
    </div>
  );
}

export function StepFooter({
  saving,
  onSave,
  onSkip,
  onBack,
  isFirst,
  isLast,
  saveLabel,
}: {
  saving: boolean;
  onSave: () => void;
  onSkip: () => void;
  onBack: () => void;
  isFirst: boolean;
  isLast: boolean;
  saveLabel?: string;
}) {
  return (
    <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-border-subtle pt-6">
      {!isFirst && (
        <button onClick={onBack} disabled={saving} className="lp-btn-secondary">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>
      )}

      <button onClick={onSave} disabled={saving} className="lp-btn-primary-indigo">
        {saving ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isLast ? (
          <Check className="h-4 w-4" />
        ) : (
          <ArrowRight className="h-4 w-4" />
        )}
        {saveLabel ?? (isLast ? "Salvar e concluir" : "Salvar e continuar")}
      </button>

      <button
        onClick={onSkip}
        disabled={saving}
        className="ml-auto text-sm text-text-tertiary underline-offset-4 hover:text-text-secondary hover:underline"
      >
        Pular por enquanto
      </button>
    </div>
  );
}
