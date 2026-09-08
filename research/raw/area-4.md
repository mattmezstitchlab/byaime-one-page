## Key Facts
- W3C Web Annotation relie des `body` à des `target`, avec motivations, agents, horodatage/provenance et `SpecificResource`/sélecteurs; un `FragmentSelector` peut cibler un segment temporel. https://www.w3.org/TR/annotation-model/
- Media Fragments normalise les URI temporelles `t=10,20`, avec intervalles NPT et variantes SMPTE/horloge. https://www.w3.org/TR/media-frags
- IIIF Presentation 3 modélise l’AV par des Canvases à `duration`, des AnnotationPages et des cibles `t=`; les Ranges structurent chapitres/moments, tandis que `rights`, `requiredStatement` et `provider` couvrent droits et attribution. https://iiif.io/api/presentation/3.0/
- EBUCore 1.10 fournit un vocabulaire RDF audiovisuel riche: Asset/MediaResource, audio/vidéo, Agent/Role, Location, Event, Rights/Licensing/UsageRights et Provenance. https://www.ebu.ch/metadata/ontologies/ebucore/
- PROV-O permet l’échange de provenance entre systèmes; il complète mieux un journal d’événements interne qu’il ne le remplace. https://www.w3.org/TR/prov-o
- Pour la musique, `MusicRecording` fournit un type Web générique et les MBID apportent une identité UUID stable; ils doivent rester des identifiants externes, pas les clés métier uniques d’AIME. https://schema.org/MusicRecording ; https://musicbrainz.org/doc/MusicBrainz_Identifier
- WebVTT demeure actif en 2026 (Candidate Recommendation Draft du 20 mai 2026) et constitue la couche ouverte pertinente pour les pistes textuelles temporisées. https://www.w3.org/TR/webvtt1

## Notable Claims Requiring Cross-Reference
- Architecture proposée: entités internes séparées `MediaAsset`, `Moment/Event`, `Agent`, `Place`, `Emotion`, `RightsStatement`, `ProvenanceActivity`, plus une table/ressource d’annotation ciblant tout ou partie d’un média. C’est une synthèse, non un modèle prescrit par une source unique.
- IIIF 3.0 date de 2020; vérifier l’écosystème client et la trajectoire IIIF 4.0 avant adoption. EBUCore 1.10 et plusieurs recommandations W3C sont également anciennes, même si leur stabilité est intentionnelle.
- `Emotion` n’est pas couverte directement par les sources retenues: prévoir un vocabulaire contrôlé versionné et des annotations qualifiées.
- Event sourcing, ActivityStreams 2.0 et PROV-O ne sont pas interchangeables: journal transactionnel interne, flux social d’activités et provenance sémantique répondent à des besoins distincts.

## Source Quality Assessment
- W3C Web Annotation — Tier 1 officiel, 23 février 2017; stable mais ancien.
- IIIF Presentation 3.0 — Tier 1 officiel/consortium, 3 juin 2020; ancien pour une décision d’implémentation.
- EBUCore ontology — Tier 1 organisme sectoriel officiel, version 1.10/2020; ancien.
- W3C Media Fragments — Tier 1 officiel, 25 septembre 2012; ancien.
- W3C PROV-O — Tier 1 officiel, 30 avril 2013; ancien.
- W3C WebVTT — Tier 1 officiel, 20 mai 2026; actuel.
- IPTC Photo Metadata — Tier 1 organisme sectoriel, date non indiquée dans le résultat; fraîcheur à vérifier.
- Schema.org MusicRecording — Tier 2 consortium industriel établi, version de développement observée en juillet 2026; actuelle mais non normative.
- MusicBrainz Identifier — Tier 2 base communautaire établie, non daté; fraîcheur documentaire à vérifier.

## Gaps & Unanswered Questions
- Il manque une lecture primaire dédiée d’ActivityStreams 2.0, de Music Ontology, d’IPTC Video Metadata Hub et de la politique de persistance des MBID.
- À trancher: granularité d’un Moment, multi-ciblage d’une annotation, chevauchements temporels, fuseaux horaires, suppression/versionnement des droits et maintien des sélecteurs après transcodage.
- Tester l’interopérabilité réelle IIIF/WebVTT et définir l’export JSON-LD/PROV sans coupler le schéma transactionnel à une ontologie externe.

## Sources
1. Web Annotation Data Model, https://www.w3.org/TR/annotation-model/, 2017-02-23, Tier 1, `research/sources/standards-01-w3c-web-annotation.md`
2. IIIF Presentation API 3.0, https://iiif.io/api/presentation/3.0/, 2020-06-03, Tier 1, `research/sources/standards-02-iiif-presentation-3.md`
3. EBUCore Ontology Documentation, https://www.ebu.ch/metadata/ontologies/ebucore/, 2020/version 1.10, Tier 1, `research/sources/standards-03-ebucore-ontology.md`
4. Media Fragments URI 1.0, https://www.w3.org/TR/media-frags, 2012-09-25, Tier 1, `research/sources/standards-snippets.md`
5. PROV-O, https://www.w3.org/TR/prov-o, 2013-04-30, Tier 1, `research/sources/standards-snippets.md`
6. WebVTT, https://www.w3.org/TR/webvtt1, 2026-05-20, Tier 1, `research/sources/standards-snippets.md`
7. IPTC Photo Metadata Standard, https://iptc.org/standards/photo-metadata/iptc-standard, non daté, Tier 1, `research/sources/standards-snippets.md`
8. MusicRecording, https://schema.org/MusicRecording, version développement observée juillet 2026, Tier 2, `research/sources/standards-snippets.md`
9. MusicBrainz Identifier, https://musicbrainz.org/doc/MusicBrainz_Identifier, non daté, Tier 2, `research/sources/standards-snippets.md`