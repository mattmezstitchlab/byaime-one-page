import { useEffect, useMemo, useState } from "react";
import { ArrowRight, FlaskConical, RefreshCcw } from "lucide-react";
import { useLocation } from "wouter";
import { useProject } from "@/store/project-store";
import {
  describeLaboratoryContext,
  describeLaboratoryJourney,
  laboratoryStatusDescriptions,
  focusWorld,
  laboratoryStatusLabels,
  laboratoryTypeLabels,
  openLaboratory,
  type LaboratoryFeedbackItem,
  type LaboratoryFeedbackStatus,
  type LaboratoryFeedbackType,
} from "@/lib/laboratory";

export function LaboratoryPage() {
  const [, navigate] = useLocation();
  const { project, currentRole } = useProject();
  const [items, setItems] = useState<LaboratoryFeedbackItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<"" | LaboratoryFeedbackStatus>("");
  const [typeFilter, setTypeFilter] = useState<"" | LaboratoryFeedbackType>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const canManage = currentRole === "owner" || currentRole === "planner";

  const load = async () => {
    if (!project?.id) {
      setItems([]);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (typeFilter) params.set("type", typeFilter);
      const response = await fetch(`/api/projects/${project.id}/laboratory-feedback${params.size ? `?${params.toString()}` : ""}`);
      const body = await response.json().catch(() => ([]));
      if (!response.ok) throw new Error(body?.error || `Erreur ${response.status}`);
      setItems(Array.isArray(body) ? body as LaboratoryFeedbackItem[] : []);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Lecture du Laboratoire impossible");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    void load();
  }, [project?.id, statusFilter, typeFilter]);

  useEffect(() => {
    const listener = () => void load();
    window.addEventListener("aime:laboratory-submitted", listener);
    return () => window.removeEventListener("aime:laboratory-submitted", listener);
  }, [project?.id, statusFilter, typeFilter]);

  const visibleItems = useMemo(
    () => canManage ? items : items.filter(item => item.authoredByCurrentUser),
    [canManage, items],
  );

  const updateStatus = async (feedbackId: string, status: LaboratoryFeedbackStatus) => {
    if (!project?.id || !canManage) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/projects/${project.id}/laboratory-feedback/${feedbackId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error || `Erreur ${response.status}`);
      setItems((current) => current.map((item) => item.id === feedbackId ? body as LaboratoryFeedbackItem : item));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Statut impossible à mettre à jour");
    } finally {
      setBusy(false);
    }
  };

  if (!project) {
    return (
      <main className="grid min-h-full place-items-center bg-background px-6 py-20 text-center text-foreground">
        <div className="max-w-lg">
          <FlaskConical className="mx-auto h-8 w-8 text-foreground/45" />
          <h1 className="mt-6 text-3xl font-display font-light">Laboratoire</h1>
          <p className="mt-4 text-sm text-foreground/55">
            Ouvrez d’abord un Monde pour remonter un retour avec un contexte utile.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-full bg-background px-6 py-12 text-foreground md:px-10">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <p className="text-[10px] uppercase tracking-[.28em] text-foreground/38">Laboratoire</p>
            <h1 className="mt-4 font-display text-4xl font-light md:text-5xl">Votre parcours de contribution</h1>
            <p className="mt-4 text-sm font-light leading-6 text-foreground/55">
              Ici, vous retrouvez ce que vous avez choisi de partager à AIME. « À vérifier » reste réservé aux anomalies et décisions détectées par AIME.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => openLaboratory({ context: { route: "laboratory", source: "laboratory-page" } })}
              className="rounded-full bg-foreground px-5 py-3 text-xs font-medium text-background"
            >
              Nouveau retour
            </button>
            <button
              type="button"
              onClick={() => void load()}
              className="inline-flex items-center gap-2 rounded-full border border-foreground/15 px-4 py-3 text-xs text-foreground/70 hover:bg-foreground/5"
            >
              <RefreshCcw className="h-3.5 w-3.5" /> Actualiser
            </button>
          </div>
        </div>

        <div className="mt-8 rounded-3xl border border-foreground/10 bg-card/70 p-5">
          <div className="flex flex-wrap gap-3">
            <label className="text-xs text-foreground/50">
              Ce que vous partagez
              <select
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value as "" | LaboratoryFeedbackType)}
                className="mt-2 block rounded-xl border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="">Tous</option>
                {Object.entries(laboratoryTypeLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            <label className="text-xs text-foreground/50">
              Où en est l’amélioration
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as "" | LaboratoryFeedbackStatus)}
                className="mt-2 block rounded-xl border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="">Tous</option>
                {Object.entries(laboratoryStatusLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
          </div>
          <p className="mt-4 text-xs text-foreground/40">
            {canManage ? "Vue interne des retours volontaires du Monde." : "Vous retrouvez ici la trace de vos contributions au Laboratoire."}
          </p>
        </div>

        {error && (
          <p className="mt-6 rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive/85">
            {error}
          </p>
        )}

        {busy && !visibleItems.length ? (
          <p className="mt-10 text-sm text-foreground/45">Chargement du Laboratoire…</p>
        ) : visibleItems.length === 0 ? (
          <div className="mt-10 rounded-3xl border border-dashed border-foreground/12 px-6 py-12 text-center">
            <p className="text-sm text-foreground/50">Aucune contribution n’est visible avec ces filtres pour le moment.</p>
          </div>
        ) : (
          <div className="mt-10 space-y-4">
            {visibleItems.map((item) => {
              const contextLines = describeLaboratoryContext(item.context);
              const journey = describeLaboratoryJourney(item.context);
              return (
                <article key={item.id} className="rounded-3xl border border-foreground/10 bg-card/70 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-foreground/10 bg-foreground/[.04] px-3 py-1 text-[10px] uppercase tracking-[.18em] text-foreground/55">{item.labId}</span>
                        <span className="rounded-full border border-foreground/10 px-3 py-1 text-[10px] uppercase tracking-[.18em] text-foreground/50">{laboratoryTypeLabels[item.type]}</span>
                        <span className="rounded-full border border-foreground/10 px-3 py-1 text-[10px] uppercase tracking-[.18em] text-foreground/50">{laboratoryStatusLabels[item.status]}</span>
                      </div>
                      <p className="mt-3 text-xs text-foreground/38">
                        {new Date(item.createdAt).toLocaleString("fr-FR")} · {item.authoredByCurrentUser ? "vous" : "membre du Monde"}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          focusWorld({
                            route: "/user-portal",
                            phase: item.context.phase,
                            view: item.context.view,
                            panel: item.context.panel,
                            auditView: item.context.auditView,
                            momentId: item.context.momentId,
                            entityKind: item.context.entityKind,
                            entityId: item.context.entityId,
                          });
                          navigate("/user-portal");
                        }}
                        className="inline-flex items-center gap-2 rounded-full border border-foreground/15 px-3 py-2 text-xs text-foreground/70 hover:bg-foreground/5"
                      >
                        Revenir à ce contexte <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                      {canManage && (
                        <select
                          value={item.status}
                          onChange={(event) => void updateStatus(item.id, event.target.value as LaboratoryFeedbackStatus)}
                          className="rounded-full border border-foreground/15 bg-background px-3 py-2 text-xs text-foreground/75"
                        >
                          {Object.entries(laboratoryStatusLabels).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                    <div className="rounded-2xl border border-foreground/8 bg-background/50 p-4">
                    <p className="text-[10px] uppercase tracking-[.22em] text-foreground/38">Vous avez observé</p>
                    <p className="mt-3 text-sm leading-6 text-foreground/80">{item.message}</p>
                    </div>
                    <div className="rounded-2xl border border-foreground/8 bg-background/50 p-4">
                    <p className="text-[10px] uppercase tracking-[.22em] text-foreground/38">AIME a déjà le contexte</p>
                    {journey && (
                      <p className="mt-3 text-sm leading-6 text-foreground/72">{journey}</p>
                    )}
                    {contextLines.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-foreground/45">
                        {contextLines.map((line) => (
                          <span key={line} className="rounded-full border border-foreground/10 bg-foreground/[.03] px-3 py-1">
                            {line}
                          </span>
                        ))}
                      </div>
                    )}
                    {!journey && contextLines.length === 0 && (
                      <p className="mt-3 text-sm text-foreground/45">Aucun contexte léger n’était disponible pour ce retour.</p>
                    )}
                    </div>
                  </div>
                  <p className="mt-4 text-xs text-foreground/45">
                    {laboratoryStatusDescriptions[item.status]}
                  </p>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
