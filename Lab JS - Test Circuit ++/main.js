
/* ==========================================================
   Racer Advanced — Corrigé (drift, IA, split, nitro, minimap)
   ========================================================== */

/* ---------- Options ---------- */
const MODE = 'ai'; // 'ai' (J1 vs IA) ou 'pvp' (J1 vs J2)
document.getElementById('mode').textContent = MODE.toUpperCase();

const CANVAS = document.getElementById('game');
const ctx = CANVAS.getContext('2d');

const TILE = 32;
const WORLD = {
  maxSpeed: 520,        // px/s
  accel: 1150,          // px/s^2
  brake: 1700,
  reverseAccel: 750,
  turnRate: 3.2,        // rad/s @ speed nominal
  driftGrip: 12.0,      // ++ grip latéral => moins de glisse latérale indésirable
  longGrip: 7.2,
  grassMul: 0.55,
  grassDrag: 0.70,
  wallBounce: 0.40,
  skidThreshold: 160,   // traces quand latSpeed dépasse ce seuil
  camLerp: 0.13,
  lapsToWin: 3,
  countdown: 3.0,
  nitro: {
    capacity: 100,
    drainPerSec: 50,
    regenPerSec: 12,
    accelMul: 1.35,
    maxSpeedMul: 1.25,
    driftMul: 0.92,     // réduit légèrement le grip latéral pendant nitro
    shake: 2.5
  }
};

const COLORS = {
  grass: '#294b0e',
  track: '#5e5e5e',
  line: '#eaeaea',
  wall: '#2b2b2b',
  barrier: '#444',            // glissières internes
  waypoint: 'rgba(255, 200, 0, 0.15)',
  checkpoint: 'rgba(0, 180, 255, 0.12)',
  skid: 'rgba(8,8,8,0.22)',
  smoke: 'rgba(210,210,210,0.85)'
};

/* ---------- Entrées ---------- */
const keys = {
  // J1 + nitro
  left: false, right: false, up: false, down: false, nitro1: false,
  // J2 + nitro
  a: false, d: false, w: false, s: false, nitro2: false,
  pause: false
};

window.addEventListener('keydown', (e) => {
  if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' ','Shift','p','P','r','R','e','E'].includes(e.key)) e.preventDefault();

  // J1
  if (e.key === 'ArrowLeft')  keys.left = true;
  if (e.key === 'ArrowRight') keys.right = true;
  if (e.key === 'ArrowUp')    keys.up = true;
  if (e.key === 'ArrowDown')  keys.down = true;
  if (e.key.toLowerCase() === 'shift' || e.code === 'ShiftLeft') keys.nitro1 = true;

  // J2
  const k = e.key.toLowerCase();
  if (k === 'a') keys.a = true;
  if (k === 'd') keys.d = true;
  if (k === 'w') keys.w = true;
  if (k === 's') keys.s = true;
  if (k === 'e') keys.nitro2 = true;

  if (k === 'p') keys.pause = !keys.pause;
  if (k === 'r') resetRace();
});

window.addEventListener('keyup', (e) => {
  if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' ','Shift','e','E'].includes(e.key)) e.preventDefault();

  // J1
  if (e.key === 'ArrowLeft')  keys.left = false;
  if (e.key === 'ArrowRight') keys.right = false;
  if (e.key === 'ArrowUp')    keys.up = false;
  if (e.key === 'ArrowDown')  keys.down = false;
  if (e.key.toLowerCase() === 'shift' || e.code === 'ShiftLeft') keys.nitro1 = false;

  // J2
  const k = e.key.toLowerCase();
  if (k === 'a') keys.a = false;
  if (k === 'd') keys.d = false;
  if (k === 'w') keys.w = false;
  if (k === 's') keys.s = false;
  if (k === 'e') keys.nitro2 = false;
});

