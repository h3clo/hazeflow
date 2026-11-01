// Deduplicate concurrent reads and release URLs when their account/store is left.
export function createPhotoUrlCache(get,{create=blob=>URL.createObjectURL(blob),revoke=url=>URL.revokeObjectURL(url)}={}){
 const entries=new Map();let disposed=false;
 function invalidate(id){const entry=entries.get(id);if(!entry)return;entry.valid=false;if(entry.url)revoke(entry.url);entries.delete(id)}
 function url(id){if(disposed)return Promise.resolve(null);const previous=entries.get(id);if(previous)return previous.promise;const entry={valid:true,url:null,promise:null};entries.set(id,entry);entry.promise=(async()=>{try{const blob=await get(id);if(!blob||!entry.valid||disposed)return null;entry.url=create(blob);return entry.url}finally{if(!entry.url&&entries.get(id)===entry)entries.delete(id)}})();return entry.promise}
 return {url,invalidate,dispose(){disposed=true;for(const id of entries.keys())invalidate(id)}};
}
