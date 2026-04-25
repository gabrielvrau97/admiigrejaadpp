import { useState, useMemo } from 'react'
import { X, UserPlus, Search, Check, Users } from 'lucide-react'
import type { Matricula, MatriculaSituacao, Member } from '../../types'
import { useData } from '../../contexts/DataContext'
import { useChurch } from '../../contexts/ChurchContext'
import { useToast } from '../../components/ui/UIProvider'
import { useModalUX } from '../../hooks/useModalUX'

interface Props {
  matricula: Matricula | null
  onClose: () => void
  onSave: (data: Partial<Matricula>) => void
}

export default function MatriculaModal({ matricula, onClose, onSave }: Props) {
  const { members } = useData()
  const { churches } = useChurch()
  const toast = useToast()
  const containerRef = useModalUX({ onClose })
  const [tab, setTab] = useState<'buscar' | 'dados'>(matricula ? 'dados' : 'buscar')
  const [memberSearch, setMemberSearch] = useState('')
  const [form, setForm] = useState<Partial<Matricula>>(matricula ?? {
    nome: '',
    situacao: 'cursando',
    data_matricula: new Date().toISOString().split('T')[0],
  })

  // Buscar membros que correspondem à query
  const membersFiltered = useMemo(() => {
    if (!memberSearch.trim()) return [] as Member[]
    const q = memberSearch.toLowerCase()
    return members
      .filter(m => m.status !== 'deleted')
      .filter(m =>
        m.name.toLowerCase().includes(q) ||
        (m.cpf ?? '').includes(q) ||
        (m.apelido ?? '').toLowerCase().includes(q)
      )
      .slice(0, 15)
  }, [members, memberSearch])

  const set = <K extends keyof Matricula>(k: K, v: Matricula[K] | undefined) =>
    setForm(prev => ({ ...prev, [k]: v }))

  const selecionarMembro = (m: Member) => {
    setForm({
      ...form,
      member_id: m.id,
      nome: m.name,
      apelido: m.apelido,
      cpf: m.cpf,
      birth_date: m.birth_date,
      sex: m.sex,
      email: m.contacts?.emails?.[0],
      telefone: m.contacts?.phones?.[0] ?? m.contacts?.cellphone1,
      cidade: m.contacts?.city,
      estado: m.contacts?.state,
      church_id: m.church_id,
    })
    setTab('dados')
  }

  const desvincular = () => {
    set('member_id', undefined)
  }

  const handleSubmit = () => {
    if (!form.nome?.trim()) {
      toast.error('Nome do aluno é obrigatório')
      return
    }
    onSave(form)
  }

  const selectedMember = form.member_id ? members.find(m => m.id === form.member_id) : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center sm:p-4 bg-black/50">
      <div ref={containerRef} className="bg-white sm:rounded-xl shadow-2xl w-full max-w-3xl h-full sm:h-auto sm:max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-gray-200 bg-gray-50 sm:rounded-t-xl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
              <UserPlus size={18} className="text-blue-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-800">
                {matricula ? 'Editar matrícula' : 'Nova matrícula'}
              </h2>
              <p className="text-xs text-gray-500">Dados do aluno e situação no curso</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-200 rounded-lg">
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        {!matricula && (
          <div className="flex border-b border-gray-200 px-4 pt-2 gap-0.5">
            <button
              onClick={() => setTab('buscar')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-md ${
                tab === 'buscar' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Search size={13} /> 1. Buscar membro (opcional)
            </button>
            <button
              onClick={() => setTab('dados')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-md ${
                tab === 'dados' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <UserPlus size={13} /> 2. Dados da matrícula
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5">
          {tab === 'buscar' && !matricula && (
            <div className="space-y-3">
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm text-blue-800">
                <p className="font-medium mb-1">💡 Reaproveitar dados de membro existente</p>
                <p className="text-xs text-blue-700">
                  Busque um membro já cadastrado pra preencher automaticamente os dados da matrícula.
                  Se o aluno não for membro, pule direto para "Dados da matrícula".
                </p>
              </div>

              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={memberSearch}
                  onChange={e => setMemberSearch(e.target.value)}
                  placeholder="Buscar por nome, CPF ou apelido..."
                  className="form-input pl-8"
                  autoFocus
                />
              </div>

              {memberSearch.trim() === '' ? (
                <div className="text-center py-8 text-gray-400 text-sm">
                  Digite para buscar membros cadastrados
                </div>
              ) : membersFiltered.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">
                  Nenhum membro encontrado.
                  <button
                    onClick={() => setTab('dados')}
                    className="block mx-auto mt-2 text-blue-600 hover:underline"
                  >
                    Cadastrar aluno avulso →
                  </button>
                </div>
              ) : (
                <div className="space-y-1.5 max-h-80 overflow-y-auto">
                  {membersFiltered.map(m => (
                    <button
                      key={m.id}
                      onClick={() => selecionarMembro(m)}
                      className="w-full flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors text-left"
                    >
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                        {m.name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-800 truncate">
                          {m.name}
                          {m.apelido && <span className="text-gray-400 font-normal"> ({m.apelido})</span>}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {m.cpf ?? 'Sem CPF'} · {m.church?.name ?? '—'}
                        </div>
                      </div>
                      <span className="text-xs text-blue-600 font-medium shrink-0">Selecionar →</span>
                    </button>
                  ))}
                </div>
              )}

              <div className="pt-3 border-t border-gray-100 flex justify-between items-center">
                <span className="text-xs text-gray-500">Ou</span>
                <button
                  onClick={() => setTab('dados')}
                  className="btn-outline text-sm"
                >
                  Cadastrar aluno avulso →
                </button>
              </div>
            </div>
          )}

          {tab === 'dados' && (
            <div className="space-y-4">
              {selectedMember && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <Check size={16} className="text-emerald-600 mt-0.5 shrink-0" />
                    <div className="text-xs text-emerald-800">
                      <p className="font-semibold">Dados vinculados a um membro</p>
                      <p>{selectedMember.name} · {selectedMember.cpf ?? 'sem CPF'}</p>
                    </div>
                  </div>
                  <button
                    onClick={desvincular}
                    className="text-xs text-emerald-700 hover:underline shrink-0"
                  >
                    Desvincular
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="form-label">Nome completo *</label>
                  <input
                    className="form-input"
                    value={form.nome ?? ''}
                    onChange={e => set('nome', e.target.value)}
                    placeholder="Nome completo do aluno"
                  />
                </div>
                <div>
                  <label className="form-label">Apelido</label>
                  <input
                    className="form-input"
                    value={form.apelido ?? ''}
                    onChange={e => set('apelido', e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label">CPF</label>
                  <input
                    className="form-input"
                    value={form.cpf ?? ''}
                    onChange={e => set('cpf', e.target.value)}
                    placeholder="000.000.000-00"
                  />
                </div>
                <div>
                  <label className="form-label">Data de nascimento</label>
                  <input
                    type="date"
                    className="form-input"
                    value={form.birth_date ?? ''}
                    onChange={e => set('birth_date', e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label">Sexo</label>
                  <select
                    className="form-select"
                    value={form.sex ?? ''}
                    onChange={e => set('sex', (e.target.value || undefined) as Matricula['sex'])}
                  >
                    <option value="">Selecione</option>
                    <option value="masculino">Masculino</option>
                    <option value="feminino">Feminino</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">E-mail</label>
                  <input
                    type="email"
                    className="form-input"
                    value={form.email ?? ''}
                    onChange={e => set('email', e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label">Telefone</label>
                  <input
                    className="form-input"
                    value={form.telefone ?? ''}
                    onChange={e => set('telefone', e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label">Cidade</label>
                  <input
                    className="form-input"
                    value={form.cidade ?? ''}
                    onChange={e => set('cidade', e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label">Estado</label>
                  <input
                    className="form-input"
                    value={form.estado ?? ''}
                    onChange={e => set('estado', e.target.value)}
                    placeholder="GO"
                    maxLength={2}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="form-label">Igreja</label>
                  <select
                    className="form-select"
                    value={form.church_id ?? ''}
                    onChange={e => set('church_id', e.target.value || undefined)}
                  >
                    <option value="">Nenhuma</option>
                    {churches.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Dados do curso */}
              <div className="pt-3 border-t border-gray-100">
                <h3 className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Users size={13} /> Situação no curso
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="form-label">Data da matrícula</label>
                    <input
                      type="date"
                      className="form-input"
                      value={form.data_matricula ?? ''}
                      onChange={e => set('data_matricula', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="form-label">Situação</label>
                    <select
                      className="form-select"
                      value={form.situacao ?? 'cursando'}
                      onChange={e => set('situacao', e.target.value as MatriculaSituacao)}
                    >
                      <option value="cursando">Cursando</option>
                      <option value="concluido">Concluído</option>
                      <option value="desistente">Desistente</option>
                      <option value="reprovado">Reprovado</option>
                      <option value="trancado">Trancado</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Frequência (%)</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      className="form-input"
                      value={form.frequencia ?? ''}
                      onChange={e => set('frequencia', e.target.value ? parseFloat(e.target.value) : undefined)}
                      placeholder="0-100"
                    />
                  </div>
                  <div>
                    <label className="form-label">Nota final</label>
                    <input
                      type="number"
                      min={0}
                      max={10}
                      step={0.1}
                      className="form-input"
                      value={form.nota_final ?? ''}
                      onChange={e => set('nota_final', e.target.value ? parseFloat(e.target.value) : undefined)}
                      placeholder="0-10"
                    />
                  </div>
                  {(form.situacao === 'concluido' || form.situacao === 'reprovado') && (
                    <div className="sm:col-span-2">
                      <label className="form-label">Data de conclusão</label>
                      <input
                        type="date"
                        className="form-input"
                        value={form.data_conclusao ?? ''}
                        onChange={e => set('data_conclusao', e.target.value)}
                      />
                    </div>
                  )}
                  <div className="sm:col-span-2">
                    <label className="form-label">Observações</label>
                    <textarea
                      className="form-input resize-none"
                      rows={2}
                      value={form.observacoes ?? ''}
                      onChange={e => set('observacoes', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 px-4 sm:px-5 py-3 border-t border-gray-200 bg-gray-50 sm:rounded-b-xl">
          <button onClick={onClose} className="btn-secondary">Cancelar</button>
          <div className="flex items-center gap-2">
            {tab === 'buscar' && !matricula && (
              <button onClick={() => setTab('dados')} className="btn-primary">
                Continuar →
              </button>
            )}
            {tab === 'dados' && (
              <button onClick={handleSubmit} className="btn-primary">
                {matricula ? 'Salvar alterações' : 'Matricular aluno'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
