export class Inventory {
  constructor(owner){ this.owner=owner; this.items=[]; this.open=false; }
  toggleOpen(){ this.open=!this.open; }
  add(id,name,value=0,qty=1){ const f=this.items.find(i=>i.id===id); if(f) f.qty+=qty; else this.items.push({id,name,qty,value}); }
  have(id,qty=1){ const f=this.items.find(i=>i.id===id); return !!f && f.qty>=qty; }
  spend(id,qty=1){ const it=this.items.find(i=>i.id===id); if(!it||it.qty<qty) return false; it.qty-=qty; if(it.qty<=0) this.items=this.items.filter(i=>i.qty>0); return true; }
  draw(ctx){ const w=240,h=150,x=10,y=10; ctx.fillStyle='rgba(0,0,0,.8)'; ctx.fillRect(x,y,w,h); ctx.strokeStyle='#7dd3fc'; ctx.strokeRect(x+0.5,y+0.5,w-1,h-1); ctx.fillStyle='#fff'; ctx.font='12px monospace'; ctx.fillText('Inventaire', x+8,y+16); let yy=y+32; for(const it of this.items){ ctx.fillText(`${it.name} x${it.qty} (valeur: ${it.value})`, x+8, yy); yy+=14; } if(this.items.length===0) ctx.fillText('(vide)', x+8, yy); }
}