/* ---------- Tilemap (large circuit) ---------- */
/*
  Légende:
   . = herbe
   = = piste (asphalte, large)
   # = mur/enceinte
   S = ligne de départ
   O = waypoint IA
   C = checkpoint
  La piste fait ~6 tuiles de large (≈ 192 px).
*/
const level = [
  "############################################################################################################",
  "############################################################################################################",
  "##........................................................................................................##",
  "##........................................................................................................##",
  "##.................##############################..........................................................##",
  "##.................#============================#..........................................................##",
  "##.................#============================#..........................................................##",
  "##.................#============================#.............OOOOOOOOOOOOOOOOOO...........................##",
  "##.................#============================#............O........................O....................##",
  "##.................#============================#...........O..........................O...................##",
  "##.................#============================#...........O..........................O...................##",
  "##.................#============================#............O........................O....................##",
  "##.................#============================#.............OOOOOOOOOOOOOOOOOO...........................##",
  "##.................#============================#................................................................",
  "##.................#============================#................................................................",
  "##.................#============================#................................................................",
  "##.................#============================#................................................................",
  "##.................#============================#................................................................",
  "##.................#============================#................................................................",
  "##.................#============================#................................................................",
  "##.................##############################................................................................",
  "##........................................................................................................##",
  "##........................................................................................................##",
  "##........................................................................................................##",
  "##.............................................##############################.............................##",
  "##.............................................#============================#.............................##",
  "##.............................................#============================#.............................##",
  "##.............................................#============================#.............................##",
  "##.............................................#============================#.............................##",
  "##.............................................#============================#.............................##",
  "##.............................................#============================#.............................##",
  "##.............................................##############################.............................##",
  "##........................................................................................................##",
  "##........................................................................................................##",
  "##........................................................................................................##",
  "##..............................CCCCCCCCCCCC..............................................................##",
  "##..............................C============C.............................................................##",
  "##..............................C=====S======C........OOOOOOOO........OOOOOOOO............................##",
  "##..............................C============C.......O..........O....O..........O..........................##",
  "##..............................CCCCCCCCCCCC........O..........O....O..........O..........................##",
  "##..................................................O..........O....O..........O..........................##",
  "##...................................................OOOOOOOOOO......OOOOOOOOOO...........................##",
  "##........................................................................................................##",
  "##........................................................................................................##",
  "############################################################################################################",
  "############################################################################################################"
];

// Dimensions monde
const MAP_W = level[0].length * TILE;
const MAP_H = level.length * TILE;

/* ---------- Tiles utils ---------- */
function tileAt(x, y) {
  const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
  if (tx < 0 || ty < 0 || ty >= level.length || tx >= level[0].length) return '#'; // hors map = mur
  return level[ty][tx];
}
function isWall(x, y) { return tileAt(x, y) === '#'; }
function isTrack(x, y) {
  const t = tileAt(x, y);
  return t === '=' || t === 'S' || t === 'O' || t === 'C';
}
function isGrass(x, y) { return tileAt(x, y) === '.'; }

/* ---------- Waypoints ---------- */
const waypoints = [];
for (let ty = 0; ty < level.length; ty++) {
  for (let tx = 0; tx < level[ty].length; tx++) {
    if (level[ty][tx] === 'O') {
      waypoints.push({ x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE });
    }
  }
}
if (waypoints.length > 3) {
  const cx = waypoints.reduce((s, p) => s + p.x, 0) / waypoints.length;
  const cy = waypoints.reduce((s, p) => s + p.y, 0) / waypoints.length;
  waypoints.sort((a, b) => Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx));
}

/* ---------- Checkpoints (zones 'C' contiguës) ---------- */
function parseCheckpoints() {
  const visited = new Set();
  const zones = [];
  const H = level.length, W = level[0].length;
  const idx = (x,y) => y * W + x;

  for (let y=0; y<H; y++) for (let x=0; x<W; x++) {
    if (level[y][x] !== 'C' || visited.has(idx(x,y))) continue;
    let minx=x, maxx=x, miny=y, maxy=y;
    const q=[{x,y}]; visited.add(idx(x,y));
    while (q.length) {
      const {x:cx,y:cy}=q.shift();
      minx=Math.min(minx,cx); maxx=Math.max(maxx,cx);
      miny=Math.min(miny,cy); maxy=Math.max(maxy,cy);
      for (const [nx,ny] of [[cx+1,cy],[cx-1,cy],[cx,cy+1],[cx,cy-1]]) {
        if (nx<0||ny<0||nx>=W||ny>=H) continue;
        const id=idx(nx,ny);
        if (visited.has(id)) continue;
        if (level[ny][nx]==='C') { visited.add(id); q.push({x:nx,y:ny}); }
      }
    }
    zones.push({
      x: minx*TILE, y: miny*TILE,
      w: (maxx-minx+1)*TILE, h: (maxy-miny+1)*TILE,
      cx: ((minx+maxx+1)/2)*TILE, cy: ((miny+maxy+1)/2)*TILE
    });
  }

  // Ordonner proche de la ligne de course
  if (waypoints.length) {
    zones.forEach(z => {
      let best=0, bd=Infinity;
      for (let i=0;i<waypoints.length;i++) {
        const dx=z.cx-waypoints[i].x, dy=z.cy-waypoints[i].y, d=dx*dx+dy*dy;
        if (d<bd) { bd=d; best=i; }
      }
      z.wpi=best;
    });
    zones.sort((a,b)=>a.wpi-b.wpi);
  }
  return zones;
}
const checkpoints = parseCheckpoints();

