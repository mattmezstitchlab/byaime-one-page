import { lazy, Suspense, type ReactNode, useEffect, useRef, useState } from 'react';
import { ClerkProvider, SignIn, SignUp, Show, useAuth, useClerk } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { LegalPage } from '@/pages/Legal';
import { GuidesPage } from '@/pages/Guides';
import { LandingPage } from '@/pages/Landing';
import { PortalOnboarding } from '@/components/PortalOnboarding';
import { AimePublicGuide } from '@/components/AimePublicGuide';
import { ProjectProvider, useProject } from '@/store/project-store';
import { ModeProvider } from '@/lib/mode';
import { useI18n } from '@/lib/i18n';
import { trackEvent } from '@/lib/analytics';
import { AIME_VISUALS, getAssetUrl } from '@/lib/assets';
import { Route, Switch, Redirect, useLocation, Router as WouterRouter } from 'wouter';

import { PrivateLayout } from '@/components/PrivateLayout';

const queryClient = new QueryClient();
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const clerkPubKey = typeof window !== 'undefined'
  ? publishableKeyFromHost(window.location.hostname, import.meta.env.VITE_CLERK_PUBLISHABLE_KEY)
  : import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const clerkKeyMissing = !clerkPubKey;

/*
 * Découpage par route : l'espace privé (Monde Mariage, panneaux, Timeline) et
 * le profil public ne sont chargés que lorsqu'on les ouvre — jamais par le
 * visiteur de l'accueil. L'accueil, les guides et l'authentification restent
 * synchrones, car ce sont les parcours d'entrée.
 */
const LazyHome = lazy(() => import('@/pages/Home').then(module => ({ default: module.Home })));
const LazyPublicProfile = lazy(() => import('@/pages/PublicProfile').then(module => ({ default: module.PublicProfilePage })));

function stripBase(path: string) {
  return basePath && path.startsWith(basePath) ? path.slice(basePath.length) || '/' : path;
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: 'clerk',
  options: {
    logoPlacement: 'inside' as const,
    logoLinkUrl: basePath || '/',
    logoImageUrl: `${typeof window !== 'undefined' ? window.location.origin : ''}${basePath}/logo.svg`,
    socialButtonsPlacement: 'bottom' as const,
  },
  variables: {
    colorPrimary: 'hsl(var(--foreground))', colorForeground: 'hsl(var(--foreground))', colorMutedForeground: 'hsl(var(--muted-foreground))',
    colorDanger: 'hsl(var(--destructive))', colorBackground: 'hsl(var(--card))', colorInput: 'hsl(var(--background))',
    colorInputForeground: 'hsl(var(--foreground))', colorNeutral: 'hsl(var(--border))',
    fontFamily: '"Plus Jakarta Sans", sans-serif', borderRadius: '1rem',
  },
  elements: {
    rootBox: 'w-full flex justify-center', cardBox: 'bg-card text-card-foreground rounded-2xl w-[440px] max-w-full overflow-hidden border border-border',
    card: '!shadow-none !border-0 !bg-transparent !rounded-none', footer: '!shadow-none !border-0 !bg-transparent !rounded-none',
    headerTitle: 'text-foreground', headerSubtitle: 'text-muted-foreground', socialButtonsBlockButtonText: 'text-foreground',
    formFieldLabel: 'text-foreground/80', footerActionLink: 'text-foreground font-semibold', footerActionText: 'text-muted-foreground',
    dividerText: 'text-muted-foreground', identityPreviewEditButton: 'text-foreground', formFieldSuccessText: 'text-emerald-600 dark:text-emerald-400',
    alertText: 'text-destructive', logoBox: 'h-12', logoImage: 'h-10', socialButtonsBlockButton: 'border-border text-foreground hover:bg-muted',
    formButtonPrimary: 'bg-foreground text-background hover:bg-foreground/85', formFieldInput: 'bg-background border-border text-foreground',
    footerAction: 'text-foreground', dividerLine: 'bg-border', alert: 'bg-destructive/10 border-destructive/30',
    otpCodeFieldInput: 'bg-background border-border text-foreground', formFieldRow: 'text-foreground', main: 'text-foreground',
  },
};

