# Guide Utilisateur — `esop` (« Et si on parlait »)

Bienvenue dans le guide pratique d'**esop**. Ce document t'explique pas à pas comment tourner, monter en mode texte et utiliser l'interface visuelle sans jamais te perdre.

---

## 1. Le principe en 30 secondes

Dans un logiciel classique (OpenShot, Premiere, DaVinci), tu passes des heures à couper des blocs sur une timeline graphique au dixième de seconde.

Avec **esop**, **ton montage est un simple fichier texte : `montage.md`**.
1. L'outil écoute tes rushs, coupe automatiquement tous les silences et transcrit chaque phrase avec son timecode exact.
2. Tu relis le texte dans `montage.md` : si tu barres une phrase (`~~...~~`), elle est coupée de la vidéo. Si tu ajoutes `{broll: image.png}`, l'image s'affiche sur cette phrase.
3. **Remotion Studio** te sert de table de contrôle visuelle pour vérifier le résultat et exporter le `.mp4` final.

```
Rushs (.mp4) + Images (.png/.jpg)
       │
       ▼  1. esop ingest   (transcrit la voix + détecte les silences)
       ▼  2. esop takes    (choisit la meilleure prise par chapitre)
       ▼  3. esop cut      (génère le fichier texte montage.md)
       │
   montage.md  ◄─── Tu édites ce fichier texte (ou tu demandes à l'IA)
       │
       ├──► 4a. esop studio   (contrôle visuel interactif dans le navigateur)
       ├──► 4b. esop preview  (génère un MP4 brouillon ultra-rapide en 25 s)
       └──► 4c. esop render   (exporte le MP4 final 1080p ou le Short 9:16)
```

---

## 2. Créer un nouvel épisode pas à pas (quand tu te filmes demain)

### Étape A — Préparer ton dossier sur ton Mac
Crée un dossier pour ton épisode (par exemple `~/Desktop/EtSiOnParlait/mon-sujet/`) et mets dedans :
1. **Tes vidéos tournées (`.mp4`)** :
   - **Cas 1 (un seul long rush)** : laisse le nom du téléphone (ex. `PXL_20250412.mp4`).
   - **Cas 2 (plusieurs prises par chapitre)** : nomme-les `00-hook-1.mp4`, `01-contexte-1.mp4`, `01-contexte-2.mp4` (`NN-nom-numéro.mp4`).
2. **Tes images ou vidéos d'illustration (B-rolls)** : glisse tes `.png`, `.jpg`, `.webp` ou `.mp4` dans ce même dossier.
3. *(Optionnel)* **Ton fichier `script.md`** avec tes notes de tournage.

### Étape B — Lancer l'analyse automatique (`ingest` + `cut`)

Ouvre ton terminal dans le projet `MontageVideo` :

**Si tu as un seul gros rush (ex. `PXL_xxx.mp4`) :**
```sh
npm run esop -- ingest ~/Desktop/EtSiOnParlait/mon-sujet --file PXL_xxx.mp4 --out episodes/mon-sujet
npm run esop -- cut --out episodes/mon-sujet
```

**Si tu as plusieurs prises nommées par chapitre (`00-hook-1.mp4`, etc.) :**
```sh
npm run esop -- ingest ~/Desktop/EtSiOnParlait/mon-sujet --out episodes/mon-sujet
npm run esop -- takes --out episodes/mon-sujet
npm run esop -- cut --out episodes/mon-sujet
```
> 💡 À la fin de ces commandes, le fichier **`episodes/mon-sujet/montage.md`** est créé !

---

## 3. Comment monter sa vidéo dans `montage.md` (Aide-mémoire)

Ouvre `episodes/<nom>/montage.md` dans ton éditeur de texte (VS Code / Antigravity).
Chaque ligne correspond à un segment de parole entre deux silences :

```markdown
[PXL_20250412 00:30.549→00:35.878] (serré) {broll: 2023-12-gde.png} J'ai la chance d'avoir un statut qui s'appelle GDE.
```

Voici **toutes les actions possibles** dans ce fichier :

