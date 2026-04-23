import { useMemo, useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Award, Search, Printer, Trash2, Plus } from 'lucide-react'
import { useData } from '../../contexts/DataContext'
import type { Certificado } from '../../types'
import CertificadoGerarModal from './CertificadoGerarModal'
import { printCertificado } from './printCertificado'

function fmtDate(d?: string) {
  if (!d) return '—'
  try { return format(new Date(d + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR }) } catch { return d }
}

export default function CertificadosPage() {
  const { certificados, setCertificados, seminarios, matriculas } = useData()
  const [params] = useSearchParams()
  const highlight = params.get('highlight')
  const [search, setSearch] = useState('')
  const [seminarioFilter, setSeminarioFilter] = useState('')
  const [modalOpen, setModalOpen] = useState(false)

  // Scroll até o highlight se veio da página de seminário
  useEffect(() => {
    if (highlight) {
      const el = document.getElementById(`cert-row-${highlight}`)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [highlight])

  const filtered = useMemo(() => {
    return certificados
      .filter(c => {
        if (seminarioFilter && c.seminario_id !== seminarioFilter) return false
        if (search.trim()) {
          const q = search.toLowerCase()
          return (
            c.numero.toLowerCase().includes(q) ||
            c.nome_aluno.toLowerCase().includes(q) ||
            c.nome_seminario.toLowerCase().includes(q)
          )
        }
        return true
      })
      .sort((a, b) => b.emitido_em.localeCompare(a.emitido_em))
  }, [certificados, search, seminarioFilter])

  const counts = useMemo(() => ({
    total: certificados.length,
    esteAno: certificados.filter(c => c.emitido_em.startsWith(String(new Date().getFullYear()))).length,
    emitidos: certificados.filter(c => c.status === 'emitido').length,
    cancelados: certificados.filter(c => c.status === 'cancelado').length,
  }), [certificados])

  const handlePrint = (c: Certificado) => {
    printCertificado(c)
  }

  const handleCancel = (id: string) => {
    if (!confirm('Cancelar este certificado? A ação pode ser revertida marcando como reemitido.')) return
    setCertificados(list => list.map(c => c.id === id ? { ...c, status: 'cancelado' as const } : c))
  }

  const handleReemit = (id: string) => {
    setCertificados(list => list.map(c => c.id === id ? { ...c, status: 'reemitido' as const } : c))
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center">
            <Award size={20} className="text-amber-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Certificados</h1>
            <p className="text-sm text-gray-500">Emissão e histórico de diplomas de seminários</p>
          </div>
        </div>
        <button onClick={() => setModalOpen(true)} className="btn-primary">
          <Plus size={14} /> Emitir novo
        </button>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total emitidos', value: counts.total, color: 'bg-gray-500' },
          { label: `Em ${new Date().getFullYear()}`, value: counts.esteAno, color: 'bg-amber-500' },
          { label: 'Ativos', value: counts.emitidos, color: 'bg-emerald-500' },
          { label: 'Cancelados', value: counts.cancelados, color: 'bg-red-500' },
        ].map(c => (
          <div key={c.label} className={`${c.color} rounded-xl p-3 text-white shadow-sm`}>
            <div className="text-2xl font-bold">{c.value}</div>
            <div className="text-xs opacity-90 mt-0.5">{c.label}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por número, aluno ou seminário..."
              className="form-input pl-8 w-full"
            />
          </div>
          <select
            value={seminarioFilter}
            onChange={e => setSeminarioFilter(e.target.value)}
            className="form-input"
          >
            <option value="">Todos seminários</option>
            {seminarios.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
          </select>
        </div>
      </div>

      {/* Lista */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        {/* Desktop */}
        <div className="overflow-x-auto hidden md:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 text-left">Nº Certificado</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 text-left">Aluno</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 text-left">Seminário</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 text-left">C.H.</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 text-left">Emissão</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 text-left">Status</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-gray-400">Nenhum certificado encontrado</td></tr>
              ) : filtered.map(c => (
                <tr
                  key={c.id}
                  id={`cert-row-${c.id}`}
                  className={`hover:bg-amber-50/30 ${highlight === c.id ? 'bg-amber-50' : ''}`}
                >
                  <td className="px-3 py-2 font-mono text-xs text-amber-700">{c.numero}</td>
                  <td className="px-3 py-2">
                    <div className="font-medium text-gray-800">{c.nome_aluno}</div>
                  </td>
                  <td className="px-3 py-2 text-gray-600 text-xs">{c.nome_seminario}</td>
                  <td className="px-3 py-2 text-gray-600 text-xs">{c.carga_horaria}h</td>
                  <td className="px-3 py-2 text-gray-600 text-xs">{fmtDate(c.emitido_em)}</td>
                  <td className="px-3 py-2">
                    <span className={`${c.status === 'emitido' ? 'badge-green' : c.status === 'reemitido' ? 'badge-blue' : 'badge-red'}`}>
                      {c.status === 'emitido' ? 'Emitido' : c.status === 'reemitido' ? 'Reemitido' : 'Cancelado'}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => handlePrint(c)} className="p-1 text-indigo-600 hover:bg-indigo-50 rounded" title="Imprimir">
                        <Printer size={14} />
                      </button>
                      {c.status === 'emitido' && (
                        <button onClick={() => handleCancel(c.id)} className="p-1 text-red-500 hover:bg-red-50 rounded" title="Cancelar">
                          <Trash2 size={14} />
                        </button>
                      )}
                      {c.status === 'cancelado' && (
                        <button
                          onClick={() => handleReemit(c.id)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded text-[10px] font-medium"
                          title="Reemitir"
                        >
                          Reemitir
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile */}
        <div className="md:hidden divide-y divide-gray-100">
          {filtered.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">Nenhum certificado encontrado</div>
          ) : filtered.map(c => (
            <div key={c.id} id={`cert-row-m-${c.id}`} className={`p-3 ${highlight === c.id ? 'bg-amber-50' : ''}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-gray-800 text-sm">{c.nome_aluno}</div>
                  <div className="text-xs text-gray-500 truncate">{c.nome_seminario} · {c.carga_horaria}h</div>
                  <div className="text-[11px] font-mono text-amber-700 mt-1">{c.numero}</div>
                  <div className="text-[11px] text-gray-400 mt-0.5">Emitido {fmtDate(c.emitido_em)}</div>
                </div>
                <span className={`${c.status === 'emitido' ? 'badge-green' : c.status === 'reemitido' ? 'badge-blue' : 'badge-red'} shrink-0`}>
                  {c.status === 'emitido' ? 'Emitido' : c.status === 'reemitido' ? 'Reemitido' : 'Cancelado'}
                </span>
              </div>
              <div className="mt-2 flex items-center gap-1 flex-wrap">
                <button onClick={() => handlePrint(c)} className="inline-flex items-center gap-1 px-2 py-1 text-xs text-indigo-600 bg-indigo-50 rounded">
                  <Printer size={12} /> Imprimir
                </button>
                {c.status === 'emitido' && (
                  <button onClick={() => handleCancel(c.id)} className="inline-flex items-center gap-1 px-2 py-1 text-xs text-red-600 bg-red-50 rounded ml-auto">
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {modalOpen && (
        <CertificadoGerarModal
          onClose={() => setModalOpen(false)}
          onGenerate={(matId) => {
            const mat = matriculas.find(m => m.id === matId)
            if (!mat) return
            const sem = seminarios.find(s => s.id === mat.seminario_id)
            if (!sem) return
            const hoje = new Date().toISOString().split('T')[0]
            const novo: Certificado = {
              id: `cert-${Date.now()}`,
              matricula_id: mat.id,
              seminario_id: sem.id,
              numero: `CERT-${new Date().getFullYear()}-${String(certificados.length + 1).padStart(4, '0')}`,
              nome_aluno: mat.nome,
              nome_seminario: sem.nome,
              carga_horaria: sem.carga_horaria,
              data_conclusao: mat.data_conclusao ?? hoje,
              emitido_em: hoje,
              emitido_por: 'Secretaria Admin',
              status: 'emitido',
              created_at: new Date().toISOString(),
            }
            setCertificados(list => [novo, ...list])
            setModalOpen(false)
            setTimeout(() => printCertificado(novo), 200)
          }}
        />
      )}
    </div>
  )
}
