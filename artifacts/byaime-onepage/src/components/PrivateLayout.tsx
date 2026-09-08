import { type ComponentType, type ReactNode, useEffect, useRef, useState } from 'react';
import { useClerk } from '@clerk/react';
import { Link, useLocation } from 'wouter';
import {
  CircleUserRound,
  Globe2,
  HelpCircle,
  Map,
  Menu,
  Moon,
  Settings,
  Sun,
  User,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PortalControls } from '@/components/PortalControls';
import { useProject } from '@/store/project-store';
import {
  getPrivateDestinationId,
  PRIVATE_PRIMARY_NAVIGATION,
  type PrivateDestinationId,
} from '@/lib/private-navigation';

export function PrivateLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { openUserProfile } = useClerk();
  const { project } = useProject();
  const [appearance, setAppearance] = useState<"dark" | "light">(() => localStorage.getItem("aime-appearance") === "light" ? "light" : "dark");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuTriggerRef = useRef<HTMLButtonElement>(null);
  const mobileDrawerRef = useRef<HTMLDivElement>(null);
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, '') || '/';
  const logoUrl = `${basePath === '/' ? '' : basePath}/logo.svg`;
  const activeDestination = getPrivateDestinationId(location);
  const activeItem = PRIVATE_PRIMARY_NAVIGATION.find(item => item.id === activeDestination)!;
  const icons = { profile: User, world: Globe2, network: Map } satisfies Record<PrivateDestinationId, ComponentType<{ className?: string }>>;

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

  const toggleAppearance = () => setAppearance(a => a === "dark" ? "light" : "dark");
  const closeMobileMenu = (restoreFocus = false) => {
    setMobileMenuOpen(false);
    if (restoreFocus) {
      window.requestAnimationFrame(() => mobileMenuTriggerRef.current?.focus());
    }
  };
  const openSettings = () => {
    if (!project) return;
    window.dispatchEvent(new Event("aime:open-me"));
    closeMobileMenu();
  };

  const openAccount = () => {
    closeMobileMenu();
    openUserProfile();
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

  const NavItems = () => (
    <>
      {PRIVATE_PRIMARY_NAVIGATION.map(item => (
        <NavItem
          key={item.id}
          href={item.href}
          icon={icons[item.id]}
          label={item.label}
          description={item.id === "world" && project?.title ? project.title : item.description}
          active={activeDestination === item.id}
          onClick={() => closeMobileMenu()}
        />
      ))}
    </>
  );

  const BottomItems = () => (
    <>
      <a href={`${basePath === "/" ? "" : basePath}/concept#guides`} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-foreground/60 transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <HelpCircle className="h-[18px] w-[18px]" /> Aide & guides
      </a>
      <button type="button" onClick={toggleAppearance} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-foreground/60 transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        {appearance === 'dark' ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
        {appearance === 'dark' ? 'Mode clair' : 'Mode sombre'}
      </button>
      <button
        type="button"
        onClick={openSettings}
        disabled={!project}
        title={project ? "Ouvrir les réglages" : "Disponible après la création du premier Monde"}
        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-foreground/60 transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-transparent disabled:hover:text-foreground/60"
      >
        <Settings className="h-[18px] w-[18px] shrink-0" />
        <span className="min-w-0 flex-1 text-left">Réglages</span>
        {!project && <span className="text-[8px] uppercase tracking-[.1em]">Après création</span>}
      </button>
      <button type="button" onClick={openAccount} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-foreground/60 transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <CircleUserRound className="h-[18px] w-[18px]" /> Mon compte
      </button>
    </>
  );

  return (
    <div data-testid="private-layout" className="flex h-[100dvh] w-full overflow-hidden bg-background text-foreground">
      <aside className="relative z-[70] hidden w-[232px] shrink-0 flex-col border-r border-border bg-card/40 px-3 py-6 md:flex">
        <div className="mb-8 px-3">
          <Link href="/profile" aria-label="AIME — ouvrir le Profil" className="inline-flex rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <img src={logoUrl} alt="" className="h-7 w-auto rounded-lg opacity-80 shadow-sm transition-opacity hover:opacity-100" />
          </Link>
          <p className="mt-3 text-[9px] uppercase tracking-[.2em] text-foreground/35">Espace privé</p>
        </div>
        <nav aria-label="Navigation globale" className="flex-1 space-y-1.5">
          <NavItems />
        </nav>
        <div className="mt-auto space-y-1 border-t border-border/50 pt-4">
          <BottomItems />
        </div>
      </aside>

      <div className="relative flex h-full min-w-0 flex-1 flex-col">
        <header className="z-[60] grid h-14 shrink-0 grid-cols-[auto_1fr_auto] items-center gap-2 border-b border-border bg-background/95 px-3 backdrop-blur-xl sm:px-4">
          <Link href="/profile" aria-label="AIME — ouvrir le Profil" className="inline-flex rounded-md md:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <img src={logoUrl} alt="" className="h-6 w-auto rounded-md shadow-sm" />
          </Link>
          <div className="hidden min-w-0 md:block">
            <p className="truncate text-sm font-medium text-foreground">{activeItem.label}</p>
            <p className="truncate text-[9px] uppercase tracking-[.15em] text-foreground/40">
              {activeDestination === "world" && project?.title ? project.title : activeItem.description}
            </p>
          </div>
          <span className="min-w-0 truncate text-center text-[10px] uppercase tracking-[.16em] text-foreground/45 md:hidden">
            {activeItem.label}
          </span>
          <div className="flex items-center justify-end gap-1.5">
            <PortalControls embedded />
            <button
              ref={mobileMenuTriggerRef}
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Ouvrir la navigation"
              aria-expanded={mobileMenuOpen}
              aria-controls="private-mobile-navigation"
              className="grid h-8 w-8 place-items-center rounded-full text-foreground/65 transition hover:bg-foreground/[.06] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </header>
        <div className="relative flex-1 overflow-x-hidden overflow-y-auto">
          {children}
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[100] flex md:hidden" role="dialog" aria-modal="true" aria-label="Navigation globale">
          <button type="button" className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => closeMobileMenu(true)} aria-label="Fermer la navigation" tabIndex={-1} />
          <div
            ref={mobileDrawerRef}
            id="private-mobile-navigation"
            className="relative flex h-full w-72 max-w-[86vw] flex-col border-r border-border bg-card p-4 shadow-2xl"
            onKeyDown={handleDrawerKeyDown}
          >
            <div className="mb-8 flex items-center justify-between px-2">
              <Link href="/profile" aria-label="AIME — ouvrir le Profil" className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <img src={logoUrl} alt="" className="h-6 w-auto rounded-md shadow-sm" />
              </Link>
              <button data-drawer-autofocus type="button" onClick={() => closeMobileMenu(true)} aria-label="Fermer la navigation" className="-mr-2 rounded-full p-2 text-foreground/70 transition hover:bg-foreground/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav aria-label="Navigation globale" className="flex-1 space-y-2">
              <NavItems />
            </nav>
            <div className="mt-auto space-y-1 border-t border-border/50 pt-4">
              <BottomItems />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NavItem({
  href,
  icon: Icon,
  label,
  description,
  active,
  onClick,
}: {
  href: string;
  icon: ComponentType<{ className?: string }>;
  label: string;
  description: string;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active ? "bg-foreground text-background shadow-sm" : "text-foreground/65 hover:bg-foreground/[.07] hover:text-foreground",
      )}
    >
      <Icon className="h-[18px] w-[18px] shrink-0" />
      <span className="min-w-0">
        <span className="block text-sm font-medium">{label}</span>
        <span className={cn("mt-0.5 block truncate text-[9px]", active ? "text-background/60" : "text-foreground/35 group-hover:text-foreground/50")}>{description}</span>
      </span>
    </Link>
  );
}
