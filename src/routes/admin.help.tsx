import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { HelpCircle, ChevronDown, ChevronRight, BookOpen, Sparkles, FileText, Tag, Rss, Newspaper, Activity, Settings, Plug, Users, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/admin/help")({
  component: HelpPage,
});

interface FAQItem {
  question: string;
  answer: string;
  icon?: React.ElementType;
}

const faqSections: { title: string; icon: React.ElementType; items: FAQItem[] }[] = [
  {
    title: "Primeiros passos",
    icon: BookOpen,
    items: [
      {
        question: "O que é o Blogpost 4.0?",
        answer:
          "O Blogpost 4.0 é uma plataforma de automação editorial que usa inteligência artificial (Perplexity + Lovable AI) para criar, revisar e publicar posts de blog de forma automatizada ou supervisionada.",
      },
      {
        question: "Como funciona o fluxo básico?",
        answer:
          "O fluxo básico é: configure suas fontes RSS, crie linhas editoriais (temas), escolha o modo de publicação (automático ou revisão) e agende execuções. A plataforma busca notícias, gera posts com IA e publica no seu blog.",
      },
      {
        question: "Qual a diferença entre publicação automática e revisão (rascunho)?",
        answer:
          "No modo automático, os posts são publicados imediatamente após a geração. No modo revisão (rascunho), os posts ficam aguardando aprovação manual antes de ir ao ar.",
      },
    ],
  },
  {
    title: "Linha editorial",
    icon: Tag,
    items: [
      {
        question: "Como criar uma linha editorial?",
        answer:
          "Vá em 'Linha editorial', clique em 'Novo tema', preencha o nome, descrição, palavras-chave, modo de publicação e frequência. Salve para ativar o tema.",
      },
      {
        question: "O que são palavras-chave e como usá-las?",
        answer:
          "As palavras-chave ajudam a IA a filtrar e priorizar notícias relevantes nas fontes RSS. Separe por vírgula (ex: 'inteligência artificial, startups, SaaS'). Quanto mais específico, melhor o conteúdo gerado.",
      },
      {
        question: "Posso editar ou pausar um tema?",
        answer:
          "Sim. Cada tema tem um botão de edição (lápis) e um switch para ativar/desativar. Temas inativos não geram posts automaticamente.",
      },
      {
        question: "Qual a diferença entre agendamento por intervalo e janela diária?",
        answer:
          "Intervalo executa a cada X horas contínuas. Janela diária define um horário fixo do dia (ex: 08h) para executar, respeitando o limite de posts por dia.",
      },
    ],
  },
  {
    title: "Fontes RSS e notícias",
    icon: Rss,
    items: [
      {
        question: "Como adicionar fontes RSS?",
        answer:
          "Em 'Fontes RSS', cole a URL do feed e clique em adicionar. A plataforma valida o feed e passa a monitorar novas notícias automaticamente.",
      },
      {
        question: "O que são as notícias curadas?",
        answer:
          "As notícias curadas são os itens dos feeds RSS que passaram pelo filtro de palavras-chave da sua linha editorial. Elas alimentam a geração de posts.",
      },
      {
        question: "Posso usar qualquer feed RSS?",
        answer:
          "Sim, desde que seja um feed válido no formato RSS/Atom. Recomendamos feeds de notícias, blogs e portais relacionados aos seus temas.",
      },
    ],
  },
  {
    title: "Posts",
    icon: FileText,
    items: [
      {
        question: "Como gerar um post manualmente?",
        answer:
          "Vá em 'Gerar post', selecione o tema e clique em 'Gerar com IA'. Você pode escolher gerar a partir de uma notícia específica ou deixar a IA escolher a melhor fonte.",
      },
      {
        question: "O que acontece com posts em rascunho?",
        answer:
          "Posts em rascunho ficam na aba 'Rascunhos' da tela de Posts. Você pode editar, visualizar, aprovar ou excluir antes de publicar.",
      },
      {
        question: "Posso editar um post gerado pela IA?",
        answer:
          "Sim. Ao abrir um post, você pode editar o título, subtítulo, conteúdo, tags, imagem de capa e SEO antes de publicar ou salvar.",
      },
      {
        question: "Como funciona a geração de imagem de capa?",
        answer:
          "A IA gera automaticamente uma imagem de capa baseada no tema do post. Nas configurações do blog você pode definir o estilo visual. Também é possível fazer upload manual ou gerar múltiplas opções para escolher.",
      },
    ],
  },
  {
    title: "Execuções e logs",
    icon: Activity,
    items: [
      {
        question: "O que são as execuções?",
        answer:
          "As execuções são os processos automáticos da plataforma: busca de notícias, geração de posts e publicação. Cada execução tem um log de status (sucesso, erro, pulado).",
      },
      {
        question: "Como interpretar os logs?",
        answer:
          "Verde = sucesso, vermelho = erro, azul = em andamento, cinza = pulado. Clique em uma execução para ver os detalhes do processamento e eventuais mensagens de erro.",
      },
    ],
  },
  {
    title: "Identidade do blog",
    icon: Settings,
    items: [
      {
        question: "O que configuro em 'Identidade do blog'?",
        answer:
          "Você define o nome do blog, descrição, linguagem padrão, tom de voz, estilo de imagens de capa, dimensões recomendadas e outras preferências visuais.",
      },
      {
        question: "Qual o tamanho ideal da imagem de capa?",
        answer:
          "Recomendamos 1200 x 630 pixels (formato 1.91:1) para redes sociais e 1920 x 1080 para hero images. A plataforma gera nas dimensões configuradas em Identidade do blog.",
      },
    ],
  },
  {
    title: "Integrações",
    icon: Plug,
    items: [
      {
        question: "Quais integrações estão disponíveis?",
        answer:
          "Atualmente suportamos conexões com serviços de IA, webhooks para notificações e futuras integrações com redes sociais e newsletter.",
      },
    ],
  },
  {
    title: "Equipe e segurança",
    icon: Users,
    items: [
      {
        question: "Como convidar membros da equipe?",
        answer:
          "Em 'Equipe', clique em convidar e informe o e-mail. O primeiro usuário do projeto é admin automaticamente. Admins podem convidar e gerenciar permissões.",
      },
      {
        question: "Como funciona o controle de acesso?",
        answer:
          "Apenas usuários aprovados e ativos podem acessar o painel admin. Usuários pendentes de aprovação veem uma tela de espera.",
      },
    ],
  },
];

