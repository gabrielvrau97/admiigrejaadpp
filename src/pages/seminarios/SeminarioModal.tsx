import { useState } from 'react'
import { X, GraduationCap } from 'lucide-react'
import type { Seminario, SeminarioStatus } from '../../types'
import { mockChurches } from '../../lib/mockData'

interface Props {
  seminario: Seminario | null
  onClose: () => void
  onSave: (data: Partial<Seminario>) => void
}

export default function SeminarioModal({ seminario, onClose, onSave }: Props) {
  const [form, setForm] = useState<Partial<Seminario>>(seminario ?? {
    nome: '',
    status: 'planejado',
    carga_horaria: 0,
    data_inicio: new Date().toISOString().split('T')[0],
  })

  const set = <K extends keyof Seminario>(k: K, v: Seminario[K] | undefined) =>
    setForm(prev => ({ ...prev, [k]: v }))

  const handleSubmit = () => {
    if (!form.nome?.trim()) {
      alert('Nome do seminário é obrigatório')
      return
    }
    if (!form.data_inicio) {
      alert('Data de início é obrigatória')
      return
    }
    onSave(form)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center sm:p-4 bg-black/50">
      <div className="bg-white sm:rounded-xl shadow-2xl w-full max-w-2xl h-full sm:h-auto sm:max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-gray-200 bg-gray-50 sm:rounded-t-xl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
              <GraduationCap size={18} className="text-blue-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-800">
                {seminario ? 'Editar seminário' : 'Novo seminário'}
              </h2>
              <p className="text-xs text-gray-500">Dados do curso / seminário</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-200 rounded-lg">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4">
          <div>
            <label className="form-label">Nome do seminário *</label>
            <input
              className="form-input"
              value={form.nome ?? ''}
              onChange={e => set('nome', e.target.value)}
              placeholder="Ex: Escola Bíblica Básica"
            />
          </div>

          <div>
            <label className="form-label">Descrição</label>
            <textarea
              className="form-input resize-none"
              rows={2}
              value={form.descricao ?? ''}
              onChange={e => set('descricao', e.target.value)}
              placeholder="Breve descrição do curso..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="form-label">Instrutor</label>
              <input
                className="form-input"
                value={form.instrutor ?? ''}
                onChange={e => set('instrutor', e.target.value)}
                placeholder="Nome do instrutor"
              />
            </div>
            <div>
              <label className="form-label">Local</label>
              <input
                className="form-input"
                value={form.local ?? ''}
                onChange={e => set('local', e.target.value)}
                placeholder="Ex: Templo Sede"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="form-label">Data de início *</label>
              <input
                type="date"
                className="form-input"
                value={form.data_inicio ?? ''}
                onChange={e => set('data_inicio', e.target.value)}
              />
            </div>
            <div>
              <label className="form-label">Data de término</label>
              <input
                type="date"
                className="form-input"
                value={form.data_fim ?? ''}
                onChange={e => set('data_fim', e.target.value)}
              />
            </div>
            <div>
              <label className="form-label">Carga horária</label>
              <input
                type="number"
                min={0}
                className="form-input"
                value={form.carga_horaria ?? 0}
                onChange={e => set('carga_horaria', parseInt(e.target.value) || 0)}
                placeholder="Horas"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="form-label">Status</label>
              <select
                className="form-select"
                value={form.status ?? 'planejado'}
                onChange={e => set('status', e.target.value as SeminarioStatus)}
              >
                <option value="planejado">Planejado</option>
                <option value="em_andamento">Em andamento</option>
                <option value="concluido">Concluído</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </div>
            <div>
              <label className="form-label">Igreja vinculada</label>
              <select
                className="form-select"
                value={form.church_id ?? ''}
                onChange={e => set('church_id', e.target.value || undefined)}
              >
                <option value="">Nenhuma específica</option>
                {mockChurches.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-4 sm:px-5 py-3 border-t border-gray-200 bg-gray-50 sm:rounded-b-xl">
          <button onClick={onClose} className="btn-secondary">Cancelar</button>
          <button onClick={handleSubmit} className="btn-primary">
            {seminario ? 'Salvar alterações' : 'Criar seminário'}
          </button>
        </div>
      </div>
    </div>
  )
}
