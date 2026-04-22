import React from 'react'
import { Link } from 'react-router-dom'
import { Home } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-center">
      <div className="text-6xl font-bold text-gray-200 mb-2">404</div>
      <h2 className="text-lg font-semibold text-gray-600 mb-1">Página não encontrada</h2>
      <p className="text-sm text-gray-400 mb-4">Esta página está em desenvolvimento ou não existe.</p>
      <Link to="/dashboard" className="btn-primary">
        <Home size={14} /> Voltar ao painel
      </Link>
    </div>
  )
}
