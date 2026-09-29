import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Loader2, ShieldAlert } from "lucide-react";
import { useAuth, type AppRole } from "@/contexts/AuthContext";

type Props = {
  children: ReactNode;
  allowedRoles?: AppRole[];
};

export function ProtectedRoute({ children, allowedRoles }: Props) {
  const { user, profile, role, loading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/admin/login" });
      return;
    }
    if (profile && profile.is_active === false) {
      void signOut().then(() => navigate({ to: "/admin/login" }));
      return;
    }
    if (profile && profile.is_approved === false) {
      navigate({ to: "/pending-approval" });
    }
  }, [loading, user, profile, navigate, signOut]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-base">
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <Loader2 className="h-4 w-4 animate-spin" />
          Verificando autenticação…
        </div>
      </div>
    );
  }

  if (profile && (!profile.is_active || !profile.is_approved)) {
    return null;
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-base p-6">
        <div className="lp-card-elevated max-w-md p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            Acesso negado
          </h1>
          <p className="mt-2 text-sm text-text-secondary">
            Você não tem permissão para acessar esta área. Fale com um
            administrador se isso não estiver correto.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
