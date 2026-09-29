import { useState } from "react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, ExternalLink, Eye, EyeOff, KeyRound, Loader2, Zap } from "lucide-react";
import { getIntegrationsStatus, saveIntegrationKey } from "@/utils/integrations.functions";
import { authHeaders } from "@/lib/server-fn-auth";
import { StepFooter, type StepProps } from "./shared";

type ServiceInfo = {
  id: string;
  name: string;
  description: string;
  configured: boolean;
  source: "db" | "env" | "platform" | "none";
  lastFour: string | null;
  managed?: "platform" | "connector";
};

const PROVIDER_DOCS: Record<string, string> = {
  openai: "https://platform.openai.com/api-keys",
  anthropic: "https://console.anthropic.com/settings/keys",
  perplexity: "https://www.perplexity.ai/settings/api",
};

export function StepAI({ onDone, onSkip, onBack, isFirst, isLast }: StepProps) {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["integrations-status"],
    queryFn: async () => getIntegrationsStatus({ headers: await authHeaders() }),
  });

  // Uma chave por provedor, digitada nesta tela. Só as preenchidas são salvas —
  // campos vazios não apagam chaves já existentes.
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  const services = ((data?.services ?? []) as ServiceInfo[]).filter((s) => !s.managed);
  const managed = ((data?.services ?? []) as ServiceInfo[]).filter((s) => s.managed);

  const save = async () => {
    const toSave = Object.entries(keys).filter(([, v]) => v.trim().length >= 10);
    setSaving(true);
    try {
      for (const [serviceId, apiKey] of toSave) {
        await saveIntegrationKey({
          data: { serviceId: serviceId as never, apiKey: apiKey.trim() },
          headers: await authHeaders(),
        });
      }
      if (toSave.length > 0) {
        toast.success(
          toSave.length === 1 ? "Chave salva." : `${toSave.length} chaves salvas.`,
        );
        setKeys({});
        await refetch();
      }
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao salvar a chave");
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <div className="text-text-secondary">Carregando…</div>;

  return (
    <div className="space-y-4">
      {managed.length > 0 && (
        <div className="flex gap-3 rounded-lg border border-accent/20 bg-accent/5 p-4">
          <Zap className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
          <div className="text-sm text-text-secondary">
            <strong className="text-text-primary">Você já pode gerar posts sem configurar nada.</strong>{" "}
            O Lovable AI vem incluído na plataforma. As chaves abaixo são opcionais — use se
            preferir seus próprios provedores ou se quiser pesquisa externa em tempo real
            (Perplexity).
          </div>
        </div>
      )}

      {services.map((s) => (
        <div key={s.id} className="lp-card-elevated space-y-3 p-4">
          <div className="flex items-start gap-3">
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                s.configured
                  ? "bg-emerald-500/10 text-emerald-500"
                  : "bg-bg-surface-2 text-text-tertiary"
              }`}
            >
              {s.configured ? <CheckCircle2 className="h-4 w-4" /> : <KeyRound className="h-4 w-4" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-text-primary">{s.name}</span>
                {s.configured && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-500">
                    Configurada · ...{s.lastFour}
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-text-secondary">{s.description}</p>
            </div>
          </div>

          <div className="relative">
            <input
              type={visible[s.id] ? "text" : "password"}
              value={keys[s.id] ?? ""}
              onChange={(e) => setKeys((k) => ({ ...k, [s.id]: e.target.value }))}
              placeholder={
                s.configured ? `Substituir chave atual (...${s.lastFour})` : "Cole sua chave de API"
              }
              className="w-full rounded-lg border border-border-default bg-bg-surface-1 px-3 py-2 pr-9 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none"
              autoComplete="off"
              spellCheck={false}
            />
            <button
              type="button"
              onClick={() => setVisible((v) => ({ ...v, [s.id]: !v[s.id] }))}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary"
              tabIndex={-1}
            >
              {visible[s.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {PROVIDER_DOCS[s.id] && (
            <a
              href={PROVIDER_DOCS[s.id]}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-accent hover:underline"
            >
              <ExternalLink className="h-3 w-3" />
              Onde obter a chave de {s.name}?
            </a>
          )}
        </div>
      ))}

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
