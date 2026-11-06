import fs from 'node:fs';
import { minify } from 'terser';
import CleanCSS from 'clean-css';
const [input,output]=process.argv.slice(2);
for(const name of ['game.js','celebration.js']){
 let code=fs.readFileSync(`${input}/${name}`,'utf8');
 if(name==='game.js'){
  code=code.replace(/const calibrate=[^\n]+;/,'const calibrate=false;')
   .replace(/^function showTarget\(\).*$/m,'function showTarget(){}')
   .replace(/^if\(calibrate\).*$/m,'');
 }
 const result=await minify(code,{compress:{passes:2},mangle:{toplevel:false},format:{comments:false},ecma:2020});
 fs.writeFileSync(`${output}/${name}`,result.code+'\n');
}
const css=new CleanCSS({level:1}).minify(fs.readFileSync(`${input}/style.css`,'utf8'));
if(css.errors.length)throw Error(css.errors.join('\n'));
fs.writeFileSync(`${output}/style.css`,css.styles+'\n');
