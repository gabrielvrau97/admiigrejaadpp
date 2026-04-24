import React from 'react'
import { format, differenceInYears } from 'date-fns'
import type { Member } from '../../types'

export type ColKey =
  | 'nome' | 'apelido' | 'idade' | 'sexo' | 'estado_civil' | 'nascimento'
  | 'nacionalidade' | 'identidade' | 'cpf' | 'naturalidade' | 'escolaridade'
  | 'profissao' | 'codigo' | 'historico' | 'credencial'
  | 'email1' | 'email2' | 'telefone1' | 'telefone2' | 'celular1' | 'celular2'
  | 'cep' | 'endereco' | 'numero' | 'complemento' | 'sub_bairro' | 'bairro' | 'cidade' | 'estado' | 'pais'
  | 'titulo' | 'ministerio' | 'departamento' | 'funcao'
  | 'batismo_aguas' | 'batismo_espirito' | 'conversao'
  | 'igreja' | 'status'

export interface ColDef {
  key: ColKey
  label: string
  group: string
  render: (m: Member) => React.ReactNode
}

function civilLabel(cs?: string) {
  const map: Record<string, string> = {
    solteiro: 'Solteiro(a)', casado: 'Casado(a)',
    viuvo: 'Viúvo(a)', divorciado: 'Divorciado(a)', uniao_estavel: 'União Estável',
  }
  return cs ? (map[cs] ?? cs) : '—'
}

export const ALL_COLUMNS: ColDef[] = [
  // Perfil
  { key: 'nome', label: 'Nome', group: 'Perfil', render: m => m.name },
  { key: 'apelido', label: 'Apelido', group: 'Perfil', render: m => m.apelido ?? '—' },
  { key: 'idade', label: 'Idade', group: 'Perfil', render: m => m.birth_date ? `${differenceInYears(new Date(), new Date(m.birth_date + 'T00:00:00'))} anos` : '—' },
  { key: 'sexo', label: 'Sexo', group: 'Perfil', render: m => m.sex === 'masculino' ? 'Masculino' : m.sex === 'feminino' ? 'Feminino' : '—' },
  { key: 'estado_civil', label: 'Estado civil', group: 'Perfil', render: m => civilLabel(m.civil_status) },
  { key: 'nascimento', label: 'Data de nascimento', group: 'Perfil', render: m => m.birth_date ? format(new Date(m.birth_date + 'T00:00:00'), 'dd/MM/yyyy') : '—' },
  { key: 'nacionalidade', label: 'Nacionalidade', group: 'Perfil', render: m => m.nationality ?? '—' },
  { key: 'identidade', label: 'Identidade', group: 'Perfil', render: m => m.identity ?? '—' },
  { key: 'cpf', label: 'CPF', group: 'Perfil', render: m => m.cpf ?? '—' },
  { key: 'naturalidade', label: 'Naturalidade', group: 'Perfil', render: m => m.naturalidade ?? '—' },
  { key: 'escolaridade', label: 'Escolaridade', group: 'Perfil', render: m => m.schooling ?? '—' },
  { key: 'profissao', label: 'Profissão', group: 'Perfil', render: m => m.occupation ?? '—' },
  { key: 'codigo', label: 'Código auxiliar', group: 'Perfil', render: m => m.code ?? '—' },
  { key: 'credencial', label: 'Credencial', group: 'Perfil', render: _ => '—' },
  { key: 'historico', label: 'Histórico', group: 'Perfil', render: _ => '—' },
  // Contatos
  { key: 'email1', label: 'E-mail 1', group: 'Contatos', render: m => m.contacts?.emails?.[0] ?? '—' },
  { key: 'email2', label: 'E-mail 2', group: 'Contatos', render: m => m.contacts?.emails?.[1] ?? '—' },
  { key: 'telefone1', label: 'Telefone 1', group: 'Contatos', render: m => m.contacts?.phones?.[0] ?? '—' },
  { key: 'telefone2', label: 'Telefone 2', group: 'Contatos', render: m => m.contacts?.phones?.[1] ?? '—' },
  { key: 'celular1', label: 'Celular 1', group: 'Contatos', render: m => m.contacts?.cellphone1 ?? m.contacts?.phones?.[0] ?? '—' },
  { key: 'celular2', label: 'Celular 2', group: 'Contatos', render: m => m.contacts?.phones?.[1] ?? '—' },
  { key: 'cep', label: 'CEP', group: 'Contatos', render: m => m.contacts?.cep ?? '—' },
  { key: 'endereco', label: 'Endereço', group: 'Contatos', render: m => m.contacts?.address ?? '—' },
  { key: 'numero', label: 'Número', group: 'Contatos', render: m => m.contacts?.number ?? '—' },
  { key: 'complemento', label: 'Complemento', group: 'Contatos', render: m => m.contacts?.complement ?? '—' },
  { key: 'sub_bairro', label: 'Sub-bairro', group: 'Contatos', render: _ => '—' },
  { key: 'bairro', label: 'Bairro', group: 'Contatos', render: m => m.contacts?.neighborhood ?? '—' },
  { key: 'cidade', label: 'Cidade', group: 'Contatos', render: m => m.contacts?.city ?? '—' },
  { key: 'estado', label: 'Estado', group: 'Contatos', render: m => m.contacts?.state ?? '—' },
  { key: 'pais', label: 'País', group: 'Contatos', render: m => m.contacts?.country ?? 'Brasil' },
  // Ministério
  { key: 'titulo', label: 'Título', group: 'Ministério', render: m => m.ministry?.titles?.[0] ?? '—' },
  { key: 'ministerio', label: 'Ministério', group: 'Ministério', render: m => m.ministry?.ministries?.[0] ?? '—' },
  { key: 'departamento', label: 'Departamento', group: 'Ministério', render: m => m.ministry?.departments?.[0] ?? '—' },
  { key: 'funcao', label: 'Função', group: 'Ministério', render: m => m.ministry?.functions?.[0] ?? '—' },
  // Espiritual
  { key: 'batismo_aguas', label: 'Batismo nas águas', group: 'Espiritual', render: m => m.baptism ? (m.baptism_date ? format(new Date(m.baptism_date), 'dd/MM/yyyy') : 'Sim') : 'Não' },
  { key: 'batismo_espirito', label: 'Batismo no Espírito', group: 'Espiritual', render: m => m.baptism_spirit ? 'Sim' : 'Não' },
  { key: 'conversao', label: 'Conversão', group: 'Espiritual', render: m => m.conversion ? (m.conversion_date ? format(new Date(m.conversion_date), 'dd/MM/yyyy') : 'Sim') : 'Não' },
  // Admin
  { key: 'igreja', label: 'Igreja', group: 'Administrativo', render: m => m.church?.name ?? '—' },
  { key: 'status', label: 'Status', group: 'Administrativo', render: m => m.status },
]

export const DEFAULT_COLS: ColKey[] = ['nome', 'nascimento', 'estado_civil', 'status', 'celular1', 'titulo', 'igreja']
export const MAX_COLS = 10
