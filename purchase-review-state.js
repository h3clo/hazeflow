import {stable} from './sync-state.js';
import {validMoney} from './money.js';

const reviewedOrder=log=>log?.money?.order?{
 id:log.id,date:log.date,type:log.money.type,currency:log.money.currency,
 amount:log.money.amount,platform:log.money.order.platform,
 orderId:log.money.order.id,item:log.money.order.item,items:log.money.order.items||[],charges:log.money.order.charges
}:null;

export function applyReviewedPurchase(current,opened,items){
 if(!reviewedOrder(current))throw Error('주문을 찾지 못했어요. 목록을 다시 확인해주세요.');
 if(stable(reviewedOrder(current))!==stable(reviewedOrder(opened)))throw Error('다른 화면에서 주문이나 상품 정보가 바뀌었어요. 창을 닫고 최신 내용을 다시 열어주세요.');
 if(!validMoney({...current.money,order:{...current.money.order,items}}))throw Error('상품별 수량과 금액을 다시 확인해주세요.');
 current.money.order.items=structuredClone(items);
}
