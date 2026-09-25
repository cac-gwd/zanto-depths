import {SIZE,createLayout} from './dungeon.js';
import {ENEMIES,ITEMS,WEAPONS,CHARMS,SKILLS} from './data.js';
export {SIZE};
export const dist=(a,b)=>Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y));
export const idx=(x,y)=>y*SIZE+x;
export function random(s,n){s.rng=(Math.imul(s.rng,1664525)+1013904223)>>>0;return Math.floor(s.rng/4294967296*n)}
export function note(s,text){s.logs.unshift(text);s.logs=s.logs.slice(0,50)}
const dirs=[[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1],[1,1]];
const cardinal=[[1,0],[-1,0],[0,1],[0,-1]];
export function itemName(item){if(item.type==='weapon')return WEAPONS[item.weapon].name+' +'+item.power;if(item.type==='armor')return '護りの外套 +'+item.power;if(item.type==='charm')return CHARMS[item.charm].name;return ITEMS[item.type]?.name||'道具'}
export function makeItem(type,extra={}){return {type,...(ITEMS[type]?.charges?{charges:ITEMS[type].charges,used:0}:{}),...extra}}
export function createGame(seed=Date.now()>>>0){
 const s={version:1,seed:seed>>>0,rng:seed>>>0,floor:1,turn:0,nextId:1,status:'playing',kills:0,logs:[],history:[],known:[],p:{x:0,y:0,hp:42,maxHp:42,food:100,ammo:12,weapon:'sword',power:0,armor:0,charm:'none',status:{},skills:Object.fromEntries(Object.keys(SKILLS).map(k=>[k,0])),points:0,guarding:false,riposte:0},bag:[makeItem('heal'),makeItem('heal'),makeItem('food'),makeItem('slow'),makeItem('smoke'),makeItem('blink')],bonuses:[]};
 generate(s);note(s,'地下20階の残灯王を倒し、灯炉を鎮めよ。');return s;
}
export function floorAt(s,x,y){return x>0&&y>0&&x<SIZE-1&&y<SIZE-1&&s.map[idx(x,y)]===1&&!s.fields.some(f=>f.kind==='ice'&&f.x===x&&f.y===y)}
export function stepAllowed(s,a,dx,dy){return floorAt(s,a.x+dx,a.y+dy)&&(!(dx&&dy)||(floorAt(s,a.x+dx,a.y)&&floorAt(s,a.x,a.y+dy)))}
export function los(s,a,b){
 let x=a.x,y=a.y;const dx=Math.abs(b.x-x),dy=Math.abs(b.y-y),sx=Math.sign(b.x-x),sy=Math.sign(b.y-y);let err=dx-dy;
 if(s.fields.some(f=>f.kind==='smoke'&&f.x===x&&f.y===y)&&dist(a,b)>1)return false;
 while(x!==b.x||y!==b.y){const oldX=x,oldY=y,e=2*err;if(e>-dy){err-=dy;x+=sx}if(e<dx){err+=dx;y+=sy}if(x!==oldX&&y!==oldY&&(!floorAt(s,x,oldY)||!floorAt(s,oldX,y)))return false;if(x===b.x&&y===b.y)return true;if(!floorAt(s,x,y)||s.fields.some(f=>f.kind==='smoke'&&f.x===x&&f.y===y))return false}return true;
}
export function visible(s){const result=new Set;for(let y=Math.max(0,s.p.y-6);y<=Math.min(SIZE-1,s.p.y+6);y++)for(let x=Math.max(0,s.p.x-6);x<=Math.min(SIZE-1,s.p.x+6);x++)if(dist(s.p,{x,y})<=6&&los(s,s.p,{x,y}))result.add(idx(x,y));return result}
// Terrain outlines are more generous than combat sight: show walls bordering
// visible floor, without revealing floor, enemies or projectiles beyond corners.
export function terrainVisible(s){const result=visible(s);for(const k of [...result])if(s.map[k]){const x=k%SIZE,y=Math.floor(k/SIZE);for(const[dx,dy]of dirs){const nx=x+dx,ny=y+dy;if(nx>=0&&ny>=0&&nx<SIZE&&ny<SIZE&&dist(s.p,{x:nx,y:ny})<=6&&!s.map[idx(nx,ny)])result.add(idx(nx,ny))}}return result}
export function reveal(s){
 for(const k of terrainVisible(s))s.seen[k]=true;
 // Backfill wall outlines around remembered floor, including pre-update saves.
 for(let k=0;k<s.map.length;k++)if(s.seen[k]&&s.map[k]){const x=k%SIZE,y=Math.floor(k/SIZE);for(const[dx,dy]of dirs){const nx=x+dx,ny=y+dy;if(nx>=0&&ny>=0&&nx<SIZE&&ny<SIZE&&!s.map[idx(nx,ny)])s.seen[idx(nx,ny)]=true}}
 for(const e of s.enemies)if(visibleEnemy(s,e)&&!s.known.includes(e.type))s.known.push(e.type);
}
export function visibleEnemy(s,e){return dist(s.p,e)<=6&&los(s,s.p,e)}
function circle(s,p,r){const cells=[];for(let y=p.y-r;y<=p.y+r;y++)for(let x=p.x-r;x<=p.x+r;x++)if(floorAt(s,x,y)&&los(s,p,{x,y}))cells.push({x,y});return cells}
function ray(s,a,b,length=6){const dx=Math.sign(b.x-a.x),dy=Math.sign(b.y-a.y);if(!dx&&!dy)return[];if(a.x!==b.x&&a.y!==b.y&&Math.abs(a.x-b.x)!==Math.abs(a.y-b.y))return[];const cells=[];let p={x:a.x,y:a.y};for(let n=0;n<length;n++){if(!stepAllowed(s,p,dx,dy))break;p={x:p.x+dx,y:p.y+dy};cells.push(p)}return cells}
function occupied(s,x,y){return (s.p.x===x&&s.p.y===y)||s.enemies.some(e=>e.x===x&&e.y===y)}
function field(s,kind,cells,life){for(const p of cells){const old=s.fields.find(f=>f.kind===kind&&f.x===p.x&&f.y===p.y);if(old)old.until=Math.max(old.until,s.turn+life);else s.fields.push({...p,kind,until:s.turn+life})}}
export function spawn(s,type,x,y,summoned=false){const d=ENEMIES[type],boss=['twins','warden','king'].includes(type),tier=boss?0:Math.floor((s.floor-1)/5);const e={id:s.nextId++,type,x,y,hp:d.hp+tier*2,maxHp:d.hp+tier*2,atk:d.atk+Math.floor(tier/2),status:{},face:{x:0,y:1},awake:false,alert:0,cd:0,age:0,calls:0,cycle:0,stun:0,open:0,intent:null,boss,summoned};s.enemies.push(e);return e}
export function generate(s){
 const layout=createLayout(s.layout,()=>random(s,0x1000000)/0x1000000);s.layout=layout.kind;s.map=layout.map;s.p.x=layout.start.x;s.p.y=layout.start.y;s.stairs=layout.stairs;s.seen=Array(SIZE*SIZE).fill(false);s.enemies=[];s.items=[];s.traps=[];s.fields=[];s.blasts=[];s.bossFloor=[10,15,20].includes(s.floor);
 if(s.bossFloor){s.map=Array(SIZE*SIZE).fill(0);for(let y=4;y<=26;y++)for(let x=4;x<=26;x++)s.map[idx(x,y)]=1;for(const x of[10,20])for(const y of[10,17,23])s.map[idx(x,y)]=0;s.p.x=15;s.p.y=25;s.stairs={x:15,y:5};s.layout='arena';const type=s.floor===10?'twins':s.floor===15?'warden':'king';spawn(s,type,15,10);if(s.floor===10){spawn(s,'bell',9,13);spawn(s,'bell',21,13)}}
 const taken=new Set([idx(s.p.x,s.p.y),idx(s.stairs.x,s.stairs.y),...s.enemies.map(e=>idx(e.x,e.y))]);
 const spots=[];for(let y=1;y<SIZE-1;y++)for(let x=1;x<SIZE-1;x++)if(floorAt(s,x,y)&&dist(s.p,{x,y})>5&&!taken.has(idx(x,y)))spots.push({x,y});for(let n=spots.length-1;n>0;n--){const j=random(s,n+1);[spots[n],spots[j]]=[spots[j],spots[n]]}const free=()=>{if(!spots.length)throw Error('Map has too few safe placements');return spots.pop()};
 if(!s.bossFloor){const pool=Object.keys(ENEMIES).filter(k=>ENEMIES[k].floor<=s.floor&&!['twins','warden','king'].includes(k));const count=6+Math.floor(s.floor*.45);for(let n=0;n<count;n++){const recent=pool.filter(k=>ENEMIES[k].floor>=s.floor-5);const choices=n%3===0&&recent.length?recent:pool;const type=choices[random(s,choices.length)],p=free();spawn(s,type,p.x,p.y)}}
 // Baseline supplies are guaranteed; tactical tools, equipment and encounters vary by seed.
 for(const type of ['heal','heal','food','ration','arrows','antidote'])s.items.push({...free(),item:makeItem(type)});
 const tools=Object.keys(ITEMS).filter(k=>!['food','ration','arrows','heal'].includes(k));for(let n=0;n<5;n++)s.items.push({...free(),item:makeItem(tools[random(s,tools.length)])});
 const weapon=Object.keys(WEAPONS)[random(s,4)];s.items.push({...free(),item:makeItem('weapon',{weapon,power:Math.min(4,Math.floor(s.floor/5)+random(s,2))})});
 s.items.push({...free(),item:makeItem('armor',{power:Math.min(3,Math.floor(s.floor/6))})});if(s.floor%3===0)s.items.push({...free(),item:makeItem('charm',{charm:['venom','anchor','ember'][random(s,3)]})});
 for(let n=0;n<Math.min(7,2+Math.floor(s.floor/3));n++)s.traps.push({...free(),kind:n%2?'poison':'spike',revealed:false});
 if(s.floor===5){const center=free();s.items.push({...center,item:makeItem('thunder')});const guard=dirs.map(([dx,dy])=>({x:center.x+dx,y:center.y+dy})).find(p=>floorAt(s,p.x,p.y)&&!occupied(s,p.x,p.y)&&dist(p,s.p)>5);if(guard)spawn(s,'shield',guard.x,guard.y)}
 if([2,5,8,11,14,17].includes(s.floor)&&!s.bonuses.includes(s.floor)){s.bonuses.push(s.floor);s.p.points++;s.p.maxHp+=2;s.p.hp=Math.min(s.p.maxHp,s.p.hp+4);note(s,'専門技能を1段階習得できる。技能ボタンを確認。')}
 reveal(s);note(s,`地下${s.floor}階へ。${s.bossFloor?'主を倒すまで階段は封じられている。':'戦わずに階段へ進んでもよい。'}`);
}
function status(target,name,duration){target.status[name]=Math.max(target.status[name]||0,duration)}
function hurtPlayer(s,damage,cause,bypass=false){const p=s.p;const reduction=p.guarding&&!bypass?3+p.skills.guard:0;const dealt=Math.max(0,damage-(bypass?0:p.armor)-reduction+(p.status.weak&&!bypass?2:0));p.hp=Math.max(0,p.hp-dealt);if(p.guarding)p.riposte=p.skills.guard*2;note(s,`${cause}：${dealt}ダメージ。`);if(p.status.sleep){delete p.status.sleep;status(p,'sleepImmune',4)}if(p.hp===0){s.status='dead';s.cause=cause;s.deathLog=s.logs.slice(0,12);note(s,'最後の灯が消えた。行動記録から次の一手を学ぼう。')}return dealt}
function kill(s,e){s.enemies=s.enemies.filter(v=>v.id!==e.id);if(!e.summoned)s.kills++;note(s,`${ENEMIES[e.type].name}を倒した。`);if(e.type==='fungus'){s.blasts.push({x:e.x,y:e.y,due:s.turn+2});note(s,'爆ぜ茸が膨れた！ 次の一手で離れよう。')}if(e.boss){note(s,'階段を封じていた力が消えた。');s.p.hp=Math.min(s.p.maxHp,s.p.hp+8)}}
function hurtEnemy(s,e,damage){e.hp-=Math.max(0,damage);if(e.status.sleep)delete e.status.sleep;if(e.hp<=0)kill(s,e)}
function melee(s,e){const p=s.p,d=ENEMIES[e.type];let damage=WEAPONS[p.weapon].atk+p.power+p.skills.assault+(p.status.fury?5:0)+p.riposte;p.riposte=0;if(e.intent||e.stun||e.open)damage+=p.skills.assault*2;if(Object.values(e.status).some(Boolean))damage+=p.skills.venom;
 const dx=Math.sign(p.x-e.x),dy=Math.sign(p.y-e.y);if(e.type==='shield'&&!e.open&&dx===e.face.x&&dy===e.face.y)damage=Math.max(1,damage-5);if(e.type==='executioner')damage=Math.max(1,damage-2);
 note(s,`${d.name}へ${damage}ダメージ。`);hurtEnemy(s,e,damage);if(p.weapon==='dagger'&&e.hp>0)status(e,'poison',4+p.skills.venom);
 // Melee pressure can interrupt chanting support enemies, not armored heavy attacks.
 if(e.intent&&['sleep','seal','summon'].includes(e.intent.kind)){e.intent=null;e.cd=2;note(s,'詠唱を中断させた。')}
}
function pickup(s){const g=s.items.find(i=>i.x===s.p.x&&i.y===s.p.y);if(!g)return;if(s.bag.length>=16){note(s,`${itemName(g.item)}が足元にある。袋で交換できる。`);return}s.bag.push(g.item);s.items=s.items.filter(i=>i!==g);note(s,`${itemName(g.item)}を拾った。`)}
function enterTile(s){const t=s.traps.find(t=>t.x===s.p.x&&t.y===s.p.y);if(t){t.revealed=true;if(t.kind==='spike')hurtPlayer(s,4,'針の罠');else{status(s.p,'poison',s.p.charm==='venom'?2:4);note(s,'毒の罠を踏んだ。')}}}
function displace(s,source,push){if(s.p.charm==='anchor'){note(s,'定めの護符が移動を防いだ。');return}let dx=Math.sign(s.p.x-source.x)*(push?1:-1),dy=Math.sign(s.p.y-source.y)*(push?1:-1);for(let n=0;n<2;n++){if(!stepAllowed(s,s.p,dx,dy)||s.enemies.some(e=>e.x===s.p.x+dx&&e.y===s.p.y+dy))break;s.p.x+=dx;s.p.y+=dy;enterTile(s);if(s.status!=='playing')break}}
function distanceMap(s,target){const d=Array(SIZE*SIZE).fill(-1),q=[{x:target.x,y:target.y}];d[idx(target.x,target.y)]=0;for(let n=0;n<q.length;n++)for(const[dx,dy]of dirs){const p=q[n],x=p.x+dx,y=p.y+dy,k=idx(x,y);if(stepAllowed(s,p,dx,dy)&&d[k]<0){d[k]=d[idx(p.x,p.y)]+1;q.push({x,y})}}return d}
function travel(s,e,away=false,steps=1){for(let n=0;n<steps;n++){const costs=distanceMap(s,s.p);const options=dirs.filter(([dx,dy])=>stepAllowed(s,e,dx,dy)&&!occupied(s,e.x+dx,e.y+dy)).map(([dx,dy])=>({x:e.x+dx,y:e.y+dy,dx,dy,cost:costs[idx(e.x+dx,e.y+dy)]})).filter(p=>p.cost>=0);options.sort((a,b)=>away?b.cost-a.cost:a.cost-b.cost);const p=options[0];if(!p)break;if(away&&p.cost<costs[idx(e.x,e.y)])break;e.face={x:p.dx,y:p.dy};e.x=p.x;e.y=p.y;if(dist(e,s.p)<=1)break}}
function plan(s,e,kind,cells,delay=1,damage=e.atk){e.intent={kind,cells,remaining:delay,damage};note(s,`${ENEMIES[e.type].name}：${kind==='summon'?'召喚':kind==='sleep'?'睡眠波':kind==='seal'?'封印':kind==='teleport'?'壁際に気配':'危険な攻撃'}まで${delay}手。`)}
function summon(s,e,kind='rat'){if(e.calls>=3||s.enemies.length>=18)return;const p=dirs.map(([dx,dy])=>({x:e.x+dx,y:e.y+dy})).find(p=>floorAt(s,p.x,p.y)&&!occupied(s,p.x,p.y)&&dist(s.p,p)>1);if(p){spawn(s,kind,p.x,p.y,true);e.calls++;note(s,`${ENEMIES[kind].name}が呼び出された。`)}}
function execute(s,e){const intent=e.intent;e.intent=null;e.cd=e.boss?1:3;const hits=intent.cells.some(p=>p.x===s.p.x&&p.y===s.p.y)&&visibleEnemy(s,e);
 if(intent.kind==='summon'){summon(s,e,e.type==='king'?(e.calls%2?'healer':'archer'):'rat');return}
 if(intent.kind==='teleport'){const p=intent.cells[0];if(p&&!occupied(s,p.x,p.y)){e.x=p.x;e.y=p.y;e.stun=1}return}
 if(intent.kind==='fire'){field(s,'fire',intent.cells,3);return}
 if(hits){if(intent.kind==='sleep'){if(!s.p.status.sleepImmune){status(s.p,'sleep',1);note(s,'眠りに落ちた。次の一手は待機。')}}else if(intent.kind==='seal'){status(s.p,'seal',3);note(s,'道具を封じられた。移動・攻撃はできる。')}else{hurtPlayer(s,intent.damage,ENEMIES[e.type].name);if(s.status==='playing'&&intent.kind==='pull')displace(s,e,false);if(s.status==='playing'&&intent.kind==='push')displace(s,e,true)}}
 if(intent.kind==='charge'){const last=intent.cells.filter(p=>!occupied(s,p.x,p.y)).at(-1);if(last){e.x=last.x;e.y=last.y}e.stun=1}
}
function enemyTurn(s,e){
 if(!s.enemies.includes(e)||s.status!=='playing')return;
 if(e.status.poison){e.status.poison--;hurtEnemy(s,e,2);if(e.hp<=0)return}
 const asleep=e.status.sleep>0,slowed=e.status.slow>0,silenced=e.status.silence>0;for(const key of ['sleep','slow','silence'])if(e.status[key]>0)e.status[key]--;
 if(asleep||(slowed&&s.turn%2===0))return;
 if(e.stun>0){e.stun--;return}if(e.open>0)e.open--;
 const seen=visibleEnemy(s,e);if(seen){e.alert=7;if(!e.awake){e.awake=true;return}}else{e.alert=Math.max(0,e.alert-1)}
 if(!e.awake||!e.alert){e.intent=null;return}e.age++;
 if(silenced){e.intent=null}else if(e.intent){e.intent.remaining--;if(e.intent.remaining<=0)execute(s,e);return}
 if(e.cd>0)e.cd--;
 if(!seen){travel(s,e);return}
 const distance=dist(e,s.p);
 if(!silenced&&e.type==='healer'&&!e.cd){const friend=s.enemies.filter(v=>v!==e&&dist(e,v)<=4&&v.hp<v.maxHp&&los(s,e,v)).sort((a,b)=>(a.hp/a.maxHp)-(b.hp/b.maxHp))[0];if(friend){friend.hp=Math.min(friend.maxHp,friend.hp+6);e.cd=2;note(s,'縫命師が仲間を6回復。');return}}
 if(!silenced&&e.type==='sprout'&&e.age>=6){if(e.age===6){e.hp+=8;e.maxHp+=8;note(s,'瘴芽が成長した！')}field(s,'poison',circle(s,e,1),3);if(distance>1)return}
 if(!silenced&&e.type==='wall'&&!e.cd){const sites=circle(s,s.p,3).filter(p=>dist(p,s.p)>=2&&!occupied(s,p.x,p.y)&&cardinal.some(([dx,dy])=>!floorAt(s,p.x+dx,p.y+dy)));if(sites.length){plan(s,e,'teleport',[sites[random(s,sites.length)]]);return}}
 if(!silenced&&!e.cd){
  const line=ray(s,e,s.p,6);
  if(['boar','twins'].includes(e.type)&&line.length&&distance<=6){plan(s,e,'charge',line,1,e.atk+3);return}
  if(['archer','hunter'].includes(e.type)&&line.length&&distance>1){plan(s,e,'shot',line);return}
  if(e.type==='bell'&&distance<=3){plan(s,e,'sleep',circle(s,e,2));return}
  if(e.type==='monk'&&distance<=4){plan(s,e,'seal',circle(s,e,3));return}
  if(e.type==='caller'&&e.calls<3){plan(s,e,'summon',circle(s,e,1));return}
  if(e.type==='chain'&&line.length){plan(s,e,'pull',line,1,2);return}
  if(e.type==='wind'&&distance<=4){const dx=Math.sign(s.p.x-e.x),dy=Math.sign(s.p.y-e.y);plan(s,e,'push',circle(s,e,3).filter(p=>(p.x-e.x)*dx+(p.y-e.y)*dy>0),1,3);return}
  if(e.type==='executioner'&&distance<=3){plan(s,e,'heavy',circle(s,e,2),2,14);return}
  if(e.type==='warden'){if(e.cycle++%2===0&&line.length)plan(s,e,'pull',line,1,3);else plan(s,e,'fire',circle(s,s.p,1));return}
  if(e.type==='king'){
   const phase=e.hp>e.maxHp*.66?0:e.hp>e.maxHp*.33?1:2,pattern=e.cycle++%3;
   if(pattern===0){const cross=circle(s,s.p,3).filter(p=>p.x===s.p.x||p.y===s.p.y);plan(s,e,'heavy',cross,phase===2?1:2,10+phase*2)}
   else if(pattern===1&&e.calls<3)plan(s,e,'summon',circle(s,e,1));else plan(s,e,'heavy',circle(s,e,phase+2),phase===2?1:2,10+phase);
   return;
  }
 }
 if(['hunter','fleeing'].includes(e.type)&&distance<=3){if(e.type==='fleeing'&&!silenced)field(s,'fire',[{x:e.x,y:e.y}],3);travel(s,e,true);return}
 if(distance<=1&&stepAllowed(s,e,s.p.x-e.x,s.p.y-e.y)){
  e.face={x:Math.sign(s.p.x-e.x),y:Math.sign(s.p.y-e.y)};const boosted=s.enemies.some(v=>v.type==='drummer'&&v!==e&&!v.status.silence&&dist(v,e)<=3);const pack=e.type==='rat'&&s.enemies.some(v=>v!==e&&dist(v,e)<=1);
  hurtPlayer(s,e.atk+(boosted?2:0)+(pack?2:0),ENEMIES[e.type].name);if(e.type==='shield')e.open=2;
  if(e.type==='lizard'&&s.status==='playing')status(s.p,'poison',s.p.charm==='venom'?2:4);return;
 }
 travel(s,e,false,e.type==='moth'&&!silenced&&s.turn%2===0?2:1);
}
function endTurn(s){
 s.turn++;const p=s.p;if(s.turn%4===0)p.food=Math.max(0,p.food-1);
 if(p.status.poison)hurtPlayer(s,1,'毒',true);if(p.food===0&&s.status==='playing')hurtPlayer(s,1,'飢え',true);
 const hadFury=p.status.fury===1;for(const key of Object.keys(p.status)){p.status[key]--;if(p.status[key]<=0)delete p.status[key]}if(hadFury)status(p,'weak',3);
 s.fields=s.fields.filter(f=>f.until>=s.turn);
 for(const blast of s.blasts.filter(b=>b.due<=s.turn)){if(dist(blast,p)<=1&&s.status==='playing')hurtPlayer(s,8,'爆ぜ茸の爆発');for(const e of [...s.enemies])if(dist(blast,e)<=1)hurtEnemy(s,e,8)}s.blasts=s.blasts.filter(b=>b.due>s.turn);
 const enemies=[...s.enemies];for(const e of enemies)enemyTurn(s,e);
 if(s.status==='playing')for(const f of s.fields){if(f.x===p.x&&f.y===p.y){if(f.kind==='fire')hurtPlayer(s,p.charm==='ember'?1:3,'炎床',true);if(f.kind==='poison')status(p,'poison',p.charm==='venom'?2:3)}if(f.kind==='fire')for(const e of [...s.enemies])if(e.x===f.x&&e.y===f.y)hurtEnemy(s,e,3)}
 if(s.status==='playing'&&p.food>0&&!p.status.poison&&s.turn%10===0)p.hp=Math.min(p.maxHp,p.hp+1);
 p.guarding=false;reveal(s);s.history.push({turn:s.turn,hp:p.hp,x:p.x,y:p.y,action:s.lastAction});s.history=s.history.slice(-12);
}
function checkTarget(s,target,range,enemy=false){return target&&Number.isInteger(target.x)&&Number.isInteger(target.y)&&dist(s.p,target)<=range&&floorAt(s,target.x,target.y)&&los(s,s.p,target)&&(!enemy||s.enemies.some(e=>e.x===target.x&&e.y===target.y))}
export function targets(s,mode,item){const range=mode==='shoot'?5+s.p.skills.ranged+(s.p.weapon==='bow'?1:0):ITEMS[item.type].range;return s.enemies.filter(e=>visibleEnemy(s,e)&&dist(s.p,e)<=range)}
export function act(s,action){
 if(s.status!=='playing')return false;const p=s.p;
 if(action.type==='skill'){if(!SKILLS[action.skill]||p.points<1||p.skills[action.skill]>=3)return false;p.skills[action.skill]++;p.points--;note(s,`${SKILLS[action.skill].name}を習得した。`);return true}
 if(p.status.sleep){delete p.status.sleep;status(p,'sleepImmune',5);note(s,'眠りから覚めるまで、一手を失った。');s.lastAction='睡眠';endTurn(s);return true}
 if(action.type==='move'){
  const {dx,dy}=action;if(!Number.isInteger(dx)||!Number.isInteger(dy)||Math.abs(dx)>1||Math.abs(dy)>1||(!dx&&!dy))return false;
  if(!stepAllowed(s,p,dx,dy)){note(s,'そこへは進めない。');return false}
  const e=s.enemies.find(v=>v.x===p.x+dx&&v.y===p.y+dy);if(e)melee(s,e);else{p.x+=dx;p.y+=dy;enterTile(s);pickup(s)}s.lastAction=e?'近接攻撃':'移動';
 }else if(action.type==='wait'){pickup(s);note(s,'一手、周囲をうかがう。');s.lastAction='待機'}
 else if(action.type==='guard'){p.guarding=true;note(s,'守りを固める。');s.lastAction='防御'}
 else if(action.type==='stairs'){
  if(dist(p,s.stairs)!==0){note(s,'階段の上へ移動しよう。');return false}if(s.enemies.some(e=>e.boss)){note(s,'主を倒すまで階段は封じられている。');return false}
  if(s.floor===20){s.status='won';note(s,'残灯王を退け、灯炉を鎮めた。');return true}s.floor++;generate(s);return true;
 }else if(action.type==='drop'){
  if(!Number.isInteger(action.index)||!s.bag[action.index])return false;const g=s.items.find(i=>i.x===p.x&&i.y===p.y),item=s.bag[action.index];if(g){s.bag[action.index]=g.item;g.item=item;note(s,`${itemName(item)}を足元の道具と交換。`)}else{s.bag.splice(action.index,1);s.items.push({x:p.x,y:p.y,item});note(s,`${itemName(item)}を足元に置いた。`)}s.lastAction='置く・交換';
 }else if(action.type==='shoot'){
  const e=s.enemies.find(e=>e.id===action.id);if(!e||!checkTarget(s,e,5+p.skills.ranged+(p.weapon==='bow'?1:0),true)){note(s,'射程・射線の中にいる敵を選ぼう。');return false}
  const spear=p.weapon==='spear'&&dist(p,e)<=2&&ray(s,p,e,2).some(t=>t.x===e.x&&t.y===e.y);
  if(spear)melee(s,e);else{if(!p.ammo){note(s,'矢がない。');return false}p.ammo--;const damage=6+p.skills.ranged*2+(p.weapon==='bow'?3+p.power:0);if(e.type==='mirror'&&!e.status.silence&&s.turn%4<2)hurtPlayer(s,damage,'鏡殻の反射');else{note(s,`${ENEMIES[e.type].name}へ矢：${damage}ダメージ。`);hurtEnemy(s,e,damage)}}s.lastAction='射撃';
 }else if(action.type==='use'){
  if(!Number.isInteger(action.index)||!s.bag[action.index])return false;const item=s.bag[action.index],def=ITEMS[item.type];
  if(p.status.seal){note(s,'道具は封じられている。移動・攻撃で切り抜けよう。');return false}
  if(['weapon','armor','charm'].includes(item.type)){
   let old;if(item.type==='weapon'){old=makeItem('weapon',{weapon:p.weapon,power:p.power});p.weapon=item.weapon;p.power=item.power}else if(item.type==='armor'){old=makeItem('armor',{power:p.armor});p.armor=item.power}else{old=p.charm==='none'?null:makeItem('charm',{charm:p.charm});p.charm=item.charm}if(old)s.bag[action.index]=old;else s.bag.splice(action.index,1);note(s,`${itemName(item)}を装備。`);
  }else{
   const target=action.target,e=target&&s.enemies.find(e=>e.x===target.x&&e.y===target.y);
   if(def.kind!=='self'&&!checkTarget(s,target,def.range,def.kind==='enemy')){note(s,'射程・射線の中の対象を選ぼう。');return false}
   if(['ice','blink'].includes(item.type)&&occupied(s,target.x,target.y)){note(s,'空いている床を選ぼう。');return false}
   if(item.type==='wand'&&!ray(s,p,target,6).length){note(s,'貫通の杖は縦・横・斜めの直線に使う。');return false}
   note(s,`${itemName(item)}を使った。`);
   if(item.type==='heal')p.hp=Math.min(p.maxHp,p.hp+24+p.skills.tools*3);
   if(['antidote','remedy'].includes(item.type)){delete p.status.poison;if(item.type==='remedy'){delete p.status.seal;delete p.status.sleep}p.hp=Math.min(p.maxHp,p.hp+(item.type==='remedy'?12:6))}
   if(['food','ration'].includes(item.type))p.food=Math.min(100,p.food+(item.type==='food'?50:25));
   if(item.type==='arrows')p.ammo+=8;
   if(['spear','wand'].includes(item.type)){
    const hit=item.type==='spear'?[e]:s.enemies.filter(v=>ray(s,p,target,6).some(t=>v.x===t.x&&v.y===t.y));
    for(const foe of [...hit]){const damage=(item.type==='spear'?12:10)+p.skills.ranged*2;if(foe.type==='mirror'&&!foe.status.silence&&s.turn%4<2)hurtPlayer(s,damage,'鏡殻の反射');else hurtEnemy(s,foe,damage)}
   }
   if(['slow','sleep','silence'].includes(item.type)){const name=item.type==='slow'?'slow':item.type==='sleep'?'sleep':'silence';for(const foe of s.enemies.filter(v=>item.type==='silence'?v===e:dist(v,target)<=1)){const duration=foe.boss?(name==='sleep'?1:2):(name==='sleep'?3:name==='slow'?5:4)+p.skills.venom;status(foe,name,duration);if(name==='silence')foe.intent=null}}
   if(item.type==='smoke')field(s,'smoke',circle(s,p,1),5);
   if(item.type==='ice')field(s,'ice',[target],5);
   if(item.type==='fire'){const cells=circle(s,target,1);for(const foe of [...s.enemies])if(cells.some(t=>t.x===foe.x&&t.y===foe.y))hurtEnemy(s,foe,6+(p.skills.tools===3?4:0));if(cells.some(t=>t.x===p.x&&t.y===p.y))hurtPlayer(s,6,'火炎瓶の巻き込み');field(s,'fire',cells,4)}
   if(item.type==='blink'){p.x=target.x;p.y=target.y;enterTile(s)}
   if(item.type==='swap'){const{x,y}=p;p.x=e.x;p.y=e.y;e.x=x;e.y=y;enterTile(s)}
   if(item.type==='thunder')for(const foe of [...s.enemies])if(visibleEnemy(s,foe))hurtEnemy(s,foe,20+(p.skills.tools===3?4:0));
   if(item.type==='fury')status(p,'fury',7);
   if(item.type==='scout'){s.seen.fill(true);status(p,'scout',9)}
   if(item.type==='detect')for(const t of s.traps)t.revealed=true;
   if(item.charges){item.used=(item.used||0)+1;if(p.skills.tools<2||item.used%2===0)item.charges--;if(item.charges===0)s.bag.splice(action.index,1)}else s.bag.splice(action.index,1);
  }
  s.lastAction='道具使用';
 }else return false;
 if(s.status==='playing')endTurn(s);else reveal(s);return true;
}
export function validSave(s){
 const pos=p=>p&&Number.isInteger(p.x)&&Number.isInteger(p.y)&&p.x>0&&p.y>0&&p.x<SIZE-1&&p.y<SIZE-1;
 const item=i=>i&&((ITEMS[i.type]&&(!ITEMS[i.type].charges||(Number.isInteger(i.charges)&&i.charges>0&&i.charges<=3)))||(i.type==='weapon'&&WEAPONS[i.weapon]&&Number.isInteger(i.power)&&i.power>=0&&i.power<=4)||(i.type==='armor'&&Number.isInteger(i.power)&&i.power>=0&&i.power<=3)||(i.type==='charm'&&CHARMS[i.charm]));
 const statusOK=t=>t&&typeof t==='object'&&Object.values(t).every(n=>Number.isInteger(n)&&n>=0&&n<=100);
 return !!(s&&s.version===1&&Number.isInteger(s.seed)&&Number.isInteger(s.rng)&&Number.isInteger(s.nextId)&&Number.isInteger(s.floor)&&s.floor>=1&&s.floor<=20&&Number.isInteger(s.turn)&&s.turn>=0&&Number.isInteger(s.kills)&&['playing','dead','won'].includes(s.status)&&pos(s.p)&&Number.isFinite(s.p.hp)&&Number.isFinite(s.p.maxHp)&&s.p.hp>=0&&s.p.hp<=s.p.maxHp&&s.p.maxHp>0&&s.p.maxHp<=100&&WEAPONS[s.p.weapon]&&CHARMS[s.p.charm]&&['food','ammo','power','armor','points','riposte'].every(k=>Number.isFinite(s.p[k])&&s.p[k]>=0)&&statusOK(s.p.status)&&s.p.skills&&Object.keys(SKILLS).every(k=>Number.isInteger(s.p.skills[k])&&s.p.skills[k]>=0&&s.p.skills[k]<=3)&&Array.isArray(s.map)&&s.map.length===SIZE*SIZE&&s.map.every(n=>n===0||n===1)&&Array.isArray(s.seen)&&s.seen.length===SIZE*SIZE&&pos(s.stairs)&&Array.isArray(s.bag)&&s.bag.length<=16&&s.bag.every(item)&&Array.isArray(s.items)&&s.items.every(i=>pos(i)&&item(i.item))&&Array.isArray(s.enemies)&&s.enemies.length<=30&&s.enemies.every(e=>pos(e)&&ENEMIES[e.type]&&Number.isInteger(e.id)&&Number.isFinite(e.hp)&&Number.isFinite(e.maxHp)&&Number.isFinite(e.atk)&&statusOK(e.status)&&e.face&&['x','y'].every(k=>Number.isFinite(e.face[k]))&&['alert','age','cd','calls','cycle','stun','open'].every(k=>Number.isFinite(e[k]))&&(!e.intent||(Array.isArray(e.intent.cells)&&e.intent.cells.every(pos)&&Number.isFinite(e.intent.remaining)&&Number.isFinite(e.intent.damage))))&&Array.isArray(s.fields)&&s.fields.every(f=>pos(f)&&Number.isFinite(f.until)&&['fire','poison','smoke','ice'].includes(f.kind))&&Array.isArray(s.traps)&&s.traps.every(pos)&&Array.isArray(s.blasts)&&s.blasts.every(b=>pos(b)&&Number.isFinite(b.due))&&Array.isArray(s.logs)&&s.logs.every(t=>typeof t==='string')&&Array.isArray(s.history)&&s.history.every(h=>h&&['turn','hp','x','y'].every(k=>Number.isFinite(h[k]))&&typeof h.action==='string')&&(!s.deathLog||(Array.isArray(s.deathLog)&&s.deathLog.every(t=>typeof t==='string')))&&Array.isArray(s.known)&&s.known.every(k=>ENEMIES[k])&&Array.isArray(s.bonuses));
}
