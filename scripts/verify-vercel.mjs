import { execFileSync } from "node:child_process";
import { access, readFile, rm, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const corepackCommand = process.platform === "win32" ? "corepack.cmd" : "corepack";
const requiredEntrypoints = [
  "artifacts/byaime-onepage/api/index.js",
  "artifacts/byaime-onepage/api/[...path].js",
];
const vercelConfigPath = "artifacts/byaime-onepage/vercel.json";
const expectedBundles = [
  "artifacts/byaime-onepage/dist/public/index.html",
  "artifacts/api-server/dist/index.mjs",
  "artifacts/api-server/dist/app.mjs",
  "artifacts/api-server/dist/pino-worker.mjs",
  "artifacts/api-server/dist/pino-file.mjs",
  "artifacts/api-server/dist/pino-pretty.mjs",
  "artifacts/api-server/dist/thread-stream-worker.mjs",
];
const generatedPathsToClean = [
  "artifacts/api-server/dist",
  "artifacts/byaime-onepage/dist",
  "artifacts/mockup-sandbox/dist",
  "lib/aime-domain/dist",
  "lib/api-client-react/dist",
  "lib/api-zod/dist",
  "lib/db/dist",
];
const deploymentProbeId = "00000000-0000-0000-0000-000000000000";
const requiredRoutingChecks = [
  { requestPath: "/api", expectedDestination: "/api/index.js" },
  { requestPath: "/api/healthz", expectedDestination: "/api/[...path].js" },
  { requestPath: "/api/projects", expectedDestination: "/api/[...path].js" },
  { requestPath: `/api/projects/${deploymentProbeId}`, expectedDestination: "/api/[...path].js" },
  { requestPath: "/api/cron/scheduled-messages", expectedDestination: "/api/[...path].js" },
  { requestPath: "/profile", expectedDestination: "/index.html" },
];
const requiredDeploymentChecks = [
  { path: "/api/healthz", expectedStatuses: [200] },
  { path: "/api/projects", expectedStatuses: [401] },
  { path: `/api/projects/${deploymentProbeId}`, expectedStatuses: [401, 403, 404] },
  { path: "/api/cron/scheduled-messages", expectedStatuses: [401, 503] },
];

function run(command, args) {
  execFileSync(command, args, {
    cwd: rootDir,
    stdio: "inherit",
    env: process.env,
  });
}

function trackedFiles() {
  return execFileSync("git", ["ls-files"], {
    cwd: rootDir,
    encoding: "utf8",
  })
    .split("\n")
    .filter(Boolean);
}

function isForbiddenTrackedArtifact(filePath) {
  return (
    /(^|\/)\$\$ts-node\$\$(\/|$)/.test(filePath)
    || /(^|\/)(dist|build|out-tsc)(\/|$)/.test(filePath)
    || filePath.endsWith(".map")
    || filePath.endsWith(".tsbuildinfo")
    || /^artifacts\/api-server\/src\/.+\.js$/.test(filePath)
  );
}

async function removePath(relativePath) {
  await rm(path.join(rootDir, relativePath), { recursive: true, force: true });
}

async function removeTsBuildInfoFiles(currentDir) {
  const entries = await import("node:fs/promises").then(({ readdir }) =>
    readdir(currentDir, { withFileTypes: true }),
  );
  await Promise.all(entries.map(async (entry) => {
    const entryPath = path.join(currentDir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === ".git" || entry.name === "node_modules") return;
      await removeTsBuildInfoFiles(entryPath);
      return;
    }
    if (entry.name.endsWith(".tsbuildinfo")) {
      await rm(entryPath, { force: true });
    }
  }));
}

async function assertExists(relativePath) {
  await access(path.join(rootDir, relativePath));
}

async function readJson(relativePath) {
  return JSON.parse(await readFile(path.join(rootDir, relativePath), "utf8"));
}

async function assertEntrypoint(relativePath) {
  const contents = await readFile(path.join(rootDir, relativePath), "utf8");
  if (!contents.includes('../../api-server/dist/app.mjs')) {
    throw new Error(`${relativePath} must import ../../api-server/dist/app.mjs`);
  }
  if (contents.includes(".ts")) {
    throw new Error(`${relativePath} must not import TypeScript source files`);
  }
}

