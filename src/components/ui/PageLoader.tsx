import { Loader2 } from 'lucide-react'
import { Skeleton } from './Skeleton'

/**
 * Placeholder genérico para Suspense das rotas lazy.
 * Mostra um skeleton topo + spinner + linhas, simulando a estrutura
 * típica de uma página do sistema.
 */
export default function PageLoader() {
  return (
    <div className="space-y-4" role="status" aria-busy="true" aria-label="Carregando página">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10" rounded="lg" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-56" />
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-20" rounded="lg" />
        ))}
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
          <Loader2 size={16} className="animate-spin" />
          Carregando...
        </div>
      </div>
    </div>
  )
}
