import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildClaspBootstrapArgs, isClaspRunApiExecutableError } from '../../scripts/bootstrap-default.mjs';

const repositoryRoot = process.cwd();

describe('bootstrap default tooling', () => {
  it('runs the owner bootstrap function through clasp run', () => {
    expect(buildClaspBootstrapArgs()).toEqual(['clasp', 'run', 'installDefaultTenant_']);
  });

  it('detects clasp API executable setup errors even when clasp exits zero', () => {
    expect(
      isClaspRunApiExecutableError('Script function not found. Please make sure script is deployed as API executable.'),
    ).toBe(true);
  });

  it('routes npm bootstrap:default through the checked wrapper', () => {
    const packageJson = JSON.parse(fs.readFileSync(path.join(repositoryRoot, 'package.json'), 'utf8')) as {
      scripts: Record<string, string>;
    };

    expect(packageJson.scripts['bootstrap:default']).toBe('node scripts/bootstrap-default.mjs');
  });
});
