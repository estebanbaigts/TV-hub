# Démarrage automatique (Phase 5)

## Conclusion

**Non supporté sur votre téléviseur.** TV Hub n'implémente aucun démarrage automatique.

- Aucune API publique ne permet à une application tierce de se lancer à l'allumage d'une
  TV grand public. Un modérateur Samsung l'indique sur le forum développeur : pas d'API
  de ce type pour les applications d'usage général (Signalé).
- La fonction « application personnalisée au démarrage » (*Auto Source Switching →
  Custom App*) existe sur les écrans **professionnels** Samsung (signage / B2B), pas sur
  la gamme QLED grand public.
- Une propriété « auto-start » dans `config.xml` est évoquée sur un forum Tizen sans
  source officielle : **non utilisée**.
- Remplacer l'accueil ou détourner le démarrage : exclu (contraintes du projet).

## Accès le plus rapide, sans rien modifier au système

1. Après installation, TV Hub est dans **Applications**.
2. Sur sa tuile, appui long sur OK (ou menu de la tuile) → **Ajouter à l'accueil**, puis
   **Déplacer** en **première position** de la rangée d'applications.
3. À l'allumage : touche **Home** → TV Hub est la première tuile → **OK**.
   Soit 2 pressions.

Les libellés exacts des menus peuvent varier selon le firmware : **non vérifié sur votre
TV**.

## Piste non retenue

Certaines TV Samsung ont un réglage du type « Exécution automatique de la dernière
application ». Même s'il existe sur votre modèle (non vérifié), il relancerait la
*dernière* application utilisée (souvent Netflix ou YouTube), pas TV Hub. Il n'a donc
pas été activé ni recommandé.
