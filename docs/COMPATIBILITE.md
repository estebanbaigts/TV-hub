# Compatibilité et recherche (Phase 1)

Date : 20 octobre 2026. Légende : **Vérifié** = constaté ici ; **Documenté** = source
officielle ; **Signalé** = forum / tiers ; **Inconnu** = à vérifier sur la TV.

## 1. Plateforme cible

| Élément | Valeur | Niveau |
|---|---|---|
| Modèle | QE55Q70BATXXC (Q70B, 2022) | Vérifié (photo de l'écran « À propos ») |
| Firmware | T-PTMDEUC-1720.7 | Vérifié (photo) |
| Plateforme | Tizen 6.5 pour les TV 2022 | Documenté (Samsung, Web Engine Specifications) |
| Moteur web | Chromium M85 | Documenté (idem) |
| Résolution de l'app | 1920×1080 (vidéo 4K à part) | Documenté (Samsung, General Specifications) |
| Type d'app retenu | Application web Tizen `.wgt`, profil `tv-samsung` | Choix |
| Lanceur Android TV | **Incompatible** (Tizen n'exécute pas d'APK) | Documenté |

Outils présents sur le Mac (constaté) : macOS 27.2 **arm64**, Node 20, Java 8, Python 3,
zip. **Tizen Studio, la CLI `tizen` et `sdb` ne sont pas installés.**

## 2. API utilisées (toutes publiques)

| API | Rôle | Privilège | Niveau |
|---|---|---|---|
| `tizen.application.getAppsInfo` | Lister les apps installées | `application.info` (déclaré par précaution) | Documenté |
| `tizen.application.launch(id)` | Ouvrir une app | `application.launch` — **public** | Documenté |
| `getCurrentApplication().exit()` | Revenir à l'accueil Samsung | aucun | Documenté |
| `tizen.tvinputdevice.registerKey` | Touches de couleur | `tv.inputdevice` | Documenté |
| Flèches, OK, Retour (10009) | Reçues sans enregistrement | — | Documenté (guide Remote Control) |

Limites connues :
- Le lancement d'une **application de service** d'un autre paquet est bloqué depuis Tizen 2.4 (documenté). Ce n'est pas le cas des apps visibles (Netflix, YouTube…), qui sont des apps d'interface.
- `appmanager.kill` (fermer une autre app) est **partner** : non utilisé.
- Des développeurs signalent sur le forum Samsung qu'un `launch()` vers certaines apps « ne fait rien » sur TV. **C'est le principal risque non levé** : seul un essai sur votre TV le tranchera. L'écran « État des services » et les messages d'erreur sont prévus pour ce diagnostic.
- Touches **Home**, **Source** et alimentation : gérées par le système, jamais interceptées.
- Les numéros communautaires du type `3201907018807` (Netflix) servent au protocole de télécommande réseau, pas à l'API Tizen ; ils varient selon l'année et ne sont **pas** utilisés.
- **Liens profonds** (ouvrir directement un jeu Luna/Xbox, une série Netflix) : aucun mécanisme public documenté pour ces apps → **non implémenté**.

## 3. Matrice de compatibilité

| Service | Comment TV Hub l'ouvre | Disponibilité sur votre TV | Lancement direct |
|---|---|---|---|
| **Xbox (Cloud Gaming)** | Détection par nom « Xbox » puis `launch(id)` | App Xbox proposée dans Samsung Gaming Hub sur les TV 2022 (Documenté : Samsung Newsroom, 2022) | **Inconnu** : on ne sait pas si l'app apparaît dans `getAppsInfo` ni si elle accepte un lancement tiers |
| **Amazon Luna** | Détection par nom « Luna » puis `launch(id)` | Luna arrivé dans Gaming Hub sur les TV 2022 (Documenté : Samsung, août 2022). Luna est ouvert en France (Documenté : Amazon, 2026), mais **sa présence dans Gaming Hub en France n'a pas été confirmée** | **Inconnu** ; sinon la tuile affiche « Non détectée » avec le chemin manuel |
| **Samsung Gaming Hub** | Détection par nom « Gaming Hub » | Section système (icône manette de l'accueil, visible sur vos photos) | **Inconnu**, probablement pas une app listée : tuile explicative |
| **Netflix** | Détection par nom exact « Netflix » | Installée (ESN Netflix visible sur vos photos) | Probable, **non vérifié** |
| **YouTube** | Nom exact « YouTube » (« YouTube Kids » exclu) | Installée (visible sur vos photos) | Probable, **non vérifié** |
| CANAL+, Crunchyroll | Détection par nom | Visibles sur vos photos | Probable, **non vérifié** |
| Prime Video, Disney+, Apple TV, Spotify, Plex, Twitch, GeForce NOW | Détection par nom ; tuile affichée **seulement si trouvée** | Selon vos installations | Probable, **non vérifié** |
| Toute autre app visible | Rangée « Toutes les applications » | Selon la liste du système | Probable, **non vérifié** |

Repli si une app n'est pas détectée ou refuse le lancement : message clair et chemin
manuel (accueil Samsung → Gaming Hub, ou touche Home). Aucun bouton factice.

## 4. Émulateur

Samsung indique sur ses forums (2021–2023) que l'émulateur TV de Tizen Studio
**ne fonctionne pas sur les Mac Apple Silicon** (il exige la virtualisation x86).
Votre Mac est arm64 : **le test en émulateur n'a pas été possible**. Ce qui le remplace :
simulation de l'API Tizen dans un navigateur à 1920×1080, plus les contrôles statiques
de compatibilité M85. Voir le rapport de tests.

## Sources

- Samsung — [Web Engine Specifications](https://developer.samsung.com/smarttv/develop/specifications/web-engine-specifications.html)
- Samsung — [General Specifications](https://developer.samsung.com/smarttv/develop/overview.html)
- Samsung — [Application API](https://developer.samsung.com/smarttv/develop/api-references/tizen-web-device-api-references/application-api.html)
- Samsung — [Remote Control guide](https://developer.samsung.com/smarttv/develop/guides/user-interaction/remote-control.html)
- Samsung — [Launch checklist](https://developer.samsung.com/smarttv/develop/distribute/launch-checklist.html)
- Tizen — [Privilèges](https://www.tizen.org/Privilege/) · [App controls](https://docs.tizen.org/application/native/guides/app-management/app-controls/)
- Samsung Newsroom — [Luna sur Gaming Hub (2022)](https://news.samsung.com/us/samsung-amazon-luna-gaming-hub-2022-smart-tvs-smart-monitor-series-now-available/) · [Xbox sur Gaming Hub](https://news.samsung.com/de/what-a-match-xbox-app-zieht-in-den-gaming-hub-von-samsung-smart-tvs-ein)
- Amazon — [Pays où Luna est disponible](https://www.amazon.com/gp/help/customer/display.html?nodeId=TXHVI0WFpYnGXsA0Gm)
- Forums Samsung (signalé) — [Émulateur et Mac](https://forum.developer.samsung.com/t/tizen-studio-and-mac-os-issues/9279) · [Lancer une autre app](https://forum.developer.samsung.com/t/launching-appstore-from-samsung-tizen-tv-app/21682) · [Démarrage automatique](https://forum.developer.samsung.com/t/samsung-tizen-screen-app-startup/29012)
- Communautaire (non utilisé) — [samsung-tv-ws-api APPLICATIONS.md](https://github.com/xchwarze/samsung-tv-ws-api/blob/master/APPLICATIONS.md)
