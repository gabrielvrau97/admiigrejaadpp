import { useMemo, useState } from 'react'
import { X, Award, Search } from 'lucide-react'
import { useData } from '../../contexts/DataContext'
import type { Matricula } from '../../types'
import { useConfirm } from '../../components/ui/UIProvider'
import { useModalUX } from '../../hooks/useModalUX'

interface Props {
  onClose: () => void
  onGenerate: (matriculaId: string) => void
}

export default function CertificadoGerarModal({ onClose, onGenerate }: Props) {
  const { matriculas, seminarios, certificados } = useData()
  const [search, setSearch] = useState('')
  const confirm = useConfirm()
  const containerRef = useModalUX({ onClose })

  // Só permite emitir para matrículas com situação "concluido"
  const candidatos = useMemo(() => {
    return matriculas
      .filter(m => m.situacao === 'concluido')
      .map(m => {
        const sem = seminarios.find(s => s.id === m.seminario_id)
        const jaTem = certificados.some(c => c.matricula_id === m.id && c.status !== 'cancelado')
        return { m, sem, jaTem }
      })
      .filter(({ m, sem }) => {
        if (!sem) return false
        if (search.trim()) {
          const q = search.toLowerCase()
          return m.nome.toLowerCase().includes(q) || sem.nome.toLowerCase().includes(q)
        }
        return true
      })
  }, [matriculas, seminarios, certificados, search])

  const handlePick = async (mat: Matricula, jaTem: boolean) => {
    if (jaTem) {
      const ok = await confirm({
        title: 'Reemitir certificado',
        message: 'Este aluno já tem certificado emitido para este seminário. Deseja reemitir?',
        confirmLabel: 'Reemitir',
      })
      if (!ok) return
    }
    onGenerate(mat.id)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center sm:p-4 bg-black/50">
      <div ref={containerRef} className="bg-white sm:rounded-xl shadow-2xl w-full max-w-2xl h-full sm:h-auto sm:max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-gray-200 bg-gray-50 sm:rounded-t-xl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center">
              <Award size={18} className="text-amber-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-800">Emitir certificado</h2>
              <p className="text-xs text-gray-500">Selecione o aluno concluinte</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-200 rounded-lg">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
            Apenas alunos com situação <strong>"Concluído"</strong> podem receber certificado.
          </div>

          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nome ou seminário..."
              className="form-input pl-8"
              autoFocus
            />
          </div>

          {candidatos.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              Nenhum aluno concluinte encontrado
            </div>
          ) : (
            <div className="space-y-1.5 max-h-[50vh] overflow-y-auto">
              {candidatos.map(({ m, sem, jaTem }) => (
                <button
                  key={m.id}
                  onClick={() => handlePick(m, jaTem)}
                  className={`w-full flex items-center gap-3 p-3 border rounded-lg text-left transition-colors ${
                    jaTem ? 'border-amber-200 bg-amber-50/50 hover:bg-amber-50' : 'border-gray-200 hover:bg-blue-50 hover:border-blue-300'
                  }`}
                >
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                    {m.nome[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-800 truncate">{m.nome}</div>
                    <div className="text-xs text-gray-500 truncate">
                      {sem?.nome} · {sem?.carga_horaria}h · Nota {m.nota_final ?? '—'}
                    </div>
                  </div>
                  {jaTem ? (
                    <span className="text-xs text-amber-700 font-medium shrink-0">Já emitido — reemitir</span>
                  ) : (
                    <span className="text-xs text-blue-600 font-medium shrink-0">Emitir →</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-4 sm:px-5 py-3 border-t border-gray-200 bg-gray-50 sm:rounded-b-xl">
          <button onClick={onClose} className="btn-secondary">Fechar</button>
        </div>
      </div>
    </div>
  )
}
