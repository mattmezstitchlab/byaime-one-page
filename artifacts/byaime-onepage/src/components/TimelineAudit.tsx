import { useEffect, useState } from "react";
import { ArrowRight, Link2 } from "lucide-react";
import { auditTimelineConnections, buildTimelineIndex } from "@/lib/timeline-graph";
import type { WorldFocusRequest } from "@/lib/world-focus";
import { useProject } from "@/store/project-store";
import { CenteredBlock } from "./CenteredBlock";

type AuditView = "connected" | "isolated" | "dangling" | "music";

export function TimelineAudit() {
  const { project } = useProject();
  const [view, setView] = useState<AuditView>();
  const [focusRequest, setFocusRequest] = useState<WorldFocusRequest>();

  useEffect(() => {
    const applyFocus = (request?: WorldFocusRequest) => {
      if (!request?.auditView) return;
      if (request.auditView === "isolated" || request.auditView === "dangling" || request.auditView === "music" || request.auditView === "connected") {
        setView(request.auditView);
        setFocusRequest(request);
      }
    };
    const listener = (event: Event) => applyFocus((event as CustomEvent<WorldFocusRequest>).detail);
    window.addEventListener("aime:focus-world", listener);
    return () => window.removeEventListener("aime:focus-world", listener);
  }, []);
  if (!project) return null;
  const audit = auditTimelineConnections(project);
  const index = buildTimelineIndex(project);
  const connected = [...index.entities.entries()]
    .filter(([entityKey]) => index.reverse.has(entityKey))
    .map(([entityKey, entity]) => ({ entity, events: index.reverse.get(entityKey) || [] }));

  const views = [
    { id: "connected" as const, label: "Éléments liés", value: audit.connected },
    { id: "isolated" as const, label: "Sans lien", value: audit.isolated.length },
    { id: "dangling" as const, label: "Liens à vérifier", value: audit.dangling.length },
    { id: "music" as const, label: "Musique ajoutée à la main", value: audit.manualMusic.length },
  ];

  const titles: Record<AuditView, string> = {
    connected: "Les liens visibles",
    isolated: "Les éléments encore isolés",
    dangling: "Les liens à réparer",
    music: "Les morceaux sans service",
  };

  return (
    <>
      <details className="mx-auto mb-16 max-w-3xl rounded-2xl border border-foreground/10 bg-foreground/[.025] p-4">
        <summary className="cursor-pointer text-xs uppercase tracking-widest text-foreground/55">Vérifier les liens entre les éléments</summary>
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
          {views.map(item => (
            <button key={item.id} type="button" onClick={() => setView(item.id)} className="group rounded-xl bg-foreground/5 p-3 text-left transition hover:bg-foreground/10 focus:outline-none focus-visible:ring-1 focus-visible:ring-white">
              <span className="flex items-start justify-between gap-2">
                <span className="text-foreground/35 transition group-hover:text-foreground/65">{item.label}</span>
                <ArrowRight className="h-3 w-3 text-foreground/20 transition group-hover:translate-x-0.5 group-hover:text-foreground/70" />
              </span>
              <span className="mt-1 block text-lg">{item.value}</span>
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs text-foreground/40">Chaque nombre ouvre désormais les relations qu’il représente. Rien ne reste caché derrière une statistique.</p>
      </details>

      {view && (
        <CenteredBlock eyebrow="Graphe du Monde" title={titles[view]} description="AIME rend visibles les relations qui relient les personnes, les tâches, les documents et les Moments." onClose={() => setView(undefined)} size="lg">
          <div className="space-y-2">
            {view === "connected" && connected.map(({ entity, events }) => (
              <div key={`${entity.kind}:${entity.id}`} className="border-b border-foreground/[.08] py-4">
                <p className="text-[10px] uppercase tracking-[.16em] text-foreground/35">{entity.kind}</p>
                <p className="mt-1 text-sm text-foreground/85">{entity.label}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-foreground/45">
                  {events.map(event => <span key={event.id} className="inline-flex items-center gap-2"><Link2 className="h-3 w-3" />{event.title}</span>)}
                </div>
              </div>
            ))}
            {view === "isolated" && audit.isolated.map(entity => (
              <div key={`${entity.kind}:${entity.id}`} className={`flex flex-wrap items-center justify-between gap-3 border-b border-foreground/[.08] py-4 ${focusRequest?.entityKind === entity.kind && focusRequest?.entityId === entity.id ? "rounded-xl bg-foreground/[.03] px-3" : ""}`}>
                <div><p className="text-[10px] uppercase tracking-[.16em] text-foreground/35">{entity.kind}</p><p className="mt-1 text-sm">{entity.label}</p></div>
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs text-foreground/30">À relier à un Moment</span>
                                  </div>
              </div>
            ))}
            {view === "dangling" && audit.dangling.map(({ eventId, relation }) => {
              const event = index.events.get(eventId);
              return <div key={`${eventId}:${relation.kind}:${relation.id}`} className={`border-b border-foreground/[.08] py-4 ${focusRequest?.momentId === eventId && focusRequest?.entityKind === relation.kind && focusRequest?.entityId === relation.id ? "rounded-xl bg-foreground/[.03] px-3" : ""}`}><p className="text-sm">{event?.title || "Moment introuvable"}</p><p className="mt-1 text-xs text-foreground/45">{relation.kind} · référence absente {relation.id}</p></div>;
            })}
            {view === "music" && audit.manualMusic.map(track => (
              <div key={track.id} className={`border-b border-foreground/[.08] py-4 ${focusRequest?.entityKind === "music" && focusRequest?.entityId === track.id ? "rounded-xl bg-foreground/[.03] px-3" : ""}`}><p className="text-sm">{track.title}</p><p className="mt-1 text-xs text-foreground/45">{track.artist} · à rechercher auprès d’un service autorisé</p></div>
            ))}
            {((view === "connected" && !connected.length) || (view === "isolated" && !audit.isolated.length) || (view === "dangling" && !audit.dangling.length) || (view === "music" && !audit.manualMusic.length)) && (
              <p className="py-10 text-center text-sm text-foreground/35">Rien à afficher dans cette vue.</p>
            )}
          </div>
        </CenteredBlock>
      )}
    </>
  );
}