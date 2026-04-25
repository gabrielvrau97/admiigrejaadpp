import React, { useState, useEffect } from 'react'
import { X, Link as LinkIcon } from 'lucide-react'
import type { Member } from '../../types'
import { useData } from '../../contexts/DataContext'

interface Props {
  value: string
  linkedId?: string
  placeholder?: string
  onSelect: (id: string | undefined, name: string, birthDate?: string) => void
  onClearLink: () => void
  excludeId?: string
  /**
   * Quando true, o input só aceita vinculação a um membro existente.
   * Texto solto não é persistido — onSelect só é chamado ao escolher da lista.
   */
  requireLink?: boolean
}

/**
 * Input com autocomplete que busca membros já cadastrados.
 * Quando o usuário escolhe alguém da lista, vincula via UUID (linkedId).
 * Ao limpar, libera pra digitar nome avulso.
 */
export default function MemberSearch({
  value,
  linkedId,
  placeholder = 'Buscar membro...',
  onSelect,
  onClearLink,
  excludeId,
  requireLink = false,
}: Props) {
  const { members, visitantes } = useData()
  const pool: Member[] = [...members, ...visitantes]
  const [query, setQuery] = useState(value)
  const [results, setResults] = useState<Member[]>([])
  const [showDropdown, setShowDropdown] = useState(false)

  // Re-sincroniza apenas quando o vínculo muda (ex: edição abre membro novo)
  useEffect(() => {
    setQuery(value)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkedId])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value
    setQuery(q)
    // Em modo requireLink, não persiste texto enquanto digita — só ao escolher
    if (!requireLink) {
      onSelect(undefined, q, undefined)
    }
    if (q.length >= 2) {
      const found = pool.filter(
        m => m.id !== excludeId && m.name.toLowerCase().includes(q.toLowerCase())
      ).slice(0, 5)
      setResults(found)
      setShowDropdown(found.length > 0)
    } else {
      setShowDropdown(false)
    }
  }

  const handleBlur = () => {
    // Em modo strict: se digitou mas não selecionou ninguém, limpa o texto
    if (requireLink && !linkedId && query.trim()) {
      // pequeno delay pra não conflitar com o click do dropdown
      setTimeout(() => {
        if (!linkedId) {
          setQuery('')
          setShowDropdown(false)
        }
      }, 200)
    }
  }

  const pick = (m: Member) => {
    setQuery(m.name)
    setResults([])
    setShowDropdown(false)
    onSelect(m.id, m.name, m.birth_date)
  }

  return (
    <div className="relative">
      <div className="flex gap-1">
        <input
          className={`form-input flex-1 ${linkedId ? 'border-blue-400 bg-blue-50' : ''}`}
          value={linkedId ? value : query}
          onChange={linkedId ? undefined : handleChange}
          onBlur={handleBlur}
          readOnly={!!linkedId}
          placeholder={placeholder}
        />
        {linkedId && (
          <button type="button" onClick={onClearLink} className="text-gray-400 hover:text-red-500 transition-colors px-1" title="Desvincular">
            <X size={14} />
          </button>
        )}
      </div>
      {linkedId && (
        <div className="flex items-center gap-1 mt-0.5">
          <LinkIcon size={10} className="text-blue-500" />
          <span className="text-xs text-blue-600 font-medium">Vinculado ao cadastro</span>
        </div>
      )}
      {showDropdown && (
        <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1">
          {results.map(m => (
            <button
              key={m.id}
              type="button"
              onClick={() => pick(m)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 flex items-center gap-2"
            >
              <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold">
                {m.name[0]}
              </div>
              <div>
                <div className="font-medium text-gray-800">{m.name}</div>
                {m.birth_date && <div className="text-xs text-gray-400">{m.birth_date}</div>}
              </div>
              <LinkIcon size={10} className="ml-auto text-blue-400" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
