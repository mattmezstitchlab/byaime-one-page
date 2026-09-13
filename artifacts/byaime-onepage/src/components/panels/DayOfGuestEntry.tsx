import { ExternalLink, Copy, Globe2, PencilLine } from "lucide-react";

/**
 * L'entrée Invité du Jour J.
 *
 * Le mini-site public existait déjà (`/profil/:projectId`), mais son accès
 * était enfoui dans les réglages du portail : le couple ne le trouvait pas le
 * jour où il en a besoin. Cette carte le remet dans le déroulé du Jour J,
 * avec l'état de publication, le lien à diffuser et le rappel de ce que les
 * invité·es y verront — jamais les chiffres, jamais les contacts privés.
 */
export function DayOfGuestEntry({
  published,
  profileUrl,
  canPublish,
  practicalReady,
  onPublish,
  onHide,
  onCopy,
  onEditPractical,
}: {
  published: boolean;
  profileUrl: string;
  canPublish: boolean;
  practicalReady: boolean;
  onPublish: () => void;
  onHide: () => void;
  onCopy: () => void;
  onEditPractical: () => void;
}) {
  return (
    <section
      data-testid="dayof-guest-entry"
      aria-label="Entrée Invité"
      className="rounded-3xl border border-border bg-card p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h5 className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Globe2 className="h-4 w-4 text-foreground/45" />
            Entrée Invité
          </h5>
          <p className="mt-1 text-xs font-light leading-relaxed text-foreground/55">
            Le mini-site que vos invité·es ouvrent : le programme public, le lieu, l'accès et le plan B.
            Vos invités, vos documents et votre budget n'y apparaissent jamais.
          </p>
        </div>
        <span
          data-testid="dayof-guest-state"
          className={
            published
              ? "shrink-0 rounded-full bg-success/12 px-3 py-1 text-[10px] uppercase tracking-[.14em] text-success"
              : "shrink-0 rounded-full bg-foreground/8 px-3 py-1 text-[10px] uppercase tracking-[.14em] text-foreground/55"
          }
        >
          {published ? "En ligne" : "Masqué"}
        </span>
      </div>

      {published ? (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <a
            data-testid="dayof-guest-link"
            href={profileUrl}
            className="flex flex-1 items-center justify-center gap-2 rounded-full border border-foreground/15 px-4 py-2.5 text-xs transition hover:bg-foreground/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Voir le mini-site
          </a>
          <button
            type="button"
            data-testid="dayof-guest-copy"
            onClick={onCopy}
            className="flex flex-1 items-center justify-center gap-2 rounded-full bg-foreground px-4 py-2.5 text-xs font-medium text-background transition hover:bg-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Copy className="h-3.5 w-3.5" />
            Copier le lien à diffuser
          </button>
          {canPublish && (
            <button
              type="button"
              data-testid="dayof-guest-hide"
              onClick={onHide}
              className="rounded-full border border-foreground/15 px-4 py-2.5 text-xs text-foreground/65 transition hover:border-foreground/35 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Masquer
            </button>
          )}
        </div>
      ) : canPublish ? (
        <button
          type="button"
          data-testid="dayof-guest-publish"
          onClick={onPublish}
          className="mt-4 w-full rounded-full bg-foreground px-4 py-2.5 text-xs font-medium text-background transition hover:bg-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Publier le mini-site
        </button>
      ) : (
        <p data-testid="dayof-guest-locked" className="mt-4 text-xs font-light text-foreground/50">
          Le mini-site n'est pas publié. Le ou la propriétaire du Monde décide de sa mise en ligne.
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <p data-testid="dayof-guest-practical" className="min-w-0 flex-1 text-xs font-light leading-relaxed text-foreground/50">
          {practicalReady
            ? "Lieu, accès et plan B sont publiés : ils s'affichent en tête du mini-site."
            : "Aucune info pratique publiée : les invité·es ne verront que le programme."}
        </p>
        <button
          type="button"
          data-testid="dayof-guest-edit-practical"
          onClick={onEditPractical}
          className="flex shrink-0 items-center gap-2 rounded-full border border-foreground/15 px-3 py-2 text-[10px] uppercase tracking-[.14em] text-foreground/65 transition hover:border-foreground/35 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <PencilLine className="h-3.5 w-3.5" />
          Logistique
        </button>
      </div>
    </section>
  );
}
