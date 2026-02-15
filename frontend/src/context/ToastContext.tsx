import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: string
  type: ToastType
  title: string
  message?: string
  duration?: number
}

interface ToastContextType {
  toasts: Toast[]
  showToast: (toast: Omit<Toast, 'id'>) => void
  hideToast: (id: string) => void
  success: (title: string, message?: string) => void
  error: (title: string, message?: string) => void
  warning: (title: string, message?: string) => void
  info: (title: string, message?: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

const getToastStyles = (type: ToastType) => {
  switch (type) {
    case 'success':
      return {
        bg: 'bg-success-500/90',
        border: 'border-green-700',
        icon: CheckCircleIcon,
        iconColor: 'text-success-400',
      }
    case 'error':
      return {
        bg: 'bg-danger-500/90',
        border: 'border-danger-500',
        icon: XCircleIcon,
        iconColor: 'text-danger-400',
      }
    case 'warning':
      return {
        bg: 'bg-warning-500/90',
        border: 'border-yellow-700',
        icon: ExclamationTriangleIcon,
        iconColor: 'text-warning-400',
      }
    case 'info':
      return {
        bg: 'bg-primary-500/90',
        border: 'border-blue-700',
        icon: InformationCircleIcon,
        iconColor: 'text-primary-400',
      }
  }
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const hideToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const showToast = useCallback(
    (toast: Omit<Toast, 'id'>) => {
      const id = Math.random().toString(36).substring(2, 9)
      const newToast = { ...toast, id }
      setToasts((prev) => [...prev, newToast])

      // Auto-hide after duration
      const duration = toast.duration ?? 5000
      if (duration > 0) {
        setTimeout(() => {
          hideToast(id)
        }, duration)
      }
    },
    [hideToast]
  )

  const success = useCallback(
    (title: string, message?: string) => {
      showToast({ type: 'success', title, message })
    },
    [showToast]
  )

  const error = useCallback(
    (title: string, message?: string) => {
      showToast({ type: 'error', title, message, duration: 8000 })
    },
    [showToast]
  )

  const warning = useCallback(
    (title: string, message?: string) => {
      showToast({ type: 'warning', title, message })
    },
    [showToast]
  )

  const info = useCallback(
    (title: string, message?: string) => {
      showToast({ type: 'info', title, message })
    },
    [showToast]
  )

  return (
    <ToastContext.Provider
      value={{ toasts, showToast, hideToast, success, error, warning, info }}
    >
      {children}
      {/* Toast container */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
        {toasts.map((toast) => {
          const styles = getToastStyles(toast.type)
          const Icon = styles.icon

          return (
            <div
              key={toast.id}
              className={`${styles.bg} ${styles.border} border rounded-lg shadow-xl p-4 flex items-start gap-3 animate-slide-in`}
            >
              <Icon className={`w-5 h-5 ${styles.iconColor} flex-shrink-0 mt-0.5`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">{toast.title}</p>
                {toast.message && (
                  <p className="text-xs text-dark-200 mt-1">{toast.message}</p>
                )}
              </div>
              <button
                onClick={() => hideToast(toast.id)}
                className="text-dark-300 hover:text-white transition-colors"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}
