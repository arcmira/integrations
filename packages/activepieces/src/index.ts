import { createAction, createPiece, PieceAuth, Property } from '@activepieces/pieces-framework';

async function request(path: '/v1/me' | '/v1/search', key: string, params?: URLSearchParams): Promise<unknown> {
  if (!key.trim()) throw new Error('Connect an Arcmira API key first.');
  const url = new URL(path, 'https://api.arcmira.com');
  if (params) url.search = params.toString();
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { Authorization: `Bearer ${key}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(30_000),
      redirect: 'error',
    });
  } catch {
    throw new Error('Arcmira request failed or timed out. No automatic retry was made.');
  }
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new Error(`Arcmira returned a non-JSON response (HTTP ${response.status}).`);
  }
  if (!response.ok) throw new Error(`Arcmira request failed (HTTP ${response.status}): ${JSON.stringify(body)}`);
  return body;
}

const auth = PieceAuth.SecretText({
  displayName: 'Arcmira API key',
  required: true,
  description: 'Create a key at https://arcmira.com/dashboard/api. API docs: https://arcmira.com/docs. Search uses your account allowance.',
  async validate({ auth: key }) {
    try {
      await request('/v1/me', key);
      return { valid: true };
    } catch (error) {
      return { valid: false, error: error instanceof Error ? error.message : 'Could not validate the Arcmira key.' };
    }
  },
});

const search = createAction({
  name: 'search_transcripts',
  auth,
  displayName: 'Search YouTube transcripts',
  description: 'Find timestamped passages across indexed videos. Uses your account search allowance. Returns evidence and coverage metadata.',
  props: {
    query: Property.ShortText({ displayName: 'Topic or phrase', required: true, description: 'Search one topic at a time. At least two characters.' }),
    limit: Property.Number({ displayName: 'Maximum passages', required: true, defaultValue: 5, description: 'An integer from 1 to 20.' }),
    channel_ids: Property.ShortText({ displayName: 'YouTube channel IDs', required: false, description: 'Up to eight comma-separated channel IDs. Use IDs, not channel names.' }),
    after: Property.ShortText({ displayName: 'Published on or after', required: false, description: 'Inclusive date or ISO 8601 instant in UTC.' }),
    before: Property.ShortText({ displayName: 'Published before', required: false, description: 'Exclusive date or ISO 8601 instant in UTC.' }),
    source: Property.StaticDropdown({
      displayName: 'Transcript source', required: false,
      description: 'Leave blank for the API default. Premium access depends on your account. No automatic fallback.',
      options: { options: [
        { label: 'Arcmira Premium', value: 'arcmira_premium' },
        { label: 'Creator captions', value: 'creator_captions' },
        { label: 'Third-party quick', value: 'third_party_quick' },
      ] },
    }),
  },
  async run(context) {
    const { query, limit, channel_ids, after, before, source } = context.propsValue;
    if (query.trim().length < 2) throw new Error('Enter a topic or phrase with at least two characters.');
    if (!Number.isInteger(limit) || limit < 1 || limit > 20) throw new Error('Maximum passages must be an integer from 1 to 20.');
    const params = new URLSearchParams({ q: query, limit: String(limit) });
    if (channel_ids?.trim()) params.set('channel_ids', channel_ids.trim());
    if (after?.trim()) params.set('after', after.trim());
    if (before?.trim()) params.set('before', before.trim());
    if (source) params.set('source', source);
    return request('/v1/search', context.auth.secret_text, params);
  },
});

export const arcmira = createPiece({
  displayName: 'Arcmira: YouTube Transcript Search',
  description: 'Search YouTube transcripts for timestamped evidence in your workflows. API documentation: https://arcmira.com/docs',
  logoUrl: 'https://arcmira.com/apple-touch-icon.png',
  authors: ['zealous1'],
  minimumSupportedRelease: '0.92.0',
  auth,
  actions: [search],
  triggers: [],
});
