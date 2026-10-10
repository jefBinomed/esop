# esop — assistant de montage « Et si on parlait »

Outil en ligne de commande qui transforme des rushs de vidéo face caméra en
une vidéo montée, sans logiciel de montage : transcription locale, coupes sur
les silences et le contenu, alternance de cadrages, chapitres, B-roll et rendu
par [Remotion](https://www.remotion.dev).

Le montage d'un épisode se relit et se corrige dans un fichier texte,
`montage.md`. La conception complète est dans [`docs/conception.md`](docs/conception.md).

## Prérequis

- Node.js 24 ou plus
- [ffmpeg](https://ffmpeg.org) : `brew install ffmpeg`
- [whisper.cpp](https://github.com/ggml-org/whisper.cpp) : `brew install whisper-cpp`
- Le modèle `ggml-large-v3-turbo.bin` dans `~/.cache/whisper-cpp/models/`
  (téléchargeable sur [Hugging Face](https://huggingface.co/ggerganov/whisper.cpp/tree/main))

## Installation

```sh
npm install
npm test
```

## Utilisation

```sh
npm run esop -- ingest <dossier-épisode>     # transcrit les prises, détecte les silences
npm run esop -- ingest <dossier> --file x.mp4 # un rush hors convention de nommage
npm run esop -- takes                         # évalue les prises par chapitre → takes.md
npm run esop -- cut                           # segments + cadrages + script.md → montage.md
npm run esop -- preview                       # coupe brute 960×540 + planche de vignettes
```

Les résultats vont dans `episodes/<nom>/` (ignoré par git) :

- `episode.json` : prises, mots horodatés, silences, segments.
- `takes.md` : évaluation des prises par chapitre (durée, hésitations, couverture de `script.md`) avec case `[x]` sur la prise recommandée.
- `montage.md` : la transcription annotée à relire. Barrer une ligne (`~~...~~`) la coupe, `(serré)` ou `(large)` force un cadrage, `{texte: …}` et `{mot: …}` viennent de `script.md`.
- `preview.mp4` et `preview.png` : la coupe brute synchronisée avec `montage.md` et sa planche de vignettes.

Ordres de grandeur sur un rush de 8 min : 2 min de transcription, 2 min de
rendu de prévisualisation.

La commande suivante (`render` / `studio` par Remotion) arrive en V1 décrite
dans la conception.

## Licence

MIT.
