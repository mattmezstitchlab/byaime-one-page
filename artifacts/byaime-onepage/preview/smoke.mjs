/*
 * Contrôle local (sans navigateur) : 1) le stub d'aperçu expose bien toutes les
 * API Clerk que l'app consomme — un effet qui plante en navigateur ne se voit
 * pas en rendu SSR ; 2) l'accueil et les routes publiques se montent sans erreur,
 * en visiteur comme en membre.
 *
 * Lancement : node preview/smoke.mjs   (depuis artifacts/byaime-onepage)
 */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
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
  "Accueil visiteur, sans brouillon (capsule guidée complète)",
  renderAt("/", createElement(LandingPage, { signedIn: false })),
  ['data-testid="landing-composer"', 'data-testid="landing-universe"', 'data-testid="landing-intention-submit"', "Notre mariage", "La date du mariage", "1/5", "Créer mon espace", 'data-testid="landing-guide-button"'],
  ["Choisir l’univers", "1/6", "Laboratoire"],
);

/* Une intention posée avant la création du compte doit reprendre la main sur
   l'accueil, en mode phrase libre. */
globalThis.localStorage.setItem("aime-intention-draft", DRAFT);
checkHtml(
  "Accueil visiteur, avec brouillon (phrase reprise)",
  renderAt("/", createElement(LandingPage, { signedIn: false })),
  ['data-testid="landing-composer"', 'data-testid="landing-intention-free"', "Revenir aux questions", DRAFT],
  ["Laboratoire"],
);
globalThis.localStorage.removeItem("aime-intention-draft");
checkHtml("Accueil membre", renderAt("/", createElement(LandingPage, { signedIn: true })), ["Accéder à mon espace"], ["Créer un compte gratuit"]);

async function renderApp(path) {
  globalThis.window.location.pathname = path;
  globalThis.window.location.href = `http://localhost:4173${path}`;
  return renderToStaticMarkup(createElement(App));
}

checkHtml("App complète (route /)", await renderApp("/"), ['data-testid="landing"'], ["Laboratoire"]);
checkHtml("App complète (/guides)", await renderApp("/guides"), ["guides-page"], []);
checkHtml("App complète (/confidentialite)", await renderApp("/confidentialite"), [], []);
checkHtml("App complète (/creation)", await renderApp("/creation"), ["Clerk simulé"], []);

await vite.close();
console.log(failures === 0 ? "CONTRÔLE LOCAL OK" : `CONTRÔLE LOCAL : ${failures} problème(s)`);
process.exit(failures === 0 ? 0 : 1);
