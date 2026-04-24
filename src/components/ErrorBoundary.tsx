import React from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

interface Props {
  children: React.ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary] Uncaught error:', error, info)
  }

  handleReload = () => {
    window.location.reload()
  }

  handleGoHome = () => {
    window.location.href = '/dashboard'
  }

  handleTryAgain = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (!this.state.hasError) return this.props.children

    const msg = this.state.error?.message ?? 'Erro desconhecido'

    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="bg-white border border-red-200 rounded-xl shadow-md max-w-lg w-full p-6 sm:p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-red-50 border border-red-200 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={28} className="text-red-500" />
          </div>

          <h1 className="text-lg font-bold text-gray-800 mb-1">Algo deu errado</h1>
          <p className="text-sm text-gray-500 mb-4">
            Ocorreu um erro inesperado ao exibir esta página. Você pode tentar novamente ou voltar para o início.
          </p>

          <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 mb-5 text-left overflow-x-auto">
            <code className="text-xs text-red-700 break-all">{msg}</code>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2">
            <button onClick={this.handleTryAgain} className="btn-outline flex items-center justify-center gap-1.5">
              <RefreshCw size={14} /> Tentar novamente
            </button>
            <button onClick={this.handleGoHome} className="btn-secondary flex items-center justify-center gap-1.5">
              <Home size={14} /> Ir para o painel
            </button>
            <button onClick={this.handleReload} className="btn-primary flex items-center justify-center gap-1.5">
              <RefreshCw size={14} /> Recarregar
            </button>
          </div>
        </div>
      </div>
    )
  }
}
