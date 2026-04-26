import { useMemo, useState } from 'react'
import { X, Award, Search, Layers, GraduationCap } from 'lucide-react'
import { useData } from '../../contexts/DataContext'
import { useToast } from '../../components/ui/UIProvider'
import { useModalUX } from '../../hooks/useModalUX'

interface Props {
  onClose: () => void
  onGenerate: (matriculaIds: string[]) => void
}

export default function CertificadoLoteModal({ onClose, onGenerate }: Props) {
  const { seminarios, matriculas, certificados } = useData()
  const toast = useToast()
  const containerRef = useModalUX({ onClose })
  const [seminarioId, setSeminarioId] = useState('')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  // Só seminários que têm pelo menos 1 concluinte
  const seminariosComConcluintes = useMemo(() =>
    seminarios.filter(s =>
      matriculas.some(m => m.seminario_id === s.id && m.situacao === 'concluido')
    ),
  [seminarios, matriculas])

  const concluintes = useMemo(() => {
    if (!seminarioId) return []
    let list = matriculas.filter(m =>
      m.seminario_id === seminarioId && m.situacao === 'concluido'
    )
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(m => m.nome.toLowerCase().includes(q))
    }
    return list
  }, [matriculas, seminarioId, search])

  const jaTemCert = (matId: string) =>
    certificados.some(c => c.matricula_id === matId && c.status !== 'cancelado')

  const toggle = (id: string) =>
    setSelected(prev => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id); else n.add(id)
      return n
    })

  const toggleAllVisible = () => {
    const ids = concluintes.map(m => m.id)
    const allSel = ids.every(id => selected.has(id))
    setSelected(prev => {
      const n = new Set(prev)
      if (allSel) ids.forEach(id => n.delete(id))
      else ids.forEach(id => n.add(id))
      return n
    })
  }

  const trocarSeminario = (id: string) => {
    setSeminarioId(id)
    setSelected(new Set())
    setSearch('')
  }

  const handleConfirm = () => {
    if (selected.size === 0) {
      toast.warning('Selecione pelo menos um aluno.')
      return
    }
    onGenerate(Array.from(selected))
  }

  const jaTemCount = Array.from(selected).filter(id => jaTemCert(id)).length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center sm:p-4 bg-black/50">
      <div ref={containerRef} className="bg-white sm:rounded-xl shadow-2xl w-full max-w-3xl h-full sm:h-auto sm:max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-gray-200 bg-gray-50 sm:rounded-t-xl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center">
              <Layers size={18} className="text-amber-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-800">Emitir certificados em lote</h2>
              <p className="text-xs text-gray-500">Escolha o seminário e selecione os concluintes</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-200 rounded-lg">
            <X size={16} />
          </button>
        </div>

        {/* Seletor de seminário */}
        <div className="px-4 sm:px-5 py-3 border-b border-gray-100 bg-amber-50/40">
          <label className="form-label">1. Selecione o seminário</label>
          <select
            className="form-select"
            value={seminarioId}
            onChange={e => trocarSeminario(e.target.value)}
          >
            <option value="">— Escolha um seminário —</option>
            {seminariosComConcluintes.map(s => {
              const qtd = matriculas.filter(m =>
                m.seminario_id === s.id && m.situacao === 'concluido'
              ).length
              return (
                <option key={s.id} value={s.id}>
                  {s.nome} · {qtd} concluinte{qtd > 1 ? 's' : ''}
                </option>
              )
            })}
          </select>
          {seminariosComConcluintes.length === 0 && (
            <p className="text-xs text-amber-700 mt-2">
              Nenhum seminário tem alunos concluintes. Marque matrículas como "Concluído" antes de emitir certificados.
            </p>
          )}
        </div>

        {/* Busca + selecionar todos (só aparece depois de escolher seminário) */}
        {seminarioId && (
          <div className="px-4 sm:px-5 py-3 border-b border-gray-100">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar concluinte por nome..."
                className="form-input pl-8 w-full"
              />
            </div>
            <div className="mt-2 flex items-center gap-3 flex-wrap text-xs text-gray-500">
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded"
                  checked={concluintes.length > 0 && concluintes.every(m => selected.has(m.id))}
                  onChange={toggleAllVisible}
                />
                <span>Selecionar todos visíveis ({concluintes.length})</span>
              </label>
              <span className="ml-auto font-medium text-amber-700">
                {selected.size} selecionado{selected.size !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        )}

        {/* Lista de concluintes */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
          {!seminarioId ? (
            <div className="text-center py-12 text-gray-400 text-sm flex flex-col items-center gap-2">
              <GraduationCap size={40} className="text-gray-300" />
              Selecione um seminário acima para ver os concluintes
            </div>
          ) : concluintes.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">
              {search.trim() ? 'Nenhum concluinte corresponde à busca' : 'Nenhum concluinte neste seminário'}
            </div>
          ) : concluintes.map(m => {
            const isSel = selected.has(m.id)
            const jaTem = jaTemCert(m.id)
            return (
              <label
                key={m.id}
                className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
                  isSel ? 'bg-amber-50' : 'hover:bg-gray-50'
                }`}
              >
                <input
                  type="checkbox"
                  className="rounded shrink-0"
                  checked={isSel}
                  onChange={() => toggle(m.id)}
                />
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {m.nome[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-800 text-sm truncate">{m.nome}</div>
                  <div className="text-xs text-gray-500 truncate">
                    {m.cpf ?? 'Sem CPF'}
                    {m.nota_final != null && ` · Nota ${m.nota_final.toFixed(1)}`}
                    {m.frequencia != null && ` · Freq. ${m.frequencia}%`}
                  </div>
                </div>
                {jaTem && (
                  <span className="text-[10px] font-medium text-amber-700 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full shrink-0">
                    Já tem certificado
                  </span>
                )}
              </label>
            )
          })}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-5 py-3 border-t border-gray-200 bg-gray-50 sm:rounded-b-xl">
          {jaTemCount > 0 && (
            <p className="text-xs text-amber-700 mb-2">
              ⚠ {jaTemCount} do{jaTemCount > 1 ? 's' : ''} selecionado{jaTemCount > 1 ? 's' : ''} já tem certificado — será emitida uma reimpressão.
            </p>
          )}
          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2">
            <button onClick={onClose} className="btn-secondary w-full sm:w-auto justify-center">Cancelar</button>
            <button
              onClick={handleConfirm}
              disabled={selected.size === 0}
              className="btn-primary w-full sm:w-auto justify-center flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Award size={14} />
              Emitir e imprimir {selected.size > 0 ? `(${selected.size})` : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
