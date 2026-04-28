/**
 * Modais simples de bulk action — perguntam um único valor pro usuário,
 * depois passam pra o handler de confirmação.
 *
 * Cada modal:
 *   - Coleta input
 *   - Chama onConfirm(payload)
 *   - O componente pai abre o BulkConfirmDialog (com count + execução)
 */

import { useState } from 'react'
import { X, Check } from 'lucide-react'
import { useChurch } from '../../contexts/ChurchContext'
import { useModalUX } from '../../hooks/useModalUX'
import type { MemberStatus } from '../../types'

interface BaseProps {
  count: number
  onClose: () => void
}

// ─── Status ───────────────────────────────────────────────────────────────────

interface BulkStatusProps extends BaseProps {
  onPick: (status: MemberStatus) => void
}

const STATUS_OPTIONS: { value: MemberStatus; label: string; color: string }[] = [
  { value: 'ativo', label: 'Ativo', color: 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100' },
  { value: 'inativo', label: 'Inativo', color: 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100' },
  { value: 'indisponivel', label: 'Indisponível', color: 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100' },
]

export function BulkStatusModal({ count, onClose, onPick }: BulkStatusProps) {
  const containerRef = useModalUX({ onClose })
  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center sm:p-4 bg-black/50">
      <div ref={containerRef} className="bg-white sm:rounded-xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200">
          <h2 className="font-semibold text-gray-800">Alterar status</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-2">
          <p className="text-xs text-gray-500 mb-3">
            Escolha o novo status pros {count} registro{count > 1 ? 's' : ''} selecionado{count > 1 ? 's' : ''}.
          </p>
          {STATUS_OPTIONS.map(s => (
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

// ─── Tipo de membro ───────────────────────────────────────────────────────────

interface BulkTipoProps extends BaseProps {
  onPick: (tipo: 'membro' | 'visitante' | 'seminarista') => void
}

export function BulkTipoModal({ count, onClose, onPick }: BulkTipoProps) {
  const containerRef = useModalUX({ onClose })
  const tipos: { value: 'membro' | 'visitante' | 'seminarista'; label: string; sub: string }[] = [
    { value: 'membro', label: 'Membro', sub: 'Membro oficial da igreja' },
    { value: 'visitante', label: 'Visitante', sub: 'Frequenta mas não é membro' },
    { value: 'seminarista', label: 'Seminarista', sub: 'Em formação' },
  ]
  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center sm:p-4 bg-black/50">
      <div ref={containerRef} className="bg-white sm:rounded-xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200">
          <h2 className="font-semibold text-gray-800">Alterar tipo</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-2">
          <p className="text-xs text-gray-500 mb-3">
            Mover {count} registro{count > 1 ? 's' : ''} para qual tipo?
          </p>
          {tipos.map(t => (
            <button
              key={t.value}
              onClick={() => onPick(t.value)}
              className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50 text-left transition-colors"
            >
              <div className="text-sm font-semibold text-gray-800">{t.label}</div>
              <div className="text-xs text-gray-500">{t.sub}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Transferir igreja ────────────────────────────────────────────────────────

interface BulkChurchProps extends BaseProps {
  onPick: (churchId: string, churchName: string) => void
}

export function BulkTransferChurchModal({ count, onClose, onPick }: BulkChurchProps) {
  const containerRef = useModalUX({ onClose })
  const { churches } = useChurch()
  const [picked, setPicked] = useState<string>('')

  const igreja = churches.find(c => c.id === picked)

  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center sm:p-4 bg-black/50">
      <div ref={containerRef} className="bg-white sm:rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200">
          <h2 className="font-semibold text-gray-800">Transferir de igreja</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-xs text-gray-500">
            Mover {count} registro{count > 1 ? 's' : ''} para qual igreja?
          </p>
          <div className="space-y-1.5 max-h-72 overflow-y-auto">
            {churches.map(c => (
              <button
                key={c.id}
                onClick={() => setPicked(c.id)}
                className={`w-full px-3 py-2.5 rounded-lg border text-left transition-colors flex items-center gap-2 ${
                  picked === c.id
                    ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-100'
                    : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/30'
                }`}
              >
                <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider shrink-0 ${
                  c.type === 'sede' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  {c.type === 'sede' ? 'Sede' : 'Filial'}
                </span>
                <span className="flex-1 text-sm font-medium text-gray-800">{c.name}</span>
                {picked === c.id && <Check size={14} className="text-blue-600" />}
              </button>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-gray-200 bg-gray-50">
          <button onClick={onClose} className="btn-secondary">Cancelar</button>
          <button
            onClick={() => igreja && onPick(igreja.id, igreja.name)}
            disabled={!picked}
            className="btn-primary disabled:opacity-40"
          >
            Continuar
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Vida espiritual ──────────────────────────────────────────────────────────

interface BulkSpiritualProps extends BaseProps {
  onPick: (payload: {
    field: 'baptism' | 'baptism_spirit' | 'conversion'
    value: boolean
    date?: string
  }) => void
}

export function BulkSpiritualModal({ count, onClose, onPick }: BulkSpiritualProps) {
  const containerRef = useModalUX({ onClose })
  const [field, setField] = useState<'baptism' | 'baptism_spirit' | 'conversion'>('baptism')
  const [value, setValue] = useState(true)
  const [date, setDate] = useState('')

  const fields: { value: typeof field; label: string }[] = [
    { value: 'baptism', label: 'Batismo nas águas' },
    { value: 'baptism_spirit', label: 'Batismo no Espírito' },
    { value: 'conversion', label: 'Conversão' },
  ]

  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center sm:p-4 bg-black/50">
      <div ref={containerRef} className="bg-white sm:rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200">
          <h2 className="font-semibold text-gray-800">Marcos espirituais</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-xs text-gray-500">
            Aplicar a {count} registro{count > 1 ? 's' : ''} selecionado{count > 1 ? 's' : ''}.
          </p>

          <div>
            <label className="form-label">Marco</label>
            <div className="space-y-1.5">
              {fields.map(f => (
                <label key={f.value} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                  field === f.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
                }`}>
                  <input
                    type="radio"
                    checked={field === f.value}
                    onChange={() => setField(f.value)}
                    className="hidden"
                  />
                  <div className={`w-4 h-4 rounded-full border-2 ${field === f.value ? 'border-blue-500 bg-blue-500' : 'border-gray-300'}`} />
                  <span className="text-sm font-medium">{f.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="form-label">Ação</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setValue(true)}
                className={`px-3 py-2 rounded-lg border-2 text-sm font-medium ${
                  value ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                Marcar
              </button>
              <button
                onClick={() => setValue(false)}
                className={`px-3 py-2 rounded-lg border-2 text-sm font-medium ${
                  !value ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                Desmarcar
              </button>
            </div>
          </div>

          {value && (
            <div>
              <label className="form-label">Data (opcional)</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="form-input"
                max={new Date().toISOString().slice(0, 10)}
              />
              <p className="text-[10px] text-gray-400 mt-1">
                Se preenchida, aplica a mesma data a todos.
              </p>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-gray-200 bg-gray-50">
          <button onClick={onClose} className="btn-secondary">Cancelar</button>
          <button
            onClick={() => onPick({ field, value, date: date || undefined })}
            className="btn-primary"
          >
            Continuar
          </button>
        </div>
      </div>
    </div>
  )
}
