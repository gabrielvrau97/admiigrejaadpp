import { supabase } from '../supabase'
import type { Seminario } from '../../types'
import { fetchAllPaged } from './_paginate'

export async function listSeminarios(): Promise<Seminario[]> {
  // Pagina via .range() — o Supabase corta cada request em 1.000 linhas (Max Rows).
  const data = await fetchAllPaged<Seminario>((from, to) => supabase
    .from('seminarios')
    .select('*')
    .order('data_inicio', { ascending: false })
    .range(from, to))
  return data
}

export async function createSeminario(s: Omit<Seminario, 'id' | 'created_at' | 'updated_at'>): Promise<Seminario> {
  const { data, error } = await supabase.from('seminarios').insert(s).select('*').single()
  if (error) throw error
  return data as Seminario
}

export async function updateSeminario(id: string, patch: Partial<Seminario>): Promise<Seminario> {
  const { id: _omit, created_at, updated_at, ...rest } = patch as Seminario
  void created_at; void updated_at
  const { data, error } = await supabase.from('seminarios').update(rest).eq('id', id).select('*').single()
  if (error) throw error
  return data as Seminario
}

export async function deleteSeminario(id: string): Promise<void> {
  const { error: errCert } = await supabase.from('certificados').delete().eq('seminario_id', id)
  if (errCert) throw errCert
  const { error } = await supabase.from('seminarios').delete().eq('id', id)
  if (error) throw error
}
