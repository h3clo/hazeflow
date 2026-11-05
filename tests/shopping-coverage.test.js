import test from 'node:test';
import assert from 'node:assert/strict';
import {shoppingCoverage,shoppingCoveragePanel} from '../purchase-analysis.js';
const order=(platform,date,amount,items,aliases)=>({date,money:{type:'expense',amount,order:{platform,id:date,item:'상품',items,aliases}}});
const item=amount=>({name:'휴지',family:'화장지',category:'생활용품',unit:'롤',quantity:30,amount});
test('summarizes primary sources across dates and leaves residual money unallocated',()=>{
 const rows=shoppingCoverage([order('네이버','2020-01-01',10000,[item(8000)],[{platform:'오늘의집',id:'other'}]),order('네이버','2026-11-05',5000),order('쿠팡','2023-01-01',2000,[item(2000)]),{date:'2024-01-01',money:{type:'income',amount:9000,order:{platform:'네이버'}}}]);
 assert.equal(rows.length,2);
 assert.deepEqual(rows[0],{platform:'네이버',orders:2,total:15000,covered:8000,detailed:1,firstDay:'2020-01-01',lastDay:'2026-11-05',linked:1,unallocated:7000,percent:53});
 assert.equal(rows[1].percent,100);
});
test('invalid product breakdown does not inflate coverage and empty accounts show no panel',()=>{
 assert.equal(shoppingCoverage([order('쿠팡','2026-01-01',500,[item(900)])])[0].covered,0);
 assert.deepEqual(shoppingCoverage([]),[]);assert.equal(shoppingCoveragePanel([],x=>x),'');
});
