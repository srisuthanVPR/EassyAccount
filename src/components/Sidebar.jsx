import { useState, useEffect } from 'react'
import {
  LayoutDashboard, UserPlus, Tag, ShoppingCart, Package, TrendingUp, CreditCard, BookOpen,
  Menu, X, LogOut, ChevronDown, ChevronRight, Database, BarChart3, Wallet, Landmark, Receipt, ChartNoAxesCombined
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { db } from '../db'

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  {
    id: 'entry', label: 'Entry', icon: UserPlus,
    children: [
      { id: 'create-account', label: 'Create Account' },
      { id: 'create-item', label: 'Create Item' },
    ]
  },
  { id: 'categories', label: 'Categories', icon: Tag },
  { id: 'sales', label: 'Sales', icon: TrendingUp },
  { id: 'purchase', label: 'Purchase', icon: ShoppingCart },
  { id: 'payment', label: 'Payment', icon: CreditCard },
  { id: 'expenses', label: 'Expenses', icon: Receipt },
  { id: 'cashbox', label: 'Cashbox', icon: Wallet },
  { id: 'bank-account', label: 'Bank Account', icon: Landmark },
  { id: 'profit-loss', label: 'P/L', icon: ChartNoAxesCombined },
  { id: 'stock', label: 'Stock', icon: Package },
  { id: 'ledger', label: 'Ledger', icon: BookOpen },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
  { id: 'backup', label: 'Backup & Restore', icon: Database },
]

function SidebarContent({ active, expanded, dbStatus, user, onNavigate, onToggleExpand, onLogout }) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-blue-700">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center text-white font-bold text-lg">E</div>
          <div>
            <div className="text-white font-bold text-sm">EassyAcc</div>
            <div className="text-blue-200 text-xs truncate max-w-[140px]">{user?.name || user?.email}</div>
            <div className="flex items-center gap-1 mt-1">
              <span className={`w-1.5 h-1.5 rounded-full ${dbStatus === 'ok' ? 'bg-green-400' : dbStatus === 'error' ? 'bg-red-400' : 'bg-yellow-400 animate-pulse'}`} />
              <span className="text-xs text-blue-300">
                {dbStatus === 'ok' ? 'DB Connected' : dbStatus === 'error' ? 'DB Error' : 'Connecting...'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {navItems.map(item => {
          const Icon = item.icon
          const isActive = active === item.id || item.children?.some(child => child.id === active)
          const isExpanded = expanded[item.id]

          if (item.children) {
            return (
              <div key={item.id}>
                <button
                  onClick={() => onToggleExpand(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${isActive ? 'bg-white/20 text-white' : 'text-blue-100 hover:bg-white/10'}`}
                >
                  <Icon size={18} />
                  <span className="flex-1 text-left">{item.label}</span>
                  {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
                {isExpanded && (
                  <div className="ml-4 mt-0.5 space-y-0.5">
                    {item.children.map(child => (
                      <button
                        key={child.id}
                        onClick={() => onNavigate(child.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${active === child.id ? 'bg-white/20 text-white font-medium' : 'text-blue-200 hover:bg-white/10'}`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
                        {child.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          }

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${active === item.id ? 'bg-white/20 text-white font-medium' : 'text-blue-100 hover:bg-white/10'}`}
            >
              <Icon size={18} />
              {item.label}
            </button>
          )
        })}
      </nav>

      <div className="p-2 border-t border-blue-700">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-blue-100 hover:bg-white/10 transition-colors"
        >
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </div>
  )
}

export default function Sidebar({ active, onNavigate }) {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState({ entry: true })
  const [dbStatus, setDbStatus] = useState('checking')

  useEffect(() => {
    db.open()
      .then(() => setDbStatus('ok'))
      .catch(() => setDbStatus('error'))
  }, [])

  function handleNav(id) {
    onNavigate(id)
    setOpen(false)
  }

  function toggleExpand(id) {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <>
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-blue-800 text-white flex items-center justify-between px-4 py-3 shadow-md">
        <div className="flex items-center gap-2 font-bold">
          <div className="w-7 h-7 bg-white/20 rounded flex items-center justify-center text-sm">E</div>
          EassyAcc
        </div>
        <button onClick={() => setOpen(!open)} className="p-1">
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setOpen(false)} />
      )}

      <div className={`lg:hidden fixed top-0 left-0 z-50 h-full w-72 bg-blue-800 transform transition-transform duration-300 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <SidebarContent
          active={active}
          expanded={expanded}
          dbStatus={dbStatus}
          user={user}
          onNavigate={handleNav}
          onToggleExpand={toggleExpand}
          onLogout={logout}
        />
      </div>

      <div className="hidden lg:flex flex-col w-60 bg-blue-800 h-screen fixed left-0 top-0 z-30">
        <SidebarContent
          active={active}
          expanded={expanded}
          dbStatus={dbStatus}
          user={user}
          onNavigate={handleNav}
          onToggleExpand={toggleExpand}
          onLogout={logout}
        />
      </div>
    </>
  )
}
