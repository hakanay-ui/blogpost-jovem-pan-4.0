// Constantes e helpers do site público da Jovem Pan Goiás.

export const SITE = {
  name: "Jovem Pan Goiás",
  description: "Notícias de Goiânia, Caldas Novas e Goiás",
  byline: "Redação Jovem Pan Goiás (com IA)",
  pracas: [
    { slug: "goiania", city: "Goiânia", dial: "106,7" },
    { slug: "caldas-novas", city: "Caldas Novas", dial: "105,7" },
  ],
  markUrl: "/brand/jp-fm-mark.png",
  logo3dUrl: "/brand/logo-jp-goiania-caldas-3d.webp",
} as const;

// Nomes das editorias (espelho do seed em supabase/migrations) para o <title> no SSR.
export const CATEGORY_NAMES: Record<string, string> = {
  goiania: "Goiânia",
  "caldas-novas": "Caldas Novas e região",
  goias: "Goiás",
  politica: "Política",
  "economia-agro": "Economia e Agro",
  esporte: "Esporte",
  servico: "Serviço",
  "cultura-agenda": "Cultura e Agenda",
  "brasil-mundo": "Brasil e Mundo",
  noticias: "Notícias",
};

// Fallback quando o post não tem categoria (posts antigos).
export const UNCATEGORIZED_SLUG = "noticias";

export function postParams(post: { slug: string; topic?: { slug: string | null } | null }) {
  return { categoria: post.topic?.slug || UNCATEGORIZED_SLUG, slug: post.slug };
}

export function postPath(post: { slug: string; topic?: { slug: string | null } | null }): string {
  const cat = post.topic?.slug || UNCATEGORIZED_SLUG;
  return `/${cat}/${post.slug}`;
}

export function siteUrl(): string {
  const fromEnv =
    (typeof process !== "undefined"
      ? (process.env?.VITE_SITE_URL ?? process.env?.SITE_URL)
      : undefined) ?? import.meta.env?.VITE_SITE_URL;
  const base = (fromEnv as string | undefined) ?? "https://newsfeed-whisperer.lovable.app";
  return base.replace(/\/$/, "");
}

const TZ = "America/Sao_Paulo";

export function formatShortDate(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso)
    .toLocaleDateString("pt-BR", { day: "numeric", month: "short", timeZone: TZ })
    .replace(".", "");
}

export function formatLongDateTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  const date = d.toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: TZ,
  });
  const time = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: TZ });
  return `${date}, ${time.replace(":", "h")}`;
}

export function todayLabel(): string {
  return new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: TZ,
  });
}

// Rotas antigas do painel (antes em /dashboard, /feeds...) — agora em /admin/*.
export const LEGACY_ROUTE_REDIRECTS: Record<string, string> = {
  "/dashboard": "/admin",
  "/feeds": "/admin/feeds",
  "/generate": "/admin/generate",
  "/integrations": "/admin/integrations",
  "/logs": "/admin/logs",
  "/news": "/admin/news",
  "/posts": "/admin/posts",
  "/profile": "/admin/profile",
  "/security": "/admin/security",
  "/settings": "/admin/settings",
  "/team": "/admin/team",
  "/topics": "/admin/topics",
};
