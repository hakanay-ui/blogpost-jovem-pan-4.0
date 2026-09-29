import type { CreatorProfile } from "@/hooks/queries/useProfile";
import { Globe, Twitter, Linkedin, Github, Instagram, Youtube } from "lucide-react";

const socials: Array<{
  key: keyof CreatorProfile;
  Icon: typeof Globe;
  label: string;
}> = [
  { key: "website_url", Icon: Globe, label: "Site" },
  { key: "twitter_url", Icon: Twitter, label: "Twitter" },
  { key: "linkedin_url", Icon: Linkedin, label: "LinkedIn" },
  { key: "github_url", Icon: Github, label: "GitHub" },
  { key: "instagram_url", Icon: Instagram, label: "Instagram" },
  { key: "youtube_url", Icon: Youtube, label: "YouTube" },
];

export function AuthorBio({ author }: { author: CreatorProfile }) {
  const initials = author.full_name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <section className="mt-12 rounded-2xl border border-border bg-bg-surface-1 p-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-text-secondary">
        Sobre o autor
      </p>
      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start">
        {author.avatar_url ? (
          <img
            src={author.avatar_url}
            alt={author.full_name}
            className="h-16 w-16 shrink-0 rounded-full border border-border object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-accent/10 text-base font-semibold text-accent">
            {initials || "?"}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-semibold text-text-primary">{author.full_name}</h3>
          {author.job_title && (
            <p className="text-sm text-text-secondary">{author.job_title}</p>
          )}
          {author.bio && (
            <p className="mt-2 text-sm leading-relaxed text-text-secondary">{author.bio}</p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {socials.map(({ key, Icon, label }) => {
              const url = author[key] as string | null;
              if (!url) return null;
              return (
                <a
                  key={key}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  title={label}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border text-text-secondary transition-colors hover:border-accent hover:text-accent"
                >
                  <Icon className="h-4 w-4" />
                </a>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
