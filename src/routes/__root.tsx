import { Outlet, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { Toaster } from "sonner";
import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-base px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-extrabold gradient-text">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-text-primary">Página não encontrada</h2>
        <p className="mt-2 text-sm text-text-secondary">O conteúdo que você procura não existe ou foi movido.</p>
        <a href="/" className="lp-btn-primary-indigo mt-6">
          Voltar para o blog
        </a>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "[VIA] Viver de IA - Solução de Blog" },
      { name: "description", content: "AI-powered blog and content generation tool." },
      { property: "og:title", content: "[VIA] Viver de IA - Solução de Blog" },
      { property: "og:description", content: "AI-powered blog and content generation tool." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "[VIA] Viver de IA - Solução de Blog" },
      { name: "twitter:description", content: "AI-powered blog and content generation tool." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/842efe89-97a3-4f74-9e7e-0ba19ba818f4/id-preview-ea5d258a--1d6adbdc-0d62-4236-b302-988a8db4bad7.lovable.app-1776982152645.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/842efe89-97a3-4f74-9e7e-0ba19ba818f4/id-preview-ea5d258a--1d6adbdc-0d62-4236-b302-988a8db4bad7.lovable.app-1776982152645.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700;800&display=swap" },
      // Inter mantida como fallback do stack --font-sans.
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" },
      {
        rel: "alternate",
        type: "application/rss+xml",
        title: "EditorIA — RSS",
        href: "/feed.xml",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootComponent() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );
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