function HelpPage() {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});

  const toggleSection = (title: string) => {
    setOpenSections((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const toggleItem = (key: string) => {
    setOpenItems((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="p-8 lg:p-10 max-w-4xl mx-auto">
      <div className="mb-8">
        <p className="bp-eyebrow">Suporte</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-text-primary">
          Central de Ajuda
        </h1>
        <p className="mt-1 text-text-secondary">
          Tire suas dúvidas sobre o uso da plataforma Blogpost 4.0
        </p>
      </div>

      <div className="space-y-4">
        {faqSections.map((section) => {
          const SectionIcon = section.icon;
          const isSectionOpen = openSections[section.title] ?? true;

          return (
            <div
              key={section.title}
              className="lp-card-elevated overflow-hidden"
            >
              <button
                onClick={() => toggleSection(section.title)}
                className="flex w-full items-center gap-3 p-5 text-left hover:bg-white/5 transition-colors"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                  <SectionIcon className="h-5 w-5" />
                </div>
                <h2 className="flex-1 text-lg font-semibold text-text-primary">
                  {section.title}
                </h2>
                {isSectionOpen ? (
                  <ChevronDown className="h-5 w-5 text-text-secondary" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-text-secondary" />
                )}
              </button>

              {isSectionOpen && (
                <div className="border-t border-border px-5 pb-5 pt-2 space-y-2">
                  {section.items.map((item, idx) => {
                    const key = `${section.title}-${idx}`;
                    const isOpen = openItems[key] ?? false;

                    return (
                      <div
                        key={key}
                        className="rounded-lg border border-border overflow-hidden"
                      >
                        <button
                          onClick={() => toggleItem(key)}
                          className="flex w-full items-center gap-3 p-4 text-left hover:bg-white/5 transition-colors"
                        >
                          <HelpCircle className="h-4 w-4 shrink-0 text-accent" />
                          <span className="flex-1 text-sm font-medium text-text-primary">
                            {item.question}
                          </span>
                          {isOpen ? (
                            <ChevronDown className="h-4 w-4 text-text-secondary" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-text-secondary" />
                          )}
                        </button>

                        {isOpen && (
                          <div className="border-t border-border px-4 pb-4 pt-3">
                            <p className="text-sm leading-relaxed text-text-secondary">
                              {item.answer}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-10 lp-card-elevated p-6 text-center">
        <Sparkles className="mx-auto h-8 w-8 text-accent mb-3" />
        <h3 className="text-lg font-semibold text-text-primary">
          Ainda com dúvidas?
        </h3>
        <p className="mt-2 text-sm text-text-secondary">
          A plataforma está em constante evolução. Novas funcionalidades e
          melhorias são adicionadas regularmente. Acompanhe as execuções e logs
          para entender melhor o comportamento do sistema.
        </p>
      </div>
    </div>
  );
}
