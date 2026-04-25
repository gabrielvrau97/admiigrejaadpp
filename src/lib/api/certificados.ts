import { supabase } from '../supabase'
import type { Certificado } from '../../types'

export async function listCertificados(): Promise<Certificado[]> {
  const { data, error } = await supabase
    .from('certificados')
    .select('*')
    .order('emitido_em', { ascending: false })
  if (error) throw error
  return (data ?? []) as Certificado[]
}

export async function createCertificado(c: Omit<Certificado, 'id' | 'created_at'>): Promise<Certificado> {
  const { data, error } = await supabase.from('certificados').insert(c).select('*').single()
  if (error) throw error
  return data as Certificado
}

export async function updateCertificado(id: string, patch: Partial<Certificado>): Promise<Certificado> {
  const { id: _omit, created_at, ...rest } = patch as Certificado
  void created_at
  const { data, error } = await supabase.from('certificados').update(rest).eq('id', id).select('*').single()
  if (error) throw error
  return data as Certificado
}

export async function deleteCertificado(id: string): Promise<void> {
  const { error } = await supabase.from('certificados').delete().eq('id', id)
  if (error) throw error
}
