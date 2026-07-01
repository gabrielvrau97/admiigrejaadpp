import { useMemo, useRef, useState } from 'react'
import {
  FileText, Search, Check, UserCheck, X, MapPin, Building2, Printer, RotateCcw, Plus,
} from 'lucide-react'
import { useData } from '../../contexts/DataContext'
import { useToast } from '../../components/ui/UIProvider'
import { fmtDate, hojeISO } from '../../lib/format'
import type { Member } from '../../types'
import {
  printCarta, aplicarVariaveis, CARTA_TEMPLATES, CARTA_VARIAVEIS, type TipoCarta,
} from './printCarta'

const hoje = () => hojeISO()

const tplKey = (t: TipoCarta) => `carta-template-${t}`
function loadTemplate(t: TipoCarta): string {
  try { const s = localStorage.getItem(tplKey(t)); if (s != null) return s } catch { /* ignore */ }
  return CARTA_TEMPLATES[t].texto
}

export default function CartasPage() {
  const { members } = useData()
  const toast = useToast()

  const [tipo, setTipo] = useState<TipoCarta>('recomendacao')
  const [memberSearch, setMemberSearch] = useState('')
  const [selected, setSelected] = useState<Member | null>(null)

  // Campos do formulário
  const [data, setData] = useState(hoje())
  const [funcao, setFuncao] = useState('')
  const [cidadeDestino, setCidadeDestino] = useState('')
  const [ufDestino, setUfDestino] = useState('')
  const [igrejaDestino, setIgrejaDestino] = useState('')
  const [ministerioDestino, setMinisterioDestino] = useState('')

  // Templates editáveis (persistem no navegador)
  const [templates, setTemplates] = useState<Record<TipoCarta, string>>(() => ({
    recomendacao: loadTemplate('recomendacao'),
    mudanca: loadTemplate('mudanca'),
  }))
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const setTemplate = (t: TipoCarta, txt: string) => {
    setTemplates(prev => ({ ...prev, [t]: txt }))
    try { localStorage.setItem(tplKey(t), txt) } catch { /* ignore */ }
  }
  const restaurarPadrao = () => setTemplate(tipo, CARTA_TEMPLATES[tipo].texto)

  const inserirVar = (token: string) => {
    const ta = textareaRef.current
    const txt = templates[tipo]
    if (!ta) { setTemplate(tipo, txt + token); return }
    const start = ta.selectionStart, end = ta.selectionEnd
    const novo = txt.slice(0, start) + token + txt.slice(end)
    setTemplate(tipo, novo)
    requestAnimationFrame(() => {
      ta.focus()
      ta.selectionStart = ta.selectionEnd = start + token.length
    })
  }

  const membersFiltered = useMemo(() => {
    if (!memberSearch.trim()) return [] as Member[]
    const q = memberSearch.toLowerCase()
    return members
      .filter(m => m.status !== 'deleted')
      .filter(m =>
        m.name.toLowerCase().includes(q) ||
        (m.cpf ?? '').includes(q) ||
        (m.apelido ?? '').toLowerCase().includes(q)
      )
      .slice(0, 12)
  }, [members, memberSearch])

  const selecionar = (m: Member) => {
    setSelected(m)
    setMemberSearch('')
    // pré-preenche função com título/função ministerial
    setFuncao(m.ministry?.functions?.[0] ?? m.ministry?.titles?.[0] ?? '')
  }

  const limpar = () => {
    setSelected(null)
    setFuncao('')
  }

  const handleGerar = () => {
    if (!selected) {
      toast.error('Selecione o membro para gerar a carta.')
      return
    }
    if (tipo === 'recomendacao' && !cidadeDestino.trim()) {
      toast.error('Informe a cidade de destino.')
      return
    }
    if (tipo === 'mudanca' && !igrejaDestino.trim()) {
      toast.error('Informe a igreja de destino.')
      return
    }
    // Substitui as variáveis pelos dados da secretaria
    const filiacao = [selected.family?.mother_name, selected.family?.father_name]
      .filter(Boolean).join(' e ')
    const vars: Record<string, string> = {
      // Dados do membro (iguais aos da credencial)
      nome: selected.name,
      funcao: funcao.trim(),
      filiacao,
      nascimento: selected.birth_date ? fmtDate(selected.birth_date) : '',
      cpf: selected.cpf ?? '',
      igreja_membro: selected.church?.name ?? '',
      tratamento: selected.sex === 'feminino' ? 'recebida' : 'recebido',
      // Dados de destino
      cidade: cidadeDestino.trim(),
      uf: ufDestino.trim().toUpperCase(),
      igreja: igrejaDestino.trim(),
      ministerio: ministerioDestino.trim(),
    }
    const textoFinal = aplicarVariaveis(templates[tipo], vars)
    const corpoParagrafos = textoFinal.split(/\n\s*\n/).map(s => s.trim()).filter(Boolean)

    printCarta({
      titulo: CARTA_TEMPLATES[tipo].titulo,
      nomeMembro: selected.name,
      corpoParagrafos,
      data,
    })
  }

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
          <FileText size={18} className="text-blue-600" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-800">Cartas</h1>
          <p className="text-xs text-gray-400 mt-0.5">Documentação · Recomendação e mudança de membros</p>
        </div>
      </div>

      {/* Tipo de carta */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Tipo de carta</label>
        <div className="grid grid-cols-2 gap-3 mt-2">
          {([
            { key: 'recomendacao', label: 'Recomendação', desc: 'Apresenta o membro a outra igreja' },
            { key: 'mudanca', label: 'Mudança', desc: 'Transfere o membro para outra igreja' },
          ] as const).map(opt => (
            <button
              key={opt.key}
              onClick={() => setTipo(opt.key)}
              className={`text-left p-3 rounded-lg border transition-colors ${
                tipo === opt.key ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-200' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${tipo === opt.key ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                  {tipo === opt.key && <Check size={10} className="text-white" strokeWidth={3} />}
                </div>
                <span className="font-medium text-gray-800 text-sm">{opt.label}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1 ml-6">{opt.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Seleção de membro */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Membro</label>

        {selected ? (
          <div className="mt-2 flex items-center gap-3 p-3 bg-blue-50 border border-blue-100 rounded-lg">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
              {selected.name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-800 truncate">{selected.name}</div>
              <div className="text-xs text-gray-500 flex flex-wrap gap-x-3">
                {selected.ministry?.titles?.[0] && <span>{selected.ministry.titles[0]}</span>}
                {selected.church?.name && <span className="inline-flex items-center gap-1"><Building2 size={10} /> {selected.church.name}</span>}
                {selected.contacts?.city && <span className="inline-flex items-center gap-1"><MapPin size={10} /> {selected.contacts.city}</span>}
              </div>
            </div>
            <button onClick={limpar} className="p-1.5 text-gray-400 hover:bg-white rounded-lg" title="Trocar membro">
              <X size={15} />
            </button>
          </div>
        ) : (
          <div className="mt-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={memberSearch}
                onChange={e => setMemberSearch(e.target.value)}
                placeholder="Buscar membro por nome, CPF ou apelido..."
                className="form-input pl-8 w-full"
                autoFocus
              />
            </div>
            {memberSearch.trim() !== '' && (
              <div className="mt-2 space-y-1 max-h-72 overflow-y-auto">
                {membersFiltered.length === 0 ? (
                  <div className="text-center py-6 text-gray-400 text-sm">Nenhum membro encontrado.</div>
                ) : membersFiltered.map(m => (
                  <button
                    key={m.id}
                    onClick={() => selecionar(m)}
                    className="w-full flex items-center gap-3 p-2.5 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors text-left"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {m.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-800 truncate text-sm">{m.name}</div>
                      <div className="text-xs text-gray-400 truncate">
                        {[m.ministry?.titles?.[0], m.church?.name].filter(Boolean).join(' · ') || 'Membro'}
                      </div>
                    </div>
                    <UserCheck size={15} className="text-blue-500 shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dados específicos */}
      {selected && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Dados da {tipo === 'recomendacao' ? 'recomendação' : 'mudança'}
          </label>

          {tipo === 'recomendacao' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="text-xs text-gray-500">Função / título</label>
                <input value={funcao} onChange={e => setFuncao(e.target.value)} placeholder="Ex: Diaconisa" className="form-input w-full mt-1" />
              </div>
              <div>
                <label className="text-xs text-gray-500">Cidade de destino *</label>
                <input value={cidadeDestino} onChange={e => setCidadeDestino(e.target.value)} placeholder="Ex: Aparecida de Goiânia" className="form-input w-full mt-1" />
              </div>
              <div>
                <label className="text-xs text-gray-500">UF de destino</label>
                <input value={ufDestino} onChange={e => setUfDestino(e.target.value)} maxLength={2} placeholder="Ex: GO" className="form-input w-full mt-1 uppercase" />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500">Igreja de destino *</label>
                <input value={igrejaDestino} onChange={e => setIgrejaDestino(e.target.value)} placeholder="Ex: Assembleia de Deus Madureira" className="form-input w-full mt-1" />
              </div>
              <div>
                <label className="text-xs text-gray-500">Ministério de destino</label>
                <input value={ministerioDestino} onChange={e => setMinisterioDestino(e.target.value)} placeholder="Ex: Vila Nova" className="form-input w-full mt-1" />
              </div>
            </div>
          )}

          <div className="sm:w-1/2">
            <label className="text-xs text-gray-500">Data da carta</label>
            <input type="date" value={data} onChange={e => setData(e.target.value)} className="form-input w-full mt-1" />
          </div>

          {/* Editor do texto (template) */}
          <div className="border-t border-gray-100 pt-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Texto da carta</label>
              <button
                onClick={restaurarPadrao}
                className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600"
                title="Voltar ao texto padrão"
              >
                <RotateCcw size={12} /> Restaurar texto padrão
              </button>
            </div>

            {/* Variáveis disponíveis */}
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <span className="text-[11px] text-gray-400">Inserir dado:</span>
              {CARTA_VARIAVEIS[tipo].map(v => (
                <button
                  key={v.token}
                  onClick={() => inserirVar(v.token)}
                  className="inline-flex items-center gap-1 text-[11px] bg-blue-50 text-blue-700 border border-blue-100 rounded-full px-2 py-0.5 hover:bg-blue-100"
                  title={v.desc}
                >
                  <Plus size={10} /> {v.token}
                </button>
              ))}
            </div>

            <textarea
              ref={textareaRef}
              value={templates[tipo]}
              onChange={e => setTemplate(tipo, e.target.value)}
              rows={11}
              className="form-input w-full mt-2 font-mono text-xs leading-relaxed"
              spellCheck
            />
            <p className="text-[11px] text-gray-400 mt-1">
              Use os marcadores acima (ex: <code>{'{nome}'}</code>) — serão trocados pelos dados ao gerar.
              O cabeçalho, marca d'água, data, assinatura e rodapé são aplicados automaticamente. Suas alterações ficam salvas neste navegador.
            </p>
          </div>

          <div className="flex justify-end pt-2 border-t border-gray-100">
            <button onClick={handleGerar} className="btn-primary">
              <Printer size={15} /> Gerar carta
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
