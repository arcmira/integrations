# YouTube transcript search in Cursor, VS Code, Kiro and Zed

Connect your editor to Arcmira to find what someone said across indexed YouTube videos and podcasts. Results include the passage and a link to the recording at that timestamp.

[Add to Cursor](https://cursor.com/install-mcp?name=arcmira&config=eyJ1cmwiOiJodHRwczovL21jcC5hcmNtaXJhLmNvbS9tY3AifQ%3D%3D) · [Add to VS Code](https://vscode.dev/redirect/mcp/install?name=arcmira&config=%7B%22type%22%3A%22http%22%2C%22url%22%3A%22https%3A%2F%2Fmcp.arcmira.com%2Fmcp%22%7D) · [Add to Kiro](https://kiro.dev/launch/mcp/add/?name=arcmira&config=%7B%22url%22%3A%22https%3A%2F%2Fmcp.arcmira.com%2Fmcp%22%2C%22disabled%22%3Afalse%2C%22autoApprove%22%3A%5B%5D%7D)

Open the link for your editor, review the server URL and sign in with Arcmira when prompted. The links configure the hosted MCP endpoint, `https://mcp.arcmira.com/mcp`.

## Research skills in VS Code

With the [Agent Skills extension](https://marketplace.visualstudio.com/items?itemName=formulahendry.agent-skills), you can add Arcmira’s workflows for finding quotes, comparing shows and researching sponsors. In VS Code settings, append this entry to the `agentSkills.skillRepositories` array:

```json
{
  "owner": "arcmira",
  "repo": "mcp",
  "path": "plugins/arcmira/skills",
  "branch": "master"
}
```

Open **Agent Skills → Marketplace**, expand **arcmira/mcp** and select a skill to install. For transcript-based clip search, choose **find-quotes**. The extension saves the instructions in your workspace under `.github/skills/`. Use the **Add to VS Code** link above to connect the research tools.

## Zed

Merge this entry into the `context_servers` object in your Zed settings. Keep any other servers already configured there.

```json
{
  "context_servers": {
    "arcmira": {
      "url": "https://mcp.arcmira.com/mcp"
    }
  }
}
```

Open MCP settings in the Agent Panel and sign in to Arcmira. [Zed’s custom server guide](https://zed.dev/docs/ai/mcp#as-custom-servers)

## Kiro CLI

To install the six research skills alongside the remote server, install the published power from a local checkout. The following commands use version 0.10.7.

```sh
git clone --depth 1 --branch v0.10.7 https://github.com/arcmira/mcp.git arcmira-mcp
kiro-cli powers install ./arcmira-mcp/plugins/arcmira
```

To remove the power, run `kiro-cli powers uninstall arcmira`. [Kiro’s power installation guide](https://kiro.dev/docs/powers/installation/)

## Try a search

> Find three passages about datacenter power demand. For each one, give me the quote, channel, publication date and timestamped link so I can check it against the original recording.

[Arcmira](https://arcmira.com) · [API docs](https://arcmira.com/docs) · [MCP tools and account access](https://arcmira.com/docs/mcp-server)
