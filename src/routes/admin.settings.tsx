import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Image as ImageIcon, Loader2, RotateCcw, Save, Upload } from "lucide-react";
import { useProjectConfig, useUpdateConfig } from "@/hooks/queries/useProjectConfig";
import { uploadBrandAsset } from "@/hooks/queries/useProfile";
import {
  EMPTY_ONBOARDING,
  ONBOARDING_STEPS,
  useOnboarding,
  useUpdateOnboarding,
} from "@/hooks/queries/useOnboarding";

export const Route = createFileRoute("/admin/settings")({
  component: SettingsPage,
});

const inputCls =
  "w-full rounded-lg border border-input bg-bg-elevated px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30";

function SettingsPage() {
  const { data: cfg, isLoading } = useProjectConfig();
  const update = useUpdateConfig();

  // Identidade
  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [company, setCompany] = useState("");
  const [url, setUrl] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [faviconUrl, setFaviconUrl] = useState("");

  // Hero / página inicial
  const [heroEyebrow, setHeroEyebrow] = useState("");
  const [heroTitle, setHeroTitle] = useState("");
  const [heroSubtitle, setHeroSubtitle] = useState("");
  const [heroImageUrl, setHeroImageUrl] = useState("");
  const [sectionEyebrow, setSectionEyebrow] = useState("");
  const [sectionTitle, setSectionTitle] = useState("");

  // Imagens padrão
  const [defaultCoverUrl, setDefaultCoverUrl] = useState("");
  const [autoGenerateCover, setAutoGenerateCover] = useState(true);
  const [coverQuality, setCoverQuality] = useState<"standard" | "high">("standard");
  const [coverVariants, setCoverVariants] = useState<"1" | "3">("1");

  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const [uploadingHero, setUploadingHero] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!cfg) return;
    setName(cfg.blog_name ?? "");
    setTagline(cfg.blog_tagline ?? "");
    setCompany(cfg.blog_company ?? "");
    setUrl(cfg.blog_url ?? "");
    setLogoUrl(cfg.blog_logo_url ?? "");
    setFaviconUrl(cfg.blog_favicon_url ?? "");
    setHeroEyebrow(cfg.blog_hero_eyebrow ?? "");
    setHeroTitle(cfg.blog_hero_title ?? "");
    setHeroSubtitle(cfg.blog_hero_subtitle ?? "");
    setHeroImageUrl(cfg.blog_hero_image_url ?? "");
    setSectionEyebrow(cfg.blog_section_eyebrow ?? "");
    setSectionTitle(cfg.blog_section_title ?? "");
    setDefaultCoverUrl(cfg.blog_default_cover_url ?? "");
    setAutoGenerateCover(cfg.auto_generate_cover == null ? true : cfg.auto_generate_cover === "true");
    setCoverQuality(cfg.cover_image_quality === "high" ? "high" : "standard");
    setCoverVariants(cfg.cover_image_variants === "3" ? "3" : "1");
  }, [cfg]);

  const handleUpload = async (
    file: File,
    kind: "logo" | "favicon",
    setUrlFn: (u: string) => void,
    setBusy: (b: boolean) => void,
    label: string,
  ) => {
    setBusy(true);
    try {
      const publicUrl = await uploadBrandAsset(file, kind);
      setUrlFn(publicUrl);
      toast.success(`${label} enviado`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha no upload");
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      await Promise.all([
        update.mutateAsync({ key: "blog_name", value: name.trim() }),
        update.mutateAsync({ key: "blog_tagline", value: tagline.trim() }),
        update.mutateAsync({ key: "blog_company", value: company.trim() }),
        update.mutateAsync({ key: "blog_url", value: url.trim() }),
        update.mutateAsync({ key: "blog_logo_url", value: logoUrl.trim() }),
        update.mutateAsync({ key: "blog_favicon_url", value: faviconUrl.trim() }),
        update.mutateAsync({ key: "blog_hero_eyebrow", value: heroEyebrow.trim() }),
        update.mutateAsync({ key: "blog_hero_title", value: heroTitle.trim() }),
        update.mutateAsync({ key: "blog_hero_subtitle", value: heroSubtitle.trim() }),
        update.mutateAsync({ key: "blog_hero_image_url", value: heroImageUrl.trim() }),
        update.mutateAsync({ key: "blog_section_eyebrow", value: sectionEyebrow.trim() }),
        update.mutateAsync({ key: "blog_section_title", value: sectionTitle.trim() }),
        update.mutateAsync({ key: "blog_default_cover_url", value: defaultCoverUrl.trim() }),
        update.mutateAsync({ key: "auto_generate_cover", value: autoGenerateCover ? "true" : "false" }),
        update.mutateAsync({ key: "cover_image_quality", value: coverQuality }),
        update.mutateAsync({ key: "cover_image_variants", value: coverVariants }),
      ]);
      toast.success("Configurações salvas");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao salvar");
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-text-secondary">Carregando…</div>;
  }

  return (
    <div className="max-w-3xl p-8 lg:p-10">
      <div className="mb-8 animate-fade-in-up">
        <p className="text-xs font-semibold uppercase tracking-widest text-accent">Personalização</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-text-primary">
          Configurações do blog
        </h1>
        <p className="mt-1 text-text-secondary">
          Identidade, hero da home e imagens padrão exibidas para os leitores.
        </p>
      </div>

      {/* Identidade */}
      <section className="lp-card-elevated mb-6 space-y-5 p-6">
        <header>
          <h2 className="text-lg font-semibold text-text-primary">Identidade</h2>
          <p className="text-sm text-text-secondary">Nome, logo e dados de contato.</p>
        </header>

        <Field label="Nome do blog">
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="Ex: Blogpost 4.0" />
        </Field>
        <Field label="Tagline" hint="Frase curta exibida no rodapé / SEO">
          <input value={tagline} onChange={(e) => setTagline(e.target.value)} className={inputCls} placeholder="Conteúdo curado e gerado com IA" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Empresa / responsável">
            <input value={company} onChange={(e) => setCompany(e.target.value)} className={inputCls} placeholder="Ex: Acme Inc." />
          </Field>
          <Field label="URL do blog">
            <input value={url} onChange={(e) => setUrl(e.target.value)} className={inputCls} placeholder="https://meublog.com" />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <BrandUploader
            label="Logo"
            url={logoUrl}
            uploading={uploadingLogo}
            onPick={(f) => handleUpload(f, "logo", setLogoUrl, setUploadingLogo, "Logo")}
            onClear={() => setLogoUrl("")}
          />
          <BrandUploader
            label="Favicon"
            url={faviconUrl}
            uploading={uploadingFavicon}
            onPick={(f) => handleUpload(f, "favicon", setFaviconUrl, setUploadingFavicon, "Favicon")}
            onClear={() => setFaviconUrl("")}
          />
        </div>
      </section>

      {/* Hero da home */}
      <section className="lp-card-elevated mb-6 space-y-5 p-6">
        <header>
          <h2 className="text-lg font-semibold text-text-primary">Página inicial (hero)</h2>
          <p className="text-sm text-text-secondary">
            Textos e imagem do topo da home. Use <code className="rounded bg-bg-surface-2 px-1">**palavra**</code> no título para destacá-la em gradiente.
          </p>
        </header>

        <Field label="Etiqueta (eyebrow)" hint="Pequeno badge acima do título">
          <input value={heroEyebrow} onChange={(e) => setHeroEyebrow(e.target.value)} className={inputCls} placeholder="Conteúdo editorial com IA" />
        </Field>
        <Field label="Título" hint="Ex: Insights **técnicos** em tempo real">
          <input value={heroTitle} onChange={(e) => setHeroTitle(e.target.value)} className={inputCls} placeholder="Insights **técnicos** em tempo real" />
        </Field>
        <Field label="Subtítulo">
          <textarea
            value={heroSubtitle}
            onChange={(e) => setHeroSubtitle(e.target.value)}
            className={`${inputCls} min-h-20 resize-y`}
            placeholder="Análises curadas a partir de fontes RSS confiáveis…"
          />
        </Field>

        <BrandUploader
          label="Imagem de fundo do hero (opcional)"
          url={heroImageUrl}
          uploading={uploadingHero}
          onPick={(f) => handleUpload(f, "logo", setHeroImageUrl, setUploadingHero, "Imagem do hero")}
          onClear={() => setHeroImageUrl("")}
          wide
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Etiqueta da seção de posts">
            <input value={sectionEyebrow} onChange={(e) => setSectionEyebrow(e.target.value)} className={inputCls} placeholder="Últimas publicações" />
          </Field>
          <Field label="Título da seção de posts">
            <input value={sectionTitle} onChange={(e) => setSectionTitle(e.target.value)} className={inputCls} placeholder="Do feed para a redação" />
          </Field>
        </div>
      </section>

      {/* Imagens padrão */}
      <section className="lp-card-elevated mb-6 space-y-5 p-6">
        <header>
          <h2 className="text-lg font-semibold text-text-primary">Imagens padrão</h2>
          <p className="text-sm text-text-secondary">
            Capa exibida nos cards e no topo do post quando o post não tem imagem própria.
          </p>
        </header>

        <BrandUploader
          label="Capa padrão dos posts (recomendado 1600×900)"
          url={defaultCoverUrl}
          uploading={uploadingCover}
          onPick={(f) => handleUpload(f, "logo", setDefaultCoverUrl, setUploadingCover, "Capa padrão")}
          onClear={() => setDefaultCoverUrl("")}
          wide
        />

        <label className="flex items-start gap-3 rounded-lg border border-border bg-bg-surface-1 p-4 cursor-pointer">
          <input
            type="checkbox"
            checked={autoGenerateCover}
            onChange={(e) => setAutoGenerateCover(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-accent"
          />
          <div className="flex-1">
            <div className="text-sm font-medium text-text-primary">
              Gerar capa automaticamente com IA ao criar post
            </div>
            <p className="mt-1 text-xs text-text-secondary">
              Quando ligado, cada novo post gerado pelo pipeline recebe uma capa criada por IA (Lovable AI — Gemini Nano Banana) a partir do título e do resumo. Se desligado, o post usa a capa padrão acima ou fica sem imagem. Você sempre pode trocar a capa manualmente no editor.
            </p>
          </div>
        </label>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field
            label="Qualidade da imagem gerada"
            hint="Padrão = Gemini Nano Banana 2 (rápido). Alta = Gemini 3 Pro Image (mais lento e mais caro)."
          >
            <select
              value={coverQuality}
              onChange={(e) => setCoverQuality(e.target.value as "standard" | "high")}
              className={inputCls}
            >
              <option value="standard">Padrão (Nano Banana 2)</option>
              <option value="high">Alta (Gemini 3 Pro Image)</option>
            </select>
          </Field>
          <Field
            label="Variações ao gerar manualmente"
            hint="Geração automática do pipeline sempre cria 1 imagem. Aqui você escolhe o que acontece quando você clica em 'Gerar com IA' no editor."
          >
            <select
              value={coverVariants}
              onChange={(e) => setCoverVariants(e.target.value as "1" | "3")}
              className={inputCls}
            >
              <option value="1">1 imagem</option>
              <option value="3">3 opções para escolher</option>
            </select>
          </Field>
        </div>
      </section>

      <button
        onClick={save}
        disabled={saving}
        className="lp-btn-primary-indigo w-full py-3"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Salvar configurações
      </button>

      <OnboardingSection />
    </div>
  );
}

function OnboardingSection() {
  const navigate = useNavigate();
  const { data: state } = useOnboarding();
  const updateOnboarding = useUpdateOnboarding();
  const [resetting, setResetting] = useState(false);

  const redo = async () => {
    setResetting(true);
    try {
      // Zera só o progresso. Os valores já salvos (identidade, chaves, tema,
      // perfil) continuam de pé e reaparecem preenchidos no wizard.
      await updateOnboarding.mutateAsync(EMPTY_ONBOARDING);
      navigate({ to: "/admin/onboarding" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao reiniciar o onboarding");
    } finally {
      setResetting(false);
    }
  };

  const doneCount = state?.done.length ?? 0;

  return (
    <section className="lp-card-elevated mt-6 space-y-4 p-6">
      <header>
        <h2 className="text-lg font-semibold text-text-primary">Onboarding</h2>
        <p className="text-sm text-text-secondary">
          O guia de configuração inicial em {ONBOARDING_STEPS.length} etapas.
          {state && (
            <>
              {" "}
              Você concluiu <strong>{doneCount}</strong> de {ONBOARDING_STEPS.length}.
            </>
          )}
        </p>
      </header>

      <p className="text-xs text-text-tertiary">
        Refazer não apaga nada: as configurações já salvas aparecem preenchidas e você pode
        revisar ou completar as etapas que pulou.
      </p>

      <button onClick={redo} disabled={resetting} className="lp-btn-secondary">
        {resetting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <RotateCcw className="h-4 w-4" />
        )}
        Refazer onboarding
      </button>
    </section>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-text-primary">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-text-tertiary">{hint}</p>}
    </div>
  );
}

function BrandUploader({
  label,
  url,
  uploading,
  onPick,
  onClear,
  wide = false,
}: {
  label: string;
  url: string;
  uploading: boolean;
  onPick: (file: File) => void;
  onClear: () => void;
  wide?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-text-primary">{label}</label>
      <div className="flex items-center gap-3">
        <div
          className={`flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-bg-base ${
            wide ? "h-20 w-36" : "h-16 w-16"
          }`}
        >
          {url ? (
            <img src={url} alt={label} className="h-full w-full object-cover" />
          ) : (
            <ImageIcon className="h-6 w-6 text-text-tertiary" />
          )}
        </div>
        <div className="flex flex-col gap-1">
          <label className="lp-btn-secondary cursor-pointer text-xs">
            {uploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Upload className="h-3.5 w-3.5" />
            )}
            {url ? "Trocar" : "Enviar"}
            <input
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => e.target.files?.[0] && onPick(e.target.files[0])}
            />
          </label>
          {url && (
            <button onClick={onClear} className="text-xs text-text-tertiary hover:text-destructive">
              Remover
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
