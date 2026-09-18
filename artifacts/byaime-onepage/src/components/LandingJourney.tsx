import type { ReactNode } from "react";
import {
  Check,
  CreditCard,
  MapPin,
  Sparkles,
} from "lucide-react";
import { useI18n, type I18nKey } from "@/lib/i18n";
import { AimeOrb } from "@/components/AimeOrb";
import { Reveal } from "@/components/Reveal";
import { getWorldPhases } from "@/lib/wedding-navigation";
import { cn } from "@/lib/utils";

/**
 * La visite du produit — une grande présentation VERTICALE, à l'image de la
 * Timeline qui est la colonne vertébrale du Monde. Un filet court au centre,
 * des nœuds numérotés, et à chaque étape une idée : le concept, la Timeline,
 * l'agent, les trois temps, la Carte — chacune illustrée par une capture
 * fidèle du produit dans un iPhone ou un iPad.
 *
 * Fidèle à la règle de la vitrine : ce sont des reconstitutions du vrai
 * produit en pur CSS (mêmes jetons, mêmes phases via `getWorldPhases`, même
 * orbe), jamais des photos ni des maquettes inventées. Le rendu serveur
 * affiche tout directement ; seul `Reveal` anime au défilement.
 */

type StopId = "concept" | "timeline" | "agent" | "phases" | "card";

const STOPS: ReadonlyArray<{
  id: StopId;
  kicker: I18nKey;
  title: I18nKey;
  text: I18nKey;
  tag: I18nKey;
  device: "phone" | "pad";
}> = [
  {
    id: "concept",
    kicker: "journey.step1.kicker",
    title: "journey.step1.title",
    text: "journey.step1.text",
    tag: "journey.step1.tag",
    device: "phone",
  },
  {
    id: "timeline",
    kicker: "journey.step2.kicker",
    title: "journey.step2.title",
    text: "journey.step2.text",
    tag: "journey.step2.tag",
    device: "phone",
  },
  {
    id: "agent",
    kicker: "journey.step3.kicker",
    title: "journey.step3.title",
    text: "journey.step3.text",
    tag: "journey.step3.tag",
    device: "phone",
  },
  {
    id: "phases",
    kicker: "journey.step4.kicker",
    title: "journey.step4.title",
    text: "journey.step4.text",
    tag: "journey.step4.tag",
    device: "pad",
  },
  {
    id: "card",
    kicker: "journey.step5.kicker",
    title: "journey.step5.title",
    text: "journey.step5.text",
    tag: "journey.step5.tag",
    device: "phone",
  },
];

