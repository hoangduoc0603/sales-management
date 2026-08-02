import type { ReactNode } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { IconButton } from './button';

export interface SheetProps {
  isOpen: boolean;
  title: string;
  children: ReactNode;
  description?: string;
  side?: 'left' | 'right';
  onOpenChange(isOpen: boolean): void;
}

export function Sheet({
  children,
  description,
  isOpen,
  onOpenChange,
  side = 'right',
  title,
}: SheetProps) {
  if (!isOpen) {
    return null;
  }

  if (typeof document === 'undefined') {
    return (
      <>
        <div className="cn-sheet-overlay" />
        <section aria-modal="true" className="cn-sheet-content" data-side={side} role="dialog">
          <header className="cn-sheet-head">
            <div>
              <h2 className="cn-sheet-title">{title}</h2>
              {description ? <p className="cn-sheet-description">{description}</p> : null}
            </div>
            <IconButton label="Đóng">
              <span aria-hidden="true">×</span>
            </IconButton>
          </header>
          <div className="cn-sheet-body">{children}</div>
        </section>
      </>
    );
  }

  return (
    <DialogPrimitive.Root onOpenChange={onOpenChange} open={isOpen}>
      <DialogPrimitive.Portal forceMount>
        <DialogPrimitive.Overlay className="cn-sheet-overlay" />
        <DialogPrimitive.Content aria-modal="true" className="cn-sheet-content" data-side={side}>
          <header className="cn-sheet-head">
            <div>
              <DialogPrimitive.Title className="cn-sheet-title">{title}</DialogPrimitive.Title>
              {description ? (
                <DialogPrimitive.Description className="cn-sheet-description">
                  {description}
                </DialogPrimitive.Description>
              ) : null}
            </div>
            <DialogPrimitive.Close asChild>
              <IconButton label="Đóng">
                <span aria-hidden="true">×</span>
              </IconButton>
            </DialogPrimitive.Close>
          </header>
          <div className="cn-sheet-body">{children}</div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