/* ---------- Pré-rendu du circuit ---------- */
const trackCanvas = document.createElement('canvas');
trackCanvas.width = MAP_W;
trackCanvas.height = MAP_H;
const tctx = trackCanvas.getContext('2d');

function renderTrackOnce() {
  // Herbe
  tctx.fillStyle = COLORS.grass;
  tctx.fillRect(0, 0, MAP_W, MAP_H);

  for (let ty = 0; ty < level.length; ty++) {
    for (let tx = 0; tx < level[ty].length; tx++) {
      const t = level[ty][tx];
      const x = tx*TILE, y = ty*TILE;

      if (t === '=' || t === 'S' || t === 'O' || t === 'C') {
        tctx.fillStyle = COLORS.track;
        tctx.fillRect(x, y, TILE, TILE);
      }
      if (t === '#') {
        tctx.fillStyle = COLORS.wall;
        tctx.fillRect(x, y, TILE, TILE);
      }
      if (t === 'S') {
        tctx.fillStyle = COLORS.line;
        tctx.fillRect(x, y, TILE, TILE);
        tctx.fillStyle = COLORS.track;
        tctx.fillRect(x, y, TILE, TILE/2);
      }
    }
  }

  // Checkpoints & waypoints overlay léger
  for (const z of checkpoints) {
    tctx.fillStyle = COLORS.checkpoint;
    tctx.fillRect(z.x, z.y, z.w, z.h);
  }
  for (const wp of waypoints) {
    tctx.fillStyle = COLORS.waypoint;
    tctx.fillRect(wp.x - TILE/2, wp.y - TILE/2, TILE, TILE);
  }
}
renderTrackOnce();

/* ---------- Utilitaires ---------- */
function clamp(v,a,b){ return Math.max(a,Math.min(b,v)); }
function normalizeAngle(a){
  while(a>Math.PI)a-=2*Math.PI;
  while(a<-Math.PI)a+=2*Math.PI;
  return a;
}
function roundedRect(ctx,x,y,w,h,r){
  ctx.beginPath();
  ctx.moveTo(x+r,y);
  ctx.arcTo(x+w,y,x+w,y+h,r);
  ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r);
  ctx.arcTo(x,y,x+w,y,r);
  ctx.closePath();
}

/* ---------- Particules ---------- */
class Particle {
  constructor(x,y,vx,vy,life,size,color){ this.x=x; this.y=y; this.vx=vx; this.vy=vy; this.life=life; this.size=size; this.color=color; }
  update(dt){ this.x+=this.vx*dt; this.y+=this.vy*dt; this.life-=dt; }
  render(ctx){
    if(this.life<=0)return;
    ctx.globalAlpha=Math.max(this.life,0)/1.0;
    ctx.fillStyle=this.color;
    ctx.beginPath();
    ctx.arc(this.x,this.y,this.size,0,Math.PI*2);
    ctx.fill();
    ctx.globalAlpha=1;
  }
}
const particles = [];

/* ---------- Voiture ---------- */
class Car {
  constructor(x,y,angle,color,name){
    this.x=x; this.y=y; this.angle=angle;
    this.vx=0; this.vy=0;
    this.w=18; this.h=32;             // gabarit ajusté (plus fin)
    this.radius=Math.hypot(this.w,this.h)*0.42;
    this.color=color; this.name=name;
    this.lap=0; this.lastOnStart=false; this.checkpointIndex=0;
    this.skidMarks=[]; this.nitro=WORLD.nitro.capacity; this.nitroActive=false;
    this.bestLap=Infinity; this.currentLapTime=0;
  }
  speed(){ return Math.hypot(this.vx,this.vy); }

