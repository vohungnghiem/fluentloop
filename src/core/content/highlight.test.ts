import { describe, expect, it } from 'vitest';
import { chunkSegments } from './highlight';

const chunk = (id: string, en: string, forms: string[] = []) => ({
  id, en, forms, vi: '', example: en, exampleVi: '', answer: en,
});

describe('chunkSegments', () => {
  it('cuts out chunk forms, the longest first, whole words only', () => {
    const segments = chunkSegments('I pushed a fix. It was on track, not on my side.', [
      chunk('push-a-fix', 'push a fix', ['pushed a fix']),
      chunk('on-track', 'on track'),
      chunk('side', 'on my side'),
      chunk('ush', 'ush'),
    ]);
    expect(segments).toEqual([
      { text: 'I ' },
      { text: 'pushed a fix', chunkId: 'push-a-fix' },
      { text: '. It was ' },
      { text: 'on track', chunkId: 'on-track' },
      { text: ', not ' },
      { text: 'on my side', chunkId: 'side' },
      { text: '.' },
    ]);
  });
});
