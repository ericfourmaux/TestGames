
/* ================================
   Platformer Vanilla JS — main.js
   ================================ */

/* ====== Canvas & Contexte ====== */
const CANVAS = document.getElementById('game');
const ctx = CANVAS.getContext('2d');

ctx.canvas.width = 800;
ctx.canvas.height = 450;

/* ====== Niveau (tilemap) ====== */

const TILE = 32;
const level = [
  "........................",
  "........................",
  "........................",
  "........................",
  "........................",
  "........................",
  "...........####.........",
  ".......####............#",
  "..................###..#",
  "#####.................##",
  "#####.................##",
  "########################"
];

function tilesToPlatforms(levelStrs) {
  const plats = [];
  for (let y = 0; y < levelStrs.length; y++) {
    let runStart = -1;
    for (let x = 0; x < levelStrs[y].length; x++) {
      const solid = levelStrs[y][x] === '#';
      if (solid && runStart === -1) runStart = x;
      if ((!solid || x === levelStrs[y].length - 1) && runStart !== -1) {
        const end = solid ? x : x - 1;
        plats.push({
          x: runStart * TILE,
          y: y * TILE,
          w: (end - runStart + 1) * TILE,
          h: TILE
        });
        runStart = -1;
      }
    }
  }
  return plats;
}



/* ====== Paramètres Monde ====== */
const WORLD = {
  gravity: 1800,       // px/s^2
  moveSpeed: 260,      // px/s
  jumpSpeed: 700,      // px/s
  maxFall: 1600,       // limite vitesse de chute
  frictionGround: 0.85,
  frictionAir: 0.98
};

/* ====== Caméra ====== */
const camera = {
  x: 0, y: 0,
  width: CANVAS.width,
  height: CANVAS.height,
  lerp: 0.12 // douceur du suivi caméra
};

/* ====== Entrées clavier ====== */
const keys = {
  left: false,
  right: false,
  up: false
};

// Prévenir le scroll de la page avec les flèches/space
function preventIfGameKey(e) {
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', ' '].includes(e.key) || e.code === 'Space') {
    e.preventDefault();
  }
}

window.addEventListener('keydown', (e) => {
  preventIfGameKey(e);
  if (['ArrowLeft','a','A','q','Q'].includes(e.key)) keys.left = true;
  if (['ArrowRight','d','D'].includes(e.key)) keys.right = true;
  if (['ArrowUp','w','W',' ', 'Space'].includes(e.key) || e.code === 'Space') keys.up = true;
});

window.addEventListener('keyup', (e) => {
  preventIfGameKey(e);
  if (['ArrowLeft','a','A','q','Q'].includes(e.key)) keys.left = false;
  if (['ArrowRight','d','D'].includes(e.key)) keys.right = false;
  if (['ArrowUp','w','W',' ', 'Space'].includes(e.key) || e.code === 'Space') keys.up = false;
});

/* ====== Monde (plateformes rectangles) ====== */
// const platforms = [
//   // x, y, w, h (y croît vers le bas)
//   { x: -400, y: 500, w: 2000, h: 60 },   // sol principal
//   { x: 300, y: 420, w: 180, h: 20 },
//   { x: 600, y: 340, w: 160, h: 20 },
//   { x: 900, y: 260, w: 160, h: 20 },
//   { x: 1200, y: 420, w: 220, h: 20 }
// ];
const platforms = tilesToPlatforms(level);

/* ====== Joueur ====== */
const player = {
  x: 50,
  y: 300,
  w: 32,
  h: 48,
  vx: 0,
  vy: 0,
  onGround: false,
  color: '#2c3e50'
};

/* ====== Boucle de jeu ====== */
let last = performance.now();

