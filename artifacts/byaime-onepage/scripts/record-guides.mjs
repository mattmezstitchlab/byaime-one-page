/*
 * Enregistre les trois vidéos-guides de l'accueil, à partir du VRAI produit :
 *
 *   1. guide-prestataire — un prestataire (saxophoniste) crée son Monde ;
 *   2. guide-mariee      — une mariée crée son Monde Mariage ;
 *   3. guide-invite      — un invité rejoint un Monde Mariage avec son invitation.
 *
 * Aucune maquette : le script lance l'aperçu local (`preview/vite.preview.mjs`,
 * Clerk simulé et API en mémoire), pilote un Chromium headless avec Playwright,
 * superpose un curseur et des sous-titres, puis encode en MP4 (H.264, 1280×800,
 * sans son) via ffmpeg dans `public/videos/`, avec l'affiche JPEG (l'écran-titre)
 * du même nom. La section `LandingGuides` de l'accueil les lit tels quels.
 *
 * Lancement, depuis artifacts/byaime-onepage (Playwright et ffmpeg requis) :
 *   node scripts/record-guides.mjs              # les trois, à la suite
 *   node scripts/record-guides.mjs mariee       # une seule
 *
 * Enregistrer UN guide à la fois : en parallèle, l'aperçu ralentit et la
 * vidéo s'étire (images figées, fin coupée).
 *
 * Variables : FFMPEG (chemin ffmpeg), CHROMIUM (exécutable, sinon celui de
 * Playwright), CHROMIUM_ARGS (arguments supplémentaires), FONTSOURCE_DIR
 * (dossier `@fontsource` pour servir Plus Jakarta Sans / Inter hors ligne),
 * GUIDE_PORT (4190 par défaut), GUIDE_LOCALE (fr | en, fr par défaut),
 * GUIDE_DEBUG (journalise les durées et capture l'écran de fin).
 */
