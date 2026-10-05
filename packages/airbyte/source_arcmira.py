"""Airbyte full-refresh source for explicitly scoped Arcmira indexed data."""
from __future__ import annotations

import copy
import hashlib
import json
import logging
import math
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import requests
from jsonschema import Draft202012Validator
from airbyte_cdk.entrypoint import launch
from airbyte_cdk.models import ConnectorSpecification, DestinationSyncMode, FailureType, SyncMode
from airbyte_cdk.sources import AbstractSource
from airbyte_cdk.sources.streams.http import HttpStream
from airbyte_cdk import TokenAuthenticator
from airbyte_cdk.sources.streams.http.error_handlers import ErrorHandler
from airbyte_cdk.sources.streams.http.error_handlers.backoff_strategy import BackoffStrategy
from airbyte_cdk.sources.streams.http.error_handlers.response_models import ErrorResolution, ResponseAction
from airbyte_cdk.utils.traced_exception import AirbyteTracedException

ROOT = Path(__file__).parent
BASE = 'https://api.arcmira.com/v1/'
STREAMS = {
    'channel_videos': ('episodes', 'ChannelVideosResponse', 'video_id', 25),
    'mentions': ('mentions', 'MentionListResponse', 'id', 100),
    'recommendations': ('recommendations', 'RecommendationListResponse', 'id', 100),
}


def fail(message: str, failure_type=FailureType.config_error):
    raise AirbyteTracedException(message=message, internal_message=message, failure_type=failure_type)


def retry_after(response: requests.Response) -> float | None:
    raw = response.headers.get('Retry-After')
    if raw is None:
        try:
            raw = response.json().get('error', {}).get('retry_after_seconds')
        except (ValueError, AttributeError):
            return None
    if raw is None:
        return None
    try:
        value = float(raw)
        return value if math.isfinite(value) and value >= 0 else math.inf
    except (ValueError, TypeError):
        return math.inf


def diagnostic(response: requests.Response) -> str:
    try:
        error = response.json().get('error', {})
    except (ValueError, AttributeError):
        error = {}
    error = error if isinstance(error, dict) else {}
    fields = {k: error[k] for k in ('type', 'code', 'gate', 'param', 'request_id', 'retry_after_seconds') if k in error}
    return f'Arcmira HTTP {response.status_code}: {json.dumps(fields, sort_keys=True)}. See https://arcmira.com/docs/errors and your account usage settings. No scope or quality fallback was applied.'


class ArcmiraErrorHandler(ErrorHandler):
    last_status = None
    last_diagnostic = None
    consecutive_failures = 0
    max_retries = 3
    max_time = 120

    def interpret_response(self, response):
        self.last_status = None
        self.last_diagnostic = None
        if isinstance(response, requests.Response):
            self.last_status = response.status_code
            self.last_diagnostic = diagnostic(response) if response.status_code >= 400 else None
            if 200 <= response.status_code < 300:
                self.consecutive_failures = 0
                return ErrorResolution(response_action=ResponseAction.SUCCESS)
            self.consecutive_failures += 1
            delay = retry_after(response)
            retryable = response.status_code == 429 or 500 <= response.status_code < 600
            if retryable and self.consecutive_failures <= self.max_retries and (delay is None or delay <= 60):
                action = ResponseAction.RETRY
                failure = FailureType.transient_error
            else:
                action = ResponseAction.FAIL
                failure = FailureType.config_error if 400 <= response.status_code < 500 and response.status_code != 429 else FailureType.transient_error
            return ErrorResolution(response_action=action, failure_type=failure, error_message=diagnostic(response))
        if isinstance(response, (requests.Timeout, requests.ConnectionError)):
            self.consecutive_failures += 1
            action = ResponseAction.RETRY if self.consecutive_failures <= self.max_retries else ResponseAction.FAIL
            return ErrorResolution(response_action=action, failure_type=FailureType.transient_error, error_message='Arcmira transport unavailable; bounded retry exhausted.')
        return ErrorResolution(response_action=ResponseAction.FAIL, failure_type=FailureType.system_error, error_message='Arcmira request failed.')


