import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Play, Power } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCategories } from "@/hooks/queries/useNews";
import { useProjectConfig, useUpdateConfig } from "@/hooks/queries/useProjectConfig";
import { LoadingCard } from "@/components/ui/state-card";

export const Route = createFileRoute("/admin/grade")({
  component: SchedulePage,
});

type Slot = {
  id: string;
  day_type: "weekday" | "weekend";
  slot_time: string;
  topic_slugs: string[];
  focus: string | null;
  strongest_of_day: boolean;
  active: boolean;
  last_run_on: string | null;
};

function useSlots() {
  return useQuery({
    queryKey: ["schedule_slots"],
    queryFn: async (): Promise<Slot[]> => {
      const { data, error } = await supabase
        .from("schedule_slots")
        .select(
          "id, day_type, slot_time, topic_slugs, focus, strongest_of_day, active, last_run_on",
        )
        .order("slot_time");
      if (error) throw error;
      return (data ?? []) as Slot[];
    },
  });
}

function SchedulePage() {
  const { data: slots = [], isLoading } = useSlots();
  const { data: categories = [] } = useCategories();
  const { data: cfg } = useProjectConfig();
  const updateConfig = useUpdateConfig();
  const qc = useQueryClient();
  const [running, setRunning] = useState<string | null>(null);

  const engineOn = cfg?.editorial_engine_enabled === "true";
  const nameOf = (slug: string) => categories.find((c) => c.slug === slug)?.name ?? slug;

  const updateSlot = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Slot> }) => {
      const { error } = await supabase.from("schedule_slots").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["schedule_slots"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const runNow = async (slot: Slot) => {
    setRunning(slot.id);
    const t = toast.loading(`Gerando o post das ${slot.slot_time.slice(0, 5)}… (1 a 3 min)`);
    try {
      const { data, error } = await supabase.functions.invoke("editorial-slot", {
        body: { slotId: slot.id },
      });
      if (error) throw error;
      const attempts = (data?.attempts ?? []) as Array<{
        status?: string;
        reviewReason?: string | null;
        item?: string;
      }>;
      const done = attempts.find((a) => a.status);
      if (!done) toast.info(data?.reason ?? "Nenhuma pauta boa neste horário.", { id: t });
      else if (done.status === "published") toast.success(`Publicado: ${done.item}`, { id: t });
      else toast.warning(`Rascunho — ${done.reviewReason}`, { id: t });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e), { id: t });
    } finally {
      setRunning(null);
    }
  };

  const toggleCategory = (slot: Slot, slug: string) => {
    const has = slot.topic_slugs.includes(slug);
    const topic_slugs = has
      ? slot.topic_slugs.filter((s) => s !== slug)
      : [...slot.topic_slugs, slug];
    updateSlot.mutate({ id: slot.id, patch: { topic_slugs } });
  };

  const groups: Array<{ key: Slot["day_type"]; label: string }> = [
    { key: "weekday", label: "Segunda a sexta" },
    { key: "weekend", label: "Sábado e domingo" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <p className="bp-eyebrow">Motor editorial</p>
        <h1 className="mt-1 text-2xl font-bold text-text-primary">Grade de horários</h1>
        <p className="mt-1 max-w-2xl text-sm text-text-secondary">
          12 posts por dia, no horário de Goiás. Cada horário tem uma categoria prioritária; sem
          notícia boa nela, o sistema usa a melhor de outra categoria. Sem nenhuma, o post não sai.
        </p>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-border bg-bg-elevated p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold text-text-primary">
            Publicação automática {engineOn ? "ligada" : "desligada"}
          </p>
          <p className="text-sm text-text-secondary">
            {engineOn
              ? "O agendador roda a cada 15 minutos e gera o post do horário devido."
              : "Nada é gerado sozinho. Use “Gerar agora” para testar um horário."}
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            updateConfig.mutate(
              { key: "editorial_engine_enabled", value: engineOn ? "false" : "true" },
              { onSuccess: () => toast.success(engineOn ? "Motor desligado" : "Motor ligado") },
            )
          }
          className={`inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-semibold ${
            engineOn ? "border border-border text-text-primary" : "bg-accent text-white"
          }`}
        >
          <Power className="h-4 w-4" /> {engineOn ? "Desligar" : "Ligar"}
        </button>
      </div>

      {isLoading ? (
        <LoadingCard />
      ) : (
        groups.map((g) => (
          <section
            key={g.key}
            className="overflow-hidden rounded-xl border border-border bg-bg-elevated"
          >
            <h2 className="border-b border-border px-5 py-3 text-sm font-bold text-text-primary">
              {g.label}
            </h2>
            <div className="divide-y divide-border">
              {slots
                .filter((s) => s.day_type === g.key)
                .map((slot) => (
                  <div
                    key={slot.id}
                    className="flex flex-col gap-3 px-5 py-4 lg:flex-row lg:items-center"
                  >
                    <div className="flex w-40 shrink-0 items-center gap-3">
                      <input
                        type="checkbox"
                        checked={slot.active}
                        onChange={(e) =>
                          updateSlot.mutate({ id: slot.id, patch: { active: e.target.checked } })
                        }
                        aria-label={`Ativar horário ${slot.slot_time.slice(0, 5)}`}
                        className="h-4 w-4 accent-[hsl(var(--accent))]"
                      />
                      <span className="font-mono text-base font-bold text-text-primary">
                        {slot.slot_time.slice(0, 5)}
                      </span>
                    </div>
                    <div className="flex-1">
                      {slot.strongest_of_day ? (
                        <p className="text-sm font-semibold text-text-primary">
                          O assunto mais forte do dia
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {categories.map((c) => {
                            const on = slot.topic_slugs.includes(c.slug);
                            return (
                              <button
                                key={c.slug}
                                type="button"
                                onClick={() => toggleCategory(slot, c.slug)}
                                className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                                  on
                                    ? "border-accent bg-accent/10 text-accent"
                                    : "border-border text-text-tertiary hover:text-text-secondary"
                                }`}
                              >
                                {on ? `${slot.topic_slugs.indexOf(c.slug) + 1}. ` : ""}
                                {nameOf(c.slug)}
                              </button>
                            );
                          })}
                        </div>
                      )}
                      {slot.focus && !slot.strongest_of_day && (
                        <p className="mt-1.5 text-xs text-text-tertiary">Foco: {slot.focus}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3 lg:w-56 lg:justify-end">
                      {slot.last_run_on && (
                        <span className="text-xs text-text-tertiary">
                          Rodou em {slot.last_run_on.split("-").reverse().join("/")}
                        </span>
                      )}
                      <button
                        type="button"
                        disabled={running !== null}
                        onClick={() => runNow(slot)}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-semibold text-text-primary hover:border-accent hover:text-accent disabled:opacity-50"
                      >
                        {running === slot.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Play className="h-3.5 w-3.5" />
                        )}
                        Gerar agora
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
