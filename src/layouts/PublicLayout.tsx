import { Link, Outlet } from "@tanstack/react-router";
import { Moon, Radio, Rss, Sun } from "lucide-react";
import { type ReactNode } from "react";
import { useProjectConfig } from "@/hooks/queries/useProjectConfig";
import { useCategories } from "@/hooks/queries/useNews";
import { useTheme } from "@/contexts/ThemeContext";
import { SITE, todayLabel } from "@/lib/site";

export function PublicLayout({
  children,
  activeCategory,
  showIntro = false,
}: {
  children?: ReactNode;
  activeCategory?: string;
  /** Linha de título + data + faixa "ao vivo" + chips (só na home e nas categorias). */
  showIntro?: boolean;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-bg-base text-text-primary">
      <SiteHeader />
      {showIntro && <SiteIntro activeCategory={activeCategory} />}
      <main className="flex-1">{children ?? <Outlet />}</main>
      <SiteFooter />
    </div>
  );
}

export function BrandMark({ size = "md" }: { size?: "md" | "lg" }) {
  return (
    <span className="flex items-center gap-2.5">
      <img
        src={SITE.markUrl}
        alt="Jovem Pan FM"
        className={size === "lg" ? "h-12 w-auto" : "h-9 w-auto"}
        width={size === "lg" ? 100 : 75}
        height={size === "lg" ? 48 : 36}
      />
      <span className="jp-condensed flex flex-col text-[0.8125rem] leading-[1.05] text-accent">
        {SITE.pracas.map((p) => (
          <span key={p.slug}>
            {p.city} | {p.dial}
          </span>
        ))}
      </span>
    </span>
  );
}

