import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, SkipForward, Sparkles } from "lucide-react";
import {
  ONBOARDING_STEPS,
  useOnboarding,
  useUpdateOnboarding,
  type OnboardingState,
  type StepId,
} from "@/hooks/queries/useOnboarding";
import { StepIdentity } from "@/components/onboarding/StepIdentity";
import { StepAI } from "@/components/onboarding/StepAI";
import { StepEditorial } from "@/components/onboarding/StepEditorial";
import { StepProfile } from "@/components/onboarding/StepProfile";
import type { StepProps } from "@/components/onboarding/shared";

export const Route = createFileRoute("/admin/onboarding")({
  component: OnboardingPage,
});

const STEP_COMPONENTS: Record<StepId, (p: StepProps) => React.ReactElement> = {
  identity: StepIdentity,
  ai: StepAI,
  editorial: StepEditorial,
  profile: StepProfile,
};

const LAST_INDEX = ONBOARDING_STEPS.length - 1;

function OnboardingPage() {
  const navigate = useNavigate();
  const { data: state, isLoading } = useOnboarding();
  const updateState = useUpdateOnboarding();

  // O índice visível é local para a navegação ficar instantânea; o estado
  // persistido é a fonte da verdade ao (re)abrir a tela.
  const [index, setIndex] = useState<number | null>(null);

  useEffect(() => {
    if (state && index === null) setIndex(state.current_step);
  }, [state, index]);

  if (isLoading || !state || index === null) {
    return <div className="p-8 text-text-secondary">Carregando…</div>;
  }

  const persist = (patch: Partial<OnboardingState>) =>
    updateState.mutateAsync({ ...state, ...patch }).catch((e: unknown) => {
      toast.error(
        e instanceof Error ? e.message : "Não foi possível salvar seu progresso.",
      );
    });

  const finish = async (next: OnboardingState) => {
    await persist({ ...next, completed: true, current_step: 0 });
    toast.success("Configuração concluída!");
    navigate({ to: "/admin" });
  };

  const advance = async (id: StepId, outcome: "done" | "skipped") => {
    // Uma etapa só pode estar em uma das listas: refazer o onboarding e agora
    // preencher algo que foi pulado antes precisa limpar o "skipped".
    const next: OnboardingState = {
      ...state,
      done:
        outcome === "done"
          ? [...new Set([...state.done, id])]
          : state.done.filter((s) => s !== id),
      skipped:
        outcome === "skipped"
          ? [...new Set([...state.skipped, id])]
          : state.skipped.filter((s) => s !== id),
      current_step: Math.min(index + 1, LAST_INDEX),
    };

    if (index === LAST_INDEX) {
      await finish(next);
      return;
    }
    setIndex(index + 1);
    await persist(next);
  };

  const goBack = async () => {
    const prev = Math.max(index - 1, 0);
    setIndex(prev);
    await persist({ current_step: prev });
  };

  const step = ONBOARDING_STEPS[index];
  const StepComponent = STEP_COMPONENTS[step.id];

  return (
    <div className="mx-auto max-w-5xl p-8 lg:p-10">
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-accent">
          Primeiros passos
        </p>
        <h1 className="mt-1 flex items-center gap-2 text-3xl font-bold tracking-tight text-text-primary">
          <Sparkles className="h-6 w-6 text-accent" />
          Vamos configurar seu blog
        </h1>
        <p className="mt-1 text-text-secondary">
          Quatro etapas rápidas. Tudo é salvo conforme você avança — pode fechar e voltar
          quando quiser, ou pular o que não souber agora.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
        <nav aria-label="Etapas do onboarding" className="space-y-1">
          {ONBOARDING_STEPS.map((s, i) => {
            const isDone = state.done.includes(s.id);
            const isSkipped = state.skipped.includes(s.id);
            const isCurrent = i === index;
            return (
              <button
                key={s.id}
                onClick={() => setIndex(i)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                  isCurrent ? "bg-accent/10 text-text-primary" : "hover:bg-bg-surface-2"
                }`}
                aria-current={isCurrent ? "step" : undefined}
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                    isDone
                      ? "bg-emerald-500/15 text-emerald-500"
                      : isSkipped
                        ? "bg-amber-500/15 text-amber-500"
                        : isCurrent
                          ? "bg-accent text-accent-foreground"
                          : "bg-bg-surface-2 text-text-tertiary"
                  }`}
                >
                  {isDone ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : isSkipped ? (
                    <SkipForward className="h-3 w-3" />
                  ) : (
                    i + 1
                  )}
                </span>
                <span
                  className={`text-sm ${
                    isCurrent ? "font-semibold text-text-primary" : "text-text-secondary"
                  }`}
                >
                  {s.label}
                </span>
              </button>
            );
          })}

          <p className="px-3 pt-3 text-xs text-text-tertiary">
            {state.done.length} de {ONBOARDING_STEPS.length} concluídas
          </p>
        </nav>

        <section className="lp-card-elevated p-6">
          <header className="mb-6">
            <h2 className="text-lg font-semibold text-text-primary">{step.label}</h2>
            <p className="text-sm text-text-secondary">{step.description}</p>
          </header>

          {/* key força o remount ao trocar de etapa: cada step reidrata do zero. */}
          <StepComponent
            key={step.id}
            onDone={() => void advance(step.id, "done")}
            onSkip={() => void advance(step.id, "skipped")}
            onBack={() => void goBack()}
            isFirst={index === 0}
            isLast={index === LAST_INDEX}
          />
        </section>
      </div>
    </div>
  );
}
