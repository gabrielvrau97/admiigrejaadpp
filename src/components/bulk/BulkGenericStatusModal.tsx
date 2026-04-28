/**
 * Modal genérico para escolher um valor de uma lista de opções.
 * Usado por: status de seminário, status de carteirinha, status de certificado.
 */

import { X } from 'lucide-react'
import { useModalUX } from '../../hooks/useModalUX'

interface Option<T extends string> {
  value: T
  label: string
  /** Classes Tailwind aplicadas ao botão. */
  color: string
}

interface Props<T extends string> {
  title: string
  description: string
  options: Option<T>[]
  count: number
  onClose: () => void
  onPick: (value: T) => void
}

export default function BulkGenericStatusModal<T extends string>({
  title,
  description,
  options,
  count,
  onClose,
  onPick,
}: Props<T>) {
  const containerRef = useModalUX({ onClose })
  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center sm:p-4 bg-black/50">
      <div ref={containerRef} className="bg-white sm:rounded-xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200">
          <h2 className="font-semibold text-gray-800">{title}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-2">
          <p className="text-xs text-gray-500 mb-3">
            {description.replace('{N}', String(count))}
          </p>
          {options.map(o => (
            <button
              key={o.value}
              onClick={() => onPick(o.value)}
              className={`w-full px-4 py-3 rounded-lg border-2 text-sm font-medium text-left transition-colors ${o.color}`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
