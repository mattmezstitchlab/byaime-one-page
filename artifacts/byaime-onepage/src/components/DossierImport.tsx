import { useMemo } from "react";
import { useI18n, type I18nKey } from "@/lib/i18n";
import { useProject } from "@/store/project-store";
import {
  dossierMemberToProvider,
  dossierMergeUpdates,
  dossierMusicTracks,
  dossierStepToMoment,
  dossierSubtitle,
  dossierToProjectDraft,
  newDossierMoments,
  newDossierProviders,
  planDossierPropagation,
  type DispooDossierV1,
  type DossierPlanItem,
} from "@/lib/dispoo-dossier";
import { formatBudget } from "@/lib/money";
import type { UniversalDrop } from "@/lib/universal-import";
import { trackEvent } from "@/lib/analytics";

const GROUP_ORDER: DossierPlanItem["group"][] = ["identity", "providers", "moments", "music", "logistics", "budget", "skipped"];

const GROUP_KEYS: Record<DossierPlanItem["group"], I18nKey> = {
  identity: "dossier.group.identity",
  providers: "dossier.group.providers",
  moments: "dossier.group.moments",
  music: "dossier.group.music",
  logistics: "dossier.group.logistics",
  budget: "dossier.group.budget",
  skipped: "dossier.group.skipped",
};

const FIELD_KEYS = {
  city: "dossier.field.city",
  venue: "dossier.field.venue",
  guests: "dossier.field.guests",
  subtitle: "dossier.field.subtitle",
  visual: "dossier.field.visual",
  parking: "dossier.field.parking",
  accessibility: "dossier.field.accessibility",
  weatherFallback: "dossier.field.weatherFallback",
} as const;

const SKIP_KEYS = {
  duplicate: "dossier.skip.duplicate",
  badTime: "dossier.skip.badTime",
  filled: "dossier.skip.filled",
  unmapped: "dossier.skip.unmapped",
} as const;

/*
 * L'écran de propagation du Dossier Jour J : déposé comme un fichier, le
 * dossier prépare le Monde au lieu d'être classé. Rien ne s'applique sans
 * confirmation — le plan liste créations, compléments et doublons ignorés.
 * Sans Monde, le dossier en crée un (vierge, sans démo) ; sinon, il complète
 * les blancs et ajoute prestataires et Moments.
 */