export function LandingJourney() {
  const { t } = useI18n();

  return (
    <section
      id="landing-journey"
      data-testid="landing-journey"
      className="aime-apple-surface relative z-10 border-t border-border/60 bg-background py-24 md:py-36"
    >
      <div className="mx-auto max-w-6xl px-6">
        {/* ——— L'annonce de la visite ——— */}
        <Reveal className="mx-auto max-w-3xl text-center">
          <p className="aime-apple-eyebrow">{t("journey.eyebrow")}</p>
          <h2 className="aime-apple-title mt-5 text-4xl md:text-6xl">{t("journey.title")}</h2>
          <p className="aime-apple-lead mx-auto mt-5 max-w-2xl text-base md:text-lg">
            {t("journey.subtitle")}
          </p>
        </Reveal>

        {/* ——— La colonne vertébrale : la visite DÉFILE comme la Timeline ——— */}
        <ol className="relative mx-auto mt-20 max-w-5xl md:mt-28" data-testid="landing-journey-spine">
          {/* Le filet vertical : à gauche sur mobile, au centre sur grand écran. */}
          <div
            aria-hidden
            className="absolute bottom-4 left-[23px] top-4 w-px bg-[var(--agency-hairline)] md:left-1/2 md:-translate-x-1/2"
          />

          {STOPS.map((stop, index) => {
            const reversed = index % 2 === 1;
            return (
              <li
                key={stop.id}
                data-testid={`landing-journey-stop-${stop.id}`}
                className="relative pb-20 pl-16 last:pb-0 md:pb-28 md:pl-0"
              >
                {/* Le nœud numéroté, posé sur le filet. */}
                <span
                  aria-hidden
                  className="absolute left-[23px] top-1 z-10 -translate-x-1/2 md:left-1/2"
                >
                  <span className="grid h-12 w-12 place-items-center rounded-full border border-[var(--agency-hairline)] bg-[var(--agency-paper)] font-display text-sm font-semibold text-[var(--agency-ink)] shadow-[0_10px_30px_-16px_rgba(23,20,16,0.35)]">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </span>

                <Reveal>
                  <div
                    className={cn(
                      "grid items-center gap-10 md:grid-cols-2 md:gap-16",
                    )}
                  >
                    {/* La copie — toujours lisible, à gauche sur les étapes paires. */}
                    <div
                      className={cn(
                        "max-w-md text-left md:max-w-none",
                        reversed ? "md:order-2 md:pl-14" : "md:order-1 md:pr-14 md:text-right",
                      )}
                    >
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--agency-eyebrow)]">
                        {t(stop.kicker)}
                      </p>
                      <h3 className="mt-3 font-display text-3xl font-semibold tracking-tight text-[var(--agency-ink)] md:text-4xl">
                        {t(stop.title)}
                      </h3>
                      <p className="mt-4 text-base leading-relaxed text-[var(--agency-body)]">
                        {t(stop.text)}
                      </p>
                      <p className="mt-5 inline-flex items-center gap-2 rounded-full border border-[var(--agency-hairline)] bg-[var(--agency-ink)]/[0.03] px-4 py-1.5 text-xs font-medium text-[var(--agency-eyebrow)]">
                        <Sparkles aria-hidden className="h-3.5 w-3.5" />
                        {t(stop.tag)}
                      </p>
                    </div>

                    {/* La capture fidèle du produit, dans son appareil. */}
                    <div className={cn("flex justify-center", reversed ? "md:order-1" : "md:order-2")}>
                      {stop.device === "pad" ? (
                        <IPadFrame label={t("journey.device.pad")}>
                          <PhasesScreen />
                        </IPadFrame>
                      ) : (
                        <IPhoneFrame label={t("journey.device.phone")}>
                          {stop.id === "concept" && <ComposerScreen />}
                          {stop.id === "timeline" && <TimelineScreen />}
                          {stop.id === "agent" && <AgentScreen />}
                          {stop.id === "card" && <CardScreen />}
                        </IPhoneFrame>
                      )}
                    </div>
                  </div>
                </Reveal>
              </li>
            );
          })}
        </ol>

        {/* ——— Le principe, en bandeau de clôture ——— */}
        <Reveal className="mx-auto mt-24 max-w-3xl text-center md:mt-32">
          <p className="aime-apple-eyebrow">{t("journey.principle.eyebrow")}</p>
          <h3 className="aime-apple-title mt-5 text-3xl md:text-5xl">{t("journey.principle.title")}</h3>
          <p className="aime-apple-lead mx-auto mt-5 max-w-2xl text-base md:text-lg">
            {t("journey.principle.text")}
          </p>
        </Reveal>
      </div>
    </section>
  );
}

/* —————————————————————————————— Appareils —————————————————————————————— */

function IPhoneFrame({ label, children }: { label: string; children: ReactNode }) {
  return (
    <figure
      data-testid="journey-device-phone"
      aria-label={label}
      className="w-[250px] sm:w-[280px]"
    >
      <div className="rounded-[3rem] border border-[var(--agency-ink)]/15 bg-[var(--agency-ink)] p-[9px] shadow-[0_40px_90px_-45px_rgba(23,20,16,0.55)]">
        <div className="relative overflow-hidden rounded-[2.5rem] bg-[var(--agency-paper)]">
          {/* L'îlot dynamique, sobre. */}
          <div aria-hidden className="absolute left-1/2 top-2 z-10 h-[18px] w-20 -translate-x-1/2 rounded-full bg-[var(--agency-ink)]" />
          <div className="aspect-[9/19] pt-9">{children}</div>
        </div>
      </div>
    </figure>
  );
}

function IPadFrame({ label, children }: { label: string; children: ReactNode }) {
  return (
    <figure
      data-testid="journey-device-pad"
      aria-label={label}
      className="w-full max-w-[460px]"
    >
      <div className="rounded-[2rem] border border-[var(--agency-ink)]/15 bg-[var(--agency-ink)] p-[11px] shadow-[0_50px_110px_-50px_rgba(23,20,16,0.5)]">
        <div className="relative overflow-hidden rounded-[1.4rem] bg-[var(--agency-paper)]">
          <div aria-hidden className="absolute left-1/2 top-2 z-10 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-[var(--agency-ink)]/30" />
          <div className="aspect-[4/3] pt-5">{children}</div>
        </div>
      </div>
    </figure>
  );
}

