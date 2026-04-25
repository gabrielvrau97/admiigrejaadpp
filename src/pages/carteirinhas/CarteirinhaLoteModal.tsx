import { useMemo, useState } from 'react'
import { X, IdCard, Search, Check, Layers } from 'lucide-react'
import { useData } from '../../contexts/DataContext'
import type { Member, CarteirinhaMotivo } from '../../types'
import { useToast } from '../../components/ui/UIProvider'
import { useModalUX } from '../../hooks/useModalUX'

interface Props {
  onClose: () => void
  onGenerate: (
    memberIds: string[],
    motivo: CarteirinhaMotivo,
    validadeAnos: number,
  ) => void
}

export default function CarteirinhaLoteModal({ onClose, onGenerate }: Props) {
  const { members, carteirinhas } = useData()
  const toast = useToast()
  const containerRef = useModalUX({ onClose })
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [motivo, setMotivo] = useState<CarteirinhaMotivo>('primeira_via')
  const [validadeAnos, setValidadeAnos] = useState(2)

  const filtered = useMemo(() => {
    const ativos = members.filter(m => m.status !== 'deleted')
    if (!search.trim()) return ativos
    const q = search.toLowerCase()
    return ativos.filter(m =>
      m.name.toLowerCase().includes(q) ||
      (m.cpf ?? '').includes(q) ||
      (m.apelido ?? '').toLowerCase().includes(q)
    )
  }, [members, search])

  const temCartAtiva = (memberId: string) =>
    carteirinhas.some(c => c.member_id === memberId && c.status === 'ativa')

  const toggle = (id: string) =>
    setSelected(prev => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id); else n.add(id)
      return n
    })

  const toggleAllVisible = () => {
    const ids = filtered.map(m => m.id)
    const allSel = ids.every(id => selected.has(id))
    setSelected(prev => {
      const n = new Set(prev)
      if (allSel) ids.forEach(id => n.delete(id))
      else ids.forEach(id => n.add(id))
      return n
    })
  }

  const handleConfirm = () => {
    if (selected.size === 0) {
      toast.warning('Selecione pelo menos um membro.')
      return
    }
    onGenerate(Array.from(selected), motivo, validadeAnos)
  }

  const jaTemCount = Array.from(selected).filter(id => temCartAtiva(id)).length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center sm:p-4 bg-black/50">
      <div ref={containerRef} className="bg-white sm:rounded-xl shadow-2xl w-full max-w-3xl h-full sm:h-auto sm:max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-gray-200 bg-gray-50 sm:rounded-t-xl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
              <Layers size={18} className="text-blue-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-800">Gerar credenciais em lote</h2>
              <p className="text-xs text-gray-500">
                Selecione os membros · mesma validade e motivo pra todos
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-200 rounded-lg">
            <X size={16} />
          </button>
        </div>

        {/* Config aplicada a todos */}
        <div className="px-4 sm:px-5 py-3 border-b border-gray-100 bg-blue-50/40">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="form-label">Motivo (aplicado a todos)</label>
              <select
                className="form-select"
                value={motivo}
                onChange={e => setMotivo(e.target.value as CarteirinhaMotivo)}
              >
                <option value="primeira_via">Primeira via</option>
                <option value="renovacao">Renovação</option>
                <option value="segunda_via">Segunda via (perda/dano)</option>
                <option value="atualizacao_dados">Atualização de dados</option>
              </select>
            </div>
            <div>
              <label className="form-label">Validade</label>
              <select
                className="form-select"
                value={validadeAnos}
                onChange={e => setValidadeAnos(parseInt(e.target.value))}
              >
                <option value={1}>1 ano</option>
                <option value={2}>2 anos (padrão)</option>
                <option value={3}>3 anos</option>
                <option value={5}>5 anos</option>
              </select>
            </div>
          </div>
        </div>

        {/* Busca */}
        <div className="px-4 sm:px-5 py-3 border-b border-gray-100">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nome, CPF ou apelido..."
              className="form-input pl-8 w-full"
              autoFocus
            />
          </div>
          <div className="mt-2 flex items-center gap-3 flex-wrap text-xs text-gray-500">
            <label className="inline-flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                className="rounded"
                checked={filtered.length > 0 && filtered.every(m => selected.has(m.id))}
                onChange={toggleAllVisible}
              />
              <span>Selecionar todos visíveis ({filtered.length})</span>
            </label>
            <span className="ml-auto font-medium text-blue-700">
              {selected.size} selecionado{selected.size !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">
              Nenhum membro encontrado
            </div>
          ) : filtered.map(m => {
            const isSel = selected.has(m.id)
            const jaTem = temCartAtiva(m.id)
            return (
              <label
                key={m.id}
                className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
                  isSel ? 'bg-blue-50' : 'hover:bg-gray-50'
                }`}
              >
                <input
                  type="checkbox"
                  className="rounded shrink-0"
                  checked={isSel}
                  onChange={() => toggle(m.id)}
                />
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {m.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-800 text-sm truncate">
                    {m.name}
                    {m.apelido && <span className="text-gray-400 font-normal"> ({m.apelido})</span>}
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    {m.cpf ?? 'Sem CPF'} · {m.church?.name ?? '—'}
                  </div>
                </div>
                {jaTem && (
                  <span className="text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full shrink-0">
                    Já tem credencial
                  </span>
                )}
              </label>
            )
          })}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-5 py-3 border-t border-gray-200 bg-gray-50 sm:rounded-b-xl">
          {jaTemCount > 0 && selected.size > 0 && (
            <p className="text-xs text-amber-700 mb-2 flex items-center gap-1">
              <Check size={12} /> {jaTemCount} do{jaTemCount > 1 ? 's' : ''} selecionado{jaTemCount > 1 ? 's' : ''} já tem credencial ativa — a antiga será substituída.
            </p>
          )}
          <div className="flex items-center justify-end gap-2">
            <button onClick={onClose} className="btn-secondary">Cancelar</button>
            <button
              onClick={handleConfirm}
              disabled={selected.size === 0}
              className="btn-primary flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <IdCard size={14} />
              Gerar e imprimir {selected.size > 0 ? `(${selected.size})` : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
