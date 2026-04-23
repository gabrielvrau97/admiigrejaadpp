import { useState, useMemo } from 'react'
import { X, IdCard, Search, Check } from 'lucide-react'
import { useData } from '../../contexts/DataContext'
import type { Member, CarteirinhaMotivo } from '../../types'

interface Props {
  onClose: () => void
  onGenerate: (memberId: string, motivo: CarteirinhaMotivo, validadeAnos: number) => void
}

export default function CarteirinhaGerarModal({ onClose, onGenerate }: Props) {
  const { members, carteirinhas } = useData()
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Member | null>(null)
  const [motivo, setMotivo] = useState<CarteirinhaMotivo>('primeira_via')
  const [validadeAnos, setValidadeAnos] = useState(2)

  const filtered = useMemo(() => {
    if (!search.trim()) return [] as Member[]
    const q = search.toLowerCase()
    return members
      .filter(m => m.status !== 'deleted')
      .filter(m =>
        m.name.toLowerCase().includes(q) ||
        (m.cpf ?? '').includes(q) ||
        (m.apelido ?? '').toLowerCase().includes(q)
      )
      .slice(0, 10)
  }, [members, search])

  const carteirinhasMembro = useMemo(() => {
    if (!selected) return []
    return carteirinhas.filter(c => c.member_id === selected.id)
  }, [carteirinhas, selected])

  const jaTem = carteirinhasMembro.some(c => c.status === 'ativa')

  const handleConfirm = () => {
    if (!selected) return
    onGenerate(selected.id, motivo, validadeAnos)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center sm:p-4 bg-black/50">
      <div className="bg-white sm:rounded-xl shadow-2xl w-full max-w-2xl h-full sm:h-auto sm:max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-gray-200 bg-gray-50 sm:rounded-t-xl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
              <IdCard size={18} className="text-blue-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-800">Gerar nova carteirinha</h2>
              <p className="text-xs text-gray-500">Selecione o membro e defina a validade</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-200 rounded-lg">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4">
          {/* Seleção de membro */}
          <div>
            <label className="form-label">1. Selecione o membro</label>
            {selected ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  <Check size={16} className="text-emerald-600 mt-0.5 shrink-0" />
                  <div className="text-sm">
                    <p className="font-semibold text-emerald-800">{selected.name}</p>
                    <p className="text-xs text-emerald-700">
                      {selected.cpf ?? 'Sem CPF'} · {selected.church?.name ?? '—'}
                    </p>
                    {jaTem && (
                      <p className="text-xs text-amber-700 mt-1">
                        ⚠ Membro já tem carteirinha ativa — a antiga será marcada como substituída.
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="text-xs text-emerald-700 hover:underline shrink-0"
                >
                  Trocar
                </button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Buscar por nome, CPF ou apelido..."
                    className="form-input pl-8"
                    autoFocus
                  />
                </div>
                {search.trim() !== '' && (
                  <div className="mt-2 space-y-1 max-h-60 overflow-y-auto">
                    {filtered.length === 0 ? (
                      <div className="text-center py-6 text-gray-400 text-sm">Nenhum membro encontrado</div>
                    ) : filtered.map(m => (
                      <button
                        key={m.id}
                        onClick={() => { setSelected(m); setSearch('') }}
                        className="w-full flex items-center gap-3 p-2.5 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 text-left"
                      >
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                          {m.name[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-800 truncate text-sm">{m.name}</div>
                          <div className="text-xs text-gray-500 truncate">{m.cpf ?? 'Sem CPF'} · {m.church?.name ?? '—'}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Dados da emissão */}
          {selected && (
            <div className="space-y-3">
              <div>
                <label className="form-label">2. Motivo da emissão</label>
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
                <label className="form-label">3. Validade</label>
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

              {/* Preview dos dados */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs text-gray-600 space-y-1">
                <p className="font-semibold text-gray-700 mb-1">📋 Dados da carteirinha</p>
                <p><strong>Titular:</strong> {selected.name}</p>
                <p><strong>CPF:</strong> {selected.cpf ?? 'Não informado'}</p>
                <p><strong>Igreja:</strong> {selected.church?.name ?? '—'}</p>
                <p><strong>Emissão:</strong> {new Date().toLocaleDateString('pt-BR')}</p>
                <p><strong>Validade:</strong> {new Date(new Date().setFullYear(new Date().getFullYear() + validadeAnos)).toLocaleDateString('pt-BR')}</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-4 sm:px-5 py-3 border-t border-gray-200 bg-gray-50 sm:rounded-b-xl">
          <button onClick={onClose} className="btn-secondary">Cancelar</button>
          <button
            onClick={handleConfirm}
            disabled={!selected}
            className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Gerar e imprimir
          </button>
        </div>
      </div>
    </div>
  )
}
