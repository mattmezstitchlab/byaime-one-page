/*
 * Chemin interne tenant compte du `BASE_PATH` de déploiement.
 *
 * L'app peut être servie sous un préfixe (`BASE_PATH`), et plusieurs fichiers
 * recopiaient `import.meta.env.BASE_URL.replace(/\/$/, "")` — dont des liens en
 * dur (`href="/admin"`) qui ignoraient ce préfixe. Un seul helper, utilisé par
 * la vitrine et ses pages sœurs.
 */
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export function sitePath(path: string = "/"): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  if (!basePath) return clean;
  return clean === "/" ? `${basePath}/` : `${basePath}${clean}`;
}
