'use client';

import { cn } from '@/lib/utils';

export function SkeletonLine({ className }: { className?: string }) {
  return <div className={cn('skeleton h-4 w-full', className)} />;
}

export function SkeletonCircle({ className, size = 40 }: { className?: string; size?: number }) {
  return <div className={cn('skeleton rounded-full')} style={{ width: size, height: size }} />;
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('card-surface p-4 space-y-3', className)}>
      <div className="flex items-center gap-3">
        <SkeletonCircle size={40} />
        <div className="flex-1 space-y-2">
          <SkeletonLine className="w-2/3" />
          <SkeletonLine className="w-1/3 h-3" />
        </div>
      </div>
    </div>
  );
}
