import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const ONBOARDING_STEPS = [
  {
    id: "identity",
    label: "Identidade do blog",
    description: "Nome, endereço e marca. É o que aparece para o leitor.",
  },
  {
    id: "ai",
    label: "Chaves de IA",
    description: "Provedores usados para pesquisar e escrever os posts.",
  },
  {
    id: "editorial",
    label: "Linha editorial",
    description: "Sobre o que o blog escreve, com que tom e com que frequência.",
  },
  {
    id: "profile",
    label: "Seu perfil",
    description: "Como você assina os posts publicados.",
  },
] as const;

export type StepId = (typeof ONBOARDING_STEPS)[number]["id"];

export type OnboardingState = {
  completed: boolean;
  current_step: number;
  done: StepId[];
  skipped: StepId[];
};

export const EMPTY_ONBOARDING: OnboardingState = {
  completed: false,
  current_step: 0,
  done: [],
  skipped: [],
};

const STEP_IDS = ONBOARDING_STEPS.map((s) => s.id) as readonly string[];

/**
 * A coluna é jsonb livre — nunca confie no formato. Contas novas trazem `{}`
 * (default da migration), então tudo aqui precisa degradar para EMPTY_ONBOARDING.
 */
export function parseOnboarding(raw: unknown): OnboardingState {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return EMPTY_ONBOARDING;
  const o = raw as Record<string, unknown>;
  const ids = (v: unknown): StepId[] =>
    Array.isArray(v) ? (v.filter((x) => typeof x === "string" && STEP_IDS.includes(x)) as StepId[]) : [];
  const step = typeof o.current_step === "number" ? o.current_step : 0;
  return {
    completed: o.completed === true,
    current_step: Math.min(Math.max(step, 0), ONBOARDING_STEPS.length - 1),
    done: ids(o.done),
    skipped: ids(o.skipped),
  };
}

/** Etapas que o usuário ainda não resolveu — puladas contam como pendentes. */
export function pendingSteps(state: OnboardingState) {
  return ONBOARDING_STEPS.filter((s) => !state.done.includes(s.id));
}

export function useOnboarding() {
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: ["onboarding", userId],
    enabled: !!userId,
    queryFn: async (): Promise<OnboardingState> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("onboarding")
        .eq("id", userId!)
        .maybeSingle();
      if (error) throw error;
      return parseOnboarding(data?.onboarding);
    },
  });
}

export function useUpdateOnboarding() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id;

  return useMutation({
    mutationFn: async (next: OnboardingState) => {
      if (!userId) throw new Error("Não autenticado");
      const { error } = await supabase
        .from("profiles")
        .update({ onboarding: next, updated_at: new Date().toISOString() })
        .eq("id", userId);
      if (error) throw error;
      return next;
    },
    // Optimistic: o wizard navega entre etapas na hora, sem esperar o round-trip.
    onMutate: async (next) => {
      await qc.cancelQueries({ queryKey: ["onboarding", userId] });
      const previous = qc.getQueryData<OnboardingState>(["onboarding", userId]);
      qc.setQueryData(["onboarding", userId], next);
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(["onboarding", userId], ctx.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["onboarding", userId] }),
  });
}
