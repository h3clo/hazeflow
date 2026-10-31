import {createClient} from '@supabase/supabase-js';
export function cloudConfig(env={}){const url=env.VITE_SUPABASE_URL,key=env.VITE_SUPABASE_PUBLISHABLE_KEY;if(typeof url!=='string'||!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url)||typeof key!=='string')return null;let publicKey=key.startsWith('sb_publishable_');if(key.startsWith('eyJ')){try{publicKey=JSON.parse(atob(key.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).role==='anon'}catch{}}return publicKey?{url,key}:null}
export function authStorage(local,temporary,preferenceKey='hazeflow-remember'){
 let remember=local.getItem(preferenceKey)!=='false';
 return {getItem(key){return local.getItem(key)||temporary.getItem(key)},setItem(key,value){local.removeItem(key);temporary.removeItem(key);(remember||key.endsWith('-code-verifier')?local:temporary).setItem(key,value)},removeItem(key){local.removeItem(key);temporary.removeItem(key)},setRemember(value){remember=!!value;local.setItem(preferenceKey,String(remember))},remember:()=>remember};
}
export function makeCloud(config){const sessionStore=authStorage(localStorage,sessionStorage);return {sessionStore,client:createClient(config.url,config.key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:'pkce',storageKey:'hazeflow-auth-v1',storage:sessionStore}})}}
export function cloudTransport(client,userId,space='main'){
 const table='hazeflow_records',bucket=client.storage.from('hazeflow-photos'),path=ref=>`${userId}/${space}/${ref.id}.jpg`;
 return {
  async pull(){const rows=[];for(let page=0;;page++){const {data,error}=await client.from(table).select('item_key,payload,deleted,version,mutation_id').eq('user_id',userId).eq('space',space).order('item_key').range(page*500,page*500+499);if(error)throw error;rows.push(...data);if(data.length<500)return rows}},
  async push(ops){const {data,error}=await client.rpc('hazeflow_apply',{p_space:space,p_changes:ops});if(error)throw error;return data},
  async uploadPhoto(ref,blob){const {error}=await bucket.upload(path(ref),blob,{contentType:'image/jpeg',upsert:false,cacheControl:'31536000'});if(error&&!['409','Duplicate'].includes(String(error.statusCode))&&!/already exists/i.test(error.message))throw error},
  async downloadPhoto(ref){const {data,error}=await bucket.download(path(ref));if(error)throw error;return data},
  subscribe(fn){const channel=client.channel('hazeflow-'+space+'-'+userId).on('postgres_changes',{event:'*',schema:'public',table,filter:'user_id=eq.'+userId},fn).subscribe();return ()=>client.removeChannel(channel)}
 };
}
