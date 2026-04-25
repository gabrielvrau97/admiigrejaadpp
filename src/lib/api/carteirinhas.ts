import { supabase } from '../supabase'
import type { Carteirinha } from '../../types'

export async function listCarteirinhas(): Promise<Carteirinha[]> {
  const { data, error } = await supabase
    .from('carteirinhas')
    .select('*')
    .order('emitida_em', { ascending: false })
  if (error) throw error
  return (data ?? []) as Carteirinha[]
}

export async function createCarteirinha(c: Omit<Carteirinha, 'id' | 'created_at'>): Promise<Carteirinha> {
  const { data, error } = await supabase.from('carteirinhas').insert(c).select('*').single()
  if (error) throw error
  return data as Carteirinha
}

export async function updateCarteirinha(id: string, patch: Partial<Carteirinha>): Promise<Carteirinha> {
  const { id: _omit, created_at, ...rest } = patch as Carteirinha
  void created_at
  const { data, error } = await supabase.from('carteirinhas').update(rest).eq('id', id).select('*').single()
  if (error) throw error
  return data as Carteirinha
}

export async function deleteCarteirinha(id: string): Promise<void> {
  const { error } = await supabase.from('carteirinhas').delete().eq('id', id)
  if (error) throw error
}
