import { useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2, Sparkles, X, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useProjectConfig } from "@/hooks/queries/useProjectConfig";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = /^image\/(jpeg|png|webp|avif|gif)$/i;

type Props = {
  value: string | null;
  onChange: (url: string | null) => void;
  /** Slug/id usado para nomear o arquivo de forma estável. */
  pathPrefix: string;
  /** Contexto opcional usado no prompt padrão de IA. */
  postContext?: { title?: string; excerpt?: string };
};

export function CoverUploader({ value, onChange, pathPrefix, postContext }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [variants, setVariants] = useState<{ url: string; path: string }[] | null>(null);
  const { data: cfg } = useProjectConfig();
  const variantsMode = cfg?.cover_image_variants === "3" ? 3 : 1;
  const quality = cfg?.cover_image_quality === "high" ? "high" : "standard";

  async function handleFile(file: File) {
    if (!ALLOWED.test(file.type)) {
      toast.error("Formato não suportado. Use JPG, PNG, WebP, AVIF ou GIF.");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Imagem muito grande (máximo 5MB).");
      return;
    }
    setUploading(true);
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${pathPrefix}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("post-covers")
        .upload(path, file, { cacheControl: "3600", upsert: true, contentType: file.type });
      if (error) throw error;
      const { data } = supabase.storage.from("post-covers").getPublicUrl(path);
      onChange(data.publicUrl);
      toast.success("Capa atualizada");
    } catch (e: any) {
      toast.error(e.message ?? "Falha no upload");
    } finally {
      setUploading(false);
    }
  }

  async function generateWithAi() {
    setGenerating(true);
    setVariants(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke("generate-cover-image", {
        body: {
          prompt: aiPrompt.trim() || undefined,
          postId: pathPrefix,
          title: postContext?.title,
          excerpt: postContext?.excerpt,
          quality,
          count: variantsMode,
        },
        headers: session ? { Authorization: `Bearer ${session.access_token}` } : undefined,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (variantsMode === 3) {
        const list = (data?.variants ?? []) as { url: string; path: string }[];
        if (list.length === 0) throw new Error("Nenhuma variação retornada");
        setVariants(list);
        toast.success(`${list.length} opções geradas — escolha a sua favorita`);
      } else {
        if (!data?.url) throw new Error("Resposta sem URL");
        onChange(data.url);
        toast.success("Capa gerada com IA");
        setAiOpen(false);
        setAiPrompt("");
      }
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao gerar imagem");
    } finally {
      setGenerating(false);
    }
  }

  async function pickVariant(picked: { url: string; path: string }) {
    if (!variants) return;
    const others = variants.filter((v) => v.path !== picked.path).map((v) => v.path);
    onChange(picked.url);
    setVariants(null);
    setAiOpen(false);
    setAiPrompt("");
    toast.success("Capa definida");
    if (others.length > 0) {
      // Limpa as variações não escolhidas do storage (best-effort).
      supabase.storage.from("post-covers").remove(others).catch(() => {});
    }
  }

  function discardVariants() {
    if (!variants) return;
    const paths = variants.map((v) => v.path);
    setVariants(null);
    supabase.storage.from("post-covers").remove(paths).catch(() => {});
  }

  const hasContext = !!(postContext?.title?.trim());
  const generateLabel = variantsMode === 3 ? "Gerar 3 opções com IA" : "Gerar com IA";

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />
      {value ? (
        <div className="relative overflow-hidden rounded-lg border border-border">
          <img src={value} alt="Capa" className="aspect-video w-full object-cover" />
          <div className="absolute right-2 top-2 flex gap-1">
            <button
              type="button"
              onClick={() => setAiOpen(true)}
              className="rounded-md bg-black/60 px-2 py-1 text-xs font-medium text-white backdrop-blur hover:bg-black/70"
              disabled={generating || uploading}
              title="Gerar nova capa com IA"
            >
              <Sparkles className="mr-1 inline h-3 w-3" /> IA
            </button>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="rounded-md bg-black/60 px-2 py-1 text-xs font-medium text-white backdrop-blur hover:bg-black/70"
              disabled={uploading}
            >
              Trocar
            </button>
            <button
              type="button"
              onClick={() => onChange(null)}
              className="rounded-md bg-black/60 p-1.5 text-white backdrop-blur hover:bg-destructive/80"
              title="Remover"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading || generating}
            className="flex aspect-video w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-bg-surface-1 text-sm text-text-secondary transition-colors hover:border-accent hover:text-accent"
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Enviando…
              </>
            ) : (
              <>
                <ImagePlus className="h-5 w-5" /> Enviar imagem
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => setAiOpen(true)}
            disabled={generating || uploading}
            className="flex aspect-video w-full flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-accent/40 bg-accent/5 text-sm font-medium text-accent transition-colors hover:border-accent hover:bg-accent/10"
          >
            {generating ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Gerando imagem…</span>
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5" />
                <span>{generateLabel}</span>
              </>
            )}
          </button>
        </div>
      )}

      {aiOpen && (
        <div className="rounded-lg border border-border bg-bg-surface-1 p-4">
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm font-medium text-text-primary">
              <Sparkles className="mr-1 inline h-4 w-4 text-accent" />
              {variantsMode === 3 ? "Gerar 3 opções com IA" : "Gerar capa com IA"}
            </label>
            <button
              type="button"
              onClick={() => { discardVariants(); setAiOpen(false); }}
              className="rounded p-1 text-text-secondary hover:bg-bg-surface-2"
              aria-label="Fechar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <textarea
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            rows={2}
            placeholder={
              hasContext
                ? `Opcional — descreva a imagem. Se vazio, usaremos o título e o resumo do post.`
                : `Descreva a imagem. Ex.: ilustração minimalista de um robô lendo notícias num laptop, paleta azul.`
            }
            className="w-full rounded-md border border-input bg-bg-elevated px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
          />

          {variants && variants.length > 0 && (
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
              {variants.map((v, i) => (
                <button
                  key={v.path}
                  type="button"
                  onClick={() => pickVariant(v)}
                  className="group relative overflow-hidden rounded-md border border-border hover:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40"
                  title={`Usar opção ${i + 1}`}
                >
                  <img src={v.url} alt={`Opção ${i + 1}`} className="aspect-video w-full object-cover" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover:bg-black/40 group-hover:opacity-100">
                    <span className="inline-flex items-center gap-1 rounded-full bg-accent px-3 py-1 text-xs font-medium text-white">
                      <Check className="h-3 w-3" /> Usar esta
                    </span>
                  </div>
                  <span className="absolute left-1 top-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
                    {i + 1}
                  </span>
                </button>
              ))}
            </div>
          )}

          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => { discardVariants(); setAiOpen(false); }}
              className="lp-btn-secondary"
              disabled={generating}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={generateWithAi}
              disabled={generating || (!hasContext && !aiPrompt.trim())}
              className="lp-btn-primary-indigo"
            >
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}{" "}
              {variants ? "Gerar outras" : "Gerar"}
            </button>
          </div>
          <p className="mt-2 text-xs text-text-tertiary">
            {variantsMode === 3
              ? "Geramos 3 opções e você escolhe — as não escolhidas são descartadas."
              : "A imagem será enviada automaticamente para o storage e definida como capa."}
          </p>
        </div>
      )}
    </div>
  );
}
