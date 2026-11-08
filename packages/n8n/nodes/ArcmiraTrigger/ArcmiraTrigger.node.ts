import {
 NodeConnectionTypes,
 NodeOperationError,
 type IDataObject,
 type IHttpRequestOptions,
 type ILoadOptionsFunctions,
 type INodeExecutionData,
 type INodePropertyOptions,
 type INodeType,
 type INodeTypeDescription,
 type IPollFunctions,
} from 'n8n-workflow';

const API = 'https://api.arcmira.com/v1';
// The most alerts one GET /v1/monitors/{id}/alerts call returns. The endpoint does not paginate.
const ALERTS_PER_POLL = 100;
// Keys kept from earlier polls, so an alert that drops out of one response and returns is not new.
const SEEN_LIMIT = 1000;

interface Alert extends IDataObject {
 id: string;
 tracker_id?: string | null;
 mention_id?: string | null;
 status?: string;
 final_status?: string | null;
}

interface PollState {
 monitorId: string;
 seen: string[];
}

function request(path: string, qs?: IDataObject): IHttpRequestOptions {
 return {method: 'GET', url: API + path, qs, headers: {Accept: 'application/json'}, json: true, timeout: 30000, disableFollowRedirect: true};
}

// The endpoint lists deliveries. One alert sent by email to two people and to Slack is three rows
// with three ids, so rows for the same tracker and mention count as one alert.
function alertKey(alert: Alert): string {
 return alert.tracker_id && alert.mention_id ? `${alert.tracker_id}/${alert.mention_id}` : alert.id;
}

function readState(data: IDataObject): PollState | undefined {
 const {monitorId, seen} = data;
 if (typeof monitorId !== 'string' || !Array.isArray(seen)) return undefined;
 return {monitorId, seen: seen.filter((key): key is string => typeof key === 'string')};
}

/** New alerts since the last poll of this monitor, oldest first. A first poll records without emitting. */
function newAlerts(alerts: Alert[], state: PollState | undefined, monitorId: string): Alert[] {
 if (state === undefined || state.monitorId !== monitorId) return [];
 const seen = new Set(state.seen);
 const fresh: Alert[] = [];
 for (const alert of [...alerts].reverse()) {
  const key = alertKey(alert);
  if (seen.has(key)) continue;
  seen.add(key);
  fresh.push(alert);
 }
 return fresh;
}

// Only delivered alerts fire the trigger. A pending one waits for a later poll. One held back for
// credits, skipped or failed never fires, so the workflow never gets an alert the plan did not pay for.
function delivered(alert: Alert): boolean {
 return alert.status === 'sent' || alert.final_status === 'delivered';
}

function parseAlerts(body: unknown): Alert[] | undefined {
 const alerts: unknown = (body as IDataObject | undefined)?.alerts;
 if (!Array.isArray(alerts)) return undefined;
 return alerts.every(alert => typeof alert?.id === 'string') ? (alerts as Alert[]).filter(delivered) : undefined;
}

function remember(alerts: Alert[], state: PollState | undefined, monitorId: string): string[] {
 const earlier = state?.monitorId === monitorId ? state.seen : [];
 return [...new Set([...alerts.map(alertKey), ...earlier])].slice(0, SEEN_LIMIT);
}

// Only deliveries sent at once write alert rows: Slack, webhooks, and email set to realtime.
// Hourly and daily email goes out as a digest and writes none.
function instantChannels(monitor: IDataObject): string[] {
 const recipients = Array.isArray(monitor.email_recipients)
  ? (monitor.email_recipients as IDataObject[]).filter(recipient => recipient?.status === 'active')
  : Array.isArray(monitor.notify_emails) ? monitor.notify_emails : [];
 const frequency = monitor.notify_frequency ?? 'realtime';
 return [
  recipients.length > 0 && (frequency === 'realtime' || frequency === 'instant') ? 'email' : '',
  monitor.notify_slack === true && monitor.slack_integration_id ? 'Slack' : '',
  monitor.notify_webhook === true && monitor.webhook_url && !monitor.webhook_disabled_at ? 'webhook' : '',
 ].filter(Boolean);
}

