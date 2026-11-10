/** YouTube link favorites for home-training days. Open externally; no in-app player. */

const HOSTS=new Set(['youtube.com','youtu.be','m.youtube.com','music.youtube.com']);

export function normalizeVideoUrl(raw){
 const value=String(raw??'').trim();
 if(!value||value.length>2000)return null;
 let url;
 try{url=new URL(value)}catch{return null}
 if(url.protocol!=='https:')return null;
 const host=url.hostname.replace(/^www\./i,'').toLowerCase();
 if(!HOSTS.has(host))return null;
 if(host==='youtu.be'){
  const id=url.pathname.split('/').filter(Boolean)[0];
  if(!id||id.length>64)return null;
 }
 return url.toString();
}

export function validVideoFavoriteFields(favorite){
 if(!favorite||typeof favorite!=='object'||Array.isArray(favorite))return false;
 if(favorite.kind!=='영상')return false;
 if(typeof favorite.title!=='string'||!favorite.title.trim()||favorite.title.length>100)return false;
 if(!normalizeVideoUrl(favorite.text))return false;
 if(favorite.note!==undefined&&(typeof favorite.note!=='string'||favorite.note.length>500))return false;
 if(favorite.lastOpenedAt!==undefined&&!(Number.isFinite(favorite.lastOpenedAt)&&favorite.lastOpenedAt>0))return false;
 if(favorite.nutrition!==undefined)return false;
 return true;
}

export function recentVideoFavorites(favorites,limit=3){
 const rows=(favorites||[]).filter(item=>item?.kind==='영상');
 return rows
  .map((favorite,index)=>({favorite,index,opened:Number(favorite.lastOpenedAt)||0}))
  .sort((a,b)=>b.opened-a.opened||a.index-b.index)
  .slice(0,Math.max(0,limit))
  .map(row=>row.favorite);
}

export function markVideoOpened(favorites,id,at=Date.now()){
 return (favorites||[]).map(item=>{
  if(item.id!==id||item.kind!=='영상')return item;
  return {...item,lastOpenedAt:at};
 });
}

export function videoFavoriteCount(favorites){
 return (favorites||[]).filter(item=>item?.kind==='영상').length;
}
