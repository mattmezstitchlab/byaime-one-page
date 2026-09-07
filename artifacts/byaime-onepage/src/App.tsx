import { type ReactNode, useEffect, useRef, useState } from 'react';
import { ClerkProvider, SignIn, SignUp, Show, useClerk } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Home } from '@/pages/Home';
import { Route, Switch, Redirect, useLocation, Router as WouterRouter } from 'wouter';

const queryClient = new QueryClient();
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
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
    <main className="min-h-[100dvh] bg-black text-white flex items-center justify-center px-6">
      <div className="max-w-3xl text-center">
        <p className="text-xs tracking-[.35em] uppercase text-white/50 mb-8">The art of connection</p>
        <h1 className="font-display text-6xl md:text-8xl tracking-[.12em] mb-8">AIME</h1>
        <p className="text-lg md:text-2xl text-white/65 font-light leading-relaxed mb-10">Votre mariage, orchestré avec élégance. Invités, budget, prestataires et jour J réunis dans un espace privé.</p>
        <div className="flex flex-wrap justify-center gap-3">
          <a href={`${basePath}/sign-up`} className="rounded-full bg-white text-black px-7 py-3 text-sm font-semibold">Créer mon espace</a>
          <a href={`${basePath}/sign-in`} className="rounded-full border border-white/25 px-7 py-3 text-sm">Se connecter</a>
        </div>
      </div>
    </main>
  );
}

function HomeRedirect() {
  return <><Show when="signed-in"><Redirect to="/user-portal" /></Show><Show when="signed-out"><Landing /></Show></>;
}
function Portal() {
  return <><Show when="signed-in"><Home /></Show><Show when="signed-out"><Redirect to="/" /></Show></>;
}
function AuthPage({ signup = false }: { signup?: boolean }) {
  return <div className="min-h-[100dvh] bg-black flex items-center justify-center px-4">{signup
    ? <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
    : <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />}</div>;
}
function InvitePage({ params }: { params: { token: string } }) {
  const [, navigate] = useLocation();
  return <div className="min-h-screen bg-black text-white flex items-center justify-center"><button className="rounded-full bg-white text-black px-6 py-3" onClick={async () => {
    const response = await fetch(`/api/invitations/${params.token}/accept`, { method: 'POST' });
    if (!response.ok) throw new Error((await response.json()).error);
    navigate('/user-portal');
  }}>Accepter l'invitation</button></div>;
}
function RsvpPage({ params }: { params: { token: string } }) {
  const [state, setState] = useState({ status: 'confirmed', ceremony: true, cocktail: true, dinner: true, brunch: false, plusOne: false, dietary: '', notes: '' });
  const [projectTitle, setProjectTitle] = useState('Votre invitation');
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { void fetch(`/api/rsvp/${params.token}`).then(async response => {
    const body = await response.json(); if (!response.ok) throw new Error(body.error); setProjectTitle(body.projectTitle);
  }).catch(err => setError(err.message)); }, [params.token]);
  if (done) return <main className="min-h-screen bg-black text-white grid place-items-center p-6 text-center"><div><h1 className="text-4xl mb-3">Merci</h1><p className="text-white/60">Votre réponse a bien été enregistrée.</p></div></main>;
  return <main className="min-h-screen bg-black text-white grid place-items-center p-5"><form className="w-full max-w-lg rounded-3xl border border-white/10 bg-white/5 p-7 space-y-5" onSubmit={async event => {
    event.preventDefault(); setError('');
    const response = await fetch(`/api/rsvp/${params.token}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
      status: state.status, attendance: { ceremony: state.ceremony, cocktail: state.cocktail, dinner: state.dinner, brunch: state.brunch },
      dietary: state.dietary, plusOne: state.plusOne, notes: state.notes,
    }) }); const body = await response.json(); if (!response.ok) { setError(body.error); return; } setDone(true);
  }}>
    <p className="text-xs tracking-[.3em] text-white/45">AIME · RSVP</p><h1 className="text-3xl">{projectTitle}</h1>
    <div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => setState(s => ({ ...s, status: 'confirmed' }))} className={`rounded-xl p-3 border ${state.status === 'confirmed' ? 'bg-white text-black' : 'border-white/20'}`}>Je serai présent·e</button><button type="button" onClick={() => setState(s => ({ ...s, status: 'declined' }))} className={`rounded-xl p-3 border ${state.status === 'declined' ? 'bg-white text-black' : 'border-white/20'}`}>Je décline</button></div>
    {state.status === 'confirmed' && <div className="grid grid-cols-2 gap-3 text-sm">{(['ceremony', 'cocktail', 'dinner', 'brunch'] as const).map(key => <label key={key} className="flex gap-2 capitalize"><input type="checkbox" checked={state[key]} onChange={e => setState(s => ({ ...s, [key]: e.target.checked }))} />{key}</label>)}<label className="flex gap-2 col-span-2"><input type="checkbox" checked={state.plusOne} onChange={e => setState(s => ({ ...s, plusOne: e.target.checked }))} />Je viens accompagné·e</label></div>}
    <input className="w-full rounded-xl border border-white/15 bg-black/30 p-3" placeholder="Allergies ou régime alimentaire" value={state.dietary} onChange={e => setState(s => ({ ...s, dietary: e.target.value }))} />
    <textarea className="w-full rounded-xl border border-white/15 bg-black/30 p-3" placeholder="Une note pour les mariés" value={state.notes} onChange={e => setState(s => ({ ...s, notes: e.target.value }))} />
    {error && <p className="text-red-300 text-sm">{error}</p>}<button className="w-full rounded-full bg-white text-black p-3 font-semibold">Confirmer ma réponse</button>
  </form></main>;
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}
function Routes() {
  return <RoutedErrorBoundary><Switch>
    <Route path="/" component={HomeRedirect} />
    <Route path="/user-portal" component={Portal} />
    <Route path="/sign-in/*?">{() => <AuthPage />}</Route>
    <Route path="/sign-up/*?">{() => <AuthPage signup />}</Route>
    <Route path="/invite/:token" component={InvitePage} />
    <Route path="/rsvp/:token" component={RsvpPage} />
    <Route component={NotFound} />
  </Switch></RoutedErrorBoundary>;
}
function Providers() {
  const [, setLocation] = useLocation();
  return <ClerkProvider publishableKey={clerkPubKey} proxyUrl={clerkProxyUrl} appearance={clerkAppearance}
    signInUrl={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`}
    localization={{ signIn: { start: { title: 'Heureux de vous revoir', subtitle: 'Retrouvez votre mariage' } }, signUp: { start: { title: 'Créer votre espace AIME', subtitle: 'Votre histoire commence ici' } } }}
    routerPush={to => setLocation(stripBase(to))} routerReplace={to => setLocation(stripBase(to), { replace: true })}>
    <QueryClientProvider client={queryClient}><CacheInvalidator /><TooltipProvider><Routes /><Toaster /></TooltipProvider></QueryClientProvider>
  </ClerkProvider>;
}
export default function App() {
  return <WouterRouter base={basePath}><Providers /></WouterRouter>;
}