import json,pathlib,copy,sys,tempfile
p=pathlib.Path(__file__).parent
api=json.loads((p/'openapi.json').read_text())
def expand(x):
 if isinstance(x,list):return [expand(v) for v in x]
 if not isinstance(x,dict):return x
 if '$ref' in x:
  r=api
  for part in x['$ref'][2:].split('/'):r=r[part]
  return expand(r)
 return {k:expand(v) for k,v in x.items()}

def generate(p):
 (p/'schemas').mkdir(exist_ok=True)
 for name,component,field in [('channel_videos','ChannelVideosResponse','episodes'),('mentions','MentionListResponse','mentions'),('recommendations','RecommendationListResponse','recommendations')]:
  env=expand(api['components']['schemas'][component]);(p/'schemas'/f'{name}-envelope.json').write_text(json.dumps(env,indent=2)+'\n')
  row=copy.deepcopy(env['properties'][field]['items']);row['$schema']='http://json-schema.org/draft-07/schema#';row['properties']['_arcmira']={'type':'object','properties':{'scope_id':{'type':'string'},'scope':{'type':'object'},'window':{'type':'object'},'indexed_through':{'type':['string','null']},'index_age_days':{'type':['integer','null']},'as_of':{'type':['string','null']},'note':{'type':'string'}},'required':['scope_id','scope','window']};row.setdefault('required',[]).append('_arcmira');(p/'schemas'/f'{name}.json').write_text(json.dumps(row,indent=2)+'\n')
 props={'api_key':{'type':'string','minLength':1,'airbyte_secret':True,'title':'Arcmira API key'},'page_size':{'type':'integer','minimum':1,'maximum':100,'default':100,'description':'Channel videos are capped at 25 per request.'}}
 for name,route in [('channel_videos','/v1/channels/{channel_id}/videos'),('mentions','/v1/mentions'),('recommendations','/v1/recommendations')]:
  params={x['name']:copy.deepcopy(x['schema']) for x in api['paths'][route]['get']['parameters'] if x['name'] not in ['limit','cursor','src']}
  for k in params:
   params[k].pop('default',None)
   if k=='min_confidence':params[k]['type']='number'
   if k=='entity_id':params[k]['pattern']='^ent_[A-Za-z0-9_-]+$'
   if k=='channel_id':params[k]['pattern']='^UC[A-Za-z0-9_-]{22}$'
   if k in ('after','before'):params[k]['pattern']='^\\d{4}-\\d{2}-\\d{2}(T.*)?$'
  props[name]={'type':'array','uniqueItems':True,'items':{'type':'object','properties':params,'required':['channel_id' if name=='channel_videos' else 'entity_id'],'additionalProperties':False},'title':name.replace('_',' ').title(),'description':'Explicit full-refresh scopes. Empty or omitted disables this stream.'}
 spec={'documentationUrl':'https://arcmira.com/docs','supportsIncremental':False,'supported_destination_sync_modes':['append','overwrite'],'connectionSpecification':{'$schema':'http://json-schema.org/draft-07/schema#','type':'object','required':['api_key'],'additionalProperties':False,'properties':props,'anyOf':[{'required':[n],'properties':{n:{'minItems':1}}} for n in ('channel_videos','mentions','recommendations')]}}
 (p/'spec.json').write_text(json.dumps(spec,indent=2)+'\n')

if __name__ == '__main__':
 if sys.argv[1:] == ['--check']:
  with tempfile.TemporaryDirectory(prefix='arcmira-airbyte-schema-') as tmp:
   output=pathlib.Path(tmp)
   generate(output)
   for generated in output.rglob('*.json'):
    relative=generated.relative_to(output)
    if generated.read_bytes() != (p/relative).read_bytes():
     raise SystemExit(f'Schema drift: {relative}; regenerate from the reviewed OpenAPI snapshot.')
  print('Connector spec and six schemas match the included OpenAPI snapshot.')
 elif sys.argv[1:]:
  raise SystemExit('Usage: python generate_schemas.py [--check]')
 else:
  generate(p)
