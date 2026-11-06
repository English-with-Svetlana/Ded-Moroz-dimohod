"""Local review server; never included in the Pages artifact."""
from functools import partial
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
import argparse,re
class Handler(SimpleHTTPRequestHandler):
 protocol_version='HTTP/1.1'
 def log_message(self,*args): pass
 def end_headers(self):
  path=self.path.split('?',1)[0]
  if path.endswith('.html') or path.endswith('/'): self.send_header('Cache-Control','no-cache, max-age=0, must-revalidate')
  elif re.search(r'-[a-f0-9]{12}\.',path): self.send_header('Cache-Control','public, max-age=31536000, immutable')
  else: self.send_header('Cache-Control','no-cache')
  super().end_headers()
class Server(ThreadingHTTPServer):
 request_queue_size=128
 daemon_threads=True
 def handle_error(self,*args): pass
parser=argparse.ArgumentParser();parser.add_argument('--port',type=int,default=8765);args=parser.parse_args()
root=Path(__file__).resolve().parent.parent
print(f'Local preview: http://localhost:{args.port}/',flush=True)
with Server(('127.0.0.1',args.port),partial(Handler,directory=str(root))) as server:
 try: server.serve_forever()
 except KeyboardInterrupt: pass
