import { MAX_HEARTS, MAX_STAMINA } from '../config.js';
export class HUD { constructor(images, player){ this.images=images; this.player=player; this._toast=null; this._toastT=0; this._toastDur=0; this._hint=null; }
  toast(text,dur=1.8){ this._toast=text; this._toastDur=dur; this._toastT=0; }
  setHint(t){ this._hint=t; } clearHint(){ this._hint=null; }
  update(dt){ if(this._toast){ this._toastT+=dt; if(this._toastT>=this._toastDur) this._toast=null; } }
  draw(ctx){ const x0=6,y0=6; for(let i=0;i<MAX_HEARTS;i++){ const full=i<this.player.hearts; ctx.fillStyle=full?'#ef4444':'#3f3f46'; ctx.fillRect(x0+i*14,y0,12,10); }
    ctx.fillStyle='#1f2937'; ctx.fillRect(x0,y0+14,100,6); const sp=Math.max(0, Math.min(1, this.player.stamina/MAX_STAMINA)); ctx.fillStyle='#10b981'; ctx.fillRect(x0,y0+14,100*sp,6); ctx.fillStyle='#fff'; ctx.font='12px monospace'; ctx.fillText(`Rubis: ${this.player.rupees}`, x0, y0+30);
    if(this._hint){ ctx.fillStyle='rgba(0,0,0,.6)'; ctx.fillRect(160,4,160,16); ctx.fillStyle='#fff'; ctx.fillText(this._hint, 164,16); }
    if(this._toast){ const txt=this._toast; const w=ctx.measureText(txt).width+16; const x=(ctx.canvas.width-w)/2; const y=ctx.canvas.height-28; ctx.fillStyle='rgba(0,0,0,.7)'; ctx.fillRect(x,y,w,20); ctx.strokeStyle='#7dd3fc'; ctx.strokeRect(x+0.5,y+0.5,w-1,19); ctx.fillStyle='#fff'; ctx.fillText(txt, x+8, y+14); }
  }
}