class ArcmiraBackoff(BackoffStrategy):
    def backoff_time(self, response_or_exception, attempt_count):
        if isinstance(response_or_exception, requests.Response):
            delay = retry_after(response_or_exception)
            if delay is not None:
                return delay
        return min(2 ** attempt_count, 30)


class ArcmiraStream(HttpStream):
    url_base = BASE
    cursor_field = []
    state_checkpoint_interval = None
    http_method = 'GET'

    def __init__(self, name: str, config: dict[str, Any]):
        self._name = name
        self._scopes = copy.deepcopy(config[name])
        self._page_size = min(config.get('page_size', 100), STREAMS[name][3])
        self._seen: set[str] = set()
        self._last_response = None
        self._last_page = None
        self._errors = ArcmiraErrorHandler()
        self._validator = Draft202012Validator(json.loads((ROOT / 'schemas' / f'{name}-envelope.json').read_text()))
        super().__init__(authenticator=TokenAuthenticator(token=config['api_key']))

    @property
    def name(self):
        return self._name

    @property
    def primary_key(self):
        return [['_arcmira', 'scope_id'], [STREAMS[self.name][2]]]

    def get_error_handler(self):
        return self._errors

    def get_backoff_strategy(self):
        return ArcmiraBackoff()

    def get_json_schema(self):
        return json.loads((ROOT / 'schemas' / f'{self.name}.json').read_text())

    def stream_slices(self, **kwargs):
        for scope in self._scopes:
            yield {'filters': scope}

    def path(self, stream_slice=None, **kwargs):
        if self.name == 'channel_videos':
            return f"channels/{stream_slice['filters']['channel_id']}/videos"
        return self.name

    def request_params(self, stream_slice=None, next_page_token=None, **kwargs):
        params = copy.deepcopy(stream_slice['filters'])
        if self.name == 'channel_videos':
            params.pop('channel_id')
        params = {k: str(v).lower() if isinstance(v, bool) else v for k, v in params.items()}
        params['limit'] = self._page_size
        if next_page_token:
            params['cursor'] = next_page_token['cursor']
        return params

    def request_kwargs(self, **kwargs):
        return {'timeout': (10, 60), 'allow_redirects': False}

    def read_records(self, sync_mode, cursor_field=None, stream_slice=None, stream_state=None):
        if sync_mode != SyncMode.full_refresh:
            fail('Only full_refresh is supported. Publication dates are not ingestion or update cursors.')
        self._seen.clear()
        self._errors.last_status = None
        self._errors.last_diagnostic = None
        self._errors.consecutive_failures = 0
        self._last_response = None
        self._last_page = None
        try:
            yield from super().read_records(sync_mode, stream_slice=stream_slice, stream_state={})
        except AirbyteTracedException:
            if self._errors.last_status == 429:
                fail(self._errors.last_diagnostic, FailureType.transient_error)
            raise

    def _page(self, response):
        if response is self._last_response:
            return self._last_page
        try:
            page = response.json()
        except ValueError:
            fail('Arcmira returned invalid JSON; the sync is incomplete.', FailureType.system_error)
        if not isinstance(page, dict):
            fail('Arcmira returned a non-object envelope; the sync is incomplete.', FailureType.system_error)
        if 'error' in page or 'unlock' in page or page.get('preview') or page.get('partial') or page.get('is_partial') or page.get('complete') is False:
            fail('Arcmira returned a preview, access gate or partial envelope; no records from this page were emitted.')
        if self.name != 'channel_videos' and page.get('note'):
            fail('Arcmira results are preview-limited; the configured scope cannot be fully exported with this account.')
        if any(k in page for k in ('access', 'access_status', 'coverage')):
            fail('Arcmira returned unrecognized access or coverage metadata; review it before claiming a complete scoped export.')
        errors = list(self._validator.iter_errors(page))
        if errors:
            location = '.'.join(map(str, errors[0].absolute_path)) or 'response'
            fail(f'Arcmira response violates the released contract at {location}; the sync is incomplete.', FailureType.system_error)
        more, cursor = page['has_more'], page['next_cursor']
        if (more and (not isinstance(cursor, str) or not cursor)) or (not more and cursor is not None):
            fail('Arcmira pagination is inconsistent; the sync is incomplete.', FailureType.system_error)
        if more:
            if cursor in self._seen:
                fail('Arcmira repeated a pagination cursor; the sync is incomplete.', FailureType.system_error)
            self._seen.add(cursor)
        if self.name == 'channel_videos' and page['returned'] != len(page['episodes']):
            fail('Arcmira returned count does not match its records; the sync is incomplete.', FailureType.system_error)
        self._last_response, self._last_page = response, page
        return page

    def parse_response(self, response, stream_slice=None, **kwargs):
        page = self._page(response)
        scope = stream_slice['filters']
        encoded = json.dumps(scope, sort_keys=True, separators=(',', ':'))
        metadata = {'scope_id': hashlib.sha256(encoded.encode()).hexdigest(), 'scope': copy.deepcopy(scope), 'window': page['window']}
        if self.name == 'channel_videos':
            metadata.update({key: page[key] for key in ('indexed_through', 'index_age_days', 'as_of', 'note')})
            self.logger.info('Arcmira channel scope indexes %s through %s; %s', scope['channel_id'], page['indexed_through'], page['note'])
        for row in page[STREAMS[self.name][0]]:
            if '_arcmira' in row:
                fail('Arcmira row conflicts with connector metadata; the sync is incomplete.', FailureType.system_error)
            yield {**row, '_arcmira': copy.deepcopy(metadata)}

    def next_page_token(self, response):
        page = self._page(response)
        return {'cursor': page['next_cursor']} if page['has_more'] else None


