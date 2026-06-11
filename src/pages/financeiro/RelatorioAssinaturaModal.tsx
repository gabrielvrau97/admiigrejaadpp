import React, { useEffect, useRef, useState } from 'react'
import { X, FileText, PenLine, UserCheck, Search } from 'lucide-react'
import { listFinTesoureiros } from '../../lib/api/fin_tesoureiros'
import { listChurches } from '../../lib/api/churches'
import { listMembers } from '../../lib/api/members'
import { APP_GROUP_ID } from '../../lib/supabase'
import type { Member } from '../../types'

export interface Assinante {
  cargo: string
  nome: string
  cpf: string
}

interface Props {
  onConfirm: (assinantes: Assinante[] | null) => void
  onClose: () => void
}

function fmtCpf(raw: string) {
  const d = raw.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0,3)}.${d.slice(3)}`
  if (d.length <= 9) return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6)}`
  return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`
}

const CARGOS = [
  { key: 'pastor',      label: 'Pastor Presidente' },
  { key: 'tesoureiro1', label: 'Tesoureiro(a) 1' },
  { key: 'tesoureiro2', label: 'Tesoureiro(a) 2' },
  { key: 'conselho1',   label: 'Conselho Fiscal 1' },
  { key: 'conselho2',   label: 'Conselho Fiscal 2' },
  { key: 'conselho3',   label: 'Conselho Fiscal 3' },
]

interface Slot {
  key: string
  label: string
  checked: boolean
  nome: string
  cpf: string
}

// Autocomplete de membro com CPF automático
function MemberAutoComplete({
  value,
  members,
  onChange,
  placeholder,
}: {
  value: string
  members: Member[]
  onChange: (nome: string, cpf: string) => void
  placeholder?: string
}) {
  const [query, setQuery] = useState(value)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => { setQuery(value) }, [value])

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const suggestions = query.trim().length >= 2
    ? members.filter(m => m.name.toLowerCase().includes(query.toLowerCase())).slice(0, 6)
    : []

  function handleInput(v: string) {
    setQuery(v)
    setOpen(true)
    onChange(v, '')
  }

  function handleSelect(m: Member) {
    const cpf = m.cpf ? fmtCpf(m.cpf) : ''
    setQuery(m.name)
    setOpen(false)
    onChange(m.name, cpf)
  }

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Search size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={e => handleInput(e.target.value)}
          onFocus={() => { if (query.trim().length >= 2) setOpen(true) }}
          placeholder={placeholder ?? 'Buscar membro...'}
          className="w-full pl-5 pr-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-300 bg-white"
        />
      </div>
      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 left-0 right-0 mt-0.5 bg-white border border-gray-200 rounded-lg shadow-lg max-h-36 overflow-y-auto text-xs">
          {suggestions.map(m => (
            <li
              key={m.id}
              onMouseDown={() => handleSelect(m)}
              className="flex items-center justify-between px-3 py-1.5 hover:bg-blue-50 cursor-pointer"
            >
              <span className="font-medium text-gray-800 truncate">{m.name}</span>
              {m.cpf && (
                <span className="text-gray-400 ml-2 flex-shrink-0 font-mono">{fmtCpf(m.cpf)}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function RelatorioAssinaturaModal({ onConfirm, onClose }: Props) {
  const [semAssinatura, setSemAssinatura] = useState(false)
  const [slots, setSlots] = useState<Slot[]>(
    CARGOS.map(c => ({ ...c, checked: false, nome: '', cpf: '' }))
  )
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [churches, tesoureiros, allMembers] = await Promise.all([
          listChurches(),
          listFinTesoureiros(APP_GROUP_ID),
          listMembers(),
        ])

        setMembers(allMembers)

        const sede = churches.find(c => c.type === 'sede') ?? churches[0]
        const pastorNome = sede?.pastor?.name ?? ''
        const tesAtivos = tesoureiros.filter(t => t.ativo)

        setSlots(prev => prev.map(s => {
          if (s.key === 'pastor') return { ...s, nome: pastorNome, checked: !!pastorNome }
          if (s.key === 'tesoureiro1' && tesAtivos[0]) return { ...s, nome: tesAtivos[0].nome, checked: true }
          if (s.key === 'tesoureiro2' && tesAtivos[1]) return { ...s, nome: tesAtivos[1].nome, checked: false }
          return s
        }))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  function toggleSlot(key: string) {
    setSlots(prev => prev.map(s => s.key === key ? { ...s, checked: !s.checked } : s))
  }
  function setNome(key: string, nome: string) {
    setSlots(prev => prev.map(s => s.key === key ? { ...s, nome } : s))
  }
  function setCpf(key: string, raw: string) {
    setSlots(prev => prev.map(s => s.key === key ? { ...s, cpf: fmtCpf(raw) } : s))
  }

  function handleConfirm() {
    if (semAssinatura) { onConfirm(null); return }
    const selecionados = slots
      .filter(s => s.checked && s.nome.trim())
      .map(s => ({ cargo: s.label, nome: s.nome.trim(), cpf: s.cpf.trim() }))
    onConfirm(selecionados.length > 0 ? selecionados : null)
  }

  const checkedCount = slots.filter(s => s.checked).length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <FileText size={17} className="text-blue-700" />
            <span className="text-sm font-bold text-gray-800">Gerar Relatório</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            <X size={15} />
          </button>
        </div>

        {/* Opção sem/com assinatura */}
        <div className="px-5 pt-4 pb-2">
          <p className="text-xs text-gray-500 mb-3">Selecione o formato do relatório:</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setSemAssinatura(true)}
              className={`flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                semAssinatura
                  ? 'border-blue-600 bg-blue-50 text-blue-800'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              <FileText size={20} className={semAssinatura ? 'text-blue-600' : 'text-gray-400'} />
              Sem assinatura
            </button>
            <button
              onClick={() => setSemAssinatura(false)}
              className={`flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                !semAssinatura
                  ? 'border-blue-600 bg-blue-50 text-blue-800'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              <PenLine size={20} className={!semAssinatura ? 'text-blue-600' : 'text-gray-400'} />
              Com assinatura
            </button>
          </div>
        </div>

        {/* Slots de assinantes */}
        {!semAssinatura && (
          <div className="px-5 pb-2 pt-3">
            <div className="flex items-center gap-1.5 mb-3">
              <UserCheck size={13} className="text-gray-400" />
              <span className="text-xs font-semibold text-gray-600">Selecione quem vai assinar</span>
              {checkedCount > 0 && (
                <span className="ml-auto text-xs text-blue-600 font-bold">{checkedCount} selecionado{checkedCount > 1 ? 's' : ''}</span>
              )}
            </div>

            {loading ? (
              <div className="py-4 text-center text-xs text-gray-400">Carregando dados...</div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {slots.map(s => (
                  <div
                    key={s.key}
                    className={`rounded-xl border transition-all ${
                      s.checked ? 'border-blue-200 bg-blue-50' : 'border-gray-100 bg-gray-50'
                    }`}
                  >
                    {/* Checkbox + cargo */}
                    <label className="flex items-center gap-2.5 px-3 py-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={s.checked}
                        onChange={() => toggleSlot(s.key)}
                        className="w-3.5 h-3.5 rounded accent-blue-600 cursor-pointer"
                      />
                      <span className={`text-xs font-semibold ${s.checked ? 'text-blue-800' : 'text-gray-600'}`}>
                        {s.label}
                      </span>
                    </label>

                    {/* Campos nome + CPF (só quando selecionado) */}
                    {s.checked && (
                      <div className="px-3 pb-2.5 grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] text-gray-400 mb-0.5">Nome completo</label>
                          <MemberAutoComplete
                            value={s.nome}
                            members={members}
                            onChange={(nome, cpf) => {
                              setNome(s.key, nome)
                              if (cpf) setCpf(s.key, cpf)
                            }}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-gray-400 mb-0.5">CPF (opcional)</label>
                          <input
                            type="text"
                            value={s.cpf}
                            onChange={e => setCpf(s.key, e.target.value)}
                            placeholder="000.000.000-00"
                            className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-300 bg-white"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 flex items-center gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-xl transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            className="flex items-center gap-2 px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            <FileText size={14} />
            Gerar relatório
          </button>
        </div>
      </div>
    </div>
  )
}
