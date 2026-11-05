export function canReloadApp(status,queue){return status?.phase==='synced'&&!!queue&&queue.pending===0&&!queue.conflicts?.length;}
export function freshAppURL(href,stamp=Date.now()){const url=new URL(href);url.searchParams.set('v',String(stamp));return url.href;}
