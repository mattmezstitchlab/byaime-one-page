import { useMemo, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { computeVisibilityModel, ENTITY_KIND_LABELS, type RoleVisibility } from "@/lib/timeline-graph";
import { getWorldPhaseShortLabel, PANEL_FOR_KIND, type WeddingPanelId } from "@/lib/wedding-navigation";
import { useI18n } from "@/lib/i18n";
import { useProject } from "@/store/project-store";

const ROLE_LABELS: Record<RoleVisibility, string> = {
  owner: "Propriétaire",
  planner: "Planificateur",
  family: "Proche",
  viewer: "Invité",
};

const ROLE_HINTS: Record<RoleVisibility, string> = {
  owner: "Tout est visible, finances et documents compris.",
  planner: "Tout sauf les actions réservées au propriétaire.",
  family: "Le partagé, sans finances ni documents privés.",
  viewer: "Seulement ce qui est relié à un Moment publié à l'audience.",
};

const KIND_COLORS: Record<string, string> = {
  event: "#ffffff",
  guest: "#64d2ff",
  table: "#30d158",
  provider: "#ff9f0a",
  task: "#ffd60a",
  payment: "#4cd964",
  document: "#bf5af2",
  music: "#ff375f",
  team: "#5ac8fa",
  message: "#0a84ff",
  logistics: "#ff9f0a",
  memory: "#bf5af2",
};

const NODE_R = 7;
const EVENT_X = 60;
const ENTITY_X = 620;
const EVENT_GAP = 64;
const ENTITY_GAP = 34;

function useVisibilityGraph(role: RoleVisibility) {
  const { project } = useProject();
  return useMemo(() => (project ? computeVisibilityModel(project, role) : null), [project, role]);
}

export function VisibilityGraph({ onOpenPanel }: { onOpenPanel?: (panel: WeddingPanelId) => void }) {
  const { locale } = useI18n();
  const [role, setRole] = useState<RoleVisibility>("viewer");
  const model = useVisibilityGraph(role);

  if (!model) return <p className="py-16 text-center text-sm text-foreground/40">Aucun Monde actif.</p>;

  const events = model.nodes.filter(node => node.kind === "event");
  const entities = model.nodes.filter(node => node.kind !== "event");
  const eventY = (index: number) => 48 + index * EVENT_GAP;
  const entityY = (index: number) => 40 + index * ENTITY_GAP;
  const height = Math.max(48 + events.length * EVENT_GAP, 40 + entities.length * ENTITY_GAP, 320) + 24;

  const masked = model.totalCount - model.visibleCount;
  const maskedReasons = model.nodes.filter(node => !node.visible && node.maskedReason).slice(0, 3);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3">
        <p className="text-[10px] uppercase tracking-[.2em] text-foreground/40">Vu comme</p>
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(ROLE_LABELS) as RoleVisibility[]).map(r => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              aria-pressed={role === r}
              className={cn(
                "rounded-full border px-4 py-2 text-[10px] uppercase tracking-[.14em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                role === r ? "border-foreground bg-foreground text-background" : "border-foreground/15 text-foreground/60 hover:border-foreground/35 hover:text-foreground",
              )}
            >
              {ROLE_LABELS[r]}
            </button>
          ))}
        </div>
        <p className="text-xs font-light leading-relaxed text-foreground/55">{ROLE_HINTS[role]}</p>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl border border-foreground/10 bg-foreground/[.035] p-4 text-xs">
        <span className="inline-flex items-center gap-2"><Eye className="h-4 w-4 text-foreground/60" /><span className="tabular-nums">{model.visibleCount} visibles</span></span>
        <span className="inline-flex items-center gap-2"><EyeOff className="h-4 w-4 text-foreground/35" /><span className="tabular-nums">{masked} masqués</span></span>
        {maskedReasons.length > 0 && (
          <span className="basis-full text-[11px] text-foreground/40">
            Exemples masqués : {maskedReasons.map(node => `${node.label} (${node.maskedReason})`).join(" · ")}
          </span>
        )}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-foreground/10 bg-background">
        <svg viewBox={`0 0 900 ${height}`} className="min-w-[760px] w-full" role="img" aria-label={`Graphe de visibilité vu comme ${ROLE_LABELS[role]}`}>
          {/* edges */}
          {model.edges.map((edge, i) => {
            const from = events.findIndex(node => node.key === edge.from);
            const to = entities.findIndex(node => node.key === edge.to);
            if (from < 0 || to < 0) return null;
            return (
              <line
                key={i}
                x1={EVENT_X + NODE_R}
                y1={eventY(from)}
                x2={ENTITY_X - NODE_R}
                y2={entityY(to)}
                stroke={edge.visible ? "hsl(var(--foreground) / 0.28)" : "hsl(var(--foreground) / 0.08)"}
                strokeWidth={1}
                strokeDasharray={edge.visible ? undefined : "3 4"}
              />
            );
          })}

          {/* event nodes */}
          {events.map((node, i) => {
            const color = KIND_COLORS.event;
            return (
              <g key={node.key} opacity={node.visible ? 1 : 0.32}>
                <circle cx={EVENT_X} cy={eventY(i)} r={NODE_R} fill={node.visible ? color : "transparent"} stroke={color} strokeWidth={1.5} strokeDasharray={node.visible ? undefined : "2 3"} />
                <text x={EVENT_X + NODE_R + 10} y={eventY(i) + 3.5} fill="currentColor" fontSize="11" className="font-medium">
                  {node.label.length > 30 ? `${node.label.slice(0, 30)}…` : node.label}
                </text>
                <text x={EVENT_X + NODE_R + 10} y={eventY(i) + 15} fill="currentColor" opacity="0.35" fontSize="8" className="uppercase">
                  {getWorldPhaseShortLabel(node.phase, locale)}
                </text>
              </g>
            );
          })}

          {/* entity nodes */}
          {entities.map((node, i) => {
            const color = KIND_COLORS[node.kind] ?? "#ffffff";
            const panel = node.kind !== "event" ? PANEL_FOR_KIND[node.kind as keyof typeof PANEL_FOR_KIND] : undefined;
            const clickable = Boolean(node.visible && panel && onOpenPanel);
            return (
              <g
                key={node.key}
                opacity={node.visible ? 1 : 0.32}
                onClick={clickable ? () => onOpenPanel?.(panel as WeddingPanelId) : undefined}
                style={clickable ? { cursor: "pointer" } : undefined}
              >
                {clickable && <title>Ouvrir dans son panneau</title>}
                <circle cx={ENTITY_X} cy={entityY(i)} r={NODE_R} fill={node.visible ? color : "transparent"} stroke={color} strokeWidth={clickable ? 2 : 1.5} strokeDasharray={node.visible ? undefined : "2 3"} />
                <text x={ENTITY_X + NODE_R + 10} y={entityY(i) + 3.5} fill="currentColor" fontSize="11" className={clickable ? "font-medium underline decoration-dotted underline-offset-2" : undefined}>
                  {node.label.length > 28 ? `${node.label.slice(0, 28)}…` : node.label}
                </text>
                <text x={ENTITY_X + NODE_R + 10} y={entityY(i) + 15} fill="currentColor" opacity="0.35" fontSize="8" className="uppercase">
                  {ENTITY_KIND_LABELS[node.kind as keyof typeof ENTITY_KIND_LABELS]}
                  {!node.visible && node.maskedReason ? ` · ${node.maskedReason}` : ""}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <p className="text-xs font-light leading-relaxed text-foreground/45">
        Chaque Moment est relié aux personnes, documents, paiements et décisions qu'il mobilise. Selon le rôle, AIME
        masque ce qui dépasse ses frontières : c'est le même Monde, mais chacun n'en voit que sa part.
        {onOpenPanel ? " Les éléments visibles et soulignés s'ouvrent d'un clic dans leur panneau." : ""}
      </p>
    </div>
  );
}
