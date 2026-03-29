'use client';

import { useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function BottomSheet({ open, onClose, title, children, className }: BottomSheetProps) {
  const handleEsc = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [open, handleEsc]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/35 animate-fade-in" onClick={onClose} />

      {/* Sheet — bottom on mobile, right on desktop */}
      <div className={cn(
        'absolute bg-[var(--card)] overflow-y-auto',
        // Mobile: bottom sheet
        'bottom-0 left-0 right-0 max-h-[90vh] rounded-t-3xl animate-slide-up',
        // Desktop: side sheet
        'md:bottom-auto md:top-0 md:left-auto md:right-0 md:max-h-none md:h-full md:w-full md:max-w-md md:rounded-none md:animate-slide-in-right',
        className,
      )}>
        {/* Drag handle (mobile only) */}
        <div className="md:hidden pt-3 pb-2">
          <div className="sheet-handle" />
        </div>

        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border)]">
            <h2 className="text-md font-semibold text-[var(--foreground)]">{title}</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-[var(--subtle)] text-[var(--muted-foreground)] min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              ✕
            </button>
          </div>
        )}

        {/* Content */}
        <div className="px-5 py-4 pb-safe">
          {children}
        </div>
      </div>
    </div>
  );
}
