import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Upload, UserCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useMyProfile, useUpdateMyProfile, uploadAvatar } from "@/hooks/queries/useProfile";
import { Field, StepFooter, inputCls, type StepProps } from "./shared";

export function StepProfile({ onDone, onSkip, onBack, isFirst, isLast }: StepProps) {
  const { user, refreshProfile } = useAuth();
  const { data: profile, isLoading } = useMyProfile(user?.id);
  const updateProfile = useUpdateMyProfile(user?.id);

  const [fullName, setFullName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [showOnBlog, setShowOnBlog] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name ?? "");
    setJobTitle(profile.job_title ?? "");
    setBio(profile.bio ?? "");
    setAvatarUrl(profile.avatar_url ?? "");
    setShowOnBlog(profile.show_on_blog);
  }, [profile]);

  const handleUpload = async (file: File) => {
    if (!user) return;
    setUploading(true);
    try {
      setAvatarUrl(await uploadAvatar(user.id, file));
      toast.success("Foto enviada");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha no upload");
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!fullName.trim()) {
      toast.error("Informe seu nome para continuar (ou pule esta etapa).");
      return;
    }
    setSaving(true);
    try {
      await updateProfile.mutateAsync({
        full_name: fullName.trim(),
        job_title: jobTitle.trim() || null,
        bio: bio.trim() || null,
        avatar_url: avatarUrl.trim() || null,
        show_on_blog: showOnBlog,
      });
      // O nome/avatar aparecem no TopBar via AuthContext, não via react-query.
      await refreshProfile();
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao salvar o perfil");
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <div className="text-text-secondary">Carregando…</div>;

  return (
    <div className="space-y-5">
      <Field label="Foto">
        <div className="flex items-center gap-3">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-bg-base">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
            ) : (
              <UserCircle className="h-8 w-8 text-text-tertiary" />
            )}
          </div>
          <label className="lp-btn-secondary cursor-pointer text-xs">
            {uploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Upload className="h-3.5 w-3.5" />
            )}
            {avatarUrl ? "Trocar" : "Enviar"}
            <input
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
            />
          </label>
        </div>
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome completo">
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className={inputCls}
            placeholder="Seu nome"
          />
        </Field>
        <Field label="Cargo">
          <input
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            className={inputCls}
            placeholder="Ex: Editora-chefe"
          />
        </Field>
      </div>

      <Field label="Bio" hint="Exibida ao pé dos posts que você assina.">
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          className={`${inputCls} min-h-24 resize-y`}
          placeholder="Uma ou duas frases sobre você."
        />
      </Field>

      <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-bg-surface-1 p-4">
        <input
          type="checkbox"
          checked={showOnBlog}
          onChange={(e) => setShowOnBlog(e.target.checked)}
          className="mt-0.5 h-4 w-4 accent-accent"
        />
        <div className="flex-1">
          <div className="text-sm font-medium text-text-primary">Exibir meu perfil no blog</div>
          <p className="mt-1 text-xs text-text-secondary">
            Quando ligado, seu nome, foto e bio aparecem como autoria nos posts publicados.
          </p>
        </div>
      </label>

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
