export class Entity {
  constructor(x,y,w=20,h=26,img=null){ this.x=x; this.y=y; this.w=w; this.h=h; this.vx=0; this.vy=0; this.img=img; this.anim=null; this.dead=false; this.flipX=false; this._dt=0; }
  get bbox(){ return {x:this.x-this.w/2, y:this.y-this.h/2, w:this.w, h:this.h}; }
  update(dt){ this._dt=dt; if(this.anim) this.anim.update(dt); }
  render(ctx){ if(this.anim){ const ok=this.anim.draw(ctx, this.x, this.y, this.w, this.h, this.flipX); if(ok) return; } if(this.img){ ctx.save(); ctx.translate(this.x,this.y); if(this.flipX) ctx.scale(-1,1); ctx.drawImage(this.img, -this.w/2, -this.h/2, this.w, this.h); ctx.restore(); } else { ctx.fillStyle='#fff'; ctx.fillRect(this.x-this.w/2, this.y-this.h/2, this.w, this.h); } }
}
