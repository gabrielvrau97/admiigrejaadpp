import React, {
  createContext, useContext, useState, useCallback, useEffect,
} from 'react'
import { AlertTriangle, CheckCircle, Info, X, AlertCircle } from 'lucide-react'

// ────────────────────────────────────────────────────────────
// Tipos
// ────────────────────────────────────────────────────────────
type ToastType = 'success' | 'error' | 'info' | 'warning'

interface ToastItem {
  id: number
  type: ToastType
  message: string
}

interface ConfirmOptions {
  title?: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
}

interface ConfirmState extends ConfirmOptions {
  id: number
  resolve: (value: boolean) => void
}

// ────────────────────────────────────────────────────────────
// Contexto
// ────────────────────────────────────────────────────────────
interface UIContextValue {
  toast: {
    success: (msg: string) => void
    error: (msg: string) => void
    info: (msg: string) => void
    warning: (msg: string) => void
  }
  confirm: (opts: ConfirmOptions) => Promise<boolean>
}

const UIContext = createContext<UIContextValue | null>(null)

export function useToast() {
  const ctx = useContext(UIContext)
  if (!ctx) throw new Error('useToast must be used within UIProvider')
  return ctx.toast
}

export function useConfirm() {
  const ctx = useContext(UIContext)
  if (!ctx) throw new Error('useConfirm must be used within UIProvider')
  return ctx.confirm
}

// ────────────────────────────────────────────────────────────
// Provider
// ────────────────────────────────────────────────────────────
export function UIProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null)

  const pushToast = useCallback((type: ToastType, message: string) => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev, { id, type, message }])
    // auto-dismiss em 4s
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 4000)
  }, [])

  const dismissToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const toast = {
    success: (m: string) => pushToast('success', m),
    error: (m: string) => pushToast('error', m),
    info: (m: string) => pushToast('info', m),
    warning: (m: string) => pushToast('warning', m),
  }

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    return new Promise<boolean>(resolve => {
      setConfirmState({ id: Date.now(), resolve, ...opts })
    })
  }, [])

  const handleConfirm = (value: boolean) => {
    if (confirmState) {
      confirmState.resolve(value)
      setConfirmState(null)
    }
  }

  // Fechar confirm com Esc / Enter
  useEffect(() => {
    if (!confirmState) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleConfirm(false)
      else if (e.key === 'Enter') handleConfirm(true)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirmState])

  return (
    <UIContext.Provider value={{ toast, confirm }}>
      {children}
      <Toaster toasts={toasts} onDismiss={dismissToast} />
      {confirmState && (
        <ConfirmDialog
          options={confirmState}
          onConfirm={() => handleConfirm(true)}
          onCancel={() => handleConfirm(false)}
        />
      )}
    </UIContext.Provider>
  )
}

// ────────────────────────────────────────────────────────────
// Componente Toaster
// ────────────────────────────────────────────────────────────
function Toaster({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: number) => void }) {
  return (
    <div className="fixed top-3 right-3 z-[100] flex flex-col gap-2 max-w-sm w-[calc(100vw-1.5rem)] sm:w-96 pointer-events-none">
      {toasts.map(t => (
        <ToastCard key={t.id} toast={t} onDismiss={() => onDismiss(t.id)} />
      ))}
    </div>
  )
}

function ToastCard({ toast, onDismiss }: { toast: ToastItem; onDismiss: () => void }) {
  const config = {
    success: { icon: <CheckCircle size={18} />, bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-800', iconColor: 'text-emerald-600' },
    error:   { icon: <AlertCircle size={18} />, bg: 'bg-red-50 border-red-200', text: 'text-red-800', iconColor: 'text-red-600' },
    warning: { icon: <AlertTriangle size={18} />, bg: 'bg-amber-50 border-amber-200', text: 'text-amber-800', iconColor: 'text-amber-600' },
    info:    { icon: <Info size={18} />, bg: 'bg-blue-50 border-blue-200', text: 'text-blue-800', iconColor: 'text-blue-600' },
  }[toast.type]

  return (
    <div
      role="status"
      className={`pointer-events-auto flex items-start gap-2.5 border rounded-lg px-3 py-2.5 shadow-md ${config.bg}`}
      style={{ animation: 'toastIn 180ms ease-out' }}
    >
      <span className={`${config.iconColor} shrink-0 mt-0.5`}>{config.icon}</span>
      <p className={`flex-1 text-sm ${config.text} leading-snug`}>{toast.message}</p>
      <button
        onClick={onDismiss}
        className={`${config.iconColor} hover:opacity-70 shrink-0 mt-0.5`}
        aria-label="Fechar"
      >
        <X size={14} />
      </button>
      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// Componente ConfirmDialog
// ────────────────────────────────────────────────────────────
function ConfirmDialog({
  options, onConfirm, onCancel,
}: {
  options: ConfirmOptions
  onConfirm: () => void
  onCancel: () => void
}) {
  const title = options.title ?? (options.danger ? 'Confirmar ação' : 'Confirmar')
  const confirmLabel = options.confirmLabel ?? (options.danger ? 'Excluir' : 'Confirmar')
  const cancelLabel = options.cancelLabel ?? 'Cancelar'

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/50"
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-5"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 mb-4">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
              options.danger
                ? 'bg-red-50 border border-red-200 text-red-600'
                : 'bg-blue-50 border border-blue-200 text-blue-600'
            }`}
          >
            {options.danger ? <AlertTriangle size={20} /> : <Info size={20} />}
          </div>
          <div className="flex-1">
            <h2 id="confirm-title" className="font-semibold text-gray-800">{title}</h2>
            <p className="text-sm text-gray-600 mt-1 leading-snug">{options.message}</p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2">
          <button onClick={onCancel} className="btn-secondary">{cancelLabel}</button>
          <button
            onClick={onConfirm}
            autoFocus
            className={options.danger ? 'btn-danger' : 'btn-primary'}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
