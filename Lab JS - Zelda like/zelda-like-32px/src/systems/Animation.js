export class Animator {
  constructor(image, fw=32, fh=32, clips={}){
    this.image=image||null; this.fw=fw; this.fh=fh; this.clips=clips; this.current=null; this.frameIndex=0; this.timer=0; this.loop=true; this.done=false; this.cols=image?Math.max(1, Math.floor(image.width/fw)):1;
  }
  play(name, restart=false){ if(!this.clips[name]) return; if(this.current!==name||restart){ this.current=name; this.frameIndex=0; this.timer=0; this.done=false; this.loop=!!this.clips[name].loop; } }
  update(dt){ if(!this.current) return; const clip=this.clips[this.current]; if(!clip||clip.frames.length<=1) return; const spf=1/(clip.fps||8); this.timer+=dt; while(this.timer>=spf){ this.timer-=spf; this.frameIndex++; if(this.frameIndex>=clip.frames.length){ if(this.loop) this.frameIndex=0; else { this.frameIndex=clip.frames.length-1; this.done=true; break; } } } }
  draw(ctx,x,y,w,h,flipX=false){ if(!this.image||!this.current) return false; const clip=this.clips[this.current]; const fi=clip.frames[this.frameIndex|0]; const sx=(fi%this.cols)*this.fw; const sy=Math.floor(fi/this.cols)*this.fh; ctx.save(); ctx.translate(x,y); if(flipX) ctx.scale(-1,1); ctx.drawImage(this.image, sx,sy,this.fw,this.fh, -w/2,-h/2,w,h); ctx.restore(); return true; }
}
