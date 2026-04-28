/**
 * Modal genérico para alterar campos array (titles/ministries/departments/functions)
 * em massa, com 4 sub-ações:
 *   - add: soma valores ao array existente (sem duplicar)
 *   - remove: tira valor(es) se existir
 *   - swap: troca A→B (remove A, adiciona B)
 *   - replace: substitui o array inteiro pela nova lista
 */

import { useState } from 'react'
import { X, Plus, Minus, ArrowRight, RefreshCw } from 'lucide-react'
import { useModalUX } from '../../hooks/useModalUX'

export type ArrayOperation = 'add' | 'remove' | 'swap' | 'replace'

export interface ArrayBulkPayload {
  operation: ArrayOperation
  add?: string[]      // valores a adicionar (add, swap target, replace)
  remove?: string[]   // valores a remover (remove, swap source)
}

interface Props {
  /** Título do modal — ex: "Alterar títulos" */
  title: string
  /** Nome amigável do campo no plural — ex: "títulos", "ministérios" */
  fieldLabel: string
  /** Lista de opções disponíveis (de configOptions). */
  options: string[]
  count: number
  onClose: () => void
  onPick: (payload: ArrayBulkPayload) => void
}

export default function BulkArrayFieldModal({
  title,
  fieldLabel,
  options,
  count,
  onClose,
  onPick,
}: Props) {
  const containerRef = useModalUX({ onClose })
  const [operation, setOperation] = useState<ArrayOperation>('add')
  const [valueA, setValueA] = useState<string[]>([])  // remove ou source de swap
  const [valueB, setValueB] = useState<string[]>([])  // add, target de swap, replace

  const ops: { value: ArrayOperation; label: string; sub: string; icon: React.ReactNode }[] = [
    { value: 'add', label: 'Adicionar', sub: `Soma ${fieldLabel} aos existentes`, icon: <Plus size={14} /> },
    { value: 'remove', label: 'Remover', sub: `Tira ${fieldLabel} se existirem`, icon: <Minus size={14} /> },
    { value: 'swap', label: 'Trocar', sub: 'Remove A e adiciona B', icon: <ArrowRight size={14} /> },
    { value: 'replace', label: 'Substituir tudo', sub: 'Apaga lista e seta a nova', icon: <RefreshCw size={14} /> },
  ]

  const valid = (() => {
    if (operation === 'add') return valueB.length > 0
    if (operation === 'remove') return valueA.length > 0
    if (operation === 'swap') return valueA.length > 0 && valueB.length > 0
    if (operation === 'replace') return true  // pode setar lista vazia
    return false
  })()

  const handleConfirm = () => {
    const payload: ArrayBulkPayload = { operation }
    if (operation === 'add') payload.add = valueB
    if (operation === 'remove') payload.remove = valueA
    if (operation === 'swap') { payload.add = valueB; payload.remove = valueA }
    if (operation === 'replace') payload.add = valueB
    onPick(payload)
  }

  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center sm:p-4 bg-black/50">
      <div ref={containerRef} className="bg-white sm:rounded-xl shadow-2xl w-full max-w-lg sm:max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200">
          <div>
            <h2 className="font-semibold text-gray-800">{title}</h2>
            <p className="text-xs text-gray-500">{count} selecionado{count > 1 ? 's' : ''}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X size={16} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Escolha da operação */}
          <div>
            <label className="form-label">Operação</label>
            <div className="grid grid-cols-2 gap-2">
              {ops.map(o => (
                <button
                  key={o.value}
                  onClick={() => { setOperation(o.value); setValueA([]); setValueB([]) }}
                  className={`px-3 py-2.5 rounded-lg border-2 text-left transition-colors ${
                    operation === o.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-800">
                    {o.icon}
                    {o.label}
                  </div>
                  <div className="text-[10px] text-gray-500 mt-0.5">{o.sub}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Inputs conforme operação */}
          {operation === 'add' && (
            <ArrayPicker
              label={`Adicionar ${fieldLabel}`}
              options={options}
              selected={valueB}
              onChange={setValueB}
              placeholder={`Selecione um ou mais ${fieldLabel}`}
            />
          )}

          {operation === 'remove' && (
            <ArrayPicker
              label={`Remover ${fieldLabel}`}
              options={options}
              selected={valueA}
              onChange={setValueA}
              placeholder={`Selecione ${fieldLabel} a remover`}
            />
          )}

          {operation === 'swap' && (
            <>
              <ArrayPicker
                label={`Remover (de)`}
                options={options}
                selected={valueA}
                onChange={setValueA}
                placeholder={`Selecione ${fieldLabel} a remover`}
                singleOnly
              />
              <ArrayPicker
                label={`Adicionar (para)`}
                options={options}
                selected={valueB}
                onChange={setValueB}
                placeholder={`Selecione ${fieldLabel} a adicionar`}
                singleOnly
              />
              {valueA.length > 0 && valueB.length > 0 && (
                <div className="text-xs bg-blue-50 border border-blue-100 rounded-lg p-2 text-blue-700 flex items-center gap-1.5">
                  <span className="font-medium">{valueA[0]}</span>
                  <ArrowRight size={11} />
                  <span className="font-medium">{valueB[0]}</span>
                </div>
              )}
            </>
          )}

          {operation === 'replace' && (
            <>
              <ArrayPicker
                label={`Nova lista de ${fieldLabel}`}
                options={options}
                selected={valueB}
                onChange={setValueB}
                placeholder={`Lista que substituirá a atual`}
              />
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg p-2">
                ⚠ A lista atual de cada registro será apagada e trocada por essa.
              </p>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 px-5 py-3 border-t border-gray-200 bg-gray-50 sm:rounded-b-xl">
          <button onClick={onClose} className="btn-secondary">Cancelar</button>
          <button
            onClick={handleConfirm}
            disabled={!valid}
            className="btn-primary disabled:opacity-40"
          >
            Continuar
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Sub-componente de seleção múltipla ───────────────────────────────────────

interface PickerProps {
  label: string
  options: string[]
  selected: string[]
  onChange: (next: string[]) => void
  placeholder?: string
  /** Se true, só permite uma escolha. */
  singleOnly?: boolean
}

function ArrayPicker({ label, options, selected, onChange, placeholder, singleOnly }: PickerProps) {
  const [search, setSearch] = useState('')
  const filtered = options.filter(o => o.toLowerCase().includes(search.toLowerCase()))

  const toggle = (val: string) => {
    if (singleOnly) {
      onChange(selected.includes(val) ? [] : [val])
    } else {
      onChange(selected.includes(val) ? selected.filter(s => s !== val) : [...selected, val])
    }
  }

  return (
    <div>
      <label className="form-label">{label}</label>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selected.map(s => (
            <span key={s} className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded-md text-xs font-medium">
              {s}
              <button onClick={() => toggle(s)} className="text-blue-500 hover:text-red-500">
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      )}
      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder={placeholder ?? 'Buscar...'}
        className="form-input mb-2"
      />
      <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
        {filtered.length === 0 ? (
          <p className="text-xs text-gray-400 italic px-3 py-2">Nenhuma opção encontrada</p>
        ) : (
          filtered.map(opt => (
            <button
              key={opt}
              onClick={() => toggle(opt)}
              className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-blue-50 transition-colors ${
                selected.includes(opt) ? 'bg-blue-50 text-blue-800 font-medium' : 'text-gray-700'
              }`}
            >
              <input
                type={singleOnly ? 'radio' : 'checkbox'}
                checked={selected.includes(opt)}
                onChange={() => {}}
                className="rounded shrink-0"
              />
              {opt}
            </button>
          ))
        )}
      </div>
    </div>
  )
}
