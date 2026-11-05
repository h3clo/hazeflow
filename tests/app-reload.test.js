import test from 'node:test';
import assert from 'node:assert/strict';
import {canReloadApp,freshAppURL} from '../app-reload.js';
test('reload requires finished sync and an empty current queue, including photo and conflict checks',()=>{
 assert.equal(canReloadApp({phase:'synced'},{pending:0,conflicts:[]}),true);
 for(const phase of ['photos','syncing','pending','offline','error','conflict','loading'])assert.equal(canReloadApp({phase},{pending:0,conflicts:[]}),false);
 assert.equal(canReloadApp({phase:'synced'},{pending:1,conflicts:[]}),false);
 assert.equal(canReloadApp({phase:'synced'},{pending:0,conflicts:[{}]}),false);
 assert.equal(canReloadApp({phase:'synced'},undefined),false);
});
test('refresh stays on the same app and preserves device, sandbox and navigation context',()=>{
 const url=new URL(freshAppURL('https://h3clo.github.io/hazeflow/?sandbox&device=test&v=old#money',123));
 assert.equal(url.origin,'https://h3clo.github.io');assert.equal(url.pathname,'/hazeflow/');
 assert.equal(url.searchParams.get('device'),'test');assert.equal(url.searchParams.has('sandbox'),true);
 assert.deepEqual(url.searchParams.getAll('v'),['123']);assert.equal(url.hash,'#money');
});
