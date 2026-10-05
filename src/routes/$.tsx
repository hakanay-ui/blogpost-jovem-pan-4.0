import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { LEGACY_ROUTE_REDIRECTS } from "@/lib/site";


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