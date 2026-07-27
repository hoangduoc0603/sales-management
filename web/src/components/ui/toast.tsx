import type { BadgeTone } from './badge';

export interface ToastProps {
  message: string;
  tone?: BadgeTone;
}

export function Toast({ message, tone = 'neutral' }: ToastProps) {
  return (
    <div className={`cn-toast cn-toast-${tone}`} role="status">
      <span aria-hidden="true">✓</span>
      <span>{message}</span>
    </div>
  );
}
