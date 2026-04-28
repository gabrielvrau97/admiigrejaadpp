import { AlertTriangle, X, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { useModalUX } from '../../hooks/useModalUX'

interface Props {
  title: string
  description: string
  /** Quantos itens serão afetados. */
  count: number
  /** Texto do botão de confirmar (default: "Confirmar (N)"). */
  confirmLabel?: string
  /** Marca como ação destrutiva (botão vermelho). */
  danger?: boolean
  /** Resumo extra (preview de mudança). */
  preview?: React.ReactNode
  onConfirm: () => Promise<void> | void
  onCancel: () => void
}

/**
 * Diálogo de confirmação para ações em massa.
 * Mostra contagem destacada e descrição da ação. Bloqueia botões durante execução.
 */
export default function BulkConfirmDialog({
  title,
  description,
  count,
  confirmLabel,
  danger = false,
  preview,
  onConfirm,
  onCancel,
}: Props) {
  const containerRef = useModalUX({ onClose: onCancel })
  const [confirming, setConfirming] = useState(false)

  const handleConfirm = async () => {
    if (confirming) return
    setConfirming(true)
    try {
      await onConfirm()
    } finally {
      setConfirming(false)
    }
  }

  const finalLabel = confirmLabel ?? `Confirmar (${count})`

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center sm:p-4 bg-black/60">
      <div ref={containerRef} className="bg-white sm:rounded-xl shadow-2xl w-full max-w-md sm:max-h-[90vh] flex flex-col">
        <div className="flex items-start justify-between px-5 py-4 border-b border-gray-200">
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              danger ? 'bg-red-50' : 'bg-amber-50'
            }`}>
              <AlertTriangle size={20} className={danger ? 'text-red-500' : 'text-amber-500'} />
            </div>
            <div>
              <h2 className="font-semibold text-gray-800">{title}</h2>
              <p className="text-xs text-gray-500 mt-0.5">Ação em massa</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={confirming}
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          <p className="text-sm text-gray-700 leading-relaxed">
            {description}
          </p>

          <div className={`rounded-lg px-4 py-3 ${danger ? 'bg-red-50 border border-red-100' : 'bg-blue-50 border border-blue-100'}`}>
            <div className="flex items-baseline gap-2">
              <span className={`text-3xl font-bold ${danger ? 'text-red-600' : 'text-blue-600'}`}>{count}</span>
              <span className={`text-sm font-medium ${danger ? 'text-red-700' : 'text-blue-700'}`}>
                {count === 1 ? 'registro será afetado' : 'registros serão afetados'}
              </span>
            </div>
          </div>

          {preview && (
            <div className="text-xs text-gray-600 bg-gray-50 rounded-lg p-3 border border-gray-100">
              {preview}
            </div>
          )}

          {count > 5 && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
              ⚠ Esta ação afeta mais de 5 registros. Será registrada na auditoria.
            </p>
          )}
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 px-5 py-3 border-t border-gray-200 bg-gray-50 sm:rounded-b-xl">
          <button
            onClick={onCancel}
            className="btn-secondary w-full sm:w-auto justify-center"
            disabled={confirming}
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            className={`w-full sm:w-auto justify-center inline-flex items-center gap-1.5 px-4 py-2 rounded-lg font-medium text-sm transition-colors disabled:opacity-50 ${
              danger
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
            disabled={confirming}
          >
            {confirming && <Loader2 size={13} className="animate-spin" />}
            {confirming ? 'Processando...' : finalLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