| Ce que tu veux faire | Comment l'écrire dans `montage.md` | Exemple |
| :--- | :--- | :--- |
| **Couper une phrase / hésitation** | Entoure le texte de `~~` (barré Markdown) | `[take 00:12.000→00:14.000] (large) ~~Euh non pardon je recommence~~` |
| **Forcer un plan large ou serré** | Change `(large)` ou `(serré)` | `[take 00:15.000→00:18.000] (serré) C'est super important.` |
| **Créer un chapitre animé** | Ajoute un titre `## NN — Titre` entre deux lignes | `## 01 — Anecdote personnelle` *(note : `## 00 — Hook` ne génère pas d'écran de chapitre pour démarrer direct)* |
| **Afficher une image / vidéo B-Roll** | Ajoute `{broll: nom-fichier.png}` | `[take 00:30.549→00:35.878] (serré) {broll: 2023-12-gde.png} J'ai la chance...` |
| **Afficher un encart texte bleu** | Ajoute `{texte: Ton message}` | `[take 02:50.138→02:53.819] (serré) {texte: Amène ton regard, il est unique !} Ce qui compte...` |
| **Faire surgir un mot-clé jaune** | Ajoute `{mot: mot}` | `[take 03:48.585→03:51.504] (large) {mot: non} Et la réponse est non.` |
| **Cumuler plusieurs effets** | Sépare-les par une virgule dans `{...}` | `{broll: git-2.png, mot: git}` |
| **Sélectionner un passage pour un Short** | Ajoute `{short: 1}` sur les lignes voulues | `[take 00:26.788→00:30.265] (large) {short: 1} Petit moment personnel...` |

### ⚠️ Règle d'or après avoir modifié `montage.md`
Dès que tu modifies et sauvegardes `montage.md`, lance :
```sh
npm run esop -- cut --out episodes/imposteur
```
Pourquoi ? Parce que cette commande **recalcule automatiquement l'alternance `(large)` / `(serré)`** autour de tes coupes et met à jour `episode.json` pour le Studio !

---

## 4. Se repérer dans l'interface Remotion Studio (`esop studio`)

Pour ouvrir l'interface graphique :
```sh
npm run esop -- studio --out episodes/imposteur
```
Ton navigateur s'ouvre sur `http://localhost:3000`. L'écran est divisé en **3 zones principales** :

```
┌──────────────────┬─────────────────────────────────────────────────────────┐
│ 1. COMPOSITIONS  │ 2. ÉCRAN DE PRÉVISUALISATION (CANVAS)                   │
│ (Haut-Gauche)    │                                                         │
│                  │   Affiche la composition choisie à gauche :             │
│  ▸ Episode       │   - soit la vidéo 16:9 plein écran (Episode)            │
│  ▸ VueEnsemble   │   - soit le cockpit complet (VueEnsemble)               │
│  ▸ Short         │   - soit le format vertical TikTok/Short (Short)        │
│                  │                                                         │
├──────────────────┴─────────────────────────────────────────────────────────┤
│ 3. TIMELINE MULTI-PISTES (Bas)                                             │
│  📑 Chapitre 1 — Anecdote personnelle                                      │
│  🖼️ B-Roll · 2023-12-gde.png (00:25→00:30)                                 │
│  🏷️ Texte · Amène ton regard, il est unique !                              │
│  💬 Sous-titres dynamiques                                                 │
│  🎵 Musique · funk-244706.mp3                                              │
│  🎬 #001 [large] PXL_20250412 (00:00→00:02) — Tu t'es déjà demandé...      │
└────────────────────────────────────────────────────────────────────────────┘
```

### Zone 1 — Les 3 vues dans « Compositions » (en haut à gauche)
Clique sur l'une des 3 lignes en haut à gauche selon ce que tu veux faire :

1. **`VueEnsemble` *(Recommandé pour monter et se repérer)*** :
   C'est ton **cockpit de contrôle**. Sur un seul écran, tu vois :
   - **En haut à gauche** : la vidéo en direct + la fiche du plan actif : son numéro (`PLAN #008 / 115`), son cadrage (`LARGE` ou `SERRÉ`), le nom du fichier rush source, et **le timecode exact dans le rush d'origine** (`TC Rush : 00:30.55 → 00:35.88`) pour retrouver immédiatement la ligne dans `montage.md` !
   - **En haut à droite** : ton **Chutier** avec tous les rushs vidéo utilisés, les vignettes de tes 10 images B-rolls (celle qui est à l'écran s'allume en bleu) et tes 4 chapitres.
   - **En bas** : une **vraie timeline horizontale compacte** où les 115 coupes sont posées sur **une seule ligne** (bleu = `large`, orange = `serré`), plus une **loupe des 5 plans autour du curseur** (plan précédent, plan en cours, 3 plans suivants).
2. **`Episode`** :
   Affiche uniquement le rendu final `16:9` (`1920×1080`) tel qu'il sera exporté pour YouTube.
3. **`Short`** :
   Affiche la version verticale `9:16` (`1080×1920`) recadrée automatiquement sur ton visage avec gros sous-titres pour YouTube Shorts / TikTok / Reels.

### Zone 3 — Raccourcis utiles dans la Timeline (en bas)
- **`Espace`** : Lecture / Pause.
- **`←` / `→`** : Reculer / Avancer d'une image (frame par frame).
- **`Shift + ←` / `Shift + →`** : Reculer / Avancer rapidement.
- **Cliquer n'importe où sur la règle graduée en bas** : Déplace la tête de lecture à cet endroit.
- **Icône `+` / `-` (en haut à droite de la timeline du bas)** : Zoomer ou dézoomer sur la timeline.

---

## 5. Exporter tes vidéos en `.mp4`

Une fois que le montage te plaît dans `VueEnsemble` et `Episode`, tu as 3 commandes d'export :

### 1. Export brouillon ultra-rapide (~25 secondes)
Pour vérifier le rythme des coupes sans attendre le rendu complet :
```sh
npm run esop -- preview --out episodes/imposteur
```
👉 Génère :
- `episodes/imposteur/preview.mp4` (vidéo 540p des coupes et cadrages)
- `episodes/imposteur/preview.png` (planche de vignettes toutes les 5 secondes)

### 2. Export de la vidéo YouTube finale `16:9` (avec chapitres, B-rolls, sous-titres et musique)
```sh
# En 720p rapide (idéal pour valider ou envoyer) :
npm run esop -- render --out episodes/imposteur --scale 0.667

# En 1080p Full HD définitif :
npm run esop -- render --out episodes/imposteur
```
👉 Génère **`episodes/imposteur/final.mp4`**.

### 3. Export du Short vertical `9:16` (TikTok / YouTube Shorts / Reels)
```sh
npm run esop -- render --out episodes/imposteur --short
```
👉 Génère **`episodes/imposteur/short.mp4`**.
