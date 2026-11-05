import {stable} from './sync-state.js';
import {moneyText} from './money.js';
export function moneyEditEntry(old,{id,date,time,money,photos}){
 const normalized=m=>({...m,scope:m.scope||'unassigned',payer:m.payer||''});
 if(old&&old.date===date&&stable(normalized(old.money))===stable(normalized(money))&&stable(old.photos||[])===stable(photos||[]))return {...old,time};
 return {...old,id,date,time,kind:'가계부',memo:true,money,text:moneyText(money),photos};
}
