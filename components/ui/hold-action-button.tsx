'use client';

import { useRef, type ComponentProps, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';

type Props = Omit<ComponentProps<typeof Button>, 'onClick' | 'children'> & {
  children: ReactNode;
  onShort: () => void;
  onLong: () => void;
  holdMs?: number;
  stopPropagation?: boolean;
};

export function HoldActionButton({ children, onShort, onLong, holdMs = 500, stopPropagation = false, ...props }: Props) {
  const timer = useRef<number | null>(null);
  const longTriggered = useRef(false);

  const cancel = () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
  };

  return (
    <Button
      {...props}
      onPointerDown={(event) => {
        if (stopPropagation) event.stopPropagation();
        longTriggered.current = false;
        timer.current = window.setTimeout(() => {
          longTriggered.current = true;
          onLong();
          navigator.vibrate?.(25);
        }, holdMs);
      }}
      onPointerUp={cancel}
      onPointerCancel={cancel}
      onPointerLeave={cancel}
      onClick={(event) => {
        if (stopPropagation) event.stopPropagation();
        if (longTriggered.current) {
          longTriggered.current = false;
          return;
        }
        onShort();
        navigator.vibrate?.(8);
      }}
    >
      {children}
    </Button>
  );
}
