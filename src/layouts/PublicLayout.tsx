import { Link, Outlet } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useProjectConfig } from "@/hooks/queries/useProjectConfig";

export function PublicLayout({ children }: { children?: ReactNode }) {
  const [scrolled, setScrolled] = useState(false);
  const { data: cfg } = useProjectConfig();
  const blogName = cfg?.blog_name?.trim() || "Blogpost AI";
  const tagline = cfg?.blog_tagline?.trim() || "Conteúdo curado e gerado com IA";
  const company = cfg?.blog_company?.trim();
  const logoUrl = cfg?.blog_logo_url?.trim();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-bg-base text-text-primary">
      <header
        className={`sticky top-0 z-30 transition-all ${
          scrolled
            ? "border-b border-border bg-bg-elevated/85 backdrop-blur-md"
            : "border-b border-transparent bg-transparent"
        }`}
      >
        <div className="mx-auto flex h-16 max-w-content items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2">
            {logoUrl ? (
              <img src={logoUrl} alt={blogName} className="h-9 w-9 rounded-xl object-cover" />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-white shadow-[var(--shadow-accent-glow)]">
                <Sparkles className="h-4 w-4" />
              </div>
            )}
            <span className="text-lg font-bold tracking-tight">{blogName}</span>
          </Link>
          <nav className="flex items-center gap-6 text-sm font-medium">
            <Link to="/" className="text-text-secondary transition-colors hover:text-text-primary">
              Blog
            </Link>
            <Link to="/admin" className="text-text-secondary transition-colors hover:text-text-primary">
              Admin
            </Link>
          </nav>
        </div>
      </header>
      {children ?? <Outlet />}
      <footer className="border-t border-border bg-bg-surface-1 py-10">
        <div className="mx-auto max-w-content px-6 text-center text-sm text-text-secondary">
          {tagline} · <span className="font-semibold text-text-primary">{company || blogName}</span>
        </div>
      </footer>
    </div>
  );
}