function CacheInvalidator() {
  const { addListener } = useClerk();
  const client = useQueryClient();
  const previous = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    // `addListener` peut manquer selon la version de Clerk chargée (ou être
    // absent d'un environnement de test) : un abonné indisponible ne doit pas
    // faire tomber toute l'application, c'est juste le cache qui ne se vide
    // plus tout seul au changement de compte.
    if (typeof addListener !== 'function') return undefined;
    return addListener(({ user }) => {
      const id = user?.id ?? null;
      if (previous.current !== undefined && previous.current !== id) client.clear();
      previous.current = id;
    });
  }, [addListener, client]);
  return null;
}

function LandingRoute() {
  const { isSignedIn } = useAuth();
  /*
   * L'accueil présente le site pour tout le monde : le logo « AIME » mène
   * toujours ici, connecté comme non connecté. La redirection automatique vers
   * l'espace privé volait ce retour et doublonnait la page d'entrée.
   */
  return <LandingPage signedIn={!!isSignedIn} />;
}

function PrivateRoute({ children }: { children: ReactNode }) {
  return (
    <>
      <Show when="signed-in">
        <PrivateLayout>
          {children}
        </PrivateLayout>
      </Show>
      <Show when="signed-out">
        <Redirect to="/" />
      </Show>
    </>
  );
}

function ProfilePageWrapper() {
  const { hasProject, isHydrated } = useProject();
  const { t } = useI18n();

  if (!isHydrated) {
    return (
      <main className="grid min-h-full place-items-center bg-background text-foreground" role="status">
        <p className="text-[10px] uppercase tracking-[.28em] text-foreground/40">{t('private.loading.profile')}</p>
      </main>
    );
  }

  if (!hasProject) return <PortalOnboarding />;

  return (
    <LazyPublicProfile privatePreview />
  );
}

function authPath(path: "/connexion" | "/creation", returnTo?: string) {
  const destination = `${basePath}${path}`;
  return returnTo ? `${destination}?returnTo=${encodeURIComponent(returnTo)}` : destination;
}

function invitationReturnPath() {
  const value = new URLSearchParams(window.location.search).get("returnTo");
  return value && /^\/invite\/[0-9a-f-]{36}$/i.test(value) ? value : undefined;
}

