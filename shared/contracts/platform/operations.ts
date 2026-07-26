export const operationNames = [
  'platform.auth.login',
  'platform.auth.logout',
  'platform.session.me',
  'platform.command.getStatus',
  'platform.registry.getTableDefinitions',
] as const;

export type OperationName = (typeof operationNames)[number];

export type OperationKind = 'public' | 'query' | 'mutation';

export const apiActions = [
  'platform.auth.logout',
  'platform.session.view',
  'platform.command.view',
  'platform.registry.view',
] as const;

export type ApiAction = (typeof apiActions)[number] | string;

export function isOperationName(value: string): value is OperationName {
  return operationNames.includes(value as OperationName);
}
