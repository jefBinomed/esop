# Conception — assistant de montage « Et si on parlait »

> Statut : v2, décision prise le 2026-10-07. Route retenue : **Remotion, sans
> CapCut**, template maison. La v1 (génération de brouillons CapCut) est
> abandonnée ; ses observations restent valables et sont conservées en §1.

## 1. Ce que fait réellement ta chaîne aujourd'hui

Observé dans `~/Desktop/EtSiOnParlait/` et dans les brouillons CapCut
(`~/Movies/CapCut/User Data/Projects/com.lveditor.draft/`).

### Organisation des sources

- Un dossier par épisode. Les rushs retenus sont nommés
  `NN-chapitre-prise.version.mp4` (`00-hook-1.2`, `02-Probleme-3.2`,
  `04-Methode-2.2`…). `NN` donne l'ordre des chapitres, le nom du chapitre
  donne le titre affiché.
- Ressources partagées : `Ressources/intro-tv.mp4` (jingle),
  `Ressources/chapitre-bulle-vide.png` (carte de chapitre), `funk-244706.mp3`
  (musique de fond).
- B-roll par épisode : clips Vecteezy aux noms descriptifs, images, captures
  d'écran, clips générés (`gemini-*.mp4`), photos détourées (`*-Photoroom.png`).

### Le style actuel, mesuré sur l'épisode « Conclusion »

| Mesure | Valeur |
|---|---|
| Durée | 345 s |
| Segments de parole | 114 (médiane 2,8 s) |
| Coupes à l'intérieur d'un même rush | 95 |
| Silence conservé à chaque coupe | 0,17 à 0,3 s |
| Changements de cadrage | 49, soit une coupe sur deux |
| Cadrages | large `×1.0/1.11` et serré `×1.7`, décalés vers la droite |
| B-roll | 22 segments sur 2 pistes, images à `×0.5`, clips plein cadre |
| Textes | titres de chapitre, listes numérotées, « Abonnes toi », crédits |

Le cadrage est statique par segment ; le dynamisme vient de l'alternance
large/serré sur les coupes. Après CapCut, OpenShot n'ajoute que la musique.

## 2. La décision et ses raisons

**Remotion** : moteur de rendu vidéo en TypeScript. Chaque scène est un
composant React, le rendu est fait image par image dans Chrome puis encodé par
ffmpeg. Gratuit pour les particuliers et les structures de trois personnes au
plus. Studio intégré avec timeline et scrub pour la prévisualisation.

Pourquoi ça plutôt que générer un projet CapCut :

- **Le style est du code, écrit une fois.** Cartes de chapitre, transitions,
  sous-titres animés, ducking de la musique, étalonnage : définis dans un
  template, appliqués à chaque épisode sans retouche.
- **Un épisode est un fichier de données.** Le montage se relit en cinq
  minutes au lieu de se refaire en heures.
- **Aucun format propriétaire à rétro-ingénierer.** Le risque principal de la
  v1 disparaît.
- **Claude peut monter.** Transcription, coupes sur le contenu, placement du
  B-roll et des textes, rendu : tout passe par des fichiers et des commandes.

Ce que tu perds, en conscience :

- Le scrub immédiat d'un éditeur graphique. Le studio Remotion compense pour
  la relecture ; le rendu final de six minutes en 1080p prend plusieurs
  minutes, on relit donc en 540p.
- La retouche ponctuelle à la souris. CapCut reste un filet de sécurité sur le
  mp4 final, jamais sur le projet.
- Lit : Remotion est en React. C'est le seul moteur mature avec studio,
  captions et outillage whisper intégrés.

## 3. Principe directeur : le montage est un fichier texte

Tu ne montes plus sur une timeline, tu relis une transcription annotée.
`montage.md` est la source de vérité d'un épisode ; `episode.json` est sa
forme machine, régénérée à partir de lui.

```markdown
# conclusion

## 00 — Hook                         ← carte de chapitre + jingle générés
[00-hook-1.2 00:00.47→00:08.09] Lundi soir, votre pote sort de votre conférence…
[00-hook-1.2 00:09.27→00:13.55] (serré) Votre pote a adoré, il a les yeux qui brillent…
[00-hook-1.2 00:14.10→00:16.80] ~~Il répond euh c'était super~~   ← barré = coupé

## 02 — Le problème
[02-Probleme-1.2 00:00.30→00:04.90] {broll: gemini-sac-de-noeud.mp4} Et là c'est le bug.
[02-Probleme-1.2 00:05.20→00:08.00] {texte: 1. La dilution} Première conséquence…
[02-Probleme-1.2 00:08.10→00:11.40] {mot: dilution} Le message se **dilue** dans le reste.
```

- Une ligne par segment de parole. Les timecodes sont la vérité, le texte est
  l'aide à la lecture.
- Barrer une ligne coupe le passage. Supprimer un mot au milieu d'une ligne
  coupe le mot, grâce aux timestamps par mot.
- `(serré)` / `(large)` force un cadrage ; sans annotation, le pattern
  automatique s'applique.
- `{broll: …}`, `{texte: …}`, `{mot: …}` posent B-roll, texte à l'écran et mot
  clé animé, alignés sur le segment.
