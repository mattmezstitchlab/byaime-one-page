import { useState } from "react";
import { Plus, Search, Trash2 } from "lucide-react";
import { useProject } from "@/store/project-store";
import { DispooBanner } from "@/components/DispooBanner";
import { CARD, EYEBROW, PILL_SMALL, FIELD } from "@/lib/site-design";
import { cn } from "@/lib/utils";

export function ProviderPanel() {
  const { project, updateEntity, addEntity, removeEntity, canEdit } = useProject();
  const [query, setQuery] = useState("");
  if (!project) return null;
  const providers = project.providers.filter(provider => `${provider.role} ${provider.name || ""}`.toLowerCase().includes(query.toLowerCase()));
  const city = typeof project.city.value === "string" ? project.city.value : "";

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className={cn(CARD, "p-6")}>
        <p className={EYEBROW}>Prestataires</p>
        <h3 className="aime-apple-title mt-2 text-2xl text-[var(--agency-ink)]">L'équipe qui porte le Jour J</h3>
        <p className="mt-2 text-sm leading-relaxed text-[var(--agency-body)]">
          Chaque prestataire porte son rôle, son statut et ses Moments — reliés comme dans la Bande.
        </p>
        <div className="mt-5 flex gap-2">
          <label className="flex flex-1 items-center gap-2 rounded-full border border-[var(--agency-hairline)] bg-[var(--agency-paper)] px-4">
            <Search className="h-3.5 w-3.5 text-[var(--agency-eyebrow)]" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full bg-transparent py-2.5 text-sm outline-none placeholder:text-[var(--agency-eyebrow)]"
              placeholder="Rechercher un professionnel…"
            />
          </label>
          {canEdit && (
            <button
              onClick={() => addEntity("providers", { role: "Nouveau poste", category: "autre", status: "recherche" })}
              className={cn(PILL_SMALL, "bg-[var(--agency-ink)] text-[var(--agency-paper)] hover:opacity-85")}
            >
              <Plus className="h-3.5 w-3.5" />
              Ajouter
            </button>
          )}
        </div>
      </div>

      <DispooBanner variant="providers" placement="providers" query={query.trim() || undefined} city={city || undefined} />

      <div className="grid gap-4 md:grid-cols-2">
        {providers.map(provider => {
          const journey = project.timeline.filter(event => event.relations?.some(relation => relation.kind === "provider" && relation.id === provider.id));
          const payments = project.payments.filter(payment => payment.providerId === provider.id);
          const documents = project.documents.filter(document => document.providerId === provider.id);

          return (
            <div key={provider.id} className={cn(CARD, "p-5")}>
              <div className="flex gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[var(--agency-hairline)] bg-[var(--agency-paper)] font-display text-sm uppercase text-[var(--agency-ink)]">
                  {(provider.name || provider.role).charAt(0)}
                </span>
                <div className="min-w-0 flex-1">
                  <input
                    disabled={!canEdit}
                    value={provider.role}
                    onChange={e => updateEntity("providers", provider.id, { role: e.target.value })}
                    className="w-full bg-transparent text-[11px] uppercase tracking-[0.24em] text-[var(--agency-eyebrow)] outline-none"
                  />
                  <input
                    disabled={!canEdit}
                    value={provider.name || ""}
                    onChange={e => updateEntity("providers", provider.id, { name: e.target.value })}
                    placeholder="Nom"
                    className="mt-1 w-full bg-transparent text-[15px] font-medium outline-none text-[var(--agency-ink)] placeholder:text-[var(--agency-eyebrow)]"
                  />
                </div>
                {canEdit && (
                  <button onClick={() => removeEntity("providers", provider.id)} className="text-[var(--agency-eyebrow)] hover:text-[#B42318]">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <select
                  disabled={!canEdit}
                  value={provider.status}
                  onChange={e => updateEntity("providers", provider.id, { status: e.target.value })}
                  className="rounded-full border border-[var(--agency-hairline)] bg-[var(--agency-paper)] px-3 py-2 text-xs outline-none"
                >
                  <option value="recherche">À trouver</option>
                  <option value="contacte">Contact pris</option>
                  <option value="devis">Prix reçu</option>
                  <option value="reserve">Confirmé</option>
                </select>
                <input
                  disabled={!canEdit}
                  value={provider.nextAction || ""}
                  onChange={e => updateEntity("providers", provider.id, { nextAction: e.target.value })}
                  placeholder="À faire ensuite"
                  className="rounded-full border border-[var(--agency-hairline)] bg-[var(--agency-paper)] px-3 py-2 text-xs outline-none placeholder:text-[var(--agency-eyebrow)]"
                />
              </div>

              <div className="mt-4 border-t border-[var(--agency-hairline)] pt-4">
                <p className={cn(EYEBROW, "text-[9px]")}>
                  Suivi · {payments.length} paiement(s) · {documents.length} document(s)
                </p>
                <div className="mt-3 space-y-1.5">
                  {journey.length ? (
                    journey.map(event => (
                      <p key={event.id} className="text-xs leading-relaxed text-[var(--agency-body)]">
                        {new Date(event.time).toLocaleString("fr-FR")} · {event.title}
                        {event.location ? ` · ${event.location}` : ""}
                      </p>
                    ))
                  ) : (
                    <p className="text-xs text-[var(--agency-eyebrow)]">Aucun moment prévu avec ce professionnel.</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
