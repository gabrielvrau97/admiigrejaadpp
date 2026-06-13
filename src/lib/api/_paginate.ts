/**
 * Paginação para contornar o "Max Rows" do Supabase/PostgREST (1.000 por padrão).
 *
 * IMPORTANTE: `.limit(N)` NÃO ignora esse teto — o servidor aplica
 * `LEAST(limit, max_rows)`, então uma request única traz no máximo 1.000 linhas.
 * A única forma de trazer "todas" as linhas é paginar com `.range(from, to)`.
 *
 * Use em QUALQUER query cujo resultado completo seja necessário (somar, contar,
 * listar tudo). Queries com `.limit(N)` explícito para exibição (top N, busca)
 * NÃO precisam disso.
 *
 * Exemplo:
 *   const rows = await fetchAllPaged((from, to) =>
 *     supabase.from('tabela').select('*').eq('x', y).order('z').range(from, to))
 */
export async function fetchAllPaged<T = any>(
  build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: any }>,
  pageSize = 1000,
): Promise<T[]> {
  pageSize = Math.min(pageSize, 1000)
  let all: T[] = []
  let from = 0
  for (;;) {
    const { data, error } = await build(from, from + pageSize - 1)
    if (error) throw error
    const rows = data ?? []
    all = all.concat(rows)
    if (rows.length < pageSize) break
    from += pageSize
  }
  return all
}
