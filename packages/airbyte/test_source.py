import copy
import json
import logging
from urllib.parse import parse_qs, urlparse
from unittest.mock import patch

import pytest
import requests
import responses
from airbyte_cdk.models import SyncMode, ConfiguredAirbyteCatalog, ConfiguredAirbyteStream, DestinationSyncMode
from airbyte_cdk.sources.declarative.requesters.error_handlers import DefaultErrorHandler, HttpResponseFilter
from airbyte_cdk.sources.streams.http.error_handlers.response_models import ResponseAction
from airbyte_cdk.utils.traced_exception import AirbyteTracedException
from source_arcmira import SourceArcmira, ArcmiraStream, ArcmiraBackoff, BASE, validate_config

CHANNEL = 'UC' + 'a' * 22
ENTITY = {'id':'ent_14','canonical_id':'ent_14','name':'Example','type':'organization','platform':None,'url':None,'image_url':None,'image_checked_at':None,'owner_entity_id':None,'is_canonical':True,'merged_from_id':None,'slug':None,'route':None,'page':None,'appearances_page':None,'mentions_page':None}
BRIEF = {'id':'ent_14','name':'Example','type':'organization','slug':None,'page':None}
MEDIA = {'video_id':'abcdefghijk','title':'Example video','url':None,'published_at':'2020-01-01T00:00:00Z','channel_id':CHANNEL,'view_count':None,'source_channel':None}
MENTION = {'id':'men_1','entity':BRIEF,'media':MEDIA,'start_seconds':12,'end_seconds':24,'is_appearance':False,'description':'Synthetic fixture','confidence':0.9,'sentiment_score':0.2,'sentiment':'neutral','referenced_url':None,'referenced_platform':None,'extracted_content':None}
REC = {'id':'com_1','class':'organic','entity':BRIEF,'media':MEDIA,'start_seconds':12,'end_seconds':24,'verbatim_quote':'Synthetic recommendation','promo_code':None,'offer':None,'sentiment':0.2,'sentiment_score':0.2,'confidence':0.95,'speaker_role':'host','conflict_status':None,'resolution':None}
VIDEO = {'video_id':'abcdefghijk','title':'Example video','published_at':'2020-01-01T00:00:00Z','duration_seconds':60,'view_count':None,'channel_id':CHANNEL,'channel_name':'Example channel','channel_page':None,'watch_url':'https://arcmira.com/watch?v=abcdefghijk'}

def config(name='mentions', scope=None):
    return {'api_key':'synthetic-not-a-key',name:[scope or ({'channel_id':CHANNEL} if name=='channel_videos' else {'entity_id':'ent_14'})]}

def page(name='mentions', rows=None, cursor=None):
    row = {'mentions':MENTION,'recommendations':REC,'channel_videos':VIDEO}[name]
    field = 'episodes' if name=='channel_videos' else name
    data = {field:copy.deepcopy([row] if rows is None else rows),'has_more':cursor is not None,'next_cursor':cursor,'window':{'after':None,'before':None}}
    if name=='channel_videos':
        data.update(channel={'id':None,'youtube_channel_id':CHANNEL,'name':None,'page':None},returned=len(data[field]),indexed_through='2020-01-01T00:00:00Z',index_age_days=2000,as_of='2020-01-01T00:00:00Z',note='Index may be behind this channel; only indexed videos are served.')
    else:
        data['entity']=copy.deepcopy(ENTITY)
    return data

def url(name):
    return BASE+(f'channels/{CHANNEL}/videos' if name=='channel_videos' else name)

def read(stream, state=None):
    return list(stream.read_records(SyncMode.full_refresh,stream_slice=next(stream.stream_slices()),stream_state=state))

