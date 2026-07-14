import { describe, expect, it } from 'vitest';
import { parseInlineMarkdown, toggleLinePrefix, wrapSelectionWithMarker } from '@/lib/rich-text';

describe('rich-text', () => {
  it('wraps selected text with bold markers', () => {
    const result = wrapSelectionWithMarker('hello world', { start: 6, end: 11 }, '**');
    expect(result.value).toBe('hello **world**');
    expect(result.selection).toEqual({ start: 8, end: 13 });
  });

  it('toggles bullet prefixes on selected lines', () => {
    const value = 'line one\nline two';
    const result = toggleLinePrefix(value, { start: 0, end: value.length }, '- ');
    expect(result.value).toBe('- line one\n- line two');
  });

  it('parses inline markdown tokens', () => {
    expect(parseInlineMarkdown('**bold** and *italic*')).toEqual([
      { type: 'bold', value: 'bold' },
      { type: 'text', value: ' and ' },
      { type: 'italic', value: 'italic' },
    ]);
  });
});