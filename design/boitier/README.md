# Boîtier — direction retenue

`ecran-ventre.html` est la planche de la direction retenue pour l'objet de bureau
iBurned : la mascotte Claude Code transformée en petit boîtier qui affiche la
jauge de consommation.

Page statique autonome — aucune dépendance au build Next.js. À ouvrir directement
dans un navigateur.

## Écran ventre

Les yeux remontent et se taisent : deux rectangles gris foncé (#6E655E), posés
haut, qui ne disent rien. Tout le bas du corps devient un écran, et c'est lui
seul qui porte la couleur d'état.

Le corps garde la trame du sprite : 22 × 16 cellules (97 × 70 × 52 mm), angles à
90°, aucun congé. Quatre pattes courtes en miroir strict autour de l'axe
(colonnes 4 ↔ 16 et 7 ↔ 13). Deux ergots identiques, dont le droit est le bouton
— rien ne le montre, à un jeu de fonctionnement de quelques dixièmes près.

Appui court : vue suivante parmi quatre (session, semaine, par modèle, crédits
extra), signalée par quatre points empilés au bord droit de l'écran. Appui long :
veille.

## Contenu de la planche

- Vue trois-quarts (perspective cavalière 45°, profondeur réduite de moitié)
- Élévation avant et fiche couleur / matière / finition / gabarit
- Quatre vues orthographiques à la même échelle : face, profil droit, dessus, dos
- Relevé coté avec axe de symétrie et repérage des pattes
- Le parcours des quatre vues du bouton
- Le vocabulaire du regard en six états

Les volumes sont indicatifs : rien n'est coté au sens fabrication, et rien ici ne
préjuge de l'électronique embarquée.

## Génération

Les dessins sont produits par script (grille de cellules → rectangles SVG
alignés, `shape-rendering: crispEdges`) ; les yeux et les faces obliques sont des
polygones tracés à part en `geometricPrecision`. Les scripts de génération ne
sont pas versionnés — le HTML produit fait foi.
