# Audit fonctionnel complet — AIME

## Résumé exécutif

- Le socle **Monde + rôles + collaboration + RSVP + médias + messages + Laboratoire + export/suppression** existe déjà, avec persistance PostgreSQL et contrôles d’accès backend.
- Le produit contient aussi une part importante de **données semées/démonstration** (timeline, tâches, musique, templates, etc.) qui peuvent ressembler à des fonctions « complètes » alors qu’elles restent en partie guidées par seed JSON.
- Plusieurs domaines sont **partiels** (propagation/conflits avancés, exploitation analytique Laboratoire, import de sauvegarde robuste, gouvernance opérationnelle complète).
- Des écarts de contrat existent: une partie des routes implémentées n’est pas décrite dans OpenAPI, et une partie du frontend passe encore par des `fetch('/api/...')` directs.
- La vérification live Vercel n’a pas pu être finalisée depuis cet environnement (résolution DNS du domaine impossible), donc les checks runtime production restent à confirmer hors sandbox.

## Périmètre, méthode, limites

- Analyse statique: frontend, backend, schémas DB, spec OpenAPI, tests, seeds/fixtures, routes Vercel.
- Vérifications techniques observées dans ce clone: build/test/typecheck/verify script (local).
- Limites: flux nécessitant comptes/secrets (Clerk/E2E live), et smoke tests live sur domaine public bloqués ici par DNS.

## État de validation technique (constat de ce clone)

| Vérification | Résultat | Preuves |
|---|---|---|
| Build | réussi | `scripts/verify-vercel.mjs:205`, bundles attendus `scripts/verify-vercel.mjs:13-21` |
| Typecheck | réussi dans ce clone | script CI e2e appelle `pnpm run typecheck:e2e` `.github/workflows/e2e.yml:61` (pas d’erreur reproduite ici) |
| Tests unitaires | réussis dans ce clone | suites présentes (exemples: `artifacts/api-server/src/lib/*.test.ts`, `artifacts/byaime-onepage/src/lib/*.test.ts`) |
| Vérification Vercel (structure) | réussie localement | checks routage/entrypoints `scripts/verify-vercel.mjs:32-40`, `:143-157`, `artifacts/byaime-onepage/vercel.json:9-21` |
| Smoke tests live | non conclusifs ici (blocage DNS sandbox) | `scripts/verify-vercel.mjs:159-194` |

## Matrice de couverture fonctionnelle

