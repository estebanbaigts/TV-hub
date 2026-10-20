# Installation sur une TV LG (webOS)

> **Non testé sur une vraie TV LG.** Le code LG a été vérifié dans la simulation
> (`http://localhost:8765/dev/?platform=webos`). Procédure officielle LG « Developer Mode ».

## Ce qui fonctionne sur LG

- Toute l'interface, TMDB, la météo, la télécommande (Retour = touche 461).
- **Lancement des applications** par le service public `com.webos.applicationManager/launch`.
- **Détection** : webOS refuse généralement à une app tierce la liste des applications
  installées. Dans ce cas, Accueil+ essaie Netflix, Prime Video, YouTube, Disney+, Apple TV et
  Spotify par leur identifiant public ; si la TV refuse, la tuile passe à « Non détectée ».
  Les autres services (CANAL+, Crunchyroll, Luna, Xbox, GeForce NOW, Twitch) indiquent de
  passer par l'accueil LG. Si la TV autorise la liste, tout est détecté par nom, comme sur Samsung.
- Pas de Gaming Hub (propre à Samsung).

## A. Sur le Mac (une fois)

```bash
npm install -g @webos-tools/cli
```

## B. Sur la TV (une fois)

1. Créer un compte sur le site développeur LG (webostv.developer.lge.com).
2. Sur la TV : LG Content Store → installer l'app **Developer Mode** → se connecter.
3. Activer **Dev Mode Status** et **Key Server**, redémarrer si demandé. Noter l'IP affichée.
4. La session dure environ 50 h ; le bouton **Extend** de l'app la prolonge.

## C. Associer la TV au Mac (une fois)

```bash
ares-setup-device
```

Ajouter un appareil nommé `tv`, IP de la TV, port `9922`, utilisateur `prisoner`. Puis :

```bash
ares-novacom --device tv --getkey
```

Saisir la *passphrase* affichée dans l'app Developer Mode.

## D. Installer (à chaque mise à jour)

```bash
./scripts/install-lg.sh
```

Autre nom d'appareil : `LG_DEVICE=salon ./scripts/install-lg.sh`.

## Désinstaller

```bash
ares-install -d tv --remove com.estebanbaigts.accueilplus
```
