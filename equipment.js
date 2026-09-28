import {WEAPONS,CHARMS} from './data.js';

export function equipmentStats(p){
 return {melee:WEAPONS[p.weapon].atk+p.power+p.skills.assault,arrow:6+p.skills.ranged*2+(p.weapon==='bow'?3+p.power:0),range:5+p.skills.ranged+(p.weapon==='bow'?1:0),armor:p.armor};
}
export function compareEquipment(p,item){
 const next={...p};
 if(item.type==='weapon'){next.weapon=item.weapon;next.power=item.power}
 else if(item.type==='armor')next.armor=item.power;
 else if(item.type==='charm')next.charm=item.charm;
 else return null;
 const before=equipmentStats(p),after=equipmentStats(next);
 const keys=item.type==='weapon'?['melee','arrow','range']:item.type==='armor'?['armor']:[];
 const rows=keys.map(key=>({key,before:before[key],after:after[key],delta:after[key]-before[key]}));
 const effects=item.type==='weapon'?[WEAPONS[p.weapon].desc,WEAPONS[next.weapon].desc]:item.type==='charm'?[CHARMS[p.charm].desc,CHARMS[next.charm].desc]:null;
 const current=item.type==='weapon'?WEAPONS[p.weapon].name+' +'+p.power:item.type==='armor'?'護りの外套 +'+p.armor:CHARMS[p.charm].name;
 return {current,rows,effects};
}
