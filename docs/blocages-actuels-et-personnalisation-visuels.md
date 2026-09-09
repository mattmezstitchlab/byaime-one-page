# Blocages actuels (court) + personnalisation visuelle

## 1) Derniers points bloquants à traiter en priorité

1. **Contrat OpenAPI vs routes réellement utilisées**  
   Plusieurs flux front utilisent encore des appels backend utiles mais pas totalement reflétés dans OpenAPI.
2. **Import/restauration backup**  
   Le flux fonctionne mais doit être durci sur les cas de conflit et d'idempotence guidée.
3. **Propagation et conflits Timeline**  
   Logique existante mais couverture incomplète sur des scénarios étendus multi-objets.
4. **Preuve runtime post-déploiement**  
   Les smoke tests des 5 endpoints API doivent être systématiques à chaque release.
5. **Couverture E2E complète dépendante des secrets Clerk**  
   Les validations E2E peuvent être partielles quand les secrets ne sont pas disponibles en CI.

## 2) Changer facilement les visuels/images

### Option la plus rapide (sans code)
Remplacer les fichiers dans :
`/home/runner/work/byaime-one-page/byaime-one-page/artifacts/byaime-onepage/public/images`  
en conservant les mêmes noms de fichiers.

### Option propre (un seul point de config)
Tous les visuels clés ont été centralisés dans :
`/home/runner/work/byaime-one-page/byaime-one-page/artifacts/byaime-onepage/src/lib/assets.ts`  
Objet : `AIME_VISUALS`

Vous pouvez y changer en un seul endroit :
- hero principal,
- visuels du concept,
- visuels des univers,
- visuels ambiants timeline,
- portraits invités/prestataires,
- hero du Monde.

## 3) Ajouter une vidéo hero

Support ajouté via :
- `AIME_VISUALS.hero.backgroundVideo`

Par défaut, cette valeur est `null` (image uniquement).  
Pour activer une vidéo :
1. Ajouter un MP4 dans :
   `/home/runner/work/byaime-one-page/byaime-one-page/artifacts/byaime-onepage/public/videos/`
2. Renseigner le chemin dans `AIME_VISUALS.hero.backgroundVideo`, par exemple :
   `videos/hero-mariage.mp4`

Composants déjà compatibles vidéo hero :
- `.../src/components/HeroSection.tsx`
- `.../src/components/ComposerHero.tsx`

En cas d’erreur de chargement vidéo, l’app revient automatiquement sur l’image de fond.
