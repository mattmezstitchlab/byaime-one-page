import { useEffect, useMemo, useState } from "react";
import { FlaskConical, MessageCircleHeart, Send } from "lucide-react";
import { useLocation } from "wouter";
import { useProject } from "@/store/project-store";
import { CenteredBlock } from "@/components/CenteredBlock";
import {
  LABORATORY_FEEDBACK_TYPES,
  cleanLaboratoryContext,
  consumeLaboratoryDraft,
  describeLaboratoryContext,
  describeLaboratoryJourney,
  laboratoryTypeLabels,
  openLaboratory,
  type LaboratoryContext,
  type LaboratoryDraft,
  type LaboratoryFeedbackItem,
  type LaboratoryFeedbackType,
} from "@/lib/laboratory";

function routeFromLocation(pathname: string): LaboratoryContext["route"] {
  if (pathname.startsWith("/user-portal")) return "world";
  if (pathname.startsWith("/laboratoire")) return "laboratory";
  return "profile";
}

export function buildBaseLaboratoryContext(input: {
  pathname: string;
  projectId?: string;
  role?: string;
}): LaboratoryContext {
  return cleanLaboratoryContext({
    projectId: input.projectId,
    role: input.role,
    route: routeFromLocation(input.pathname),
    path: input.pathname,
  });
}

export function LaboratoryCenter() {
  const [location, navigate] = useLocation();
  const { project, currentRole } = useProject();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<LaboratoryFeedbackType>("remarque");
  const [message, setMessage] = useState("");
  const [context, setContext] = useState<LaboratoryContext>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<LaboratoryFeedbackItem>();

  const baseContext = useMemo(
    () => buildBaseLaboratoryContext({
      pathname: location,
      projectId: project?.id,
      role: currentRole,
    }),
    [currentRole, location, project?.id],
  );

  useEffect(() => {
    const applyDraft = (draft?: LaboratoryDraft) => {
      if (!draft) return;
      setType(draft.type || "remarque");
      setMessage(draft.message || "");
      setContext(cleanLaboratoryContext({ ...baseContext, ...draft.context }));
      setError("");
      setSuccess(undefined);
      setOpen(true);
    };
    const pending = consumeLaboratoryDraft();
    if (pending) applyDraft(pending);
    const listener = (event: Event) => applyDraft((event as CustomEvent<LaboratoryDraft>).detail);
    window.addEventListener("aime:open-laboratory", listener);
    return () => window.removeEventListener("aime:open-laboratory", listener);
  }, [baseContext]);

  useEffect(() => {
    if (!open) return;
    setContext((current) => cleanLaboratoryContext({ ...baseContext, ...current }));
  }, [baseContext, open]);

  const submit = async () => {
    if (!project?.id || message.trim().length < 3) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/projects/${project.id}/laboratory-feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          message: message.trim(),
          context: cleanLaboratoryContext(context),
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error || `Erreur ${response.status}`);
      const saved = body as LaboratoryFeedbackItem;
      setSuccess(saved);
      setMessage("");
      setType("remarque");
      setContext(baseContext);
      window.dispatchEvent(new CustomEvent("aime:laboratory-submitted", { detail: saved }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Retour impossible à enregistrer");
    } finally {
      setBusy(false);
    }
  };

  return open ? (
    <CenteredBlock
      eyebrow="Laboratoire"
      title="Vous observez quelque chose dans AIME"
      description="Le Laboratoire recueille vos retours volontaires. « À vérifier » reste séparé et réservé aux anomalies ou décisions détectées par AIME."
      onClose={() => setOpen(false)}
      size="lg"
    >
      <div className="space-y-5">
        {!project && (
          <div className="rounded-2xl border border-amber-300/20 bg-amber-300/5 p-4 text-sm text-foreground/70">
            Commencez par ouvrir un Monde pour associer un contexte utile à votre retour.
          </div>
        )}
        <div className="rounded-2xl border border-foreground/10 bg-foreground/[.025] p-4 text-sm text-foreground/60">
          <div className="flex items-start gap-3">
            <FlaskConical className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Vous décrivez ce que vous venez de remarquer. AIME ajoute seulement un contexte léger déjà disponible pour aider à comprendre, sans reformuler votre parole.
            </p>
          </div>
        </div>
        <label className="block">
          <span className="mb-2 block text-[10px] uppercase tracking-[.24em] text-foreground/40">Ce que vous souhaitez partager</span>
          <select
            value={type}
            onChange={(event) => setType(event.target.value as LaboratoryFeedbackType)}
            className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {LABORATORY_FEEDBACK_TYPES.map((value) => (
              <option key={value} value={value}>
                {laboratoryTypeLabels[value]}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-2 block text-[10px] uppercase tracking-[.24em] text-foreground/40">Vous observez</span>
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows={6}
            placeholder="Décrivez simplement ce que vous venez de vivre, remarquer ou ne pas comprendre."
            className="w-full rounded-3xl border border-border bg-card px-4 py-4 text-sm outline-none focus:border-foreground/25 focus:ring-1 focus:ring-foreground/20"
          />
        </label>
        <div className="rounded-2xl border border-foreground/10 bg-card p-4">
          <p className="text-[10px] uppercase tracking-[.24em] text-foreground/40">AIME a détecté</p>
          {describeLaboratoryJourney(context) && (
            <p className="mt-3 text-sm text-foreground/70">
              {describeLaboratoryJourney(context)}
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-foreground/55">
            {describeLaboratoryContext(context).map((line) => (
              <span key={line} className="rounded-full border border-foreground/10 bg-foreground/[.03] px-3 py-1">
                {line}
              </span>
            ))}
            {describeLaboratoryContext(context).length === 0 && (
              <span className="text-foreground/35">Aucun contexte léger disponible.</span>
            )}
          </div>
          <p className="mt-3 text-xs text-foreground/40">
            Le contexte affiché aide à situer votre retour, sans rejouer toute votre navigation.
          </p>
        </div>
        {error && (
          <p className="rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive/85">
            {error}
          </p>
        )}
        {success && (
          <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/5 p-4 text-sm text-foreground/70">
            <div className="flex items-start gap-3">
              <MessageCircleHeart className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
              <div>
                <p className="font-medium text-foreground">{success.labId} enregistré</p>
                <p className="mt-1">Vous pourrez retrouver cette contribution dans votre page Laboratoire et voir son évolution.</p>
              </div>
            </div>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!project || busy || message.trim().length < 3}
            onClick={() => void submit()}
            className="inline-flex rounded-full bg-foreground px-4 py-2.5 text-xs font-medium text-background disabled:opacity-40"
          >
            {busy ? "Enregistrement…" : "Partager au Laboratoire"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/laboratoire")}
            className="inline-flex items-center gap-2 rounded-full border border-foreground/15 px-4 py-2.5 text-xs text-foreground/70 hover:bg-foreground/5"
          >
            <Send className="h-3.5 w-3.5" /> Voir mon parcours
          </button>
          <button
            type="button"
            onClick={() => openLaboratory({ context: baseContext })}
            className="inline-flex rounded-full border border-foreground/15 px-4 py-2.5 text-xs text-foreground/55 hover:bg-foreground/5"
          >
            Réinitialiser le contexte
          </button>
        </div>
      </div>
    </CenteredBlock>
  ) : null;
}
