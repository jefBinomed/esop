---
description: Monter ou dérusher un épisode avec esop (ingestion, coupes éditoriales, prévisualisation et contrôle visuel)
---

# Workflow : Montage d'un épisode (`esop`)

1. **Ingérer les rushs de l'épisode** (si `episodes/<nom>/episode.json` n'existe pas encore) :
   ```sh
   npm run esop -- ingest <dossier-source>
   ```

2. **Générer ou mettre à jour le découpage initial** :
   ```sh
   npm run esop -- cut --out episodes/<nom>
   ```

3. **Dérushage éditorial dans `episodes/<nom>/montage.md`** :
   - Lire `episodes/<nom>/montage.md` intégralement.
   - Identifier les faux départs, phrases inachevées suivies d'une reprise immédiate, ou apartés face caméra (ex. *« Non, on recommence »*).
   - Barrer le texte des segments à écarter avec `~~...~~` sans modifier les timecodes `[takeId mm:ss.mmm→mm:ss.mmm]`.
   - Relancer `npm run esop -- cut --out episodes/<nom>` pour réaligner l'alternance des cadrages `(large)` / `(serré)` autour des segments barrés.

4. **Générer la prévisualisation et la planche de vignettes** :
   ```sh
   npm run esop -- preview --out episodes/<nom>
   ```

5. **Contrôle visuel de la planche `episodes/<nom>/preview.png`** :
   - Ouvrir `episodes/<nom>/preview.png` avec l'outil de lecture d'image.
   - Vérifier que le visage est bien cadré sur les plans larges et serrés et qu'aucune vignette ne montre une posture de hors-prise (tête baissée, grimace d'arrêt).
   - Si une vignette révèle un segment parasite, repérer son horodatage incrusté, barrer la ligne correspondante dans `montage.md`, et relancer les étapes 3–4.
