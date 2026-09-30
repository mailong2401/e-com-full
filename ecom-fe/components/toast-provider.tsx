// ecom-fe/components/toast-provider.tsx
'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import { Callout, Flex, Box } from '@radix-ui/themes';
import { CheckCircledIcon, CrossCircledIcon } from '@radix-ui/react-icons';

type ToastType = 'success' | 'error';
interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  toast: (type: ToastType, message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((type: ToastType, message: string) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <Box
        style={{
          position: 'fixed',
          top: 16,
          right: 16,
          zIndex: 9999,
          pointerEvents: 'none',
        }}
      >
        <Flex direction="column" gap="2">
          {toasts.map((t) => (
            <Callout.Root
              key={t.id}
              color={t.type === 'success' ? 'green' : 'red'}
              style={{ pointerEvents: 'auto', minWidth: 280 }}
            >
              <Callout.Icon>
                {t.type === 'success' ? (
                  <CheckCircledIcon />
                ) : (
                  <CrossCircledIcon />
                )}
              </Callout.Icon>
              <Callout.Text>{t.message}</Callout.Text>
            </Callout.Root>
          ))}
        </Flex>
      </Box>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
