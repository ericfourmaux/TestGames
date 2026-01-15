export class ParticleSystem {
  constructor(){ this.ps=[]; }
  clear(){ this.ps.length=0; }
  spawn(x,y,opts={}){ const p={ x,y, vx:opts.vx??(Math.random()*2-1)*(opts.spread||40), vy:opts.vy??(Math.random()*2-1)*(opts.spread||40), g:opts.g??0, life:opts.life??0.4, t:0, size:opts.size??2, color:opts.color??'rgba(255,255,255,1)', fade:opts.fade??true, a:1}; this.ps.push(p);} 
  burst(x,y,n=12,opts={}){ for(let i=0;i<n;i++){ const a=i/n*Math.PI*2; const spd=opts.speed??60; this.spawn(x,y,{vx:Math.cos(a)*spd*(0.6+Math.random()*0.8), vy:Math.sin(a)*spd*(0.6+Math.random()*0.8), g:opts.g??0, size:opts.size??2, color:opts.color??'rgba(255,255,255,1)', life:opts.life??0.5, fade:opts.fade??true}); } }
  spark(x,y,color='rgba(255,230,100,1)'){ this.burst(x,y,10,{speed:80,size:2,color}); }
  dust(x,y){ this.burst(x,y,6,{speed:30,size:2,color:'rgba(150,120,80,1)', g:10, life:0.5}); }
  pickup(x,y){ this.burst(x,y,12,{speed:70,size:2,color:'rgba(100,255,220,1)'}); }
  poof(x,y){ this.burst(x,y,14,{speed:50,size:3,color:'rgba(255,255,255,1)', fade:true, life:0.6}); }
  update(dt){ for(let i=this.ps.length-1;i>=0;i--){ const p=this.ps[i]; p.t+=dt; if(p.t>=p.life){ this.ps.splice(i,1); continue; } p.vy+=p.g*dt; p.x+=p.vx*dt; p.y+=p.vy*dt; if(p.fade) p.a=1-(p.t/p.life); } }
  draw(ctx){ for(const p of this.ps){ ctx.globalAlpha=p.a; ctx.fillStyle=p.color; ctx.fillRect(p.x-p.size/2, p.y-p.size/2, p.size, p.size); } ctx.globalAlpha=1; }
}
