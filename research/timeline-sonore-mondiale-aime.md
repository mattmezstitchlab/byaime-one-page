# De la playlist au récit vivant : recherche mondiale pour la Timeline sonore d’AIME

**Date de recherche :** 8 septembre 2026  
**Profondeur :** Approfondie  
**Sources consultées et citées :** 56  
**Portée :** cadre global initial ; validation locale et contractuelle requise avant lancement

## Résumé exécutif

AIME ne gagnerait pas à devenir une nouvelle application de playlists. Les plateformes dominantes savent déjà chercher, classer et lire des catalogues immenses, mais elles le font dans leurs propres identités, abonnements, territoires et règles. Spotify exige Premium pour son lecteur Web et a limité en 2026 les nouvelles applications en mode développeur à cinq utilisateurs ; Apple MusicKit sépare catalogue, bibliothèque personnelle, autorisation et abonnement ; YouTube interdit notamment d’extraire l’audio, de cacher la vidéo ou de combiner ses données de manière non conforme. Ces contraintes rendent dangereuse toute architecture où un ID Spotify, Apple ou YouTube deviendrait l’identité du son dans AIME. [[1]](https://developer.spotify.com/documentation/web-playback-sdk/reference) [[2]](https://developer.spotify.com/documentation/web-api/tutorials/february-2026-migration-guide) [[3]](https://developer.apple.com/documentation/applemusicapi) [[4]](https://developer.apple.com/videos/play/wwdc2026/254) [[5]](https://developers.google.com/youtube/terms/developer-policies)

Le meilleur espace stratégique pour AIME est ailleurs : faire du **Moment relationnel** l’unité durable. Un Moment peut relier un morceau commercial, une voix familiale, une ambiance de lieu, un silence intentionnel, des personnes, une période, une émotion, une audience, des droits et une provenance. Les standards existants fournissent de bonnes briques de projection — annotation temporelle, fragments média, chapitres audiovisuels, provenance et sous-titres — sans imposer un modèle transactionnel unique. [[6]](https://www.w3.org/TR/annotation-model/) [[7]](https://iiif.io/api/presentation/3.0/) [[8]](https://www.ebu.ch/metadata/ontologies/ebucore/) [[9]](https://www.w3.org/TR/media-frags) [[10]](https://www.w3.org/TR/prov-o) [[11]](https://www.w3.org/TR/webvtt1)

Cette orientation exige une discipline juridique et humaine native. Diffuser de la musique lors d’un événement, intégrer un lecteur, synchroniser un morceau avec des images, publier un extrait ou téléverser une voix sont des actes différents. Le droit, le contrat de la plateforme, la licence du lieu, la protection des données et le consentement ne doivent jamais être fusionnés dans un unique drapeau « autorisé ». [[12]](https://digital-strategy.ec.europa.eu/en/policies/copyright-legislation) [[13]](https://www.copyright.gov/policy/musiclicensingstudy/executive-summary.pdf) [[14]](https://eur-lex.europa.eu/legal-content/EN/TXT/HTML?uri=CELEX%3A52021DC0288) [[15]](https://eur-lex.europa.eu/eli/dir/2014/26/oj/eng) [[16]](https://www.wipo.int/en/web/wipo-magazine/articles/online-music-licensing-a-way-out-of-the-maze-37595) Pour les voix et traditions, le consentement doit pouvoir évoluer ; l’autorité peut être individuelle, familiale ou communautaire. Les principes CARE et les TK Labels montrent que l’interopérabilité technique ne prime pas sur l’autodétermination et les protocoles culturels. [[17]](https://oralhistory.org/oha-statement-on-ethics/) [[18]](https://oralhistory.org/rolling-consent/) [[19]](https://www.gida-global.org/careprinciples) [[20]](https://localcontexts.org/labels/traditional-knowledge-labels)

La recommandation est donc progressive : consolider d’abord le Moment et ses relations ; ajouter ensuite une résolution de catalogue ouverte sans lecture obligatoire ; construire la contribution collaborative avec rôles et approbations ; n’activer la lecture que par adaptateurs contractualisés ; puis accueillir les médias personnels avec consentement, accessibilité et préservation. La Timeline multimédia vient en dernier, seulement lorsque chaque média connaît son droit de lecture et de synchronisation.

## 1. Question et méthode

La recherche répond à une question de décision produit : **comment passer d’une liste de morceaux liée à un mariage à une Timeline sonore universelle, collaborative et multimédia, sans verrouillage fournisseur ni simplification juridique ou culturelle ?** Elle ne choisit pas un fournisseur définitif et ne construit pas le moteur. Elle établit les contraintes et les principes que l’audit de l’existant et la future architecture devront vérifier.

Cinq axes ont été étudiés en parallèle : plateformes et API ; droits et territoires ; collaboration et écoute sociale ; standards temporels et relationnels ; mémoire, oralité, culture et accessibilité. Deux approfondissements ont ensuite ciblé les licences événementielles en France, au Royaume-Uni et aux États-Unis, ainsi que la gouvernance culturelle, les formats de préservation et les flux d’activité. Les affirmations majeures ont été confrontées à des sources officielles, normatives ou académiques. Les sources commerciales événementielles ne servent qu’à documenter des modèles revendiqués, jamais leur efficacité.

Le mot « mondial » désigne ici un **cadre de conception global**, non une cartographie juridique exhaustive. Les sources de droit détaillées restent surtout européennes et nord-américaines. Les principes UNESCO, OMPI, CARE et Local Contexts élargissent la perspective, mais ne remplacent pas une validation locale en Afrique, Amérique latine, Asie du Sud, Moyen-Orient ou Océanie. [[21]](https://ich.unesco.org/en/oral-traditions-and-expressions-00053) [[22]](https://www.wipo.int/en/web/traditional-knowledge/traditional-cultural-expressions/index) [[23]](https://www.wipo.int/en/web/traditional-knowledge/traditional-cultural-expressions/digitizing-traditional-culture) [[19]](https://www.gida-global.org/careprinciples) [[20]](https://localcontexts.org/labels/traditional-knowledge-labels)

## 2. Constat principal : la plateforme ne doit jamais devenir le Monde

Une plateforme musicale apporte trois choses différentes : **découverte**, **identification** et **lecture**. Elles ne doivent pas former une seule dépendance. Une recherche peut retourner un morceau sans que l’utilisateur ait le droit de l’écouter dans AIME ; un identifiant peut résoudre un enregistrement indisponible dans un territoire ; un lecteur peut exiger un abonnement, une interface imposée ou une absence de synchronisation visuelle.

Spotify illustre le risque maximal. Son Web Playback SDK exige Premium, et sa politique interdit notamment certaines intégrations commerciales, la diffusion non interactive et la synchronisation du contenu Spotify avec des médias visuels. Son mode développeur 2026 exige aussi Premium pour le propriétaire de l’application et limite une nouvelle application à cinq utilisateurs. Un prototype peut donc tester l’authentification ou la lecture individuelle, mais il ne prouve ni la viabilité publique ni le droit de faire jouer Spotify sous une Timeline d’images et de vidéos. [[1]](https://developer.spotify.com/documentation/web-playback-sdk/reference) [[2]](https://developer.spotify.com/documentation/web-api/tutorials/february-2026-migration-guide)

Apple est plus nuancé. MusicKit donne accès au catalogue et aux bibliothèques avec des autorisations distinctes. La session WWDC26 indique qu’un utilisateur sans abonnement peut utiliser le sélecteur, mais seulement pour sa musique achetée ou synchronisée ; l’abonnement étend l’accès au catalogue Apple Music. Cette flexibilité ne transforme pas Apple en couche canonique : le storefront, la bibliothèque et les jetons utilisateur restent propres à Apple. [[3]](https://developer.apple.com/documentation/applemusicapi) [[4]](https://developer.apple.com/videos/play/wwdc2026/254)

YouTube est utile comme source audiovisuelle embarquée, pas comme réservoir audio. Sa politique interdit l’isolation de l’audio, le téléchargement ou cache non autorisé, la modification du lecteur et certaines combinaisons de données. Elle impose aussi des obligations autour du statut « Made for Kids » des vidéos embarquées. En juin-juillet 2026, ces règles restaient actives dans la politique et l’historique officiels. [[5]](https://developers.google.com/youtube/terms/developer-policies) [[24]](https://developers.google.com/youtube/v3/revision_history)

### Matrice des briques disponibles

| Brique | Ce qu’elle apporte | Limite structurante pour AIME | Rôle recommandé |
|---|---|---|---|
| Spotify | Métadonnées, playlists, lecture Web autorisée | Premium, accès développeur très limité, restrictions commerciales et de synchronisation visuelle [[1]](https://developer.spotify.com/documentation/web-playback-sdk/reference) [[2]](https://developer.spotify.com/documentation/web-api/tutorials/february-2026-migration-guide) | Adaptateur expérimental ; jamais lecteur par défaut d’une Timeline visuelle |
| Apple Music / MusicKit | Catalogue, bibliothèque personnelle, picker, lecture dans l’écosystème Apple | Autorisations, abonnement/catalogue, storefront et dépendance Apple [[3]](https://developer.apple.com/documentation/applemusicapi) [[4]](https://developer.apple.com/videos/play/wwdc2026/254) | Adaptateur candidat à tester par territoire et type de compte |
| YouTube | Recherche et lecteur audiovisuel embarqué | Pas d’extraction audio, cache ou interface détournée ; données et enfants encadrés [[5]](https://developers.google.com/youtube/terms/developer-policies) [[24]](https://developers.google.com/youtube/v3/revision_history) | Lien ou embed conforme, séparé d’un « morceau audio » |
| SoundCloud | Flux ou widget avec attribution selon l’accès accordé | Accès applicatif et conditions volatiles, couverture hétérogène [[25]](https://developers.soundcloud.com/docs/api) [[26]](https://developers.soundcloud.com/docs) | Candidat pour créateurs, après validation d’accès et d’attribution |
| Deezer / TIDAL | Catalogue et API déclarés | Documentation publique insuffisante pour conclure sur lecture, quotas et territoires [[27]](https://support.deezer.com/hc/en-gb/articles/360011538897-Deezer-FAQs-For-Developers) [[28]](https://developer.tidal.com/documentation) | À garder dans le benchmark, pas dans l’architecture critique initiale |
| MusicBrainz / ListenBrainz | Identifiants ouverts, recherche, résolution de métadonnées et historiques d’écoute | Pas de licence ni moteur de lecture commerciale [[29]](https://musicbrainz.org/doc/MusicBrainz_Identifier) [[30]](https://musicbrainz.org/doc/MusicBrainz_API/Search) [[31]](https://listenbrainz.readthedocs.io/en/latest/users/api/index.html) [[32]](https://listenbrainz.readthedocs.io/en/latest/users/api/metadata.html) | Couche de rapprochement et d’enrichissement, avec cache et provenance |
| ISRC | Identifiant international d’un enregistrement | Ne résout pas seul œuvre, version, remaster, live ou disponibilité [[33]](https://www.iso.org/standard/64817.html) [[34]](https://isrc.ifpi.org/images/downloads/ISRC_Handbook.pdf) | Identifiant externe parmi plusieurs, jamais clé métier unique |

### Décision d’architecture

AIME devrait créer un **Sound Item interne** avec un identifiant immuable propre. Ce Sound Item peut porter plusieurs correspondances : ISRC, MBID, ID Spotify, ID Apple, ID YouTube, empreinte éventuelle, fichier personnel ou simple description sans média. Chaque correspondance doit conserver sa provenance, sa date de résolution, sa confiance, son territoire observé et son état de disponibilité. Cette structure est une décision de conception inspirée des identifiants ouverts et des modèles de provenance ; aucun standard ne la prescrit à lui seul. [[29]](https://musicbrainz.org/doc/MusicBrainz_Identifier) [[33]](https://www.iso.org/standard/64817.html) [[10]](https://www.w3.org/TR/prov-o)

La lecture devient alors une capacité facultative : « écouter chez le fournisseur », « lire un extrait autorisé », « jouer un fichier personnel autorisé » ou « indisponible ici ». Le Moment reste lisible même lorsque le son ne l’est plus. C’est essentiel pour qu’un souvenir, une relation ou une intention ne disparaisse pas avec un catalogue.

## 3. Le vrai produit collaboratif n’est pas la playlist

Les outils existants révèlent deux temporalités complémentaires. Spotify Jam organise une session synchrone et éphémère : un hôte garde des contrôles, les invités rejoignent la file et les règles de compte changent selon présence ou distance. La playlist collaborative Apple est un objet persistant : le propriétaire admet des personnes, les participants ajoutent, suppriment ou réordonnent et peuvent réagir. Elle convient potentiellement à une préparation asynchrone, même si Apple ne la décrit pas avec ce terme. [[35]](https://support.spotify.com/us/article/jam) [[36]](https://support.apple.com/guide/iphone/collaborate-on-a-playlist-iphcbe62053f/ios)

AIME doit donc séparer **Partition** et **Session**. La Partition prépare le sens : quel Moment, quelle intention, quelles personnes, quelles propositions, quelle décision. La Session orchestre l’exécution : ordre courant, prochain son, contrôle, reprise, incidents et journal réel. Confondre les deux ferait d’une discussion longue une file de lecture fragile, ou d’une file de lecture un faux registre de décision.

Une étude CHI sur la création collective de playlists a observé, dans son dispositif expérimental, qu’un avis négatif unique pouvait peser plus qu’une majorité positive. L’échantillon et les groupes simulés interdisent toute généralisation directe à un mariage, mais le résultat suffit à déconseiller une gouvernance fondée uniquement sur l’unanimité ou le vote brut. [[37]](http://diva-portal.org/smash/get/diva2:1393660/FULLTEXT01.pdf) La décision AIME devrait distinguer : proposition, réaction, préférence personnelle, objection explicite, décision du couple ou du responsable, et ordre officiel.

Des produits événementiels revendiquent déjà l’accès par QR code, les demandes sans compte, le vote ou la modération. Ces sources sont promotionnelles ; elles prouvent l’existence d’une proposition de valeur, pas la réduction réelle de friction, la résilience réseau, la conformité ou la qualité de l’événement. [[38]](https://www.weddie.app/en/music) [[39]](https://www.wedibox.com/features/shared-playlist) Le QR code doit donc être une hypothèse d’acquisition à tester, pas un principe d’architecture.

### Gouvernance recommandée par phase

| Phase | Contribution | Autorité | Sortie durable |
|---|---|---|---|
| Avant | Proposer, commenter, associer une intention ou un Moment | Couple, organisateur ou propriétaire du Monde approuve | Partition versionnée |
| Pendant | Rejoindre, demander, réagir, signaler | Régie/DJ/hôte contrôle la file et peut reprendre la main | Journal d’exécution distinct de la Partition |
| Après | Identifier, raconter, corriger, ajouter voix et souvenirs | Personne concernée + règles d’audience et de consentement | Récit sonore enrichi, non simple historique d’écoute |

Cette gouvernance protège les rôles professionnels sans retirer la voix aux proches. Elle permet aussi de garder un historique compréhensible : qui a proposé, qui a approuvé, ce qui a réellement été joué et ce qui a ensuite été raconté.

## 4. Droit et contrat : une matrice, pas un bouton « autorisé »

Le droit musical est fragmenté par catégories de droits, territoires et intermédiaires. Dans l’Union européenne, auteurs, interprètes, producteurs et diffuseurs relèvent de droits distincts ; les licences multiterritoriales en ligne restent définies par les territoires et droits couverts. Aux États-Unis, composition et enregistrement sonore sont également distingués, avec des régimes différents pour exécution, reproduction et streaming. [[12]](https://digital-strategy.ec.europa.eu/en/policies/copyright-legislation) [[13]](https://www.copyright.gov/policy/musiclicensingstudy/executive-summary.pdf) [[15]](https://eur-lex.europa.eu/eli/dir/2014/26/oj/eng)

Les exemples événementiels montrent pourquoi AIME doit rester prudent. Une page publique française indique qu’une association diffusant publiquement des œuvres protégées lors d’une manifestation doit demander une autorisation ; elle ne décide pas si tout mariage français est public. Au Royaume-Uni, PPL PRS attribue dans certains bâtiments communautaires la responsabilité à l’exploitant pour les événements avec DJ ; cette règle ne couvre pas tous les contrats de mariage. ASCAP explique, pour des établissements américains, que plusieurs acteurs peuvent être responsables et que l’entreprise bénéficiaire obtient habituellement la licence ; cela ne qualifie pas chaque réception privée. [[40]](https://associations.gouv.fr/la-sacem-et-la-diffusion-doeuvres-musicales) [[41]](https://pplprs.co.uk/themusiclicence/sectors/community) [[42]](https://www.ascap.com/help/ascap-licensing/why-ascap-licenses-bars-restaurants-music-venues)

Le produit ne doit donc jamais afficher « votre mariage est couvert » à partir d’un pays ou d’un type de compte. Il peut demander : où, quel lieu, quelle audience, qui exploite la salle, qui joue la musique, quelle licence existe, et quel acte est envisagé. La réponse finale peut être « à vérifier avec le lieu, le prestataire ou la société de gestion ».

### Matrice minimale par usage

| Usage | Droit d’auteur / voisin | Contrat plateforme | Événement / lieu | Données et consentement | Décision AIME |
|---|---|---|---|---|---|
| Lien profond vers un morceau | Ne pas assimiler automatiquement à une copie | Respecter attribution, marque et URL permise | Sans objet en soi | Journaliser le clic seulement si nécessaire | Autoriser avec provenance et fournisseur |
| Embed ou lecteur API | Vérifier les droits couverts par le service | Interface, compte, territoire, cache et usages imposés [[1]](https://developer.spotify.com/documentation/web-playback-sdk/reference) [[5]](https://developers.google.com/youtube/terms/developer-policies) | Peut se combiner à une diffusion événementielle | Minimisation des données OAuth | Adaptateur isolé, révocable |
| Diffusion sur le lieu | Exécution publique potentielle selon le cas | Un abonnement personnel ne vaut pas licence événementielle | Vérifier lieu, organisateur, DJ et territoire [[40]](https://associations.gouv.fr/la-sacem-et-la-diffusion-doeuvres-musicales) [[41]](https://pplprs.co.uk/themusiclicence/sectors/community) [[42]](https://www.ascap.com/help/ascap-licensing/why-ascap-licenses-bars-restaurants-music-venues) | Liste d’invités non nécessaire au contrôle musical | État « licence à confirmer » |
| Extrait hébergé par AIME | Pas d’exception universelle liée à la seule durée | Les previews ne sont pas librement réutilisables par défaut | Distinct de la diffusion sur place | Audience et durée de conservation | Désactivé sans base claire |
| Musique synchronisée à photos/vidéo | Droit de synchronisation à qualifier | Spotify interdit cette synchronisation dans ses règles ordinaires [[1]](https://developer.spotify.com/documentation/web-playback-sdk/reference) | Licence événementielle insuffisante | Consentement image/voix séparé | Seulement média détenu/licencié ou autorisation directe |
| Voix ou ambiance téléversée | Droits du narrateur, interprète ou tiers possibles | Conditions d’hébergement AIME | Souvent hors licence musicale du lieu | Base légale, audience, mineurs, retrait [[43]](https://www.cnil.fr/fr/cnil-droits/droits-des-mineurs?page=1) [[44]](https://www.autoriteprotectiondonnees.be/professionnel/rgpd-/droits-des-citoyens/droit-a-l-effacement) [[17]](https://oralhistory.org/oha-statement-on-ethics/) | Consentement et audience versionnés |
| Publication publique / UGC | Autorisation ou exception à établir | Notice-and-action, règles de plateforme | Sans équivalence automatique | Modération, recours, retrait | Workflow de publication distinct |

L’article 17 européen encadre les fournisseurs de partage de contenus et leurs mécanismes d’autorisation/retrait ; le DMCA américain organise une limitation conditionnelle de responsabilité et des notifications. Aucun des deux ne donne à l’utilisateur une licence musicale générale. [[45]](https://ec.europa.eu/commission/presscorner/detail/en/ip_21_1807) [[46]](https://www.copyright.gov/dmca) [[14]](https://eur-lex.europa.eu/legal-content/EN/TXT/HTML?uri=CELEX%3A52021DC0288) Il n’existe pas non plus, dans le corpus étudié, de règle mondiale rendant automatiquement licite un « court extrait ». [[16]](https://www.wipo.int/en/web/wipo-magazine/articles/online-music-licensing-a-way-out-of-the-maze-37595)

Pour les données personnelles, AIME doit éviter un deuxième raccourci : « consentement » n’est pas toujours la seule base légale, et le droit à l’effacement n’est pas absolu. En revanche, une voix identifiable, la participation d’un mineur, la publication d’un souvenir et l’audience d’un récit imposent une analyse séparée, avec une information adaptée, une durée et un mécanisme de retrait. [[43]](https://www.cnil.fr/fr/cnil-droits/droits-des-mineurs?page=1) [[44]](https://www.autoriteprotectiondonnees.be/professionnel/rgpd-/droits-des-citoyens/droit-a-l-effacement)

## 5. Architecture ouverte : le Moment d’abord, les standards en projections

Plusieurs standards fournissent des composants convergents. Le Web Annotation Data Model relie un corps à une cible, avec motivation, agent, horodatage et sélecteurs. Media Fragments permet de cibler une plage temporelle. IIIF Presentation 3 organise un média audiovisuel sur des Canvases à durée, des pages d’annotations et des Ranges comparables à des chapitres. EBUCore relie ressources audiovisuelles, agents, rôles, lieux, événements, droits et provenance. [[6]](https://www.w3.org/TR/annotation-model/) [[7]](https://iiif.io/api/presentation/3.0/) [[8]](https://www.ebu.ch/metadata/ontologies/ebucore/) [[9]](https://www.w3.org/TR/media-frags)

Ces convergences justifient une architecture relationnelle, mais pas la copie intégrale d’une ontologie dans la base AIME. Le modèle transactionnel doit rester compréhensible et performant ; les standards doivent servir aux imports, exports et projections. PROV-O peut exprimer l’origine d’une donnée ; ActivityStreams 2.0 peut exposer une activité avec acteur, objet, cible, audience et tombstone ; aucun des deux ne remplace un journal transactionnel ni un consentement juridiquement qualifié. [[10]](https://www.w3.org/TR/prov-o) [[47]](https://www.w3.org/TR/activitystreams-vocabulary) [[48]](https://www.w3.org/TR/prov-overview)

### Noyau conceptuel proposé

| Objet AIME | Rôle | Relations essentielles |
|---|---|---|
| Moment | Unité narrative et temporelle | Monde, période, lieu, personnes, intentions, audience |
| Sound Item | Identité sonore indépendante de la lecture | œuvre/enregistrement, fichier personnel, description, fournisseurs |
| Media Binding | Lie tout ou partie d’un média à un Moment | cible temporelle, rôle narratif, ordre, chevauchement |
| Contribution | Proposition ou récit d’une personne | auteur, contexte, état, visibilité, modération |
| Decision | Validation humaine | décideur, motif, version, annulation |
| Rights & Consent Statement | Conditions d’usage | territoire, usage, audience, titulaire, base, expiration, retrait |
| Provider Mapping | Résolution externe | fournisseur, identifiant, storefront, confiance, date, disponibilité |
| Provenance Activity | Origine et transformation | source, agent, import, transcription, correction, dérivé |
| Playback Event | Ce qui a réellement été joué | session, horodatage, appareil, résultat, incident |

Ce noyau est volontairement plus large que la musique commerciale. Il peut relier un discours, un chant transmis oralement, une ambiance de rue, un morceau Apple Music ou un silence. Le Sound Item n’est donc pas nécessairement « jouable ». Le Media Binding peut viser le média entier ou un fragment temporel ; WebVTT peut fournir une piste textuelle synchronisée lorsque le contexte d’accessibilité le demande. [[6]](https://www.w3.org/TR/annotation-model/) [[9]](https://www.w3.org/TR/media-frags) [[11]](https://www.w3.org/TR/webvtt1)

Une émotion doit rester une annotation qualifiée, pas une vérité calculée. AIME peut enregistrer « joie selon Paul », « apaisant pour la cérémonie » ou « à confirmer par la famille », avec auteur, date et confiance. Cette approche suit le principe général de provenance sans prétendre qu’une ontologie standardise l’expérience humaine. [[10]](https://www.w3.org/TR/prov-o)

## 6. Au-delà du catalogue : mémoire, oralité et cultures d’écoute

L’UNESCO décrit les traditions orales comme des pratiques vivantes qui transmettent savoirs, valeurs et mémoire collective. L’enregistrement aide à sauvegarder, mais ne doit pas transformer une pratique variable en produit figé. [[21]](https://ich.unesco.org/en/oral-traditions-and-expressions-00053) Cette idée change la Timeline sonore : conserver un chant ou une histoire n’est pas seulement stocker un fichier ; c’est préserver qui peut le transmettre, dans quel contexte et avec quelle autorité.

Les recommandations de l’Oral History Association insistent sur l’information préalable, les risques, les usages futurs, la révision, l’occultation, les restrictions ou l’embargo avant publication. Le « rolling consent » pousse plus loin cette logique : l’accord peut être reconfirmé lorsqu’un usage sort de la compréhension initiale. Ces recommandations ne sont pas une loi mondiale, mais elles constituent un modèle de gouvernance prudent pour des voix personnelles. [[17]](https://oralhistory.org/oha-statement-on-ethics/) [[18]](https://oralhistory.org/rolling-consent/) [[49]](https://oralhistory.org/guidelines-for-social-justice-oral-history-work/)

Les principes CARE répondent à une autre limite : des données peuvent être trouvables et interopérables sans être légitimement réutilisables. CARE ajoute bénéfice collectif, autorité de contrôle, responsabilité et éthique. Les TK Labels permettent aux communautés d’exprimer des conditions locales de circulation et d’identifier l’autorité culturelle. Leur force juridique varie ; les implémenter comme de simples tags décoratifs trahirait leur finalité. [[19]](https://www.gida-global.org/careprinciples) [[20]](https://localcontexts.org/labels/traditional-knowledge-labels) Un protocole AIME doit donc pouvoir bloquer l’accès, exiger une approbation collective, changer après un décès ou refléter un désaccord — points qui nécessitent encore une conception avec les communautés concernées. Une étude archivistique 2025 montre justement un cas où des experts et services culturels tribaux examinent les demandes portant sur chants, histoires orales et entretiens. [[50]](https://digitalcommons.usu.edu/westernarchives/vol16/iss1/1/)

L’accessibilité doit être contextualisée. Pour l’audio seul préenregistré, WCAG demande au niveau A une alternative temporelle équivalente ; les transcriptions descriptives, l’identification des locuteurs et la structure enrichie répondent à d’autres besoins, mais ne sont pas une obligation uniforme pour chaque média. [[51]](https://www.w3.org/WAI/media/av/transcripts) AIME devrait distinguer transcription minimale, transcription descriptive, traduction, sous-titres synchronisés et correction humaine, puis afficher clairement leur provenance.

La préservation dépasse également le format. La Library of Congress préfère pour l’acquisition audio des fichiers WAVE avec métadonnées, en résolution native et non compressée, avec le Broadcast WAVE comme option privilégiée. Cette préférence ne garantit pas la pérennité : intégrité, réplication, contrôle des accès, migrations et budgets restent nécessaires. [[52]](https://www.loc.gov/preservation/resources/rfs/audio.html) Les recommandations archivistiques plus anciennes confirment l’importance d’une stratégie de production et de préservation, mais leur âge impose de ne pas les transformer en spécification technique suffisante. [[53]](https://www.iasa-web.org/tc04/audio-preservation)

Des cartes sonores participatives comme Cities and Memory montrent qu’un son peut être relié à un lieu et à une réinterprétation ; leurs chiffres sont auto-déclarés et ne prouvent ni représentativité mondiale ni viabilité pour AIME. [[54]](https://citiesandmemory.com/) Les travaux sur le récit intergénérationnel autour d’objets-souvenirs et la critique de l’« écoute affamée » fournissent deux rappels complémentaires : l’interface doit rester simple pour transmettre, et elle ne doit pas imposer une manière occidentale supposée universelle d’écouter ou de collecter. [[55]](https://link.springer.com/article/10.1007/s00779-020-01364-9) [[56]](https://music.ubc.ca/publications/hungry-listening/)

## 7. Analyse : l’avantage défendable d’AIME

Les plateformes possèdent la lecture ; AIME peut posséder la **relation**. La valeur durable n’est pas le flux audio, facilement bloqué par un abonnement ou une politique, mais le graphe qui explique pourquoi ce son compte ici, pour qui, à quel Moment, avec quelle décision et quelle mémoire. Cette distinction donne à AIME une continuité que les playlists n’offrent pas : lorsque le fournisseur change, le Moment reste ; lorsque la lecture devient impossible, le récit reste ; lorsque plusieurs médias racontent la même scène, ils convergent vers le même Moment.

Le deuxième avantage est la continuité avant-pendant-après. Les produits actuels séparent souvent préparation collaborative et session en direct. [[35]](https://support.spotify.com/us/article/jam) [[36]](https://support.apple.com/guide/iphone/collaborate-on-a-playlist-iphcbe62053f/ios) AIME peut relier intention, proposition, validation, exécution réelle et souvenir, sans confondre ces états. Cette continuité prépare la Ripple UI : une décision validée dans la Partition peut apparaître dans la régie, l’information des personnes concernées et le récit après l’événement.

Le troisième avantage est la confiance explicite. La disponibilité d’une API ne vaut ni droit de lecture ni consentement. Un système qui montre « fourni par Apple », « lecture indisponible dans ce territoire », « autorisation du narrateur expirée » ou « licence du lieu à confirmer » devient plus crédible qu’un lecteur qui échoue silencieusement. Les obligations de suppression de données YouTube, les règles OAuth des fournisseurs et les droits de retrait renforcent la nécessité d’un état visible et réversible. [[5]](https://developers.google.com/youtube/terms/developer-policies) [[44]](https://www.autoriteprotectiondonnees.be/professionnel/rgpd-/droits-des-citoyens/droit-a-l-effacement)

Cette stratégie impose toutefois un renoncement : AIME ne doit pas promettre immédiatement une lecture universelle ou une synchronisation automatique avec photos et vidéos. Une telle promesse serait techniquement fragile et juridiquement trompeuse. Sous les règles actuelles, Spotify est notamment incompatible avec une synchronisation visuelle ordinaire sans autorisation particulière. [[1]](https://developer.spotify.com/documentation/web-playback-sdk/reference) Le produit doit d’abord réussir l’organisation, la signification, la contribution et la portabilité.

## 8. Recommandations ordonnées

### 1. Auditer l’existant avec quatre statuts stricts

Classer chaque capacité actuelle comme **réelle**, **partielle**, **absente** ou **réutilisable**, et séparer recherche, identification, édition, lecture, téléversement, collaboration, synchronisation et droits. Une métadonnée de démonstration ou un bouton sans fournisseur ne doit jamais compter comme lecture réelle.

### 2. Stabiliser le Moment et le Sound Item avant tout fournisseur

Créer une identité AIME indépendante, relier les IDs externes comme correspondances et conserver provenance/confiance. Le Moment doit exister sans morceau et le Sound Item sans lecture. ISRC et MBID enrichissent le rapprochement, mais ne remplacent ni la clé AIME ni la gestion des versions. [[29]](https://musicbrainz.org/doc/MusicBrainz_Identifier) [[33]](https://www.iso.org/standard/64817.html) [[34]](https://isrc.ifpi.org/images/downloads/ISRC_Handbook.pdf)

### 3. Livrer d’abord la recherche et le lien profond

La première intégration utile peut rechercher des métadonnées, relier un résultat à un Moment et ouvrir le fournisseur. Ne pas héberger d’extrait ni promettre la lecture complète tant que droits, comptes, territoires, quotas et conditions d’usage ne sont pas validés. Les limites 2026 de Spotify rendent ce séquençage particulièrement important. [[2]](https://developer.spotify.com/documentation/web-api/tutorials/february-2026-migration-guide)

### 4. Construire une matrice Rights & Consent native

Séparer au minimum : usage, territoire, audience, fournisseur, titulaire, base juridique ou contractuelle, licence événementielle, expiration, preuve, retrait et état humain « à vérifier ». Le droit de synchroniser doit être distinct du droit de jouer ; le droit de publier une voix doit être distinct du droit de conserver son fichier. [[12]](https://digital-strategy.ec.europa.eu/en/policies/copyright-legislation) [[14]](https://eur-lex.europa.eu/legal-content/EN/TXT/HTML?uri=CELEX%3A52021DC0288) [[17]](https://oralhistory.org/oha-statement-on-ethics/)

### 5. Concevoir la Partition collaborative avant la Session live

Permettre proposition, commentaire, réaction, objection et validation, avec rôles. Ne pas transformer le vote en décision. Garder un journal d’annulation et un état officiel. Ensuite seulement, construire une Session avec hôte, file, reprise, déconnexion et journal de ce qui a réellement été joué. [[35]](https://support.spotify.com/us/article/jam) [[36]](https://support.apple.com/guide/iphone/collaborate-on-a-playlist-iphcbe62053f/ios) [[37]](http://diva-portal.org/smash/get/diva2:1393660/FULLTEXT01.pdf)

### 6. Tester un seul adaptateur de lecture, isolé et révocable

Choisir le fournisseur pilote après une validation contractuelle. Le test doit couvrir comptes gratuits/payants, territoires, mobile/Web, révocation OAuth, indisponibilité, quotas, attribution et suppression. Aucun composant AIME ne doit dépendre directement du schéma fournisseur. Apple MusicKit offre en 2026 une piste intéressante entre bibliothèque personnelle et catalogue, mais cela reste une hypothèse à tester, pas un choix acté. [[4]](https://developer.apple.com/videos/play/wwdc2026/254)

### 7. Accueillir les médias personnels avec consentement continu

Avant l’upload public, prendre en charge l’audience privée, le retrait, les mineurs, l’embargo, la correction de transcription et la provenance. Ajouter ensuite les protocoles collectifs et culturels avec des partenaires concernés ; CARE et TK Labels ne doivent pas être implémentés sans gouvernance réelle. [[43]](https://www.cnil.fr/fr/cnil-droits/droits-des-mineurs?page=1) [[18]](https://oralhistory.org/rolling-consent/) [[19]](https://www.gida-global.org/careprinciples) [[20]](https://localcontexts.org/labels/traditional-knowledge-labels)

### 8. Préparer l’export multimédia, sans l’activer par défaut

Projeter le modèle interne vers Web Annotation, IIIF, WebVTT et PROV selon le besoin. N’autoriser la synchronisation audio-image que pour les médias détenus, licenciés ou explicitement autorisés. Un export doit inclure provenance, droits et avertissements, pas seulement les fichiers. [[6]](https://www.w3.org/TR/annotation-model/) [[7]](https://iiif.io/api/presentation/3.0/) [[10]](https://www.w3.org/TR/prov-o) [[11]](https://www.w3.org/TR/webvtt1)

### 9. Mesurer la réussite autrement que par le nombre de morceaux

Mesurer : Moments enrichis, décisions comprises, personnes réellement concernées, conflits résolus, droits vérifiés, contributions accessibles, retraits respectés et continuité avant-pendant-après. Le nombre de pistes ou d’heures lues est une métrique fournisseur, pas la preuve qu’AIME construit un récit vivant.

## 9. Ce qu’il ne faut pas construire maintenant

AIME ne doit pas construire un agrégateur qui mélange les résultats YouTube avec d’autres catalogues dans une interface non conforme, un cache de previews supposées libres, une lecture Spotify synchronisée à un diaporama, un upload public sans notice-and-action, ni un vote d’invités qui remplace la décision du couple ou du professionnel. [[1]](https://developer.spotify.com/documentation/web-playback-sdk/reference) [[5]](https://developers.google.com/youtube/terms/developer-policies) [[46]](https://www.copyright.gov/dmca) [[14]](https://eur-lex.europa.eu/legal-content/EN/TXT/HTML?uri=CELEX%3A52021DC0288) [[37]](http://diva-portal.org/smash/get/diva2:1393660/FULLTEXT01.pdf)

Il ne faut pas non plus copier IIIF, EBUCore ou ActivityStreams comme schéma primaire. Ces standards sont précieux pour interopérer, mais l’expérience AIME exige un modèle métier lisible, versionné et réversible. [[7]](https://iiif.io/api/presentation/3.0/) [[8]](https://www.ebu.ch/metadata/ontologies/ebucore/) [[47]](https://www.w3.org/TR/activitystreams-vocabulary)

Enfin, il serait prématuré de qualifier la solution de pleinement mondiale. Le cadre est global ; la preuve terrain et juridique ne l’est pas encore. L’ouverture internationale doit commencer par la capacité de localiser les règles, d’écouter les autorités communautaires, de traduire les consentements et de refuser une réutilisation techniquement possible mais socialement illégitime. [[19]](https://www.gida-global.org/careprinciples) [[20]](https://localcontexts.org/labels/traditional-knowledge-labels) [[49]](https://oralhistory.org/guidelines-for-social-justice-oral-history-work/)

## 10. Limites

Cette recherche ne remplace ni un avis juridique, ni une négociation de licence, ni un test de compte fournisseur. Les contrats, quotas, catalogues, abonnements et approbations changent rapidement ; les pages non datées ont été signalées et doivent être revalidées avant implémentation. Le mode développeur Spotify de février 2026 montre précisément qu’une capacité peut se réduire brutalement. [[2]](https://developer.spotify.com/documentation/web-api/tutorials/february-2026-migration-guide)

Le corpus juridique détaillé privilégie l’Union européenne, la France, le Royaume-Uni et les États-Unis. Les cadres UNESCO, OMPI, CARE et Local Contexts donnent des principes plus globaux, mais la recherche manque encore de règles locales et de travaux institutionnels dirigés depuis plusieurs régions. [[21]](https://ich.unesco.org/en/oral-traditions-and-expressions-00053) [[22]](https://www.wipo.int/en/web/traditional-knowledge/traditional-cultural-expressions/index) [[19]](https://www.gida-global.org/careprinciples) [[20]](https://localcontexts.org/labels/traditional-knowledge-labels)

Les études récentes sur de vrais mariages, avec familles préexistantes, enfants, seniors, professionnels et plusieurs cultures, sont rares. Les effets de l’interface, du vote, du QR code et des rôles devront être étudiés sur le terrain. Les sources commerciales événementielles restent des déclarations produit. [[37]](http://diva-portal.org/smash/get/diva2:1393660/FULLTEXT01.pdf) [[38]](https://www.weddie.app/en/music) [[39]](https://www.wedibox.com/features/shared-playlist)

La préservation à long terme ne se résume pas à WAVE ou Broadcast WAVE. Une politique opérationnelle devra définir checksums, réplication, chiffrement, migrations, coûts, suppression et propagation du retrait. [[52]](https://www.loc.gov/preservation/resources/rfs/audio.html)

## Conclusion

La recherche mondiale ne conduit pas à choisir « le meilleur service musical ». Elle conduit à protéger ce que les services ne peuvent pas posséder : le Moment, la relation, l’intention, la décision, le consentement et la mémoire.

La progression cohérente pour AIME est donc : **playlist reliée → partition de Moments → session sonore → Timeline multimédia → récit vivant → Monde connecté**. Chaque étape doit garder la précédente intelligible, réversible et indépendante du fournisseur. La musique devient ainsi la première projection spécialisée d’un moteur universel des Moments — pas une destination isolée, et encore moins une simple liste de chansons.

## Sources

1. [Spotify, Web Playback SDK Reference](https://developer.spotify.com/documentation/web-playback-sdk/reference) — Publication : date non affichée ; Tier 1 ; preuve : research/sources/platforms-01-spotify-web-playback-reference.md
2. [February 2026 Web API Dev Mode Changes — Migration Guide](https://developer.spotify.com/documentation/web-api/tutorials/february-2026-migration-guide) — Publication : février 2026 ; Tier 1 ; preuve : research/sources/freshness-01-spotify-february-2026.md
3. [Apple, Apple Music API](https://developer.apple.com/documentation/applemusicapi) — Publication : date non affichée ; Tier 1 ; preuve : research/sources/platforms-02-apple-music-api.md
4. [Integrate MusicKit into your app — WWDC26](https://developer.apple.com/videos/play/wwdc2026/254) — Publication : 2026 ; Tier 1 ; preuve : research/sources/freshness-02-apple-musickit-wwdc26.md
5. [Google/YouTube, YouTube API Services — Developer Policies](https://developers.google.com/youtube/terms/developer-policies) — Publication : 2026-06-24 ; Tier 1 ; preuve : research/sources/platforms-03-youtube-developer-policies.md
6. [Web Annotation Data Model](https://www.w3.org/TR/annotation-model/) — Publication : 2017-02-23 ; Tier 1 ; preuve : research/sources/standards-01-w3c-web-annotation.md
7. [IIIF Presentation API 3.0](https://iiif.io/api/presentation/3.0/) — Publication : 2020-06-03 ; Tier 1 ; preuve : research/sources/standards-02-iiif-presentation-3.md
8. [EBUCore Ontology Documentation](https://www.ebu.ch/metadata/ontologies/ebucore/) — Publication : 2020/version 1.10 ; Tier 1 ; preuve : research/sources/standards-03-ebucore-ontology.md
9. [Media Fragments URI 1.0](https://www.w3.org/TR/media-frags) — Publication : 2012-09-25 ; Tier 1 ; preuve : research/sources/standards-snippets.md
10. [PROV-O](https://www.w3.org/TR/prov-o) — Publication : 2013-04-30 ; Tier 1 ; preuve : research/sources/standards-snippets.md
11. [WebVTT](https://www.w3.org/TR/webvtt1) — Publication : 2026-05-20 ; Tier 1 ; preuve : research/sources/standards-snippets.md
12. [EU copyright law](https://digital-strategy.ec.europa.eu/en/policies/copyright-legislation) — Publication : 22 juin 2026 ; Tier 1 ; preuve : research/sources/rights-01-eu-copyright-legislation.md
13. [Copyright and the Music Marketplace: Executive Summary](https://www.copyright.gov/policy/musiclicensingstudy/executive-summary.pdf) — Publication : février 2015, 2e impression mai 2016 ; Tier 1 ; preuve : research/sources/rights-02b-usco-music-marketplace-summary.md
14. [Guidance on Article 17 of Directive 2019/790](https://eur-lex.europa.eu/legal-content/EN/TXT/HTML?uri=CELEX%3A52021DC0288) — Publication : 2021-06-04 ; Tier 1 ; preuve : research/sources/gap-rights-snippets.md
15. [Directive 2014/26/EU](https://eur-lex.europa.eu/eli/dir/2014/26/oj/eng) — Publication : 2014-02-26 ; Tier 1 ; preuve : research/sources/gap-rights-snippets.md
16. [Online Music Licensing — A Way Out of the Maze](https://www.wipo.int/en/web/wipo-magazine/articles/online-music-licensing-a-way-out-of-the-maze-37595) — Publication : non indiquée ; consulté 2026-09-08 ; Tier 2 ; preuve : research/sources/gap-rights-snippets.md
17. [Oral History Association, OHA Statement on Ethics](https://oralhistory.org/oha-statement-on-ethics/) — Publication : 2025 ; Tier 2 ; preuve : research/sources/human-world-02-oha-ethics.md
18. [OHA, Rolling Consent](https://oralhistory.org/rolling-consent/) — Publication : date non indiquée ; Tier 2 ; preuve : research/sources/human-world-snippets.md
19. [The CARE Principles for Indigenous Data Governance](https://www.gida-global.org/careprinciples) — Publication : 2019 ; Tier 1 ; preuve : research/sources/gap-governance-01-care-principles.md
20. [Traditional Knowledge Labels](https://localcontexts.org/labels/traditional-knowledge-labels) — Publication : non indiquée ; consulté 2026-09-08 ; Tier 1 ; preuve : research/sources/gap-governance-snippets.md
21. [UNESCO, Oral traditions and expressions including language…](https://ich.unesco.org/en/oral-traditions-and-expressions-00053) — Publication : date non indiquée ; Tier 1 ; preuve : research/sources/human-world-01-unesco-oral-traditions.md
22. [WIPO, Traditional Cultural Expressions](https://www.wipo.int/en/web/traditional-knowledge/traditional-cultural-expressions/index) — Publication : date non indiquée ; Tier 1 ; preuve : research/sources/human-world-snippets.md
23. [WIPO, Digitizing Traditional Culture](https://www.wipo.int/en/web/traditional-knowledge/traditional-cultural-expressions/digitizing-traditional-culture) — Publication : date non indiquée ; Tier 1 ; preuve : research/sources/human-world-snippets.md
24. [YouTube Data API Revision History](https://developers.google.com/youtube/v3/revision_history) — Publication : mis à jour 2026-07-08 ; Tier 1 ; preuve : research/sources/freshness-03-youtube-revision-2026.md
25. [SoundCloud, API Guide](https://developers.soundcloud.com/docs/api) — Publication : date non affichée ; Tier 1 ; preuve : research/sources/platforms-snippets.md
26. [SoundCloud, Developer prerequisites](https://developers.soundcloud.com/docs) — Publication : date non affichée ; Tier 1 ; preuve : research/sources/platforms-snippets.md
27. [Deezer, FAQs For Developers](https://support.deezer.com/hc/en-gb/articles/360011538897-Deezer-FAQs-For-Developers) — Publication : 2025-05-14 ; Tier 1 ; preuve : research/sources/platforms-snippets.md
28. [TIDAL, Developer Platform Overview](https://developer.tidal.com/documentation) — Publication : date non affichée ; Tier 1 ; preuve : research/sources/platforms-snippets.md
29. [MusicBrainz, MusicBrainz Identifier](https://musicbrainz.org/doc/MusicBrainz_Identifier) — Publication : date non affichée ; Tier 1 ; preuve : research/sources/platforms-snippets.md
30. [MusicBrainz, MusicBrainz API / Search](https://musicbrainz.org/doc/MusicBrainz_API/Search) — Publication : date non affichée ; Tier 1 ; preuve : research/sources/platforms-snippets.md
31. [ListenBrainz, ListenBrainz API](https://listenbrainz.readthedocs.io/en/latest/users/api/index.html) — Publication : date non affichée ; Tier 1 ; preuve : research/sources/platforms-snippets.md
32. [ListenBrainz, Metadata](https://listenbrainz.readthedocs.io/en/latest/users/api/metadata.html) — Publication : date non affichée ; Tier 1 ; preuve : research/sources/platforms-snippets.md
33. [ISO, ISO 3901:2019 — International Standard Recording Code](https://www.iso.org/standard/64817.html) — Publication : 2019-02 ; Tier 1 ; preuve : research/sources/platforms-snippets.md
34. [IFPI, International Standard Recording Code Handbook](https://isrc.ifpi.org/images/downloads/ISRC_Handbook.pdf) — Publication : 2021 ; Tier 1 ; preuve : research/sources/platforms-snippets.md
35. [Start or join a Jam — Spotify Support](https://support.spotify.com/us/article/jam) — Publication : date non indiquée (consulté le 8 septembre 2026) ; Tier 1 ; preuve : research/sources/collaboration-01-spotify-jam.md
36. [Collaborate on a playlist in Music on iPhone — Apple Support](https://support.apple.com/guide/iphone/collaborate-on-a-playlist-iphcbe62053f/ios) — Publication : guide iOS 18/26; date éditoriale non indiquée (consulté le 8 septembre 2026) ; Tier 1 ; preuve : research/sources/collaboration-02-apple-collaborative-playlists.md
37. [Conformity Behavior in Music Playlist Creation in a Group — Christine Bauer et Bruce Ferwerda](http://diva-portal.org/smash/get/diva2:1393660/FULLTEXT01.pdf) — Publication : 25–30 avril 2020 ; Tier 1 ; preuve : research/sources/collaboration-03-conformity-group-playlists.md
38. [Guest Music Requests at Wedding - Interactive Playlist via QR Code — Weddie.app](https://www.weddie.app/en/music) — Publication : date non indiquée (consulté le 8 septembre 2026) ; Tier 3 ; preuve : research/sources/collaboration-snippets.md
39. [Shared Wedding Playlist with QR Code | Crowdsource Your Music — Wedibox](https://www.wedibox.com/features/shared-playlist) — Publication : date non indiquée (consulté le 8 septembre 2026) ; Tier 3 ; preuve : research/sources/collaboration-snippets.md
40. [La SACEM et la diffusion d'œuvres musicales](https://associations.gouv.fr/la-sacem-et-la-diffusion-doeuvres-musicales) — Publication : non indiquée ; consulté 2026-09-08 ; Tier 1 ; preuve : research/sources/gap-rights-01-france-sacem-evenements.md
41. [Community Building Music Licence](https://pplprs.co.uk/themusiclicence/sectors/community) — Publication : non indiquée ; consulté 2026-09-08 ; Tier 2 ; preuve : research/sources/gap-rights-02-uk-ppl-prs-community.md
42. [Why ASCAP Licenses Bars, Restaurants & Music Venues](https://www.ascap.com/help/ascap-licensing/why-ascap-licenses-bars-restaurants-music-venues) — Publication : non indiquée ; consulté 2026-09-08 ; Tier 2 ; preuve : research/sources/gap-rights-03-us-ascap-venues.md
43. [Droits des mineurs](https://www.cnil.fr/fr/cnil-droits/droits-des-mineurs?page=1) — Publication : recommandations de juin 2021 ; Tier 1 ; preuve : research/sources/rights-03-cnil-droits-mineurs.md
44. [Droit à l’effacement](https://www.autoriteprotectiondonnees.be/professionnel/rgpd-/droits-des-citoyens/droit-a-l-effacement) — Publication : date non indiquée; consulté le 8 septembre 2026 ; Tier 1 ; preuve : research/sources/rights-snippets.md
45. [New EU copyright rules](https://ec.europa.eu/commission/presscorner/detail/en/ip_21_1807) — Publication : 4 juin 2021 ; Tier 1 ; preuve : research/sources/rights-snippets.md
46. [The Digital Millennium Copyright Act](https://www.copyright.gov/dmca) — Publication : non indiquée ; consulté 2026-09-08 ; Tier 1 ; preuve : research/sources/gap-rights-snippets.md
47. [Activity Vocabulary](https://www.w3.org/TR/activitystreams-vocabulary) — Publication : 2017-05-23 ; Tier 1 ; preuve : research/sources/gap-governance-03-activitystreams-vocabulary.md
48. [PROV-Overview](https://www.w3.org/TR/prov-overview) — Publication : 2013-04-30 ; Tier 1 ; preuve : research/sources/gap-governance-snippets.md
49. [Guidelines for Social Justice Oral History Work](https://oralhistory.org/guidelines-for-social-justice-oral-history-work/) — Publication : 2022 ; Tier 2 ; preuve : research/sources/gap-governance-snippets.md
50. [Ethics of Care: Applying Cultural Protocols to Indigenous Sound Recordings](https://digitalcommons.usu.edu/westernarchives/vol16/iss1/1/) — Publication : 2025 ; Tier 2 ; preuve : research/sources/gap-governance-snippets.md
51. [W3C WAI, Transcripts](https://www.w3.org/WAI/media/av/transcripts) — Publication : date non indiquée ; Tier 1 ; preuve : research/sources/human-world-03-w3c-transcripts.md
52. [Recommended Formats Statement — Audio Works](https://www.loc.gov/preservation/resources/rfs/audio.html) — Publication : édition 2025–2026 ; Tier 1 ; preuve : research/sources/gap-governance-02-loc-audio-formats.md
53. [IASA, Guidelines on the Production and Preservation of Digital Audio Objects](https://www.iasa-web.org/tc04/audio-preservation) — Publication : 2009 ; Tier 2 ; preuve : research/sources/human-world-snippets.md
54. [Cities and Memory, Global sound map](https://citiesandmemory.com/) — Publication : date non indiquée ; Tier 2 ; preuve : research/sources/human-world-snippets.md
55. [Springer, Supporting intergenerational memento storytelling…](https://link.springer.com/article/10.1007/s00779-020-01364-9) — Publication : 25 janvier 2020 ; Tier 1 ; preuve : research/sources/human-world-snippets.md
56. [UBC School of Music, Hungry Listening](https://music.ubc.ca/publications/hungry-listening/) — Publication : ouvrage 2020 ; Tier 1 ; preuve : research/sources/human-world-snippets.md
