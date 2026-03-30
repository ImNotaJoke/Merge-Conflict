# JSAE 2026 - Merge Conflict
**Objectif** : Développer un jeu de type "shoot them up" en typescript  
**Thème choisi** : Animal Crossing X Doom  
**Développeurs** : Florian GAVOILLE, Sulivan CERDAN et Sebastian NOVAK  

**Modes de jeu** :  
- **Solo** : Un seul joueur contre une horde d'ennemis
- **Coop** : En duo, tentez de tenir le plus longtemps face aux ennemis. Dès qu'un des deux joueurs meurt, la partie s'arrête
- **Multijoueur** : De 2 à 10 joueurs, combattez les ennemis au court d'un combat sans relache ! Quand un joueur meurt, il passe en mode spectateur. La partie s'arrête quand tous les joueurs sont morts

Dans tous les modes de jeu, un boss apparaît toutes les deux minutes. Son comportement évolue en fonction de la difficulté.  

## Diagramme de séquence
![Diagramme de séquence](./JSAE_Diagramme_Sequence.svg)

## Difficultés techniques
Pendant ce long périple qu'a été ce projet, nous avons été confronté à de nombreuses difficultés techniques que nous avons su surpasser du mieux possible. Parmi elles :
- **Choix des skins en mode multijoueur** : Le choix du skin du joueur a été difficile à cause d'un mauvais choix de variable sur notre classe. En effet, nous avions initialement attribué à un joueur un attribut de type HTMLImageElement, ce qui rendait son affichage par les autres joueurs compliqué (si ce n'est impossible). A la place, nous avons opté pour une liste d'HTMLImageElement similaire à tous les joueurs, chargée au lancement du jeu, et nous stockons ainsi l'index de cette image, plutôt que l'image elle même  
- **Plusieurs joueurs simultanément** : Faire jouer deux personnes en même temps n'a pas été une difficulté, néanmoins permettre la continuité du jeu a été un défi. Initialement, uniquement les modes solo et coop existaient, ne permettant pas un jeu à 3, 4, 5... 10 et dès qu'une personne mourrait, c'était Game Over. L'implémentation du mode multijoueur avec sa vue spectateur a été un défi qui nous a demandé plusieurs heures de travail. Le résultat final correspond totalement à nos attentes
- **Gestion des médias** : La gestion des médias en HTML est très spécifique et génère très régulièrement des erreurs. Fort heureusement, la documentation sur ces éléments est très complète et nous avons su retirer ces erreurs avec le temps.

## Points d'amélioration / d'achèvement de notre projet
Pour avoir un projet **parfait**, nous imaginions :
- Un système de monnaie / expérience pour débloquer les skins au fur et à mesure de nos scores
- Des succès (par exemple vaincre le boss 1 fois, 10 fois.., faire 1000 de score, 10000.. )
- Le refactor du code pour qu'il soit plus optimisé, nos façons de faire étant rudimataires

## Nos fiertés
Nous avons réussi à respecter notre thème du début à la fin, à faire un jeu que nous trouvons beau et qui fonctionne !  
Parmi nos plus grandes fiertés :
- Le système de room permettant plusieurs parties simultanément
- Le choix des skins fonctionnent et sont synchronisés entre les clients
- Il y a une vue spectateur en mode multijoueur pour continuer à regarder la partie en cours
- Le thème est entièrement respecté

