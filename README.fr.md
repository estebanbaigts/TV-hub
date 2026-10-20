# TV Hub

[English](README.md) · **Français**

Lanceur personnel minimaliste — affiché sur la TV sous le nom **Accueil+** — pour **Samsung QE55Q70BATXXC (QLED 2022)**, firmware
**T-PTMDEUC-1720.7**, plateforme **Tizen 6.5** (moteur web Chromium M85).

Design **« Aurore »** (premium et coloré, trois thèmes : Aurore, Coucher de soleil, Océan) : rail d'icônes en verre flottant à gauche, grand **carrousel de jeux** dont la carte
sélectionnée s'élargit (Luna, Xbox, Gaming Hub), carrousels **Streaming**, **Mes
applications** (favoris), **Toutes les applications**, et **Réglages TV Hub**. Chaque
service connu a une illustration abstraite originale (aucun logo officiel). Navigation
100 % télécommande, allégée pour le processeur ARM de la TV (aucun calque plein écran animé).

![Aperçu](docs/captures/home.png)

> **État : prototype testé en simulation, pas encore installé sur le téléviseur.**
> Rien n'a été connecté ni installé sur la TV. Voir [Installation](docs/INSTALLATION.md).

## Principes

- Application web Tizen standard (`.wgt`), privilèges **publics** uniquement.
- Aucun accès réseau (pas de balise `access`, CSP `connect-src 'none'`), aucun compte,
  aucune analyse, aucune télémétrie. Préférences stockées localement dans l'app.
- **Aucun identifiant d'application codé en dur.** Les apps sont découvertes au démarrage
  (`tizen.application.getAppsInfo`) et reconnues par leur **nom**. Une tuile n'est
  lançable que si l'app a réellement été trouvée sur la TV.
- Un service absent s'affiche « Non détectée » et explique comment y accéder ; il ne
  simule jamais un lancement.
- Ne remplace pas l'accueil Samsung, ne démarre pas automatiquement, ne modifie rien
  d'autre sur la TV. Touche **Home** de la télécommande : toujours l'accueil Samsung.

## Télécommande

| Touche | Navigation | Personnalisation |
|---|---|---|
| Flèches | Déplacer le focus ; ← au bord gauche ouvre le **rail** | Idem / déplacer la tuile saisie |
| OK | Ouvrir l'application | Options : Déplacer, Ajouter/Retirer des favoris |
| Rouge (A) | Entrer en personnalisation | Terminer |
| Retour | Revenir à l'accueil Samsung | Terminer / fermer |

- **Carrousels** : en allant vers la droite, les premières cartes sortent à gauche pour
  révéler les suivantes ; la carte voisine dépasse toujours un peu.
- **Rail** : ↑/↓ prévisualise la section (la page défile), → ou OK y entre. La dernière
  icône (maison) revient à l'accueil Samsung.
- **Réglages TV Hub** : Personnaliser, **Thème**, **État des services** (ce qui a été détecté, avec
  les identifiants réels), Accueil Samsung, Réinitialiser (efface uniquement les
  préférences de TV Hub).

## Structure

```
app/                 code empaqueté dans le .wgt (et rien d'autre)
  config.xml         manifeste Tizen (profil tv-samsung, 3 privilèges publics)
  index.html, css/, js/, img/, icon.png
dev/                 simulation Tizen + test de bout en bout (jamais empaquetés, page générée)
maquettes/           les 4 maquettes d'interface (référence de design)
scripts/build.sh     tests + paquet .wgt (signé si Tizen Studio + profil disponibles)
scripts/serve.sh     aperçu local http://localhost:8765/dev/
scripts/capture.sh   capture 1920×1080 d'un état (séquence de touches ?keys=L,D,OK…)
tests/run-tests.js   tests unitaires et contrôles statiques (Node, sans dépendance)
docs/                compatibilité, installation, tests, démarrage, désinstallation (en français)
```

## Démarrage rapide (sur le Mac)

Prérequis : Node.js et Python 3 (aucune dépendance npm).

```bash
./scripts/build.sh
```

```bash
./scripts/serve.sh
```

Puis ouvrir `http://localhost:8765/dev/?fresh=1` et utiliser les flèches, Entrée, Échap
(= Retour). L'écran 1920×1080 est mis à l'échelle si la fenêtre est plus petite.
Scénarios : `?scenario=full`, `?scenario=listfail`, `?scenario=notizen`.
Test automatique : `?e2e=1` puis lire `window.__e2e` dans la console.
**La page `dev/` utilise des applications fictives** ; elle ne reflète pas votre TV.

## Installation sur la TV

Résumé (détails dans [docs/INSTALLATION.md](docs/INSTALLATION.md)) :

1. Installer **Tizen Studio 6.1** (`web-ide_Tizen_Studio_6.1_macos-64.dmg`, depuis
   `download.tizen.org`), puis dans le Package Manager : **TV Extensions** et
   **Samsung Certificate Extension** (≥ 2.0.73).
2. Activer le **mode développeur** de la TV (Applications → `12345`).
3. Créer un **certificat Samsung** (Certificate Manager, compte Samsung).
4. `TIZEN_PROFILE=<profil> ./scripts/build.sh`, puis installer le `.wgt` signé.

## Documents

- [Compatibilité et recherche](docs/COMPATIBILITE.md) — matrice Luna / Xbox / autres, sources
- [Installation](docs/INSTALLATION.md) — Tizen Studio, certificat Samsung, déploiement
- [Rapport de tests](docs/RAPPORT-DE-TESTS.md) — vérifié vs non vérifié
- [Démarrage automatique](docs/DEMARRAGE.md) — ce qui est possible, honnêtement
- [Désinstallation](docs/DESINSTALLATION.md)