| Domaine | Fonction | Frontend | API | Base de données | Persistée | Testée | Accessible par l’utilisateur | Niveau de complétude | Preuves |
|---|---|---|---|---|---|---|---|---|---|
| Profil & identité | Profil privé (aperçu) | oui | indirect (`/projects`, `/projects/:id/fil`) | `aime_projects` JSONB | oui | partiel | oui (auth) | partiel | `App.tsx:183-199`, `PublicProfile.tsx:78-108`, `aime.ts:37-45`, `openapi.yaml:111-123` |
| Profil & identité | Profil public publié/dépublié | oui | oui (`/public/profiles/:id`) | `aime_projects.data.publicProfile` | oui | oui | oui | complet | `PortalControls.tsx:1048-1103`, `aime.ts:585-605`, `publicProfile.ts:38-57`, `publicProfile.test.ts` |
| Profil & identité | Fil personnel | oui | oui (`/projects/:id/fil`) | `aime_projects` | oui | oui | oui | complet | `ProfileFil.tsx:98`, `aime.ts:700-729`, `openapi.yaml:111-123`, `profileFil.test.ts` |
| Profil & identité | Visibilité des événements | oui | oui (projection backend) | JSONB timeline | oui | oui | oui | complet | `PublicProfile.tsx:88-90`, `publicProfile.ts:27-36`, `profile-visibility.test.ts` |
| Monde & projet | Création depuis intention | oui | oui (`POST /projects`) | `aime_projects`, `aime_memberships` | oui | oui | oui | complet | `parser.ts:79-100`, `project-store.tsx:229-240`, `aime.ts:931-950` |
| Monde & projet | Extraction d’intention (NLP léger) | oui | non | non | non | oui | oui | prototype | `parser.ts:5-77`, `command-agent.test.ts` |
| Monde & projet | Seed mariage initiale | oui | non (client) | via sauvegarde projet | oui après sync | oui | oui | démo uniquement | `parser.ts:101-215`, `seed-data.ts:44-146`, `seed.test.ts` |
| Monde & projet | Timeline (édition) | oui | oui (`PUT /projects/:id`) | JSONB | oui | oui | oui | complet | `ProjectStage.tsx:172-183`, `project-store.tsx:242-248`, `aime.ts:953-1023` |
| Monde & projet | Dépendances/impact/conflits | oui | non spécifique | JSONB | oui | oui (lib) | oui | partiel | `timeline-graph.ts:92-193`, `DayOfPanel.tsx:18`, `timeline-graph.test.ts` |
| Monde & projet | Propagation automatique | oui | non spécifique | JSONB | oui | oui (lib) | oui | partiel | `timeline-graph.ts:156-193`, `command-agent.ts:92` (dépendances non déplacées) |
| Monde & projet | Tâches | oui | via projet global | JSONB | oui | partiel | oui | partiel | `WeddingModulesPanel.tsx` (planning), `project-store.tsx:242-248` |
| Monde & projet | Budget & paiements | oui | via projet global | JSONB + `aime_files` docs liés | oui | partiel | oui selon rôle | partiel | `WeddingModulesPanel.tsx:508-518`, `wedding-navigation.ts:87`, `project-store.tsx:242-248` |
| Monde & projet | Prestataires | oui | via projet global | JSONB | oui | partiel | oui | partiel | `WeddingModulesPanel.tsx` (providers), `project-store.tsx` |
| Monde & projet | Documents privés | oui | oui (`/storage/*`, `/projects/:id/files`) | `aime_files` | oui | oui | oui (rôles) | complet | `WeddingModulesPanel.tsx:521-599`, `aime.ts:1316-1424`, `aime.ts:68-82` |
| Monde & projet | Logistique/cérémonie/musique/mémoires | oui | majoritairement via `PUT /projects/:id` | JSONB | oui | partiel | oui | partiel | `WeddingModulesPanel.tsx:602-707`, `:607-701`, `project-store.tsx:242-248` |
| Monde & projet | Équipe et rôles | oui | oui (`/projects/:id/members`, invitations) | `aime_memberships`, `aime_invitations` | oui | oui | oui | complet | `PortalControls.tsx:1123-1166`, `aime.ts:1138-1208`, `aime.ts:47-66` |
| Invités | Liste invités | oui | indirect (projet) | JSONB guests | oui | oui | oui | partiel | `GuestPanel.tsx:95-136`, `project-store.tsx:242-248`, `participant-rsvp.test.ts` |
| Invités | Liens RSVP (création/révocation) | oui | oui (`/projects/:id/rsvp-links*`) | `aime_rsvps` | oui | partiel | oui (owner/planner) | complet | `GuestPanel.tsx:53-90`, `aime.ts:1675-1754`, `aime.ts:179-189` |
| Invités | RSVP réponse | oui | oui (`PUT /rsvp/:token`) | `aime_rsvps` + patch JSONB guests | oui | oui | oui (portail) | complet | `App.tsx:319-338`, `aime.ts:2705-2769`, `aime.ts:2741-2758` |
| Invités | Allergies/préférences/accompagnants | oui | oui via RSVP payload | `aime_rsvps.response` + guests JSONB | oui | partiel | oui | partiel | `App.tsx:335-337`, `aime.ts:382-393`, `aime.ts:2719-2724` |
| Invités | Plan de table | oui | indirect (projet) | JSONB tables/guests | oui | partiel | oui | partiel | `WeddingModulesPanel.tsx:499-505`, `project-store.tsx:242-248` |
| Invités | Transport/hébergement | oui | indirect (projet) | JSONB logistics | oui | partiel | oui | partiel | `WeddingModulesPanel.tsx:704-707` |
| Portail invité | Consultation portail token | oui | oui (`GET /rsvp/:token`) | `aime_rsvps` + projection projet | oui | partiel | oui | complet | `App.tsx:280`, `aime.ts:2488-2545` |
| Portail invité | Upload médias + consentement + modération | oui | oui (`/rsvp/:token/media*`, `/projects/:id/participant-media*`) | `aime_files` | oui | oui sécurité partielle | oui | complet | `App.tsx:345-347`, `aime.ts:2548-2681`, `aime.ts:1759-1812`, `security.test.ts` |
| Portail invité | Demandes musicales invité | oui | oui (`/rsvp/:token/song-requests`) | `aime_song_requests` | oui | partiel | oui | complet | `App.tsx:348`, `aime.ts:2683-2703`, `aime.ts:190-200` |
| Portail invité | Modération demandes musicales | oui | oui (`PATCH /projects/:id/song-requests/:requestId`) | `aime_song_requests` | oui | partiel | oui (owner/planner) | complet | `WeddingModulesPanel.tsx:675-681`, `aime.ts:1833-1853` |
| Coordination | Envoi messages | oui | oui (`POST /projects/:id/messages`) | `aime_messages` | oui | oui | oui (rôles manage) | complet | `PortalControls.tsx:336`, `CommandBar.tsx:72-84`, `aime.ts:1428-1480`, `providerResponse.test.ts` |
| Coordination | Programmation/replanification/annulation | oui | oui (`PATCH/POST /projects/:id/messages/:messageId`) | `aime_messages` | oui | partiel | oui | complet | `WeddingModulesPanel.tsx:727`, `aime.ts:1507-1578` |
| Coordination | Rappels automatiques (cron) | non direct UI | oui (`/cron/scheduled-messages`) | `aime_messages` | oui | partiel | opératoire | backend sans UI | `aime.ts:338-342`, `aime.ts:229-239`, `vercel.json:3-7` |
| Coordination | Mode Jour J opérationnel | oui | partiellement (messages/RSVP) | JSONB | oui | partiel | oui | partiel | `ProjectStage.tsx:223-247`, `wedding-navigation.ts:55` |
| Laboratoire | Soumission feedback contextualisé | oui | oui (`POST /projects/:id/laboratory-feedback`) | `aime_laboratory_feedback` | oui | oui | oui | complet | `Laboratory.tsx:113-117`, `aime.ts:1613-1642`, `aime.ts:202-215` |
| Laboratoire | Filtres type/statut + historique | oui | oui (`GET /projects/:id/laboratory-feedback`) | `aime_laboratory_feedback` | oui | oui | oui | complet | `Laboratory.tsx:129-156`, `aime.ts:1581-1610`, `laboratory.test.ts` |
| Laboratoire | Changement de statut (rôles) | oui | oui (`PATCH /projects/:id/laboratory-feedback/:feedbackId`) | `aime_laboratory_feedback` | oui | oui | oui (owner/planner) | complet | `Laboratory.tsx:65-83`, `aime.ts:1645-1671` |
| Laboratoire | Export analytique dédié | non | non | non | non | non | non | absent | absence de route dédiée dans `aime.ts` + `openapi.yaml` |
| Données & exploitation | Export compte | oui (lien) | oui (`GET /account/export`) | multi tables | oui | partiel | oui | complet | `PortalControls.tsx:560`, `aime.ts:767-842` |
| Données & exploitation | Export projet (backup) | oui | oui (`GET /projects/:id/export`) | `aime_projects` | oui | partiel | oui owner | complet | `PortalControls.tsx:928-930`, `aime.ts:1097-1134` |
| Données & exploitation | Import projet (backup) | oui | pas d’endpoint dédié (réutilise create/update) | JSONB | oui | oui (unit) | oui | partiel | `PortalControls.tsx:964-965`, `project-store.tsx:303-310`, `backup.ts:3-14` |
| Données & exploitation | Suppression projet | oui | oui (`DELETE /projects/:id`) | cascade DB + objets | oui | partiel | oui owner | complet | `PortalControls.tsx:1271-1294`, `aime.ts:1026-1070` |
| Données & exploitation | Suppression compte | oui | oui (`DELETE /account`) | multi tables + Clerk | oui | partiel | oui | complet | `PortalControls.tsx:1339-1357`, `aime.ts:845-928` |
| Données & exploitation | Offline local + sync réseau | oui | oui (`/projects`) | localStorage + Postgres | oui | oui | oui | partiel | `project-store.tsx:189-204`, `:208-263`, `project-sync.test.ts` |
| Données & exploitation | Résolution de conflit concurrent | oui | oui (409 sur update) | `updatedAt` | oui | oui (e2e) | oui | partiel | `aime.ts:989-1016`, `project-store.tsx:255-258`, `e2e/aime.spec.ts:291-320` |
| Données & exploitation | Audit log métier | non | non | non | non | non | non | absent | aucune table/route dédiée dans `aime.ts`, `openapi.yaml`, `aime.ts` schéma |
| Déploiement | Routage Vercel /api et fallback SPA | n/a | n/a | n/a | n/a | oui (script) | n/a | complet | `vercel.json:9-21`, `verify-vercel.mjs:143-157` |
| Déploiement | Entrypoints API Vercel | n/a | oui | n/a | n/a | oui | n/a | complet | `api/index.js:1-3`, `api/[...path].js:1-3`, `verify-vercel.mjs:105-113` |
| Déploiement | 404 API applicatif JSON | n/a | oui | n/a | n/a | partiel | n/a | complet | `routes/index.ts:9-11` |
| Déploiement | Smoke routes live demandées | n/a | ciblées par script | n/a | n/a | non conclu | n/a | présent mais non testé | `verify-vercel.mjs:41-47`, `:169-194` |

