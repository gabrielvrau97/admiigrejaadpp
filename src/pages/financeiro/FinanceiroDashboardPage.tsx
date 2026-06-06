import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  TrendingUp, TrendingDown, Wallet, Users, Receipt, RefreshCw,
  ChevronDown, ChevronUp, X, UserCheck, UserX,
} from 'lucide-react'
import { APP_GROUP_ID } from '../../lib/supabase'
import { useData } from '../../contexts/DataContext'
import {
  getFluxo12Meses, getDashKpis, getDistribuicaoCategoria, getTopContribuintes,
  getDistribuicaoFormaPagamento, getLancamentosByCategoria, getStatsPorTitulo,
  getContribNaoCadastrados, getEvolucaoContribuicao,
  getMembrosDoTitulo, getEvolucaoMembro,
  type MesFluxo, type CatFatia, type TopContribuinte, type DashKpis,
  type FormaPagamentoStat, type CatDetalhe, type TituloStat,
  type ContribNaoCadastrado, type EvolucaoMes,
  type MembroDoTitulo, type EvolucaoMembroMes,
} from '../../lib/api/fin_dashboard'

// ── helpers ───────────────────────────────────────────────────────────────

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
function fmtK(v: number) {
  if (Math.abs(v) >= 1_000_000) return `R$${(v / 1_000_000).toFixed(1)}M`
  if (Math.abs(v) >= 1000) return `R$${(v / 1000).toFixed(0)}k`
  return `R$${v.toFixed(0)}`
}
function fmtDate(s: string) {
  const [y, m, d] = s.slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}
function formaPagLabel(f?: string, p?: number) {
  if (!f) return ''
  if (f === 'dinheiro') return 'Dinheiro'
  if (f === 'pix') return 'Pix'
  if (f === 'cartao_debito') return 'Débito'
  if (f === 'cartao_credito') return `Crédito${p && p > 1 ? ` ${p}x` : ''}`
  return f
}

// ── count-up hook ─────────────────────────────────────────────────────────

