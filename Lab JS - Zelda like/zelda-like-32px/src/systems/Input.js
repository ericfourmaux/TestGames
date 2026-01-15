import { KEYMAP } from '../config.js';
export class Input {
  constructor(){
    this.keys = new Set();
    window.addEventListener('keydown', (e)=>{ this.keys.add(e.code); if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) e.preventDefault(); });
    window.addEventListener('keyup', (e)=> this.keys.delete(e.code));
  }
  isDown(action){ const codes = KEYMAP[action]||[]; return codes.some(c=> this.keys.has(c)); }
  isPressed(action, code){ return (KEYMAP[action]||[]).includes(code); }
}
