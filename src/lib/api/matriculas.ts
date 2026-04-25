import { supabase } from '../supabase'
import type { Matricula } from '../../types'

export async function listMatriculas(): Promise<Matricula[]> {
  const { data, error } = await supabase
    .from('matriculas')
    .select('*')
    .order('data_matricula', { ascending: false })
  if (error) throw error
  return (data ?? []) as Matricula[]
}

export async function createMatricula(m: Omit<Matricula, 'id' | 'created_at' | 'updated_at'>): Promise<Matricula> {
  const { data, error } = await supabase.from('matriculas').insert(m).select('*').single()
  if (error) throw error
  return data as Matricula
}

export async function updateMatricula(id: string, patch: Partial<Matricula>): Promise<Matricula> {
  const { id: _omit, created_at, updated_at, ...rest } = patch as Matricula
  void created_at; void updated_at
  const { data, error } = await supabase.from('matriculas').update(rest).eq('id', id).select('*').single()
  if (error) throw error
  return data as Matricula
}

export async function deleteMatricula(id: string): Promise<void> {
  const { error } = await supabase.from('matriculas').delete().eq('id', id)
  if (error) throw error
}
