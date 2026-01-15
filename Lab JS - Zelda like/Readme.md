✅ Ce que contient ce ZIP

Vanilla JS + ES Modules (Canvas 2D)
Tiles 32×32 via un tileset (assets/tiles.png) :

0=sol (marron), 1=roche (solide), 2=eau (solide), 3=herbe, 4=sable


Grande map 60×40 (codée en Array 2D), collisions avec tuiles solides
Animations pas à pas :

Joueur (assets/player.png) — spritesheet 4×4 (128×128), lignes :

Ligne 0 = marche bas : frames [0,1,2,1]
Ligne 1 = marche haut : frames [4,5,6,5]
Ligne 2 = marche côté : frames [8,9,10,9] (flipX pour gauche)
Ligne 3 = attaque : frames [12,13,14]


Ennemis (assets/enemy_slime.png) — 1×4 : [0,1,2,1]


Système d’événements (src/systems/Events.js) :

Coffre (donne un objet), Porte (ouvre si clé), Téléporteur, Panneau (message HUD)


Boutique/PNJ (achat/échange via rupees/inventaire) + UI inventaire
Particules (poussière, étincelles, “poof”, pickup)
Pré-chargement des images/sons + petite musique de fond (placeholder)
Scrolling multidirectionnel, delta-time, tri de profondeur par Y


▶️ Lancer en local

Dézippe l’archive.
Ouvre un terminal dans le dossier dézippé.
Lance un serveur local (modules ES obligent) :
Shellpython3 -m http.server 8080Afficher plus de lignes

Ouvre http://localhost:8080 dans le navigateur.


Contrôles : ZQSD / flèches pour bouger · Shift pour courir · Espace attaquer · E interagir · I inventaire


🧩 Où regarder / modifier
Tileset & rendu tuiles

Fichier : src/world/Tilemap.js
Principe : on calcule sx/sy dans le tileset (dessin via drawImage) à partir d’un index de tuile.
Mapping simple dans le code : 0 → idx0 (sol), 1 → idx1 (roche), 2 → idx2 (eau), 3 → idx3 (herbe), 4 → idx4 (sable).


Tu peux remplacer assets/tiles.png par ton vrai tileset 32×32.
Si les tuiles ne sont pas dans le même ordre, adapte la ligne :
JavaScriptconst idx = t===0?0 : t===1?1 : t===2?2 : t===3?3 : 4;Afficher plus de lignes

Animations (step-by-step)

Fichier : src/systems/Animation.js (moteur) & src/core/Player.js, src/core/Enemy.js (clips)
Clip joueur :
JavaScriptthis.anim = new Animator(img, 32, 32, {  idle_down:{frames:[0], fps:1, loop:true},  idle_up:{frames:[4], fps:1, loop:true},  idle_side:{frames:[8], fps:1, loop:true},  walk_down:{frames:[0,1,2,1], fps:8, loop:true},  walk_up:{frames:[4,5,6,5], fps:8, loop:true},  walk_side:{frames:[8,9,10,9], fps:8, loop:true},  attack:{frames:[12,13,14], fps:14, loop:false}});Afficher plus de lignes

Si ton spritesheet a un autre ordre de frames/colonnes, modifie simplement ces indices.



Évènements (coffre, porte, téléporteur, panneau)

Fichier : src/systems/Events.js
Exemples d’ajout dans src/world/Map.js :
JavaScriptevents.add(events.makeChest(14,15,{itemId:'key', name:'Clé de bronze'}));events.add(events.makeDoor(16,16,{need:'key'}));events.add(events.makeTeleport(50,8, 6*TILE_SIZE, 30*TILE_SIZE));events.add(events.makeSign(5,10, 'La vieille ruine cache des secrets…'));Afficher plus de lignes


Boutique / PNJ

Interaction gérée dans Game.update() : si proche du PNJ (type store), HUD affiche “E: parler (Boutique)” ; appuie sur E pour acheter/échanger.


🖼️ Assets fournis (placeholders)

assets/tiles.png — 5 tuiles classiques (sol, roche, eau, herbe, sable).
assets/player.png — spritesheet 4×4 (walk/attack).
assets/enemy_slime.png — 1×4 (slime avec 4 frames).
assets/items.png — 2×2 (Rubis, Potion, Clé, Orbe).
Petits sons WAV : hit, coin, buy, hurt, music (boucle simple).


Ces placeholders donnent un rendu propre pixel-art de base. Tu peux les remplacer à l’identique (mêmes dimensions/grilles), et tout fonctionnera sans toucher au code (ou en ajustant juste les indices d’animation si l’ordre change).


🛠️ Conseils de personnalisation

Vrais tilesets 32×32 : remplace assets/tiles.png et ajuste l’indexation dans Tilemap.draw.
Joueur/ennemis : remplace player.png / enemy_slime.png et mets à jour les indices dans les clips.
Map plus riche : modifie buildLargeMap() (dans src/config.js) pour dessiner des rivières, murs, zones…
Événements avancés : duplique makeDoor/makeChest pour créer portes multiples, coffres persistants (via localStorage), interrupteurs, ponts (changer les tuiles d’eau en sol).
Particules : appelle particles.spark/dust/poof/pickup aux bons moments (ex: ouverture de porte, succès d’achat).

