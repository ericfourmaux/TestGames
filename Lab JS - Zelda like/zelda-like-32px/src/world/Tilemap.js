import { TILE_SIZE, SOLID_TILES } from '../config.js';
export class Tilemap {
  constructor(tilesImage){ this.tiles=[]; this.solid=SOLID_TILES; this.img=tilesImage; this.w=0; this.h=0; this.pixelWidth=0; this.pixelHeight=0; this.cols = tilesImage ? Math.max(1, Math.floor(tilesImage.width / TILE_SIZE)) : 1; }
  loadFromArray(arr2D, solidSet){ this.tiles=arr2D; if(solidSet) this.solid=solidSet; this.h=arr2D.length; this.w=arr2D[0].length; this.pixelWidth=this.w*TILE_SIZE; this.pixelHeight=this.h*TILE_SIZE; this.cols = this.img ? Math.max(1, Math.floor(this.img.width / TILE_SIZE)) : 1; }
  tileAt(tx,ty){ if(ty<0||ty>=this.h||tx<0||tx>=this.w) return 1; return this.tiles[ty][tx]; }
  boxBlocked(box){ const pts=[{x:box.x,y:box.y},{x:box.x+box.w-1,y:box.y},{x:box.x,y:box.y+box.h-1},{x:box.x+box.w-1,y:box.y+box.h-1}]; for(const p of pts){ const tx=Math.floor(p.x/TILE_SIZE), ty=Math.floor(p.y/TILE_SIZE); const t=this.tileAt(tx,ty); if(this.solid.has(t)) return true; } return false; }
  draw(ctx){ for(let y=0;y<this.h;y++){ for(let x=0;x<this.w;x++){ const t=this.tiles[y][x]; const px=x*TILE_SIZE, py=y*TILE_SIZE; if(this.img){ // mapping index: 0=sol,1=roche,2=eau,3=herbe,4=sable
          const idx = t===0?0: t===1?1: t===2?2: t===3?3: 4; const sx=(idx%this.cols)*TILE_SIZE; const sy=Math.floor(idx/this.cols)*TILE_SIZE; ctx.drawImage(this.img, sx,sy,TILE_SIZE,TILE_SIZE, px,py,TILE_SIZE,TILE_SIZE);
        } else { ctx.fillStyle = (t===0?'#7a5230': t===1?'#3a3a3a': t===2?'#277da1': t===3?'#2f9e44':'#e9c46a'); ctx.fillRect(px,py,TILE_SIZE,TILE_SIZE);} } } }
}