function SignUpPage({ returnTo }: { returnTo?: string }) {
  const { isLoaded, isSignedIn } = useAuth();
  const tracked = useRef(false);
  useEffect(() => {
    if (isLoaded && isSignedIn && !tracked.current) {
      tracked.current = true;
      trackEvent('account_created');
    }
  }, [isLoaded, isSignedIn]);
  return <SignUp routing="path" path={`${basePath}/creation`} signInUrl={authPath("/connexion", returnTo)} forceRedirectUrl={returnTo ? `${basePath}${returnTo}` : undefined} />;
}
function AuthPage({ signup = false }: { signup?: boolean }) {
  const returnTo = invitationReturnPath();
  return (
    <div
      data-testid={signup ? 'auth-sign-up' : 'auth-sign-in'}
      className="relative min-h-[100dvh] overflow-hidden bg-black"
    >
      {/* Grand visuel immersif derrière la carte d'authentification : les médias
          sont du contenu, jamais un thème (texte et liens restent blancs). */}
      <div aria-hidden className="absolute inset-0">
        <img
          src={getAssetUrl(AIME_VISUALS.hero.backgroundImage)}
          alt=""
          className="h-full w-full object-cover"
        />
        <div className="aime-apple-overlay absolute inset-0" />
        <div className="absolute inset-0 bg-[radial-gradient(80%_60%_at_50%_20%,rgba(0,187,205,0.14),transparent_62%)]" />
      </div>
      <div className="relative z-10 flex min-h-[100dvh] flex-col items-center justify-center px-4 pb-24 pt-24">
        <img
          src={`${basePath}/logo.svg`}
          alt="AIME"
          className="absolute left-5 top-5 h-10 w-auto rounded-xl md:left-8 md:top-7"
        />
        {signup
          ? <SignUpPage returnTo={returnTo} />
          : <SignIn routing="path" path={`${basePath}/connexion`} signUpUrl={authPath("/creation", returnTo)} forceRedirectUrl={returnTo ? `${basePath}${returnTo}` : undefined} />}
        <p className="absolute bottom-6 text-center text-[11px] text-white/45">
          <a href={`${basePath}/conditions`} className="transition hover:text-white">Conditions</a>
          <span className="mx-2">·</span>
          <a href={`${basePath}/confidentialite`} className="transition hover:text-white">Confidentialité</a>
        </p>
      </div>
    </div>
  );
}
function InvitePage({ params }: { params: { token: string } }) {
  const { isLoaded, isSignedIn } = useAuth();
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const returnTo = `/invite/${params.token}`;
  return <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6"><div className="max-w-md text-center">
    <p className="text-[10px] uppercase tracking-[.24em] text-foreground/40">Droit · Collaboration</p>
    <h1 className="mt-4 font-display text-3xl font-light">Invitation à collaborer</h1>
    <p className="mb-7 mt-3 text-sm font-light leading-relaxed text-foreground/55">En acceptant, vous rejoignez ce Monde avec un compte et un rôle. Cette invitation n’est pas une réponse RSVP à l’événement.</p>
    {!isLoaded ? <p className="text-sm text-foreground/45">Vérification de votre compte…</p> : !isSignedIn ? <div className="flex flex-col items-center gap-3">
      <a data-testid="invite-sign-in" href={authPath("/connexion", returnTo)} className="rounded-full bg-foreground px-6 py-3 text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Se connecter pour accepter</a>
      <a data-testid="invite-sign-up" href={authPath("/creation", returnTo)} className="text-sm text-foreground/55 underline decoration-foreground/20 underline-offset-4 hover:text-foreground">Créer un compte avec l’adresse invitée</a>
      <p className="mt-2 text-xs font-light leading-relaxed text-foreground/40">Après la connexion, vous reviendrez ici pour confirmer l’accès. Utilisez la même adresse e-mail vérifiée que celle ayant reçu l’invitation.</p>
    </div> : <button data-testid="invite-accept" disabled={pending} className="rounded-full bg-foreground text-background px-6 py-3 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={async () => {
      setPending(true); setError('');
      try {
        const response = await fetch(`/api/invitations/${params.token}/accept`, { method: 'POST' });
        if (!response.ok) throw new Error((await response.json()).error);
        window.location.assign(`${basePath}/user-portal`);
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : 'Invitation impossible à accepter');
      } finally {
        setPending(false);
      }
    }}>{pending ? 'Acceptation…' : "Accepter l’accès au Monde"}</button>}
    {error && <p data-testid="invite-error" className="mt-4 text-sm text-destructive">{error}</p>}
    <AimePublicGuide screen="invite" testId="invite-guide-button" label="Comprendre cette invitation" />
  </div></div>;
}
function RsvpPage({ params }: { params: { token: string } }) {
  type PortalData = {
    projectTitle?: string; response?: Record<string, unknown>; guest?: { name?: string; tableName?: string }; phase?: string;
    program?: { id: string; time: number | string; endTime?: number | string; durationMinutes?: number; title: string; detail?: string; location?: string }[];
    practicalInfo?: { city?: string; venue?: string; parking?: string; accessibility?: string; weatherFallback?: string };
    mediaPolicy?: { enabled?: boolean; maxSize?: number; accept?: string[] };
    songRequests?: { id: string; title: string; artist: string; message?: string; status: string; createdAt: string }[];
    contributions?: { id: string; name: string; contentType: string; size: number; caption?: string; moderationStatus: string; visibility: string; createdAt: string; canView: boolean }[];
    afterContent?: { id: string; time: number | string; title: string; detail?: string; location?: string }[];
  };
  const [state, setState] = useState({ status: 'confirmed', ceremony: true, cocktail: true, dinner: true, brunch: false, plusOne: false, dietary: '', notes: '' });
  const [projectTitle, setProjectTitle] = useState('Votre invitation');
  const [portal, setPortal] = useState<PortalData>({});
  const [error, setError] = useState('');
  const [status, setStatus] = useState<'loading' | 'ready' | 'submitting' | 'error'>('loading');
  const [saveMessage, setSaveMessage] = useState('');
  const [song, setSong] = useState({ title: '', artist: '', message: '' });
  const [songPending, setSongPending] = useState(false);
  const [songError, setSongError] = useState('');
  const [mediaPending, setMediaPending] = useState(false);
  const [mediaError, setMediaError] = useState('');
  const [caption, setCaption] = useState('');
  const [visibility, setVisibility] = useState<'couple' | 'guests'>('couple');
  const { t, locale } = useI18n();
  const attendLabels = {
    ceremony: t('rsvp.attend.ceremony'),
    cocktail: t('rsvp.attend.cocktail'),
    dinner: t('rsvp.attend.dinner'),
    brunch: t('rsvp.attend.brunch'),
  } as const;
  const loadPortal = async () => {
    const response = await fetch(`/api/rsvp/${params.token}`);
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || t('rsvp.error.link'));
    setPortal(body);
    setProjectTitle(body.projectTitle || t('rsvp.defaultTitle'));
    const saved = body.response;
    if (saved) setState(current => ({ ...current, ...saved, ...(saved.attendance ?? {}), dietary: saved.dietary ?? '', notes: saved.notes ?? '' }));
  };
  useEffect(() => {
    let active = true;
    setStatus('loading'); setError('');
    void loadPortal().then(() => {
      if (active) setStatus('ready');
    }).catch(reason => {
      if (!active) return;
      setError(reason instanceof Error ? reason.message : t('rsvp.error.link'));
      setStatus('error');
    });
    return () => { active = false; };
  }, [params.token, t]);
  if (status === 'error') return <main data-testid="rsvp-page" data-rsvp-state="error" className="min-h-screen bg-background text-foreground grid place-items-center p-6 text-center"><div className="max-w-sm"><p data-testid="rsvp-error" className="text-destructive">{error}</p><button type="button" className="mt-5 rounded-full border border-foreground/20 px-5 py-3 hover:bg-foreground/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => window.location.reload()}>{t('rsvp.retry')}</button></div></main>;
  const practical = portal.practicalInfo;
  const policy = portal.mediaPolicy;
  const formatPortalTime = (value: number | string, timeOnly = false) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString(locale === 'en' ? 'en-US' : 'fr-FR', timeOnly
      ? { hour: "2-digit", minute: "2-digit" }
      : { day: "numeric", month: "long", year: "numeric" });
  };
  return <main data-testid="rsvp-page" data-rsvp-state={status} className="min-h-screen bg-background text-foreground p-5 py-8 md:p-10"><div className="mx-auto max-w-5xl">
    <AimePublicGuide screen="rsvp" testId="rsvp-guide-button" label={t('rsvp.guide.label')} />
    <header className="mb-7"><p className="text-xs tracking-[.3em] text-foreground/50">{t('rsvp.eyebrow')}</p><h1 data-testid="rsvp-title" className="mt-2 font-display text-4xl">{projectTitle}</h1><p data-testid="rsvp-guest" className="mt-2 text-foreground/60">{portal.guest?.name ? t('rsvp.hello', { name: portal.guest.name }) : t('rsvp.defaultTitle')} · {t('rsvp.noAccess')}</p>
      <nav aria-label={t('rsvp.nav')} className="mt-5 flex gap-2 overflow-x-auto pb-2">{([['rsvp', 'RSVP'], ['jour-j', t('rsvp.nav.day')], ['partager', t('rsvp.nav.share')], ['musique', t('rsvp.music.eyebrow')], ['apres', t('rsvp.nav.after')]] as const).map(([id, label]) => <a data-testid={`link-rsvp-${id}`} key={id} href={`#${id}`} className="shrink-0 rounded-full border border-border px-4 py-2 text-sm hover:bg-foreground/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{label}</a>)}</nav>
    </header>
    <div className="grid gap-5 md:grid-cols-2">
    <section id="rsvp" className="scroll-mt-5"><form data-testid="rsvp-form" className="rounded-3xl border border-border bg-card p-7 space-y-5" onSubmit={async event => {
     event.preventDefault(); if (status !== 'ready') return;
      setError(''); setSaveMessage(''); setStatus('submitting');
     try {
       const response = await fetch(`/api/rsvp/${params.token}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
         status: state.status, attendance: { ceremony: state.ceremony, cocktail: state.cocktail, dinner: state.dinner, brunch: state.brunch },
         dietary: state.dietary || undefined, plusOne: state.plusOne, notes: state.notes || undefined,
       }) }); const body = await response.json().catch(() => ({}));
       if (!response.ok) throw new Error(body.error || t('rsvp.error.save'));
        setSaveMessage(t('rsvp.form.saved'));
        await loadPortal();
        setStatus('ready');
        if (state.status === 'confirmed') trackEvent('rsvp_confirmed');
     } catch (reason) {
       setError(reason instanceof Error ? reason.message : t('rsvp.error.save'));
        setStatus('ready');
     }
   }}>
       <div><p className="text-xs tracking-[.3em] text-foreground/50">RSVP</p><h2 className="mt-2 text-2xl">{t('rsvp.form.title')}</h2><p className="mt-2 text-xs font-light leading-relaxed text-foreground/45">{t('rsvp.form.sub')}</p></div>
     <div className="grid grid-cols-2 gap-2"><button data-testid="rsvp-confirmed" type="button" disabled={status !== 'ready'} onClick={() => setState(s => ({ ...s, status: 'confirmed' }))} className={`rounded-xl p-3 border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${state.status === 'confirmed' ? 'bg-foreground text-background border-foreground' : 'border-foreground/20 hover:bg-foreground/5'}`}>{t('rsvp.form.present')}</button><button data-testid="rsvp-declined" type="button" disabled={status !== 'ready'} onClick={() => setState(s => ({ ...s, status: 'declined' }))} className={`rounded-xl p-3 border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${state.status === 'declined' ? 'bg-foreground text-background border-foreground' : 'border-foreground/20 hover:bg-foreground/5'}`}>{t('rsvp.form.decline')}</button></div>
     {state.status === 'confirmed' && <div className="grid grid-cols-2 gap-3 text-sm">{(['ceremony', 'cocktail', 'dinner', 'brunch'] as const).map(key => <label key={key} className="flex gap-2"><input aria-label={attendLabels[key]} name={`rsvp-${key}`} type="checkbox" checked={state[key]} disabled={status !== 'ready'} onChange={e => setState(s => ({ ...s, [key]: e.target.checked }))} className="accent-foreground" />{attendLabels[key]}</label>)}<label className="flex gap-2 col-span-2"><input aria-label="plus-one" name="rsvp-plus-one" type="checkbox" checked={state.plusOne} disabled={status !== 'ready'} onChange={e => setState(s => ({ ...s, plusOne: e.target.checked }))} className="accent-foreground" />{t('rsvp.form.plusOne')}</label></div>}
     <input aria-label="dietary" name="rsvp-dietary" className="w-full rounded-xl border border-border bg-background p-3 focus:outline-none focus:ring-1 focus:ring-foreground/30" placeholder={t('rsvp.form.dietary')} value={state.dietary} disabled={status !== 'ready'} onChange={e => setState(s => ({ ...s, dietary: e.target.value }))} />
     <textarea aria-label="notes" name="rsvp-notes" className="w-full rounded-xl border border-border bg-background p-3 focus:outline-none focus:ring-1 focus:ring-foreground/30" placeholder={t('rsvp.form.notes')} value={state.notes} disabled={status !== 'ready'} onChange={e => setState(s => ({ ...s, notes: e.target.value }))} />
      {error && <p data-testid="rsvp-error" className="text-destructive text-sm" role="alert">{error}</p>}{saveMessage && <p data-testid="rsvp-success" className="text-sm text-emerald-600" role="status"><span data-testid="rsvp-saved">{saveMessage}</span></p>}<button data-testid="rsvp-submit" type="submit" disabled={status !== 'ready'} className="w-full rounded-full bg-foreground text-background p-3 font-semibold disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{status === 'submitting' ? t('rsvp.form.saving') : t('rsvp.form.submit')}</button>
    </form></section>
    <section id="jour-j" className="scroll-mt-5 rounded-3xl border border-border bg-card p-7"><p className="text-xs tracking-[.3em] text-foreground/50">{t('rsvp.nav.day').toUpperCase()}</p><h2 className="mt-2 text-2xl">{t('rsvp.day.title')}</h2>
      {status === 'loading' ? <p data-testid="status-program-loading" className="mt-4 text-sm text-foreground/55" role="status">{t('rsvp.loading')}</p> : <>{portal.guest?.tableName && <p data-testid="text-table-name" className="mt-4 rounded-xl bg-foreground/5 p-3 text-sm">{t('rsvp.table')} <strong>{portal.guest.tableName}</strong></p>}
      {portal.program?.length ? <ol className="mt-4 space-y-3">{portal.program.map(item => <li data-testid={`card-program-${item.id}`} key={item.id} className="border-l border-foreground/25 pl-3"><p className="text-xs text-foreground/50">{formatPortalTime(item.time, true)}{item.endTime ? ` — ${formatPortalTime(item.endTime, true)}` : item.durationMinutes ? ` · ${item.durationMinutes} ${t('rsvp.minutes')}` : ''}</p><h3>{item.title}</h3>{item.detail && <p className="text-sm text-foreground/60">{item.detail}</p>}{item.location && <p className="text-xs text-foreground/50">{item.location}</p>}</li>)}</ol> : <p data-testid="status-program-empty" className="mt-4 text-sm text-foreground/55">{t('rsvp.programEmpty')}</p>}
      <div className="mt-5 border-t border-border pt-4 text-sm text-foreground/65">{practical ? <>{practical.venue && <p><strong>{t('rsvp.venue')}</strong> {practical.venue}{practical.city ? ` · ${practical.city}` : ''}</p>}{practical.parking && <p className="mt-2"><strong>{t('rsvp.parking')}</strong> {practical.parking}</p>}{practical.accessibility && <p className="mt-2"><strong>{t('rsvp.accessibility')}</strong> {practical.accessibility}</p>}{practical.weatherFallback && <p className="mt-2"><strong>{t('rsvp.weather')}</strong> {practical.weatherFallback}</p>}</> : <p data-testid="status-practical-empty">{t('rsvp.practicalEmpty')}</p>}</div></>}</section>
    <section id="partager" className="scroll-mt-5 rounded-3xl border border-border bg-card p-7"><p className="text-xs tracking-[.3em] text-foreground/50">{t('rsvp.share.eyebrow')}</p><h2 className="mt-2 text-2xl">{t('rsvp.share.title')}</h2>
      {!policy?.enabled ? <p data-testid="status-media-disabled" className="mt-4 text-sm text-foreground/55">{t('rsvp.share.disabled')}</p> : <form className="mt-4 space-y-3" onSubmit={async event => { event.preventDefault(); const form = event.currentTarget; const file = (form.elements.namedItem('media-file') as HTMLInputElement).files?.[0]; if (!file) return setMediaError(t('rsvp.share.chooseFile')); if (policy.maxSize && file.size > policy.maxSize) return setMediaError(t('rsvp.share.tooBig', { size: Math.round(policy.maxSize / 1024 / 1024) })); setMediaPending(true); setMediaError(''); try { const request = await fetch(`/api/rsvp/${params.token}/media/uploads/request-url`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: file.name, contentType: file.type, size: file.size }) }); const upload = await request.json().catch(() => ({})); if (!request.ok || !upload.uploadURL) throw new Error(upload.error || t('rsvp.share.prepareError')); const put = await fetch(upload.uploadURL, { method: 'PUT', headers: { "Content-Type": file.type }, body: file }); if (!put.ok) throw new Error(t('rsvp.share.uploadError')); const saved = await fetch(`/api/rsvp/${params.token}/media`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ objectPath: upload.objectPath, finalizeToken: upload.finalizeToken, name: file.name, contentType: file.type, size: file.size, caption: caption || undefined, visibility, consent: true }) }); if (!saved.ok) { const body = await saved.json().catch(() => ({})); throw new Error(body.error || t('rsvp.share.publishError')); } setCaption(''); form.reset(); await loadPortal(); } catch (reason) { setMediaError(reason instanceof Error ? reason.message : t('rsvp.share.publishError')); } finally { setMediaPending(false); } }}>
        <input data-testid="input-media-file" name="media-file" type="file" accept={policy.accept?.join(',')} disabled={mediaPending} className="block w-full text-sm" /><input data-testid="input-media-caption" value={caption} onChange={e => setCaption(e.target.value)} placeholder={t('rsvp.share.caption')} disabled={mediaPending} className="w-full rounded-xl border border-border bg-background p-3" /><select data-testid="select-media-visibility" value={visibility} onChange={e => setVisibility(e.target.value as 'couple' | 'guests')} disabled={mediaPending} className="w-full rounded-xl border border-border bg-background p-3"><option value="couple">{t('rsvp.share.forCouple')}</option><option value="guests">{t('rsvp.share.forGuests')}</option></select>{mediaError && <p data-testid="media-error" className="text-sm text-destructive" role="alert">{mediaError}</p>}<button data-testid="button-media-upload" disabled={mediaPending} className="rounded-full bg-foreground px-5 py-3 text-sm font-semibold text-background disabled:opacity-50">{mediaPending ? t('rsvp.share.sending') : t('rsvp.share.upload')}</button></form>}
      {portal.contributions?.length ? <ul className="mt-5 space-y-2">{portal.contributions.map(item => <li data-testid={`media-${item.id}`} key={item.id} className="flex items-center justify-between gap-3 text-sm"><span>{item.caption || item.name} <em className="text-foreground/50">· {item.moderationStatus}</em></span>{item.canView ? <a data-testid={`link-media-${item.id}`} className="underline" href={`/api/rsvp/${params.token}/media/${item.id}`}>{t('rsvp.share.view')}</a> : <span className="text-foreground/45">{t('rsvp.share.pending')}</span>}</li>)}</ul> : <p data-testid="status-media-empty" className="mt-5 text-sm text-foreground/55">{t('rsvp.share.empty')}</p>}</section>
    <section id="musique" className="scroll-mt-5 rounded-3xl border border-border bg-card p-7"><p className="text-xs tracking-[.3em] text-foreground/50">{t('rsvp.music.eyebrow')}</p><h2 className="mt-2 text-2xl">{t('rsvp.music.title')}</h2><form className="mt-4 space-y-3" onSubmit={async event => { event.preventDefault(); setSongError(''); setSongPending(true); try { const response = await fetch(`/api/rsvp/${params.token}/song-requests`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(song) }); const body = await response.json().catch(() => ({})); if (!response.ok) throw new Error(body.error || t('rsvp.music.error')); setSong({ title: '', artist: '', message: '' }); await loadPortal(); } catch (reason) { setSongError(reason instanceof Error ? reason.message : t('rsvp.music.error')); } finally { setSongPending(false); } }}><input data-testid="input-song-title" required value={song.title} onChange={e => setSong(s => ({ ...s, title: e.target.value }))} placeholder={t('rsvp.music.titleField')} className="w-full rounded-xl border border-border bg-background p-3" /><input data-testid="input-song-artist" required value={song.artist} onChange={e => setSong(s => ({ ...s, artist: e.target.value }))} placeholder={t('rsvp.music.artist')} className="w-full rounded-xl border border-border bg-background p-3" /><input data-testid="input-song-message" value={song.message} onChange={e => setSong(s => ({ ...s, message: e.target.value }))} placeholder={t('rsvp.music.note')} className="w-full rounded-xl border border-border bg-background p-3" />{songError && <p data-testid="song-error" role="alert" className="text-sm text-destructive">{songError}</p>}<button data-testid="button-song-submit" disabled={songPending} className="rounded-full bg-foreground px-5 py-3 text-sm font-semibold text-background disabled:opacity-50">{songPending ? t('rsvp.music.sending') : t('rsvp.music.submit')}</button></form>{portal.songRequests?.length ? <ul className="mt-5 space-y-2">{portal.songRequests.map(item => <li data-testid={`song-${item.id}`} key={item.id} className="text-sm">{item.title} — {item.artist} <span className="text-foreground/50">· {item.status}</span></li>)}</ul> : <p data-testid="status-songs-empty" className="mt-5 text-sm text-foreground/55">{t('rsvp.music.empty')}</p>}</section>
    <section id="apres" className="scroll-mt-5 rounded-3xl border border-border bg-card p-7 md:col-span-2"><p className="text-xs tracking-[.3em] text-foreground/50">{t('rsvp.after.eyebrow')}</p><h2 className="mt-2 text-2xl">{t('rsvp.after.title')}</h2>{portal.afterContent?.length ? <ul className="mt-4 grid gap-3 md:grid-cols-2">{portal.afterContent.map(item => <li data-testid={`after-${item.id}`} key={item.id} className="rounded-xl bg-foreground/5 p-4"><p className="text-xs text-foreground/50">{formatPortalTime(item.time)}{item.location ? ` · ${item.location}` : ''}</p><h3>{item.title}</h3>{item.detail && <p className="mt-1 text-sm text-foreground/60">{item.detail}</p>}</li>)}</ul> : <p data-testid="status-after-empty" className="mt-4 text-sm text-foreground/55">{t('rsvp.after.empty')}</p>}</section>
    </div></div></main>;
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}
function RouteFallback() {
  /* Le découpage par route ne doit jamais laisser un écran vide : un repère
     discret, remplacé dès que le module est prêt. */
  return (
    <main className="grid min-h-[100dvh] place-items-center bg-background text-foreground" role="status">
      <span className="h-2 w-2 animate-pulse rounded-full bg-foreground/60" aria-label="Chargement" />
    </main>
  );
}

function Routes() {
  return <RoutedErrorBoundary><Suspense fallback={<RouteFallback />}><Switch>
    <Route path="/guides" component={GuidesPage} />
    <Route path="/confidentialite">{() => <LegalPage kind="privacy" />}</Route>
    <Route path="/conditions">{() => <LegalPage kind="terms" />}</Route>
    <Route path="/" component={LandingRoute} />
    <Route path="/app"><Redirect to="/user-portal" /></Route>
    <Route path="/user-portal">{() => <PrivateRoute><LazyHome /></PrivateRoute>}</Route>
    <Route path="/profile">{() => <PrivateRoute><ProfilePageWrapper /></PrivateRoute>}</Route>
    <Route path="/connexion/*?">{() => <AuthPage />}</Route>
    <Route path="/creation/*?">{() => <AuthPage signup />}</Route>
    <Route path="/sign-in/*?">{() => <AuthPage />}</Route>
    <Route path="/sign-up/*?">{() => <AuthPage signup />}</Route>
    <Route path="/invite/:token" component={InvitePage} />
    <Route path="/rsvp/:token" component={RsvpPage} />
    <Route path="/profil/:projectId">{() => <LazyPublicProfile />}</Route>
    <Route component={NotFound} />
  </Switch></Suspense></RoutedErrorBoundary>;
}
function Providers() {
  const [, setLocation] = useLocation();
  return <ClerkProvider publishableKey={clerkPubKey} proxyUrl={clerkProxyUrl} appearance={clerkAppearance}
    signInUrl={`${basePath}/connexion`} signUpUrl={`${basePath}/creation`}
    localization={{ signIn: { start: { title: 'Heureux de vous revoir', subtitle: 'Retrouvez votre mariage' } }, signUp: { start: { title: 'Créer votre espace AIME', subtitle: 'Votre histoire commence ici' } } }}
    routerPush={to => setLocation(stripBase(to))} routerReplace={to => setLocation(stripBase(to), { replace: true })}>
    <QueryClientProvider client={queryClient}>
      <CacheInvalidator />
      <ProjectProvider>
        <ModeProvider>
          <TooltipProvider><Routes /><Toaster /></TooltipProvider>
        </ModeProvider>
      </ProjectProvider>
    </QueryClientProvider>
  </ClerkProvider>;
}
/**
 * Une clé publique absente est une erreur de déploiement, pas une raison de
 * laisser une page blanche : l'écran reste lisible et aucune donnée n'est
 * demandée.
 */
function MissingAuthKey() {
  return (
    <main className="grid min-h-[100dvh] place-items-center bg-background px-6 text-center text-foreground">
      <div className="max-w-md">
        <p className="text-[10px] uppercase tracking-[.3em] text-foreground/60">AIME · L’art de créer des liens</p>
        <h1 className="mt-5 font-display text-3xl font-light md:text-4xl">Connexion momentanément indisponible</h1>
        <p className="mt-4 text-sm font-light leading-relaxed text-foreground/70">
          La clé publique d’authentification (`VITE_CLERK_PUBLISHABLE_KEY`) manque dans l’environnement
          de ce déploiement. Aucune information n’est demandée ni modifiée tant que ce réglage est absent.
        </p>
      </div>
    </main>
  );
}

export default function App() {
  if (clerkKeyMissing) {
    console.error('[AIME] VITE_CLERK_PUBLISHABLE_KEY est absent : l’authentification est désactivée pour ce déploiement.');
    return <MissingAuthKey />;
  }
  return <WouterRouter base={basePath}><Providers /></WouterRouter>;
}