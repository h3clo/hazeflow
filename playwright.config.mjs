import {defineConfig,devices} from '@playwright/test';

const rawBase=process.env.E2E_BASE_URL||'http://127.0.0.1:5173';
const baseURL=rawBase.endsWith('/')?rawBase:rawBase+'/';
const againstPages=/github\.io/i.test(baseURL);

export default defineConfig({
 testDir:'./e2e',
 timeout:120_000,
 expect:{timeout:15_000},
 fullyParallel:false,
 workers:1,
 retries:againstPages?1:0,
 reporter:[['list'],['json',{outputFile:'/opt/cursor/artifacts/activity-2-e2e-results.json'}]],
 use:{
  baseURL,
  trace:'retain-on-failure',
  screenshot:'only-on-failure',
  video:'retain-on-failure'
 },
 projects:[
  {name:'desktop',use:{...devices['Desktop Chrome'],viewport:{width:1280,height:900}}},
  {name:'mobile-375',use:{
   browserName:'chromium',
   ...devices['Pixel 5'],
   viewport:{width:375,height:812},
   isMobile:true,
   hasTouch:true
  }}
 ],
 webServer:againstPages?undefined:{
  command:'npm run dev -- --host 127.0.0.1 --port 5173 --strictPort',
  url:'http://127.0.0.1:5173',
  reuseExistingServer:true,
  timeout:120_000
 }
});
