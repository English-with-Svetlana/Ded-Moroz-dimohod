import fs from 'node:fs';
import assert from 'node:assert/strict';
const target=await (await fetch('http://127.0.0.1:9223/json/new?about:blank',{method:'PUT'})).json();
const ws=new WebSocket(target.webSocketDebuggerUrl);
await new Promise(r=>ws.addEventListener('open',r,{once:true}));
let id=0;const pending=new Map(),errors=[];
ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result);}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails);else if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')errors.push(m.params.args);});
const call=(method,params={})=>new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}));});
try{
 await call('Runtime.enable');await call('Page.enable');await call('Page.navigate',{url:'http://127.0.0.1:8765/tests/assets-browser.html'});
 let report;const deadline=Date.now()+45000;
 while(Date.now()<deadline){const r=await call('Runtime.evaluate',{expression:'document.getElementById("results")?.textContent',returnByValue:true});if(r.result.value?.startsWith('{')){report=JSON.parse(r.result.value);break;}await new Promise(r=>setTimeout(r,200));}
 assert.ok(report,'Browser test timed out');report.browserExceptions=errors;
 const output=process.argv[2]||'/tmp/frost-browser-report.json';fs.writeFileSync(output,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));assert.equal(report.pass,true);assert.equal(errors.length,0);
}finally{await call('Page.close');ws.close();}
