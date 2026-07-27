import type { ReactNode } from 'react';
import { IconButton } from './button';

export interface DialogProps {
  isOpen: boolean;
  title: string;
  description?: string;
  children: ReactNode;
  onClose(): void;
}

export function Dialog({ children, description, isOpen, onClose, title }: DialogProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="cn-dialog-backdrop">
      <section aria-modal="true" className="cn-dialog" role="dialog">
        <header className="cn-dialog-head">
          <div>
            <h2>{title}</h2>
            {description ? <p>{description}</p> : null}
          </div>
          <IconButton label="Đóng" onClick={onClose}>
            ×
          </IconButton>
        </header>
        <div className="cn-dialog-body">{children}</div>
      </section>
    </div>
  );
}
