"""Prepare a dependency-free static release. Requires libwebp CLI, sips and npm ci locally."""
from pathlib import Path
import hashlib,json,re,subprocess,shutil,tempfile,concurrent.futures
root=Path(__file__).resolve().parent
out=root/'docs'; asset_dir=out/'assets'; asset_dir.mkdir(parents=True,exist_ok=True)
cache=root/'.build'/'image-cache'; cache.mkdir(parents=True,exist_ok=True)
names=['audio/delivery-twinkle.wav','1.png','2.png','3.png','4.png','ded.gif','frame.png','frame 2.png']+[f'gift {i}.png' for i in range(1,6)]
def digest(data): return hashlib.sha256(data).hexdigest()[:12]
def command(args): return subprocess.run(args,check=True,capture_output=True)
webp_version=command(['cwebp','-version']).stdout.decode().splitlines()[0]
gif_version=command(['gif2webp','-version']).stdout.decode().splitlines()[0]
def optimize(name):
 if name.endswith('.wav'):
  data=(root/name).read_bytes();filename='delivery-twinkle-'+digest(data)+'.wav';(asset_dir/filename).write_bytes(data);return name,'assets/'+filename
 source=root/('new_backgrounds' if name in ['1.png','2.png','3.png','4.png'] else '')/name
 if name.startswith('gift'):
  small=cache/(hashlib.sha256(source.read_bytes()).hexdigest()+'-192.png')
  if not small.exists(): command(['sips','-Z','192',str(source),'--out',str(small)])
  source=small
 background=name in ['1.png','2.png','3.png','4.png']
 animated=name=='ded.gif'
 recipe=('background-q95-sharp-yuv-m6-icc:'+webp_version) if background else ('gif-lossless-minsize-m6-q100-icc:'+gif_version) if animated else ('static-lossless-exact-m6-q100-icc:'+webp_version)
 target=cache/(hashlib.sha256(source.read_bytes()+recipe.encode()).hexdigest()+'.webp')
 if not target.exists():
  command(['cwebp','-quiet','-q','95','-sharp_yuv','-m','6','-metadata','icc',str(source),'-o',str(target)] if background else (['gif2webp','-min_size','-m','6','-q','100','-metadata','icc',str(source),'-o',str(target)]) if animated else ['cwebp','-quiet','-lossless','-exact','-m','6','-q','100','-metadata','icc',str(source),'-o',str(target)])
 chosen=target if target.stat().st_size<source.stat().st_size else source
 data=chosen.read_bytes(); filename=name.rsplit('.',1)[0].replace(' ','-')+'-'+digest(data)+chosen.suffix
 (asset_dir/filename).write_bytes(data)
 return name,'assets/'+filename
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
 assets=dict(executor.map(optimize,names))
(out/'assets.json').write_text(json.dumps(assets,indent=2)+'\n')
script=(root/'game.js').read_text()
pattern=r'const manifest=/\*ASSET_MANIFEST\*/[^\n]*;'
def with_manifest(mapping):
 result,count=re.subn(pattern,lambda _: 'const manifest=/*ASSET_MANIFEST*/'+json.dumps(mapping)+';',script,count=1)
 if count!=1: raise ValueError('Missing manifest marker')
 return result
(root/'game.js').write_text(with_manifest({k:'docs/'+v for k,v in assets.items()}))
with tempfile.TemporaryDirectory(prefix='frost-release-') as temp:
 working=Path(temp); inputs=working/'input'; outputs=working/'output';inputs.mkdir();outputs.mkdir()
 (inputs/'game.js').write_text(with_manifest(assets))
 for name in ['style.css','celebration.js']: shutil.copyfile(root/name,inputs/name)
 command(['node',str(root/'tools/minify.mjs'),str(inputs),str(outputs)])
 code_assets={}
 for name in ['game.js','celebration.js','style.css']:
  data=(outputs/name).read_bytes(); stem,ext=name.rsplit('.',1);filename=f'{stem}-{digest(data)}.{ext}';(asset_dir/filename).write_bytes(data);code_assets[name]='assets/'+filename
 html=(root/'index.html').read_text()
 # HTML cache directives are advisory; Pages controls actual HTTP cache headers.
 if 'http-equiv="Cache-Control"' not in html:
  html=html.replace('<meta name="viewport"','<meta http-equiv="Cache-Control" content="no-cache, max-age=0, must-revalidate"><meta name="viewport"',1)
 for name,path in code_assets.items(): html=re.sub(re.escape(name)+r'(?:\?v=[a-f0-9]+)?',path,html)
 html=html.replace('<div id="calibration" hidden></div>','')
 (out/'index.html').write_text(html)
 for name in ['iframe.html','publication.html']: shutil.copyfile(root/name,out/name)
 # Root remains the editable development entry, with equivalent optimized imagery.
 root_html=(root/'index.html').read_text()
 for name in ['game.js','celebration.js','style.css']:
  root_html=re.sub(re.escape(name)+r'(?:\?v=[a-f0-9]+)?',name+'?v='+digest((root/name).read_bytes()),root_html)
 (root/'index.html').write_text(root_html)
current=sorted(set(assets.values())|set(code_assets.values()))
state_path=root/'release-manifest.json'
state=json.loads(state_path.read_text()) if state_path.exists() else {}
previous=state.get('previous',[]) if current==state.get('current') else state.get('current',[])
keep=set(current+previous)
for path in asset_dir.iterdir():
 if path.is_file() and 'assets/'+path.name not in keep: path.unlink()
# Remove obsolete loose copies; production loads only the content-hashed scripts and stylesheet.
for name in ['game.js','celebration.js','style.css']:
 (out/name).unlink(missing_ok=True)
state_path.write_text(json.dumps({'current':current,'previous':previous},indent=2)+'\n')
size=sum(p.stat().st_size for p in out.rglob('*') if p.is_file())
print(f'Production: {size:,} bytes; {len(current)} current hashed resources; {len(set(previous)-set(current))} previous-release resources retained.')