/* ————————————————————————— Écrans fidèles ————————————————————————— */

/** Le concept : une phrase suffit, et l'orbe la transforme en Monde. */
function ComposerScreen() {
  const { t } = useI18n();
  return (
    <div aria-hidden className="flex h-full flex-col px-4 pb-4">
      <ScreenChrome label={t("showcase.bar")} />
      <div className="flex flex-1 flex-col items-center justify-center px-2 text-center">
        <span className="grid h-10 w-10 place-items-center rounded-full bg-[var(--agency-ink)]/[0.05] text-[var(--agency-ink)]">
          <Sparkles className="h-4 w-4" />
        </span>
        <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--agency-eyebrow)]">
          {t("journey.screen.concept.eyebrow")}
        </p>
        <p className="mt-3 font-display text-lg font-semibold leading-snug text-[var(--agency-ink)]">
          {t("journey.screen.concept.phrase")}
        </p>
        <div className="mt-5 w-full rounded-2xl border border-[var(--agency-ink)]/12 bg-[var(--agency-ink)]/[0.03] px-3 py-3 text-left">
          <p className="text-[11px] leading-relaxed text-[var(--agency-body)]">
            {t("journey.screen.concept.hint")}
          </p>
        </div>
        <div className="mt-6">
          <AimeOrb size={44} label="+" />
        </div>
      </div>
    </div>
  );
}

