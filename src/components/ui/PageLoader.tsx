import { Loader2 } from 'lucide-react'

export default function PageLoader() {
  return (
    <div className="min-h-[40vh] flex items-center justify-center">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Loader2 size={16} className="animate-spin" />
        Carregando...
      </div>
    </div>
  )
}
