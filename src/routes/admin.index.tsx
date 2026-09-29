import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from "recharts";
import { FileText, Tag, Rss, Sparkles, ArrowRight, Activity } from "lucide-react";
import { useRuns } from "@/hooks/queries/useRuns";
import { useDashboardStats } from "@/hooks/queries/useDashboardStats";
import { OnboardingBanner } from "@/components/onboarding/OnboardingBanner";

export const Route = createFileRoute("/admin/")({
  component: Dashboard,
});

function Dashboard() {
  const { data: stats } = useDashboardStats();
  const { data: runs = [] } = useRuns(50);

  const daily = stats?.daily ?? [];

  const runsByStatus = useMemo(() => {
    const counters = { success: 0, error: 0, running: 0, skipped: 0 };
    for (const r of runs) counters[r.status] = (counters[r.status] ?? 0) + 1;
    return [
      { status: "Sucesso", count: counters.success, fill: "hsl(160 84% 39%)" },
      { status: "Erro", count: counters.error, fill: "hsl(0 84% 60%)" },
      { status: "Em curso", count: counters.running, fill: "hsl(239 84% 67%)" },
      { status: "Pulado", count: counters.skipped, fill: "hsl(220 9% 60%)" },
    ];
  }, [runs]);

  const cards = [
    { label: "Posts publicados", value: stats?.posts ?? 0, icon: FileText, to: "/admin/posts", color: "text-success" },
    { label: "Agendados", value: stats?.scheduled ?? 0, icon: FileText, to: "/admin/posts", color: "text-accent" },
    { label: "Rascunhos", value: stats?.drafts ?? 0, icon: FileText, to: "/admin/posts", color: "text-warm" },
    { label: "Temas", value: stats?.topics ?? 0, icon: Tag, to: "/admin/topics", color: "text-accent" },
    { label: "Fontes RSS", value: stats?.feeds ?? 0, icon: Rss, to: "/admin/feeds", color: "text-accent" },
  ];

  return (
    <div className="p-8 lg:p-10">
      <div className="mb-8">
        <p className="bp-eyebrow">Painel</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-text-primary">Dashboard</h1>
        <p className="mt-1 text-text-secondary">Visão geral do blog editorial</p>
      </div>

      <OnboardingBanner />

      <div className="mb-10 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Link
              key={c.label}
              to={c.to}
              className="lp-card-elevated group block p-5 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <Icon className={`h-5 w-5 ${c.color}`} />
              <div className="stat-value mt-3">{c.value}</div>
              <div className="stat-label">{c.label}</div>
            </Link>
          );
        })}
      </div>

      <div className="mb-10 grid gap-6 lg:grid-cols-2">
        <section className="lp-card-elevated p-5" aria-labelledby="chart-posts-title">
          <header className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-accent">Publicação</p>
            <h2 id="chart-posts-title" className="text-lg font-bold text-text-primary">
              Posts publicados — últimos 14 dias
            </h2>
          </header>
          <div className="h-56">
            <ResponsiveContainer>
              <AreaChart data={daily} margin={{ top: 0, right: 12, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="postsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(239 84% 67%)" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="hsl(239 84% 67%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  stroke="hsl(var(--text-secondary))"
                  fontSize={11}
                  tickFormatter={(d: string) => d.slice(5)}
                />
                <YAxis stroke="hsl(var(--text-secondary))" fontSize={11} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--bg-elevated))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="hsl(239 84% 67%)"
                  strokeWidth={2}
                  fill="url(#postsGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="lp-card-elevated p-5" aria-labelledby="chart-runs-title">
          <header className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-accent">Pipeline</p>
              <h2 id="chart-runs-title" className="text-lg font-bold text-text-primary">
                Execuções recentes por status
              </h2>
            </div>
            <Link
              to="/admin/logs"
              className="inline-flex items-center gap-1 text-sm text-accent hover:text-accent-hover"
            >
              <Activity className="h-4 w-4" /> Ver logs
            </Link>
          </header>
          <div className="h-56">
            <ResponsiveContainer>
              <BarChart data={runsByStatus} margin={{ top: 0, right: 12, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="status" stroke="hsl(var(--text-secondary))" fontSize={11} />
                <YAxis stroke="hsl(var(--text-secondary))" fontSize={11} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--bg-elevated))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {runsByStatus.map((entry) => (
                    <Cell key={entry.status} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Link
          to="/admin/generate"
          className="lp-card-elevated group block p-6 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
            <Sparkles className="h-5 w-5" />
          </div>
          <h3 className="mt-4 text-lg font-bold tracking-tight text-text-primary">
            Gerar novo post com IA
          </h3>
          <p className="mt-1 text-sm text-text-secondary">
            Use Perplexity + Lovable AI para criar conteúdo factual a partir de RSS curado.
          </p>
          <div className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-accent">
            Gerar agora <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
          </div>
        </Link>
        <Link
          to="/admin/topics"
          className="lp-card-elevated group block p-6 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
            <Tag className="h-5 w-5" />
          </div>
          <h3 className="mt-4 text-lg font-bold tracking-tight text-text-primary">
            Configurar linha editorial
          </h3>
          <p className="mt-1 text-sm text-text-secondary">
            Defina temas, palavras-chave, frequência e modo de publicação (auto ou revisão).
          </p>
          <div className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-accent">
            Gerenciar <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
          </div>
        </Link>
      </div>
    </div>
  );
}
