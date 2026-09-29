import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Clock, LogOut, RefreshCw, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

export const Route = createFileRoute("/pending-approval")({
  component: PendingApprovalPage,
});

function PendingApprovalPage() {
  const { user, profile, loading, refreshProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/admin/login" });
      return;
    }
    if (profile?.is_approved) navigate({ to: "/admin" });
  }, [loading, user, profile, navigate]);

  const handleRecheck = async () => {
    setChecking(true);
    await refreshProfile();
    setChecking(false);
  };

  const handleLogout = async () => {
    await signOut();
    navigate({ to: "/admin/login" });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-base p-6">
      <div className="lp-card-elevated w-full max-w-md p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent/10 text-accent">
          <Clock className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">
          Aguardando aprovação
        </h1>
        <p className="mt-3 text-sm text-text-secondary">
          Olá, <strong>{profile?.full_name ?? "usuário"}</strong>! Sua conta foi
          criada com sucesso, mas ainda precisa ser aprovada por um
          administrador.
        </p>
        <p className="mt-2 text-xs text-text-tertiary">
          Você receberá acesso assim que um administrador aprovar sua conta.
        </p>

        <div className="mt-6 flex flex-col gap-2">
          <button
            onClick={handleRecheck}
            disabled={checking}
            className="lp-btn-primary-indigo"
          >
            {checking ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Verificar novamente
          </button>
          <button
            onClick={handleLogout}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-border-default px-4 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-bg-surface-2"
          >
            <LogOut className="h-4 w-4" /> Fazer logout
          </button>
        </div>
      </div>
    </div>
  );
}
