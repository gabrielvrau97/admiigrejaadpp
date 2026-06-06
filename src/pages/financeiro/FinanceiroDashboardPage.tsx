import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import {
  TrendingUp, TrendingDown, Wallet, Users, Receipt, ArrowUpRight,
  ArrowDownRight, Minus, RefreshCw,
} from 'lucide-react'
import { APP_GROUP_ID } from '../../lib/supabase'
import { useData } from '../../contexts/DataContext'
import {
  getFluxo12Meses, getDashKpis, getDistribuicaoCategoria, getTopContribuintes,
  type MesFluxo, type CatFatia, type TopContribuinte, type DashKpis,
} from '../../lib/api/fin_dashboard'

// ── helpers ──────────────────────────────────────────────────────────────

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtK(v: number) {
  if (Math.abs(v) >= 1000) return `R$${(v / 1000).toFixed(1)}k`
  return fmt(v)
}

function thisMonthRange() {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const last = new Date(y, now.getMonth() + 1, 0).getDate()
  return { inicio: `${y}-${m}-01`, fim: `${y}-${m}-${last}` }
}

// ── KPI card animado ─────────────────────────────────────────────────────

function useCountUp(target: number, duration = 900) {
  const [val, setVal] = useState(0)
  const raf = useRef<number>(0)
  const start = useRef<number | null>(null)
  const from = useRef(0)

  useEffect(() => {
    from.current = val
    start.current = null
    cancelAnimationFrame(raf.current)

    function tick(ts: number) {
      if (!start.current) start.current = ts
      const progress = Math.min((ts - start.current) / duration, 1)
      // ease-out cubic
      const ease = 1 - Math.pow(1 - progress, 3)
      setVal(from.current + (target - from.current) * ease)
      if (progress < 1) raf.current = requestAnimationFrame(tick)
    }

    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [target, duration])

  return val
}

interface KpiProps {
  label: string
  value: number
  isCurrency?: boolean
  icon: React.ReactNode
  bg: string
  trend?: 'up' | 'down' | 'neutral'
  delay?: number
}

function KpiCard({ label, value, isCurrency = true, icon, bg, trend, delay = 0 }: KpiProps) {
  const animated = useCountUp(value)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay)
    return () => clearTimeout(t)
  }, [delay])

  const display = isCurrency ? fmt(animated) : Math.round(animated).toLocaleString('pt-BR')

  return (
    <div
      className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3 transition-all duration-500 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
      }`}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${bg}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-gray-500 mb-0.5">{label}</div>
        <div className="text-lg font-bold text-gray-900 tabular-nums truncate">{display}</div>
      </div>
      {trend && (
        <div className={`flex-shrink-0 ${trend === 'up' ? 'text-emerald-500' : trend === 'down' ? 'text-red-400' : 'text-gray-400'}`}>
          {trend === 'up' ? <ArrowUpRight size={16} /> : trend === 'down' ? <ArrowDownRight size={16} /> : <Minus size={16} />}
        </div>
      )}
    </div>
  )
}

// ── Tooltip customizado ───────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-sm">
      <div className="font-semibold text-gray-700 mb-1.5">{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-gray-500">{p.name}:</span>
          <span className="font-semibold text-gray-800">{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

function PieTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0]
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-sm">
      <div className="font-semibold text-gray-800 mb-1">{d.name}</div>
      <div className="text-gray-600">{fmt(d.value)} <span className="text-gray-400">({d.payload.percentual.toFixed(1)}%)</span></div>
    </div>
  )
}

// ── Mini gráfico de barra para ranking ───────────────────────────────────

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-700 ease-out"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  )
}

// ── Período selector ─────────────────────────────────────────────────────

type Periodo = 'mes' | 'trim' | 'ano' | 'custom'

function getPeriodo(p: Periodo, customInicio?: string, customFim?: string) {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()

  if (p === 'mes') {
    const mm = String(m + 1).padStart(2, '0')
    const last = new Date(y, m + 1, 0).getDate()
    return { inicio: `${y}-${mm}-01`, fim: `${y}-${mm}-${last}` }
  }
  if (p === 'trim') {
    const trimStart = new Date(y, m - 2, 1)
    const sy = trimStart.getFullYear(), sm = String(trimStart.getMonth() + 1).padStart(2, '0')
    const mm = String(m + 1).padStart(2, '0')
    const last = new Date(y, m + 1, 0).getDate()
    return { inicio: `${sy}-${sm}-01`, fim: `${y}-${mm}-${last}` }
  }
  if (p === 'ano') {
    return { inicio: `${y}-01-01`, fim: `${y}-12-31` }
  }
  return { inicio: customInicio ?? `${y}-01-01`, fim: customFim ?? `${y}-12-31` }
}

// ════════════════════════════════════════════════════════════════════════

export default function FinanceiroDashboardPage() {
  const { members, visitantes } = useData()

  const [periodo, setPeriodo] = useState<Periodo>('mes')
  const [customInicio, setCustomInicio] = useState('')
  const [customFim, setCustomFim] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  const [kpis, setKpis] = useState<DashKpis | null>(null)
  const [fluxo, setFluxo] = useState<MesFluxo[]>([])
  const [distEntrada, setDistEntrada] = useState<CatFatia[]>([])
  const [distSaida, setDistSaida] = useState<CatFatia[]>([])
  const [topContrib, setTopContrib] = useState<TopContribuinte[]>([])

  const { inicio, fim } = useMemo(
    () => getPeriodo(periodo, customInicio, customFim),
    [periodo, customInicio, customFim]
  )

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    Promise.all([
      getDashKpis(APP_GROUP_ID, inicio, fim),
      getFluxo12Meses(APP_GROUP_ID),
      getDistribuicaoCategoria(APP_GROUP_ID, 'entrada', inicio, fim),
      getDistribuicaoCategoria(APP_GROUP_ID, 'saida', inicio, fim),
      getTopContribuintes(APP_GROUP_ID, inicio, fim),
    ]).then(([k, f, de, ds, tc]) => {
      if (cancelled) return
      setKpis(k)
      setFluxo(f)
      setDistEntrada(de)
      setDistSaida(ds)
      setTopContrib(tc)
    }).catch(console.error).finally(() => {
      if (!cancelled) setLoading(false)
    })

    return () => { cancelled = true }
  }, [inicio, fim, refreshKey])

  // integração secretaria: membros com e sem lançamento no período
  const totalPessoas = members.length + visitantes.length
  const pctComContrib = kpis && totalPessoas > 0
    ? Math.round((kpis.qtdContribuintes / totalPessoas) * 100)
    : 0

  const maxContrib = topContrib[0]?.total ?? 0

  const periodoLabels: Record<Periodo, string> = {
    mes: 'Este mês', trim: 'Últimos 3 meses', ano: 'Este ano', custom: 'Personalizado',
  }

  return (
    <div className="min-h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Dashboard Financeiro</h1>
            <p className="text-xs text-gray-500 mt-0.5">Visão analítica consolidada</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Período */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
              {(['mes', 'trim', 'ano'] as Periodo[]).map(p => (
                <button
                  key={p}
                  onClick={() => setPeriodo(p)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                    periodo === p
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {periodoLabels[p]}
                </button>
              ))}
              <button
                onClick={() => setPeriodo('custom')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                  periodo === 'custom'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Personalizado
              </button>
            </div>

            {periodo === 'custom' && (
              <div className="flex items-center gap-1.5">
                <input type="date" value={customInicio} onChange={e => setCustomInicio(e.target.value)}
                  className="form-input text-xs py-1.5 px-2" />
                <span className="text-gray-400 text-xs">até</span>
                <input type="date" value={customFim} onChange={e => setCustomFim(e.target.value)}
                  className="form-input text-xs py-1.5 px-2" />
              </div>
            )}

            <button
              onClick={() => setRefreshKey(k => k + 1)}
              className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 transition-all duration-200"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 py-5 space-y-6">

        {/* ── KPIs ───────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          <KpiCard
            label="Total Entradas"
            value={kpis?.totalEntradas ?? 0}
            icon={<TrendingUp size={18} className="text-emerald-600" />}
            bg="bg-emerald-50"
            trend="up"
            delay={0}
          />
          <KpiCard
            label="Total Saídas"
            value={kpis?.totalSaidas ?? 0}
            icon={<TrendingDown size={18} className="text-red-500" />}
            bg="bg-red-50"
            trend="down"
            delay={80}
          />
          <KpiCard
            label="Saldo do Período"
            value={kpis?.saldo ?? 0}
            icon={<Wallet size={18} className={kpis && kpis.saldo >= 0 ? 'text-blue-600' : 'text-orange-500'} />}
            bg={kpis && kpis.saldo >= 0 ? 'bg-blue-50' : 'bg-orange-50'}
            trend={kpis ? (kpis.saldo > 0 ? 'up' : kpis.saldo < 0 ? 'down' : 'neutral') : 'neutral'}
            delay={160}
          />
          <KpiCard
            label="Lançamentos"
            value={kpis?.qtdLancamentos ?? 0}
            isCurrency={false}
            icon={<Receipt size={18} className="text-purple-600" />}
            bg="bg-purple-50"
            delay={240}
          />
          <KpiCard
            label="Ticket Médio"
            value={kpis?.ticketMedioEntrada ?? 0}
            icon={<ArrowUpRight size={18} className="text-indigo-600" />}
            bg="bg-indigo-50"
            delay={320}
          />
          <KpiCard
            label="Contribuintes"
            value={kpis?.qtdContribuintes ?? 0}
            isCurrency={false}
            icon={<Users size={18} className="text-teal-600" />}
            bg="bg-teal-50"
            delay={400}
          />
        </div>

        {/* ── Fluxo de caixa 12 meses ──────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-gray-800">Fluxo de Caixa</h2>
              <p className="text-xs text-gray-400">Últimos 12 meses</p>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span className="flex items-center gap-1"><span className="w-3 h-1 rounded-full bg-emerald-400 inline-block" /> Entradas</span>
              <span className="flex items-center gap-1"><span className="w-3 h-1 rounded-full bg-red-400 inline-block" /> Saídas</span>
              <span className="flex items-center gap-1"><span className="w-3 h-1 rounded-full bg-blue-400 inline-block" /> Saldo</span>
            </div>
          </div>
          {loading ? (
            <div className="h-64 flex items-center justify-center text-gray-400 text-sm animate-pulse">Carregando gráfico...</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={fluxo} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradEntradas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#34d399" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradSaidas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f87171" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradSaldo" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={fmtK} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={55} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="entradas" name="Entradas" stroke="#34d399" strokeWidth={2} fill="url(#gradEntradas)" dot={false} activeDot={{ r: 4, fill: '#34d399' }} />
                <Area type="monotone" dataKey="saidas" name="Saídas" stroke="#f87171" strokeWidth={2} fill="url(#gradSaidas)" dot={false} activeDot={{ r: 4, fill: '#f87171' }} />
                <Area type="monotone" dataKey="saldo" name="Saldo" stroke="#60a5fa" strokeWidth={2} strokeDasharray="4 3" fill="url(#gradSaldo)" dot={false} activeDot={{ r: 4, fill: '#60a5fa' }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* ── Distribuição + Top contribuintes ─────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Pizza entradas */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-bold text-gray-800 mb-1">Entradas por Categoria</h2>
            <p className="text-xs text-gray-400 mb-3">{periodoLabels[periodo]}</p>
            {loading ? (
              <div className="h-48 flex items-center justify-center text-gray-400 text-xs animate-pulse">Carregando...</div>
            ) : distEntrada.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-gray-400 text-xs">Sem dados</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie
                      data={distEntrada}
                      dataKey="total"
                      nameKey="nome"
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={2}
                      animationBegin={0}
                      animationDuration={800}
                    >
                      {distEntrada.map((entry, i) => (
                        <Cell key={i} fill={entry.cor} stroke="white" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip content={<PieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-2 space-y-1.5">
                  {distEntrada.slice(0, 5).map(c => (
                    <div key={c.id} className="flex items-center gap-2 text-xs">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: c.cor }} />
                      <span className="flex-1 text-gray-600 truncate">{c.nome}</span>
                      <span className="font-semibold text-gray-800">{c.percentual.toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Pizza saídas */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-bold text-gray-800 mb-1">Saídas por Categoria</h2>
            <p className="text-xs text-gray-400 mb-3">{periodoLabels[periodo]}</p>
            {loading ? (
              <div className="h-48 flex items-center justify-center text-gray-400 text-xs animate-pulse">Carregando...</div>
            ) : distSaida.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-gray-400 text-xs">Sem dados</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie
                      data={distSaida}
                      dataKey="total"
                      nameKey="nome"
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={2}
                      animationBegin={0}
                      animationDuration={800}
                    >
                      {distSaida.map((entry, i) => (
                        <Cell key={i} fill={entry.cor} stroke="white" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip content={<PieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-2 space-y-1.5">
                  {distSaida.slice(0, 5).map(c => (
                    <div key={c.id} className="flex items-center gap-2 text-xs">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: c.cor }} />
                      <span className="flex-1 text-gray-600 truncate">{c.nome}</span>
                      <span className="font-semibold text-gray-800">{c.percentual.toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Integração Secretaria */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-bold text-gray-800 mb-1">Secretaria × Financeiro</h2>
            <p className="text-xs text-gray-400 mb-4">{periodoLabels[periodo]}</p>

            {/* Engajamento financeiro */}
            <div className="mb-4">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-gray-600">Engajamento financeiro</span>
                <span className="font-bold text-gray-900">{pctComContrib}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-1000 ease-out"
                  style={{ width: `${pctComContrib}%` }}
                />
              </div>
              <div className="text-[10px] text-gray-400 mt-1">
                {kpis?.qtdContribuintes ?? 0} de {totalPessoas} pessoas contribuíram
              </div>
            </div>

            {/* KPI rápidos */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="bg-gray-50 rounded-xl p-2.5 text-center">
                <div className="text-lg font-bold text-gray-900">{members.length}</div>
                <div className="text-[10px] text-gray-500">Membros ativos</div>
              </div>
              <div className="bg-gray-50 rounded-xl p-2.5 text-center">
                <div className="text-lg font-bold text-gray-900">{visitantes.length}</div>
                <div className="text-[10px] text-gray-500">Visitantes</div>
              </div>
            </div>

            {/* Taxa de contribuição */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-3 border border-blue-100">
              <div className="text-[10px] text-blue-600 font-semibold uppercase tracking-wide mb-1">Ticket médio de entrada</div>
              <div className="text-xl font-bold text-blue-800">{fmt(kpis?.ticketMedioEntrada ?? 0)}</div>
              <div className="text-[10px] text-blue-500 mt-0.5">por lançamento no período</div>
            </div>
          </div>
        </div>

        {/* ── Top contribuintes ─────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-gray-800">Top Contribuintes</h2>
              <p className="text-xs text-gray-400">{periodoLabels[periodo]} · entradas vinculadas a membros</p>
            </div>
            <span className="text-xs text-gray-400">{topContrib.length} identificados</span>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse flex items-center gap-3">
                  <div className="w-6 h-4 bg-gray-100 rounded" />
                  <div className="flex-1 h-4 bg-gray-100 rounded" />
                  <div className="w-20 h-4 bg-gray-100 rounded" />
                </div>
              ))}
            </div>
          ) : topContrib.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              Nenhum contribuinte identificado no período
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {topContrib.map((c, i) => {
                const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null
                const barColor = i === 0 ? '#f59e0b' : i === 1 ? '#94a3b8' : i === 2 ? '#d97706' : '#6366f1'
                return (
                  <div
                    key={c.id}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors duration-150"
                    style={{ animationDelay: `${i * 40}ms` }}
                  >
                    <div className="w-6 text-center flex-shrink-0">
                      {medal ?? <span className="text-xs font-bold text-gray-400">#{i + 1}</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-800 truncate">{c.nome}</span>
                        <span className="text-xs font-bold text-gray-900 ml-2 flex-shrink-0">{fmt(c.total)}</span>
                      </div>
                      <MiniBar value={c.total} max={maxContrib} color={barColor} />
                      <span className="text-[10px] text-gray-400 mt-0.5">{c.contagem} lançamento{c.contagem !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ── Gráfico de barras comparativo meses recentes ─────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-gray-800">Entradas × Saídas por Mês</h2>
              <p className="text-xs text-gray-400">Últimos 6 meses</p>
            </div>
          </div>
          {loading ? (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm animate-pulse">Carregando gráfico...</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={fluxo.slice(-6)} margin={{ top: 5, right: 10, left: 0, bottom: 0 }} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={fmtK} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={55} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="entradas" name="Entradas" fill="#34d399" radius={[4, 4, 0, 0]} maxBarSize={32} animationDuration={700} />
                <Bar dataKey="saidas" name="Saídas" fill="#f87171" radius={[4, 4, 0, 0]} maxBarSize={32} animationDuration={700} animationBegin={150} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

      </div>
    </div>
  )
}
