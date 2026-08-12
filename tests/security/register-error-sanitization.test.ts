import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('registration error sanitization', () => {
  it('does not return unexpected internal errors to clients', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'app/api/auth/register/route.ts'),
      'utf8',
    );

    expect(source).toContain("Registration failed. Please try again later.");
    expect(source).not.toContain('Registration failed: ${message}');
  });
});
