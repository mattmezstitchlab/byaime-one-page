import { expect, test } from "@playwright/test";
import { setupClerkTestingToken } from "@clerk/testing/playwright";

const live =
  process.env.AIME_E2E_RUN === "1" &&
  Boolean(process.env.AIME_E2E_OWNER_STATE) &&
  Boolean(process.env.AIME_E2E_COLLABORATOR_STATE) &&
  Boolean(process.env.AIME_E2E_COLLABORATOR_EMAIL);

test.describe("mariage complet AIME", () => {
  test.skip(
    !live,
    "E2E live désactivée : fournir AIME_E2E_RUN=1, les deux sessions Clerk et l’e-mail collaborateur",
  );

  test("persiste le projet, protège les rôles, gère les documents, RSVP et e-mails", async ({
    page,
    context,
    browser,
  }) => {
    const projectTitle = `E2E AIME ${Date.now()}`;
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

    await page.goto("/");
    await expect(page.getByTestId("portal")).toBeVisible();
    const existingProjects = (await api("/projects")).body;
    if (existingProjects.length === 0) {
      await page.getByTestId("demo-project").click();
    }
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

    const project = (await api("/projects")).body.find(
      (item: { id: string }) => item.id === projectId,
    );
    const rsvpGuestId = project.data.guests?.[0]?.id as string;
    expect(rsvpGuestId).toBeTruthy();
    const updated = { ...project.data, e2eMarker: projectTitle };
    const saved = await api(`/projects/${projectId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: projectTitle,
        data: updated,
        updatedAt: project.updatedAt,
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
        await api(`/projects/${projectId}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ confirmation: "SUPPRIMER" }),
        })
      ).response.status(),
    ).toBe(204);
  });
});
