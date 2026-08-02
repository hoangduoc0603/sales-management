import type { ActorContextDTO } from './authorization';
import type { CurrentScopeResponse } from './administration';

export interface AuthLoginRequest {
  loginId: string;
  password: string;
  rememberSession?: boolean;
}

export interface AuthLoginResponse {
  sessionToken: string;
  actor: ActorContextDTO;
  currentScope: CurrentScopeResponse;
  idleExpiresAt: string;
  absoluteExpiresAt: string;
  passwordChangeRequired: boolean;
}

export interface AuthLogoutRequest {
  sessionToken?: string;
}

export interface AuthLogoutResponse {
  revoked: boolean;
}

export type SessionMeRequest = Record<string, never>;

export interface SessionMeResponse {
  actor: ActorContextDTO;
  idleExpiresAt: string;
  absoluteExpiresAt: string;
}

export interface SessionBootstrapResponse extends SessionMeResponse {
  currentScope: CurrentScopeResponse;
}

export interface AuthChangeOwnPasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface AuthChangeOwnPasswordResponse {
  changed: boolean;
  sessionRevoked: boolean;
}
