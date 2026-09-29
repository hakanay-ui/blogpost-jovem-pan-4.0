import { useEffect, useMemo, useState } from "react";
import { X, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type TagOption = { id: string; name: string; slug: string };

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60);
}

type Props = {
  value: TagOption[];
  onChange: (next: TagOption[]) => void;
};

export function TagsSelector({ value, onChange }: Props) {
  const [all, setAll] = useState<TagOption[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase
      .from("tags")
      .select("id, name, slug")
      .order("name")
      .then(({ data, error }) => {
        if (error) {
          toast.error(error.message);
          return;
        }
        setAll((data ?? []) as TagOption[]);
      });
  }, []);

  const available = useMemo(() => {
    const selectedIds = new Set(value.map((t) => t.id));
    const q = query.trim().toLowerCase();
    return all
      .filter((t) => !selectedIds.has(t.id))
      .filter((t) => (q ? t.name.toLowerCase().includes(q) : true))
      .slice(0, 8);
  }, [all, value, query]);

  const canCreate = useMemo(() => {
    const q = query.trim();
    if (!q) return false;
    const slug = slugify(q);
    return !all.some((t) => t.slug === slug || t.name.toLowerCase() === q.toLowerCase());
  }, [query, all]);

  async function createTag() {
    const name = query.trim();
    if (!name) return;
    const slug = slugify(name);
    if (!slug) {
      toast.error("Nome precisa ter pelo menos uma letra ou número.");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("tags")
      .insert({ name, slug })
      .select("id, name, slug")
      .single();
    setLoading(false);
    if (error || !data) {
      toast.error(error?.message ?? "Falha ao criar tag");
      return;
    }
    const tag = data as TagOption;
    setAll((prev) => [...prev, tag].sort((a, b) => a.name.localeCompare(b.name)));
    onChange([...value, tag]);
    setQuery("");
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-input bg-bg-elevated px-2 py-1.5">
        {value.map((t) => (
          <span
            key={t.id}
            className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent"
          >
            {t.name}
            <button
              type="button"
              onClick={() => onChange(value.filter((x) => x.id !== t.id))}
              className="rounded-full hover:bg-accent/20"
              aria-label={`Remover ${t.name}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (available[0]) onChange([...value, available[0]]);
              else if (canCreate) createTag();
            }
          }}
          placeholder={value.length ? "Adicionar..." : "Digite e pressione Enter"}
          className="flex-1 border-0 bg-transparent py-1 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none"
        />
      </div>
      {(available.length > 0 || canCreate) && (
        <div className="flex flex-wrap gap-1">
          {available.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                onChange([...value, t]);
                setQuery("");
              }}
              className="rounded-full border border-border bg-bg-surface-1 px-2 py-0.5 text-xs text-text-secondary hover:border-accent hover:text-accent"
            >
              {t.name}
            </button>
          ))}
          {canCreate && (
            <button
              type="button"
              onClick={createTag}
              disabled={loading}
              className="inline-flex items-center gap-1 rounded-full border border-dashed border-accent/60 bg-accent/5 px-2 py-0.5 text-xs font-medium text-accent hover:bg-accent/10"
            >
              <Plus className="h-3 w-3" /> Criar "{query.trim()}"
            </button>
          )}
        </div>
      )}
    </div>
  );
}
