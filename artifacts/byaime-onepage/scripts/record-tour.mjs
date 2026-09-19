/*
 * Tourne la visite guidée de l'application — huit chapitres, une voix.
 *
 * Ce n'est pas une animation : le script lance l'aperçu local
 * (`preview/vite.preview.mjs`, Clerk simulé et API en mémoire), pilote un
 * Chromium headless avec Playwright sur le VRAI produit, et enregistre
 * l'écran. La voix est ajoutée à l'encodage, chapitre par chapitre, à partir
 * des fichiers `tour/audio/<chapitre>.mp3` — c'est leur durée qui cadence les
 * gestes (voir `tour-script.mjs`), donc l'image et la phrase tombent ensemble.
 *
 * Un seul plan-séquence : les chapitres partagent le même Monde, créé à
 * l'écran. L'encodage coupe ce plan en huit fichiers, puis recolle les mêmes
 * fichiers en un film complet — pas de seconde monture, donc aucune divergence
 * possible entre le film et ses chapitres.
 *
 * Lancement, depuis artifacts/byaime-onepage (Playwright et ffmpeg requis) :
 *   corepack pnpm run record:tour              # les huit chapitres, à la suite
 *   node scripts/record-tour.mjs --voice       # imprime le texte à dicter
 *   node scripts/record-tour.mjs --dry         # joue la scène, sans encoder
 *   node scripts/record-tour.mjs --dev         # tourne sur le serveur de dev
 *   node scripts/record-tour.mjs --probe       # après chaque geste, imprime l'écran
 *   node scripts/record-tour.mjs --skip-build  # sert le build déjà produit
 *   node scripts/record-tour.mjs timeline invites   # ne joue que ces chapitres
 *
 * La voix n'est pas fabriquée ici : chaque chapitre a son texte dans
 * `tour-script.mjs`, dicté à une voix de synthèse (fr-FR, narration) et posé
 * dans `tour/audio/`. Sans le fichier d'un chapitre, le script le dit.
 *
 * Variables : FFMPEG (chemin ffmpeg), CHROMIUM (exécutable, sinon celui de
 * Playwright), CHROMIUM_ARGS, FONTSOURCE_DIR (dossier `@fontsource` pour
 * servir Plus Jakarta Sans / Inter hors ligne), GUIDE_PORT (4190),
 * TOUR_KEEP (conserve le WebM brut), TOUR_DEBUG (journalise les durées).
 */
