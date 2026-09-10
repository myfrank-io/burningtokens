# Boîtier — recherche de forme

`cinq-formes.html` est une planche de recherche esthétique pour l'objet de bureau
iBurned : la mascotte Claude Code transformée en petit boîtier qui affiche la
jauge de consommation.

Page statique autonome — aucune dépendance au build Next.js. À ouvrir directement
dans un navigateur.

## Planche 02 — proportion retenue

La proportion est arrêtée : corps large et bas (22 × 16 cellules, 23 avec la
saillie du bouton, soit 101 × 70 × 52 mm), quatre pattes courtes réparties en
miroir strict autour de l'axe (colonnes 4 ↔ 16 et 7 ↔ 13), deux ergots à hauteur
des yeux.

L'ergot droit est un bouton — la seule asymétrie assumée de l'objet. Il déborde
d'une cellule sur l'ergot fixe et un jeu de fonctionnement le sépare du corps.
Appui court : vue suivante parmi quatre (session, semaine, par modèle, crédits
extra), signalée par quatre points empilés au bord droit de l'écran. Appui long :
veille.

Le corps reste sur la trame du sprite — angles à 90°, aucun congé — mais les yeux
en sortent : ils sont tracés en vecteur, jamais en escalier de pixels.

Cinq déclinaisons du regard et de l'emplacement de l'information : yeux chevrons,
yeux pleins, yeux hublots, écran ventre, pixel plein. S'y ajoutent le relevé coté
de la proportion retenue, le parcours des quatre vues du bouton, et le
vocabulaire du regard en six états.

Les volumes sont indicatifs : rien n'est coté au sens fabrication, et rien ici ne
préjuge de l'électronique embarquée.

## Génération

Les dessins sont produits par script (grille de cellules → rectangles SVG
alignés, `shape-rendering: crispEdges`) ; les yeux sont des polygones tracés à
part en `geometricPrecision`. Les scripts de génération ne sont pas versionnés —
le HTML produit fait foi.
