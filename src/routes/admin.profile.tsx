import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Save, Upload, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  useMyProfile,
  useUpdateMyProfile,
  uploadAvatar,
} from "@/hooks/queries/useProfile";

export const Route = createFileRoute("/admin/profile")({
  component: ProfilePage,
});

const inputCls =
  "w-full rounded-lg border border-input bg-bg-elevated px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30";

function ProfilePage() {
  const { user, refreshProfile } = useAuth();
  const { data: profile, isLoading } = useMyProfile(user?.id);
  const update = useUpdateMyProfile(user?.id);

  const [fullName, setFullName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [website, setWebsite] = useState("");
  const [twitter, setTwitter] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [github, setGithub] = useState("");
  const [instagram, setInstagram] = useState("");
  const [youtube, setYoutube] = useState("");
  const [showOnBlog, setShowOnBlog] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name ?? "");
    setJobTitle(profile.job_title ?? "");
    setBio(profile.bio ?? "");
    setAvatarUrl(profile.avatar_url ?? "");
    setWebsite(profile.website_url ?? "");
    setTwitter(profile.twitter_url ?? "");
    setLinkedin(profile.linkedin_url ?? "");
    setGithub(profile.github_url ?? "");
    setInstagram(profile.instagram_url ?? "");
    setYoutube(profile.youtube_url ?? "");
    setShowOnBlog(profile.show_on_blog ?? true);
  }, [profile]);

  const handleAvatar = async (file: File) => {
    if (!user) return;
    setUploading(true);
    try {
      const publicUrl = await uploadAvatar(user.id, file);
      setAvatarUrl(publicUrl);
      toast.success("Foto enviada");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha no upload");
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      await update.mutateAsync({
        full_name: fullName.trim(),
        job_title: jobTitle.trim() || null,
        bio: bio.trim() || null,
        avatar_url: avatarUrl.trim() || null,
        website_url: website.trim() || null,
        twitter_url: twitter.trim() || null,
        linkedin_url: linkedin.trim() || null,
        github_url: github.trim() || null,
        instagram_url: instagram.trim() || null,
        youtube_url: youtube.trim() || null,
        show_on_blog: showOnBlog,
      });
      await refreshProfile();
      toast.success("Perfil atualizado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao salvar");
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-text-secondary">Carregando…</div>;
  }

  const initials = fullName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="max-w-3xl p-8 lg:p-10">
      <div className="mb-8 animate-fade-in-up">
        <p className="text-xs font-semibold uppercase tracking-widest text-accent">Perfil</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-text-primary">Meu perfil</h1>
        <p className="mt-1 text-text-secondary">
          Estes dados aparecem em "Sobre o autor" nos posts em que você é o criador.
        </p>
      </div>

      <div className="lp-card-elevated space-y-5 p-6">
        <div className="flex items-center gap-4">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={fullName}
              className="h-20 w-20 rounded-full border border-border object-cover"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-accent/10 text-lg font-semibold text-accent">
              {initials || <User className="h-6 w-6" />}
            </div>
          )}
          <div>
            <label className="lp-btn-secondary cursor-pointer text-sm">
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {avatarUrl ? "Trocar foto" : "Enviar foto"}
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => e.target.files?.[0] && handleAvatar(e.target.files[0])}
              />
            </label>
            {avatarUrl && (
              <button
                onClick={() => setAvatarUrl("")}
                className="ml-3 text-xs text-text-tertiary hover:text-destructive"
              >
                Remover
              </button>
            )}
          </div>
        </div>

        <Field label="Nome completo">
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Cargo / função" hint="Ex: Editor-chefe, Founder">
          <input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Bio" hint="1–3 frases curtas que aparecem ao lado da foto">
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} className={inputCls} />
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Site / portfólio">
            <input value={website} onChange={(e) => setWebsite(e.target.value)} className={inputCls} placeholder="https://" />
          </Field>
          <Field label="Twitter / X">
            <input value={twitter} onChange={(e) => setTwitter(e.target.value)} className={inputCls} placeholder="https://twitter.com/…" />
          </Field>
          <Field label="LinkedIn">
            <input value={linkedin} onChange={(e) => setLinkedin(e.target.value)} className={inputCls} placeholder="https://linkedin.com/in/…" />
          </Field>
          <Field label="GitHub">
            <input value={github} onChange={(e) => setGithub(e.target.value)} className={inputCls} placeholder="https://github.com/…" />
          </Field>
          <Field label="Instagram">
            <input value={instagram} onChange={(e) => setInstagram(e.target.value)} className={inputCls} placeholder="https://instagram.com/…" />
          </Field>
          <Field label="YouTube">
            <input value={youtube} onChange={(e) => setYoutube(e.target.value)} className={inputCls} placeholder="https://youtube.com/@…" />
          </Field>
        </div>

        <label className="flex items-center gap-2 text-sm text-text-primary">
          <input
            type="checkbox"
            checked={showOnBlog}
            onChange={(e) => setShowOnBlog(e.target.checked)}
            className="h-4 w-4 rounded border-border accent-accent"
          />
          Exibir meu perfil em "Sobre o autor" nos posts publicados
        </label>

        <button onClick={save} disabled={saving} className="lp-btn-primary-indigo w-full py-3">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar perfil
        </button>
      </div>
    </div>
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
