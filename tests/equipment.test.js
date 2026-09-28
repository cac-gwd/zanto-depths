import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,act} from '../engine.js';
import {equipmentStats,compareEquipment} from '../equipment.js';
test('bow tradeoff includes enhancement, skills and range without temporary buffs',()=>{
 const s=createGame(123);s.p.skills.assault=2;s.p.skills.ranged=2;s.p.status.fury=5;s.p.riposte=6;
 const c=compareEquipment(s.p,{type:'weapon',weapon:'bow',power:2});
 assert.deepEqual(c.rows.map(r=>[r.key,r.before,r.after,r.delta]),[['melee',9,8,-1],['arrow',10,15,5],['range',7,8,1]]);
 assert.equal(s.p.weapon,'sword');assert.match(c.effects[1],/射程/);
});
test('comparison matches actual equipment exchange and leaves old weapon in bag',()=>{
 const s=createGame(124);s.enemies=[];s.bag=[{type:'weapon',weapon:'spear',power:3}];
 const before=s.turn,c=compareEquipment(s.p,s.bag[0]);assert.ok(act(s,{type:'use',index:0}));
 for(const r of c.rows)assert.equal(equipmentStats(s.p)[r.key],r.after);
 assert.equal(s.turn,before+1);assert.equal(s.bag[0].weapon,'sword');
});
test('armor downgrade and charm effect replacement are explicit',()=>{
 const s=createGame(125);s.p.armor=3;s.p.charm='anchor';
 assert.deepEqual(compareEquipment(s.p,{type:'armor',power:1}).rows,[{key:'armor',before:3,after:1,delta:-2}]);
 const c=compareEquipment(s.p,{type:'charm',charm:'ember'});assert.match(c.effects[0],/引き寄せ/);assert.match(c.effects[1],/炎床/);
 assert.equal(compareEquipment(s.p,{type:'heal'}),null);
});
