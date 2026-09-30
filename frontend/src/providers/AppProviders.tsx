import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  type ReactNode,
  useCallback,
  useMemo,
  useState,
} from 'react'
import { CheckCircle2, X, XCircle } from 'lucide-react'
import { ThemeProvider } from 'styled-components'
import styled, { keyframes } from 'styled-components'
import { GlobalStyle } from '../styles/GlobalStyle'
import { theme } from '../styles/theme'
import { AuthProvider } from './auth'
import { ToastContext } from './toast'

interface Toast {
  id: string
  message: string
  type: 'success' | 'error'
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

export function AppProviders({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const notify = useCallback((message: string, type: Toast['type'] = 'success') => {
    const id = crypto.randomUUID()
    setToasts((current) => [...current, { id, message, type }])
    window.setTimeout(
      () => setToasts((current) => current.filter((toast) => toast.id !== id)),
      3600,
    )
  }, [])

  const value = useMemo(() => ({ notify }), [notify])

  return (
    <ThemeProvider theme={theme}>
      <GlobalStyle />
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ToastContext.Provider value={value}>
            {children}
            <ToastRegion aria-live="polite">
              {toasts.map((toast) => (
                <Toast $type={toast.type} key={toast.id}>
                  {toast.type === 'success' ? (
                    <CheckCircle2 size={18} />
                  ) : (
                    <XCircle size={18} />
                  )}
                  <span>{toast.message}</span>
                  <button
                    aria-label="Dismiss notification"
                    onClick={() =>
                      setToasts((current) =>
                        current.filter((item) => item.id !== toast.id),
                      )
                    }
                    type="button"
                  >
                    <X size={15} />
                  </button>
                </Toast>
              ))}
            </ToastRegion>
          </ToastContext.Provider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  )
}

const toastIn = keyframes`
  from {
    opacity: 0;
    transform: translateX(12px);
  }
`

const ToastRegion = styled.div`
  position: fixed;
  z-index: 150;
  right: 20px;
  bottom: 20px;
  display: flex;
  width: min(360px, calc(100vw - 40px));
  flex-direction: column;
  gap: 8px;
`

const Toast = styled.div<{ $type: 'success' | 'error' }>`
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 9px;
  align-items: center;
  padding: 11px 12px;
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 10px;
  background: #fff;
  box-shadow: ${({ theme }) => theme.shadowMd};
  font-size: 11px;
  animation: ${toastIn} 180ms ease;

  > svg {
    color: ${({ theme, $type }) => ($type === 'success' ? theme.emerald : theme.red)};
  }

  button {
    border: 0;
    color: ${({ theme }) => theme.textTertiary};
    background: transparent;
  }
`
