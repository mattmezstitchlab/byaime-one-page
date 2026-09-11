# Régénérer l'image de partage (`public/og-cover.jpg`)

L'image 1200×630 servie dans `og:image`/`twitter:image` est composée à partir d'un
fond généré, sans dépendre d'un outil de design. Pour la refaire :

1. Générer un fond 16:9 sombre, sans texte (n'importe quel générateur d'images) :
   ambiance charbon `#050506`, halo champigne à droite, lin et pampas flous, grain fin.
   Le fichier de travail doit faire ~1200 px de large.
2. Composer avec ImageMagick (typo de secours : DejaVu) :

   ```sh
   cd artifacts/byaime-onepage/preview
   convert fond.png -resize 1200x630^ -gravity center -extent 1200x630 bg.png
   convert -size 1200x1 gradient:white-black -resize 1200x630! ramp.png
   convert -size 1200x630 xc:"#050506" \( ramp.png \) -compose CopyOpacity -composite \
     -channel A -evaluate multiply 0.90 +channel scrim.png
   convert bg.png scrim.png -compose over -composite flat.png
   convert flat.png \
     -font /usr/share/fonts/truetype/dejavu/DejaVuSans.ttf -pointsize 17 -fill "#C9A96A" -kerning 8 \
     -annotate +96+158 "PLATEFORME DE PRÉPARATION DE MARIAGE" \
     -fill "#C9A96A" -draw "rectangle 96,192 176,193" \
     -font /usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf -pointsize 96 -kerning 22 -fill "#FBF7EF" \
     -annotate +92+318 "AIME" \
     -font /usr/share/fonts/truetype/dejavu/DejaVuSans.ttf -pointsize 31 -kerning 0 -fill "#F0EAE0" \
     -annotate +96+396 "L’univers d’abord, puis une information à la fois." \
     -pointsize 22 -fill "#B9B1A4" -annotate +96+448 "Invités, budget, prestataires, calendrier : un seul espace privé." \
     -font /usr/share/fonts/truetype/dejavu/DejaVuSans.ttf -pointsize 20 -kerning 3 -fill "#9A9286" \
     -gravity SouthEast -annotate +64+56 "www.byaime.fr" \
     -strip og.png
   convert og.png -background "#050507" -flatten -sampling-factor 4:2:0 -strip -quality 84 -interlace JPEG \
     ../public/og-cover.jpg
   ```

3. Contrôler le poids ( viser < 150 Ko ) et les dimensions : `identify ../public/og-cover.jpg` → `1200x630`.

> `-kerning` s'applique à tout ce qui suit : le remettre à `0` avant les lignes de texte courant,
> sinon les phrases partent hors cadre (lettrage démultiplié).
