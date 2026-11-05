import {assertRecordUnchanged} from './record-edit.js';
export function replaceFavorite(favorites,entry,opened){
 const current=favorites.find(row=>row.id===entry.id);
 assertRecordUnchanged(current,opened);
 return favorites.map(row=>row.id===entry.id?entry:row);
}
