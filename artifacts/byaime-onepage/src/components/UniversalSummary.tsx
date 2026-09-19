import type { WorldProject } from "@/lib/types";


export function UniversalSummary({ project, onAcceptModule, onRejectModule }: {
  project: WorldProject;
  onAcceptModule?: (id: string) => void;
  onRejectModule?: (id: string) => void;
}) {
  const universal = project.universal;
  if (!universal) return null;

  const confirmed = universal.facts.filter(f => f.status === "confirme");
  const toVerify = universal.facts.filter(f => f.status === "a_verifier" || f.status === "proposition_aime");

  return (
    <section data-testid="universal-summary" className="mx-auto w-full max-w-5xl space-y-6 px-6 py-8 md:px-12">
      <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-400">Monde : {project.title}</p>
        <h2 className="mt-2 font-display text-2xl font-medium">Ce qu’AIME a compris</h2>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div>
            <h3 className="text-sm font-semibold">Situation actuelle</h3>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600">
              {universal.situation.length ? universal.situation.join(" · ") : "À préciser"}
              {universal.actorDetail ? ` · ${universal.actorDetail}` : ""}
              {project.trajectory?.current.map(c => c.value).join(" · ") ? ` — ${project.trajectory?.current.map(c => c.value).join(" · ")}` : ""}
            </p>
            {universal.situationFree && (
              <p className="mt-2 text-xs italic text-zinc-500">“{universal.situationFree}”</p>
            )}
          </div>
          <div>
            <h3 className="text-sm font-semibold">Direction</h3>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600">
              {universal.intention.length ? universal.intention.join(" · ") : "À explorer"}
            </p>
            {project.trajectory?.desired.length ? (
              <p className="mt-1 text-xs text-zinc-500">{project.trajectory.desired.map(d => d.value).join(" · ")}</p>
            ) : null}
          </div>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Informations confirmées</h4>
            {confirmed.length ? (
              <ul className="mt-2 space-y-1">
                {confirmed.map(f => (
                  <li key={f.id} data-testid={`fact-${f.id}`} className="flex items-center gap-2 text-sm">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    {f.label}
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] text-emerald-800">confirmé</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-zinc-400" data-testid="facts-confirmed-empty">Aucune — vous pouvez confirmer ci-dessous.</p>
            )}
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Éléments à vérifier</h4>
            {toVerify.length ? (
              <ul className="mt-2 space-y-1">
                {toVerify.map(f => (
                  <li key={f.id} data-testid={`fact-${f.id}`} className="flex items-center gap-2 text-sm">
                    <span className="h-2 w-2 rounded-full bg-zinc-400" />
                    {f.label}
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] text-zinc-600">
                      {f.status === "proposition_aime" ? "proposition AIME" : "à vérifier"}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-zinc-400">Rien à vérifier.</p>
            )}
          </div>
        </div>

        {universal.nextQuestion && (
          <div data-testid="next-question" className="mt-6 rounded-2xl border border-zinc-900/10 bg-zinc-900 px-5 py-4 text-sm text-white">
            <p className="text-xs uppercase tracking-[0.16em] text-white/60">Prochaine question utile</p>
            <p className="mt-1 font-medium">{universal.nextQuestion}</p>
          </div>
        )}

        {project.modulesProposed && project.modulesProposed.length > 0 && (
          <div className="mt-6">
            <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Modules proposés</h4>
            <p className="mt-1 text-xs text-zinc-500">AIME propose, vous décidez — aucun module n’est ajouté silencieusement.</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {project.modulesProposed.map(m => (
                <div key={m.id} data-testid={`module-${m.id}`} className="flex items-start justify-between rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                  <div>
                    <p className="text-sm font-medium">{m.label}</p>
                    <p className="mt-1 text-xs text-zinc-500">{m.description}</p>
                    <p className="mt-2 text-[10px] uppercase tracking-[0.14em] text-zinc-400">
                      {m.status === "proposed" ? "proposé" : m.status}
                      {m.provenance?.source === "aime" ? " · proposition AIME" : ""}
                    </p>
                  </div>
                  {m.status === "proposed" && onAcceptModule && onRejectModule && (
                    <div className="ml-3 flex shrink-0 flex-col gap-1">
                      <button data-testid={`module-${m.id}-accept`} onClick={() => onAcceptModule(m.id)} className="rounded-full bg-zinc-900 px-3 py-1 text-xs text-white hover:bg-zinc-800">Accepter</button>
                      <button data-testid={`module-${m.id}-reject`} onClick={() => onRejectModule(m.id)} className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs hover:bg-zinc-50">Refuser</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {project.trajectory && (
          <div data-testid="trajectory" className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5">
            <h4 className="text-sm font-semibold">Trajectoire proposée</h4>
            <p className="mt-1 text-xs text-zinc-500">
              Situation actuelle → souhaitée → écart → étapes → preuves → décisions.
              <span className="ml-1 rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-600">proposition AIME — jamais appliquée automatiquement</span>
            </p>
            <ul className="mt-4 space-y-2">
              {project.trajectory.steps.map(step => (
                <li key={step.id} data-testid={`trajectory-step-${step.id}`} className="flex gap-3 rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-2">
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-zinc-900" />
                  <div>
                    <p className="text-sm font-medium">{step.title}</p>
                    <p className="text-xs text-zinc-600">{step.description}</p>
                    <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-zinc-400">
                      {step.confidence === "proposition_aime" ? "proposition AIME" : step.confidence}
                      {step.source ? ` · ${step.source}` : ""}
                      {step.sourceDate ? ` · ${step.sourceDate}` : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-4 rounded-xl bg-zinc-900/5 px-3 py-2 text-[11px] leading-relaxed text-zinc-600">
              {project.trajectory.disclaimer}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
