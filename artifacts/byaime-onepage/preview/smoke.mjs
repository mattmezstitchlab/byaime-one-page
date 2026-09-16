/*
 * Contrôle local (sans navigateur) : 1) le stub d'aperçu expose bien toutes les
 * API Clerk que l'app consomme — un effet qui plante en navigateur ne se voit
 * pas en rendu SSR ; 2) l'accueil et les routes publiques se montent sans erreur,
 * en visiteur comme en membre.
 *
 * Lancement : node preview/smoke.mjs   (depuis artifacts/byaime-onepage)
 */
import { createElement } from "react";
import { renderToStaticMarkup, renderToPipeableStream } from "react-dom/server";
import { Writable } from "node:stream";
import { createServer } from "vite";

const store = { appearance: "dark", items: {} };
const DRAFT = "Notre mariage le 14 août 2027, près de Lille.";
globalThis.localStorage = {
  getItem: (k) => (k === "aime-appearance" ? store.appearance : (store.items[k] ?? null)),
  setItem: (k, v) => {
    store.items[k] = String(v);
  },
  removeItem: (k) => {
    delete store.items[k];
  },
};
globalThis.window = {
  localStorage: globalThis.localStorage,
  location: { origin: "http://localhost:4173", hostname: "localhost", pathname: "/", href: "http://localhost:4173/", search: "", hash: "" },
  history: { pushState() {}, replaceState() {}, state: null, length: 1, scroll() {} },
  matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }),
  addEventListener() {},
  removeEventListener() {},
  scrollTo() {},
};
globalThis.document = {
  documentElement: { dataset: {}, classList: { add() {}, remove() {}, toggle() {} }, style: {} },
  head: { appendChild() {}, querySelector: () => null },
  body: { appendChild() {}, classList: { add() {}, remove() {} } },
  createElement: () => ({ setAttribute() {}, addEventListener() {}, style: {}, dataset: {} }),
  querySelector: () => null,
  addEventListener() {},
  removeEventListener() {},
};
globalThis.document.defaultView = globalThis.window;
globalThis.location = globalThis.window.location;
globalThis.history = globalThis.window.history;
globalThis.matchMedia = globalThis.window.matchMedia;
// Épingler la porte d'entrée en français : la détection de langue respecte
// navigator.language dans un vrai navigateur (l'anglais est testé plus bas).
const setNavigatorLanguage = (language, languages) =>
  Object.defineProperty(globalThis, "navigator", {
    value: { language, languages, serviceWorker: undefined },
    configurable: true,
    writable: true,
  });
setNavigatorLanguage("fr-FR", ["fr-FR", "fr"]);
globalThis.addEventListener = globalThis.window.addEventListener;
globalThis.removeEventListener = globalThis.window.removeEventListener;

/*
 * Les contrôles ci-dessous décrivent l'app en mode nominal : ils supposent une
 * clé publique d'authentification configurée. Depuis le lot 1.1 du plan, c'est
 * la variable d'environnement qui fait foi (`publishableKeyFromHost` fabrique
 * une clé depuis le nom d'hôte et ne signale donc jamais une configuration
 * absente). Le mode dégradé — clé absente — est contrôlé en fin de fichier,
 * avec son propre serveur Vite.
 */
process.env.VITE_CLERK_PUBLISHABLE_KEY ??= "pk_test_preview";

const vite = await createServer({
  configFile: new URL("./vite.preview.mjs", import.meta.url).pathname,
  server: { middlewareMode: true },
  appType: "custom",
});

let failures = 0;

function check(label, ok, detail = "") {
  if (!ok) failures += 1;
  console.log(`${ok ? "✓" : "✗"} ${label}${detail ? ` — ${detail}` : ""}`);
}

// 1) Le stub doit couvrir l'API Clerk réellement consommée par l'app.
const clerkStub = await vite.ssrLoadModule("/preview/clerk-stub.tsx");
const apis = {
  useClerk: ["addListener", "signOut", "openUserProfile"],
  useUser: ["user"],
  useAuth: ["isLoaded", "isSignedIn", "userId"],
  useSession: ["session"],
};
for (const [hook, members] of Object.entries(apis)) {
  const value = clerkStub[hook]();
  const missing = members.filter((member) => value?.[member] === undefined);
  check(`stub Clerk ${hook}()`, missing.length === 0, missing.length ? `manquants : ${missing.join(", ")}` : "");
}
check(
  "stub Clerk : addListener() est bien une fonction et renvoie son désabonnement",
  typeof clerkStub.useClerk().addListener === "function" && typeof clerkStub.useClerk().addListener(() => {}) === "function",
);
globalThis.localStorage.setItem("aime-intention-draft", DRAFT);
for (const mode of ["SignIn", "SignUp"]) {
  try {
    const html = renderToStaticMarkup(createElement(clerkStub[mode]));
    check(`carte d’aperçu ${mode}`, html.includes("AIME a retenu") && html.includes(DRAFT), `${html.length} octets`);
  } catch (error) {
    check(`carte d’aperçu ${mode}`, false, String(error?.message ?? error));
  }
}
globalThis.localStorage.removeItem("aime-intention-draft");

