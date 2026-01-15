export class AudioManager {
  constructor(bank){ this.bank = bank || {}; }
  has(k){ return !!this.bank[k]; }
  play(k, v=1){ const a=this.bank[k]; if(!a) return; const inst=a.cloneNode(true); inst.volume=v; inst.play().catch(()=>{}); }
  loop(k, v=1){ const a=this.bank[k]; if(!a) return; a.loop=true; a.volume=v; a.play().catch(()=>{}); }
}
