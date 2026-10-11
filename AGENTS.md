# AGENTS.md — esop (Assistant de montage « Et si on parlait »)

Ce fichier définit les conventions, l'architecture et les workflows partagés entre **Antigravity** et **Claude Code** sur le projet `esop`.

## 1. Contexte & Philosophie

- **Contexte** : Projet **Binomed** (chaîne YouTube *« Et si on parlait »*).
- **Principe directeur** : **Le montage est un fichier texte (`montage.md`)**. On ne monte pas sur une timeline graphique, on édite une transcription annotée dont `episode.json` est la représentation machine.
- **KISS & Séparation stricte** :
  - `src/` : Domaine pur TypeScript (Node >= 24, ESM, zéro dépendance React) et adaptateurs CLI (`ffprobe`, `ffmpeg`, `whisper-cli`).
  - `remotion/` *(V1+)* : Moteur de rendu habillé consommant uniquement `episode.json`.
- **TDD obligatoire** : Toute logique métier (`cut/`, `zoom/`, `montage/`, `ingest/`, `export/`) est écrite en fonctions pures testées unitairement dans `tests/` avec Vitest avant ou avec l'implémentation.

## 2. Commandes de développement

```sh
npm test                  # Lance les tests unitaires (Vitest)
npm run typecheck         # Vérification stricte des types (tsc --noEmit)
npm run esop -- ingest <dossier-épisode> [--file <rush>]
npm run esop -- takes [--out episodes/<nom>]
npm run esop -- cut [--out episodes/<nom>]
npm run esop -- preview [--out episodes/<nom>]
npm run esop -- render [--out episodes/<nom>] [--scale <facteur>] [--short]
npm run esop -- studio [--out episodes/<nom>]
```

> **Astuce sandbox Antigravity** : Si `vitest` échoue avec `EPERM` sur `.vite-temp` ou `.vitest-secret-token` en mode sandboxé, exécuter :
> `HOME=/tmp npx vitest run --configLoader runner`

## 3. Architecture du dépôt

- [`docs/conception.md`](docs/conception.md) : Document de conception de référence et feuille de route (V0 → V3).
- [`src/domain/timeline.ts`](src/domain/timeline.ts) & [`src/domain/episode.ts`](src/domain/episode.ts) : Modèle pivot (`Word`, `Take`, `Span`, `Segment`, `Framing`, `Episode`). Toutes les durées sont en **secondes**.
- [`src/ingest/`](src/ingest/episode.ts) : Extraction des métadonnées (`probe.ts`), transcription locale `whisper-cli` (`transcribe.ts`, `whisper-json.ts`), convention de nommage `NN-chapitre-prise.version.mp4` (`take-name.ts`).
- [`src/takes/`](src/takes/evaluate.ts) : Lecture de `script.md` (`script.ts`), évaluation et recommandation des prises par chapitre (`evaluate.ts`), lecture/écriture de `takes.md` (`format.ts`).
- [`src/cut/`](src/cut/segments.ts) : Détection des silences audio via `ffmpeg silencedetect` (`silences.ts`) et découpage en segments avec marge de respiration et fusion des micro-segments (`segments.ts`).
- [`src/zoom/`](src/zoom/pattern.ts) : Alternance des cadrages `large` (`×1.11`) / `serré` (`×1.7`) centrés sur le visage (`framing.ts`, `pattern.ts`).
- [`src/broll/`](src/broll/suggest.ts) : Suggestion automatique de placements B-roll par rapprochement lexical entre les assets du dossier et les mots prononcés (`suggest.ts`).
- [`src/montage/`](src/montage/format.ts) : Sérialisation, parsing et synchronisation de `montage.md` (`format.ts`, `timecode.ts`).
- [`src/timeline/`](src/timeline/compile.ts) : Compilation d'un `Episode` en `CompiledTimeline` séquentielle pour Remotion (`compile.ts`), sélection et compilation des Shorts verticaux `9:16` (`shorts.ts`), découpage des sous-titres mot à mot (`captions.ts`) et calcul de l'enveloppe de ducking musical (`ducking.ts`).
- [`src/export/`](src/export/ffmpeg-preview.ts) : Prévisualisation rapide par extraction parallèle de segments `ffmpeg` (`ffmpeg-preview.ts`), planche de vignettes horodatées (`contact-sheet.ts`), et préparation par liens symboliques / exécution du rendu Remotion (`remotion.ts`).
- [`remotion/`](remotion/Episode.tsx) : Moteur de rendu habillé (`Root.tsx`, `Episode.tsx`, `Short.tsx`, `theme.ts`) et calques (`layers/Talk.tsx`, `layers/Captions.tsx`, `layers/Chapter.tsx`, `layers/Broll.tsx`, `layers/Keyword.tsx`, `layers/Music.tsx`).

