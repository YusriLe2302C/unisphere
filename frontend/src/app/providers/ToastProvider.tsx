import { useCallback, useMemo, useState } from 'react';
import { ToastContext, type ToastTone } from './toast-context';
import { Toast } from '../../components/ui/overlays';

interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
}
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const dismiss = useCallback(
    (id: number) => setItems((current) => current.filter((item) => item.id !== id)),
    [],
  );
  const notify = useCallback(
    (message: string, tone: ToastTone = 'info') => {
      const id = Date.now() + Math.random();
      setItems((current) => [...current, { id, message, tone }]);
      window.setTimeout(() => dismiss(id), 4500);
    },
    [dismiss],
  );
  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-region" aria-live="polite" aria-label="Notifications">
        {items.map((item) => {
          return (
            <Toast
              key={item.id}
              message={item.message}
              tone={item.tone}
              onDismiss={() => dismiss(item.id)}
            />
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