function ThemeButton() {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";
  return (
    <button
      type="button"
      onClick={toggle}
      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border text-text-secondary transition-colors hover:text-text-primary"
      aria-label={isDark ? "Usar tema claro" : "Usar tema escuro"}
    >
      {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
    </button>
  );
}

function SiteHeader() {
  return (
    <header className="border-t-[3px] border-accent border-b border-b-border bg-bg-elevated">
      <div className="jp-container flex h-16 items-center justify-between gap-4">
        <Link to="/" aria-label="Jovem Pan Goiás — página inicial">
          <BrandMark />
        </Link>
        <nav className="flex items-center gap-1 text-[0.8125rem] font-medium sm:gap-4">
          <Link
            to="/ultimas"
            className="hidden px-1 text-text-secondary hover:text-text-primary sm:inline"
          >
            Últimas
          </Link>
          <Link
            to="/$categoria"
            params={{ categoria: "goiania" }}
            className="hidden px-1 text-text-secondary hover:text-text-primary md:inline"
          >
            Goiânia
          </Link>
          <Link
            to="/$categoria"
            params={{ categoria: "caldas-novas" }}
            className="hidden px-1 text-text-secondary hover:text-text-primary md:inline"
          >
            Caldas Novas
          </Link>
          <a
            href="/feed.xml"
            className="hidden h-7 items-center gap-1 rounded-full border border-border px-2.5 text-xs text-text-secondary hover:text-text-primary sm:inline-flex"
          >
            <Rss className="h-3 w-3" /> RSS
          </a>
          <Link to="/ao-vivo" className="jp-btn-red ml-1">
            <Radio className="h-3.5 w-3.5" /> Ao vivo
          </Link>
          <ThemeButton />
        </nav>
      </div>
    </header>
  );
}

function SiteIntro({ activeCategory }: { activeCategory?: string }) {
  const { data: categories = [] } = useCategories();
  return (
    <>
      <div className="border-b border-border">
        <div className="jp-container flex flex-col gap-1 py-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-lg font-extrabold tracking-tight">
              Notícias de Goiânia, Caldas Novas e Goiás
            </p>
            <p className="text-xs text-text-secondary">
              O que mudou na sua cidade, direto ao ponto
            </p>
          </div>
          <p className="jp-meta uppercase tracking-[0.12em]" suppressHydrationWarning>
            {todayLabel()}
          </p>
        </div>
      </div>

      <LiveStrip />

      <div className="border-b border-border">
        <div className="jp-container flex items-center gap-3 overflow-x-auto py-3 scrollbar-hide">
          <span className="jp-section-label shrink-0">Editorias</span>
          {categories.map((c) => (
            <Link
              key={c.slug}
              to="/$categoria"
              params={{ categoria: c.slug }}
              className="jp-chip"
              data-active={activeCategory === c.slug}
            >
              {c.name}
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}

/** Faixa de destaque (na referência, a newsletter): chamada para ouvir a rádio ao vivo. */
function LiveStrip() {
  const { data: cfg } = useProjectConfig();
  const players = [
    { ...SITE.pracas[0], url: cfg?.blog_player_url_goiania?.trim() },
    { ...SITE.pracas[1], url: cfg?.blog_player_url_caldas?.trim() },
  ];
  return (
    <div className="border-b border-border bg-bg-subtle-accent">
      <div className="jp-container flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm">
          <span className="font-bold">Ouça a Jovem Pan ao vivo.</span>{" "}
          <span className="text-text-secondary">
            Música, informação e entretenimento o dia todo.
          </span>
        </p>
        <div className="flex flex-wrap gap-2">
          {players.map((p) =>
            p.url ? (
              <a
                key={p.slug}
                href={p.url}
                target="_blank"
                rel="noopener noreferrer"
                className="jp-btn-red"
              >
                <Radio className="h-3.5 w-3.5" /> {p.city} {p.dial}
              </a>
            ) : (
              <Link key={p.slug} to="/ao-vivo" className="jp-btn-red">
                <Radio className="h-3.5 w-3.5" /> {p.city} {p.dial}
              </Link>
            ),
          )}
        </div>
      </div>
    </div>
  );
}

function SiteFooter() {
  const { data: cfg } = useProjectConfig();
  const correctionsEmail = cfg?.blog_corrections_email?.trim();
  return (
    <footer className="mt-16 border-t border-border bg-bg-elevated">
      <div className="jp-container grid gap-10 py-12 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <BrandMark size="lg" />
          <p className="mt-4 max-w-sm text-sm text-text-secondary">
            O jornal local da Jovem Pan em Goiás: o que acontece em Goiânia, em Caldas Novas e no
            estado e afeta a vida de quem mora aqui.
          </p>
          <div className="mt-6 flex items-center gap-3 border-t border-border pt-6">
            <img src={SITE.markUrl} alt="" className="h-8 w-auto" />
            <div>
              <p className="jp-section-label">Editoria</p>
              <p className="text-sm font-semibold">Redação Jovem Pan Goiás</p>
            </div>
          </div>
        </div>
        <div>
          <p className="jp-section-label">Institucional</p>
          <ul className="mt-3 space-y-2 text-sm text-text-secondary">
            <li>
              <Link to="/politica-editorial" className="hover:text-text-primary">
                Política editorial e uso de IA
              </Link>
            </li>
            <li>
              <Link to="/anuncie" className="hover:text-text-primary">
                Anuncie
              </Link>
            </li>
            {correctionsEmail && (
              <li>
                <a href={`mailto:${correctionsEmail}`} className="hover:text-text-primary">
                  Correções
                </a>
              </li>
            )}
          </ul>
        </div>
        <div>
          <p className="jp-section-label">Acompanhe</p>
          <ul className="mt-3 space-y-2 text-sm text-text-secondary">
            <li>
              <Link to="/ultimas" className="hover:text-text-primary">
                Notícias de hoje
              </Link>
            </li>
            <li>
              <Link to="/ao-vivo" className="hover:text-text-primary">
                Ouça ao vivo
              </Link>
            </li>
            <li>
              <a
                href="/feed.xml"
                className="inline-flex items-center gap-1 hover:text-text-primary"
              >
                <Rss className="h-3 w-3" /> Feed RSS
              </a>
            </li>
            <li>
              <a href="/sitemap.xml" className="hover:text-text-primary">
                Mapa do site
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="jp-container space-y-1 py-6 text-xs text-text-tertiary">
          <p>
            Parte do conteúdo é produzida com apoio de inteligência artificial, a partir das fontes
            citadas em cada matéria e conforme a nossa{" "}
            <Link to="/politica-editorial" className="underline hover:text-text-primary">
              política editorial
            </Link>
            .
          </p>
          <p>
            © {new Date().getFullYear()} Jovem Pan FM Goiânia 106,7 · Caldas Novas 105,7. Todos os
            direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
