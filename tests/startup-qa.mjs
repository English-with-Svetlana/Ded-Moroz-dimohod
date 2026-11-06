import fs from 'node:fs';import assert from 'node:assert/strict';
const target=await(await fetch('http://127.0.0.1:9223/json/new?about:blank',{method:'PUT'})).json();const ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}));let id=0;const pending=new Map(),errors=[],report={runs:[],errors};ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){let p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result);}else if(m.method==='Runtime.exceptionThrown'||m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')errors.push(m.params);};
const call=(method,params={})=>new Promise((resolve,reject)=>{let n=++id;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}));});
async function evaluate(expression){const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;}
async function wait(expression){let end=Date.now()+15000;while(Date.now()<end){if(await evaluate(expression))return;await new Promise(r=>setTimeout(r,35));}throw Error('Timed out '+expression);}
async function click(id){const p=await evaluate(`(()=>{const r=document.getElementById('${id}').getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`);await call('Input.dispatchMouseEvent',{type:'mousePressed',...p,button:'left',clickCount:1});await call('Input.dispatchMouseEvent',{type:'mouseReleased',...p,button:'left',clickCount:1});}
async function viewport(width,height){await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});await evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');}
let held=[],forceFailure=false;
ws.addEventListener('message',async e=>{const m=JSON.parse(e.data);if(m.method==='Fetch.requestPaused'){if(forceFailure)await call('Fetch.failRequest',{requestId:m.params.requestId,errorReason:'Failed'});else held.push(m.params.requestId);}});
try{
 await call('Runtime.enable');await call('Page.enable');await call('Page.bringToFront');await call('Network.enable');await call('Network.setCacheDisabled',{cacheDisabled:true});
 await call('Page.addScriptToEvaluateOnNewDocument',{source:`window.decodedDOM=new WeakSet();const originalDecode=HTMLImageElement.prototype.decode;HTMLImageElement.prototype.decode=function(){return originalDecode.call(this).then(v=>{if(this.isConnected)decodedDOM.add(this);return v;});};`});
 await call('Fetch.enable',{patterns:[{urlPattern:'*ded-*.webp',requestStage:'Request'}]});
 for(const path of ['index.html','docs/index.html','docs/iframe.html']){
  held=[];await viewport(path.endsWith('iframe.html')?1000:1920,path.endsWith('iframe.html')?700:1080);await call('Page.navigate',{url:'http://127.0.0.1:8765/'+path});
  const child=path.endsWith('iframe.html'),scope=child?'document.querySelector("iframe").contentWindow':'window';
  await wait(child?'document.querySelector("iframe")?.contentWindow.gameDiagnostics?.().state==="loading"':'window.gameDiagnostics?.().state==="loading"');
  if(child)await evaluate('Object.assign(document.querySelector("iframe").style,{width:"640px",height:"360px"})');
  await new Promise(r=>setTimeout(r,650));assert.ok(held.length,'Sleigh request was held to simulate cold/slow loading');
  const hidden=await evaluate(`(()=>{const w=${scope},d=w.document;return {stage:w.getComputedStyle(d.getElementById('stage')).visibility,start:d.getElementById('welcome').hidden,sleigh:d.getElementById('sleigh').hidden,busy:d.getElementById('stage').getAttribute('aria-busy'),state:w.gameDiagnostics().state};})()`);
  assert.deepEqual(hidden,{stage:'hidden',start:true,sleigh:true,busy:'true',state:'loading'});
  if(path==='docs/index.html'){const shot=await call('Page.captureScreenshot',{format:'png'});fs.writeFileSync('/tmp/frost-startup-loading.png',Buffer.from(shot.data,'base64'));}
  for(const requestId of held)await call('Fetch.continueRequest',{requestId});held=[];
  await wait(`${scope}.gameDiagnostics().state==="ready"`);
  const ready=await evaluate(`(()=>{const w=${scope},d=w.document,critical=[...d.querySelectorAll('#world>img:first-child,.sky-band img:first-child'),d.getElementById('sleigh'),d.getElementById('question-art')];return {stage:w.getComputedStyle(d.getElementById('stage')).visibility,start:d.getElementById('welcome').hidden,disabled:d.getElementById('start').disabled,busy:d.getElementById('stage').getAttribute('aria-busy'),critical:critical.map(im=>({decoded:w.decodedDOM.has(im),complete:im.complete,width:im.naturalWidth})),stageSize:[d.getElementById('stage').getBoundingClientRect().width,d.getElementById('stage').getBoundingClientRect().height]};})()`);
  assert.equal(ready.stage,'visible');assert.equal(ready.start,false);assert.equal(ready.disabled,false);assert.equal(ready.busy,'false');assert.ok(ready.critical.length===5&&ready.critical.every(im=>im.decoded&&im.complete&&im.width>0));
  assert.deepEqual(ready.stageSize,child?[640,360]:[1920,1080]);
  if(!child){await click('start');await wait('gameDiagnostics().state==="question"');}
  report.runs.push({path,delayedLoading:hidden,ready});
 }
 assert.equal(errors.length,0);report.successfulStartupConsoleErrors=0;
 // Keep a real loading failure visible without revealing the incomplete scene or Start.
 forceFailure=true;await call('Page.navigate',{url:'http://127.0.0.1:8765/docs/index.html'});await wait('document.getElementById("error")&&!document.getElementById("error").hidden');
 report.failureState=await evaluate(`({stage:getComputedStyle(document.getElementById('stage')).visibility,start:document.getElementById('welcome').hidden,sleigh:document.getElementById('sleigh').hidden,error:getComputedStyle(document.getElementById('error')).visibility,message:document.getElementById('error').textContent})`);
 assert.equal(report.failureState.stage,'hidden');assert.equal(report.failureState.start,true);assert.equal(report.failureState.sleigh,true);assert.equal(report.failureState.error,'visible');assert.ok(report.failureState.message.includes('Missing or unreadable asset: ded.gif'));
 assert.equal(errors.length,1,'Only the deliberately failed sleigh reports a console error');report.expectedFailureConsoleErrors=1;report.pass=true;
 console.log('PASS: root, hashed production and 640×360 production iframe remain masked during delayed cold-cache loading; actual DOM images decode before revealing Start; first question works; deliberate load failure remains masked with a visible error. No delivery playthroughs run.');
}catch(e){report.pass=false;report.failure=String(e);throw e;}finally{await call('Fetch.disable');fs.writeFileSync('tests/startup-results.json',JSON.stringify(report,null,2));await call('Page.close');ws.close();}
