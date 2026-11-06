import vm from 'node:vm';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const nodes=new Map();function el(id){if(!nodes.has(id))nodes.set(id,{id,hidden:false,disabled:false,style:{},children:[],clientWidth:1280,textContent:'',append(n){this.children.push(n)},remove(){},focus(){},addEventListener(){},getBoundingClientRect(){const x=this.id==='sleigh'?Number(this.style.transform?.match(/translate3d\(([-.\d]+)px/)?.[1]||0):0;return {left:x,right:x+(this.id==='sleigh'?573.84:1280),width:this.id==='sleigh'?573.84:1280};}});return nodes.get(id)}
const errors=[];let clock=0;let imagePaths=[];
const context={console:{error:e=>errors.push(e)},document:{getElementById:el,createElement:()=>el('n'+nodes.size)},window:{},location:{search:''},URLSearchParams,matchMedia:()=>({matches:true}),ResizeObserver:class{observe(){}},Image:class{decode(){return Promise.resolve()}set src(v){imagePaths.push(v);queueMicrotask(()=>this.onload?.())}},requestAnimationFrame:fn=>queueMicrotask(()=>fn(clock+=50)),setTimeout:fn=>{queueMicrotask(fn)},Promise};
const scriptPath=process.argv[2]||'docs/'+fs.readFileSync('docs/index.html','utf8').match(/src="([^"]*game-[^"]+\.js)"/)[1];
vm.createContext(context);vm.runInContext(fs.readFileSync(scriptPath,'utf8'),context);
async function settled(){for(let i=0;i<150;i++)await Promise.resolve()}
await settled();const diag=()=>context.window.gameDiagnostics();assert.equal(diag().state,'ready');assert.equal(diag().questions.length,16);assert.equal(diag().targets.length,16);assert.deepEqual(Array.from(diag().giftSequence),[1,2,3,4,5,1,2,3,4,5,1,2,3,4,5,1]);
await el('start').onclick();assert.equal(diag().state,'question');
const deliveries=[];
for(let i=0;i<16;i++){
 assert.equal(diag().index,i);assert.equal(el('prompt').textContent,diag().questions[i]);const d=diag();assert.ok(Math.abs(d.formation.x+d.origin.x-d.target.x)<.001);assert.ok(d.target.y>d.formation.y+d.origin.y);
 const run=el('deliver').onclick();assert.equal(diag().state,'delivering');await el('deliver').onclick();await run;deliveries.push(el('gift').src);assert.equal(el('gift').hidden,true);
}
assert.equal(diag().state,'complete');assert.equal(el('ending').hidden,false);assert.ok(!fs.readFileSync('index.html','utf8').includes('id="restart"'));await el('start').onclick();assert.equal(diag().index,15);assert.equal(diag().state,'complete');assert.equal(errors.length,0);
for(const p of imagePaths)assert.ok(fs.existsSync((scriptPath.startsWith('docs/')?'docs/':'')+p),p);
for(let i=0;i<16;i++)assert.ok(deliveries[i].includes(`gift-${i%5+1}-`));
console.log('PASS: preload references, 16 questions/targets, gift order, Start, all deliveries/transitions, click lock, ending without Restart, terminal state, shared origin/target x alignment.');console.log('DOM simulation only; not a browser rendering test.');
