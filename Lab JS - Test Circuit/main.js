
/* ==========================================
   Racer — Top-down arcade avec drift & IA
   Vanilla JS — main.js
   ========================================== */

/* ---------- Options de jeu ---------- */
const MODE = 'ai'; // 'ai' (J1 vs IA) ou 'pvp' (J1 vs J2)
const TILE = 32;   // taille d'une tuile en pixels
const CANVAS = document.getElementById('game');
const ctx = CANVAS.getContext('2d');
document.getElementById('mode').textContent = MODE.toUpperCase();

const WORLD = {
  maxSpeed: 440,        // vitesse max (px/s)
  accel: 900,           // accélération longitudinale (px/s^2)
  brake: 1400,          // frein
  reverseAccel: 600,    // marche arrière
  turnRate: 2.6,        // vitesse de rotation (rad/s) à vitesse nominale
  driftGrip: 9.5,       // friction latérale base sur asphalte (plus => moins de glisse)
  longGrip: 6.0,        // friction longitudinale (freinage naturel)
  grassMul: 0.55,       // multiplicateur de grip sur herbe (moins d'adhérence)
  grassDrag: 0.70,      // drag multiplicatif sur herbe (ralentit)
  wallBounce: 0.45,     // restitution lors d'un choc mur
  skidThreshold: 120,   // vitesse latérale locale pour tracer des marques
  camLerp: 0.14,        // douceur du suivi caméra
  lapsToWin: 3
};

/* ---------- Entrées ---------- */
const keys = {
  // J1: flèches
  left: false, right: false, up: false, down: false,
  // J2: WASD
  a: false, d: false, w: false, s: false,
  pause: false
};

window.addEventListener('keydown', (e) => {
  if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' '].includes(e.key)) e.preventDefault();
  if (e.key === 'ArrowLeft')  keys.left = true;
  if (e.key === 'ArrowRight') keys.right = true;
  if (e.key === 'ArrowUp')    keys.up = true;
  if (e.key === 'ArrowDown')  keys.down = true;

  if (e.key.toLowerCase() === 'a') keys.a = true;
  if (e.key.toLowerCase() === 'd') keys.d = true;
  if (e.key.toLowerCase() === 'w') keys.w = true;
  if (e.key.toLowerCase() === 's') keys.s = true;

  if (e.key.toLowerCase() === 'p') keys.pause = !keys.pause;
});

window.addEventListener('keyup', (e) => {
  if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' '].includes(e.key)) e.preventDefault();
  if (e.key === 'ArrowLeft')  keys.left = false;
  if (e.key === 'ArrowRight') keys.right = false;
  if (e.key === 'ArrowUp')    keys.up = false;
  if (e.key === 'ArrowDown')  keys.down = false;

  if (e.key.toLowerCase() === 'a') keys.a = false;
  if (e.key.toLowerCase() === 'd') keys.d = false;
  if (e.key.toLowerCase() === 'w') keys.w = false;
  if (e.key.toLowerCase() === 's') keys.s = false;
});

/* ---------- Tilemap du circuit ---------- */
/* Légende:
   . = hors-piste (herbe)
   = = piste (asphalte)
   # = mur/barrière
   S = ligne de départ
   O = waypoint IA (centre de piste)
*/
const level = [
  "########################################",
  "#......................................#",
  "#.............======...................#",
  "#.............=....=...................#",
  "#.............=....=...................#",
  "#.........S..==....=.....OOOOOO........#",
  "#.........=..=.....=....O......O.......#",
  "#.........=..=.....=...O........O......#",
  "#.........=..=.....=...O........O......#",
  "#.........=..=.....=....O......O.......#",
  "#.........=..==.====.....OOOOOO........#",
  "#.........=....=.......................#",
  "#.........=....=.......................#",
  "#.........======.......................#",
  "#......................................#",
  "#......................................#",
  "#..................OOOOO...............#",
  "#.................O.....O..............#",
  "#................O.......O.............#",
  "#.................O.....O..............#",
  "#..................OOOOO...............#",
  "#......................................#",
  "########################################"
];
// Dimensions monde
const MAP_W = level[0].length * TILE;
const MAP_H = level.length * TILE;

/* ---------- Surfaces & style ---------- */
const COLORS = {
  grass: '#3a5f0b',
  track: '#5f5f5f',
  line: '#f0f0f0',
  wall: '#333',
  waypoint: 'rgba(255, 200, 0, 0.25)',
  skid: 'rgba(10,10,10,0.22)'
};

function tileAt(x, y) {
  const tx = Math.floor(x / TILE);
  const ty = Math.floor(y / TILE);
  if (tx < 0 || ty < 0 || ty >= level.length || tx >= level[0].length) return '#'; // hors limites = mur
  return level[ty][tx];
}