def validate_config(config):
    schema = json.loads((ROOT / 'spec.json').read_text())['connectionSpecification']
    if not Draft202012Validator(schema).is_valid(config):
        fail('Invalid Arcmira configuration. Supply an API key and at least one valid explicit stream scope; consult spec.json.')
    for name in STREAMS:
        for scope in config.get(name, []):
            dates = []
            for field in ('after', 'before'):
                raw = scope.get(field)
                if raw is None:
                    dates.append(None)
                    continue
                try:
                    value = datetime.fromisoformat(raw.replace('Z', '+00:00'))
                    if 'T' in raw and value.tzinfo is None:
                        raise ValueError('Timezone required')
                    dates.append(value.replace(tzinfo=timezone.utc).timestamp() if value.tzinfo is None else value.timestamp())
                except ValueError:
                    fail(f'{name}.{field} needs an ISO date or datetime with timezone.')
            if all(v is not None for v in dates) and dates[0] >= dates[1]:
                fail(f'{name} requires after earlier than before.')


class SourceArcmira(AbstractSource):
    def spec(self, logger):
        spec = json.loads((ROOT / 'spec.json').read_text())
        spec['supported_destination_sync_modes'] = [DestinationSyncMode(v) for v in spec['supported_destination_sync_modes']]
        return ConnectorSpecification(**spec)

    def streams(self, config):
        validate_config(config)
        return [ArcmiraStream(name, config) for name in STREAMS if config.get(name)]

    def check_connection(self, logger, config):
        try:
            validate_config(config)
            response = requests.get(BASE + 'me', headers={'Authorization': f"Bearer {config['api_key']}"}, timeout=(10, 60), allow_redirects=False)
            if response.status_code != 200:
                return False, diagnostic(response)
            data = response.json()
            if not isinstance(data, dict) or 'error' in data or not isinstance(data.get('user_id'), str) or not isinstance(data.get('scopes'), list):
                return False, 'Arcmira account response was invalid.'
            return True, None
        except (AirbyteTracedException, requests.RequestException, ValueError):
            return False, 'Arcmira configuration or account check failed. No stream data was requested.'


if __name__ == '__main__':
    import sys
    launch(SourceArcmira(), sys.argv[1:])
