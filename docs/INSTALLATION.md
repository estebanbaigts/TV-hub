# Installation

> **Ces étapes n'ont pas encore été exécutées.** Elles touchent au téléviseur (mode
> développeur) et nécessitent votre compte Samsung : elles attendent votre accord.
> Statut : procédure officielle Samsung, **non vérifiée sur votre TV**.

## Ce que l'installation change sur la TV — et ce qu'elle ne change pas

- **Change** : le *mode développeur* est activé (réglage officiel, réversible) et
  l'application TV Hub est ajoutée.
- **Ne change pas** : firmware, Smart Hub, accueil Samsung, applications existantes,
  Wi-Fi, DNS, Bluetooth, réglages de jeu.

## A. Sur le Mac

1. **Installer Tizen Studio 6.1** : fichier `web-ide_Tizen_Studio_6.1_macos-64.dmg`
   (622 Mo), lien donné par la documentation TV de Samsung :
   `https://download.tizen.org/sdk/Installer/tizen-studio_6.1/`. Ouvrir l'image et lancer
   `installer.app`. (Aucune somme de contrôle n'est publiée sur ce serveur ; l'intégrité
   interne de l'image est vérifiable avec `hdiutil verify`.)
2. Dans **Package Manager** → *Extension SDK*, installer :
   - **Samsung Certificate Extension** — version **2.0.73 minimum** (Samsung indique que
     la création de certificat échoue avec les versions antérieures depuis septembre 2025) ;
   - **TV Extensions** (la version la plus récente proposée).
   L'émulateur TV n'est pas nécessaire (et ne fonctionne pas sur Mac Apple Silicon).
3. Vérifier :
   ```bash
   ~/tizen-studio/tools/ide/bin/tizen version
   ```

## B. Sur la TV : mode développeur (procédure Samsung)

1. Mac et TV sur le même réseau. Noter l'**adresse IP du Mac**.
2. Accueil Samsung → **Applications**.
3. Sur la page Applications, taper **1 2 3 4 5** sur la télécommande (pavé numérique
   virtuel de la Smart Remote si besoin).
4. **Developer mode : On**, saisir l'IP du Mac, valider.
5. **Redémarrer la TV** (maintenir la touche alimentation jusqu'au redémarrage).
6. Noter l'**adresse IP de la TV** (Paramètres → Général → Réseau → État du réseau).

## C. Certificat Samsung (une seule fois)

1. Connecter la TV :
   ```bash
   ~/tizen-studio/tools/sdb connect <IP_TV>
   ```
2. Tizen Studio → **Tools → Certificate Manager** → `+` → **Samsung** → **TV**.
3. Créer un *author certificate*, se connecter au compte Samsung.
4. Créer le *distributor certificate*, niveau **Public** ; la TV connectée y est
   ajoutée automatiquement (DUID). Nommer le profil, par exemple `TVHub`.

## D. Construire et installer

```bash
TIZEN_PROFILE=TVHub ./scripts/build.sh
```

```bash
~/tizen-studio/tools/sdb devices
```

```bash
~/tizen-studio/tools/ide/bin/tizen install -n dist/TVHub-1.0.0.wgt -t <NOM_DU_DEVICE>
```

TV Hub apparaît ensuite dans **Applications**. Pour un accès rapide, voir
[DEMARRAGE.md](DEMARRAGE.md).

## E. Vérifications à faire sur la TV (après accord)

1. TV Hub s'ouvre en plein écran, texte net, rien de coupé.
2. Flèches dans les 4 directions, OK, Retour, touche Rouge (A).
3. **État des services** : noter ce qui est détecté (✓/✕ et identifiants).
4. Ouvrir Netflix, puis touche Retour/Home → rouvrir TV Hub : le focus revient-il ?
5. Tester chaque tuile Jeux : lancement réel ou message « Non détectée ».
6. Touche Retour sur l'écran principal → retour à l'accueil Samsung.

Puis compléter le tableau « À vérifier sur la TV » du
[rapport de tests](RAPPORT-DE-TESTS.md).