- Le fichier survit à une nouvelle ingestion : les annotations sont rattachées
  par timecode.

### Le script de tournage, entrée du pipeline

Tu génères déjà un script avant de filmer. Il est déposé dans le dossier de
l'épisode sous `script.md`, avec une structure minimale :

```markdown
# Conclusion

## 00 — Hook
mot: bug
## 02 — Le problème
texte: 1. La dilution
texte: 2. Le flou artistique
mot: dilue
```

Il sert trois fois : titres de chapitres, textes et mots clés pré-remplis dans
`montage.md`, et référence pour évaluer les prises (une prise qui oublie un
point du script est signalée).

### Le rôle de Claude dans un épisode

1. Ingestion et transcription de **toutes** les prises.
2. **Évaluation des prises** par chapitre : durée, hésitations, faux départs,
   couverture du script. Claude propose un choix justifié, tu arbitres.
3. **Coupe sur le contenu**, pas seulement sur les silences : hésitations,
   répétitions, faux départs, phrases qui tournent en rond. Chaque coupe de
   contenu est justifiée en une ligne dans un rapport.
4. Placement du B-roll en rapprochant ce que tu dis des assets du dossier.
5. Titres, listes, mots clés, pré-remplis depuis `script.md`.
6. Rendu d'une prévisualisation 540p et d'une planche de vignettes.
7. Tu annotes, Claude corrige, rendu final.

Limite assumée : Claude ne regarde pas la vidéo. Il juge le cadrage sur des
images extraites et le rythme sur la transcription. Le goût final est le tien,
via la prévisualisation.

## 4. Les commandes

Nom de travail : `esop`. Une CLI, un dossier d'épisode en argument.

| Commande | Entrée | Sortie |
|---|---|---|
| `esop ingest <épisode>` | toutes les prises + `script.md` | `episode.json` (mots horodatés par prise) |
| `esop takes` | `episode.json` | `takes.md` : par chapitre, chaque prise avec durée, hésitations, couverture du script, et une recommandation |
| `esop montage` | `takes.md` validé | `montage.md` pré-rempli avec titres, textes et mots clés du script |
| `esop cut` | `montage.md` | lignes barrées pour les silences et hésitations |
| `esop zoom` | `montage.md` | annotations de cadrage |
| `esop preview` | `montage.md` | `preview.mp4` coupe brute ffmpeg 960×540 + planche de vignettes |
| `esop render` | `montage.md` | `final.mp4` 1080p30 |
| `esop studio` | — | ouvre le studio Remotion sur l'épisode |

Détails qui comptent :

- **Transcription** : whisper.cpp via `@remotion/install-whisper-cpp`, modèle
  `large-v3-turbo`, français, timestamps par mot. Local et gratuit. Le son
  vient d'un micro Bluetooth déjà intégré au mp4 : une seule piste, rien à
  synchroniser.
- **Évaluation des prises** : score par prise combinant durée, nombre
  d'hésitations et faux départs, et couverture des points du script. La
  recommandation est une aide, le choix se fait en cochant dans `takes.md`.
- **Silences** : trous entre mots croisés avec `ffmpeg -af silencedetect`.
  Seuil de coupe 0,45 s, marge conservée 0,12 s de chaque côté, calibrés sur
  ce que tu laisses aujourd'hui.
- **Pattern de cadrage** : alternance large/serré sur les coupes, jamais de
  serré sur la première ligne d'un chapitre, jamais plus de trois cadrages
  identiques d'affilée. Paramétrable dans `esop.config.json`.
- **Prévisualisation** : coupe brute ffmpeg (trim, recadrage par segment,
  concaténation) en 960×540, sans passer par Remotion. Elle sert à relire le
  dérushage en quelques dizaines de secondes de rendu ; Remotion n'entre en
  jeu que pour le rendu final habillé. Une planche de vignettes ffmpeg toutes
  les 5 s complète la relecture, et Claude peut la lire.
- **Hésitations** : whisper ne transcrit pas les « euh », même amorcé, et le
  rush de référence n'en contient quasiment pas. Le module `cut/fillers` est
  reporté tant qu'un besoin réel n'apparaît pas ; les coupes de contenu
  (faux départs, reprises) passent par la relecture de `montage.md`.

## 5. Architecture

TypeScript strict, Node 24. Deux moitiés indépendantes : un domaine pur sans
React, et un projet Remotion qui ne fait que consommer `episode.json`.

```
src/
  domain/timeline.ts         modèle pivot : clips, segments, cadrage, calques
  ingest/probe.ts            ffprobe → métadonnées
  ingest/transcribe.ts       whisper.cpp → mots horodatés
  cut/silences.ts            gaps + silencedetect → segments
  cut/fillers.ts             « euh », répétitions, faux départs
  zoom/pattern.ts            attribution des cadrages
  montage/parse.ts           montage.md → Timeline
  montage/serialize.ts       Timeline → montage.md (préserve les annotations)
  export/ffmpeg-preview.ts   Timeline → graphe de filtres ffmpeg (coupe brute)
  cli.ts
remotion/
  Root.tsx                   enregistre la composition, durée calculée via calculateMetadata
  Episode.tsx                lit episode.json, empile les calques
  layers/Talk.tsx            rushs via <OffthreadVideo trimBefore/trimAfter>, cadrage
  layers/Chapter.tsx         carte de chapitre animée + jingle
  layers/Broll.tsx           clips plein cadre, images en Ken Burns
  layers/Captions.tsx        sous-titres mot à mot via @remotion/captions
  layers/Keyword.tsx         mot clé qui surgit en synchro avec la voix
  layers/Music.tsx           funk en boucle, ducking sous la parole
  theme.ts                   couleurs, polices, durées, courbes
```

