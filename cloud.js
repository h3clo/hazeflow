import {createRecordCache} from './sync-record-cache.js';
import {createClient} from '@supabase/supabase-js';
export {cloudConfig} from './cloud-config.js';
export function authStorage(local,temporary,preferenceKey='hazeflow-remember'){
 const remember=()=>local.getItem(preferenceKey)!=='false';
 const stores=key=>remember()||key.endsWith('-code-verifier')?[local,temporary]:[temporary,local];
 return {getItem(key){const [preferred,fallback]=stores(key);return preferred.getItem(key)||fallback.getItem(key)},setItem(key,value){const [preferred,other]=stores(key);preferred.setItem(key,value);other.removeItem(key)},removeItem(key){local.removeItem(key);temporary.removeItem(key)},setRemember(value){local.setItem(preferenceKey,String(!!value))},remember};
}
export function makeCloud(config){const sessionStore=authStorage(localStorage,sessionStorage);return {sessionStore,client:createClient(config.url,config.key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:'pkce',storageKey:'hazeflow-auth-v1',storage:sessionStore}})}}
export function cloudTransport(client,userId,space='main'){
 const table='hazeflow_records',bucket=client.storage.from('hazeflow-photos'),path=ref=>`${userId}/${space}/${ref.id}.jpg`;
 async function pages(columns){const rows=[];for(let page=0;;page++){const {data,error}=await client.from(table).select(columns).eq('user_id',userId).eq('space',space).order('item_key').range(page*500,page*500+499);if(error)throw error;rows.push(...data);if(data.length<500)return rows}}
 const columns='item_key,payload,deleted,version,mutation_id';
 const cache=createRecordCache({loadAll:()=>pages(columns),loadManifest:()=>pages('item_key,version'),async loadKeys(keys){const {data,error}=await client.from(table).select(columns).eq('user_id',userId).eq('space',space).in('item_key',keys);if(error)throw error;return data}});
 return {
  pull:()=>cache.pull(),
  async push(ops){const {data,error}=await client.rpc('hazeflow_apply',{p_space:space,p_changes:ops});if(error)throw error;if(data.applied)cache.accept(data.rows);return data},
  async uploadPhoto(ref,blob){const {error}=await bucket.upload(path(ref),blob,{contentType:'image/jpeg',upsert:false,cacheControl:'31536000'});if(error&&!['409','Duplicate'].includes(String(error.statusCode))&&!/already exists/i.test(error.message))throw error},
  async downloadPhoto(ref){const {data,error}=await bucket.download(path(ref));if(error)throw error;return data},
  subscribe(fn){const channel=client.channel('hazeflow-'+space+'-'+userId).on('postgres_changes',{event:'*',schema:'public',table,filter:'user_id=eq.'+userId},fn).subscribe(status=>{if(status==='SUBSCRIBED')fn()});return ()=>client.removeChannel(channel)}
 };
}