function useCountUp(target: number, duration = 1000) {
  const [val, setVal] = useState(0)
  const raf = useRef<number>(0)
  const startRef = useRef<number | null>(null)
  const fromRef = useRef(0)
  useEffect(() => {
    fromRef.current = 0; startRef.current = null
    cancelAnimationFrame(raf.current)
    function tick(ts: number) {
      if (!startRef.current) startRef.current = ts
      const p = Math.min((ts - startRef.current) / duration, 1)
      const ease = 1 - Math.pow(1 - p, 3)
      setVal(fromRef.current + (target - fromRef.current) * ease)
      if (p < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [target])
  return val
}

// ── KPI hero card ─────────────────────────────────────────────────────────

function HeroKpi({ label, value, isCurrency = true, icon, gradient, textColor, delay = 0 }: {
  label: string; value: number; isCurrency?: boolean; icon: React.ReactNode
  gradient: string; textColor: string; delay?: number
}) {
  const animated = useCountUp(value)
  const [visible, setVisible] = useState(false)
  useEffect(() => { const t = setTimeout(() => setVisible(true), delay); return () => clearTimeout(t) }, [delay])
  const display = isCurrency ? fmt(animated) : Math.round(animated).toLocaleString('pt-BR')
  return (
    <div className={`rounded-2xl p-5 flex flex-col gap-3 transition-all duration-600 ${gradient} ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`} style={{ transitionDelay: `${delay}ms` }}>
      <div className="flex items-center justify-between">
        <span className={`text-xs font-semibold uppercase tracking-wide ${textColor} opacity-75`}>{label}</span>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-white/20">{icon}</div>
      </div>
      <div className={`text-2xl font-black tabular-nums leading-none ${textColor}`}>{display}</div>
    </div>
  )
}

// ── tooltip ───────────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-gray-900 text-white rounded-xl shadow-xl p-3 text-xs">
      <div className="font-semibold mb-2 text-gray-300">{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
          <span className="text-gray-400">{p.name}:</span>
          <span className="font-bold">{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

// ── categoria clicável com dropdown ──────────────────────────────────────

function CatBarExpandable({
  id, nome, total, percentual, cor, grandTotal, tipo, periodo,
}: CatFatia & { grandTotal: number; tipo: 'entrada' | 'saida'; periodo: { inicio: string; fim: string } }) {
  const [open, setOpen] = useState(false)
  const [detalhe, setDetalhe] = useState<CatDetalhe[]>([])
  const [loadingDet, setLoadingDet] = useState(false)
  const [animated, setAnimated] = useState(false)

  useEffect(() => { const t = setTimeout(() => setAnimated(true), 100); return () => clearTimeout(t) }, [])

  async function handleToggle() {
    if (open) { setOpen(false); return }
    setOpen(true)
    if (detalhe.length > 0) return
    setLoadingDet(true)
    try {
      const d = await getLancamentosByCategoria(APP_GROUP_ID, tipo, id, periodo.inicio, periodo.fim)
      setDetalhe(d)
    } catch (e) { console.error(e) }
    finally { setLoadingDet(false) }
  }

  return (
    <div className="rounded-xl border border-gray-100 overflow-hidden">
      <button
        onClick={handleToggle}
        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors group"
      >
        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: cor }} />
        <span className="flex-1 text-left text-xs font-semibold text-gray-700 truncate">{nome}</span>
        <div className="flex-1 mx-2 bg-gray-100 rounded-full h-2 overflow-hidden hidden sm:block">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{ width: animated ? `${percentual}%` : '0%', background: cor }}
          />
        </div>
        <div className="flex flex-col items-end flex-shrink-0 w-20">
          <span className="text-xs font-bold text-gray-900">{fmt(total)}</span>
          <span className="text-[10px] text-gray-400">{percentual.toFixed(1)}%</span>
        </div>
        <span className="text-gray-400 group-hover:text-gray-600 ml-1">
          {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </span>
      </button>

      {open && (
        <div className="border-t border-gray-100 bg-gray-50 px-3 py-2">
          {loadingDet ? (
            <div className="py-4 text-center text-xs text-gray-400">Carregando...</div>
          ) : detalhe.length === 0 ? (
            <div className="py-3 text-center text-xs text-gray-400">Nenhum lançamento encontrado</div>
          ) : (
            <div className="space-y-1 max-h-52 overflow-y-auto">
              <div className="grid grid-cols-12 text-[10px] text-gray-400 font-semibold px-1 pb-1 uppercase">
                <span className="col-span-2">Data</span>
                <span className="col-span-4">Pessoa</span>
                <span className="col-span-3">Descrição</span>
                <span className="col-span-2">Forma</span>
                <span className="col-span-1 text-right">Valor</span>
              </div>
              {detalhe.map(d => (
                <div key={d.id} className="grid grid-cols-12 text-[11px] text-gray-700 px-1 py-1 rounded hover:bg-white transition-colors">
                  <span className="col-span-2 text-gray-500">{fmtDate(d.data_lancamento)}</span>
                  <span className="col-span-4 truncate font-medium">{d.member_nome}</span>
                  <span className="col-span-3 truncate text-gray-500">{d.descricao ?? d.referencia_culto ?? '—'}</span>
                  <span className="col-span-2 truncate text-gray-500">{formaPagLabel(d.forma_pagamento, d.parcelas)}</span>
                  <span className={`col-span-1 text-right font-semibold ${tipo === 'entrada' ? 'text-emerald-600' : 'text-red-500'}`}>{fmt(d.valor)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Drawer de evolução de um membro ──────────────────────────────────────

function MembroEvolucaoDrawer({
  membro,
  groupId,
  onClose,
}: {
  membro: MembroDoTitulo
  groupId: string
  onClose: () => void
}) {
  const [evolucao, setEvolucao] = useState<EvolucaoMembroMes[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getEvolucaoMembro(groupId, membro.memberId)
      .then(setEvolucao)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [groupId, membro.memberId])

  const maxMes = Math.max(...evolucao.map(e => e.total), 1)
  const mesesComContrib = evolucao.filter(e => e.total > 0).length

  function CustomDot(props: any) {
    const { cx, cy, payload } = props
    if (!payload?.total) return null
    return <circle cx={cx} cy={cy} r={4} fill="#14b8a6" stroke="#fff" strokeWidth={2} />
  }

  function CustomTooltipMembro({ active, payload, label }: any) {
    if (!active || !payload?.length) return null
    const v = payload[0]?.value ?? 0
    return (
      <div className="bg-gray-900 text-white rounded-xl shadow-xl px-3 py-2 text-xs">
        <div className="font-semibold text-gray-300 mb-1">{label}</div>
        {v > 0
          ? <span className="text-teal-300 font-bold">{fmt(v)}</span>
          : <span className="text-gray-500">Não contribuiu</span>
        }
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* overlay */}
      <div className="flex-1 bg-black/40" onClick={onClose} />
      {/* painel */}
      <div className="w-full max-w-sm bg-white shadow-2xl flex flex-col overflow-hidden">
        {/* header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-900 truncate">{membro.nome}</h3>
            <p className="text-xs text-gray-400">Evolução de contribuição — 12 meses</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 flex-shrink-0">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* resumo */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-teal-50 rounded-xl p-3 text-center">
              <div className="text-lg font-black text-teal-700">{fmt(membro.totalContribuido)}</div>
              <div className="text-[10px] text-teal-500 mt-0.5">Total período</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <div className="text-lg font-black text-gray-700">{mesesComContrib}</div>
              <div className="text-[10px] text-gray-400 mt-0.5">Meses ativos</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <div className="text-lg font-black text-gray-700">
                {mesesComContrib > 0 ? fmt(membro.totalContribuido / mesesComContrib) : '—'}
              </div>
              <div className="text-[10px] text-gray-400 mt-0.5">Média/mês</div>
            </div>
          </div>

          {/* gráfico */}
          {loading ? (
            <div className="h-44 bg-gray-50 rounded-xl animate-pulse" />
          ) : (
            <div>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={evolucao} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={fmtK} tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={44} />
                  <Tooltip content={<CustomTooltipMembro />} />
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke="#14b8a6"
                    strokeWidth={2.5}
                    dot={<CustomDot />}
                    activeDot={{ r: 5, fill: '#14b8a6', strokeWidth: 0 }}
                    connectNulls={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* calendário mensal */}
          <div>
            <p className="text-[10px] font-semibold text-gray-500 uppercase mb-2">Mês a mês</p>
            <div className="space-y-1">
              {evolucao.map(e => (
                <div key={e.mes} className={`flex items-center gap-3 px-3 py-2 rounded-lg ${e.total > 0 ? 'bg-teal-50' : 'bg-gray-50'}`}>
                  <span className="text-xs font-semibold text-gray-600 w-14 flex-shrink-0">{e.label}</span>
                  <div className="flex-1 bg-white rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-teal-400 transition-all duration-500"
                      style={{ width: `${e.total > 0 ? (e.total / maxMes) * 100 : 0}%` }}
                    />
                  </div>
                  {e.total > 0
                    ? <span className="text-xs font-bold text-teal-700 w-20 text-right flex-shrink-0">{fmt(e.total)}</span>
                    : <span className="text-[10px] text-gray-400 w-20 text-right flex-shrink-0">— não contrib.</span>
                  }
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Título clicável com ranking de membros ────────────────────────────────

function TituloExpandable({
  titulo, totalMembros, contribuiram, totalContribuido, periodo,
}: TituloStat & { periodo: { inicio: string; fim: string } }) {
  const [open, setOpen] = useState(false)
  const [membros, setMembros] = useState<MembroDoTitulo[]>([])
  const [loading, setLoading] = useState(false)
  const [membroSelecionado, setMembroSelecionado] = useState<MembroDoTitulo | null>(null)

  const pct = totalMembros > 0 ? Math.round((contribuiram / totalMembros) * 100) : 0
  const maxMembro = membros[0]?.totalContribuido ?? 1

  async function handleToggle() {
    if (open) { setOpen(false); return }
    setOpen(true)
    if (membros.length > 0) return
    setLoading(true)
    try {
      const data = await getMembrosDoTitulo(APP_GROUP_ID, titulo, periodo.inicio, periodo.fim)
      setMembros(data)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  return (
    <>
      {membroSelecionado && (
        <MembroEvolucaoDrawer
          membro={membroSelecionado}
          groupId={APP_GROUP_ID}
          onClose={() => setMembroSelecionado(null)}
        />
      )}

      <div className="rounded-xl border border-gray-100 overflow-hidden">
        <button
          onClick={handleToggle}
          className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors group"
        >
          <div className="flex-1 min-w-0 text-left">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-gray-800 truncate">{titulo}</span>
              <span className="text-xs font-bold text-gray-900 ml-2 flex-shrink-0">{fmt(totalContribuido)}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                <div className="h-full rounded-full bg-teal-400 transition-all duration-700" style={{ width: `${pct}%` }} />
              </div>
              <span className="text-[10px] text-gray-500 flex-shrink-0 w-28 text-right">
                {contribuiram}/{totalMembros} membros · {pct}%
              </span>
            </div>
          </div>
          <span className="text-gray-400 group-hover:text-gray-600 ml-2 flex-shrink-0">
            {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </span>
        </button>

        {open && (
          <div className="border-t border-gray-100 bg-gray-50 px-3 py-2">
            {loading ? (
              <div className="py-4 text-center text-xs text-gray-400">Carregando membros...</div>
            ) : membros.length === 0 ? (
              <div className="py-3 text-center text-xs text-gray-400">Nenhum membro ativo encontrado</div>
            ) : (
              <div className="space-y-1 max-h-60 overflow-y-auto">
                <div className="flex items-center gap-2 text-[10px] text-gray-400 font-semibold px-1 pb-1 uppercase">
                  <span className="w-5">#</span>
                  <span className="flex-1">Nome</span>
                  <span className="w-28 text-right">Contribuição</span>
                </div>
                {membros.map((m, i) => {
                  const pctM = m.totalContribuido > 0 ? (m.totalContribuido / maxMembro) * 100 : 0
                  return (
                    <button
                      key={m.memberId}
                      onClick={() => setMembroSelecionado(m)}
                      className={`w-full flex items-center gap-2 px-1 py-1.5 rounded-lg transition-colors text-left ${
                        m.contribuiu ? 'hover:bg-teal-50' : 'hover:bg-gray-100 opacity-60'
                      }`}
                      title="Clique para ver evolução"
                    >
                      <span className="text-[10px] text-gray-400 font-bold w-5 flex-shrink-0">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className={`text-xs font-medium truncate ${m.contribuiu ? 'text-gray-800' : 'text-gray-400'}`}>
                            {m.nome}
                          </span>
                          {m.contribuiu
                            ? <span className="text-xs font-bold text-teal-700 ml-2 flex-shrink-0">{fmt(m.totalContribuido)}</span>
                            : <span className="text-[10px] text-gray-400 ml-2 flex-shrink-0">Não contribuiu</span>
                          }
                        </div>
                        {m.contribuiu && (
                          <div className="w-full bg-white rounded-full h-1 overflow-hidden">
                            <div className="h-full rounded-full bg-teal-400 transition-all duration-700" style={{ width: `${pctM}%` }} />
                          </div>
                        )}
                      </div>
                      <ChevronDown size={11} className="text-gray-300 flex-shrink-0 -rotate-90" />
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}

// ── período ───────────────────────────────────────────────────────────────

type Periodo = 'mes' | 'trim' | 'ano' | 'custom'

function getPeriodo(p: Periodo, ci?: string, cf?: string) {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  const pad = (n: number) => String(n).padStart(2, '0')
  if (p === 'mes') {
    const mm = pad(m + 1)
    const last = new Date(y, m + 1, 0).getDate()
    return { inicio: `${y}-${mm}-01`, fim: `${y}-${mm}-${pad(last)}` }
  }
  if (p === 'trim') {
    const d = new Date(y, m - 2, 1)
    return { inicio: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`, fim: `${y}-${pad(m + 1)}-${pad(new Date(y, m + 1, 0).getDate())}` }
  }
  if (p === 'ano') return { inicio: `${y}-01-01`, fim: `${y}-12-31` }
  return { inicio: ci ?? `${y}-01-01`, fim: cf ?? `${y}-12-31` }
}

// ══════════════════════════════════════════════════════════════════════════

export default function FinanceiroDashboardPage() {
  const { members } = useData()

  const [periodo, setPeriodo] = useState<Periodo>('mes')
  const [customInicio, setCustomInicio] = useState('')
  const [customFim, setCustomFim] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  // filtros do painel Pessoas
  const [pessoasFiltroTitulo, setPessoasFiltroTitulo] = useState('')
  const [pessoasShowTitulos, setPessoasShowTitulos] = useState(false)

  const [kpis, setKpis] = useState<DashKpis | null>(null)
  const [fluxo, setFluxo] = useState<MesFluxo[]>([])
  const [distEntrada, setDistEntrada] = useState<CatFatia[]>([])
  const [distSaida, setDistSaida] = useState<CatFatia[]>([])
  const [topContrib, setTopContrib] = useState<TopContribuinte[]>([])
  const [formaEntrada, setFormaEntrada] = useState<FormaPagamentoStat[]>([])
  const [formaSaida, setFormaSaida] = useState<FormaPagamentoStat[]>([])
  const [tituloStats, setTituloStats] = useState<TituloStat[]>([])
  const [naoCadastrados, setNaoCadastrados] = useState<ContribNaoCadastrado[]>([])
  const [evolucao, setEvolucao] = useState<EvolucaoMes[]>([])

  const { inicio, fim } = useMemo(() => getPeriodo(periodo, customInicio, customFim), [periodo, customInicio, customFim])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      getDashKpis(APP_GROUP_ID, inicio, fim),
      getFluxo12Meses(APP_GROUP_ID),
      getDistribuicaoCategoria(APP_GROUP_ID, 'entrada', inicio, fim),
      getDistribuicaoCategoria(APP_GROUP_ID, 'saida', inicio, fim),
      getTopContribuintes(APP_GROUP_ID, inicio, fim),
      getDistribuicaoFormaPagamento(APP_GROUP_ID, 'entrada', inicio, fim),
      getDistribuicaoFormaPagamento(APP_GROUP_ID, 'saida', inicio, fim),
      getStatsPorTitulo(APP_GROUP_ID, inicio, fim),
      getContribNaoCadastrados(APP_GROUP_ID, inicio, fim),
      getEvolucaoContribuicao(APP_GROUP_ID),
    ]).then(([k, f, de, ds, tc, fe, fs, ts, nc, ev]) => {
      if (cancelled) return
      setKpis(k); setFluxo(f); setDistEntrada(de); setDistSaida(ds); setTopContrib(tc)
      setFormaEntrada(fe); setFormaSaida(fs); setTituloStats(ts)
      setNaoCadastrados(nc); setEvolucao(ev)
    }).catch(console.error).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [inicio, fim, refreshKey])

  const membrosAtivos = members.filter(m => m.status === 'ativo')
  const pctContrib = kpis && membrosAtivos.length > 0
    ? Math.min(100, Math.round((kpis.qtdContribuintes / membrosAtivos.length) * 100))
    : 0

  const maxContrib = topContrib[0]?.total ?? 1

  const periodoLabel: Record<Periodo, string> = {
    mes: 'Este mês', trim: 'Últimos 3 meses', ano: 'Este ano', custom: 'Personalizado',
  }

  const grandTotalEntrada = distEntrada.reduce((s, c) => s + c.total, 0)
  const grandTotalSaida = distSaida.reduce((s, c) => s + c.total, 0)

  const lancTotal = kpis?.qtdLancamentos ?? 0

  // títulos filtrados
  const titulosFiltrados = useMemo(() => {
    if (!pessoasFiltroTitulo.trim()) return tituloStats
    const q = pessoasFiltroTitulo.toLowerCase()
    return tituloStats.filter(t => t.titulo.toLowerCase().includes(q))
  }, [tituloStats, pessoasFiltroTitulo])

  const periodoObj = { inicio, fim }

  return (
    <div className="min-h-full bg-gray-50">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Dashboard Financeiro</h1>
            <p className="text-xs text-gray-400">{periodoLabel[periodo]}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-0.5">
              {(['mes', 'trim', 'ano', 'custom'] as Periodo[]).map(p => (
                <button key={p} onClick={() => setPeriodo(p)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${periodo === p ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                  {periodoLabel[p]}
                </button>
              ))}
            </div>
            {periodo === 'custom' && (
              <div className="flex items-center gap-1.5">
                <input type="date" value={customInicio} onChange={e => setCustomInicio(e.target.value)} className="form-input text-xs py-1.5 px-2" />
                <span className="text-gray-400 text-xs">—</span>
                <input type="date" value={customFim} onChange={e => setCustomFim(e.target.value)} className="form-input text-xs py-1.5 px-2" />
              </div>
            )}
            <button onClick={() => setRefreshKey(k => k + 1)} className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 py-5 space-y-5">

        {/* ── KPIs hero ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <HeroKpi label="Entradas" value={kpis?.totalEntradas ?? 0} icon={<TrendingUp size={16} className="text-emerald-100" />} gradient="bg-gradient-to-br from-emerald-500 to-emerald-700" textColor="text-white" delay={0} />
          <HeroKpi label="Saídas" value={kpis?.totalSaidas ?? 0} icon={<TrendingDown size={16} className="text-red-100" />} gradient="bg-gradient-to-br from-red-500 to-rose-700" textColor="text-white" delay={80} />
          <HeroKpi label="Saldo" value={kpis?.saldo ?? 0} icon={<Wallet size={16} className={(kpis?.saldo ?? 0) >= 0 ? 'text-blue-100' : 'text-orange-100'} />} gradient={(kpis?.saldo ?? 0) >= 0 ? 'bg-gradient-to-br from-blue-500 to-indigo-700' : 'bg-gradient-to-br from-orange-500 to-amber-700'} textColor="text-white" delay={160} />
          <HeroKpi label="Lançamentos" value={kpis?.qtdLancamentos ?? 0} isCurrency={false} icon={<Receipt size={16} className="text-purple-100" />} gradient="bg-gradient-to-br from-purple-500 to-violet-700" textColor="text-white" delay={240} />
        </div>

        {/* ── Distribuição por categoria (2 colunas lado a lado) ────── */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

          {/* Entradas por categoria */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-gray-800">Entradas por Categoria</h2>
                <p className="text-xs text-gray-400">Total: <span className="font-semibold text-emerald-600">{fmt(grandTotalEntrada)}</span> · clique para detalhar</p>
              </div>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center">
                <TrendingUp size={15} className="text-emerald-600" />
              </div>
            </div>
            {loading ? (
              <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded-xl animate-pulse" />)}</div>
            ) : distEntrada.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-xs">Sem dados no período</div>
            ) : (
              <div className="space-y-2">
                {distEntrada.slice(0, 8).map(c => (
                  <CatBarExpandable key={c.id} {...c} grandTotal={grandTotalEntrada} tipo="entrada" periodo={periodoObj} />
                ))}
              </div>
            )}
          </div>

          {/* Saídas por categoria */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-gray-800">Saídas por Categoria</h2>
                <p className="text-xs text-gray-400">Total: <span className="font-semibold text-red-500">{fmt(grandTotalSaida)}</span> · clique para detalhar</p>
              </div>
              <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center">
                <TrendingDown size={15} className="text-red-500" />
              </div>
            </div>
            {loading ? (
              <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded-xl animate-pulse" />)}</div>
            ) : distSaida.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-xs">Sem dados no período</div>
            ) : (
              <div className="space-y-2">
                {distSaida.slice(0, 8).map(c => (
                  <CatBarExpandable key={c.id} {...c} grandTotal={grandTotalSaida} tipo="saida" periodo={periodoObj} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Forma de pagamento ──────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Entradas */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-gray-800">Entradas por Forma de Pagamento</h2>
                <p className="text-xs text-gray-400">{periodoLabel[periodo]}</p>
              </div>
            </div>
            {loading ? (
              <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded-xl animate-pulse" />)}</div>
            ) : formaEntrada.filter(f => f.forma !== 'sem_info').length === 0 ? (
              <div className="text-center py-6 text-gray-400 text-xs">Sem dados no período</div>
            ) : (
              <div className="space-y-2">
                {formaEntrada.filter(f => f.forma !== 'sem_info').map(f => {
                  const totalGeral = formaEntrada.filter(x => x.forma !== 'sem_info').reduce((s, x) => s + x.total, 0)
                  const pct = totalGeral > 0 ? (f.total / totalGeral) * 100 : 0
                  return (
                    <div key={f.forma} className="flex items-center gap-3 px-3 py-2.5 rounded-xl" style={{ background: f.cor + '12' }}>
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: f.cor + '25' }}>
                        <span className="text-[10px] font-bold" style={{ color: f.cor }}>{f.forma === 'dinheiro' ? 'R$' : f.forma === 'pix' ? 'PIX' : f.forma === 'cartao_debito' ? 'DÉB' : 'CRÉ'}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-gray-700">{f.label}</span>
                          <span className="text-sm font-black text-gray-900">{fmt(f.total)}</span>
                        </div>
                        <div className="w-full bg-white/60 rounded-full h-1.5 overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${pct}%`, background: f.cor }} />
                        </div>
                        <span className="text-[10px] text-gray-400">{f.contagem} lançamento{f.contagem !== 1 ? 's' : ''} · {pct.toFixed(1)}%</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Saídas */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-gray-800">Saídas por Forma de Pagamento</h2>
                <p className="text-xs text-gray-400">{periodoLabel[periodo]}</p>
              </div>
            </div>
            {loading ? (
              <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded-xl animate-pulse" />)}</div>
            ) : formaSaida.filter(f => f.forma !== 'sem_info').length === 0 ? (
              <div className="text-center py-6 text-gray-400 text-xs">Sem dados no período</div>
            ) : (
              <div className="space-y-2">
                {formaSaida.filter(f => f.forma !== 'sem_info').map(f => {
                  const totalGeral = formaSaida.filter(x => x.forma !== 'sem_info').reduce((s, x) => s + x.total, 0)
                  const pct = totalGeral > 0 ? (f.total / totalGeral) * 100 : 0
                  return (
                    <div key={f.forma} className="flex items-center gap-3 px-3 py-2.5 rounded-xl" style={{ background: f.cor + '12' }}>
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: f.cor + '25' }}>
                        <span className="text-[10px] font-bold" style={{ color: f.cor }}>{f.forma === 'dinheiro' ? 'R$' : f.forma === 'pix' ? 'PIX' : f.forma === 'cartao_debito' ? 'DÉB' : 'CRÉ'}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-gray-700">{f.label}</span>
                          <span className="text-sm font-black text-gray-900">{fmt(f.total)}</span>
                        </div>
                        <div className="w-full bg-white/60 rounded-full h-1.5 overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${pct}%`, background: f.cor }} />
                        </div>
                        <span className="text-[10px] text-gray-400">{f.contagem} lançamento{f.contagem !== 1 ? 's' : ''} · {pct.toFixed(1)}%</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Fluxo de caixa 12 meses ─────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-gray-800">Fluxo de Caixa — 12 meses</h2>
              <p className="text-xs text-gray-400">Entradas, saídas e saldo acumulado</p>
            </div>
            <div className="hidden sm:flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 rounded-full bg-emerald-400 inline-block" /> Entradas</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 rounded-full bg-red-400 inline-block" /> Saídas</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 rounded-full bg-blue-400 inline-block" /> Saldo</span>
            </div>
          </div>
          {loading ? <div className="h-56 rounded-xl bg-gray-50 animate-pulse" /> : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={fluxo} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gE" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#34d399" stopOpacity={0.35} /><stop offset="95%" stopColor="#34d399" stopOpacity={0} /></linearGradient>
                  <linearGradient id="gS" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f87171" stopOpacity={0.25} /><stop offset="95%" stopColor="#f87171" stopOpacity={0} /></linearGradient>
                  <linearGradient id="gSaldo" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#818cf8" stopOpacity={0.2} /><stop offset="95%" stopColor="#818cf8" stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={fmtK} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={52} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="entradas" name="Entradas" stroke="#34d399" strokeWidth={2.5} fill="url(#gE)" dot={false} activeDot={{ r: 5, fill: '#34d399', strokeWidth: 0 }} />
                <Area type="monotone" dataKey="saidas" name="Saídas" stroke="#f87171" strokeWidth={2.5} fill="url(#gS)" dot={false} activeDot={{ r: 5, fill: '#f87171', strokeWidth: 0 }} />
                <Area type="monotone" dataKey="saldo" name="Saldo" stroke="#818cf8" strokeWidth={2} strokeDasharray="5 3" fill="url(#gSaldo)" dot={false} activeDot={{ r: 4, fill: '#818cf8', strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* ── Pessoas & Contribuição ───────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-5">

          {/* cabeçalho */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-teal-50 flex items-center justify-center">
                <Users size={15} className="text-teal-600" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-800">Pessoas & Contribuição</h2>
                <p className="text-xs text-gray-400">{periodoLabel[periodo]}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPessoasShowTitulos(v => !v)}
                className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${pessoasShowTitulos ? 'bg-teal-50 border-teal-300 text-teal-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
              >
                {pessoasShowTitulos ? 'Ocultar títulos' : 'Ver por título'}
              </button>
            </div>
          </div>

          {/* 4 macro cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <div className="text-2xl font-black text-gray-900">{membrosAtivos.length}</div>
              <div className="text-[10px] text-gray-500 mt-0.5">Membros ativos</div>
            </div>
            <div className="bg-teal-50 rounded-xl p-3 text-center">
              <div className="text-2xl font-black text-teal-700">{kpis?.qtdCadastrados ?? 0}</div>
              <div className="text-[10px] text-teal-600 mt-0.5">Cadastrados contrib.</div>
            </div>
            <div className="bg-blue-50 rounded-xl p-3 text-center">
              <div className="text-2xl font-black text-blue-700">{pctContrib}%</div>
              <div className="text-[10px] text-blue-600 mt-0.5">Engajamento</div>
            </div>
            <div className="bg-amber-50 rounded-xl p-3 text-center">
              <div className="text-2xl font-black text-amber-700">{kpis?.qtdNaoCadastrados ?? 0}</div>
              <div className="text-[10px] text-amber-600 mt-0.5">Não cadastrados</div>
            </div>
          </div>

          {/* barra cadastrados vs não cadastrados */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 w-32 flex-shrink-0">
                <UserCheck size={12} className="text-teal-500" />
                <span className="text-xs text-gray-600">Cadastrados</span>
              </div>
              <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-teal-400 to-emerald-500 transition-all duration-1000"
                  style={{ width: `${(kpis?.totalEntradas ?? 0) > 0 ? ((kpis?.totalCadastrados ?? 0) / (kpis?.totalEntradas ?? 1)) * 100 : 0}%` }}
                />
              </div>
              <span className="text-xs font-bold text-teal-700 w-24 text-right flex-shrink-0">{fmt(kpis?.totalCadastrados ?? 0)}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 w-32 flex-shrink-0">
                <UserX size={12} className="text-amber-500" />
                <span className="text-xs text-gray-600">Não cadastrados</span>
              </div>
              <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-400 transition-all duration-1000"
                  style={{ width: `${(kpis?.totalEntradas ?? 0) > 0 ? ((kpis?.totalNaoCadastrados ?? 0) / (kpis?.totalEntradas ?? 1)) * 100 : 0}%` }}
                />
              </div>
              <span className="text-xs font-bold text-amber-700 w-24 text-right flex-shrink-0">{fmt(kpis?.totalNaoCadastrados ?? 0)}</span>
            </div>
          </div>

          {/* lista de não cadastrados */}
          {naoCadastrados.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <UserX size={13} className="text-amber-500" />
                <span className="text-xs font-semibold text-gray-700">Contribuintes não cadastrados na secretaria</span>
                <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">{naoCadastrados.length}</span>
              </div>
              <div className="space-y-1 max-h-44 overflow-y-auto">
                {naoCadastrados.map((nc, i) => {
                  const maxNc = naoCadastrados[0]?.total ?? 1
                  const pct = (nc.total / maxNc) * 100
                  return (
                    <div key={nc.nome + i} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-amber-50/60 hover:bg-amber-50 transition-colors">
                      <span className="text-[10px] text-amber-400 font-bold w-5 flex-shrink-0">#{i + 1}</span>
                      <span className="flex-1 text-xs font-medium text-gray-800 truncate">{nc.nome}</span>
                      <div className="w-20 bg-amber-100 rounded-full h-1.5 overflow-hidden flex-shrink-0">
                        <div className="h-full rounded-full bg-amber-400 transition-all duration-700" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs font-bold text-amber-700 w-20 text-right flex-shrink-0">{fmt(nc.total)}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* evolução de contribuição 12 meses */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-semibold text-gray-700">Evolução de contribuição — 12 meses</span>
              <div className="flex items-center gap-3 ml-auto text-[10px] text-gray-500">
                <span className="flex items-center gap-1"><span className="w-3 h-0.5 rounded-full bg-teal-500 inline-block" /> Cadastrados</span>
                <span className="flex items-center gap-1"><span className="w-3 h-0.5 rounded-full bg-amber-400 inline-block" /> Não cadastrados</span>
              </div>
            </div>
            {loading ? (
              <div className="h-36 bg-gray-50 rounded-xl animate-pulse" />
            ) : (
              <ResponsiveContainer width="100%" height={150}>
                <LineChart data={evolucao} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={fmtK} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={48} />
                  <Tooltip content={<ChartTooltip />} />
                  <Line type="monotone" dataKey="cadastrados" name="Cadastrados" stroke="#14b8a6" strokeWidth={2.5} dot={false} activeDot={{ r: 4, fill: '#14b8a6', strokeWidth: 0 }} />
                  <Line type="monotone" dataKey="naoCadastrados" name="Não cadastrados" stroke="#f59e0b" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#f59e0b', strokeWidth: 0 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* por título */}
          {pessoasShowTitulos && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold text-gray-700">Contribuição por Título</span>
                <span className="text-[10px] text-gray-400 ml-1">· clique no título para ver membros</span>
                <div className="relative ml-auto">
                  <input
                    type="text"
                    placeholder="Filtrar título..."
                    value={pessoasFiltroTitulo}
                    onChange={e => setPessoasFiltroTitulo(e.target.value)}
                    className="form-input text-xs py-1 px-2 pr-6 w-32"
                  />
                  {pessoasFiltroTitulo && (
                    <button onClick={() => setPessoasFiltroTitulo('')} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400">
                      <X size={10} />
                    </button>
                  )}
                </div>
              </div>
              {loading ? (
                <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded-xl animate-pulse" />)}</div>
              ) : titulosFiltrados.length === 0 ? (
                <div className="text-center py-4 text-gray-400 text-xs">Nenhum título encontrado</div>
              ) : (
                <div className="space-y-2">
                  {titulosFiltrados.map(t => (
                    <TituloExpandable key={t.titulo} {...t} periodo={periodoObj} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Top contribuintes ───────────────────────────────────────── */}
        {topContrib.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-gray-800">Top Contribuintes</h2>
                <p className="text-xs text-gray-400">{periodoLabel[periodo]} · entradas vinculadas a membros</p>
              </div>
              <span className="text-xs bg-gray-100 text-gray-600 font-semibold px-2.5 py-1 rounded-full">{topContrib.length}</span>
            </div>
            {loading ? (
              <div className="space-y-3">{[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse flex items-center gap-3">
                  <div className="w-7 h-7 bg-gray-100 rounded-full" />
                  <div className="flex-1 h-4 bg-gray-100 rounded-full" />
                  <div className="w-24 h-4 bg-gray-100 rounded-full" />
                </div>
              ))}</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                {topContrib.map((c, i) => {
                  const pct = maxContrib > 0 ? (c.total / maxContrib) * 100 : 0
                  const colors = ['#f59e0b', '#94a3b8', '#d97706', '#6366f1', '#06b6d4']
                  const color = colors[Math.min(i, colors.length - 1)]
                  const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null
                  return (
                    <div key={c.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors">
                      <div className="w-7 text-center flex-shrink-0">
                        {medal ? <span className="text-base">{medal}</span> : <span className="text-xs font-bold text-gray-400">#{i + 1}</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm font-semibold text-gray-800 truncate">{c.nome}</span>
                          <span className="text-sm font-black text-gray-900 ml-3 flex-shrink-0">{fmt(c.total)}</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${pct}%`, background: color }} />
                        </div>
                        <span className="text-[10px] text-gray-400">{c.contagem} lançamento{c.contagem !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Comparativo mensal ──────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="mb-4">
            <h2 className="text-sm font-bold text-gray-800">Comparativo Mensal</h2>
            <p className="text-xs text-gray-400">Entradas × Saídas — últimos 6 meses</p>
          </div>
          {loading ? <div className="h-44 rounded-xl bg-gray-50 animate-pulse" /> : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={fluxo.slice(-6)} margin={{ top: 5, right: 5, left: 0, bottom: 0 }} barGap={3} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={fmtK} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={52} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="entradas" name="Entradas" fill="#34d399" radius={[5, 5, 0, 0]} maxBarSize={28} animationDuration={600} />
                <Bar dataKey="saidas" name="Saídas" fill="#f87171" radius={[5, 5, 0, 0]} maxBarSize={28} animationDuration={600} animationBegin={100} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

      </div>
    </div>
  )
}
