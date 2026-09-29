import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Loader2,
  Plug,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Zap,
  RefreshCw,
  Info,
  KeyRound,
  Eye,
  EyeOff,
  Save,
  Trash2,
  Cpu,
} from "lucide-react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getIntegrationsStatus,
  testIntegrationConnection,
  saveIntegrationKey,
  clearIntegrationKey,
  setDefaultModel,
} from "@/utils/integrations.functions";
import { authHeaders } from "@/lib/server-fn-auth";

export const Route = createFileRoute("/admin/integrations")({
  component: IntegrationsPage,
});

function IntegrationsPage() {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <IntegrationsPanel />
    </ProtectedRoute>
  );
}

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

const MODELS_BY_PROVIDER: Record<string, { value: string; label: string }[]> = {
  lovable_ai: [
    { value: "google/gemini-3-flash-preview", label: "Gemini 3 Flash (rápido)" },
    { value: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro (top)" },
    { value: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash" },
    { value: "openai/gpt-5", label: "GPT-5" },
    { value: "openai/gpt-5-mini", label: "GPT-5 Mini" },
  ],
  openai: [
    { value: "gpt-5", label: "GPT-5" },
    { value: "gpt-5-mini", label: "GPT-5 Mini" },
    { value: "gpt-5-nano", label: "GPT-5 Nano" },
  ],
  anthropic: [
    { value: "claude-sonnet-4-5", label: "Claude Sonnet 4.5" },
    { value: "claude-haiku-4-5", label: "Claude Haiku 4.5" },
  ],
};

function IntegrationsPanel() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["integrations-status"],
    queryFn: async () => getIntegrationsStatus({ headers: await authHeaders() }),
  });

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-12">
        <Loader2 className="h-5 w-5 animate-spin text-text-secondary" />
      </div>
    );
  }

  const services = (data?.services ?? []) as ServiceInfo[];
  const managed = services.filter((s) => s.managed);
  const custom = services.filter((s) => !s.managed);

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-8">
      <header className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
          <Plug className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            Integrações
          </h1>
          <p className="text-sm text-text-secondary">
            Configure chaves de API e o modelo padrão de geração.
          </p>
        </div>
      </header>

      {/* Default model selector */}
      <DefaultModelSection
        services={services}
        currentProvider={data?.defaultProvider ?? "lovable_ai"}
        currentModel={
          data?.defaultModel ?? "google/gemini-3-flash-preview"
        }
        onSaved={refetch}
      />

      {/* Managed services */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-text-tertiary">
          Gerenciados pela plataforma
        </h2>
        {managed.map((s) => (
          <ServiceCard key={s.id} service={s} onRefresh={refetch} />
        ))}
      </section>

      {/* Custom services */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-text-tertiary">
          Chaves de API próprias
        </h2>
        {custom.map((s) => (
          <ServiceCard key={s.id} service={s} onRefresh={refetch} />
        ))}
        <div className="flex gap-2 rounded-lg border border-accent/20 bg-accent/5 p-3 text-xs text-text-secondary">
          <Info className="h-4 w-4 flex-shrink-0 text-accent" />
          <span>
            Chaves salvas aqui ficam armazenadas com segurança no banco
            (acessível apenas a admins). Você também pode definir variáveis de
            ambiente como fallback (<code>OPENAI_API_KEY</code>,{" "}
            <code>ANTHROPIC_API_KEY</code>, <code>PERPLEXITY_API_KEY</code>).
          </span>
        </div>
      </section>
    </div>
  );
}

