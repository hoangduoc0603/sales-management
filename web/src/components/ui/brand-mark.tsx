import cenioIconUrl from './cenio-icon-128.png';

export interface CenioBrandMarkProps {
  className?: string;
}

export function CenioBrandMark({ className }: CenioBrandMarkProps) {
  return (
    <span className={['cn-brand-mark', className].filter(Boolean).join(' ')} aria-hidden="true">
      <img alt="" draggable={false} src={cenioIconUrl} />
    </span>
  );
}
