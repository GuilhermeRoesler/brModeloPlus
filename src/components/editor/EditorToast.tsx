import { useEffect } from 'react';
import { CheckCircle2, Info, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type ToastTone = 'success' | 'info';

export type ToastMessage = {
  id: number;
  text: string;
  tone?: ToastTone;
};

type EditorToastProps = {
  toast: ToastMessage | null;
  onDismiss: () => void;
};

export const EditorToast = ({ toast, onDismiss }: EditorToastProps) => {
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(onDismiss, 2800);
    return () => window.clearTimeout(t);
  }, [toast, onDismiss]);

  if (!toast) return null;

  const Icon = toast.tone === 'info' ? Info : CheckCircle2;

  return (
    <div
      role="status"
      className={cn(
        'editor-toast fixed bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 z-50',
        'flex items-center gap-2.5 pl-3.5 pr-2 py-2 rounded-xl editor-chrome shadow-lg',
        'max-w-[min(90vw,22rem)]',
      )}
    >
      <Icon
        className={cn(
          'size-4 shrink-0',
          toast.tone === 'info' ? 'text-primary' : 'text-emerald-600',
        )}
      />
      <p className="text-xs font-medium text-foreground leading-snug flex-1 min-w-0">
        {toast.text}
      </p>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        onClick={onDismiss}
        className="rounded-lg text-muted-foreground shrink-0"
        aria-label="Fechar"
      >
        <X />
      </Button>
    </div>
  );
};
