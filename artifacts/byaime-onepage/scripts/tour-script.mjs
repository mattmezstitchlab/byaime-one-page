/*
 * Le scénario de la visite guidée — huit chapitres, un seul plan-séquence.
 *
 * Chaque chapitre est une suite d'étapes. Une étape, c'est :
 *   • `text`  — la phrase dite par la voix ET affichée en sous-titre ;
 *   • `act`   — (facultatif) ce que le curseur fait pendant cette phrase.
 *
 * La durée de chaque étape est déduite de la longueur de sa phrase, et la
 * durée du chapitre de celle du fichier audio (`tour/audio/<chapitre>.mp3`).
 * C'est ce cadencement qui garde la voix et l'écran ensemble : ni montage
 * après coup, ni vidéo muette qu'il faudrait deviner.
 *
 * Rien n'est simulé côté produit : les étapes exécutent les vrais contrôles,
 * avec les vrais `data-testid`. Les deux seules routes absentes de l'aperçu
 * local — la création d'un lien RSVP et le portail d'invitation — sont
 * répondues ici avec le contrat réel de l'API (`openapi.yaml`), exactement
 * comme `record-guides.mjs` le faisait pour le parcours de l'invité.
 */

const TOK = "7c4e9a51-2b6d-4f83-9a17-5d0c8e64b231";

/** Les données du portail d'invitation, au contrat `rsvpPortalSchema`. */
const PORTAL = {
  projectTitle: "Léa & Hugo",
  phase: "avant",
  guest: { name: "Camille", tableName: "Table des cousins" },
  program: [
    { id: "p1", time: "2027-08-14T14:30:00+02:00", title: "Cérémonie laïque", detail: "Sous les tilleuls", location: "Domaine des Ormes" },
    { id: "p2", time: "2027-08-14T16:30:00+02:00", title: "Cocktail", location: "Terrasse" },
    { id: "p3", time: "2027-08-14T20:00:00+02:00", title: "Dîner", location: "Orangerie" },
    { id: "p4", time: "2027-08-14T23:00:00+02:00", title: "Soirée dansante", detail: "Jusqu'à deux heures" },
  ],
  practicalInfo: { city: "Lille", venue: "Domaine des Ormes", parking: "Parking gratuit sur place", accessibility: "Accès PMR de bout en bout" },
  mediaPolicy: { enabled: true, maxSize: 20_000_000 },
  songRequests: [],
  contributions: [],
  afterContent: [],
};

/* ------------------------------------------------------------------ */
/* Chapitres                                                           */
/* ------------------------------------------------------------------ */

