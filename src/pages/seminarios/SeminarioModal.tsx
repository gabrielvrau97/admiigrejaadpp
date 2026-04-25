import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { X, GraduationCap } from 'lucide-react'
import type { Seminario } from '../../types'
import { useChurch } from '../../contexts/ChurchContext'
import { useModalUX } from '../../hooks/useModalUX'
import { seminarioFormSchema, type SeminarioFormData } from '../../schemas/seminario'

interface Props {
  seminario: Seminario | null
  onClose: () => void
  onSave: (data: Partial<Seminario>) => void
}

export default function SeminarioModal({ seminario, onClose, onSave }: Props) {
  const containerRef = useModalUX<HTMLFormElement>({ onClose })
  const { churches } = useChurch()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SeminarioFormData>({
    resolver: zodResolver(seminarioFormSchema),
    defaultValues: seminario ? {
      nome: seminario.nome,
      descricao: seminario.descricao,
      instrutor: seminario.instrutor,
      data_inicio: seminario.data_inicio,
      data_fim: seminario.data_fim ?? '',
      carga_horaria: seminario.carga_horaria,
      local: seminario.local,
      church_id: seminario.church_id,
      status: seminario.status,
    } : {
      nome: '',
      status: 'planejado',
      carga_horaria: 0,
      data_inicio: new Date().toISOString().split('T')[0],
    },
  })

  const submit = (data: SeminarioFormData) => {
    // Normaliza strings vazias em undefined antes de salvar
    const clean: Partial<Seminario> = {
      ...data,
      data_fim: data.data_fim || undefined,
      descricao: data.descricao || undefined,
      instrutor: data.instrutor || undefined,
      local: data.local || undefined,
      church_id: data.church_id || undefined,
    }
    onSave(clean)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center sm:p-4 bg-black/50">
      <form
        ref={containerRef}
        onSubmit={handleSubmit(submit)}
        className="bg-white sm:rounded-xl shadow-2xl w-full max-w-2xl h-full sm:h-auto sm:max-h-[90vh] flex flex-col"
      >
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
          <button type="button" onClick={onClose} className="p-1.5 hover:bg-gray-200 rounded-lg" aria-label="Fechar">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4">
          <div>
            <label htmlFor="nome" className="form-label">Nome do seminário *</label>
            <input
              id="nome"
              {...register('nome')}
              className={`form-input ${errors.nome ? 'border-red-400' : ''}`}
              placeholder="Ex: Escola Bíblica Básica"
              aria-invalid={!!errors.nome}
              aria-describedby={errors.nome ? 'nome-err' : undefined}
            />
            {errors.nome && <p id="nome-err" className="text-xs text-red-600 mt-1">{errors.nome.message}</p>}
          </div>

          <div>
            <label htmlFor="descricao" className="form-label">Descrição</label>
            <textarea
              id="descricao"
              {...register('descricao')}
              className="form-input resize-none"
              rows={2}
              placeholder="Breve descrição do curso..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="instrutor" className="form-label">Instrutor</label>
              <input id="instrutor" {...register('instrutor')} className="form-input" placeholder="Nome do instrutor" />
            </div>
            <div>
              <label htmlFor="local" className="form-label">Local</label>
              <input id="local" {...register('local')} className="form-input" placeholder="Ex: Templo Sede" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="data_inicio" className="form-label">Data de início *</label>
              <input
                id="data_inicio"
                type="date"
                {...register('data_inicio')}
                className={`form-input ${errors.data_inicio ? 'border-red-400' : ''}`}
                aria-invalid={!!errors.data_inicio}
              />
              {errors.data_inicio && <p className="text-xs text-red-600 mt-1">{errors.data_inicio.message}</p>}
            </div>
            <div>
              <label htmlFor="data_fim" className="form-label">Data de término</label>
              <input
                id="data_fim"
                type="date"
                {...register('data_fim')}
                className={`form-input ${errors.data_fim ? 'border-red-400' : ''}`}
              />
              {errors.data_fim && <p className="text-xs text-red-600 mt-1">{errors.data_fim.message}</p>}
            </div>
            <div>
              <label htmlFor="carga_horaria" className="form-label">Carga horária</label>
              <input
                id="carga_horaria"
                type="number"
                min={0}
                {...register('carga_horaria', { valueAsNumber: true })}
                className={`form-input ${errors.carga_horaria ? 'border-red-400' : ''}`}
                placeholder="Horas"
              />
              {errors.carga_horaria && <p className="text-xs text-red-600 mt-1">{errors.carga_horaria.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="status" className="form-label">Status</label>
              <select id="status" {...register('status')} className="form-select">
                <option value="planejado">Planejado</option>
                <option value="em_andamento">Em andamento</option>
                <option value="concluido">Concluído</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </div>
            <div>
              <label htmlFor="church_id" className="form-label">Igreja vinculada</label>
              <select id="church_id" {...register('church_id')} className="form-select">
                <option value="">Nenhuma específica</option>
                {churches.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-4 sm:px-5 py-3 border-t border-gray-200 bg-gray-50 sm:rounded-b-xl">
          <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
          <button type="submit" disabled={isSubmitting} className="btn-primary">
            {seminario ? 'Salvar alterações' : 'Criar seminário'}
          </button>
        </div>
      </form>
    </div>
  )
}
