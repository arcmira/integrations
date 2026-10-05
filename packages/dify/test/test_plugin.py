import json
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

import httpx

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from arcmira_api import request
from tools.search import ArcmiraSearch
from tools.resolve import ArcmiraResolve
from provider.arcmira import ArcmiraProvider
from dify_plugin.errors.tool import ToolProviderCredentialValidationError
from dify_plugin.core.plugin_registration import PluginRegistration
from dify_plugin import DifyPluginEnv

KEY = 'test-arcmira-key-not-real'


class PluginTests(unittest.TestCase):
    def setUp(self):
        self.requests = []
        self.response = json.loads((Path(__file__).parent / 'fixtures/search.json').read_text())
        self.status = 200
        self.error = None
        def handle(req):
            self.requests.append(req)
            if self.error:
                raise self.error
            return httpx.Response(self.status, json=self.response, headers={'Location': 'https://other.invalid/'} if self.status == 302 else {})
        self.client = httpx.Client(transport=httpx.MockTransport(handle))
        self.mock = patch('arcmira_api.httpx.get', side_effect=self.client.get)
        self.mock.start()
        self.addCleanup(self.mock.stop)
        self.addCleanup(self.client.close)

    def invoke(self, cls=ArcmiraSearch, params=None, credentials=None):
        tool = cls.from_credentials(credentials or {'api_key': KEY}, user_id='test')
        return list(tool.invoke(tool_parameters=params or {'q': 'climate'}))

    def test_sdk_registration_loads_both_tools(self):
        reg = PluginRegistration(DifyPluginEnv())
        self.assertEqual(set(reg.tools_mapping['arcmira'][2]), {'search', 'resolve'})
        self.assertEqual(json.loads((ROOT / 'manifest.yaml').read_text())['privacy'], 'PRIVACY.md')
        self.assertTrue((ROOT / 'PRIVACY.md').is_file())

    def test_full_search_result_preserved(self):
        messages = self.invoke()
        self.assertEqual(len(messages), 1)
        self.assertEqual(messages[0].message.json_object, self.response)
        req = self.requests[0]
        self.assertEqual(str(req.url), 'https://api.arcmira.com/v1/search?q=climate&limit=5')
        self.assertEqual(req.headers['authorization'], 'Bearer ' + KEY)

    def test_search_filters_and_premium_preserved(self):
        params = {'q':'climate','channel_ids':'UCfixture','entity_ids':'ent_1','about':'ent_2','by':'ent_3','kind':'sponsored','after':'2026-01-01','before':'2026-02-01','source':'arcmira_premium','limit':2,'src':'mcp-tool','url':'https://other.invalid'}
        self.invoke(params=params)
        sent = dict(self.requests[0].url.params)
        self.assertEqual(sent, {k:str(v) for k,v in params.items() if k not in ('src','url')})

    def test_ambiguous_resolve_preserved(self):
        self.response = {'query':'Alex','context':'a guest on a show','confidence':'ambiguous','best':None,'suggested':None,'ask':{'question':'Which Alex?','options':[{'id':'ent_1','name':'Alex One','type':'person','label':'Alex One, person'},{'id':'ent_2','name':'Alex Two','type':'person','label':'Alex Two, person'}]},'candidates':[], 'note':'Ask which person the user means.'}
        result = self.invoke(ArcmiraResolve, {'q':'Alex','type':'person','context':'a guest on a show','limit':3})
        self.assertEqual(result[0].message.json_object, self.response)
        self.assertEqual(self.requests[0].url.path, '/v1/entities/resolve')

    def test_access_errors_never_become_empty_results_or_caption_fallback(self):
        for status, code in [(401,'invalid_api_key'),(402,'quota_exceeded'),(403,'filter_requires_paid'),(429,'rate_limited'),(500,'internal_error'),(503,'search_unavailable')]:
            with self.subTest(status=status):
                self.status=status;self.response={'error':{'code':code,'message':'Synthetic refusal for adapter verification.'}}
                before=len(self.requests)
                with self.assertRaisesRegex(ValueError, 'Arcmira HTTP '+str(status)):
                    self.invoke(params={'q':'climate','source':'arcmira_premium'})
                self.assertEqual(len(self.requests),before+1)
                self.assertEqual(self.requests[-1].url.params['source'],'arcmira_premium')

    def test_partial_search_and_access_details_are_preserved(self):
        self.response.update({'partial': True, 'failed_batches': 1, 'access': {'type': 'permission_error', 'code': 'freshness_requires_paid', 'gate': 'freshness', 'message': 'Some requested results are outside this account access.', 'doc_url': 'https://arcmira.com/docs/errors', 'request_id': 'fixture-request'}})
        result = self.invoke(params={'q':'climate','source':'arcmira_premium'})
        self.assertEqual(result[0].message.json_object, self.response)
        self.assertTrue(result[0].message.json_object['partial'])
        self.assertEqual(len(self.requests), 1)

    def test_error_credentials_are_redacted(self):
        self.status=401;self.response={'error':KEY}
        with self.assertRaises(ValueError) as e:self.invoke()
        self.assertNotIn(KEY,str(e.exception));self.assertIn('[redacted]',str(e.exception))

    def test_timeout_not_retried_or_exposed(self):
        self.error=httpx.ReadTimeout('sensitive '+KEY)
        with self.assertRaisesRegex(ValueError,'timed out') as e:self.invoke()
        self.assertNotIn(KEY,str(e.exception));self.assertEqual(len(self.requests),1)

    def test_redirect_not_followed(self):
        self.status=302
        with self.assertRaisesRegex(ValueError,'302'):self.invoke()
        self.assertEqual(len(self.requests),1)

    def test_query_and_limit_validation_happens_before_network(self):
        for params in [{'q':''},{'q':'x'},{'q':'ok','limit':0},{'q':'ok','limit':21},{'q':'ok','limit':1.5},{'q':'ok','limit':True},{'q':'ok','limit':float('inf')},{'q':'ok','limit':'5'}]:
            with self.subTest(params=params), self.assertRaises(ValueError):self.invoke(params=params)
        self.assertEqual(self.requests,[])

    def test_resolve_limit_is_fifteen(self):
        with self.assertRaises(ValueError):self.invoke(ArcmiraResolve,{'q':'Alex','limit':16})
        self.assertEqual(self.requests,[])

    def test_missing_key_has_no_network(self):
        with self.assertRaisesRegex(ValueError,'API key'):self.invoke(credentials={'api_key':''})
        self.assertEqual(self.requests,[])

    def test_credential_validation_reads_account_only(self):
        self.response={'email':'masked@example.invalid','tier':'test'}
        self.assertIsNone(ArcmiraProvider()._validate_credentials({'api_key':KEY}))
        self.assertEqual(self.requests[0].url.path,'/v1/me');self.assertEqual(len(self.requests),1)

    def test_credential_failure_uses_sdk_exception(self):
        self.status=401;self.response={'error':'unauthorized'}
        with self.assertRaises(ToolProviderCredentialValidationError):ArcmiraProvider()._validate_credentials({'api_key':KEY})

    def test_invalid_json_errors(self):
        with patch('arcmira_api.httpx.get',return_value=httpx.Response(200,text='<html>error</html>')):
            with self.assertRaisesRegex(ValueError,'invalid JSON'):self.invoke()

    def test_non_json_http_error_does_not_echo_page(self):
        with patch('arcmira_api.httpx.get',return_value=httpx.Response(502,text=KEY)):
            with self.assertRaises(ValueError) as e:self.invoke()
            self.assertNotIn(KEY,str(e.exception));self.assertIn('502',str(e.exception))

    def test_wrong_response_shape_is_error(self):
        self.response=[]
        with self.assertRaisesRegex(ValueError,'unexpected response shape'):self.invoke()

    def test_private_operations_cannot_be_invoked(self):
        with self.assertRaisesRegex(ValueError,'Unsupported'):request(KEY,'/v1/me/settings',{})
        self.assertEqual(self.requests,[])


if __name__=='__main__':unittest.main(verbosity=2)