## Fonctions réellement complètes (priorité: ne pas recréer)

- Publication/dépublication profil public + projection filtrée.
- Collaboration par rôles (owner/planner/family/viewer) avec invitations et acceptation.
- Chaîne RSVP complète (lien, réponse, persistance, lecture portail).
- Upload média invité sécurisé (ticket, finalisation signée, consentement, modération).
- Demandes musicales invité + modération organisateur.
- Messages (envoi immédiat, scheduling, replanification, annulation, journal).
- Laboratoire (collecte, contexte, filtres, statuts, droits).
- Exports (compte/projet) et suppressions (projet/compte) avec contrôles.

## Fonctions existantes mais incomplètes

- Propagation des dépendances timeline: impact calculé, mais déplacement dépendances non automatique en exécution de commande.
- Gouvernance données avancée: pas d’audit log métier dédié, pas de politique de restauration/retention automatisée complète.
- Import backup: existant mais simple (contrôles limités, pas de workflow de merge guidé).
- Exploitation analytique Laboratoire: pas d’export analytique dédié ni de métriques d’usage natives.
- Domaines opérationnels (budget/prestataires/logistique/cérémonie) majoritairement stockés en JSON projet, avec peu de garanties métier spécifiques serveur.

## Fonctions présentes mais non reliées de bout en bout

