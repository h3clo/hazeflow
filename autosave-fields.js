const value=v=>v==null?'':String(v);
export function mergeAutosaveFields(current,expected,patch,existed){
 if(existed&&!current)throw Error('다른 화면에서 삭제된 기록이에요. 입력 내용을 보관하고 다시 열어주세요.');
 for(const name of Object.keys(patch))if(value(current?.[name])!==value(expected[name])&&value(current?.[name])!==value(patch[name]))throw Error('다른 기기에서 같은 항목을 수정했어요. 입력 내용을 보관하고 다시 열어주세요.');
 return {...current,...patch};
}
// Serialize each form's saves so rapid typing compares against its last accepted write.
export function createFieldAutosave({initial,fields,existed=false,isCurrent,save}){
 let accepted={...initial},tail=Promise.resolve();
 return values=>{const snapshot=Object.fromEntries(fields.filter(k=>Object.hasOwn(values,k)).map(k=>[k,values[k]]));const run=async()=>{
  if(!isCurrent())return false;
  const patch=Object.fromEntries(Object.entries(snapshot).filter(([k,v])=>value(v)!==value(accepted[k])));
  if(!Object.keys(patch).length)return true;
  const expected={...accepted};let wrote=false;
  const ok=await save(current=>{const next=mergeAutosaveFields(current,expected,patch,existed);wrote=true;return next});
  if(!ok||!wrote)return false;
  accepted={...accepted,...patch};existed=true;return true;
 };const result=tail.then(run);tail=result.catch(()=>{});return result};
}
