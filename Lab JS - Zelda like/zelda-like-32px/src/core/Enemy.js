import { Entity } from './Entity.js';
import { resolveTileCollision } from '../systems/Collision.js';
import { Animator } from '../systems/Animation.js';

export class Enemy extends Entity {
  constructor(type,x,y,img){ super(x,y,type.size.w,type.size.h,img); this.type='enemy'; this.hp=type.hp; this.speed=type.speed; this.behavior=type.behavior; this.patrolDir=1; this.range=type.range||60; this.color=type.color||'#e11d48'; this.anim=new Animator(img,32,32,{ idle:{frames:[0],fps:1,loop:true}, walk:{frames:[0,1,2,1], fps:6, loop:true} }); this.anim.play('walk'); }
  hit(dmg=1,audio,particles){ this.hp-=dmg; audio?.play('hit',0.5); particles?.spark(this.x,this.y,'rgba(255,250,180,1)'); if(this.hp<=0){ this.dead=true; particles?.poof(this.x,this.y); } }
  update(dt,tilemap,player){ let ax=0, ay=0; if(this.behavior==='chase'){ const dx=player.x-this.x, dy=player.y-this.y; const dist=Math.hypot(dx,dy); if(dist<this.range){ ax=dx/dist; ay=dy/dist; } } else { ax=this.patrolDir; if(Math.random()<0.005) this.patrolDir*=-1; } this.vx=ax*this.speed; this.vy=ay*this.speed; const nx=this.x+this.vx*dt, ny=this.y+this.vy*dt; const s=resolveTileCollision(this,tilemap,nx,ny); if(Math.abs(s.x-this.x)<0.001 && this.behavior!=='chase') this.patrolDir*=-1; this.x=s.x; this.y=s.y; super.update(dt); }
  render(ctx){ super.render(ctx); ctx.fillStyle='#000'; ctx.fillRect(this.x-10, this.y-this.h/2-6, 20,3); ctx.fillStyle='#22c55e'; const pct=Math.max(0,Math.min(1,this.hp/5)); ctx.fillRect(this.x-10, this.y-this.h/2-6, 20*pct,3); }
}
