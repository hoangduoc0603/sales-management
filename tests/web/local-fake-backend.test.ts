import { describe, expect, it } from 'vitest';
import { createLocalFakeBackendClient } from '../../web/src/lib/api/local-fake-backend';

describe('createLocalFakeBackendClient', () => {
  it('login local và dùng session để gọi protected registry query', async () => {
    const client = createLocalFakeBackendClient();

    const login = await client.invoke({
      operation: 'platform.auth.login',
      requestId: 'req-login',
      payload: { loginId: 'admin', password: 'admin123' },
    });

    expect(login).toMatchObject({ ok: true });
    if (!login.ok) throw new Error('login failed');

    const registry = await client.invoke({
      operation: 'platform.registry.getTableDefinitions',
      requestId: 'req-registry',
      sessionToken: login.data.sessionToken,
      payload: {},
    });

    expect(registry).toMatchObject({ ok: true });
    if (!registry.ok) throw new Error('registry failed');
    expect(registry.data.tables.map((table) => table.tableName)).toContain('CommandTransaction');
  });

  it('trả SESSION_REQUIRED cho protected operation thiếu session', async () => {
    const client = createLocalFakeBackendClient();

    await expect(
      client.invoke({
        operation: 'platform.session.me',
        requestId: 'req-me',
        payload: {},
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: 'SESSION_REQUIRED' },
    });
  });
});
