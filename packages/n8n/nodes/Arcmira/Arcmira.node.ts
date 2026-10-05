import { NodeConnectionTypes, type INodeType, type INodeTypeDescription } from 'n8n-workflow';

export class Arcmira implements INodeType {
 description: INodeTypeDescription = {
  "displayName": "Arcmira: YouTube Transcript Search",
  "name": "arcmira",
  "icon": {"light": "file:arcmira.svg", "dark": "file:arcmira.dark.svg"},
  "group": [
    "input"
  ],
  "version": 1,
  "subtitle": "={{$parameter[\"operation\"] + \": \" + $parameter[\"resource\"]}}",
  "description": "Find timestamped YouTube passages, speaker appearances, mentions and sponsored ad reads",
  "defaults": {
    "name": "Arcmira: YouTube Transcript Search"
  },
  "usableAsTool": true,
  "inputs": [
    NodeConnectionTypes.Main
  ],
  "outputs": [
    NodeConnectionTypes.Main
  ],
  "credentials": [
    {
      "name": "arcmiraApi",
      "required": true
    }
  ],
  "requestDefaults": {
    "baseURL": "https://api.arcmira.com/v1",
    "headers": {
      "Accept": "application/json"
    },
    "timeout": 30000,
    "disableFollowRedirect": true
  },
  "properties": [
    {
      "displayName": "Resource",
      "name": "resource",
      "type": "options",
      "noDataExpression": true,
      "options": [
        {
          "name": "Entity",
          "value": "entity"
        },
        {
          "name": "Transcript",
          "value": "transcript"
        }
      ],
      "default": "transcript"
    },
    {
      "displayName": "Operation",
      "name": "operation",
      "type": "options",
      "noDataExpression": true,
      "displayOptions": {
        "show": {
          "resource": [
            "transcript"
          ]
        }
      },
      "default": "search",
      "options": [
        {
          "name": "Search",
          "value": "search",
          "action": "Search YouTube transcripts",
          "routing": {
            "request": {
              "method": "GET",
              "url": "/search"
            }
          }
        }
      ]
    },
    {
      "displayName": "Query",
      "name": "q",
      "type": "string",
      "default": "",
      "description": "One topic or phrase. Do not concatenate unrelated names; make one call per topic.",
      "routing": {
        "send": {
          "type": "query",
          "property": "q"
        }
      },
      "required": true,
      "displayOptions": {
        "show": {
          "resource": [
            "transcript"
          ],
          "operation": [
            "search"
          ]
        }
      }
    },
    {
      "displayName": "Limit",
      "name": "limit",
      "type": "number",
      "default": 5,
      "description": "Chunks to return, 1 to 20. Default 5.",
      "routing": {
        "send": {
          "type": "query",
          "property": "limit"
        }
      },
      "typeOptions": {
        "minValue": 1,
        "maxValue": 20
      },
      "displayOptions": {
        "show": {
          "resource": [
            "transcript"
          ],
          "operation": [
            "search"
          ]
        }
      }
    },
    {
      "displayName": "Options",
      "name": "options",
      "type": "collection",
      "placeholder": "Add Option",
      "default": {},
      "displayOptions": {
        "show": {
          "resource": [
            "transcript"
          ],
          "operation": [
            "search"
          ]
        }
      },
      "options": [
        {
          "displayName": "Channel IDs",
          "name": "channelIds",
          "type": "string",
          "default": "",
          "description": "Comma-separated YouTube channel ids (UC...), at most 8. Pass every show in scope unless drilling into one. Ids only: a name answers 400 id_required. Resolve names first with GET /v1/entities/resolve.",
          "routing": {
            "send": {
              "type": "query",
              "property": "channel_ids"
            }
          }
        },
        {
          "displayName": "Entity IDs",
          "name": "entityIds",
          "type": "string",
          "default": "",
          "description": "Comma-separated entity ids (ent_{n}), at most 8. A person id filters to that person's appearances; a channel id widens channel_ids. Ids only: a name answers 400 id_required. Resolve names first with GET /v1/entities/resolve.",
          "routing": {
            "send": {
              "type": "query",
              "property": "entity_ids"
            }
          }
        },
        {
          "displayName": "Mentioned Entity IDs",
          "name": "about",
          "type": "string",
          "default": "",
          "description": "Comma-separated entity ids (ent_{n}), at most 8. Only passages about these entities: excerpt pins, exact-name mentions and ad verdicts. Ids only: a name answers 400 id_required. Resolve names first with GET /v1/entities/resolve.",
          "routing": {
            "send": {
              "type": "query",
              "property": "about"
            }
          }
        },
        {
          "displayName": "Passage Kind",
          "name": "kind",
          "type": "string",
          "default": "",
          "description": "Comma-separated passage classes: sponsored, organic, mention. Combine with about to read what was said about a brand in ad reads or in organic talk.",
          "routing": {
            "send": {
              "type": "query",
              "property": "kind"
            }
          }
        },
        {
          "displayName": "Published After",
          "name": "after",
          "type": "string",
          "default": "",
          "description": "Only media published at or after this instant. An after later than your plan's freshness gate is refused with freshness_requires_paid rather than widened. An ISO 8601 date (2026-09-01) or datetime with offset (2026-09-01T00:00:00Z), read in UTC. The window is half-open: after is inclusive, before is exclusive.",
          "routing": {
            "send": {
              "type": "query",
              "property": "after"
            }
          }
        },
        {
          "displayName": "Published Before",
          "name": "before",
          "type": "string",
          "default": "",
          "description": "Only media published before this instant, so before=2026-09-02 includes all of 2026-09-01. An ISO 8601 date (2026-09-01) or datetime with offset (2026-09-01T00:00:00Z), read in UTC. The window is half-open: after is inclusive, before is exclusive.",
          "routing": {
            "send": {
              "type": "query",
              "property": "before"
            }
          }
        },
        {
          "displayName": "Speaker IDs",
          "name": "by",
          "type": "string",
          "default": "",
          "description": "Comma-separated person ids (ent_{n}), at most 8. Only passages where one of these people says the query words (each line of a chunk is labeled with its speaker); a non-person id is refused with invalid_query naming its type. Speaker labels cover a minority of shows; an empty result carries a note saying whether the person is labeled anywhere. Ids only: a name answers 400 id_required. Resolve names first with GET /v1/entities/resolve.",
          "routing": {
            "send": {
              "type": "query",
              "property": "by"
            }
          }
        },
        {
          "displayName": "Transcript Source",
          "name": "source",
          "type": "options",
          "default": "arcmira_premium",
          "description": "Restrict to one transcript source class. arcmira_premium on a plan without Premium transcripts is refused with filter_requires_paid.",
          "routing": {
            "send": {
              "type": "query",
              "property": "source"
            }
          },
          "options": [
            {
              "name": "Arcmira Premium",
              "value": "arcmira_premium"
            },
            {
              "name": "Creator Captions",
              "value": "creator_captions"
            },
            {
              "name": "Third Party Quick",
              "value": "third_party_quick"
            }
          ]
        }
      ]
    },
    {
      "displayName": "Operation",
      "name": "operation",
      "type": "options",
      "noDataExpression": true,
      "displayOptions": {
        "show": {
          "resource": [
            "entity"
          ]
        }
      },
      "default": "resolve",
      "options": [
        {
          "name": "Resolve",
          "value": "resolve",
          "action": "Resolve an entity",
          "routing": {
            "request": {
              "method": "GET",
              "url": "/entities/resolve"
            }
          }
        }
      ]
    },
    {
      "displayName": "Query",
      "name": "q",
      "type": "string",
      "default": "",
      "description": "A name, @handle, YouTube URL or channel id (UC...). One thing per call.",
      "routing": {
        "send": {
          "type": "query",
          "property": "q"
        }
      },
      "required": true,
      "displayOptions": {
        "show": {
          "resource": [
            "entity"
          ],
          "operation": [
            "resolve"
          ]
        }
      }
    },
    {
      "displayName": "Limit",
      "name": "limit",
      "type": "number",
      "default": 8,
      "description": "Candidates to return, 1 to 15. Default 8.",
      "routing": {
        "send": {
          "type": "query",
          "property": "limit"
        }
      },
      "typeOptions": {
        "minValue": 1,
        "maxValue": 15
      },
      "displayOptions": {
        "show": {
          "resource": [
            "entity"
          ],
          "operation": [
            "resolve"
          ]
        }
      }
    },
    {
      "displayName": "Options",
      "name": "options",
      "type": "collection",
      "placeholder": "Add Option",
      "default": {},
      "displayOptions": {
        "show": {
          "resource": [
            "entity"
          ],
          "operation": [
            "resolve"
          ]
        }
      },
      "options": [
        {
          "displayName": "Context",
          "name": "context",
          "type": "string",
          "default": "",
          "description": "What the user said about the name, in their words (\"the startup bank\", \"Canada's prime minister\", \"on My First Million\"). Ranks candidates by their description and by the episodes they share with what the context names; a clear winner comes back as suggested with reason context.",
          "routing": {
            "send": {
              "type": "query",
              "property": "context"
            }
          }
        },
        {
          "displayName": "Entity Type",
          "name": "type",
          "type": "options",
          "default": "person",
          "description": "Restrict candidates to one type. Pass channel for a show and read best.youtube_channel_id.",
          "routing": {
            "send": {
              "type": "query",
              "property": "type"
            }
          },
          "options": [
            {
              "name": "Person",
              "value": "person"
            },
            {
              "name": "Organization",
              "value": "organization"
            },
            {
              "name": "Product",
              "value": "product"
            },
            {
              "name": "Topic",
              "value": "topic"
            },
            {
              "name": "Channel",
              "value": "channel"
            }
          ]
        }
      ]
    }
  ]
};
}
