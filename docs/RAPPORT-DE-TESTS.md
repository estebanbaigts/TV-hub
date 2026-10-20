# Rapport de tests — TV Hub 1.0.0 (style « Console »)

Date : 20 octobre 2026. Environnement : Mac arm64 (macOS 27.2), Node 20, navigateur
intégré (Chromium récent) émulant 1920×1080, **API Tizen simulée** (`dev/tizen-mock.js`,
applications fictives).

**Premiers essais sur le téléviseur (20/10/2026)** : installation réussie, toutes les fonctions répondent ; lenteur signalée, corrigée par une version allégée (à revérifier). L'émulateur Samsung n'a pas été utilisé. L'émulateur TV
ne fonctionne pas sur Mac Apple Silicon et Tizen Studio n'est pas installé (voir
[COMPATIBILITE.md](COMPATIBILITE.md)).

## 1. Vérifié (dans la simulation)

### Tests unitaires et statiques — `node tests/run-tests.js` : 19/19

- Navigation : bornes gauche/droite/haut/bas, sans bouclage ; colonne bornée ; mémoire
  de colonne par rangée ; rangées vides sautées ; **déterminisme sur 10 000 touches**
  (deux exécutions identiques) ; position toujours valide ; saut de rangée depuis le rail
  avec colonne mémorisée.
- Ordre enregistré respecté ; les nouvelles apps s'ajoutent en fin de rangée.
- Catalogue : **aucun identifiant codé en dur** ; correspondance par nom (YouTube ≠
  YouTube Kids, « Lunar Calendar » ≠ Luna) ; chaque service de jeu absent a une
  explication.
- Paquet : aucune URL réseau ; simulation absente du paquet ; exactement 3 privilèges
  publics, aucune balise `access` ; pas de CSS/JS récent incompatible avec Chromium M85
  (`inset`, `?.`, `??`, `aspect-ratio`, flou…).

### Bout en bout dans le navigateur — `dev/?e2e=1` : 37/37

| Comportement | Résultat |
|---|---|
| Focus initial sur la première app disponible | OK |
| Service absent (Luna) marqué « Non détectée », **aucun lancement tenté**, explication affichée | OK |
| App de service masquée et TV Hub lui-même exclus de la liste | OK |
| App optionnelle absente (Disney+) non affichée | OK |
| Flèches dans les 4 directions et butées | OK |
| Rail : ← au bord gauche, aperçu de section ↑/↓, retour → sur la tuile mémorisée | OK |
| Carrousel : la carte de jeu focalisée est dépliée | OK |
| Carrousels : la dernière carte devient entièrement visible, la première sort à gauche, retour exact au début | OK |
| Lancement avec l'**identifiant découvert** (Netflix) | OK |
| Retour d'une app (événement `visibilitychange`) → **focus restauré** | OK |
| Échec de lancement → message d'erreur avec la cause (`NotFoundError`) | OK |
| Personnalisation : ajout aux favoris, déplacement de tuile, enregistrement local | OK |
| Retour sur l'écran principal → `exit()` (retour à l'accueil Samsung) | OK |
| Un seul élément focalisé (rangées + rail) après 3 000 appuis | OK |

### Autres vérifications

| Point | Mesure |
|---|---|
| Rendu 1920×1080 | Captures OK (`docs/captures/`) : carrousels en début et en fin de course, rail, personnalisation, feuilles |
| Fenêtre plus petite (aperçu) | La scène 1920×1080 est mise à l'échelle et reste entière (capture 1200×800) ; échelle 1 sur la TV |
| Liste des apps indisponible (`?scenario=listfail`) | Message clair, interface utilisable |
| Hors TV (`?scenario=notizen`) | Aucune app lançable, message « aperçu hors TV » |
| Performance | 3 000 appuis en ~1,0 s, soit **~0,33 ms par appui** (navigateur du Mac) |
| Mémoire | Tas JS **~2,7 Mo**, ~536 nœuds DOM (illustrations SVG comprises) |
| Réseau | Seuls les fichiers locaux de l'app sont chargés ; la CSP **bloque** toute requête (`fetch` testé et refusé) |
| Persistance | Après rechargement, le focus revient sur la dernière tuile |
| Build | `scripts/build.sh` produit `dist/TVHub-1.0.0-unsigned.wgt` (11 fichiers, ~148 Ko) |

## 2. Non vérifié — à faire sur la TV

| Point | Pourquoi ce n'est pas vérifié | Comment le vérifier |
|---|---|---|
| Rendu réel sur Chromium M85 / Tizen 6.5 | Pas d'émulateur sur arm64, pas de TV | Ouvrir TV Hub sur la TV |
| Contenu réel de `getAppsInfo` (noms, `show`, icônes) | API simulée | « État des services » |
| `launch()` accepté pour Netflix, YouTube, Xbox, Luna | Risque signalé sur forum | Ouvrir chaque tuile |
| Présence de Luna / Xbox / Gaming Hub comme apps lançables | Inconnu | « État des services » |
| Icônes réelles (`iconPath` en `file://`) | Pas de fichiers TV | Visuel sur la TV |
| Touche Rouge (A) et Retour sur la télécommande physique | Clavier simulé | Télécommande |
| Restauration du focus après un vrai retour d'app | Événement simulé | Netflix → Home → TV Hub |
| CPU / mémoire sur la TV | Mesures faites sur Mac | Outils Tizen Studio (si besoin) |
| Fluidité sur la TV | 1re installation (20/10/2026) : **fonctionnel mais très lent**. Version allégée : ambiance plein écran, grain, reflets, ombres floues et animation de largeur supprimés ; ~30 % de travail en moins par appui en simulation | À revérifier sur la TV après réinstallation |
| Police : Samsung One sur la TV (SF Pro sur le Mac des captures) | Rendu légèrement différent | Visuel sur la TV |
| Signature, installation, désinstallation | Non autorisé à ce stade | [INSTALLATION.md](INSTALLATION.md) |
| Démarrage automatique | **Non supporté** (voir [DEMARRAGE.md](DEMARRAGE.md)) | — |

La définition de « terminé » du projet exige ces vérifications sur la TV : **le projet
n'est donc pas terminé** tant que l'étape de déploiement n'a pas été approuvée et
réalisée.
