import React, { useState } from 'react'
import type { MemberContact } from '../../../types'
import { MapPin, Loader2, Plus, X } from 'lucide-react'

interface Props {
  contacts: Partial<MemberContact>
  onChange: (c: Partial<MemberContact>) => void
  errors?: Record<string, string>
}

const brStates = ['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO']

function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="form-label">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}

export default function TabContatos({ contacts, onChange, errors }: Props) {
  const [cepLoading, setCepLoading] = useState(false)

  const emails = contacts.emails ?? ['']
  const phones = contacts.phones ?? ['']

  const setEmails = (list: string[]) => onChange({ ...contacts, emails: list })
  const setPhones = (list: string[]) => onChange({ ...contacts, phones: list })

  const updateEmail = (i: number, val: string) => {
    const next = [...emails]
    next[i] = val
    setEmails(next)
  }
  const removeEmail = (i: number) => setEmails(emails.filter((_, idx) => idx !== i))

  const updatePhone = (i: number, val: string) => {
    const next = [...phones]
    next[i] = val
    setPhones(next)
  }
  const removePhone = (i: number) => setPhones(phones.filter((_, idx) => idx !== i))

  const set = (key: keyof MemberContact) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    onChange({ ...contacts, [key]: e.target.value })

  const handleCep = async (cep: string) => {
    onChange({ ...contacts, cep })
    const clean = cep.replace(/\D/g, '')
    if (clean.length !== 8) return
    setCepLoading(true)
    try {
      const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`)
      const data = await res.json()
      if (!data.erro) {
        onChange({
          ...contacts,
          cep,
          address: data.logradouro,
          neighborhood: data.bairro,
          city: data.localidade,
          state: data.uf,
          country: 'Brasil',
        })
      }
    } catch {
      // silently fail
    } finally {
      setCepLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* E-mails */}
      <div>
        <label className="form-label">E-mail(s)</label>
        <div className="space-y-2">
          {emails.map((email, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input
                type="email"
                className="form-input flex-1"
                value={email}
                onChange={e => updateEmail(i, e.target.value)}
                placeholder="email@exemplo.com"
              />
              {emails.length > 1 && (
                <button type="button" onClick={() => removeEmail(i)} className="text-gray-400 hover:text-red-500 transition-colors">
                  <X size={14} />
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={() => setEmails([...emails, ''])}
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            <Plus size={12} /> Adicionar e-mail
          </button>
        </div>
      </div>

      {/* Telefones */}
      <div>
        <label className="form-label">Telefone(s) / Celular(es)</label>
        <div className="space-y-2">
          {phones.map((phone, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input
                className="form-input flex-1"
                value={phone}
                onChange={e => updatePhone(i, e.target.value)}
                placeholder="(64) 99999-0000"
              />
              {phones.length > 1 && (
                <button type="button" onClick={() => removePhone(i)} className="text-gray-400 hover:text-red-500 transition-colors">
                  <X size={14} />
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={() => setPhones([...phones, ''])}
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            <Plus size={12} /> Adicionar telefone
          </button>
        </div>
      </div>

      {/* Endereço */}
      <div className="grid grid-cols-2 gap-3">
        <Field label="CEP">
          <div className="flex gap-1">
            <input
              className="form-input flex-1"
              value={contacts.cep ?? ''}
              onChange={e => handleCep(e.target.value)}
              placeholder="00000-000"
              maxLength={9}
            />
            {cepLoading && <Loader2 size={14} className="animate-spin self-center text-gray-400" />}
          </div>
        </Field>

        <Field label="País">
          <input className="form-input" value={contacts.country ?? 'Brasil'} onChange={set('country')} />
        </Field>

        <div className="col-span-2">
          <Field label="Endereço">
            <input className="form-input" value={contacts.address ?? ''} onChange={set('address')} placeholder="Rua, Av., Alameda..." />
          </Field>
        </div>

        <Field label="Número">
          <input className="form-input" value={contacts.number ?? ''} onChange={set('number')} placeholder="123" />
        </Field>
        <Field label="Complemento">
          <input className="form-input" value={contacts.complement ?? ''} onChange={set('complement')} placeholder="Apto, Bloco..." />
        </Field>

        <Field label="Bairro">
          <input className="form-input" value={contacts.neighborhood ?? ''} onChange={set('neighborhood')} placeholder="Bairro" />
        </Field>
        <Field label="Cidade" required error={errors?.city}>
          <input
            className={`form-input ${errors?.city ? 'border-red-500 ring-2 ring-red-100' : ''}`}
            value={contacts.city ?? ''}
            onChange={set('city')}
            placeholder="Cidade"
            aria-invalid={!!errors?.city}
          />
        </Field>

        <Field label="Estado">
          <select className="form-select" value={contacts.state ?? ''} onChange={set('state')}>
            <option value="">UF</option>
            {brStates.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>

        <div className="flex items-end">
          <a
            href={`https://maps.google.com?q=${encodeURIComponent([contacts.address, contacts.number, contacts.city, contacts.state].filter(Boolean).join(', '))}`}
            target="_blank"
            rel="noreferrer"
            className="btn-outline flex items-center gap-1.5 w-full justify-center"
          >
            <MapPin size={13} />
            Visualizar no Maps
          </a>
        </div>

        <div className="col-span-2">
          <label className="form-label">Histórico</label>
          <textarea className="form-input resize-none" rows={2} placeholder="Observações de contato..." />
        </div>
      </div>
    </div>
  )
}
