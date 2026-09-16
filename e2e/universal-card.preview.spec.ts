import { test, expect, type Page } from "@playwright/test";

// Explicitly opt in: this checks real UI + shared validation/projection in the
// isolated preview, NOT Clerk or PostgreSQL. Never run against production.
test.use({ video: "off", timezoneId: "Europe/Paris" });
test.skip(process.env.AIME_CARD_PREVIEW_TEST !== "1", "Local preview only");
test("Jean Dupont — une carte, Photographe + DJ, calendriers et rôles sociaux isolés", async ({
  page,
  request,
}, testInfo) => {
  await page.addInitScript(() => {
    localStorage.setItem("aime-preview-session", "1");
  });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const createWedding = async (title: string) => {
    const response = await request.post("/api/projects", {
      data: {
        title,
        data: {
          schemaVersion: 2,
          title,
          universe: "Mariage",
          pivot: {
            value: Date.parse("2027-06-12T14:00:00Z"),
            confidence: "confirme",
          },
          timeline: [],
          tasks: [],
          guests: [],
          providers: [],
          payments: [],
          city: { value: "Paris", confidence: "confirme" },
        },
      },
    });
    expect(response.ok()).toBeTruthy();
    return response.json();
  };
  const a = await createWedding(`Test Jean — A ${Date.now()}`);
  const b = await createWedding(`Test Jean — B ${Date.now()}`);
  const existingCard = await (await request.get("/api/me/card")).json();
  await page.goto("/ma-carte");
  if (existingCard)
    await page
      .getByRole("button", { name: "Modifier ma carte", exact: true })
      .click();
  await page.getByLabel("Prénom", { exact: true }).fill("Jean");
  await page.getByLabel("Nom", { exact: true }).fill("Dupont");
  await page.getByLabel("Ville", { exact: true }).fill("Paris");
  await page.getByLabel("Métier", { exact: true }).fill("Photographe");
  await page.getByLabel("Pseudo", { exact: true }).fill("jean");
  await page
    .getByLabel("Centres d’intérêt", { exact: false })
    .fill("Photo,Musique");
  await page.getByLabel("Photo de profil", { exact: true }).setInputFiles({
    name: "jean.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aT1cAAAAASUVORK5CYII=",
      "base64",
    ),
  });
  let musicAttempts = 0;
  await page.route("https://itunes.apple.com/search?**", (route) => {
    if (++musicAttempts === 1) return route.abort("failed");
    return route.fulfill({
      json: {
        results: [
          {
            trackId: 1,
            trackName: "Morceau de test",
            artistName: "Artiste de test",
            previewUrl: "https://example.org/test.wav",
            artworkUrl100: "https://example.org/art.png",
          },
        ],
      },
    });
  });
  await page.route("https://example.org/art.png", (route) =>
    route.fulfill({
      contentType: "image/png",
      body: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aT1cAAAAASUVORK5CYII=",
        "base64",
      ),
    }),
  );
  const wav = Buffer.alloc(44 + 16000);
  wav.write("RIFF");
  wav.writeUInt32LE(wav.length - 8, 4);
  wav.write("WAVEfmt ", 8);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(8000, 24);
  wav.writeUInt32LE(16000, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write("data", 36);
  wav.writeUInt32LE(16000, 40);
  await page.route("https://example.org/test.wav", (route) =>
    route.fulfill({ contentType: "audio/wav", body: wav }),
  );
  await page.getByLabel("Votre musique", { exact: true }).fill("test");
  await page.getByRole("button", { name: "Rechercher un morceau" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "catalogue musical est momentanément inaccessible",
  );
  await expect(page.getByTestId("universal-card-form")).not.toContainText(
    "Failed to fetch",
  );
  await page.getByRole("button", { name: "Réessayer", exact: true }).click();
  await page
    .getByRole("button", { name: "Morceau de test Artiste de test" })
    .click();
  await expect(page.locator("audio")).toHaveAttribute(
    "src",
    "https://example.org/test.wav",
  );
  await page.locator("audio").evaluate(async (audio) => {
    await (audio as HTMLAudioElement).play();
  });
  await expect(page.locator("audio")).toHaveJSProperty("paused", false);
  await page
    .getByRole("button", {
      name: /^(Enregistrer ma carte|Enregistrer mes modifications)$/,
    })
    .click();
  await expect(
    page.getByRole("heading", { name: /^Ma carte(?: est prête)?$/ }),
  ).toBeVisible();
  // A saved identity has neither a role nor a wedding association.
  const ownCard = await (await request.get("/api/me/card")).json();
  expect(ownCard.data).not.toHaveProperty("professional");
  expect(
    await (await request.get(`/api/projects/${a.id}/my-participation`)).json(),
  ).toBeNull();
  await page
    .getByRole("button", {
      name: /^(Configurer mon fonctionnement|Ajouter une activité)$/,
    })
    .click();
  await expect(
    page.getByRole("heading", { name: "Comment je fonctionne" }),
  ).toBeVisible();
  await expect(
    page.getByRole("combobox", { name: "Activité à configurer", exact: true }),
  ).toHaveValue("");
  await page
    .getByRole("combobox", { name: "Activité à configurer", exact: true })
    .selectOption("Photographe");
  await page
    .getByLabel("Durée habituelle (minutes)", { exact: true })
    .fill("510");
  await page.getByLabel("Installation (minutes)", { exact: true }).fill("30");
  await page.getByText("Précisions facultatives", { exact: true }).click();
  await page.getByLabel("Livraison", { exact: true }).fill("Galerie privée");
  // Test both the typed profile and a recurring availability rule.
  const removeWeekly = page.getByRole("button", {
    name: "Retirer ce créneau habituel",
  });
  while (await removeWeekly.count()) await removeWeekly.first().click();
  await page
    .getByRole("button", { name: "+ Créneau hebdomadaire", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Jour", exact: true })
    .selectOption("6");
  await page.getByLabel("De", { exact: true }).fill("13:00");
  await page.getByLabel("À", { exact: true }).fill("23:30");
  await page
    .getByRole("button", {
      name: "Enregistrer mon fonctionnement",
      exact: true,
    })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "Vous retrouverez ces réglages",
  );
  const profiles = await (
    await request.get("/api/me/professional-profiles")
  ).json();
  const photographer = profiles.find(
    (p: { profession: string }) => p.profession === "Photographe",
  );
  expect(photographer.data.parameters.durationMinutes).toBe(510);
  expect(
    await (await request.get(`/api/projects/${a.id}/my-participation`)).json(),
  ).toBeNull();
  await page.getByRole("button", { name: "← Ma carte", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Mariage concerné", exact: true })
    .selectOption(a.id);
  await page.getByRole("button", { name: "Préparer ma participation" }).click();
  await page.getByLabel("Photographe", { exact: true }).check();
  await page.getByLabel("Témoin", { exact: true }).check();
  await page.getByRole("button", { name: "Continuer", exact: true }).click();
  await page
    .getByRole("combobox", { name: "RSVP", exact: true })
    .selectOption("present");
  await page.getByLabel("Arrivée", { exact: true }).fill("2027-06-12T14:00");
  await page.getByLabel("Départ", { exact: true }).fill("2027-06-12T23:00");
  await page.getByLabel("Allergènes", { exact: true }).fill("arachides");
  await page.getByRole("button", { name: "Continuer", exact: true }).click();
  await page
    .getByRole("button", {
      name: "Utiliser mes réglages Photographe",
      exact: true,
    })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "Compatible avec vos disponibilités",
  );
  await page
    .getByRole("button", { name: "Valider ma participation", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: /^Ma carte(?: est prête)?$/ }),
  ).toBeVisible();
  await expect(page.getByRole("status")).toContainText("C’est enregistré");
  const rows = await (await request.get("/api/projects")).json();
  const linked = rows.find((row: { id: string }) => row.id === a.id);
  expect(linked.data.cardParticipants[0]).toMatchObject({
    card: { firstName: "Jean", lastName: "Dupont", profession: "Photographe" },
    participation: { roles: ["Photographe", "Témoin"], rsvp: "present" },
  });
  expect(linked.data.cardParticipants[0].card.photoUrl).toContain(
    "data:image/png",
  );
  expect(linked.data.timeline).toHaveLength(3); // personal presence + derived setup and service
  expect(
    linked.data.timeline.find(
      (e: { title: string }) => e.title === "Jean Dupont · Présence",
    ).durationMinutes,
  ).toBe(540);
  expect(
    linked.data.timeline.find(
      (e: { title: string }) => e.title === "Jean Dupont · Photographe",
    ).durationMinutes,
  ).toBe(510);
  expect(JSON.stringify(linked)).not.toContain("arachides");
  expect(linked.data.guests).toEqual([]);
  expect(linked.data.providers).toEqual([]);
  const ownParticipation = await (
    await request.get(`/api/projects/${a.id}/my-participation`)
  ).json();
  expect(ownParticipation.allergens).toBe("arachides");
  expect(ownParticipation.assignments[0]).toMatchObject({
    profileId: photographer.id,
    anchor: { presence: "arrival" },
    overrides: {},
  });
  await page.screenshot({
    path: testInfo.outputPath("three-levels.png"),
    fullPage: true,
  });
  await page
    .getByRole("combobox", { name: "Mariage concerné", exact: true })
    .selectOption(b.id);
  await page.getByRole("button", { name: "Préparer ma participation" }).click();
  await expect(
    page.getByLabel("Photographe", { exact: true }),
  ).not.toBeChecked();
  await page.getByLabel("Invité", { exact: true }).check();
  await page.getByRole("button", { name: "Continuer", exact: true }).click();
  await expect(page.getByLabel("Arrivée", { exact: true })).toHaveValue("");
  await expect(page.getByLabel("Allergènes", { exact: true })).toHaveValue("");
  await page.getByLabel("Cocktail", { exact: true }).check();
  await expect(
    page.getByRole("button", { name: /Utiliser mes réglages/ }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Valider ma participation", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: /^Ma carte(?: est prête)?$/ }),
  ).toBeVisible();
  const second = await (
    await request.get(`/api/projects/${b.id}/my-participation`)
  ).json();
  expect(second.roles).toEqual(["Invité"]);
  expect(second.assignments ?? []).toEqual([]);
  expect((await (await request.get("/api/me/card")).json()).userId).toBe(
    ownCard.userId,
  );
  expect(
    (await (await request.get("/api/me/professional-profiles")).json()).filter(
      (p: { profession: string }) => p.profession === "Photographe",
    ),
  ).toHaveLength(1);
  // Second independent activity: the card's presentation remains Photographe.
  await page
    .getByRole("button", { name: "Ajouter une activité", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Activité à configurer", exact: true })
    .selectOption("DJ");
  await page
    .getByLabel("Durée habituelle (minutes)", { exact: true })
    .fill("240");
  await page.getByLabel("Installation (minutes)", { exact: true }).fill("45");
  await page.getByLabel("Démontage (minutes)", { exact: true }).fill("15");
  await page.getByText("Précisions facultatives", { exact: true }).click();
  await page
    .getByLabel("Contraintes professionnelles", { exact: true })
    .fill("Régie DJ uniquement");
  const removeDjWeekly = page.getByRole("button", {
    name: "Retirer ce créneau habituel",
  });
  while (await removeDjWeekly.count()) await removeDjWeekly.first().click();
  await page
    .getByRole("button", { name: "+ Créneau hebdomadaire", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Jour", exact: true })
    .selectOption("0");
  await page.getByLabel("De", { exact: true }).fill("18:00");
  await page.getByLabel("À", { exact: true }).fill("03:00");
  await page.getByLabel("Fin le lendemain", { exact: true }).check();
  // Change a value even when this profile already existed from another viewport run.
  await page
    .getByLabel("Durée habituelle (minutes)", { exact: true })
    .fill("241");
  // Cancelling a profile switch must keep the unsaved DJ data.
  page.once("dialog", (dialog) => dialog.dismiss());
  await page
    .getByRole("combobox", { name: "Activité à configurer", exact: true })
    .selectOption("Photographe");
  await expect(
    page.getByRole("combobox", { name: "Activité à configurer", exact: true }),
  ).toHaveValue("DJ");
  await expect(
    page.getByLabel("Durée habituelle (minutes)", { exact: true }),
  ).toHaveValue("241");
  await page
    .getByLabel("Durée habituelle (minutes)", { exact: true })
    .fill("240");
  await page
    .getByRole("button", {
      name: "Enregistrer mon fonctionnement",
      exact: true,
    })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "Vous retrouverez ces réglages",
  );
  const bothProfiles = await (
    await request.get("/api/me/professional-profiles")
  ).json();
  const dj = bothProfiles.find(
    (p: { profession: string }) => p.profession === "DJ",
  );
  expect(
    bothProfiles.find(
      (p: { profession: string }) => p.profession === "Photographe",
    ),
  ).toEqual(photographer);
  expect(dj.id).not.toBe(photographer.id);
  expect(dj.data.availability.weekly).toEqual([
    { weekday: 0, start: "18:00", end: "03:00", overnight: true },
  ]);
  expect(
    (await (await request.get("/api/me/card")).json()).data.profession,
  ).toBe("Photographe");
  await page.getByRole("button", { name: "← Ma carte", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Mariage concerné", exact: true })
    .selectOption(b.id);
  await page.getByRole("button", { name: "Voir mes informations" }).click();
  await expect(page.getByTestId("participation-summary")).toBeVisible();
  await expect(page.getByLabel("Prénom", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Modifier mon rôle" }).click();
  await page.getByLabel("Témoin", { exact: true }).check();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "← Retour", exact: true }).click();
  await expect(page.getByTestId("participation-summary")).toBeVisible();
  await expect(page.getByTestId("participation-summary")).not.toContainText(
    "Témoin",
  );
  await page.getByRole("button", { name: "Modifier mon rôle" }).click();

  await expect(page.getByLabel("Invité", { exact: true })).toBeChecked();
  await expect(page.getByLabel("Témoin", { exact: true })).not.toBeChecked();
  await page.getByLabel("DJ", { exact: true }).check();
  await page.getByLabel("Frère", { exact: true }).check();
  await page.getByRole("button", { name: "Continuer", exact: true }).click();
  await page
    .getByRole("combobox", { name: "RSVP", exact: true })
    .selectOption("present");
  await page.getByLabel("Arrivée", { exact: true }).fill("2027-06-13T20:00");
  await page.getByLabel("Départ", { exact: true }).fill("2027-06-14T01:00");
  await page.getByRole("button", { name: "Continuer", exact: true }).click();
  await expect(
    page.getByRole("button", {
      name: "Utiliser mes réglages Photographe",
      exact: true,
    }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Utiliser mes réglages DJ", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "Compatible avec vos disponibilités",
  );
  await page
    .getByRole("button", { name: "Valider ma participation", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: /^Ma carte(?: est prête)?$/ }),
  ).toBeVisible();
  const finalRows = await (await request.get("/api/projects")).json();
  const finalA = finalRows.find((row: { id: string }) => row.id === a.id),
    finalB = finalRows.find((row: { id: string }) => row.id === b.id);
  expect(finalA.data.timeline).toEqual(linked.data.timeline);
  expect(finalA.data.cardParticipants[0].functioning[0].profileId).toBe(
    photographer.id,
  );
  expect(finalB.data.cardParticipants[0].functioning[0].profileId).toBe(dj.id);
  expect(finalB.data.cardParticipants[0].participation.roles).toEqual([
    "Invité",
    "DJ",
    "Frère",
  ]);
  expect(
    finalB.data.timeline.find(
      (e: { title: string }) => e.title === "Jean Dupont · DJ",
    ).durationMinutes,
  ).toBe(240);
  expect(JSON.stringify(finalB.data)).not.toContain("Galerie privée");
  expect(JSON.stringify(finalA.data)).not.toContain("Régie DJ uniquement");
  await page.screenshot({
    path: testInfo.outputPath("card-ready-two-professions.png"),
    fullPage: true,
  });
  await page.reload();
  await expect(
    page.getByRole("heading", { name: /^Ma carte(?: est prête)?$/ }),
  ).toBeVisible();
  await expect(page.getByLabel("Prénom", { exact: true })).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Jean Dupont", exact: true }),
  ).toBeVisible();
  const beforeIdentityChange = await (
    await request.get(`/api/projects/${a.id}/my-participation`)
  ).json();
  const beforeProfiles = await (
    await request.get("/api/me/professional-profiles")
  ).json();
  await page
    .getByRole("button", { name: "Modifier ma carte", exact: true })
    .click();
  await page.getByLabel("Nom", { exact: true }).fill("Dupont-Martin");
  await page
    .getByRole("button", { name: "Enregistrer mes modifications", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: /^Ma carte(?: est prête)?$/ }),
  ).toBeVisible();
  const afterIdentityChange = await (await request.get("/api/projects")).json();
  for (const id of [a.id, b.id]) {
    const row = afterIdentityChange.find((r: { id: string }) => r.id === id);
    expect(row.data.cardParticipants[0].card.lastName).toBe("Dupont-Martin");
    expect(
      row.data.timeline.some((e: { title: string }) =>
        e.title.startsWith("Jean Dupont-Martin ·"),
      ),
    ).toBe(true);
    expect(row.data.guests).toEqual([]);
  }
  expect(
    await (await request.get(`/api/projects/${a.id}/my-participation`)).json(),
  ).toEqual(beforeIdentityChange);
  expect(
    await (await request.get("/api/me/professional-profiles")).json(),
  ).toEqual(beforeProfiles);
  const width = await page.evaluate(() => ({
    full: document.documentElement.scrollWidth,
    screen: innerWidth,
  }));
  expect(width.full).toBeLessThanOrEqual(width.screen);
  expect(errors).toEqual([]);
});

test("RSVP — validation puis consentement, sans redemander l’identité ni recopier les réponses", async ({
  page,
  request,
}, testInfo) => {
  await page.addInitScript(() =>
    localStorage.setItem("aime-preview-session", "1"),
  );
  const project = await (
    await request.post("/api/projects", {
      data: {
        title: "Test RSVP explicite",
        data: {
          schemaVersion: 2,
          universe: "Mariage",
          pivot: {
            value: Date.parse("2027-06-12T14:00:00Z"),
            confidence: "confirme",
          },
          timeline: [],
          tasks: [],
          guests: [],
          providers: [],
          payments: [],
        },
      },
    })
  ).json();
  const token = "11111111-2222-4333-8444-555555555555";
  let confirmed = false,
    writes = 0;
  // UI contract only; real SQL proof, uniqueness and preservation are covered by claimRsvp.test.ts.
  await page.route(`**/api/rsvp/${token}/claim`, async (route) => {
    if (route.request().method() === "POST") {
      expect(route.request().postDataJSON()).toEqual({ confirmed: true });
      confirmed = true;
      writes++;
    }
    await route.fulfill({
      json: {
        projectId: project.id,
        projectTitle: project.title,
        guestName: "Jean Dupont",
        alreadyClaimed: false,
        confirmed,
      },
    });
  });
  await page.route(`**/api/projects/${project.id}/my-participation`, (route) =>
    route.fulfill({
      json: {
        roles: ["Invité"],
        rsvp: "present",
        companions: 1,
        moments: ["Dîner"],
        arrival: "",
        departure: "",
        allergens: "",
        dietary: "Réponse RSVP conservée",
        needs: "",
        notes: "Note RSVP conservée",
        slots: [],
        assignments: [],
        linkedRsvp: { token, revoked: false },
      },
    }),
  );
  await page.goto(`/ma-carte?invitation=${token}`);
  await expect(
    page.getByRole("heading", { name: "Rejoindre un mariage" }),
  ).toBeVisible();
  await expect(page.getByLabel("Prénom", { exact: true })).toHaveCount(0);
  expect(writes).toBe(0);
  await page.getByRole("button", { name: "Vérifier mon invitation" }).click();
  await expect(
    page.getByText("Adresse vérifiée · Invitation validée"),
  ).toBeVisible();
  expect(writes).toBe(0);
  await expect(
    page.getByRole("button", { name: "Associer cette invitation à ma carte" }),
  ).toBeDisabled();
  await page.getByRole("checkbox").check();
  await page
    .getByRole("button", { name: "Associer cette invitation à ma carte" })
    .click();
  await expect(page.getByRole("heading", { name: "Votre rôle" })).toBeVisible();
  expect(writes).toBe(1);
  await expect(page.getByLabel("Invité", { exact: true })).toBeChecked();
  await page.getByRole("button", { name: "Continuer", exact: true }).click();
  await expect(
    page.getByRole("combobox", { name: "RSVP", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("textbox", {
      name: "Contraintes alimentaires",
      exact: true,
    }),
  ).toHaveValue("Réponse RSVP conservée");
  await expect(
    page.getByRole("textbox", {
      name: "Contraintes alimentaires",
      exact: true,
    }),
  ).toBeDisabled();
  await expect(
    page.getByRole("textbox", { name: "Besoins particuliers", exact: true }),
  ).toBeEnabled();
  await expect(
    page.getByRole("link", { name: "Modifier mes réponses RSVP" }),
  ).toHaveAttribute("href", `/rsvp/${token}`);
  await page.screenshot({
    path: testInfo.outputPath("claimed-rsvp-canonical.png"),
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

/*
 * Le parcours d'entrée est désormais un seul Oneboarding : une porte, puis
 * « Question 1 sur 5 » … « Question 5 sur 5 ». Les trois portes d'avant
 * (`landing-entry`, `landing-start-blank`) n'existent plus ; « Voir ma carte »,
 * « Créer un mariage » et « Outils avancés » ont quitté la porte d'entrée.
 */

/** Le repère « Question X sur 5 » : `aria-valuemax` reste 5, quel que soit le tunnel. */
const progressbar = (page: Page) =>
  page.getByTestId("oneboarding").getByRole("progressbar");
const step = (page: Page, n: number) =>
  progressbar(page).and(page.locator(`[aria-valuenow="${n}"]`));

test("Première visite — je me présente, puis je crée mon mariage", async ({
  page,
}) => {
  let ownCard: unknown = null;
  await page.route("**/api/me/card", async (route) => {
    if (route.request().method() === "PUT")
      ownCard = {
        userId: "draft-user",
        data: route.request().postDataJSON().data,
        updatedAt: new Date().toISOString(),
      };
    await route.fulfill({ json: ownCard });
  });
  await page.route("**/api/me/professional-profiles", (route) =>
    route.fulfill({ json: [] }),
  );

  await page.goto("/");

  /* ---- Une seule porte : la promesse, puis une action. ---- */
  const entry = page.getByTestId("oneboarding-entry");
  await expect(entry).toContainText("Votre carte BYAIME");
  await expect(entry).toContainText("Votre identité. Une seule fois.");
  await expect(
    entry.getByRole("button", { name: "Créer ma carte", exact: true }),
  ).toBeVisible();
  await expect(entry).toContainText("Vous ne créez pas encore un mariage");
  /* Les anciennes portes parallèles ne reviennent pas. */
  await expect(page.getByTestId("landing-start-blank")).toHaveCount(0);
  await expect(entry.getByRole("button", { name: "Créer un mariage" })).toHaveCount(0);
  await expect(entry.getByRole("button", { name: "Outils avancés" })).toHaveCount(0);

  await page.getByTestId("landing-create-primary").click();

  /* ---- Question 1 sur 5 : la personne, jamais le mariage. ---- */
  await expect(step(page, 1)).toBeVisible();
  await expect(progressbar(page)).toHaveAttribute("aria-valuemax", "5");
  const first = page.getByTestId("oneboarding-step-person");
  await expect(first.getByRole("heading", { name: "Commençons par vous" })).toBeVisible();
  await first.getByLabel("Prénom", { exact: true }).fill("Camille");
  await first.getByLabel("Nom", { exact: true }).fill("Martin");

  /* La musique reste une expression personnelle — et facultative. */
  await page.route("https://itunes.apple.com/search?**", (route) =>
    route.abort("failed"),
  );
  await first.getByLabel("Votre musique", { exact: true }).fill("La vie en rose");
  await first.getByRole("button", { name: "Rechercher un morceau" }).click();
  await expect(first.getByRole("alert")).toContainText("continuer sans musique");
  await first.getByRole("button", { name: "Continuer sans musique" }).click();
  await expect(first.getByRole("alert")).toHaveCount(0);

  /* Enregistrer la carte — et rien d'autre : aucun mariage n'est créé ici. */
  await page.getByTestId("oneboarding-submit").click();
  await expect(page.getByTestId("oneboarding-step-person")).toHaveCount(0);

  /* ---- Question 2 sur 5 : le rôle dans ce mariage. ---- */
  await expect(step(page, 2)).toBeVisible();
  const role = page.getByTestId("oneboarding-step-role");
  await expect(role.getByRole("heading", { name: "Votre rôle" })).toBeVisible();
  await expect(role).toContainText("Ce choix concerne ce mariage, pas votre carte");
  await role.getByRole("checkbox", { name: "Mariée", exact: true }).check();
  await page.getByTestId("oneboarding-submit").click();

  /* ---- Question 3 sur 5 : le mariage. Créer, ou rejoindre. ---- */
  await expect(step(page, 3)).toBeVisible();
  const wedding = page.getByTestId("oneboarding-step-wedding");
  await expect(wedding.getByRole("heading", { name: "Le mariage" })).toBeVisible();
  await expect(wedding).toContainText("Que souhaitez-vous faire ?");
  await page.getByTestId("oneboarding-wedding-create").click();

  /* Les cinq questions existantes, absorbées par l'Oneboarding. */
  await wedding.getByLabel("Quand a lieu le mariage ?", { exact: true }).fill("14 août 2027");
  await wedding.getByLabel("Où aura-t-il lieu ?", { exact: true }).fill("Lille");
  await wedding.getByLabel("Combien d’invités ?", { exact: true }).fill("120");
  await wedding.getByLabel("Quel est votre budget ?", { exact: true }).fill("20000");
  await wedding.getByLabel("Quelle ambiance ?", { exact: true }).fill("champêtre");
  await page.getByTestId("oneboarding-currency-EUR").click();
  await expect(
    page.getByRole("button", { name: "Créer ce mariage", exact: true }),
  ).toBeVisible();
  await page.getByTestId("oneboarding-submit").click();

  /* ---- Questions 4 et 5 : l'organisation, puis la Timeline. ---- */
  await expect(step(page, 4)).toBeVisible();
  await page.getByTestId("oneboarding-submit").click();
  await expect(step(page, 5)).toBeVisible();
  const confirm = page.getByTestId("oneboarding-step-confirm");
  await expect(
    confirm.getByRole("heading", { name: "Ma Timeline est prête" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Ouvrir ma Timeline", exact: true })
    .click();
  await page.waitForURL("**/user-portal**");

  /* La carte a bien été écrite sur le serveur, sans passer par une phrase. */
  expect(ownCard).not.toBeNull();
  const data = (ownCard as { data: Record<string, unknown> }).data;
  expect(data.firstName).toBe("Camille");
  expect(data.lastName).toBe("Martin");
});

test("Déjà inscrit — « Ma carte », et l'étape 1 en lecture seule avec Modifier", async ({
  page,
}) => {
  await page.route("**/api/me/card", (route) =>
    route.fulfill({
      json: {
        userId: "known-user",
        version: 3,
        data: {
          firstName: "Camille",
          lastName: "Martin",
          nickname: "",
          city: "Lille",
          profession: "Photographe",
          photoUrl: "",
          interests: ["jazz"],
        },
        updatedAt: new Date().toISOString(),
      },
    }),
  );
  await page.route("**/api/me/professional-profiles", (route) =>
    route.fulfill({ json: [] }),
  );
  await page.goto("/");

  /* Une carte existe : la porte le dit, et ne redemande rien. */
  const entry = page.getByTestId("oneboarding-entry");
  await expect(
    entry.getByRole("button", { name: "Ma carte", exact: true }),
  ).toBeVisible();
  await expect(entry).toContainText("Bonjour Camille");
  await page.getByTestId("landing-create-primary").click();

  /* Le repère reste « sur 5 » : une étape déjà connue ne raccourcit pas le parcours. */
  await expect(step(page, 1)).toBeVisible();
  const first = page.getByTestId("oneboarding-step-person");
  await expect(first).toContainText("Camille Martin");
  await expect(first.getByLabel("Prénom", { exact: true })).toHaveCount(0);
  await page.getByTestId("known-summary-edit").click();
  await expect(first.getByLabel("Prénom", { exact: true })).toHaveCount(1);
  await expect(first.getByLabel("Prénom", { exact: true })).toHaveValue("Camille");
});

test("Deux mariages homonymes — date et lieu dans le choix et le bandeau", async ({
  page,
  request,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("aime-preview-session", "1"),
  );
  const create = async (date: string, city: string, venue: string) =>
    await (
      await request.post("/api/projects", {
        data: {
          title: "Notre Mariage",
          data: {
            schemaVersion: 2,
            universe: "Mariage",
            pivot: { value: Date.parse(date), confidence: "confirme" },
            city: { value: city, confidence: "confirme" },
            venue: { value: venue, confidence: "confirme" },
            timeline: [],
            tasks: [],
            guests: [],
            providers: [],
            payments: [],
          },
        },
      })
    ).json();
  const a = await create("2027-06-12T12:00:00Z", "Paris", "Domaine des Pins");
  const b = await create("2027-06-19T12:00:00Z", "Lyon", "");
  await page.goto("/ma-carte");
  const choice = page.getByRole("combobox", {
    name: "Mariage concerné",
    exact: true,
  });
  await expect(choice.locator(`option[value="${a.id}"]`)).toHaveText(
    "Notre Mariage · 12 juin 2027 · Domaine des Pins · Paris",
  );
  await expect(choice.locator(`option[value="${b.id}"]`)).toHaveText(
    "Notre Mariage · 19 juin 2027 · Lyon",
  );
  await choice.selectOption(b.id);
  await page.getByRole("button", { name: "Préparer ma participation" }).click();
  await expect(page.getByTestId("universal-card-form")).toContainText(
    "Notre Mariage · 19 juin 2027 · Lyon",
  );
  await expect(page.getByLabel("Prénom", { exact: true })).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
