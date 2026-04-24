import React from 'react'

type SkeletonProps = React.HTMLAttributes<HTMLDivElement> & {
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full'
}

/**
 * Retângulo pulsante cinza para preencher espaços enquanto dados carregam.
 * Use `className` pra definir width/height:
 *
 *   <Skeleton className="h-4 w-40" />
 *   <Skeleton className="h-10 w-10" rounded="full" />
 */
export function Skeleton({ className = '', rounded = 'md', ...rest }: SkeletonProps) {
  const roundedClass = {
    none: '',
    sm: 'rounded',
    md: 'rounded-md',
    lg: 'rounded-lg',
    full: 'rounded-full',
  }[rounded]

  return (
    <div
      role="status"
      aria-label="Carregando"
      aria-busy="true"
      className={`animate-pulse bg-gray-200/70 ${roundedClass} ${className}`}
      {...rest}
    />
  )
}

/**
 * Skeleton pronto pra N linhas de uma tabela com avatar + texto.
 * Usado enquanto a lista de membros/carteirinhas/certificados carrega.
 */
export function TableRowsSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="divide-y divide-gray-100">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3 p-3">
          <Skeleton className="w-9 h-9" rounded="full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="h-2.5 w-1/3" />
          </div>
          <Skeleton className="h-6 w-16" rounded="full" />
        </div>
      ))}
    </div>
  )
}
