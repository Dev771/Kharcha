/**
 * Platform-agnostic UI component prop interfaces.
 * Web (React) and Mobile (React Native) implement these with platform-specific rendering.
 */

export interface AmountDisplayProps {
  paise: number;
  currency?: string;
  showSign?: boolean;
  colorize?: boolean;
  size?: 'sm' | 'base' | 'lg' | 'xl' | 'hero';
}

export interface MemberAvatarProps {
  name: string;
  avatarUrl?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

export interface AvatarStackProps {
  members: { name: string; avatarUrl?: string | null }[];
  max?: number;
  size?: 'xs' | 'sm' | 'md';
}

export interface ProgressRingProps {
  value: number;
  max: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
}

export interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
}
