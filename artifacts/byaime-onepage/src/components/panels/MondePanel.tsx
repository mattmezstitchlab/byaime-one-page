import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  normalizePanelId,
  pilotageTabFor,
  type WeddingModule,
  type WeddingPanelId,
} from "@/lib/wedding-navigation";
import { GuestPanel } from "./GuestPanel";
import { ProviderPanel } from "./ProviderPanel";
import { PlanningPanel } from "./PlanningPanel";
import { DayOfPanel } from "./DayOfPanel";
import { WeddingModulesPanel } from "./WeddingModulesPanel";

/*
 * Le panneau unique du Monde.
 *
 * P3 (14/09) : la fenêtre au menu de gauche (`BottomDock`) n'ouvre plus cinq
 * panneaux différents selon l'entrée cliquée — elle ouvre CELUI-CI, et le menu
 * de gauche en est la liste d'onglets. « Pilotage » regroupe ce qui se pilote
 * au quotidien (Personnes, Prestataires, Tâches) en trois onglets internes ;
 * Documents, Logistique et Messages restent des onglets de premier niveau.
 *
 * Les identifiants historiques ne cassent rien : `guests`, `providers`,
 * `seating`, `budget` et `planning` sont normalisés vers `pilotage` et posent
 * l'onglet correspondant. Un deep-link `/panel=seating` atterrit donc sur
 * Pilotage › Personnes, pas sur une fenêtre morte.
 */

const PILOTAGE_TABS = ["guests", "providers", "planning"] as const;
type PilotageTab = (typeof PILOTAGE_TABS)[number];

const TAB_LABEL_KEYS: Record<PilotageTab, "world.item.people" | "world.item.providers" | "world.item.tasks"> = {
  guests: "world.item.people",
  providers: "world.item.providers",
  planning: "world.item.tasks",
};

export function PilotagePanel({ initial, momentId }: { initial?: PilotageTab; momentId?: string | null }) {
  const { t } = useI18n();
  const [tab, setTab] = useState<PilotageTab>(initial ?? "guests");

  /* Un deep-link ou un clic sur une statistique change l'onglet demandé. */
  useEffect(() => {
    if (initial) setTab(initial);
  }, [initial]);

  return (
    <div data-testid="pilotage-panel">
      <div
        role="tablist"
        aria-label={t("world.panel.pilotage")}
        className="flex flex-wrap gap-1.5 border-b border-[var(--agency-hairline)] pb-4"
      >
        {PILOTAGE_TABS.map(id => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            data-testid={`pilotage-tab-${id}`}
            onClick={() => setTab(id)}
            className={cn(
              "rounded-full border px-4 py-2 text-[11px] uppercase tracking-[.14em] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--agency-ink)]/30",
              tab === id
                ? "border-[var(--agency-ink)] bg-[var(--agency-ink)] text-[var(--agency-paper)]"
                : "border-[var(--agency-hairline)] bg-[var(--agency-paper)] text-[var(--agency-body)] hover:border-[var(--agency-index)] hover:text-[var(--agency-ink)]",
            )}
          >
            {t(TAB_LABEL_KEYS[id])}
          </button>
        ))}
      </div>

      <div className="pt-7">
        {tab === "guests" && <GuestPanel momentId={momentId} />}
        {tab === "providers" && <ProviderPanel momentId={momentId} />}
        {tab === "planning" && <PlanningPanel />}
      </div>
    </div>
  );
}

/** Le contenu de la fenêtre unique, pour un panneau donné. */
export function MondePanel({ panel, momentId = null }: { panel: WeddingPanelId; momentId?: string | null }) {
  const normalized = normalizePanelId(panel);

  if (normalized === "pilotage") return <PilotagePanel initial={pilotageTabFor(panel)} momentId={momentId} />;
  if (normalized === "dayof") return <DayOfPanel />;
  if (normalized === "planning") return <PlanningPanel />;
  if (normalized === "guests") return <GuestPanel momentId={momentId} />;
  if (normalized === "providers") return <ProviderPanel momentId={momentId} />;
  return <WeddingModulesPanel module={normalized as WeddingModule} momentId={momentId} />;
}
