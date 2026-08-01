import type { ReactNode, SVGProps } from 'react';

export type AppIconName =
  | 'admin'
  | 'bell'
  | 'barcodeScan'
  | 'catalog'
  | 'check'
  | 'chevronDown'
  | 'chevronRight'
  | 'customers'
  | 'dashboard'
  | 'finance'
  | 'inventory'
  | 'logout'
  | 'moon'
  | 'orders'
  | 'pos'
  | 'purchasing'
  | 'reports'
  | 'refresh'
  | 'sales'
  | 'sun'
  | 'trendUp'
  | 'wallet'
  | 'clock'
  | 'box'
  | 'fileAlert'
  | 'warning'
  | 'currency'
  | 'close'
  | 'print';

export interface AppIconProps extends Omit<SVGProps<SVGSVGElement>, 'children'> {
  name: AppIconName;
  title?: string;
}

export function AppIcon({ className, name, title, ...props }: AppIconProps) {
  const icon = renderIcon(name);

  return (
    <svg
      aria-hidden={title ? undefined : true}
      className={className}
      fill="none"
      focusable="false"
      role={title ? 'img' : undefined}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
      {...props}
    >
      {title ? <title>{title}</title> : null}
      {icon}
    </svg>
  );
}

function renderIcon(name: AppIconName): ReactNode {
  switch (name) {
    case 'dashboard':
      return (
        <>
          <rect height="7" rx="1.5" width="7" x="3" y="3" />
          <rect height="7" rx="1.5" width="7" x="14" y="3" />
          <rect height="7" rx="1.5" width="7" x="3" y="14" />
          <rect height="7" rx="1.5" width="7" x="14" y="14" />
        </>
      );
    case 'pos':
    case 'sales':
      return (
        <>
          <path d="M6 8h12l-1 12H7L6 8Z" />
          <path d="M9 8a3 3 0 0 1 6 0" />
        </>
      );
    case 'orders':
      return (
        <>
          <path d="M7 3h10a2 2 0 0 1 2 2v16l-3-1.8L13 21l-3-1.8L7 21l-2-1.2V5a2 2 0 0 1 2-2Z" />
          <path d="M8 8h8" />
          <path d="M8 12h8" />
          <path d="M8 16h5" />
        </>
      );
    case 'catalog':
    case 'box':
      return (
        <>
          <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" />
          <path d="M12 12 4.4 7.8" />
          <path d="M12 12v8.5" />
          <path d="m12 12 7.6-4.2" />
        </>
      );
    case 'customers':
      return (
        <>
          <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
          <circle cx="9.5" cy="7" r="4" />
          <path d="M21 21v-2a3.5 3.5 0 0 0-3-3.45" />
          <path d="M16.5 3.2a4 4 0 0 1 0 7.6" />
        </>
      );
    case 'inventory':
      return (
        <>
          <path d="M4 9.5 12 5l8 4.5" />
          <path d="M5 10v8l7 4 7-4v-8" />
          <path d="M12 14v8" />
          <path d="m8 7.2 8 4.6" />
        </>
      );
    case 'purchasing':
      return (
        <>
          <path d="M8 6h13l-1.5 8h-10L8 6Z" />
          <path d="M8 6 7.3 3H4" />
          <circle cx="10" cy="20" r="1.4" />
          <circle cx="18" cy="20" r="1.4" />
        </>
      );
    case 'finance':
    case 'wallet':
      return (
        <>
          <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H19v14H6.5A2.5 2.5 0 0 1 4 16.5v-9Z" />
          <path d="M4 8h15" />
          <path d="M16 12h4v4h-4a2 2 0 0 1 0-4Z" />
        </>
      );
    case 'reports':
      return (
        <>
          <path d="M5 20V10" />
          <path d="M12 20V4" />
          <path d="M19 20v-7" />
        </>
      );
    case 'admin':
      return (
        <>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2a2 2 0 1 1-4 0V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1A2 2 0 1 1 4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H2.8a2 2 0 1 1 0-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1A2 2 0 1 1 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6v-.2a2 2 0 1 1 4 0V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1A2 2 0 1 1 19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2a2 2 0 1 1 0 4H21a1.7 1.7 0 0 0-1.6 1Z" />
        </>
      );
    case 'sun':
      return (
        <>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2" />
          <path d="M12 20v2" />
          <path d="m4.93 4.93 1.41 1.41" />
          <path d="m17.66 17.66 1.41 1.41" />
          <path d="M2 12h2" />
          <path d="M20 12h2" />
          <path d="m6.34 17.66-1.41 1.41" />
          <path d="m19.07 4.93-1.41 1.41" />
        </>
      );
    case 'moon':
      return <path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.5 6.5 0 0 0 9.8 9.8Z" />;
    case 'bell':
      return (
        <>
          <path d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
          <path d="M10 21a2 2 0 0 0 4 0" />
        </>
      );
    case 'barcodeScan':
      return (
        <>
          <path d="M4 7V5a1 1 0 0 1 1-1h2" />
          <path d="M17 4h2a1 1 0 0 1 1 1v2" />
          <path d="M20 17v2a1 1 0 0 1-1 1h-2" />
          <path d="M7 20H5a1 1 0 0 1-1-1v-2" />
          <path d="M7 8v8" />
          <path d="M10 8v8" />
          <path d="M14 8v8" />
          <path d="M17 8v8" />
        </>
      );
    case 'chevronDown':
      return <path d="m6 9 6 6 6-6" />;
    case 'chevronRight':
      return <path d="m9 6 6 6-6 6" />;
    case 'close':
      return (
        <>
          <path d="M6 6l12 12" />
          <path d="M18 6 6 18" />
        </>
      );
    case 'check':
      return <path d="m5 12 4 4 10-10" />;
    case 'print':
      return (
        <>
          <path d="M6 9V4h12v5" />
          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
          <path d="M6 14h12v7H6Z" />
        </>
      );
    case 'refresh':
      return (
        <>
          <path d="M20 11a8 8 0 0 0-14.4-4.8L4 8" />
          <path d="M4 4v4h4" />
          <path d="M4 13a8 8 0 0 0 14.4 4.8L20 16" />
          <path d="M20 20v-4h-4" />
        </>
      );
    case 'logout':
      return (
        <>
          <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
          <path d="M10 17l5-5-5-5" />
          <path d="M15 12H3" />
        </>
      );
    case 'trendUp':
      return (
        <>
          <path d="M4 18V6" />
          <path d="M4 18h16" />
          <path d="m7 15 4-4 3 3 5-7" />
        </>
      );
    case 'clock':
      return (
        <>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 8v4l3 2" />
        </>
      );
    case 'fileAlert':
      return (
        <>
          <path d="M7 3h7l5 5v13H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
          <path d="M14 3v5h5" />
          <path d="M12 11v4" />
          <path d="M12 18h.01" />
        </>
      );
    case 'warning':
      return (
        <>
          <path d="m12 3 9 16H3l9-16Z" />
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
        </>
      );
    case 'currency':
      return (
        <>
          <path d="M12 3v18" />
          <path d="M17 7.5c-.9-1-2.4-1.7-4-1.7-2.3 0-4 .9-4 2.7 0 1.7 1.4 2.4 4.2 3 2.8.6 4.1 1.4 4.1 3.2 0 1.9-1.8 3-4.3 3-1.9 0-3.6-.7-4.7-2" />
        </>
      );
  }
}
