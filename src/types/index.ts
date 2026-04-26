export type UserRole = 'master' | 'admin' | 'secretaria' | 'visualizador'
export type ChurchType = 'sede' | 'filial'
export type MemberStatus = 'ativo' | 'inativo' | 'indisponivel' | 'deleted'
export type BloodType = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-'
export type CivilStatus = 'solteiro' | 'casado' | 'uniao_estavel' | 'divorciado' | 'viuvo'
export type Sex = 'masculino' | 'feminino'

export interface ChurchGroup {
  id: string
  name: string
  created_at: string
}

export interface Church {
  id: string
  group_id: string
  name: string
  type: ChurchType
  address?: string
  phone?: string
  email?: string
  logo_url?: string
}

export interface Member {
  id: string
  church_id: string
  member_type?: 'membro' | 'visitante' | 'seminarista'
  status: MemberStatus
  name: string
  apelido?: string
  sex?: Sex
  birth_date?: string
  civil_status?: CivilStatus
  nationality?: string
  naturalidade?: string
  cpf?: string
  identity?: string
  schooling?: string
  occupation?: string
  code?: string
  entry_date?: string
  entry_reason?: string
  entry_reason_other?: string
  origin_church?: string
  how_arrived?: string
  how_arrived_other?: string
  novo_convertido?: boolean
  exit_date?: string
  exit_reason?: string
  exit_reason_other?: string
  baptism?: boolean
  baptism_date?: string
  baptism_spirit?: boolean
  baptism_spirit_date?: string
  conversion?: boolean
  conversion_date?: string
  imprimir_credencial?: boolean
  notes?: string
  created_at: string
  updated_at: string
  // joined relations
  church?: Church
  contacts?: MemberContact
  ministry?: MemberMinistry
  family?: MemberFamily
}

export interface MemberFamily {
  member_id?: string
  spouse_id?: string
  spouse_name?: string
  spouse_birth_date?: string
  wedding_date?: string
  father_id?: string
  father_name?: string
  mother_id?: string
  mother_name?: string
  children?: FamilyChild[]
}

export interface FamilyChild {
  id?: string
  name: string
  birth_date?: string
}

export interface MemberContact {
  member_id?: string
  emails?: string[]
  phones?: string[]
  cellphone1?: string
  cep?: string
  address?: string
  number?: string
  complement?: string
  neighborhood?: string
  city?: string
  state?: string
  country?: string
}

export interface MemberMinistry {
  member_id?: string
  ministries?: string[]
  departments?: string[]
  titles?: string[]
  functions?: string[]
  companion?: string
  companion_id?: string
  discipler_id?: string
}

export interface AppUser {
  id: string
  email: string
  role: UserRole
  church_group_id: string
  church_ids: string[]
  name?: string
}

export interface Notification {
  id: string
  church_group_id: string
  type: string
  message: string
  read: boolean
  created_at: string
}

export type QuickFilter =
  | 'novos' | 'ativos' | 'inativos' | 'indisponiveis'
  | 'lideres_familia' | 'com_foto' | 'sem_foto'
  | 'batizados_com_data' | 'batizados_sem_data'
  | 'batizados_espirito_com_data' | 'batizados_espirito_sem_data'
  | 'convertidos_com_data' | 'convertidos_sem_data'
  | 'aniversariantes_hoje' | 'aniversariantes_semana' | 'aniversariantes_mes'
  | 'casados_hoje' | 'casados_semana' | 'casados_mes'
  | 'celula' | 'sem_celula'

export type MemberType = 'membros' | 'visitantes' | 'criancas' | 'adolescentes' | 'jovens' | 'novos_convertidos'

export interface BaptismYearStat {
  year: number
  count: number
}

// ── Seminários ────────────────────────────────────────────────────────────
export type SeminarioStatus = 'em_andamento' | 'concluido' | 'cancelado' | 'planejado'
export type MatriculaSituacao = 'cursando' | 'concluido' | 'desistente' | 'reprovado' | 'trancado'

export interface Seminario {
  id: string
  nome: string
  descricao?: string
  instrutor?: string
  data_inicio: string
  data_fim?: string
  carga_horaria: number
  local?: string
  church_id?: string
  status: SeminarioStatus
  created_at: string
  updated_at: string
}

export interface Matricula {
  id: string
  seminario_id: string
  // Se vinculado a um membro existente, guarda o ID. Caso contrário, dados avulsos.
  member_id?: string
  // Dados do aluno (snapshot — se member_id existir, são espelhados do membro no momento da matrícula)
  nome: string
  apelido?: string
  cpf?: string
  birth_date?: string
  sex?: Sex
  email?: string
  telefone?: string
  cidade?: string
  estado?: string
  church_id?: string
  situacao: MatriculaSituacao
  nota_final?: number
  frequencia?: number  // 0-100
  data_matricula: string
  data_conclusao?: string
  observacoes?: string
  created_at: string
  updated_at: string
}

// ── Carteirinhas ──────────────────────────────────────────────────────────
export type CarteirinhaMotivo = 'primeira_via' | 'renovacao' | 'segunda_via' | 'atualizacao_dados'
export type CarteirinhaStatus = 'ativa' | 'vencida' | 'cancelada' | 'substituida'

export interface Carteirinha {
  id: string
  member_id: string
  numero: string  // ex: ADP-2026-0001
  motivo: CarteirinhaMotivo
  emitida_em: string
  valida_ate: string  // geralmente 2 anos após emissão
  emitida_por?: string  // nome do usuário que gerou
  status: CarteirinhaStatus
  observacoes?: string
  created_at: string
}

// ── Certificados ──────────────────────────────────────────────────────────
export type CertificadoStatus = 'emitido' | 'cancelado' | 'reemitido'

export interface Certificado {
  id: string
  matricula_id: string
  seminario_id: string
  numero: string  // ex: CERT-2026-0001
  nome_aluno: string
  nome_seminario: string
  carga_horaria: number
  data_conclusao: string
  emitido_em: string
  emitido_por?: string
  status: CertificadoStatus
  observacoes?: string
  created_at: string
}