@pytest.mark.parametrize('name',['mentions','recommendations','channel_videos'])
@responses.activate
def test_actual_framework_pagination_filters_and_rows(name):
    scope={'entity_id':'ent_14','after':'2020-01-01','before':'2026-01-01'}
    if name=='mentions':scope.update(q='zero + terms',is_appearance=False,sentiment='positive',details='full')
    if name=='recommendations':scope.update({'class':'organic','min_confidence':0.8,'include_disputed':False})
    if name=='channel_videos':scope={'channel_id':CHANNEL,'after':'2020-01-01','before':'2026-01-01'}
    responses.get(url(name),json=page(name,cursor='opaque/+=?not-a-date'))
    final=page(name)
    key='video_id' if name=='channel_videos' else 'id'
    field='episodes' if name=='channel_videos' else name
    final[field][0][key]='second';final[field][0]['new_field']={'kept':True}
    responses.get(url(name),json=final)
    stream=ArcmiraStream(name,config(name,scope));records=read(stream)
    assert len(records)==2 and records[1][key]=='second' and records[1]['new_field']=={'kept':True}
    assert records[0]['_arcmira']['scope']==scope
    params=[parse_qs(urlparse(c.request.url).query) for c in responses.calls]
    assert 'cursor' not in params[0]
    assert params[1].pop('cursor')==['opaque/+=?not-a-date']
    assert params[1]==params[0]
    assert params[0]['limit']==['25' if name=='channel_videos' else '100']
    assert all(c.request.headers['Authorization']=='Bearer synthetic-not-a-key' for c in responses.calls)
    assert stream.get_cursor() is None

@pytest.mark.parametrize('name',['mentions','recommendations','channel_videos'])
@responses.activate
def test_empty_is_not_an_error_or_backfill_trigger(name):
    responses.get(url(name),json=page(name,[]))
    assert read(ArcmiraStream(name,config(name)))==[]
    assert len(responses.calls)==1

@pytest.mark.parametrize('patch_data',[{'note':'Preview only'},{'unlock':{'tier':'pro','url':'https://example.invalid'}},{'preview':True},{'partial':True},{'is_partial':True},{'complete':False},{'error':{'code':'blocked'}},{'access':{'limited':True}},{'coverage':'unknown'}])
@responses.activate
def test_incomplete_envelope_emits_no_records(patch_data):
    data=page();data.update(patch_data);responses.get(url('mentions'),json=data)
    generator=ArcmiraStream('mentions',config()).read_records(SyncMode.full_refresh,stream_slice={'filters':{'entity_id':'ent_14'}})
    with pytest.raises(AirbyteTracedException):next(generator)

@pytest.mark.parametrize('bad',[
    {'has_more':True,'next_cursor':None},
    {'has_more':False,'next_cursor':'unexpected'},
    {'has_more':True,'next_cursor':''},
    {'mentions':{}},
    {'mentions':[{'id':'incomplete'}]},
    {'has_more':'false'},
])
@responses.activate
def test_malformed_envelopes_fail(bad):
    data=page();data.update(bad);responses.get(url('mentions'),json=data)
    with pytest.raises(AirbyteTracedException):read(ArcmiraStream('mentions',config()))

@responses.activate
def test_repeated_cursor_fails_before_repeated_page_rows():
    responses.get(url('mentions'),json=page(cursor='loop'))
    responses.get(url('mentions'),json=page(cursor='loop'))
    stream=ArcmiraStream('mentions',config())
    gen=stream.read_records(SyncMode.full_refresh,stream_slice={'filters':{'entity_id':'ent_14'}})
    assert next(gen)['id']=='men_1'
    with pytest.raises(AirbyteTracedException,match='repeated'):next(gen)
    assert len(responses.calls)==2

@responses.activate
def test_empty_intermediate_page_with_cursor_continues():
    responses.get(url('mentions'),json=page(rows=[],cursor='continue'))
    responses.get(url('mentions'),json=page())
    assert len(read(ArcmiraStream('mentions',config())))==1

