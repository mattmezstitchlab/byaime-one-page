# Notes de recherche : Timeline sonore mondiale pour AIME

**Statut :** terminé
**Profondeur :** Approfondie
**Date :** 8 septembre 2026

## Plan

- **Question :** Comment AIME peut-il évoluer d’une liste de morceaux reliée à un mariage vers une Timeline sonore relationnelle, collaborative, multimédia, interopérable et légalement viable à l’échelle mondiale ?
- **Périmètre :** plateformes musicales et API, standards de données temporelles, collaboration, droits et confidentialité, usages culturels et mémoriels ; hors implémentation du moteur et hors choix définitif d’un fournisseur.
- **Public :** décision produit et architecture AIME.
- **Livrable :** rapport de décision mondial avec benchmark, risques, principes d’architecture et recommandations ordonnées pour l’audit musical et la future Timeline sonore.

## Axes de recherche

| # | Axe | Statut | Sources |
|---|---|---|---|
| 1 | Catalogues, API, lecture et interopérabilité | terminé | 14 |
| 2 | Droits, territoires, confidentialité et contenus téléversés | terminé + approfondi | 18 |
| 3 | Collaboration, écoute sociale et expériences événementielles | terminé | 5 |
| 4 | Standards temporels, annotations et architecture relationnelle | terminé + approfondi | 11 |
| 5 | Mémoire, oralité, culture, accessibilité et inclusion mondiale | terminé + approfondi | 18 |

## Questions à couvrir

- [x] **Capacités plateformes :** recherche/métadonnées largement disponibles, mais lecture complète liée au fournisseur, au compte, au territoire et souvent à l’abonnement. [@platforms-01] [@platforms-02] [@platforms-03]
- [x] **Noyau ouvert :** identité interne AIME + ISRC/MBID + IDs fournisseurs séparés ; aucun ID de plateforme ne doit être la clé métier. [@platforms-04] [@platforms-13] [@platforms-14]
- [x] **Collaboration :** préparation persistante et session synchrone sont deux objets distincts ; rôles, approbation et contrôle de l’hôte priment sur le vote brut. [@collaboration-01] [@collaboration-02] [@collaboration-03]
- [x] **Modèle relationnel :** Moment/événement, média, agents, lieu, droits, provenance et annotations temporelles séparés mais reliés. [@standards-01] [@standards-02] [@standards-03]
- [x] **Droits :** distinguer lien profond, embedding/API, écoute, événement, extrait, synchronisation, publication et téléversement dans une matrice séparant droit, contrat fournisseur, données personnelles et territoire. [@rights-01] [@gap-rights-01] [@gap-rights-08] [@gap-rights-10]
- [x] **Consentement/accessibilité/préservation :** consentement révisable, audience explicite, transcription, provenance culturelle et maître audio pérenne. [@human-world-02] [@human-world-03] [@gap-governance-02] [@gap-governance-03]
- [x] **Perspective mondiale :** préserver les pratiques vivantes et l’autorité des communautés ; ne pas assimiler ouverture technique et droit de réutiliser. [@human-world-01] [@human-world-05] [@gap-governance-01]
- [x] **Migration :** stabiliser le Moment et les relations avant toute lecture ; ajouter ensuite résolution de catalogue, collaboration, playback adaptatif, médias personnels et export multimédia. [@standards-01] [@platforms-03] [@gap-governance-04]

## Journal des constats

_Les marqueurs [@clé] renvoient au registre research/sources.json._

### 1. Catalogues, API, lecture et interopérabilité

- Spotify Web Playback exige un utilisateur Premium et son mode développeur 2026 limite une nouvelle application à cinq utilisateurs ; Apple MusicKit sépare autorisation, bibliothèque personnelle et catalogue ; YouTube interdit notamment l’extraction audio, le cache et la fusion non conforme de résultats. [@platforms-01] [@freshness-01] [@platforms-02] [@freshness-02] [@platforms-03]
- « Chercher » et « lire » doivent être deux capacités distinctes : une réponse de catalogue ne garantit ni preview, ni droit de lecture, ni disponibilité territoriale. [@platforms-02] [@platforms-11] [@platforms-12]
- Noyau portable recommandé : ID AIME immuable + ISRC + MBID + liste de correspondances fournisseurs versionnées ; MusicBrainz/ListenBrainz aident à résoudre, pas à jouer. [@platforms-04] [@platforms-07] [@platforms-08] [@platforms-13]

### 2. Droits, territoires, confidentialité et contenus téléversés

- Composition, enregistrement, interprétation et diffusion peuvent engager des droits distincts ; aucune licence mondiale unique ne couvre tous les usages. [@rights-01] [@rights-03] [@rights-06]
- Une licence de diffusion sur place ne couvre pas automatiquement reproduction, synchronisation vidéo ou téléversement ; le responsable varie selon pays, lieu et contrat. [@gap-rights-01] [@gap-rights-03] [@gap-rights-05]
- Aucun « extrait court » n’est automatiquement libre ; l’exception dépend du territoire et du contexte. L’article 17 UE et le DMCA américain sont des cadres de responsabilité/retrait, pas des licences utilisateur. [@gap-rights-06] [@gap-rights-08] [@gap-rights-10]
- Les voix, mineurs, effacement et modération exigent une analyse séparée des droits musicaux ; consentement, autre base légale, audience, durée et retrait doivent être qualifiés selon le cas. [@rights-04] [@rights-05] [@rights-07]