export function DossierImport({
  dossier,
  fileName,
  source = "dispoo",
  dropped = [],
  onDone,
  onCancel,
  title,
  description,
}: {
  dossier: DispooDossierV1;
  fileName: string;
  source?: "dispoo" | "universal";
  dropped?: UniversalDrop[];
  onDone: (message: string) => void;
  onCancel: () => void;
  /* Le héros raconte la même lecture autrement : « Voici ce que nous avons compris ». */
  title?: string;
  description?: string;
}) {
  const { project, createProjectFromDraft, updateProject, addEntity, canEdit } = useProject();
  const { t, locale } = useI18n();
  const plan = useMemo(() => planDossierPropagation(dossier, project), [dossier, project]);
  const actionable = plan.filter(item => item.group !== "skipped");
  const providerCount = plan.filter(item => item.group === "providers").length;
  const momentCount = plan.filter(item => item.group === "moments").length;

  const confirm = () => {
    if (!canEdit || actionable.length === 0) return;
    /* La carte nomme le Monde : l'accroche du premier site prime sur le libellé générique. */
    if (!project) {
      createProjectFromDraft(dossierToProjectDraft(dossier), dossierSubtitle(dossier) ?? t("dossier.import.subtitle"));
    } else {
      const updates = dossierMergeUpdates(dossier, project);
      if (Object.keys(updates).length > 0) updateProject(updates);
    }
    for (const member of newDossierProviders(dossier, project)) {
      addEntity("providers", dossierMemberToProvider(member));
    }
    for (const moment of newDossierMoments(dossier, project)) {
      addEntity("timeline", dossierStepToMoment(moment.step, moment.time));
    }
    for (const track of dossierMusicTracks(dossier, project)) {
      addEntity("music", track);
    }
    trackEvent("dossier_imported", {
      providers: providerCount,
      moments: momentCount,
      music: plan.filter(item => item.group === "music").length,
      mode: project ? "merge" : "create",
      source,
    });
    onDone(t("dossier.import.success", { providers: providerCount, moments: momentCount }));
  };

  const dayLabel = (dayMs: number) =>
    new Date(dayMs).toLocaleDateString(locale === "en" ? "en-US" : "fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  const clockLabel = (time: number) =>
    new Date(time).toLocaleTimeString(locale === "en" ? "en-US" : "fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  const priceLabel = (priceCents?: number) =>
    priceCents === undefined
      ? null
      : formatBudget(priceCents / 100, project?.currency ?? dossier.budget?.currency);
  const trim = (value: string) => (value.length > 90 ? `${value.slice(0, 90)}…` : value);

  const renderItem = (item: DossierPlanItem, index: number) => {
    if (item.group === "identity" && item.action === "create") {
      return (
        <li key={`identity-${index}`} className="py-2">
          <p className="text-sm text-foreground/90">{t("dossier.plan.create", { name: item.name })}</p>
          <p className="mt-0.5 text-xs text-foreground/45">{dayLabel(item.dayMs)}{item.place ? ` · ${item.place}` : ""}</p>
        </li>
      );
    }
    if (item.group === "identity") {
      return (
        <li key={`identity-${index}`} className="py-2">
          <p className="text-sm text-foreground/90">{t("dossier.plan.fill", { field: t(FIELD_KEYS[item.field]), value: item.value })}</p>
        </li>
      );
    }
    if (item.group === "providers") {
      const price = priceLabel(item.member.priceCents);
      const name = item.member.name?.trim();
      return (
        <li key={`provider-${index}`} className="py-2">
          <p className="text-sm text-foreground/90">{item.role}{name ? ` — ${name}` : ` · ${t("dossier.plan.toFind")}`}</p>
          {(price || item.member.contact) && (
            <p className="mt-0.5 text-xs text-foreground/45">{[price, item.member.contact?.trim()].filter(Boolean).join(" · ")}</p>
          )}
        </li>
      );
    }
    if (item.group === "moments") {
      return (
        <li key={`moment-${index}`} className="py-2">
          <p className="text-sm text-foreground/90 tabular-nums">{clockLabel(item.time)} — {item.step.title.trim()}</p>
          {item.step.location?.trim() && <p className="mt-0.5 text-xs text-foreground/45">{item.step.location.trim()}</p>}
        </li>
      );
    }
    if (item.group === "music") {
      return (
        <li key={`music-${index}`} className="py-2">
          <p className="text-sm text-foreground/90">{item.title}{item.artist ? ` — ${item.artist}` : ""}</p>
        </li>
      );
    }
    if (item.group === "logistics") {
      return (
        <li key={`logistics-${index}`} className="py-2">
          <p className="text-sm text-foreground/90">{t("dossier.plan.fill", { field: t(FIELD_KEYS[item.field]), value: trim(item.value) })}</p>
        </li>
      );
    }
    if (item.group === "budget") {
      return (
        <li key={`budget-${index}`} className="py-2">
          <p className="text-sm text-foreground/90 tabular-nums">{formatBudget(item.total, item.currency)}</p>
        </li>
      );
    }
    return (
      <li key={`skipped-${index}`} className="py-2">
        <p className="text-sm text-foreground/45">{item.label} · {t(SKIP_KEYS[item.reason])}</p>
      </li>
    );
  };

  return (
    <div data-testid="dossier-import">
      <p className="text-[10px] uppercase tracking-[.22em] text-foreground/45">{t(source === "universal" ? "dossier.import.eyebrowUniversal" : "dossier.import.eyebrow")}</p>
      <h3 className="mt-2 font-display text-2xl font-light">{title ?? t("dossier.import.title")}</h3>
      <p className="mt-1 truncate text-xs text-foreground/40">{fileName}</p>
      <p className="mt-3 text-sm font-light leading-relaxed text-foreground/60">{description ?? t("dossier.import.desc")}</p>

      {actionable.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-foreground/10 bg-foreground/[.03] p-5 text-center text-sm text-foreground/50">
          {t("dossier.import.empty")}
        </p>
      ) : (
        <div className="mt-6 space-y-5 text-left">
          {GROUP_ORDER.map(group => {
            const entries = plan.filter(item => item.group === group);
            const extra = group === "skipped" ? dropped : [];
            if (entries.length === 0 && extra.length === 0) return null;
            return (
              <section key={group}>
                <h4 className="text-[10px] uppercase tracking-[.2em] text-foreground/40">
                  {t(GROUP_KEYS[group])} · {entries.length + extra.length}
                </h4>
                <ul className="mt-1 divide-y divide-foreground/[.07]">
                  {entries.map(renderItem)}
                  {extra.map((drop, index) => (
                    <li key={`dropped-${index}`} className="py-2">
                      <p className="text-sm text-foreground/45">{drop.label} · {t(SKIP_KEYS[drop.reason])}</p>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      {!canEdit && actionable.length > 0 && (
        <p className="mt-6 text-xs text-foreground/45">{t("dossier.import.readonly")}</p>
      )}
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-foreground/15 px-5 py-2.5 text-sm text-foreground/70 transition hover:bg-foreground/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {t("dossier.import.cancel")}
        </button>
        {actionable.length > 0 && (
          <button
            type="button"
            disabled={!canEdit}
            onClick={confirm}
            data-testid="dossier-import-confirm"
            className="rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition disabled:cursor-not-allowed disabled:opacity-35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {t("dossier.import.confirm")}
          </button>
        )}
      </div>
    </div>
  );
}
