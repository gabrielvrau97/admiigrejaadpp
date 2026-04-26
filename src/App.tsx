import React, { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ChurchProvider } from './contexts/ChurchContext'
import { ConfigProvider } from './contexts/ConfigContext'
import { DataProvider } from './contexts/DataContext'
import { UIProvider } from './components/ui/UIProvider'
import AppLayout from './components/layout/AppLayout'
import PageLoader from './components/ui/PageLoader'

// Eager (primeiro acesso): tela de login + dashboard + lista de membros
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import MembrosPage from './pages/secretaria/MembrosPage'
import NotFound from './pages/NotFound'

// Lazy: páginas acessadas sob demanda
const GraficosPage = lazy(() => import('./pages/secretaria/GraficosPage'))
const ConfiguracoesPage = lazy(() => import('./pages/secretaria/ConfiguracoesPage'))
const IgrejasPage = lazy(() => import('./pages/controle/IgrejasPage'))
const UsuariosPage = lazy(() => import('./pages/controle/UsuariosPage'))
const BackupPage = lazy(() => import('./pages/controle/BackupPage'))
const MeuPerfilPage = lazy(() => import('./pages/controle/MeuPerfilPage'))
const SeminariosPage = lazy(() => import('./pages/seminarios/SeminariosPage'))
const SeminarioDetailPage = lazy(() => import('./pages/seminarios/SeminarioDetailPage'))
const CarteirinhasPage = lazy(() => import('./pages/carteirinhas/CarteirinhasPage'))
const CertificadosPage = lazy(() => import('./pages/certificados/CertificadosPage'))

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="min-h-screen bg-[#1a2238] flex items-center justify-center">
        <div className="text-white text-sm">Carregando...</div>
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function AppRoutes() {
  const { user } = useAuth()
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />

        {/* Secretaria */}
        <Route path="/secretaria/membros" element={<MembrosPage type="membros" />} />
        <Route path="/secretaria/visitantes" element={<MembrosPage type="visitantes" />} />
        <Route path="/secretaria/congregados" element={<Navigate to="/secretaria/visitantes" replace />} />
        <Route path="/secretaria/criancas" element={<MembrosPage type="criancas" />} />
        <Route path="/secretaria/adolescentes" element={<MembrosPage type="adolescentes" />} />
        <Route path="/secretaria/jovens" element={<MembrosPage type="jovens" />} />
        <Route path="/secretaria/novos-convertidos" element={<MembrosPage type="novos-convertidos" />} />
        <Route path="/secretaria/graficos" element={<Suspense fallback={<PageLoader />}><GraficosPage /></Suspense>} />
        <Route path="/secretaria/configuracoes" element={<Suspense fallback={<PageLoader />}><ConfiguracoesPage /></Suspense>} />
        <Route path="/secretaria/*" element={<NotFound />} />

        {/* Controle */}
        <Route path="/controle/igrejas" element={<Suspense fallback={<PageLoader />}><IgrejasPage /></Suspense>} />
        <Route path="/controle/usuarios" element={<Suspense fallback={<PageLoader />}><UsuariosPage /></Suspense>} />
        <Route path="/controle/backup" element={<Suspense fallback={<PageLoader />}><BackupPage /></Suspense>} />
        <Route path="/controle/meu-perfil" element={<Suspense fallback={<PageLoader />}><MeuPerfilPage /></Suspense>} />
        <Route path="/controle/*" element={<NotFound />} />

        {/* Seminários */}
        <Route path="/seminarios" element={<Suspense fallback={<PageLoader />}><SeminariosPage /></Suspense>} />
        <Route path="/seminarios/:id" element={<Suspense fallback={<PageLoader />}><SeminarioDetailPage /></Suspense>} />

        {/* Carteirinhas e Certificados */}
        <Route path="/carteirinhas" element={<Suspense fallback={<PageLoader />}><CarteirinhasPage /></Suspense>} />
        <Route path="/certificados" element={<Suspense fallback={<PageLoader />}><CertificadosPage /></Suspense>} />

        {/* Default */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <UIProvider>
        <AuthProvider>
          <ChurchProvider>
            <ConfigProvider>
              <DataProvider>
                <AppRoutes />
              </DataProvider>
            </ConfigProvider>
          </ChurchProvider>
        </AuthProvider>
      </UIProvider>
    </BrowserRouter>
  )
}
