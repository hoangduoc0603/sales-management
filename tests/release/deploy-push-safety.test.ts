import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const repositoryRoot = process.cwd();

describe('deploy push safety guard', () => {
  it('documents and enforces local-only scriptId with dist rootDir before clasp push', () => {
    const deployScript = fs.readFileSync(path.join(repositoryRoot, 'scripts/deploy-push.mjs'), 'utf8');
    const claspExample = JSON.parse(
      fs.readFileSync(path.join(repositoryRoot, '.clasp.json.example'), 'utf8'),
    ) as Record<string, unknown>;

    expect(claspExample).toEqual({ rootDir: './dist' });
    expect(deployScript).toContain('validateLocalClaspConfig');
    expect(deployScript).toContain('scriptId');
    expect(deployScript).toContain("rootDir: './dist'");
    expect(deployScript).toContain("'clasp', 'push', '--force'");
    expect(deployScript).toContain('không được commit');
  });
});