// 1b) Le garde <Show> doit interpréter les chaînes Clerk : en visiteur, seule
// la branche "signed-out" s'affiche ; en membre, seule "signed-in". Sinon
// l'espace privé rebondit vers l'accueil (Redirect toujours montée).
for (const [session, expected] of [["0", "signed-out"], ["1", "signed-in"]]) {
  globalThis.localStorage.setItem("aime-preview-session", session);
  const shown = renderToStaticMarkup(
    createElement(
      "div",
      null,
      createElement(clerkStub.Show, { when: "signed-in" }, "BRANCHE-MEMBRE"),
      createElement(clerkStub.Show, { when: "signed-out" }, "BRANCHE-VISITEUR"),
    ),
  );
  const ok = expected === "signed-in"
    ? shown.includes("BRANCHE-MEMBRE") && !shown.includes("BRANCHE-VISITEUR")
    : shown.includes("BRANCHE-VISITEUR") && !shown.includes("BRANCHE-MEMBRE");
  check(`garde <Show> (session ${session} → ${expected})`, ok, shown.slice(0, 120));
}
globalThis.localStorage.removeItem("aime-preview-session");

// 2) Rendu des pages.
const { Router } = await vite.ssrLoadModule("wouter");
const { ProjectProvider } = await vite.ssrLoadModule("/src/store/project-store.tsx");
const { LandingPage } = await vite.ssrLoadModule("/src/pages/Landing.tsx");
const { default: App } = await vite.ssrLoadModule("/src/App.tsx");

function renderAt(path, node) {
  return renderToStaticMarkup(createElement(Router, { hook: () => [path, () => undefined] }, createElement(ProjectProvider, null, node)));
}

function checkHtml(label, html, needles, absent = []) {
  const missing = needles.filter((needle) => !html.includes(needle));
  const leaked = absent.filter((needle) => html.includes(needle));
  if (missing.length) failures += missing.length;
  if (leaked.length) failures += leaked.length;
  console.log(
    `${missing.length || leaked.length ? "✗" : "✓"} ${label} — ${html.length} octets` +
      (missing.length ? `\n   manquants : ${missing.join(" | ")}` : "") +
      (leaked.length ? `\n   interdits présents : ${leaked.join(" | ")}` : ""),
  );
}

/* Le choix Couple / Wedding planner a été retiré de l'accueil : il reste deux
   portes (ma carte, mon mariage) et aucune question avant d'en avoir choisi une. */
checkHtml(
  "Accueil visiteur, sans brouillon (deux portes, questions à venir)",
  renderAt("/", createElement(LandingPage, { signedIn: false })),
  ['data-testid="landing-composer"', 'data-testid="landing-entry"', 'data-testid="landing-create-primary"', 'data-testid="landing-start-blank"', "un seul espace privé", "Sans carte bancaire"],
  ['data-testid="landing-persona', "Wedding planner", 'data-testid="landing-intention-input"', 'data-testid="landing-intention-finish"', "Choisir l’univers", "Laboratoire"],
);

/* Un brouillon repris saute la porte d'entrée (`LandingComposer` : « Une carte
   ou un brouillon repris saute la porte d'entrée ») : le visiteur revient sur la
   première question non répondue, et le texte du brouillon n'est jamais affiché
   tel quel sur la page. */
globalThis.localStorage.setItem("aime-intention-draft", DRAFT);
checkHtml(
  "Accueil visiteur, avec brouillon (reprise sur les questions)",
  renderAt("/", createElement(LandingPage, { signedIn: false })),
  ['data-testid="landing-intention-form"', 'data-testid="landing-intention-input"'],
  ["Lille", 'data-testid="landing-entry"', "Laboratoire"],
);
globalThis.localStorage.removeItem("aime-intention-draft");
checkHtml("Accueil membre", renderAt("/", createElement(LandingPage, { signedIn: true })), ["Accéder à mon espace"], ["Créer un compte gratuit"]);

/* La porte d'entrée doit passer entièrement en anglais (promesse, choix, réassurance). */
setNavigatorLanguage("en-US", ["en-US", "en"]);
checkHtml(
  "Accueil visiteur en anglais (promesse, navigation et réassurance EN)",
  renderAt("/", createElement(LandingPage, { signedIn: false })),
  ['data-testid="landing-locale-en"', 'data-testid="landing-entry"', "Your whole wedding", "No credit card", "Create my space", "Sign in"],
  ["Notre mariage", "Créer mon espace", "un seul espace privé", 'data-testid="landing-persona', 'data-testid="landing-intention-input"'],
);
setNavigatorLanguage("fr-FR", ["fr-FR", "fr"]);

