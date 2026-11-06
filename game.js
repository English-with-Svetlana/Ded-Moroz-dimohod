'use strict';
const manifest=/*ASSET_MANIFEST*/{"1.png": "docs/assets/1-325bf4af93fb.webp", "2.png": "docs/assets/2-07e1f3a9b9d3.webp", "3.png": "docs/assets/3-85a29c4ff2fb.webp", "4.png": "docs/assets/4-38169e487841.webp", "ded.gif": "docs/assets/ded-79fac4490dfe.webp", "frame.png": "docs/assets/frame-dc502f93c232.webp", "frame 2.png": "docs/assets/frame-2-c8b35c375f21.webp", "gift 1.png": "docs/assets/gift-1-4bcfcb6ba67d.webp", "gift 2.png": "docs/assets/gift-2-c1e964731bc0.webp", "gift 3.png": "docs/assets/gift-3-b73ef948402c.webp", "gift 4.png": "docs/assets/gift-4-388621c45886.webp", "gift 5.png": "docs/assets/gift-5-c0835b69a0ac.webp"};
const asset=n=>{if(!manifest[n])throw new Error(`Asset manifest entry missing: ${n}`);return encodeURI(manifest[n]);};
const questions=["When is Christmas?","Where does Santa live?","What's Santa's wife's name?","What do children send to Santa?","How many reindeer are there?","Who has a big red nose?","How many lists does Santa have?","Do all children get presents?","Who makes toys?","What tree do people decorate?","Say Merry Christmas in Spanish.","Say Merry Christmas in Italian.","Say Merry Christmas in French.","Say Merry Christmas in German.","Say Merry Christmas in Russian.","What do people put on top of a Christmas tree?"];
// Source pixels, individually measured at the dark opening of each MAIN chimney.
const targets=[ [515,191],[1007,195],[1458,195],[1931,195], [469,169],[969,165],[1464,173],[1960,169], [447,164],[920,165],[1419,165],[1921,165], [471,162],[944,162],[1441,165],[1941,162] ].map(([x,y],i)=>({x:x+Math.floor(i/4)*2172,y}));
const $=s=>document.getElementById(s), scale=.8, origin={x:52*.72,y:125*.72};
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
let index=0,state='loading',camera=0,formation={x:-620,y:60};
const calibrate=new URLSearchParams(location.search).has('calibrate');
try{if(calibrate){const saved=JSON.parse(localStorage.getItem('frost-targets'));if(saved?.length===16)saved.forEach((v,i)=>Object.assign(targets[i],v));}}catch{}
// Keep every game element in the existing 1280×720 coordinate system; 1920×1080 displays at 1.5×.
function resize(){ $('stage').style.transform=`scale(${$('frame').clientWidth/1280})`; }new ResizeObserver(resize).observe($('frame'));resize();
function render(){ $('world').style.transform=`translate3d(${-camera}px,0,0)`;$('sleigh').style.transform=`translate3d(${formation.x}px,${formation.y}px,0)`; }
function point(){return {x:targets[index].x*scale-camera,y:140.8+targets[index].y*scale};}
function tween(ms,step){return new Promise(resolve=>{let first;function tick(t){first??=t;const p=Math.min(1,(t-first)/(reduced?Math.min(ms,180):ms));step(p*p*(3-2*p));if(p<1)requestAnimationFrame(tick);else resolve();}requestAnimationFrame(tick);});}
async function fly(){state='flying';$('question').hidden=true;const start=camera,end=Math.max(0,Math.min(4*2172*scale-1280,targets[index].x*scale-400)),stopX=targets[index].x*scale-end,from={...formation};await ensureVisiblePanoramas(start,end);await tween(1900,p=>{camera=start+(end-start)*p;formation.x=from.x+(stopX-origin.x-from.x)*p;formation.y=from.y+(60-from.y)*p-18*Math.sin(p*Math.PI);render();});state='question';$('house').textContent=`House ${index+1} of 16`;$('prompt').textContent=questions[index];$('question').hidden=false;playChime('question');$('deliver').disabled=false;if(!calibrate)$('deliver').focus({preventScroll:true});showTarget();}
async function begin(){if(state!=='ready')return;unlockAudio();index=0;camera=0;formation={x:-620,y:60};$('welcome').hidden=true;$('ending').hidden=true;$('gift').hidden=true;render();await fly();}
async function flyAway(){
 state='departing';
 const sleigh=$('sleigh'),stageBounds=$('stage').getBoundingClientRect(),groupBounds=sleigh.getBoundingClientRect(),screenScale=stageBounds.width/1280;
 // Use the full rendered GIF box, including every reindeer, rather than its delivery origin.
 // Clear even its trailing left edge beyond the stage before hiding the formation.
 const distance=Math.max(0,(stageBounds.right-groupBounds.left)/screenScale)+24,startX=formation.x;
 await tween(Math.max(1400,distance/220*1000),p=>{formation.x=startX+distance*p;render();});
 sleigh.hidden=true;
}
async function deliver(){if(state!=='question')return;unlockAudio();state='delivering';$('deliver').disabled=true;$('question').hidden=true;const dest=point(),from={x:formation.x+origin.x,y:formation.y+origin.y};const gift=$('gift');try{await ensureAsset(`gift ${index%5+1}.png`);}catch(e){reportAssetFailure(e);return;}gift.src=asset(`gift ${index%5+1}.png`);gift.hidden=false;gift.style.opacity=1;await tween(1050,p=>{const y=from.y+(dest.y-from.y)*p;gift.style.transform=`translate3d(${from.x-22.5}px,${y-22.5}px,0) scale(${1-.67*p})`;gift.style.opacity=p>.88?(1-p)/.12:1;});gift.hidden=true;playChime('delivery');await sparkle(dest);if(index===15){await flyAway();await ensureAsset('frame.png');$('completion-art').src=asset('frame.png');state='complete';$('ending').hidden=false;window.Celebration?.start($('fireworks'),audioContext);}else{index++;await fly();}}
async function sparkle(p){const nodes=Array.from({length:10},(_,i)=>{const n=document.createElement('span');n.className='spark';n.textContent=i%3?'✧':'❄';$('particles').append(n);return n;});await tween(650,t=>nodes.forEach((n,i)=>{let a=i/10*Math.PI*2;n.style.transform=`translate(${p.x+Math.cos(a)*t*55-12}px,${p.y+Math.sin(a)*t*35-12}px)`;n.style.opacity=1-t;}));nodes.forEach(n=>n.remove());}
function showTarget(){if(!calibrate)return;let marker=$('marker');if(!marker){marker=document.createElement('div');marker.id='marker';marker.className='target';$('stage').append(marker);}let p=point();marker.style.left=p.x+'px';marker.style.top=p.y+'px';$('coords').textContent=`House ${index+1}: ${targets[index].x.toFixed(1)}, ${targets[index].y.toFixed(1)}. Click the opening to adjust.`;}
if(calibrate){$('calibration').hidden=false;$('calibration').innerHTML='<span id="coords">Start to review targets.</span> <button id="export">Export coordinates</button>';$('stage').addEventListener('pointerdown',e=>{if(state!=='question'||e.target.closest('button,#question,#calibration'))return;let rect=$('stage').getBoundingClientRect(),s=rect.width/1280;targets[index]={x:((e.clientX-rect.left)/s+camera)/scale,y:((e.clientY-rect.top)/s-140.8)/scale};localStorage.setItem('frost-targets',JSON.stringify(targets));showTarget();});$('export').onclick=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(targets,null,2)],{type:'application/json'}));a.download='chimney-targets.json';a.click();URL.revokeObjectURL(a.href);};}
// Created/resumed inside the Start/Restart gesture for Chrome and Safari autoplay rules.
let audioContext=null,audioMaster=null,voices=[];
function unlockAudio(){try{const Context=window.AudioContext||window.webkitAudioContext;if(!Context)return;if(!audioContext){audioContext=new Context();audioMaster=audioContext.createGain();audioMaster.gain.value=.24;audioMaster.connect(audioContext.destination);}if(audioContext.state==='suspended')audioContext.resume().catch(()=>{});}catch{/* Audio restrictions must never block the lesson. */}}
function playChime(kind){if(!audioContext||audioContext.state!=='running')return;try{const now=audioContext.currentTime;
// Quietly release previous notes, including when reduced motion speeds up a delivery.
for(const voice of voices){voice.gain.gain.cancelScheduledValues(now);voice.gain.gain.setTargetAtTime(0,now,.012);voice.osc.stop(now+.045);}voices=[];
const notes=kind==='question'?[784,1174.66]:[659.25,987.77,1318.51];
notes.forEach((frequency,i)=>{const osc=audioContext.createOscillator(),gain=audioContext.createGain(),start=now+.025+i*.035,end=start+.48;osc.type='sine';osc.frequency.value=frequency;gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(.085/(i+1),start+.018);gain.gain.exponentialRampToValueAtTime(.0001,end);osc.connect(gain);gain.connect(audioMaster);const voice={osc,gain};voices.push(voice);osc.onended=()=>{osc.disconnect();gain.disconnect();voices=voices.filter(v=>v!==voice);};osc.start(start);osc.stop(end+.02);});}catch{/* Continue normally if the browser's audio device is unavailable. */}}
$('start').onclick=begin;$('deliver').onclick=deliver;
// Share decoded resources and stage the large panoramas instead of decoding all four at startup.
const assetLoads=new Map(),assetImages=new Map(),panoramaNodes=Array.from({length:5},()=>[]);
function ensureAsset(name){if(!assetLoads.has(name)){const load=async()=>{for(let attempt=0;attempt<3;attempt++){try{await new Promise((resolve,reject)=>{const im=new Image();assetImages.set(name,im);im.decoding='async';const fail=e=>reject(new Error(`Missing or unreadable asset: ${name} (${im.currentSrc||im.src}; ${e?.message||e?.type||"decode failed"})`));im.onload=()=>im.decode().then(resolve,fail);im.onerror=fail;im.src=asset(name);});return;}catch(e){if(attempt===2)throw e;await new Promise(resolve=>setTimeout(resolve,150*(attempt+1)));}}};assetLoads.set(name,load());}return assetLoads.get(name);}
async function ensurePanorama(n){await ensureAsset(`${n}.png`);for(const im of panoramaNodes[n])if(!im.src)im.src=asset(`${n}.png`);}
async function ensureVisiblePanoramas(from,to){const width=2172*scale,first=Math.max(1,Math.floor(Math.min(from,to)/width)+1),last=Math.min(4,Math.floor((Math.max(from,to)+1280)/width)+1);for(let n=first;n<=last;n++)await ensurePanorama(n);}
function reportAssetFailure(e){$('loading').hidden=true;$('error').style.visibility='visible';$('error').hidden=false;$('error').textContent=e.message+' — please restore the supplied file and reload.';console.error(e);}
async function load(){try{
 for(let i=1;i<=4;i++){const im=new Image();im.decoding='async';panoramaNodes[i].push(im);$('world').append(im);}
 const sky=document.createElement('div');sky.className='sky-extension';
 for(const kind of ['cap','reflection']){const band=document.createElement('div');band.className='sky-band sky-'+kind;for(let i=1;i<=4;i++){const im=new Image();im.decoding='async';panoramaNodes[i].push(im);band.append(im);}sky.append(band);}$('world').append(sky);
 render();
 await Promise.all(['1.png','ded.gif','frame 2.png','gift 1.png'].map(ensureAsset));await ensurePanorama(1);
 $('sleigh').src=asset('ded.gif');$('question-art').src=asset('frame 2.png');
 // Decode the actual visible DOM images, not only the detached preload images.
 // Keep the entire stage masked until its panorama, sky strips and sleigh can paint together.
 for(const im of [...panoramaNodes[1],$('sleigh'),$('question-art')])await im.decode();
 await new Promise(resolve=>requestAnimationFrame(()=>{resize();render();$('sleigh').hidden=false;state='ready';$('start').disabled=false;$('start').textContent='Start';$('welcome').hidden=false;$('stage').setAttribute('aria-busy','false');$('loading').hidden=true;$('stage').style.visibility='visible';resolve();}));
 // Later scenery is prepared one section at a time. A stop also awaits its visible sections.
 Promise.all([...(Array.from({length:4},(_,i)=>ensureAsset(`gift ${i+2}.png`))),ensureAsset('frame.png')]).then(()=>{$('completion-art').src=asset('frame.png');}).catch(reportAssetFailure);
 (async()=>{for(let n=2;n<=4;n++)await ensurePanorama(n);})().catch(reportAssetFailure);
 }catch(e){reportAssetFailure(e);}}load();
// Read-only diagnostics for local QA.
window.gameDiagnostics=()=>({state,index,questions:[...questions],targets:targets.map(t=>({...t})),giftSequence:Array.from({length:16},(_,i)=>i%5+1),origin:{...origin},formation:{...formation},target:point(),camera});
