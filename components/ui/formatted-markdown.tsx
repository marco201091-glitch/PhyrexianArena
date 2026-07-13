import { parseInlineMarkdown, splitMarkdownLines } from '@/lib/rich-text';
import { cn } from '@/lib/utils';

type FormattedMarkdownProps = {
  value: string;
  className?: string;
};

function renderInline(text: string, keyPrefix: string) {
  return parseInlineMarkdown(text).map((token, index) => {
    const key = `${keyPrefix}-${index}`;
    if (token.type === 'bold') {
      return <strong key={key} className="font-semibold text-foreground">{token.value}</strong>;
    }
    if (token.type === 'italic') {
      return <em key={key} className="italic">{token.value}</em>;
    }
    if (token.type === 'strike') {
      return <span key={key} className="line-through">{token.value}</span>;
    }
    return <span key={key}>{token.value}</span>;
  });
}

export function FormattedMarkdown({ value, className }: FormattedMarkdownProps) {
  const lines = splitMarkdownLines(value);

  return (
    <div className={cn('space-y-1 text-sm leading-relaxed text-muted-foreground', className)}>
      {lines.map((line, index) => {
        const bulletMatch = line.match(/^- (.+)$/);
        if (bulletMatch) {
          return (
            <div key={`line-${index}`} className="flex gap-2">
              <span className="text-muted-foreground">•</span>
              <span>{renderInline(bulletMatch[1], `line-${index}`)}</span>
            </div>
          );
        }

        if (!line.trim()) {
          return <div key={`line-${index}`} className="h-2" />;
        }

        return (
          <p key={`line-${index}`}>
            {renderInline(line, `line-${index}`)}
          </p>
        );
      })}
    </div>
  );
}