  update(dt,input){
    this.currentLapTime += dt;

    const cos=Math.cos(this.angle), sin=Math.sin(this.angle);
    const localForward =  cos*this.vx + sin*this.vy;
    const localLateral = -sin*this.vx + cos*this.vy;

    const steer=input.steer, throttle=input.throttle, brake=input.brake, reversing=input.reverse;
    const wantNitro=input.nitro && this.nitro>0;

    // Nitro
    if(wantNitro){ this.nitroActive=true; this.nitro=Math.max(0,this.nitro-WORLD.nitro.drainPerSec*dt); }
    else { this.nitroActive=false; this.nitro=Math.min(WORLD.nitro.capacity,this.nitro+WORLD.nitro.regenPerSec*dt); }

    // Rotation (un peu de rotation même à basse vitesse pour éviter l'impression de glisse latérale)
    const speed=this.speed();
    const turnGain = WORLD.turnRate * (Math.min(speed+60, 240) / 240);
    this.angle += steer * turnGain * dt;

    // Forces longit.
    let longForce=0;
    const accelMul=this.nitroActive?WORLD.nitro.accelMul:1.0;
    longForce += throttle * WORLD.accel * accelMul;
    longForce -= brake * WORLD.brake * Math.sign(localForward);
    longForce -= reversing * WORLD.reverseAccel;

    // Surface
    const onTrack = isTrack(this.x,this.y);
    const gripMul = onTrack ? 1.0 : WORLD.grassMul;
    const dragMul = onTrack ? 1.0 : WORLD.grassDrag;

    // Frictions
    let longFric=WORLD.longGrip*dragMul;
    let latFric=WORLD.driftGrip*gripMul;
    if(this.nitroActive) latFric *= WORLD.nitro.driftMul;

    // Appliquer (repère local)
    let newLocalForward = localForward + (longForce - longFric*localForward)*dt;
    let newLocalLateral = localLateral + (-latFric*localLateral)*dt;

    // Limiter vmax
    const forwardSign=Math.sign(newLocalForward);
    const vmax = WORLD.maxSpeed * (this.nitroActive?WORLD.nitro.maxSpeedMul:1.0);
    newLocalForward = Math.min(Math.abs(newLocalForward), vmax) * forwardSign;

    // Revenir global
    this.vx =  cos*newLocalForward - sin*newLocalLateral;
    this.vy =  sin*newLocalForward + cos*newLocalLateral;

    // Intégration
    this.x += this.vx*dt;
    this.y += this.vy*dt;

    // Collisions murs
    this.resolveWalls();

    // Particules/Traces
    const latSpeed=Math.abs(newLocalLateral);
    const heavyBrake=brake>0.7 && speed>80;
    if((latSpeed>WORLD.skidThreshold && onTrack) || heavyBrake){
      const px=this.x - cos*(this.h/2), py=this.y - sin*(this.h/2);
      for(let i=0;i<3;i++){
        const jig=(Math.random()-0.5)*10;
        particles.push(new Particle(px+jig,py+jig,(Math.random()-0.5)*40,(Math.random()-0.5)*40,0.6,Math.random()*2+1.5,COLORS.smoke));
      }
      this.skidMarks.push({x:this.x,y:this.y,life:2.0});
      if(this.skidMarks.length>600) this.skidMarks.shift();
    }
    for(const m of this.skidMarks) m.life -= dt;
    while(this.skidMarks[0] && this.skidMarks[0].life<=0) this.skidMarks.shift();

    // Effet nitro
    if(this.nitroActive){
      const px=this.x - cos*(this.h/2+6), py=this.y - sin*(this.h/2+6);
      particles.push(new Particle(px,py,-cos*120+(Math.random()-0.5)*40,-sin*120+(Math.random()-0.5)*40,0.35,2.2,'rgba(80,200,255,0.9)'));
    }

    // Checkpoints & tours
    this.updateCheckpointsAndLaps(speed);
  }

