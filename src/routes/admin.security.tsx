import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ShieldCheck, X, AlertTriangle, Info } from "lucide-react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { toast } from "sonner";
import { useProjectConfig, useUpdateConfig } from "@/hooks/queries/useProjectConfig";
import { LoadingCard } from "@/components/ui/state-card";

export const Route = createFileRoute("/admin/security")({
  component: SecurityPage,
});

function SecurityPage() {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <SecuritySettings />
    </ProtectedRoute>
  );
}

const DOMAIN_REGEX = /^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/;

function SecuritySettings() {
  const { data: cfg, isLoading } = useProjectConfig();
  const update = useUpdateConfig();
  const [newDomain, setNewDomain] = useState("");

  if (isLoading || !cfg) {
    return (
      <div className="mx-auto max-w-3xl p-8">
        <LoadingCard title="Carregando configurações…" />
      </div>
    );
  }

  const requireApproval = cfg.require_account_approval === "true";
  const restrictDomain = cfg.restrict_signup_by_domain === "true";
  const domains = (cfg.allowed_email_domains ?? "")
    .split(",")
    .map((d) => d.trim())
    .filter(Boolean);

  const saveConfig = (key: "require_account_approval" | "restrict_signup_by_domain" | "allowed_email_domains", value: string) => {
    update.mutate(
      { key, value },
      {
        onSuccess: () => toast.success("Configuração atualizada"),
        onError: (e: any) => toast.error("Erro ao salvar: " + e.message),
      },
    );
  };

  const toggleApproval = (next: boolean) =>
    saveConfig("require_account_approval", next ? "true" : "false");

  const toggleRestrict = (next: boolean) =>
    saveConfig("restrict_signup_by_domain", next ? "true" : "false");

  const saveDomains = (next: string[]) =>
    saveConfig("allowed_email_domains", next.join(","));

  const addDomain = () => {
    const d = newDomain.trim().toLowerCase();
    if (!DOMAIN_REGEX.test(d)) {
      toast.error("Formato de domínio inválido. Ex: empresa.com");
      return;
    }
    if (domains.includes(d)) {
      toast.error("Este domínio já está na lista.");
      return;
    }
    saveDomains([...domains, d]);
    setNewDomain("");
  };

  const removeDomain = (d: string) => saveDomains(domains.filter((x) => x !== d));

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-8">
      <header className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">Segurança</h1>
          <p className="text-sm text-text-secondary">
            Controle quem pode se cadastrar e acessar a plataforma.
          </p>
        </div>
      </header>

      <section className="lp-card-elevated p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h2 className="text-base font-semibold text-text-primary">
              Exigir aprovação para novas contas
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              Quando ativo, novos usuários precisarão ser aprovados por um administrador antes de
              acessar a plataforma.
            </p>
          </div>
          <Toggle
            checked={requireApproval}
            onChange={toggleApproval}
            disabled={update.isPending}
          />
        </div>
        <div className="mt-4 flex gap-2 rounded-lg border border-accent/20 bg-accent/5 p-3 text-xs text-text-secondary">
          <Info className="h-4 w-4 flex-shrink-0 text-accent" />
          O primeiro usuário cadastrado (administrador) é sempre aprovado automaticamente.
        </div>
      </section>

      <section className="lp-card-elevated p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h2 className="text-base font-semibold text-text-primary">
              Restringir cadastro por domínio de email
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              Quando ativo, apenas emails dos domínios listados abaixo poderão se cadastrar.
            </p>
          </div>
          <Toggle
            checked={restrictDomain}
            onChange={toggleRestrict}
            disabled={update.isPending}
          />
        </div>

        {restrictDomain && (
          <div className="mt-5 space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addDomain();
                  }
                }}
                placeholder="empresa.com"
                className="flex-1 rounded-lg border border-border-default bg-bg-elevated px-3 py-2 text-sm text-text-primary outline-none focus:border-accent"
              />
              <button
                onClick={addDomain}
                disabled={update.isPending}
                className="lp-btn-primary-indigo px-4 py-2 text-sm"
              >
                Adicionar
              </button>
            </div>

            {domains.length === 0 ? (
              <div className="flex gap-2 rounded-lg border border-warning/30 bg-warning/5 p-3 text-xs text-text-secondary">
                <AlertTriangle className="h-4 w-4 flex-shrink-0 text-warning" />
                Atenção: nenhum domínio configurado. Nenhum novo cadastro será permitido.
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {domains.map((d) => (
                  <span
                    key={d}
                    className="inline-flex items-center gap-2 rounded-full bg-bg-surface-2 px-3 py-1 text-sm text-text-primary"
                  >
                    {d}
                    <button
                      onClick={() => removeDomain(d)}
                      className="text-text-tertiary hover:text-destructive"
                      aria-label={`Remover domínio ${d}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="mt-4 flex gap-2 rounded-lg border border-accent/20 bg-accent/5 p-3 text-xs text-text-secondary">
          <Info className="h-4 w-4 flex-shrink-0 text-accent" />
          O primeiro usuário (administrador) sempre pode se cadastrar independente do domínio.
        </div>
      </section>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors ${
        checked ? "bg-accent" : "bg-bg-surface-2"
      } ${disabled ? "opacity-50" : ""}`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}
