import { auditTimelineConnections } from "@/lib/timeline-graph";
import { useProject } from "@/store/project-store";

export function TimelineAudit() {
  const { project } = useProject();
  if (!project) return null;
  const audit = auditTimelineConnections(project);
  return <details className="mx-auto mb-16 max-w-3xl rounded-2xl border border-white/10 bg-white/[.025] p-4"><summary className="cursor-pointer text-xs uppercase tracking-widest text-white/55">Audit des connexions du graphe</summary><div className="mt-4 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">{[["Connexions", audit.connected], ["Isolées", audit.isolated.length], ["Liens cassés", audit.dangling.length], ["Musique manuelle", audit.manualMusic.length]].map(([label, value]) => <div key={label as string} className="rounded-xl bg-white/5 p-3"><p className="text-white/35">{label}</p><p className="mt-1 text-lg">{value}</p></div>)}</div><p className="mt-3 text-xs text-white/40">La recherche et les extraits musicaux nécessitent une intégration autorisée. Aucun connecteur n’est configuré ni simulé.</p></details>;
}