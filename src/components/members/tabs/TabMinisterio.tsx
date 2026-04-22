import React from 'react'
import { X } from 'lucide-react'
import type { MemberMinistry } from '../../../types'
import { useConfig } from '../../../contexts/ConfigContext'

interface Props {
  ministry: Partial<MemberMinistry>
  onChange: (m: Partial<MemberMinistry>) => void
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

export default function TabMinisterio({ ministry, onChange }: Props) {
  const { config } = useConfig()
  const set = (key: keyof MemberMinistry, value: unknown) => onChange({ ...ministry, [key]: value })

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

      <div className="col-span-2 grid grid-cols-3 gap-3 pt-2">
        {[
          { id: 'batismo', label: 'Batizado nas águas' },
          { id: 'batismo_espirito', label: 'Batizado no Espírito' },
          { id: 'comungante', label: 'Comungante' },
          { id: 'professo', label: 'Professo' },
          { id: 'visita', label: 'Recebe visita' },
        ].map(opt => (
          <label key={opt.id} className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" id={opt.id} className="rounded" />
            {opt.label}
          </label>
        ))}
      </div>

      <div className="col-span-2">
        <label className="form-label">Histórico ministerial</label>
        <textarea className="form-input resize-none" rows={3} placeholder="Histórico de ministério..." />
      </div>
    </div>
  )
}
