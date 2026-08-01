import { describe, expect, it } from 'vitest';

type InstallReadinessStorageModule = typeof import('../../web/src/app/install/install-readiness-storage');

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.values.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

async function loadStorageModule(): Promise<InstallReadinessStorageModule> {
  const module = await import('../../web/src/app/install/install-readiness-storage').catch(
    () => undefined,
  );
  expect(module).toBeDefined();
  return module as InstallReadinessStorageModule;
}

describe('install readiness storage', () => {
  it('chỉ coi browser đã sẵn sàng khi marker Installed hợp lệ tồn tại', async () => {
    const { createInstallReadinessStorage } = await loadStorageModule();
    const storage = new MemoryStorage();
    const readiness = createInstallReadinessStorage(storage);

    expect(readiness.readInstalled()).toBe(false);

    readiness.markInstalled();

    expect(readiness.readInstalled()).toBe(true);

    readiness.clearInstalled();

    expect(readiness.readInstalled()).toBe(false);
  });

  it('không tin marker local bị hỏng hoặc khác version', async () => {
    const { INSTALL_READINESS_STORAGE_KEY, createInstallReadinessStorage } =
      await loadStorageModule();
    const storage = new MemoryStorage();
    const readiness = createInstallReadinessStorage(storage);

    storage.setItem(INSTALL_READINESS_STORAGE_KEY, 'Installed');
    expect(readiness.readInstalled()).toBe(false);

    storage.setItem(
      INSTALL_READINESS_STORAGE_KEY,
      JSON.stringify({ version: 999, status: 'Installed' }),
    );
    expect(readiness.readInstalled()).toBe(false);
  });
});
