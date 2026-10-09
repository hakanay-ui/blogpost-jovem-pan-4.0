import { Outlet, createRootRouteWithContext, HeadContent, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-base px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-extrabold text-accent">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-text-primary">Página não encontrada</h2>
        <p className="mt-2 text-sm text-text-secondary">O conteúdo que você procura não existe ou foi movido.</p>
        <a href="/" className="jp-btn-outline mt-6">
          Voltar para a página inicial
        </a>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Jovem Pan Goiás — Notícias de Goiânia, Caldas Novas e Goiás" },
      { name: "description", content: "O jornal local da Jovem Pan em Goiás: Goiânia 106,7 e Caldas Novas 105,7." },
      { name: "theme-color", content: "#DD0510" },
      { property: "og:site_name", content: "Jovem Pan Goiás" },
      { property: "og:title", content: "Jovem Pan Goiás" },
      { property: "og:description", content: "Notícias de Goiânia, Caldas Novas e Goiás." },
      { property: "og:type", content: "website" },
      { property: "og:locale", content: "pt_BR" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Jovem Pan Goiás" },
      { name: "twitter:description", content: "Notícias de Goiânia, Caldas Novas e Goiás." },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      // Montserrat: alternativa livre à Gotham (fonte oficial do manual JP).
      // Barlow Condensed: linha "cidade | dial" do logo.
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&family=Barlow+Condensed:wght@600;700&display=swap",
      },
      { rel: "icon", type: "image/png", href: "/brand/favicon-64.png" },
      { rel: "apple-touch-icon", href: "/brand/favicon-64.png" },
      {
        rel: "alternate",
        type: "application/rss+xml",
        title: "Jovem Pan Goiás — RSS",
        href: "/feed.xml",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <Outlet />
            <Toaster position="top-right" richColors />
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head><HeadContent /></head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
