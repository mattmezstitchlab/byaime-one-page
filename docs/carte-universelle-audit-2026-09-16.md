# Carte Universelle — audit et évolution (16 septembre 2026)

> Historique de la première passe. La séparation finale Carte / Profil métier / Association est décrite dans [le contrat à trois niveaux](carte-universelle-trois-niveaux.md), qui remplace les descriptions de stockage professionnel et de parcours ci-dessous.

## Existant vérifié avant modification
- `lib/db/src/schema/aime.ts` : PostgreSQL/Drizzle. `aime_projects.data` contient le `WorldProject` JSONB, `aime_memberships` relie projet et identifiant Clerk (unique projet/utilisateur). Pas de table personne ni carte personnelle.
- `src/lib/types.ts` (frontend) : identité locale dans Guest, Provider, TeamRole ; musique dans MusicTrack ; préférences/logistique dans CeremonyContent et Logistics. Ces objets sont spécifiques au projet.
- `CarteImport`, `universal-import.ts`, `dispoo-dossier.ts` : un fichier dit carte est traduit en dossier, puis en projet (couple, lieu/date, budget, équipe, rundown, musique, documents). Ce n'est pas une personne.
- `LandingComposer` : import principal, questions mariage secondaires, `RoleChoice` routage seulement ; aucun rôle personnel persistant.
- `project-store.tsx` : création, normalisation, catalogue et synchronisation via `/api/projects` ; permissions et conflits de version côté API.
- `/public/profiles/:id`, `PublicProfile`, `publicProfile.ts` : projection publiée d'un projet. Ne pas réinterpréter ces identifiants comme personnes.
- Clerk porte l'utilisateur ; memberships porte les permissions owner/planner/family/viewer. Ces permissions ne sont pas les métiers/rôles sociaux.
- `aime_rsvps` : réponses par invité et lien secret ; `aime_song_requests` : demandes par invité ; invitations : association authentifiée au projet.
- Timeline : `WorldProject.timeline`, `timeline-graph`, `DayRunTimeline`, vues Monde, profil, programme, brief et fil ; pas de table Timeline séparée.
- Musique : recherche iTunes dans `WeddingModulesPanel`, MusicSearchResult (titre, artiste, pochette, previewUrl, trackUrl). Extrait disponible seulement selon catalogue.

## À réutiliser
Authentification, memberships, projets, routes, données historiques et Timeline ; recherche musicale extraite sans changer son comportement. JSON maintenu en outil secondaire.

## À modifier
Accueil, adhésion (référence carte + contexte), projection authentifiée du projet. Les événements issus de présence sont calculés à la lecture et exclus des écritures de projet : aucune copie persistante de l'identité ou de l'horaire.

## À créer seulement car absent
Une carte par identifiant Clerk, stockage indépendant du mariage. Configuration métier partagée, validation API, formulaire direct. Aucune migration automatique des noms d'invités : un nom ne prouve pas l'identité. Le RSVP anonyme reste intact ; sa liaison à un compte nécessitera une revendication explicite et vérifiée.

## Déploiement
Appliquer `lib/db/migrations/20260916_universal_cards.sql` avant le code serveur. Migration additive, aucune suppression. Sauvegarder la base selon la procédure habituelle. Aucune connexion de production disponible dans cette session.

## Implémentation livrée
- `aime_universal_cards.user_id` : clé primaire Clerk ; identité, photo, musique et habitudes professionnelles. Version `updated_at` avec conflit 409 plutôt qu'écrasement concurrent.
- `aime_memberships.card_user_id` : clé étrangère nullable, suppression de carte → SET NULL. CHECK `card_user_id = user_id` : impossible de référencer la carte d'autrui. Les adhésions historiques restent valides.
- `aime_memberships.participation` : rôles sociaux multiples, RSVP, accompagnants, moments, dates/heures, contraintes et créneaux. Les permissions d'accès ne sont jamais déduites des rôles sociaux.
- `GET/PUT /api/me/card` : carte de l'utilisateur authentifié uniquement.
- `GET/PUT /api/projects/:id/my-participation` : adhésion existante obligatoire, seulement ses propres réponses ; aucune auto-inscription à un mariage arbitraire. Écriture refusée si mariage clôturé.
- `/ma-carte` : création/édition et association, accessible depuis l'en-tête privé. Les données connues sont préremplies. Un brouillon contextuel non associé peut traverser la création d'un mariage dans la même session ; il est isolé par identifiant utilisateur et supprimé après association réussie.
- Accueil : création principale ; import du dossier dans « Outils avancés » ; route et parseur d'import conservés.
- Projection `cardParticipants` dans le projet authentifié : identité/photo/métier/rôles/présence et habitudes des rôles concernés, résolus depuis la carte. Aucune entrée Guest/Provider dupliquée.
- Timeline, brief et fil authentifiés consomment les événements calculés `card-presence:*`. Date ISO avec fuseau obligatoire ; fin après début, nuit suivante autorisée. Les moments sans heure renseignée utilisent les horaires de moments correspondants déjà connus du mariage, sans inventer de créneau s'ils manquent.
- Les projections sont exclues des écritures de projet. Leur édition se fait à la source ; le store et l'éditeur ne permettent pas de déplacer/supprimer une copie dérivée.
- Recherche iTunes extraite dans `music-search.ts`, partagée avec le panneau musical existant. Pochette, artiste, titre, lecteur natif d'extrait ; aucun abonnement ni morceau complet promis.
- Export/suppression de compte étendus à la carte et aux participations.

