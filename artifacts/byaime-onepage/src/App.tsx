import { type ReactNode, useEffect, useRef, useState } from 'react';
import { ClerkProvider, SignIn, SignUp, Show, useAuth, useClerk } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Home } from '@/pages/Home';
import { NetworkPage } from '@/pages/Network';
import { PublicProfilePage } from '@/pages/PublicProfile';
import { CommandBar } from '@/components/CommandBar';
import { PortalControls } from '@/components/PortalControls';
import { ProjectProvider } from '@/store/project-store';
import { trackEvent } from '@/lib/analytics';
import { Route, Switch, Redirect, useLocation, Router as WouterRouter } from 'wouter';

const queryClient = new QueryClient();
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
document.documentElement.dataset.aimeTheme = localStorage.getItem('aime-appearance') === 'light' ? 'light' : 'dark';
const clerkPubKey = publishableKeyFromHost(window.location.hostname, import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
if (!clerkPubKey) throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in .env file');

function stripBase(path: string) {
  return basePath && path.startsWith(basePath) ? path.slice(basePath.length) || '/' : path;
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: 'clerk',
  options: {
    logoPlacement: 'inside' as const,
    logoLinkUrl: basePath || '/',
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
    socialButtonsPlacement: 'bottom' as const,
  },
  variables: {
    colorPrimary: '#ffffff', colorForeground: '#f5f2ed', colorMutedForeground: '#a9a39a',
    colorDanger: '#f87171', colorBackground: '#111111', colorInput: '#1d1d1d',
    colorInputForeground: '#ffffff', colorNeutral: '#4a4a4a',
    fontFamily: '"Plus Jakarta Sans", sans-serif', borderRadius: '1rem',
  },
  elements: {
    rootBox: 'w-full flex justify-center', cardBox: 'bg-[#111] rounded-2xl w-[440px] max-w-full overflow-hidden border border-white/10',
    card: '!shadow-none !border-0 !bg-transparent !rounded-none', footer: '!shadow-none !border-0 !bg-transparent !rounded-none',
    headerTitle: 'text-white', headerSubtitle: 'text-white/60', socialButtonsBlockButtonText: 'text-white',
    formFieldLabel: 'text-white/80', footerActionLink: 'text-white font-semibold', footerActionText: 'text-white/60',
    dividerText: 'text-white/50', identityPreviewEditButton: 'text-white', formFieldSuccessText: 'text-emerald-400',
    alertText: 'text-red-200', logoBox: 'h-12', logoImage: 'h-10', socialButtonsBlockButton: 'border-white/20 text-white',
    formButtonPrimary: 'bg-white text-black hover:bg-white/90', formFieldInput: 'bg-white/5 border-white/20 text-white',
    footerAction: 'text-white', dividerLine: 'bg-white/15', alert: 'bg-red-950/30 border-red-500/30',
    otpCodeFieldInput: 'bg-white/5 border-white/20 text-white', formFieldRow: 'text-white', main: 'text-white',
  },
};

function CacheInvalidator() {
  const { addListener } = useClerk();
  const client = useQueryClient();
  const previous = useRef<string | null | undefined>(undefined);
  useEffect(() => addListener(({ user }) => {
    const id = user?.id ?? null;
    if (previous.current !== undefined && previous.current !== id) client.clear();
    previous.current = id;
  }), [addListener, client]);
  return null;
}

function Landing() {
  return (
    <main data-testid="landing" className="relative min-h-[100dvh] bg-black text-white flex items-center justify-center px-6">
      <img src={`${basePath}/logo.svg`} alt="AIME" className="absolute left-5 top-5 h-10 w-auto rounded-xl md:left-8 md:top-7" />
      <div className="max-w-3xl text-center">
        <p className="text-xs tracking-[.35em] uppercase text-white/50 mb-8">L’art de créer des liens</p>
        <h1 className="font-display text-6xl md:text-8xl tracking-[.12em] mb-8">AIME</h1>
        <p className="text-lg md:text-2xl text-white/65 font-light leading-relaxed mb-10">Organisez votre mariage simplement. Retrouvez vos invités, votre budget, les professionnels et le Jour J dans un espace privé.</p>
        <div className="flex flex-wrap justify-center gap-3">
           <a data-testid="landing-sign-up" href={`${basePath}/sign-up`} className="rounded-full bg-white text-black px-7 py-3 text-sm font-semibold">Créer mon espace</a>
           <a data-testid="landing-sign-in" href={`${basePath}/sign-in`} className="rounded-full border border-white/25 px-7 py-3 text-sm">Se connecter</a>
        </div>
      </div>
    </main>
  );
}

function ConceptLanding() {
  const pillars = [
    { number: '01', title: 'Profil', text: 'Votre identité durable, vos liens, vos créations et ce que vous choisissez de rendre visible.' },
    { number: '02', title: 'Monde', text: 'Une réalité organisée dans le temps : mariage, voyage, projet, famille, équipe ou aventure collective.' },
    { number: '03', title: 'Kit', text: 'La spécialisation qui donne à chaque Monde ses outils, ses méthodes et son langage sans enfermer les données.' },
  ];
  return (
    <main data-testid="concept-landing" className="bg-black text-white">
      <section className="relative flex min-h-[100dvh] items-center justify-center px-6">
        <a href={`${basePath}/`} className="absolute left-6 top-6 text-sm font-medium tracking-[.32em] text-white/80 md:left-10 md:top-8">AIME</a>
        <div className="max-w-3xl text-center">
          <p className="mb-8 text-xs uppercase tracking-[.35em] text-white/50">L’art de créer des liens</p>
          <h1 className="mb-8 font-display text-6xl tracking-[.12em] md:text-8xl">AIME</h1>
          <p className="mb-10 text-lg font-light leading-relaxed text-white/65 md:text-2xl">Un espace vivant pour relier les personnes, les projets et les Moments — avant, maintenant et après.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Show when="signed-in"><a href={`${basePath}/user-portal`} className="rounded-full bg-white px-7 py-3 text-sm font-semibold text-black">Entrer dans mon Monde</a></Show>
            <Show when="signed-out">
              <a href={`${basePath}/sign-up`} className="rounded-full bg-white px-7 py-3 text-sm font-semibold text-black">Créer mon espace</a>
              <a href={`${basePath}/sign-in`} className="rounded-full border border-white/25 px-7 py-3 text-sm">Se connecter</a>
            </Show>
          </div>
        </div>
      </section>

      <section id="guides" className="scroll-mt-8 border-t border-white/8 px-6 py-28 md:px-10 md:py-40">
        <div className="mx-auto max-w-6xl">
          <p className="text-[10px] uppercase tracking-[.28em] text-white/35">Un seul système, plusieurs réalités</p>
          <h2 className="mt-6 max-w-4xl font-display text-4xl font-light leading-tight md:text-7xl">Votre vie n’est pas une succession de tableaux de bord.</h2>
          <p className="mt-8 max-w-2xl text-base font-light leading-relaxed text-white/48 md:text-lg">AIME compose une Timeline cinématique autour de personnes, de lieux, de documents, de besoins et de décisions qui restent reliés entre eux.</p>
          <div className="mt-20 grid gap-px overflow-hidden rounded-[2rem] bg-white/10 md:grid-cols-3">
            {pillars.map(pillar => (
              <article key={pillar.title} className="bg-[#080808] p-8 md:min-h-72 md:p-10">
                <p className="text-[10px] tracking-[.2em] text-white/25">{pillar.number}</p>
                <h3 className="mt-12 font-display text-3xl font-light">{pillar.title}</h3>
                <p className="mt-5 text-sm font-light leading-relaxed text-white/42">{pillar.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-white/8 px-6 py-28 md:px-10 md:py-40">
        <div className="mx-auto grid max-w-6xl gap-16 md:grid-cols-[.8fr_1.2fr] md:items-end">
          <div>
            <p className="text-[10px] uppercase tracking-[.28em] text-white/35">AI · + · ME</p>
            <h2 className="mt-6 font-display text-4xl font-light leading-tight md:text-6xl">Comprendre. Créer. Contrôler.</h2>
          </div>
          <div className="space-y-8 text-base font-light leading-relaxed text-white/48">
            <p><span className="text-white">AI</span> comprend le contexte, vérifie les conséquences et conseille sans décider à votre place.</p>
            <p><span className="text-white">+</span> crée, importe ou relie une personne, un lieu, un Moment, une tâche, un document ou un besoin.</p>
            <p><span className="text-white">ME</span> garde la maîtrise de l’identité, des droits, de la confidentialité, de la publication et des exports.</p>
          </div>
        </div>
      </section>

      <section className="grid min-h-[70dvh] place-items-center border-t border-white/8 px-6 py-24 text-center">
        <div className="max-w-3xl">
          <p className="text-[10px] uppercase tracking-[.3em] text-white/35">Le premier Kit complet</p>
          <h2 className="mt-7 font-display text-5xl font-light md:text-7xl">Un mariage, avant, pendant et après.</h2>
          <p className="mx-auto mt-7 max-w-2xl text-base font-light leading-relaxed text-white/48">Préparer ensemble, conduire le Jour J en direct, puis conserver les souvenirs dans le même Monde.</p>
          <Show when="signed-in"><a href={`${basePath}/user-portal`} className="mt-10 inline-flex rounded-full bg-white px-7 py-3 text-sm font-semibold text-black">Retrouver mon Monde</a></Show>
          <Show when="signed-out"><a href={`${basePath}/sign-up`} className="mt-10 inline-flex rounded-full bg-white px-7 py-3 text-sm font-semibold text-black">Commencer</a></Show>
        </div>
      </section>
    </main>
  );
}

function HomeRedirect() {
  return <><Show when="signed-in"><Redirect to="/user-portal" /></Show><Show when="signed-out"><Landing /></Show></>;
}
function Portal() {
  return <><Show when="signed-in"><Home /></Show><Show when="signed-out"><Redirect to="/" /></Show></>;
}
function NetworkRoute() {
  return <><Show when="signed-in"><NetworkPage /></Show><Show when="signed-out"><Redirect to="/" /></Show></>;
}
function PrivateProfileRoute() {
  return <><Show when="signed-in">
    <PublicProfilePage privatePreview />
    <CommandBar setPhase={() => undefined} setLayers={() => undefined} />
    <PortalControls />
  </Show><Show when="signed-out"><Redirect to="/" /></Show></>;
}
function SignUpPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const tracked = useRef(false);
  useEffect(() => {
    if (isLoaded && isSignedIn && !tracked.current) {
      tracked.current = true;
      trackEvent('account_created');
    }
  }, [isLoaded, isSignedIn]);
  return <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />;
}
function AuthPage({ signup = false }: { signup?: boolean }) {
  return <div data-testid={signup ? 'auth-sign-up' : 'auth-sign-in'} className="relative min-h-[100dvh] bg-black flex items-center justify-center px-4"><img src={`${basePath}/logo.svg`} alt="AIME" className="absolute left-5 top-5 h-10 w-auto rounded-xl md:left-8 md:top-7" />{signup
    ? <SignUpPage />
    : <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />}</div>;
}
function InvitePage({ params }: { params: { token: string } }) {
  const [, navigate] = useLocation();
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  return <div className="min-h-screen bg-black text-white flex items-center justify-center p-6"><div className="text-center">
    <button data-testid="invite-accept" disabled={pending} className="rounded-full bg-white text-black px-6 py-3 disabled:opacity-50" onClick={async () => {
      setPending(true); setError('');
      try {
        const response = await fetch(`/api/invitations/${params.token}/accept`, { method: 'POST' });
        if (!response.ok) throw new Error((await response.json()).error);
        navigate('/user-portal');
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : 'Invitation impossible à accepter');
      } finally {
        setPending(false);
      }
    }}>{pending ? 'Acceptation…' : "Accepter l'invitation"}</button>
    {error && <p data-testid="invite-error" className="mt-4 text-sm text-red-300">{error}</p>}
  </div></div>;
}
function RsvpPage({ params }: { params: { token: string } }) {
  const [state, setState] = useState({ status: 'confirmed', ceremony: true, cocktail: true, dinner: true, brunch: false, plusOne: false, dietary: '', notes: '' });
  const [projectTitle, setProjectTitle] = useState('Votre invitation');
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState<'loading' | 'ready' | 'submitting' | 'error'>('loading');
  useEffect(() => {
    let active = true;
    setStatus('loading'); setError('');
    void fetch(`/api/rsvp/${params.token}`).then(async response => {
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'Lien RSVP indisponible');
      if (!active) return;
      setProjectTitle(body.projectTitle);
      const saved = body.response;
      if (saved) setState(current => ({
        ...current, ...saved,
        ...(saved.attendance ?? {}),
        dietary: saved.dietary ?? '', notes: saved.notes ?? '',
      }));
      setStatus('ready');
    }).catch(reason => {
      if (!active) return;
      setError(reason instanceof Error ? reason.message : 'Lien RSVP indisponible');
      setStatus('error');
    });
    return () => { active = false; };
  }, [params.token]);
  if (done) return <main data-testid="rsvp-success" className="min-h-screen bg-black text-white grid place-items-center p-6 text-center"><div><h1 className="text-4xl mb-3">Merci</h1><p className="text-white/60">Votre réponse a bien été enregistrée.</p></div></main>;
  if (status === 'error') return <main data-testid="rsvp-page" data-rsvp-state="error" className="min-h-screen bg-black text-white grid place-items-center p-6 text-center"><div className="max-w-sm"><p data-testid="rsvp-error" className="text-red-300">{error}</p><button type="button" className="mt-5 rounded-full border border-white/20 px-5 py-3" onClick={() => window.location.reload()}>Réessayer</button></div></main>;
  return <main data-testid="rsvp-page" data-rsvp-state={status} className="min-h-screen bg-black text-white grid place-items-center p-5"><form data-testid="rsvp-form" className="w-full max-w-lg rounded-3xl border border-white/10 bg-white/5 p-7 space-y-5" onSubmit={async event => {
     event.preventDefault(); if (status !== 'ready') return;
     setError(''); setStatus('submitting');
     try {
       const response = await fetch(`/api/rsvp/${params.token}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
         status: state.status, attendance: { ceremony: state.ceremony, cocktail: state.cocktail, dinner: state.dinner, brunch: state.brunch },
         dietary: state.dietary || undefined, plusOne: state.plusOne, notes: state.notes || undefined,
       }) }); const body = await response.json().catch(() => ({}));
       if (!response.ok) throw new Error(body.error || 'Réponse impossible à enregistrer');
       setDone(true);
        if (state.status === 'confirmed') trackEvent('rsvp_confirmed');
     } catch (reason) {
       setError(reason instanceof Error ? reason.message : 'Réponse impossible à enregistrer');
       setStatus('error');
     }
   }}>
     <p className="text-xs tracking-[.3em] text-white/45">AIME · RSVP</p><h1 data-testid="rsvp-title" className="text-3xl">{projectTitle}</h1>
     <div className="grid grid-cols-2 gap-2"><button data-testid="rsvp-confirmed" type="button" disabled={status !== 'ready'} onClick={() => setState(s => ({ ...s, status: 'confirmed' }))} className={`rounded-xl p-3 border ${state.status === 'confirmed' ? 'bg-white text-black' : 'border-white/20'}`}>Je serai présent·e</button><button data-testid="rsvp-declined" type="button" disabled={status !== 'ready'} onClick={() => setState(s => ({ ...s, status: 'declined' }))} className={`rounded-xl p-3 border ${state.status === 'declined' ? 'bg-white text-black' : 'border-white/20'}`}>Je décline</button></div>
     {state.status === 'confirmed' && <div className="grid grid-cols-2 gap-3 text-sm">{(['ceremony', 'cocktail', 'dinner', 'brunch'] as const).map(key => <label key={key} className="flex gap-2 capitalize"><input aria-label={key} name={`rsvp-${key}`} type="checkbox" checked={state[key]} disabled={status !== 'ready'} onChange={e => setState(s => ({ ...s, [key]: e.target.checked }))} />{key}</label>)}<label className="flex gap-2 col-span-2"><input aria-label="plus-one" name="rsvp-plus-one" type="checkbox" checked={state.plusOne} disabled={status !== 'ready'} onChange={e => setState(s => ({ ...s, plusOne: e.target.checked }))} />Je viens accompagné·e</label></div>}
     <input aria-label="dietary" name="rsvp-dietary" className="w-full rounded-xl border border-white/15 bg-black/30 p-3" placeholder="Allergies ou régime alimentaire" value={state.dietary} disabled={status !== 'ready'} onChange={e => setState(s => ({ ...s, dietary: e.target.value }))} />
     <textarea aria-label="notes" name="rsvp-notes" className="w-full rounded-xl border border-white/15 bg-black/30 p-3" placeholder="Une note pour les mariés" value={state.notes} disabled={status !== 'ready'} onChange={e => setState(s => ({ ...s, notes: e.target.value }))} />
     {error && <p data-testid="rsvp-error" className="text-red-300 text-sm">{error}</p>}<button data-testid="rsvp-submit" type="submit" disabled={status !== 'ready'} className="w-full rounded-full bg-white text-black p-3 font-semibold disabled:opacity-50">{status === 'submitting' ? 'Enregistrement…' : 'Confirmer ma réponse'}</button>
   </form></main>;
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}
function Routes() {
  return <RoutedErrorBoundary><Switch>
    <Route path="/concept" component={ConceptLanding} />
    <Route path="/" component={HomeRedirect} />
    <Route path="/user-portal" component={Portal} />
    <Route path="/profile" component={PrivateProfileRoute} />
    <Route path="/network" component={NetworkRoute} />
    <Route path="/sign-in/*?">{() => <AuthPage />}</Route>
    <Route path="/sign-up/*?">{() => <AuthPage signup />}</Route>
    <Route path="/invite/:token" component={InvitePage} />
    <Route path="/rsvp/:token" component={RsvpPage} />
    <Route path="/profil/:projectId">{() => <PublicProfilePage />}</Route>
    <Route component={NotFound} />
  </Switch></RoutedErrorBoundary>;
}
function Providers() {
  const [, setLocation] = useLocation();
  return <ClerkProvider publishableKey={clerkPubKey} proxyUrl={clerkProxyUrl} appearance={clerkAppearance}
    signInUrl={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`}
    localization={{ signIn: { start: { title: 'Heureux de vous revoir', subtitle: 'Retrouvez votre mariage' } }, signUp: { start: { title: 'Créer votre espace AIME', subtitle: 'Votre histoire commence ici' } } }}
    routerPush={to => setLocation(stripBase(to))} routerReplace={to => setLocation(stripBase(to), { replace: true })}>
    <QueryClientProvider client={queryClient}>
      <CacheInvalidator />
      <ProjectProvider>
        <TooltipProvider><Routes /><Toaster /></TooltipProvider>
      </ProjectProvider>
    </QueryClientProvider>
  </ClerkProvider>;
}
export default function App() {
  return <WouterRouter base={basePath}><Providers /></WouterRouter>;
}