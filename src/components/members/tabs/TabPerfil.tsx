import React, { useEffect, useState } from 'react'
import { differenceInYears } from 'date-fns'
import type { Member } from '../../../types'
import { mockMembers } from '../../../lib/mockData'

interface Props {
  form: Partial<Member>
  onChange: (f: Partial<Member>) => void
  editingId?: string
  errors?: Record<string, string>
}

const statuses = ['ativo', 'inativo', 'indisponivel']
const schoolings = [
  'Não alfabetizado', 'Fundamental incompleto', 'Fundamental completo',
  'Médio incompleto', 'Médio completo', 'Superior incompleto',
  'Superior completo', 'Pós-graduação', 'Mestrado', 'Doutorado',
]

const churchPrefixes: Record<string, string> = {
  'ch-1': 'SED',
  'ch-2': 'BV',
  'ch-3': 'TF',
  'ch-4': 'SJ',
  'ch-5': 'SN',
  'ch-6': 'AR',
  'ch-7': 'INT',
  'ch-8': 'HDL',
}

// validateCPF centralizado em src/schemas/member.ts
import { isValidCPF } from '../../../schemas/member'
const validateCPF = isValidCPF

function validateRG(rg: string): boolean {
  const c = rg.replace(/\D/g, '')
  return c.length >= 7 && c.length <= 9
}

