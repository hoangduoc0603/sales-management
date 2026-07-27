import type { HTMLAttributes, ReactNode } from 'react';

export interface PanelProps extends HTMLAttributes<HTMLElement> {
  title?: string;
  description?: string;
  action?: ReactNode;
}

export function Panel({ action, children, className, description, title, ...props }: PanelProps) {
  return (
    <section className={['cn-panel', className].filter(Boolean).join(' ')} {...props}>
      {title || description || action ? (
        <header className="cn-panel-head">
          <div>
            {title ? <h2>{title}</h2> : null}
            {description ? <p>{description}</p> : null}
          </div>
          {action}
        </header>
      ) : null}
      <div className="cn-panel-body">{children}</div>
    </section>
  );
}
