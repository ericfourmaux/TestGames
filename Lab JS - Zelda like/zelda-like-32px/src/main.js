import { ASSET_MANIFEST } from './config.js';
import { Loader } from './engine/Loader.js';
import { Game } from './engine/Game.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const loader = new Loader();
const bar = document.getElementById('bar');
const pct = document.getElementById('pct');

loader.onProgress = (p) => {
  bar.style.width = `${Math.floor(p*100)}%`;
  pct.textContent = `${Math.floor(p*100)}%`;
};

loader.load(ASSET_MANIFEST).then(assets => {
  document.getElementById('preload').style.display = 'none';
  const game = new Game(canvas, ctx, assets);
  game.start();
}).catch(err => {
  console.error(err);
  pct.textContent = 'Erreur de chargement';
});
