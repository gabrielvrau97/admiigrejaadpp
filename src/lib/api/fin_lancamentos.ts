import { supabase } from '../supabase'
import type { FinLancamento } from '../../types'

const LANCAMENTO_COLUMNS = `
  *,
  categoria:fin_categorias!categoria_id ( id, nome, cor, tipo ),
  fornecedor:fin_fornecedores!fornecedor_id ( id, nome ),
  member:members!member_id ( id, name, apelido ),
  church:churches!church_id ( id, name ),
  created_by_user:app_users!created_by ( id, name )
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

  const { data, error } = await q
  if (error) throw error
  return (data ?? []) as FinLancamento[]
}

export async function listFinLancamentosHoje(userId: string, groupId: string): Promise<FinLancamento[]> {
  const hoje = new Date().toISOString().slice(0, 10)
  const { data, error } = await supabase
    .from('fin_lancamentos')
    .select(LANCAMENTO_COLUMNS)
    .eq('church_group_id', groupId)
    .eq('created_by', userId)
    .eq('data_lancamento', hoje)
    .order('created_at', { ascending: false })
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
  const { id: _id, created_at, updated_at, categoria, fornecedor, member, church, created_by_user, ...rest } = patch as FinLancamento
  void _id; void created_at; void updated_at; void categoria; void fornecedor; void member; void church; void created_by_user
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

// Resumo do dia (caixa) para um usuário
export async function getFinCaixaDia(userId: string, groupId: string): Promise<{ entradas: number; saidas: number }> {
  const hoje = new Date().toISOString().slice(0, 10)
  const { data, error } = await supabase
    .from('fin_lancamentos')
    .select('tipo, valor')
    .eq('church_group_id', groupId)
    .eq('created_by', userId)
    .eq('data_lancamento', hoje)
  if (error) throw error
  const rows = data ?? []
  const entradas = rows.filter(r => r.tipo === 'entrada').reduce((s, r) => s + Number(r.valor), 0)
  const saidas = rows.filter(r => r.tipo === 'saida').reduce((s, r) => s + Number(r.valor), 0)
  return { entradas, saidas }
}
