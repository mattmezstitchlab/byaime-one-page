import { useState } from "react";
import { Check, Plus, Search, Trash2 } from "lucide-react";
import { useProject } from "@/store/project-store";
import { DispooBanner } from "@/components/DispooBanner";
import { CARD, EYEBROW, PILL_SMALL } from "@/lib/site-design";
import { cn } from "@/lib/utils";
import { formatCents, currencySymbol } from "@/lib/money";
import { momentProviderIds } from "@/lib/moment-context";
import { invoicesForPayment } from "@/lib/document-tense";
import { attestedCachets, hoursProjection, legalDeadlines, pendingDeadlineMoments, deadlineMomentId } from "@/lib/intermittent";

const euro = (cents: number, currency?: string) => formatCents(cents, currency);

export function ProviderPanel({ momentId = null }: { momentId?: string | null } = {}) {
  const { project, updateEntity, addEntity, removeEntity, updateProject, canEdit } = useProject();
  const [query, setQuery] = useState("");
  if (!project) return null;
  /* Ancrage Moment : les professionnels reliés à ce Moment passent en tête et
     sont signalés — mêmes relations que les repères affichés sur la scène. */
  const linkedIds = momentId ? momentProviderIds(project, momentId) : [];
  const providers = project.providers
    .filter(provider => `${provider.role} ${provider.name || ""}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => Number(linkedIds.includes(b.id)) - Number(linkedIds.includes(a.id)));
  const city = typeof project.city.value === "string" ? project.city.value : "";

  const estimated = project.providers.reduce((sum, p) => sum + (p.amountCents || 0), 0);
  const committed = project.providers.filter(p => ["devis", "reserve"].includes(p.status)).reduce((sum, p) => sum + (p.amountCents || 0), 0);
  const paid = project.payments.filter(p => p.state === "paye").reduce((sum, p) => sum + p.amountCents, 0);
  const remaining = Math.max(0, (project.budget.value || estimated / 100) * 100 - paid);
  const addPayment = () => addEntity("payments", { label: "Nouveau paiement", amountCents: 0, at: Date.now(), state: "du", category: "À classer" });

  /* Intermittents : échéances légales et heures, dérivées (intermittent.ts).
     Les Moments proposés sont suggérés, à valider — on les adopte un par un. */
  const now = Date.now();
  const pendingDeadlines = pendingDeadlineMoments(project);
  const deadlines = legalDeadlines(project);
  const cachets = attestedCachets(project);
  const projection = hoursProjection(cachets, now);
  const adoptDeadline = (momentId: string) => {
    const moment = pendingDeadlines.find(item => item.id === momentId);
    if (!moment) return;
    updateProject({ timeline: [...project.timeline, moment].sort((a, b) => a.time - b.time) });
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className={cn(CARD, "p-6")}>
        <p className={EYEBROW}>Prestataires</p>
        <h3 className="aime-apple-title mt-2 text-2xl text-[var(--agency-ink)]">L'équipe qui porte le Jour J</h3>
        <p className="mt-2 text-sm leading-relaxed text-[var(--agency-body)]">
          Chaque prestataire porte son rôle, son statut et ses Moments — reliés comme dans le Monde.
        </p>
        <div className="mt-5 flex gap-2">
          <label className="flex flex-1 items-center gap-2 rounded-full border border-[var(--agency-hairline)] bg-[var(--agency-paper)] px-4">
            <Search className="h-3.5 w-3.5 text-[var(--agency-eyebrow)]" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full bg-transparent py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring placeholder:text-[var(--agency-eyebrow)]"
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
            <div
              key={provider.id}
              data-moment-linked={linkedIds.includes(provider.id) ? "true" : undefined}
              className={cn(CARD, "p-5", linkedIds.includes(provider.id) && "ring-2 ring-[var(--agency-ink)]/35")}
            >
              <div className="flex gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[var(--agency-hairline)] bg-[var(--agency-paper)] font-display text-sm uppercase text-[var(--agency-ink)]">
                  {(provider.name || provider.role).charAt(0)}
                </span>
                <div className="min-w-0 flex-1">
                  <input
                    disabled={!canEdit}
                    value={provider.role}
                    onChange={e => updateEntity("providers", provider.id, { role: e.target.value })}
                    className="w-full bg-transparent text-[11px] uppercase tracking-[0.24em] text-[var(--agency-eyebrow)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  <input
                    disabled={!canEdit}
                    value={provider.name || ""}
                    onChange={e => updateEntity("providers", provider.id, { name: e.target.value })}
                    placeholder="Nom"
                    className="mt-1 w-full bg-transparent text-[15px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring text-[var(--agency-ink)] placeholder:text-[var(--agency-eyebrow)]"
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
                  className="rounded-full border border-[var(--agency-hairline)] bg-[var(--agency-paper)] px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                  className="rounded-full border border-[var(--agency-hairline)] bg-[var(--agency-paper)] px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring placeholder:text-[var(--agency-eyebrow)]"
                />
                <input
                  disabled={!canEdit}
                  type="number"
                  value={provider.amountCents ? provider.amountCents / 100 : ""}
                  onChange={e => updateEntity("providers", provider.id, { amountCents: e.target.value ? Number(e.target.value) * 100 : undefined })}
                  placeholder="Montant €"
                  className="col-span-2 rounded-full border border-[var(--agency-hairline)] bg-[var(--agency-paper)] px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring placeholder:text-[var(--agency-eyebrow)]"
                />
                <select
                  disabled={!canEdit}
                  aria-label={`Rémunération de ${provider.name || provider.role}`}
                  data-testid={`provider-employment-${provider.id}`}
                  value={provider.employment ?? "facture"}
                  onChange={e => updateEntity("providers", provider.id, { employment: e.target.value === "facture" ? undefined : e.target.value })}
                  className="col-span-2 rounded-full border border-[var(--agency-hairline)] bg-[var(--agency-paper)] px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="facture">Rémunération : sur facture</option>
                  <option value="guso">Rémunération : cachet déclaré au GUSO</option>
                  <option value="structure">Rémunération : cachet via une structure employeuse</option>
                </select>
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
                {(provider.employment === "guso" || provider.employment === "structure") && (
                  <div className="mt-3 rounded-2xl border border-[var(--agency-hairline)] p-3" data-testid={`provider-deadlines-${provider.id}`}>
                    <p className={cn(EYEBROW, "text-[9px]")}>Échéances légales · déduites des prestations</p>
                    {deadlines.filter(deadline => deadline.providerId === provider.id).length === 0 ? (
                      <p className="mt-2 text-xs text-[var(--agency-eyebrow)]">Reliez ce professionnel à un Moment pour que ses échéances apparaissent.</p>
                    ) : (
                      <ul className="mt-2 space-y-1.5">
                        {deadlines.filter(deadline => deadline.providerId === provider.id).map(deadline => {
                          const id = deadlineMomentId(deadline);
                          const pending = pendingDeadlines.find(item => item.id === id);
                          const late = deadline.dueAt < now && !project.timeline.some(event => event.id === id && event.status === "execute");
                          return (
                            <li key={id} className="flex flex-wrap items-center justify-between gap-2 text-xs" data-deadline={deadline.kind} data-adopted={pending ? "false" : "true"}>
                              <span className={cn("text-[var(--agency-body)]", late && "text-[#B42318]")}>
                                {deadline.kind === "declaration_prealable" ? "Déclaration préalable" : "Déclaration unique + cotisations"} · avant le {new Date(deadline.dueAt).toLocaleDateString("fr-FR")}
                              </span>
                              {pending ? (
                                canEdit && (
                                  <button type="button" onClick={() => adoptDeadline(id)} className={cn(PILL_SMALL, "border border-[var(--agency-hairline)] hover:bg-[var(--agency-ink)] hover:text-[var(--agency-paper)]")}>
                                    Ajouter à la Timeline
                                  </button>
                                )
                              ) : (
                                <span className="text-[10px] uppercase tracking-widest text-[var(--agency-eyebrow)]">Dans la Timeline</span>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {cachets.length > 0 && (
        <div className={cn(CARD, "p-6")} data-testid="intermittent-hours">
          <p className={EYEBROW}>Heures attestées · {projection.cachets} cachet(s) sur 12 mois</p>
          <h4 className="aime-apple-title mt-2 text-xl text-[var(--agency-ink)]">{projection.hours} h sur {projection.threshold} h</h4>
          <div className="mt-3 h-1 rounded-full bg-foreground/10">
            <div className="h-1 rounded-full bg-foreground/60" style={{ width: `${Math.min(100, Math.round((projection.hours / projection.threshold) * 100))}%` }} />
          </div>
          <p className="mt-2 text-xs leading-relaxed text-[var(--agency-body)]">
            {projection.remainingHours > 0
              ? `Il reste ${projection.remainingHours} h, soit ${projection.remainingCachets} cachet(s) attesté(s). Seules les factures rapprochées d'un paiement réglé comptent.`
              : "Le seuil de la période est atteint d'après les cachets attestés."}
          </p>
          <p className="mt-2 text-[11px] leading-relaxed text-[var(--agency-eyebrow)]">{projection.disclaimer} Règles relues le {projection.rulesDate}.</p>
        </div>
      )}

      {/* Fusion P1: Budget intégré dans Prestataires */}
      <div className={cn(CARD, "p-6")}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className={EYEBROW}>Budget & échéancier</p>
            <h4 className="aime-apple-title mt-2 text-xl text-[var(--agency-ink)]">L'argent du Monde</h4>
            <p className="mt-1 text-xs leading-relaxed text-[var(--agency-body)]">Même panneau que les prestataires — estimation, engagé, payé, restant.</p>
          </div>
          {canEdit && (
            <button
              onClick={addPayment}
              className={cn(PILL_SMALL, "bg-[var(--agency-ink)] text-[var(--agency-paper)] hover:opacity-85")}
            >
              <Plus className="h-3.5 w-3.5" /> Paiement
            </button>
          )}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2 md:grid-cols-4">
          {[
            ["Estimé", estimated],
            ["Engagé", committed],
            ["Payé", paid],
            ["Restant", remaining],
          ].map(([label, value]) => (
            <div key={label as string} className="rounded-2xl border border-[var(--agency-hairline)] bg-[var(--agency-paper)] p-4">
              <p className="text-[10px] uppercase tracking-widest text-foreground/40">{label}</p>
              <p className="mt-2 font-mono text-lg">{euro(value as number, project.currency)}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-2xl border border-[var(--agency-hairline)] bg-[var(--agency-paper)] p-4">
          <p className="text-[10px] uppercase tracking-widest text-foreground/40">Répartition par catégorie</p>
          <div className="mt-4 space-y-3">
            {Array.from(new Set(project.providers.map(p => p.category))).map(category => {
              const amount = project.providers.filter(p => p.category === category).reduce((sum, p) => sum + (p.amountCents || 0), 0);
              const pct = estimated ? Math.min(100, Math.round((amount / estimated) * 100)) : 0;
              return (
                <div key={category}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="capitalize text-foreground/65">{category}</span>
                    <span className="font-mono text-foreground/45">{euro(amount, project.currency)}</span>
                  </div>
                  <div className="h-1 rounded-full bg-foreground/10">
                    <div className="h-1 rounded-full bg-foreground/60" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
            {project.providers.length === 0 && <p className="text-xs text-[var(--agency-eyebrow)]">Ajoutez des prestataires avec montants pour voir la répartition.</p>}
          </div>
        </div>

        <div className="mt-6 space-y-2">
          {project.payments.length === 0 ? (
            <p className="text-xs text-[var(--agency-eyebrow)]">Aucun paiement à suivre — ajoutez-en un.</p>
          ) : (
            project.payments.map(p => (
              <div key={p.id} className="flex items-center gap-3 rounded-3xl border border-[var(--agency-hairline)] bg-[var(--agency-paper)] p-4">
                <button
                  onClick={() => updateEntity("payments", p.id, { state: p.state === "paye" ? "du" : "paye" })}
                  className={cn("grid h-6 w-6 place-items-center rounded-full border", p.state === "paye" ? "border-[var(--agency-ink)] bg-[var(--agency-ink)] text-[var(--agency-paper)]" : "border-[var(--agency-hairline)]")}
                >
                  {p.state === "paye" && <Check className="h-3.5 w-3.5" />}
                </button>
                <div className="flex-1">
                  <input value={p.label} onChange={e => updateEntity("payments", p.id, { label: e.target.value })} className="w-full bg-transparent text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring text-[var(--agency-ink)]" />
                  <p className="mt-1 text-xs text-[var(--agency-body)]">{new Date(p.at).toLocaleDateString("fr-FR")} · {p.state === "paye" ? "réglé" : "à régler"}</p>
                  {/* Rapprochement explicite : la facture que ce paiement règle.
                      Facultatif — sans choix, le prestataire commun fait foi. */}
                  {(() => {
                    const invoices = invoicesForPayment(p, project.documents);
                    if (invoices.length === 0) return null;
                    return (
                      <select
                        aria-label={`Facture réglée par ${p.label}`}
                        data-testid={`payment-invoice-${p.id}`}
                        disabled={!canEdit}
                        value={p.documentId ?? ""}
                        onChange={e => updateEntity("payments", p.id, { documentId: e.target.value || undefined })}
                        className="mt-1.5 max-w-full rounded-full border border-[var(--agency-hairline)] bg-[var(--agency-paper)] px-2.5 py-1 text-[11px] text-[var(--agency-body)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <option value="">Facture : selon le prestataire</option>
                        {invoices.map(invoice => (
                          <option key={invoice.id} value={invoice.id}>{invoice.title}</option>
                        ))}
                      </select>
                    );
                  })()}
                </div>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={p.amountCents / 100}
                    onChange={e => updateEntity("payments", p.id, { amountCents: Number(e.target.value) * 100 })}
                    className="w-24 rounded-full border border-[var(--agency-hairline)] bg-[var(--agency-paper)] px-3 py-1.5 text-right font-mono text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  <span className="w-8 text-xs text-[var(--agency-body)]">{currencySymbol(project.currency)}</span>
                </div>
                <button onClick={() => removeEntity("payments", p.id)} className="text-[var(--agency-eyebrow)] hover:text-[#B42318]">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
