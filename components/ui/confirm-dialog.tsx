'use client';

import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type ConfirmAction = {
  label: string;
  variant?: 'default' | 'outline' | 'destructive';
  onClick: () => void;
};

type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  message: string;
  actions: ConfirmAction[];
};

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  message,
  actions,
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="border-border/70 bg-card/95 text-foreground sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{message}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-col sm:space-x-0">
          {actions.map((action, index) => (
            <Button
              key={`${action.label}-${index}`}
              type="button"
              variant={action.variant ?? (index === actions.length - 1 ? 'default' : 'outline')}
              className="w-full sm:w-full"
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          ))}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}