/*
 * L'app découpe désormais les routes lourdes (espace privé, profil public) avec
 * React.lazy : le rendu statique synchrone ne verrait que le Suspense. On rend
 * donc en flux et on attend `onAllReady` — le moment où tous les modules
 * différés sont résolus — pour vérifier le contenu réel de chaque route.
 */
async function renderToStringAsync(element) {
  return await new Promise((resolve, reject) => {
    let html = "";
    let settled = false;
    const finish = (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) reject(error);
      else resolve(html);
    };
    const timer = setTimeout(() => finish(new Error("SSR timeout (lazy non résolu)")), 20000);
    const sink = new Writable({
      write(chunk, _encoding, callback) {
        html += chunk.toString();
        callback();
      },
    });
    const { pipe } = renderToPipeableStream(element, {
      onShellError: (error) => finish(error),
      onError: (error) => finish(error),
      onAllReady() {
        pipe(sink);
        sink.on("finish", () => finish());
        sink.on("error", (error) => finish(error));
      },
    });
  });
}

async function renderApp(path) {
  globalThis.window.location.pathname = path;
  globalThis.window.location.href = `http://localhost:4173${path}`;
  return renderToStringAsync(createElement(App));
}

checkHtml("App complète (route /)", await renderApp("/"), ['data-testid="landing"'], ["Laboratoire"]);
checkHtml("App complète (/confidentialite)", await renderApp("/confidentialite"), [], []);
checkHtml("App complète (/creation)", await renderApp("/creation"), ["Clerk simulé"], []);

/* La Bande (`/monde`) a été retirée le 16/09/2026 ; l'ancienne vitrine
   `/agence` l'avait été avant elle. Les deux URL redirigent vers l'accueil, la
   page unique du site : un `<Redirect>` ne rend rien côté serveur, d'où le rendu
   vide attendu — le navigateur, lui, suit la redirection. */
checkHtml(
  "L'ancienne vitrine (/agence) redirige vers l'accueil",
  await renderApp("/agence"),
  [],
  ['data-testid="agency-landing"', 'data-testid="bande-page"', 'data-testid="landing"'],
);
checkHtml(
  "La Bande retirée (/monde) redirige vers l'accueil",
  await renderApp("/monde"),
  [],
  ['data-testid="bande-page"', 'data-testid="bande-composer"', "La Bande", 'data-testid="landing"'],
);
/* L'accueil est la seule page publique restante : il porte la promesse, les
   valeurs, l'appel à créer et les textes légaux (aucune session requise). */
checkHtml(
  "L'accueil (/) — la page unique du site",
  await renderApp("/"),
  [
    'data-testid="landing"',
    'data-testid="landing-hero"',
    'data-testid="landing-composer"',
    'data-testid="landing-values"',
    'data-testid="landing-cta"',
    "Tout votre mariage, dans un seul espace privé",
    'href="/conditions"',
    'href="/confidentialite"',
    'data-testid="footer-mentions"',
  ],
  ["Connexion momentanément indisponible", 'data-testid="private-layout"', "La Bande"],
);
checkHtml(
  "Mentions légales (/mentions-legales)",
  await renderApp("/mentions-legales"),
  [
    'data-testid="mentions-page"',
    'data-testid="legal-editor"',
    'data-testid="legal-host"',
    "Vercel Inc.",
    "6 III-1",
    "À compléter avant mise en ligne",
  ],
  [],
);

// Page invité RSVP : français par défaut, puis tout le parcours en anglais.
checkHtml(
  "RSVP invité en français (formulaire, sections, statuts)",
  await renderApp("/rsvp/invite-test"),
  ['data-testid="rsvp-page"', 'data-testid="rsvp-form"', "Votre présence", "Confirmer ma réponse", "PARTAGER", "MUSIQUE", "APRÈS"],
  ["Confirm my reply", "Your attendance"],
);
setNavigatorLanguage("en-US", ["en-US", "en"]);
checkHtml(
  "RSVP invité en anglais (formulaire, navigation, sections)",
  await renderApp("/rsvp/invite-test"),
  ["Your attendance", "Confirm my reply", "SHARE", "MUSIC", "AFTER", "I’ll be there", "Ceremony"],
  ["Votre présence", "Confirmer ma réponse", "Je serai présent·e", "Cérémonie"],
);
setNavigatorLanguage("fr-FR", ["fr-FR", "fr"]);

/* Espace privé (lot 1 de traduction) : la coque du Monde — rail, capsule
   temporelle, onboarding — doit basculer en entier, sans laisser fuir de FR.
   Session membre requise : sans elle, le garde <Show> rend la redirection. */
