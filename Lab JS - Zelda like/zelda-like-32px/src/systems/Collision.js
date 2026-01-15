export function aabbOverlap(a,b){ return !(a.x+a.w<=b.x||a.x>=b.x+b.w||a.y+a.h<=b.y||a.y>=b.y+b.h); }
export function resolveTileCollision(entity, tilemap, nx, ny){
  let newX=nx, newY=ny;
  const bb=(x,y)=>({x:x-entity.w/2,y:y-entity.h/2,w:entity.w,h:entity.h});
  if (entity.vx!==0){ const b=bb(nx, entity.y); if (tilemap.boxBlocked(b)) newX=entity.x; }
  if (entity.vy!==0){ const b=bb(newX, ny); if (tilemap.boxBlocked(b)) newY=entity.y; }
  return {x:newX,y:newY};
}
