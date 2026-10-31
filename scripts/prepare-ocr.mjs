import {mkdir,copyFile,readdir,writeFile} from 'node:fs/promises';
const out=new URL('../public/ocr/',import.meta.url),root=new URL('../node_modules/',import.meta.url);await mkdir(out,{recursive:true});
await copyFile(new URL('tesseract.js/dist/worker.min.js',root),new URL('worker.min.js',out));
for(const name of await readdir(new URL('tesseract.js-core/',root)))if(/\.wasm(?:\.js)?$/.test(name))await copyFile(new URL('tesseract.js-core/'+name,root),new URL(name,out));
for(const lang of ['kor','eng'])await copyFile(new URL(`@tesseract.js-data/${lang}/4.0.0_best_int/${lang}.traineddata.gz`,root),new URL(lang+'.traineddata.gz',out));
await copyFile(new URL('tesseract.js/LICENSE.md',root),new URL('LICENSE-tesseract.txt',out));

await copyFile(new URL('tesseract.js-core/LICENSE',root),new URL('LICENSE-core.txt',out));

await writeFile(new URL('NOTICE.txt',out),'Local OCR uses Tesseract.js 7.0.0 and Tesseract.js-core. License texts are included in this directory. Language models (kor/eng) are from @tesseract.js-data packages, Apache-2.0. Sources: https://github.com/naptha/tesseract.js and https://github.com/naptha/tessdata.\n');