function isWall(x, y) {
  const t = tileAt(x, y);
  return t === '#';
}
function isTrack(x, y) {
  const t = tileAt(x, y);
  return t === '=' || t === 'S' || t === 'O';
}
function isGrass(x, y) {
  const t = tileAt(x, y);
  return t === '.';
}

/* ---------- Waypoints pour IA ---------- */
const waypoints = [];
for (let ty = 0; ty < level.length; ty++) {
  for (let tx = 0; tx < level[ty].length; tx++) {
    if (level[ty][tx] === 'O') {
      waypoints.push({ x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE });
    }
  }
}
// tri grossier pour une trajectoire bouclée (par angle autour du centre)
if (waypoints.length > 3) {
  const cx = waypoints.reduce((s, p) => s + p.x, 0) / waypoints.length;
  const cy = waypoints.reduce((s, p) => s + p.y, 0) / waypoints.length;
  waypoints.sort((a, b) => Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx));
}

/* ---------- Car / IA ---------- */
class Car {
  constructor(x, y, angle, color) {
    this.x = x; this.y = y; this.angle = angle;
    this.vx = 0; this.vy = 0; // vitesse globale
    this.w = 20; this.h = 36; // gabarit visuel
    this.radius = Math.hypot(this.w, this.h) * 0.42; // rayon collision approx
    this.color = color;
    this.lap = 0;
    this.lastOnStart = false;
    this.checkpointsPassed = 0;
    this.skidMarks = []; // buffer de traces
  }

  update(dt, input) {
    // Transforme vitesse en repère local voiture
    const cos = Math.cos(this.angle), sin = Math.sin(this.angle);
    const localForward =  cos * this.vx + sin * this.vy; // composante avant
    const localLateral = -sin * this.vx + cos * this.vy; // composante latérale (drift)

    // Entrées
    const steer = input.steer;      // -1..1
    const throttle = input.throttle;// 0..1
    const brake = input.brake;      // 0..1
    const reversing = input.reverse;// 0..1

    // Tourner proportionnellement à la vitesse (moins d'effet à très basse vitesse)
    const speed = Math.hypot(this.vx, this.vy);
    const turnGain = WORLD.turnRate * (Math.min(speed, 240) / 240);
    this.angle += steer * turnGain * dt;

    // Forces moteur (longitudinales)
    let longForce = 0;
    longForce += throttle * WORLD.accel;
    longForce -= brake * WORLD.brake * Math.sign(localForward);
    longForce -= reversing * WORLD.reverseAccel;

    // Surface
    const onTrack = isTrack(this.x, this.y);
    const gripMul = onTrack ? 1.0 : WORLD.grassMul;
    const dragMul = onTrack ? 1.0 : WORLD.grassDrag;

    // Frictions (modèle simplifié — plus petit -> plus de glisse)
    const longFric = WORLD.longGrip * dragMul;
    const latFric  = WORLD.driftGrip * gripMul;

    // Applique les forces/frictions en repère local
    let newLocalForward = localForward + (longForce - longFric * localForward) * dt;
    let newLocalLateral = localLateral + (-latFric * localLateral) * dt;

    // Limiter la vitesse max en avant
    const forwardSign = Math.sign(newLocalForward);
    newLocalForward = Math.min(Math.abs(newLocalForward), WORLD.maxSpeed) * forwardSign;

    // Reconstruire vx, vy (repère global)
    this.vx =  cos * newLocalForward - sin * newLocalLateral;
    this.vy =  sin * newLocalForward + cos * newLocalLateral;

    // Intégration
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Collisions avec murs (circle vs AABB tile)
    this.resolveWalls();

    // Skid marks (traces si glisse latérale importante)
    const latSpeed = Math.abs(newLocalLateral);
    if (latSpeed > WORLD.skidThreshold && onTrack) {
      this.skidMarks.push({ x: this.x, y: this.y, life: 2.4 });
      if (this.skidMarks.length > 400) this.skidMarks.shift();
    }
    // Vieillissement traces
    for (const m of this.skidMarks) m.life -= dt;
    while (this.skidMarks[0] && this.skidMarks[0].life <= 0) this.skidMarks.shift();

    // Tours (passage sur S avec direction grosso modo avant)
    const onStart = tileAt(this.x, this.y) === 'S';
    if (onStart && !this.lastOnStart && speed > 50) {
      this.lap += 1;
    }
    this.lastOnStart = onStart;
  }