Points techniques à retenir :

- Les rushs pèsent jusqu'à 1,2 Go ; le dossier `public/` de Remotion sera un
  lien symbolique vers le dossier de l'épisode, jamais une copie.
- `<OffthreadVideo>` décode hors du navigateur, c'est le bon choix pour de
  longs rushs découpés en dizaines de segments.
- Le ducking est une fonction `volume(frame)` sur `<Audio>`, calculée à partir
  des segments de parole : pas de traitement audio externe.
- `calculateMetadata` fixe la durée de la composition à partir des données,
  donc chaque épisode a sa durée sans toucher au code.

**TDD dès le départ.** Le domaine est fait de fonctions pures sur des données :

- `cut/silences` : fixtures de mots horodatés, segments attendus.
- `zoom/pattern` : séquences d'entrée, pattern attendu.
- `montage/parse` + `serialize` : aller-retour idempotent.
- Calques Remotion : tests de rendu d'une image à un frame donné, comparée à
  une référence.

## 6. Le système de style : ce qui rend la vidéo plus belle

Tout est dans `theme.ts` et les calques, donc partagé par les épisodes.

- **Cadrage** : zoom progressif de 2 % sur la durée d'un segment plutôt que
  statique, pour que chaque plan respire. Alternance large/serré conservée.
- **Sous-titres mot à mot** : style sobre, mot courant surligné, trois mots
  visibles au plus. Lisibles sans le son, ce qui compte sur mobile.
- **Mots clés** : un mot surgit avec un ressort au moment où tu le prononces.
  Réservé à un mot par idée, sinon ça fatigue.
- **Cartes de chapitre** : ta bulle vide animée en entrée et sortie, numéro et
  titre en fondu, jingle calé sur l'animation.
- **B-roll** : clips plein cadre avec fondu de 8 images, images en Ken Burns
  lent, retour à toi par coupe franche.
- **Son** : musique en boucle avec ducking à −14 dB sous la parole, remontée
  sur les cartes de chapitre. Un son de coupe discret sur les changements de
  cadrage, désactivable.
- **Image** : LUT légère et vignettage faible, identiques sur tous les
  épisodes, pour une signature visuelle.

## 7. Risques

| Risque | Parade |
|---|---|
| Rendu lent sur six minutes | prévisualisation 540p, concurrence de rendu réglée sur la machine, rendu final en tâche de fond |
| Timecodes whisper imprécis | silencedetect en second signal, marges de 0,12 s |
| Refaire du montage en codant | le template est figé après la V1 ; un épisode ne touche que `montage.md` |
| Claude place un B-roll hors sujet | chaque placement est listé avec sa raison, validé à la relecture |
| Lourdeur des rushs | lien symbolique vers le dossier d'épisode, jamais de copie |

## 8. Plan de livraison

1. **V0, une soirée** : `ingest` + `takes` + `cut` + `preview`. Transcription
   de toutes les prises, évaluation, coupes, un calque `Talk` minimal
   reproduisant l'alternance large/serré. Tu valides le dérushage de
   « Conclusion » en comparant avec ta version CapCut. Aucun épisode n'a
   conservé ses prises nommées ; pour développer, le rush brut
   `imposteur/PXL_20250412_164129863.mp4` (1,2 Go, une seule prise) sert de
   jeu d'essai pour la transcription et les coupes. La vraie V0 se joue sur le
   prochain épisode tourné, prises conservées cette fois.
2. **V1, le style actuel** : chapitres, jingle, B-roll annoté, textes,
   musique avec ducking. Objectif : « Conclusion » rendue par Remotion
   indiscernable de ta version, puis mieux.
3. **V2, le gain de beauté** : sous-titres mot à mot, mots clés, zoom
   progressif, LUT.
4. **V3, optionnel** : placement de B-roll suggéré automatiquement, génération
   des shorts verticaux à partir du même `montage.md`.

## 9. Réponses aux questions ouvertes (2026-10-07)

- **Choix des prises** : la dernière version n'est pas toujours la bonne,
  chaque rush doit être évalué. Conséquence : `esop takes` n'est plus une
  aide optionnelle, c'est la première étape du pipeline (voir §4 et §8).
- **Son** : toujours un micro Bluetooth séparé, mais capté par le téléphone et
  intégré au mp4. Une seule piste audio, aucune synchronisation à faire.
- **Script** : oui, il est déjà généré avant chaque tournage. Il devient une
  entrée du pipeline sous la forme `script.md` (voir §3).
