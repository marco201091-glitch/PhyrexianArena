export type TextSelection = {
  start: number;
  end: number;
};

export type RichTextEditResult = {
  value: string;
  selection: TextSelection;
};

function clampSelection(value: string, selection: TextSelection): TextSelection {
  const length = value.length;
  return {
    start: Math.max(0, Math.min(selection.start, length)),
    end: Math.max(0, Math.min(selection.end, length)),
  };
}

export function wrapSelectionWithMarker(
  value: string,
  selection: TextSelection,
  marker: string,
): RichTextEditResult {
  const { start, end } = clampSelection(value, selection);
  const selected = value.slice(start, end);
  const wrapped = `${marker}${selected}${marker}`;
  const nextValue = `${value.slice(0, start)}${wrapped}${value.slice(end)}`;

  if (!selected) {
    const cursor = start + marker.length;
    return {
      value: nextValue,
      selection: { start: cursor, end: cursor },
    };
  }

  return {
    value: nextValue,
    selection: {
      start: start + marker.length,
      end: start + marker.length + selected.length,
    },
  };
}

export function toggleLinePrefix(
  value: string,
  selection: TextSelection,
  prefix: string,
): RichTextEditResult {
  const { start, end } = clampSelection(value, selection);
  const lineStart = value.lastIndexOf('\n', Math.max(0, start - 1)) + 1;
  const lineEndIndex = value.indexOf('\n', end);
  const lineEnd = lineEndIndex === -1 ? value.length : lineEndIndex;
  const block = value.slice(lineStart, lineEnd);
  const lines = block.split('\n');

  const allPrefixed = lines.every((line) => line.startsWith(prefix));
  const nextLines = lines.map((line) => {
    if (allPrefixed) {
      return line.startsWith(prefix) ? line.slice(prefix.length) : line;
    }
    return line.length > 0 ? `${prefix}${line}` : line;
  });

  const nextBlock = nextLines.join('\n');
  const nextValue = `${value.slice(0, lineStart)}${nextBlock}${value.slice(lineEnd)}`;

  return {
    value: nextValue,
    selection: {
      start: lineStart,
      end: lineStart + nextBlock.length,
    },
  };
}

export type MarkdownInlineToken =
  | { type: 'text'; value: string }
  | { type: 'bold'; value: string }
  | { type: 'italic'; value: string }
  | { type: 'strike'; value: string };

const INLINE_PATTERN = /(\*\*[^*]+\*\*|\*[^*]+\*|_[^_]+_|~~[^~]+~~)/g;

export function parseInlineMarkdown(input: string): MarkdownInlineToken[] {
  if (!input) return [];

  const tokens: MarkdownInlineToken[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = INLINE_PATTERN.exec(input)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ type: 'text', value: input.slice(lastIndex, match.index) });
    }

    const token = match[0];
    if (token.startsWith('**')) {
      tokens.push({ type: 'bold', value: token.slice(2, -2) });
    } else if (token.startsWith('~~')) {
      tokens.push({ type: 'strike', value: token.slice(2, -2) });
    } else if (token.startsWith('*') || token.startsWith('_')) {
      tokens.push({ type: 'italic', value: token.slice(1, -1) });
    } else {
      tokens.push({ type: 'text', value: token });
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < input.length) {
    tokens.push({ type: 'text', value: input.slice(lastIndex) });
  }

  return tokens.length > 0 ? tokens : [{ type: 'text', value: input }];
}

export function splitMarkdownLines(input: string) {
  return input.replace(/\r\n/g, '\n').split('\n');
}