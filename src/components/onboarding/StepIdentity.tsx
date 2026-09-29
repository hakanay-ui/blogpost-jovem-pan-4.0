import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Image as ImageIcon, Loader2, Upload } from "lucide-react";
import { useProjectConfig, useUpdateConfig } from "@/hooks/queries/useProjectConfig";
import { uploadBrandAsset } from "@/hooks/queries/useProfile";
import { Field, StepFooter, inputCls, type StepProps } from "./shared";

export function StepIdentity({ onDone, onSkip, onBack, isFirst, isLast }: StepProps) {
  const { data: cfg, isLoading } = useProjectConfig();
  const update = useUpdateConfig();

  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [company, setCompany] = useState("");
  const [url, setUrl] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Reidrata a partir do project_config: é isso que faz o "fechei na metade e
  // voltei" funcionar — os valores já estão salvos de verdade, não num rascunho.
  useEffect(() => {
    if (!cfg) return;
    setName(cfg.blog_name ?? "");
    setTagline(cfg.blog_tagline ?? "");
    setCompany(cfg.blog_company ?? "");
    setUrl(cfg.blog_url ?? "");
    setLogoUrl(cfg.blog_logo_url ?? "");
  }, [cfg]);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      setLogoUrl(await uploadBrandAsset(file, "logo"));
      toast.success("Logo enviado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha no upload");
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!name.trim()) {
      toast.error("Dê um nome ao blog para continuar (ou pule esta etapa).");
      return;
    }
    setSaving(true);
    try {
      await Promise.all([
        update.mutateAsync({ key: "blog_name", value: name.trim() }),
        update.mutateAsync({ key: "blog_tagline", value: tagline.trim() }),
        update.mutateAsync({ key: "blog_company", value: company.trim() }),
        update.mutateAsync({ key: "blog_url", value: url.trim() }),
        update.mutateAsync({ key: "blog_logo_url", value: logoUrl.trim() }),
      ]);
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao salvar");
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <div className="text-text-secondary">Carregando…</div>;

  return (
    <div className="space-y-5">
      <Field label="Nome do blog">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={inputCls}
          placeholder="Ex: Blogpost 4.0"
        />
      </Field>

      <Field label="Tagline" hint="Frase curta usada no rodapé e no SEO.">
        <input
          value={tagline}
          onChange={(e) => setTagline(e.target.value)}
          className={inputCls}
          placeholder="Conteúdo curado e gerado com IA"
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Empresa / responsável">
          <input
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            className={inputCls}
            placeholder="Ex: Acme Inc."
          />
        </Field>
        <Field label="URL do blog">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className={inputCls}
            placeholder="https://meublog.com"
          />
        </Field>
      </div>

      <Field label="Logo" hint="Você pode trocar depois em Identidade do blog.">
        <div className="flex items-center gap-3">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-bg-base">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="h-full w-full object-cover" />
            ) : (
              <ImageIcon className="h-6 w-6 text-text-tertiary" />
            )}
          </div>
          <label className="lp-btn-secondary cursor-pointer text-xs">
            {uploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Upload className="h-3.5 w-3.5" />
            )}
            {logoUrl ? "Trocar" : "Enviar"}
            <input
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
            />
          </label>
        </div>
      </Field>

      <StepFooter
        saving={saving}
        onSave={save}
        onSkip={onSkip}
        onBack={onBack}
        isFirst={isFirst}
        isLast={isLast}
      />
    </div>
  );
}
