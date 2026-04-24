import { useMemo, useState } from 'react'
import { X, Check } from 'lucide-react'
import { useModalUX } from '../../hooks/useModalUX'
import { ALL_COLUMNS, DEFAULT_COLS, MAX_COLS, type ColDef, type ColKey } from './membros-columns'

interface Props {
  selected: ColKey[]
  onChange: (cols: ColKey[]) => void
  onClose: () => void
}

export default function ColConfigPanel({ selected, onChange, onClose }: Props) {
  const containerRef = useModalUX({ onClose })
  const [local, setLocal] = useState<ColKey[]>(selected)

  const groups = useMemo(() => {
    const map: Record<string, ColDef[]> = {}
    ALL_COLUMNS.forEach(c => {
      if (!map[c.group]) map[c.group] = []
      map[c.group].push(c)
    })
    return map
  }, [])

  const toggle = (key: ColKey) => {
    if (local.includes(key)) {
      setLocal(l => l.filter(k => k !== key))
    } else {
      if (local.length >= MAX_COLS) return
      setLocal(l => [...l, key])
    }
  }

  const apply = () => { onChange(local); onClose() }
  const reset = () => setLocal(DEFAULT_COLS)

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 sm:pt-12 sm:px-4">
      <div ref={containerRef} className="bg-white sm:rounded-xl shadow-2xl w-full max-w-2xl h-full sm:h-auto sm:max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div>
            <h2 className="font-semibold text-gray-800">Personalizar visualização</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Selecione até {MAX_COLS} itens para personalizar a visualização de dados no grid, na impressão e exportação.
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded text-gray-400">
            <X size={16} />
          </button>
        </div>

        {/* Info bar */}
        <div className="px-5 py-2 bg-blue-50 border-b border-blue-100 flex items-center justify-between">
          <span className="text-xs text-blue-700">
            <span className="font-semibold">{local.length}</span> de {MAX_COLS} colunas selecionadas
          </span>
          <button onClick={reset} className="text-xs text-blue-600 hover:underline">Restaurar padrão</button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          {Object.entries(groups).map(([group, cols]) => (
            <div key={group}>
              <h3 className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-2">{group}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-1.5">
                {cols.map(col => {
                  const checked = local.includes(col.key)
                  const disabled = !checked && local.length >= MAX_COLS
                  return (
                    <label
                      key={col.key}
                      className={`flex items-center gap-2 text-sm cursor-pointer select-none ${disabled ? 'opacity-40 cursor-not-allowed' : 'hover:text-blue-700'}`}
                    >
                      <div
                        onClick={() => !disabled && toggle(col.key)}
                        className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                          checked ? 'bg-blue-600 border-blue-600' : 'border-gray-300 bg-white'
                        }`}
                      >
                        {checked && <Check size={10} className="text-white" strokeWidth={3} />}
                      </div>
                      <span className="text-gray-700">{col.label}</span>
                    </label>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-200 flex justify-end gap-2">
          <button onClick={onClose} className="btn-outline">Cancelar</button>
          <button onClick={apply} className="btn-primary">Aplicar</button>
        </div>
      </div>
    </div>
  )
}
