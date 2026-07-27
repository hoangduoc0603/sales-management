import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  isLoading?: boolean;
}

export function Button({
  children,
  className,
  disabled,
  isLoading = false,
  type = 'button',
  variant = 'secondary',
  ...props
}: ButtonProps) {
  return (
    <button
      aria-busy={isLoading || undefined}
      className={joinClassNames('cn-button', `cn-button-${variant}`, className)}
      disabled={disabled || isLoading}
      type={type}
      {...props}
    >
      {isLoading ? <Spinner /> : null}
      <span>{children}</span>
    </button>
  );
}

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  children: ReactNode;
}

export function IconButton({
  children,
  className,
  disabled,
  label,
  type = 'button',
  ...props
}: IconButtonProps) {
  return (
    <button
      aria-label={label}
      className={joinClassNames('cn-icon-button', className)}
      disabled={disabled}
      title={label}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
}

function Spinner() {
  return <span aria-hidden="true" className="cn-spinner" />;
}

function joinClassNames(...values: Array<string | undefined>): string {
  return values.filter(Boolean).join(' ');
}
