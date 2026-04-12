import { useState, useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import { useAuth } from './context/AuthContext'
import { useApp } from './context/AppContext'
import { seedBanks } from './db'
import Sidebar from './components/Sidebar'
import AuthPage from './pages/AuthPage'
import Dashboard from './pages/Dashboard'
import Entry from './pages/Entry'
import Categories from './pages/Categories'
import Sales from './pages/Sales'
import Purchase from './pages/Purchase'
import Payment from './pages/Payment'
import Stock from './pages/Stock'
import Ledger from './pages/Ledger'
import Backup from './pages/Backup'
import Reports from './pages/Reports'

function AppLayout() {
  const [page, setPage] = useState('dashboard')
  const { loadAll } = useApp()

  useEffect(() => {
    async function initializeApp() {
      await seedBanks()
      await loadAll()
    }

    initializeApp()
  }, [loadAll])

  const pages = {
    dashboard: <Dashboard onNavigate={setPage} />,
    'create-account': <Entry activeTab="account" />,
    'create-item': <Entry activeTab="item" />,
    categories: <Categories />,
    sales: <Sales />,
    purchase: <Purchase />,
    payment: <Payment />,
    stock: <Stock />,
    ledger: <Ledger />,
    reports: <Reports />,
    backup: <Backup />,
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar active={page} onNavigate={setPage} />
      <main className="lg:ml-60 pt-14 lg:pt-0 min-h-screen">
        <div className="p-4 lg:p-6 max-w-6xl mx-auto">
          {pages[page] || <Dashboard onNavigate={setPage} />}
        </div>
      </main>
    </div>
  )
}

export default function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-blue-800 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-3xl font-bold mx-auto mb-4">E</div>
          <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
        </div>
      </div>
    )
  }

  return (
    <>
      <Toaster position="top-right" toastOptions={{ duration: 3000, style: { fontSize: '14px' } }} />
      {user ? <AppLayout /> : <AuthPage />}
    </>
  )
}
