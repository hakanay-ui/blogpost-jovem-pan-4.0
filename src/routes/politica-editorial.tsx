import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { PublicLayout } from "@/layouts/PublicLayout";
import { useProjectConfig } from "@/hooks/queries/useProjectConfig";
import { SITE, siteUrl } from "@/lib/site";

export const Route = createFileRoute("/politica-editorial")({
  head: () => ({
    meta: [
      { title: `Política editorial e uso de IA | ${SITE.name}` },
      {
        name: "description",
        content:
          "Como a Jovem Pan Goiás produz notícias com apoio de inteligência artificial, e o que nunca publicamos.",
      },
    ],
    links: [{ rel: "canonical", href: `${siteUrl()}/politica-editorial` }],
  }),
  component: EditorialPolicyPage,
});

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="border-t-2 border-accent pt-3 text-xs font-extrabold uppercase tracking-[0.12em]">
        {title}
      </h2>
      <div className="mt-3 space-y-3 text-[1.0625rem] leading-relaxed text-text-primary">
        {children}
      </div>
    </section>
  );
}

function EditorialPolicyPage() {
  const { data: cfg } = useProjectConfig();
  const correctionsEmail = cfg?.blog_corrections_email?.trim();
  return (
    <PublicLayout>
      <article className="jp-container py-14">
        <div className="mx-auto max-w-[720px]">
          <p className="jp-kicker">Institucional</p>
          <h1 className="jp-headline mt-2 text-3xl sm:text-4xl">Política editorial e uso de IA</h1>
          <p className="mt-4 text-lg text-text-secondary">
            Este blog é o jornal local da Jovem Pan em Goiás: o que acontece em Goiânia, em Caldas
            Novas e no estado e afeta a vida de quem mora aqui. O nacional entra só quando tem
            impacto local claro.
          </p>

          <Section title="Como usamos inteligência artificial">
            <p>
              A Redação Jovem Pan Goiás usa inteligência artificial para acompanhar fontes de
              notícia e órgãos públicos, apurar e redigir matérias. Toda matéria feita com apoio de
              IA é assinada como "Redação Jovem Pan Goiás (com IA)" e lista, no fim, as fontes
              usadas, com link.
            </p>
            <p>
              A IA relata fatos e declarações, com aspas, nome e cargo. Ela não escreve opinião.
              Opinião é dos comentaristas da rádio, que assinam o que escrevem.
            </p>
            <p>
              Antes de publicar, o sistema barra automaticamente: assunto repetido nas últimas 72
              horas, texto incompleto, fonte que não trata do assunto ou link quebrado, número que
              não aparece nas fontes, e matéria sem imagem ou sem editoria.
            </p>
          </Section>

          <Section title="Revisão humana">
            <p>
              Política, polícia e justiça, acusação contra pessoa ou empresa, alertas de saúde
              pública e qualquer matéria que cite um anunciante da rádio só vão ao ar depois de
              aprovadas por uma pessoa da redação.
            </p>
          </Section>

          <Section title="O que não publicamos">
            <ul className="list-disc space-y-1.5 pl-5">
              <li>Opinião política escrita por IA.</li>
              <li>Pesquisa eleitoral sem número de registro no TSE.</li>
              <li>
                Boato, vazamento ou "post viral" sem confirmação de fonte oficial ou de dois
                veículos.
              </li>
              <li>
                Crime contado de forma sensacionalista. Não publicamos nome e foto de suspeito sem
                indiciamento ou prisão confirmada, nem nome ou rosto de menor de idade e de vítima
                de violência sexual.
              </li>
              <li>
                Fofoca de celebridade, horóscopo, apostas e bets, e publieditorial disfarçado.
              </li>
            </ul>
          </Section>

          <Section title="Imagens">
            <p>
              Usamos, de preferência, fotos de fontes oficiais, com crédito. Quando não há, a capa é
              uma imagem ilustrativa gerada por IA, sem rosto de pessoa real, identificada com a
              legenda "Imagem ilustrativa gerada por IA".
            </p>
          </Section>

          <Section title="Correções">
            <p>
              Erros são corrigidos na própria matéria, com a data de atualização visível.
              {correctionsEmail ? (
                <>
                  {" "}
                  Para apontar um erro, escreva para{" "}
                  <a
                    href={`mailto:${correctionsEmail}`}
                    className="text-accent underline underline-offset-2"
                  >
                    {correctionsEmail}
                  </a>
                  .
                </>
              ) : null}
            </p>
          </Section>
        </div>
      </article>
    </PublicLayout>
  );
}
