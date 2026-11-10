import { describe, expect, it } from 'vitest';
import { cleanKey, keyLooksRight, maskKey } from './keyTransfer';

describe('key transfer', () => {
  it('cleans what comes with a copied key', () => {
    expect(cleanKey('  "AIzaSyA1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q"\n')).toBe('AIzaSyA1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q');
    expect(cleanKey('sk-or-v1-abc def')).toBe('sk-or-v1-abcdef');
  });
  it('checks the shape per provider', () => {
    expect(keyLooksRight('gemini', 'AIzaSyA1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q')).toBe(true);
    expect(keyLooksRight('gemini', 'sk-abc')).toBe(false);
    expect(keyLooksRight('openrouter', 'sk-or-v1-0123456789abcdef0123')).toBe(true);
    expect(keyLooksRight('openai', 'sk-or-v1-0123456789abcdef0123')).toBe(false);
  });
  it('masks', () => expect(maskKey('AIzaSyA1b2C3d4E5f6G7h8')).toBe('AIzaSy…f6G7h8'.slice(0, 6) + '…' + 'G7h8'));
});
