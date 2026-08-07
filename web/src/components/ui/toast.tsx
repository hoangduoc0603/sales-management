import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { BadgeTone } from './badge';
import { AppIcon } from './icons';

export interface ToastInput {
  message: string;
  tone?: BadgeTone;
  durationMs?: number;
}

interface ToastEntry extends Required<ToastInput> {
  id: string;
}

export interface ToastController {
  show(input: ToastInput): void;
  success(message: string): void;
  info(message: string): void;
  warning(message: string): void;
  danger(message: string): void;
  dismiss(id: string): void;
}

export interface ToastProps {
  message: string;
  tone?: BadgeTone;
  onDismiss?(): void;
}

const toastDurations: Record<BadgeTone, number> = {
  danger: 8_000,
  info: 5_000,
  neutral: 5_000,
  success: 4_000,
  warning: 6_000,
};

const noopToastController: ToastController = {
  show: () => undefined,
  success: () => undefined,
  info: () => undefined,
  warning: () => undefined,
  danger: () => undefined,
  dismiss: () => undefined,
};

const ToastContext = createContext<ToastController>(noopToastController);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<readonly ToastEntry[]>([]);
  const sequenceRef = useRef(0);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback((input: ToastInput) => {
    const message = input.message.trim();
    if (message === '') return;

    const tone = input.tone ?? 'neutral';
    const entry: ToastEntry = {
      durationMs: input.durationMs ?? toastDurations[tone],
      id: `toast-${Date.now()}-${sequenceRef.current++}`,
      message,
      tone,
    };

    setToasts((current) => [...current, entry].slice(-3));
  }, []);

  const value = useMemo<ToastController>(
    () => ({
      danger: (message) => show({ message, tone: 'danger' }),
      dismiss,
      info: (message) => show({ message, tone: 'info' }),
      show,
      success: (message) => show({ message, tone: 'success' }),
      warning: (message) => show({ message, tone: 'warning' }),
    }),
    [dismiss, show],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport onDismiss={dismiss} toasts={toasts} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastController {
  return useContext(ToastContext);
}

export function Toast({ message, onDismiss, tone = 'neutral' }: ToastProps) {
  const isDanger = tone === 'danger';

  return (
    <div
      aria-atomic="true"
      aria-live={isDanger ? 'assertive' : 'polite'}
      className={`cn-toast cn-toast-${tone}`}
      role={isDanger ? 'alert' : 'status'}
    >
      <AppIcon className="cn-toast-icon" name={toastIconFor(tone)} />
      <span className="cn-toast-message">{message}</span>
      {onDismiss ? (
        <button aria-label="Đóng thông báo" className="cn-toast-dismiss" onClick={onDismiss} type="button">
          <AppIcon name="close" />
        </button>
      ) : null}
    </div>
  );
}

function ToastViewport(props: { toasts: readonly ToastEntry[]; onDismiss(id: string): void }) {
  return (
    <div aria-label="Thông báo" className="cn-toast-viewport">
      {props.toasts.map((toast) => (
        <TimedToast key={toast.id} onDismiss={props.onDismiss} toast={toast} />
      ))}
    </div>
  );
}

function TimedToast(props: { toast: ToastEntry; onDismiss(id: string): void }) {
  const { onDismiss, toast } = props;

  useEffect(() => {
    const timeoutId = window.setTimeout(() => onDismiss(toast.id), toast.durationMs);
    return () => window.clearTimeout(timeoutId);
  }, [onDismiss, toast.durationMs, toast.id]);

  return <Toast message={toast.message} onDismiss={() => onDismiss(toast.id)} tone={toast.tone} />;
}

function toastIconFor(tone: BadgeTone): 'check' | 'warning' | 'fileAlert' | 'clock' {
  if (tone === 'success') return 'check';
  if (tone === 'danger') return 'fileAlert';
  if (tone === 'info') return 'clock';
  return 'warning';
}
