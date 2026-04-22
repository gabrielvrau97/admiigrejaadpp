import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f1f5f9' }}>
      <Sidebar mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <Topbar onOpenSidebar={() => setSidebarOpen(true)} />
      <main className="lg:ml-56 pt-12 min-h-screen">
        <div className="p-3 sm:p-5">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
