import React, { useCallback, useEffect, useState } from 'react'
import { FileText, Printer, X, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Search } from 'lucide-react'
import { APP_GROUP_ID } from '../../lib/supabase'
import { listFinRecibos, anularFinRecibo, type FinReciboComLancamento } from '../../lib/api/fin_recibos'
import { useToast, useConfirm } from '../../components/ui/UIProvider'
import ReciboModal from './ReciboModal'

const PAGE_SIZE = 50

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtDate(s: string) {
  const [y, m, d] = s.slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

function formaPagLabel(f?: string, p?: number) {
  if (!f) return '—'
  if (f === 'dinheiro') return '💵 Dinheiro'
  if (f === 'pix') return '⚡ Pix'
  if (f === 'cartao_debito') return '💳 Débito'
  if (f === 'cartao_credito') return `💳 Crédito${p && p > 1 ? ` ${p}x` : ''}`
  return f
}

function firstDayOfMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

export default function FinanceiroRecibosPage() {
  const toast = useToast()
  const confirm = useConfirm()

  const [recibos, setRecibos] = useState<FinReciboComLancamento[]>([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [dataInicio, setDataInicio] = useState(firstDayOfMonth())
  const [dataFim, setDataFim] = useState(new Date().toISOString().slice(0, 10))
  const [busca, setBusca] = useState('')
  const [reciboImpressao, setReciboImpressao] = useState<FinReciboComLancamento | null>(null)

  const load = useCallback(async (p = 1) => {
    setLoading(true)
    try {
      const res = await listFinRecibos({
        groupId: APP_GROUP_ID,
        dataInicio,
        dataFim,
        anulado: false,
        page: p,
        pageSize: PAGE_SIZE,
      })
      setRecibos(res.data)
      setCount(res.count)
      setPage(p)
    } catch {
      toast.error('Erro ao carregar recibos.')
    } finally {
      setLoading(false)
    }
  }, [dataInicio, dataFim, toast])

  useEffect(() => { load(1) }, [load])

  async function handleAnular(r: FinReciboComLancamento) {
    const ok = await confirm({
      title: 'Anular recibo',
      message: `Anular o recibo ${r.numero}? Essa ação não pode ser desfeita.`,
      danger: true,
    })
    if (!ok) return
    try {
      await anularFinRecibo(r.id)
      toast.success(`Recibo ${r.numero} anulado.`)
      load(page)
    } catch {
      toast.error('Erro ao anular recibo.')
    }
  }

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE))

  const filtered = busca.trim()
    ? recibos.filter(r => {
        const q = busca.toLowerCase()
        const l = r.lancamento
        return r.numero.toLowerCase().includes(q)
          || l.member?.name?.toLowerCase().includes(q)
          || l.member_nome_manual?.toLowerCase().includes(q)
          || l.categoria?.nome?.toLowerCase().includes(q)
          || l.descricao?.toLowerCase().includes(q)
      })
    : recibos

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 sm:px-6 pt-5 pb-3 border-b border-gray-100 bg-white">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
            <FileText size={16} className="text-blue-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Recibos</h1>
            <p className="text-xs text-gray-400">Gerados automaticamente a cada lançamento</p>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="px-4 sm:px-6 py-3 bg-white border-b border-gray-100 flex flex-wrap gap-2 items-end">
        <div>
          <label className="block text-[10px] font-medium text-gray-500 mb-0.5">De</label>
          <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="form-input text-sm py-1.5 px-2" />
        </div>
        <div>
          <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Até</label>
          <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="form-input text-sm py-1.5 px-2" />
        </div>
        <div className="relative flex-1 min-w-[180px]">
          <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Busca</label>
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Número, membro, categoria..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              className="form-input text-sm py-1.5 pl-7 w-full"
            />
          </div>
        </div>
        <span className="text-xs text-gray-400 pb-1.5">{count} recibo{count !== 1 ? 's' : ''}</span>
      </div>

      {/* Tabela */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400 text-sm">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <FileText size={28} className="mb-2 opacity-40" />
            <p className="text-sm">Nenhum recibo encontrado</p>
          </div>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead className="sticky top-0 bg-gray-50 z-10">
              <tr className="text-left">
                <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 border-b border-gray-200 whitespace-nowrap">Recibo</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 border-b border-gray-200">Data</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 border-b border-gray-200">Tipo</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 border-b border-gray-200">Contribuinte / Destino</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 border-b border-gray-200">Categoria</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 border-b border-gray-200 whitespace-nowrap">Forma</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 border-b border-gray-200 text-right whitespace-nowrap">Valor</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 border-b border-gray-200"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(r => {
                const l = r.lancamento
                const isEntrada = l.tipo === 'entrada'
                const pessoa = l.member?.name ?? l.member_nome_manual ?? '—'
                return (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-2.5">
                      <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">{r.numero}</span>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-gray-600 text-xs">{fmtDate(r.emitido_em)}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                        isEntrada ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
                      }`}>
                        {isEntrada ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                        {isEntrada ? 'Entrada' : 'Saída'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-gray-700 text-xs max-w-[160px] truncate">{pessoa}</td>
                    <td className="px-3 py-2.5 text-xs">
                      {l.categoria ? (
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: l.categoria.cor }} />
                          <span className="text-gray-600">{l.categoria.nome}</span>
                        </span>
                      ) : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-gray-500 whitespace-nowrap">{formaPagLabel(l.forma_pagamento, l.parcelas)}</td>
                    <td className={`px-3 py-2.5 text-right font-bold whitespace-nowrap ${isEntrada ? 'text-emerald-600' : 'text-red-500'}`}>
                      {isEntrada ? '+' : '-'}{fmt(Number(l.valor))}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => setReciboImpressao(r)}
                          title="Visualizar / Imprimir"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        >
                          <Printer size={13} />
                        </button>
                        <button
                          onClick={() => handleAnular(r)}
                          title="Anular recibo"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Paginação */}
      {!loading && count > PAGE_SIZE && (
        <div className="px-4 sm:px-6 py-3 border-t border-gray-200 bg-white flex items-center justify-between">
          <span className="text-xs text-gray-500">Página {page} de {totalPages}</span>
          <div className="flex items-center gap-1">
            <button onClick={() => load(page - 1)} disabled={page === 1} className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40">
              <ChevronLeft size={14} />
            </button>
            <button onClick={() => load(page + 1)} disabled={page === totalPages} className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40">
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Modal de impressão/reenvio */}
      {reciboImpressao && (
        <ReciboModal
          recibo={reciboImpressao}
          onClose={() => setReciboImpressao(null)}
        />
      )}
    </div>
  )
}