function generateCode(churchId: string, existing: Member[]): string {
  const prefix = churchPrefixes[churchId] ?? 'MBR'
  const count = existing.filter(m => m.church_id === churchId).length + 1
  return `${prefix}-${String(count).padStart(4, '0')}`
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

export default function TabPerfil({ form, onChange, editingId, errors }: Props) {
  const [nameWarn, setNameWarn] = useState('')
  const [cpfWarn, setCpfWarn] = useState('')
  const [cpfError, setCpfError] = useState('')
  const [rgError, setRgError] = useState('')

  const set = (key: keyof Member) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    onChange({ ...form, [key]: e.target.value })

  const age = form.birth_date
    ? differenceInYears(new Date(), new Date(form.birth_date + 'T00:00:00'))
    : null

  useEffect(() => {
    if (!form.church_id || form.code) return
    const code = generateCode(form.church_id, mockMembers)
    onChange({ ...form, code })
  }, [form.church_id])

  const handleName = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value
    onChange({ ...form, name })
    const dup = mockMembers.find(m => m.id !== editingId && m.name.toLowerCase() === name.toLowerCase())
    setNameWarn(dup ? `Já existe um registro com este nome: ${dup.name}` : '')
  }

  const handleCPF = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    onChange({ ...form, cpf: raw })
    const digits = raw.replace(/\D/g, '')
    if (digits.length === 11) {
      if (!validateCPF(raw)) {
        setCpfError('CPF inválido')
        setCpfWarn('')
        return
      }
      setCpfError('')
      const dup = mockMembers.find(m => m.id !== editingId && m.cpf?.replace(/\D/g, '') === digits)
      setCpfWarn(dup ? `CPF já cadastrado: ${dup.name}` : '')
    } else {
      setCpfError('')
      setCpfWarn('')
    }
  }

  const handleRG = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    onChange({ ...form, identity: val })
    if (val.replace(/\D/g, '').length > 0 && !validateRG(val)) {
      setRgError('RG inválido (mínimo 7 dígitos)')
    } else {
      setRgError('')
    }
  }

  return (
    <div className="grid grid-cols-4 gap-4">
      {/* Left */}
      <div className="col-span-1 flex flex-col items-center gap-3 pt-2">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white text-3xl font-bold shadow">
          {form.name?.[0] ?? '?'}
        </div>
        <div className="w-full space-y-2">
          <Field label="Código auxiliar">
            <input className="form-input" value={form.code ?? ''} readOnly placeholder="Gerado automaticamente" />
          </Field>
          <div className="space-y-1">
            <label className="text-xs text-gray-600 font-medium">Opções</label>
            {['Receber SMS', 'Imprimir credencial'].map(opt => (
              <label key={opt} className="flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer">
                <input type="checkbox" className="rounded" />
                {opt}
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Right */}
      <div className="col-span-3 grid grid-cols-2 gap-3">
        <Field label="Status" required error={errors?.status}>
          <select
            className={`form-select ${errors?.status ? 'border-red-500 ring-2 ring-red-100' : ''}`}
            value={form.status ?? 'ativo'}
            onChange={set('status')}
            aria-invalid={!!errors?.status}
          >
            {statuses.map(s => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
        </Field>

        <Field label="Nome completo" required error={errors?.name}>
          <input
            className={`form-input ${errors?.name ? 'border-red-500 ring-2 ring-red-100' : nameWarn ? 'border-yellow-400' : ''}`}
            value={form.name ?? ''}
            onChange={handleName}
            placeholder="Nome completo"
            aria-invalid={!!errors?.name}
            aria-describedby={errors?.name ? 'member-name-error' : undefined}
          />
          {!errors?.name && nameWarn && <p className="text-xs text-yellow-600 mt-0.5">{nameWarn}</p>}
        </Field>

        <Field label="Apelido">
          <input
            className="form-input"
            value={form.apelido ?? ''}
            onChange={set('apelido')}
            placeholder="Ex: Juninho"
          />
        </Field>

        <Field label="Sexo" required error={errors?.sex}>
          <select
            className={`form-select ${errors?.sex ? 'border-red-500 ring-2 ring-red-100' : ''}`}
            value={form.sex ?? ''}
            onChange={set('sex')}
            aria-invalid={!!errors?.sex}
          >
            <option value="">Selecione</option>
            <option value="masculino">Masculino</option>
            <option value="feminino">Feminino</option>
          </select>
        </Field>

        <Field label="Data de nascimento" required error={errors?.birth_date}>
          <div className="flex items-center gap-2">
            <input
              type="date"
              className={`form-input flex-1 ${errors?.birth_date ? 'border-red-500 ring-2 ring-red-100' : ''}`}
              value={form.birth_date ?? ''}
              onChange={set('birth_date')}
              aria-invalid={!!errors?.birth_date}
            />
            {age !== null && <span className="text-xs text-gray-500 whitespace-nowrap">{age} anos</span>}
          </div>
        </Field>

        <Field label="Estado civil" required error={errors?.civil_status}>
          <select
            className={`form-select ${errors?.civil_status ? 'border-red-500 ring-2 ring-red-100' : ''}`}
            value={form.civil_status ?? ''}
            onChange={set('civil_status')}
            aria-invalid={!!errors?.civil_status}
          >
            <option value="">Selecione</option>
            <option value="solteiro">Solteiro(a)</option>
            <option value="casado">Casado(a)</option>
            <option value="uniao_estavel">União estável</option>
            <option value="divorciado">Divorciado(a)</option>
            <option value="viuvo">Viúvo(a)</option>
          </select>
        </Field>

        <Field label="Nacionalidade">
          <input className="form-input" value={form.nationality ?? 'Brasil'} onChange={set('nationality')} />
        </Field>

        <Field label="Naturalidade">
          <input className="form-input" value={form.naturalidade ?? ''} onChange={set('naturalidade')} placeholder="Cidade natal" />
        </Field>

        <Field label="Identidade (RG)">
          <input
            className={`form-input ${rgError ? 'border-red-400' : ''}`}
            value={form.identity ?? ''}
            onChange={handleRG}
            placeholder="00.000.000-0"
          />
          {rgError && <p className="text-xs text-red-500 mt-0.5">{rgError}</p>}
        </Field>

        <Field label="CPF">
          <input
            className={`form-input ${cpfError ? 'border-red-400' : cpfWarn ? 'border-yellow-400' : ''}`}
            value={form.cpf ?? ''}
            onChange={handleCPF}
            placeholder="000.000.000-00"
            maxLength={14}
          />
          {cpfError && <p className="text-xs text-red-500 mt-0.5">{cpfError}</p>}
          {!cpfError && cpfWarn && <p className="text-xs text-yellow-600 mt-0.5">{cpfWarn}</p>}
        </Field>

        <Field label="Escolaridade">
          <select className="form-select" value={form.schooling ?? ''} onChange={set('schooling')}>
            <option value="">Selecione</option>
            {schoolings.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>

        <Field label="Profissão">
          <input className="form-input" value={form.occupation ?? ''} onChange={set('occupation')} placeholder="Ex: Professor" />
        </Field>

        <div className="col-span-2">
          <Field label="Histórico">
            <textarea className="form-input resize-none" rows={3} placeholder="Observações sobre o membro..." />
          </Field>
        </div>
      </div>
    </div>
  )
}
