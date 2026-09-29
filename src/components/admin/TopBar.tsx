import { Link, useNavigate } from "@tanstack/react-router";
import {
  Search,
  HelpCircle,
  Bell,
  Sun,
  Moon,
  Sparkles,
  ChevronDown,
  Menu,
  LogOut,
  UserCircle,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useProjectConfig } from "@/hooks/queries/useProjectConfig";

function BrandLogoSvg() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      width="20"
      height="20"
      aria-hidden="true"
    >
      <path d="M5 4h7a4 4 0 0 1 0 8H5z" />
      <path d="M5 12h8.5a4 4 0 0 1 0 8H5z" />
      <circle cx="18.5" cy="6" r="1.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function TopBar({ onOpenMobileNav }: { onOpenMobileNav?: () => void }) {
  const { user, profile, role, signOut } = useAuth();
  const { theme, toggle: toggleTheme } = useTheme();
  const { data: cfg } = useProjectConfig();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const blogName = cfg?.blog_name?.trim() || "Blogpost";
  const tagline = cfg?.blog_tagline?.trim() || "Conteúdo editorial com IA";
  const logoUrl = cfg?.blog_logo_url?.trim();

  const fullName = profile?.full_name || user?.email || "";
  const { initials, firstAndLast, roleLabel } = useMemo(() => {
    const parts = fullName.split(" ").filter(Boolean);
    const ini =
      parts
        .map((n) => n[0])
        .filter(Boolean)
        .slice(0, 2)
        .join("")
        .toUpperCase() || "?";
    const fl =
      parts.length === 0
        ? "Usuário"
        : parts.length === 1
          ? parts[0]
          : `${parts[0]} ${parts[parts.length - 1][0]}.`;
    const rl = role === "admin" ? "Admin" : role === "editor" ? "Editor" : "Membro";
    return { initials: ini, firstAndLast: fl, roleLabel: rl };
  }, [fullName, role]);

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/" });
  };

  return (
    <header className="bp-topbar">
      {/* Mobile menu trigger */}
      {onOpenMobileNav && (
        <button
          type="button"
          onClick={onOpenMobileNav}
          className="bp-icon-btn lg:hidden"
          aria-label="Abrir navegação"
        >
          <Menu className="h-4 w-4" />
        </button>
      )}

      <Link to="/admin" className="bp-brand">
        <div className="bp-logo" aria-hidden="true">
          {logoUrl ? (
            <img src={logoUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <BrandLogoSvg />
          )}
        </div>
        <div className="bp-wordmark">
          <div className="bp-name">
            <span>{blogName}</span>
            <span className="bp-version">v4.0</span>
          </div>
          <div className="bp-tagline">{tagline}</div>
        </div>
      </Link>

      <div className="bp-divider" />

      <div className="bp-search">
        <Search className="bp-search-icon" />
        <input type="text" placeholder="Buscar posts, temas, fontes…" aria-label="Buscar" />
        <span className="bp-search-kbd">⌘K</span>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <div className="bp-status" title="Pipeline operacional">
          <span className="bp-dot" />
          <span>Pipeline ativa</span>
        </div>

        <button type="button" className="bp-icon-btn" aria-label="Documentação">
          <HelpCircle className="h-4 w-4" />
        </button>

        <button type="button" className="bp-icon-btn" aria-label="Notificações">
          <Bell className="h-4 w-4" />
          <span className="bp-dot-badge" />
        </button>

        <button
          type="button"
          className="bp-icon-btn"
          aria-label="Alternar tema"
          onClick={toggleTheme}
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        <Link to="/admin/generate" className="bp-cta">
          <Sparkles className="h-4 w-4" />
          <span>Gerar post</span>
        </Link>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            className="bp-user"
            aria-label="Conta"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span className="bp-user-avatar">
              {profile?.avatar_url ? <img src={profile.avatar_url} alt={fullName} /> : initials}
            </span>
            <span className="bp-user-meta">
              <span className="bp-user-name">{firstAndLast}</span>
              <span className="bp-user-role">{roleLabel}</span>
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-text-secondary" />
          </button>
          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-[calc(100%+8px)] z-40 w-56 overflow-hidden rounded-xl border border-border bg-bg-elevated shadow-[var(--shadow-elevation-4)]"
            >
              <Link
                to="/admin/profile"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-bg-surface-2"
                role="menuitem"
              >
                <UserCircle className="h-4 w-4" /> Meu perfil
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                className="flex w-full items-center gap-2 border-t border-border px-3 py-2 text-sm text-text-primary hover:bg-bg-surface-2"
                role="menuitem"
              >
                <LogOut className="h-4 w-4" /> Sair
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