export const CHAPTERS = [
  {
    id: "concept",
    n: "01",
    label: "Le concept",
    title: {
      eyebrow: "Visite guidée · Chapitre 1",
      heading: "Ce qu'est AIME",
      text: "Un Monde, une Timeline, une seule page publique — filmé dans l'application.",
    },
    /* L'affiche est prise à la fin du chapitre : le hero, pas l'écran-titre. */
    posterAt: 0.86,
    steps: [
      {
        text: "AIME n'est pas un énième tableur de mariage. C'est un Monde : un seul espace privé où votre mariage tient entier.",
        act: async ({ page, d }) => { await page.goto(d.base, { waitUntil: "networkidle" }); await d.wait(600); },
      },
      {
        text: "Les invités, le budget, les prestataires, les documents, la musique — et surtout le fil du temps qui relie tout ça.",
        act: async ({ d }) => { await d.scrollTo(d.page.locator('[data-testid="landing-composer"]')); await d.wait(400); },
      },
      {
        text: "Pas d'onglets en tous sens, pas de conversations éparpillées : une Timeline, et tout le reste s'y accroche.",
        act: async ({ page, d }) => { await d.scroll(560); await page.hover('[data-testid="landing-product"]').catch(() => {}); await d.scroll(420); },
      },
      {
        text: "Sur l'accueil, une seule promesse et un seul bouton.",
        act: async ({ d }) => { await d.scroll(760); await d.wait(500); },
      },
      {
        text: "Vous créez votre espace, vous répondez à quatre questions, et AIME ouvre votre Monde.",
        act: async ({ d }) => { await d.scroll(820); await d.wait(600); },
      },
      {
        text: "Trois temps le structurent. Avant, on prépare. Le Jour J, on exécute. Après, on garde.",
        act: async ({ page, d }) => { await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" })); await d.wait(1400); },
      },
    ],
  },

  {
    id: "inscription",
    n: "02",
    label: "Créer son espace",
    title: {
      eyebrow: "Visite guidée · Chapitre 2",
      heading: "Créer son espace, puis sa carte",
      text: "Un compte, une carte. Une seule fois.",
    },
    posterAt: 0.62,
    steps: [
      {
        text: "Commençons par le début : créer son espace. Sur l'accueil, « Créer mon compte ».",
        act: async ({ page, d }) => {
          await d.tap('[data-testid="landing-sign-up"]', 900);
          await page.waitForURL(/\/creation/, { timeout: 6000 }).catch(() => {});
        },
      },
      {
        text: "Sur le site réel, c'est un formulaire de création de compte — une adresse e-mail, un mot de passe, ou un compte Google. Une minute, sans carte bancaire.",
        act: async ({ d }) => {
          /* Le formulaire de création est à l'écran : on le montre, on ne le
             remplit pas — le compte se crée au clavier du visiteur, pas ici. */
          await d.wait('[data-testid="auth-sign-up"]');
          await d.wait(1200);
        },
      },
      {
        text: "AIME ne demande pas le plan de table complet pour vous laisser entrer.",
        act: async ({ page, d }) => {
          await d.tapTextLike(/Entrer dans l’espace de démonstration|Enter the demo space/, 1200);
          await page.waitForURL(/user-portal/, { timeout: 7000 }).catch(() => {});
        },
      },
      {
        text: "Le premier écran de l'espace privé est vide, volontairement : une seule action, appuyer sur le bouton plus pour commencer un Monde.",
        act: async ({ d }) => {
          await d.wait('[data-testid="universal-zero"]');
          await d.move('[data-testid="zero-plus"]');
          await d.wait(1200);
        },
      },
      {
        text: "Et si vous préférez dire d'abord qui vous êtes, le panneau « Compte & profil » ouvre votre carte : le prénom, le nom, la ville.",
        act: async ({ d }) => {
          await d.openPanel();
          await d.tap('[data-testid="aime-panel-item-me"]', 1400);
          await d.wait('[data-testid="universal-card-form"]');
        },
      },
      {
        text: "Une seule fois — et elle vous suit d'un mariage à l'autre.",
        act: async ({ page, d }) => {
          /* Les trois champs du haut de la carte : prénom, nom, ville, dans
             l'ordre du formulaire réel. */
          const fields = page.getByTestId("universal-card-form").locator('input[maxlength="100"]');
          const values = ["Léa", "Marchand", "Lille"];
          const count = Math.min(await fields.count().catch(() => 0), 3);
          for (let index = 0; index < count; index += 1) await d.field(fields.nth(index), values[index], 44);
          await d.wait(1200);
        },
      },
    ],
  },

  {
    id: "monde",
    n: "03",
    label: "Ouvrir un Monde",
    title: {
      eyebrow: "Visite guidée · Chapitre 3",
      heading: "Créer le Monde Mariage",
      text: "Quatre lettres : A, I, M, E.",
    },
    posterAt: 0.8,
    steps: [
      {
        text: "Un Monde se crée en quatre lettres. A, comme Acteur : qui êtes-vous, dans ce Monde ? Ici, un couple.",
        act: async ({ page, d }) => {
          await page.goto(d.base + "/user-portal", { waitUntil: "load" });
          await page.waitForTimeout(1800);
          await d.tap('[data-testid="zero-plus"]', 900);
          await d.wait('[data-testid="actor-couple"]');
          await d.tap('[data-testid="actor-couple"]', 900);
        },
      },
      {
        text: "I, comme Intention : ce que vous voulez rendre possible.",
        act: async ({ d }) => {
          await d.tap('[data-testid="zero-next"]', 900);
          await d.wait('[data-testid^="intention-"]');
          await d.tap('[data-testid="intention-pr-senter-mon-univers"]', 900);
        },
      },
      {
        text: "M, comme Monde : ce qui existe déjà. Une phrase suffit, et AIME en déduit des faits — des faits à confirmer, jamais imposés.",
        act: async ({ d }) => {
          await d.tap('[data-testid="zero-next"]', 1100);
          await d.wait('[data-testid="situation-je-pars-de-z-ro"]');
          await d.tap('[data-testid="situation-je-pars-de-z-ro"]', 700);
          await d.type('[data-testid="situation-free"]', "Un mariage en août, dans le Nord, avec nos familles.", 22);
          await d.tap('[data-testid="situation-analyze"]', 900);
          /* L'analyse est asynchrone : sans cette attente, le Continuer suivant
             part un écran trop tôt et tout le chapitre se décale. */
          await d.wait('[data-testid="facts-preview"]');
        },
      },
      {
        text: "E, comme Écosystème : avec qui ce Monde existe.",
        act: async ({ d }) => {
          await d.tap('[data-testid="zero-next"]', 1400);
          await d.wait('[data-testid="ecosystem-entourage"]');
          await d.tap('[data-testid="ecosystem-entourage"]', 1100);
        },
      },
      {
        text: "À chaque étape, « je ne sais pas encore » reste disponible, et ne rien choisir n'écrit rien.",
        act: async ({ d }) => {
          await d.move('[data-testid="zero-skip"]');
          await d.wait(900);
          await d.tap('[data-testid="zero-next"]', 2400);
          await d.wait('[data-testid="world-hero"]');
        },
      },
      {
        text: "Voilà le Monde ouvert : d'un côté ce qu'AIME a compris, de l'autre ce qu'il reste à vérifier, et des modules proposés — la page publique, les documents, les souvenirs.",
        act: async ({ page, d }) => {
          await d.scrollTo(page.getByTestId("world-getting-started"));
          await d.scroll(420, 8);
        },
      },
      {
        text: "Vous décidez. On n'installe rien sans vous.",
        act: async ({ d }) => {
          await d.tap('[data-testid="module-medias-accept"]', 1000);
          await d.tap('[data-testid="module-repertoire-accept"]', 1200);
        },
      },
    ],
  },

  {
    id: "ouverture",
    n: "04",
    label: "Nommer le Monde",
    title: {
      eyebrow: "Visite guidée · Chapitre 4",
      heading: "Léa & Hugo, le 14 août 2027",
      text: "Le nom, la date, le lieu — puis les trois temps.",
    },
    posterAt: 0.72,
    steps: [
      {
        text: "Le Monde vient de naître : il n'a ni nom, ni date. Depuis le bouton plus, « Modifier l'ouverture ».",
        act: async ({ d }) => {
          await d.openPanel();
          await d.tap('[data-testid="aime-panel-item-hero-editor"]', 1500);
          await d.wait('[data-testid="portal-hero-editor"]');
        },
      },
      {
        text: "Léa et Hugo, le quatorze août vingt vingt sept, à Lille, au Domaine des Ormes.",
        act: async ({ page, d }) => {
          const editor = page.getByTestId("portal-hero-editor");
          await d.field(editor.locator('[name="title"]'), "Léa & Hugo", 34);
          await d.field(editor.locator('[name="subtitle"]'), "Un mariage sous les tilleuls", 22);
          await d.field(editor.locator('[name="city"]'), "Lille", 34);
          await d.field(editor.locator('[name="venue"]'), "Domaine des Ormes", 26);
          await editor.locator('[name="date"]').fill("2027-08-14").catch(() => {});
          await d.wait(700);
        },
      },
      {
        text: "Enregistrée, l'ouverture tient l'écran : le compte à rebours démarre, et tous les autres écrans reprennent ces valeurs.",
        act: async ({ d }) => {
          await d.tapTextLike(/Enregistrer l’ouverture|Save the opening/, 1700);
          /* Après l'enregistrement, le panneau bascule sur les réglages du
             Monde : c'est là que la visibilité se règle, à l'étape suivante. */
          await d.wait('[data-testid="portal-world-settings"]');
        },
      },
      {
        text: "C'est la règle du Ripple — une information, une seule source, jamais de copie à maintenir.",
        act: async ({ page, d }) => {
          await d.scroll(300, 8);
          await d.move('[data-testid="world-settings-role"]');
          await page.getByTestId("portal-hero-editor").isVisible().catch(() => false);
          await d.wait(900);
        },
      },
      {
        text: "Changez le titre du Monde, la page publique change avec lui.",
        act: async ({ page, d }) => {
          await d.tap('[data-testid="aime-panel-close"]', 1000);
          await d.scrollTo(page.getByTestId("world-hero"));
          await d.move('[data-testid="world-hero"]');
        },
      },
      {
        text: "Et le mode suit la période : Avant pour préparer, Jour J pour exécuter, Après pour garder.",
        act: async ({ d }) => {
          await d.tap('[data-testid="world-phase-pendant"]', 1500);
          await d.tap('[data-testid="world-phase-apres"]', 1500);
          await d.tap('[data-testid="world-phase-avant"]', 1100);
        },
      },
    ],
  },

  {
    id: "timeline",
    n: "05",
    label: "La Timeline",
    title: {
      eyebrow: "Visite guidée · Chapitre 5",
      heading: "La Timeline, colonne vertébrale",
      text: "Un Moment = une heure, une phase, une visibilité.",
    },
    posterAt: 0.68,
    steps: [
      {
        text: "La Timeline est la colonne vertébrale. Ajoutez un Moment : une heure, une phase, une visibilité, et des relations.",
        act: async ({ page, d }) => {
          await d.scrollTo(page.getByTestId("timeline-zone"));
          await d.tap('[data-testid="timeline-add-moment"]', 1500);
          await d.wait('[data-testid="timeline-zone"]');
        },
      },
      {
        text: "La cérémonie, le cocktail, le dîner, le départ du cortège.",
        act: async ({ page, d }) => {
          /* Le Moment naît sélectionné : le tiroir de contexte est déjà ouvert.
             Sinon, on l'ouvre par « Modifier ce Moment » — même chemin, même vue. */
          const title = page.getByPlaceholder("Titre de l'événement");
          if (!(await title.isVisible().catch(() => false))) {
            await d.tapTestIdStartingWith("timeline-edit-", 1500);
          }
          await d.field(title, "Cérémonie sous les tilleuls", 22);
          await d.field(page.getByPlaceholder("Où cela se passe-t-il ?"), "Domaine des Ormes", 22);
        },
      },
      {
        text: "Chaque Moment porte ce qui le concerne — les prestataires, les documents, la musique, les photos.",
        act: async ({ page, d }) => {
          await d.tapTextLike(/Ce que chacun voit|What everyone sees/, 1500);
          await page.keyboard.press("Escape").catch(() => {});
          await d.wait(800);
        },
      },
      {
        text: "Le jour venu, le mode Jour J allume la régie : le déroulé, à l'heure, avec les retards.",
        act: async ({ d }) => {
          await d.tap('[data-testid="world-phase-pendant"]', 1600);
          await d.scroll(320, 7);
        },
      },
      {
        text: "Et parce que rien ne devient public par héritage, vous décidez Moment par Moment de ce que voient vos invités.",
        act: async ({ d }) => {
          await d.tap('[data-testid="world-phase-avant"]', 1100);
          await d.openPanel();
          await d.tap('[data-testid="aime-panel-item-visibility"]', 1900);
        },
      },
    ],
  },

  {
    id: "invites",
    n: "06",
    label: "Invités & RSVP",
    title: {
      eyebrow: "Visite guidée · Chapitre 6",
      heading: "Un lien par invité",
      text: "Camille répond sans compte, et sans accès au Monde.",
    },
    posterAt: 0.5,
    steps: [
      {
        text: "Les invités, d'abord. Dans le dossier « Invités et RSVP », chaque personne reçoit son propre lien.",
        act: async ({ page, d }) => {
          await page.goto(d.base + "/user-portal", { waitUntil: "load" });
          await d.wait('[data-testid="world-hero"]');
          await d.openPanel();
          await d.tap('[data-testid="aime-panel-item-folder:guests"]', 1900);
          await d.wait('[data-testid="pilotage-panel"]');
        },
      },
      {
        text: "Camille Martin, Thomas Leroy.",
        act: async ({ page, d }) => {
          /* Deux lignes, ajoutées l'une après l'autre : la dernière née est
             toujours la dernière de la liste. Un clic sur un bouton qui vient
             de changer de place ne produit rien — on vérifie, on retente. */
          for (const name of ["Camille Martin", "Thomas Leroy"]) {
            await d.dossier("guests");
            /* La dernière ligne née est la dernière du dossier ; son champ
               nom est le seul `input.flex-1` de la fiche. */
            const fresh = page.getByTestId("pilotage-panel").locator("input.flex-1").last();
            await d.tapIn("pilotage-panel", /Ajouter|^Add$/);
            if (!(await fresh.isVisible().catch(() => false))) await d.tapIn("pilotage-panel", /Ajouter|^Add$/);
            await d.field(fresh, name, 30);
          }
        },
      },
      {
        text: "Ce lien répond à une question simple : serez-vous là ? Il ne donne aucun accès au Monde, et il ne demande aucun compte.",
        act: async ({ d }) => {
          await d.dossier("guests");
          await d.tapTestIdStartingWith("participant-invite-", 1900);
          await d.move('[data-testid^="participant-copy-"]');
        },
      },
      {
        text: "Les régimes, les tables, les absents, les confirmations — le plan de table vit ici, pas dans un tableur à renvoyer par e-mail.",
        act: async ({ page, d }) => {
          await d.dossier("guests");
          await d.type('input[placeholder="Régime"]', "Végétarien", 28);
          await d.choose('select[aria-label^="Présence de"]', "confirme", 900);
          await d.scroll(260, 7);
        },
      },
      {
        text: "Et si vous voulez quelqu'un à vos côtés pour organiser, ce n'est pas ce lien-là : une invitation distincte ouvre un accès, avec un rôle précis.",
        act: async ({ page, d }) => {
          await page.keyboard.press("Escape").catch(() => {});
          await d.wait(500);
          await d.openPanel();
          await d.move('[data-testid="aime-panel-item-share-doc"]');
          await d.wait(1400);
        },
      },
      {
        text: "Les deux sont différents, et le produit vous le dit.",
        act: async ({ page, d }) => {
          const href = await page.locator('a[href^="/rsvp/"]').first().getAttribute("href").catch(() => null);
          if (!href) { await d.tap('[data-testid="aime-panel-close"]', 900); return; }
          await page.goto(d.base + href, { waitUntil: "load" });
          await page.waitForTimeout(1900);
          await d.wait('[data-testid="rsvp-form"]');
        },
      },
    ],
  },

  {
    id: "prestataires",
    n: "07",
    label: "Les modules du Monde",
    title: {
      eyebrow: "Visite guidée · Chapitre 7",
      heading: "Prestataires, budget, assistant",
      text: "Un rail de sept entrées, et AIME qui répond avec vos dossiers.",
    },
    posterAt: 0.55,
    steps: [
      {
        text: "Autour de la Timeline, les modules du Monde. Un rail de sept entrées, jamais de doublon.",
        act: async ({ page, d }) => {
          await page.goto(d.base + "/user-portal", { waitUntil: "load" });
          await d.wait('[data-testid="world-hero"]');
          await d.openPanel();
          await d.move('[data-testid="aime-panel-search"]');
        },
      },
      {
        text: "Les prestataires, avec les devis et les contrats.",
        act: async ({ page, d }) => {
          await d.tap('[data-testid="aime-panel-item-folder:providers"]', 1900);
          await d.dossier("providers");
          const name = page.getByPlaceholder("Nom");
          await d.tapIn("pilotage-panel", /Ajouter|^Add$/);
          if (!(await name.isVisible().catch(() => false))) await d.tapIn("pilotage-panel", /Ajouter|^Add$/);
          await d.field(name, "Le Traiteur des Ormes", 26);
        },
      },
      {
        text: "Le budget, qui suit les paiements.",
        act: async ({ d }) => {
          await d.closePanel();
          await d.openPanel();
          await d.tap('[data-testid="aime-panel-item-overview"]', 1900);
          await d.wait('[data-testid="avant-overview"]');
          await d.move('[data-testid="avant-overview"]');
        },
      },
      {
        text: "Les tâches, la logistique, l'équipe qui porte le Jour J, les documents partagés.",
        act: async ({ d }) => {
          await d.openPanel();
          await d.tap('[data-testid="aime-panel-item-folder:messages"]', 1800);
          await d.scroll(280, 7);
        },
      },
      {
        text: "Et « Poser une question » : AIME répond avec les dossiers de votre Monde, en citant ce qu'il sait et ce qui manque — jamais d'à-peu-près.",
        act: async ({ d }) => {
          await d.closePanel();
          await d.openPanel();
          await d.tap('[data-testid="aime-panel-item-ask"]', 1700);
          await d.move('[data-testid="assistant-chat"]');
        },
      },
      {
        text: "Le pourcentage en haut de l'écran, lui, est honnête : c'est ce qu'AIME a compris de vous.",
        act: async ({ page, d }) => {
          await d.closePanel();
          await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
          await d.wait(900);
          await d.move('[data-testid="world-hero"]');
        },
      },
    ],
  },

  {
    id: "partage",
    n: "08",
    label: "Partager et garder",
    title: {
      eyebrow: "Visite guidée · Chapitre 8",
      heading: "Une page publique, un bilan",
      text: "Le mini-site, le temps d'après, et la porte de sortie.",
    },
    posterAt: 0.45,
    steps: [
      {
        text: "Un mariage se partage, mais au compte-gouttes.",
        act: async ({ page, d }) => {
          await d.scrollTo(page.getByTestId("world-hero"));
          await d.tap('[data-testid="world-hero-edit-visual"]', 1400);
          await d.wait(900);
          await page.keyboard.press("Escape").catch(() => {});
        },
      },
      {
        text: "« Le mini-site » donne une seule page publique, composée bloc par bloc : le programme, le lieu, votre histoire — et rien d'autre.",
        act: async ({ d }) => {
          await d.openPanel();
          await d.tap('[data-testid="aime-panel-item-public-info"]', 1700);
        },
      },
      {
        text: "Les messages, les documents et les réponses RSVP restent à l'intérieur.",
        act: async ({ d }) => {
          await d.closePanel();
          await d.openPanel();
          await d.tap('[data-testid="aime-panel-item-share-doc"]', 1600);
        },
      },
      {
        text: "Vient ensuite le temps d'après : les moments vécus, les remerciements, la galerie, le bilan.",
        act: async ({ page, d }) => {
          /* La page publique est une route à part : on revient dans le Monde. */
          await page.goto(d.base + "/user-portal", { waitUntil: "load" });
          await page.waitForTimeout(1800);
          await d.tap('[data-testid="world-phase-apres"]', 1600);
          await d.scroll(340, 8);
        },
      },
      {
        text: "Voilà l'idée. Un Monde, une Timeline, une seule page publique.",
        act: async ({ d }) => {
          await d.tap('[data-testid="world-phase-avant"]', 1100);
          await d.scroll(-700, 10);
        },
      },
      {
        text: "Tout votre mariage dans un espace privé qui vous appartient. Vous pouvez créer le vôtre, en deux minutes.",
        act: async ({ page, d }) => {
          await page.goto(d.base, { waitUntil: "load" });
          await page.waitForTimeout(1900);
          await d.tap('[data-testid="landing-open-space"]', 1500);
        },
      },
    ],
  },
];

/**
 * Les routes que l'aperçu local ne sert pas, mockées au contrat réel :
 * la création d'un lien de participation et le portail d'invitation.
 */
export async function mockMissingRoutes(page) {
  let issued = null;
  const answers = [];
  const portal = { ...PORTAL };
  await page.route("**/api/projects/*/rsvp-links/**", async route => {
    const guestId = route.request().url().split("/rsvp-links/")[1]?.split("?")[0] ?? "guest";
    if (route.request().method() === "POST") {
      issued = { guestId, token: TOK, revoked: false, response: null };
      return route.fulfill({ json: issued });
    }
    return route.fulfill({ json: answers });
  });
  await page.route("**/api/projects/*/rsvp-links", async route => {
    if (issued && !answers.length) answers.push(issued);
    return route.fulfill({ json: answers });
  });
  await page.route(`**/api/rsvp/${TOK}`, async route => {
    if (route.request().method() === "PUT") {
      const body = route.request().postDataJSON() ?? {};
      Object.assign(portal, { response: body });
      return route.fulfill({ json: { ok: true } });
    }
    return route.fulfill({ json: portal });
  });
  await page.route(`**/api/rsvp/${TOK}/**`, route => route.fulfill({ json: { ok: true } }));
}
