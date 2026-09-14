import { describe, expect, it } from "vitest";
import { AGENCY_LANDING_PATH, DEGRADED_PUBLIC_PATHS, resolveDegradedView } from "./public-shell";
import { sitePath } from "./site-path";

/*
 * Mode dégradé : la vitrine ne dépend pas de l'authentification.
 *
 * Constat du plan (§2.8) : sans `VITE_CLERK_PUBLISHABLE_KEY`, TOUTES les routes
 * affichaient « Connexion momentanément indisponible » — y compris `/agence`,
 * qui n'a besoin ni de session, ni de base, ni d'API. Ce test verrouille la
 * liste des pages qui restent servies, et le fait que tout le reste le dit
 * explicitement au lieu de demander une donnée.
 */

describe("resolveDegradedView — pages servies sans authentification", () => {
  it("sert la vitrine", () => {
    expect(resolveDegradedView(AGENCY_LANDING_PATH)).toEqual({ kind: "agency" });
  });

  it("sert les obligations légales, toujours accessibles", () => {
    expect(resolveDegradedView("/mentions-legales")).toEqual({ kind: "mentions" });
    expect(resolveDegradedView("/confidentialite")).toEqual({ kind: "privacy" });
    expect(resolveDegradedView("/conditions")).toEqual({ kind: "terms" });
  });

  it("sert le livrable d'un couple, dont la projection est publique côté serveur", () => {
    expect(resolveDegradedView("/bilan/proj_123")).toEqual({ kind: "report", projectId: "proj_123" });
    expect(resolveDegradedView("/bilan/proj_123/")).toEqual({ kind: "report", projectId: "proj_123" });
  });

  it("sert la vitrine à la racine, sans redirection vide au rendu serveur", () => {
    // Un `<Redirect>` ne rend rien côté serveur : la page la plus exposée du
    // site serait blanche. La racine sert donc la vitrine elle-même.
    expect(resolveDegradedView("/")).toEqual({ kind: "agency" });
    expect(resolveDegradedView(AGENCY_LANDING_PATH)).toEqual({ kind: "agency" });
  });

  it("ignore la query et l'ancre avant de décider", () => {
    expect(resolveDegradedView("/agence?utm_source=instagram")).toEqual({ kind: "agency" });
    expect(resolveDegradedView("/agence#methode")).toEqual({ kind: "agency" });
    expect(resolveDegradedView("/conditions?returnTo=%2Fadmin")).toEqual({ kind: "terms" });
  });

  it("sert la Bande, qui ne monte ni Clerk, ni store, ni réseau", () => {
    expect(resolveDegradedView("/monde")).toEqual({ kind: "bande" });
    expect(DEGRADED_PUBLIC_PATHS).toContain("/monde");
  });

  it("sert le portail d'un invité, qui ne consomme aucune API Clerk", () => {
    // Un invité répond la veille du Jour J : il ne dépend ni de compte, ni de
    // la configuration d'authentification du déploiement.
    expect(resolveDegradedView("/rsvp/abc123")).toEqual({ kind: "rsvp", token: "abc123" });
  });

  it("dit que tout le reste exige une session, sans rien demander", () => {
    for (const path of ["/user-portal", "/admin", "/profile", "/assistant", "/dossiers", "/connexion", "/creation", "/invite/abc", "/profil/proj_1", "/inconnu"]) {
      expect(resolveDegradedView(path)).toEqual({ kind: "unavailable", requestedPath: path });
    }
  });

  it("ne déclare publiques que les pages réellement résolues", () => {
    // Une liste qui ment est pire qu'une liste absente : chaque chemin annoncé
    // doit être servi, et rien d'autre ne doit l'être par accident.
    for (const path of DEGRADED_PUBLIC_PATHS) {
      expect(resolveDegradedView(path).kind).not.toBe("unavailable");
    }
    expect(resolveDegradedView("/user-portal").kind).toBe("unavailable");
    expect(DEGRADED_PUBLIC_PATHS).not.toContain("/user-portal");
  });
});

describe("sitePath — les liens internes suivent le BASE_PATH", () => {
  it("laisse un chemin absolu tel quel sous la racine", () => {
    expect(sitePath("/admin")).toBe("/admin");
    expect(sitePath("/")).toBe("/");
    expect(sitePath("admin")).toBe("/admin");
  });
});
