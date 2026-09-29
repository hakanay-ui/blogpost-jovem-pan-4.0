import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useTopics, useTopicMutations } from "@/hooks/queries/useTopics";
import { Field, StepFooter, inputCls, type StepProps } from "./shared";

export function StepEditorial({ onDone, onSkip, onBack, isFirst, isLast }: StepProps) {
  const { data: topics = [], isLoading } = useTopics();
  const { create, update } = useTopicMutations();

  // Se já existe um tema, o onboarding edita o primeiro em vez de criar um
  // duplicado a cada refazimento.
  const existing = topics[0];

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [keywords, setKeywords] = useState("");
  const [frequencyHours, setFrequencyHours] = useState(24);
  const [publishMode, setPublishMode] = useState<"auto" | "review">("review");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!existing) return;
    setName(existing.name);
    setDescription(existing.description ?? "");
    setKeywords(existing.keywords.join(", "));
    setFrequencyHours(existing.frequency_hours);
    setPublishMode(existing.publish_mode);
  }, [existing]);

  const save = async () => {
    if (!name.trim()) {
      toast.error("Dê um nome ao tema para continuar (ou pule esta etapa).");
      return;
    }
    const parsedKeywords = keywords
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);

    setSaving(true);
    try {
      const patch = {
        name: name.trim(),
        description: description.trim() || null,
        keywords: parsedKeywords,
        publish_mode: publishMode,
        frequency_hours: frequencyHours,
      };
      if (existing) {
        await update.mutateAsync({ id: existing.id, patch });
      } else {
        await create.mutateAsync({
          ...patch,
          active: true,
          schedule_mode: "interval",
          daily_run_hour: 9,
          max_posts_per_day: 1,
        });
      }
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao salvar o tema");
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <div className="text-text-secondary">Carregando…</div>;

  return (
    <div className="space-y-5">
      <Field label="Nome do tema">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputCls}
          placeholder="Ex: Inteligência artificial aplicada a negócios"
        />
      </Field>

      <Field
        label="Tom, ângulo e público-alvo"
        hint="É esta descrição que orienta a IA na hora de escrever. Quanto mais específica, melhor."
      >
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={`${inputCls} min-h-28 resize-y`}
          placeholder="Ex: Tom analítico e direto, sem hype. Público: fundadores e gestores de produto que precisam decidir onde investir em IA. Sempre trazer implicações práticas de custo e prazo."
        />
      </Field>

      <Field label="Palavras-chave" hint="Separe por vírgula.">
        <input
          value={keywords}
          onChange={(e) => setKeywords(e.target.value)}
          className={inputCls}
          placeholder="LLM, automação, produtividade"
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Frequência de geração">
          <select
            value={frequencyHours}
            onChange={(e) => setFrequencyHours(Number(e.target.value))}
            className={inputCls}
          >
            <option value={6}>A cada 6 horas</option>
            <option value={12}>A cada 12 horas</option>
            <option value={24}>Uma vez por dia</option>
            <option value={72}>A cada 3 dias</option>
            <option value={168}>Uma vez por semana</option>
          </select>
        </Field>

        <Field
          label="Modo de publicação"
          hint="Você pode mudar depois em Linha editorial."
        >
          <select
            value={publishMode}
            onChange={(e) => setPublishMode(e.target.value as "auto" | "review")}
            className={inputCls}
          >
            <option value="review">Revisar antes de publicar</option>
            <option value="auto">Publicar automaticamente</option>
          </select>
        </Field>
      </div>

      <StepFooter
        saving={saving}
        onSave={save}
        onSkip={onSkip}
        onBack={onBack}
        isFirst={isFirst}
        isLast={isLast}
      />
    </div>
  );
}