### 3. Collaboration, écoute sociale et expériences événementielles

- Spotify Jam = session synchrone éphémère avec hôte ; playlist Apple = objet persistant coédité avec admissions et réactions. AIME doit conserver les deux temporalités sans les confondre. [@collaboration-01] [@collaboration-02]
- Des produits événementiels revendiquent le QR code comme accès sans compte ; les sources sont promotionnelles et l’effet sur la friction reste une hypothèse à tester. [@collaboration-04] [@collaboration-05]
- L’unanimité ou le vote brut peut amplifier conformité et veto négatif ; séparer proposition, intention, décision, ordre officiel et file de lecture. [@collaboration-03]

### 4. Standards temporels, annotations et architecture relationnelle

- Web Annotation + Media Fragments ciblent un segment ; IIIF organise durée, pages d’annotations et chapitres ; EBUCore couvre agents, événements, lieux, droits et provenance. [@standards-01] [@standards-02] [@standards-03] [@standards-04]
- WebVTT porte les pistes textuelles temporisées ; PROV décrit l’origine ; ActivityStreams peut exporter les changements/audiences mais ne remplace ni transaction interne ni consentement. [@standards-05] [@standards-06] [@gap-governance-04] [@gap-governance-05]
- Le schéma transactionnel AIME doit rester simple et interne ; JSON-LD/IIIF/PROV/ActivityStreams sont des projections d’export, pas la base primaire.

### 5. Mémoire, oralité, culture, accessibilité et inclusion mondiale

- Une Timeline sonore doit accueillir voix, ambiances, silences, traditions et récits, pas seulement des enregistrements commerciaux. L’archive soutient une pratique vivante sans la figer. [@human-world-01] [@human-world-07]
- Consentement continu : corriger, masquer, restreindre, mettre sous embargo ou retirer selon personne, extrait, audience et usage. [@human-world-02] [@human-world-04] [@gap-governance-06]
- CARE et TK Labels montrent que l’interopérabilité ne prime pas sur l’autorité collective, la provenance culturelle et les protocoles locaux. [@gap-governance-01] [@gap-governance-02] [@gap-governance-07]
- L’alternative WCAG dépend du type de média ; transcription descriptive et identification des locuteurs sont des options d’accessibilité contextuelles. Pour les médias personnels à préserver, la LoC préfère un maître natif non compressé et documenté, au sein d’une politique plus large d’intégrité et de migration. [@human-world-03] [@gap-governance-03]

## Conflits et questions ouvertes

- **Résolu :** plateforme = adaptateur, jamais source de vérité ; la lecture ne doit pas bloquer l’existence du Moment. Sous la politique actuelle, Spotify ne doit pas être synchronisé à une Timeline visuelle sans autorisation spécifique. [@platforms-01]
- **Résolu :** privé/public ne se déduit pas du mot « mariage » ; décision juridique selon territoire, lieu, audience, contrat et usage.
- **Résolu :** journal d’activités, provenance et consentement sont trois couches différentes.
- **À limiter :** quotas, approbations et conditions commerciales des plateformes changent sans version publique stable.
- **À limiter :** les études terrain récentes sur la co-création musicale lors de vrais mariages restent rares.
- **À limiter :** les sources institutionnelles dirigées depuis l’Afrique, l’Amérique latine et l’Asie du Sud sont insuffisantes malgré l’orientation mondiale.

## Lacunes

- **Vers limitations :** cartographie juridique pays par pays et validation contractuelle d’un fournisseur — nécessitent conseil local et négociation.
- **Vers limitations :** disponibilité réelle des previews, quotas et abonnements — nécessite un prototype/test par compte et territoire.
- **Vers limitations :** effets utilisateurs enfants/seniors/cultures diverses — nécessite recherche primaire, hors capacité de cette étude.
- **Remplie :** responsabilité événementielle France/Royaume-Uni/États-Unis, avec réserve de portée. [@gap-rights-01] [@gap-rights-03] [@gap-rights-05]
- **Remplie :** souveraineté culturelle, formats maîtres et flux d’activité. [@gap-governance-01] [@gap-governance-03] [@gap-governance-04]

## Conclusions finales

- Le Moment relationnel, et non le morceau ni le fournisseur, doit rester l’unité durable.
- Recherche, identification, lecture, synchronisation, événement, publication et téléversement sont des capacités séparées.
- La Partition collaborative et la Session en direct doivent conserver des états, rôles et journaux distincts.
- Les droits, le contrat fournisseur, la licence du lieu, les données personnelles et le consentement ne doivent jamais être fusionnés en un statut unique.
- Les standards ouverts servent de projections d’import/export autour d’un modèle AIME interne, versionné et réversible.
- La portée est un cadre global initial ; les décisions juridiques et culturelles doivent être validées localement.
