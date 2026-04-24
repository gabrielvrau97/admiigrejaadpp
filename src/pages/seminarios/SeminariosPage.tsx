import { useMemo, useState } from 'react'
import { GraduationCap, Plus, Search, Users, Calendar, Clock, MapPin, Pencil, Eye, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../../contexts/DataContext'
import type { Seminario, SeminarioStatus } from '../../types'
import SeminarioModal from './SeminarioModal'
import { fmtDate } from '../../lib/format'
import { useToast, useConfirm } from '../../components/ui/UIProvider'

const STATUS_CONFIG: Record<SeminarioStatus, { label: string; badge: string; dot: string }> = {
  planejado: { label: 'Planejado', badge: 'badge-yellow', dot: 'bg-yellow-500' },
  em_andamento: { label: 'Em andamento', badge: 'badge-blue', dot: 'bg-blue-500' },
  concluido: { label: 'Concluído', badge: 'badge-green', dot: 'bg-emerald-500' },
  cancelado: { label: 'Cancelado', badge: 'badge-red', dot: 'bg-red-500' },
}

export default function SeminariosPage() {
  const navigate = useNavigate()
  const { seminarios, setSeminarios, matriculas } = useData()
  const toast = useToast()
  const confirm = useConfirm()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<SeminarioStatus | ''>('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Seminario | null>(null)

  const filtered = useMemo(() => {
    return seminarios.filter(s => {
      if (statusFilter && s.status !== statusFilter) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        return s.nome.toLowerCase().includes(q) || (s.instrutor ?? '').toLowerCase().includes(q)
      }
      return true
    })
  }, [seminarios, search, statusFilter])

  const counts = useMemo(() => {
    let em_andamento = 0, planejado = 0, concluido = 0
    for (const s of seminarios) {
      if (s.status === 'em_andamento') em_andamento++
      else if (s.status === 'planejado') planejado++
      else if (s.status === 'concluido') concluido++
    }
    return { total: seminarios.length, em_andamento, planejado, concluido }
  }, [seminarios])

  // Contagem de matrículas por seminário — memoizado em um Map para evitar filter N² nos cards
  const matCountByseminario = useMemo(() => {
    const map = new Map<string, number>()
    for (const m of matriculas) {
      map.set(m.seminario_id, (map.get(m.seminario_id) ?? 0) + 1)
    }
    return map
  }, [matriculas])

  const matCount = (seminarioId: string) => matCountByseminario.get(seminarioId) ?? 0

  const handleAdd = () => { setEditing(null); setModalOpen(true) }
  const handleEdit = (s: Seminario) => { setEditing(s); setModalOpen(true) }
  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: 'Excluir seminário',
      message: 'Deseja realmente excluir este seminário? Os alunos matriculados também serão afetados.',
      danger: true,
    })
    if (!ok) return
    setSeminarios(list => list.filter(s => s.id !== id))
    toast.success('Seminário excluído.')
  }
  const handleSave = (data: Partial<Seminario>) => {
    if (editing) {
      setSeminarios(list => list.map(s => s.id === editing.id ? { ...s, ...data, updated_at: new Date().toISOString() } : s))
    } else {
      const novo: Seminario = {
        id: `sem-${Date.now()}`,
        nome: data.nome ?? 'Novo seminário',
        descricao: data.descricao,
        instrutor: data.instrutor,
        data_inicio: data.data_inicio ?? new Date().toISOString().split('T')[0],
        data_fim: data.data_fim,
        carga_horaria: data.carga_horaria ?? 0,
        local: data.local,
        church_id: data.church_id,
        status: data.status ?? 'planejado',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      setSeminarios(list => [novo, ...list])
    }
    setModalOpen(false)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
            <GraduationCap size={20} className="text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Seminários</h1>
            <p className="text-sm text-gray-500">Gestão de seminários e matrículas temporárias</p>
          </div>
        </div>
        <button onClick={handleAdd} className="btn-primary">
          <Plus size={14} /> Novo seminário
        </button>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: counts.total, color: 'bg-gray-500', filter: '' as const },
          { label: 'Em andamento', value: counts.em_andamento, color: 'bg-blue-500', filter: 'em_andamento' as const },
          { label: 'Planejados', value: counts.planejado, color: 'bg-yellow-500', filter: 'planejado' as const },
          { label: 'Concluídos', value: counts.concluido, color: 'bg-emerald-500', filter: 'concluido' as const },
        ].map(c => (
          <button
            key={c.label}
            onClick={() => setStatusFilter(prev => prev === c.filter ? '' : c.filter)}
            className={`${c.color} rounded-xl p-3 text-white shadow-sm text-left transition-transform hover:scale-105 ${statusFilter === c.filter && c.filter !== '' ? 'ring-2 ring-offset-2 ring-white' : ''}`}
          >
            <div className="text-2xl font-bold">{c.value}</div>
            <div className="text-xs opacity-90 mt-0.5">{c.label}</div>
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nome ou instrutor..."
              className="form-input pl-8 w-full"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as SeminarioStatus | '')}
            className="form-input"
          >
            <option value="">Todos os status</option>
            <option value="planejado">Planejados</option>
            <option value="em_andamento">Em andamento</option>
            <option value="concluido">Concluídos</option>
            <option value="cancelado">Cancelados</option>
          </select>
        </div>
      </div>

      {/* Lista de cards de seminários */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400 text-sm">
          Nenhum seminário encontrado. Clique em "Novo seminário" para criar.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(s => {
            const cfg = STATUS_CONFIG[s.status]
            const total = matCount(s.id)
            return (
              <div
                key={s.id}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden transition-all hover:shadow-md hover:border-blue-200"
              >
                <div className={`h-1 ${cfg.dot}`} />
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-gray-800 leading-tight truncate">{s.nome}</h3>
                      {s.instrutor && <p className="text-xs text-gray-500 mt-0.5 truncate">Instrutor: {s.instrutor}</p>}
                    </div>
                    <span className={cfg.badge}>{cfg.label}</span>
                  </div>

                  {s.descricao && (
                    <p className="text-xs text-gray-600 line-clamp-2">{s.descricao}</p>
                  )}

                  <div className="space-y-1 text-xs text-gray-500">
                    <div className="flex items-center gap-1.5">
                      <Calendar size={12} className="text-blue-500 shrink-0" />
                      <span className="truncate">{fmtDate(s.data_inicio)} {s.data_fim && `→ ${fmtDate(s.data_fim)}`}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock size={12} className="text-blue-500 shrink-0" />
                      <span>{s.carga_horaria}h de carga horária</span>
                    </div>
                    {s.local && (
                      <div className="flex items-center gap-1.5">
                        <MapPin size={12} className="text-blue-500 shrink-0" />
                        <span className="truncate">{s.local}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <Users size={12} className="text-blue-500 shrink-0" />
                      <span>{total} {total === 1 ? 'matriculado' : 'matriculados'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 pt-2 border-t border-gray-100">
                    <button
                      onClick={() => navigate(`/seminarios/${s.id}`)}
                      className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded hover:bg-blue-100"
                    >
                      <Eye size={12} /> Matriculados
                    </button>
                    <button
                      onClick={() => handleEdit(s)}
                      className="p-1.5 text-gray-500 hover:bg-gray-100 rounded"
                      title="Editar"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(s.id)}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                      title="Excluir"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {modalOpen && (
        <SeminarioModal
          seminario={editing}
          onClose={() => setModalOpen(false)}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
