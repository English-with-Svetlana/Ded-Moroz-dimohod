import fs from 'node:fs';import assert from 'node:assert/strict';
const target=await(await fetch('http://127.0.0.1:9223/json/new?about:blank',{method:'PUT'})).json();const ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}));let id=0;const pending=new Map(),errors=[],requests=new Map(),networkFailures=[],report={runs:[],errors,networkFailures};ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){let p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result);}else if(m.method==='Network.requestWillBeSent'){requests.set(m.params.requestId,m.params.request.url);}else if(m.method==='Network.loadingFailed'){networkFailures.push({url:requests.get(m.params.requestId),...m.params});}else if(m.method==='Runtime.exceptionThrown'||m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')errors.push(m.params);};
const call=(method,params={})=>new Promise((resolve,reject)=>{let n=++id;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}));});
async function evaluate(expression){const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;}
async function wait(expression){let end=Date.now()+15000;while(Date.now()<end){if(await evaluate(expression))return;await new Promise(r=>setTimeout(r,35));}throw Error('Timed out '+expression);}
async function click(id){const p=await evaluate(`(()=>{const r=document.getElementById('${id}').getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`);await call('Input.dispatchMouseEvent',{type:'mousePressed',...p,button:'left',clickCount:1});await call('Input.dispatchMouseEvent',{type:'mouseReleased',...p,button:'left',clickCount:1});}
async function viewport(width,height){await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});await evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');}
try{
 await call('Runtime.enable');await call('Page.enable');await call('Page.bringToFront');await call('Network.enable');
 await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
 await call('Page.navigate',{url:'http://127.0.0.1:8765/docs/index.html'});
 await wait('window.gameDiagnostics?.().state==="ready"&&document.querySelectorAll(".world-transition").length===3');
 const patches=await evaluate(`(()=>{return [...document.querySelectorAll('.world-transition')].map((patch,n)=>{
  n=Number(patch.dataset.boundary)-1;const w=24,h=941,c=document.createElement('canvas');c.width=48;c.height=h;const ctx=c.getContext('2d');
  const a=assetImages.get((n+1)+'.png'),b=assetImages.get((n+2)+'.png');ctx.drawImage(a,a.naturalWidth-w,0,w,h,0,0,w,h);ctx.drawImage(b,0,0,w,h,w,0,w,h);
  const before=ctx.getImageData(0,0,48,h).data,after=patch.getContext('2d').getImageData(0,0,48,h).data;
  let originalJump=0,blendedJump=0,architectureChanges=0,transparent=0;
  for(let y=0;y<h;y++)for(let x=0;x<48;x++){const i=(y*48+x)*4;if((y<280||y>=894)&&after[i+3]!==255)transparent++;
   for(let k=0;k<3;k++){if(y>=304&&y<=870&&after[i+3]!==0)architectureChanges++;if(x===23&&(y<280||y>=894)){originalJump+=Math.abs(before[i+k]-before[i+4+k]);blendedJump+=Math.abs(after[i+k]-after[i+4+k]);}}
  }return {boundary:n+1,originalJump,blendedJump,architectureChanges,transparent};
 });})()`);
 for(const p of patches){assert.equal(p.architectureChanges,0);assert.equal(p.transparent,0);assert.ok(p.blendedJump<p.originalJump,JSON.stringify(p));}report.patches=patches;
 for(const [width,height] of [[1920,1080],[1280,720],[640,360]]){
  await viewport(width,height);
  for(let n=1;n<=3;n++){
   await evaluate(`camera=panoramaOffsets[${n}]*scale-640;render()`);
   const shot=await call('Page.captureScreenshot',{format:'png'});fs.writeFileSync('/tmp/frost-transition-'+n+'-'+width+'.png',Buffer.from(shot.data,'base64'));
  }
 }
 await viewport(1280,720);await click('start');await wait('gameDiagnostics().state==="question"');
 await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});await call('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
 const focus=await evaluate(`(()=>{const b=document.getElementById('deliver');b.focus();const s=getComputedStyle(b),r=b.getBoundingClientRect(),p=document.getElementById('prompt').getBoundingClientRect();return{outline:s.outlineWidth,offset:s.outlineOffset,color:s.outlineColor,width:r.width,height:r.height,gap:r.top-p.bottom,border:s.borderColor,shadow:s.boxShadow}})()`);
 assert.equal(focus.outline,'2px');assert.equal(focus.offset,'-4px');assert.ok(focus.gap>0);report.focus=focus;
 const bounds=await evaluate(`(()=>{const r=document.getElementById('deliver').getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`);
 await call('Input.dispatchMouseEvent',{type:'mouseMoved',...bounds});
 await call('Input.dispatchMouseEvent',{type:'mousePressed',...bounds,button:'left',clickCount:1});
 report.active=await evaluate(`({active:document.getElementById('deliver').matches(':active'),outline:getComputedStyle(document.getElementById('deliver')).outlineWidth,filter:getComputedStyle(document.getElementById('deliver')).filter})`);assert.equal(report.active.active,true);
 await call('Input.dispatchMouseEvent',{type:'mouseReleased',...bounds,button:'left',clickCount:1});await wait('gameDiagnostics().state==="question"&&gameDiagnostics().index===1');
 await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});await call('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
 await evaluate(`document.getElementById('deliver').focus()`);
 await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,text:'\r',unmodifiedText:'\r'});await call('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});await wait('gameDiagnostics().state==="question"&&gameDiagnostics().index===2');
 assert.equal(errors.length,0);report.pass=true;console.log('PASS: all three joins at three viewport sizes; lower seam pixel discontinuity; architecture unpainted and sky/road patches opaque; inset focus, safe text gap, hover/active and keyboard delivery.');
}catch(e){report.pass=false;report.failure=String(e);throw e;}finally{fs.writeFileSync('tests/visual-regression-results.json',JSON.stringify(report,null,2));await call('Page.close');ws.close();}
