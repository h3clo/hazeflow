import test from 'node:test';
import assert from 'node:assert/strict';
import {photoFormat} from '../photos.js';
test('MIME 정보가 없는 아이폰 사진과 jpg 별칭을 인식한다',async()=>{assert.equal(await photoFormat(new Blob([Uint8Array.from([255,216,255])])),'image/jpeg');assert.equal(await photoFormat(new Blob(['0000ftypheic0000'])),'image/heic');assert.equal(await photoFormat(new Blob(['jpeg'],{type:'image/jpg'})),'image/jpeg')});
test('사진이 아닌 파일을 거부한다',async()=>assert.rejects(()=>photoFormat(new Blob(['not an image']))));
