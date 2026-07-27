import type { ReactNode } from 'react';
import { Button } from './button';

export type StateBlockTone = 'neutral' | 'info' | 'warning' | 'danger' | 'restricted';

export interface StateBlockProps {
  tone?: StateBlockTone;
  title: string;
  description: string;
  detail?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}

export function StateBlock({
  actionLabel,
  description,
  detail,
  onAction,
  title,
  tone = 'neutral',
}: StateBlockProps) {
  return (
    <div className={`cn-state-block cn-state-${tone}`}>
      <span aria-hidden="true" className="cn-state-icon">
        {tone === 'danger' ? '!' : tone === 'restricted' ? '⌘' : 'i'}
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {detail ? <div className="cn-state-detail">{detail}</div> : null}
      {actionLabel && onAction ? (
        <Button onClick={onAction} variant={tone === 'danger' ? 'primary' : 'secondary'}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
