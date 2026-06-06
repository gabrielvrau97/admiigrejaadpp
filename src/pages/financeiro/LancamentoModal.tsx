import React, { useEffect, useState } from 'react'
import { X, Loader2, TrendingUp, TrendingDown, Search } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useChurch } from '../../contexts/ChurchContext'
import { useData } from '../../contexts/DataContext'
import { APP_GROUP_ID } from '../../lib/supabase'
import { listFinCategoriasByTipo } from '../../lib/api/fin_categorias'
import { searchFinFornecedores } from '../../lib/api/fin_fornecedores'
import { createFinLancamento, updateFinLancamento } from '../../lib/api/fin_lancamentos'
import { createFinRecibo, getFinReciboByLancamento } from '../../lib/api/fin_recibos'
import type { FinReciboComLancamento } from '../../lib/api/fin_recibos'
import type { FinCategoria, FinFornecedor, FinFormaPagamento, FinLancamento, FinTipo } from '../../types'
import ReciboModal from './ReciboModal'

interface Props {
  tipo: FinTipo
  editing?: FinLancamento | null
  categoriaPreSelecionada?: string
  onClose: () => void
  onSaved: (l: FinLancamento) => void
}

export default function LancamentoModal({ tipo, editing, categoriaPreSelecionada, onClose, onSaved }: Props) {
  const { user } = useAuth()
  const { churches } = useChurch()
  const { members, visitantes } = useData()

  // form
  const [categoriaId, setCategoriaId] = useState(editing?.categoria_id ?? categoriaPreSelecionada ?? '')
  const [churchId, setChurchId] = useState(editing?.church_id ?? (churches[0]?.id ?? ''))
  const [valor, setValor] = useState(editing ? String(editing.valor) : '')
  const [descricao, setDescricao] = useState(editing?.descricao ?? '')
  const [referenciaCulto, setReferenciaCulto] = useState(editing?.referencia_culto ?? '')
  const [dataLancamento, setDataLancamento] = useState(
    editing?.data_lancamento ?? new Date().toISOString().slice(0, 10)
  )
  const [observacao, setObservacao] = useState(editing?.observacao ?? '')
  const [formaPagamento, setFormaPagamento] = useState<FinFormaPagamento | ''>(editing?.forma_pagamento ?? '')
  const [parcelas, setParcelas] = useState(editing?.parcelas ? String(editing.parcelas) : '1')

  // membro
  const [memberQuery, setMemberQuery] = useState(
    editing?.member?.name ?? editing?.member_nome_manual ?? ''
  )
  const [memberId, setMemberId] = useState(editing?.member_id ?? '')
  const [memberResults, setMemberResults] = useState<typeof members>([])
  const [showMemberDrop, setShowMemberDrop] = useState(false)

  // fornecedor (só saída)
  const [fornQuery, setFornQuery] = useState(editing?.fornecedor?.nome ?? '')
  const [fornecedorId, setFornecedorId] = useState(editing?.fornecedor_id ?? '')
  const [fornResults, setFornResults] = useState<FinFornecedor[]>([])
  const [showFornDrop, setShowFornDrop] = useState(false)

  // dados
  const [categorias, setCategorias] = useState<FinCategoria[]>([])
  const [saving, setSaving] = useState(false)
  const [recibo, setRecibo] = useState<FinReciboComLancamento | null>(null)
  const [savedLancamento, setSavedLancamento] = useState<FinLancamento | null>(null)

  useEffect(() => {
    listFinCategoriasByTipo(APP_GROUP_ID, tipo).then(setCategorias).catch(console.error)
  }, [tipo])

  // busca de membro
  useEffect(() => {
    if (!memberQuery || memberId) { setMemberResults([]); return }
    const pool = [...members, ...visitantes]
    const q = memberQuery.toLowerCase()
    setMemberResults(pool.filter(m => m.name.toLowerCase().includes(q)).slice(0, 8))
  }, [memberQuery, memberId, members, visitantes])

  // busca de fornecedor
  useEffect(() => {
    if (!fornQuery || fornecedorId) { setFornResults([]); return }
    const t = setTimeout(() => {
      searchFinFornecedores(APP_GROUP_ID, fornQuery)
        .then(setFornResults)
        .catch(console.error)
    }, 250)
    return () => clearTimeout(t)
  }, [fornQuery, fornecedorId])

  function handleSelectMember(m: { id: string; name: string }) {
    setMemberId(m.id)
    setMemberQuery(m.name)
    setMemberResults([])
    setShowMemberDrop(false)
  }

  function handleClearMember() {
    setMemberId('')
    setMemberQuery('')
  }

  function handleSelectForn(f: FinFornecedor) {
    setFornecedorId(f.id)
    setFornQuery(f.nome)
    setFornResults([])
    setShowFornDrop(false)
  }

  function handleClearForn() {
    setFornecedorId('')
    setFornQuery('')
  }

  const contribuintePreenchido = !!(memberId || memberQuery.trim())
  const podeSalvar = !!(valor && churchId && categoriaId && formaPagamento && contribuintePreenchido)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!valor || !churchId || !user || !categoriaId || !formaPagamento || !contribuintePreenchido) return
    const valorNum = parseFloat(valor.replace(',', '.'))
    if (isNaN(valorNum) || valorNum <= 0) return

    setSaving(true)
    try {
      const payload = {
        church_group_id: APP_GROUP_ID,
        church_id: churchId,
        tipo,
        categoria_id: categoriaId || undefined,
        fornecedor_id: tipo === 'saida' ? (fornecedorId || undefined) : undefined,
        member_id: memberId || undefined,
        member_nome_manual: !memberId && memberQuery.trim() ? memberQuery.trim() : undefined,
        valor: valorNum,
        descricao: descricao.trim() || undefined,
        referencia_culto: tipo === 'entrada' ? (referenciaCulto.trim() || undefined) : undefined,
        data_lancamento: dataLancamento,
        forma_pagamento: formaPagamento || undefined,
        parcelas: formaPagamento === 'cartao_credito' ? (parseInt(parcelas) || 1) : undefined,
        origem: 'manual' as const,
        created_by: user.id,
        observacao: observacao.trim() || undefined,
      }

      const saved = editing
        ? await updateFinLancamento(editing.id, payload)
        : await createFinLancamento(payload)

      // gera recibo apenas em novos lançamentos
      if (!editing) {
        try {
          await createFinRecibo(saved.id, user.id)
          const r = await getFinReciboByLancamento(saved.id)
          if (r) {
            setSavedLancamento(saved)
            setRecibo(r)
            return // mantém modal aberto mostrando ReciboModal
          }
        } catch (e) {
          console.error('Recibo não gerado:', e)
        }
      }

      onSaved(saved)
    } finally {
      setSaving(false)
    }
  }

  const isEntrada = tipo === 'entrada'
  const accentColor = isEntrada ? 'emerald' : 'red'

  // Quando recibo estiver pronto, mostra ReciboModal no lugar
  if (recibo && savedLancamento) {
    return (
      <ReciboModal
        recibo={recibo}
        onClose={() => {
          setRecibo(null)
          onSaved(savedLancamento)
        }}
      />
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-md max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className={`flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white z-10`}>
          <div className="flex items-center gap-2">
            {isEntrada
              ? <TrendingUp size={18} className="text-emerald-600" />
              : <TrendingDown size={18} className="text-red-500" />
            }
            <h2 className="text-base font-bold text-gray-800">
              {editing ? 'Editar' : 'Novo'} lançamento de {isEntrada ? 'entrada' : 'saída'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Categoria + Filial */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Categoria <span className="text-red-400">*</span></label>
              <select
                className="form-input w-full"
                value={categoriaId}
                onChange={e => setCategoriaId(e.target.value)}
              >
                <option value="">Sem categoria</option>
                {categorias.map(c => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Filial *</label>
              <select
                className="form-input w-full"
                value={churchId}
                onChange={e => setChurchId(e.target.value)}
                required
              >
                {churches.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Valor + Data */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Valor (R$) *</label>
              <input
                className="form-input w-full"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0,00"
                value={valor}
                onChange={e => setValor(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Data *</label>
              <input
                className="form-input w-full"
                type="date"
                value={dataLancamento}
                onChange={e => setDataLancamento(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Membro (entrada: contribuinte | saída: beneficiado) */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              {isEntrada ? 'Contribuinte' : 'Membro beneficiado'} <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                className="form-input w-full pl-8 pr-8"
                placeholder="Buscar membro ou digitar nome..."
                value={memberQuery}
                onChange={e => { setMemberQuery(e.target.value); setMemberId(''); setShowMemberDrop(true) }}
                onFocus={() => setShowMemberDrop(true)}
                onBlur={() => setTimeout(() => setShowMemberDrop(false), 150)}
                autoComplete="off"
              />
              {memberQuery && (
                <button type="button" onClick={handleClearMember} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X size={13} />
                </button>
              )}
              {memberId && (
                <span className="absolute right-8 top-1/2 -translate-y-1/2 text-xs text-emerald-600 font-medium">✓ vinculado</span>
              )}
              {showMemberDrop && memberResults.length > 0 && (
                <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                  {memberResults.map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onMouseDown={() => handleSelectMember(m)}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm"
                    >
                      <span className="font-medium text-gray-800">{m.name}</span>
                      {m.apelido && <span className="text-gray-400 ml-1">({m.apelido})</span>}
                      <span className="text-xs text-gray-400 ml-2">{m.member_type === 'visitante' ? 'Visitante' : 'Membro'}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Fornecedor (só saída) */}
          {!isEntrada && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Fornecedor / Destino
                <span className="text-gray-400 font-normal ml-1">(opcional)</span>
              </label>
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  className="form-input w-full pl-8 pr-8"
                  placeholder="Buscar fornecedor ou digitar..."
                  value={fornQuery}
                  onChange={e => { setFornQuery(e.target.value); setFornecedorId(''); setShowFornDrop(true) }}
                  onFocus={() => setShowFornDrop(true)}
                  onBlur={() => setTimeout(() => setShowFornDrop(false), 150)}
                  autoComplete="off"
                />
                {fornQuery && (
                  <button type="button" onClick={handleClearForn} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <X size={13} />
                  </button>
                )}
                {fornecedorId && (
                  <span className="absolute right-8 top-1/2 -translate-y-1/2 text-xs text-emerald-600 font-medium">✓ vinculado</span>
                )}
                {showFornDrop && fornResults.length > 0 && (
                  <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-40 overflow-y-auto">
                    {fornResults.map(f => (
                      <button
                        key={f.id}
                        type="button"
                        onMouseDown={() => handleSelectForn(f)}
                        className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm"
                      >
                        <span className="font-medium text-gray-800">{f.nome}</span>
                        {f.documento && <span className="text-gray-400 ml-2 text-xs">{f.documento}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Referência culto (só entrada) */}
          {isEntrada && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Referência / Culto</label>
              <input
                className="form-input w-full"
                placeholder="Ex: Culto Domingo 01/06"
                value={referenciaCulto}
                onChange={e => setReferenciaCulto(e.target.value)}
              />
            </div>
          )}

          {/* Forma de pagamento */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Forma de pagamento <span className="text-red-400">*</span></label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {([
                { value: 'dinheiro', label: 'Dinheiro', icon: '💵' },
                { value: 'pix', label: 'Pix', icon: '⚡' },
                { value: 'cartao_debito', label: 'Débito', icon: '💳' },
                { value: 'cartao_credito', label: 'Crédito', icon: '💳' },
              ] as { value: FinFormaPagamento; label: string; icon: string }[]).map(op => (
                <button
                  key={op.value}
                  type="button"
                  onClick={() => setFormaPagamento(f => f === op.value ? '' : op.value)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium transition-all ${
                    formaPagamento === op.value
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <span>{op.icon}</span> {op.label}
                </button>
              ))}
            </div>
            {formaPagamento === 'cartao_credito' && (
              <div className="mt-2 flex items-center gap-2">
                <label className="text-xs text-gray-500 whitespace-nowrap">Parcelas</label>
                <select
                  className="form-input text-sm py-1.5 px-2"
                  value={parcelas}
                  onChange={e => setParcelas(e.target.value)}
                >
                  {[1,2,3,4,5,6,7,8,9,10,11,12].map(n => (
                    <option key={n} value={n}>{n}x{n === 1 ? ' (à vista)' : ''}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              {isEntrada ? 'Observação' : 'Descrição'}
            </label>
            <input
              className="form-input w-full"
              placeholder={isEntrada ? 'Alguma observação...' : 'Ex: Compra de material de limpeza'}
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
            />
          </div>

          {/* Observação extra */}
          {!isEntrada && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Observação</label>
              <textarea
                className="form-input w-full resize-none"
                rows={2}
                placeholder="Opcional"
                value={observacao}
                onChange={e => setObservacao(e.target.value)}
              />
            </div>
          )}

          {/* Footer */}
          <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-2.5 text-sm text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 justify-center flex"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || !podeSalvar}
              className={`flex-1 px-5 py-2.5 text-sm font-semibold text-white rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 ${
                isEntrada ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-500 hover:bg-red-600'
              }`}
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {editing ? 'Salvar alterações' : `Registrar ${isEntrada ? 'entrada' : 'saída'}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