  updateCheckpointsAndLaps(speed){
    const onStart = tileAt(this.x,this.y)==='S';
    if(checkpoints.length){
      const idx=this.checkpointIndex%checkpoints.length;
      const z=checkpoints[idx];
      if(this.x>z.x && this.x<z.x+z.w && this.y>z.y && this.y<z.y+z.h){
        this.checkpointIndex++;
      }
    }
    if(onStart && !this.lastOnStart && speed>50){
      const needed = checkpoints.length>0?checkpoints.length:1;
      if(this.checkpointIndex>=needed){
        this.lap+=1;
        if(this.currentLapTime<this.bestLap) this.bestLap=this.currentLapTime;
        this.currentLapTime=0;
        this.checkpointIndex=0;
      }
    }
    this.lastOnStart = onStart;
  }

  resolveWalls(){
    const minTx=Math.floor((this.x - this.radius)/TILE);
    const maxTx=Math.floor((this.x + this.radius)/TILE);
    const minTy=Math.floor((this.y - this.radius)/TILE);
    const maxTy=Math.floor((this.y + this.radius)/TILE);

    for(let ty=minTy; ty<=maxTy; ty++){
      for(let tx=minTx; tx<=maxTx; tx++){
        if(tx<0||ty<0||ty>=level.length||tx>=level[0].length) continue;
        const t=level[ty][tx];
        if(t!=='#') continue; // collision seulement avec murs

        const rx=tx*TILE, ry=ty*TILE, rw=TILE, rh=TILE;
        const closestX=clamp(this.x, rx, rx+rw);
        const closestY=clamp(this.y, ry, ry+rh);
        const dx=this.x-closestX, dy=this.y-closestY;
        const dist2=dx*dx+dy*dy;

        if(dist2 < this.radius*this.radius){
          const dist=Math.max(Math.sqrt(dist2),0.0001);
          const nx=dx/dist, ny=dy/dist;
          const penetration=this.radius - dist;

          this.x += nx*penetration;
          this.y += ny*penetration;

          const vDotN=this.vx*nx + this.vy*ny;
          this.vx -= (1+WORLD.wallBounce)*vDotN*nx;
          this.vy -= (1+WORLD.wallBounce)*vDotN*ny;
        }
      }
    }
  }

  render(ctx){
    // traces
    ctx.fillStyle=COLORS.skid;
    for(const m of this.skidMarks){
      const alpha=Math.max(m.life/2.0,0);
      ctx.globalAlpha=alpha;
      ctx.fillRect(m.x-2,m.y-2,4,4);
    }
    ctx.globalAlpha=1;

    // carrosserie
    ctx.save();
    ctx.translate(this.x,this.y);
    ctx.rotate(this.angle);
    ctx.fillStyle='rgba(0,0,0,0.25)';
    roundedRect(ctx,-this.w/2+2,-this.h/2+2,this.w,this.h,6); ctx.fill();
    ctx.fillStyle=this.color;
    roundedRect(ctx,-this.w/2,-this.h/2,this.w,this.h,6); ctx.fill();
    ctx.fillStyle='rgba(255,255,255,0.8)';
    roundedRect(ctx,-this.w/2+4,-this.h/2+4,this.w-8,this.h/2,6); ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,0.3)'; ctx.lineWidth=2;
    ctx.beginPath(); ctx.moveTo(0,-this.h/2+3); ctx.lineTo(0,this.h/2-3); ctx.stroke();
    ctx.restore();
  }
}

