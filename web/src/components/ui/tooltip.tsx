import { cloneElement, isValidElement, type ReactElement } from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';

export interface TooltipProps {
  label: string;
  children: ReactElement;
  disabled?: boolean;
  side?: 'top' | 'right' | 'bottom' | 'left';
}

export function Tooltip({ children, disabled = false, label, side = 'right' }: TooltipProps) {
  if (disabled || !isValidElement(children)) {
    return children;
  }

  const trigger = cloneElement(children, {
    'data-tooltip-label': label,
  } as Partial<unknown>);

  return (
    <TooltipPrimitive.Provider delayDuration={180} skipDelayDuration={100}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{trigger}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content className="cn-tooltip-content" side={side} sideOffset={8}>
            {label}
            <TooltipPrimitive.Arrow className="cn-tooltip-arrow" />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}
