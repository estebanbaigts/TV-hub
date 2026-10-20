# Désinstallation

Supprime **uniquement** TV Hub. Les autres applications, l'accueil Samsung et les
réglages ne sont pas touchés. Statut : procédure **non vérifiée sur votre TV** (TV Hub
n'y a pas encore été installé).

## Option 1 — depuis la TV (recommandée)

1. Accueil Samsung → **Applications** → **Paramètres** (roue dentée).
2. Sélectionner **TV Hub** → **Supprimer** → confirmer.

Les préférences de TV Hub (ordre, favoris) sont stockées dans l'application et
disparaissent avec elle.

## Option 2 — depuis le Mac

```bash
~/tizen-studio/tools/ide/bin/tizen uninstall -p tvhubPerso.TVHub -t <NOM_DU_DEVICE>
```

## Revenir à l'état d'origine

1. Désactiver le mode développeur : **Applications** → taper **1 2 3 4 5** →
   **Developer mode : Off** → redémarrer la TV.
2. Facultatif, sur le Mac : supprimer le profil de certificat dans Certificate Manager,
   puis désinstaller Tizen Studio.