async function assertEntrypointLoads(relativePath) {
  const originalDatabaseUrl = process.env.DATABASE_URL;
  process.env.DATABASE_URL =
    originalDatabaseUrl || "postgres://localhost:5432/byaime";
  try {
    const moduleUrl = `${pathToFileURL(path.join(rootDir, relativePath)).href}?t=${Date.now()}`;
    const loaded = await import(moduleUrl);
    if (!loaded.default) {
      throw new Error(`${relativePath} is missing a default export`);
    }
  } finally {
    if (originalDatabaseUrl) process.env.DATABASE_URL = originalDatabaseUrl;
    else delete process.env.DATABASE_URL;
  }
}

function findRouteDestination(routes, requestPath) {
  for (const route of routes) {
    if (typeof route?.src !== "string" || typeof route?.dest !== "string") {
      continue;
    }
    if (new RegExp(route.src).test(requestPath)) {
      return route.dest;
    }
  }
  return null;
}

async function assertVercelRouting() {
  const config = await readJson(vercelConfigPath);
  if (!Array.isArray(config.routes)) {
    throw new Error(`${vercelConfigPath} must define explicit routes for /api`);
  }

  for (const { requestPath, expectedDestination } of requiredRoutingChecks) {
    const actualDestination = findRouteDestination(config.routes, requestPath);
    if (actualDestination !== expectedDestination) {
      throw new Error(
        `${vercelConfigPath} must route ${requestPath} to ${expectedDestination} (received ${actualDestination ?? "no match"})`,
      );
    }
  }
}

function deploymentBaseUrl() {
  const rawValue =
    process.env.VERCEL_VERIFY_DEPLOYMENT_URL
    || process.env.VERCEL_DEPLOYMENT_URL
    || process.env.VERCEL_URL;
  if (!rawValue) return undefined;
  const normalized = rawValue.replace(/\/$/, "");
  return /^https?:\/\//.test(normalized) ? normalized : `https://${normalized}`;
}

async function assertDeploymentRoute(baseUrl, { path: requestPath, expectedStatuses }) {
  const response = await fetch(new URL(requestPath, `${baseUrl}/`), {
    redirect: "manual",
    headers: {
      accept: "application/json",
    },
  });
  const vercelError = response.headers.get("x-vercel-error");
  if (vercelError === "NOT_FOUND") {
    throw new Error(`${requestPath} returned Vercel NOT_FOUND instead of reaching the app`);
  }
  if (!expectedStatuses.includes(response.status)) {
    const body = (await response.text()).slice(0, 300);
    throw new Error(
      `${requestPath} returned ${response.status}; expected ${expectedStatuses.join("/")}.\n${body}`,
    );
  }
}

async function assertDeploymentRouting() {
  const baseUrl = deploymentBaseUrl();
  if (!baseUrl) {
    return;
  }
  await Promise.all(requiredDeploymentChecks.map((check) => assertDeploymentRoute(baseUrl, check)));
}

async function main() {
  const forbiddenTracked = trackedFiles().filter(isForbiddenTrackedArtifact);
  if (forbiddenTracked.length > 0) {
    throw new Error(`Forbidden generated artifacts are still tracked by Git:\n${forbiddenTracked.join("\n")}`);
  }

  await Promise.all(generatedPathsToClean.map(removePath));
  await removeTsBuildInfoFiles(rootDir);

  run(corepackCommand, ["pnpm", "--filter", "@workspace/byaime-onepage", "run", "build"]);

  await Promise.all(expectedBundles.map(assertExists));
  await Promise.all(requiredEntrypoints.map(assertExists));
  await Promise.all(requiredEntrypoints.map(assertEntrypoint));
  await assertVercelRouting();

  if ((await stat(path.join(rootDir, "artifacts/byaime-onepage/$$ts-node$$")).catch(() => null)) !== null) {
    throw new Error("artifacts/byaime-onepage/$$ts-node$$ must not be generated by the Vercel build");
  }

  await Promise.all(requiredEntrypoints.map(assertEntrypointLoads));
  await assertDeploymentRouting();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
