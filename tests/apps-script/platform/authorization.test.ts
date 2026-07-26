import { describe, expect, it } from 'vitest';
import { createAuthorizationServiceForTest } from '../../../apps-script/src/services/platform/authorization/authorization-service';

describe('AuthorizationService', () => {
  it('từ chối action không nằm trong role permission', () => {
    const service = createAuthorizationServiceForTest();
    const result = service.requireAction({ userId: 'cashier-1' }, 'platform.registry.view');
    expect(result).toEqual({ ok: false, code: 'PERMISSION_DENIED' });
  });

  it('từ chối warehouse ngoài scope đã cấp', () => {
    const service = createAuthorizationServiceForTest();
    const result = service.resolveScope({ userId: 'cashier-1' }, { warehouseId: 'warehouse-2' });
    expect(result).toEqual({ ok: false, code: 'SCOPE_DENIED' });
  });
});