- Contrat API partiellement désaligné: plusieurs routes backend utilisées en `fetch` direct ne sont pas pleinement couvertes par OpenAPI (ex: `participant-media`, `song-requests`, `privacy`, `account/export`, cron, etc.).
- Coexistence client généré (hooks `@workspace/api-client-react`) et appels manuels `fetch('/api/...')`, créant deux voies d’intégration.

## Fonctions “démo uniquement” / prototypes

- Création de Monde injecte une base fortement semée (timeline, tâches, guests, musique, templates). Utile pour onboarding, mais à distinguer de données réelles utilisateur.
- Command Center (`CommandBar`) est un agent borné local (parsing + mutation locale), sans backend IA dédié ni orchestration serveur.
- Suggestions “autour de votre Monde” (nearby) explicitement non vérifiées et présentées comme catégories non partenaires.

## Routes backend non consommées ou faiblement consommées

- `GET /projects/:id/brief/nearby`: consommée via composant `WeddingBrief`, mais usage conditionnel owner + consentement (couverture runtime à mesurer).
- `GET /cron/scheduled-messages`: route opératoire (cron), pas d’UI utilisateur (normal).
- Plusieurs routes techniques AIME LOCAL sont surtout activées via module Documents et nécessitent bridge local; usage réel à mesurer.

## Composants frontend non reliés / à risque de divergence

- Dossier `artifacts/byaime-onepage/reference/source-zip/*` contient des versions historiques parallèles (non runtime), risque de confusion si repris sans gouvernance.
- Dualité “données seed/provenance suggested|demo” vs “données réelles” dans certains modules peut masquer l’état réel de complétude.

## Doublons et fonctions parallèles

1. **API client généré vs fetch manuel**
   - Source de vérité recommandée: OpenAPI + client généré.
   - À déprécier progressivement: fetch manuels dispersés.
   - Risque: divergence des contrats, erreurs de mapping, régressions silencieuses.

2. **Composants historiques dans `reference/` vs implémentation active**
   - Source de vérité: `artifacts/byaime-onepage/src/**`.
   - À déprécier/archiver: `artifacts/byaime-onepage/reference/source-zip/**`.
   - Risque: maintenance parallèle implicite.

3. **Données seed “demo/suggested” vs données réellement collectées**
   - Source de vérité production: données confirmées utilisateur + tables backend dédiées.
   - Risque: décisions produit prises sur des écrans pré-remplis non représentatifs.

## Fonctions manquantes confirmées

- Audit log métier exploitable (qui a changé quoi, quand, avant/après).
- Export analytique Laboratoire (dataset structuré d’exploitation).
- Workflow de restauration/merge de backup robuste (assisté, idempotent, conflict-aware).
- Observabilité usage fonctionnel (preuves d’usage par domaine, hors simple tests).

