import type { IAuthenticateGeneric, ICredentialTestRequest, ICredentialType, INodeProperties, Icon } from 'n8n-workflow';

export class ArcmiraApi implements ICredentialType {
 name = 'arcmiraApi';
 displayName = 'Arcmira API';
 icon: Icon = {light: 'file:../nodes/Arcmira/arcmira.svg', dark: 'file:../nodes/Arcmira/arcmira.dark.svg'};
 documentationUrl = 'https://arcmira.com/docs';
 properties: INodeProperties[] = [{displayName: 'API Key',name: 'apiKey',type: 'string',typeOptions: {password: true},required: true,default: ''}];
 authenticate: IAuthenticateGeneric = {type: 'generic',properties: {headers: {Authorization: '=Bearer {{$credentials.apiKey}}'}}};
 test: ICredentialTestRequest = {request: {baseURL: 'https://api.arcmira.com/v1',url: '/me',method: 'GET',timeout: 30000,disableFollowRedirect: true}};
}