@pytest.mark.parametrize('status,code,gate',[(402,'quota_exceeded','rows'),(403,'feature_not_available','plan'),(400,'invalid_cursor','pagination'),(401,'invalid_api_key','key')])
@responses.activate
def test_typed_terminal_errors_are_not_retried(status,code,gate):
    responses.get(url('mentions'),status=status,json={'error':{'type':'permission_error','code':code,'gate':gate,'request_id':'req_fixture'}})
    with pytest.raises(Exception) as error:read(ArcmiraStream('mentions',config()))
    message=str(error.value)
    assert code in message and gate in message and str(status) in message and 'req_fixture' in message
    assert 'synthetic-not-a-key' not in message
    assert len(responses.calls)==1

@responses.activate
def test_429_honors_retry_after_and_is_bounded():
    responses.get(url('mentions'),status=429,json={'error':{'type':'rate_limit_error','code':'rate_limited','gate':'rate','request_id':'req_r','retry_after_seconds':2}},headers={'Retry-After':'2'})
    with patch('time.sleep') as sleep:
        with pytest.raises(Exception) as error:read(ArcmiraStream('mentions',config()))
    assert len(responses.calls)==4
    waits=[x.args[0] for x in sleep.call_args_list if x.args[0]>0]
    assert len(waits)==3 and all(wait>=2 for wait in waits)
    assert 'rate_limited' in str(error.value)

@responses.activate
def test_long_retry_after_fails_without_early_retry():
    responses.get(url('mentions'),status=429,json={'error':{'code':'rate_limited','retry_after_seconds':300}},headers={'Retry-After':'300'})
    with patch('time.sleep') as sleep:
        with pytest.raises(Exception):read(ArcmiraStream('mentions',config()))
    assert len(responses.calls)==1 and not sleep.called

@responses.activate
def test_transient_server_retry_then_success():
    responses.get(url('mentions'),status=503,json={'error':{'code':'unavailable'}})
    responses.get(url('mentions'),json=page())
    with patch('time.sleep'):assert len(read(ArcmiraStream('mentions',config())))==1
    assert len(responses.calls)==2

@responses.activate
def test_next_sync_restarts_and_includes_old_date_backfill_and_edits():
    responses.get(url('mentions'),json=page())
    stream=ArcmiraStream('mentions',config());assert len(read(stream))==1
    edited=copy.deepcopy(MENTION);edited['description']='edited'
    backfill=copy.deepcopy(MENTION);backfill['id']='men_old';backfill['media']['published_at']='2010-01-01T00:00:00Z'
    responses.get(url('mentions'),json=page(rows=[edited,backfill]))
    result=read(stream,state={'cursor':'expired','published_at':'2026-10-05'})
    assert [x['id'] for x in result]==['men_1','men_old'] and result[0]['description']=='edited'
    assert all('cursor' not in parse_qs(urlparse(x.request.url).query) for x in responses.calls)

@pytest.mark.parametrize('bad',[{'api_key':'x'},config(scope={'entity_id':'Acme'}),config(scope={'entity_id':'ent_14','before':'2026-01-01','after':'2026-02-01'}),config(scope={'entity_id':'ent_14','after':'2026-01-01T00:00:00'}),config(scope={'entity_id':'ent_14','cursor':'forbidden'}),config(scope={'entity_id':'ent_14','spending':'existing_credits'})])
def test_invalid_scope_configuration(bad):
    with pytest.raises(AirbyteTracedException):validate_config(bad)

@responses.activate
def test_native_source_discover_and_read_protocol():
    source=SourceArcmira();cfg=config()
    catalog=source.discover(logging.getLogger(),cfg)
    assert len(catalog.streams)==1 and catalog.streams[0].supported_sync_modes==[SyncMode.full_refresh]
    configured=ConfiguredAirbyteCatalog(streams=[ConfiguredAirbyteStream(stream=catalog.streams[0],sync_mode=SyncMode.full_refresh,destination_sync_mode=DestinationSyncMode.overwrite)])
    responses.get(url('mentions'),json=page())
    messages=list(source.read(logging.getLogger(),cfg,configured,state=[]))
    records=[x.record.data for x in messages if x.type.value=='RECORD']
    assert len(records)==1 and records[0]['id']=='men_1'
    assert not any('opaque' in json.dumps(x.state.__dict__,default=str) for x in messages if x.type.value=='STATE')

