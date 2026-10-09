export const AUDIENCE_TIMEZONE = "America/Sao_Paulo";

export type AudienceStats = {
  last24h: number;
  last7days: number;
  last30days: number;
  sessions7days: number;
  total: number;
  firstVisit: string | null;
  daily: { date: string; visits: number }[];
  pages: { path: string; visits: number }[];
  sources: { source: string; visits: number }[];
};

export function externalReferrer(referrer: string, origin: string): string | null {
  if (!referrer) return null;
  try {
    const url = new URL(referrer);
    if (!["http:", "https:"].includes(url.protocol) || url.origin === origin) return null;
    return url.hostname.replace(/^www\./, "").slice(0, 253);
  } catch {
    return null;
  }
}

export function isPublicPage(path: string): boolean {
  return path.startsWith("/") && !/^\/(admin|api|mcp|pending-approval)(\/|$)/.test(path)
    && !path.startsWith("/.lovable") && !/\.(xml|json)$/.test(path);
}

export function audienceDateLabel(date: string): string {
  const [, month, day] = date.split("-");
  return `${day}/${month}`;
}