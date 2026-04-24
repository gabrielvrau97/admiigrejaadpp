import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ChurchProvider } from './contexts/ChurchContext'
import { ConfigProvider } from './contexts/ConfigContext'
import { DataProvider } from './contexts/DataContext'
import { UIProvider } from './components/ui/UIProvider'
import AppLayout from './components/layout/AppLayout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import MembrosPage from './pages/secretaria/MembrosPage'
import GraficosPage from './pages/secretaria/GraficosPage'
import ConfiguracoesPage from './pages/secretaria/ConfiguracoesPage'
import IgrejasPage from './pages/controle/IgrejasPage'
import UsuariosPage from './pages/controle/UsuariosPage'
import BackupPage from './pages/controle/BackupPage'
import MeuPerfilPage from './pages/controle/MeuPerfilPage'
import SeminariosPage from './pages/seminarios/SeminariosPage'
import SeminarioDetailPage from './pages/seminarios/SeminarioDetailPage'
import CarteirinhasPage from './pages/carteirinhas/CarteirinhasPage'
import CertificadosPage from './pages/certificados/CertificadosPage'
import NotFound from './pages/NotFound'

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
        <Route path="/secretaria/congregados" element={<MembrosPage type="congregados" />} />
        <Route path="/secretaria/criancas" element={<MembrosPage type="criancas" />} />
        <Route path="/secretaria/adolescentes" element={<MembrosPage type="adolescentes" />} />
        <Route path="/secretaria/jovens" element={<MembrosPage type="jovens" />} />
        <Route path="/secretaria/novos-convertidos" element={<MembrosPage type="novos-convertidos" />} />
        <Route path="/secretaria/graficos" element={<GraficosPage />} />
        <Route path="/secretaria/configuracoes" element={<ConfiguracoesPage />} />
        <Route path="/secretaria/*" element={<NotFound />} />

        {/* Controle */}
        <Route path="/controle/igrejas" element={<IgrejasPage />} />
        <Route path="/controle/usuarios" element={<UsuariosPage />} />
        <Route path="/controle/backup" element={<BackupPage />} />
        <Route path="/controle/meu-perfil" element={<MeuPerfilPage />} />
        <Route path="/controle/*" element={<NotFound />} />

        {/* Seminários */}
        <Route path="/seminarios" element={<SeminariosPage />} />
        <Route path="/seminarios/:id" element={<SeminarioDetailPage />} />

        {/* Carteirinhas e Certificados */}
        <Route path="/carteirinhas" element={<CarteirinhasPage />} />
        <Route path="/certificados" element={<CertificadosPage />} />

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