import { spawn, execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { CHAPTERS, mockMissingRoutes } from "./tour-script.mjs";

const here = resolve(fileURLToPath(new URL(".", import.meta.url)));
const app = resolve(here, "..");
const audioDir = resolve(app, "tour/audio");
const outDir = resolve(app, "public/videos");
/* Le port de tournage : libre au moment du lancement — une reprise après un
   essai interrompu ne doit pas échouer sur un port resté pris. */
let port = Number(process.env.GUIDE_PORT ?? 4190);
let BASE = `http://127.0.0.1:${port}`;

async function freePort(from) {
  const net = await import("node:net");
  for (const candidate of [from, from + 1, from + 2, from + 3, from + 4]) {
    const free = await new Promise(resolve => {
      const probe = new net.Server();
      probe.once("error", () => resolve(false));
      probe.listen(candidate, "127.0.0.1", () => probe.close(() => resolve(true)));
    });
    if (free) return candidate;
  }
  return from;
}
const SIZE = { width: 1280, height: 800 };
/*
 * 22 images-par-seconde et un CRF haut : la visite montre une interface, pas
 * un film — le mouvement y est rare, la lisibilité du texte est tout. Ce
 * réglage tient les huit chapitres sous quelques mégaoctets chacun, ce que
 * pèse déjà une seule des boucles décoratives de l'accueil.
 */
const FPS = Number(process.env.TOUR_FPS ?? 22);
const CRF = Number(process.env.TOUR_CRF ?? 30);
/* Marge autour de la voix : le temps que l'écran-titre se pose, et que la
   dernière image reste tenue avant la coupe. */
const LEAD = 1.1;
const TAIL = 1.6;
const MIN_HOLD = 0.6;
const TITLE_HOLD = 2300;
const END_HOLD = 5000;
const FFMPEG = process.env.FFMPEG ?? "ffmpeg";
const DEBUG = Boolean(process.env.TOUR_DEBUG);
const args = process.argv.slice(2);
const flags = new Set(args.filter(arg => arg.startsWith("--")));
const only = args.filter(arg => !arg.startsWith("--"));

/* ------------------------------------------------------------------ */
/* Voix : le texte à dicter, et la durée de chaque chapitre             */
/* ------------------------------------------------------------------ */

export function chapterText(chapter) {
  return chapter.steps.map(step => step.text).join(" ");
}

if (flags.has("--voice")) {
  for (const chapter of CHAPTERS) {
    console.log(`\n### tour/audio/${chapter.id}.mp3 — ${chapter.label}`);
    console.log(chapterText(chapter));
  }
  process.exit(0);
}

/** La durée d'un média, en secondes, lue dans le bandeau `Duration:` de ffmpeg. */
function durationOf(file) {
  try {
    execFileSync(FFMPEG, ["-hide_banner", "-i", file], { stdio: "pipe" });
  } catch (error) {
    const match = String(error.stderr).match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
    if (match) return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
  }
  return 0;
}

function clock(seconds) {
  const whole = Math.round(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

const VOICES = CHAPTERS.map(chapter => {
  const file = join(audioDir, `${chapter.id}.mp3`);
  if (!existsSync(file) && !flags.has("--dry")) {
    throw new Error(
      `Voix manquante : ${file}\n`
      + "Dictez le texte du chapitre (`node scripts/record-tour.mjs --voice`) et posez-le sous ce nom.",
    );
  }
  const seconds = existsSync(file) ? durationOf(file) : 0;
  return { id: chapter.id, file, seconds: seconds || (flags.has("--dry") ? 12 : 0) };
});

/* ------------------------------------------------------------------ */
/* Aperçu local : un processus neuf pour tout le plan-séquence          */
/* ------------------------------------------------------------------ */

/*
 * Le tournage se fait sur le BUILD de l'aperçu, pas sur le serveur de dev :
 * sous un transformateur de modules, chaque navigation coûtait plusieurs
 * secondes et le geste filmé perdait son rythme. `vite build --config
 * preview/vite.preview.mjs` produit la même application (Clerk simulé, API en
 * mémoire) et `vite preview` la sert — `configurePreviewServer` du plugin
 * `preview/fake-api.mjs` répond aux routes du store.
 *
 * `--dev` remet le serveur de développement (utile pour tourner une branche
 * en cours de modification, au prix du rythme).
 */
async function startPreview() {
  port = await freePort(port);
  BASE = `http://127.0.0.1:${port}`;
  const config = ["--config", "preview/vite.preview.mjs", "--configLoader", "runner"];
  if (!flags.has("--dev") && !flags.has("--skip-build")) {
    console.log("· build de l'aperçu (vite build, config preview)…");
    execFileSync("corepack", ["pnpm", "exec", "vite", "build", ...config], { cwd: app, stdio: "ignore" });
  }
  const mode = flags.has("--dev") ? "dev" : "preview";
  const child = spawn(
    "corepack",
    ["pnpm", "exec", "vite", mode, ...config, "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
    { cwd: app, stdio: ["ignore", "pipe", "pipe"], detached: true },
  );
  let log = "";
  child.stdout.on("data", data => { log += data; });
  child.stderr.on("data", data => { log += data; });
  const t0 = Date.now();
  while (Date.now() - t0 < 120_000) {
    if (child.exitCode !== null) throw new Error(`Aperçu arrêté :\n${log}`);
    try { if ((await fetch(`${BASE}/`)).ok) break; } catch { /* pas encore prêt */ }
    await new Promise(done => setTimeout(done, 250));
  }
  return () => { try { process.kill(-child.pid, "SIGTERM"); } catch { /* déjà arrêté */ } };
}

/* ------------------------------------------------------------------ */
/* Mise en scène : curseur, sous-titres, écrans-titres                  */
/* ------------------------------------------------------------------ */

const STAGE_CSS = `
  #aime-tour-cursor { position: fixed; z-index: 2147483000; width: 22px; height: 22px; pointer-events: none;
    transform: translate(-3px,-2px); transition: left .34s cubic-bezier(.2,.7,.2,1), top .34s cubic-bezier(.2,.7,.2,1); left: 640px; top: 400px; }
  #aime-tour-cursor svg { filter: drop-shadow(0 2px 4px rgba(0,0,0,.35)); }
  #aime-tour-cursor.click::after { content: ""; position: absolute; left: -9px; top: -10px; width: 40px; height: 40px; border-radius: 999px;
    border: 2px solid rgba(23,20,16,.55); animation: aime-tour-ring .45s ease-out forwards; }
  @keyframes aime-tour-ring { from { transform: scale(.35); opacity: 1 } to { transform: scale(1.1); opacity: 0 } }
  #aime-tour-caption { position: fixed; z-index: 2147483001; left: 50%; bottom: 26px; transform: translateX(-50%) translateY(12px); opacity: 0;
    max-width: 860px; padding: 13px 22px; border-radius: 999px; background: rgba(17,16,14,.9); color: #fff;
    font: 500 16.5px/1.4 "Plus Jakarta Sans", Inter, system-ui, sans-serif; letter-spacing: .01em; text-align: center;
    box-shadow: 0 12px 40px rgba(0,0,0,.35); transition: opacity .28s ease, transform .28s ease; pointer-events: none; }
  #aime-tour-caption.on { opacity: 1; transform: translateX(-50%) translateY(0); }
  #aime-tour-caption b { color: #F2C94C; font-weight: 600; }
  #aime-tour-title { position: fixed; inset: 0; z-index: 2147483002; display: grid; place-items: center; background: #171410; color: #FBFAF8;
    font-family: "Plus Jakarta Sans", Inter, system-ui, sans-serif; text-align: center; opacity: 0; transition: opacity .5s ease; pointer-events: none; }
  #aime-tour-title.on { opacity: 1; }
  #aime-tour-title .eyebrow { font-size: 12px; letter-spacing: .3em; text-transform: uppercase; opacity: .6; }
  #aime-tour-title h1 { font-size: 52px; font-weight: 600; letter-spacing: -.02em; margin: 18px 0 14px; max-width: 920px; line-height: 1.05; }
  #aime-tour-title p { font-size: 19px; opacity: .72; max-width: 660px; margin: 0; }
  html { scroll-behavior: auto !important; }
  *, *::before, *::after { caret-color: transparent; }
`;

const CURSOR_SVG = `<svg viewBox="0 0 24 24" width="22" height="22"><path d="M5 3l14 8.5-6.2 1.4L9.5 19z" fill="#fff" stroke="#171410" stroke-width="1.6" stroke-linejoin="round"/></svg>`;

/**
 * Les calques de la prise sont posés par un `addInitScript` : une injection par
 * page, à chaque navigation. Les reposer après chaque geste accumulait des
 * feuilles de style et finissait par diviser le rythme de la vidéo par dix.
 *
 * Les clics sont forcés, eux, parce que le Monde anime en continu (orbe,
 * pulsations) : l'attente de stabilité de Playwright ferait patienter six
 * secondes un geste qui en demande un. La visibilité est donc vérifiée à la
 * main, avant le clic.
 */
function installStage({ cssText, svg }) {
  const inject = () => {
    if (!document.documentElement) return;
    if (!document.getElementById("aime-tour-style")) {
      const style = document.createElement("style");
      style.id = "aime-tour-style";
      style.textContent = cssText;
      document.documentElement.appendChild(style);
    }
    if (!document.body) return;
    const layer = (id, inner) => {
      if (document.getElementById(id)) return document.getElementById(id);
      const node = document.createElement("div");
      node.id = id;
      node.innerHTML = inner;
      document.body.appendChild(node);
      return node;
    };
    layer("aime-tour-cursor", svg);
    layer("aime-tour-caption", "");
    layer("aime-tour-title", "");
  };
  inject();
  document.addEventListener("DOMContentLoaded", inject);
  window.__aimeTour = {
    move: (x, y) => { const node = document.getElementById("aime-tour-cursor"); if (node) { node.style.left = `${x}px`; node.style.top = `${y}px`; } },
    pulse: () => { const node = document.getElementById("aime-tour-cursor"); if (!node) return; node.classList.remove("click"); void node.offsetWidth; node.classList.add("click"); },
    caption: (html, on) => { const node = document.getElementById("aime-tour-caption"); if (!node) return; if (on) { node.innerHTML = html; node.classList.add("on"); } else node.classList.remove("on"); },
    title: html => { const node = document.getElementById("aime-tour-title"); if (!node) return; node.innerHTML = html; node.classList.add("on"); },
    hideTitle: () => document.getElementById("aime-tour-title")?.classList.remove("on"),
  };
}

/**
 * Le metteur en scène : les gestes du visiteur. Chaque méthode est tolérante —
 * un contrôle absent est signalé au rapport, il n'arrête pas la prise.
 */
function director(page, report) {
  const sleep = ms => page.waitForTimeout(ms);

  /*
   * Un mot nu est un `data-testid` ; tout le reste est un sélecteur CSS. Sans
   * cette distinction, `input[placeholder="Régime"]` était cherché comme un
   * testid — et la scène passait à côté d'un champ pourtant à l'écran.
   */
  const locatorOf = target =>
    typeof target === "string"
      ? (/^[a-zA-Z0-9:_-]+$/.test(target) ? page.getByTestId(target).first() : page.locator(target).first())
      : target;

  /*
   * Deux temps d'attente, et un seul clic.
   *
   * `attached` d'abord : une étape d'assistant monte pendant qu'une analyse
   * tourne, et l'élément existe déjà quelques centaines de millisecondes avant
   * d'être peint. `visible` ensuite, pour ne jamais filmer un clic dans le vide.
   *
   * Un clic, pas deux : déplacer la souris puis cliquerPlaywright par-dessus
   * un `mouse.down/up` manuel ferait deux gestes — dans un assistant à étapes,
   * le second atterrit sur l'écran suivant. `force` évite l'attente de
   * stabilité, qui n'aboutit jamais ici où une respiration anime le fond.
   */
  /*
   * Une cible peut être attachée sans être peinte : un dossier du Monde roule
   * dans son propre conteneur, et une ligne hors champ y vaut zéro pixel. On
   * fait donc défiler avant de juger, deux fois plutôt quune.
   */
  const reveal = async locator => {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      if (await locator.isVisible().catch(() => false)) return true;
      await locator.scrollIntoViewIfNeeded({ timeout: 2000 }).catch(() => {
        locator.evaluate(node => node.scrollIntoView({ block: "center", inline: "nearest" })).catch(() => {});
      });
      await sleep(260);
    }
    return locator.isVisible().catch(() => false);
  };

  const moveTo = async target => {
    const locator = locatorOf(target);
    const attached = await locator.waitFor({ state: "attached", timeout: 6000 }).then(() => true, () => false);
    if (!attached) { report.missing.push(String(target ?? "contrôle")); return null; }
    const found = await reveal(locator);
    if (!found) { report.missing.push(`cible ${String(target ?? "")} non peinte`); return null; }
    const box = await locator.boundingBox().catch(() => null);
    if (!box) { report.missing.push(`cible ${String(target ?? "")} sans emprise`); return null; }
    const x = box.x + Math.min(box.width / 2, 170);
    const y = box.y + box.height / 2;
    await page.evaluate(([px, py]) => window.__aimeTour?.move(px, py), [x, y]).catch(() => {});
    await page.mouse.move(x, y).catch(() => {});
    await sleep(280);
    return { x, y };
  };

  const tap = async (target, pause = 520) => {
    const point = await moveTo(target);
    if (!point) return false;
    await page.evaluate(() => window.__aimeTour?.pulse()).catch(() => {});
    /*
     * Le clic ordinaire d'abord : il attend que la cible soit stable et
     * réellement atteignable, ce qui est le cas de presque tous les boutons de
     * l'application. `force` ne sert que de second recours, pour les cibles
     * posées sur un fond qui respire en continu — où l'attente n'aboutirait pas.
     */
    const ok = await locatorOf(target).click({ timeout: 2500 }).then(() => true, () => false)
      || await locatorOf(target).click({ force: true, timeout: 2500 }).then(() => true, () => false);
    if (!ok) report.missing.push(`clic ${String(target ?? "")}`);
    await sleep(pause);
    return ok;
  };

  const type = async (target, text, delay = 26) => {
    const locator = locatorOf(target);
    if (!(await locator.waitFor({ state: "visible", timeout: 4500 }).then(() => true, () => false))) {
      report.missing.push(`saisie ${String(target ?? "")}`);
      return false;
    }
    /* Un champ contrôlé ne se vide pas par `node.value = ""` : React le
       repeindrait. On sélectionne la ligne et on tape par-dessus. */
    await tap(locator, 140);
    await locator.press("Control+A").catch(() => {});
    await page.keyboard.type(String(text), { delay }).catch(() => {});
    await page.keyboard.press("Tab").catch(() => {});
    await sleep(200);
    return true;
  };

  const openPanelOnce = async () => {
    const panel = page.getByTestId("aime-panel");
    for (let attempt = 0; attempt < 2; attempt += 1) {
      if (await panel.isVisible().catch(() => false)) return true;
      await tap('[data-testid="orb-button"]', 900);
      if (await panel.waitFor({ state: "visible", timeout: 4000 }).then(() => true, () => false)) return true;
      await page.keyboard.press("Escape").catch(() => {});
      await sleep(500);
    }
    report.missing.push("panneau du Monde");
    return false;
  };

  return {
    page,
    base: BASE,
    sleep,
    tap,
    tapText: (name, pause) => tap(page.getByRole("button", { name: typeof name === "string" ? new RegExp(name, "i") : name }).first(), pause),
    /** Un clic sur le premier bouton visible portant ce libellé : quand
        l'étiquette est unique à l'écran, le testid n'est pas nécessaire. */
    tapTextLike: async (text, pause = 900) => {
      const buttons = page.getByRole("button", { name: text });
      const count = await buttons.count().catch(() => 0);
      for (let index = 0; index < count; index += 1) {
        if (await buttons.nth(index).isVisible().catch(() => false)) return tap(buttons.nth(index), pause);
      }
      report.missing.push(`bouton ${String(text)}`);
      return false;
    },
    tapTestIdStartingWith: (prefix, pause) => tap(page.locator(`[data-testid^="${prefix}"]`).first(), pause),
    /**
     * Un bouton exact, cherché DANS une zone : le dossier du Monde est posé sur
     * la Timeline, et « Ajouter » y côtoie « Ajouter un Moment ». Une recherche
     * par sous-chaîne clique le mauvais bouton — sous la voile, donc rien.
     */
    tapIn: async (scopeTestId, name, pause = 1200) => {
      const scope = page.getByTestId(scopeTestId);
      const locator = (typeof name === "string" ? scope.getByRole("button", { name, exact: true }) : scope.getByRole("button", { name })).first();
      if (!(await locator.waitFor({ state: "visible", timeout: 4500 }).then(() => true, () => false))) {
        report.missing.push(`bouton ${String(name)} dans ${scopeTestId}`);
        return false;
      }
      return tap(locator, pause);
    },
    /**
     * Le panneau du Monde est un commutateur : le cliquer quand il est déjà
     * ouvert le fermerait, et le geste suivant atterrit une écran trop tôt.
     * On le ferme donc silencieusement s'il est ouvert, puis on l'ouvre.
     */
    /**
     * Le dossier demandé (Invités, Prestataires, Tâches) à l'écran. Le panneau
     * se referme sur bien des actions — une saisie, une vue d'ensemble : on le
     * rouvre plutôt que de cliquer dans une page qui n'existe plus.
     */
    dossier: async (tab, folder) => {
      const panel = page.getByTestId("pilotage-panel");
      if (!(await panel.isVisible().catch(() => false))) {
        await openPanelOnce();
        await tap(`[data-testid="aime-panel-item-folder:${folder ?? tab}"]`, 1800);
        await panel.waitFor({ state: "visible", timeout: 6000 }).catch(() => report.missing.push("dossier du Monde"));
      }
      const tabButton = page.getByTestId(`pilotage-tab-${tab}`);
      if (await tabButton.isVisible().catch(() => false)) await tap(tabButton, 900);
      await panel.scrollIntoViewIfNeeded({ timeout: 2000 }).catch(() => {});
      await sleep(300);
    },
    closePanel: async () => {
      const close = page.getByTestId("aime-panel-close");
      if (await close.isVisible().catch(() => false)) await tap(close, 700);
      /* Une vue de bloc (Vue d'ensemble, Graphe) ouverte depuis le panneau reste
         au premier plan et boira le clic suivant : Échap la referme. */
      await page.keyboard.press("Escape").catch(() => {});
      await sleep(320);
    },
    openPanel: openPanelOnce,
    typeTestId: (id, text, delay) => type(page.getByTestId(id).first(), text, delay),
    field: (locator, text, delay) => type(locator, text, delay),
    typeLast: (sel, text, delay) => type(page.locator(sel).last(), text, delay),
    /** Une `<select>` : taper dedans ne veut rien dire, on choisit l'option. */
    choose: async (sel, value, pause = 700) => {
      const locator = locatorOf(sel);
      if (!(await locator.waitFor({ state: "attached", timeout: 4500 }).then(() => true, () => false)) || !(await reveal(locator))) {
        report.missing.push(`liste ${String(sel)}`);
        return false;
      }
      await locator.selectOption(value).catch(() => report.missing.push(`option ${value}`));
      await sleep(pause);
      return true;
    },
    /** `<Field label=…>` rend un `<label>` sans `for` : `getByLabel` échoue,
        on descend donc du libellé au champ qui le suit. */
    typeLabel: async (label, text, delay) => {
      const field = page.locator("label, [role=\"group\"]").filter({ hasText: label }).locator("input, textarea, select").first();
      if (await field.waitFor({ state: "visible", timeout: 4000 }).then(() => true, () => false)) return type(field, text, delay);
      const labelled = page.getByLabel(label).first();
      if (await labelled.waitFor({ state: "visible", timeout: 1500 }).then(() => true, () => false)) return type(labelled, text, delay);
      report.missing.push(`étiquette ${String(label)}`);
      return false;
    },
    /** L'attente d'un état de l'application — une analyse qui tombe, un
        panneau qui s'ouvre — sans quoi un geste part une écran trop tôt. */
    wait: async target => {
      if (typeof target === "number") return sleep(target);
      await locatorOf(target).waitFor({ state: "visible", timeout: 6000 }).catch(() => {});
    },
    filled: (testId, name) => page.getByTestId(testId).locator(`[name="${name}"]`).first().inputValue().catch(() => ""),
    checkLabel: (label, pause) => tap(page.getByLabel(label).first(), pause ?? 260),
    type,
    move: moveTo,
    /** Un mouvement de molette, par petits pas : un saut brut ne se lit pas. */
    scroll: async (delta, steps = 10) => {
      for (let index = 0; index < steps; index += 1) { await page.mouse.wheel(0, delta / steps); await sleep(40); }
      await sleep(340);
    },
    scrollTo: async locator => {
      await locator.first().scrollIntoViewIfNeeded({ timeout: 2500 }).catch(() => {});
      await sleep(340);
    },
    caption: async (text, on = true) => {
      await page.evaluate(([value, shown]) => window.__aimeTour?.caption(value, shown), [text, on]).catch(() => {});
    },
    title: async ({ eyebrow, heading, text }, hold) => {
      await page.evaluate(values => window.__aimeTour?.title(
        `<div><p class="eyebrow">${values.eyebrow}</p><h1>${values.heading}</h1><p>${values.text}</p></div>`,
      ), { eyebrow, heading, text }).catch(() => {});
      await sleep(hold);
    },
    hideTitle: async () => { await page.evaluate(() => window.__aimeTour?.hideTitle()).catch(() => {}); await sleep(450); },
  };
}

/*
 * Polices : le site charge Plus Jakarta Sans et Inter depuis Google Fonts. Sur
 * une machine sans réseau, on sert les mêmes fichiers depuis `@fontsource`
 * pour que la vidéo montre le vrai rendu, pas une police de repli.
 */
const fontsDir = [process.env.FONTSOURCE_DIR, resolve(app, "node_modules/@fontsource"), resolve(app, "../../node_modules/@fontsource")]
  .filter(Boolean).find(dir => existsSync(join(dir, "plus-jakarta-sans")));

async function serveLocalFonts(context) {
  if (!fontsDir) return;
  const face = (family, file, weight) =>
    `@font-face{font-family:'${family}';font-style:normal;font-weight:${weight};font-display:swap;src:url(https://fonts.gstatic.com/aime-tour/${file}) format('woff2');}`;
  const css = [
    ...[300, 400, 500, 600, 700].map(weight => face("Plus Jakarta Sans", `plus-jakarta-sans/files/plus-jakarta-sans-latin-${weight}-normal.woff2`, weight)),
    ...[300, 400, 500].map(weight => face("Inter", `inter/files/inter-latin-${weight}-normal.woff2`, weight)),
  ].join("\n");
  await context.route("https://fonts.googleapis.com/**", route => route.fulfill({ contentType: "text/css", body: css }));
  await context.route("https://fonts.gstatic.com/aime-tour/**", route => {
    const relative = new URL(route.request().url()).pathname.replace("/aime-tour/", "");
    const file = join(fontsDir, relative);
    return existsSync(file) ? route.fulfill({ path: file, contentType: "font/woff2" }) : route.fulfill({ status: 404 });
  });
}

/* ------------------------------------------------------------------ */
/* Le plan-séquence                                                    */
/* ------------------------------------------------------------------ */

async function record() {
  const work = join(tmpdir(), `aime-tour-${Date.now()}`);
  mkdirSync(work, { recursive: true });
  mkdirSync(outDir, { recursive: true });
  const wanted = CHAPTERS.filter(chapter => !only.length || only.includes(chapter.id));
  const stop = await startPreview();
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM || undefined,
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--font-render-hinting=none", "--hide-scrollbars", "--mute-audio",
      ...(process.env.CHROMIUM_ARGS?.split(" ").filter(Boolean) ?? [])],
  });
  const report = { missing: [], chapters: [] };
  let reported = 0;
  try {
    const context = await browser.newContext({
      viewport: SIZE, deviceScaleFactor: 1, locale: "fr-FR", timezoneId: "Europe/Paris",
      reducedMotion: "no-preference", recordVideo: { dir: work, size: SIZE },
      permissions: ["clipboard-read", "clipboard-write"],
    });
    await serveLocalFonts(context);
    /*
     * La session simulée de l'aperçu est Posée dans le navigateur — sauf si le
     * chapitre « inscription » fait partie de la prise : dans ce cas, l'accueil
     * doit montrer « Créer mon compte » et c'est le geste filmé qui connecte.
     */
    const seedSession = !wanted.some(chapter => chapter.id === "inscription");
    await context.addInitScript(seed => {
      try {
        localStorage.setItem("aime-locale", "fr");
        if (seed) localStorage.setItem("aime-preview-session", "1");
      } catch { /* ok */ }
    }, seedSession);
    await context.addInitScript(installStage, { cssText: STAGE_CSS, svg: CURSOR_SVG });
    const page = await context.newPage();
    page.on("pageerror", error => console.warn("  [page]", error.message));
    /* Un geste qui attend trente secondes étirerait la vidéo : on coupe court,
       le rapport signale l'étape ratée et la prise continue. */
    page.setDefaultTimeout(4_000);
    await mockMissingRoutes(page);
    /* Le contexte est créé : l'horloge de la vidéo démarre ici. */
    const startedAt = Date.now();
    await page.goto(BASE, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1600);

    for (const [position, chapter] of wanted.entries()) {
      const voice = VOICES.find(entry => entry.id === chapter.id);
      const audioSeconds = flags.has("--dry") ? 12 : voice.seconds;
      const mark = { id: chapter.id, index: position, start: Date.now() - startedAt };
      const d = director(page, report);
      console.log(`▶ ${chapter.n} · ${chapter.label} — ${clock(audioSeconds)} de voix`);

      await d.title(chapter.title, TITLE_HOLD);
      await d.hideTitle();
      await d.wait(LEAD * 1000);

      const chars = chapter.steps.reduce((sum, step) => sum + step.text.length, 0) || 1;
      const spoken = Math.max(6, audioSeconds - 0.4);
      for (const step of chapter.steps) {
        const t0 = Date.now();
        await d.caption(step.text.replace(/« (.+?) »/g, "« <b>$1</b> »"));
        if (step.act) await Promise.resolve(step.act({ page, d })).catch(error => console.warn("  [acte]", error.message.split("\n")[0]));
        const done = (Date.now() - t0) / 1000;
        /* Le reste du temps de parole de cette phrase : ce que la voix dit
           encore pendant que l'écran tient la scène. */
        const share = (step.text.length / chars) * spoken;
        await d.wait(Math.round(Math.max(MIN_HOLD, share - done) * 1000));
        if (DEBUG) console.log(`   · ${((Date.now() - t0) / 1000).toFixed(1)} s pour ${share.toFixed(1)} s de voix — ${step.text.slice(0, 44)}…`);
        if (flags.has("--probe")) {
          const scene = await page.evaluate(() => {
            const visible = node => { const r = node.getBoundingClientRect(); const style = getComputedStyle(node); return r.width > 4 && r.height > 4 && style.visibility !== "hidden" && style.opacity !== "0"; };
            return {
              url: location.pathname + location.search,
              ids: [...new Set([...document.querySelectorAll("[data-testid]")].filter(visible).map(node => node.getAttribute("data-testid")))].slice(0, 46).join(" "),
              buttons: [...new Set([...document.querySelectorAll("button:not([disabled])")].filter(visible).map(node => (node.textContent || "").replace(/\s+/g, " ").trim().slice(0, 30)))].filter(Boolean).slice(0, 22).join(" | "),
              fields: [...document.querySelectorAll("input,select,textarea")].filter(e => { const r = e.getBoundingClientRect(); return r.width > 2 && r.height > 2; }).map(e => `${e.tagName.toLowerCase()}[${[e.placeholder && `ph="${e.placeholder}"`, e.value && `v="${e.value}"`, e.getAttribute("aria-label") && `aria="${e.getAttribute("aria-label")}"`].filter(Boolean).join(" ")}]`).slice(0, 12).join("  "),
            };
          }).catch(() => null);
          console.log(`      ↳ ${scene?.url} | ${scene?.ids}`);
          console.log(`        boutons : ${scene?.buttons}`);
          console.log(`        champs  : ${scene?.fields}`);
        }
      }
      await d.caption("", false);
      await d.wait(TAIL * 1000);
      mark.end = Date.now() - startedAt;
      report.chapters.push(mark);
      if (report.missing.length > reported) {
        console.warn(`   ⚠ ${report.missing.slice(reported).join(" · ")}`);
        reported = report.missing.length;
      }
    }

    /* Écran de sortie : la dernière image du film et son affiche. Il appartient
       au dernier chapitre, recollé tel quel dans le film complet. */
    const d = director(page, report);
    await d.title({
      eyebrow: "byaime.fr",
      heading: "Tout votre mariage, dans un seul espace privé.",
      text: "Gratuit · 2 minutes · Sans carte bancaire",
    }, END_HOLD);
    if (report.chapters.length) report.chapters[report.chapters.length - 1].end = Date.now() - startedAt;
    if (DEBUG) await page.screenshot({ path: join(work, "last-frame.jpg"), type: "jpeg" }).catch(() => {});
    await context.close();
  } finally {
    await browser.close();
    stop();
  }

  const webm = readdirSync(work).filter(file => file.endsWith(".webm")).map(file => join(work, file))
    .sort((a, b) => statSync(b).size - statSync(a).size)[0];
  if (!webm) throw new Error("Aucune vidéo produite");
  const filmed = durationOf(webm);
  const measured = report.chapters.length ? report.chapters[report.chapters.length - 1].end / 1000 : 0;
  /* Le WebM de Playwright peut durer un peu plus longtemps que la session
     mesurée (images de fin) : les coupes sont calées sur la même échelle. */
  const scale = measured > 0 && filmed > 0 ? Math.min(1.12, Math.max(0.9, filmed / measured)) : 1;
  console.log(`✓ prise : ${clock(measured)} mesurée · ${clock(filmed)} au fichier · échelle ${scale.toFixed(3)}`);
  const missed = [...new Set(report.missing)];
  if (missed.length) console.warn(`⚠ ${missed.length} étape(s) hors cible : ${missed.join(" · ")}`);
  if (flags.has("--dry")) {
    console.log("(à sec) coupées sans encodage :", JSON.stringify(report.chapters.map(chapter => ({
      id: chapter.id,
      from: +((chapter.start * scale) / 1000).toFixed(2),
      to: +((chapter.end * scale) / 1000).toFixed(2),
    }))));
    rmSync(work, { recursive: true, force: true });
    return;
  }

  /* Encodage : un fichier par chapitre (image + voix), puis le film qui les
     recolle sans réencoder. Paramètres identiques partout, c'est ce qui rend
     la recolle possible. */
  const manifest = [];
  for (const [position, chapter] of wanted.entries()) {
    const mark = report.chapters[position];
    const start = (mark.start * scale) / 1000;
    const length = Math.max(6, ((mark.end - mark.start) * scale) / 1000);
    const mp4 = join(outDir, `tour-${chapter.id}.mp4`);
    const poster = join(outDir, `tour-${chapter.id}.jpg`);
    const voice = VOICES.find(entry => entry.id === chapter.id);
    execFileSync(FFMPEG, ["-y", "-loglevel", "error", "-ss", start.toFixed(2), "-t", length.toFixed(2), "-i", webm,
      "-i", voice.file,
      "-map", "0:v:0", "-map", "1:a:0",
      "-vf", `fps=${FPS},scale=${SIZE.width}:${SIZE.height}:flags=lanczos,setsar=1,format=yuv420p`,
      "-af", `apad=whole_dur=${length.toFixed(2)},atrim=0:${length.toFixed(2)},aresample=48000`,
      "-c:v", "libx264", "-preset", "veryfast", "-crf", String(CRF), "-profile:v", "high", "-pix_fmt", "yuv420p",
      "-c:a", "aac", "-b:a", "80k", "-ac", "1",
      "-movflags", "+faststart", "-shortest", mp4]);
    execFileSync(FFMPEG, ["-y", "-loglevel", "error", "-ss", (length * (chapter.posterAt ?? 0.5)).toFixed(2), "-i", mp4,
      "-frames:v", "1", "-q:v", "4", poster]);
    const seconds = durationOf(mp4);
    manifest.push({
      id: chapter.id, n: chapter.n, label: chapter.label,
      duration: clock(seconds), seconds: +seconds.toFixed(1),
      video: `tour-${chapter.id}.mp4`, poster: `tour-${chapter.id}.jpg`,
      bytes: statSync(mp4).size,
    });
    console.log(`  ✓ tour-${chapter.id}.mp4 — ${clock(seconds)} · ${(statSync(mp4).size / 1024 / 1024).toFixed(1)} Mo`);
  }

  const list = join(work, "concat.txt");
  writeFileSync(list, manifest.map(entry => `file '${join(outDir, entry.video)}'`).join("\n"));
  const film = join(outDir, "tour-complet.mp4");
  execFileSync(FFMPEG, ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", list, "-c", "copy", "-movflags", "+faststart", film]);
  execFileSync(FFMPEG, ["-y", "-loglevel", "error", "-i", film, "-frames:v", "1", "-q:v", "4", join(outDir, "tour-complet.jpg")]);
  const filmSeconds = durationOf(film);
  manifest.forEach((entry, position) => {
    entry.start = +(position === 0 ? 0 : manifest[position - 1].start + manifest[position - 1].seconds).toFixed(1);
  });
  writeFileSync(join(outDir, "tour.manifest.json"), `${JSON.stringify({
    generatedAt: new Date().toISOString().slice(0, 10),
    source: "scripts/record-tour.mjs",
    size: [SIZE.width, SIZE.height],
    fps: FPS,
    voice: "fr-FR",
    film: { file: "tour-complet.mp4", poster: "tour-complet.jpg", duration: clock(filmSeconds), seconds: +filmSeconds.toFixed(1), bytes: statSync(film).size },
    chapters: manifest,
  }, null, 2)}\n`);
  console.log(`✓ tour-complet.mp4 — ${clock(filmSeconds)} · ${(statSync(film).size / 1024 / 1024).toFixed(1)} Mo`);
  console.log("  durées pour `LandingTour.tsx` :", manifest.map(entry => `${entry.id}: "${entry.duration}"`).join(", "));
  console.log("  film :", manifest.map(entry => `${entry.id}@${entry.start}`).join(", "));
  if (process.env.TOUR_KEEP) console.log(`  WebM conservé : ${webm}`);
  else rmSync(work, { recursive: true, force: true });
}

await record();
