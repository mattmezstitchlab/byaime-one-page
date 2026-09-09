import { useEffect, useRef, useState } from 'react';
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
import { LaboratoryPage } from '@/pages/Laboratory';
import { LeMondeAimePage } from '@/pages/LeMondeAime';
import { LegalPage } from '@/pages/Legal';
import { GuidesPage } from '@/pages/Guides';
import { ComposerHero } from '@/components/ComposerHero';
import { ProjectProvider, useProject } from '@/store/project-store';
import { trackEvent } from '@/lib/analytics';
import { Route, Switch, Redirect, useLocation, Router as WouterRouter } from 'wouter';
import { PrivateLayout } from '@/components/PrivateLayout';
const queryClient = new QueryClient();
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
document.documentElement.dataset.aimeTheme = localStorage.getItem('aime-appearance') === 'light' ? 'light' : 'dark';
const clerkPubKey = publishableKeyFromHost(window.location.hostname, import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
if (!clerkPubKey)
    throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in .env file');
function stripBase(path) {
    return basePath && path.startsWith(basePath) ? path.slice(basePath.length) || '/' : path;
}
const clerkAppearance = {
    theme: shadcn,
    cssLayerName: 'clerk',
    options: {
        logoPlacement: 'inside',
        logoLinkUrl: basePath || '/',
        logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
        socialButtonsPlacement: 'bottom',
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
    const previous = useRef(undefined);
    useEffect(() => addListener(({ user }) => {
        const id = user?.id ?? null;
        if (previous.current !== undefined && previous.current !== id)
            client.clear();
        previous.current = id;
    }), [addListener, client]);
    return null;
}
function Landing() {
    return (<main data-testid="landing" className="relative min-h-[100dvh] bg-background text-foreground flex items-center justify-center px-6">
      <img src={`${basePath}/logo.svg`} alt="AIME" className="absolute left-5 top-5 h-10 w-auto rounded-xl md:left-8 md:top-7"/>
      <div className="max-w-3xl text-center">
        <p className="text-xs tracking-[.35em] uppercase text-foreground/50 mb-8">L’art de créer des liens</p>
        <h1 className="font-display text-6xl md:text-8xl tracking-[.12em] mb-8">AIME</h1>
        <p className="text-lg md:text-2xl text-foreground/70 font-light leading-relaxed mb-10">Organisez votre mariage simplement. Retrouvez vos invités, votre budget, les professionnels et le Jour J dans un espace privé.</p>
        <div className="flex flex-wrap justify-center gap-3">
           <a data-testid="landing-sign-up" href={`${basePath}/sign-up`} className="rounded-full bg-foreground text-background px-7 py-3 text-sm font-semibold">Créer mon espace</a>
           <a data-testid="landing-sign-in" href={`${basePath}/sign-in`} className="rounded-full border border-foreground/25 px-7 py-3 text-sm hover:bg-foreground/5">Se connecter</a>
        </div>
        <p className="mt-8 text-xs text-foreground/40">En créant un espace, vous acceptez les <a href={`${basePath}/conditions`} className="underline underline-offset-4 hover:text-foreground">conditions</a> et la <a href={`${basePath}/confidentialite`} className="underline underline-offset-4 hover:text-foreground">politique de confidentialité</a>.</p>
      </div>
    </main>);
}
function ConceptLanding() {
    const pillars = [
        { number: '01', title: 'Profil', text: 'Votre identité durable, vos liens, vos créations et ce que vous choisissez de rendre visible.' },
        { number: '02', title: 'Monde', text: 'Une réalité organisée dans le temps : mariage, voyage, projet, famille, équipe ou aventure collective.' },
        { number: '03', title: 'Kit', text: 'La spécialisation qui donne à chaque Monde ses outils, ses méthodes et son langage sans enfermer les données.' },
    ];
    return (<main data-testid="concept-landing" className="bg-background text-foreground">
      <section className="relative flex min-h-[100dvh] items-center justify-center px-6">
        <a href={`${basePath}/`} className="absolute left-6 top-6 text-sm font-medium tracking-[.32em] text-foreground/80 md:left-10 md:top-8 hover:text-foreground">AIME</a>
        <div className="max-w-3xl text-center">
          <p className="mb-8 text-xs uppercase tracking-[.35em] text-foreground/50">L’art de créer des liens</p>
          <h1 className="mb-8 font-display text-6xl tracking-[.12em] md:text-8xl">AIME</h1>
          <p className="mb-10 text-lg font-light leading-relaxed text-foreground/70 md:text-2xl">Un espace vivant pour relier les personnes, les projets et les Moments — avant, maintenant et après.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Show when="signed-in"><a href={`${basePath}/user-portal`} className="rounded-full bg-foreground px-7 py-3 text-sm font-semibold text-background">Entrer dans mon Monde</a></Show>
            <Show when="signed-out">
              <a href={`${basePath}/sign-up`} className="rounded-full bg-foreground px-7 py-3 text-sm font-semibold text-background">Créer mon espace</a>
              <a href={`${basePath}/sign-in`} className="rounded-full border border-foreground/25 px-7 py-3 text-sm hover:bg-foreground/5">Se connecter</a>
            </Show>
          </div>
        </div>
      </section>

      <section id="guides" className="scroll-mt-8 border-t border-border px-6 py-28 md:px-10 md:py-40">
        <div className="mx-auto max-w-6xl">
          <p className="text-[10px] uppercase tracking-[.28em] text-foreground/40">Un seul système, plusieurs réalités</p>
          <h2 className="mt-6 max-w-4xl font-display text-4xl font-light leading-tight md:text-7xl">Votre vie n’est pas une succession de tableaux de bord.</h2>
          <p className="mt-8 max-w-2xl text-base font-light leading-relaxed text-foreground/60 md:text-lg">AIME compose une Timeline cinématique autour de personnes, de lieux, de documents, de besoins et de décisions qui restent reliés entre eux.</p>
          <div className="mt-20 grid gap-px overflow-hidden rounded-[2rem] bg-border md:grid-cols-3">
            {pillars.map(pillar => (<article key={pillar.title} className="bg-card p-8 md:min-h-72 md:p-10">
                <p className="text-[10px] tracking-[.2em] text-foreground/40">{pillar.number}</p>
                <h3 className="mt-12 font-display text-3xl font-light">{pillar.title}</h3>
                <p className="mt-5 text-sm font-light leading-relaxed text-foreground/60">{pillar.text}</p>
              </article>))}
          </div>
          <div className="mt-12 text-center">
            <a href={`${basePath}/guides`} className="inline-flex rounded-full border border-foreground/20 px-7 py-3 text-sm hover:bg-foreground/5 transition-colors">Explorer les guides détaillés</a>
          </div>
        </div>
      </section>

      <section className="border-t border-border px-6 py-28 md:px-10 md:py-40">
        <div className="mx-auto grid max-w-6xl gap-16 md:grid-cols-[.8fr_1.2fr] md:items-end">
          <div>
            <p className="text-[10px] uppercase tracking-[.28em] text-foreground/40">AI · + · ME</p>
            <h2 className="mt-6 font-display text-4xl font-light leading-tight md:text-6xl">Comprendre. Créer. Contrôler.</h2>
          </div>
          <div className="space-y-8 text-base font-light leading-relaxed text-foreground/60">
            <p><span className="text-foreground font-medium">AI</span> comprend le contexte, vérifie les conséquences et conseille sans décider à votre place.</p>
            <p><span className="text-foreground font-medium">+</span> crée, importe ou relie une personne, un lieu, un Moment, une tâche, un document ou un besoin.</p>
            <p><span className="text-foreground font-medium">ME</span> garde la maîtrise de l’identité, des droits, de la confidentialité, de la publication et des exports.</p>
          </div>
        </div>
      </section>

      <section className="grid min-h-[70dvh] place-items-center border-t border-border px-6 py-24 text-center">
        <div className="max-w-3xl">
          <p className="text-[10px] uppercase tracking-[.3em] text-foreground/40">Le premier Kit complet</p>
          <h2 className="mt-7 font-display text-5xl font-light md:text-7xl">Un mariage, avant, pendant et après.</h2>
          <p className="mx-auto mt-7 max-w-2xl text-base font-light leading-relaxed text-foreground/60">Préparer ensemble, conduire le Jour J en direct, puis conserver les souvenirs dans le même Monde.</p>
          <Show when="signed-in"><a href={`${basePath}/user-portal`} className="mt-10 inline-flex rounded-full bg-foreground px-7 py-3 text-sm font-semibold text-background">Retrouver mon Monde</a></Show>
          <Show when="signed-out"><a href={`${basePath}/sign-up`} className="mt-10 inline-flex rounded-full bg-foreground px-7 py-3 text-sm font-semibold text-background">Commencer</a></Show>
        </div>
      </section>
    </main>);
}
function HomeRedirect() {
    return <><Show when="signed-in"><Redirect to="/profile"/></Show><Show when="signed-out"><Landing /></Show></>;
}
function PrivateRoute({ children }) {
    return (<>
      <Show when="signed-in">
        <PrivateLayout>
          {children}
        </PrivateLayout>
      </Show>
      <Show when="signed-out">
        <Redirect to="/"/>
      </Show>
    </>);
}
function ProfilePageWrapper() {
    const { hasProject, isHydrated } = useProject();
    if (!isHydrated) {
        return (<main className="grid min-h-full place-items-center bg-background text-foreground" role="status">
        <p className="text-[10px] uppercase tracking-[.28em] text-foreground/40">Ouverture du Profil…</p>
      </main>);
    }
    if (!hasProject)
        return <ComposerHero />;
    return (<PublicProfilePage privatePreview/>);
}
function authPath(path, returnTo) {
    const destination = `${basePath}${path}`;
    return returnTo ? `${destination}?returnTo=${encodeURIComponent(returnTo)}` : destination;
}
function invitationReturnPath() {
    const value = new URLSearchParams(window.location.search).get("returnTo");
    return value && /^\/invite\/[0-9a-f-]{36}$/i.test(value) ? value : undefined;
}
function SignUpPage({ returnTo }) {
    const { isLoaded, isSignedIn } = useAuth();
    const tracked = useRef(false);
    useEffect(() => {
        if (isLoaded && isSignedIn && !tracked.current) {
            tracked.current = true;
            trackEvent('account_created');
        }
    }, [isLoaded, isSignedIn]);
    return <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={authPath("/sign-in", returnTo)} forceRedirectUrl={returnTo ? `${basePath}${returnTo}` : undefined}/>;
}
function AuthPage({ signup = false }) {
    const returnTo = invitationReturnPath();
    return <div data-testid={signup ? 'auth-sign-up' : 'auth-sign-in'} className="relative min-h-[100dvh] bg-background flex items-center justify-center px-4 pb-20"><img src={`${basePath}/logo.svg`} alt="AIME" className="absolute left-5 top-5 h-10 w-auto rounded-xl md:left-8 md:top-7"/>{signup
            ? <SignUpPage returnTo={returnTo}/>
            : <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={authPath("/sign-up", returnTo)} forceRedirectUrl={returnTo ? `${basePath}${returnTo}` : undefined}/>}<p className="absolute bottom-6 text-center text-[11px] text-foreground/40"><a href={`${basePath}/conditions`} className="hover:text-foreground">Conditions</a><span className="mx-2">·</span><a href={`${basePath}/confidentialite`} className="hover:text-foreground">Confidentialité</a></p></div>;
}
function InvitePage({ params }) {
    const { isLoaded, isSignedIn } = useAuth();
    const [error, setError] = useState('');
    const [pending, setPending] = useState(false);
    const returnTo = `/invite/${params.token}`;
    return <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6"><div className="max-w-md text-center">
    <p className="text-[10px] uppercase tracking-[.24em] text-foreground/40">Droit · Collaboration</p>
    <h1 className="mt-4 font-display text-3xl font-light">Invitation à collaborer</h1>
    <p className="mb-7 mt-3 text-sm font-light leading-relaxed text-foreground/55">En acceptant, vous rejoignez ce Monde avec un compte et un rôle. Cette invitation n’est pas une réponse RSVP à l’événement.</p>
    {!isLoaded ? <p className="text-sm text-foreground/45">Vérification de votre compte…</p> : !isSignedIn ? <div className="flex flex-col items-center gap-3">
      <a data-testid="invite-sign-in" href={authPath("/sign-in", returnTo)} className="rounded-full bg-foreground px-6 py-3 text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Se connecter pour accepter</a>
      <a data-testid="invite-sign-up" href={authPath("/sign-up", returnTo)} className="text-sm text-foreground/55 underline decoration-foreground/20 underline-offset-4 hover:text-foreground">Créer un compte avec l’adresse invitée</a>
      <p className="mt-2 text-xs font-light leading-relaxed text-foreground/40">Après la connexion, vous reviendrez ici pour confirmer l’accès. Utilisez la même adresse e-mail vérifiée que celle ayant reçu l’invitation.</p>
    </div> : <button data-testid="invite-accept" disabled={pending} className="rounded-full bg-foreground text-background px-6 py-3 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={async () => {
                setPending(true);
                setError('');
                try {
                    const response = await fetch(`/api/invitations/${params.token}/accept`, { method: 'POST' });
                    if (!response.ok)
                        throw new Error((await response.json()).error);
                    window.location.assign(`${basePath}/user-portal`);
                }
                catch (reason) {
                    setError(reason instanceof Error ? reason.message : 'Invitation impossible à accepter');
                }
                finally {
                    setPending(false);
                }
            }}>{pending ? 'Acceptation…' : "Accepter l’accès au Monde"}</button>}
    {error && <p data-testid="invite-error" className="mt-4 text-sm text-destructive">{error}</p>}
  </div></div>;
}
function RsvpPage({ params }) {
    const [state, setState] = useState({ status: 'confirmed', ceremony: true, cocktail: true, dinner: true, brunch: false, plusOne: false, dietary: '', notes: '' });
    const [projectTitle, setProjectTitle] = useState('Votre invitation');
    const [portal, setPortal] = useState({});
    const [error, setError] = useState('');
    const [status, setStatus] = useState('loading');
    const [saveMessage, setSaveMessage] = useState('');
    const [song, setSong] = useState({ title: '', artist: '', message: '' });
    const [songPending, setSongPending] = useState(false);
    const [songError, setSongError] = useState('');
    const [mediaPending, setMediaPending] = useState(false);
    const [mediaError, setMediaError] = useState('');
    const [caption, setCaption] = useState('');
    const [visibility, setVisibility] = useState('couple');
    const loadPortal = async () => {
        const response = await fetch(`/api/rsvp/${params.token}`);
        const body = await response.json().catch(() => ({}));
        if (!response.ok)
            throw new Error(body.error || 'Lien RSVP indisponible');
        setPortal(body);
        setProjectTitle(body.projectTitle || 'Votre invitation');
        const saved = body.response;
        if (saved)
            setState(current => ({ ...current, ...saved, ...(saved.attendance ?? {}), dietary: saved.dietary ?? '', notes: saved.notes ?? '' }));
    };
    useEffect(() => {
        let active = true;
        setStatus('loading');
        setError('');
        void loadPortal().then(() => {
            if (active)
                setStatus('ready');
        }).catch(reason => {
            if (!active)
                return;
            setError(reason instanceof Error ? reason.message : 'Lien RSVP indisponible');
            setStatus('error');
        });
        return () => { active = false; };
    }, [params.token]);
    if (status === 'error')
        return <main data-testid="rsvp-page" data-rsvp-state="error" className="min-h-screen bg-background text-foreground grid place-items-center p-6 text-center"><div className="max-w-sm"><p data-testid="rsvp-error" className="text-destructive">{error}</p><button type="button" className="mt-5 rounded-full border border-foreground/20 px-5 py-3 hover:bg-foreground/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => window.location.reload()}>Réessayer</button></div></main>;
    const practical = portal.practicalInfo;
    const policy = portal.mediaPolicy;
    const formatPortalTime = (value, timeOnly = false) => {
        const date = new Date(value);
        if (Number.isNaN(date.getTime()))
            return String(value);
        return date.toLocaleString("fr-FR", timeOnly
            ? { hour: "2-digit", minute: "2-digit" }
            : { day: "numeric", month: "long", year: "numeric" });
    };
    return <main data-testid="rsvp-page" data-rsvp-state={status} className="min-h-screen bg-background text-foreground p-5 py-8 md:p-10"><div className="mx-auto max-w-5xl">
    <header className="mb-7"><p className="text-xs tracking-[.3em] text-foreground/50">AIME · PARTICIPATION PERSONNELLE</p><h1 data-testid="rsvp-title" className="mt-2 font-display text-4xl">{projectTitle}</h1><p data-testid="rsvp-guest" className="mt-2 text-foreground/60">{portal.guest?.name ? `Bonjour ${portal.guest.name}` : 'Votre invitation'} · aucun accès au Monde</p>
      <nav aria-label="Sections de votre participation" className="mt-5 flex gap-2 overflow-x-auto pb-2">{[['rsvp', 'RSVP'], ['jour-j', 'Le Jour J'], ['partager', 'Partager'], ['musique', 'Musique'], ['apres', 'Après']].map(([id, label]) => <a data-testid={`link-rsvp-${id}`} key={id} href={`#${id}`} className="shrink-0 rounded-full border border-border px-4 py-2 text-sm hover:bg-foreground/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{label}</a>)}</nav>
    </header>
    <div className="grid gap-5 md:grid-cols-2">
    <section id="rsvp" className="scroll-mt-5"><form data-testid="rsvp-form" className="rounded-3xl border border-border bg-card p-7 space-y-5" onSubmit={async (event) => {
            event.preventDefault();
            if (status !== 'ready')
                return;
            setError('');
            setSaveMessage('');
            setStatus('submitting');
            try {
                const response = await fetch(`/api/rsvp/${params.token}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
                        status: state.status, attendance: { ceremony: state.ceremony, cocktail: state.cocktail, dinner: state.dinner, brunch: state.brunch },
                        dietary: state.dietary || undefined, plusOne: state.plusOne, notes: state.notes || undefined,
                    }) });
                const body = await response.json().catch(() => ({}));
                if (!response.ok)
                    throw new Error(body.error || 'Réponse impossible à enregistrer');
                setSaveMessage('Votre réponse a bien été enregistrée.');
                await loadPortal();
                setStatus('ready');
                if (state.status === 'confirmed')
                    trackEvent('rsvp_confirmed');
            }
            catch (reason) {
                setError(reason instanceof Error ? reason.message : 'Réponse impossible à enregistrer');
                setStatus('ready');
            }
        }}>
       <div><p className="text-xs tracking-[.3em] text-foreground/50">RSVP</p><h2 className="mt-2 text-2xl">Votre présence</h2><p className="mt-2 text-xs font-light leading-relaxed text-foreground/45">Invitation personnelle à participer · aucun accès au Monde</p></div>
     <div className="grid grid-cols-2 gap-2"><button data-testid="rsvp-confirmed" type="button" disabled={status !== 'ready'} onClick={() => setState(s => ({ ...s, status: 'confirmed' }))} className={`rounded-xl p-3 border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${state.status === 'confirmed' ? 'bg-foreground text-background border-foreground' : 'border-foreground/20 hover:bg-foreground/5'}`}>Je serai présent·e</button><button data-testid="rsvp-declined" type="button" disabled={status !== 'ready'} onClick={() => setState(s => ({ ...s, status: 'declined' }))} className={`rounded-xl p-3 border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${state.status === 'declined' ? 'bg-foreground text-background border-foreground' : 'border-foreground/20 hover:bg-foreground/5'}`}>Je décline</button></div>
     {state.status === 'confirmed' && <div className="grid grid-cols-2 gap-3 text-sm">{['ceremony', 'cocktail', 'dinner', 'brunch'].map(key => <label key={key} className="flex gap-2 capitalize"><input aria-label={key} name={`rsvp-${key}`} type="checkbox" checked={state[key]} disabled={status !== 'ready'} onChange={e => setState(s => ({ ...s, [key]: e.target.checked }))} className="accent-foreground"/>{key}</label>)}<label className="flex gap-2 col-span-2"><input aria-label="plus-one" name="rsvp-plus-one" type="checkbox" checked={state.plusOne} disabled={status !== 'ready'} onChange={e => setState(s => ({ ...s, plusOne: e.target.checked }))} className="accent-foreground"/>Je viens accompagné·e</label></div>}
     <input aria-label="dietary" name="rsvp-dietary" className="w-full rounded-xl border border-border bg-background p-3 focus:outline-none focus:ring-1 focus:ring-foreground/30" placeholder="Allergies ou régime alimentaire" value={state.dietary} disabled={status !== 'ready'} onChange={e => setState(s => ({ ...s, dietary: e.target.value }))}/>
     <textarea aria-label="notes" name="rsvp-notes" className="w-full rounded-xl border border-border bg-background p-3 focus:outline-none focus:ring-1 focus:ring-foreground/30" placeholder="Une note pour les mariés" value={state.notes} disabled={status !== 'ready'} onChange={e => setState(s => ({ ...s, notes: e.target.value }))}/>
      {error && <p data-testid="rsvp-error" className="text-destructive text-sm" role="alert">{error}</p>}{saveMessage && <p data-testid="rsvp-success" className="text-sm text-emerald-600" role="status"><span data-testid="rsvp-saved">{saveMessage}</span></p>}<button data-testid="rsvp-submit" type="submit" disabled={status !== 'ready'} className="w-full rounded-full bg-foreground text-background p-3 font-semibold disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{status === 'submitting' ? 'Enregistrement…' : 'Confirmer ma réponse'}</button>
    </form></section>
    <section id="jour-j" className="scroll-mt-5 rounded-3xl border border-border bg-card p-7"><p className="text-xs tracking-[.3em] text-foreground/50">LE JOUR J</p><h2 className="mt-2 text-2xl">Vos repères</h2>
      {status === 'loading' ? <p data-testid="status-program-loading" className="mt-4 text-sm text-foreground/55" role="status">Chargement du programme…</p> : <>{portal.guest?.tableName && <p data-testid="text-table-name" className="mt-4 rounded-xl bg-foreground/5 p-3 text-sm">Votre table : <strong>{portal.guest.tableName}</strong></p>}
      {portal.program?.length ? <ol className="mt-4 space-y-3">{portal.program.map(item => <li data-testid={`card-program-${item.id}`} key={item.id} className="border-l border-foreground/25 pl-3"><p className="text-xs text-foreground/50">{formatPortalTime(item.time, true)}{item.endTime ? ` — ${formatPortalTime(item.endTime, true)}` : item.durationMinutes ? ` · ${item.durationMinutes} min` : ''}</p><h3>{item.title}</h3>{item.detail && <p className="text-sm text-foreground/60">{item.detail}</p>}{item.location && <p className="text-xs text-foreground/50">{item.location}</p>}</li>)}</ol> : <p data-testid="status-program-empty" className="mt-4 text-sm text-foreground/55">Le programme personnel sera bientôt disponible.</p>}
      <div className="mt-5 border-t border-border pt-4 text-sm text-foreground/65">{practical ? <>{practical.venue && <p><strong>Lieu :</strong> {practical.venue}{practical.city ? ` · ${practical.city}` : ''}</p>}{practical.parking && <p className="mt-2"><strong>Parking :</strong> {practical.parking}</p>}{practical.accessibility && <p className="mt-2"><strong>Accessibilité :</strong> {practical.accessibility}</p>}{practical.weatherFallback && <p className="mt-2"><strong>En cas de météo :</strong> {practical.weatherFallback}</p>}</> : <p data-testid="status-practical-empty">Les informations pratiques seront communiquées ici.</p>}</div></>}</section>
    <section id="partager" className="scroll-mt-5 rounded-3xl border border-border bg-card p-7"><p className="text-xs tracking-[.3em] text-foreground/50">PARTAGER</p><h2 className="mt-2 text-2xl">Vos souvenirs</h2>
      {!policy?.enabled ? <p data-testid="status-media-disabled" className="mt-4 text-sm text-foreground/55">Le partage de médias n’est pas activé pour le moment.</p> : <form className="mt-4 space-y-3" onSubmit={async (event) => { event.preventDefault(); const form = event.currentTarget; const file = form.elements.namedItem('media-file').files?.[0]; if (!file)
            return setMediaError('Choisissez un fichier à partager.'); if (policy.maxSize && file.size > policy.maxSize)
            return setMediaError(`Ce fichier dépasse la taille maximale autorisée (${Math.round(policy.maxSize / 1024 / 1024)} Mo).`); setMediaPending(true); setMediaError(''); try {
            const request = await fetch(`/api/rsvp/${params.token}/media/uploads/request-url`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: file.name, contentType: file.type, size: file.size }) });
            const upload = await request.json().catch(() => ({}));
            if (!request.ok || !upload.uploadURL)
                throw new Error(upload.error || 'Préparation de l’envoi impossible');
            const put = await fetch(upload.uploadURL, { method: 'PUT', headers: { "Content-Type": file.type }, body: file });
            if (!put.ok)
                throw new Error('Envoi du fichier impossible');
            const saved = await fetch(`/api/rsvp/${params.token}/media`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ objectPath: upload.objectPath, finalizeToken: upload.finalizeToken, name: file.name, contentType: file.type, size: file.size, caption: caption || undefined, visibility, consent: true }) });
            if (!saved.ok) {
                const body = await saved.json().catch(() => ({}));
                throw new Error(body.error || 'Publication impossible');
            }
            setCaption('');
            form.reset();
            await loadPortal();
        }
        catch (reason) {
            setMediaError(reason instanceof Error ? reason.message : 'Publication impossible');
        }
        finally {
            setMediaPending(false);
        } }}>
        <input data-testid="input-media-file" name="media-file" type="file" accept={policy.accept?.join(',')} disabled={mediaPending} className="block w-full text-sm"/><input data-testid="input-media-caption" value={caption} onChange={e => setCaption(e.target.value)} placeholder="Légende (facultatif)" disabled={mediaPending} className="w-full rounded-xl border border-border bg-background p-3"/><select data-testid="select-media-visibility" value={visibility} onChange={e => setVisibility(e.target.value)} disabled={mediaPending} className="w-full rounded-xl border border-border bg-background p-3"><option value="couple">Pour les mariés</option><option value="guests">Pour les invités</option></select>{mediaError && <p data-testid="media-error" className="text-sm text-destructive" role="alert">{mediaError}</p>}<button data-testid="button-media-upload" disabled={mediaPending} className="rounded-full bg-foreground px-5 py-3 text-sm font-semibold text-background disabled:opacity-50">{mediaPending ? 'Envoi…' : 'Partager avec mon consentement'}</button></form>}
      {portal.contributions?.length ? <ul className="mt-5 space-y-2">{portal.contributions.map(item => <li data-testid={`media-${item.id}`} key={item.id} className="flex items-center justify-between gap-3 text-sm"><span>{item.caption || item.name} <em className="text-foreground/50">· {item.moderationStatus}</em></span>{item.canView ? <a data-testid={`link-media-${item.id}`} className="underline" href={`/api/rsvp/${params.token}/media/${item.id}`}>Voir</a> : <span className="text-foreground/45">En attente de visibilité</span>}</li>)}</ul> : <p data-testid="status-media-empty" className="mt-5 text-sm text-foreground/55">Aucun souvenir partagé pour l’instant.</p>}</section>
    <section id="musique" className="scroll-mt-5 rounded-3xl border border-border bg-card p-7"><p className="text-xs tracking-[.3em] text-foreground/50">MUSIQUE</p><h2 className="mt-2 text-2xl">Une envie musicale</h2><form className="mt-4 space-y-3" onSubmit={async (event) => { event.preventDefault(); setSongError(''); setSongPending(true); try {
        const response = await fetch(`/api/rsvp/${params.token}/song-requests`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(song) });
        const body = await response.json().catch(() => ({}));
        if (!response.ok)
            throw new Error(body.error || 'Demande impossible à envoyer');
        setSong({ title: '', artist: '', message: '' });
        await loadPortal();
    }
    catch (reason) {
        setSongError(reason instanceof Error ? reason.message : 'Demande impossible à envoyer');
    }
    finally {
        setSongPending(false);
    } }}><input data-testid="input-song-title" required value={song.title} onChange={e => setSong(s => ({ ...s, title: e.target.value }))} placeholder="Titre" className="w-full rounded-xl border border-border bg-background p-3"/><input data-testid="input-song-artist" required value={song.artist} onChange={e => setSong(s => ({ ...s, artist: e.target.value }))} placeholder="Artiste" className="w-full rounded-xl border border-border bg-background p-3"/><input data-testid="input-song-message" value={song.message} onChange={e => setSong(s => ({ ...s, message: e.target.value }))} placeholder="Un mot (facultatif)" className="w-full rounded-xl border border-border bg-background p-3"/>{songError && <p data-testid="song-error" role="alert" className="text-sm text-destructive">{songError}</p>}<button data-testid="button-song-submit" disabled={songPending} className="rounded-full bg-foreground px-5 py-3 text-sm font-semibold text-background disabled:opacity-50">{songPending ? 'Envoi…' : 'Proposer ce morceau'}</button></form>{portal.songRequests?.length ? <ul className="mt-5 space-y-2">{portal.songRequests.map(item => <li data-testid={`song-${item.id}`} key={item.id} className="text-sm">{item.title} — {item.artist} <span className="text-foreground/50">· {item.status}</span></li>)}</ul> : <p data-testid="status-songs-empty" className="mt-5 text-sm text-foreground/55">Aucune demande musicale pour l’instant.</p>}</section>
    <section id="apres" className="scroll-mt-5 rounded-3xl border border-border bg-card p-7 md:col-span-2"><p className="text-xs tracking-[.3em] text-foreground/50">APRÈS</p><h2 className="mt-2 text-2xl">La suite</h2>{portal.afterContent?.length ? <ul className="mt-4 grid gap-3 md:grid-cols-2">{portal.afterContent.map(item => <li data-testid={`after-${item.id}`} key={item.id} className="rounded-xl bg-foreground/5 p-4"><p className="text-xs text-foreground/50">{formatPortalTime(item.time)}{item.location ? ` · ${item.location}` : ''}</p><h3>{item.title}</h3>{item.detail && <p className="mt-1 text-sm text-foreground/60">{item.detail}</p>}</li>)}</ul> : <p data-testid="status-after-empty" className="mt-4 text-sm text-foreground/55">Les informations après le mariage apparaîtront ici.</p>}</section>
    </div></div></main>;
}
function RoutedErrorBoundary({ children }) {
    const [location] = useLocation();
    return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}
function Routes() {
    return <RoutedErrorBoundary><Switch>
    <Route path="/guides" component={GuidesPage}/>
    <Route path="/concept" component={ConceptLanding}/>
    <Route path="/confidentialite">{() => <LegalPage kind="privacy"/>}</Route>
    <Route path="/conditions">{() => <LegalPage kind="terms"/>}</Route>
    <Route path="/" component={HomeRedirect}/>
    <Route path="/user-portal">{() => <PrivateRoute><Home /></PrivateRoute>}</Route>
    <Route path="/profile">{() => <PrivateRoute><ProfilePageWrapper /></PrivateRoute>}</Route>
    <Route path="/network">{() => <PrivateRoute><NetworkPage /></PrivateRoute>}</Route>
    <Route path="/laboratoire">{() => <PrivateRoute><LaboratoryPage /></PrivateRoute>}</Route>
    <Route path="/sign-in/*?">{() => <AuthPage />}</Route>
    <Route path="/sign-up/*?">{() => <AuthPage signup/>}</Route>
    <Route path="/invite/:token" component={InvitePage}/>
    <Route path="/rsvp/:token" component={RsvpPage}/>
    <Route path="/profil/:projectId">{() => <PublicProfilePage />}</Route>
    <Route path="/le-monde-aime" component={LeMondeAimePage}/>
    <Route component={NotFound}/>
  </Switch></RoutedErrorBoundary>;
}
function Providers() {
    const [, setLocation] = useLocation();
    return <ClerkProvider publishableKey={clerkPubKey} proxyUrl={clerkProxyUrl} appearance={clerkAppearance} signInUrl={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} localization={{ signIn: { start: { title: 'Heureux de vous revoir', subtitle: 'Retrouvez votre mariage' } }, signUp: { start: { title: 'Créer votre espace AIME', subtitle: 'Votre histoire commence ici' } } }} routerPush={to => setLocation(stripBase(to))} routerReplace={to => setLocation(stripBase(to), { replace: true })}>
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
//# sourceMappingURL=App.jsx.map