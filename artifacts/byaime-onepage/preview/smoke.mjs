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

checkHtml(
  "Accueil visiteur, sans brouillon (deux choix, questions à venir)",
  renderAt("/", createElement(LandingPage, { signedIn: false })),
  ['data-testid="landing-composer"', 'data-testid="landing-persona"', "Couple", "Wedding planner", "un seul espace privé", "Sans carte bancaire", 'data-testid="landing-guide-button"', 'data-testid="landing-guides-links"', "Tous les guides"],
  ['data-testid="landing-intention-input"', 'data-testid="landing-intention-finish"', "Choisir l’univers", "Laboratoire"],
);

/* Le brouillon ne fuit pas dans le hero : l'écran des deux choix passe
   d'abord, les réponses repeuplées n'apparaissent qu'ensuite. */
globalThis.localStorage.setItem("aime-intention-draft", DRAFT);
checkHtml(
  "Accueil visiteur, avec brouillon (choix d'abord, brouillon invisible)",
  renderAt("/", createElement(LandingPage, { signedIn: false })),
  ['data-testid="landing-persona"', "Wedding planner"],
  ["Lille", 'data-testid="landing-intention-input"', "Laboratoire"],
);
globalThis.localStorage.removeItem("aime-intention-draft");
checkHtml("Accueil membre", renderAt("/", createElement(LandingPage, { signedIn: true })), ["Accéder à mon espace"], ["Créer un compte gratuit"]);

/* La porte d'entrée doit passer entièrement en anglais (promesse, choix, réassurance). */
setNavigatorLanguage("en-US", ["en-US", "en"]);
checkHtml(
  "Accueil visiteur en anglais (deux choix EN)",
  renderAt("/", createElement(LandingPage, { signedIn: false })),
  ['data-testid="landing-locale-en"', 'data-testid="landing-persona"', "A couple", "Wedding planner", "Your whole wedding", "No credit card", "Create my space", "Sign in"],
  ["Notre mariage", "Créer mon espace", "un seul espace privé", 'data-testid="landing-intention-input"'],
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
checkHtml("App complète (/guides)", await renderApp("/guides"), ["guides-page", 'data-testid="guide-chapters-open"', "1/25", "Comprendre avant de cliquer", "Chapitres"], ["demo-select-"]);
checkHtml("App complète (/confidentialite)", await renderApp("/confidentialite"), [], []);
checkHtml("App complète (/creation)", await renderApp("/creation"), ["Clerk simulé"], []);

// Page invité RSVP : français par défaut, puis tout le parcours en anglais.
checkHtml(
  "RSVP invité en français (formulaire, sections, statuts)",
  await renderApp("/rsvp/invite-test"),
  ['data-testid="rsvp-page"', 'data-testid="rsvp-form"', "Votre présence", "Confirmer ma réponse", "PARTAGER", "MUSIQUE", "APRÈS"],
  ["Confirm my reply", "Your attendance"],
);
setNavigatorLanguage("en-US", ["en-US", "en"]);
checkHtml(
  "Guides en anglais (capsule, titre, FakeUI du guide actif)",
  await renderApp("/guides"),
  ["Understand before you click", "Chapters", 'aria-label="Next guide"', "Explain this screen"],
  ["Chapitres", "Guide suivant", "Expliquer cet écran"],
);
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
  "Espace privé en français (coque du Monde)",
  await renderApp("/user-portal"),
  ["Espace privé", "Profil", "Monde", "Aide &amp; guides", "Mon compte (ME)", "Quelques questions pour commencer."],
  ["Private space", "Help &amp; guides", "My account (ME)"],
);
setNavigatorLanguage("en-US", ["en-US", "en"]);
checkHtml(
  "Espace privé en anglais (rail, capsule, onboarding)",
  await renderApp("/user-portal"),
  [
    "Private space", "Profile", "World", "Help &amp; guides", "My account (ME)", "World settings",
    "A few questions to get started.", "Explore a complete wedding",
    'aria-label="Open help"', 'aria-label="Create or link"', 'aria-label="Back to the AIME home page"',
  ],
  ["Espace privé", "Aide &amp; guides", "Mon compte (ME)", "Réglages du Monde", "Explorer un mariage complet", "Ouvrir l’aide"],
);
setNavigatorLanguage("fr-FR", ["fr-FR", "fr"]);

/* Sans session, l'espace privé ne doit pas fuir sa coque (branche signée absente). */
globalThis.localStorage.setItem("aime-preview-session", "0");
checkHtml(
  "Espace privé visiteur (redirigé, coque absente)",
  await renderApp("/user-portal"),
  [],
  ["Espace privé", "Mon compte (ME)", "Quelques questions pour commencer."],
);
globalThis.localStorage.removeItem("aime-preview-session");

await vite.close();
console.log(failures === 0 ? "CONTRÔLE LOCAL OK" : `CONTRÔLE LOCAL : ${failures} problème(s)`);
process.exit(failures === 0 ? 0 : 1);
