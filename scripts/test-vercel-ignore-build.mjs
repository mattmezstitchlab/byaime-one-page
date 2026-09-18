/* Recette de scripts/vercel-ignore-build.sh contre de vrais dépôts jetables :
   les deux codes que Vercel comprend (0 = ignorer, 1 = construire) doivent
   sortir exactement quand il faut. Deux détails sont porteurs de charge et
   faciles à « simplifier » en panne : la base absente ou inconnue doit
   construire, et un push qui finit par un commit de docs mais contient du
   code avant doit construire (d'où VERCEL_GIT_PREVIOUS_SHA, pas HEAD^). */
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const script = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "vercel-ignore-build.sh");
const gitEnv = {
  ...process.env,
  GIT_AUTHOR_NAME: "recette",
  GIT_AUTHOR_EMAIL: "recette@example.com",
  GIT_COMMITTER_NAME: "recette",
  GIT_COMMITTER_EMAIL: "recette@example.com",
};

function git(cwd, ...args) {
  return execFileSync("git", args, { cwd, env: gitEnv, encoding: "utf8" }).trim();
}

function commit(cwd, message, files) {
  for (const [relativePath, content] of Object.entries(files)) {
    const target = path.join(cwd, relativePath);
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, content);
  }
  git(cwd, "add", "-A");
  git(cwd, "commit", "-q", "-m", message);
  return git(cwd, "rev-parse", "HEAD");
}

function runIgnore(cwd, previousSha) {
  const env = { ...gitEnv };
  if (previousSha === undefined) delete env.VERCEL_GIT_PREVIOUS_SHA;
  else env.VERCEL_GIT_PREVIOUS_SHA = previousSha;
  const result = spawnSync("sh", [script], { cwd, env, encoding: "utf8" });
  return { status: result.status, output: `${result.stdout}${result.stderr}`.trim() };
}

function scenario(name) {
  const cwd = mkdtempSync(path.join(tmpdir(), "vercel-ignore-"));
  git(cwd, "init", "-q");
  const base = commit(cwd, "base", {
    "README.md": "# base\n",
    "docs/plan.md": "plan\n",
    "artifacts/byaime-onepage/src/main.tsx": "export {};\n",
    "attached_assets/hero.txt": "asset v1\n",
  });
  return { name, cwd, base };
}

const failures = [];
function expect(name, actual, expected, output) {
  const ok = actual === expected;
  console.log(`${ok ? "✓" : "✗"} ${name} → exit ${actual} (attendu ${expected})`);
  if (!ok) failures.push(`${name}: exit ${actual}, attendu ${expected}\n${output}`);
}

{
  const s = scenario("docs-only");
  commit(s.cwd, "docs", { "docs/plan.md": "plan v2\n", "README.md": "# v2\n", "docs/ci/x.patch": "diff\n" });
  const r = runIgnore(s.cwd, s.base);
  expect("docs, README et patch seuls → ignorer", r.status, 0, r.output);
  rmSync(s.cwd, { recursive: true, force: true });
}

{
  const s = scenario("code");
  commit(s.cwd, "code", { "artifacts/byaime-onepage/src/main.tsx": "export const v = 2;\n" });
  const r = runIgnore(s.cwd, s.base);
  expect("code applicatif → construire", r.status, 1, r.output);
  rmSync(s.cwd, { recursive: true, force: true });
}

{
  const s = scenario("push-mixte");
  commit(s.cwd, "code", { "artifacts/byaime-onepage/src/main.tsx": "export const v = 3;\n" });
  commit(s.cwd, "docs après", { "docs/plan.md": "plan v3\n" });
  const r = runIgnore(s.cwd, s.base);
  expect("push finissant par un commit de docs mais contenant du code → construire", r.status, 1, r.output);
  rmSync(s.cwd, { recursive: true, force: true });
}

{
  const s = scenario("attached-assets");
  commit(s.cwd, "asset", { "attached_assets/hero.txt": "asset v2\n" });
  const r = runIgnore(s.cwd, s.base);
  expect("attached_assets (aliasé @assets dans le build) → construire", r.status, 1, r.output);
  rmSync(s.cwd, { recursive: true, force: true });
}

{
  const s = scenario("lockfile");
  commit(s.cwd, "lock", { "pnpm-lock.yaml": "lockfileVersion: '9.0'\n" });
  const r = runIgnore(s.cwd, s.base);
  expect("lockfile → construire", r.status, 1, r.output);
  rmSync(s.cwd, { recursive: true, force: true });
}

{
  const s = scenario("sans-base");
  commit(s.cwd, "docs", { "docs/plan.md": "plan v2\n" });
  const r = runIgnore(s.cwd, undefined);
  expect("VERCEL_GIT_PREVIOUS_SHA absent → construire", r.status, 1, r.output);
  const r2 = runIgnore(s.cwd, "");
  expect("VERCEL_GIT_PREVIOUS_SHA vide → construire", r2.status, 1, r2.output);
  rmSync(s.cwd, { recursive: true, force: true });
}

{
  const s = scenario("base-inconnue");
  commit(s.cwd, "docs", { "docs/plan.md": "plan v2\n" });
  const r = runIgnore(s.cwd, "deadbeefdeadbeefdeadbeefdeadbeefdeadbeef");
  expect("base introuvable (clone superficiel) → construire, jamais un code ambigu", r.status, 1, r.output);
  rmSync(s.cwd, { recursive: true, force: true });
}

{
  const s = scenario("sous-dossier");
  commit(s.cwd, "lib", { "lib/db/src/index.ts": "export const schema = 2;\n" });
  const sub = path.join(s.cwd, "artifacts/byaime-onepage");
  const r = runIgnore(sub, s.base);
  expect("lancé depuis artifacts/byaime-onepage, changement dans lib/ → construire", r.status, 1, r.output);
  rmSync(s.cwd, { recursive: true, force: true });
}

{
  const s = scenario("rien");
  const r = runIgnore(s.cwd, s.base);
  expect("aucun changement depuis la base → ignorer", r.status, 0, r.output);
  rmSync(s.cwd, { recursive: true, force: true });
}

if (failures.length > 0) {
  console.error(`\n${failures.length} échec(s) :\n${failures.join("\n\n")}`);
  process.exit(1);
}
console.log("\nvercel-ignore-build.sh : tous les scénarios conformes au contrat Vercel (0 = ignorer, 1 = construire).");
