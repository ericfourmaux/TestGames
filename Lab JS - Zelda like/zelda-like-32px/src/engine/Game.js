import { VIEW_W, VIEW_H } from '../config.js';
import { Input } from '../systems/Input.js';
import { AudioManager } from '../systems/Audio.js';
import { Camera } from '../systems/Camera.js';
import { Tilemap } from '../world/Tilemap.js';
import { MapFactory } from '../world/Map.js';
import { HUD } from '../ui/HUD.js';
import { EventManager } from '../systems/Events.js';
import { ParticleSystem } from '../systems/Particles.js';

export class Game {
  constructor(canvas, ctx, assets) {
    this.canvas = canvas; this.ctx = ctx; this.assets = assets;
    this.input = new Input();
    this.audio = new AudioManager(assets.sounds);
    this.tilemap = new Tilemap(assets.images.tiles);

    this.hud = new HUD(this.assets.images, null);
    this.events = new EventManager(this.tilemap, this.audio, this.hud);
    this.particles = new ParticleSystem();

    const map = MapFactory.create(this.assets, this.events);
    this.player = map.player; this.hud.player = this.player;
    this.entities = map.entities;

    this.tilemap.loadFromArray(map.tiles, map.solid);
    this.camera = new Camera(0,0, VIEW_W, VIEW_H, this.tilemap.pixelWidth, this.tilemap.pixelHeight);

    if (this.audio.has('music')) this.audio.loop('music', 0.15);

    window.addEventListener('keydown', (e) => {
      if (this.input.isPressed('inventory', e.code)) this.player.inventory.toggleOpen();
    });

    this.lastTime = 0;
  }
  start() {
    const step = (t) => {
      const dt = Math.min((t - this.lastTime) / 1000, 0.033);
      this.lastTime = t;
      this.update(dt); this.render();
      requestAnimationFrame(step);
    };
    requestAnimationFrame((t)=>{ this.lastTime = t; requestAnimationFrame(step); });
  }
  update(dt) {
    this.player.handleInput(this.input);
    this.events.update(dt, this.player, this.input);

    // Interaction PNJ Boutique
    let nearShop = null;
    for (const e of this.entities) {
      if (e.type === 'store') {
        const dx = e.x - this.player.x, dy = e.y - this.player.y;
        if (Math.hypot(dx,dy) < 24) { nearShop = e; break; }
      }
    }
    if (nearShop) {
      this.hud.setHint('E: parler (Boutique)');
      if (this.input.isDown('interact')) {
        const msg = nearShop.interact(this.player);
        this.hud.toast(msg);
      }
    }

    this.player.update(dt, this.tilemap, this.entities, this.audio, this.particles, this.hud);
    for (const e of this.entities) e.update?.(dt, this.tilemap, this.player, this.audio);
    for (let i=this.entities.length-1;i>=0;i--) if (this.entities[i].dead) this.entities.splice(i,1);
    this.particles.update(dt); this.hud.update(dt);
    this.camera.follow(this.player.x, this.player.y);
  }
  render() {
    const c = this.ctx; c.clearRect(0,0, this.canvas.width, this.canvas.height);
    c.save(); c.translate(-Math.floor(this.camera.x), -Math.floor(this.camera.y));
    this.tilemap.draw(c);
    const drawables = [this.player, ...this.entities].sort((a,b)=> (a.y-a.h/2) - (b.y-b.h/2));
    for (const d of drawables) d.render(c);
    this.particles.draw(c);
    // this.events.drawDebug(c); // debug triggers
    c.restore();
    this.hud.draw(this.ctx);
    if (this.player.inventory.open) this.player.inventory.draw(this.ctx);
  }
}
