import { z } from 'zod'

const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD')

export const seminarioStatusSchema = z.enum([
  'em_andamento', 'concluido', 'cancelado', 'planejado',
])

export const matriculaSituacaoSchema = z.enum([
  'cursando', 'concluido', 'desistente', 'reprovado', 'trancado',
])

export const seminarioFormSchema = z.object({
  nome: z.string().trim().min(1, 'Nome do seminário é obrigatório'),
  descricao: z.string().optional(),
  instrutor: z.string().optional(),
  data_inicio: dateStringSchema,
  data_fim: dateStringSchema.optional().or(z.literal('')),
  carga_horaria: z.number().int().min(0, 'Carga horária deve ser ≥ 0'),
  local: z.string().optional(),
  church_id: z.string().optional(),
  status: seminarioStatusSchema,
}).refine(
  data => !data.data_fim || data.data_fim >= data.data_inicio,
  { path: ['data_fim'], message: 'Data final deve ser ≥ data de início' },
)

export type SeminarioFormData = z.infer<typeof seminarioFormSchema>

export const matriculaFormSchema = z.object({
  nome: z.string().trim().min(1, 'Nome do aluno é obrigatório'),
  apelido: z.string().optional(),
  cpf: z.string().optional(),
  birth_date: dateStringSchema.optional().or(z.literal('')),
  sex: z.enum(['masculino', 'feminino']).optional(),
  email: z.string().email('E-mail inválido').optional().or(z.literal('')),
  telefone: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().max(2, 'Use a sigla do estado (2 letras)').optional(),
  church_id: z.string().optional(),
  member_id: z.string().optional(),
  situacao: matriculaSituacaoSchema,
  nota_final: z.number().min(0).max(10, 'Nota deve estar entre 0 e 10').optional(),
  frequencia: z.number().min(0).max(100, 'Frequência deve estar entre 0 e 100').optional(),
  data_matricula: dateStringSchema,
  data_conclusao: dateStringSchema.optional().or(z.literal('')),
  observacoes: z.string().optional(),
})

export type MatriculaFormData = z.infer<typeof matriculaFormSchema>
