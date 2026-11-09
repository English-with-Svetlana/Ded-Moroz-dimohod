import fs from 'node:fs';
import assert from 'node:assert/strict';
const target=await(await fetch('http://127.0.0.1:9223/json/new?about:blank',{method:'PUT'})).json();
const socket=new WebSocket(target.webSocketDebuggerUrl);await new Promise(r=>socket.addEventListener('open',r,{once:true}));
let id=0;const pending=new Map(),errors=[],report={checks:[],errors};
socket.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result);}else if(m.method==='Runtime.exceptionThrown'||(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error'))errors.push(m.params);});
const call=(method,params={})=>new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});socket.send(JSON.stringify({id:n,method,params}));});
async function evaluate(expression){const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;}
async function wait(expression){const until=Date.now()+15000;while(Date.now()<until){if(await evaluate(expression))return;await new Promise(r=>setTimeout(r,50));}throw Error('Timed out: '+expression);}
async function viewport(width,height){await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});await evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');}
const near=(a,b,label,tolerance=1)=>assert.ok(Math.abs(a-b)<=tolerance,`${label}: ${a} vs ${b}`);
function measurements(w){const d=w.document,rect=id=>d.getElementById(id).getBoundingClientRect().toJSON(),stage=rect('stage'),frame=rect('frame'),modal=d.querySelector('#start').getBoundingClientRect().toJSON(),world=rect('world'),sleigh=rect('sleigh'),diag=w.gameDiagnostics();return {viewport:[w.innerWidth,w.innerHeight],stage,frame,modal,world,sleigh,scale:stage.width/1280,state:diag.state,index:diag.index,camera:diag.camera,originX:stage.x+(diag.formation.x+diag.origin.x)*stage.width/1280,targetX:stage.x+diag.target.x*stage.width/1280,targetY:stage.y+diag.target.y*stage.height/720,scroll:[d.documentElement.scrollWidth,d.documentElement.scrollHeight],transform:d.getElementById('stage').style.transform};}
function check(m,intro){const [w,h]=m.viewport,expectedW=Math.min(w,h*16/9),expectedH=expectedW*9/16;near(m.frame.width,expectedW,'frame width');near(m.frame.height,expectedH,'frame height');near(m.stage.width,expectedW,'stage width');near(m.stage.height,expectedH,'stage height');near(m.stage.x,(w-expectedW)/2,'stage centre x');near(m.stage.y,(h-expectedH)/2,'stage centre y');assert.ok(m.scroll[0]<=w&&m.scroll[1]<=h,'No browser scrollbars');near(m.world.bottom,m.stage.bottom,'Panorama bottom');near(m.world.height,720*m.scale,'Panorama aspect');if(intro){near(m.modal.x+m.modal.width/2,m.stage.x+m.stage.width/2,'Modal centre x');near(m.modal.y+m.modal.height/2,m.stage.y+m.stage.height/2,'Modal centre y');}else{near(m.originX,m.targetX,'Delivery alignment',.05);assert.ok(m.targetY>m.stage.y&&m.targetY<m.stage.bottom);} }
try{
 await call('Page.enable');await call('Runtime.enable');await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
 for(const path of ['index.html','docs/index.html']){
  await viewport(1920,1080);await call('Page.navigate',{url:'http://127.0.0.1:8765/'+path});await wait('window.gameDiagnostics?.().state==="ready"');
  for(const [width,height] of [[1920,1080],[1600,900],[1280,720],[1440,1000],[2560,1080],[768,1024]]){
   await viewport(width,height);const m=await evaluate(`(${measurements})(window)`);check(m,true);report.checks.push({path,phase:'intro',...m});
   if(path==='index.html'&&width===1920){const shot=await call('Page.captureScreenshot',{format:'png'});fs.writeFileSync('/tmp/frost-layout-intro.png',Buffer.from(shot.data,'base64'));}
  }
  await evaluate('document.getElementById("start").click()');await wait('gameDiagnostics().state==="question"');const before=await evaluate('JSON.stringify(gameDiagnostics())');
  for(const [width,height] of [[1920,1080],[1600,900],[1280,720],[640,360],[768,1024]]){
   await viewport(width,height);const m=await evaluate(`(${measurements})(window)`);check(m,false);assert.equal(await evaluate('JSON.stringify(gameDiagnostics())'),before,'Resize preserves game coordinates/state');report.checks.push({path,phase:'question',...m});
   if(path==='index.html'&&width===1920){const shot=await call('Page.captureScreenshot',{format:'png'});fs.writeFileSync('/tmp/frost-layout-question.png',Buffer.from(shot.data,'base64'));}
  }
  await evaluate('document.getElementById("deliver").click()');await wait('gameDiagnostics().state==="question"&&gameDiagnostics().index===1');check(await evaluate(`(${measurements})(window)`),false);
 }
 await viewport(1000,700);await call('Page.navigate',{url:'http://127.0.0.1:8765/iframe.html'});await wait('document.querySelector("iframe")?.contentWindow.gameDiagnostics?.().state==="ready"');
 await evaluate('Object.assign(document.querySelector("iframe").style,{width:"640px",height:"360px"})');await evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
 let m=await evaluate(`(${measurements})(document.querySelector('iframe').contentWindow)`);check(m,true);report.checks.push({path:'iframe.html',phase:'640×360 iframe intro',...m});
 await evaluate('document.querySelector("iframe").contentDocument.getElementById("start").click()');await wait('document.querySelector("iframe").contentWindow.gameDiagnostics().state==="question"');m=await evaluate(`(${measurements})(document.querySelector('iframe').contentWindow)`);check(m,false);report.checks.push({path:'iframe.html',phase:'640×360 iframe question',...m});
 assert.equal(errors.length,0);report.pass=true;
 console.log(`PASS: ${report.checks.length} Chrome layout checks; main + docs; 1920×1080, 1600×900, 1280×720, other ratios and 640×360 iframe; centred modal, no scrollbars, unchanged resize coordinates, aligned delivery origin, working Deliver; no JS errors.`);
} catch(e){report.pass=false;report.failure=String(e);throw e;} finally{fs.writeFileSync('tests/layout-results.json',JSON.stringify(report,null,2));await call('Page.close');socket.close();}
