import {mkdir,writeFile,open,access} from 'node:fs/promises';
import {homedir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
if(process.platform!=='darwin')throw Error('이 자동 시작 설정은 macOS용이에요.');
const root=fileURLToPath(new URL('../',import.meta.url));for(const name of ['.env.local','.env.toss.local','.env.toss-publisher.local'])await access(root+name);
const dir=homedir()+'/Library/LaunchAgents',logs=homedir()+'/Library/Logs/HazeFlow',label='io.h3clo.hazeflow.toss-publisher',path=dir+'/'+label+'.plist';await mkdir(dir,{recursive:true});await mkdir(logs,{recursive:true,mode:0o700});for(const file of ['toss-publisher.log','toss-publisher-error.log']){const f=await open(logs+'/'+file,'a',0o600);await f.close()}
const xml=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
let node=process.execPath;try{await access('/opt/homebrew/bin/node');node='/opt/homebrew/bin/node'}catch{}
await writeFile(path,`<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd"><plist version="1.0"><dict><key>Label</key><string>${label}</string><key>ProgramArguments</key><array><string>${xml(node)}</string><string>${xml(root+'server/toss-publisher.mjs')}</string></array><key>WorkingDirectory</key><string>${xml(root)}</string><key>RunAtLoad</key><true/><key>KeepAlive</key><dict><key>SuccessfulExit</key><false/></dict><key>ThrottleInterval</key><integer>60</integer><key>ProcessType</key><string>Background</string><key>StandardOutPath</key><string>${xml(logs+'/toss-publisher.log')}</string><key>StandardErrorPath</key><string>${xml(logs+'/toss-publisher-error.log')}</string></dict></plist>`,{mode:0o600});
const domain='gui/'+process.getuid();spawnSync('launchctl',['bootout',domain+'/'+label],{stdio:'ignore'});const result=spawnSync('launchctl',['bootstrap',domain,path],{encoding:'utf8'});if(result.status!==0)throw Error('자동 시작 등록에 실패했어요.');console.log('토스 자동 동기화를 등록했어요. 로그인 시 자동 실행되며 브라우저 창이 필요하지 않아요.');
