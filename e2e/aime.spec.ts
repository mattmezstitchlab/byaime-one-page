import { expect, test, type BrowserContext } from "@playwright/test";
import { clerk, setupClerkTestingToken } from "@clerk/testing/playwright";

async function hideDevelopmentBanner(context: BrowserContext) {
  await context.addInitScript(() => {
    const removeBanner = () =>
      document.getElementById("replit-dev-banner")?.remove();
    const observe = () => {
      removeBanner();
      new MutationObserver(removeBanner).observe(document.documentElement, {
        childList: true,
        subtree: true,
      });
    };
    if (document.documentElement) observe();
    else document.addEventListener("DOMContentLoaded", observe, { once: true });
  });
}

const live =
  process.env.AIME_E2E_RUN === "1" &&
  Boolean(process.env.AIME_E2E_OWNER_STATE) &&
  Boolean(process.env.AIME_E2E_COLLABORATOR_STATE) &&
  Boolean(process.env.AIME_E2E_COLLABORATOR_EMAIL) &&
  Boolean(process.env.AIME_E2E_SWITCHING_OWNER_EMAIL);

test.describe("mariage complet AIME", () => {
  test.skip(
    !live,
    "E2E live désactivée : fournir AIME_E2E_RUN=1, les deux sessions Clerk et les e-mails collaborateur et propriétaire de bascule",
  );

  test("persiste le projet, protège les rôles, gère les documents, RSVP et e-mails", async ({
    page,
    context,
    browser,
  }) => {
    const projectTitle = `E2E AIME ${Date.now()}`;
    const switchingOwnerEmail = process.env.AIME_E2E_SWITCHING_OWNER_EMAIL!;
    const collaboratorEmail = process.env.AIME_E2E_COLLABORATOR_EMAIL!;
    const collaboratorState = process.env.AIME_E2E_COLLABORATOR_STATE!;
    const baseURL = process.env.AIME_E2E_BASE_URL!;
    const api = async (
      path: string,
      init?: {
        method?: string;
        headers?: Record<string, string>;
        body?: string;
      },
    ) => {
      const { body: requestBody, ...options } = init ?? {};
      const response = await context.request.fetch(`/api${path}`, {
        ...options,
        data: requestBody,
      });
      const body: any =
        response.status() === 204
          ? undefined
          : await response.json().catch(() => ({}));
      return { response, body };
    };

    await hideDevelopmentBanner(context);
    await setupClerkTestingToken({ page });
    await page.goto("/user-portal");
    await expect(page.getByTestId("portal")).toBeVisible();
    const existingProjectsResponse = await api("/projects");
    expect(existingProjectsResponse.response.status()).toBe(200);
    expect(Array.isArray(existingProjectsResponse.body)).toBeTruthy();
    const existingProjects = existingProjectsResponse.body;
    for (const existingProject of existingProjects) {
      const removed = await api(`/projects/${existingProject.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: "SUPPRIMER" }),
      });
      expect(removed.response.status()).toBe(204);
    }
    await page.reload();
    await expect(page.getByTestId("portal")).toBeVisible();
    await expect(page.getByTestId("demo-project")).toBeVisible();
    await page.getByTestId("demo-project").click();
    await expect(page.getByTestId("settings-open")).toBeVisible();
    await expect(page.getByTestId("sync-status")).toHaveAttribute(
      "data-sync-status",
      "saved",
      { timeout: 20_000 },
    );

    await page.getByTestId("sync-status").click();
    await page.getByTestId("me-open").click();
    await expect(page.getByTestId("settings-panel")).toBeVisible();
    const projectId = await page
      .getByTestId("active-project-select")
      .inputValue();
    expect(projectId).toMatch(/^[0-9a-f-]{36}$/i);
    // A fresh context models a browser reconnect while preserving Clerk's saved session.
    const reconnected = await browser.newContext({
      storageState: process.env.AIME_E2E_OWNER_STATE,
      baseURL,
    });
    await hideDevelopmentBanner(reconnected);
    const reconnectedPage = await reconnected.newPage();
    await setupClerkTestingToken({ page: reconnectedPage });
    await reconnectedPage.goto("/user-portal");
    await expect(reconnectedPage.getByTestId("portal")).toBeVisible();
    await reconnectedPage.getByTestId("sync-status").click();
    await reconnectedPage.getByTestId("me-open").click();
    await expect(
      reconnectedPage.getByTestId("active-project-select"),
    ).toHaveValue(projectId);
    await reconnected.close();

    let project = (await api("/projects")).body.find(
      (item: { id: string }) => item.id === projectId,
    );
    if (!project.data.guests?.[0]?.id) {
      const guestId = `e2e-guest-${Date.now()}`;
      const seededProject = await api(`/projects/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: project.title,
          data: {
            ...project.data,
            guests: [
              {
                id: guestId,
                name: "Invité E2E",
                role: "invite",
                rsvp: "en_attente",
                attendance: {
                  ceremony: true,
                  cocktail: true,
                  dinner: true,
                  brunch: false,
                },
              },
            ],
          },
          updatedAt: project.updatedAt,
        }),
      });
      expect(seededProject.response.status()).toBe(200);
      project = seededProject.body;
    }
    const rsvpGuestId = project.data.guests?.[0]?.id as string;
    expect(rsvpGuestId).toBeTruthy();

    const secondProjectTitle = `${projectTitle} · second`;
    const secondProject = await api("/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: secondProjectTitle,
        data: {
          ...project.data,
          id: crypto.randomUUID(),
          title: secondProjectTitle,
        },
      }),
    });
    expect(secondProject.response.status()).toBe(201);

    await page.reload();
    await expect(page.getByTestId("portal")).toBeVisible();
    await page.getByTestId("sync-status").click();
    await page.getByTestId("me-open").click();
    const projectSelector = page.getByTestId("active-project-select");
    await expect(projectSelector.locator("option")).toHaveCount(2);
    await projectSelector.selectOption(secondProject.body.id);
    await expect(projectSelector).toHaveValue(secondProject.body.id);
    await expect(page.getByTestId("sync-status")).toHaveAttribute(
      "data-sync-status",
      "saved",
    );
    await page.reload();
    await page.getByTestId("sync-status").click();
    await page.getByTestId("me-open").click();
    await expect(page.getByTestId("active-project-select")).toHaveValue(
      secondProject.body.id,
    );
    await page.getByTestId("active-project-select").selectOption(projectId);
    await expect(page.getByTestId("active-project-select")).toHaveValue(
      projectId,
    );
    await expect(page.getByTestId("sync-status")).toHaveAttribute(
      "data-sync-status",
      "saved",
    );
    await page.getByLabel("Fermer").click();

    const isolatedProjectTitle = `${projectTitle} · compte isolé`;
    const switchingAccount = await browser.newContext({
      baseURL,
      storageState: { cookies: [], origins: [] },
    });
    await hideDevelopmentBanner(switchingAccount);
    const switchingPage = await switchingAccount.newPage();
    await setupClerkTestingToken({ page: switchingPage });
    await switchingPage.goto("/");
    await clerk.signIn({
      page: switchingPage,
      emailAddress: switchingOwnerEmail,
    });
    const previousIsolatedProjects =
      await switchingAccount.request.get("/api/projects");
    expect(previousIsolatedProjects.status()).toBe(200);
    for (const previousProject of await previousIsolatedProjects.json()) {
      expect(
        (
          await switchingAccount.request.delete(
            `/api/projects/${previousProject.id}`,
            { data: { confirmation: "SUPPRIMER" } },
          )
        ).status(),
      ).toBe(204);
    }
    const isolatedProjectResponse = await switchingAccount.request.post(
      "/api/projects",
      {
        data: {
          title: isolatedProjectTitle,
          data: {
            ...project.data,
            id: crypto.randomUUID(),
            title: isolatedProjectTitle,
          },
        },
      },
    );
    expect(isolatedProjectResponse.status()).toBe(201);
    const isolatedProject = await isolatedProjectResponse.json();
    await switchingPage.goto("/user-portal");
    await expect(switchingPage.getByTestId("portal")).toBeVisible();
    await expect(switchingPage.getByTestId("settings-open")).toBeVisible();
    await expect(
      switchingPage.getByRole("heading", {
        name: isolatedProjectTitle,
        exact: true,
      }),
    ).toBeVisible();
    const isolatedCacheTitle = await switchingPage.evaluate(() => {
      const key = Object.keys(localStorage).find((item) =>
        item.startsWith("aime-project:"),
      );
      const value = key ? localStorage.getItem(key) : null;
      return value ? JSON.parse(value).title : null;
    });
    expect(isolatedCacheTitle).toBe(isolatedProjectTitle);
    expect(
      (
        await switchingAccount.request.delete(
          `/api/projects/${isolatedProject.id}`,
          { data: { confirmation: "SUPPRIMER" } },
        )
      ).status(),
    ).toBe(204);
    await clerk.signOut({ page: switchingPage });
    await switchingPage.goto("/");
    await clerk.signIn({
      page: switchingPage,
      emailAddress: collaboratorEmail,
    });
    await switchingPage.goto("/user-portal");
    await expect(switchingPage.getByTestId("portal")).toBeVisible();
    await expect(switchingPage.getByTestId("demo-project")).toBeVisible();
    await expect(
      switchingPage.getByText(isolatedProjectTitle, { exact: true }),
    ).toHaveCount(0);
    const isolatedProjects =
      await switchingAccount.request.get("/api/projects");
    expect(isolatedProjects.status()).toBe(200);
    expect(await isolatedProjects.json()).toEqual([]);
    await switchingAccount.close();

    const concurrentWriter = await browser.newContext({
      storageState: process.env.AIME_E2E_OWNER_STATE,
      baseURL,
    });
    await hideDevelopmentBanner(concurrentWriter);
    const concurrentWriterPage = await concurrentWriter.newPage();
    await setupClerkTestingToken({ page: concurrentWriterPage });
    await concurrentWriterPage.goto("/user-portal");
    await expect(concurrentWriterPage.getByTestId("portal")).toBeVisible();
    const writerProjects = await concurrentWriter.request.get("/api/projects");
    expect(writerProjects.status()).toBe(200);
    const writerSnapshot = (await writerProjects.json()).find(
      (item: { id: string }) => item.id === projectId,
    );
    const concurrentTitle = `${projectTitle} · serveur`;
    const concurrentSave = await concurrentWriter.request.put(
      `/api/projects/${projectId}`,
      {
        headers: { "Content-Type": "application/json" },
        data: {
          title: concurrentTitle,
          data: {
            ...writerSnapshot.data,
            e2eConcurrentWinner: concurrentTitle,
          },
          updatedAt: writerSnapshot.updatedAt,
        },
      },
    );
    expect(concurrentSave.status()).toBe(200);

    await page.getByLabel("Éditer le Monde").click();
    await page
      .getByRole("textbox", { name: "Titre", exact: true })
      .fill(`${projectTitle} · navigateur`);
    await page.getByRole("button", { name: "Enregistrer l’ouverture" }).click();
    await expect(page.getByTestId("sync-status")).toHaveAttribute(
      "data-sync-status",
      "conflict",
      { timeout: 20_000 },
    );
    await expect(
      page.getByText(
        "Modification non enregistrée : une autre version du Monde doit être vérifiée",
        { exact: true },
      ),
    ).toBeVisible();
    const persistedAfterConflict = (await api("/projects")).body.find(
      (item: { id: string }) => item.id === projectId,
    );
    expect(persistedAfterConflict.title).toBe(concurrentTitle);
    expect(persistedAfterConflict.data.e2eConcurrentWinner).toBe(
      concurrentTitle,
    );
    await concurrentWriter.close();

    await page.reload();
    await page.getByTestId("sync-status").click();
    await page.getByTestId("me-open").click();
    await expect(page.getByTestId("active-project-select")).toHaveValue(
      projectId,
    );

    const updated = {
      ...persistedAfterConflict.data,
      e2eMarker: projectTitle,
    };
    const saved = await api(`/projects/${projectId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: projectTitle,
        data: updated,
        updatedAt: persistedAfterConflict.updatedAt,
      }),
    });
    expect(saved.response.status()).toBe(200);
    expect(saved.body.title).toBe(projectTitle);

    const invitation = await api(`/projects/${projectId}/invitations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: collaboratorEmail, role: "viewer" }),
    });
    expect(invitation.response.status()).toBe(201);
    const denied = await api(`/projects/${projectId}/invitations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "e2e-denied@example.com",
        role: "owner",
      }),
    });
    expect(denied.response.status()).toBe(400);
    const collaborator = await browser.newContext({
      storageState: collaboratorState,
      baseURL,
    });
    const collaboratorPage = await collaborator.newPage();
    await setupClerkTestingToken({ page: collaboratorPage });
    await collaboratorPage.goto("/user-portal");
    await expect(collaboratorPage.getByTestId("portal")).toBeVisible();
    const collaboratorApi = collaborator.request;
    const accepted = await collaboratorApi.post(
      `/api/invitations/${invitation.body.token}/accept`,
    );
    expect(accepted.status()).toBe(200);
    const forbiddenUpdate = await collaboratorApi.put(
      `/api/projects/${projectId}`,
      {
        headers: { "Content-Type": "application/json" },
        data: {
          title: "Interdit",
          data: updated,
          updatedAt: saved.body.updatedAt,
        },
      },
    );
    expect(forbiddenUpdate.status()).toBe(403);
    const forbiddenUpload = await collaboratorApi.post(
      "/api/storage/uploads/request-url",
      {
        headers: { "Content-Type": "application/json" },
        data: {
          projectId,
          name: "interdit.pdf",
          contentType: "application/pdf",
          size: 4,
        },
      },
    );
    expect(forbiddenUpload.status()).toBe(403);
    await collaborator.close();

    const file = await api("/storage/uploads/request-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId,
        name: "contrat-e2e.pdf",
        contentType: "application/pdf",
        size: 4,
      }),
    });
    expect(file.response.status()).toBe(200);
    const upload = await context.request.put(file.body.uploadURL, {
      data: Buffer.from("%PDF"),
    });
    expect(upload.ok()).toBeTruthy();
    const finalized = await api("/storage/files", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId,
        name: "contrat-e2e.pdf",
        contentType: "application/pdf",
        size: 4,
        objectPath: file.body.objectPath,
        finalizeToken: file.body.finalizeToken,
      }),
    });
    expect(finalized.response.status()).toBe(201);
    const fileId = finalized.body.id;
    expect((await api(`/storage/files/${fileId}`)).response.status()).toBe(200);
    expect(
      (
        await api(`/storage/files/${fileId}`, { method: "DELETE" })
      ).response.status(),
    ).toBe(204);

    const rsvpLink = await api(
      `/projects/${projectId}/rsvp-links/${rsvpGuestId}`,
      {
        method: "POST",
      },
    );
    expect(rsvpLink.response.status()).toBe(201);
    const publicRsvp = await browser.newContext({ baseURL });
    const rsvpPage = await publicRsvp.newPage();
    await rsvpPage.goto(`/rsvp/${rsvpLink.body.token}`);
    await expect(rsvpPage.getByTestId("rsvp-page")).toHaveAttribute(
      "data-rsvp-state",
      "ready",
    );
    await rsvpPage.getByTestId("rsvp-confirmed").click();
    await rsvpPage.getByLabel("dietary").fill("Sans gluten");
    await rsvpPage.getByTestId("rsvp-submit").click();
    await expect(rsvpPage.getByTestId("rsvp-success")).toBeVisible();
    await publicRsvp.close();
    expect(
      (
        await api(`/projects/${projectId}/rsvp-links/${rsvpGuestId}`, {
          method: "DELETE",
        })
      ).response.status(),
    ).toBe(204);
    expect(
      (await context.request.get(`/api/rsvp/${rsvpLink.body.token}`)).status(),
    ).toBe(404);

    const successfulMessage = await api(`/projects/${projectId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "practical_info",
        recipients: [collaboratorEmail],
        subject: "E2E",
        body: "Message E2E",
        confirmed: true,
      }),
    });
    expect(successfulMessage.response.status()).toBe(201);
    const failedMessage = await api(`/projects/${projectId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-aime-e2e-provider": "failure",
      },
      body: JSON.stringify({
        kind: "practical_info",
        recipients: [collaboratorEmail],
        subject: "E2E failure",
        body: "Message E2E failure",
        confirmed: true,
      }),
    });
    expect(failedMessage.response.status()).toBe(502);
    const journal = await api(`/projects/${projectId}/messages`);
    expect(journal.response.status()).toBe(200);
    expect(
      journal.body.some((item: { status: string }) => item.status === "sent"),
    ).toBeTruthy();
    expect(
      journal.body.some(
        (item: { status: string; providerError?: string }) =>
          item.status === "failed" && item.providerError,
      ),
    ).toBeTruthy();
    expect(
      (
        await api(`/projects/${secondProject.body.id}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ confirmation: "SUPPRIMER" }),
        })
      ).response.status(),
    ).toBe(204);
    expect(
      (
        await api(`/projects/${projectId}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ confirmation: "SUPPRIMER" }),
        })
      ).response.status(),
    ).toBe(204);
  });
});
