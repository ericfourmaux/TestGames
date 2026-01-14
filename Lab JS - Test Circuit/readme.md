🛠️ Notes & réglages


Drift/Grip

Augmente WORLD.driftGrip pour moins de glisse (plus d’adhérence).
Augmente WORLD.turnRate pour des virages plus vifs.
L’herbe applique grassMul (réduit grip) + grassDrag (ralentit).



IA

Les waypoints sont extraits des tuiles O dans la tilemap et triés pour faire une boucle.
Ajuste lookAhead et le calcul de targetSpeed dans AIController pour moduler l’agressivité.



Collisions

Le véhicule est approché par un cercle (simple et efficace), s’éloigne du mur et rebondit (wallBounce).



Circuit

Modifie la tilemap level (caractères .=#SO) pour sculpter ton circuit.
La ligne S incrémente un tour à chaque passage rapide.



Caméra

Suit la moyenne des joueurs en pvp pour rester visible.
Ajuste WORLD.camLerp pour la douceur.



Contrôles

J1: ↑/↓ (accélère/freine), ←/→ (volant).
J2: W/S (accélère/freine), A/D (volant).
P: pause.