import React from 'react'
import type { Member } from '../../../types'
import { useChurch } from '../../../contexts/ChurchContext'
import { useConfig } from '../../../contexts/ConfigContext'

interface Props {
  form: Partial<Member>
  onChange: (f: Partial<Member>) => void
  errors?: Record<string, string>
}

function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="form-label">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}

export default function TabAdministrativo({ form, onChange, errors }: Props) {
  const { config } = useConfig()
  const { churches } = useChurch()
  const set = (key: keyof Member) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    onChange({ ...form, [key]: e.target.value })

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Field label="Igreja" required error={errors?.church_id}>
        <select
          className={`form-select ${errors?.church_id ? 'border-red-500 ring-2 ring-red-100' : ''}`}
          value={form.church_id ?? ''}
          onChange={set('church_id')}
          aria-invalid={!!errors?.church_id}
        >
          <option value="">Selecione a igreja...</option>
          {churches.map(c => (
            <option key={c.id} value={c.id}>
              {c.type === 'sede' ? '★ ' : ''}{c.name}{c.type === 'sede' ? ' (Sede)' : ''}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Local de origem / Igreja de origem">
        <input className="form-input" value={form.origin_church ?? ''} onChange={set('origin_church')} placeholder="Cidade ou nome da igreja de origem" />
      </Field>

      <Field label="Data de entrada" required error={errors?.entry_date}>
        <input
          type="date"
          className={`form-input ${errors?.entry_date ? 'border-red-500 ring-2 ring-red-100' : ''}`}
          value={form.entry_date ?? ''}
          onChange={set('entry_date')}
          aria-invalid={!!errors?.entry_date}
        />
      </Field>

      <Field label="Motivo de entrada">
        <select className="form-select" value={form.entry_reason ?? ''} onChange={set('entry_reason')}>
          <option value="">Selecione</option>
          {config.motivosEntrada.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </Field>

      {form.entry_reason === 'Outro' && (
        <div className="col-span-2">
          <Field label="Descreva o motivo de entrada">
            <input className="form-input" value={form.entry_reason_other ?? ''} onChange={set('entry_reason_other')} placeholder="Descreva o motivo..." />
          </Field>
        </div>
      )}

      <Field label="Data de saída">
        <input type="date" className="form-input" value={form.exit_date ?? ''} onChange={set('exit_date')} />
      </Field>

      <Field label="Motivo de saída">
        <select className="form-select" value={form.exit_reason ?? ''} onChange={set('exit_reason')}>
          <option value="">Selecione</option>
          {config.motivosSaida.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </Field>

      {form.exit_reason === 'Outro' && (
        <div className="col-span-2">
          <Field label="Descreva o motivo de saída">
            <input className="form-input" value={form.exit_reason_other ?? ''} onChange={set('exit_reason_other')} placeholder="Descreva o motivo..." />
          </Field>
        </div>
      )}

      <Field label="Igreja de destino">
        <input className="form-input" placeholder="Nome da igreja de destino" />
      </Field>

      <div className="col-span-2">
        <Field label="Histórico administrativo">
          <textarea className="form-input resize-none" rows={3} placeholder="Observações administrativas..." />
        </Field>
      </div>

      <div className="col-span-2">
        <label className="form-label">Anexar documento (PDF)</label>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center text-sm text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-colors cursor-pointer">
          Clique ou arraste um arquivo PDF aqui
        </div>
      </div>
    </div>
  )
}
