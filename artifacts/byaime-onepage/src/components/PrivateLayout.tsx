import { type ComponentType, type ReactNode, useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'wouter';
import {
  Briefcase,
  CircleUserRound,
  Clock3,
  FolderClosed,
  Globe2,
  HelpCircle,
  Languages,
  ListChecks,
  Menu,
  Moon,
  Music,
  Settings,
  Sun,
  User,
  UserCog,
  Users,
  Wallet,
  X,
  Plus,
  Pin,
  PinOff
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CommandBar } from '@/components/CommandBar';
import { GlobalCreateCenter } from '@/components/GlobalCreateCenter';
import { PortalControls } from '@/components/PortalControls';
import { PanelChromeProvider, type PanelChrome } from '@/components/PanelChrome';
import { useProject } from '@/store/project-store';
import {
  getPrivateDestinationId,
  getDesktopRailReservedWidth,
  getPrivateNavigation,
  type PrivateDestinationId,
} from '@/lib/private-navigation';
import {
  getWeddingCapabilities,
  getWeddingRailItems,
  isWeddingDestinationActive,
  type WeddingRailIcon,
} from '@/lib/wedding-navigation';
import { focusWorldDestination, getWorldNavState, subscribeWorldNav, type WorldNavState } from '@/lib/world-nav-state';
import { useI18n } from '@/lib/i18n';

const WORLD_RAIL_ICONS: Record<WeddingRailIcon, ComponentType<{ className?: string }>> = {
  timeline: Clock3,
  people: Users,
  providers: Briefcase,
  tasks: ListChecks,
  finances: Wallet,
  documents: FolderClosed,
  team: UserCog,
  music: Music,
};

export function PrivateHomeLink({
  className,
  textClassName,
  labelClassName,
}: {
  className?: string;
  textClassName?: string;
  labelClassName?: string;
}) {
  const { t } = useI18n();
  return (
    <Link
      href="/"
      aria-label={t("private.home.aria")}
      data-testid="private-home-logo"
      className={cn("inline-flex rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", className)}
    >
      <span className={cn("font-display font-light tracking-[0.3em] text-foreground", textClassName, labelClassName)}>
        AIME
      </span>
    </Link>
  );
}

export function ActionCenter({ destination, onOpenMe }: { destination: PrivateDestinationId; onOpenMe: () => void }) {
  const { t } = useI18n();
  return (
    <nav
      aria-label={t("private.action.group")}
      className="fixed bottom-6 left-1/2 z-[65] flex h-12 -translate-x-1/2 items-center gap-1.5 rounded-full border border-border/40 bg-background/80 p-1 shadow-xl backdrop-blur-xl md:bottom-8"
    >
      <button
        type="button"
        onClick={() => window.dispatchEvent(new Event("aime:open-ai"))}
        className="flex h-full items-center justify-center rounded-full px-5 text-sm font-display font-medium tracking-wide text-foreground/70 transition-colors hover:bg-foreground/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={t("private.action.ai")}
      >
        AI
      </button>
      <button
        type="button"
        onClick={() => window.dispatchEvent(new Event("aime:open-create"))}
        className="flex h-full w-12 items-center justify-center rounded-full bg-brand-accent text-brand-accent-foreground shadow-[0_0_15px_hsl(var(--brand-accent)/0.4)] transition-transform hover:scale-105 active:scale-95 motion-reduce:transition-none motion-reduce:hover:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
        aria-label={t("private.action.create")}
      >
        <Plus className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={onOpenMe}
        className="flex h-full items-center justify-center rounded-full px-5 text-sm font-display font-medium tracking-wide text-foreground/70 transition-colors hover:bg-foreground/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={t("private.action.me")}
      >
        ME
      </button>
    </nav>
  );
}

function NavItem({
  href,
  icon: Icon,
  label,
  description,
  active,
  onClick,
  isPinned,
}: {
  href: string;
  icon: ComponentType<{ className?: string }>;
  label: string;
  description: string;
  active: boolean;
  onClick?: () => void;
  isPinned?: boolean;
}) {
  const isDesktopRail = isPinned !== undefined;

  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex w-full items-center rounded-xl transition-all motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active ? "text-foreground" : "text-foreground/65 hover:bg-foreground/[.07] hover:text-foreground",
        !isDesktopRail && "px-3 py-2.5 gap-3"
      )}
    >
      {isDesktopRail ? (
        <div className="flex h-12 w-[60px] shrink-0 items-center justify-center">
          <Icon className="h-[20px] w-[20px]" />
        </div>
      ) : (
        <Icon className="h-[20px] w-[20px] shrink-0" />
      )}

      <span className={cn(
        "min-w-0 flex-1 truncate transition-opacity duration-200",
        isDesktopRail ? "pr-4" : "",
        isPinned === false ? "opacity-0 group-hover/rail:opacity-100 group-focus-within/rail:opacity-100" : ""
      )}>
        <span className={cn("block text-sm font-medium", active && "text-foreground")}>{label}</span>
        <span className={cn(
          "mt-0.5 block truncate text-[9px] uppercase tracking-wider",
          active ? "text-foreground/60" : "text-foreground/35 group-hover:text-foreground/50"
        )}>{description}</span>
      </span>

      {active && isDesktopRail && (
        <div className="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-brand-accent shadow-[0_0_12px_hsl(var(--brand-accent)/0.7)]" />
      )}
    </Link>
  );
}

