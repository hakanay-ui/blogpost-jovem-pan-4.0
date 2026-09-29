import { createFileRoute, notFound, redirect } from "@tanstack/react-router";

const LEGACY_ROUTE_REDIRECTS: Record<string, string> = {
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

export const Route = createFileRoute("/$")({
  beforeLoad: ({ location }) => {
    const target = LEGACY_ROUTE_REDIRECTS[location.pathname];

    if (target) {
      throw redirect({ to: target, replace: true });
    }

    throw notFound();
  },
  component: () => null,
});