## 4. Règles d'édition de `montage.md` (Rôle de l'Agent au montage)

Format d'une ligne dans `episodes/<nom>/montage.md` :
```markdown
[takeId mm:ss.mmm→mm:ss.mmm] (large|serré) {clé: valeur} Texte transcrit
```

1. **Les timecodes font foi** : Ne jamais inventer un timecode. Pour couper un segment entier (faux départ, hésitation, prise ratée), barrer son texte avec `~~...~~`.
2. **Reprise après coupe** : Quand des lignes sont barrées dans `montage.md`, relancer `npm run esop -- cut` recalcule proprement l'alternance `(large)` / `(serré)` tout en préservant les lignes barrées (`~~...~~`) et les annotations `{...}`.
3. **Contrôle visuel par l'agent** : Après `npm run esop -- preview`, toujours inspecter `episodes/<nom>/preview.png` (planche de vignettes toutes les 5 s) pour vérifier :
   - Le centrage du visage en plan `large` et `serré`.
   - L'absence de postures parasites (regard baissé sur les notes, gestes de reprise) aux points de coupe.

## 5. Conventions de code et Git

- **TypeScript strict** : `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`.
- **Langue** : Code (identifiants) en anglais, commentaires JSDoc, messages CLI, documentation et commits en **français**.
- **Commits** : Gitmoji en préfixe (`✨`, `🐛`, `♻️`, `⚡️`, `🎨`, `📝`, `✅`) + message concis en français.
- **Données d'épisode** : Le dossier `episodes/` et les rushs vidéo ne doivent **jamais** être commités.
- **Économie de contexte** : Déléguer les chantiers autonomes (exploration, implémentation d'un module ou d'un calque Remotion, revue) à des sous-agents dédiés avec consigne stricte de respecter cette gate.

## 6. Gate de validation (Avant de rendre la main ou de commiter)

Aucun agent (principal ou sous-agent) ne rend la main sans avoir validé :

1. **TDD (Red → Green)** : Tout nouveau comportement ou correctif a son test unitaire ou d'intégration dans `tests/`.
2. **Gate technique (`npm run check`)** :
   - `npm run typecheck` (`tsc --noEmit`) : **0 erreur**.
   - `npm test` (`HOME=/tmp npx vitest run --configLoader runner` en sandbox) : **100 % des tests au vert**.
3. **Gate visuelle (si modification du découpage ou du rendu d'un épisode)** :
   - Découpage / preview : exécuter `npm run esop -- preview` et **inspecter visuellement `preview.png`** (centrage du visage, alternance `large`/`serré`, absence de postures parasites aux points de coupe).
   - Remotion (`remotion/` ou `src/export/remotion.ts`) : ne jamais se contenter du bundling Webpack — exécuter un rendu réel `npx remotion still remotion/index.ts Episode /tmp/remotion-test-frame.png --frame=100` (hors sandbox car Chrome Headless Shell requiert Mach ports + serveur HTTP local) et **inspecter visuellement le PNG généré**.

