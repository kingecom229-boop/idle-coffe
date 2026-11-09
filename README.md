# ☕ Idle Coffee

Un jeu idle/clicker où tu construis ton empire du café : clique pour préparer des cafés, embauche des stagiaires, des baristas, des machines à expresso et jusqu'à des stations orbitales, débloque des améliorations, chasse le grain doré, et fais des Prestiges ("Torréfactions Légendaires") pour des bonus permanents.

## Fonctionnalités

- Clic pour gagner du café, avec animation et puissance évolutive.
- 9 producteurs automatiques avec coûts croissants.
- Améliorations de clic, améliorations globales et spécialisations par producteur (débloquées par paliers).
- Grain doré aléatoire donnant un bonus de frénésie ou un gain instantané.
- Système de Prestige permanent (grains dorés = +2% de production chacun).
- Sauvegarde automatique locale (localStorage) + gains hors-ligne au retour.
- Interface responsive, thème café chaleureux.

## Lancer le jeu en local

C'est un site statique pur (HTML/CSS/JS), sans dépendances ni build :

```bash
python3 -m http.server 8080
```

Puis ouvre `http://localhost:8080` dans ton navigateur.
