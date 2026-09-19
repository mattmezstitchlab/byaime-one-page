import { useState } from "react";
import {
  CalendarCheck2,
  ClipboardList,
  Clapperboard,
  Coins,
  FileText,
  HeartHandshake,
  Image as ImageIcon,
  ListMusic,
  MapPin,
  MessageCircle,
  Music4,
  Plus,
  Minus,
  Salad,
  Search,
  Share2,
  Info,
  Timer,
  Users,
  UsersRound,
  Armchair,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { MomentAction, MomentFact, MomentIconId } from "@/lib/moment-context";
import { useI18n } from "@/lib/i18n";

/*
 * Les repères et actions d'un Moment, affichés DANS la Timeline.
 *
 * Ce composant ne possède aucune donnée : il reçoit le modèle dérivé par
 * `buildMomentContext` (lib/moment-context.ts), lui-même calculé depuis le
 * WorldProject. Un repère affiché ici et la même information dans le panneau
 * détaillé viennent donc exactement de la même source.
 *
 * Deux variantes : `dark` (scènes immersives de la Timeline) et `light`
 * (cartes de la régie du Jour J), pour rester dans le langage visuel existant.
 */

const ICONS: Record<MomentIconId, LucideIcon> = {
  place: MapPin,
  search: Search,
  people: UsersRound,
  doc: FileText,
  message: MessageCircle,
  money: Coins,
  images: ImageIcon,
  music: Music4,
  list: ListMusic,
  guests: Users,
  seating: Armchair,
  diet: Salad,
  planning: CalendarCheck2,
  run: ClipboardList,
  clock: Timer,
  clip: Clapperboard,
  video: Clapperboard,
  thanks: HeartHandshake,
  share: Share2,
  info: Info,
  check: CalendarCheck2,
};

export function MomentFacts({ facts, variant = "dark" }: { facts: MomentFact[]; variant?: "dark" | "light" }) {
  const { t } = useI18n();
  if (facts.length === 0) return null;
  return (
    <ul
      aria-label={t("moment.facts.aria")}
      className={cn(
        /* Une scène immersive se lit centrée ; une carte du fil se lit à gauche,
           comme la suite du texte. */
        "flex flex-wrap gap-x-5 gap-y-2",
        variant === "dark" ? "justify-center text-white/70" : "justify-start text-[var(--agency-body)]",
      )}
    >
      {facts.map(fact => {
        const Icon = ICONS[fact.icon];
        return (
          <li key={fact.id} className="flex min-w-0 items-center gap-2 text-[10px] uppercase tracking-[.16em]">
            <Icon className={cn("h-3 w-3 shrink-0", variant === "dark" ? "text-white/50" : "text-foreground/40")} />
            <span>{fact.label}</span>
            {fact.value && (
              <span className={cn("truncate normal-case tracking-normal", variant === "dark" ? "text-white/85" : "text-foreground/85")}>
                {fact.value}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function MomentActions({
  actions,
  primaryCount,
  onAction,
  variant = "dark",
}: {
  actions: MomentAction[];
  primaryCount: number;
  onAction: (action: MomentAction) => void;
  variant?: "dark" | "light";
}) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);
  if (actions.length === 0) return null;
  const overflow = actions.length - primaryCount;
  const visible = expanded ? actions : actions.slice(0, primaryCount);

  const pill = variant === "dark"
    ? "border-white/25 bg-white/10 text-white/85 backdrop-blur-md hover:bg-white hover:text-black"
    : "border-[var(--agency-hairline)] bg-white text-[var(--agency-body)] hover:border-[var(--agency-ink)]/35 hover:text-[var(--agency-ink)]";

  return (
    <div
      aria-label={t("moment.actions.aria")}
      className={cn("flex flex-wrap items-center gap-2", variant === "dark" ? "justify-center" : "justify-start")}
    >
      {visible.map(action => {
        const Icon = ICONS[action.icon];
        return (
          <button
            key={action.id}
            type="button"
            data-testid={`moment-action-${action.id}`}
            onClick={event => {
              event.stopPropagation();
              onAction(action);
            }}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] uppercase tracking-[.14em] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current",
              pill,
            )}
          >
            <Icon className="h-3 w-3" />
            {action.label}
          </button>
        );
      })}
      {overflow > 0 && (
        <button
          type="button"
          data-testid="moment-action-more"
          aria-expanded={expanded}
          onClick={event => {
            event.stopPropagation();
            setExpanded(value => !value);
          }}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] uppercase tracking-[.14em] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current",
            pill,
          )}
        >
          {expanded ? <Minus className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
          {expanded ? t("moment.less") : `${t("moment.more")} · ${overflow}`}
        </button>
      )}
    </div>
  );
}
