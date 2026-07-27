import type { HTMLAttributes } from 'react';

export type BadgeTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

export function Badge({ children, className, tone = 'neutral', ...props }: BadgeProps) {
  return (
    <span className={['cn-badge', `cn-badge-${tone}`, className].filter(Boolean).join(' ')} {...props}>
      {children}
    </span>
  );
}
