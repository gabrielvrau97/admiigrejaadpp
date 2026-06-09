import { supabase } from '../supabase'
import type { FinLancamento } from '../../types'
import { fetchAllPaged } from './_paginate'

const LANCAMENTO_COLUMNS = `
  *,
  categoria:fin_categorias!categoria_id ( id, nome, cor, tipo ),
  fornecedor:fin_fornecedores!fornecedor_id ( id, nome ),
  member:members!member_id ( id, name, apelido ),
  church:churches!church_id ( id, name ),
  created_by_user:app_users!created_by ( id, name ),
  tesoureiro:fin_tesoureiros!tesoureiro_id ( id, nome )
`

export interface FinLancamentoFilters {
  groupId: string
  churchId?: string
  tipo?: 'entrada' | 'saida'
  categoriaId?: string
  memberId?: string
  createdBy?: string
  dataInicio?: string
  dataFim?: string
  origem?: 'manual' | 'importado'
}

export async function listFinLancamentos(filters: FinLancamentoFilters): Promise<FinLancamento[]> {
  // Pagina via .range() — o Supabase corta cada request em 1.000 linhas (Max Rows).
  const rows = await fetchAllPaged<FinLancamento>((from, to) => {
    let q = supabase
      .from('fin_lancamentos')
      .select(LANCAMENTO_COLUMNS)
      .eq('church_group_id', filters.groupId)
      .order('data_lancamento', { ascending: false })
      .order('created_at', { ascending: false })

    if (filters.churchId) q = q.eq('church_id', filters.churchId)
    if (filters.tipo) q = q.eq('tipo', filters.tipo)
    if (filters.categoriaId) q = q.eq('categoria_id', filters.categoriaId)
    if (filters.memberId) q = q.eq('member_id', filters.memberId)
    if (filters.createdBy) q = q.eq('created_by', filters.createdBy)
    if (filters.dataInicio) q = q.gte('data_lancamento', filters.dataInicio)
    if (filters.dataFim) q = q.lte('data_lancamento', filters.dataFim)
    if (filters.origem) q = q.eq('origem', filters.origem)

    return q.range(from, to) as unknown as PromiseLike<{ data: FinLancamento[] | null; error: any }>
  })
  return rows
}

export async function listFinLancamentosHoje(groupId: string): Promise<FinLancamento[]> {
  const now = new Date()
  const hoje = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  // filtra por registered_at (data em que foi gravado), não por data_lancamento
  const { data, error } = await supabase
    .from('fin_lancamentos')
    .select(LANCAMENTO_COLUMNS)
    .eq('church_group_id', groupId)
    .gte('registered_at', `${hoje}T00:00:00`)
    .lte('registered_at', `${hoje}T23:59:59`)
    .order('registered_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as FinLancamento[]
}

export async function createFinLancamento(
  l: Omit<FinLancamento, 'id' | 'created_at' | 'updated_at' | 'categoria' | 'fornecedor' | 'member' | 'church' | 'created_by_user'>
): Promise<FinLancamento> {
  const { data, error } = await supabase
    .from('fin_lancamentos')
    .insert(l)
    .select(LANCAMENTO_COLUMNS)
    .single()
  if (error) throw error
  return data as FinLancamento
}

export async function updateFinLancamento(id: string, patch: Partial<FinLancamento>): Promise<FinLancamento> {
  const { id: _id, created_at, updated_at, categoria, fornecedor, member, church, created_by_user, tesoureiro, ...rest } = patch as FinLancamento
  void _id; void created_at; void updated_at; void categoria; void fornecedor; void member; void church; void created_by_user; void tesoureiro
  const { data, error } = await supabase
    .from('fin_lancamentos')
    .update(rest)
    .eq('id', id)
    .select(LANCAMENTO_COLUMNS)
    .single()
  if (error) throw error
  return data as FinLancamento
}

export async function deleteFinLancamento(id: string): Promise<void> {
  const { error } = await supabase.from('fin_lancamentos').delete().eq('id', id)
  if (error) throw error
}

/**
 * Soma todas as entradas e saídas ANTERIORES a `dataCorte` (exclusive).
 * Usado para calcular o saldo acumulado que antecede o período filtrado.
 */
export async function getSaldoAcumuladoAte(groupId: string, dataCorte: string): Promise<number> {
  const rows = await fetchAllPaged((f, t) => supabase
    .from('fin_lancamentos')
    .select('tipo, valor')
    .eq('church_group_id', groupId)
    .lt('data_lancamento', dataCorte)
    .range(f, t))

  const entradas = rows.filter(r => r.tipo === 'entrada').reduce((s, r) => s + Number(r.valor), 0)
  const saidas = rows.filter(r => r.tipo === 'saida').reduce((s, r) => s + Number(r.valor), 0)
  return entradas - saidas
}

// Resumo do dia (caixa) para um usuário — filtra por registered_at (dia de registro)
export async function getFinCaixaDia(userId: string, groupId: string): Promise<{ entradas: number; saidas: number }> {
  const now = new Date()
  const hoje = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const { data, error } = await supabase
    .from('fin_lancamentos')
    .select('tipo, valor')
    .eq('church_group_id', groupId)
    .eq('created_by', userId)
    .gte('registered_at', `${hoje}T00:00:00`)
    .lte('registered_at', `${hoje}T23:59:59`)
  if (error) throw error
  const rows = data ?? []
  const entradas = rows.filter(r => r.tipo === 'entrada').reduce((s, r) => s + Number(r.valor), 0)
  const saidas = rows.filter(r => r.tipo === 'saida').reduce((s, r) => s + Number(r.valor), 0)
  return { entradas, saidas }
}