  resolveWalls() {
    // Inspecter tuile autour du centre
    const minTx = Math.floor((this.x - this.radius) / TILE);
    const maxTx = Math.floor((this.x + this.radius) / TILE);
    const minTy = Math.floor((this.y - this.radius) / TILE);
    const maxTy = Math.floor((this.y + this.radius) / TILE);

    for (let ty = minTy; ty <= maxTy; ty++) {
      for (let tx = minTx; tx <= maxTx; tx++) {
        if (tx < 0 || ty < 0 || ty >= level.length || tx >= level[0].length) continue;
        if (level[ty][tx] !== '#') continue;

        // collision cercle vs rectangle
        const rx = tx * TILE, ry = ty * TILE, rw = TILE, rh = TILE;
        const closestX = clamp(this.x, rx, rx + rw);
        const closestY = clamp(this.y, ry, ry + rh);
        const dx = this.x - closestX, dy = this.y - closestY;
        const dist2 = dx*dx + dy*dy;

        if (dist2 < this.radius * this.radius) {
          const dist = Math.max(Math.sqrt(dist2), 0.0001);
          const nx = dx / dist, ny = dy / dist; // normale
          const penetration = this.radius - dist;

          // repousser
          this.x += nx * penetration;
          this.y += ny * penetration;

          // réfléchir la vitesse (rebond atténué)
          const vDotN = this.vx * nx + this.vy * ny;
          this.vx -= (1 + WORLD.wallBounce) * vDotN * nx;
          this.vy -= (1 + WORLD.wallBounce) * vDotN * ny;
        }
      }
    }
  }

  render(ctx) {
    // Traces
    ctx.fillStyle = COLORS.skid;
    for (const m of this.skidMarks) {
      const alpha = Math.max(m.life / 2.4, 0);
      ctx.globalAlpha = alpha;
      ctx.fillRect(m.x - 2, m.y - 2, 4, 4);
    }
    ctx.globalAlpha = 1;

    // Carrosserie
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    // Ombre
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    roundedRect(ctx, -this.w/2 + 2, -this.h/2 + 2, this.w, this.h, 6);
    ctx.fill();
    // Corps
    ctx.fillStyle = this.color;
    roundedRect(ctx, -this.w/2, -this.h/2, this.w, this.h, 6);
    ctx.fill();
    // Vitres
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    roundedRect(ctx, -this.w/2 + 4, -this.h/2 + 4, this.w - 8, this.h/2, 6);
    ctx.fill();
    // Lignes décoratives
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -this.h/2 + 3);
    ctx.lineTo(0, this.h/2 - 3);
    ctx.stroke();

    ctx.restore();
  }
}

class AIController {
  constructor(car, waypoints) {
    this.car = car;
    this.wps = waypoints;
    this.idx = 0;
  }

  update(dt) {
    if (this.wps.length === 0) return { steer: 0, throttle: 0.6, brake: 0, reverse: 0 };

    const target = this.wps[this.idx];
    const dx = target.x - this.car.x;
    const dy = target.y - this.car.y;
    const desired = Math.atan2(dy, dx);
    let diff = normalizeAngle(desired - this.car.angle);

    // Avance l'index si proche
    const dist = Math.hypot(dx, dy);
    const lookAhead = clamp(Math.hypot(this.car.vx, this.car.vy) * 0.15 + 40, 40, 160);
    if (dist < lookAhead) {
      this.idx = (this.idx + 1) % this.wps.length;
    }

    // Steering : suivre diff d'angle
    const steer = clamp(diff * 1.6, -1, 1);

    // Vitesse cible selon courbure (plus diff grand -> plus lent)
    const curvature = Math.abs(diff);
    const targetSpeed = clamp(WORLD.maxSpeed * (1.0 - curvature * 0.35), 160, WORLD.maxSpeed);

    const speed = Math.hypot(this.car.vx, this.car.vy);
    let throttle = speed < targetSpeed ? 1.0 : 0.2;
    let brake = speed > targetSpeed + 40 ? 0.6 : 0.0;

    // Ralentir hors piste
    if (isGrass(this.car.x, this.car.y)) {
      throttle *= 0.65;
      brake = Math.max(brake, 0.15);
    }

    return { steer, throttle, brake, reverse: 0 };
  }
}

/* ---------- Utilitaires ---------- */
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function normalizeAngle(a) {
  while (a > Math.PI) a -= 2*Math.PI;
  while (a < -Math.PI) a += 2*Math.PI;
  return a;
}
function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/* ---------- Rendu du circuit ---------- */
function renderTrack(ctx) {
  // fond herbe
  ctx.fillStyle = COLORS.grass;
  ctx.fillRect(0, 0, MAP_W, MAP_H);

  for (let ty = 0; ty < level.length; ty++) {
    for (let tx = 0; tx < level[ty].length; tx++) {
      const t = level[ty][tx];
      const x = tx * TILE, y = ty * TILE;

      if (t === '=' || t === 'S' || t === 'O') {
        ctx.fillStyle = COLORS.track;
        ctx.fillRect(x, y, TILE, TILE);
      }
      if (t === '#') {
        ctx.fillStyle = COLORS.wall;
        ctx.fillRect(x, y, TILE, TILE);
        ctx.strokeStyle = 'rgba(255,255,255,0.05)';
        ctx.strokeRect(x+0.5, y+0.5, TILE-1, TILE-1);
      }
      // ligne de départ
      if (t === 'S') {
        ctx.fillStyle = COLORS.line;
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = COLORS.track;
        ctx.fillRect(x, y, TILE, TILE/2);
      }
      // waypoints (debug)
      if (t === 'O') {
        ctx.fillStyle = COLORS.waypoint;
        ctx.fillRect(x, y, TILE, TILE);
      }
    }
  }
}

