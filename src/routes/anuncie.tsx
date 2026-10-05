import { createFileRoute } from "@tanstack/react-router";
import { Mail, MessageCircle } from "lucide-react";
import { PublicLayout } from "@/layouts/PublicLayout";
import { useProjectConfig } from "@/hooks/queries/useProjectConfig";
import { SITE, siteUrl } from "@/lib/site";

export const Route = createFileRoute("/anuncie")({
  head: () => ({
    meta: [
      { title: `Anuncie | ${SITE.name}` },
      {
        name: "description",
        content: "Anuncie na Jovem Pan Goiás: rádio, blog e newsletter em Goiânia e Caldas Novas.",
      },
    ],
    links: [{ rel: "canonical", href: `${siteUrl()}/anuncie` }],
  }),
  component: AdvertisePage,
});

function AdvertisePage() {
  const { data: cfg } = useProjectConfig();
  const email = cfg?.blog_commercial_email?.trim();
  const whatsapp = cfg?.blog_commercial_whatsapp?.replace(/\D/g, "");
  return (
    <PublicLayout>
      <div className="jp-container py-14">
        <div className="mx-auto max-w-[720px]">
          <p className="jp-kicker">Comercial</p>
          <h1 className="jp-headline mt-2 text-3xl sm:text-4xl">Anuncie na Jovem Pan Goiás</h1>
          <p className="mt-4 text-lg text-text-secondary">
            Fale com quem mora em Goiânia, Caldas Novas e região: na rádio, no blog e na newsletter
            diária.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              ["Rádio", "Goiânia 106,7 e Caldas Novas 105,7"],
              ["Blog", "Espaços no topo, entre parágrafos e na lateral"],
              ["Newsletter", "Destaques do dia, todas as manhãs às 6h"],
            ].map(([t, d]) => (
              <div key={t} className="border-t-2 border-accent pt-3">
                <p className="font-bold">{t}</p>
                <p className="mt-1 text-sm text-text-secondary">{d}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 rounded-lg border border-border bg-bg-elevated p-6">
            <p className="font-bold">Fale com o comercial</p>
            {email || whatsapp ? (
              <div className="mt-4 flex flex-wrap gap-3">
                {whatsapp && (
                  <a
                    href={`https://wa.me/${whatsapp}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="jp-btn-red"
                  >
                    <MessageCircle className="h-4 w-4" /> WhatsApp
                  </a>
                )}
                {email && (
                  <a href={`mailto:${email}`} className="jp-btn-outline">
                    <Mail className="h-4 w-4" /> {email}
                  </a>
                )}
              </div>
            ) : (
              <p className="mt-2 text-sm text-text-secondary">Contato comercial em breve.</p>
            )}
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