## Décisions “ne pas créer / améliorer / relier / durcir / mesurer / compléter / nouveau”

| Sujet | Décision |
|---|---|
| Notifications/messages | **ne pas créer : déjà complet** (améliorer observabilité) |
| Budget/prestataires/tâches | **améliorer** (règles métier et validations serveur) |
| Mode Jour J | **améliorer** (durcissement opérationnel runtime) |
| Documents | **ne pas créer : déjà complet** |
| RSVP | **ne pas créer : déjà complet** |
| Plan de table | **améliorer** (règles/contraintes métier) |
| Import/export | **améliorer** (import/restauration plus robuste) |
| Laboratoire | **ne pas créer : déjà complet** + **compléter** analytics/export |
| Synchronisation/conflits | **améliorer** (merge/propagation plus fine) |
| Confidentialité | **durcir** (preuves runtime, rétention et auditabilité) |
| Audit log | **nouveau : véritable capacité absente** |

## Vérification des 20 parcours demandés

- Exécutables et partiellement couverts par code/tests: création Monde, modification, persistance/reload, invitation membre, rôles, publication profil, création lien RSVP, réponse RSVP, média invité, demande musicale, feedback laboratoire, changement statut laboratoire, suppression projet, conflit concurrent.
- Non validables intégralement ici sans accès live/secrets: e2e complet Clerk (sessions requises), perte réseau réelle multi-clients, cron en production avec secret, smoke live Vercel depuis ce sandbox.
- Test requis à ajouter/renforcer: scénario automatisé de restauration backup + conflit, test de non-régression OpenAPI vs routes implémentées, test smoke live CI post-deploy (déjà scripté mais à exécuter en environnement réseau ouvert).

## Typecheck: classification des “erreurs préexistantes”

- Dans ce clone audité, les échecs typecheck préexistants **n’ont pas été reproduits**.
- Conclusion prudente: soit corrigés entre-temps, soit présents sur un autre commit/branche/environnement.
- Action recommandée: rejouer `pnpm run typecheck` sur le commit exact signalé comme en échec, puis comparer les sorties fichier:ligne avant/après.

## Problèmes runtime Vercel

- Routage et entrypoints sont conformes en statique (`vercel.json`, `verify-vercel.mjs`, `api/*.js`).
- Vérification live des routes critiques non confirmée ici à cause d’un blocage DNS sandbox vers `https://byaime-one-page.vercel.app`.
- Commande à exécuter hors sandbox réseau restreint:

```bash
VERCEL_VERIFY_DEPLOYMENT_URL=https://byaime-one-page.vercel.app \
pnpm run verify:vercel
```

## Priorisation P0 / P1 / P2

- **P0**
  - Exécuter et archiver les smoke tests live post-déploiement (5 endpoints).
  - Fermer l’incertitude typecheck “préexistant” sur le commit source exact.
  - Aligner routes critiques implémentées ↔ contrat OpenAPI (au moins domaines RSVP/media/song/lab/privacy/export).

- **P1**
  - Durcir la gestion conflits/propagation timeline (au-delà de l’événement seul).
  - Renforcer workflow import/restauration backup (validation, idempotence, résolution de conflit guidée).
  - Ajouter métriques d’usage produit (mesurer adoption réelle par domaine).

- **P2**
  - Audit log métier complet.
  - Export analytique Laboratoire.
  - Rationalisation et archivage explicite des références historiques `reference/`.

## Roadmap sans doublons

1. **Relier**: unifier les intégrations API autour du contrat OpenAPI/client généré pour les domaines encore en fetch manuel.
2. **Durcir**: sécuriser les chemins de prod (smoke live systématique, observabilité erreurs runtime, preuve de permissions en bout en bout).
3. **Améliorer**: compléter conflits/propagation, import/restauration, règles métier budget/prestataires/plan de table.
4. **Mesurer**: instrumentation d’usage par fonctionnalité avant toute création nette.
5. **Nouveau (justifié)**: audit log métier et export analytique Laboratoire uniquement après fermeture des points de raccordement/durcissement.

---

## Règle finale appliquée

Aucune nouvelle fonctionnalité n’est proposée quand une capacité équivalente existe déjà : la priorité est au **raccordement**, à la **fiabilisation**, à la **mesure** et à la **sécurisation** des fonctions présentes.
