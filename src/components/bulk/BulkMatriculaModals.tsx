/**
 * Modais de bulk action específicos para matrículas:
 *   - Situação (cursando, concluído, desistente, reprovado, trancado)
 *   - Notas e frequência (lança o mesmo valor pra todos)
 *   - Data de conclusão
 */

import { useState } from 'react'
import { X } from 'lucide-react'
import { useModalUX } from '../../hooks/useModalUX'
import { hojeISO } from '../../lib/format'
import type { MatriculaSituacao } from '../../types'

interface BaseProps {
  count: number
  onClose: () => void
}

// ─── Situação ─────────────────────────────────────────────────────────────────

interface SituacaoProps extends BaseProps {
  onPick: (situacao: MatriculaSituacao) => void
}

const SITUACAO_OPTIONS: { value: MatriculaSituacao; label: string; color: string }[] = [
  { value: 'cursando', label: 'Cursando', color: 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100' },
  { value: 'concluido', label: 'Concluído', color: 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100' },
  { value: 'desistente', label: 'Desistente', color: 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100' },
  { value: 'reprovado', label: 'Reprovado', color: 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100' },
  { value: 'trancado', label: 'Trancado', color: 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100' },
]

export function BulkSituacaoModal({ count, onClose, onPick }: SituacaoProps) {
  const containerRef = useModalUX({ onClose })
  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center sm:p-4 bg-black/50">
      <div ref={containerRef} className="bg-white sm:rounded-xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200">
          <h2 className="font-semibold text-gray-800">Alterar situação</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-2">
          <p className="text-xs text-gray-500 mb-3">
            Escolha a nova situação para as {count} matrícula{count > 1 ? 's' : ''} selecionada{count > 1 ? 's' : ''}.
          </p>
          {SITUACAO_OPTIONS.map(s => (
            <button
              key={s.value}
              onClick={() => onPick(s.value)}
              className={`w-full px-4 py-3 rounded-lg border-2 text-sm font-medium text-left transition-colors ${s.color}`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Notas / Frequência ───────────────────────────────────────────────────────

interface NotasProps extends BaseProps {
  onPick: (payload: { nota?: number; frequencia?: number }) => void
}

export function BulkNotasModal({ count, onClose, onPick }: NotasProps) {
  const containerRef = useModalUX({ onClose })
  const [aplicaNota, setAplicaNota] = useState(true)
  const [aplicaFreq, setAplicaFreq] = useState(false)
  const [nota, setNota] = useState<string>('')
  const [freq, setFreq] = useState<string>('')

  const valid = (() => {
    if (aplicaNota) {
      const n = parseFloat(nota)
      if (isNaN(n) || n < 0 || n > 10) return false
    }
    if (aplicaFreq) {
      const f = parseFloat(freq)
      if (isNaN(f) || f < 0 || f > 100) return false
    }
    return aplicaNota || aplicaFreq
  })()

  const handleConfirm = () => {
    const payload: { nota?: number; frequencia?: number } = {}
    if (aplicaNota) payload.nota = parseFloat(nota)
    if (aplicaFreq) payload.frequencia = parseFloat(freq)
    onPick(payload)
  }

  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center sm:p-4 bg-black/50">
      <div ref={containerRef} className="bg-white sm:rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200">
          <h2 className="font-semibold text-gray-800">Lançar notas e frequência</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-xs text-gray-500">
            Aplicar o mesmo valor a {count} matrícula{count > 1 ? 's' : ''}.
          </p>

          <div className={`border-2 rounded-lg p-3 transition-colors ${aplicaNota ? 'border-blue-400 bg-blue-50/50' : 'border-gray-200'}`}>
            <label className="flex items-center gap-2 cursor-pointer mb-2">
              <input
                type="checkbox"
                checked={aplicaNota}
                onChange={e => setAplicaNota(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm font-medium">Lançar nota final (0 a 10)</span>
            </label>
            {aplicaNota && (
              <input
                type="number"
                min={0}
                max={10}
                step={0.1}
                value={nota}
                onChange={e => setNota(e.target.value)}
                placeholder="Ex: 9.0"
                className="form-input"
                inputMode="decimal"
              />
            )}
          </div>

          <div className={`border-2 rounded-lg p-3 transition-colors ${aplicaFreq ? 'border-blue-400 bg-blue-50/50' : 'border-gray-200'}`}>
            <label className="flex items-center gap-2 cursor-pointer mb-2">
              <input
                type="checkbox"
                checked={aplicaFreq}
                onChange={e => setAplicaFreq(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm font-medium">Lançar frequência (0 a 100%)</span>
            </label>
            {aplicaFreq && (
              <input
                type="number"
                min={0}
                max={100}
                step={1}
                value={freq}
                onChange={e => setFreq(e.target.value)}
                placeholder="Ex: 100"
                className="form-input"
                inputMode="numeric"
              />
            )}
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-gray-200 bg-gray-50">
          <button onClick={onClose} className="btn-secondary">Cancelar</button>
          <button onClick={handleConfirm} disabled={!valid} className="btn-primary disabled:opacity-40">
            Continuar
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Data de conclusão ────────────────────────────────────────────────────────

interface DataConclusaoProps extends BaseProps {
  onPick: (date: string) => void
}

export function BulkDataConclusaoModal({ count, onClose, onPick }: DataConclusaoProps) {
  const containerRef = useModalUX({ onClose })
  const [date, setDate] = useState(hojeISO())

  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center sm:p-4 bg-black/50">
      <div ref={containerRef} className="bg-white sm:rounded-xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200">
          <h2 className="font-semibold text-gray-800">Data de conclusão</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-xs text-gray-500">
            Define a mesma data de conclusão para {count} matrícula{count > 1 ? 's' : ''}.
          </p>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="form-input"
            max={hojeISO()}
          />
        </div>
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-gray-200 bg-gray-50">
          <button onClick={onClose} className="btn-secondary">Cancelar</button>
          <button onClick={() => onPick(date)} disabled={!date} className="btn-primary disabled:opacity-40">
            Continuar
          </button>
        </div>
      </div>
    </div>
  )
}