/**
 * Les catégories communes du Monde (Personnes, Prestataires, Tâches, Finances,
 * Documents, Équipe, Musique…) rangées dans la barre latérale gauche, comme la
 * navigation globale. La position active est publiée par ProjectStage.
 */
function WorldRailSection({ isPinnedContext }: { isPinnedContext?: boolean }) {
  const { currentRole } = useProject();
  const { t, locale } = useI18n();
  const [worldNav, setWorldNav] = useState<WorldNavState>(() => getWorldNavState());

  useEffect(() => subscribeWorldNav(setWorldNav), []);

  if (!worldNav.active) return null;

  const capabilities = getWeddingCapabilities(worldNav.role || currentRole);
  const rail = getWeddingRailItems(worldNav.phase, capabilities, locale);

  return (
    <div className="border-t border-border/30 pt-3">
      <p className={cn(
        "mb-2 pl-[20px] text-[9px] uppercase tracking-[.2em] text-foreground/35 transition-opacity duration-200",
        isPinnedContext === false && "opacity-0 group-hover/rail:opacity-100 group-focus-within/rail:opacity-100"
      )}>
        {t("private.rail.world")}
      </p>
      <div className="space-y-1">
        {rail.map(item => {
          const Icon = WORLD_RAIL_ICONS[item.icon];
          const active = isWeddingDestinationActive(item.destination, worldNav.view, worldNav.panel);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                if (item.destination.kind !== "route") focusWorldDestination(item.destination);
              }}
              title={item.label}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group/railitem relative flex w-full items-center rounded-xl text-left transition-all motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active ? "text-foreground" : "text-foreground/65 hover:bg-foreground/[.07] hover:text-foreground",
              )}
            >
              <span className="flex h-12 w-[60px] shrink-0 items-center justify-center">
                <Icon className="h-[20px] w-[20px]" />
              </span>
              <span className={cn(
                "min-w-0 flex-1 truncate pr-4 transition-opacity duration-200",
                isPinnedContext === false && "opacity-0 group-hover/rail:opacity-100 group-focus-within/rail:opacity-100"
              )}>
                <span className={cn("block text-sm font-medium", active && "text-foreground")}>{item.label}</span>
                <span className={cn("mt-0.5 block truncate text-[9px] uppercase tracking-wider", active ? "text-foreground/60" : "text-foreground/35 group-hover/railitem:text-foreground/50")}>{item.description}</span>
              </span>
              {active && (
                <span className="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-brand-accent shadow-[0_0_12px_hsl(var(--brand-accent)/0.7)]" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function BottomActionButton({
  onClick, icon: Icon, label, description, title, disabled, isPinned, href
}: {
  onClick?: () => void;
  icon: ComponentType<{ className?: string }>;
  label: string;
  description?: string;
  title?: string;
  disabled?: boolean;
  isPinned?: boolean;
  href?: string;
}) {
  const isDesktopRail = isPinned !== undefined;
  const content = (
    <>
      {isDesktopRail ? (
        <div className="flex h-11 w-[60px] shrink-0 items-center justify-center">
          <Icon className="h-[18px] w-[18px]" />
        </div>
      ) : (
        <Icon className="h-[18px] w-[18px] shrink-0" />
      )}
      <span className={cn(
        "min-w-0 flex-1 truncate text-left transition-opacity duration-200",
        isDesktopRail ? "pr-4" : "",
        isPinned === false ? "opacity-0 group-hover/rail:opacity-100 group-focus-within/rail:opacity-100" : ""
      )}>
        <span className="block text-sm">{label}</span>
        {description && <span className="mt-0.5 block text-[8px] uppercase tracking-wider">{description}</span>}
      </span>
    </>
  );

  const className = cn(
    "group flex w-full items-center rounded-xl text-foreground/60 transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-transparent disabled:hover:text-foreground/60",
    !isDesktopRail && "px-3 py-2.5 gap-3"
  );

  if (href) {
    return <a href={href} title={title} className={className}>{content}</a>;
  }

  return (
    <button type="button" onClick={onClick} disabled={disabled} title={title} className={className}>
      {content}
    </button>
  );
}

export function PrivateLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { project } = useProject();
  const { t, locale, setLocale } = useI18n();
  const [openMeSignal, setOpenMeSignal] = useState(0);
  const [appearance, setAppearance] = useState<"dark" | "light">(() => localStorage.getItem("aime-appearance") === "light" ? "light" : "dark");
  const [isPinned, setIsPinned] = useState(() => localStorage.getItem("aime-rail-pinned") === "true");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuTriggerRef = useRef<HTMLButtonElement>(null);
  const mobileDrawerRef = useRef<HTMLDivElement>(null);
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, '') || '/';

  const privateNavigation = getPrivateNavigation(locale);
  const activeDestination = getPrivateDestinationId(location);
  const activeItem = privateNavigation.find(item => item.id === activeDestination)!;
  const icons = { profile: User, world: Globe2 } satisfies Record<PrivateDestinationId, ComponentType<{ className?: string }>>;

  useEffect(() => {
    document.documentElement.dataset.aimeTheme = appearance;
    localStorage.setItem("aime-appearance", appearance);
  }, [appearance]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    window.requestAnimationFrame(() => {
      mobileDrawerRef.current?.querySelector<HTMLElement>("[data-drawer-autofocus]")?.focus();
    });
  }, [mobileMenuOpen]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);

  // Une destination du Monde (rail gauche) est une action, pas une URL :
  // fermer aussi le tiroir mobile quand on en sélectionne une.
  useEffect(() => subscribeWorldNav(() => setMobileMenuOpen(false)), []);

  const toggleAppearance = () => setAppearance(a => a === "dark" ? "light" : "dark");
  const togglePin = () => {
    setIsPinned(p => {
      const next = !p;
      localStorage.setItem("aime-rail-pinned", next ? "true" : "false");
      return next;
    });
  };
  const closeMobileMenu = (restoreFocus = false) => {
    setMobileMenuOpen(false);
    if (restoreFocus) {
      window.requestAnimationFrame(() => mobileMenuTriggerRef.current?.focus());
    }
  };

  const openWorldSettings = () => {
    if (!project) return;
    window.dispatchEvent(new Event("aime:open-world-settings"));
    closeMobileMenu();
  };

  const openMe = () => {
    setOpenMeSignal(signal => signal + 1);
    closeMobileMenu();
  };

  const handleDrawerKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closeMobileMenu(true);
      return;
    }
    if (event.key !== "Tab") return;

    const focusable = Array.from(
      mobileDrawerRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ) ?? [],
    ).filter(element => !element.hasAttribute("aria-hidden"));
    if (!focusable.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const NavItems = ({ isPinnedContext }: { isPinnedContext?: boolean }) => (
    <>
      {privateNavigation.map(item => (
        <NavItem
          key={item.id}
          href={item.href}
          icon={icons[item.id]}
          label={item.label}
          description={item.id === "world" && project?.title ? project.title : item.description}
          active={activeDestination === item.id}
          onClick={() => closeMobileMenu()}
          isPinned={isPinnedContext}
        />
      ))}
    </>
  );

  const BottomItems = ({ isPinnedContext }: { isPinnedContext?: boolean }) => (
    <>
      <BottomActionButton
        href={`${basePath === "/" ? "" : basePath}/guides`}
        icon={HelpCircle}
        label={t("private.bottom.guides")}
        isPinned={isPinnedContext}
      />
      <BottomActionButton
        onClick={toggleAppearance}
        icon={appearance === 'dark' ? Sun : Moon}
        label={appearance === 'dark' ? t("private.bottom.light") : t("private.bottom.dark")}
        isPinned={isPinnedContext}
      />
      {/* La langue se change aussi depuis l'espace privé, pas seulement à l'accueil. */}
      <BottomActionButton
        onClick={() => setLocale(locale === "fr" ? "en" : "fr")}
        icon={Languages}
        label={locale === "fr" ? t("private.bottom.toEnglish") : t("private.bottom.toFrench")}
        description={locale.toUpperCase()}
        isPinned={isPinnedContext}
      />
      <BottomActionButton
        onClick={openWorldSettings}
        disabled={!project}
        icon={Settings}
        label={t("private.bottom.settings")}
        description={!project ? t("private.bottom.settings.after") : undefined}
        title={project ? t("private.bottom.settings.open") : t("private.bottom.settings.locked")}
        isPinned={isPinnedContext}
      />
      <BottomActionButton
        onClick={openMe}
        icon={CircleUserRound}
        label={t("private.bottom.account")}
        isPinned={isPinnedContext}
      />
    </>
  );

  return (
    <PanelChromeProvider chrome={{
      breadcrumb: [
        { label: "AIME", href: basePath },
        { label: activeItem.label },
      ],
      navigation: privateNavigation.map(item => ({ id: item.id, label: item.label, href: item.href })),
    }}>
    <div data-testid="private-layout" className="flex h-[100dvh] w-full overflow-hidden bg-background text-foreground">
      {/* Desktop Rail Spacer */}
      <div
        data-testid="desktop-rail-spacer"
        className="hidden shrink-0 transition-[width] duration-300 motion-reduce:transition-none md:block"
        style={{ width: getDesktopRailReservedWidth(isPinned) }}
        aria-hidden="true"
      />

      {/* Desktop Logo - Fixed top left */}
      <div className="fixed left-6 top-6 z-[80] hidden md:block">
        <PrivateHomeLink className="rounded-lg" textClassName="text-xl" />
      </div>

      {/* Desktop Rail Visual - Transparent Floating Rail */}
      <aside
        className={cn(
          "fixed left-0 top-20 z-[70] hidden flex-col overflow-hidden border-r border-border/35 bg-card shadow-2xl transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:transition-none md:flex",
          isPinned ? "w-[240px] h-[calc(100dvh-6.5rem)]" : "w-[64px] h-[calc(100dvh-6.5rem)] hover:w-[240px] focus-within:w-[240px] group/rail"
        )}
      >
        <div className="flex w-[240px] flex-col h-full py-4">
          <div className="flex shrink-0 items-center justify-between pr-4 pl-[20px] mb-4">
            <p className={cn(
              "text-[9px] uppercase tracking-[.2em] text-foreground/35 transition-opacity duration-200",
              !isPinned && "opacity-0 group-hover/rail:opacity-100 group-focus-within/rail:opacity-100"
            )}>{t("private.rail.space")}</p>
            <button
              onClick={togglePin}
              className={cn(
                "grid h-8 w-8 place-items-center rounded-full text-foreground/40 transition-all hover:bg-foreground/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                !isPinned && "opacity-0 group-hover/rail:opacity-100 focus-visible:opacity-100"
              )}
              aria-label={isPinned ? t("private.rail.unpin") : t("private.rail.pin")}
              title={isPinned ? t("private.rail.unpin.short") : t("private.rail.pin.short")}
            >
              {isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
            </button>
          </div>

          <nav aria-label={t("private.nav.global")} className="min-h-0 flex-1 space-y-2 overflow-y-auto px-2 hide-scrollbar">
            <NavItems isPinnedContext={isPinned} />
            <WorldRailSection isPinnedContext={isPinned} />
          </nav>

          <div className="mt-auto space-y-1 border-t border-border/30 p-2 pt-4 mx-2">
            <BottomItems isPinnedContext={isPinned} />
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="relative flex h-full min-w-0 flex-1 flex-col">
        {/* Header - Mobile only visual, completely empty on desktop */}
        <header className="z-[60] grid h-14 shrink-0 grid-cols-[auto_1fr_auto] items-center gap-2 border-b border-border bg-background/95 px-3 backdrop-blur-xl sm:px-4 md:border-none md:bg-transparent">
          <PrivateHomeLink className="md:hidden" textClassName="text-lg" />

          <div className="flex-1" />

          <div className="flex items-center justify-end gap-1.5">
            <PortalControls embedded openMeSignal={openMeSignal} />
            <button
              ref={mobileMenuTriggerRef}
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label={t("private.nav.open")}
              aria-expanded={mobileMenuOpen}
              aria-controls="private-mobile-navigation"
              className="grid h-8 w-8 place-items-center rounded-full text-foreground/65 transition hover:bg-foreground/[.06] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="relative flex-1 overflow-x-hidden overflow-y-auto pb-24">
          {children}
        </div>

        {/* Action Center - Floating Pill */}
        <ActionCenter destination={activeDestination} onOpenMe={openMe} />
        <CommandBar context={activeDestination} />
        <GlobalCreateCenter destination={activeDestination} />
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[100] flex md:hidden" role="dialog" aria-modal="true" aria-label={t("private.nav.global")}>
          <button type="button" className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => closeMobileMenu(true)} aria-label={t("private.nav.close")} tabIndex={-1} />
          <div
            ref={mobileDrawerRef}
            id="private-mobile-navigation"
            className="relative flex h-full w-72 max-w-[86vw] flex-col border-r border-border bg-card p-4 shadow-2xl"
            onKeyDown={handleDrawerKeyDown}
          >
            <div className="mb-8 flex items-center justify-between px-2">
              <PrivateHomeLink textClassName="text-lg" />
              <button data-drawer-autofocus type="button" onClick={() => closeMobileMenu(true)} aria-label={t("private.nav.close")} className="-mr-2 rounded-full p-2 text-foreground/70 transition hover:bg-foreground/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav aria-label={t("private.nav.global")} className="flex-1 space-y-2 overflow-y-auto hide-scrollbar">
              <NavItems />
              <WorldRailSection />
            </nav>
            <div className="mt-auto space-y-1 border-t border-border/50 pt-4">
              <BottomItems />
            </div>
          </div>
        </div>
      )}
    </div>
    </PanelChromeProvider>
  );
}
