import { format } from "date-fns";
import { fr as dateFr, enUS as dateEn } from "date-fns/locale";
import { Eye, EyeOff } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { resolvePublicBlocksForEdit } from "@/lib/public-page";
import type { PublicBlockVisibility, PublicPageBlock, PublicPageBlockSource, WorldProject } from "@/lib/types";

/*
 * La page publique du Monde, composée de blocs déclaratifs (pont
 * AIME-COMPOSER, tranche 1 — docs/pont-architecture-aime.md).
 *
 * Chaque bloc lit sa source en direct : changer le nom du Monde, son
 * visuel ou un Moment change la page, rien n'est copié ici. Sans
 * `onToggleVisibility`, la vue est la projection publique pure. Avec, le
 * mode édition révèle chaque liaison et sa visibilité : gouverner, c'est
 * voir ce qu'on publie — un bloc privé ou une source manquante restent
 * visibles en édition, jamais dans la page servie.
 */

function sourceKey(source: PublicPageBlockSource): string {
  if (source.kind === "world") return `publicPage.source.world.${source.field}`;
  return `publicPage.source.${source.kind}`;
}

function momentLabel(time: number, locale: string) {
  return format(new Date(time), "d MMM · HH:mm", { locale: locale === "en" ? dateEn : dateFr });
}

export function PublicPageView({ project, onToggleVisibility }: {
  project: WorldProject;
  onToggleVisibility?: (blockId: string, visibility: PublicBlockVisibility) => void;
}) {
  const { t, locale } = useI18n();
  const editing = typeof onToggleVisibility === "function";

  const toggle = (block: PublicPageBlock) => () => {
    const next: PublicBlockVisibility = block.visibility === "public" ? "prive" : "public";
    onToggleVisibility?.(block.id, next);
  };

  const renderBody = (resolved: ReturnType<typeof resolvePublicBlocksForEdit>[number]["resolved"]) => {
    if (resolved.type === "text") {
      if (resolved.field === "title") {
        return <h2 className="text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">{resolved.text}</h2>;
      }
      return <p className="text-pretty text-base text-foreground/75">{resolved.text}</p>;
    }
    if (resolved.type === "visual") {
      return resolved.visual.kind === "video" ? (
        <video controls src={resolved.visual.url} className="aspect-video w-full rounded-3xl object-cover" />
      ) : (
        <img src={resolved.visual.url} alt={resolved.visual.name ?? ""} className="aspect-video w-full rounded-3xl object-cover" />
      );
    }
    if (resolved.type === "moments") {
      return (
        <div className="flex flex-col gap-3">
          <p className="text-[10px] uppercase tracking-[.16em] text-foreground/50">{t("publicPage.moments.title")}</p>
          <ul className="flex flex-col divide-y divide-[var(--agency-hairline)]">
            {resolved.moments.map((moment) => (
              <li key={moment.id} className="flex flex-wrap items-baseline gap-x-3 py-2.5">
                <span className="font-mono text-xs text-foreground/60">{momentLabel(moment.time, locale)}</span>
                <span className="text-sm text-foreground">{moment.title}</span>
                {moment.location ? <span className="text-xs text-foreground/50">· {moment.location}</span> : null}
              </li>
            ))}
          </ul>
        </div>
      );
    }
    return editing ? (
      <p className="rounded-2xl border border-dashed border-foreground/20 px-5 py-4 text-sm text-foreground/50">{t("publicPage.missing")}</p>
    ) : null;
  };

  /* La même résolution sert les deux modes : la page servie filtre (blocs
     publics, sources résolues), l'édition montre tout — liaisons, visibilité,
     sources manquantes. */
  const rows = resolvePublicBlocksForEdit(project).filter(
    ({ block, resolved }) => editing || (block.visibility === "public" && resolved.type !== "missing"),
  );

  return (
    <section
      data-testid="public-page"
      aria-label={t("publicPage.source.timeline")}
      className="border-b border-[var(--agency-hairline)] bg-[var(--agency-paper)] px-6 py-14 sm:px-10"
    >
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-10">
        {editing ? <p className="text-[10px] uppercase tracking-[.16em] text-foreground/40">{t("publicPage.edit.hint")}</p> : null}
        {rows.map(({ block, resolved }) => (
          <div key={block.id} data-testid={`public-block-${block.id}`} className="flex flex-col gap-4">
            {editing ? (
              <div className="flex items-center justify-between gap-3">
                <span className="text-[10px] uppercase tracking-[.14em] text-foreground/45">{t(sourceKey(block.source) as never)}</span>
                <button
                  type="button"
                  onClick={toggle(block)}
                  aria-label={t("publicPage.visibility.toggle")}
                  className={
                    block.visibility === "public"
                      ? "inline-flex items-center gap-1.5 rounded-full border border-foreground/15 px-3 py-1.5 text-[10px] uppercase tracking-[.12em] text-foreground/70 transition hover:bg-foreground hover:text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      : "inline-flex items-center gap-1.5 rounded-full border border-foreground/40 bg-foreground/5 px-3 py-1.5 text-[10px] uppercase tracking-[.12em] text-foreground/60 transition hover:bg-foreground hover:text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  }
                >
                  {block.visibility === "public" ? <Eye className="h-3 w-3" aria-hidden /> : <EyeOff className="h-3 w-3" aria-hidden />}
                  {t(`publicPage.visibility.${block.visibility}` as never)}
                </button>
              </div>
            ) : null}
            {renderBody(resolved)}
          </div>
        ))}
      </div>
    </section>
  );
}
