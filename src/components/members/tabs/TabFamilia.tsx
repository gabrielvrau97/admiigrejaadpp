import React from 'react'
import type { MemberFamily, FamilyChild } from '../../../types'
import MemberSearch from '../MemberSearch'
import { Plus, X } from 'lucide-react'

interface Props {
  family: Partial<MemberFamily>
  onChange: (f: Partial<MemberFamily>) => void
  editingId?: string
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="form-label">{label}</label>
      {children}
    </div>
  )
}

export default function TabFamilia({ family, onChange, editingId }: Props) {
  const children: FamilyChild[] = family.children ?? []

  const addChild = () => onChange({ ...family, children: [...children, { name: '' }] })
  const removeChild = (i: number) => onChange({ ...family, children: children.filter((_, idx) => idx !== i) })
  const updateChild = (i: number, field: keyof FamilyChild, val: string) => {
    const next = [...children]
    next[i] = { ...next[i], [field]: val }
    onChange({ ...family, children: next })
  }

  return (
    <div className="space-y-5">
      {/* Cônjuge */}
      <div className="p-3 bg-gray-50 rounded-lg space-y-3">
        <p className="text-sm font-semibold text-gray-700">Cônjuge</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nome do cônjuge">
            <MemberSearch
              value={family.spouse_name ?? ''}
              linkedId={family.spouse_id}
              placeholder="Buscar membro ou digitar nome..."
              excludeId={editingId}
              onSelect={(id, name, birth) => onChange({
                ...family,
                spouse_id: id,
                spouse_name: name,
                spouse_birth_date: id && birth ? birth : family.spouse_birth_date,
              })}
              onClearLink={() => onChange({ ...family, spouse_id: undefined })}
            />
          </Field>
          <Field label="Data de nascimento do cônjuge">
            <input
              type="date"
              className="form-input"
              value={family.spouse_birth_date ?? ''}
              readOnly={!!family.spouse_id}
              onChange={e => onChange({ ...family, spouse_birth_date: e.target.value })}
            />
          </Field>
          <Field label="Data de casamento">
            <input
              type="date"
              className="form-input"
              value={family.wedding_date ?? ''}
              onChange={e => onChange({ ...family, wedding_date: e.target.value })}
            />
          </Field>
        </div>
      </div>

      {/* Filhos */}
      <div className="p-3 bg-gray-50 rounded-lg space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-700">Filhos</p>
          <button type="button" onClick={addChild} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium">
            <Plus size={12} /> Adicionar filho
          </button>
        </div>
        {children.length === 0 && (
          <p className="text-xs text-gray-400 italic">Nenhum filho cadastrado.</p>
        )}
        {children.map((child, i) => (
          <div key={i} className="grid grid-cols-2 gap-2 items-end border-b border-gray-200 pb-3">
            <Field label={`Filho ${i + 1} — Nome`}>
              <MemberSearch
                value={child.name}
                linkedId={child.id}
                placeholder="Buscar membro ou digitar nome..."
                excludeId={editingId}
                onSelect={(id, name, birth) => {
                  const next = [...children]
                  next[i] = { ...next[i], id, name, birth_date: id && birth ? birth : next[i].birth_date }
                  onChange({ ...family, children: next })
                }}
                onClearLink={() => {
                  const next = [...children]
                  next[i] = { ...next[i], id: undefined }
                  onChange({ ...family, children: next })
                }}
              />
            </Field>
            <div className="flex gap-1 items-end">
              <div className="flex-1">
                <Field label="Data de nascimento">
                  <input
                    type="date"
                    className="form-input"
                    value={child.birth_date ?? ''}
                    readOnly={!!child.id}
                    onChange={e => updateChild(i, 'birth_date', e.target.value)}
                  />
                </Field>
              </div>
              <button type="button" onClick={() => removeChild(i)} className="text-gray-400 hover:text-red-500 mb-1">
                <X size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Histórico */}
      <div>
        <label className="form-label">Histórico</label>
        <textarea className="form-input resize-none" rows={3} />
      </div>
    </div>
  )
}
