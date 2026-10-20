# Maquette V6 — hub fonctionnel

Accueil inspiré d'Apple TV : grande image du contenu mis en avant, onglets discrets
(Accueil · Streaming · Jeux · Musique et divertissement · Toutes les applications · Réglages)
et rangées de tuiles. 100 % télécommande.

## Lancer

```
python3 -I ../../scripts/devserver.py 8766
```

- `index.html` : navigateur seul (aucune app lançable, c'est indiqué à l'écran).
- `?scenario=default|full|listfail` : simulation Tizen de `dev/tizen-mock.js` (apps **fictives**).
- `?i=4` : focus initial sur la 5ᵉ tuile streaming (compatibilité avec l'ancienne V6).
- `?keys=D,R,OK` : rejoue une séquence de touches (captures/tests).
- `key.js` (ignoré par git) : `window.TMDB_KEY = '…'`. Absent → TMDB désactivé, rien ne casse.

## Fichiers

| Fichier | Rôle |
|---|---|
| `index.html` | structure de l'écran |
| `hub.css` | styles (1920×1080, sans `backdrop-filter`, animations sur transform/opacity) |
| `hub.js` | sections, focus, zone mise en avant, lancement, réglages, heure/météo |
| `tmdb.js` | TMDB : cache 6 h, délai max 8 s, états chargement / erreur / désactivé |

Réutilisés sans modification : `app/js/platform.js` (lancement réel), `catalog.js`
(détection par nom), `nav.js` (D-pad), `widgets.js` (libellés météo, ville du fuseau).

## Télécommande

| Touche | Effet |
|---|---|
| ←/→ | tuile voisine (arrêt aux bords) ; dans les onglets : onglet voisin |
| ↑/↓ | rangée voisine (colonne mémorisée) ; ↑ depuis la 1ʳᵉ rangée → onglets ; ↓ depuis un onglet → ouvre la section |
| OK | seule touche qui agit : ouvre l'app, la section ou l'option (répétition ignorée, un seul lancement à la fois) |
| Retour | ferme la fenêtre → revient à la section précédente (focus restauré) → onglets → quitte vers l'accueil Samsung |

## Règles de vérité

- Une tuile n'ouvre une app que si `tizen.application.getAppsInfo` l'a trouvée. Sinon : « Non détectée » et explication.
- « Ouverte » ne s'affiche que sur le rappel de succès de `tizen.application.launch` ; échec → message avec le code d'erreur.
- Les titres viennent de `/discover` filtré par fournisseur (FR, abonnement) : **disponibilité selon TMDB/JustWatch**, mentionné à l'écran. Pas de lien profond : OK ouvre l'app du service, l'utilisateur y recherche le titre.
- Météo réelle (Open-Meteo, cache 30 min) ou « Météo indisponible ». Aucune valeur inventée.

## Jeux : « Reprendre » et « Jeu du moment »

- **Reprendre** : tuile en tête de la rangée Jeux = dernier service de jeu ouvert *depuis TV-hub*
  (enregistré seulement si la TV confirme le lancement). OK l'ouvre directement.
- **Jeu du moment** (section Jeux) : nom de jeu tapé par vous pour Luna, Xbox ou GeForce NOW, affiché
  en grand comme rappel. Vide = effacé. Stocké uniquement sur la TV.
- Limite : aucune API ne donne l'historique de jeu de ces applications ni ne permet d'ouvrir un jeu
  précis. OK ouvre l'application ; le jeu se choisit dedans (c'est écrit à l'écran).

## À valider sur le téléviseur

Testé uniquement sur Chrome de bureau (1920×1080) avec la simulation Tizen. Restent à vérifier
sur la QE55Q70BATXXC : fluidité réelle (ARM), rendu de la police SamsungOne, codes de la touche
Retour (10009), délais de `launch`, le clavier virtuel du champ « Jeu du moment », et le chargement des images TMDB depuis la TV. Pour empaqueter
cette V6 dans le `.wgt`, ajouter `api.themoviedb.org` et `image.tmdb.org` aux `<access>` de
`config.xml` et à la CSP — et préférer un petit proxy à une clé TMDB embarquée.