## Limites explicites / suite nécessaire
- Pas de fusion automatique entre un compte et un invité RSVP anonyme existant. Les anciens liens et données restent intacts. Il reste à concevoir la revendication vérifiée de ces liens si l'on veut réunir ces deux parcours historiques.
- Les contraintes alimentaires et besoins sont enregistrés dans le contexte et accessibles à leur auteur ; ils ne sont pas propagés dans les profils publics, le brief, les listes génériques ou la Timeline. Une vue organisateur dédiée et autorisée pour ces réponses sensibles reste à ajouter.
- Les modules réseau/rencontres ne disposent pas ici d'un modèle de personnes à raccorder : pas de module inventé. Le profil public historique reste un profil de mariage.
- Les habitudes professionnelles textuelles sont réutilisées comme paramètres, pas interprétées arbitrairement comme horaires. Pour alimenter automatiquement la Timeline : présence datée, créneaux datés ou moments dont les horaires sont déjà connus.
- Le nouveau formulaire est en français. Le reste des traductions existantes est conservé ; traduction anglaise du nouveau parcours à compléter.
- Photo : JPEG/PNG/WebP, 500 Ko maximum, transport data URL validé ; pas de nouveau service de stockage parallèle.
- Brouillons pré-authentification : session du navigateur, pas une carte sauvegardée serveur. La création du compte reste nécessaire pour la persistance et les relations aux mariages.
- Pas de déploiement ni de compte Clerk réel créé depuis cette session. Validation production/staging requise avant publication.

## Vérifications effectuées
- `pnpm run typecheck` : bibliothèques, frontend, serveur et E2E.
- `pnpm run test` : 587 tests (22 domaine, 50 serveur, 515 frontend), y compris les suites Timeline existantes et les anciens imports.
- `pnpm run build` : serveur et frontend de production construits (shim Corepack pnpm nécessaire dans cet environnement).
- `e2e/universal-card.preview.spec.ts` : deux exécutions Chromium, desktop et Pixel 7. Jean Dupont, Paris, Photographe, photo de test, recherche musicale simulée et lecture effective d'un WAV de test, rôle Photographe, 14h–23h, installation/livraison, association à un mariage, présence de 540 minutes dans la Timeline, rechargement des données et isolation du contexte B. Pas de copies Guest/Provider. API d'aperçu en mémoire, authentification simulée ; validation et projection partagées avec le serveur réel.
- Migration exécutée deux fois avec PostgreSQL embarqué PGlite : conservation d'une adhésion historique, une carte pour deux mariages, rejet d'un doublon et d'une carte appartenant à un autre utilisateur, effet SET NULL vérifié. Cela ne teste pas la connectivité ou les droits du PostgreSQL déployé.
- Captures desktop/mobile examinées ; absence de débordement horizontal vérifiée dans le navigateur.

### Rejouer le parcours navigateur local
```sh
corepack pnpm --filter @workspace/byaime-onepage dev:preview
# Dans un autre terminal, avec Chromium Playwright installé :
AIME_CARD_PREVIEW_TEST=1 AIME_E2E_BASE_URL=http://127.0.0.1:4173 \
  corepack pnpm exec playwright test e2e/universal-card.preview.spec.ts --workers=1
```
Le serveur d'aperçu n'écrit aucune donnée de démonstration en production. Ses données de test disparaissent au redémarrage.
