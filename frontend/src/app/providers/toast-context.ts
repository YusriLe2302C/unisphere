import { createContext } from 'react';
import { CircleCheck, CircleX, Info } from 'lucide-react';

export type ToastTone = 'success' | 'error' | 'info';
export interface ToastContextValue {
  notify: (message: string, tone?: ToastTone) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);
export const icons = { success: CircleCheck, error: CircleX, info: Info };
