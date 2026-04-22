import React from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

export default function AppLayout() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f1f5f9' }}>
      <Sidebar />
      <Topbar />
      <main className="ml-56 pt-12 min-h-screen">
        <div className="p-5">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
