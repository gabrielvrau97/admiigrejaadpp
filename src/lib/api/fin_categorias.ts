import { supabase } from '../supabase'
import type { FinCategoria, FinTipo } from '../../types'

export async function listFinCategorias(groupId: string): Promise<FinCategoria[]> {
  const { data, error } = await supabase
    .from('fin_categorias')
    .select('*')
    .eq('church_group_id', groupId)
    .order('tipo')
    .order('nome')
  if (error) throw error
  return (data ?? []) as FinCategoria[]
}

export async function listFinCategoriasByTipo(groupId: string, tipo: FinTipo): Promise<FinCategoria[]> {
  const { data, error } = await supabase
    .from('fin_categorias')
    .select('*')
    .eq('church_group_id', groupId)
    .eq('tipo', tipo)
    .eq('ativo', true)
    .order('nome')
  if (error) throw error
  return (data ?? []) as FinCategoria[]
}

export async function createFinCategoria(
  c: Omit<FinCategoria, 'id' | 'created_at' | 'updated_at'>
): Promise<FinCategoria> {
  const { data, error } = await supabase.from('fin_categorias').insert(c).select('*').single()
  if (error) throw error
  return data as FinCategoria
}

export async function updateFinCategoria(id: string, patch: Partial<FinCategoria>): Promise<FinCategoria> {
  const { id: _id, created_at, updated_at, ...rest } = patch as FinCategoria
  void _id; void created_at; void updated_at
  const { data, error } = await supabase.from('fin_categorias').update(rest).eq('id', id).select('*').single()
  if (error) throw error
  return data as FinCategoria
}

export async function deleteFinCategoria(id: string): Promise<void> {
  const { error } = await supabase.from('fin_categorias').update({ ativo: false }).eq('id', id)
  if (error) throw error
}

export async function seedFinCategorias(groupId: string): Promise<void> {
  const { error } = await supabase.rpc('seed_fin_categorias', { p_group_id: groupId })
  if (error) throw error
}
