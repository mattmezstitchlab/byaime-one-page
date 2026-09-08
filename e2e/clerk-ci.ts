import { chromium, expect, type Page } from "@playwright/test";
import {
  clerk,
  clerkSetup,
  setupClerkTestingToken,
} from "@clerk/testing/playwright";
import { randomBytes } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

type ClerkUser = {
  id: string;
  email_addresses?: Array<{
    email_address: string;
    verification?: { status?: string };
  }>;
};

const clerkApi = "https://api.clerk.com/v1";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required for Clerk E2E setup`);
  return value;
}

async function clerkRequest(
  path: string,
  init: RequestInit,
): Promise<Response> {
  const response = await fetch(`${clerkApi}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${required("CLERK_SECRET_KEY")}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  if (!response.ok) {
    throw new Error(
      `Clerk API ${init.method ?? "GET"} ${path} failed (${response.status}): ${await response.text()}`,
    );
  }
  return response;
}

async function deleteClerkUsers(userIds: string[]): Promise<void> {
  const results = await Promise.allSettled(
    userIds.map(async (id) => {
      const response = await fetch(`${clerkApi}/users/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${required("CLERK_SECRET_KEY")}`,
          "Content-Type": "application/json",
        },
      });
      if (!response.ok && response.status !== 404) {
        throw new Error(`Clerk user deletion failed (${response.status})`);
      }
    }),
  );
  const failedUserIds = results.flatMap((result, index) =>
    result.status === "rejected" ? [userIds[index]] : [],
  );
  if (failedUserIds.length > 0) {
    throw new Error(
      `Failed to delete ${failedUserIds.length} Clerk test user(s): ${failedUserIds.join(", ")}`,
    );
  }
}

async function createVerifiedUser(
  email: string,
  firstName: string,
): Promise<ClerkUser> {
  const password = `${randomBytes(24).toString("base64url")}aA9!`;
  const response = await clerkRequest("/users", {
    method: "POST",
    body: JSON.stringify({
      email_address: [email],
      password,
      first_name: firstName,
      last_name: "AIME CI",
      skip_password_checks: true,
    }),
  });
  const user = (await response.json()) as ClerkUser;
  const verified = user.email_addresses?.some(
    (entry) =>
      entry.email_address === email &&
      entry.verification?.status === "verified",
  );
  if (!verified)
    throw new Error(`Clerk did not create ${email} as a verified test account`);
  return user;
}

async function signInAndSave(
  page: Page,
  email: string,
  statePath: string,
): Promise<void> {
  await setupClerkTestingToken({ page });
  await page.goto("/");
  await clerk.signIn({ page, emailAddress: email });
  await page.goto("/user-portal");
  await expect(page.getByTestId("portal")).toBeVisible();
  await page.context().storageState({ path: statePath });
}

export async function setupClerkCI(): Promise<void> {
  const ownerState = required("AIME_E2E_OWNER_STATE");
  const collaboratorState = required("AIME_E2E_COLLABORATOR_STATE");
  const collaboratorEmail = required("AIME_E2E_COLLABORATOR_EMAIL");
  const runId = (process.env.GITHUB_RUN_ID ?? Date.now().toString()).replace(
    /\D/g,
    "",
  );
  const attempt = (process.env.GITHUB_RUN_ATTEMPT ?? "1").replace(/\D/g, "");
  const ownerEmail = `aime-owner-${runId}-${attempt}@example.com`;
  const switchingOwnerEmail = `aime-switching-owner-${runId}-${attempt}@example.com`;
  process.env.AIME_E2E_OWNER_EMAIL = ownerEmail;
  process.env.AIME_E2E_SWITCHING_OWNER_EMAIL = switchingOwnerEmail;
  const userIds: string[] = [];

  try {
    await clerkSetup({
      publishableKey: required("CLERK_PUBLISHABLE_KEY"),
      secretKey: required("CLERK_SECRET_KEY"),
    });
    const owner = await createVerifiedUser(ownerEmail, "Owner");
    userIds.push(owner.id);
    const switchingOwner = await createVerifiedUser(
      switchingOwnerEmail,
      "Switching Owner",
    );
    userIds.push(switchingOwner.id);
    const collaborator = await createVerifiedUser(
      collaboratorEmail,
      "Collaborator",
    );
    userIds.push(collaborator.id);

    const browser = await chromium.launch({
      executablePath: process.env.AIME_E2E_CHROMIUM_EXECUTABLE,
    });
    try {
      const ownerContext = await browser.newContext({
        baseURL: required("AIME_E2E_BASE_URL"),
      });
      await signInAndSave(await ownerContext.newPage(), ownerEmail, ownerState);
      await ownerContext.close();
      const collaboratorContext = await browser.newContext({
        baseURL: required("AIME_E2E_BASE_URL"),
      });
      await signInAndSave(
        await collaboratorContext.newPage(),
        collaboratorEmail,
        collaboratorState,
      );
      await collaboratorContext.close();
    } finally {
      await browser.close();
    }
    await writeFile(
      required("AIME_E2E_CLERK_USERS_FILE"),
      JSON.stringify(userIds),
      { mode: 0o600 },
    );
  } catch (error) {
    try {
      await deleteClerkUsers(userIds);
    } catch (cleanupError) {
      throw new AggregateError(
        [error, cleanupError],
        "Clerk E2E setup and cleanup both failed",
      );
    }
    throw error;
  }
}

export async function teardownClerkCI(): Promise<void> {
  let userIds: string[] = [];
  try {
    userIds = JSON.parse(
      await readFile(required("AIME_E2E_CLERK_USERS_FILE"), "utf8"),
    ) as string[];
  } catch {
    return;
  }
  await deleteClerkUsers(userIds);
}