/** La Timeline verticale : des Moments le long d'un fil. */
function TimelineScreen() {
  const { t } = useI18n();
  const moments: ReadonlyArray<{ key: I18nKey; when: string; done: boolean; icon: typeof MapPin }> = [
    { key: "showcase.m1", when: "12 mars", done: true, icon: MapPin },
    { key: "showcase.m2", when: "28 mars", done: true, icon: MapPin },
    { key: "showcase.m3", when: "2 avril", done: false, icon: MapPin },
    { key: "showcase.m4", when: t("showcase.upcoming"), done: false, icon: MapPin },
  ];
  return (
    <div aria-hidden className="flex h-full flex-col px-4 pb-4">
      <ScreenChrome label={t("showcase.title")} />
      <div className="relative mt-3 flex-1 pl-5">
        <span className="absolute bottom-1 left-[7px] top-1 w-px bg-[var(--agency-hairline)]" />
        <ul className="space-y-3.5">
          {moments.map(m => {
            const Icon = m.icon;
            return (
              <li key={m.key} className="relative">
                <span
                  className={cn(
                    "absolute -left-5 top-1 grid h-4 w-4 place-items-center rounded-full border",
                    m.done
                      ? "border-[hsl(var(--brand-accent))] bg-[hsl(var(--brand-accent))]"
                      : "border-[var(--agency-hairline)] bg-[var(--agency-paper)]",
                  )}
                >
                  {m.done && <Check className="h-2.5 w-2.5 text-[var(--agency-paper)]" strokeWidth={3} />}
                </span>
                <div className="flex items-center gap-2 rounded-xl border border-[var(--agency-ink)]/10 bg-[var(--agency-ink)]/[0.02] px-2.5 py-2">
                  <Icon className="h-3.5 w-3.5 shrink-0 text-[var(--agency-eyebrow)]" />
                  <span className="truncate text-[11px] font-medium text-[var(--agency-ink)]">{t(m.key)}</span>
                  <span className="ml-auto shrink-0 text-[10px] text-[var(--agency-eyebrow)]">{m.when}</span>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="mt-3 flex justify-center">
        <AimeOrb size={40} label="+" />
      </div>
    </div>
  );
}

/** L'agent : l'orbe ouvre le panneau, une seule porte d'entrée. */
function AgentScreen() {
  const { t } = useI18n();
  const entries: I18nKey[] = [
    "journey.screen.agent.ask",
    "journey.screen.agent.doc",
    "journey.screen.agent.folders",
  ];
  return (
    <div aria-hidden className="flex h-full flex-col px-4 pb-4">
      <ScreenChrome label={t("showcase.bar")} />
      <div className="mt-4 flex-1">
        <div className="flex items-center gap-2 rounded-2xl border border-[var(--agency-ink)]/10 bg-[var(--agency-ink)]/[0.03] px-3 py-2.5">
          <AimeOrb size={26} label="+" />
          <span className="text-[11px] text-[var(--agency-body)]">{t("journey.screen.agent.bubble")}</span>
        </div>
        <ul className="mt-3 space-y-2">
          {entries.map(key => (
            <li
              key={key}
              className="flex items-center gap-2.5 rounded-xl border border-[var(--agency-ink)]/10 px-3 py-2.5"
            >
              <span className="grid h-6 w-6 place-items-center rounded-lg bg-[var(--agency-ink)]/[0.05] text-[var(--agency-ink)]">
                <MapPin className="h-3 w-3" />
              </span>
              <span className="text-[11px] font-medium text-[var(--agency-ink)]">{t(key)}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-3 flex justify-center">
        <AimeOrb size={44} label="+" />
      </div>
    </div>
  );
}

/** Les trois temps : Avant / Le Jour J / Après, les vraies phases du produit. */
function PhasesScreen() {
  const { t, locale } = useI18n();
  const phases = getWorldPhases(locale);
  return (
    <div aria-hidden className="flex h-full flex-col px-5 pb-5">
      <ScreenChrome label={t("showcase.bar")} />
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        {phases.map((phase, index) => (
          <span
            key={phase.id}
            className={cn(
              "rounded-full border px-3 py-1.5 text-[11px] font-medium",
              index === 0
                ? "border-[var(--agency-ink)] bg-[var(--agency-ink)] text-[var(--agency-paper)]"
                : "border-[var(--agency-hairline)] text-[var(--agency-body)]",
            )}
          >
            {phase.label}
          </span>
        ))}
      </div>
      <div className="mt-5 flex-1 rounded-2xl bg-[var(--agency-ink)] p-5 text-[var(--agency-paper)]">
        <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--agency-paper)]/50">
          {t("journey.screen.phases.eyebrow")}
        </p>
        <p className="mt-2 font-display text-xl font-semibold tracking-tight">{t("showcase.title")}</p>
        <p className="mt-1 text-[11px] text-[var(--agency-paper)]/60">{t("showcase.when")}</p>
        <div className="mt-4 grid grid-cols-3 gap-3">
          <PadStat value="128" label={t("showcase.guestsStat")} />
          <PadStat value="24k€" label={t("showcase.budgetStat")} />
          <PadStat value="12" label={t("showcase.vendorsStat")} />
        </div>
      </div>
    </div>
  );
}

/** La Carte personnelle : une identité portable, espace séparé. */
function CardScreen() {
  const { t } = useI18n();
  return (
    <div aria-hidden className="flex h-full flex-col px-4 pb-4">
      <ScreenChrome label={t("journey.screen.card.bar")} />
      <div className="flex flex-1 flex-col justify-center">
        <div className="rounded-3xl bg-[var(--agency-ink)] p-5 text-[var(--agency-paper)] shadow-[0_30px_60px_-35px_rgba(23,20,16,0.6)]">
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-[0.22em] text-[var(--agency-paper)]/50">AIME</p>
            <CreditCard className="h-4 w-4 text-[var(--agency-paper)]/60" />
          </div>
          <p className="mt-6 font-display text-xl font-semibold tracking-tight">{t("journey.screen.card.name")}</p>
          <p className="mt-1 text-[11px] text-[var(--agency-paper)]/60">{t("journey.screen.card.role")}</p>
          <div className="mt-6 flex items-center justify-between border-t border-[var(--agency-paper)]/15 pt-3">
            <span className="text-[10px] text-[var(--agency-paper)]/50">{t("journey.screen.card.portable")}</span>
            <span className="h-2 w-2 rounded-full bg-[hsl(var(--brand-accent))]" />
          </div>
        </div>
        <p className="mt-4 text-center text-[10px] leading-relaxed text-[var(--agency-eyebrow)]">
          {t("journey.screen.card.hint")}
        </p>
      </div>
    </div>
  );
}

/* —————————————————————————————— Aides ——————————————————————————————— */

/** La barre d'état sobre en haut de chaque écran d'appareil. */
function ScreenChrome({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-between border-b border-[var(--agency-hairline)] pb-2">
      <span className="text-[10px] font-semibold tracking-wide text-[var(--agency-ink)]">{label}</span>
      <span className="flex items-center gap-1">
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--agency-ink)]/20" />
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--agency-ink)]/20" />
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--agency-ink)]/20" />
      </span>
    </div>
  );
}

function PadStat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="font-display text-base font-semibold tabular-nums">{value}</p>
      <p className="mt-0.5 text-[9px] text-[var(--agency-paper)]/55">{label}</p>
    </div>
  );
}
