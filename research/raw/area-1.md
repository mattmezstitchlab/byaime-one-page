## Key Facts
- **Spotify** : le Web Playback SDK lit dans le navigateur avec OAuth, mais l’utilisateur authentifié doit avoir Premium. Les objets exposent URI/ID (ID parfois nul). Les règles interdisent notamment l’altération du contenu, la synchronisation son-image, la diffusion non interactive et les intégrations de streaming commerciales. La documentation ne promet aucune portabilité hors Spotify. https://developer.spotify.com/documentation/web-playback-sdk/reference
- **Apple Music/MusicKit** : l’API recherche catalogue et bibliothèque, retourne des ressources typées (morceaux, albums, artistes, playlists, vidéos, stations, etc.) et prévoit des objets `Preview`/`PlayParameters`. Un developer token est requis; les données utilisateur exigent un Music User Token. Le catalogue dépend du storefront. https://developer.apple.com/documentation/applemusicapi
- **YouTube** : les clients ne peuvent ni fusionner les résultats YouTube avec d’autres sources, ni modifier le player, télécharger/cacher l’audiovisuel, isoler l’audio, ou jouer en arrière-plan. Les données non autorisées doivent généralement être rafraîchies/supprimées sous 30 jours; la révocation impose l’effacement des données autorisées. Politique mise à jour le 24 juin 2026. https://developers.google.com/youtube/terms/developer-policies
- **MusicBrainz** fournit des MBID pour identifier enregistrements, sorties, labels et artistes; sa recherche renvoie XML ou JSON. Son API publique impose une cadence prudente (plus d’un appel/seconde peut entraîner un blocage). https://musicbrainz.org/doc/MusicBrainz_Identifier ; https://musicbrainz.org/doc/MusicBrainz_API/Search
- **ListenBrainz** expose une API de listens et un endpoint de résolution de métadonnées vers des MBID à partir d’artiste/enregistrement/sortie : c’est une brique ouverte utile pour la couche d’interopérabilité, pas un moteur de lecture commerciale. https://listenbrainz.readthedocs.io/en/latest/users/api/index.html ; https://listenbrainz.readthedocs.io/en/latest/users/api/metadata.html
- **SoundCloud** autorise la lecture via widget embarqué ou URLs de flux transcodés et exige attribution/lien vers la source. La documentation actuelle indique qu’une application enregistrée et des identifiants API sont requis. https://developers.soundcloud.com/docs/api ; https://developers.soundcloud.com/docs
- **Deezer** maintient officiellement OAuth et un endpoint de recherche, mais sa documentation API détaillée est derrière connexion/acceptation des conditions; la FAQ officielle a été mise à jour le 14 mai 2025. https://support.deezer.com/hc/en-gb/articles/360011538897-Deezer-FAQs-For-Developers
- **TIDAL** propose officiellement API/SDK et accès à son catalogue; son quick start emploie un bearer access token. Les limites de lecture et d’abonnement ne sont pas visibles dans les résultats publics collectés. https://developer.tidal.com/documentation
- **ISRC** (ISO 3901:2019) est l’identifiant normalisé d’un enregistrement. Pour AIME, conserver ISRC + MBID + IDs fournisseurs séparés est plus portable qu’un ID Spotify/Apple/YouTube unique. https://www.iso.org/standard/64817.html

## Notable Claims Requiring Cross-Reference
- La portée exacte de l’interdiction Spotify des « commercial streaming integrations » doit être validée contractuellement pour le modèle économique précis d’AIME; elle provient d’une seule page officielle non datée.
- Chez Apple, la présence de `Preview` et `PlayParameters` ne prouve ni qu’une preview existe pour chaque morceau, ni qu’elle soit exportable/réutilisable hors MusicKit.
- L’exigence SoundCloud « Artist Pro » pour enregistrer une application est volatile et provient d’une documentation officielle sans date affichée; confirmation directe recommandée avant conception.
- La FAQ Deezer confirme OAuth/recherche, mais ne suffit pas à établir en 2026 la disponibilité universelle des previews, du streaming complet ou de la création/modification de playlists.
- Les résultats TIDAL confirment une plateforme API/SDK et l’authentification bearer, mais pas les territoires, quotas, abonnements requis ni les droits de lecture.
- Un ISRC ne remplace pas la gestion des variantes : œuvre, enregistrement, master, remaster, version live et disponibilité territoriale peuvent nécessiter MBID et rapprochement de métadonnées.

