import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Users, Check, X, Power, PowerOff, Trash2, Shield } from "lucide-react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAuth, type AppRole } from "@/contexts/AuthContext";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";
import { useTeamMembers, useTeamMutations, type Member } from "@/hooks/queries/useTeam";
import { LoadingCard } from "@/components/ui/state-card";

export const Route = createFileRoute("/admin/team")({
  component: TeamPage,
});

function TeamPage() {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <TeamManagement />
    </ProtectedRoute>
  );
}

const ROLES: AppRole[] = ["admin", "editor", "user"];

function TeamManagement() {
  const { user: currentUser } = useAuth();
  const { data: members = [], isLoading } = useTeamMembers();
  const { approve, setActive, changeRole, remove } = useTeamMutations();
  const [filter, setFilter] = useState<"all" | "pending" | "active" | "inactive">("all");
  const { confirm, dialog } = useConfirm();

  const adminCount = useMemo(
    () => members.filter((m) => m.role === "admin").length,
    [members],
  );

  const filtered = useMemo(() => {
    switch (filter) {
      case "pending":
        return members.filter((m) => !m.is_approved);
      case "active":
        return members.filter((m) => m.is_active && m.is_approved);
      case "inactive":
        return members.filter((m) => !m.is_active);
      default:
        return members;
    }
  }, [members, filter]);

  const handleApprove = (m: Member) =>
    approve.mutate(m.id, {
      onSuccess: () => toast.success(`${m.full_name} aprovado`),
      onError: (e: any) => toast.error(e.message),
    });

  const handleSetActive = (m: Member, active: boolean) => {
    if (!active && m.id === currentUser?.id) {
      return toast.error("Você não pode desativar sua própria conta.");
    }
    setActive.mutate(
      { memberId: m.id, active },
      {
        onSuccess: () => toast.success(active ? "Membro reativado" : "Membro desativado"),
        onError: (e: any) => toast.error(e.message),
      },
    );
  };

  const handleChangeRole = (m: Member, newRole: AppRole) => {
    if (m.role === newRole) return;
    if (m.role === "admin" && newRole !== "admin" && adminCount <= 1) {
      return toast.error("Não é possível remover o único administrador.");
    }
    if (m.id === currentUser?.id && m.role === "admin" && newRole !== "admin") {
      return toast.error("Você não pode remover seu próprio papel de admin.");
    }
    changeRole.mutate(
      { memberId: m.id, role: newRole },
      {
        onSuccess: () => toast.success(`Papel atualizado para ${newRole}`),
        onError: (e: any) => toast.error(e.message),
      },
    );
  };

  const handleRemove = async (m: Member) => {
    if (m.id === currentUser?.id) {
      return toast.error("Você não pode remover sua própria conta.");
    }
    const ok = await confirm({
      title: "Remover membro?",
      description: `${m.full_name} será removido definitivamente. Esta ação não pode ser desfeita.`,
      confirmLabel: "Remover",
      destructive: true,
    });
    if (!ok) return;
    remove.mutate(m.id, {
      onSuccess: () => toast.success("Membro removido"),
      onError: (e: any) => toast.error(e instanceof Error ? e.message : "Erro ao remover"),
    });
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-8">
      {dialog}
      <header className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
          <Users className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">Equipe</h1>
          <p className="text-sm text-text-secondary">
            Gerencie membros, aprovações e permissões.
          </p>
        </div>
      </header>

      <div className="flex gap-2" role="tablist" aria-label="Filtrar membros">
        {(
          [
            { id: "all", label: "Todos" },
            { id: "pending", label: "Pendentes" },
            { id: "active", label: "Ativos" },
            { id: "inactive", label: "Inativos" },
          ] as const
        ).map((f) => (
          <button
            key={f.id}
            role="tab"
            aria-selected={filter === f.id}
            onClick={() => setFilter(f.id)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              filter === f.id
                ? "bg-accent text-white"
                : "bg-bg-surface-2 text-text-secondary hover:bg-bg-surface-1"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <LoadingCard title="Carregando equipe…" />
      ) : (
        <div className="lp-card-elevated overflow-hidden">
          {filtered.length === 0 ? (
            <div className="p-10 text-center text-sm text-text-secondary">
              Nenhum membro encontrado.
            </div>
          ) : (
            <table className="w-full">
              <thead className="border-b border-border-subtle bg-bg-surface-1 text-left text-xs uppercase tracking-wider text-text-tertiary">
                <tr>
                  <th className="px-4 py-3 font-semibold">Membro</th>
                  <th className="px-4 py-3 font-semibold">Papel</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 text-right font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {filtered.map((m) => (
                  <tr key={m.id} className="text-sm">
                    <td className="px-4 py-3">
                      <div className="font-medium text-text-primary">{m.full_name}</div>
                      <div className="text-xs text-text-tertiary">{m.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={m.role ?? "user"}
                        onChange={(e) => handleChangeRole(m, e.target.value as AppRole)}
                        className="rounded-md border border-border-default bg-bg-elevated px-2 py-1 text-xs"
                        aria-label={`Papel de ${m.full_name}`}
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {!m.is_approved && <Badge color="warning">Pendente</Badge>}
                        {!m.is_active && <Badge color="destructive">Inativo</Badge>}
                        {m.is_approved && m.is_active && <Badge color="success">Ativo</Badge>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        {!m.is_approved && (
                          <IconBtn title="Aprovar" onClick={() => handleApprove(m)}>
                            <Check className="h-4 w-4" />
                          </IconBtn>
                        )}
                        {m.is_active ? (
                          <IconBtn title="Desativar" onClick={() => handleSetActive(m, false)}>
                            <PowerOff className="h-4 w-4" />
                          </IconBtn>
                        ) : (
                          <IconBtn title="Reativar" onClick={() => handleSetActive(m, true)}>
                            <Power className="h-4 w-4" />
                          </IconBtn>
                        )}
                        <IconBtn title="Remover" onClick={() => handleRemove(m)} danger>
                          <Trash2 className="h-4 w-4" />
                        </IconBtn>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <p className="flex items-center gap-2 text-xs text-text-tertiary">
        <Shield className="h-3.5 w-3.5" />
        O único admin não pode remover seu próprio papel nem desativar sua conta.
      </p>
    </div>
  );
}

function Badge({
  children,
  color,
}: {
  children: React.ReactNode;
  color: "success" | "warning" | "destructive";
}) {
  const map = {
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    destructive: "bg-destructive/10 text-destructive",
  } as const;
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${map[color]}`}>
      {children}
    </span>
  );
}

function IconBtn({
  children,
  onClick,
  title,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={`rounded-md p-1.5 transition-colors ${
        danger
          ? "text-text-secondary hover:bg-destructive/10 hover:text-destructive"
          : "text-text-secondary hover:bg-bg-surface-2 hover:text-accent"
      }`}
    >
      {children}
    </button>
  );
}
