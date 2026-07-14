import { describe, expect, it } from 'vitest';
import { resolveArchidektFaceIndex } from '@/lib/archidekt-commander-images';

const eirduFaces = [
  { name: 'Eirdu, Carrier of Dawn' },
  { name: 'Isilu, Carrier of Twilight' },
];

const eirduNames = [
  'Eirdu, Carrier of Dawn // Isilu, Carrier of Twilight',
  'Eirdu, Carrier of Dawn',
  'Isilu, Carrier of Twilight',
];

describe('archidekt commander face resolution', () => {
  it('resolves Eirdu to face 0 and Isilu to face 1', () => {
    expect(resolveArchidektFaceIndex(eirduNames, eirduFaces, 'Eirdu, Carrier of Dawn')).toBe(0);
    expect(resolveArchidektFaceIndex(eirduNames, eirduFaces, 'Isilu, Carrier of Twilight')).toBe(1);
  });

  it('resolves split DFC names from the combined oracle label', () => {
    const urabraskFaces = [
      { name: 'Urabrask' },
      { name: 'The Great Burn' },
    ];
    const urabraskNames = ['Urabrask // The Great Burn', 'Urabrask', 'The Great Burn'];

    expect(resolveArchidektFaceIndex(urabraskNames, urabraskFaces, 'Urabrask')).toBe(0);
    expect(resolveArchidektFaceIndex(urabraskNames, urabraskFaces, 'The Great Burn')).toBe(1);
  });

  it('defaults to face 0 when no face matches', () => {
    expect(resolveArchidektFaceIndex(['Sol Ring'], [], 'Sol Ring')).toBe(0);
  });
});