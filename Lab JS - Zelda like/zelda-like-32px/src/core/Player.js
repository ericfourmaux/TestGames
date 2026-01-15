import { Entity } from './Entity.js';
import { MAX_HEARTS, MAX_STAMINA, TILE_SIZE } from '../config.js';
import { resolveTileCollision } from '../systems/Collision.js';
import { Inventory } from '../systems/Inventory.js';
import { Animator } from '../systems/Animation.js';

function rectOverlap(a,b){ return !(a.x+a.w<=b.x||a.x>=b.x+b.w||a.y+a.h<=b.y||a.y>=b.y+b.h); }

export class Player extends Entity {
  constructor(x,y, img){
    super(x,y, 20, 26, img);
    this.speed=90; this.runMult=1.6; this.hearts=MAX_HEARTS; this.stamina=MAX_STAMINA; this.invuln=0; this.rupees=5; this.inventory=new Inventory(this); this.attackTimer=0; this.facing='down'; this.running=false;
    this.anim = new Animator(img, 32,32, {
      idle_down:{frames:[0], fps:1, loop:true}, idle_up:{frames:[4], fps:1, loop:true}, idle_side:{frames:[8], fps:1, loop:true},
      walk_down:{frames:[0,1,2,1], fps:8, loop:true}, walk_up:{frames:[4,5,6,5], fps:8, loop:true}, walk_side:{frames:[8,9,10,9], fps:8, loop:true},
      attack:{frames:[12,13,14], fps:14, loop:false}
    });
    this.anim.play('idle_down');
  }
  handleInput(input){ let ax=0, ay=0; if(input.isDown('left')) ax-=1; if(input.isDown('right')) ax+=1; if(input.isDown('up')) ay-=1; if(input.isDown('down')) ay+=1; const running=input.isDown('run')&&this.stamina>0; const mul=running?this.runMult:1; const len=Math.hypot(ax,ay)||1; this.vx=(ax/len)*this.speed*mul; this.vy=(ay/len)*this.speed*mul; if(ax<0) {this.facing='left'; this.flipX=true;} else if(ax>0) {this.facing='right'; this.flipX=false;} if(Math.abs(ax)<0.01){ if(ay<0) this.facing='up'; else if(ay>0) this.facing='down'; }
    if(this.attackTimer<=0 && input.isDown('attack') && this.stamina>=8){ this.attackTimer=0.18; this.stamina-=8; this.anim.play('attack', true); }
    this.running=running; }
  update(dt, tilemap, entities, audio, particles, hud){ this._dt=dt; if(this.running) this.stamina=Math.max(0, this.stamina-20*dt); else this.stamina=Math.min(MAX_STAMINA, this.stamina+12*dt);
    const nx=this.x+this.vx*dt, ny=this.y+this.vy*dt; const solved=resolveTileCollision(this, tilemap, nx, ny);
    if((Math.abs(this.vx)+Math.abs(this.vy))>0.01 && Math.random()<0.05){ const tx=Math.floor(this.x/TILE_SIZE), ty=Math.floor(this.y/TILE_SIZE); const t=tilemap.tileAt(tx,ty); if(t===3||t===4) particles.dust(this.x, this.y+this.h/2); }
    this.x=solved.x; this.y=solved.y; if(this.attackTimer>0) this.attackTimer-=dt; const attacking=this.attackTimer>0; let hitbox=null; if(attacking){ const r=16; if(this.facing==='left') hitbox={x:this.x-this.w/2-r,y:this.y-10,w:r,h:20}; if(this.facing==='right') hitbox={x:this.x+this.w/2,y:this.y-10,w:r,h:20}; if(this.facing==='up') hitbox={x:this.x-10,y:this.y-this.h/2-r,w:20,h:r}; if(this.facing==='down') hitbox={x:this.x-10,y:this.y+this.h/2,w:20,h:r}; }
    for(const e of entities){ if(e.dead) continue; if(e.type==='item'){ if(this._overlap(e)){ if(e.id==='rupee') this.rupees+=e.value; else this.inventory.add(e.id,e.name,e.value,1); e.dead=true; audio?.play('coin',0.5); particles.pickup(e.x,e.y); } }
      if(e.type==='enemy'){ if(hitbox && rectOverlap(hitbox, e.bbox)) e.hit(1,audio,particles); if(this.invuln<=0 && this._overlap(e)){ this.hearts-=1; this.invuln=0.8; audio?.play('hurt',0.6); particles.spark(this.x,this.y,'rgba(255,120,120,1)'); if(this.hearts<=0){ this.hearts=3; this.x=3*TILE_SIZE; this.y=3*TILE_SIZE; this.rupees=Math.max(0,this.rupees-2); hud.toast('Tu reprends tes esprits…'); } } } }
    if(this.invuln>0) this.invuln-=dt; const moving=(Math.abs(this.vx)+Math.abs(this.vy))>0.01; if(!attacking){ if(moving){ if(this.facing==='up') this.anim.play('walk_up'); else if(this.facing==='down') this.anim.play('walk_down'); else this.anim.play('walk_side'); } else { if(this.facing==='up') this.anim.play('idle_up'); else if(this.facing==='down') this.anim.play('idle_down'); else this.anim.play('idle_side'); } }
    super.update(dt);
  }
  _overlap(e){ const a=this.bbox, b=e.bbox; return !(a.x+a.w<=b.x||a.x>=b.x+b.w||a.y+a.h<=b.y||a.y>=b.y+b.h); }
  render(ctx){ super.render(ctx); if(this.attackTimer>0){ ctx.fillStyle='rgba(255,255,255,.2)'; const r=16; if(this.facing==='left') ctx.fillRect(this.x-this.w/2-r,this.y-10,r,20); if(this.facing==='right') ctx.fillRect(this.x+this.w/2,this.y-10,r,20); if(this.facing==='up') ctx.fillRect(this.x-10,this.y-this.h/2-r,20,r); if(this.facing==='down') ctx.fillRect(this.x-10,this.y+this.h/2,20,r); } }
}