import { spawn, execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const here = resolve(fileURLToPath(new URL(".", import.meta.url)));
const app = resolve(here, "..");
const outDir = resolve(app, "public/videos");
const port = Number(process.env.GUIDE_PORT ?? 4190);
const locale = process.env.GUIDE_LOCALE === "en" ? "en" : "fr";
const BASE = `http://127.0.0.1:${port}`;
const SIZE = { width: 1280, height: 800 };
const FFMPEG = process.env.FFMPEG ?? "ffmpeg";
const only = process.argv.slice(2);

/* ------------------------------------------------------------------ */
/* Serveur d'aperçu : un processus neuf par vidéo (l'API vit en mémoire). */
/* ------------------------------------------------------------------ */
async function startPreview() {
  const child = spawn(
    "corepack",
    ["pnpm", "exec", "vite", "--config", "preview/vite.preview.mjs", "--configLoader", "runner", "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
    { cwd: app, stdio: ["ignore", "pipe", "pipe"], detached: true },
  );
  let log = "";
  child.stdout.on("data", d => { log += d; });
  child.stderr.on("data", d => { log += d; });
  const t0 = Date.now();
  while (Date.now() - t0 < 90_000) {
    if (child.exitCode !== null) throw new Error(`Aperçu arrêté :\n${log}`);
    try { if ((await fetch(`${BASE}/`)).ok) break; } catch { /* pas encore prêt */ }
    await new Promise(r => setTimeout(r, 250));
  }
  return () => { try { process.kill(-child.pid, "SIGTERM"); } catch { /* déjà arrêté */ } };
}

/* ------------------------------------------------------------------ */
/* Mise en scène : curseur visible, sous-titres, frappe humaine.        */
/* ------------------------------------------------------------------ */
const STAGE_CSS = `
  #aime-guide-cursor { position: fixed; z-index: 2147483000; width: 22px; height: 22px; pointer-events: none;
    transform: translate(-3px,-2px); transition: left .42s cubic-bezier(.2,.7,.2,1), top .42s cubic-bezier(.2,.7,.2,1); left: 640px; top: 400px; }
  #aime-guide-cursor svg { filter: drop-shadow(0 2px 4px rgba(0,0,0,.35)); }
  #aime-guide-cursor.click::after { content: ""; position: absolute; left: -9px; top: -10px; width: 40px; height: 40px; border-radius: 999px;
    border: 2px solid rgba(23,20,16,.55); animation: aime-guide-ring .45s ease-out forwards; }
  @keyframes aime-guide-ring { from { transform: scale(.35); opacity: 1 } to { transform: scale(1.1); opacity: 0 } }
  #aime-guide-caption { position: fixed; z-index: 2147483001; left: 50%; bottom: 28px; transform: translateX(-50%) translateY(12px); opacity: 0;
    max-width: 780px; padding: 12px 20px; border-radius: 999px; background: rgba(17,16,14,.88); color: #fff; font: 500 16px/1.35 "Plus Jakarta Sans", Inter, system-ui, sans-serif;
    letter-spacing: .01em; text-align: center; box-shadow: 0 12px 40px rgba(0,0,0,.35); transition: opacity .3s ease, transform .3s ease; pointer-events: none; }
  #aime-guide-caption.on { opacity: 1; transform: translateX(-50%) translateY(0); }
  #aime-guide-caption b { color: #F2C94C; font-weight: 600; }
  #aime-guide-title { position: fixed; inset: 0; z-index: 2147483002; display: grid; place-items: center; background: #171410; color: #FBFAF8;
    font-family: "Plus Jakarta Sans", Inter, system-ui, sans-serif; text-align: center; opacity: 0; transition: opacity .5s ease; pointer-events: none; }
  #aime-guide-title.on { opacity: 1; }
  #aime-guide-title .eyebrow { font-size: 12px; letter-spacing: .3em; text-transform: uppercase; opacity: .6; }
  #aime-guide-title h1 { font-size: 54px; font-weight: 600; letter-spacing: -.02em; margin: 18px 0 14px; max-width: 900px; line-height: 1.05; }
  #aime-guide-title p { font-size: 20px; opacity: .72; max-width: 640px; margin: 0; }
  html { scroll-behavior: auto !important; }
  *, *::before, *::after { caret-color: transparent; }
`;

const CURSOR_SVG = `<svg viewBox="0 0 24 24" width="22" height="22"><path d="M5 3l14 8.5-6.2 1.4L9.5 19z" fill="#fff" stroke="#171410" stroke-width="1.6" stroke-linejoin="round"/></svg>`;

async function stage(page) {
  await page.addStyleTag({ content: STAGE_CSS });
  await page.evaluate((svg) => {
    if (!document.getElementById("aime-guide-cursor")) {
      const c = document.createElement("div"); c.id = "aime-guide-cursor"; c.innerHTML = svg; document.body.appendChild(c);
      const t = document.createElement("div"); t.id = "aime-guide-caption"; document.body.appendChild(t);
      const s = document.createElement("div"); s.id = "aime-guide-title"; document.body.appendChild(s);
    }
  }, CURSOR_SVG);
}

function director(page, take = {}) {
  const sleep = ms => page.waitForTimeout(ms);
  const restage = async () => { await stage(page); };
  const moveTo = async (locator) => {
    await locator.scrollIntoViewIfNeeded();
    await sleep(120);
    const box = await locator.boundingBox();
    if (!box) throw new Error("Élément invisible");
    const x = box.x + Math.min(box.width / 2, 160), y = box.y + box.height / 2;
    await page.evaluate(([x, y]) => { const c = document.getElementById("aime-guide-cursor"); if (c) { c.style.left = `${x}px`; c.style.top = `${y}px`; } }, [x, y]);
    await page.mouse.move(x, y);
    await sleep(460);
    return { x, y };
  };
  const click = async (locator, pause = 700) => {
    await moveTo(locator);
    await page.evaluate(() => { const c = document.getElementById("aime-guide-cursor"); c?.classList.remove("click"); void c?.offsetWidth; c?.classList.add("click"); });
    await locator.click();
    await sleep(pause);
    await restage();
  };
  const type = async (locator, text, delay = 38) => {
    /* Le champ est résolu une fois : un sélecteur qui dépend de la valeur
       (input[value=…]) ne doit pas se perdre pendant qu'on la remplace. */
    const field = await locator.elementHandle();
    if (!field) throw new Error("Champ introuvable");
    await click(locator, 200);
    await field.fill("");
    await field.type(text, { delay });
    await sleep(350);
  };
  const say = async (html, hold = 2400) => {
    await restage();
    await page.evaluate((h) => { const t = document.getElementById("aime-guide-caption"); if (t) { t.innerHTML = h; t.classList.add("on"); } }, html);
    await sleep(hold);
  };
  const hush = async () => { await page.evaluate(() => document.getElementById("aime-guide-caption")?.classList.remove("on")); await sleep(350); };
  const title = async ({ eyebrow, heading, text }, hold = 2600, { keep = false } = {}) => {
    await restage();
    await page.evaluate(({ eyebrow, heading, text }) => {
      const s = document.getElementById("aime-guide-title");
      if (!s) return;
      s.innerHTML = `<div><p class="eyebrow">${eyebrow}</p><h1>${heading}</h1><p>${text}</p></div>`;
      s.classList.add("on");
    }, { eyebrow, heading, text });
    if (take.poster && !take.titleAt) {
      /* Premier écran-titre : c'est l'affiche de la vidéo, et son point de
         départ (tout ce qui précède est la page qui se peint). */
      await sleep(700);
      take.titleAt = Date.now();
      await page.screenshot({ path: take.poster, type: "jpeg", quality: 82 });
      await sleep(hold - 700);
    } else {
      await sleep(hold);
    }
    if (keep) { /* écran de sortie : reste affiché jusqu'à la fin */
      take.endedAt = Date.now();
      if (process.env.GUIDE_DEBUG) await page.screenshot({ path: `/tmp/guide-end-${Date.now()}.jpg`, type: "jpeg" });
      return;
    }
    await page.evaluate(() => document.getElementById("aime-guide-title")?.classList.remove("on"));
    await sleep(600);
  };
  const scroll = async (dy, steps = 12) => {
    for (let i = 0; i < steps; i++) { await page.mouse.wheel(0, dy / steps); await sleep(45); }
    await sleep(500);
  };
  return { sleep, moveTo, click, type, say, hush, title, scroll, restage };
}

/* ------------------------------------------------------------------ */
/* Les trois scénarios.                                                */
/* ------------------------------------------------------------------ */
const COPY = {
  fr: {
    presta: {
      title: { eyebrow: "Guide · Prestataire", heading: "Un prestataire crée son Monde", text: "Quatre questions — A, I, M, E — et le Monde s'ouvre." },
      s1: "Depuis l'espace privé, on appuie sur <b>+</b> pour commencer un Monde.",
      s2: "<b>A — Acteur</b> : qui êtes-vous ? Ici, une activité indépendante… musicien, saxophoniste.",
      s3: "<b>I — Intention</b> : ce que vous voulez rendre possible.",
      s4: "<b>M — Monde</b> : ce qui existe déjà. Une phrase suffit, AIME en déduit des faits — à confirmer, jamais imposés.",
      s5: "<b>E — Écosystème</b> : avec qui ce Monde existe.",
      s6: "Le Monde s'ouvre : ce qu'AIME a compris, ce qu'il reste à vérifier, et des modules <b>proposés</b> — vous décidez.",
      s7: "Le bouton <b>+</b> ouvre tout : dossiers, outils, et l'agent AIME pour poser une question.",
      end: { eyebrow: "byaime.fr", heading: "Votre Monde, en quatre questions.", text: "Gratuit · 2 minutes · Sans carte bancaire" },
    },
    mariee: {
      title: { eyebrow: "Guide · Mariée", heading: "Une mariée crée son Monde Mariage", text: "Le mariage est le premier vertical : un couple, une Timeline." },
      s1: "On appuie sur <b>+</b> : « Commencer un Monde ».",
      s2: "<b>A — Acteur</b> : un couple. Le mariage reste le premier vertical.",
      s3: "<b>I</b>, <b>M</b>, <b>E</b> : quelques choix, ou « je ne sais pas encore ». Rien n'est verrouillé.",
      s4: "Le Monde est ouvert. Depuis <b>+</b> → « Modifier l'ouverture », on lui donne son nom, sa date, son lieu.",
      s5: "<b>Léa &amp; Hugo</b>, le 14 août 2027, à Lille. Le compte à rebours démarre.",
      s6: "Trois temps : <b>Avant</b> on prépare, <b>Jour J</b> on exécute, <b>Après</b> on garde.",
      s7: "Les <b>Invités</b> : chaque personne reçoit son propre lien RSVP — sans compte, sans accès au Monde.",
      end: { eyebrow: "byaime.fr", heading: "Tout votre mariage, dans un seul espace privé.", text: "Gratuit · 2 minutes · Sans carte bancaire" },
    },
    invite: {
      title: { eyebrow: "Guide · Invité", heading: "Un invité rejoint un Monde Mariage", text: "Une carte, une seule fois. Puis une invitation." },
      s1: "Camille a reçu un lien RSVP. Elle peut répondre sans compte…",
      s2: "…ou <b>associer l'invitation à sa carte</b> BYAIME, pour la retrouver dans son espace.",
      s3: "<b>Ma carte</b> : prénom, nom, ville. Une seule fois — elle suit d'un mariage à l'autre.",
      s4: "L'invitation est vérifiée : <b>Léa &amp; Hugo</b>. Camille confirme qu'elle lui est bien destinée.",
      s5: "<b>Votre rôle</b> dans ce mariage — un choix qui concerne ce mariage, pas la carte.",
      s6: "<b>Votre présence</b> : RSVP, moments, régime. Ces réponses restent dans ce mariage, jamais sur la fiche publique.",
      s7: "C'est fait : la carte est prête, le mariage de Léa &amp; Hugo est rejoint.",
      end: { eyebrow: "byaime.fr", heading: "Je me présente une fois. BYAIME sait déjà le reste.", text: "Gratuit · 2 minutes · Sans carte bancaire" },
    },
  },
};
const T = COPY[locale] ?? COPY.fr;

/*
 * Polices : le site charge Plus Jakarta Sans et Inter depuis Google Fonts. Sur
 * une machine sans accès réseau, on sert les mêmes fichiers depuis
 * `@fontsource/*` (FONTSOURCE_DIR, ou node_modules/@fontsource s'il existe)
 * afin que la vidéo montre le vrai rendu, pas une police de repli.
 */
const fontsDir = [process.env.FONTSOURCE_DIR, resolve(app, "node_modules/@fontsource"), resolve(app, "../../node_modules/@fontsource")]
  .filter(Boolean).find(dir => existsSync(join(dir, "plus-jakarta-sans")));
async function serveLocalFonts(ctx) {
  if (!fontsDir) return;
  const face = (family, file, weight) =>
    `@font-face{font-family:'${family}';font-style:normal;font-weight:${weight};font-display:swap;src:url(https://fonts.gstatic.com/aime-local/${file}) format('woff2');}`;
  const css = [
    ...[300, 400, 500, 600, 700].map(w => face("Plus Jakarta Sans", `plus-jakarta-sans/files/plus-jakarta-sans-latin-${w}-normal.woff2`, w)),
    ...[300, 400, 500].map(w => face("Inter", `inter/files/inter-latin-${w}-normal.woff2`, w)),
  ].join("\n");
  await ctx.route("https://fonts.googleapis.com/**", route => route.fulfill({ contentType: "text/css", body: css }));
  await ctx.route("https://fonts.gstatic.com/aime-local/**", route => {
    const rel = new URL(route.request().url()).pathname.replace("/aime-local/", "");
    const file = join(fontsDir, rel);
    return existsSync(file) ? route.fulfill({ path: file, contentType: "font/woff2" }) : route.fulfill({ status: 404 });
  });
}

async function newPage(ctx) {
  const page = await ctx.newPage();
  page.on("pageerror", e => console.warn("  [page]", e.message));
  await page.addInitScript(() => { try { localStorage.setItem("aime-preview-session", "1"); localStorage.setItem("aime-locale", "fr"); } catch { /* ok */ } });
  return page;
}

const zeroDiv = (page, letter) => page.locator(`div[data-testid=zero-step-${letter}]`);

async function scenarioPrestataire(ctx, take) {
  const t = T.presta;
  const page = await newPage(ctx);
  const d = director(page, take);
  await page.goto(`${BASE}/user-portal`, { waitUntil: "networkidle" });
  await stage(page);
  await d.title(t.title);
  await d.say(t.s1);
  await d.click(page.getByTestId("zero-plus"));
  await d.say(t.s2, 1800);
  await d.click(page.getByTestId("actor-independent"));
  await d.click(page.locator("[data-testid='actor-sub-artiste---musicien']"));
  await d.click(page.locator("[data-testid='actor-detail-saxophoniste']"), 1200);
  await d.click(page.getByTestId("zero-next"));
  await d.say(t.s3, 1600);
  await d.click(page.locator("[data-testid='intention-trouver-plus-de-prestations']"), 350);
  await d.click(page.locator("[data-testid='intention-pr-senter-son-univers']"), 350);
  await d.click(page.locator("[data-testid='intention-organiser-ses-prochaines-dates']"), 900);
  await d.click(page.getByTestId("zero-next"));
  await d.say(t.s4, 1800);
  await d.click(page.locator("[data-testid='situation-je-suis-auto-entrepreneur']"), 350);
  await d.click(page.locator("[data-testid='situation-j-ai-d-j--des-prestations']"), 350);
  await d.type(page.getByTestId("situation-free"), "Saxophoniste auto-entrepreneur, je joue dans des mariages et je donne des cours.", 22);
  await d.click(page.getByTestId("situation-analyze"), 500);
  await d.scroll(300, 8);
  await d.sleep(1600);
  await d.click(page.getByTestId("zero-next"));
  await d.say(t.s5, 1500);
  await d.click(page.locator("[data-testid='ecosystem-lieux']"), 300);
  await d.click(page.locator("[data-testid='ecosystem-bookers']"), 300);
  await d.click(page.locator("[data-testid='ecosystem--l-ves']"), 800);
  await d.hush();
  await d.click(page.getByTestId("zero-next"), 2600);
  await d.say(t.s6, 2000);
  await d.scroll(640, 18);
  await d.sleep(1800);
  await d.scroll(620, 18);
  await d.sleep(600);
  await d.click(page.getByTestId("module-prestations-accept"), 1400);
  await d.hush();
  await page.evaluate(() => window.scrollTo({ top: 0 }));
  await d.sleep(600);
  await d.say(t.s7, 1500);
  await d.click(page.getByTestId("orb-button"), 1200);
  await d.click(page.getByTestId("aime-panel-item-ask"), 900);
  await d.click(page.getByTestId("assistant-suggest-2"), 2400);
  await d.hush();
  await d.title(t.end, 8000, { keep: true });
}

async function scenarioMariee(ctx, take) {
  const t = T.mariee;
  const page = await newPage(ctx);
  const d = director(page, take);
  await page.goto(`${BASE}/user-portal`, { waitUntil: "networkidle" });
  await stage(page);
  await d.title(t.title);
  await d.say(t.s1);
  await d.click(page.getByTestId("zero-plus"));
  await d.say(t.s2, 1600);
  await d.click(page.getByTestId("actor-couple"), 1200);
  await d.click(page.getByTestId("zero-next"));
  await d.say(t.s3, 1600);
  await d.click(page.locator("[data-testid='intention-pr-senter-mon-univers']"), 700);
  await d.click(page.getByTestId("zero-next"));
  await d.click(page.locator("[data-testid='situation-je-pars-de-z-ro']"), 700);
  await d.click(page.getByTestId("zero-next"));
  await d.click(page.locator("[data-testid='ecosystem-entourage']"), 700);
  await d.hush();
  await d.click(page.getByTestId("zero-next"), 2200);
  await d.say(t.s4, 2000);
  await d.click(page.getByTestId("orb-button"), 900);
  await d.click(page.getByTestId("aime-panel-item-hero-editor"), 900);
  const ed = page.getByTestId("portal-hero-editor");
  await d.type(ed.locator("input[name=title]"), "Léa & Hugo");
  await d.type(ed.locator("input[name=subtitle]"), "Un mariage champêtre, près de Lille", 24);
  await d.type(ed.locator("input[name=city]"), "Lille");
  await d.type(ed.locator("input[name=venue]"), "Domaine des Ormes", 30);
  await d.click(ed.locator("input[name=date]"), 200);
  await ed.locator("input[name=date]").fill("2027-08-14");
  await d.sleep(500);
  await d.click(ed.getByRole("button", { name: /Enregistrer l’ouverture|Save the opening/ }), 1200);
  await d.hush();
  await d.click(page.getByTestId("aime-panel-close"), 900);
  await d.say(t.s5, 1800);
  await d.click(page.getByTestId("world-phase-avant"), 1600);
  await d.say(t.s6, 1200);
  await d.scroll(520, 14);
  await d.sleep(1400);
  await page.evaluate(() => window.scrollTo({ top: 0 }));
  await d.sleep(500);
  await d.hush();
  await d.say(t.s7, 1400);
  await d.click(page.getByTestId("orb-button"), 900);
  await d.click(page.getByTestId("aime-panel-item-folder:guests"), 1000);
  const add = page.getByRole("button", { name: /^(Ajouter|Add)$/ });
  await d.click(add, 500);
  await d.type(page.locator("input[value='Nouvel invité'], input[value='New guest']").first(), "Camille Martin", 40);
  await d.click(add, 500);
  await d.type(page.locator("input[value='Nouvel invité'], input[value='New guest']").first(), "Thomas Leroy", 40);
  await d.click(page.getByRole("button", { name: /Créer et copier le lien RSVP|Create and copy the RSVP link/ }).first(), 1600);
  await d.hush();
  await d.title(t.end, 8000, { keep: true });
}

async function scenarioInvite(ctx, take) {
  const t = T.invite;
  /* Le mariage de Léa & Hugo existe déjà dans l'API en mémoire de l'aperçu. */
  const created = await ctx.request.post(`${BASE}/api/projects`, {
    data: {
      title: "Léa & Hugo",
      data: {
        schemaVersion: 2, title: "Léa & Hugo", universe: "Mariage",
        pivot: { value: Date.parse("2027-08-14T14:00:00+02:00"), confidence: "confirme" },
        timeline: [], tasks: [], guests: [], providers: [], payments: [],
        city: { value: "Lille", confidence: "confirme" }, venue: { value: "Domaine des Ormes", confidence: "confirme" },
      },
    },
  });
  const wedding = await created.json();
  const token = "3f2b1c4e-8d7a-4b6f-9c1d-2e5a7b9c0d1f";
  const page = await newPage(ctx);
  const d = director(page, take);
  /* Les deux routes RSVP publiques ne sont pas simulées par l'aperçu : elles
     le sont ici, avec le même contrat que le serveur (openapi.yaml). */
  const portal = {
    projectTitle: "Léa & Hugo", phase: "avant",
    guest: { name: "Camille", tableName: "Table des cousins" },
    program: [
      { id: "p1", time: "2027-08-14T14:30:00+02:00", title: "Cérémonie laïque", detail: "Sous les tilleuls", location: "Domaine des Ormes, Lille" },
      { id: "p2", time: "2027-08-14T16:30:00+02:00", title: "Cocktail", location: "Terrasse" },
      { id: "p3", time: "2027-08-14T20:00:00+02:00", title: "Dîner", location: "Orangerie" },
    ],
    practicalInfo: { city: "Lille", venue: "Domaine des Ormes", parking: "Parking gratuit sur place", accessibility: "Accès PMR" },
    mediaPolicy: { enabled: true, maxSize: 20_000_000 }, songRequests: [], contributions: [], afterContent: [],
  };
  await page.route(`**/api/rsvp/${token}`, route => route.fulfill({ json: portal }));
  await page.route(`**/api/rsvp/${token}/claim`, route => route.request().method() === "POST"
    ? route.fulfill({ json: { projectId: wedding.id } })
    : route.fulfill({ json: { projectId: wedding.id, projectTitle: "Léa & Hugo", guestName: "Camille Martin", alreadyClaimed: false } }));

  await page.goto(`${BASE}/rsvp/${token}`, { waitUntil: "networkidle" });
  await stage(page);
  await d.title(t.title);
  await d.say(t.s1, 2000);
  await d.scroll(260, 8);
  await d.sleep(900);
  await page.evaluate(() => window.scrollTo({ top: 0 }));
  await d.say(t.s2, 1800);
  await d.moveTo(page.getByRole("link", { name: /Associer cette invitation à ma carte/ }));
  await d.sleep(500);
  await d.hush();
  await page.goto(`${BASE}/ma-carte?invitation=${token}`, { waitUntil: "networkidle" });
  await stage(page);
  await d.say(t.s3, 1600);
  await d.type(page.getByLabel(/^(Prénom|First name)$/), "Camille");
  await d.type(page.getByLabel(/^(Nom|Last name)$/), "Martin");
  await d.type(page.getByLabel(/^(Ville|City)$/), "Lille");
  await d.hush();
  await d.click(page.getByRole("button", { name: /Enregistrer ma carte|Save my card/ }), 1400);
  await d.say(t.s4, 1600);
  await d.click(page.getByRole("button", { name: /Vérifier mon invitation/ }), 1000);
  await d.click(page.getByTestId("rsvp-claim-confirm").locator("input"), 600);
  await d.hush();
  await d.click(page.getByRole("button", { name: /Associer cette invitation à ma carte/ }), 1600);
  await d.say(t.s5, 1600);
  await d.click(page.getByTestId("roles-picker-trigger"), 600);
  await d.click(page.getByTestId("roles-picker-option-Invité"), 300);
  await d.click(page.getByTestId("roles-picker-option-Ami"), 500);
  await page.keyboard.press("Escape");
  await d.sleep(600);
  await d.hush();
  await d.click(page.getByRole("button", { name: /^(Continuer|Continue)$/ }), 1200);
  await d.say(t.s6, 1600);
  const rsvp = page.locator("select").first();
  await d.click(rsvp, 200);
  await rsvp.selectOption({ index: 1 });
  await d.sleep(400);
  for (const label of ["Cérémonie", "Cocktail", "Dîner", "Soirée"]) {
    await d.click(page.getByLabel(label, { exact: true }), 200);
  }
  await d.type(page.getByLabel(/Contraintes alimentaires/), "Végétarienne", 40);
  await d.hush();
  await d.click(page.getByRole("button", { name: /Valider ma participation/ }), 1800);
  await d.say(t.s7, 1800);
  await d.scroll(420, 12);
  await d.sleep(1800);
  await d.hush();
  await d.title(t.end, 8000, { keep: true });
}

const SCENARIOS = {
  prestataire: scenarioPrestataire,
  mariee: scenarioMariee,
  invite: scenarioInvite,
};

/* ------------------------------------------------------------------ */
/* Enregistrement + encodage.                                          */
/* ------------------------------------------------------------------ */
function durationOf(file) {
  try { execFileSync(FFMPEG, ["-i", file], { stdio: "pipe" }); } catch (e) {
    const m = String(e.stderr).match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
    if (m) return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
  }
  return 0;
}

async function record(name, run) {
  const work = join(tmpdir(), `aime-guide-${name}-${Date.now()}`);
  mkdirSync(work, { recursive: true });
  mkdirSync(outDir, { recursive: true });
  const mp4 = join(outDir, `guide-${name}.mp4`);
  const poster = join(outDir, `guide-${name}.jpg`);
  const take = { poster, startedAt: 0, titleAt: 0 };
  const stop = await startPreview();
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM || undefined,
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--font-render-hinting=none", "--hide-scrollbars", "--mute-audio", ...(process.env.CHROMIUM_ARGS?.split(" ").filter(Boolean) ?? [])],
  });
  try {
    const ctx = await browser.newContext({
      viewport: SIZE, deviceScaleFactor: 1, locale: "fr-FR", timezoneId: "Europe/Paris",
      recordVideo: { dir: work, size: SIZE }, reducedMotion: "no-preference",
    });
    await serveLocalFonts(ctx);
    take.startedAt = Date.now();
    await run(ctx, take);
    await ctx.close();
  } finally {
    await browser.close();
    stop();
  }
  const webm = readdirSync(work).filter(f => f.endsWith(".webm")).map(f => join(work, f)).sort((a, b) => statSync(b).size - statSync(a).size)[0];
  if (!webm) throw new Error("Aucune vidéo produite");
  /* MP4 H.264 (compatibilité). Le début est coupé jusqu'à l'écran-titre :
     avant, c'est la page qui se peint, un écran blanc sans intérêt. La fin
     n'est pas touchée — la durée déclarée par le WebM de Playwright est
     approximative — et la dernière image est déjà l'écran-titre de sortie. */
  const start = take.titleAt ? Math.max(0, (take.titleAt - take.startedAt) / 1000 - 0.9) : 1.0;
  if (process.env.GUIDE_DEBUG) console.log(`webm ${durationOf(webm).toFixed(1)} s · scénario ${((take.endedAt - take.startedAt) / 1000).toFixed(1)} s · départ ${start.toFixed(1)} s`);
  execFileSync(FFMPEG, ["-y", "-loglevel", "error", "-ss", start.toFixed(2), "-i", webm,
    "-vf", "fps=30,scale=1280:-2:flags=lanczos,format=yuv420p", "-c:v", "libx264", "-preset", "slow", "-crf", "27", "-movflags", "+faststart", "-an", mp4]);
  rmSync(work, { recursive: true, force: true });
  console.log(`✓ guide-${name}.mp4 — ${(statSync(mp4).size / 1024 / 1024).toFixed(1)} Mo · ${durationOf(mp4).toFixed(0)} s`);
}

const wanted = Object.keys(SCENARIOS).filter(k => !only.length || only.includes(k));
for (const name of wanted) {
  console.log(`▶ ${name}`);
  await record(name, SCENARIOS[name]);
}
