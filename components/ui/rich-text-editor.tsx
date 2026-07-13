'use client';

import { useCallback, useRef, useState } from 'react';
import { Bold, Italic, List, Strikethrough } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  toggleLinePrefix,
  wrapSelectionWithMarker,
  type TextSelection,
} from '@/lib/rich-text';

type RichTextEditorProps = {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  hint?: string;
  className?: string;
  minRows?: number;
};

function readSelection(element: HTMLTextAreaElement): TextSelection {
  return {
    start: element.selectionStart ?? 0,
    end: element.selectionEnd ?? 0,
  };
}

export function RichTextEditor({
  value,
  onChange,
  label,
  placeholder,
  hint,
  className,
  minRows = 4,
}: RichTextEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [selection, setSelection] = useState<TextSelection>({ start: 0, end: 0 });

  const syncSelection = useCallback(() => {
    if (!textareaRef.current) return;
    setSelection(readSelection(textareaRef.current));
  }, []);

  const applyEdit = useCallback((
    editor: (currentValue: string, currentSelection: TextSelection) => {
      value: string;
      selection: TextSelection;
    },
  ) => {
    const result = editor(value, selection);
    onChange(result.value);
    setSelection(result.selection);
    requestAnimationFrame(() => {
      const element = textareaRef.current;
      if (!element) return;
      element.focus();
      element.setSelectionRange(result.selection.start, result.selection.end);
    });
  }, [onChange, selection, value]);

  const toolbarButtonClass =
    'inline-flex h-8 w-8 items-center justify-center rounded-md border border-border/80 bg-background/60 text-muted-foreground transition-colors hover:border-violet-500/40 hover:text-foreground';

  return (
    <div className={cn('space-y-2', className)}>
      {label ? <label className="text-sm font-medium text-foreground">{label}</label> : null}
      <div className="overflow-hidden rounded-md border border-input bg-background/50">
        <div className="flex items-center gap-1 border-b border-border/70 px-2 py-1.5">
          <button
            type="button"
            className={toolbarButtonClass}
            aria-label="Bold"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => applyEdit((currentValue, currentSelection) => wrapSelectionWithMarker(currentValue, currentSelection, '**'))}
          >
            <Bold className="h-4 w-4" />
          </button>
          <button
            type="button"
            className={toolbarButtonClass}
            aria-label="Italic"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => applyEdit((currentValue, currentSelection) => wrapSelectionWithMarker(currentValue, currentSelection, '*'))}
          >
            <Italic className="h-4 w-4" />
          </button>
          <button
            type="button"
            className={toolbarButtonClass}
            aria-label="Strikethrough"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => applyEdit((currentValue, currentSelection) => wrapSelectionWithMarker(currentValue, currentSelection, '~~'))}
          >
            <Strikethrough className="h-4 w-4" />
          </button>
          <button
            type="button"
            className={toolbarButtonClass}
            aria-label="Bullet list"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => applyEdit((currentValue, currentSelection) => toggleLinePrefix(currentValue, currentSelection, '- '))}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onSelect={syncSelection}
          onKeyUp={syncSelection}
          onClick={syncSelection}
          placeholder={placeholder}
          rows={minRows}
          className="min-h-24 resize-y border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
        />
      </div>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}