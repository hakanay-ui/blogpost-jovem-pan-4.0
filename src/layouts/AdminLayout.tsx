import { Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutGrid,
  FileText,
  Rss,
  Sparkles,
  Tag,
  LogOut,
  ExternalLink,
  ShieldCheck,
  Users,
  Plug,
  Activity,
  Newspaper,
  X,
  Settings,
  UserCircle,
  HelpCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { TopBar } from "@/components/admin/TopBar";
import { supabase } from "@/integrations/supabase/client";

const items = [
  { to: "/admin", icon: LayoutGrid, label: "Dashboard", exact: true },
  { to: "/admin/topics", icon: Tag, label: "Linha editorial" },
  { to: "/admin/posts", icon: FileText, label: "Posts" },
  { to: "/admin/generate", icon: Sparkles, label: "Gerar post" },
  { to: "/admin/feeds", icon: Rss, label: "Fontes RSS" },
  { to: "/admin/news", icon: Newspaper, label: "Notícias" },
  { to: "/admin/logs", icon: Activity, label: "Execuções" },
  { to: "/admin/settings", icon: Settings, label: "Identidade do blog" },
  { to: "/admin/integrations", icon: Plug, label: "Integrações" },
  { to: "/admin/team", icon: Users, label: "Equipe" },
  { to: "/admin/security", icon: ShieldCheck, label: "Segurança" },
  { to: "/admin/profile", icon: UserCircle, label: "Meu perfil" },
  { to: "/admin/help", icon: HelpCircle, label: "Ajuda" },
];

export function AdminLayout() {
  const { user, profile, isAdmin, loading, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Auth/role enforcement happens in route beforeLoad (src/routes/admin.tsx).
  // We still refresh the token in the background to mitigate stale sessions
  // after a backend swap, but failures here no longer trigger redirects —
  // beforeLoad already validated, and onAuthStateChange will rebounce.
  useEffect(() => {
    void supabase.auth.refreshSession().catch(() => {});
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [mobileOpen]);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/admin/login" });
      return;
    }
    if (profile && !profile.is_active) {
      void signOut().then(() => navigate({ to: "/admin/login" }));
      return;
    }
    if (profile && !profile.is_approved) {
      navigate({ to: "/pending-approval" });
    }
  }, [user, profile, loading, navigate, signOut]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-base">
        <div className="text-text-secondary">Carregando…</div>
      </div>
    );
  }

  if (!user) return null;
  if (profile && (!profile.is_active || !profile.is_approved)) return null;

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-base p-6">
        <div className="lp-card-elevated max-w-md p-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">Acesso restrito</h1>
          <p className="mt-2 text-sm text-text-secondary">
            Você está logado, mas não é administrador. O primeiro usuário cadastrado vira admin
            automaticamente.
          </p>
          <button
            onClick={() => signOut().then(() => navigate({ to: "/admin/login" }))}
            className="lp-btn-primary-indigo mt-6"
          >
            <LogOut className="h-4 w-4" /> Sair
          </button>
        </div>
      </div>
    );
  }

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/" });
  };

  const sidebar = (
    <aside className="bp-sidebar">
      <div className="bp-sidebar-head">
        <div className="bp-sidebar-mini-logo">
          <Sparkles className="h-3.5 w-3.5" />
        </div>
        <span className="bp-sidebar-eyebrow">Blogpost 4.0</span>
        <button
          onClick={() => setMobileOpen(false)}
          className="ml-auto rounded p-1 text-white/70 hover:bg-white/10 lg:hidden"
          aria-label="Fechar menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <nav className="bp-nav" aria-label="Navegação principal">
        {items.map((it) => {
          const active = it.exact ? location.pathname === it.to : location.pathname.startsWith(it.to);
          const Icon = it.icon;
          return (
            <Link
              key={it.to}
              to={it.to}
              data-active={active ? "true" : "false"}
              aria-current={active ? "page" : undefined}
              className="bp-nav-item"
            >
              <Icon aria-hidden="true" />
              <span>{it.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="bp-sidebar-foot">
        <Link to="/" className="bp-nav-item">
          <ExternalLink /> <span>Ver blog</span>
        </Link>
        <button onClick={handleSignOut} className="bp-nav-item w-full text-left">
          <LogOut /> <span>Sair</span>
        </button>
      </div>
    </aside>
  );

  return (
    <div className="flex min-h-screen bg-bg-base">
      {/* Sidebar desktop */}
      <div className="hidden lg:block sticky top-0 h-screen self-start">{sidebar}</div>

      {/* Sidebar mobile (drawer) */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 flex lg:hidden"
          role="dialog"
          aria-modal="true"
          onClick={(e) => e.target === e.currentTarget && setMobileOpen(false)}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative z-10">{sidebar}</div>
        </div>
      )}

      <main className="flex flex-1 flex-col overflow-x-hidden bg-bg-base text-text-primary">
        <TopBar onOpenMobileNav={() => setMobileOpen(true)} />
        <Outlet />
      </main>
    </div>
  );
}
