import React, { useState } from 'react'
import { Plus, Edit2, Trash2, Phone, Mail, MapPin, Church as ChurchIcon, X, Loader2 } from 'lucide-react'
import { useChurch } from '../../contexts/ChurchContext'
import { createChurch, updateChurch, deleteChurch } from '../../lib/api/churches'
import { APP_GROUP_ID } from '../../lib/supabase'
import type { Church } from '../../types'
import { useToast, useConfirm } from '../../components/ui/UIProvider'
import { useModalUX } from '../../hooks/useModalUX'

export default function IgrejasPage() {
  const { churches, loading, reload } = useChurch()
  const toast = useToast()
  const confirm = useConfirm()
  const [editing, setEditing] = useState<Church | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  const sede = churches.filter(c => c.type === 'sede')
  const filiais = churches.filter(c => c.type === 'filial')

  const handleAdd = () => { setEditing(null); setModalOpen(true) }
  const handleEdit = (c: Church) => { setEditing(c); setModalOpen(true) }
  const handleDelete = async (c: Church) => {
    const ok = await confirm({
      title: 'Excluir igreja',
      message: `Tem certeza que deseja excluir "${c.name}"? Membros vinculados a ela podem ficar sem igreja.`,
      danger: true,
    })
    if (!ok) return
    try {
      await deleteChurch(c.id)
      await reload()
      toast.success('Igreja excluída.')
    } catch (err) {
      console.error(err)
      toast.error('Erro ao excluir igreja.')
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
            <ChurchIcon size={18} className="text-blue-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-800">Igrejas</h1>
            <p className="text-xs text-gray-400">Controle · Igrejas</p>
          </div>
        </div>
        <button onClick={handleAdd} className="btn-primary">
          <Plus size={13} /> Adicionar Igreja
        </button>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: 'Total de igrejas', value: churches.length, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-100' },
          { label: 'Sede', value: sede.length, color: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-100' },
          { label: 'Filiais', value: filiais.length, color: 'text-purple-600', bg: 'bg-purple-50 border-purple-100' },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border px-4 py-3 flex items-center gap-3 ${s.bg}`}>
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs font-medium text-gray-600">{s.label}</div>
          </div>
        ))}
      </div>

      {loading && churches.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
          <Loader2 size={28} className="mx-auto animate-spin mb-2" />
          Carregando igrejas...
        </div>
      ) : churches.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
          <ChurchIcon size={36} className="mx-auto opacity-20 mb-2" />
          <p className="text-sm">Nenhuma igreja cadastrada.</p>
          <p className="text-xs mt-1">Clique em "Adicionar Igreja" pra cadastrar a primeira.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {churches.map(c => {
            const isSede = c.type === 'sede'
            return (
              <div
                key={c.id}
                className="bg-white rounded-xl border border-gray-200/80 overflow-hidden group transition-all duration-200 hover:-translate-y-0.5"
                style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)', transition: 'box-shadow 200ms, transform 200ms' }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 6px 18px rgba(0,0,0,0.1)')}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)')}
              >
                <div className={`h-1 w-full ${isSede ? 'bg-gradient-to-r from-blue-500 to-indigo-500' : 'bg-gradient-to-r from-indigo-400 to-purple-400'}`} />

                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0"
                        style={{ background: isSede ? 'linear-gradient(135deg,#2563eb,#1d4ed8)' : 'linear-gradient(135deg,#6366f1,#4f46e5)' }}
                      >
                        {c.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-800 text-sm leading-tight">{c.name}</div>
                        <span className={`inline-block mt-1 text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                          isSede ? 'bg-blue-100 text-blue-700' : 'bg-indigo-100 text-indigo-600'
                        }`}>
                          {isSede ? 'Sede' : 'Filial'}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                      <button onClick={() => handleEdit(c)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg" title="Editar">
                        <Edit2 size={12} />
                      </button>
                      <button onClick={() => handleDelete(c)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg" title="Excluir">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs text-gray-500">
                    {c.address && (
                      <div className="flex items-start gap-2">
                        <MapPin size={11} className="mt-0.5 shrink-0 text-gray-400" />
                        <span className="leading-relaxed">{c.address}</span>
                      </div>
                    )}
                    {c.phone && (
                      <div className="flex items-center gap-2">
                        <Phone size={11} className="shrink-0 text-gray-400" />
                        <span>{c.phone}</span>
                      </div>
                    )}
                    {c.email && (
                      <div className="flex items-center gap-2">
                        <Mail size={11} className="shrink-0 text-gray-400" />
                        <span className="truncate">{c.email}</span>
                      </div>
                    )}
                    {!c.address && !c.phone && !c.email && (
                      <span className="italic text-gray-300">Sem dados de contato cadastrados.</span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {modalOpen && (
        <ChurchModal
          igreja={editing}
          onClose={() => setModalOpen(false)}
          onSaved={() => { setModalOpen(false); reload() }}
        />
      )}
    </div>
  )
}

// ─── Modal de criação/edição ───────────────────────────────────────────────

interface ChurchModalProps {
  igreja: Church | null
  onClose: () => void
  onSaved: () => void
}

function ChurchModal({ igreja, onClose, onSaved }: ChurchModalProps) {
  const containerRef = useModalUX({ onClose })
  const toast = useToast()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<Partial<Church>>(
    igreja ?? { name: '', type: 'filial', address: '', phone: '', email: '' }
  )
  const [errors, setErrors] = useState<Record<string, string>>({})

  const set = <K extends keyof Church>(key: K) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(prev => ({ ...prev, [key]: e.target.value }))

  const handleSubmit = async () => {
    if (saving) return
    const errs: Record<string, string> = {}
    if (!form.name?.trim()) errs.name = 'Nome é obrigatório.'
    if (!form.type) errs.type = 'Selecione o tipo.'
    setErrors(errs)
    if (Object.keys(errs).length) return

    setSaving(true)
    try {
      if (igreja) {
        await updateChurch(igreja.id, form)
        toast.success('Igreja atualizada.')
      } else {
        await createChurch({
          group_id: APP_GROUP_ID,
          name: form.name!.trim(),
          type: form.type as 'sede' | 'filial',
          address: form.address?.trim() || undefined,
          phone: form.phone?.trim() || undefined,
          email: form.email?.trim() || undefined,
        })
        toast.success('Igreja criada.')
      }
      onSaved()
    } catch (err) {
      console.error(err)
      const msg = (err as { message?: string })?.message ?? 'Erro ao salvar.'
      toast.error(`Erro: ${msg}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center sm:p-4 bg-black/50" role="dialog" aria-modal="true">
      <div ref={containerRef} className="bg-white sm:rounded-xl shadow-2xl w-full max-w-md h-full sm:h-auto sm:max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200 bg-gray-50 sm:rounded-t-xl">
          <h2 className="font-semibold text-gray-800">
            {igreja ? `Editar igreja` : 'Adicionar igreja'}
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-200 rounded-lg" aria-label="Fechar">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          <div>
            <label className="form-label">Nome <span className="text-red-500">*</span></label>
            <input
              className={`form-input ${errors.name ? 'border-red-500 ring-2 ring-red-100' : ''}`}
              value={form.name ?? ''}
              onChange={set('name')}
              placeholder="Ex: ADP Bela Vista"
            />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className="form-label">Tipo <span className="text-red-500">*</span></label>
            <select className="form-select" value={form.type ?? 'filial'} onChange={set('type')}>
              <option value="sede">Sede</option>
              <option value="filial">Filial</option>
            </select>
          </div>

          <div>
            <label className="form-label">Endereço</label>
            <input
              className="form-input"
              value={form.address ?? ''}
              onChange={set('address')}
              placeholder="Rua, número, cidade"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Telefone</label>
              <input className="form-input" value={form.phone ?? ''} onChange={set('phone')} placeholder="(64) 0000-0000" />
            </div>
            <div>
              <label className="form-label">E-mail</label>
              <input type="email" className="form-input" value={form.email ?? ''} onChange={set('email')} placeholder="igreja@adp.com" />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-gray-200 bg-gray-50 sm:rounded-b-xl">
          <button onClick={onClose} className="btn-secondary" disabled={saving}>Cancelar</button>
          <button onClick={handleSubmit} className="btn-primary inline-flex items-center gap-1.5 disabled:opacity-60" disabled={saving}>
            {saving && <Loader2 size={13} className="animate-spin" />}
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}
