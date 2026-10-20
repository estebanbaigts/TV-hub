# Accueil+

[English](README.md) · **Français**

Un accueil personnel, inspiré d'Apple TV, pour les **TV Samsung (Tizen)** et **LG (webOS)**.
Tous vos services de streaming, de cloud gaming et de musique au même endroit, pilotés
uniquement à la télécommande. Conçu et testé sur une Samsung QE55Q70BATXXC (2022).

![Accueil](docs/captures/accueil.png)

▶ **[Vidéo de présentation d’1 minute](docs/video/accueil-plus.mp4)** (en anglais, commentée)

> **Installé et lancé sur une Samsung QE55Q70BATXXC** (version 2.0.0). Les captures viennent de
> la simulation sur ordinateur, avec des applications fictives.

## TV compatibles

| TV | État | Détection des apps | Installation |
|---|---|---|---|
| Samsung 2022 (Tizen 6.5) | ✅ testé sur la TV | par nom, complète | `./scripts/install.sh` |
| Samsung 2017–2021, 2023+ (Tizen 3+) | prévu, non testé | par nom, complète | `./scripts/install.sh` |
| LG (webOS 3+) | prévu, testé en simulation | par nom si la TV l'autorise, sinon 6 grandes apps vérifiées au lancement | `./scripts/install-lg.sh` |
| Android TV, Google TV, Fire TV, Roku, Apple TV | non pris en charge | — | — |

La plateforme est détectée automatiquement : un seul code, un seul dossier `app/`.

## Ce que fait l'application

- **Mise en avant cinématographique** : la tuile sélectionnée affiche en grand un titre
  populaire sur ce service en France (image, logo, année, résumé), via TMDB.
- **Lancement réel** : les applications sont détectées sur la TV par leur nom. Une tuile ne
  s'ouvre que si l'application existe vraiment ; sinon elle indique « Non détectée » et
  explique comment y accéder. Aucun lancement n'est simulé.
- **Jeux** : tuile **▶ Reprendre** pour le dernier service de jeu ouvert, et **Jeu du moment**
  (nom de jeu noté par vous, affiché comme rappel).
- **Toutes les applications** installées sur la TV, par ordre alphabétique.
- **Réglages** : démarrer sur l'accueil ou sur la dernière section, état des services,
  actualisation des images.
- Heure, date et météo (Open-Meteo) discrètes ; « Météo indisponible » plutôt qu'une valeur inventée.

| Streaming | Jeux |
|---|---|
| ![Streaming](docs/captures/streaming.png) | ![Jeux](docs/captures/jeux.png) |
| **Toutes les applications** | **Service non détecté** |
| ![Toutes les applications](docs/captures/toutes.png) | ![Non détectée](docs/captures/non-detectee.png) |

![Réglages](docs/captures/reglages.png)

## Télécommande

| Touche | Effet |
|---|---|
| ← → | Tuile voisine (arrêt aux bords) ; dans les onglets : onglet voisin |
| ↑ ↓ | Rangée voisine, colonne mémorisée ; ↑ depuis la 1ʳᵉ rangée → onglets ; ↓ sur un onglet → ouvre la section |
| OK | Seule touche qui agit : ouvre l'app, la section ou l'option (un seul lancement à la fois) |
| Retour | Ferme la fenêtre → section précédente (position restaurée) → onglets → accueil Samsung |

## Limites (honnêtes)

- **Pas de démarrage automatique** : aucune API publique ne permet à une app de se lancer à
  l'allumage ni de remplacer l'accueil Samsung. Le plus rapide : épingler Accueil+ en tête
  de l'accueil Samsung, puis Home → OK. Voir [DEMARRAGE.md](docs/DEMARRAGE.md).
- **Pas de lien direct vers un film ou un jeu** : OK ouvre l'application du service, le
  contenu se choisit dedans (c'est écrit à l'écran).
- **Disponibilités** fournies par TMDB / JustWatch, susceptibles d'évoluer.
- Aucun logo officiel embarqué : les tuiles affichent le nom du service dans ses couleurs.

## Confidentialité et sécurité

- Samsung : privilèges Tizen **publics** uniquement. LG : service public Application Manager. Partout : aucun compte, aucune télémétrie, aucune publicité.
- Réseau limité à **Open-Meteo** (météo) et **TMDB** (titres et images), dans `config.xml` et la CSP.
- Préférences stockées uniquement sur la TV.
- La clé TMDB est dans `app/js/config.local.js`, **exclu de git** :
  `window.TMDB_KEY = 'votre_clé';`. Sans ce fichier, l'app fonctionne sans images.

## Structure

```
app/            code empaqueté dans le .wgt
  config.xml    manifeste Samsung (Tizen)
  appinfo.json  manifeste LG (webOS)
  index.html, css/hub.css
  js/hub.js     interface, focus, lancement, réglages
  js/tmdb.js    TMDB (cache 6 h, délai 8 s, gestion d'erreur)
  js/platform.js  Samsung / LG / navigateur, détection automatique
  js/catalog.js, nav.js, store.js, widgets.js
dev/            simulation Tizen et test de bout en bout (jamais empaquetés)
maquettes/      maquettes de design (v6 = base de l'interface actuelle)
scripts/        build, serveur local, captures
tests/          tests Node sans dépendance
docs/           installation, démarrage, compatibilité, désinstallation
```

## Développer sur le Mac

Prérequis : Node.js et Python 3 (aucune dépendance npm).

```bash
./scripts/serve.sh
```

Puis `http://localhost:8765/dev/?fresh=1` (flèches, Entrée, Échap = Retour).
Scénarios Samsung : `?scenario=full`, `?scenario=listfail`, `?scenario=notizen`.
Scénarios LG : `?platform=webos` (liste refusée), `?platform=webos&lglist=1` (liste autorisée).
Test automatique : `?e2e=1`, résultat dans `window.__e2e`.

```bash
node tests/run-tests.js
```

## Installer sur la TV

### Samsung

Une seule commande (tests, paquet signé, installation, lancement). L'IP est mémorisée :
les fois suivantes, `./scripts/install.sh` suffit.

```bash
./scripts/install.sh 192.168.1.123
```

Première installation (mode développeur, certificat Samsung) : [INSTALLATION.md](docs/INSTALLATION.md).

### LG

```bash
./scripts/install-lg.sh
```

Première installation (app Developer Mode, CLI webOS) : [INSTALLATION-LG.md](docs/INSTALLATION-LG.md).
Désinstallation : [DESINSTALLATION.md](docs/DESINSTALLATION.md).

---

Données et images : [TMDB](https://www.themoviedb.org). Disponibilités : JustWatch.
Ce produit utilise l'API TMDB sans être approuvé ni certifié par TMDB.
