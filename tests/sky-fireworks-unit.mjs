import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
let next,frame=0,arcs=0,strokes=0,minY=720,maxY=0;
let seed=17;
const math=Object.create(Math);math.random=()=>((seed=(seed*16807)%2147483647)-1)/2147483646;
const ctx={lineWidth:0,clearRect(){},save(){},restore(){},beginPath(){},rect(){},clip(){},fill(){},stroke(){strokes++;assert.ok(context.window.Celebration.stats().bursts>0,'No rocket path before the first burst');},moveTo(){},lineTo(x,y){check(x,y,this.lineWidth/2)},arc(x,y,r){arcs++;check(x,y,r)}};
function check(x,y,r){minY=Math.min(minY,y-r);maxY=Math.max(maxY,y+r);assert.ok(x-r>0&&x+r<1280&&y-r>0&&y+r<230,`Unclipped geometry: ${x},${y},${r}`);}
const context={window:{},Math:math,matchMedia:()=>({matches:false}),requestAnimationFrame:fn=>(next=fn,1),cancelAnimationFrame(){},document:{hidden:false,addEventListener(){},removeEventListener(){}}};
vm.createContext(context);vm.runInContext(fs.readFileSync('celebration.js','utf8'),context);context.window.Celebration.start({getContext:()=>ctx},null);
for(;frame<6000;frame++)next(frame*1000/60);
const stats=context.window.Celebration.stats();assert.ok(stats.bursts>100);assert.ok(arcs>10000);assert.equal(strokes,arcs,'Only particle trails are stroked');
console.log(JSON.stringify({pass:true,simulatedSeconds:100,bursts:stats.bursts,frames:frame,arcs,minY,maxY}));
