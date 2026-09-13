import { useEffect, useMemo } from "react";
import { CalendarClock, Mail, Megaphone, Phone, ScrollText, UserRound, X } from "lucide-react";
import { useProject } from "@/store/project-store";
import { useI18n } from "@/lib/i18n";
import { AIME_VISUALS, getAssetUrl } from "@/lib/assets";
import { formatClock } from "@/lib/day-run";
import { requestMessage, requestPanel } from "@/lib/person-spotlight-bus";
import { cn } from "@/lib/utils";
import type { Guest, Provider, ProviderCategory } from "@/lib/types";

/*
 * La mini-carte personne : un clic sur une vignette ronde (prestataire d'un
 * Moment, invité de la vue Personnes) ouvre ce petit panneau — qui est cette
 * personne, sa mission et son timing, puis des boutons d'action adaptés :
 * message direct, consigne Jour J (ou consigne à toute l'équipe du Moment
 * pour le chef d'orchestre), appel, fiche complète. Pensé pour la régie.
 */

const ORCHESTRATOR_HINT = /coordinat|organisat|wedding|planific|r[eé]gie|ma[iî]tre d|metteur en sc[eè]ne|event planner/i;
const PHONE_HINT = /^[+\d][\d\s.()/-]{5,}$/;

function stableIndex(id: string, modulo: number) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) % 997;
  return modulo === 0 ? 0 : hash % modulo;
}

