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
npm run esop -- ingest <dossier-épisode>   # transcrit toutes les prises
npm run esop -- takes                       # évalue les prises par chapitre
npm run esop -- cut                         # coupe silences et hésitations
npm run esop -- preview                     # rendu 540p de relecture
```

Les commandes arrivent au fil des versions décrites dans la conception.

## Licence

MIT.
