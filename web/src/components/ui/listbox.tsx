import type { KeyboardEvent } from 'react';
import { useEffect, useId, useRef, useState } from 'react';
import { AppIcon } from './icons';

export interface ListboxOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

export interface ListboxProps {
  label: string;
  value: string;
  options: readonly ListboxOption[];
  onChange(value: string): void;
  className?: string;
}

export function Listbox({ className, label, onChange, options, value }: ListboxProps) {
  const id = useId();
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    if (!isOpen) return undefined;

    const handlePointerDown = (event: PointerEvent) => {
      if (rootRef.current?.contains(event.target as Node)) return;
      setIsOpen(false);
    };
    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const choose = (nextValue: string) => {
    onChange(nextValue);
    setIsOpen(false);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Escape') {
      setIsOpen(false);
      return;
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setIsOpen(true);
      const currentIndex = Math.max(0, options.findIndex((option) => option.value === value));
      const offset = event.key === 'ArrowDown' ? 1 : -1;
      const next = options[(currentIndex + offset + options.length) % options.length];

      if (next !== undefined && !next.disabled) {
        onChange(next.value);
      }
    }
  };

  return (
    <div className={['cn-listbox-field', className].filter(Boolean).join(' ')} ref={rootRef}>
      <span className="cn-listbox-label" id={`${id}-label`}>
        {label}
      </span>
      <div className="cn-listbox">
        <button
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-controls={`${id}-listbox`}
          aria-labelledby={`${id}-label ${id}-trigger`}
          className="cn-listbox-trigger"
          id={`${id}-trigger`}
          onClick={() => setIsOpen((current) => !current)}
          onKeyDown={handleKeyDown}
          type="button"
        >
          <span className="cn-listbox-trigger-label">{selected?.label ?? 'Chưa chọn'}</span>
          <AppIcon className="cn-listbox-chevron" name="chevronDown" />
        </button>
        <div className="cn-listbox-popover" hidden={!isOpen} id={`${id}-listbox`} role="listbox">
          {options.map((option) => (
            <button
              aria-selected={option.value === value}
              className="cn-listbox-option"
              disabled={option.disabled}
              key={option.value}
              onClick={() => choose(option.value)}
              role="option"
              type="button"
            >
              <span>
                <span className="cn-listbox-option-label">{option.label}</span>
                {option.description ? (
                  <span className="cn-listbox-option-description">{option.description}</span>
                ) : null}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