@responses.activate
def test_auth_check_only_calls_me():
    responses.get(BASE+'me',json={'user_id':'synthetic','scopes':['read']})
    assert SourceArcmira().check_connection(logging.getLogger(),config())==(True,None)
    assert [x.request.url for x in responses.calls]==[BASE+'me']


def test_declarative_filter_really_can_reject_preview_before_extraction():
    handler=DefaultErrorHandler(parameters={},config={},response_filters=[HttpResponseFilter(config={},parameters={},predicate="{{ 'unlock' in response }}",action='FAIL',error_message='Preview is not a complete export')])
    response=requests.Response();response.status_code=200;response._content=b'{"mentions":[],"unlock":{"tier":"pro"}}';response.headers['Content-Type']='application/json'
    assert handler.interpret_response(response).response_action==ResponseAction.FAIL

@pytest.mark.parametrize('name',['channel_videos','recommendations'])
@responses.activate
def test_preview_in_other_streams_is_refused(name):
    data=page(name);data['partial']=True
    responses.get(url(name),json=data)
    with pytest.raises(AirbyteTracedException):read(ArcmiraStream(name,config(name)))

@responses.activate
def test_channel_count_mismatch_is_refused():
    data=page('channel_videos');data['returned']=2
    responses.get(url('channel_videos'),json=data)
    with pytest.raises(AirbyteTracedException):read(ArcmiraStream('channel_videos',config('channel_videos')))

@responses.activate
def test_redirect_does_not_send_key_to_other_host():
    responses.get(url('mentions'),status=302,headers={'Location':'https://example.invalid/leak'})
    with pytest.raises(Exception):read(ArcmiraStream('mentions',config()))
    assert len(responses.calls)==1

@pytest.mark.parametrize('body',['not json','[]','null'])
@responses.activate
def test_non_json_or_non_object_is_refused(body):
    responses.get(url('mentions'),body=body,status=200)
    with pytest.raises(AirbyteTracedException):read(ArcmiraStream('mentions',config()))

@responses.activate
def test_multiple_scopes_do_not_reuse_cursors():
    cfg={'api_key':'synthetic-not-a-key','mentions':[{'entity_id':'ent_14'},{'entity_id':'ent_15'}]}
    responses.get(url('mentions'),json=page(cursor='same-but-scoped'))
    responses.get(url('mentions'),json=page())
    responses.get(url('mentions'),json=page(cursor='same-but-scoped'))
    responses.get(url('mentions'),json=page())
    stream=ArcmiraStream('mentions',cfg);allrows=[]
    for scope in stream.stream_slices():allrows.extend(stream.read_records(SyncMode.full_refresh,stream_slice=scope))
    assert len(allrows)==4
    assert allrows[0]['_arcmira']['scope_id']!=allrows[2]['_arcmira']['scope_id']
    assert 'cursor' not in parse_qs(urlparse(responses.calls[2].request.url).query)


def test_incremental_is_refused_without_network():
    with pytest.raises(AirbyteTracedException):list(ArcmiraStream('mentions',config()).read_records(SyncMode.incremental))

@responses.activate
def test_bad_account_object_does_not_pass_check():
    responses.get(BASE+'me',json={})
    assert SourceArcmira().check_connection(logging.getLogger(),config())[0] is False