function DefaultModelSection({
  services,
  currentProvider,
  currentModel,
  onSaved,
}: {
  services: ServiceInfo[];
  currentProvider: string;
  currentModel: string;
  onSaved: () => void;
}) {
  const [provider, setProvider] = useState(currentProvider);
  const [model, setModel] = useState(currentModel);

  useEffect(() => {
    setProvider(currentProvider);
    setModel(currentModel);
  }, [currentProvider, currentModel]);

  // Apenas provedores de ESCRITA (Perplexity é só pesquisa, não entra aqui).
  const WRITING_PROVIDERS = ["lovable_ai", "openai", "anthropic"];
  const availableProviders = services
    .filter(
      (s) =>
        s.configured &&
        WRITING_PROVIDERS.includes(s.id) &&
        MODELS_BY_PROVIDER[s.id],
    )
    .map((s) => ({ id: s.id, name: s.name }));

  // Fallback automático: se o provedor selecionado não está mais configurado,
  // volta para Lovable AI (que sempre existe como fallback).
  useEffect(() => {
    if (
      availableProviders.length > 0 &&
      !availableProviders.some((p) => p.id === provider)
    ) {
      setProvider("lovable_ai");
      const first = MODELS_BY_PROVIDER["lovable_ai"]?.[0]?.value;
      if (first) setModel(first);
    }
  }, [availableProviders, provider]);

  const models = MODELS_BY_PROVIDER[provider] ?? [];

  const mutation = useMutation({
    mutationFn: async () =>
      setDefaultModel({
        data: { provider: provider as any, model },
        headers: await authHeaders(),
      }),
    onSuccess: () => {
      toast.success("Modelo padrão atualizado.");
      onSaved();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const dirty = provider !== currentProvider || model !== currentModel;

  return (
    <section className="lp-card-elevated space-y-4 p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10 text-accent">
          <Cpu className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-text-primary">
            Modelo padrão de geração
          </h2>
          <p className="text-xs text-text-secondary">
            Usado pela tela <code>/admin/generate</code> e pelo scheduler.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1">
          <span className="text-xs font-medium text-text-secondary">Provedor</span>
          <select
            value={provider}
            onChange={(e) => {
              const p = e.target.value;
              setProvider(p);
              const first = MODELS_BY_PROVIDER[p]?.[0]?.value;
              if (first) setModel(first);
            }}
            className="w-full rounded-lg border border-border-default bg-bg-surface-1 px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
          >
            {availableProviders.length === 0 && (
              <option value="lovable_ai">Lovable AI</option>
            )}
            {availableProviders.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-xs font-medium text-text-secondary">Modelo</span>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full rounded-lg border border-border-default bg-bg-surface-1 px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
          >
            {models.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-text-tertiary">
          Apenas provedores com chave configurada aparecem aqui. Sem chaves
          próprias, o padrão é <strong>Lovable AI</strong>.
          {provider !== "lovable_ai" && (
            <>
              {" "}⚠ Provedores nativos ainda usam o gateway Lovable nesta
              versão; a chave fica salva para uso futuro.
            </>
          )}
        </p>
        <button
          onClick={() => mutation.mutate()}
          disabled={!dirty || mutation.isPending}
          className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {mutation.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          Salvar padrão
        </button>
      </div>
    </section>
  );
}

function ServiceCard({
  service,
  onRefresh,
}: {
  service: ServiceInfo;
  onRefresh: () => void;
}) {
  const qc = useQueryClient();
  const [testing, setTesting] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);

  const isCustom = !service.managed;
  const docUrl = PROVIDER_DOCS[service.id];

  const saveMut = useMutation({
    mutationFn: async () =>
      saveIntegrationKey({
        data: { serviceId: service.id as any, apiKey },
        headers: await authHeaders(),
      }),
    onSuccess: () => {
      toast.success(`Chave salva para ${service.name}.`);
      setApiKey("");
      qc.invalidateQueries({ queryKey: ["integrations-status"] });
      onRefresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const clearMut = useMutation({
    mutationFn: async () =>
      clearIntegrationKey({
        data: { serviceId: service.id as any },
        headers: await authHeaders(),
      }),
    onSuccess: () => {
      toast.success(`Chave de ${service.name} removida.`);
      qc.invalidateQueries({ queryKey: ["integrations-status"] });
      onRefresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleTest = async () => {
    setTesting(true);
    try {
      const result = await testIntegrationConnection({
        data: { serviceId: service.id as any },
        headers: await authHeaders(),
      });
      if (result.ok) toast.success(result.message);
      else toast.error(result.message);
    } catch {
      toast.error("Erro ao testar conexão.");
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="lp-card-elevated space-y-3 p-4">
      <div className="flex items-center gap-4">
        <div
          className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${
            service.configured
              ? "bg-emerald-500/10 text-emerald-500"
              : "bg-bg-surface-2 text-text-tertiary"
          }`}
        >
          {service.configured ? (
            <CheckCircle2 className="h-5 w-5" />
          ) : (
            <XCircle className="h-5 w-5" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-text-primary">{service.name}</span>
            {service.id === "perplexity" && (
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                  service.configured
                    ? "bg-emerald-500/10 text-emerald-500"
                    : "bg-amber-500/10 text-amber-500"
                }`}
                title={
                  service.configured
                    ? "Usada como pesquisa primária na geração de posts."
                    : "Sem Perplexity, a geração segue sem pesquisa externa em tempo real."
                }
              >
                {service.configured
                  ? "Pesquisa prioritária"
                  : "Fallback: sem pesquisa externa"}
              </span>
            )}
            {service.managed === "platform" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent">
                <Zap className="h-3 w-3" /> Plataforma
              </span>
            )}
            {service.managed === "connector" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium text-accent">
                <ExternalLink className="h-3 w-3" /> Connector
              </span>
            )}
            {service.source === "db" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-500">
                <KeyRound className="h-3 w-3" /> Salva no banco · ...{service.lastFour}
              </span>
            )}
            {service.source === "env" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-500">
                <KeyRound className="h-3 w-3" /> Via env · ...{service.lastFour}
              </span>
            )}
            {!service.configured && isCustom && (
              <span className="inline-flex items-center gap-1 rounded-full bg-bg-surface-2 px-2 py-0.5 text-[10px] font-medium text-text-tertiary">
                <KeyRound className="h-3 w-3" /> Não configurada
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-text-secondary">
            {service.description}
          </p>
        </div>

        {service.configured && (
          <button
            onClick={handleTest}
            disabled={testing}
            className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-lg border border-border-default px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-bg-surface-2 disabled:opacity-50"
          >
            {testing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            Testar
          </button>
        )}
      </div>

      {/* Input de chave (apenas custom) */}
      {isCustom && (
        <div className="space-y-2 border-t border-border-subtle pt-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={
                  service.configured
                    ? `Substituir chave atual (...${service.lastFour})`
                    : "Cole sua chave de API aqui"
                }
                className="w-full rounded-lg border border-border-default bg-bg-surface-1 px-3 py-2 pr-9 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none"
                autoComplete="off"
                spellCheck={false}
              />
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary"
                tabIndex={-1}
              >
                {showKey ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            <button
              onClick={() => saveMut.mutate()}
              disabled={apiKey.length < 10 || saveMut.isPending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-xs font-medium text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {saveMut.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              Salvar
            </button>
            {service.source === "db" && (
              <button
                onClick={() => {
                  if (confirm(`Remover chave de ${service.name}?`)) clearMut.mutate();
                }}
                disabled={clearMut.isPending}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border-default px-2.5 py-2 text-xs font-medium text-text-secondary transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                title="Remover chave salva"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {docUrl && (
            <a
              href={docUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-accent hover:underline"
            >
              <ExternalLink className="h-3 w-3" />
              Onde obter a chave de {service.name}?
            </a>
          )}
        </div>
      )}
    </div>
  );
}
