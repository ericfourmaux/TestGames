export const TILE_SIZE = 32;
export const VIEW_W = 320;
export const VIEW_H = 240;
export const MAX_HEARTS = 5;
export const MAX_STAMINA = 100;

export const KEYMAP = {
  up: ['ArrowUp','KeyZ','KeyW'],
  down: ['ArrowDown','KeyS'],
  left: ['ArrowLeft','KeyQ','KeyA'],
  right: ['ArrowRight','KeyD'],
  run: ['ShiftLeft','ShiftRight'],
  attack: ['Space'],
  interact: ['KeyE'],
  inventory: ['KeyI']
};

// Grande carte en Array 2D
export function buildLargeMap(w=60, h=40) {
  // 0=sol, 1=roche (solide), 2=eau (solide), 3=herbe, 4=sable
  const A = Array.from({length:h}, ()=> Array.from({length:w}, ()=>3));
  for (let x=0;x<w;x++){ A[0][x]=1; A[h-1][x]=1; }
  for (let y=0;y<h;y++){ A[y][0]=1; A[y][w-1]=1; }
  const ry = Math.floor(h/2);
  for (let x=2;x<w-2;x++) {
    A[ry][x]=2; A[ry+1][x]=2; if (x%7===0) A[ry-1][x]=2;
  }
  for (let y=5;y<12;y++) for (let x=44;x<56;x++) A[y][x]=4; // plage
  for (let y=8;y<16;y++) { A[y][12]=1; A[y][20]=1; }
  for (let x=12;x<=20;x++) { A[8][x]=1; A[16][x]=1; }
  A[16][16]=1; // porte fermée (roche) -> événement l'ouvrira
  for (let x=4;x<30;x++) A[10][x]=0;
  for (let y=10;y<ry+7;y++) A[y][24]=0;
  return A;
}

export const SOLID_TILES = new Set([1,2]);

export const ASSET_MANIFEST = {
  images: {
    tiles: './assets/tiles.png',
    player: './assets/player.png',
    enemy_slime: './assets/enemy_slime.png',
    items: './assets/items.png'
  },
  sounds: {
    hit: './assets/hit.wav',
    coin: './assets/coin.wav',
    buy: './assets/buy.wav',
    hurt: './assets/hurt.wav',
    music: './assets/music.wav'
  }
};
