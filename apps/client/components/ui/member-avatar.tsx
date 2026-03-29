'use client';

import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const avatarVariants = cva('rounded-full flex items-center justify-center font-semibold text-white shrink-0', {
  variants: {
    size: {
      xs: 'w-6 h-6 text-[9px]',
      sm: 'w-8 h-8 text-xs',
      md: 'w-10 h-10 text-sm',
      lg: 'w-12 h-12 text-base',
    },
  },
  defaultVariants: { size: 'md' },
});

const palette = ['#4A7C59', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#10B981'];

function getColor(name: string): string {
  let hash = 0;
  for (const c of name) hash = c.charCodeAt(0) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
}

interface MemberAvatarProps extends VariantProps<typeof avatarVariants> {
  name: string;
  avatarUrl?: string | null;
  className?: string;
}

export function MemberAvatar({ name, avatarUrl, size, className }: MemberAvatarProps) {
  const initials = name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className={cn(avatarVariants({ size }), 'object-cover', className)}
      />
    );
  }

  return (
    <div className={cn(avatarVariants({ size }), className)} style={{ backgroundColor: getColor(name) }}>
      {initials}
    </div>
  );
}