@pytest.mark.parametrize('status,code',[(402,'quota_exceeded'),(403,'feature_not_available'),(429,'rate_limited')])
@responses.activate
def test_native_source_failure_trace_keeps_typed_error(status,code):
    source=SourceArcmira();cfg=config();catalog=source.discover(logging.getLogger(),cfg)
    configured=ConfiguredAirbyteCatalog(streams=[ConfiguredAirbyteStream(stream=catalog.streams[0],sync_mode=SyncMode.full_refresh,destination_sync_mode=DestinationSyncMode.overwrite)])
    responses.get(url('mentions'),status=status,json={'error':{'type':'quota_exceeded' if status==402 else 'permission_error' if status==403 else 'rate_limit_error','code':code,'gate':'rows' if status==402 else 'plan' if status==403 else 'rate','request_id':'req_trace'}},headers={'Retry-After':'0'})
    messages=[]
    with patch('time.sleep'),pytest.raises(AirbyteTracedException):
        for message in source.read(logging.getLogger(),cfg,configured,state=[]):messages.append(message)
    traces=[x.trace.error for x in messages if x.type.value=='TRACE' and x.trace.error]
    assert traces and any(code in (x.message or '') and 'req_trace' in (x.message or '') for x in traces)
    assert not any(x.type.value=='RECORD' for x in messages)

@responses.activate
def test_failed_page_after_success_has_explicit_failure_not_complete_snapshot():
    responses.get(url('mentions'),json=page(cursor='second'))
    responses.get(url('mentions'),json={**page(),'partial':True})
    gen=ArcmiraStream('mentions',config()).read_records(SyncMode.full_refresh,stream_slice={'filters':{'entity_id':'ent_14'}})
    assert next(gen)['id']=='men_1'
    with pytest.raises(AirbyteTracedException):next(gen)

@responses.activate
def test_fully_deleted_scope_returns_empty_next_full_refresh():
    responses.get(url('mentions'),json=page())
    responses.get(url('mentions'),json=page(rows=[]))
    stream=ArcmiraStream('mentions',config())
    assert len(read(stream))==1 and read(stream)==[]

@responses.activate
def test_reused_stream_reports_transport_after_previous_429_exhaustion():
    stream = ArcmiraStream('mentions', config())
    responses.get(url('mentions'), status=429, json={'error': {'type': 'rate_limit_error', 'code': 'rate_limited', 'gate': 'rate', 'request_id': 'req_old_rate'}}, headers={'Retry-After': '0'})
    with patch('time.sleep'), pytest.raises(AirbyteTracedException) as first:
        read(stream)
    assert 'rate_limited' in str(first.value)
    responses.reset()
    responses.get(url('mentions'), body=requests.ConnectionError('offline fixture'))
    with patch('time.sleep'), pytest.raises(AirbyteTracedException) as second:
        read(stream)
    assert second.value.failure_type.value == 'transient_error'
    assert 'transport unavailable' in str(second.value)
    assert 'rate_limited' not in str(second.value) and '429' not in str(second.value)
    assert len(responses.calls) == 4

@responses.activate
def test_429_followed_by_transport_failure_reports_final_failure():
    responses.get(url('mentions'), status=429, json={'error': {'type': 'rate_limit_error', 'code': 'rate_limited', 'gate': 'rate', 'request_id': 'req_old_rate'}}, headers={'Retry-After': '0'})
    responses.get(url('mentions'), body=requests.ConnectionError('offline fixture'))
    with patch('time.sleep'), pytest.raises(AirbyteTracedException) as error:
        read(ArcmiraStream('mentions', config()))
    assert error.value.failure_type.value == 'transient_error'
    assert 'transport unavailable' in str(error.value)
    assert 'rate_limited' not in str(error.value) and '429' not in str(error.value)
    assert len(responses.calls) == 4

@responses.activate
def test_retry_budget_resets_after_a_successful_page():
    responses.get(url('mentions'), body=requests.ConnectionError('first page offline'))
    responses.get(url('mentions'), status=503, json={'error': {'code': 'unavailable'}})
    responses.get(url('mentions'), json=page(cursor='next-page'))
    responses.get(url('mentions'), body=requests.ConnectionError('second page offline'))
    responses.get(url('mentions'), status=429, json={'error': {'code': 'rate_limited'}}, headers={'Retry-After': '0'})
    responses.get(url('mentions'), status=503, json={'error': {'code': 'unavailable'}})
    responses.get(url('mentions'), json=page())
    with patch('time.sleep'):
        records = read(ArcmiraStream('mentions', config()))
    assert len(records) == 2 and len(responses.calls) == 7