function loop(now) {
  const dt = Math.min(1/30, (now - last) / 1000); // clamp dt pour stabilité
  last = now;

  update(dt);
  render();

  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

/* ====== Physique & Collisions ====== */
const SKIN = 0.0001;     // petite marge pour éviter les collages numériques
let coyoteTimer = 0;     // tolérance après avoir quitté le sol (en s)
const COYOTE_TIME = 0.1; // 100 ms

function update(dt) {
  // Contrôles horizontaux
  if (keys.left && !keys.right) {
    player.vx = -WORLD.moveSpeed;
  } else if (keys.right && !keys.left) {
    player.vx = WORLD.moveSpeed;
  } else {
    // friction quand aucune direction n'est tenue
    player.vx *= player.onGround ? WORLD.frictionGround : WORLD.frictionAir;
    if (Math.abs(player.vx) < 0.01) player.vx = 0;
  }

  // Coyote time (tolérance de saut après avoir quitté le sol)
  if (player.onGround) {
    coyoteTimer = COYOTE_TIME;
  } else {
    coyoteTimer = Math.max(0, coyoteTimer - dt);
  }

  // Saut : autoriser si au sol ou coyote timer > 0
  if (keys.up && coyoteTimer > 0) {
    player.vy = -WORLD.jumpSpeed;
    player.onGround = false;
    coyoteTimer = 0;
  }

  // Gravité
  player.vy += WORLD.gravity * dt;
  player.vy = Math.min(player.vy, WORLD.maxFall);

  // --- Intégration + collisions par axe ---

  // 1) Axe X
  player.x += player.vx * dt;
  resolveCollisionsAxisX(player, platforms);

  // 2) Axe Y
  player.onGround = false; // sera remis à true si on atterrit
  player.y += player.vy * dt;
  resolveCollisionsAxisY(player, platforms);

  // (Optionnel) Ground snapping léger pour éviter les micro-chutes sur 1–2 px
  if (!player.onGround && player.vy >= 0) {
    const snap = 2; // px
    const probe = { x: player.x, y: player.y + snap, w: player.w, h: player.h };
    for (const s of platforms) {
      if (aabbIntersect(probe, s)) {
        player.y = s.y - player.h - SKIN;
        player.vy = 0;
        player.onGround = true;
        break;
      }
    }
  }

  // Caméra suit le joueur
  const targetCamX = player.x + player.w/2 - camera.width/2;
  const targetCamY = player.y + player.h/2 - camera.height/2;
  camera.x += (targetCamX - camera.x) * camera.lerp;
  camera.y += (targetCamY - camera.y) * camera.lerp;
}

function resolveCollisionsAxisX(p, solids) {
  for (const s of solids) {
    if (aabbIntersect(p, s)) {
      if (p.vx > 0) {
        // heurter la face gauche du solide
        p.x = s.x - p.w - SKIN;
      } else if (p.vx < 0) {
        // heurter la face droite du solide
        p.x = s.x + s.w + SKIN;
      }
      p.vx = 0;
    }
  }
}

function resolveCollisionsAxisY(p, solids) {
  for (const s of solids) {
    if (aabbIntersect(p, s)) {
      if (p.vy > 0) {
        // on tombe sur le solide
        p.y = s.y - p.h - SKIN;
        p.vy = 0;
        p.onGround = true;
      } else if (p.vy < 0) {
        // on frappe le plafond
        p.y = s.y + s.h + SKIN;
        p.vy = 0;
      }
    }
  }
}

function aabbIntersect(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

/* ====== Rendu ====== */
function render() {
  // Fond
  ctx.clearRect(0, 0, CANVAS.width, CANVAS.height);
  drawGridBackground();

  // Convertir monde -> écran (caméra)
  ctx.save();
  ctx.translate(-camera.x, -camera.y);

  // Plateformes
  for (const s of platforms) {
    ctx.fillStyle = '#6c5ce7';
    ctx.fillRect(s.x, s.y, s.w, s.h);
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.strokeRect(s.x, s.y, s.w, s.h);
  }

  // Joueur
  ctx.fillStyle = player.color;
  ctx.fillRect(player.x, player.y, player.w, player.h);

  // Terminer le rendu monde
  ctx.restore();

  // HUD
  drawHUD();
}

function drawGridBackground() {
  const spacing = 64;
  ctx.fillStyle = '#87CEEB'; // ciel
  ctx.fillRect(0, 0, CANVAS.width, CANVAS.height);
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= CANVAS.width; x += spacing) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, CANVAS.height);
    ctx.stroke();
  }
  for (let y = 0; y <= CANVAS.height; y += spacing) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(CANVAS.width, y);
    ctx.stroke();
  }
}

function drawHUD() {
  ctx.fillStyle = '#fff';
  ctx.font = '14px system-ui';
  ctx.fillText('← → pour se déplacer, ↑ ou espace pour sauter', 16, 24);

  // Infos debug (optionnelles)
  const info = `x:${player.x.toFixed(1)} y:${player.y.toFixed(1)}  vx:${player.vx.toFixed(1)} vy:${player.vy.toFixed(1)}  ground:${player.onGround ? 'oui' : 'non'}`;
  ctx.fillText(info, 16, 44);
}

