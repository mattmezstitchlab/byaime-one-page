import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import { Link } from "wouter";
import {
  ArrowRight,
  Briefcase,
  CircleUserRound,
  Clock3,
  FolderClosed,
  ListChecks,
  Lock,
  Music,
  Plus,
  Settings,
  Users } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useProject } from "@/store/project-store";
import { CenteredBlock } from "@/components/CenteredBlock";
import { AimeOrb } from "@/components/AimeOrb";
import { DocumentShare } from "@/components/DocumentShare";
import { FOLDER_ICONS } from "@/components/WeddingFolders";
import { getFolderCount, getWeddingFolders, isFolderLocked, openWeddingFolder } from "@/lib/wedding-folders";
import {
  getWeddingCapabilities,
  getWeddingRailItems,
  isWeddingDestinationActive,
  type WeddingRailIcon } from "@/lib/wedding-navigation";
import { focusWorldDestination, getWorldNavState, subscribeWorldNav, type WorldNavState } from "@/lib/world-nav-state";
import { getPrivateNavigation, type PrivateDestinationId } from "@/lib/private-navigation";
import { trackEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";

/*
 * Le panneau de l'orbe ne commande plus rien.
 *
 * 14/09 : le champ « agent » (composer une commande en langage naturel, puis
 * « Prévenir les personnes concernées » avec son champ « Programmer » jour /
 * heure / minute) était de la démonstration : l'envoi passait par
 * `/api/projects/:id/messages`, absent du parcours local, et les commandes
 * proposées n'avaient rien à voir avec ce qu'un couple fait vraiment dans son
 * Monde. Supprimé, comme demandé. Ce panneau reste le carrefour réel :
 * dossiers, dépôt de fichier, création, ME, navigation du Monde, réglages.
 */
const contextCopy: Record<PrivateDestinationId, { label: string; description: string }> = {
  world: {
    label: "Monde",
    description: "Ouvrez un dossier, déposez un fichier, créez une personne ou un Moment, naviguez dans le Monde — tout l'espace privé tient dans ce panneau." } };

const WORLD_ICONS: Record<WeddingRailIcon, ComponentType<{ className?: string }>> = {
  timeline: Clock3,
  people: Users,
  providers: Briefcase,
  tasks: ListChecks,
  documents: FolderClosed,
  logistics: Settings,
  music: Music };

/*
 * Le panneau unique, ouvert par l'orbe (« + », Cmd/Ctrl + K, événement
 * `aime:open-ai`). Il centralise tout l'espace privé : le compositeur
 * intelligent (commande ou question), les sept dossiers universels, le dépôt
 * de fichier, la création, l'espace ME, la navigation du Monde et les
 * réglages. C'est lui qui a permis de retirer la barre latérale gauche.
 */
export function CommandBar({ context = "world", onOpenMe }: { context?: PrivateDestinationId; onOpenMe?: () => void }) {
  const [open, setOpen] = useState(false);
  const { project, currentRole } = useProject();
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
  if (!open) return null;
  const currentContext = contextCopy[context];
  const close = () => setOpen(false);
  const folders = getWeddingFolders(locale);
  const destinations = getPrivateNavigation(locale);
  const rail = worldNav.active
    ? getWeddingRailItems(worldNav.phase, getWeddingCapabilities(worldNav.role || currentRole), locale)
    : [];
  return <>
    <CenteredBlock eyebrow={`AIME · ${currentContext.label}`} title="Que souhaitez-vous faire ?" description={currentContext.description} onClose={close} size="lg" testId="orb-panel" leading={<AimeOrb size={52} />}>
      <p data-testid="orb-intro" className="text-sm font-light leading-relaxed text-foreground/60">
        {project
          ? "Votre Monde est ouvert. Choisissez où aller, ou déposez un document — tout part de ce panneau."
          : "Créez votre premier Monde depuis l'accueil : ce panneau s'ouvrira ensuite sur vos dossiers, vos documents et la navigation du Monde."}
      </p>

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
