import { z } from 'zod'

/**
 * Valida um CPF usando o algoritmo oficial dos dígitos verificadores.
 * Aceita string com ou sem máscara.
 */
export function isValidCPF(cpf: string): boolean {
  const c = cpf.replace(/\D/g, '')
  if (c.length !== 11 || /^(\d)\1+$/.test(c)) return false
  let sum = 0
  for (let i = 0; i < 9; i++) sum += parseInt(c[i]) * (10 - i)
  let r = (sum * 10) % 11
  if (r === 10 || r === 11) r = 0
  if (r !== parseInt(c[9])) return false
  sum = 0
  for (let i = 0; i < 10; i++) sum += parseInt(c[i]) * (11 - i)
  r = (sum * 10) % 11
  if (r === 10 || r === 11) r = 0
  return r === parseInt(c[10])
}

// Helper: data no formato YYYY-MM-DD (o tipo Member guarda datas assim)
const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD')

export const cpfSchema = z
  .string()
  .refine(v => v === '' || isValidCPF(v), { message: 'CPF inválido' })

export const emailSchema = z
  .string()
  .email('E-mail inválido')
  .or(z.literal(''))

export const sexSchema = z.enum(['masculino', 'feminino'])

export const civilStatusSchema = z.enum([
  'solteiro', 'casado', 'uniao_estavel', 'divorciado', 'viuvo',
])

export const memberStatusSchema = z.enum([
  'ativo', 'inativo', 'indisponivel', 'deleted',
])

/**
 * Schema "leve" pro formulário de membro — não exige todos os campos,
 * só valida os que o usuário preencheu.
 * Campos com regras específicas (CPF, email, data) são validados.
 */
export const memberFormSchema = z.object({
  name: z.string().trim().min(1, 'Nome é obrigatório'),
  apelido: z.string().optional(),
  sex: sexSchema.optional(),
  birth_date: dateStringSchema.optional().or(z.literal('')),
  civil_status: civilStatusSchema.optional(),
  nationality: z.string().optional(),
  naturalidade: z.string().optional(),
  cpf: cpfSchema.optional(),
  identity: z.string().optional(),
  schooling: z.string().optional(),
  occupation: z.string().optional(),
  status: memberStatusSchema,
  church_id: z.string().optional(),
  notes: z.string().optional(),
})

export type MemberFormData = z.infer<typeof memberFormSchema>
