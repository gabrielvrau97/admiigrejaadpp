import React, { useState, useMemo } from 'react'
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, AreaChart, Area,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  LineChart, Line,
} from 'recharts'
import { differenceInYears, getYear, getMonth } from 'date-fns'
import {
  Users, Church, Droplets, Heart, TrendingUp, BarChart2,
  MapPin, UserCheck, Sparkles, ChevronDown,
} from 'lucide-react'
import { useData } from '../../contexts/DataContext'
import { useChurch } from '../../contexts/ChurchContext'
import { mockChurches } from '../../lib/mockData'

const PALETTE = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#ec4899','#84cc16']
const MONTH_LABELS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const CIVIL_LABELS: Record<string,string> = {
  solteiro:'Solteiro(a)', casado:'Casado(a)', viuvo:'Viúvo(a)',
  divorciado:'Divorciado(a)', uniao_estavel:'União Estável',
}

const today = new Date()
const currentYear = getYear(today)

function getAge(b: string) { return differenceInYears(today, new Date(b + 'T00:00:00')) }
function pct(value: number, total: number) {
  return total > 0 ? `${Math.round((value / total) * 100)}%` : '0%'
}

// ── Tooltip refinado ─────────────────────────────────────────────────────────
interface TooltipEntry { color?: string; name?: string; value?: number }
function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipEntry[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200/80 rounded-xl px-3.5 py-2.5 text-xs"
      style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}>
      {label && <p className="font-bold text-gray-700 mb-2 pb-1.5 border-b border-gray-100">{label}</p>}
      <div className="space-y-1">
        {payload.map((p: TooltipEntry, i: number) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color ?? '#374151' }} />
            <span className="text-gray-500">{p.name ?? 'Valor'}:</span>
            <span className="font-bold text-gray-800">{p.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Card de gráfico ──────────────────────────────────────────────────────────
function ChartCard({
  title, subtitle, icon, accentColor = '#3b82f6', children, span = 1, action,
}: {
  title: string; subtitle?: string; icon?: React.ReactNode
  accentColor?: string; children: React.ReactNode; span?: 1 | 2
  action?: React.ReactNode
}) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200/80 overflow-hidden ${span === 2 ? 'lg:col-span-2' : ''}`}
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      {/* Linha decorativa topo */}
      <div className="h-0.5 w-full" style={{ background: `linear-gradient(90deg, ${accentColor}, ${accentColor}55)` }} />
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {icon && (
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: `${accentColor}15`, color: accentColor }}>
              {icon}
            </div>
          )}
          <div className="min-w-0">
            <h3 className="font-semibold text-gray-800 text-sm leading-tight">{title}</h3>
            {subtitle && <p className="text-xs text-gray-400 mt-0.5 truncate">{subtitle}</p>}
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

// ── Barra de progresso com label ─────────────────────────────────────────────
function StatRow({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const w = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-gray-600 truncate pr-2">{label}</span>
        <span className="font-bold text-gray-700 shrink-0">{value} <span className="font-normal text-gray-400">({w}%)</span></span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${w}%`, background: color }}
        />
      </div>
    </div>
  )
}

// ── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, icon, gradient, shadow }: {
  label: string; value: number | string; sub: string
  icon: React.ReactNode; gradient: string; shadow: string
}) {
  return (
    <div className="rounded-xl p-4 text-white relative overflow-hidden"
      style={{ background: gradient, boxShadow: `0 4px 14px ${shadow}` }}>
      <div className="absolute -right-3 -top-3 w-16 h-16 rounded-full bg-white/10" />
      <div className="absolute right-1 bottom-[-20px] w-12 h-12 rounded-full bg-white/5" />
      <div className="relative">
        <div className="p-2 bg-white/15 rounded-lg w-fit mb-3">{icon}</div>
        <div className="text-3xl font-bold tracking-tight leading-none">{value}</div>
        <div className="text-sm font-medium opacity-90 mt-1">{label}</div>
        <div className="text-xs opacity-60 mt-0.5">{sub}</div>
      </div>
    </div>
  )
}

