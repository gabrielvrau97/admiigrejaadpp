import { supabase } from '../supabase'
import type { FinFornecedor } from '../../types'

export async function listFinFornecedores(groupId: string): Promise<FinFornecedor[]> {
  const { data, error } = await supabase
    .from('fin_fornecedores')
    .select('*')
    .eq('church_group_id', groupId)
    .order('nome')
  if (error) throw error
  return (data ?? []) as FinFornecedor[]
}

export async function searchFinFornecedores(groupId: string, q: string): Promise<FinFornecedor[]> {
  const { data, error } = await supabase
    .from('fin_fornecedores')
    .select('*')
    .eq('church_group_id', groupId)
    .eq('ativo', true)
    .ilike('nome', `%${q}%`)
    .order('nome')
    .limit(10)
  if (error) throw error
  return (data ?? []) as FinFornecedor[]
}

export async function createFinFornecedor(
  f: Omit<FinFornecedor, 'id' | 'created_at' | 'updated_at'>
): Promise<FinFornecedor> {
  const { data, error } = await supabase.from('fin_fornecedores').insert(f).select('*').single()
  if (error) throw error
  return data as FinFornecedor
}

export async function updateFinFornecedor(id: string, patch: Partial<FinFornecedor>): Promise<FinFornecedor> {
  const { id: _id, created_at, updated_at, ...rest } = patch as FinFornecedor
  void _id; void created_at; void updated_at
  const { data, error } = await supabase.from('fin_fornecedores').update(rest).eq('id', id).select('*').single()
  if (error) throw error
  return data as FinFornecedor
}

export async function deleteFinFornecedor(id: string): Promise<void> {
  const { error } = await supabase.from('fin_fornecedores').update({ ativo: false }).eq('id', id)
  if (error) throw error
}
