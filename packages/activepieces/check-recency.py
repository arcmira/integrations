import concurrent.futures,json,urllib.request
from datetime import datetime,timezone,timedelta
from pathlib import Path
p=Path(__file__).parent
lock=json.loads((p/'package-lock.json').read_text())
packages=set()
for path,meta in lock['packages'].items():
 if path:
  name=meta.get('name') or path.rsplit('node_modules/',1)[1]
  packages.add((name,meta['version']))
now=datetime.now(timezone.utc); cutoff=now-timedelta(days=7)
def check(pair):
 name,version=pair
 with urllib.request.urlopen('https://registry.npmjs.org/'+urllib.parse.quote(name,safe='@'),timeout=60) as response: data=json.load(response)
 published=data['time'][version]
 return {'name':name,'version':version,'published_at':published,'eligible':datetime.fromisoformat(published.replace('Z','+00:00'))<=cutoff}
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool: results=list(pool.map(check,sorted(packages)))
(p/'package-selection.json').write_text(json.dumps({'checked_at':now.isoformat(),'cutoff':cutoff.isoformat(),'dependencies':results},indent=2)+'\n')
failures=[r for r in results if not r['eligible']]
print(json.dumps({'packages':len(results),'ineligible':failures}))
assert not failures