/* ---------- IA ---------- */
class AIController {
  constructor(car, waypoints, opponentRef){ this.car=car; this.wps=waypoints; this.idx=0; this.opponentRef=opponentRef; }
  update(dt){
    if(this.wps.length===0) return { steer:0, throttle:0.6, brake:0, reverse:0, nitro:false };
    const target=this.wps[this.idx];
    const dx=target.x - this.car.x, dy=target.y - this.car.y;
    const desired=Math.atan2(dy,dx);
    let diff=normalizeAngle(desired - this.car.angle);

    const dist=Math.hypot(dx,dy);
    const speed=this.car.speed();
    const lookAhead=clamp(speed*0.20 + 70, 70, 240);
    if(dist<lookAhead) this.idx=(this.idx+1)%this.wps.length;

    if(this.opponentRef){
      const odx=this.opponentRef.x - this.car.x, ody=this.opponentRef.y - this.car.y;
      const odist=Math.hypot(odx,ody);
      if(odist<120){
        const oang=Math.atan2(ody,odx);
        const rel=normalizeAngle(oang - this.car.angle);
        diff += (rel>0 ? -0.25 : 0.25);
      }
    }

    const steer=clamp(diff*1.8,-1,1);
    let targetSpeed = clamp(WORLD.maxSpeed * (1 - Math.abs(diff)*0.35), 200, WORLD.maxSpeed);
    if(isGrass(this.car.x,this.car.y)) targetSpeed *= 0.75;

    const throttle = this.car.speed() < targetSpeed ? 1.0 : 0.3;
    const brake    = this.car.speed() > targetSpeed + 40 ? 0.6 : 0.0;
    const nitro    = Math.abs(diff) < 0.18 && this.car.nitro > 60 && !isGrass(this.car.x,this.car.y);

    return { steer, throttle, brake, reverse:0, nitro };
  }
}

/* ---------- Caméras ---------- */
const camera1={ x:0,y:0,w:CANVAS.width,h:CANVAS.height };
const camera2={ x:0,y:0,w:CANVAS.width,h:CANVAS.height };
function updateCamera(dt, cam, target, shake=0){
  const targetX=clamp(target.x - cam.w/2, 0, MAP_W - cam.w);
  const targetY=clamp(target.y - cam.h/2, 0, MAP_H - cam.h);
  cam.x += (targetX - cam.x) * WORLD.camLerp;
  cam.y += (targetY - cam.y) * WORLD.camLerp;
  if(shake>0){ cam.x += (Math.random()-0.5)*shake; cam.y += (Math.random()-0.5)*shake; }
}

/* ---------- Init ---------- */
const startTile = (() => {
  for (let ty=0; ty<level.length; ty++) for (let tx=0; tx<level[ty].length; tx++) {
    if (level[ty][tx] === 'S') return { x: (tx+0.5)*TILE, y: (ty+0.5)*TILE };
  }
  return { x: TILE*2, y: TILE*2 };
})();

// Angle de départ: orienté le long de la piste (ici vertical, on part vers le bas)
const START_ANGLE = Math.PI/2;

const player1 = new Car(startTile.x - 48, startTile.y - 40, START_ANGLE, '#1abc9c', 'J1');
let opponent, controllerAI;
if (MODE === 'ai') {
  opponent = new Car(startTile.x + 48, startTile.y - 40, START_ANGLE, '#e74c3c', 'IA');
  controllerAI = new AIController(opponent, waypoints, player1);
} else {
  opponent = new Car(startTile.x + 48, startTile.y - 40, START_ANGLE, '#f39c12', 'J2');
}

/* ---------- Chrono & départ ---------- */
let raceTime=0, countdown=WORLD.countdown, raceStarted=false;
function resetRace(){
  player1.x = startTile.x - 48; player1.y = startTile.y - 40; player1.angle=START_ANGLE; player1.vx=player1.vy=0;
  opponent.x= startTile.x + 48; opponent.y= startTile.y - 40; opponent.angle=START_ANGLE; opponent.vx=opponent.vy=0;
  player1.lap=opponent.lap=0; player1.checkpointIndex=opponent.checkpointIndex=0;
  player1.currentLapTime=opponent.currentLapTime=0; player1.bestLap=opponent.bestLap=Infinity;
  player1.nitro=opponent.nitro=WORLD.nitro.capacity; player1.nitroActive=opponent.nitroActive=false;
  raceTime=0; countdown=WORLD.countdown; raceStarted=false; keys.pause=false;
}

