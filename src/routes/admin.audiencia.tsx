import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { CalendarDays, Eye, Users, Globe, Mail, ExternalLink, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { audienceQueryOptions } from "@/lib/audience.queries";
import { audienceDateLabel } from "@/lib/audience";

export const Route = createFileRoute("/admin/audiencia")({
  head: () => ({
    meta: [
      { title: "Audiência | Jovem Pan Goiás" },
      { name: "description", content: "Indicadores de audiência da Jovem Pan Goiás: visitas, sessões, páginas mais acessadas e origens de tráfego." },
      { property: "og:title", content: "Audiência | Jovem Pan Goiás" },
      { property: "og:description", content: "Painel de audiência e tráfego do blog da Jovem Pan Goiás." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  loader: async ({ context }) => { await context.queryClient.ensureQueryData(audienceQueryOptions); },
  pendingComponent: () => <div className="p-6 text-text-secondary sm:p-8 lg:p-10" role="status">Carregando audiência…</div>,
  errorComponent: AudienceError,
  notFoundComponent: () => <div className="p-8">Página de audiência não encontrada.</div>,
  component: AudiencePage,
});

const number = new Intl.NumberFormat("pt-BR");
const chartConfig = { visits: { label: "Visitas", color: "hsl(var(--accent-primary))" } };

function AudienceError() {
  const router = useRouter();
  const queryClient = useQueryClient();
  return (
    <div className="p-6 sm:p-8 lg:p-10" role="alert">
      <h1 className="text-2xl font-bold">Audiência</h1>
      <p className="my-4 text-text-secondary">Não foi possível carregar os dados de audiência.</p>
      <Button variant="outline" onClick={async () => {
        await queryClient.resetQueries({ queryKey: audienceQueryOptions.queryKey });
        await router.invalidate();
      }}><RefreshCw /> Tentar novamente</Button>
    </div>
  );
}

function AudiencePage() {
  const { data, isFetching, refetch, isRefetchError } = useSuspenseQuery(audienceQueryOptions);
  const metrics = [
    { label: "Últimas 24h", value: data.last24h, icon: Eye },
    { label: "Últimos 7 dias", value: data.last7days, icon: CalendarDays },
    { label: "Últimos 30 dias", value: data.last30days, icon: CalendarDays },
    { label: "Sessões (7 dias)", value: data.sessions7days, icon: Users },
    { label: "Total de visitas", value: data.total, icon: Globe },
    { label: "Assinantes da newsletter", value: null, icon: Mail },
  ];

  return (
    <div className="p-5 sm:p-8 lg:p-10">
      <header className="mb-7 flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase text-accent">Painel</p>
          <h1 className="mt-1 text-3xl font-bold text-text-primary">Audiência</h1>
          <p className="mt-2 text-sm leading-relaxed text-text-secondary">Visitas das páginas públicas da Jovem Pan Goiás.</p>
        </div>
        <Button variant="outline" size="icon" aria-label="Atualizar audiência" title="Atualizar audiência" disabled={isFetching} onClick={() => void refetch()}>
          <RefreshCw className={isFetching ? "animate-spin motion-reduce:animate-none" : ""} />
        </Button>
      </header>

      {isRefetchError && <p role="alert" className="mb-4 text-sm text-destructive">Não foi possível atualizar. Os últimos dados carregados foram mantidos.</p>}

      <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {metrics.map(({ label, value, icon: Icon }) => (
          <article key={label} className="min-w-0 rounded-lg border border-border bg-bg-elevated p-4 shadow-elevation-1">
            <Icon className="h-4 w-4 text-accent" aria-hidden="true" />
            <p className="mt-4 text-[28px] font-bold leading-none tabular-nums text-text-primary">{value === null ? "—" : number.format(value)}</p>
            <p className="mt-2 text-xs leading-relaxed text-text-secondary">{label}</p>
            {value === null && <p className="mt-1 text-[10px] text-text-tertiary">Não conectada</p>}
          </article>
        ))}
      </div>

      <section className="border-y border-border py-6" aria-labelledby="audience-traffic">
        <p className="text-[10px] font-semibold uppercase text-accent">Tráfego</p>
        <h2 id="audience-traffic" className="mt-1 text-base font-bold">Visitas por dia (30 dias)</h2>
        <ChartContainer config={chartConfig} className="mt-5 h-[260px] w-full aspect-auto sm:h-[290px]">
          <AreaChart accessibilityLayer data={data.daily} margin={{ top: 8, right: 10, left: -22, bottom: 0 }}>
            <defs>
              <linearGradient id="audience-visits-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-visits)" stopOpacity={0.2} />
                <stop offset="100%" stopColor="var(--color-visits)" stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
            <XAxis dataKey="date" tickFormatter={audienceDateLabel} tickLine={false} axisLine={false} minTickGap={20} fontSize={10} tickMargin={10} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={10} domain={[0, (max: number) => Math.max(4, max)]} />
            <ChartTooltip content={<ChartTooltipContent labelFormatter={(label) => audienceDateLabel(String(label))} />} />
            <Area dataKey="visits" type="monotone" stroke="var(--color-visits)" strokeWidth={2} fill="url(#audience-visits-fill)" isAnimationActive={false} />
          </AreaChart>
        </ChartContainer>
        {data.total === 0 && <p className="mt-3 text-xs text-text-tertiary">Ainda não há visitas registradas.</p>}
        <p className="mt-3 text-[11px] text-text-tertiary">Horário de Brasília{data.firstVisit ? ` · Registro desde ${new Date(data.firstVisit).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}` : ""}</p>
      </section>

      <div className="grid gap-8 pt-7 lg:grid-cols-2">
        <section aria-labelledby="audience-pages">
          <p className="text-[10px] font-semibold uppercase text-accent">Conteúdo</p>
          <h2 id="audience-pages" className="mt-1 text-base font-bold">Páginas mais visitadas (30 dias)</h2>
          <div className="mt-4">
            {data.pages.length === 0 ? <EmptyRows /> : data.pages.map((page) => (
              <div key={page.path} className="flex items-center justify-between gap-4 border-b border-border py-3 text-xs">
                <a href={page.path} target="_blank" rel="noopener noreferrer" className="inline-flex min-w-0 items-center gap-1.5 text-text-secondary hover:text-accent">
                  <span className="break-all">{page.path === "/" ? "Página inicial" : page.path}</span>
                  <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
                </a>
                <span className="shrink-0 font-medium tabular-nums">{number.format(page.visits)}</span>
              </div>
            ))}
          </div>
        </section>
        <section aria-labelledby="audience-sources">
          <p className="text-[10px] font-semibold uppercase text-accent">Aquisição</p>
          <h2 id="audience-sources" className="mt-1 text-base font-bold">Principais origens (30 dias)</h2>
          <div className="mt-4">
            {data.sources.length === 0 ? <EmptyRows /> : data.sources.map((source) => (
              <div key={source.source} className="flex items-center justify-between gap-4 border-b border-border py-3 text-xs">
                <span className="min-w-0 break-all text-text-secondary">{source.source}</span>
                <span className="shrink-0 font-medium tabular-nums">{number.format(source.visits)}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function EmptyRows() {
  return <p className="border-t border-border py-5 text-xs text-text-tertiary">Nenhum dado registrado neste período.</p>;
}