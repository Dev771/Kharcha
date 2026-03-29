'use client';

import { cn } from '@/lib/utils';
import { MemberAvatar } from './member-avatar';

interface AvatarStackProps {
  members: { name: string; avatarUrl?: string | null }[];
  max?: number;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

const overflowSize = { xs: 'w-6 h-6 text-[9px]', sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm' };

export function AvatarStack({ members, max = 3, size = 'sm', className }: AvatarStackProps) {
  const shown = members.slice(0, max);
  const overflow = members.length - max;

  return (
    <div className={cn('flex -space-x-1.5', className)}>
      {shown.map((m, i) => (
        <MemberAvatar key={i} name={m.name} avatarUrl={m.avatarUrl} size={size} className="ring-2 ring-[var(--card)]" />
      ))}
      {overflow > 0 && (
        <div className={cn(overflowSize[size], 'rounded-full ring-2 ring-[var(--card)] bg-[var(--muted)] text-[var(--muted-foreground)] flex items-center justify-center font-medium')}>
          +{overflow}
        </div>
      )}
    </div>
  );
}
