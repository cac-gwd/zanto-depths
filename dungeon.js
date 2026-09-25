// Original implementation inspired by the BSP and cellular-automata articles linked in README.
export const SIZE=31;
export const LAYOUTS={rooms:'石造りの間',maze:'入り組む細道',cave:'うねる岩窟'};
const index=(x,y)=>y*SIZE+x;
const point=k=>({x:k%SIZE,y:Math.floor(k/SIZE)});
const directions=[[1,0],[-1,0],[0,1],[0,-1]];
const inside=(x,y)=>x>0&&y>0&&x<SIZE-1&&y<SIZE-1;

export function distances(map,start){
 const result=Array(SIZE*SIZE).fill(-1),queue=[index(start.x,start.y)];result[queue[0]]=0;
 for(let n=0;n<queue.length;n++){const k=queue[n],{x,y}=point(k);for(const[dx,dy]of directions){const nx=x+dx,ny=y+dy,j=index(nx,ny);if(inside(nx,ny)&&map[j]&&result[j]<0){result[j]=result[k]+1;queue.push(j)}}}
 return result;
}

export function createLayout(previous,rng=Math.random,requested){
 const rand=n=>Math.floor(rng()*n),pick=a=>a[rand(a.length)];
 const kind=requested||pick(Object.keys(LAYOUTS).filter(k=>k!==previous));
 if(!LAYOUTS[kind])throw Error('Unknown layout');
 let map=Array(SIZE*SIZE).fill(0);
 const carve=(x,y)=>{if(inside(x,y))map[index(x,y)]=1};
 function room(x,y,w,h){for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)carve(xx,yy);return{x:x+Math.floor(w/2),y:y+Math.floor(h/2)}}
 function corridor(a,b){let{x,y}=a;const horizontal=rand(2);carve(x,y);function across(){while(x!==b.x){x+=Math.sign(b.x-x);carve(x,y)}}function down(){while(y!==b.y){y+=Math.sign(b.y-y);carve(x,y)}}if(horizontal){across();down()}else{down();across()}}
 function chambers(){
  const centers=[];
  function split(x,y,w,h,depth=0){
   const canX=w>=14,canY=h>=14;
   if((canX||canY)&&depth<4&&(depth<2||rng()<.8)){
    const vertical=canX&&(!canY||w>h*1.3||(w>=h*.75&&rand(2)===0));
    if(vertical){const cut=7+rand(w-13),a=split(x,y,cut,h,depth+1),b=split(x+cut,y,w-cut,h,depth+1);corridor(a,b);return pick([a,b])}
    const cut=7+rand(h-13),a=split(x,y,w,cut,depth+1),b=split(x,y+cut,w,h-cut,depth+1);corridor(a,b);return pick([a,b]);
   }
   const rw=4+rand(Math.max(1,w-5)),rh=4+rand(Math.max(1,h-5));
   const center=room(x+1+rand(w-rw-1),y+1+rand(h-rh-1),rw,rh);centers.push(center);return center;
  }
  split(1,1,SIZE-2,SIZE-2);
  // Extra links create alternative routes instead of one fixed sequence of rooms.
  for(let n=0;n<1+rand(3);n++)corridor(pick(centers),pick(centers));
 }
 if(kind==='rooms')chambers();
 if(kind==='maze'){
  const start={x:1+2*rand(15),y:1+2*rand(15)},stack=[start];carve(start.x,start.y);
  while(stack.length){const current=stack.at(-1),options=directions.filter(([dx,dy])=>inside(current.x+dx*2,current.y+dy*2)&&!map[index(current.x+dx*2,current.y+dy*2)]);if(!options.length){stack.pop();continue}const[dx,dy]=pick(options);carve(current.x+dx,current.y+dy);const next={x:current.x+dx*2,y:current.y+dy*2};carve(next.x,next.y);stack.push(next)}
  for(let n=0;n<5+rand(4);n++){const w=3+rand(5),h=3+rand(5);room(2+rand(SIZE-w-3),2+rand(SIZE-h-3),w,h)}
  // Shortcuts prevent every long maze branch from becoming a mandatory detour.
  for(let n=0;n<35;n++){const x=2+rand(SIZE-4),y=2+rand(SIZE-4);if(!map[index(x,y)]&&((map[index(x-1,y)]&&map[index(x+1,y)])||(map[index(x,y-1)]&&map[index(x,y+1)])))carve(x,y)}
 }
 if(kind==='cave'){
  const wallRate=.43+rng()*.07;
  for(let y=1;y<SIZE-1;y++)for(let x=1;x<SIZE-1;x++)map[index(x,y)]=rng()>wallRate?1:0;
  for(let pass=0;pass<4;pass++){const next=Array(SIZE*SIZE).fill(0);for(let y=1;y<SIZE-1;y++)for(let x=1;x<SIZE-1;x++){let walls=0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if(!map[index(x+dx,y+dy)])walls++;next[index(x,y)]=walls>=5?0:1}map=next}
  // Small rounded chambers guarantee enough floor even with unlucky initial noise.
  if(map.filter(Boolean).length<180)for(let n=0;n<9;n++){const x=4+rand(23),y=4+rand(23),radius=3+rand(2);for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++)if(dx*dx+dy*dy<=radius*radius)carve(x+dx,y+dy)}
 }
 // Join all isolated regions by their nearest tiles. Walls on the outside stay closed.
 let reached=distances(map,point(map.indexOf(1)));
 while(map.some((v,k)=>v&&reached[k]<0)){
  const joined=[],other=[];map.forEach((v,k)=>{if(v)(reached[k]>=0?joined:other).push(point(k))});
  let pair,best=Infinity;for(const a of joined)for(const b of other){const d=Math.abs(a.x-b.x)+Math.abs(a.y-b.y);if(d<best){best=d;pair=[a,b]}}
  corridor(...pair);reached=distances(map,joined[0]);
 }
 const floors=map.flatMap((v,k)=>v?[point(k)]:[]);
 const roomy=floors.filter(p=>directions.every(([dx,dy])=>map[index(p.x+dx,p.y+dy)]));
 const start=pick(roomy.length?roomy:floors),steps=distances(map,start),farthest=Math.max(...steps);
 const exits=floors.filter(p=>steps[index(p.x,p.y)]>=Math.max(12,Math.floor(farthest*.65)));
 const stairs=pick(exits.length?exits:floors.filter(p=>steps[index(p.x,p.y)]===farthest));
 return{map,start,stairs,kind};
}
