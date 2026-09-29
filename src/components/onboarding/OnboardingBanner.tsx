import { Link } from "@tanstack/react-router";
import { ArrowRight, ListChecks } from "lucide-react";
import { ONBOARDING_STEPS, pendingSteps, useOnboarding } from "@/hooks/queries/useOnboarding";

/**
 * Aviso não-bloqueante no dashboard quando o usuário pulou etapas do
 * onboarding. Some sozinho quando todas as etapas estiverem concluídas.
 */
export function OnboardingBanner() {
  const { data: state } = useOnboarding();
  if (!state?.completed) return null;

  const pending = pendingSteps(state);
  if (pending.length === 0) return null;

  return (
    <div className="mb-8 flex flex-wrap items-center gap-4 rounded-xl border border-amber-500/25 bg-amber-500/5 p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
        <ListChecks className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-text-primary">
          {pending.length === 1
            ? "Falta 1 etapa de configuração"
            : `Faltam ${pending.length} etapas de configuração`}{" "}
          <span className="font-normal text-text-tertiary">
            ({state.done.length} de {ONBOARDING_STEPS.length} concluídas)
          </span>
        </p>
        <p className="mt-0.5 text-xs text-text-secondary">
          {pending.map((s) => s.label).join(" · ")}
        </p>
      </div>
      <Link
        to="/admin/onboarding"
        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-amber-500/30 px-3 py-1.5 text-xs font-medium text-amber-600 transition-colors hover:bg-amber-500/10 dark:text-amber-400"
      >
        Continuar <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}
