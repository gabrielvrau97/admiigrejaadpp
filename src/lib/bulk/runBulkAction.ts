/**
 * Executa uma ação async em N itens, em chunks paralelos.
 * Captura erros individuais sem abortar o lote inteiro.
 *
 * Uso:
 *   const result = await runBulkAction(
 *     ids,
 *     (id) => saveMember({ id, status: 'inativo' }),
 *     { chunkSize: 5, onProgress: (done, total) => setPct(done/total) }
 *   )
 *   // result.ok, result.errors, result.total
 */

export interface BulkActionResult<T = unknown> {
  total: number
  ok: number
  errors: Array<{ id: string; error: unknown }>
  results: Array<{ id: string; ok: boolean; data?: T; error?: unknown }>
}

export interface BulkActionOptions {
  chunkSize?: number
  onProgress?: (done: number, total: number) => void
}

export async function runBulkAction<T = unknown>(
  ids: string[],
  fn: (id: string) => Promise<T>,
  opts: BulkActionOptions = {},
): Promise<BulkActionResult<T>> {
  const { chunkSize = 5, onProgress } = opts
  const total = ids.length
  const results: BulkActionResult<T>['results'] = []
  let done = 0

  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize)
    const settled = await Promise.allSettled(chunk.map(id => fn(id)))
    settled.forEach((res, idx) => {
      const id = chunk[idx]
      if (res.status === 'fulfilled') {
        results.push({ id, ok: true, data: res.value })
      } else {
        results.push({ id, ok: false, error: res.reason })
      }
      done += 1
      onProgress?.(done, total)
    })
  }

  const errors = results.filter(r => !r.ok).map(r => ({ id: r.id, error: r.error }))
  return {
    total,
    ok: results.filter(r => r.ok).length,
    errors,
    results,
  }
}
