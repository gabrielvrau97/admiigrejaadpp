import { z } from 'zod'

export const carteirinhaMotivoSchema = z.enum([
  'primeira_via', 'renovacao', 'segunda_via', 'atualizacao_dados',
])

export const carteirinhaStatusSchema = z.enum([
  'ativa', 'vencida', 'cancelada', 'substituida',
])

export const carteirinhaGerarSchema = z.object({
  member_id: z.string().min(1, 'Selecione um membro'),
  motivo: carteirinhaMotivoSchema,
  validade_anos: z.number().int().min(1).max(10, 'Validade entre 1 e 10 anos'),
})

export type CarteirinhaGerarFormData = z.infer<typeof carteirinhaGerarSchema>

/**
 * Helper puro: calcula a data de validade (YYYY-MM-DD) a partir de
 * uma data de emissão e anos de validade.
 */
export function calcularValidadeCarteirinha(emissaoISO: string, anos: number): string {
  const d = new Date(emissaoISO + 'T00:00:00')
  d.setFullYear(d.getFullYear() + anos)
  return d.toISOString().split('T')[0]
}

/**
 * Helper puro: gera o próximo número sequencial no padrão "PREFIXO-YYYY-NNNN".
 */
export function gerarNumeroSequencial(prefixo: string, ano: number, seq: number): string {
  return `${prefixo}-${ano}-${String(seq).padStart(4, '0')}`
}
