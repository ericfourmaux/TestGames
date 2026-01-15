import { Entity } from './Entity.js';
export class Item extends Entity {
  constructor(id,name,value,x,y,img=null){ super(x,y, 16,16, img); this.type='item'; this.id=id; this.name=name; this.value=value; this.bob=0; }
  update(dt){ this.bob += dt*3; }
  render(ctx){ if(this.img){ const map = { rupee:0, potion:1, key:2, orb:3 };
      const idx = map[this.id] ?? 0; const fw=32, fh=32; const cols = Math.floor(this.img.width / fw) || 1; const sx=(idx%cols)*fw, sy=Math.floor(idx/cols)*fh; ctx.save(); ctx.translate(this.x, this.y + Math.sin(this.bob)*1.5); ctx.drawImage(this.img, sx,sy,fw,fh, -this.w/2,-this.h/2, this.w, this.h); ctx.restore(); return; }
    ctx.save(); ctx.translate(this.x, this.y + Math.sin(this.bob)*1.5); ctx.fillStyle = this.id==='rupee'?'#22d3ee': (this.id==='potion'?'#ef4444':'#eab308'); ctx.fillRect(-this.w/2, -this.h/2, this.w, this.h); ctx.restore(); }
}
