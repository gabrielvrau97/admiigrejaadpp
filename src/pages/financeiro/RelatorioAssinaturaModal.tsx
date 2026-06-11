import React, { useCallback, useEffect, useRef, useState } from 'react'
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
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

// Slots organizados em 2 linhas
const LINHA1 = [
  { key: 'pastor',      label: 'Pastor Presidente' },
  { key: 'tesoureiro1', label: 'Tesoureiro(a)' },
]
const LINHA2 = [
  { key: 'conselho1', label: 'Conselho Fiscal 1' },
  { key: 'conselho2', label: 'Conselho Fiscal 2' },
  { key: 'conselho3', label: 'Conselho Fiscal 3' },
]
const TODOS_CARGOS = [...LINHA1, ...LINHA2]

interface Slot {
  key: string
  label: string
  checked: boolean
  nome: string
  cpf: string
  memberId: string | null
}

// ── Autocomplete de membro ──────────────────────────────────────────────────

interface MemberAutoProps {
  value: string
  onChange: (nome: string, cpf: string, memberId: string | null) => void
  members: Member[]
  placeholder?: string
  disabled?: boolean
}

function MemberAutoComplete({ value, onChange, members, placeholder = 'Nome...', disabled }: MemberAutoProps) {
  const [query, setQuery] = useState(value)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // sincroniza se value mudar externamente
  useEffect(() => { setQuery(value) }, [value])

  // fecha ao clicar fora
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const sugestoes = query.trim().length >= 2
    ? members
        .filter(m => m.name.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 8)
    : []

  function handleInput(v: string) {
    setQuery(v)
    setOpen(true)
    // se o usuário apagou ou mudou, limpa vínculo
    onChange(v, '', null)
  }

  function handleSelect(m: Member) {
    const cpf = m.cpf ? fmtCpf(m.cpf) : ''
    setQuery(m.name)
    setOpen(false)
    onChange(m.name, cpf, m.id)
  }

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={e => handleInput(e.target.value)}
          onFocus={() => query.trim().length >= 2 && setOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full pl-6 pr-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-300 bg-white disabled:opacity-40"
        />
      </div>
      {open && sugestoes.length > 0 && (
        <ul className="absolute z-50 left-0 right-0 mt-0.5 bg-white border border-gray-200 rounded-lg shadow-lg max-h-44 overflow-y-auto text-xs">
          {sugestoes.map(m => (
            <li
              key={m.id}
              onMouseDown={() => handleSelect(m)}
              className="flex items-center justify-between px-3 py-2 hover:bg-blue-50 cursor-pointer gap-2"
            >
              <span className="font-medium text-gray-800 truncate">{m.name}</span>
              {m.cpf && <span className="text-gray-400 flex-shrink-0">{fmtCpf(m.cpf)}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ── Bloco de um assinante ───────────────────────────────────────────────────

interface SlotBlockProps {
  slot: Slot
  members: Member[]
  onToggle: () => void
  onNome: (nome: string, cpf: string, memberId: string | null) => void
  onCpf: (cpf: string) => void
}

function SlotBlock({ slot, members, onToggle, onNome, onCpf }: SlotBlockProps) {
  return (
    <div className={`rounded-xl border transition-all ${slot.checked ? 'border-blue-200 bg-blue-50' : 'border-gray-100 bg-gray-50'}`}>
      <label className="flex items-center gap-2.5 px-3 py-2 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={slot.checked}
          onChange={onToggle}
          className="w-3.5 h-3.5 rounded accent-blue-600 cursor-pointer flex-shrink-0"
        />
        <span className={`text-xs font-semibold truncate ${slot.checked ? 'text-blue-800' : 'text-gray-600'}`}>
          {slot.label}
        </span>
      </label>
      {slot.checked && (
        <div className="px-3 pb-2.5 grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] text-gray-400 mb-0.5">Nome</label>
            <MemberAutoComplete
              value={slot.nome}
              onChange={onNome}
              members={members}
              placeholder="Buscar membro..."
            />
          </div>
          <div>
            <label className="block text-[10px] text-gray-400 mb-0.5">CPF</label>
            <input
              type="text"
              value={slot.cpf}
              onChange={e => onCpf(fmtCpf(e.target.value))}
              placeholder="000.000.000-00"
              className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-300 bg-white"
            />
          </div>
        </div>
      )}
    </div>
  )
}

// ── Modal principal ─────────────────────────────────────────────────────────

export default function RelatorioAssinaturaModal({ onConfirm, onClose }: Props) {
  const [semAssinatura, setSemAssinatura] = useState(false)
  const [slots, setSlots] = useState<Slot[]>(
    TODOS_CARGOS.map(c => ({ ...c, checked: false, nome: '', cpf: '', memberId: null }))
  )
  const [loading, setLoading] = useState(true)
  const [members, setMembers] = useState<Member[]>([])

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
        // CPF do pastor — tenta buscar pelo nome nos membros
        const pastorMember = pastorNome
          ? allMembers.find(m => m.name.toLowerCase() === pastorNome.toLowerCase())
          : undefined
        const pastorCpf = pastorMember?.cpf ? fmtCpf(pastorMember.cpf) : ''

        const tesAtivos = tesoureiros.filter(t => t.ativo)
        // CPF do tesoureiro 1 — busca no cadastro de membros pelo nome
        const tes1Nome = tesAtivos[0]?.nome ?? ''
        const tes1Member = tes1Nome
          ? allMembers.find(m => m.name.toLowerCase() === tes1Nome.toLowerCase())
          : undefined
        const tes1Cpf = tes1Member?.cpf ? fmtCpf(tes1Member.cpf) : ''

        setSlots(prev => prev.map(s => {
          if (s.key === 'pastor' && pastorNome) {
            return { ...s, nome: pastorNome, cpf: pastorCpf, memberId: pastorMember?.id ?? null, checked: true }
          }
          if (s.key === 'tesoureiro1' && tes1Nome) {
            return { ...s, nome: tes1Nome, cpf: tes1Cpf, memberId: tes1Member?.id ?? null, checked: true }
          }
          return s
        }))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const updateSlot = useCallback((key: string, patch: Partial<Slot>) => {
    setSlots(prev => prev.map(s => s.key === key ? { ...s, ...patch } : s))
  }, [])

  function handleConfirm() {
    if (semAssinatura) { onConfirm(null); return }
    const selecionados = slots
      .filter(s => s.checked && s.nome.trim())
      .map(s => ({ cargo: s.label, nome: s.nome.trim(), cpf: s.cpf.trim() }))
    onConfirm(selecionados.length > 0 ? selecionados : null)
  }

  const checkedCount = slots.filter(s => s.checked).length

  function renderSlots(keys: typeof LINHA1) {
    return keys.map(({ key }) => {
      const slot = slots.find(s => s.key === key)!
      return (
        <SlotBlock
          key={key}
          slot={slot}
          members={members}
          onToggle={() => updateSlot(key, { checked: !slot.checked })}
          onNome={(nome, cpf, memberId) => updateSlot(key, { nome, cpf, memberId })}
          onCpf={cpf => updateSlot(key, { cpf })}
        />
      )
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">

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

        {/* Slots organizados em 2 linhas */}
        {!semAssinatura && (
          <div className="px-5 pb-2 pt-3">
            <div className="flex items-center gap-1.5 mb-3">
              <UserCheck size={13} className="text-gray-400" />
              <span className="text-xs font-semibold text-gray-600">Selecione quem vai assinar</span>
              {checkedCount > 0 && (
                <span className="ml-auto text-xs text-blue-600 font-bold">
                  {checkedCount} selecionado{checkedCount > 1 ? 's' : ''}
                </span>
              )}
            </div>

            {loading ? (
              <div className="py-4 text-center text-xs text-gray-400">Carregando dados...</div>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {/* Linha 1: Pastor + Tesoureiro */}
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Direção</p>
                  <div className="grid grid-cols-2 gap-2">
                    {renderSlots(LINHA1)}
                  </div>
                </div>

                {/* Linha 2: Conselho Fiscal */}
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Conselho Fiscal</p>
                  <div className="grid grid-cols-3 gap-2">
                    {renderSlots(LINHA2)}
                  </div>
                </div>
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
