import { useState } from 'react'
import { X, Calendar as CalendarIcon, Plus, Trash2, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { EventoCalendario, EventoCor } from '../../types'
import { useToast } from '../ui/UIProvider'
import { useModalUX } from '../../hooks/useModalUX'

interface Linha {
  titulo: string
  data: string
  hora: string
  cor: EventoCor
  descricao: string
}

interface Props {
  onClose: () => void
  initialDate?: string
  editing?: EventoCalendario | null
  onSaveSingle: (e: Partial<EventoCalendario>) => Promise<void>
  onSaveMany: (
    list: Omit<EventoCalendario, 'id' | 'created_at' | 'updated_at' | 'church_group_id'>[],
  ) => Promise<void>
  onDelete?: (id: string) => Promise<void>
}

const CORES: { value: EventoCor; label: string; bg: string }[] = [
  { value: 'blue', label: 'Azul', bg: 'bg-blue-500' },
  { value: 'green', label: 'Verde', bg: 'bg-green-500' },
  { value: 'red', label: 'Vermelho', bg: 'bg-red-500' },
  { value: 'amber', label: 'Âmbar', bg: 'bg-amber-500' },
  { value: 'purple', label: 'Roxo', bg: 'bg-purple-500' },
  { value: 'orange', label: 'Laranja', bg: 'bg-orange-500' },
  { value: 'pink', label: 'Rosa', bg: 'bg-pink-500' },
  { value: 'gray', label: 'Cinza', bg: 'bg-gray-500' },
]

function novaLinha(date?: string): Linha {
  return {
    titulo: '',
    data: date ?? format(new Date(), 'yyyy-MM-dd'),
    hora: '',
    cor: 'blue',
    descricao: '',
  }
}

export default function EventoCalendarioModal({
  onClose,
  initialDate,
  editing,
  onSaveSingle,
  onSaveMany,
  onDelete,
}: Props) {
  const toast = useToast()
  const containerRef = useModalUX({ onClose })
  const isEditing = !!editing

  const [linhas, setLinhas] = useState<Linha[]>(
    editing
      ? [{
          titulo: editing.titulo,
          data: editing.data,
          hora: editing.hora ?? '',
          cor: editing.cor,
          descricao: editing.descricao ?? '',
        }]
      : [novaLinha(initialDate)],
  )
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const updateLinha = (i: number, patch: Partial<Linha>) => {
    setLinhas(prev => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)))
  }
  const addLinha = () => setLinhas(prev => [...prev, novaLinha(initialDate)])
  const removeLinha = (i: number) => {
    if (linhas.length === 1) return
    setLinhas(prev => prev.filter((_, idx) => idx !== i))
  }

  const validar = (): string | null => {
    for (const [i, l] of linhas.entries()) {
      if (!l.titulo.trim()) return `Linha ${i + 1}: título obrigatório`
      if (!l.data) return `Linha ${i + 1}: data obrigatória`
    }
    return null
  }

  const handleSave = async () => {
    if (saving) return
    const err = validar()
    if (err) {
      toast.warning(err)
      return
    }
    setSaving(true)
    try {
      if (isEditing && editing) {
        const l = linhas[0]
        await onSaveSingle({
          id: editing.id,
          titulo: l.titulo.trim(),
          data: l.data,
          hora: l.hora || undefined,
          cor: l.cor,
          descricao: l.descricao.trim() || undefined,
        })
        toast.success('Evento atualizado')
      } else {
        await onSaveMany(
          linhas.map(l => ({
            titulo: l.titulo.trim(),
            data: l.data,
            hora: l.hora || undefined,
            cor: l.cor,
            descricao: l.descricao.trim() || undefined,
          })),
        )
        toast.success(linhas.length === 1 ? 'Evento criado' : `${linhas.length} eventos criados`)
      }
      onClose()
    } catch (e) {
      console.error(e)
      toast.error('Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!editing || !onDelete || deleting) return
    if (!window.confirm(`Excluir evento "${editing.titulo}"?`)) return
    setDeleting(true)
    try {
      await onDelete(editing.id)
      toast.success('Evento excluído')
      onClose()
    } catch (e) {
      console.error(e)
      toast.error('Erro ao excluir')
    } finally {
      setDeleting(false)
    }
  }

  const busy = saving || deleting

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center sm:p-4 bg-black/50">
      <div ref={containerRef} className="bg-white sm:rounded-xl shadow-2xl w-full max-w-2xl h-full sm:h-auto sm:max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-gray-200 bg-gray-50 sm:rounded-t-xl">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
              <CalendarIcon size={18} className="text-blue-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-800">
                {isEditing ? 'Editar evento' : 'Novo evento no calendário'}
              </h2>
              <p className="text-xs text-gray-500">
                {isEditing
                  ? format(new Date(editing!.data + 'T00:00:00'), "EEEE, d 'de' MMMM", { locale: ptBR })
                  : 'Crie um único evento ou vários de uma vez'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-200 rounded-lg" disabled={busy}>
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3">
          {linhas.map((l, i) => (
            <div
              key={i}
              className="border border-gray-200 rounded-lg p-3 sm:p-4 bg-gray-50/40 relative"
            >
              {linhas.length > 1 && (
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-500">Evento {i + 1}</span>
                  <button
                    onClick={() => removeLinha(i)}
                    className="text-red-500 hover:bg-red-50 p-1 rounded"
                    disabled={busy}
                    title="Remover"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="form-label">Título *</label>
                  <input
                    value={l.titulo}
                    onChange={e => updateLinha(i, { titulo: e.target.value })}
                    className="form-input"
                    placeholder="Ex: Reunião de líderes"
                    disabled={busy}
                  />
                </div>

                <div>
                  <label className="form-label">Data *</label>
                  <input
                    type="date"
                    value={l.data}
                    onChange={e => updateLinha(i, { data: e.target.value })}
                    className="form-input"
                    disabled={busy}
                  />
                </div>

                <div>
                  <label className="form-label">Hora</label>
                  <input
                    type="time"
                    value={l.hora}
                    onChange={e => updateLinha(i, { hora: e.target.value })}
                    className="form-input"
                    disabled={busy}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="form-label">Cor</label>
                  <div className="flex gap-2 flex-wrap">
                    {CORES.map(c => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => updateLinha(i, { cor: c.value })}
                        className={`w-8 h-8 rounded-full ${c.bg} transition-all ${
                          l.cor === c.value ? 'ring-2 ring-offset-2 ring-gray-700' : 'opacity-60 hover:opacity-100'
                        }`}
                        title={c.label}
                        disabled={busy}
                      />
                    ))}
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="form-label">Descrição</label>
                  <textarea
                    value={l.descricao}
                    onChange={e => updateLinha(i, { descricao: e.target.value })}
                    className="form-input"
                    rows={2}
                    placeholder="Detalhes opcionais..."
                    disabled={busy}
                  />
                </div>
              </div>
            </div>
          ))}

          {!isEditing && (
            <button
              type="button"
              onClick={addLinha}
              className="w-full border-2 border-dashed border-gray-300 rounded-lg py-3 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50/40 transition-colors flex items-center justify-center gap-2"
              disabled={busy}
            >
              <Plus size={14} />
              Adicionar mais um evento
            </button>
          )}
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-2 px-4 sm:px-5 py-3 border-t border-gray-200 bg-gray-50 sm:rounded-b-xl">
          {isEditing && onDelete ? (
            <button
              onClick={handleDelete}
              disabled={busy}
              className="btn-danger w-full sm:w-auto justify-center flex items-center gap-1.5 disabled:opacity-40"
            >
              {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              Excluir
            </button>
          ) : <div />}

          <div className="flex flex-col-reverse sm:flex-row gap-2">
            <button onClick={onClose} className="btn-secondary w-full sm:w-auto justify-center" disabled={busy}>
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={busy}
              className="btn-primary w-full sm:w-auto justify-center flex items-center gap-1.5 disabled:opacity-40"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {isEditing ? 'Salvar' : `Salvar ${linhas.length > 1 ? `(${linhas.length})` : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