/* ---------- Caméra ---------- */
const camera = { x: 0, y: 0, w: CANVAS.width, h: CANVAS.height };
function updateCamera(dt, targets) {
  // cible: moyenne des cibles (pour pvp), sinon joueur 1
  let cx = 0, cy = 0;
  for (const t of targets) { cx += t.x; cy += t.y; }
  cx /= targets.length; cy /= targets.length;

  const targetX = clamp(cx - camera.w/2, 0, MAP_W - camera.w);
  const targetY = clamp(cy - camera.h/2, 0, MAP_H - camera.h);
  camera.x += (targetX - camera.x) * WORLD.camLerp;
  camera.y += (targetY - camera.y) * WORLD.camLerp;
}

/* ---------- Initialisation ---------- */
const startTile = (() => {
  for (let ty = 0; ty < level.length; ty++) {
    for (let tx = 0; tx < level[ty].length; tx++) {
      if (level[ty][tx] === 'S') return { x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE };
    }
  }
  return { x: TILE*2, y: TILE*2 };
})();

const player1 = new Car(startTile.x - 40, startTile.y, 0, '#1abc9c');
let opponent;
let controllerAI;

if (MODE === 'ai') {
  opponent = new Car(startTile.x + 40, startTile.y, 0, '#e74c3c');
  controllerAI = new AIController(opponent, waypoints);
} else {
  opponent = new Car(startTile.x + 40, startTile.y, 0, '#f39c12'); // joueur 2
}

/* ---------- Boucle ---------- */
let last = performance.now();
function loop(now) {
  const dt = Math.min(1/30, (now - last) / 1000);
  last = now;

  if (!keys.pause) {
    update(dt);
  }
  render();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

/* ---------- Update ---------- */
function update(dt) {
  // Entrées J1
  const input1 = {
    steer: (keys.left ? -1 : 0) + (keys.right ? 1 : 0),
    throttle: keys.up ? 1 : 0,
    brake: keys.down ? 1 : 0,
    reverse: keys.down ? 0.2 : 0
  };
  player1.update(dt, input1);

  // Opposant
  if (MODE === 'ai') {
    const aiInput = controllerAI.update(dt);
    opponent.update(dt, aiInput);
  } else {
    // J2 — WASD
    const input2 = {
      steer: (keys.a ? -1 : 0) + (keys.d ? 1 : 0),
      throttle: keys.w ? 1 : 0,
      brake: keys.s ? 1 : 0,
      reverse: keys.s ? 0.2 : 0
    };
    opponent.update(dt, input2);
  }

  // Caméra
  const targets = MODE === 'pvp' ? [player1, opponent] : [player1];
  updateCamera(dt, targets);

  // Fin de course ?
  if (player1.lap >= WORLD.lapsToWin || opponent.lap >= WORLD.lapsToWin) {
    keys.pause = true;
  }
}

/* ---------- Render ---------- */
function render() {
  // Fond
  ctx.clearRect(0, 0, CANVAS.width, CANVAS.height);

  // Monde
  ctx.save();
  ctx.translate(-camera.x, -camera.y);

  renderTrack(ctx);

  // Traces de pneu d’abord (déjà gérées dans render car)
  player1.render(ctx);
  opponent.render(ctx);

  // HUD en monde
  renderHUDWorld();

  ctx.restore();

  // HUD écran
  renderHUDScreen();
}

function renderHUDWorld() {
  // fantôme ligne d'arrivée
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.strokeRect(startTile.x - TILE/2, startTile.y - TILE/2, TILE, TILE);
}

function renderHUDScreen() {
  ctx.fillStyle = '#fff';
  ctx.font = '14px system-ui';
  const lapText = `Tours: J1 ${player1.lap}/${WORLD.lapsToWin} — ${MODE === 'ai' ? 'IA' : 'J2'} ${opponent.lap}/${WORLD.lapsToWin}`;
  ctx.fillText(lapText, 16, CANVAS.height - 24);
  if (keys.pause) {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, CANVAS.width, CANVAS.height);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 24px system-ui';
    ctx.fillText('PAUSE / COURSE TERMINÉE', CANVAS.width/2 - 160, CANVAS.height/2);
    ctx.font = '16px system-ui';
    ctx.fillText('Appuie sur P pour reprendre', CANVAS.width/2 - 120, CANVAS.height/2 + 28);
  }
}
