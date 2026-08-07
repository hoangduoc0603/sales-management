import type { CurrentScopeResponse } from '@shared/contracts/platform/administration';
import type { ActorContextDTO } from '@shared/contracts/platform/authorization';

export interface BrowserStorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface StoredSessionSnapshot {
  sessionToken: string;
  actor: ActorContextDTO;
  currentScope: CurrentScopeResponse;
  absoluteExpiresAt?: string;
}

export interface SessionWriteOptions {
  rememberSession?: boolean;
  actor?: ActorContextDTO;
  currentScope?: CurrentScopeResponse;
  absoluteExpiresAt?: string;
}

export interface SessionStoragePort {
  read(): string | undefined;
  readSnapshot(): StoredSessionSnapshot | undefined;
  write(sessionToken: string, options?: SessionWriteOptions): void;
  writeSnapshot(snapshot: StoredSessionSnapshot): void;
  clear(): void;
}

export interface BrowserSessionStorageAdapters {
  session: BrowserStorageAdapter;
  persistent?: BrowserStorageAdapter;
}

const sessionTokenKey = 'sales-management.sessionToken.v1';
const rememberedSessionTokenKey = 'sales-management.rememberedSessionToken.v1';
const sessionSnapshotKey = 'sales-management.sessionSnapshot.v1';
const rememberedSessionSnapshotKey = 'sales-management.rememberedSessionSnapshot.v1';

export function createSessionStorage(
  adapter?: BrowserStorageAdapter | BrowserSessionStorageAdapters,
): SessionStoragePort {
  const storage = toStorageAdapters(adapter);

  return {
    read() {
      return readToken(storage.session, sessionTokenKey) ?? readToken(storage.persistent, rememberedSessionTokenKey);
    },
    readSnapshot() {
      return (
        readSnapshot(storage.session, sessionSnapshotKey) ??
        readSnapshot(storage.persistent, rememberedSessionSnapshotKey)
      );
    },
    write(sessionToken, options) {
      if (options?.rememberSession) {
        storage.session?.removeItem(sessionTokenKey);
        storage.session?.removeItem(sessionSnapshotKey);
        storage.persistent?.setItem(rememberedSessionTokenKey, sessionToken);
        writeSnapshotToStorage(storage.persistent, rememberedSessionSnapshotKey, buildSnapshot(sessionToken, options));
        return;
      }

      storage.persistent?.removeItem(rememberedSessionTokenKey);
      storage.persistent?.removeItem(rememberedSessionSnapshotKey);
      storage.session?.setItem(sessionTokenKey, sessionToken);
      writeSnapshotToStorage(storage.session, sessionSnapshotKey, buildSnapshot(sessionToken, options));
    },
    writeSnapshot(snapshot) {
      const hasSessionToken = readToken(storage.session, sessionTokenKey) === snapshot.sessionToken;
      const hasRememberedToken = readToken(storage.persistent, rememberedSessionTokenKey) === snapshot.sessionToken;

      if (hasRememberedToken && !hasSessionToken) {
        writeSnapshotToStorage(storage.persistent, rememberedSessionSnapshotKey, snapshot);
        return;
      }

      writeSnapshotToStorage(storage.session, sessionSnapshotKey, snapshot);
    },
    clear() {
      storage.session?.removeItem(sessionTokenKey);
      storage.session?.removeItem(sessionSnapshotKey);
      storage.persistent?.removeItem(rememberedSessionTokenKey);
      storage.persistent?.removeItem(rememberedSessionSnapshotKey);
    },
  };
}

function toStorageAdapters(
  adapter?: BrowserStorageAdapter | BrowserSessionStorageAdapters,
): { session?: BrowserStorageAdapter; persistent?: BrowserStorageAdapter } {
  if (adapter !== undefined && 'session' in adapter) {
    return adapter;
  }

  return {
    session: adapter ?? getBrowserSessionStorage(),
    persistent: getBrowserPersistentStorage(),
  };
}

function readToken(storage: BrowserStorageAdapter | undefined, key: string): string | undefined {
  const value = storage?.getItem(key)?.trim();
  return value && value.length > 0 ? value : undefined;
}

function buildSnapshot(sessionToken: string, options: SessionWriteOptions | undefined): StoredSessionSnapshot | undefined {
  if (!options?.actor || !options.currentScope) {
    return undefined;
  }

  return {
    sessionToken,
    actor: options.actor,
    currentScope: options.currentScope,
    absoluteExpiresAt: options.absoluteExpiresAt,
  };
}

function writeSnapshotToStorage(
  storage: BrowserStorageAdapter | undefined,
  key: string,
  snapshot: StoredSessionSnapshot | undefined,
): void {
  if (!storage) return;

  if (!snapshot) {
    storage.removeItem(key);
    return;
  }

  storage.setItem(key, JSON.stringify(snapshot));
}

function readSnapshot(
  storage: BrowserStorageAdapter | undefined,
  key: string,
): StoredSessionSnapshot | undefined {
  const rawValue = storage?.getItem(key);
  if (!rawValue) return undefined;

  try {
    const parsed = JSON.parse(rawValue) as Partial<StoredSessionSnapshot>;
    if (
      typeof parsed.sessionToken !== 'string' ||
      parsed.sessionToken.trim().length === 0 ||
      !parsed.actor ||
      !parsed.currentScope
    ) {
      return undefined;
    }

    if (typeof parsed.absoluteExpiresAt === 'string') {
      const expiresAtMs = Date.parse(parsed.absoluteExpiresAt);
      if (Number.isFinite(expiresAtMs) && expiresAtMs <= Date.now()) {
        return undefined;
      }
    }

    return {
      sessionToken: parsed.sessionToken,
      actor: parsed.actor,
      currentScope: parsed.currentScope,
      absoluteExpiresAt: parsed.absoluteExpiresAt,
    };
  } catch {
    return undefined;
  }
}

function getBrowserSessionStorage(): BrowserStorageAdapter | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }

  return window.sessionStorage;
}

function getBrowserPersistentStorage(): BrowserStorageAdapter | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }

  return window.localStorage;
}
