import { describe, expect, it } from 'vitest';
import { createApiComposition } from '../../../apps-script/src/bootstrap/create-api-composition';

describe('platform composition', () => {
  it('login rồi gọi protected registry query qua cùng invoke pipeline', () => {
    const composition = createApiComposition({
      now: () => new Date('2026-07-26T00:00:00.000Z'),
    });

    const login = composition.invoke({
      operation: 'platform.auth.login',
      requestId: 'req-login',
      payload: { loginId: 'admin', password: 'admin123' },
    });
    if (!login.ok) throw new Error('login failed');

    const registry = composition.invoke({
      operation: 'platform.registry.getTableDefinitions',
      requestId: 'req-registry',
      sessionToken: login.data.sessionToken,
      payload: {},
    });

    expect(registry).toMatchObject({ ok: true });
    if (!registry.ok) throw new Error('registry failed');
    expect(registry.data.tables.map((table) => table.tableName)).toContain('CommandTransaction');
  });
});
