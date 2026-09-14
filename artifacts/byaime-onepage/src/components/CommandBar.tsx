import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import { Link } from "wouter";
import {
  ArrowRight,
  Briefcase,
  CircleUserRound,
  Clock3,
  FolderClosed,
  ListChecks,
  LoaderCircle,
  Lock,
  Music,
  Plus,
  Settings,
  UserCog,
  Users,
  Wallet,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useProject } from "@/store/project-store";
import { executeCommand, parseFrenchCommand, proposeCommand, type CommandProposal } from "@/lib/command-agent";
import { askAssistant, type AssistantReply } from "@/lib/assistant";
import { CenteredBlock } from "@/components/CenteredBlock";
import { AimeOrb } from "@/components/AimeOrb";
import { DocumentShare } from "@/components/DocumentShare";
import { FOLDER_ICONS } from "@/components/WeddingFolders";
import { getFolderCount, getWeddingFolders, isFolderLocked, openWeddingFolder } from "@/lib/wedding-folders";
import {
  getWeddingCapabilities,
  getWeddingRailItems,
  isWeddingDestinationActive,
  type WeddingRailIcon,
} from "@/lib/wedding-navigation";
import { focusWorldDestination, getWorldNavState, subscribeWorldNav, type WorldNavState } from "@/lib/world-nav-state";
import { getPrivateNavigation, type PrivateDestinationId } from "@/lib/private-navigation";
import { trackEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";

const contextCopy: Record<PrivateDestinationId, { label: string; description: string }> = {
  profile: {
    label: "Profil",
    description: "AIME comprend votre Profil comme une projection du Monde actif. Commandez, demandez, ouvrez un dossier, déposez un fichier — ou naviguez : tout l'espace privé tient dans ce panneau.",
  },
  world: {
    label: "Monde",
    description: "AIME comprend le Monde actif, vérifie votre demande et demande votre accord avant tout changement. Commandez, demandez, ouvrez un dossier, déposez un fichier — ou naviguez : tout l'espace privé tient dans ce panneau.",
  },
};

const EXAMPLES = ["Voir les tâches restantes", "Repérer les horaires qui se chevauchent", "Vérifier les besoins alimentaires", "Préparer le programme des professionnels", "Ajouter 2 invités", "Où en est le budget ?"];

const WORLD_ICONS: Record<WeddingRailIcon, ComponentType<{ className?: string }>> = {
  timeline: Clock3,
  people: Users,
  providers: Briefcase,
  tasks: ListChecks,
  documents: FolderClosed,
  logistics: Settings,
  music: Music,
};

/*
 * Le panneau unique, ouvert par l'orbe (« + », Cmd/Ctrl + K, événement
 * `aime:open-ai`). Il centralise tout l'espace privé : le compositeur
 * intelligent (commande ou question), les sept dossiers universels, le dépôt
 * de fichier, la création, l'espace ME, la navigation du Monde et les
 * réglages. C'est lui qui a permis de retirer la barre latérale gauche.
 */
export function CommandBar({ context = "world", onOpenMe }: { context?: PrivateDestinationId; onOpenMe?: () => void }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [proposal, setProposal] = useState<CommandProposal>();
  const [error, setError] = useState("");
  const [result, setResult] = useState("");
  const [reply, setReply] = useState<AssistantReply>();
  const [replyPending, setReplyPending] = useState(false);
  const [notification, setNotification] = useState<NonNullable<CommandProposal["communication"]>>();
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [scheduleAt, setScheduleAt] = useState("");
  const [notificationBusy, setNotificationBusy] = useState(false);
  const { project, updateProject, canEdit, currentRole } = useProject();
  const { t, locale, setLocale } = useI18n();
  const [worldNav, setWorldNav] = useState<WorldNavState>(() => getWorldNavState());
  useEffect(() => {
    const listener = (event: KeyboardEvent) => { if (event.key === "k" && (event.metaKey || event.ctrlKey)) { event.preventDefault(); setOpen(value => !value); } };
    const openAI = () => setOpen(true);
    document.addEventListener("keydown", listener);
    window.addEventListener("aime:open-ai", openAI);
    return () => {
      document.removeEventListener("keydown", listener);
      window.removeEventListener("aime:open-ai", openAI);
    };
  }, []);
  useEffect(() => subscribeWorldNav(setWorldNav), []);
  const inspect = async () => {
    const message = input.trim();
    if (!message || replyPending) return;
    setError(""); setResult(""); setProposal(undefined); setReply(undefined);
    const command = parseFrenchCommand(message);
    if (!command) {
      // Pas une commande comprise : c'est une question, AIME répond sur place.
      setReplyPending(true);
      try {
        setReply(await askAssistant({ project, message, locale, role: currentRole }));
      } catch {
        setError("AIME n’a pas pu répondre pour le moment. Rien n’a été modifié.");
      } finally {
        setReplyPending(false);
      }
      return;
    }
    if (!project) {
      setError("Pour commander une action, commencez par créer un Monde avec le bouton orbe. Les questions, elles, sont les bienvenues dès maintenant.");
      return;
    }
    try { setProposal(proposeCommand(project, command)); } catch (reason) { setError(reason instanceof Error ? reason.message : "AIME ne peut pas vérifier cette demande pour le moment."); }
  };
  const execute = () => {
    if (!project || !proposal || (proposal.mutation && !canEdit)) return;
    try {
      const output = executeCommand(project, proposal, true);
      updateProject(output.project);
      setResult(output.message);
      if (proposal.communication) {
        setNotification(proposal.communication);
        setSelectedRecipients(proposal.communication.audiences.flatMap(audience => audience.email ? [audience.email] : []));
      }
      setProposal(undefined);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Cette action n’a pas pu être réalisée."); }
  };
  const sendNotification = async () => {
    if (!notification || !project || !selectedRecipients.length || !notification.subject.trim() || !notification.body.trim()) return;
    setNotificationBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/projects/${project.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "event_change",
          timelineEventId: notification.eventId,
          recipients: selectedRecipients,
          subject: notification.subject.trim(),
          body: notification.body.trim(),
          ...(scheduleAt ? { scheduledAt: new Date(scheduleAt).toISOString() } : {}),
          confirmed: true,
        }),
      });
      const delivery = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(delivery?.providerError || delivery?.error || "Le message n’a pas pu être enregistré.");
        return;
      }
      setResult(delivery.status === "scheduled"
        ? `Rappel programmé pour ${new Date(delivery.scheduledAt).toLocaleString("fr-FR")}. Vous pourrez l’annuler ou le replanifier dans Messages.`
        : `Message confirmé et envoyé à ${selectedRecipients.length} destinataire${selectedRecipients.length > 1 ? "s" : ""}.`);
      setNotification(undefined);
      setSelectedRecipients([]);
      setScheduleAt("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Le message n’a pas pu être envoyé.");
    } finally {
      setNotificationBusy(false);
    }
  };
  if (!open) return null;
  const currentContext = contextCopy[context];
  const close = () => setOpen(false);
  const folders = getWeddingFolders(locale);
  const destinations = getPrivateNavigation(locale);
  const rail = worldNav.active
    ? getWeddingRailItems(worldNav.phase, getWeddingCapabilities(worldNav.role || currentRole), locale)
    : [];
  return <>
    <CenteredBlock eyebrow={`AI · ${currentContext.label}`} title="Que souhaitez-vous faire ?" description={currentContext.description} onClose={close} size="lg" testId="orb-panel" leading={<AimeOrb size={52} />}>
      <p className="text-right">
        <Link
          href="/assistant"
          data-testid="command-open-assistant"
          onClick={close}
          className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-medium uppercase tracking-[.14em] text-foreground/55 transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/50"
        >
          {t("assistant.full.open")}
          <ArrowRight aria-hidden className="h-3.5 w-3.5" />
        </Link>
      </p>
      <form onSubmit={event => { event.preventDefault(); void inspect(); }} className="mt-3 flex gap-2">
        <input
          autoFocus
          value={input}
          onChange={event => setInput(event.target.value)}
          placeholder="Décaler la cérémonie de 15 minutes… ou : où en est le budget ?"
          aria-label="Commander une action ou poser une question"
          className="min-w-0 flex-1 rounded-2xl border border-border bg-foreground/5 px-4 py-3 text-sm outline-none focus:border-foreground/30 focus:ring-1 focus:ring-foreground/30"
        />
        <button disabled={replyPending || !input.trim()} className="inline-flex items-center gap-2 rounded-2xl bg-foreground px-4 text-sm text-background disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/50">
          {replyPending && <LoaderCircle className="h-4 w-4 animate-spin" />}
          Envoyer
        </button>
      </form>
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2">{EXAMPLES.map(example => <button key={example} onClick={() => setInput(example)} className="text-[10px] uppercase tracking-[.12em] text-foreground/40 transition hover:text-foreground/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/50 rounded px-1">{example}</button>)}</div>
      {!project && <p className="mt-5 rounded-2xl border border-foreground/10 bg-foreground/[.035] p-5 text-sm font-light leading-relaxed text-foreground/60">Utilisez le bouton orbe pour commencer votre premier Monde. En attendant, les questions restent ouvertes — seuls les changements attendent leur Monde. Rien ne sera créé ni modifié sans une action explicite de votre part.</p>}
      {error && <p className="mt-4 border-l border-destructive/50 py-1 pl-3 text-sm text-destructive/90">{error}</p>}
      {result && <p className="mt-4 border-l border-foreground/30 py-1 pl-3 text-sm text-foreground/80">{result}</p>}
      {reply && <div className="mt-4 rounded-2xl border border-border bg-foreground/5 p-5">
        <p className="flex items-center gap-2 text-[10px] uppercase tracking-[.14em] text-foreground/45"><AimeOrb size={20} /> AIME · {reply.mode === "ai" ? "réponse connectée" : "réponse locale, ancrée sur votre Monde"}</p>
        <p className="mt-3 whitespace-pre-wrap text-sm font-light leading-relaxed text-foreground/85">{reply.answer}</p>
        {reply.sources.length > 0 && <p className="mt-3 text-xs text-foreground/45">Sources : {reply.sources.slice(0, 3).map(source => source.label).join(" · ")}</p>}
        <p className="mt-3"><Link href="/assistant" onClick={close} className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground/70 transition hover:text-foreground">Continuer dans l’assistant <ArrowRight aria-hidden className="h-3.5 w-3.5" /></Link></p>
      </div>}
      {proposal && <div className="mt-4 rounded-xl border border-border bg-foreground/5 p-4"><p className="font-medium text-foreground">{proposal.title}</p><ul className="mt-3 space-y-1 text-xs text-foreground/60">{proposal.impact.length ? proposal.impact.map((line, index) => <li key={index}>• {line}</li>) : <li>Aucun élément concerné.</li>}</ul>
        {proposal.mutation ? <div className="mt-4"><p className="mb-2 text-xs text-foreground/50">Rien ne changera sans votre accord.</p><button disabled={!canEdit} onClick={execute} className="rounded-full bg-foreground px-4 py-2 text-xs text-background disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/50">{canEdit ? "Oui, faire ce changement" : "Vous pouvez consulter, mais pas modifier"}</button></div> : <p className="mt-4 text-xs text-foreground/40">Aucune information n’a été modifiée.</p>}
      </div>}
      {notification && <div className="mt-4 rounded-xl border border-success/25 bg-success/10 p-4">
        <p className="font-medium text-foreground">Prévenir les personnes concernées</p>
        <p className="mt-1 text-xs leading-relaxed text-foreground/55">Le changement est enregistré. Vérifiez maintenant le contenu et les destinataires : aucun message ne partira sans cette seconde confirmation.</p>
        <div className="mt-4 space-y-2">
          {notification.audiences.map(audience => audience.email
            ? <label key={`${audience.kind}:${audience.id}:${audience.email}`} className="flex items-start gap-2 rounded-lg border border-foreground/10 px-3 py-2 text-xs">
                <input type="checkbox" checked={selectedRecipients.includes(audience.email)} onChange={() => setSelectedRecipients(current => current.includes(audience.email!) ? current.filter(email => email !== audience.email) : [...current, audience.email!])} className="mt-0.5 accent-white" />
                <span><span className="block text-foreground/80">{audience.label}</span><span className="block text-foreground/45">{audience.email} · {audience.reason}</span></span>
              </label>
            : <div key={`${audience.kind}:${audience.id}`} className="rounded-lg border border-brand-accent/25 px-3 py-2 text-xs text-brand-accent">{audience.label} · aucune adresse e-mail vérifiable ({audience.reason})</div>)}
          {!notification.audiences.length && <p className="text-xs text-foreground/45">Aucune personne reliée avec un contact vérifiable. Le changement reste enregistré, mais aucun envoi n’est proposé.</p>}
        </div>
        <label className="mt-4 block text-[10px] uppercase tracking-[.12em] text-foreground/45">Objet<input value={notification.subject} onChange={event => setNotification(current => current ? { ...current, subject: event.target.value } : current)} className="mt-2 w-full rounded-lg border border-foreground/10 bg-background/20 px-3 py-2 text-sm normal-case tracking-normal outline-none focus:border-foreground/30" /></label>
        <label className="mt-3 block text-[10px] uppercase tracking-[.12em] text-foreground/45">Message<textarea value={notification.body} onChange={event => setNotification(current => current ? { ...current, body: event.target.value } : current)} rows={5} className="mt-2 w-full resize-y rounded-lg border border-foreground/10 bg-background/20 px-3 py-2 text-sm normal-case tracking-normal outline-none focus:border-foreground/30" /></label>
        <label className="mt-3 block text-[10px] uppercase tracking-[.12em] text-foreground/45">Programmer (facultatif)<input type="datetime-local" value={scheduleAt} onChange={event => setScheduleAt(event.target.value)} min={new Date().toISOString().slice(0, 16)} className="mt-2 rounded-lg border border-foreground/10 bg-background/20 px-3 py-2 text-sm normal-case tracking-normal outline-none focus:border-foreground/30" /></label>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" disabled={notificationBusy} onClick={() => { setNotification(undefined); setSelectedRecipients([]); setScheduleAt(""); }} className="rounded-full border border-foreground/10 px-3 py-2 text-xs text-foreground/55">Pas maintenant</button>
          <button type="button" disabled={notificationBusy || !selectedRecipients.length || !notification.subject.trim() || !notification.body.trim()} onClick={() => void sendNotification()} className="rounded-full bg-foreground px-4 py-2 text-xs text-background disabled:opacity-35">{notificationBusy ? "Enregistrement…" : scheduleAt ? "Confirmer et programmer" : "Confirmer et envoyer"}</button>
        </div>
      </div>}

      {/* ——— Les sept dossiers universels, sans passer par l'assistant ——— */}
      <OrbSection title="Dossiers" testId="orb-folders">
        <div className="grid gap-2 sm:grid-cols-2">
          {folders.map(folder => {
            const Icon = FOLDER_ICONS[folder.id];
            const locked = isFolderLocked(folder, currentRole);
            const count = getFolderCount(folder.id, project);
            return (
              <button
                key={folder.id}
                type="button"
                disabled={locked}
                onClick={() => {
                  trackEvent("folder_open", { folder: folder.id, from: "orb" });
                  openWeddingFolder(folder);
                  close();
                }}
                title={locked ? t("dossier.locked") : folder.description}
                className="flex items-center gap-3 rounded-2xl border border-foreground/10 bg-foreground/[.03] p-3 text-left transition hover:border-foreground/30 disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40"
              >
                {locked
                  ? <Lock className="h-5 w-5 shrink-0 text-foreground/40" />
                  : <Icon className="h-5 w-5 shrink-0" strokeWidth={1.5} />}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{folder.label}</span>
                  <span className="block text-[11px] tabular-nums text-foreground/45">{t("dossier.count.items", { count })}</span>
                </span>
                <ArrowRight aria-hidden className="h-4 w-4 shrink-0 text-foreground/30" />
              </button>
            );
          })}
        </div>
      </OrbSection>

      {/* ——— Déposer un fichier, classé dans le bon dossier ——— */}
      <OrbSection title="Partager un fichier" testId="orb-file">
        <DocumentShare />
      </OrbSection>

      {/* ——— Créer, et ouvrir l'espace ME ——— */}
      <OrbSection title="Créer et ME" testId="orb-create">
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => { window.dispatchEvent(new Event("aime:open-create")); close(); }}
            className="flex items-center gap-3 rounded-2xl border border-foreground/10 bg-foreground/[.03] p-4 text-left transition hover:border-foreground/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40"
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-accent text-brand-accent-foreground"><Plus className="h-5 w-5" /></span>
            <span><span className="block text-sm font-medium">Créer</span><span className="block text-[11px] text-foreground/45">Personne, Moment, tâche, document…</span></span>
          </button>
          {onOpenMe && (
            <button
              type="button"
              onClick={() => { onOpenMe(); close(); }}
              className="flex items-center gap-3 rounded-2xl border border-foreground/10 bg-foreground/[.03] p-4 text-left transition hover:border-foreground/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-foreground/15 text-foreground/70"><CircleUserRound className="h-5 w-5" /></span>
              <span><span className="block text-sm font-medium">Mon espace ME</span><span className="block text-[11px] text-foreground/45">Compte, préférences, Mondes…</span></span>
            </button>
          )}
        </div>
      </OrbSection>

      {/* ——— Le Monde : catégories communes, comme l'ancien rail ——— */}
      {rail.length > 0 && (
        <OrbSection title="Monde" testId="orb-world">
          <div className="grid gap-2 sm:grid-cols-2">
            {rail.map(item => {
              const Icon = WORLD_ICONS[item.icon];
              const active = isWeddingDestinationActive(item.destination, worldNav.view, worldNav.panel);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    if (item.destination.kind !== "route") focusWorldDestination(item.destination);
                    close();
                  }}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40",
                    active ? "border-foreground/40 bg-foreground/[.06]" : "border-foreground/10 bg-foreground/[.03] hover:border-foreground/30",
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{item.label}</span>
                    <span className="block truncate text-[11px] text-foreground/45">{item.description}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </OrbSection>
      )}

      {/* ——— Aller à, et régler l'espace ——— */}
      <OrbSection title="Aller à et réglages" testId="orb-settings">
        <div className="grid gap-2 sm:grid-cols-2">
          {destinations.map(destination => (
            <Link
              key={destination.id}
              href={destination.href}
              onClick={close}
              className="block rounded-2xl border border-foreground/10 bg-foreground/[.03] p-3 transition hover:border-foreground/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40"
            >
              <span className="block text-sm font-medium">{destination.label}</span>
              <span className="block truncate text-[11px] text-foreground/45">{destination.id === "world" && project?.title ? project.title : destination.description}</span>
            </Link>
          ))}
          <button
            type="button"
            onClick={() => setLocale(locale === "fr" ? "en" : "fr")}
            className="flex items-center gap-3 rounded-2xl border border-foreground/10 bg-foreground/[.03] p-3 text-left transition hover:border-foreground/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-foreground/15 text-[11px] font-semibold">{locale.toUpperCase()}</span>
            <span><span className="block text-sm font-medium">{locale === "fr" ? "Switch to English" : "Passer en français"}</span><span className="block text-[11px] text-foreground/45">Langue de tout AIME</span></span>
          </button>
          <button
            type="button"
            disabled={!project}
            onClick={() => { window.dispatchEvent(new Event("aime:open-world-settings")); close(); }}
            className="flex items-center gap-3 rounded-2xl border border-foreground/10 bg-foreground/[.03] p-3 text-left transition hover:border-foreground/30 disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40"
          >
            <Settings className="h-5 w-5 shrink-0" />
            <span><span className="block text-sm font-medium">Réglages du Monde</span><span className="block text-[11px] text-foreground/45">{project ? "Partage, accès, danger" : "Disponible après la création du Monde"}</span></span>
          </button>
        </div>
      </OrbSection>
    </CenteredBlock>
  </>;
}

function OrbSection({ title, testId, children }: { title: string; testId: string; children: ReactNode }) {
  return (
    <section data-testid={testId} className="mt-8 border-t border-foreground/10 pt-6">
      <h3 className="text-[10px] uppercase tracking-[.22em] text-foreground/45">{title}</h3>
      <div className="mt-4">{children}</div>
    </section>
  );
}
