import { Clapperboard, HeartHandshake, Image as ImageIcon, ListChecks, Share2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useProject } from "@/store/project-store";
import { useI18n } from "@/lib/i18n";
import { focusWorld } from "@/lib/world-focus";
import { getWeddingCapabilities } from "@/lib/wedding-navigation";

/*
 * La tête du mode Après. L'Avant avait la sienne (`AvantOverview`), le Jour J
 * aussi (`DayRunTimeline`) : l'Après n'affichait que la liste des Moments.
 *
 * Quatre comptes réels, aucune simulation : souvenirs cochés, images et vidéos
 * de la Galerie unifiée, remerciements préparés. Chaque carte ouvre la même
 * profondeur que le rail (Galerie = Documents, Remerciements = Messages) — et
 * les Moments de la phase Après portent eux-mêmes leurs actions contextuelles.
 */
export function ApresOverview() {
  const { project, currentRole } = useProject();
  const { t } = useI18n();

  if (!project) return null;

  const seeDocuments = getWeddingCapabilities(currentRole).managePrivateDocuments;
  /* `?? []` : un Monde enregistré avant ces collections ne casse pas la tête. */
  const documents = project.documents ?? [];
  const checklist = project.memoryChecklist ?? [];
  const images = documents.filter(doc => doc.url?.startsWith("data:image") || /\.(jpg|jpeg|png|webp|gif)$/i.test(doc.title));
  const videos = documents.filter(doc => doc.url?.startsWith("data:video") || /\.(mp4|webm|mov)$/i.test(doc.title));
  const memoriesDone = checklist.filter(item => item.done).length;
  const thanks = (project.messageTemplates ?? []).filter(template => template.type === "remerciement").length
    + (project.communications ?? []).filter(item => item.type === "remerciement").length;

  const stats = [
    { id: "memories", icon: ListChecks, label: t("apres.overview.memories"), value: `${memoriesDone}/${checklist.length}` },
    { id: "images", icon: ImageIcon, label: t("apres.overview.images"), value: String(images.length) },
    { id: "videos", icon: Clapperboard, label: t("apres.overview.videos"), value: String(videos.length) },
    { id: "thanks", icon: HeartHandshake, label: t("apres.overview.thanks"), value: String(thanks) },
  ];

  return (
    <section data-testid="apres-overview" aria-label={t("apres.overview.eyebrow")} className="mx-auto w-full max-w-4xl px-4 pt-8 sm:px-6">
      <p className="text-[10px] uppercase tracking-[.24em] text-[var(--agency-eyebrow)]">{t("apres.overview.eyebrow")}</p>
      <h3 className="mt-2 font-display text-2xl font-semibold tracking-tight text-[var(--agency-ink)] sm:text-3xl">{t("apres.overview.title")}</h3>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 md:grid-cols-4">
        {stats.map(stat => (
          <article key={stat.id} data-testid={`apres-overview-${stat.id}`} className="flex flex-col rounded-3xl border border-[var(--agency-hairline)] bg-[var(--agency-paper)] p-5">
            <span className="grid h-12 w-12 place-items-center rounded-2xl border border-[var(--agency-hairline)] bg-[var(--agency-paper)] text-[var(--agency-eyebrow)]">
              <stat.icon className="h-5 w-5" />
            </span>
            <p className="mt-4 font-display text-2xl font-light tabular-nums text-[var(--agency-ink)]">{stat.value}</p>
            <p className="mt-1 text-xs text-[var(--agency-body)]">{stat.label}</p>
          </article>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {seeDocuments && (
          <button
            type="button"
            data-testid="apres-open-gallery"
            onClick={() => focusWorld({ panel: "documents" })}
            className="rounded-full border border-[var(--agency-hairline)] px-4 py-1.5 text-xs text-[var(--agency-body)] transition hover:border-[var(--agency-ink)] hover:text-[var(--agency-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--agency-ink)]/30"
          >
            {t("moment.action.gallery")}
          </button>
        )}
        <button
          type="button"
          data-testid="apres-open-thanks"
          onClick={() => focusWorld({ panel: "messages" })}
          className="rounded-full border border-[var(--agency-hairline)] px-4 py-1.5 text-xs text-[var(--agency-body)] transition hover:border-[var(--agency-ink)] hover:text-[var(--agency-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--agency-ink)]/30"
        >
          {t("moment.action.thanks")}
        </button>
        <a
          href={`/bilan/${project.id}`}
          data-testid="apres-open-share"
          className="inline-flex items-center gap-1.5 rounded-full border border-[var(--agency-hairline)] px-4 py-1.5 text-xs text-[var(--agency-body)] transition hover:border-[var(--agency-ink)] hover:text-[var(--agency-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--agency-ink)]/30"
        >
          <Share2 className="h-3 w-3" />
          {t("moment.action.share")}
        </a>
        <span className="text-[11px] text-[var(--agency-eyebrow)]">
          {project.closure?.closedAt
            ? t("apres.overview.closed", { date: format(project.closure.closedAt, "d MMMM yyyy", { locale: fr }) })
            : t("apres.overview.open")}
        </span>
      </div>
    </section>
  );
}
