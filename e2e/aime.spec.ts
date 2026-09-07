import { expect, test } from '@playwright/test';

const live = process.env.AIME_E2E_RUN === '1' && Boolean(process.env.AIME_E2E_OWNER_STATE);

test.describe('mariage complet AIME', () => {
  test.skip(!live, 'E2E live désactivée : fournir AIME_E2E_RUN=1 et AIME_E2E_OWNER_STATE');

  test('persiste le projet, protège les rôles, gère les documents, RSVP et e-mails', async ({ page, context, browser }) => {
    const projectTitle = `E2E AIME ${Date.now()}`;
    const collaboratorEmail = process.env.AIME_E2E_COLLABORATOR_EMAIL ?? 'collaborator@example.com';
    const collaboratorState = process.env.AIME_E2E_COLLABORATOR_STATE;
    const api = async (path: string, init?: RequestInit) => {
      const response = await context.request.fetch(`/api${path}`, init);
      const body = response.status === 204 ? undefined : await response.json().catch(() => ({}));
      return { response, body };
    };

    await page.goto('/');
    await expect(page.getByTestId('portal')).toBeVisible();
    await page.getByTestId('demo-project').click();
    await expect(page.getByTestId('sync-status')).toHaveText('Enregistré', { timeout: 20_000 });

    await page.getByTestId('settings-open').click();
    await expect(page.getByTestId('settings-panel')).toBeVisible();
    const projectId = await page.getByTestId('settings-panel').locator('select').inputValue();
    expect(projectId).toMatch(/^[0-9a-f-]{36}$/i);
    // A fresh context models a browser reconnect while preserving Clerk's saved session.
    const reconnected = await browser.newContext({ storageState: process.env.AIME_E2E_OWNER_STATE });
    const reconnectedPage = await reconnected.newPage();
    await reconnectedPage.goto('/user-portal');
    await expect(reconnectedPage.getByTestId('portal')).toBeVisible();
    await reconnectedPage.getByTestId('settings-open').click();
    await expect(reconnectedPage.getByTestId('settings-panel').locator('select')).toHaveValue(projectId);
    await reconnected.close();

    const project = (await api('/projects')).body.find((item: { id: string }) => item.id === projectId);
    const updated = { ...project.data, e2eMarker: projectTitle };
    const saved = await api(`/projects/${projectId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: projectTitle, data: updated, updatedAt: project.updatedAt }),
    });
    expect(saved.response.status()).toBe(200);
    expect(saved.body.title).toBe(projectTitle);

    const invitation = await api(`/projects/${projectId}/invitations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: collaboratorEmail, role: 'viewer' }),
    });
    expect([201, 502]).toContain(invitation.response.status());
    if (invitation.response.status() === 201) {
      const denied = await api(`/projects/${projectId}/invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'e2e-denied@example.com', role: 'owner' }),
      });
      expect(denied.response.status()).toBe(400);
      if (collaboratorState) {
        const collaborator = await browser.newContext({ storageState: collaboratorState });
        const collaboratorApi = collaborator.request;
        const accepted = await collaboratorApi.post(`/api/invitations/${invitation.body.token}/accept`);
        expect(accepted.status()).toBe(200);
        const forbiddenUpdate = await collaboratorApi.put(`/api/projects/${projectId}`, {
          headers: { 'Content-Type': 'application/json' },
          data: { title: 'Interdit', data: updated, updatedAt: saved.body.updatedAt },
        });
        expect(forbiddenUpdate.status()).toBe(403);
        const forbiddenUpload = await collaboratorApi.post('/api/storage/uploads/request-url', {
          headers: { 'Content-Type': 'application/json' },
          data: { projectId, name: 'interdit.pdf', contentType: 'application/pdf', size: 4 },
        });
        expect(forbiddenUpload.status()).toBe(403);
        await collaborator.close();
      }
    }

    const file = await api('/storage/uploads/request-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, name: 'contrat-e2e.pdf', contentType: 'application/pdf', size: 4 }),
    });
    expect(file.response.status()).toBe(200);
    const upload = await context.request.put(file.body.uploadURL, { data: Buffer.from('%PDF') });
    expect(upload.ok()).toBeTruthy();
    const finalized = await api('/storage/files', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, name: 'contrat-e2e.pdf', contentType: 'application/pdf', size: 4, objectPath: file.body.objectPath }),
    });
    expect(finalized.response.status()).toBe(201);
    const fileId = finalized.body.id;
    expect((await api(`/storage/files/${fileId}`)).response.status()).toBe(200);
    expect((await api(`/storage/files/${fileId}`, { method: 'DELETE' })).response.status()).toBe(204);

    const rsvpLink = await api(`/projects/${projectId}/rsvp-links/e2e-guest`, { method: 'POST' });
    expect(rsvpLink.response.status()).toBe(201);
    const publicRsvp = await context.request.newContext();
    const rsvpPage = await publicRsvp.newPage();
    await rsvpPage.goto(`/rsvp/${rsvpLink.body.token}`);
    await expect(rsvpPage.getByTestId('rsvp-page')).toHaveAttribute('data-rsvp-state', 'ready');
    await rsvpPage.getByTestId('rsvp-confirmed').click();
    await rsvpPage.getByLabel('dietary').fill('Sans gluten');
    await rsvpPage.getByTestId('rsvp-submit').click();
    await expect(rsvpPage.getByTestId('rsvp-success')).toBeVisible();
    await publicRsvp.dispose();
    expect((await api(`/projects/${projectId}/rsvp-links/e2e-guest`, { method: 'DELETE' })).response.status()).toBe(204);
    expect((await context.request.get(`/api/rsvp/${rsvpLink.body.token}`)).status()).toBe(404);

    const successfulMessage = await api(`/projects/${projectId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'practical_info', recipients: [collaboratorEmail], subject: 'E2E', body: 'Message E2E', confirmed: true }),
    });
    expect(successfulMessage.response.status()).toBe(201);
    const failedMessage = await api(`/projects/${projectId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-aime-e2e-provider': 'failure' },
      body: JSON.stringify({ kind: 'practical_info', recipients: [collaboratorEmail], subject: 'E2E failure', body: 'Message E2E failure', confirmed: true }),
    });
    expect(failedMessage.response.status()).toBe(502);
    const journal = await api(`/projects/${projectId}/messages`);
    expect(journal.response.status()).toBe(200);
    expect(journal.body.some((item: { status: string }) => item.status === 'sent')).toBeTruthy();
    expect(journal.body.some((item: { status: string }) => item.status === 'failed' && item.providerError)).toBeTruthy();
  });
});