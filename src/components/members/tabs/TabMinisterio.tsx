import React from 'react'
import { X } from 'lucide-react'
import type { Member, MemberMinistry } from '../../../types'
import { useConfig } from '../../../contexts/ConfigContext'

interface Props {
  ministry: Partial<MemberMinistry>
  onChange: (m: Partial<MemberMinistry>) => void
  form: Partial<Member>
  onChangeForm: (f: Partial<Member>) => void
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

export default function TabMinisterio({ ministry, onChange, form, onChangeForm }: Props) {
  const { config } = useConfig()
  const set = (key: keyof MemberMinistry, value: unknown) => onChange({ ...ministry, [key]: value })
  const today = new Date().toISOString().split('T')[0]

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
        <input className="form-input" value={ministry.discipler_id ?? ''} onChange={e => set('discipler_id', e.target.value)} placeholder="Buscar membro..." />
      </div>

      <div>
        <label className="form-label">Acompanhado por</label>
        <input className="form-input" value={ministry.companion ?? ''} onChange={e => set('companion', e.target.value)} placeholder="Nome do acompanhante" />
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

          {/* Comungante / Professo / Recebe visita — sem data */}
          <div className="bg-gray-50 border border-gray-200 rounded-md p-2.5 sm:col-span-1">
            <p className="text-xs text-gray-500 mb-1.5">Outros</p>
            <div className="flex flex-col gap-1.5">
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" className="rounded" disabled title="A implementar" />
                <span className="text-gray-400">Comungante</span>
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" className="rounded" disabled title="A implementar" />
                <span className="text-gray-400">Professo</span>
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" className="rounded" disabled title="A implementar" />
                <span className="text-gray-400">Recebe visita</span>
              </label>
            </div>
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