## Source Quality Assessment
- Spotify Web Playback SDK Reference — **Tier 1 officiel**, date non affichée; information volatile, donc à revalider.
- Apple Music API — **Tier 1 officiel**, date non affichée; information volatile, donc à revalider.
- YouTube API Services Policies — **Tier 1 officiel**, mise à jour 2026-06-24.
- MusicBrainz Identifier/Search/API — **Tier 1 institutionnel open-data**, date non affichée; formats relativement stables, limites d’usage à revalider.
- ListenBrainz API/Metadata — **Tier 1 institutionnel open-data**, date non affichée, documentation étiquetée 0.1.0.
- SoundCloud API Guide/Prerequisites — **Tier 1 officiel**, date non affichée; conditions d’accès volatiles.
- Deezer FAQs for Developers — **Tier 1 officiel**, mise à jour 2025-05-14; moins de 18 mois au 2026-09-08.
- TIDAL Developer Overview — **Tier 1 officiel**, date non affichée; détails insuffisants.
- ISO 3901:2019 — **Tier 1 organisme de normalisation**, édition 2019-02; plus de 18 mois mais non problématique pour une norme stable.
- IFPI ISRC Handbook — **Tier 1 organisme industriel officiel de l’ISRC**, 4e édition 2021; ancien mais pertinent pour la sémantique stable de l’identifiant.

## Gaps & Unanswered Questions
- Quotas, processus d’approbation, disponibilité territoriale et conditions commerciales 2026 de Spotify, Apple, SoundCloud, Deezer et TIDAL.
- Disponibilité, durée, URL, expiration et droit de réutilisation des previews, fournisseur par fournisseur.
- Matrice exacte des abonnements nécessaires à la lecture complète et comportement pour comptes gratuits/famille/étudiants.
- Droits de créer, modifier, importer et exporter playlists/favoris, ainsi que règles de conservation des IDs et métadonnées.
- Couverture réelle du rapprochement ISRC/MBID pour remasters, versions live, mixes, podcasts et contenus générés par les utilisateurs.
- Conditions d’affichage obligatoire, attribution, tracking et suppression lors de la révocation OAuth.
- API Deezer détaillée et documentation TIDAL de playback non accessibles avec assez de précision dans les pages publiques trouvées.

## Sources
1. Spotify, “Web Playback SDK Reference”, https://developer.spotify.com/documentation/web-playback-sdk/reference, date non affichée, Tier 1, `research/sources/platforms-01-spotify-web-playback-reference.md`.
2. Apple, “Apple Music API”, https://developer.apple.com/documentation/applemusicapi, date non affichée, Tier 1, `research/sources/platforms-02-apple-music-api.md`.
3. Google/YouTube, “YouTube API Services — Developer Policies”, https://developers.google.com/youtube/terms/developer-policies, 2026-06-24, Tier 1, `research/sources/platforms-03-youtube-developer-policies.md`.
4. MusicBrainz, “MusicBrainz Identifier”, https://musicbrainz.org/doc/MusicBrainz_Identifier, date non affichée, Tier 1, `research/sources/platforms-snippets.md`.
5. MusicBrainz, “MusicBrainz API / Search”, https://musicbrainz.org/doc/MusicBrainz_API/Search, date non affichée, Tier 1, `research/sources/platforms-snippets.md`.
6. MusicBrainz, “MusicBrainz API”, https://musicbrainz.org/doc/MusicBrainz_API, date non affichée, Tier 1, `research/sources/platforms-snippets.md`.
7. ListenBrainz, “ListenBrainz API”, https://listenbrainz.readthedocs.io/en/latest/users/api/index.html, date non affichée, Tier 1, `research/sources/platforms-snippets.md`.
8. ListenBrainz, “Metadata”, https://listenbrainz.readthedocs.io/en/latest/users/api/metadata.html, date non affichée, Tier 1, `research/sources/platforms-snippets.md`.
9. SoundCloud, “API Guide”, https://developers.soundcloud.com/docs/api, date non affichée, Tier 1, `research/sources/platforms-snippets.md`.
10. SoundCloud, “Developer prerequisites”, https://developers.soundcloud.com/docs, date non affichée, Tier 1, `research/sources/platforms-snippets.md`.
11. Deezer, “FAQs For Developers”, https://support.deezer.com/hc/en-gb/articles/360011538897-Deezer-FAQs-For-Developers, 2025-05-14, Tier 1, `research/sources/platforms-snippets.md`.
12. TIDAL, “Developer Platform Overview”, https://developer.tidal.com/documentation, date non affichée, Tier 1, `research/sources/platforms-snippets.md`.
13. ISO, “ISO 3901:2019 — International Standard Recording Code”, https://www.iso.org/standard/64817.html, 2019-02, Tier 1, `research/sources/platforms-snippets.md`.
14. IFPI, “International Standard Recording Code Handbook”, https://isrc.ifpi.org/images/downloads/ISRC_Handbook.pdf, 2021, Tier 1, `research/sources/platforms-snippets.md`.