export const commandStatuses = ['Preparing', 'Committed', 'Failed'] as const;

export type CommandStatus = (typeof commandStatuses)[number];

export interface CommandStatusRequest {
  commandId?: string;
  idempotencyKey?: string;
}

export interface CommandStatusDTO {
  commandId: string;
  idempotencyKey: string;
  status: CommandStatus;
  resultJson?: string;
  errorCode?: string;
  updatedAt: string;
}

export interface CommandStatusResponse {
  command?: CommandStatusDTO;
}
