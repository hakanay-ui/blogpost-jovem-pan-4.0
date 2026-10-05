import { createFileRoute } from "@tanstack/react-router";
import { Radio } from "lucide-react";
import { PublicLayout } from "@/layouts/PublicLayout";
import { useProjectConfig } from "@/hooks/queries/useProjectConfig";
import { SITE, siteUrl } from "@/lib/site";

export const Route = createFileRoute("/ao-vivo")({
  head: () => ({
    meta: [
      { title: `Ouça ao vivo | ${SITE.name}` },
      {
        name: "description",
        content: "Ouça a Jovem Pan FM Goiânia 106,7 e Caldas Novas 105,7 ao vivo.",
      },
    ],
    links: [{ rel: "canonical", href: `${siteUrl()}/ao-vivo` }],
  }),
  component: LivePage,
});

function LivePage() {
  const { data: cfg } = useProjectConfig();
  const players = [
    { ...SITE.pracas[0], url: cfg?.blog_player_url_goiania?.trim() },
    { ...SITE.pracas[1], url: cfg?.blog_player_url_caldas?.trim() },
  ];
  return (
    <PublicLayout>
      <div className="jp-container py-14">
        <p className="jp-kicker">Ao vivo</p>
        <h1 className="jp-headline mt-2 text-3xl sm:text-4xl">Ouça a Jovem Pan em Goiás</h1>
        <p className="mt-3 max-w-xl text-text-secondary">
          Música, informação e entretenimento. Escolha a sua praça.
        </p>
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {players.map((p) => (
            <div key={p.slug} className="rounded-lg bg-[#111] p-8 text-white">
              <img src={SITE.markUrl} alt="Jovem Pan FM" className="h-14 w-auto" />
              <p className="jp-condensed mt-5 text-4xl text-white">
                {p.city} <span className="text-[#ff3b44]">|</span> {p.dial}
              </p>
              {p.url ? (
                <a
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="jp-btn-red mt-6 !h-11 !px-6"
                >
                  <Radio className="h-4 w-4" /> Ouvir agora
                </a>
              ) : (
                <p className="mt-6 text-sm text-white/60">
                  Player on-line em breve. Sintonize {p.dial} FM.
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </PublicLayout>
  );
}