/* ---------- Boucle ---------- */
let last=performance.now();
function loop(now){
  const dt=Math.min(1/30,(now-last)/1000);
  last=now;
  if(!keys.pause){ update(dt); }
  render();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

/* ---------- Update ---------- */
function update(dt){
  if(!raceStarted){ countdown-=dt; if(countdown<=0){ raceStarted=true; countdown=0; } }
  else { raceTime += dt; }

  const input1 = {
    steer: (keys.left?-1:0)+(keys.right?1:0),
    throttle: raceStarted ? (keys.up?1:0) : 0,
    brake:    raceStarted ? (keys.down?1:0) : 0,
    reverse:  raceStarted ? (keys.down?0.2:0) : 0,
    nitro:    raceStarted ? keys.nitro1 : false
  };
  player1.update(dt,input1);

  if(MODE==='ai'){
    const aiInput = controllerAI.update(dt);
    if(!raceStarted){ aiInput.throttle=0; aiInput.brake=0; aiInput.reverse=0; aiInput.nitro=false; }
    opponent.update(dt, aiInput);
  } else {
    const input2 = {
      steer: (keys.a?-1:0)+(keys.d?1:0),
      throttle: raceStarted ? (keys.w?1:0) : 0,
      brake:    raceStarted ? (keys.s?1:0) : 0,
      reverse:  raceStarted ? (keys.s?0.2:0) : 0,
      nitro:    raceStarted ? keys.nitro2 : false
    };
    opponent.update(dt,input2);
  }

  // Collision voiture vs voiture
  const dx=opponent.x - player1.x, dy=opponent.y - player1.y;
  const d=Math.hypot(dx,dy), minDist=player1.radius+opponent.radius;
  if(d>0 && d<minDist){
    const overlap=minDist - d; const nx=dx/d, ny=dy/d;
    player1.x -= nx*overlap*0.5; player1.y -= ny*overlap*0.5;
    opponent.x += nx*overlap*0.5; opponent.y += ny*overlap*0.5;
    const v1=player1.vx*nx + player1.vy*ny, v2=opponent.vx*nx + opponent.vy*ny;
    const impulse=(v2-v1)*0.5;
    player1.vx += impulse*nx; player1.vy += impulse*ny;
    opponent.vx -= impulse*nx; opponent.vy -= impulse*ny;
  }

  // Caméras
  if(MODE==='pvp'){
    camera1.w=CANVAS.width/2; camera1.h=CANVAS.height;
    camera2.w=CANVAS.width/2; camera2.h=CANVAS.height;
    updateCamera(dt,camera1,player1,player1.nitroActive?WORLD.nitro.shake:0);
    updateCamera(dt,camera2,opponent,opponent.nitroActive?WORLD.nitro.shake:0);
  } else {
    camera1.w=CANVAS.width; camera1.h=CANVAS.height;
    updateCamera(dt,camera1,player1,player1.nitroActive?WORLD.nitro.shake:0);
  }

  if(player1.lap>=WORLD.lapsToWin || opponent.lap>=WORLD.lapsToWin){ keys.pause=true; }

  for(const p of particles) p.update(dt);
  while(particles[0] && particles[0].life<=0) particles.shift();
}

/* ---------- Render ---------- */
function render(){
  ctx.clearRect(0,0,CANVAS.width,CANVAS.height);

  if(MODE==='pvp'){
    renderViewport({x:0,y:0,w:CANVAS.width/2,h:CANVAS.height}, camera1, [player1,opponent], 'Joueur 1');
    ctx.fillStyle='rgba(255,255,255,0.1)'; ctx.fillRect(CANVAS.width/2 - 1, 0, 2, CANVAS.height);
    renderViewport({x:CANVAS.width/2,y:0,w:CANVAS.width/2,h:CANVAS.height}, camera2, [opponent,player1], 'Joueur 2');
  } else {
    renderViewport({x:0,y:0,w:CANVAS.width,h:CANVAS.height}, camera1, [player1,opponent], 'Course');
  }

  renderMinimap();

  const status=document.getElementById('status');
  const fmt=t=> t===Infinity ? '--:--.--' : `${Math.floor(t).toString().padStart(2,'0')}:${(t%60).toFixed(2).padStart(5,'0')}`;
  status.textContent =
    `Temps: ${fmt(raceTime)} • J1 tours ${player1.lap}/${WORLD.lapsToWin} (tour ${fmt(player1.currentLapTime)}, meilleur ${fmt(player1.bestLap)}) • ` +
    `${MODE==='ai'?'IA':'J2'} tours ${opponent.lap}/${WORLD.lapsToWin} (tour ${fmt(opponent.currentLapTime)}, meilleur ${fmt(opponent.bestLap)})`;
}

function renderViewport(view, cam, carsOrder, label){
  ctx.save();
  ctx.beginPath(); ctx.rect(view.x,view.y,view.w,view.h); ctx.clip();
  ctx.fillStyle='#0b0f14'; ctx.fillRect(view.x,view.y,view.w,view.h);

  ctx.save();
  ctx.translate(view.x - cam.x, view.y - cam.y);
  ctx.drawImage(trackCanvas, 0, 0);
  for(const p of particles) p.render(ctx);
  for(const car of carsOrder) car.render(ctx);
  ctx.strokeStyle='rgba(255,255,255,0.18)';
  ctx.strokeRect(startTile.x - TILE/2, startTile.y - TILE/2, TILE, TILE);
  ctx.restore();

  const car = carsOrder[0];
  const speedKmh = Math.round(car.speed() * 0.20);
  drawNitroBar(view, car);
  ctx.fillStyle='#fff'; ctx.font='bold 16px system-ui';
  ctx.fillText(`${label} — ${speedKmh} km/h`, view.x+12, view.y+24);
  ctx.font='14px system-ui';
  const fmt=t=> t===Infinity ? '--:--.--' : `${Math.floor(t).toString().padStart(2,'0')}:${(t%60).toFixed(2).padStart(5,'0')}`;
  ctx.fillText(`Tour: ${fmt(car.currentLapTime)} | Meilleur: ${fmt(car.bestLap)}`, view.x+12, view.y+44);
  ctx.fillText(`CP: ${Math.min(car.checkpointIndex,checkpoints.length)}/${checkpoints.length}`, view.x+12, view.y+64);

  if(!raceStarted){
    ctx.fillStyle='rgba(0,0,0,0.5)'; ctx.fillRect(view.x,view.y,view.w,view.h);
    ctx.fillStyle='#fff'; ctx.font='bold 48px system-ui'; ctx.textAlign='center';
    ctx.fillText(Math.ceil(countdown).toString(), view.x+view.w/2, view.y+view.h/2);
    ctx.textAlign='left';
  }

  ctx.restore();
}

function drawNitroBar(view, car){
  const x=view.x+view.w-170, y=view.y+16, w=150, h=10;
  ctx.fillStyle='rgba(255,255,255,0.2)'; ctx.fillRect(x,y,w,h);
  const pct=car.nitro/WORLD.nitro.capacity;
  ctx.fillStyle='#50c8ff'; ctx.fillRect(x,y,w*pct,h);
  ctx.strokeStyle='rgba(255,255,255,0.3)'; ctx.strokeRect(x,y,w,h);
}

/* ---------- Minimap ---------- */
function renderMinimap(){
  const mmW=220, mmH=160, mmX=CANVAS.width - mmW - 20, mmY=56;
  ctx.save(); ctx.beginPath(); ctx.rect(mmX,mmY,mmW,mmH); ctx.clip();
  ctx.fillStyle='#0b0f14'; ctx.fillRect(mmX,mmY,mmW,mmH);

  const scaleX=mmW/MAP_W, scaleY=mmH/MAP_H;
  for(let ty=0; ty<level.length; ty++) for(let tx=0; tx<level[ty].length; tx++){
    const t=level[ty][tx], x=mmX + tx*TILE*scaleX, y=mmY + ty*TILE*scaleY;
    if(t==='='||t==='S'||t==='O'||t==='C'){ ctx.fillStyle='#555'; ctx.fillRect(x,y,TILE*scaleX,TILE*scaleY); }
    if(t==='#'){ ctx.fillStyle='#222'; ctx.fillRect(x,y,TILE*scaleX,TILE*scaleY); }
  }

  const drawDot=(car,color)=>{ const x=mmX+car.x*scaleX, y=mmY+car.y*scaleY; ctx.fillStyle=color; ctx.beginPath(); ctx.arc(x,y,3,0,Math.PI*2); ctx.fill(); };
  drawDot(player1,'#1abc9c');
  drawDot(opponent, MODE==='ai'?'#e74c3c':'#f39c12');

  ctx.restore();
  ctx.strokeStyle='rgba(255,255,255,0.25)'; ctx.strokeRect(mmX,mmY,mmW,mmH);
}

/* ---------- Démarrage ---------- */
resetRace();