export function PersonSpotlight({
  person,
  momentId,
  teamContacts = [],
  onClose,
}: {
  person: { kind: "guest" | "provider"; id: string };
  /** Le Moment d'où la carte a été ouverte (consignes pré-adressées). */
  momentId?: string;
  /** Contacts des autres prestataires du Moment (consigne d'équipe). */
  teamContacts?: string[];
  onClose: () => void;
}) {
  const { project } = useProject();
  const { t } = useI18n();

  // Capture + stop : Échap ne ferme que la carte, jamais la régie ou le panneau dessous.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      onClose();
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  const data = useMemo(() => {
    if (!project) return null;
    if (person.kind === "provider") {
      const provider = project.providers.find(item => item.id === person.id);
      if (!provider) return null;
      const moments = project.timeline
        .filter(event => (event.relations ?? []).some(relation => relation.kind === "provider" && relation.id === provider.id))
        .sort((a, b) => a.time - b.time)
        .slice(0, 3);
      return { kind: "provider" as const, provider, moments };
    }
    const guest = project.guests.find(item => item.id === person.id);
    if (!guest) return null;
    const table = project.tables.find(item => item.id === guest.tableId);
    return { kind: "guest" as const, guest, table };
  }, [project, person]);

  if (!data) return null;

  const isProvider = data.kind === "provider";
  const provider: Provider | undefined = isProvider ? data.provider : undefined;
  const guest: Guest | undefined = !isProvider ? (data as { guest: Guest }).guest : undefined;
  const name = provider?.name || provider?.role || guest?.name || "";
  const contact = provider?.contact || guest?.contact || "";
  const contextMoment = isProvider && momentId
    ? project!.timeline.find(event => event.id === momentId)
    : undefined;
  const orchestrator = !!provider && ORCHESTRATOR_HINT.test(`${provider.role} ${provider.category} ${provider.name ?? ""}`);
  const image = isProvider
    ? ((AIME_VISUALS.providersByCategory as Partial<Record<ProviderCategory, string>>)[provider!.category] ?? AIME_VISUALS.universes.service)
    : AIME_VISUALS.guestPortraitImages[stableIndex(person.id, AIME_VISUALS.guestPortraitImages.length)] ?? "";
  const teamRecipients = [...new Set([...(contact ? [contact] : []), ...teamContacts])].filter(Boolean);

  const openMessage = (subject: string, recipients: string) => {
    onClose();
    requestMessage({ recipients, subject, body: "" });
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={name}>
      <button type="button" aria-label={t("spotlight.close")} onClick={onClose} className="absolute inset-0 cursor-default bg-black/60 backdrop-blur-sm" />
      <div data-testid="person-spotlight" className="relative w-full max-w-xs overflow-hidden rounded-3xl border border-foreground/15 bg-card shadow-2xl">
        <div className="flex items-start gap-3 p-4">
          <span className="block h-14 w-14 shrink-0 overflow-hidden rounded-full border-2 border-foreground/15 bg-zinc-800">
            {image ? <img src={getAssetUrl(image)} alt="" className="h-full w-full object-cover" /> : (
              <span className="grid h-full w-full place-items-center text-foreground/40"><UserRound className="h-6 w-6" /></span>
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{name}</p>
            <p className="mt-0.5 text-[11px] text-foreground/55">
              {isProvider ? `${provider!.role} · ${provider!.category}` : t(`spotlight.role.${guest!.role}`)}
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {orchestrator && (
                <span className="rounded-full border border-brand-accent/40 bg-brand-accent/10 px-2 py-0.5 text-[9px] uppercase tracking-[.12em] text-brand-accent">
                  {t("spotlight.orchestrator")}
                </span>
              )}
              {isProvider ? (
                <span className="rounded-full border border-foreground/15 px-2 py-0.5 text-[9px] uppercase tracking-[.12em] text-foreground/60">
                  {t(`spotlight.provider.${provider!.status}`)}
                </span>
              ) : (
                <span className={cn(
                  "rounded-full border px-2 py-0.5 text-[9px] uppercase tracking-[.12em]",
                  guest!.rsvp === "confirme" ? "border-brand-accent/40 bg-brand-accent/10 text-brand-accent" : "border-foreground/15 text-foreground/60",
                )}>
                  {t(`spotlight.rsvp.${guest!.rsvp}`)}
                </span>
              )}
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label={t("spotlight.close")} className="rounded-full p-1.5 text-foreground/45 transition hover:bg-foreground/10 hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        {isProvider && data.moments.length > 0 && (
          <div className="border-t border-foreground/10 px-4 py-3">
            <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-[.16em] text-foreground/45">
              <CalendarClock className="h-3.5 w-3.5" />{t("spotlight.mission")}
            </p>
            <ul className="mt-2 space-y-1.5">
              {data.moments.map(moment => (
                <li key={moment.id} className="flex items-baseline gap-2 text-xs">
                  <span className="shrink-0 tabular-nums text-foreground/50">{formatClock(moment.time)}</span>
                  <span className="min-w-0 flex-1 truncate text-foreground/85">{moment.title}</span>
                  {moment.id === momentId && (
                    <span className="shrink-0 rounded-full bg-brand-accent/15 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-brand-accent">
                      {t("spotlight.thisMoment")}
                    </span>
                  )}
                </li>
              ))}
            </ul>
            {provider!.nextAction && (
              <p className="mt-2 flex items-start gap-1.5 text-[11px] text-foreground/55">
                <ScrollText className="mt-0.5 h-3 w-3 shrink-0" />{provider!.nextAction}
              </p>
            )}
          </div>
        )}

        {!isProvider && (
          <div className="border-t border-foreground/10 px-4 py-3">
            <ul className="space-y-1.5 text-xs text-foreground/70">
              {(data as { table?: { name: string } }).table && (
                <li>{t("spotlight.table")} · {(data as { table: { name: string } }).table.name}</li>
              )}
              {guest!.dietary && <li>{t("spotlight.diet")} · {guest!.dietary}</li>}
              <li className="flex flex-wrap gap-1.5 pt-0.5">
                {(["ceremony", "cocktail", "dinner", "brunch"] as const).filter(key => guest!.attendance[key]).map(key => (
                  <span key={key} className="rounded-full border border-foreground/10 px-2 py-0.5 text-[10px] text-foreground/55">
                    {t(`spotlight.attendance.${key}`)}
                  </span>
                ))}
              </li>
            </ul>
            {guest!.notes && <p className="mt-2 text-[11px] font-light text-foreground/50">{guest!.notes}</p>}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 border-t border-foreground/10 bg-foreground/[.03] p-3">
          <button
            type="button"
            disabled={!contact}
            onClick={() => contact && openMessage("", contact)}
            title={!contact ? t("spotlight.noContact") : undefined}
            className="inline-flex items-center justify-center gap-1.5 rounded-full border border-foreground/15 px-3 py-2 text-xs text-foreground/75 transition hover:border-foreground/30 hover:text-foreground disabled:opacity-35"
          >
            <Mail className="h-3.5 w-3.5" />{t("spotlight.message")}
          </button>
          {isProvider && contextMoment ? (
            <button
              type="button"
              disabled={!contact}
              onClick={() => contact && openMessage(t("spotlight.brief.subject", { moment: contextMoment.title, clock: formatClock(contextMoment.time) }), contact)}
              title={!contact ? t("spotlight.noContact") : undefined}
              className="inline-flex items-center justify-center gap-1.5 rounded-full bg-brand-accent px-3 py-2 text-xs font-medium text-white transition hover:opacity-90 disabled:opacity-35"
            >
              <Megaphone className="h-3.5 w-3.5" />{t("spotlight.brief")}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => { onClose(); requestPanel(isProvider ? "providers" : "guests"); }}
              className="inline-flex items-center justify-center gap-1.5 rounded-full border border-foreground/15 px-3 py-2 text-xs text-foreground/75 transition hover:border-foreground/30 hover:text-foreground"
            >
              <UserRound className="h-3.5 w-3.5" />{t("spotlight.file")}
            </button>
          )}
          {isProvider && contextMoment && teamRecipients.length >= 2 && (
            <button
              type="button"
              onClick={() => openMessage(t("spotlight.brief.subject", { moment: contextMoment.title, clock: formatClock(contextMoment.time) }), teamRecipients.join(", "))}
              className="col-span-2 inline-flex items-center justify-center gap-1.5 rounded-full border border-brand-accent/40 px-3 py-2 text-xs text-brand-accent transition hover:border-brand-accent/70"
            >
              <Megaphone className="h-3.5 w-3.5" />{t("spotlight.briefTeam", { count: teamRecipients.length })}
            </button>
          )}
          {PHONE_HINT.test(contact) && (
            <a
              href={`tel:${contact.replace(/[\s.]/g, "")}`}
              className="inline-flex items-center justify-center gap-1.5 rounded-full border border-foreground/15 px-3 py-2 text-xs text-foreground/75 transition hover:border-foreground/30 hover:text-foreground"
            >
              <Phone className="h-3.5 w-3.5" />{t("spotlight.call")}
            </a>
          )}
          {isProvider && contextMoment && (
            <button
              type="button"
              onClick={() => { onClose(); requestPanel("providers"); }}
              className={cn(
                "inline-flex items-center justify-center gap-1.5 rounded-full border border-foreground/15 px-3 py-2 text-xs text-foreground/75 transition hover:border-foreground/30 hover:text-foreground",
                teamRecipients.length < 2 && !PHONE_HINT.test(contact) && "col-span-2",
              )}
            >
              <UserRound className="h-3.5 w-3.5" />{t("spotlight.file")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
