import {flattenState,reconcile} from './sync-state.js';
// A sync pull can finish while a local edit is being committed. Preserve that edit.
export function mergeDuringSave(current,before,incoming){const base=flattenState(before),next=flattenState(incoming),keys=new Set([...Object.keys(base),...Object.keys(next)]),rows=(values,version)=>Object.fromEntries([...keys].map(key=>[key,{item_key:key,version,mutation_id:'snapshot-'+version,deleted:!(key in values),payload:values[key]??null}]));return reconcile(current,rows(base,1),rows(next,2)).state}
