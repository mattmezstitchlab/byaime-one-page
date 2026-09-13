import { useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Archive, Lock, Unlock } from "lucide-react";

/**
 * Clôturer le Monde.
 *
 * L'Après promet une fin — souvenirs réunis, mercis envoyés, film regardé —
 * mais rien ne permettait de la marquer : le Monde restait modifiable pour
 * toujours, donc ouvert aux modifications par erreur. La clôture rend le Monde
 * consultable et figé, sans rien effacer. Elle demande deux clics, et le ou la
 * propriétaire peut toujours rouvrir.
 */

/**
 * Rendu pur des trois états (ouvert, confirmation, clos). Séparé de l'état
 * pour que la confirmation soit testable : ce paquet rend en statique, sans
 * jsdom, donc un composant qui garde son état ne peut pas être cliqué en test.
 */
export function WorldClosureView({
  closedAt,
  confirming,
  canClose,
  onRequestClose,
  onCancel,
  onClose,
  onReopen,
}: {
  closedAt?: number;
  confirming: boolean;
  canClose: boolean;
  onRequestClose: () => void;
  onCancel: () => void;
  onClose: () => void;
  onReopen: () => void;
}) {
  return (
    <section
      data-testid="world-closure"
      aria-label="Clôture du Monde"
      className={
        closedAt
          ? "rounded-3xl border border-success/30 bg-success/[0.06] p-5"
          : "rounded-3xl border border-foreground/10 bg-card p-5"
      }
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="flex items-center gap-2 text-sm font-medium text-foreground">
            {closedAt ? <Lock className="h-4 w-4 text-success" /> : <Archive className="h-4 w-4 text-foreground/45" />}
            {closedAt ? "Monde clos" : "Clôturer le Monde"}
          </h4>
          <p data-testid="world-closure-text" className="mt-1 text-xs font-light leading-relaxed text-foreground/55">
            {closedAt
              ? `Clos le ${format(new Date(closedAt), "d MMMM yyyy", { locale: fr })}. Tout reste consultable : souvenirs, mots doux, film, budget et documents. Plus rien ne peut être modifié par erreur.`
              : "Quand les remerciements sont partis et le film regardé, clôturez : le Monde devient une archive consultable, à l'abri des modifications par erreur."}
          </p>
        </div>
      </div>

      {closedAt ? (
        canClose && (
          <button
            type="button"
            data-testid="world-closure-reopen"
            onClick={onReopen}
            className="mt-4 inline-flex items-center gap-2 rounded-full border border-foreground/15 px-4 py-2 text-xs text-foreground/65 transition hover:border-foreground/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40"
          >
            <Unlock className="h-3.5 w-3.5" />
            Rouvrir le Monde
          </button>
        )
      ) : canClose ? (
        confirming ? (
          <div data-testid="world-closure-confirm" className="mt-4 flex flex-wrap items-center gap-2">
            <p className="w-full text-xs text-foreground/55">
              Après la clôture, l'édition est coupée pour tout le monde. Vous pourrez rouvrir depuis cette même carte.
            </p>
            <button
              type="button"
              data-testid="world-closure-apply"
              onClick={onClose}
              className="rounded-full bg-foreground px-4 py-2 text-xs font-medium text-background transition hover:bg-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Confirmer la clôture
            </button>
            <button
              type="button"
              data-testid="world-closure-cancel"
              onClick={onCancel}
              className="rounded-full border border-foreground/15 px-4 py-2 text-xs text-foreground/65 transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40"
            >
              Pas encore
            </button>
          </div>
        ) : (
          <button
            type="button"
            data-testid="world-closure-open"
            onClick={onRequestClose}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-2 text-xs font-medium text-background transition hover:bg-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Archive className="h-3.5 w-3.5" />
            Clôturer le Monde
          </button>
        )
      ) : (
        <p data-testid="world-closure-locked" className="mt-4 text-xs font-light text-foreground/50">
          Seul·e le ou la propriétaire du Monde peut le clôturer.
        </p>
      )}
    </section>
  );
}

export function WorldClosure({
  closedAt,
  canClose,
  onClose,
  onReopen,
}: {
  closedAt?: number;
  canClose: boolean;
  onClose: () => void;
  onReopen: () => void;
}) {
  const [confirming, setConfirming] = useState(false);

  return (
    <WorldClosureView
      closedAt={closedAt}
      confirming={confirming}
      canClose={canClose}
      onRequestClose={() => setConfirming(true)}
      onCancel={() => setConfirming(false)}
      onClose={onClose}
      onReopen={onReopen}
    />
  );
}
