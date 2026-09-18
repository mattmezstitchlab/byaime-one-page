import { ArrowRight, Check, FileText, Image as ImageIcon, ShieldCheck, Sparkles, X } from "lucide-react";
import type { AimeProposalOperation, AimeProposalPlan } from "@/lib/aime-orchestrator";
import { operationLabel } from "@/lib/aime-orchestrator";
import { cn } from "@/lib/utils";

const KIND_LABELS: Record<AimeProposalOperation["kind"], string> = {
  field: "Informations",
  moment: "Moments",
  provider: "Prestataires",
  task: "Tâches",
  text: "Textes",
  visual: "Visuels",
};

export function AimeProposalReview({
  plan,
  onChange,
  onApply,
  onReject,
  applied = false,
}: {
  plan: AimeProposalPlan;
  onChange: (plan: AimeProposalPlan) => void;
  onApply: (plan: AimeProposalPlan) => void;
  onReject: (plan: AimeProposalPlan) => void;
  applied?: boolean;
}) {
  const selectedCount = plan.operations.filter(operation => operation.selected).length;
  const toggle = (operationId: string) => {
    onChange({
      ...plan,
      operations: plan.operations.map(operation =>
        operation.id === operationId ? { ...operation, selected: !operation.selected } : operation,
      ),
    });
  };

  const editOperation = (operationId: string, value: string) => {
    const current = plan.operations.find(operation => operation.id === operationId);
    if (!current) return;
    let after: unknown = value;
    if (current.kind === "field" && current.after && typeof current.after === "object" && "value" in current.after) {
      const fact = current.after as { value: unknown; confidence: string };
      let nextValue: unknown = value;
      if (["budget", "guestsCount"].includes(current.target)) nextValue = value === "" ? null : Number(value);
      if (current.target === "pivot" && value) nextValue = new Date(`${value}T12:00:00`).getTime();
      after = { ...fact, value: nextValue, confidence: "confirme" };
    } else if (current.kind === "text" && current.after && typeof current.after === "object") {
      after = { ...current.after, body: value };
    } else if (["moment", "provider", "task"].includes(current.kind) && current.after && typeof current.after === "object") {
      const key = current.kind === "provider" ? "role" : "title";
      after = { ...current.after, [key]: value };
    }
    const operations = plan.operations.map(operation => operation.id === operationId ? { ...operation, after } : operation);
    const textProposals = plan.textProposals.map(proposal =>
      proposal.operationId === operationId ? { ...proposal, body: value } : proposal,
    );
    onChange({ ...plan, operations, textProposals });
  };

  const editableValue = (operation: AimeProposalOperation): { value: string; type: "text" | "number" | "date" } | null => {
    if (operation.kind === "text" && operation.after && typeof operation.after === "object" && "body" in operation.after) {
      return { value: String((operation.after as { body: string }).body), type: "text" };
    }
    if (["moment", "provider", "task"].includes(operation.kind) && operation.after && typeof operation.after === "object") {
      const key = operation.kind === "provider" ? "role" : "title";
      const value = (operation.after as Record<string, unknown>)[key];
      return { value: value === null || value === undefined ? "" : String(value), type: "text" };
    }
    if (operation.kind !== "field") return null;
    const raw = operation.after && typeof operation.after === "object" && "value" in operation.after
      ? (operation.after as { value: unknown }).value
      : operation.after;
    if (operation.target === "pivot" && typeof raw === "number") {
      const date = new Date(raw);
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      return { value, type: "date" };
    }
    return { value: raw === null || raw === undefined ? "" : String(raw), type: ["budget", "guestsCount"].includes(operation.target) ? "number" : "text" };
  };

  const groups = (Object.keys(KIND_LABELS) as AimeProposalOperation["kind"][])
    .map(kind => ({ kind, operations: plan.operations.filter(operation => operation.kind === kind) }))
    .filter(group => group.operations.length > 0);

  return (
    <section
      data-testid="aime-proposal-review"
      className="mt-5 overflow-hidden rounded-2xl border border-[var(--agency-ink)]/20 bg-[var(--agency-paper)] text-[var(--agency-ink)]"
    >
      <header className="border-b border-[var(--agency-hairline)] bg-[var(--agency-ink)]/[0.035] p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--agency-ink)] text-[var(--agency-paper)]">
            <Sparkles aria-hidden className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--agency-eyebrow)]">Passe AIME</p>
            <h3 className="mt-1 text-base font-medium">AIME propose, vous décidez</h3>
            <p className="mt-1 text-xs leading-relaxed text-[var(--agency-body)]">{plan.summary}</p>
          </div>
        </div>

        {plan.knownFacts.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5" data-testid="aime-proposal-known-facts">
            {plan.knownFacts.slice(0, 6).map(fact => (
              <span key={`${fact.label}-${fact.value}`} className="rounded-full border border-[var(--agency-hairline)] px-2.5 py-1 text-[10px] text-[var(--agency-body)]">
                <span className="text-[var(--agency-eyebrow)]">{fact.label} · </span>{fact.value}
              </span>
            ))}
          </div>
        )}
      </header>

      {plan.missing.length > 0 && (
        <div className="border-b border-[var(--agency-hairline)] bg-[#fbf7ef] p-4 sm:p-5" data-testid="aime-proposal-next-question">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--agency-eyebrow)]">Prochaine question utile</p>
          <p className="mt-2 flex items-start gap-2 text-sm font-medium">
            <ArrowRight aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
            {plan.missing[0].prompt}
          </p>
          <p className="mt-1 pl-6 text-xs leading-relaxed text-[var(--agency-body)]">{plan.missing[0].why}</p>
        </div>
      )}

      {groups.length > 0 && (
        <div className="divide-y divide-[var(--agency-hairline)]">
          {groups.map(group => (
            <div key={group.kind} className="p-4 sm:p-5" data-testid={`aime-proposal-group-${group.kind}`}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--agency-eyebrow)]">{KIND_LABELS[group.kind]}</p>
              <div className="mt-3 space-y-2">
                {group.operations.map(operation => (
                  <label
                    key={operation.id}
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition",
                      operation.selected
                        ? "border-[var(--agency-ink)]/20 bg-[var(--agency-ink)]/[0.025]"
                        : "border-[var(--agency-hairline)] opacity-55",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={operation.selected}
                      onChange={() => toggle(operation.id)}
                      disabled={applied}
                      aria-label={operationLabel(operation)}
                      data-testid={`aime-proposal-toggle-${operation.id}`}
                      className="mt-0.5 h-4 w-4 accent-[var(--agency-ink)]"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">{operationLabel(operation)}</span>
                      <span className="mt-1 block text-xs leading-relaxed text-[var(--agency-body)]">{operation.reason}</span>
                      {["field", "moment", "provider", "task"].includes(operation.kind) && editableValue(operation) && (
                        <input
                          type={editableValue(operation)!.type}
                          value={editableValue(operation)!.value}
                          onChange={event => editOperation(operation.id, event.target.value)}
                          disabled={applied || !operation.selected}
                          aria-label={`Modifier ${operation.label}`}
                          data-testid={`aime-proposal-edit-${operation.id}`}
                          className="mt-2 w-full rounded-lg border border-[var(--agency-hairline)] bg-[var(--agency-paper)] px-2.5 py-2 text-xs text-[var(--agency-ink)] focus:border-[var(--agency-ink)]/50 focus:outline-none disabled:opacity-55"
                        />
                      )}
                      <span className="mt-1.5 block text-[10px] text-[var(--agency-eyebrow)]">
                        Source : {operation.source} · confiance : {operation.confidence}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {plan.visualProposals.length > 0 && (
        <div className="border-t border-[var(--agency-hairline)] p-4 sm:p-5" data-testid="aime-proposal-visuals">
          <div className="flex items-center gap-2">
            <ImageIcon aria-hidden className="h-4 w-4" />
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--agency-eyebrow)]">Aperçu des visuels</p>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {plan.visualProposals.map(visual => (
              <div key={visual.id} className="overflow-hidden rounded-xl border border-[var(--agency-hairline)]">
                <div className="aspect-[16/8] bg-[var(--agency-ink)]/[0.05]">
                  {visual.visual.kind === "video" ? (
                    <video src={visual.previewUrl} muted loop playsInline controls className="h-full w-full object-cover" />
                  ) : (
                    <img src={visual.previewUrl} alt={`Proposition visuelle pour ${visual.title}`} className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="p-3">
                  <p className="text-sm font-medium">{visual.title}</p>
                  <p className="mt-1 text-xs text-[var(--agency-body)]">Zone sémantique : {visual.zone}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {plan.textProposals.length > 0 && (
        <div className="border-t border-[var(--agency-hairline)] p-4 sm:p-5" data-testid="aime-proposal-texts">
          <div className="flex items-center gap-2">
            <FileText aria-hidden className="h-4 w-4" />
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--agency-eyebrow)]">Aperçu des textes</p>
          </div>
          <div className="mt-3 space-y-3">
            {plan.textProposals.map(text => (
              <div key={text.id} className="rounded-xl border border-[var(--agency-hairline)] bg-[var(--agency-ink)]/[0.025] p-3">
                <p className="mb-2 text-xs font-medium text-[var(--agency-ink)]">{text.title} · {text.audience}</p>
                <textarea
                  value={text.body}
                  onChange={event => editOperation(text.operationId, event.target.value)}
                  disabled={applied}
                  aria-label={`Modifier ${text.title}`}
                  data-testid={`aime-proposal-text-edit-${text.id}`}
                  className="min-h-24 w-full resize-y rounded-lg border border-[var(--agency-hairline)] bg-[var(--agency-paper)] p-2.5 text-sm leading-relaxed text-[var(--agency-body)] focus:border-[var(--agency-ink)]/50 focus:outline-none disabled:opacity-55"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <footer className="flex flex-wrap items-center gap-2 border-t border-[var(--agency-hairline)] p-4 sm:p-5">
        {applied ? (
          <p className="flex items-center gap-2 text-xs font-medium text-[var(--agency-ink)]" data-testid="aime-proposal-applied">
            <Check aria-hidden className="h-4 w-4" /> Passe appliquée et journalisée dans le Monde.
          </p>
        ) : (
          <>
            <button
              type="button"
              disabled={selectedCount === 0}
              onClick={() => onApply(plan)}
              data-testid="aime-proposal-apply"
              className="inline-flex min-h-10 items-center gap-2 rounded-full bg-[var(--agency-ink)] px-4 text-xs font-semibold text-[var(--agency-paper)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-35"
            >
              <ShieldCheck aria-hidden className="h-3.5 w-3.5" />
              Appliquer {selectedCount} proposition{selectedCount > 1 ? "s" : ""}
            </button>
            <button
              type="button"
              onClick={() => onReject(plan)}
              data-testid="aime-proposal-reject"
              className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[var(--agency-hairline)] px-4 text-xs font-medium text-[var(--agency-body)] transition hover:border-[var(--agency-ink)] hover:text-[var(--agency-ink)]"
            >
              <X aria-hidden className="h-3.5 w-3.5" /> Refuser cette passe
            </button>
            <span className="ml-auto text-[10px] text-[var(--agency-eyebrow)]">Rien n'est écrit avant votre choix.</span>
          </>
        )}
      </footer>
    </section>
  );
}
