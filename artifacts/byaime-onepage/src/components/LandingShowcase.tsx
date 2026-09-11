import {
  Briefcase,
  CalendarDays,
  Camera,
  Check,
  Coins,
  Flower2,
  LayoutDashboard,
  Mail,
  MapPin,
  Users,
  Utensils,
} from "lucide-react";
import { useI18n, type I18nKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/**
 * Vitrine du Monde Mariage : l'équivalent de l'iPhone sur la page d'accueil
 * d'Apple. Une fenêtre produit sobre, avec pictogrammes fins, anneau de
 * progression et Timeline Avant / Jour J / Après. Aucune interaction : c'est
 * une image d'ambiance qui montre le résultat, pas l'outil lui-même.
 */
const NAV_ITEMS: ReadonlyArray<{
  key: I18nKey;
  icon: typeof LayoutDashboard;
  active?: boolean;
}> = [
  { key: "showcase.overview", icon: LayoutDashboard, active: true },
  { key: "showcase.guests", icon: Users },
  { key: "showcase.budget", icon: Coins },
  { key: "showcase.vendors", icon: Briefcase },
  { key: "showcase.dayof", icon: CalendarDays },
  { key: "showcase.memories", icon: Camera },
];

const MOMENTS = [
  { key: "showcase.m1", icon: MapPin, when: "12 mars", done: true },
  { key: "showcase.m2", icon: Utensils, when: "28 mars", done: true },
  { key: "showcase.m3", icon: Mail, when: "2 avril", done: true },
  { key: "showcase.m4", icon: Flower2, when: "showcase.upcoming", done: false },
] as const;

export function LandingShowcase() {
  const { t } = useI18n();

  return (
    <div data-testid="landing-showcase" role="img" aria-label={t("showcase.bar")}>
      <div className="aime-apple-window text-left">
        {/* Barre de fenêtre, sobre : pastilles neutres, sans couleur vive. */}
        <div className="flex items-center gap-2 border-b border-border/70 bg-foreground/[0.03] px-4 py-3">
          <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-foreground/20" />
          <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-foreground/20" />
          <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-foreground/20" />
          <span className="ml-3 text-xs font-medium tracking-wide text-muted-foreground">
            {t("showcase.bar")}
          </span>
        </div>

        <div className="grid min-h-[520px] grid-cols-1 md:grid-cols-[240px_1fr]">
          {/* Navigation latérale du Monde. */}
          <aside className="hidden flex-col gap-1 border-r border-border/70 p-3 md:flex">
            {NAV_ITEMS.map(item => {
              const Icon = item.icon;
              return (
                <span
                  key={item.key}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium",
                    item.active ? "bg-foreground/10 text-foreground" : "text-muted-foreground",
                  )}
                >
                  <Icon aria-hidden className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                  {t(item.key as I18nKey)}
                </span>
              );
            })}
          </aside>

          {/* Contenu principal. */}
          <div className="p-6 md:p-8">
            <div className="flex items-start justify-between gap-6">
              <div>
                <h3 className="font-display text-2xl font-semibold tracking-tight text-foreground">
                  {t("showcase.title")}
                </h3>
                <p className="mt-1 text-[13px] text-muted-foreground">{t("showcase.when")}</p>
              </div>
              {/* Anneau de progression, seul porteur de la couleur rose. */}
              <div
                aria-hidden
                className="grid h-16 w-16 shrink-0 place-items-center rounded-full"
                style={{
                  background: "conic-gradient(hsl(var(--brand-accent)) 64%, hsl(var(--foreground) / 0.1) 0)",
                }}
              >
                <span className="grid h-12 w-12 place-items-center rounded-full bg-card text-[11px] tabular-nums text-foreground">
                  64%
                </span>
              </div>
            </div>

            <div className="mt-7 flex flex-wrap gap-x-10 gap-y-4">
              <Stat value="128" label={t("showcase.guestsStat")} />
              <Stat value="24 000 €" label={t("showcase.budgetStat")} />
              <Stat value="12" label={t("showcase.vendorsStat")} />
            </div>

            <div className="mt-8 flex gap-2">
              {(["before", "day", "after"] as const).map(phase => (
                <span
                  key={phase}
                  className={cn(
                    "rounded-full border px-3.5 py-1.5 text-[12px] font-medium",
                    phase === "before"
                      ? "border-foreground bg-foreground text-background"
                      : "border-border text-muted-foreground",
                  )}
                >
                  {t(`showcase.phase.${phase}` as I18nKey)}
                </span>
              ))}
            </div>

            <ul className="mt-6 flex flex-col gap-2.5">
              {MOMENTS.map(moment => {
                const Icon = moment.icon;
                return (
                  <li
                    key={moment.key}
                    className="flex items-center gap-3.5 rounded-2xl border border-border/70 bg-foreground/[0.02] px-4 py-3"
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-foreground/[0.06] text-foreground">
                      <Icon aria-hidden className="h-4 w-4" strokeWidth={1.75} />
                    </span>
                    <span className="text-[13.5px] font-medium text-foreground">
                      {t(moment.key as I18nKey)}
                    </span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {moment.when === "showcase.upcoming" ? t("showcase.upcoming") : moment.when}
                    </span>
                    {moment.done && (
                      <span
                        aria-hidden
                        className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[hsl(var(--brand-accent))] text-[11px] text-white"
                      >
                        <Check className="h-3 w-3" strokeWidth={3} />
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="font-display text-xl font-semibold tabular-nums text-foreground">{value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