/** What the picker says about a monitor's deliveries, or undefined when the response does not show them. */
function deliveryNote(monitor: IDataObject): string | undefined {
 if (typeof monitor.notify_slack !== 'boolean' || typeof monitor.notify_webhook !== 'boolean') return undefined;
 if (monitor.paused === true) return 'Paused. It sends no alerts, so this trigger will not fire until you resume the monitor.';
 const channels = instantChannels(monitor);
 if (channels.length > 0) return `Instant alerts by ${channels.join(', ')}.`;
 const digest = monitor.notify_frequency === 'hourly' || monitor.notify_frequency === 'daily'
  ? ` Its email digest is ${monitor.notify_frequency}, and digests create no alerts.`
  : '';
 return `No instant alerts, so this trigger will never fire.${digest} Turn on instant email or Slack for this monitor in Arcmira.`;
}

export class ArcmiraTrigger implements INodeType {
 description: INodeTypeDescription = {
  displayName: 'Arcmira Trigger',
  name: 'arcmiraTrigger',
  icon: {light: 'file:../Arcmira/arcmira.svg', dark: 'file:../Arcmira/arcmira.dark.svg'},
  group: ['trigger'],
  version: 1,
  subtitle: 'New monitor alert',
  description: 'Starts the workflow when an Arcmira monitor delivers a new alert',
  defaults: {name: 'Arcmira Trigger'},
  polling: true,
  inputs: [],
  outputs: [NodeConnectionTypes.Main],
  credentials: [{name: 'arcmiraApi', required: true}],
  properties: [
   {
    displayName: 'Monitor Name or ID',
    name: 'monitorId',
    type: 'options',
    typeOptions: {loadOptionsMethod: 'getMonitors'},
    required: true,
    default: '',
    description: 'Use a monitor with instant email or Slack alerts. Hourly and daily email digests create no alerts, so a digest-only monitor never fires this trigger. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
   },
   {
    displayName: 'Use a monitor with instant email or Slack alerts. Hourly and daily email digests create no alerts here, and the monitor list marks monitors that would never fire. Each poll reads the monitor\'s newest 100 alerts and emits the delivered ones it has not seen. An alert that is still sending fires on a later poll. One held back, skipped or failed never fires. The first poll after activation records the current alerts without emitting them.',
    name: 'notice',
    type: 'notice',
    default: '',
   },
  ],
 };

 methods = {
  loadOptions: {
   async getMonitors(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
    const body = await this.helpers.httpRequestWithAuthentication.call(this, 'arcmiraApi', request('/monitors'));
    const monitors: IDataObject[] = Array.isArray(body?.monitors) ? body.monitors : [];
    return monitors.map(monitor => {
     const description = deliveryNote(monitor);
     return {name: String(monitor.name ?? monitor.id), value: String(monitor.id), ...(description ? {description} : {})};
    });
   },
  },
 };

 async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
  const monitorId = String(this.getNodeParameter('monitorId')).trim();
  if (!monitorId) throw new NodeOperationError(this.getNode(), 'Choose a monitor.');
  const body = await this.helpers.httpRequestWithAuthentication.call(this, 'arcmiraApi', request(`/monitors/${encodeURIComponent(monitorId)}/alerts`, {limit: ALERTS_PER_POLL}));
  const alerts = parseAlerts(body);
  if (alerts === undefined) throw new NodeOperationError(this.getNode(), 'Arcmira returned an unexpected alert list.');

  if (this.getMode() === 'manual') {
   if (alerts.length === 0) throw new NodeOperationError(this.getNode(), 'This monitor has no delivered alerts yet. An alert appears when the monitor finds a new mention and sends it.');
   return [this.helpers.returnJsonArray([alerts[0]])];
  }

  const staticData = this.getWorkflowStaticData('node');
  const state = readState(staticData);
  const fresh = newAlerts(alerts, state, monitorId);
  staticData.monitorId = monitorId;
  staticData.seen = remember(alerts, state, monitorId);
  return fresh.length ? [this.helpers.returnJsonArray(fresh)] : null;
 }
}
