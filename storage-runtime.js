import {openRecordStorage} from './indexed-record-storage.js';
export let recordStorage;
export async function prepareRecordStorage(){const params=new URLSearchParams(location.search),qa=params.has('sandbox'),device=qa&&/^[a-z0-9-]{1,30}$/.test(params.get('device')||'')?params.get('device'):'';recordStorage=await openRecordStorage({local:localStorage,namespace:qa?'hazeflow-qa-v2'+(device?'-device-'+device:''):'hazeflow-v1'});return recordStorage}
