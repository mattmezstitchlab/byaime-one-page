import {
  Check,
  Eye,
  Flower2,
  Mail,
  MapPin,
  Search,
  Utensils,
} from "lucide-react";
import { useI18n, type I18nKey } from "@/lib/i18n";
import { AimeOrb } from "@/components/AimeOrb";
import {
  getWeddingCapabilities,
  getWeddingNavigation,
  getWorldPhases,
} from "@/lib/wedding-navigation";
import { cn } from "@/lib/utils";

/**
 * Vitrine du Monde Mariage : l'équivalent de l'iPhone sur la page d'accueil
 * d'Apple. C'est une capture fidèle du vrai Monde, pas une maquette inventée :
 * la capsule temporelle, les entrées de la rangée et l'orbe viennent des mêmes
 * données et composants que l'application (phase Avant, vue propriétaire).
 * Seul le contenu d'exemple (Léa & Hugo) est illustratif. Aucune interaction.
 */
const MOMENTS = [
  { key: "showcase.m1", icon: MapPin, when: "12 mars", done: true },
  { key: "showcase.m2", icon: Utensils, when: "28 mars", done: true },
  { key: "showcase.m3", icon: Mail, when: "2 avril", done: true },
  { key: "showcase.m4", icon: Flower2, when: "showcase.upcoming", done: false },
] as const;

export function LandingShowcase() {
  const { t, locale } = useI18n();
  const phases = getWorldPhases(locale);
  const menu = getWeddingNavigation("avant", getWeddingCapabilities("owner"), locale).primary;

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

        {/* La vraie capsule temporelle : Avant / Le Jour J / Après. */}
        <div className="flex items-center justify-center gap-2 border-b border-border/70 px-4 py-3">
          {phases.map((phase, index) => (
            <span
              key={phase.id}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-[12px] font-medium",
                index === 0
                  ? "border-foreground bg-foreground text-background"
                  : "border-border text-muted-foreground",
              )}
            >
              {phase.label}
            </span>
          ))}
        </div>

        {/* La vraie rangée du Monde : entrées de la phase, Synthèse (Avant uniquement),
            puis l'œil du graphe et la loupe, fixes à droite — comme dans l'app. */}
        <div className="grid grid-cols-[1fr_minmax(0,auto)_1fr] items-center gap-2 border-b border-border/70 px-4 py-2.5">
          <span aria-hidden className="min-w-0" />
          <div className="flex min-w-0 items-center gap-2 overflow-hidden">
            {menu.map(entry => (
              <span
                key={entry.id}
                className="shrink-0 whitespace-nowrap rounded-full border border-foreground/10 px-4 py-2 text-[9px] uppercase tracking-[.13em] text-foreground/65"
              >
                {entry.label}
              </span>
            ))}
            <span className="shrink-0 whitespace-nowrap rounded-full border border-foreground/10 px-4 py-2 text-[9px] uppercase tracking-[.13em] text-foreground/65">
              {t("world.nav.overview")}
            </span>
          </div>
          <div aria-hidden className="flex min-w-0 items-center justify-end gap-1.5 text-foreground/65">
            <span className="grid h-9 w-9 place-items-center rounded-full border border-foreground/10">
              <Eye className="h-4 w-4" />
            </span>
            <span className="grid h-9 w-9 place-items-center rounded-full border border-foreground/10">
              <Search className="h-4 w-4" />
            </span>
          </div>
        </div>

        {/* Le hero du Monde, sur fond noir comme dans l'app. */}
        <div className="bg-[#FBFAF8] px-6 py-8 text-[#171410] md:px-8">
          <div className="flex items-start justify-between gap-6">
            <div>
              <h3 className="font-display text-2xl font-semibold tracking-tight">
                {t("showcase.title")}
              </h3>
              <p className="mt-1 text-[13px] text-[#171410]/60">{t("showcase.when")}</p>
            </div>
            {/* Anneau de progression, comme le compteur des tâches du hero. */}
            <div
              aria-hidden
              className="grid h-16 w-16 shrink-0 place-items-center rounded-full"
              style={{
                background: "conic-gradient(hsl(var(--brand-accent)) 64%, rgba(255,255,255,.14) 0)",
              }}
            >
              <span className="grid h-12 w-12 place-items-center rounded-full bg-[#FBFAF8] text-[11px] tabular-nums text-[#171410]">
                64%
              </span>
            </div>
          </div>

          <div className="mt-7 flex flex-wrap gap-x-10 gap-y-4">
            <Stat value="128" label={t("showcase.guestsStat")} />
            <Stat value="24 000 €" label={t("showcase.budgetStat")} />
            <Stat value="12" label={t("showcase.vendorsStat")} />
          </div>
        </div>

        <div className="p-6 md:p-8">
          <ul className="flex flex-col gap-2.5">
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
                      className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[hsl(var(--brand-accent))] text-[11px] text-[#171410]"
                    >
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                  )}
                </li>
              );
            })}
          </ul>

          {/* Le vrai orbe, qui ouvre tout dans l'app. */}
          <div className="flex justify-center pt-8">
            <AimeOrb size={56} label="+" />
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="font-display text-xl font-semibold tabular-nums text-[#171410]">{value}</p>
      <p className="mt-0.5 text-xs text-[#171410]/55">{label}</p>
    </div>
  );
}
