import { supabase } from '../supabase'
import type { FinLancamento } from '../../types'

// ── helpers ───────────────────────────────────────────────────────────────

function pad(n: number) { return String(n).padStart(2, '0') }

function monthRange(year: number, month: number) {
  const first = `${year}-${pad(month)}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const last = `${year}-${pad(month)}-${pad(lastDay)}`
  return { first, last }
}

const COLS = `
  id, tipo, valor, data_lancamento, categoria_id, church_id, member_id, member_nome_manual,
  categoria:fin_categorias!categoria_id ( id, nome, cor ),
  member:members!member_id ( id, name )
`

// ── fluxo de caixa 12 meses ───────────────────────────────────────────────

export interface MesFluxo {
  label: string   // 'Jan/25'
  mes: string     // '2025-01'
  entradas: number
  saidas: number
  saldo: number
}

export async function getFluxo12Meses(groupId: string): Promise<MesFluxo[]> {
  const now = new Date()
  const results: MesFluxo[] = []

  // 12 meses: do mês atual - 11 até o mês atual
  const months: { year: number; month: number }[] = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push({ year: d.getFullYear(), month: d.getMonth() + 1 })
  }

  const { first } = monthRange(months[0].year, months[0].month)
  const { last } = monthRange(months[11].year, months[11].month)

  const { data, error } = await supabase
    .from('fin_lancamentos')
    .select('tipo, valor, data_lancamento')
    .eq('church_group_id', groupId)
    .gte('data_lancamento', first)
    .lte('data_lancamento', last)

  if (error) throw error
  const rows = data ?? []

  for (const { year, month } of months) {
    const mesStr = `${year}-${pad(month)}`
    const mesRows = rows.filter(r => r.data_lancamento.startsWith(mesStr))
    const entradas = mesRows.filter(r => r.tipo === 'entrada').reduce((s, r) => s + Number(r.valor), 0)
    const saidas = mesRows.filter(r => r.tipo === 'saida').reduce((s, r) => s + Number(r.valor), 0)
    const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
    results.push({
      label: `${MESES[month - 1]}/${String(year).slice(2)}`,
      mes: mesStr,
      entradas,
      saidas,
      saldo: entradas - saidas,
    })
  }

  return results
}

// ── distribuição por categoria ────────────────────────────────────────────

export interface CatFatia {
  id: string
  nome: string
  cor: string
  total: number
  percentual: number
}

export async function getDistribuicaoCategoria(
  groupId: string,
  tipo: 'entrada' | 'saida',
  dataInicio: string,
  dataFim: string,
): Promise<CatFatia[]> {
  const { data, error } = await supabase
    .from('fin_lancamentos')
    .select(COLS)
    .eq('church_group_id', groupId)
    .eq('tipo', tipo)
    .gte('data_lancamento', dataInicio)
    .lte('data_lancamento', dataFim)

  if (error) throw error
  const rows = (data ?? []) as unknown as FinLancamento[]

  const map = new Map<string, { nome: string; cor: string; total: number }>()

  for (const r of rows) {
    const key = r.categoria_id ?? '__sem_categoria__'
    const nome = r.categoria?.nome ?? 'Sem categoria'
    const cor = r.categoria?.cor ?? '#9ca3af'
    const prev = map.get(key) ?? { nome, cor, total: 0 }
    map.set(key, { nome, cor, total: prev.total + Number(r.valor) })
  }

  const grandTotal = [...map.values()].reduce((s, v) => s + v.total, 0)
  return [...map.entries()]
    .map(([id, v]) => ({ id, ...v, percentual: grandTotal > 0 ? (v.total / grandTotal) * 100 : 0 }))
    .sort((a, b) => b.total - a.total)
}

// ── top contribuintes ─────────────────────────────────────────────────────

export interface TopContribuinte {
  id: string
  nome: string
  total: number
  contagem: number
}

export async function getTopContribuintes(
  groupId: string,
  dataInicio: string,
  dataFim: string,
  limit = 10,
): Promise<TopContribuinte[]> {
  const { data, error } = await supabase
    .from('fin_lancamentos')
    .select(COLS)
    .eq('church_group_id', groupId)
    .eq('tipo', 'entrada')
    .gte('data_lancamento', dataInicio)
    .lte('data_lancamento', dataFim)

  if (error) throw error
  const rows = (data ?? []) as unknown as FinLancamento[]

  const map = new Map<string, TopContribuinte>()

  for (const r of rows) {
    const key = r.member_id ?? ('manual::' + (r.member_nome_manual ?? ''))
    const nome = r.member?.name ?? r.member_nome_manual ?? 'Sem identificação'
    const prev = map.get(key) ?? { id: key, nome, total: 0, contagem: 0 }
    map.set(key, { ...prev, total: prev.total + Number(r.valor), contagem: prev.contagem + 1 })
  }

  // remove "sem identificação" de vários se quiser; mantemos por ora
  return [...map.values()]
    .filter(v => v.nome !== 'Sem identificação')
    .sort((a, b) => b.total - a.total)
    .slice(0, limit)
}

// ── KPIs do período ───────────────────────────────────────────────────────

export interface DashKpis {
  totalEntradas: number
  totalSaidas: number
  saldo: number
  ticketMedioEntrada: number
  qtdLancamentos: number
  qtdContribuintes: number
}

export async function getDashKpis(
  groupId: string,
  dataInicio: string,
  dataFim: string,
): Promise<DashKpis> {
  const { data, error } = await supabase
    .from('fin_lancamentos')
    .select('tipo, valor, member_id, member_nome_manual')
    .eq('church_group_id', groupId)
    .gte('data_lancamento', dataInicio)
    .lte('data_lancamento', dataFim)

  if (error) throw error
  const rows = data ?? []

  const entradas = rows.filter(r => r.tipo === 'entrada')
  const saidas = rows.filter(r => r.tipo === 'saida')
  const totalEntradas = entradas.reduce((s, r) => s + Number(r.valor), 0)
  const totalSaidas = saidas.reduce((s, r) => s + Number(r.valor), 0)

  const contribuintesIds = new Set(
    entradas
      .filter(r => r.member_id || r.member_nome_manual)
      .map(r => r.member_id ?? ('m::' + r.member_nome_manual))
  )

  return {
    totalEntradas,
    totalSaidas,
    saldo: totalEntradas - totalSaidas,
    ticketMedioEntrada: entradas.length > 0 ? totalEntradas / entradas.length : 0,
    qtdLancamentos: rows.length,
    qtdContribuintes: contribuintesIds.size,
  }
}
