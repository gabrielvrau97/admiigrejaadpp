import { useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, GraduationCap, UserPlus, Calendar, Clock, MapPin, Users,
  Eye, Pencil, Trash2, Search, Award, FileText
} from 'lucide-react'
import { useData } from '../../contexts/DataContext'
import type { Matricula, MatriculaSituacao, Certificado } from '../../types'
import MatriculaModal from './MatriculaModal'
import { fmtDate, fmtIdade } from '../../lib/format'

const SITUACAO_CONFIG: Record<MatriculaSituacao, { label: string; badge: string }> = {
  cursando: { label: 'Cursando', badge: 'badge-blue' },
  concluido: { label: 'Concluído', badge: 'badge-green' },
  desistente: { label: 'Desistente', badge: 'badge-red' },
  reprovado: { label: 'Reprovado', badge: 'badge-red' },
  trancado: { label: 'Trancado', badge: 'badge-yellow' },
}

export default function SeminarioDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const {
    seminarios, matriculas, setMatriculas,
    certificados, setCertificados,
  } = useData()

  const [search, setSearch] = useState('')
  const [situacaoFilter, setSituacaoFilter] = useState<MatriculaSituacao | ''>('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Matricula | null>(null)

  const seminario = useMemo(() => seminarios.find(s => s.id === id), [seminarios, id])

  const matriculasDoSeminario = useMemo(
    () => matriculas.filter(m => m.seminario_id === id),
    [matriculas, id]
  )

  const filtered = useMemo(() => {
    return matriculasDoSeminario.filter(m => {
      if (situacaoFilter && m.situacao !== situacaoFilter) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        return m.nome.toLowerCase().includes(q) || (m.cpf ?? '').includes(q)
      }
      return true
    })
  }, [matriculasDoSeminario, search, situacaoFilter])

  const counts = useMemo(() => ({
    total: matriculasDoSeminario.length,
    cursando: matriculasDoSeminario.filter(m => m.situacao === 'cursando').length,
    concluido: matriculasDoSeminario.filter(m => m.situacao === 'concluido').length,
    desistente: matriculasDoSeminario.filter(m => m.situacao === 'desistente').length,
  }), [matriculasDoSeminario])

  if (!seminario) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Seminário não encontrado.</p>
        <button onClick={() => navigate('/seminarios')} className="btn-outline mt-4">
          Voltar aos seminários
        </button>
      </div>
    )
  }

  const handleAdd = () => { setEditing(null); setModalOpen(true) }
  const handleEdit = (m: Matricula) => { setEditing(m); setModalOpen(true) }
  const handleDelete = (matId: string) => {
    if (!confirm('Excluir esta matrícula?')) return
    setMatriculas(list => list.filter(m => m.id !== matId))
  }

  const handleSave = (data: Partial<Matricula>) => {
    if (editing) {
      setMatriculas(list => list.map(m => m.id === editing.id
        ? { ...m, ...data, updated_at: new Date().toISOString() }
        : m
      ))
    } else {
      const novo: Matricula = {
        id: `mat-${Date.now()}`,
        seminario_id: seminario.id,
        nome: data.nome ?? '',
        apelido: data.apelido,
        cpf: data.cpf,
        birth_date: data.birth_date,
        sex: data.sex,
        email: data.email,
        telefone: data.telefone,
        cidade: data.cidade,
        estado: data.estado,
        church_id: data.church_id,
        member_id: data.member_id,
        situacao: data.situacao ?? 'cursando',
        nota_final: data.nota_final,
        frequencia: data.frequencia,
        data_matricula: data.data_matricula ?? new Date().toISOString().split('T')[0],
        data_conclusao: data.data_conclusao,
        observacoes: data.observacoes,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      setMatriculas(list => [novo, ...list])
    }
    setModalOpen(false)
  }

  const jaTemCertificado = (matId: string) => certificados.some(c => c.matricula_id === matId)

  const handleGerarCertificado = (m: Matricula) => {
    if (m.situacao !== 'concluido') {
      alert('Só é possível emitir certificado para alunos com situação "Concluído".')
      return
    }
    if (jaTemCertificado(m.id)) {
      if (!confirm('Este aluno já possui certificado. Deseja gerar uma reimpressão?')) return
    }
    const novo: Certificado = {
      id: `cert-${Date.now()}`,
      matricula_id: m.id,
      seminario_id: seminario.id,
      numero: `CERT-${new Date().getFullYear()}-${String(certificados.length + 1).padStart(4, '0')}`,
      nome_aluno: m.nome,
      nome_seminario: seminario.nome,
      carga_horaria: seminario.carga_horaria,
      data_conclusao: m.data_conclusao ?? new Date().toISOString().split('T')[0],
      emitido_em: new Date().toISOString().split('T')[0],
      emitido_por: 'Secretaria Admin',
      status: 'emitido',
      created_at: new Date().toISOString(),
    }
    setCertificados(list => [novo, ...list])
    navigate(`/certificados?highlight=${novo.id}`)
  }

  return (
    <div className="space-y-4">
      <button
        onClick={() => navigate('/seminarios')}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-blue-600"
      >
        <ArrowLeft size={14} /> Voltar aos seminários
      </button>

      {/* Header do seminário */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
            <GraduationCap size={22} className="text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-gray-800 leading-tight">{seminario.nome}</h1>
            {seminario.descricao && <p className="text-sm text-gray-600 mt-1">{seminario.descricao}</p>}
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
              {seminario.instrutor && (
                <span className="inline-flex items-center gap-1"><Users size={12} className="text-blue-500" /> {seminario.instrutor}</span>
              )}
              <span className="inline-flex items-center gap-1">
                <Calendar size={12} className="text-blue-500" /> {fmtDate(seminario.data_inicio)}
                {seminario.data_fim && ` → ${fmtDate(seminario.data_fim)}`}
              </span>
              <span className="inline-flex items-center gap-1"><Clock size={12} className="text-blue-500" /> {seminario.carga_horaria}h</span>
              {seminario.local && (
                <span className="inline-flex items-center gap-1"><MapPin size={12} className="text-blue-500" /> {seminario.local}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Matriculados', value: counts.total, color: 'bg-gray-500', filter: '' as const },
          { label: 'Cursando', value: counts.cursando, color: 'bg-blue-500', filter: 'cursando' as const },
          { label: 'Concluídos', value: counts.concluido, color: 'bg-emerald-500', filter: 'concluido' as const },
          { label: 'Desistentes', value: counts.desistente, color: 'bg-red-500', filter: 'desistente' as const },
        ].map(c => (
          <button
            key={c.label}
            onClick={() => setSituacaoFilter(prev => prev === c.filter ? '' : c.filter)}
            className={`${c.color} rounded-xl p-3 text-white shadow-sm text-left transition-transform hover:scale-105 ${situacaoFilter === c.filter && c.filter !== '' ? 'ring-2 ring-offset-2 ring-white' : ''}`}
          >
            <div className="text-2xl font-bold">{c.value}</div>
            <div className="text-xs opacity-90 mt-0.5">{c.label}</div>
          </button>
        ))}
      </div>

      {/* Toolbar de matriculados */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-3 border-b border-gray-100 flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar aluno por nome ou CPF..."
              className="form-input pl-8 w-full"
            />
          </div>
          <select
            value={situacaoFilter}
            onChange={e => setSituacaoFilter(e.target.value as MatriculaSituacao | '')}
            className="form-input"
          >
            <option value="">Todas situações</option>
            <option value="cursando">Cursando</option>
            <option value="concluido">Concluído</option>
            <option value="desistente">Desistente</option>
            <option value="reprovado">Reprovado</option>
            <option value="trancado">Trancado</option>
          </select>
          <button onClick={handleAdd} className="btn-primary">
            <UserPlus size={14} /> Matricular aluno
          </button>
        </div>

        {/* Tabela (desktop) */}
        <div className="overflow-x-auto hidden md:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 text-left">Aluno</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 text-left">Idade</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 text-left">Contato</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 text-left">Situação</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 text-left">Freq.</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 text-left">Nota</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-gray-400 text-sm">Nenhum matriculado encontrado</td></tr>
              ) : filtered.map(m => {
                const cfg = SITUACAO_CONFIG[m.situacao]
                const temCert = jaTemCertificado(m.id)
                return (
                  <tr key={m.id} className="hover:bg-blue-50/30">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                          {m.nome[0]}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-gray-800 truncate">{m.nome}</div>
                          {m.member_id && <div className="text-[10px] text-blue-600">Vinculado a membro</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-gray-600 text-xs">{fmtIdade(m.birth_date)}</td>
                    <td className="px-3 py-2 text-gray-600 text-xs">
                      <div>{m.telefone ?? '—'}</div>
                      <div className="text-gray-400">{m.email ?? ''}</div>
                    </td>
                    <td className="px-3 py-2"><span className={cfg.badge}>{cfg.label}</span></td>
                    <td className="px-3 py-2 text-gray-600 text-xs">{m.frequencia != null ? `${m.frequencia}%` : '—'}</td>
                    <td className="px-3 py-2 text-gray-600 text-xs">{m.nota_final != null ? m.nota_final.toFixed(1) : '—'}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-end gap-1">
                        {m.situacao === 'concluido' && (
                          <button
                            onClick={() => handleGerarCertificado(m)}
                            className={`p-1 rounded ${temCert ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'}`}
                            title={temCert ? 'Reemitir certificado' : 'Emitir certificado'}
                          >
                            <Award size={14} />
                          </button>
                        )}
                        <button onClick={() => handleEdit(m)} className="p-1 text-gray-500 hover:bg-gray-100 rounded" title="Editar">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => handleDelete(m.id)} className="p-1 text-red-500 hover:bg-red-50 rounded" title="Excluir">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Cards (mobile) */}
        <div className="md:hidden divide-y divide-gray-100">
          {filtered.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">Nenhum matriculado encontrado</div>
          ) : filtered.map(m => {
            const cfg = SITUACAO_CONFIG[m.situacao]
            const temCert = jaTemCertificado(m.id)
            return (
              <div key={m.id} className="p-3 flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                  {m.nome[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-semibold text-gray-800 text-sm truncate">{m.nome}</div>
                    <span className={cfg.badge}>{cfg.label}</span>
                  </div>
                  {m.member_id && <div className="text-[10px] text-blue-600">Vinculado a membro</div>}
                  <div className="text-xs text-gray-500 mt-1 space-y-0.5">
                    <div>{fmtIdade(m.birth_date)} · {m.telefone ?? '—'}</div>
                    <div>Freq: {m.frequencia != null ? `${m.frequencia}%` : '—'} · Nota: {m.nota_final != null ? m.nota_final.toFixed(1) : '—'}</div>
                  </div>
                  <div className="mt-2 flex items-center gap-1 flex-wrap">
                    {m.situacao === 'concluido' && (
                      <button
                        onClick={() => handleGerarCertificado(m)}
                        className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded ${temCert ? 'text-amber-700 bg-amber-50' : 'text-emerald-700 bg-emerald-50'}`}
                      >
                        <Award size={12} /> {temCert ? 'Reemitir' : 'Certificado'}
                      </button>
                    )}
                    <button onClick={() => handleEdit(m)} className="inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-700 bg-gray-100 rounded">
                      <Pencil size={12} /> Editar
                    </button>
                    <button onClick={() => handleDelete(m.id)} className="inline-flex items-center gap-1 px-2 py-1 text-xs text-red-600 bg-red-50 rounded ml-auto">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {modalOpen && (
        <MatriculaModal
          matricula={editing}
          onClose={() => setModalOpen(false)}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