// ── Selector de ano ───────────────────────────────────────────────────────────
function YearSelect({ value, onChange }: { value: number; onChange: (y: number) => void }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(+e.target.value)}
        className="appearance-none text-xs bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 pr-7 font-semibold text-gray-700 cursor-pointer focus:outline-none focus:border-blue-400 transition-colors"
      >
        {[currentYear - 3, currentYear - 2, currentYear - 1, currentYear].map(y => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>
      <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
export default function GraficosPage() {
  const { members, visitantes } = useData()
  const { selectedChurch } = useChurch()
  const [yearFilter, setYearFilter] = useState<number>(currentYear)

  const allPeople = useMemo(() => {
    const pool = [...members, ...visitantes]
    return selectedChurch ? pool.filter(m => m.church_id === selectedChurch.id) : pool
  }, [members, visitantes, selectedChurch])

  const base = useMemo(() => {
    let data = members.filter(m => m.status !== 'deleted')
    if (selectedChurch) data = data.filter(m => m.church_id === selectedChurch.id)
    return data
  }, [members, selectedChurch])

  const activeBase = base.filter(m => m.status === 'ativo')
  const totalActive = activeBase.length
  const totalVisitantes = visitantes.filter(v => v.status !== 'deleted').length

  // ── Dados computados ───────────────────────────────────────────────────────
  const byChurch = useMemo(() => mockChurches.map(c => ({
    name: c.name.replace('ADP ', ''),
    fullName: c.name,
    tipo: c.type,
    total: members.filter(m => m.church_id === c.id && m.status !== 'deleted').length,
    ativos: members.filter(m => m.church_id === c.id && m.status === 'ativo').length,
    visitantes: visitantes.filter(v => v.church_id === c.id).length,
  })), [members, visitantes])

  const byCity = useMemo(() => {
    const map: Record<string, number> = {}
    allPeople.filter(m => m.status !== 'deleted').forEach(m => {
      const city = m.contacts?.city ?? 'Não informado'
      map[city] = (map[city] ?? 0) + 1
    })
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8)
  }, [allPeople])

  const ageGroups = useMemo(() => {
    const groups = [
      { label: '0–7', min: 0, max: 7 },
      { label: '8–12', min: 8, max: 12 },
      { label: '13–17', min: 13, max: 17 },
      { label: '18–25', min: 18, max: 25 },
      { label: '26–35', min: 26, max: 35 },
      { label: '36–50', min: 36, max: 50 },
      { label: '51–65', min: 51, max: 65 },
      { label: '65+', min: 66, max: 999 },
    ]
    return groups.map(g => ({
      name: g.label,
      Masculino: activeBase.filter(m => m.sex === 'masculino' && m.birth_date && getAge(m.birth_date) >= g.min && getAge(m.birth_date) <= g.max).length,
      Feminino: activeBase.filter(m => m.sex === 'feminino' && m.birth_date && getAge(m.birth_date) >= g.min && getAge(m.birth_date) <= g.max).length,
    }))
  }, [activeBase])

  const monthlyGrowth = useMemo(() => MONTH_LABELS.map((label, i) => ({
    label,
    Membros: members.filter(m => {
      if (!m.entry_date) return false
      const d = new Date(m.entry_date)
      return getYear(d) === yearFilter && getMonth(d) === i
    }).length,
    Visitantes: visitantes.filter(v => {
      if (!v.entry_date) return false
      const d = new Date(v.entry_date)
      return getYear(d) === yearFilter && getMonth(d) === i
    }).length,
  })), [members, visitantes, yearFilter])

  const baptismByYear = useMemo(() => {
    const years = [currentYear - 4, currentYear - 3, currentYear - 2, currentYear - 1, currentYear]
    return years.map(yr => ({
      name: String(yr),
      'Águas': members.filter(m => m.baptism && m.baptism_date && getYear(new Date(m.baptism_date)) === yr).length,
      'Espírito': members.filter(m => m.baptism_spirit && m.baptism_date && getYear(new Date(m.baptism_date)) === yr).length,
    }))
  }, [members])

  const civilData = useMemo(() => {
    const map: Record<string, number> = {}
    activeBase.forEach(m => { const k = m.civil_status ?? 'Não informado'; map[k] = (map[k] ?? 0) + 1 })
    return Object.entries(map).map(([k, v]) => ({ name: CIVIL_LABELS[k] ?? k, value: v }))
  }, [activeBase])

  const ministryData = useMemo(() => {
    const map: Record<string, number> = {}
    activeBase.forEach(m => (m.ministry?.ministries ?? []).forEach(min => { map[min] = (map[min] ?? 0) + 1 }))
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
  }, [activeBase])

  const radarData = useMemo(() => ['Ativos', 'Batizados', 'Convertidos', 'Visitantes', 'Jovens'].map(label => {
    const row: Record<string, string | number> = { label }
    mockChurches.slice(0, 5).forEach(c => {
      const cm = members.filter(m => m.church_id === c.id && m.status === 'ativo')
      const cv = visitantes.filter(v => v.church_id === c.id)
      const key = c.name.replace('ADP ', '')
      if (label === 'Ativos') row[key] = cm.length
      else if (label === 'Batizados') row[key] = cm.filter(m => m.baptism).length
      else if (label === 'Convertidos') row[key] = cm.filter(m => m.conversion).length
      else if (label === 'Visitantes') row[key] = cv.length
      else if (label === 'Jovens') row[key] = cm.filter(m => m.birth_date && getAge(m.birth_date) >= 18 && getAge(m.birth_date) <= 35).length
    })
    return row
  }), [members, visitantes])

  const titlesData = useMemo(() => {
    const map: Record<string, number> = {}
    activeBase.forEach(m => (m.ministry?.titles ?? []).forEach(t => { map[t] = (map[t] ?? 0) + 1 }))
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10)
  }, [activeBase])

  const genderData = [
    { name: 'Masculino', value: activeBase.filter(m => m.sex === 'masculino').length },
    { name: 'Feminino', value: activeBase.filter(m => m.sex === 'feminino').length },
  ]

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-end justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
            <BarChart2 size={18} className="text-blue-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-800">Gráficos e Análises</h1>
            <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1.5">
              Secretaria · Mapeamento e indicadores
              {selectedChurch && (
                <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded-full font-semibold">
                  <Church size={9} /> {selectedChurch.name}
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Membros ativos" value={totalActive}
          sub={`de ${base.length} cadastros`}
          icon={<Users size={18} />}
          gradient="linear-gradient(135deg,#2563eb,#1d4ed8)"
          shadow="rgba(37,99,235,0.3)"
        />
        <KpiCard
          label="Visitantes" value={totalVisitantes}
          sub={`${visitantes.filter(v => v.novo_convertido).length} novos convertidos`}
          icon={<Heart size={18} />}
          gradient="linear-gradient(135deg,#e11d48,#be123c)"
          shadow="rgba(225,29,72,0.3)"
        />
        <KpiCard
          label="Batizados nas águas" value={activeBase.filter(m => m.baptism).length}
          sub={`${pct(activeBase.filter(m => m.baptism).length, totalActive)} dos membros ativos`}
          icon={<Droplets size={18} />}
          gradient="linear-gradient(135deg,#7c3aed,#6d28d9)"
          shadow="rgba(124,58,237,0.3)"
        />
        <KpiCard
          label="Igrejas ativas" value={mockChurches.length}
          sub={`${mockChurches.filter(c => c.type === 'sede').length} sede · ${mockChurches.filter(c => c.type === 'filial').length} filiais`}
          icon={<Church size={18} />}
          gradient="linear-gradient(135deg,#059669,#047857)"
          shadow="rgba(5,150,105,0.3)"
        />
      </div>

      {/* Grade de gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* 1. Por Igreja */}
        <ChartCard
          title="Distribuição por Igreja"
          subtitle="Membros ativos, visitantes e total de cadastros"
          icon={<Church size={14} />}
          accentColor="#3b82f6"
          span={2}
        >
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={byChurch} margin={{ left: -10, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
              <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 11, paddingTop: 12 }} />
              <Bar dataKey="ativos" name="Membros ativos" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={36} />
              <Bar dataKey="visitantes" name="Visitantes" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={36} />
              <Bar dataKey="total" name="Total cadastros" fill="#e2e8f0" radius={[4, 4, 0, 0]} maxBarSize={36} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* 2. Crescimento mensal */}
        <ChartCard
          title="Novos cadastros por mês"
          subtitle={`Entradas registradas em ${yearFilter}`}
          icon={<TrendingUp size={14} />}
          accentColor="#10b981"
          span={2}
          action={<YearSelect value={yearFilter} onChange={setYearFilter} />}
        >
          <ResponsiveContainer width="100%" height={230}>
            <AreaChart data={monthlyGrowth} margin={{ left: -10, right: 10 }}>
              <defs>
                <linearGradient id="gM" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gV" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#e2e8f0' }} />
              <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 11, paddingTop: 12 }} />
              <Area type="monotone" dataKey="Membros" stroke="#3b82f6" strokeWidth={2.5} fill="url(#gM)" dot={{ r: 3, fill: '#3b82f6', strokeWidth: 0 }} activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }} />
              <Area type="monotone" dataKey="Visitantes" stroke="#f43f5e" strokeWidth={2.5} fill="url(#gV)" dot={{ r: 3, fill: '#f43f5e', strokeWidth: 0 }} activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* 3. Por Município */}
        <ChartCard
          title="Distribuição por Município"
          subtitle="Onde membros e visitantes residem"
          icon={<MapPin size={14} />}
          accentColor="#f59e0b"
        >
          <ResponsiveContainer width="100%" height={270}>
            <BarChart data={byCity} layout="vertical" margin={{ left: 70, right: 24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} width={70} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
              <Bar dataKey="value" name="Pessoas" radius={[0, 4, 4, 0]} maxBarSize={20}>
                {byCity.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* 4. Pirâmide etária */}
        <ChartCard
          title="Pirâmide Etária"
          subtitle="Membros ativos por faixa de idade e sexo"
          icon={<Users size={14} />}
          accentColor="#ec4899"
        >
          <ResponsiveContainer width="100%" height={270}>
            <BarChart data={ageGroups} margin={{ left: -10, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
              <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 11, paddingTop: 12 }} />
              <Bar dataKey="Masculino" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={28} />
              <Bar dataKey="Feminino" fill="#ec4899" radius={[4, 4, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* 5. Batismos anuais */}
        <ChartCard
          title="Histórico de Batismos"
          subtitle="Comparativo dos últimos 5 anos"
          icon={<Droplets size={14} />}
          accentColor="#8b5cf6"
        >
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={baptismByYear} margin={{ left: -10, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#e2e8f0' }} />
              <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 11, paddingTop: 12 }} />
              <Line type="monotone" dataKey="Águas" stroke="#3b82f6" strokeWidth={3} dot={{ r: 5, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }} activeDot={{ r: 7, stroke: '#fff', strokeWidth: 2 }} />
              <Line type="monotone" dataKey="Espírito" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 5, fill: '#8b5cf6', stroke: '#fff', strokeWidth: 2 }} activeDot={{ r: 7, stroke: '#fff', strokeWidth: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* 6. Estado Civil — donut + legenda */}
        <ChartCard
          title="Estado Civil"
          subtitle="Distribuição entre membros ativos"
          icon={<UserCheck size={14} />}
          accentColor="#06b6d4"
        >
          <div className="flex items-center gap-6">
            <div className="shrink-0">
              <ResponsiveContainer width={180} height={200}>
                <PieChart>
                  <Pie
                    data={civilData}
                    cx="50%" cy="50%"
                    innerRadius={58} outerRadius={84}
                    paddingAngle={4}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {civilData.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-2.5">
              {civilData.map((d, i) => (
                <StatRow key={d.name} label={d.name} value={d.value} total={totalActive} color={PALETTE[i % PALETTE.length]} />
              ))}
            </div>
          </div>
        </ChartCard>

        {/* 7. Gênero + Espiritual */}
        <ChartCard
          title="Gênero e Situação Espiritual"
          subtitle="Membros ativos — perfil completo"
          icon={<Sparkles size={14} />}
          accentColor="#10b981"
        >
          <div className="grid grid-cols-2 gap-5">
            {/* Gênero */}
            <div className="flex flex-col items-center">
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={genderData}
                    cx="50%" cy="50%"
                    innerRadius={42} outerRadius={68}
                    paddingAngle={4}
                    dataKey="value"
                    strokeWidth={0}
                    label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }: { cx?: number; cy?: number; midAngle?: number; innerRadius?: number; outerRadius?: number; percent?: number }) => {
                      if (cx == null || cy == null || midAngle == null || innerRadius == null || outerRadius == null || percent == null) return null
                      const RADIAN = Math.PI / 180
                      const radius = innerRadius + (outerRadius - innerRadius) * 0.5
                      const x = cx + radius * Math.cos(-midAngle * RADIAN)
                      const y = cy + radius * Math.sin(-midAngle * RADIAN)
                      return <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700}>{`${(percent * 100).toFixed(0)}%`}</text>
                    }}
                    labelLine={false}
                  >
                    <Cell fill="#3b82f6" />
                    <Cell fill="#ec4899" />
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex gap-3 mt-1">
                {[{ label: 'Masc.', color: 'bg-blue-500' }, { label: 'Fem.', color: 'bg-pink-500' }].map(l => (
                  <span key={l.label} className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                    <span className={`w-2 h-2 rounded-full ${l.color}`} />{l.label}
                  </span>
                ))}
              </div>
            </div>

            {/* Espiritual */}
            <div className="space-y-3 pt-1">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Situação espiritual</p>
              <StatRow label="Batizados nas águas" value={activeBase.filter(m => m.baptism).length} total={totalActive} color="#3b82f6" />
              <StatRow label="Batismo no Espírito" value={activeBase.filter(m => m.baptism_spirit).length} total={totalActive} color="#8b5cf6" />
              <StatRow label="Convertidos" value={activeBase.filter(m => m.conversion).length} total={totalActive} color="#10b981" />
              <StatRow label="Nov. conv. (visit.)" value={visitantes.filter(v => v.novo_convertido).length} total={totalVisitantes || 1} color="#f59e0b" />
            </div>
          </div>
        </ChartCard>

        {/* 8. Radar por congregação */}
        <ChartCard
          title="Radar por Congregação"
          subtitle="Comparativo entre as 5 primeiras igrejas"
          icon={<Church size={14} />}
          accentColor="#f59e0b"
        >
          <ResponsiveContainer width="100%" height={270}>
            <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
              <PolarGrid stroke="#e2e8f0" strokeDasharray="3 3" />
              <PolarAngleAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748b' }} />
              <PolarRadiusAxis tick={{ fontSize: 9, fill: '#94a3b8' }} />
              {mockChurches.slice(0, 5).map((c, i) => (
                <Radar
                  key={c.id}
                  name={c.name.replace('ADP ', '')}
                  dataKey={c.name.replace('ADP ', '')}
                  stroke={PALETTE[i]}
                  fill={PALETTE[i]}
                  fillOpacity={0.1}
                  strokeWidth={2}
                />
              ))}
              <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 10, paddingTop: 8 }} />
              <Tooltip content={<CustomTooltip />} />
            </RadarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* 9. Ministérios */}
        <ChartCard
          title="Ministérios"
          subtitle="Membros ativos por área ministerial"
          icon={<Users size={14} />}
          accentColor="#06b6d4"
        >
          {ministryData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <BarChart2 size={32} className="opacity-20 mb-2" />
              <p className="text-sm">Nenhum dado de ministério registrado.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={ministryData} layout="vertical" margin={{ left: 80, right: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} width={80} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                <Bar dataKey="value" name="Membros" radius={[0, 4, 4, 0]} maxBarSize={18}>
                  {ministryData.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* 10. Títulos ministeriais */}
        <ChartCard
          title="Títulos Ministeriais"
          subtitle="Top 10 títulos entre membros ativos"
          icon={<Sparkles size={14} />}
          accentColor="#8b5cf6"
        >
          {titlesData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <Users size={32} className="opacity-20 mb-2" />
              <p className="text-sm">Nenhum título registrado.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {titlesData.map((d, i) => (
                <StatRow key={d.name} label={d.name} value={d.value} total={totalActive} color={PALETTE[i % PALETTE.length]} />
              ))}
            </div>
          )}
        </ChartCard>

      </div>
    </div>
  )
}
