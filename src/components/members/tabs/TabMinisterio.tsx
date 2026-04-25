import React from 'react'
import { X } from 'lucide-react'
import type { Member, MemberMinistry } from '../../../types'
import { useConfig } from '../../../contexts/ConfigContext'
import MemberSearch from '../MemberSearch'
import { useData } from '../../../contexts/DataContext'

interface Props {
  ministry: Partial<MemberMinistry>
  onChange: (m: Partial<MemberMinistry>) => void
  form: Partial<Member>
  onChangeForm: (f: Partial<Member>) => void
  editingId?: string
}

function TagPicker({ label, options, selected, onChange }: {
  label: string
  options: string[]
  selected: string[]
  onChange: (v: string[]) => void
}) {
  const add = (val: string) => {
    if (val && !selected.includes(val)) onChange([...selected, val])
  }
  const remove = (val: string) => onChange(selected.filter(s => s !== val))

  return (
    <div>
      <label className="form-label">{label}</label>
      <div className="flex flex-wrap gap-1 mb-1.5 min-h-8 p-2 border border-gray-300 rounded bg-white">
        {selected.map(s => (
          <span key={s} className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 text-xs px-1.5 py-0.5 rounded">
            {s}
            <button type="button" onClick={() => remove(s)}><X size={10} /></button>
          </span>
        ))}
      </div>
      <select value="" onChange={e => add(e.target.value)} className="form-select text-xs">
        <option value="">+ Adicionar {label.toLowerCase()}</option>
        {options.filter(o => !selected.includes(o)).map(o => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </div>
  )
}

export default function TabMinisterio({ ministry, onChange, form, onChangeForm, editingId }: Props) {
  const { config } = useConfig()
  const { members, visitantes } = useData()
  const pool = [...members, ...visitantes]
  const set = (key: keyof MemberMinistry, value: unknown) => onChange({ ...ministry, [key]: value })
  const today = new Date().toISOString().split('T')[0]

  // Quando edita um membro existente, vamos resolver o nome do discipler/companion
  // a partir do ID pra mostrar bonito no input
  const disciplerName = ministry.discipler_id
    ? (pool.find(m => m.id === ministry.discipler_id)?.name ?? '')
    : ''
  const companionName = ministry.companion_id
    ? (pool.find(m => m.id === ministry.companion_id)?.name ?? ministry.companion ?? '')
    : (ministry.companion ?? '')

  // Helper que liga/desliga checkbox + data correspondente
  const toggleSpiritual = (
    flagKey: 'baptism' | 'baptism_spirit' | 'conversion',
    dateKey: 'baptism_date' | 'baptism_spirit_date' | 'conversion_date',
    checked: boolean,
  ) => {
    onChangeForm({
      ...form,
      [flagKey]: checked,
      [dateKey]: checked ? form[dateKey] : undefined,
    })
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="col-span-2">
        <TagPicker
          label="Títulos"
          options={config.titulos}
          selected={ministry.titles ?? []}
          onChange={v => set('titles', v)}
        />
      </div>

      <TagPicker
        label="Ministérios"
        options={config.ministerios}
        selected={ministry.ministries ?? []}
        onChange={v => set('ministries', v)}
      />
      <TagPicker
        label="Departamentos"
        options={config.departamentos}
        selected={ministry.departments ?? []}
        onChange={v => set('departments', v)}
      />

      <TagPicker
        label="Funções"
        options={config.funcoes}
        selected={ministry.functions ?? []}
        onChange={v => set('functions', v)}
      />

      <div>
        <label className="form-label">Discipulado por</label>
        <MemberSearch
          value={disciplerName}
          linkedId={ministry.discipler_id}
          placeholder="Buscar membro..."
          excludeId={editingId}
          onSelect={(id) => onChange({ ...ministry, discipler_id: id })}
          onClearLink={() => onChange({ ...ministry, discipler_id: undefined })}
        />
      </div>

      <div>
        <label className="form-label">Acompanhado por</label>
        <MemberSearch
          value={companionName}
          linkedId={ministry.companion_id}
          placeholder="Buscar membro cadastrado..."
          excludeId={editingId}
          requireLink
          onSelect={(id, name) => onChange({
            ...ministry,
            companion_id: id,
            companion: id ? name : undefined,
          })}
          onClearLink={() => onChange({ ...ministry, companion_id: undefined, companion: undefined })}
        />
        <p className="text-[11px] text-gray-400 mt-0.5">Selecione um membro cadastrado.</p>
      </div>

      {/* Marcos espirituais com data condicional */}
      <div className="col-span-2 space-y-2 pt-2 border-t border-gray-100">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Marcos espirituais</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Convertido */}
          <div className="bg-gray-50 border border-gray-200 rounded-md p-2.5">
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={!!form.conversion}
                onChange={e => toggleSpiritual('conversion', 'conversion_date', e.target.checked)}
                className="rounded"
              />
              Convertido
            </label>
            {form.conversion && (
              <input
                type="date"
                className="form-input text-sm mt-2"
                value={form.conversion_date ?? ''}
                onChange={e => onChangeForm({ ...form, conversion_date: e.target.value })}
                max={today}
                aria-label="Data de conversão"
              />
            )}
          </div>

          {/* Batismo nas águas */}
          <div className="bg-gray-50 border border-gray-200 rounded-md p-2.5">
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={!!form.baptism}
                onChange={e => toggleSpiritual('baptism', 'baptism_date', e.target.checked)}
                className="rounded"
              />
              Batizado nas águas
            </label>
            {form.baptism && (
              <input
                type="date"
                className="form-input text-sm mt-2"
                value={form.baptism_date ?? ''}
                onChange={e => onChangeForm({ ...form, baptism_date: e.target.value })}
                max={today}
                aria-label="Data do batismo nas águas"
              />
            )}
          </div>

          {/* Batismo no Espírito */}
          <div className="bg-gray-50 border border-gray-200 rounded-md p-2.5">
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={!!form.baptism_spirit}
                onChange={e => toggleSpiritual('baptism_spirit', 'baptism_spirit_date', e.target.checked)}
                className="rounded"
              />
              Batizado no Espírito
            </label>
            {form.baptism_spirit && (
              <input
                type="date"
                className="form-input text-sm mt-2"
                value={form.baptism_spirit_date ?? ''}
                onChange={e => onChangeForm({ ...form, baptism_spirit_date: e.target.value })}
                max={today}
                aria-label="Data do batismo no Espírito"
              />
            )}
          </div>

        </div>
      </div>

      <div className="col-span-2">
        <label className="form-label">Histórico ministerial</label>
        <textarea className="form-input resize-none" rows={3} placeholder="Histórico de ministério..." />
      </div>
    </div>
  )
}