globalThis.localStorage.setItem("aime-preview-session", "1");
checkHtml(
  "Espace privé en français (coque + onboarding)",
  await renderApp("/user-portal"),
  ['data-testid="private-layout"', 'data-testid="project-composer"', "Quelques questions pour commencer.", "Explorer un mariage complet"],
  ["Private space", "A few questions to get started.", "Explore a complete wedding"],
);
setNavigatorLanguage("en-US", ["en-US", "en"]);
checkHtml(
  "Espace privé en anglais (coque + onboarding)",
  await renderApp("/user-portal"),
  ['data-testid="private-layout"', 'data-testid="project-composer"', "A few questions to get started.", "Explore a complete wedding"],
  ["Quelques questions pour commencer.", "Explorer un mariage complet"],
);
setNavigatorLanguage("fr-FR", ["fr-FR", "fr"]);

/* Sans session, l'espace privé ne doit pas fuir sa coque (branche signée absente). */
globalThis.localStorage.setItem("aime-preview-session", "0");
checkHtml(
  "Espace privé visiteur (redirigé, coque absente)",
  await renderApp("/user-portal"),
  [],
  ['data-testid="project-composer"', "Quelques questions pour commencer.", "Explore a complete wedding"],
);
globalThis.localStorage.removeItem("aime-preview-session");

await vite.close();

/* 3) Mode dégradé : `VITE_CLERK_PUBLISHABLE_KEY` absent. L'authentification
      n'est pas configurée, mais les pages qui n'en ont jamais eu besoin doivent
      rester servies — la vitrine de l'agence, ses mentions légales, les textes
      légaux, le bilan partagé d'un couple et le portail RSVP d'un invité. Un
      second serveur Vite est nécessaire : la clé est lue au chargement du
      module `App.tsx`. */
const degradedVite = await createServer({
  configFile: new URL("./vite.preview.mjs", import.meta.url).pathname,
  server: { middlewareMode: true },
  appType: "custom",
  define: { "import.meta.env.VITE_CLERK_PUBLISHABLE_KEY": "undefined" },
});
const { default: DegradedApp } = await degradedVite.ssrLoadModule("/src/App.tsx");

async function renderDegradedApp(path) {
  globalThis.window.location.pathname = path;
  globalThis.window.location.href = `http://localhost:4173${path}`;
  return renderToStringAsync(createElement(DegradedApp));
}

const UNAVAILABLE = "Connexion momentanément indisponible";
checkHtml(
  "Dégradé : l'accueil reste servi sur l'ancienne vitrine (/agence)",
  await renderDegradedApp("/agence"),
  ['data-testid="landing"', 'data-testid="landing-composer"'],
  [UNAVAILABLE, 'data-testid="bande-page"'],
);
checkHtml(
  "Dégradé : les mentions légales restent servies",
  await renderDegradedApp("/mentions-legales"),
  ['data-testid="mentions-page"', 'data-testid="legal-host"', "Vercel Inc."],
  [UNAVAILABLE],
);
checkHtml(
  "Dégradé : les textes légaux restent servis",
  await renderDegradedApp("/confidentialite"),
  ["Confidentialité"],
  [UNAVAILABLE],
);
/* L'accueil public compose avec le store (compositeur d'intention) : en mode
   dégradé il n'y a pas de `ClerkProvider`, le store est donc monté en session
   absente (`LocalProjectProvider`). Si l'accueil tombait ici, la page la plus
   exposée du site dépendrait d'un fournisseur d'authentification. */
checkHtml(
  "Dégradé : la racine sert l'accueil, la page unique",
  await renderDegradedApp("/"),
  ['data-testid="landing"', 'data-testid="landing-composer"', 'data-testid="landing-create-primary"'],
  [UNAVAILABLE, 'data-testid="bande-page"'],
);
checkHtml(
  "Dégradé : l'URL de la Bande retirée (/monde) sert l'accueil",
  await renderDegradedApp("/monde"),
  ['data-testid="landing"', 'data-testid="landing-composer"'],
  [UNAVAILABLE, 'data-testid="bande-page"', "La Bande"],
);
checkHtml(
  "Dégradé : le portail d'un invité reste servi",
  await renderDegradedApp("/rsvp/invite-test"),
  ['data-testid="rsvp-page"'],
  [UNAVAILABLE],
);
checkHtml(
  "Dégradé : une route à session explique, sans rien demander",
  await renderDegradedApp("/user-portal"),
  [UNAVAILABLE, 'data-testid="auth-key-missing-path"', "Revenir à l’accueil"],
  ['data-testid="private-layout"', 'data-testid="landing"'],
);
await degradedVite.close();

console.log(failures === 0 ? "CONTRÔLE LOCAL OK" : `CONTRÔLE LOCAL : ${failures} problème(s)`);
process.exit(failures === 0 ? 0 : 1);
