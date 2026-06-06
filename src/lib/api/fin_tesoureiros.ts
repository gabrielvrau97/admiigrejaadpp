import { supabase, APP_GROUP_ID } from '../supabase'

export interface FinTesoureiro {
  id: string
  church_group_id: string
  nome: string
  ativo: boolean
  ordem: number
  created_at: string
}

export async function listFinTesoureiros(groupId: string = APP_GROUP_ID): Promise<FinTesoureiro[]> {
  const { data, error } = await supabase
    .from('fin_tesoureiros')
    .select('*')
    .eq('church_group_id', groupId)
    .order('ordem', { ascending: true })
    .order('nome', { ascending: true })
  if (error) throw error
  return (data ?? []) as FinTesoureiro[]
}

export async function createFinTesoureiro(nome: string): Promise<FinTesoureiro> {
  const { data, error } = await supabase
    .from('fin_tesoureiros')
    .insert({ nome: nome.trim(), church_group_id: APP_GROUP_ID })
    .select('*')
    .single()
  if (error) throw error
  return data as FinTesoureiro
}

export async function updateFinTesoureiro(id: string, updates: Partial<Pick<FinTesoureiro, 'nome' | 'ativo' | 'ordem'>>): Promise<void> {
  const { error } = await supabase
    .from('fin_tesoureiros')
    .update(updates)
    .eq('id', id)
  if (error) throw error
}

export async function deleteFinTesoureiro(id: string): Promise<void> {
  const { error } = await supabase
    .from('fin_tesoureiros')
    .delete()
    .eq('id', id)
  if (error) throw error
}
