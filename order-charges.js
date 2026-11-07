// Only amounts confirmed by source records belong here. A residual is not evidence.
const chargeKeys=['shipping','returnFee','cardDiscount'];
const chargeValue=(charges,key)=>charges?.[key]||0;
export function itemAmountLimit(total,charges){
 const discount=charges?.cardDiscount;
 return total+(Number.isSafeInteger(discount)&&discount>=0?discount:0);
}
export function validOrderCharges(charges,total=1e12,itemTotal=0){
 if(charges===undefined)return true;
 if(!charges||typeof charges!=='object'||Array.isArray(charges)||!Object.keys(charges).length)return false;
 if(!Object.keys(charges).every(k=>chargeKeys.includes(k)))return false;
 if(!Object.values(charges).every(n=>Number.isSafeInteger(n)&&n>=0))return false;
 if(!Number.isSafeInteger(total)||!Number.isSafeInteger(itemTotal)||itemTotal<0)return false;
 const net=itemTotal+chargeValue(charges,'shipping')+chargeValue(charges,'returnFee')-chargeValue(charges,'cardDiscount');
 return net>=0&&net<=total;
}
export function orderChargesTotal(order,total){
 const itemTotal=Array.isArray(order?.items)?order.items.reduce((s,i)=>s+i.amount,0):0;
 if(!validOrderCharges(order?.charges,total,itemTotal))return 0;
 return chargeValue(order?.charges,'shipping')+chargeValue(order?.charges,'returnFee');
}
export function orderCardDiscount(order,total){
 const itemTotal=Array.isArray(order?.items)?order.items.reduce((s,i)=>s+i.amount,0):0;
 return validOrderCharges(order?.charges,total,itemTotal)?chargeValue(order?.charges,'cardDiscount'):0;
}
