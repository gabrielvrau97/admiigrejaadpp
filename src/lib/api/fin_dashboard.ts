import { supabase } from '../supabase'
import type { FinLancamento } from '../../types'
import { fetchAllPaged } from './_paginate'

// ── helpers ───────────────────────────────────────────────────────────────

function pad(n: number) { return String(n).padStart(2, '0') }

function monthRange(year: number, month: number) {
  const first = `${year}-${pad(month)}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const last = `${year}-${pad(month)}-${pad(lastDay)}`
  return { first, last }
}

const MESES_CURTOS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

function getLast12Months(): { year: number; month: number }[] {
  const now = new Date()
  const months: { year: number; month: number }[] = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push({ year: d.getFullYear(), month: d.getMonth() + 1 })
  }
  return months
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
  const months = getLast12Months()
  const { first } = monthRange(months[0].year, months[0].month)
  const { last } = monthRange(months[11].year, months[11].month)

  const rows = await fetchAllPaged((f, t) => supabase
    .from('fin_lancamentos')
    .select('tipo, valor, data_lancamento')
    .eq('church_group_id', groupId)
    .gte('data_lancamento', first)
    .lte('data_lancamento', last)
    .range(f, t))

  return months.map(({ year, month }) => {
    const mesStr = `${year}-${pad(month)}`
    const mesRows = rows.filter(r => r.data_lancamento.startsWith(mesStr))
    const entradas = mesRows.filter(r => r.tipo === 'entrada').reduce((s, r) => s + Number(r.valor), 0)
    const saidas = mesRows.filter(r => r.tipo === 'saida').reduce((s, r) => s + Number(r.valor), 0)
    return {
      label: `${MESES_CURTOS[month - 1]}/${String(year).slice(2)}`,
      mes: mesStr,
      entradas,
      saidas,
      saldo: entradas - saidas,
    }
  })
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
  const rows = (await fetchAllPaged((f, t) => supabase
    .from('fin_lancamentos')
    .select(COLS)
    .eq('church_group_id', groupId)
    .eq('tipo', tipo)
    .gte('data_lancamento', dataInicio)
    .lte('data_lancamento', dataFim)
    .range(f, t))) as unknown as FinLancamento[]

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
  const rows = (await fetchAllPaged((f, t) => supabase
    .from('fin_lancamentos')
    .select(COLS)
    .eq('church_group_id', groupId)
    .eq('tipo', 'entrada')
    .gte('data_lancamento', dataInicio)
    .lte('data_lancamento', dataFim)
    .range(f, t))) as unknown as FinLancamento[]

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

// ── distribuição por forma de pagamento ──────────────────────────────────

export interface FormaPagamentoStat {
  forma: string
  label: string
  total: number
  contagem: number
  cor: string
}

export async function getDistribuicaoFormaPagamento(
  groupId: string,
  tipo: 'entrada' | 'saida',
  dataInicio: string,
  dataFim: string,
): Promise<FormaPagamentoStat[]> {
  const rows = await fetchAllPaged((f, t) => supabase
    .from('fin_lancamentos')
    .select('forma_pagamento, valor')
    .eq('church_group_id', groupId)
    .eq('tipo', tipo)
    .gte('data_lancamento', dataInicio)
    .lte('data_lancamento', dataFim)
    .range(f, t))

  const FORMAS: Record<string, { label: string; cor: string }> = {
    dinheiro:       { label: 'Dinheiro',   cor: '#22c55e' },
    pix:            { label: 'Pix',        cor: '#6366f1' },
    cartao_debito:  { label: 'Débito',     cor: '#f59e0b' },
    cartao_credito: { label: 'Crédito',    cor: '#ef4444' },
    sem_info:       { label: 'Não inf.',   cor: '#d1d5db' },
  }

  const map = new Map<string, { total: number; contagem: number }>()

  for (const r of rows) {
    const key = r.forma_pagamento ?? 'sem_info'
    const prev = map.get(key) ?? { total: 0, contagem: 0 }
    map.set(key, { total: prev.total + Number(r.valor), contagem: prev.contagem + 1 })
  }

  return [...map.entries()]
    .map(([forma, v]) => ({
      forma,
      label: FORMAS[forma]?.label ?? forma,
      cor: FORMAS[forma]?.cor ?? '#9ca3af',
      ...v,
    }))
    .sort((a, b) => b.total - a.total)
}

// ── lançamentos detalhados de uma categoria ───────────────────────────────

export interface CatDetalhe {
  id: string
  data_lancamento: string
  valor: number
  descricao?: string
  referencia_culto?: string
  member_nome: string
  forma_pagamento?: string
  parcelas?: number
}

export async function getLancamentosByCategoria(
  groupId: string,
  tipo: 'entrada' | 'saida',
  categoriaId: string,
  dataInicio: string,
  dataFim: string,
  limit = 50,
): Promise<CatDetalhe[]> {
  const { data, error } = await supabase
    .from('fin_lancamentos')
    .select('id, data_lancamento, valor, descricao, referencia_culto, forma_pagamento, parcelas, member_id, member_nome_manual, member:members!member_id(name)')
    .eq('church_group_id', groupId)
    .eq('tipo', tipo)
    .eq('categoria_id', categoriaId)
    .gte('data_lancamento', dataInicio)
    .lte('data_lancamento', dataFim)
    .order('data_lancamento', { ascending: false })
    .limit(limit)

  if (error) throw error
  return ((data ?? []) as any[]).map(r => ({
    id: r.id,
    data_lancamento: r.data_lancamento,
    valor: Number(r.valor),
    descricao: r.descricao,
    referencia_culto: r.referencia_culto,
    member_nome: r.member?.name ?? r.member_nome_manual ?? '—',
    forma_pagamento: r.forma_pagamento,
    parcelas: r.parcelas,
  }))
}

// ── engajamento geral por tipo de categoria (dízimo vs outros) ───────────

export interface EngajamentoCategorias {
  qtdGeral: number
  qtdDizimo: number
  qtdOutros: number
  totalDizimo: number
  totalOutros: number
}

export async function getEngajamentoCategorias(
  groupId: string,
  dataInicio: string,
  dataFim: string,
): Promise<EngajamentoCategorias> {
  const { data: cats } = await supabase
    .from('fin_categorias')
    .select('id')
    .eq('church_group_id', groupId)
    .or('nome.ilike.%dízimo%,nome.ilike.%dizimo%')

  const dizimoCatIds = new Set<string>((cats ?? []).map((c: { id: string }) => c.id))

  const rows = await fetchAllPaged((f, t) => supabase
    .from('fin_lancamentos')
    .select('member_id, valor, categoria_id')
    .eq('church_group_id', groupId)
    .eq('tipo', 'entrada')
    .not('member_id', 'is', null)
    .gte('data_lancamento', dataInicio)
    .lte('data_lancamento', dataFim)
    .range(f, t))

  const memberMap = new Map<string, { hasDizimo: boolean; hasOutros: boolean; totalDizimo: number; totalOutros: number }>()

  for (const r of rows) {
    if (!r.member_id) continue
    const isDizimo = dizimoCatIds.has(r.categoria_id)
    const prev = memberMap.get(r.member_id) ?? { hasDizimo: false, hasOutros: false, totalDizimo: 0, totalOutros: 0 }
    memberMap.set(r.member_id, {
      hasDizimo:   prev.hasDizimo || isDizimo,
      hasOutros:   prev.hasOutros || !isDizimo,
      totalDizimo: prev.totalDizimo + (isDizimo ? Number(r.valor) : 0),
      totalOutros: prev.totalOutros + (!isDizimo ? Number(r.valor) : 0),
    })
  }

  let qtdGeral = 0, qtdDizimo = 0, qtdOutros = 0, totalDizimo = 0, totalOutros = 0
  for (const m of memberMap.values()) {
    qtdGeral++
    if (m.hasDizimo) qtdDizimo++
    if (m.hasOutros) qtdOutros++
    totalDizimo += m.totalDizimo
    totalOutros += m.totalOutros
  }

  return { qtdGeral, qtdDizimo, qtdOutros, totalDizimo, totalOutros }
}

// ── stats por título de membro (Pessoas & Contribuição) ───────────────────

export interface TituloStat {
  titulo: string
  totalMembros: number
  contribuiram: number
  contribuiramDizimo: number
  contribuiramOutros: number
  totalContribuido: number
  totalDizimo: number
  totalOutros: number
}

export async function getStatsPorTitulo(
  groupId: string,
  dataInicio: string,
  dataFim: string,
): Promise<TituloStat[]> {
  // busca categorias de dízimo para o split
  const { data: dizimoCats } = await supabase
    .from('fin_categorias')
    .select('id')
    .eq('church_group_id', groupId)
    .or('nome.ilike.%dízimo%,nome.ilike.%dizimo%')

  const dizimoCatIds = new Set<string>((dizimoCats ?? []).map((c: { id: string }) => c.id))

  // busca lançamentos de entrada com member_id no período (inclui categoria_id para split)
  const lancs = await fetchAllPaged((f, t) => supabase
    .from('fin_lancamentos')
    .select('member_id, valor, categoria_id')
    .eq('church_group_id', groupId)
    .eq('tipo', 'entrada')
    .not('member_id', 'is', null)
    .gte('data_lancamento', dataInicio)
    .lte('data_lancamento', dataFim)
    .range(f, t))

  // busca igrejas do grupo para filtrar members (members não tem church_group_id)
  const { data: churches, error: e2 } = await supabase
    .from('churches')
    .select('id')
    .eq('group_id', groupId)
  if (e2) throw e2

  const churchIds = (churches ?? []).map(c => c.id)

  // busca membros ativos das igrejas do grupo (paginado — pode passar de 1.000)
  const membersData = churchIds.length > 0
    ? await fetchAllPaged((f, t) => supabase
        .from('members')
        .select('id')
        .in('church_id', churchIds)
        .eq('status', 'ativo')
        .range(f, t))
    : []

  const activeMemberIds = new Set(membersData.map(m => m.id))
  const activeIdsList = [...activeMemberIds]

  // busca member_ministry filtrado pelos membros ativos do grupo (paginado)
  const ministerios = activeIdsList.length > 0
    ? await fetchAllPaged((f, t) => supabase
        .from('member_ministry')
        .select('member_id, titles')
        .in('member_id', activeIdsList)
        .range(f, t))
    : []

  // IDs que contribuíram + split dízimo/outros
  const contribMap = new Map<string, { total: number; totalDizimo: number; totalOutros: number; hasDizimo: boolean; hasOutros: boolean }>()
  for (const l of (lancs ?? [])) {
    if (!l.member_id) continue
    const isDizimo = dizimoCatIds.has(l.categoria_id)
    const prev = contribMap.get(l.member_id) ?? { total: 0, totalDizimo: 0, totalOutros: 0, hasDizimo: false, hasOutros: false }
    contribMap.set(l.member_id, {
      total:       prev.total + Number(l.valor),
      totalDizimo: prev.totalDizimo + (isDizimo ? Number(l.valor) : 0),
      totalOutros: prev.totalOutros + (!isDizimo ? Number(l.valor) : 0),
      hasDizimo:   prev.hasDizimo || isDizimo,
      hasOutros:   prev.hasOutros || !isDizimo,
    })
  }

  // agrupa por título — apenas membros ativos do grupo
  const map = new Map<string, {
    totalMembros: number; contribuiram: number; contribuiramDizimo: number; contribuiramOutros: number;
    totalContribuido: number; totalDizimo: number; totalOutros: number;
  }>()

  for (const m of (ministerios ?? [])) {
    if (!activeMemberIds.has(m.member_id)) continue
    const titles: string[] = (m.titles as string[]) ?? []
    for (const t of titles) {
      if (!t) continue
      const prev = map.get(t) ?? { totalMembros: 0, contribuiram: 0, contribuiramDizimo: 0, contribuiramOutros: 0, totalContribuido: 0, totalDizimo: 0, totalOutros: 0 }
      const c = contribMap.get(m.member_id) ?? { total: 0, totalDizimo: 0, totalOutros: 0, hasDizimo: false, hasOutros: false }
      map.set(t, {
        totalMembros:       prev.totalMembros + 1,
        contribuiram:       prev.contribuiram + (c.total > 0 ? 1 : 0),
        contribuiramDizimo: prev.contribuiramDizimo + (c.hasDizimo ? 1 : 0),
        contribuiramOutros: prev.contribuiramOutros + (c.hasOutros ? 1 : 0),
        totalContribuido:   prev.totalContribuido + c.total,
        totalDizimo:        prev.totalDizimo + c.totalDizimo,
        totalOutros:        prev.totalOutros + c.totalOutros,
      })
    }
  }

  return [...map.entries()]
    .map(([titulo, v]) => ({ titulo, ...v }))
    .filter(v => v.totalMembros > 0)
    .sort((a, b) => b.totalContribuido - a.totalContribuido)
}

// ── contribuintes não cadastrados ─────────────────────────────────────────

export interface ContribNaoCadastrado {
  nome: string
  total: number
}

export async function getContribNaoCadastrados(
  groupId: string,
  dataInicio: string,
  dataFim: string,
  limit = 20,
): Promise<ContribNaoCadastrado[]> {
  const data = await fetchAllPaged((f, t) => supabase
    .from('fin_lancamentos')
    .select('member_nome_manual, valor')
    .eq('church_group_id', groupId)
    .eq('tipo', 'entrada')
    .is('member_id', null)
    .not('member_nome_manual', 'is', null)
    .gte('data_lancamento', dataInicio)
    .lte('data_lancamento', dataFim)
    .range(f, t))

  const map = new Map<string, number>()
  for (const r of (data ?? [])) {
    const nome = (r.member_nome_manual as string).trim()
    if (!nome) continue
    map.set(nome, (map.get(nome) ?? 0) + Number(r.valor))
  }

  return [...map.entries()]
    .map(([nome, total]) => ({ nome, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit)
}

// ── evolução mensal de contribuições cadastrados vs não cadastrados ────────

export interface EvolucaoMes {
  label: string
  mes: string
  cadastrados: number
  naoCadastrados: number
}

export async function getEvolucaoContribuicao(groupId: string): Promise<EvolucaoMes[]> {
  const months = getLast12Months()
  const { first } = monthRange(months[0].year, months[0].month)
  const { last } = monthRange(months[11].year, months[11].month)

  const rows = await fetchAllPaged((f, t) => supabase
    .from('fin_lancamentos')
    .select('valor, data_lancamento, member_id, member_nome_manual')
    .eq('church_group_id', groupId)
    .eq('tipo', 'entrada')
    .gte('data_lancamento', first)
    .lte('data_lancamento', last)
    .range(f, t))

  return months.map(({ year, month }) => {
    const mesStr = `${year}-${pad(month)}`
    const mesRows = rows.filter(r => r.data_lancamento.startsWith(mesStr))
    const cadastrados = mesRows.filter(r => r.member_id).reduce((s, r) => s + Number(r.valor), 0)
    const naoCadastrados = mesRows.filter(r => !r.member_id && r.member_nome_manual).reduce((s, r) => s + Number(r.valor), 0)
    return { label: `${MESES_CURTOS[month - 1]}/${String(year).slice(2)}`, mes: mesStr, cadastrados, naoCadastrados }
  })
}

// ── evolução mensal de engajamento dízimo vs outros (12 meses) ───────────

export interface EvolucaoDizimoMes {
  label: string
  mes: string
  pctGeral: number
  pctDizimo: number
  pctOutros: number
  qtdGeral: number
  qtdDizimo: number
  qtdOutros: number
}

export async function getEvolucaoDizimo(groupId: string): Promise<EvolucaoDizimoMes[]> {
  const [cats, churches] = await Promise.all([
    supabase
      .from('fin_categorias')
      .select('id')
      .eq('church_group_id', groupId)
      .or('nome.ilike.%dízimo%,nome.ilike.%dizimo%'),
    supabase
      .from('churches')
      .select('id')
      .eq('group_id', groupId),
  ])

  const dizimoCatIds = new Set<string>((cats.data ?? []).map((c: { id: string }) => c.id))
  const churchIds = (churches.data ?? []).map((c: { id: string }) => c.id)

  const membersData = churchIds.length > 0
    ? await fetchAllPaged((f, t) => supabase
        .from('members')
        .select('id')
        .in('church_id', churchIds)
        .eq('status', 'ativo')
        .range(f, t))
    : []
  const totalMembros = membersData.length

  const months = getLast12Months()
  const { first } = monthRange(months[0].year, months[0].month)
  const { last } = monthRange(months[11].year, months[11].month)

  const rows = await fetchAllPaged((f, t) => supabase
    .from('fin_lancamentos')
    .select('data_lancamento, member_id, categoria_id')
    .eq('church_group_id', groupId)
    .eq('tipo', 'entrada')
    .not('member_id', 'is', null)
    .gte('data_lancamento', first)
    .lte('data_lancamento', last)
    .range(f, t))

  return months.map(({ year, month }) => {
    const mesStr = `${year}-${pad(month)}`
    const mesRows = rows.filter(r => (r.data_lancamento as string).startsWith(mesStr))

    const setDizimo = new Set<string>()
    const setOutros = new Set<string>()
    for (const r of mesRows) {
      if (!r.member_id) continue
      if (dizimoCatIds.has(r.categoria_id)) setDizimo.add(r.member_id)
      else setOutros.add(r.member_id)
    }
    const setGeral = new Set([...setDizimo, ...setOutros])

    const pct = (n: number) => totalMembros > 0 ? (n / totalMembros) * 100 : 0
    return {
      label: `${MESES_CURTOS[month - 1]}/${String(year).slice(2)}`,
      mes: mesStr,
      pctGeral:  pct(setGeral.size),
      pctDizimo: pct(setDizimo.size),
      pctOutros: pct(setOutros.size),
      qtdGeral:  setGeral.size,
      qtdDizimo: setDizimo.size,
      qtdOutros: setOutros.size,
    }
  })
}

// ── membros de um título com ranking de contribuição ─────────────────────

export interface MembroDoTitulo {
  memberId: string
  nome: string
  totalContribuido: number
  qtdLancamentos: number
  contribuiu: boolean
}

export async function getMembrosDoTitulo(
  groupId: string,
  titulo: string,
  dataInicio: string,
  dataFim: string,
): Promise<MembroDoTitulo[]> {
  // Mesmas duas queries que getStatsPorTitulo usa (sem filtros extras que quebram)
  // busca igrejas do grupo + lançamentos em paralelo
  const [lancs, { data: churches, error: e2 }] = await Promise.all([
    fetchAllPaged((f, t) => supabase
      .from('fin_lancamentos')
      .select('member_id, valor')
      .eq('church_group_id', groupId)
      .eq('tipo', 'entrada')
      .not('member_id', 'is', null)
      .gte('data_lancamento', dataInicio)
      .lte('data_lancamento', dataFim)
      .range(f, t)),
    supabase
      .from('churches')
      .select('id')
      .eq('group_id', groupId),
  ])
  if (e2) throw e2

  const churchIds = (churches ?? []).map(c => c.id)

  // busca membros ativos das igrejas do grupo (paginado — pode passar de 1.000)
  const membrosAtivos = churchIds.length > 0
    ? await fetchAllPaged<{ id: string; name: string }>((f, t) => supabase
        .from('members')
        .select('id, name')
        .in('church_id', churchIds)
        .eq('status', 'ativo')
        .range(f, t))
    : []

  const activoIds = membrosAtivos.map(m => m.id)

  // busca member_ministry filtrado pelos ativos do grupo (paginado)
  const ministerios = activoIds.length > 0
    ? await fetchAllPaged((f, t) => supabase
        .from('member_ministry')
        .select('member_id, titles')
        .in('member_id', activoIds)
        .range(f, t))
    : []

  const memberMap = new Map(membrosAtivos.map(m => [m.id, m]))

  // filtra quem tem o título
  const tituloNorm = titulo.trim()
  const idsComTitulo = (ministerios ?? [])
    .filter(m => ((m.titles as string[]) ?? []).some(t => t.trim() === tituloNorm))
    .map(m => m.member_id)

  // mapa de contribuições por member_id
  const contribMap = new Map<string, { total: number; qtd: number }>()
  for (const l of (lancs ?? [])) {
    if (!l.member_id) continue
    const prev = contribMap.get(l.member_id) ?? { total: 0, qtd: 0 }
    contribMap.set(l.member_id, { total: prev.total + Number(l.valor), qtd: prev.qtd + 1 })
  }

  const result: MembroDoTitulo[] = []
  for (const id of idsComTitulo) {
    const member = memberMap.get(id)
    if (!member) continue
    const c = contribMap.get(id)
    result.push({
      memberId: id,
      nome: member.name,
      totalContribuido: c?.total ?? 0,
      qtdLancamentos: c?.qtd ?? 0,
      contribuiu: !!c && c.total > 0,
    })
  }

  return result.sort((a, b) => b.totalContribuido - a.totalContribuido)
}

// ── evolução de contribuição de um membro nos últimos 12 meses ────────────

export interface EvolucaoMembroMes {
  label: string
  mes: string
  total: number
  qtd: number
}

export async function getEvolucaoMembro(
  groupId: string,
  memberId: string,
): Promise<EvolucaoMembroMes[]> {
  const months = getLast12Months()
  const { first } = monthRange(months[0].year, months[0].month)
  const { last } = monthRange(months[11].year, months[11].month)

  const { data, error } = await supabase
    .from('fin_lancamentos')
    .select('valor, data_lancamento')
    .eq('church_group_id', groupId)
    .eq('member_id', memberId)
    .eq('tipo', 'entrada')
    .gte('data_lancamento', first)
    .lte('data_lancamento', last)
  if (error) throw error

  const rows = data ?? []

  return months.map(({ year, month }) => {
    const mesStr = `${year}-${pad(month)}`
    const mesRows = rows.filter(r => r.data_lancamento.startsWith(mesStr))
    return {
      label: `${MESES_CURTOS[month - 1]}/${String(year).slice(2)}`,
      mes: mesStr,
      total: mesRows.reduce((s, r) => s + Number(r.valor), 0),
      qtd: mesRows.length,
    }
  })
}

// ── Utilitário: período anterior de mesma duração ────────────────────────

export function getPeriodoAnteriorDatas(inicio: string, fim: string): { inicio: string; fim: string } {
  const d1 = new Date(inicio + 'T12:00:00')
  const d2 = new Date(fim + 'T12:00:00')
  const dias = Math.round((d2.getTime() - d1.getTime()) / 86400000) + 1
  const prevFim    = new Date(d1.getTime() - 86400000)
  const prevInicio = new Date(prevFim.getTime() - (dias - 1) * 86400000)
  return {
    inicio: prevInicio.toISOString().slice(0, 10),
    fim:    prevFim.toISOString().slice(0, 10),
  }
}

// ── KPIs do período ───────────────────────────────────────────────────────

export interface DashKpis {
  totalEntradas: number
  totalSaidas: number
  saldo: number
  ticketMedioEntrada: number
  qtdLancamentos: number
  qtdContribuintes: number
  totalCadastrados: number
  totalNaoCadastrados: number
  qtdCadastrados: number
  qtdNaoCadastrados: number
}

export async function getDashKpis(
  groupId: string,
  dataInicio: string,
  dataFim: string,
): Promise<DashKpis> {
  const rows = await fetchAllPaged((f, t) => supabase
    .from('fin_lancamentos')
    .select('tipo, valor, member_id, member_nome_manual')
    .eq('church_group_id', groupId)
    .gte('data_lancamento', dataInicio)
    .lte('data_lancamento', dataFim)
    .range(f, t))

  const entradas = rows.filter(r => r.tipo === 'entrada')
  const saidas = rows.filter(r => r.tipo === 'saida')
  const totalEntradas = entradas.reduce((s, r) => s + Number(r.valor), 0)
  const totalSaidas = saidas.reduce((s, r) => s + Number(r.valor), 0)

  const entradasCadastradas = entradas.filter(r => r.member_id)
  const entradasNaoCadastradas = entradas.filter(r => !r.member_id && r.member_nome_manual)

  const contribuintesIds = new Set(
    entradas.filter(r => r.member_id || r.member_nome_manual)
      .map(r => r.member_id ?? ('m::' + r.member_nome_manual))
  )
  const cadastradosIds = new Set(entradasCadastradas.map(r => r.member_id))
  const naoCadastradosNomes = new Set(entradasNaoCadastradas.map(r => r.member_nome_manual?.trim()).filter(Boolean))

  return {
    totalEntradas,
    totalSaidas,
    saldo: totalEntradas - totalSaidas,
    ticketMedioEntrada: entradas.length > 0 ? totalEntradas / entradas.length : 0,
    qtdLancamentos: rows.length,
    qtdContribuintes: contribuintesIds.size,
    totalCadastrados: entradasCadastradas.reduce((s, r) => s + Number(r.valor), 0),
    totalNaoCadastrados: entradasNaoCadastradas.reduce((s, r) => s + Number(r.valor), 0),
    qtdCadastrados: cadastradosIds.size,
    qtdNaoCadastrados: naoCadastradosNomes.size,
  }
}
