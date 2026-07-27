import type { KeyboardEvent } from 'react';
import { useId, useState } from 'react';

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
  const selected = options.find((option) => option.value === value) ?? options[0];

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
    <div className={['cn-listbox-field', className].filter(Boolean).join(' ')}>
      <span className="cn-listbox-label" id={`${id}-label`}>
        {label}
      </span>
      <div className="cn-listbox">
        <button
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-labelledby={`${id}-label ${id}-trigger`}
          className="cn-listbox-trigger"
          id={`${id}-trigger`}
          onClick={() => setIsOpen((current) => !current)}
          onKeyDown={handleKeyDown}
          type="button"
        >
          <span>{selected?.label ?? 'Chưa chọn'}</span>
          <span aria-hidden="true">⌄</span>
        </button>
        <div className="cn-listbox-popover" hidden={!isOpen} role="listbox">
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
