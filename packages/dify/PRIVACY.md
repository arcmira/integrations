# Privacy

This plugin sends your search query, entity names, selected filters and the monitor ID you choose to `https://api.arcmira.com` over HTTPS. It sends your Arcmira API key in the Authorization header. Credential validation calls `/v1/me`; the plugin discards that account response after validation.

The plugin returns Arcmira's response to your Dify workflow or agent, including passages, speaker labels where available, timestamps, source links, coverage notes and your monitor's alerts. Dify and any model provider selected in your workflow may process that response. Review their policies and your workspace settings before sending sensitive queries.

The plugin code does not write queries, credentials or responses to files, use Dify storage, or send analytics. It makes no requests to other origins and does not automatically follow redirects. This does not describe or override Dify's logging and retention, model-provider handling, or Arcmira's server-side processing.

Arcmira's service privacy policy is available at https://arcmira.com/privacy. API documentation is at https://arcmira.com/docs. Contact zeal@arcmira.com for plugin support or privacy questions.
